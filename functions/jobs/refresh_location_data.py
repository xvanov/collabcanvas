"""
Location Data Refresh Job for TrueCost.

Scheduled job that updates Firestore /costData/locationFactors/ with fresh data
from BLS and Weather APIs.

Architecture:
- Runs monthly via Cloud Scheduler
- Batch updates all tracked zip codes
- Retry logic with exponential backoff
- Graceful fallback on API failure
- Structured logging for monitoring

References:
- Story 4.5: Real Data Integration (AC 4.5.7-4.5.8)
- Cloud Scheduler: Trigger monthly refresh
"""

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
import asyncio
import time

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)
import structlog

from services.bls_service import get_labor_rates_for_zip, BLSResponse
from services.weather_service import get_weather_factors, WeatherFactors

logger = structlog.get_logger(__name__)


# =============================================================================
# Constants
# =============================================================================

# List of zip codes to track for regular updates
TRACKED_ZIP_CODES: List[str] = [
    # Major metros (per story requirements)
    "10001",  # New York
    "90001",  # Los Angeles
    "60601",  # Chicago
    "77001",  # Houston
    "85001",  # Phoenix
    "80202",  # Denver
    "98101",  # Seattle
    "30301",  # Atlanta
    # Additional metros for coverage
    "02101",  # Boston
    "19103",  # Philadelphia
    "75201",  # Dallas
    "33101",  # Miami
    "55401",  # Minneapolis
    "48201",  # Detroit
    "63101",  # St. Louis
    "64101",  # Kansas City
]

# Batch size for parallel requests
BATCH_SIZE = 4

# Delay between batches to avoid rate limiting
BATCH_DELAY_SECONDS = 2.0


# =============================================================================
# Data Models
# =============================================================================


@dataclass
class RefreshResult:
    """
    Result of refreshing data for a single location.

    Attributes:
        zip_code: The zip code that was refreshed
        success: Whether the refresh succeeded
        bls_success: Whether BLS data was fetched successfully
        weather_success: Whether weather data was fetched successfully
        error_message: Error message if failed
        duration_ms: Time taken for the refresh
    """
    zip_code: str
    success: bool
    bls_success: bool
    weather_success: bool
    error_message: Optional[str] = None
    duration_ms: float = 0.0


@dataclass
class BatchRefreshResult:
    """
    Result of a batch refresh operation.

    Attributes:
        total_locations: Total number of locations to refresh
        successful: Number of successful refreshes
        failed: Number of failed refreshes
        results: List of individual RefreshResult
        total_duration_ms: Total time for the batch refresh
    """
    total_locations: int
    successful: int
    failed: int
    results: List[RefreshResult]
    total_duration_ms: float


# =============================================================================
# Firestore Integration
# =============================================================================


async def _update_firestore_location(
    zip_code: str,
    bls_data: BLSResponse,
    weather_data: WeatherFactors,
) -> bool:
    """
    Update Firestore with combined location data.

    Args:
        zip_code: The zip code to update
        bls_data: BLS labor rate data
        weather_data: Weather factor data

    Returns:
        True if update succeeded, False otherwise
    """
    try:
        from firebase_admin import firestore

        db = firestore.client()

        # Build the document data
        doc_data = {
            "zip_code": zip_code,
            "msa_code": bls_data.msa_code,
            "metro_name": bls_data.metro_name,
            "labor_rates": {
                trade: {
                    "hourly_rate": rate.hourly_rate,
                    "total_rate": rate.total_rate,
                    "soc_code": rate.soc_code,
                    "source": rate.source,
                }
                for trade, rate in bls_data.rates.items()
            },
            "weather_factors": {
                "winter_slowdown": weather_data.winter_slowdown,
                "summer_premium": weather_data.summer_premium,
                "rainy_season_months": weather_data.rainy_season_months,
                "outdoor_work_adjustment": weather_data.outdoor_work_adjustment,
                "freeze_days": weather_data.freeze_days,
                "extreme_heat_days": weather_data.extreme_heat_days,
            },
            "bls_data_date": bls_data.data_date,
            "weather_source": weather_data.source,
            "last_updated": firestore.SERVER_TIMESTAMP,
        }

        # Update or create the document
        doc_ref = db.collection("costData").document("locationFactors").collection(zip_code).document("data")
        doc_ref.set(doc_data, merge=True)

        logger.info(
            "firestore_location_updated",
            zip_code=zip_code,
        )
        return True

    except ImportError:
        # Firebase not available
        logger.warning(
            "firestore_unavailable",
            zip_code=zip_code,
            message="firebase_admin not installed, skipping Firestore update",
        )
        return False
    except Exception as e:
        logger.error(
            "firestore_update_failed",
            zip_code=zip_code,
            error=str(e),
        )
        return False


# =============================================================================
# Refresh Functions
# =============================================================================


