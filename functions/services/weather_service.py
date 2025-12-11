"""
Weather API Service for TrueCost.

Provides integration with the Open-Meteo Historical Weather API
to retrieve precipitation and temperature data for construction planning.

Architecture:
- Fetches historical weather data by latitude/longitude
- Calculates construction-relevant factors (winter slowdown, summer premium)
- Identifies rainy season months from precipitation patterns
- Graceful fallback to cached/default data on API failure

References:
- Story 4.5: Real Data Integration (AC 4.5.4-4.5.6, 4.5.8)
- Open-Meteo Historical API: https://open-meteo.com/en/docs/historical-weather-api

API Details:
- Endpoint: https://archive-api.open-meteo.com/v1/archive
- Rate limit: Free, no API key required
- Data: Historical daily temperature and precipitation
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import time
from datetime import datetime, timedelta
from collections import defaultdict

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)
import structlog

logger = structlog.get_logger(__name__)


# =============================================================================
# Constants
# =============================================================================

# Open-Meteo API Configuration
OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"
WEATHER_API_TIMEOUT = 30.0  # seconds

# Temperature thresholds (in Celsius)
FREEZE_THRESHOLD_C = 0.0  # Below this = freeze day
EXTREME_HEAT_THRESHOLD_C = 35.0  # Above this = extreme heat day (95°F)

# Precipitation threshold for "rainy" month (in mm)
RAINY_MONTH_THRESHOLD_MM = 76.2  # 3 inches = 76.2mm


# =============================================================================
# Location Coordinates
# =============================================================================

# Latitude/Longitude for zip codes (AC 4.5.4)
# Used to query Open-Meteo by location
ZIP_COORDINATES: Dict[str, Tuple[float, float]] = {
    # New York City
    "10001": (40.7484, -73.9967),
    "10002": (40.7157, -73.9863),
    "10003": (40.7317, -73.9892),
    # Los Angeles
    "90001": (33.9425, -118.2551),
    "90002": (33.9490, -118.2473),
    # Chicago
    "60601": (41.8819, -87.6278),
    "60602": (41.8833, -87.6299),
    # Houston
    "77001": (29.7604, -95.3698),
    "77002": (29.7544, -95.3628),
    # Phoenix
    "85001": (33.4484, -112.0740),
    "85002": (33.4450, -112.0580),
    # Denver
    "80202": (39.7392, -104.9903),
    "80203": (39.7312, -104.9826),
    # Seattle
    "98101": (47.6062, -122.3321),
    "98102": (47.6295, -122.3208),
    # Atlanta
    "30301": (33.7490, -84.3880),
    "30302": (33.7550, -84.3900),
}

# Zip prefix to approximate coordinates (for fallback)
ZIP_PREFIX_COORDINATES: Dict[str, Tuple[float, float]] = {
    "100": (40.7128, -74.0060),   # NYC area
    "101": (40.7128, -74.0060),
    "900": (34.0522, -118.2437),  # LA area
    "901": (34.0522, -118.2437),
    "606": (41.8781, -87.6298),   # Chicago area
    "607": (41.8781, -87.6298),
    "770": (29.7604, -95.3698),   # Houston area
    "771": (29.7604, -95.3698),
    "850": (33.4484, -112.0740),  # Phoenix area
    "851": (33.4484, -112.0740),
    "802": (39.7392, -104.9903),  # Denver area
    "803": (39.7392, -104.9903),
    "981": (47.6062, -122.3321),  # Seattle area
    "982": (47.6062, -122.3321),
    "303": (33.7490, -84.3880),   # Atlanta area
    "304": (33.7490, -84.3880),
}


# =============================================================================
# Data Models
# =============================================================================


@dataclass
class WeatherFactors:
    """
    Weather-based construction factors for a location.

    Attributes:
        zip_code: 5-digit US zip code
        winter_slowdown: Productivity multiplier for winter conditions (>= 1.0)
        summer_premium: Cost premium for extreme heat work (>= 1.0)
        rainy_season_months: List of month numbers (1-12) with high precipitation
        outdoor_work_adjustment: Combined outdoor work factor
        freeze_days: Number of days below freezing per year
        extreme_heat_days: Number of extreme heat days per year
        avg_annual_precip_mm: Average annual precipitation in mm
        source: Data source ("Open-Meteo" or "cached")
    """
    zip_code: str
    winter_slowdown: float
    summer_premium: float
    rainy_season_months: List[int]
    outdoor_work_adjustment: float
    freeze_days: int
    extreme_heat_days: int
    avg_annual_precip_mm: float
    source: str = "Open-Meteo"


# =============================================================================
# Default/Fallback Data
# =============================================================================

# Default weather factors by region for fallback (AC 4.5.8)
DEFAULT_WEATHER_BY_REGION: Dict[str, Dict] = {
    "northeast": {
        "winter_slowdown": 1.20,
        "summer_premium": 1.00,
        "rainy_season_months": [3, 4, 5, 10, 11],
        "outdoor_work_adjustment": 1.10,
        "freeze_days": 90,
        "extreme_heat_days": 10,
        "avg_annual_precip_mm": 1200,
    },
    "southeast": {
        "winter_slowdown": 1.05,
        "summer_premium": 1.10,
        "rainy_season_months": [6, 7, 8, 9],
        "outdoor_work_adjustment": 1.05,
        "freeze_days": 20,
        "extreme_heat_days": 60,
        "avg_annual_precip_mm": 1350,
    },
    "midwest": {
        "winter_slowdown": 1.25,
        "summer_premium": 1.05,
        "rainy_season_months": [4, 5, 6, 10],
        "outdoor_work_adjustment": 1.15,
        "freeze_days": 120,
        "extreme_heat_days": 20,
        "avg_annual_precip_mm": 900,
    },
    "southwest": {
        "winter_slowdown": 1.00,
        "summer_premium": 1.20,
        "rainy_season_months": [7, 8],
        "outdoor_work_adjustment": 1.10,
        "freeze_days": 10,
        "extreme_heat_days": 100,
        "avg_annual_precip_mm": 250,
    },
    "west": {
        "winter_slowdown": 1.10,
        "summer_premium": 1.05,
        "rainy_season_months": [11, 12, 1, 2],
        "outdoor_work_adjustment": 1.05,
        "freeze_days": 30,
        "extreme_heat_days": 30,
        "avg_annual_precip_mm": 500,
    },
    "northwest": {
        "winter_slowdown": 1.15,
        "summer_premium": 1.00,
        "rainy_season_months": [10, 11, 12, 1, 2, 3],
        "outdoor_work_adjustment": 1.20,
        "freeze_days": 40,
        "extreme_heat_days": 5,
        "avg_annual_precip_mm": 950,
    },
}

# Zip prefix to region mapping
ZIP_PREFIX_TO_REGION: Dict[str, str] = {
    "100": "northeast", "101": "northeast", "102": "northeast",
    "900": "west", "901": "west",
    "606": "midwest", "607": "midwest",
    "770": "southeast", "771": "southeast",
    "850": "southwest", "851": "southwest",
    "802": "west", "803": "west",
    "981": "northwest", "982": "northwest",
    "303": "southeast", "304": "southeast",
}


# =============================================================================
# Helper Functions
# =============================================================================


def get_coordinates_for_zip(zip_code: str) -> Optional[Tuple[float, float]]:
    """
    Get latitude/longitude for a zip code.

    Args:
        zip_code: 5-digit US zip code

    Returns:
        Tuple of (latitude, longitude) or None if not found
    """
    # Try exact zip match first
    if zip_code in ZIP_COORDINATES:
        return ZIP_COORDINATES[zip_code]

    # Try zip prefix
    zip_prefix = zip_code[:3]
    if zip_prefix in ZIP_PREFIX_COORDINATES:
        return ZIP_PREFIX_COORDINATES[zip_prefix]

    return None


def get_region_for_zip(zip_code: str) -> str:
    """
    Determine region for a zip code (for fallback data).

    Args:
        zip_code: 5-digit US zip code

    Returns:
        Region name string
    """
    zip_prefix = zip_code[:3]
    return ZIP_PREFIX_TO_REGION.get(zip_prefix, "west")


def calculate_winter_slowdown(freeze_days: int) -> float:
    """
    Calculate winter slowdown factor from freeze days (AC 4.5.5).

    Formula: 1.0 + (freeze_days / 365) * 0.5
    Maximum factor: 1.5

    Args:
        freeze_days: Number of days with min temp below freezing

    Returns:
        Winter slowdown factor (1.0 to 1.5)
    """
    factor = 1.0 + (freeze_days / 365) * 0.5
    return min(round(factor, 2), 1.5)


def calculate_summer_premium(extreme_heat_days: int) -> float:
    """
    Calculate summer premium from extreme heat days (AC 4.5.5).

    Formula: 1.0 + (extreme_heat_days / 365) * 0.3
    Maximum factor: 1.3

    Args:
        extreme_heat_days: Number of days with max temp above 95°F (35°C)

    Returns:
        Summer premium factor (1.0 to 1.3)
    """
    factor = 1.0 + (extreme_heat_days / 365) * 0.3
    return min(round(factor, 2), 1.3)


def identify_rainy_months(monthly_precip_mm: Dict[int, float]) -> List[int]:
    """
    Identify rainy season months from precipitation data (AC 4.5.6).

    A month is considered "rainy" if precipitation exceeds 76.2mm (3 inches).

    Args:
        monthly_precip_mm: Dict mapping month (1-12) to total precipitation in mm

    Returns:
        List of month numbers that qualify as rainy season
    """
    return [
        month for month, precip in monthly_precip_mm.items()
        if precip > RAINY_MONTH_THRESHOLD_MM
    ]


def calculate_outdoor_adjustment(
    winter_slowdown: float,
    summer_premium: float,
) -> float:
    """
    Calculate combined outdoor work adjustment factor.

    Formula: (winter_slowdown + summer_premium) / 2

    Args:
        winter_slowdown: Winter slowdown factor
        summer_premium: Summer premium factor

    Returns:
        Combined outdoor work adjustment factor
    """
    return round((winter_slowdown + summer_premium) / 2, 2)


# =============================================================================
# Open-Meteo API Functions
# =============================================================================


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
)
async def _fetch_weather_data(
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
) -> Dict:
    """
    Fetch historical weather data from Open-Meteo API.

    Args:
        latitude: Location latitude
        longitude: Location longitude
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)

    Returns:
        Raw JSON response from Open-Meteo API

    Raises:
        httpx.HTTPError: On HTTP errors after retries
        httpx.TimeoutException: On timeout after retries
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "temperature_2m_min,temperature_2m_max,precipitation_sum",
        "timezone": "America/New_York",
    }

    async with httpx.AsyncClient(timeout=WEATHER_API_TIMEOUT) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        return response.json()


