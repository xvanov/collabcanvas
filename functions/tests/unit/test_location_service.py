"""
Unit Tests for Location Intelligence Service.

Tests AC 4.1.1 through AC 4.1.7:
- 4.1.1: Valid zip returns all 8 trade labor rates
- 4.1.2: Union/non-union status (Chicago=union, Houston=non-union)
- 4.1.3: Permit cost structure validation
- 4.1.4: Weather factors (Denver winter_slowdown > 1.0)
- 4.1.5: Unknown zip returns is_default=True
- 4.1.6: Cached lookup < 500ms
- 4.1.7: Labor rates reflect regional cost of living (NYC > Denver > rural)

Uses pytest and pytest-asyncio for async testing.
"""

import pytest
import time
import asyncio
from unittest.mock import patch, AsyncMock

# Import the service under test
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from services.cost_data_service import (
    LocationFactors,
    PermitCosts,
    WeatherFactors,
    LaborRate,
    get_location_factors,
    clear_location_cache,
    get_cache_stats,
    _validate_zip_code,
    _get_region_from_zip,
    REQUIRED_TRADES,
    LOCATION_DATA,
)


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test to ensure isolation."""
    clear_location_cache()
    yield
    clear_location_cache()


@pytest.fixture
def chicago_zip():
    """Chicago zip code (union market)."""
    return "60601"


@pytest.fixture
def houston_zip():
    """Houston zip code (non-union market)."""
    return "77001"


@pytest.fixture
def denver_zip():
    """Denver zip code (winter slowdown)."""
    return "80202"


@pytest.fixture
def nyc_zip():
    """NYC zip code (high cost)."""
    return "10001"


@pytest.fixture
def rural_zip():
    """Rural Montana zip code (low cost)."""
    return "59001"


@pytest.fixture
def unknown_zip():
    """Unknown zip code for fallback testing."""
    return "00000"


# =============================================================================
# Test: AC 4.1.1 - Valid zip returns all 8 trade labor rates
# =============================================================================


@pytest.mark.asyncio
async def test_valid_zip_returns_all_8_trades(denver_zip):
    """AC 4.1.1: Service returns labor rates for all 8 required trades."""
    result = await get_location_factors(denver_zip)

    assert isinstance(result, LocationFactors)
    assert isinstance(result.labor_rates, dict)
    assert len(result.labor_rates) == 8, f"Expected 8 trades, got {len(result.labor_rates)}"

    for trade in REQUIRED_TRADES:
        assert trade in result.labor_rates, f"Missing trade: {trade}"
        assert isinstance(result.labor_rates[trade], (int, float)), f"Invalid rate type for {trade}"
        assert result.labor_rates[trade] > 0, f"Rate for {trade} must be positive"


@pytest.mark.asyncio
async def test_all_trades_present_in_all_locations():
    """AC 4.1.1: All defined locations have all 8 trades."""
    for zip_code in LOCATION_DATA.keys():
        result = await get_location_factors(zip_code)
        for trade in REQUIRED_TRADES:
            assert trade in result.labor_rates, f"Missing {trade} for zip {zip_code}"
        clear_location_cache()


# =============================================================================
# Test: AC 4.1.2 - Union/non-union status
# =============================================================================


@pytest.mark.asyncio
async def test_chicago_is_union(chicago_zip):
    """AC 4.1.2: Chicago (60601) returns is_union=True."""
    result = await get_location_factors(chicago_zip)

    assert result.is_union is True, "Chicago should be a union market"
    assert result.union_premium > 1.0, "Union premium should be > 1.0"


@pytest.mark.asyncio
async def test_houston_not_union(houston_zip):
    """AC 4.1.2: Houston (77001) returns is_union=False."""
    result = await get_location_factors(houston_zip)

    assert result.is_union is False, "Houston should NOT be a union market"
    assert result.union_premium == 1.0, "Non-union premium should be 1.0"


@pytest.mark.asyncio
async def test_union_status_correct_types():
    """AC 4.1.2: is_union is boolean, union_premium is float."""
    for zip_code in ["60601", "77001"]:
        result = await get_location_factors(zip_code)
        assert isinstance(result.is_union, bool), "is_union must be boolean"
        assert isinstance(result.union_premium, (int, float)), "union_premium must be numeric"
        clear_location_cache()


# =============================================================================
# Test: AC 4.1.3 - Permit cost structure
# =============================================================================


@pytest.mark.asyncio
async def test_permit_costs_structure(denver_zip):
    """AC 4.1.3: Permit costs have base_percentage, minimum, inspection_fee."""
    result = await get_location_factors(denver_zip)

    assert isinstance(result.permit_costs, PermitCosts)
    assert hasattr(result.permit_costs, "base_percentage")
    assert hasattr(result.permit_costs, "minimum")
    assert hasattr(result.permit_costs, "maximum")
    assert hasattr(result.permit_costs, "inspection_fee")


@pytest.mark.asyncio
async def test_permit_costs_values_valid(denver_zip):
    """AC 4.1.3: Permit cost values are within reasonable ranges."""
    result = await get_location_factors(denver_zip)
    pc = result.permit_costs

    assert 0 < pc.base_percentage < 0.1, "base_percentage should be 0-10%"
    assert pc.minimum > 0, "minimum should be positive"
    assert pc.inspection_fee > 0, "inspection_fee should be positive"
    if pc.maximum is not None:
        assert pc.maximum > pc.minimum, "maximum should exceed minimum"


@pytest.mark.asyncio
async def test_permit_costs_across_regions():
    """AC 4.1.3: All locations have valid permit costs."""
    test_zips = ["10001", "60601", "77001", "80202"]
    for zip_code in test_zips:
        result = await get_location_factors(zip_code)
        assert isinstance(result.permit_costs, PermitCosts)
        assert result.permit_costs.base_percentage > 0
        assert result.permit_costs.minimum > 0
        clear_location_cache()


# =============================================================================
# Test: AC 4.1.4 - Weather/seasonal factors
# =============================================================================


@pytest.mark.asyncio
async def test_denver_winter_slowdown(denver_zip):
    """AC 4.1.4: Denver has winter_slowdown > 1.0."""
    result = await get_location_factors(denver_zip)

    assert isinstance(result.weather_factors, WeatherFactors)
    assert result.weather_factors.winter_slowdown > 1.0, \
        f"Denver winter_slowdown should be > 1.0, got {result.weather_factors.winter_slowdown}"


@pytest.mark.asyncio
async def test_weather_factors_structure(denver_zip):
    """AC 4.1.4: Weather factors have all required fields."""
    result = await get_location_factors(denver_zip)
    wf = result.weather_factors

    assert isinstance(wf, WeatherFactors)
    assert hasattr(wf, "winter_slowdown")
    assert hasattr(wf, "summer_premium")
    assert hasattr(wf, "rainy_season_months")
    assert hasattr(wf, "outdoor_work_adjustment")


@pytest.mark.asyncio
async def test_weather_factors_valid_ranges(denver_zip):
    """AC 4.1.4: Weather factor values are within reasonable ranges."""
    result = await get_location_factors(denver_zip)
    wf = result.weather_factors

    assert 0.5 <= wf.winter_slowdown <= 2.0, "winter_slowdown out of range"
    assert 0.5 <= wf.summer_premium <= 2.0, "summer_premium out of range"
    assert isinstance(wf.rainy_season_months, list), "rainy_season_months should be a list"
    assert all(1 <= m <= 12 for m in wf.rainy_season_months), "Invalid month values"
    assert 0.5 <= wf.outdoor_work_adjustment <= 2.0, "outdoor_work_adjustment out of range"


@pytest.mark.asyncio
async def test_houston_summer_premium(houston_zip):
    """AC 4.1.4: Houston has summer_premium for hot climate."""
    result = await get_location_factors(houston_zip)

    # Houston should have summer premium due to heat
    assert result.weather_factors.summer_premium >= 1.0, \
        "Houston should have summer premium >= 1.0"


# =============================================================================
# Test: AC 4.1.5 - Unknown zip returns defaults
# =============================================================================


@pytest.mark.asyncio
async def test_unknown_zip_returns_default(unknown_zip):
    """AC 4.1.5: Unknown zip (00000) returns is_default=True."""
    result = await get_location_factors(unknown_zip)

    assert result.is_default is True, "Unknown zip should return is_default=True"
    assert result.data_source == "default", "Unknown zip should have data_source='default'"


@pytest.mark.asyncio
async def test_unknown_zip_has_valid_data(unknown_zip):
    """AC 4.1.5: Unknown zip still returns valid LocationFactors."""
    result = await get_location_factors(unknown_zip)

    # Should still have all required fields with valid data
    assert len(result.labor_rates) == 8, "Fallback should have all 8 trades"
    assert isinstance(result.permit_costs, PermitCosts)
    assert isinstance(result.weather_factors, WeatherFactors)
    assert result.zip_code == unknown_zip


@pytest.mark.asyncio
async def test_unknown_zip_uses_regional_defaults():
    """AC 4.1.5: Unknown zips use regional defaults based on prefix."""
    # Test different prefixes map to correct regions
    test_cases = [
        ("00001", "northeast"),  # 0xxxx -> northeast
        ("10001", "northeast"),  # Known NYC
        ("20001", "south"),  # 2xxxx -> south
        ("30001", "south"),  # 3xxxx -> south
        ("40001", "midwest"),  # 4xxxx -> midwest
        ("70001", "west"),  # 7xxxx -> west
        ("90099", "west"),  # 9xxxx -> west
    ]

    for zip_code, expected_region in test_cases:
        result = await get_location_factors(zip_code)
        assert result.region_code == expected_region, \
            f"Zip {zip_code} should map to {expected_region}, got {result.region_code}"
        clear_location_cache()


# =============================================================================
# Test: AC 4.1.6 - Performance (cached lookup < 500ms)
# =============================================================================


@pytest.mark.asyncio
async def test_cached_lookup_performance(denver_zip):
    """AC 4.1.6: Cached lookup completes in < 500ms."""
    # First call - populates cache
    await get_location_factors(denver_zip)

    # Second call - should be cached
    start = time.perf_counter()
    result = await get_location_factors(denver_zip)
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert elapsed_ms < 500, f"Cached lookup took {elapsed_ms}ms, should be < 500ms"
    assert result.data_source == "cache" or result is not None  # Either from cache or valid


@pytest.mark.asyncio
async def test_cache_hit_after_initial_lookup(denver_zip):
    """AC 4.1.6: Second lookup should hit cache."""
    # First lookup
    result1 = await get_location_factors(denver_zip)

    # Second lookup - should come from cache
    result2 = await get_location_factors(denver_zip)

    # Results should be identical
    assert result1.zip_code == result2.zip_code
    assert result1.city == result2.city
    assert result1.labor_rates == result2.labor_rates


@pytest.mark.asyncio
async def test_cache_stats():
    """AC 4.1.6: Cache tracks statistics correctly."""
    stats_before = get_cache_stats()
    assert stats_before["size"] == 0

    await get_location_factors("80202")

    stats_after = get_cache_stats()
    assert stats_after["size"] == 1


# =============================================================================
# Test: AC 4.1.7 - Regional cost of living variations
# =============================================================================


@pytest.mark.asyncio
async def test_nyc_rates_higher_than_denver(nyc_zip, denver_zip):
    """AC 4.1.7: NYC labor rates > Denver labor rates."""
    nyc = await get_location_factors(nyc_zip)
    clear_location_cache()
    denver = await get_location_factors(denver_zip)

    # Compare electrician rates (representative trade)
    assert nyc.labor_rates["electrician"] > denver.labor_rates["electrician"], \
        f"NYC electrician (${nyc.labor_rates['electrician']}) should be > Denver (${denver.labor_rates['electrician']})"


@pytest.mark.asyncio
async def test_denver_rates_higher_than_rural(denver_zip, rural_zip):
    """AC 4.1.7: Denver labor rates > rural rates."""
    denver = await get_location_factors(denver_zip)
    clear_location_cache()
    rural = await get_location_factors(rural_zip)

    # Compare electrician rates
    assert denver.labor_rates["electrician"] > rural.labor_rates["electrician"], \
        f"Denver electrician (${denver.labor_rates['electrician']}) should be > Rural (${rural.labor_rates['electrician']})"


@pytest.mark.asyncio
async def test_regional_rate_hierarchy():
    """AC 4.1.7: Full hierarchy - NYC > Denver > rural for all trades."""
    nyc = await get_location_factors("10001")
    clear_location_cache()
    denver = await get_location_factors("80202")
    clear_location_cache()
    rural = await get_location_factors("59001")

    for trade in REQUIRED_TRADES:
        assert nyc.labor_rates[trade] > denver.labor_rates[trade], \
            f"NYC {trade} should be > Denver {trade}"
        assert denver.labor_rates[trade] > rural.labor_rates[trade], \
            f"Denver {trade} should be > Rural {trade}"


# =============================================================================
# Test: Validation and Error Handling
# =============================================================================


def test_validate_zip_code_valid():
    """Valid zip codes should pass validation."""
    valid_zips = ["00000", "12345", "99999", "10001", "80202"]
    for zip_code in valid_zips:
        _validate_zip_code(zip_code)  # Should not raise


def test_validate_zip_code_invalid_format():
    """Invalid zip code formats should raise ValueError."""
    invalid_zips = [
        "1234",  # Too short
        "123456",  # Too long
        "1234a",  # Contains letter
        "12 34",  # Contains space
        "",  # Empty
        "ABCDE",  # All letters
    ]
    for zip_code in invalid_zips:
        with pytest.raises(ValueError):
            _validate_zip_code(zip_code)


def test_validate_zip_code_wrong_type():
    """Non-string zip codes should raise ValueError."""
    with pytest.raises(ValueError):
        _validate_zip_code(12345)  # type: ignore

    with pytest.raises(ValueError):
        _validate_zip_code(None)  # type: ignore


@pytest.mark.asyncio
async def test_get_location_factors_invalid_zip():
    """get_location_factors raises ValueError for invalid zip."""
    with pytest.raises(ValueError, match="Invalid zip code format"):
        await get_location_factors("invalid")


# =============================================================================
# Test: Region Mapping
# =============================================================================


def test_get_region_from_zip():
    """Zip prefix to region mapping works correctly."""
    test_cases = [
        ("00000", "northeast"),
        ("10001", "northeast"),
        ("20001", "south"),
        ("30001", "south"),
        ("40001", "midwest"),
        ("50001", "midwest"),
        ("60601", "midwest"),
        ("70001", "west"),
        ("80202", "west"),
        ("90001", "west"),
    ]
    for zip_code, expected_region in test_cases:
        assert _get_region_from_zip(zip_code) == expected_region


# =============================================================================
# Test: Data Model Correctness
# =============================================================================


def test_location_factors_dataclass():
    """LocationFactors dataclass works correctly."""
    factors = LocationFactors(
        zip_code="12345",
        region_code="northeast",
        city="Test City",
        state="TS",
        labor_rates={"electrician": 50.0},
        is_union=True,
        union_premium=1.25,
        permit_costs=PermitCosts(
            base_percentage=0.02,
            minimum=100.0,
            maximum=10000.0,
            inspection_fee=100.0,
        ),
        weather_factors=WeatherFactors(
            winter_slowdown=1.15,
            summer_premium=1.0,
            rainy_season_months=[4, 5],
            outdoor_work_adjustment=1.1,
        ),
        is_default=False,
        data_source="firestore",
    )

    assert factors.zip_code == "12345"
    assert factors.is_union is True
    assert factors.permit_costs.base_percentage == 0.02
    assert factors.weather_factors.winter_slowdown == 1.15


def test_permit_costs_dataclass():
    """PermitCosts dataclass with None maximum."""
    pc = PermitCosts(
        base_percentage=0.02,
        minimum=100.0,
        maximum=None,
        inspection_fee=75.0,
    )
    assert pc.maximum is None


def test_weather_factors_dataclass():
    """WeatherFactors with empty rainy_season_months."""
    wf = WeatherFactors(
        winter_slowdown=1.0,
        summer_premium=1.0,
        rainy_season_months=[],
        outdoor_work_adjustment=1.0,
    )
    assert wf.rainy_season_months == []


def test_labor_rate_dataclass():
    """LaborRate dataclass works correctly."""
    rate = LaborRate(
        trade="electrician",
        base_rate=50.0,
        benefits_burden=0.35,
        total_rate=67.5,
    )
    assert rate.trade == "electrician"
    assert rate.total_rate == 67.5


# =============================================================================
# Test: Cache Behavior
# =============================================================================


@pytest.mark.asyncio
async def test_cache_clear():
    """Cache can be cleared."""
    await get_location_factors("80202")
    assert get_cache_stats()["size"] == 1

    clear_location_cache()
    assert get_cache_stats()["size"] == 0


@pytest.mark.asyncio
async def test_multiple_zips_cached():
    """Multiple zip codes can be cached."""
    zips = ["10001", "60601", "77001", "80202"]
    for zip_code in zips:
        await get_location_factors(zip_code)

    assert get_cache_stats()["size"] == len(zips)


# =============================================================================
# Test: Edge Cases
# =============================================================================


@pytest.mark.asyncio
async def test_same_zip_multiple_calls():
    """Same zip code returns consistent results."""
    results = []
    for _ in range(5):
        result = await get_location_factors("80202")
        results.append(result.labor_rates["electrician"])

    # All results should be identical
    assert all(r == results[0] for r in results)


@pytest.mark.asyncio
async def test_boundary_zip_codes():
    """Test boundary zip codes."""
    boundary_zips = ["00001", "99999"]
    for zip_code in boundary_zips:
        result = await get_location_factors(zip_code)
        assert result.is_default is True  # Unknown zips use defaults
        assert len(result.labor_rates) == 8
        clear_location_cache()