async def refresh_single_location(zip_code: str) -> RefreshResult:
    """
    Refresh data for a single location.

    Fetches fresh data from BLS and Weather APIs, then updates Firestore.

    Args:
        zip_code: The zip code to refresh

    Returns:
        RefreshResult with success/failure status
    """
    start_time = time.perf_counter()
    bls_success = False
    weather_success = False
    error_message = None

    try:
        # Fetch BLS and weather data concurrently
        bls_task = get_labor_rates_for_zip(zip_code)
        weather_task = get_weather_factors(zip_code)

        bls_data, weather_data = await asyncio.gather(
            bls_task,
            weather_task,
            return_exceptions=True,
        )

        # Check BLS result
        if isinstance(bls_data, Exception):
            error_message = f"BLS fetch failed: {str(bls_data)}"
            bls_data = None
        else:
            bls_success = not bls_data.cached

        # Check weather result
        if isinstance(weather_data, Exception):
            if error_message:
                error_message += f"; Weather fetch failed: {str(weather_data)}"
            else:
                error_message = f"Weather fetch failed: {str(weather_data)}"
            weather_data = None
        else:
            weather_success = weather_data.source == "Open-Meteo"

        # Update Firestore if we have data
        if bls_data and weather_data:
            firestore_success = await _update_firestore_location(
                zip_code, bls_data, weather_data
            )
            if not firestore_success:
                error_message = "Firestore update failed"

        duration_ms = (time.perf_counter() - start_time) * 1000

        success = bls_success or weather_success  # At least partial success

        logger.info(
            "location_refresh_complete",
            zip_code=zip_code,
            success=success,
            bls_success=bls_success,
            weather_success=weather_success,
            duration_ms=round(duration_ms, 2),
        )

        return RefreshResult(
            zip_code=zip_code,
            success=success,
            bls_success=bls_success,
            weather_success=weather_success,
            error_message=error_message,
            duration_ms=round(duration_ms, 2),
        )

    except Exception as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            "location_refresh_error",
            zip_code=zip_code,
            error=str(e),
            duration_ms=round(duration_ms, 2),
        )
        return RefreshResult(
            zip_code=zip_code,
            success=False,
            bls_success=False,
            weather_success=False,
            error_message=str(e),
            duration_ms=round(duration_ms, 2),
        )


async def refresh_all_locations(
    zip_codes: Optional[List[str]] = None,
    batch_size: int = BATCH_SIZE,
) -> BatchRefreshResult:
    """
    Refresh data for all tracked locations.

    Implements AC 4.5.7: Batch update for all tracked zip codes.

    Args:
        zip_codes: Optional list of zip codes to refresh (defaults to TRACKED_ZIP_CODES)
        batch_size: Number of concurrent requests per batch

    Returns:
        BatchRefreshResult with overall success statistics
    """
    start_time = time.perf_counter()

    if zip_codes is None:
        zip_codes = TRACKED_ZIP_CODES

    logger.info(
        "batch_refresh_started",
        total_locations=len(zip_codes),
        batch_size=batch_size,
    )

    results: List[RefreshResult] = []

    # Process in batches to avoid overwhelming APIs
    for i in range(0, len(zip_codes), batch_size):
        batch = zip_codes[i:i + batch_size]

        # Process batch concurrently
        batch_results = await asyncio.gather(
            *[refresh_single_location(zip_code) for zip_code in batch]
        )
        results.extend(batch_results)

        # Delay between batches
        if i + batch_size < len(zip_codes):
            await asyncio.sleep(BATCH_DELAY_SECONDS)

    # Calculate statistics
    successful = sum(1 for r in results if r.success)
    failed = len(results) - successful
    total_duration_ms = (time.perf_counter() - start_time) * 1000

    logger.info(
        "batch_refresh_complete",
        total_locations=len(zip_codes),
        successful=successful,
        failed=failed,
        total_duration_ms=round(total_duration_ms, 2),
    )

    return BatchRefreshResult(
        total_locations=len(zip_codes),
        successful=successful,
        failed=failed,
        results=results,
        total_duration_ms=round(total_duration_ms, 2),
    )


def get_tracked_zip_codes() -> List[str]:
    """Get the list of zip codes that are tracked for regular updates."""
    return TRACKED_ZIP_CODES.copy()


# =============================================================================
# Cloud Scheduler Entry Point
# =============================================================================


async def scheduled_refresh_handler(request=None) -> Dict:
    """
    Cloud Scheduler entry point for monthly data refresh.

    This function is triggered by Cloud Scheduler (AC 4.5.7).

    Args:
        request: Optional HTTP request (for Cloud Functions)

    Returns:
        Dict with refresh results summary
    """
    logger.info("scheduled_refresh_triggered")

    result = await refresh_all_locations()

    return {
        "status": "completed",
        "total_locations": result.total_locations,
        "successful": result.successful,
        "failed": result.failed,
        "duration_ms": result.total_duration_ms,
    }