def _parse_weather_response(response_data: Dict) -> Tuple[int, int, float, Dict[int, float]]:
    """
    Parse Open-Meteo response to extract weather metrics.

    Args:
        response_data: Raw JSON response from Open-Meteo

    Returns:
        Tuple of (freeze_days, extreme_heat_days, annual_precip, monthly_precip)
    """
    daily = response_data.get("daily", {})

    dates = daily.get("time", [])
    min_temps = daily.get("temperature_2m_min", [])
    max_temps = daily.get("temperature_2m_max", [])
    precip = daily.get("precipitation_sum", [])

    freeze_days = 0
    extreme_heat_days = 0
    total_precip = 0.0
    monthly_precip: Dict[int, float] = defaultdict(float)

    for i, date_str in enumerate(dates):
        # Parse date to get month
        try:
            date = datetime.strptime(date_str, "%Y-%m-%d")
            month = date.month
        except (ValueError, TypeError):
            continue

        # Count freeze days (AC 4.5.5)
        if i < len(min_temps) and min_temps[i] is not None:
            if min_temps[i] < FREEZE_THRESHOLD_C:
                freeze_days += 1

        # Count extreme heat days
        if i < len(max_temps) and max_temps[i] is not None:
            if max_temps[i] > EXTREME_HEAT_THRESHOLD_C:
                extreme_heat_days += 1

        # Accumulate precipitation
        if i < len(precip) and precip[i] is not None:
            total_precip += precip[i]
            monthly_precip[month] += precip[i]

    return freeze_days, extreme_heat_days, total_precip, dict(monthly_precip)


def _get_fallback_weather(zip_code: str) -> WeatherFactors:
    """
    Get fallback weather factors when API fails.

    Args:
        zip_code: 5-digit US zip code

    Returns:
        WeatherFactors with regional default data
    """
    region = get_region_for_zip(zip_code)
    defaults = DEFAULT_WEATHER_BY_REGION.get(region, DEFAULT_WEATHER_BY_REGION["west"])

    return WeatherFactors(
        zip_code=zip_code,
        winter_slowdown=defaults["winter_slowdown"],
        summer_premium=defaults["summer_premium"],
        rainy_season_months=defaults["rainy_season_months"],
        outdoor_work_adjustment=defaults["outdoor_work_adjustment"],
        freeze_days=defaults["freeze_days"],
        extreme_heat_days=defaults["extreme_heat_days"],
        avg_annual_precip_mm=defaults["avg_annual_precip_mm"],
        source="cached",
    )


# =============================================================================
# Main Service Functions
# =============================================================================


async def get_weather_factors(zip_code: str) -> WeatherFactors:
    """
    Get weather-based construction factors for a zip code.

    Implements AC 4.5.4-4.5.6 and AC 4.5.8:
    - AC 4.5.4: Retrieves historical precipitation and temperature data
    - AC 4.5.5: Calculates winter_slowdown from freeze days
    - AC 4.5.6: Identifies rainy_season_months from precipitation patterns
    - AC 4.5.8: Graceful fallback on API failure

    Args:
        zip_code: 5-digit US zip code

    Returns:
        WeatherFactors with calculated construction factors
    """
    start_time = time.perf_counter()

    # Get coordinates for zip code
    coords = get_coordinates_for_zip(zip_code)

    if not coords:
        # No coordinates - use regional fallback
        logger.info(
            "weather_no_coordinates",
            zip_code=zip_code,
            message="Using regional default weather data",
        )
        return _get_fallback_weather(zip_code)

    latitude, longitude = coords

    # Calculate date range (previous full year for historical data)
    current_year = datetime.now().year
    start_date = f"{current_year - 1}-01-01"
    end_date = f"{current_year - 1}-12-31"

    try:
        response_data = await _fetch_weather_data(
            latitude=latitude,
            longitude=longitude,
            start_date=start_date,
            end_date=end_date,
        )

        # Parse weather data
        freeze_days, extreme_heat_days, annual_precip, monthly_precip = _parse_weather_response(
            response_data
        )

        # Calculate factors (AC 4.5.5, 4.5.6)
        winter_slowdown = calculate_winter_slowdown(freeze_days)
        summer_premium = calculate_summer_premium(extreme_heat_days)
        rainy_months = identify_rainy_months(monthly_precip)
        outdoor_adjustment = calculate_outdoor_adjustment(winter_slowdown, summer_premium)

        latency_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            "weather_fetch_success",
            zip_code=zip_code,
            freeze_days=freeze_days,
            extreme_heat_days=extreme_heat_days,
            rainy_months=rainy_months,
            latency_ms=round(latency_ms, 2),
        )

        return WeatherFactors(
            zip_code=zip_code,
            winter_slowdown=winter_slowdown,
            summer_premium=summer_premium,
            rainy_season_months=sorted(rainy_months),
            outdoor_work_adjustment=outdoor_adjustment,
            freeze_days=freeze_days,
            extreme_heat_days=extreme_heat_days,
            avg_annual_precip_mm=round(annual_precip, 1),
            source="Open-Meteo",
        )

    except (httpx.HTTPError, httpx.TimeoutException) as e:
        # API failure - use fallback data (AC 4.5.8)
        latency_ms = (time.perf_counter() - start_time) * 1000
        logger.warning(
            "weather_api_failure",
            zip_code=zip_code,
            error=str(e),
            latency_ms=round(latency_ms, 2),
        )
        return _get_fallback_weather(zip_code)


async def compare_weather_factors(
    zip_code_1: str,
    zip_code_2: str,
) -> Dict:
    """
    Compare weather factors between two locations.

    Useful for demonstrating differences (e.g., Denver vs Houston for AC 4.5.5,
    Seattle vs Phoenix for AC 4.5.6).

    Args:
        zip_code_1: First zip code
        zip_code_2: Second zip code

    Returns:
        Dict with side-by-side comparison of weather factors
    """
    factors_1 = await get_weather_factors(zip_code_1)
    factors_2 = await get_weather_factors(zip_code_2)

    return {
        "location_1": {
            "zip_code": zip_code_1,
            "factors": factors_1,
        },
        "location_2": {
            "zip_code": zip_code_2,
            "factors": factors_2,
        },
        "comparison": {
            "winter_slowdown_diff": round(factors_1.winter_slowdown - factors_2.winter_slowdown, 2),
            "summer_premium_diff": round(factors_1.summer_premium - factors_2.summer_premium, 2),
            "freeze_days_diff": factors_1.freeze_days - factors_2.freeze_days,
            "extreme_heat_days_diff": factors_1.extreme_heat_days - factors_2.extreme_heat_days,
            "rainy_months_1_count": len(factors_1.rainy_season_months),
            "rainy_months_2_count": len(factors_2.rainy_season_months),
        },
    }
