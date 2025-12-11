"""
Unit Tests for Weather Service.

Tests for Story 4.5: Real Data Integration (AC 4.5.4-4.5.6, 4.5.8)

Test Coverage:
- AC 4.5.4: Weather API retrieves historical precipitation and temperature data
- AC 4.5.5: Weather data calculates winter_slowdown from freeze days
- AC 4.5.6: Weather data identifies rainy_season_months from precipitation
- AC 4.5.8: API failures gracefully fall back to cached/default data
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

import sys
sys.path.insert(0, str(__file__).replace("/tests/unit/test_weather_service.py", ""))

from services.weather_service import (
    ZIP_COORDINATES,
    ZIP_PREFIX_COORDINATES,
    DEFAULT_WEATHER_BY_REGION,
    WeatherFactors,
    get_coordinates_for_zip,
    get_region_for_zip,
    calculate_winter_slowdown,
    calculate_summer_premium,
    identify_rainy_months,
    calculate_outdoor_adjustment,
    get_weather_factors,
    compare_weather_factors,
    _get_fallback_weather,
    _parse_weather_response,
)


# =============================================================================
# Test Coordinate Mapping
# =============================================================================


class TestCoordinateMapping:
    """Tests for zip code to coordinate mapping."""

    def test_known_zip_returns_coordinates(self):
        """Test that known zip code returns coordinates."""
        coords = get_coordinates_for_zip("10001")
        assert coords is not None
        lat, lon = coords
        assert 40.0 <= lat <= 41.0  # NYC latitude range
        assert -74.5 <= lon <= -73.5  # NYC longitude range

    def test_zip_prefix_fallback(self):
        """Test that unknown exact zip falls back to prefix."""
        coords = get_coordinates_for_zip("10099")
        assert coords is not None
        # Should be NYC area
        lat, lon = coords
        assert 40.0 <= lat <= 41.0

    def test_unknown_zip_returns_none(self):
        """Test that completely unknown zip returns None."""
        coords = get_coordinates_for_zip("00000")
        assert coords is None

    def test_major_metros_have_coordinates(self):
        """Verify all 8 major metros have coordinates."""
        major_zips = ["10001", "90001", "60601", "77001", "85001", "80202", "98101", "30301"]

        for zip_code in major_zips:
            coords = get_coordinates_for_zip(zip_code)
            assert coords is not None, f"Missing coordinates for {zip_code}"


# =============================================================================
# Test Winter Slowdown Calculation (AC 4.5.5)
# =============================================================================


class TestWinterSlowdownCalculation:
    """Tests for winter slowdown factor calculation (AC 4.5.5)."""

    def test_zero_freeze_days_no_slowdown(self):
        """Test no slowdown when no freeze days."""
        factor = calculate_winter_slowdown(0)
        assert factor == 1.0

    def test_45_freeze_days_moderate_slowdown(self):
        """Test moderate slowdown for NYC-like climate (~45 freeze days)."""
        factor = calculate_winter_slowdown(45)
        # 1.0 + (45/365) * 0.5 ≈ 1.06
        assert 1.05 <= factor <= 1.10

    def test_120_freeze_days_high_slowdown(self):
        """Test higher slowdown for Chicago-like climate (~120 freeze days)."""
        factor = calculate_winter_slowdown(120)
        # 1.0 + (120/365) * 0.5 ≈ 1.16
        assert 1.15 <= factor <= 1.20

    def test_max_slowdown_capped_at_1_5(self):
        """Test that slowdown is capped at 1.5."""
        factor = calculate_winter_slowdown(500)  # More than 365 days
        assert factor == 1.5

    def test_denver_vs_houston_slowdown(self):
        """Compare Denver (more freeze days) vs Houston (fewer freeze days)."""
        # Denver typically has ~150 freeze days
        denver_factor = calculate_winter_slowdown(150)
        # Houston typically has ~10 freeze days
        houston_factor = calculate_winter_slowdown(10)

        assert denver_factor > houston_factor
        assert denver_factor > 1.15  # Significant slowdown
        assert houston_factor < 1.05  # Minimal slowdown


# =============================================================================
# Test Summer Premium Calculation (AC 4.5.5)
# =============================================================================


class TestSummerPremiumCalculation:
    """Tests for summer premium factor calculation."""

    def test_zero_heat_days_no_premium(self):
        """Test no premium when no extreme heat days."""
        factor = calculate_summer_premium(0)
        assert factor == 1.0

    def test_30_heat_days_moderate_premium(self):
        """Test moderate premium for moderate heat."""
        factor = calculate_summer_premium(30)
        # 1.0 + (30/365) * 0.3 ≈ 1.02
        assert 1.01 <= factor <= 1.05

    def test_100_heat_days_high_premium(self):
        """Test higher premium for Phoenix-like climate (~100 heat days)."""
        factor = calculate_summer_premium(100)
        # 1.0 + (100/365) * 0.3 ≈ 1.08
        assert 1.05 <= factor <= 1.12

    def test_max_premium_capped_at_1_3(self):
        """Test that premium is capped at 1.3."""
        factor = calculate_summer_premium(500)
        assert factor == 1.3


# =============================================================================
# Test Rainy Season Detection (AC 4.5.6)
# =============================================================================


class TestRainySeasonDetection:
    """Tests for rainy season month identification (AC 4.5.6)."""

    def test_identify_rainy_months_threshold(self):
        """Test that months above 76.2mm threshold are identified."""
        monthly_precip = {
            1: 80.0,   # Rainy (above threshold)
            2: 70.0,   # Not rainy
            3: 90.0,   # Rainy
            4: 50.0,   # Not rainy
            5: 60.0,   # Not rainy
            6: 100.0,  # Rainy
            7: 40.0,   # Not rainy
            8: 30.0,   # Not rainy
            9: 20.0,   # Not rainy
            10: 85.0,  # Rainy
            11: 95.0,  # Rainy
            12: 75.0,  # Not rainy (exactly at threshold)
        }

        rainy_months = identify_rainy_months(monthly_precip)
        assert 1 in rainy_months
        assert 3 in rainy_months
        assert 6 in rainy_months
        assert 10 in rainy_months
        assert 11 in rainy_months
        assert 12 not in rainy_months  # 75.0 is not > 76.2
        assert 4 not in rainy_months

    def test_seattle_more_rainy_than_phoenix(self):
        """Test Seattle has more rainy months than Phoenix (AC 4.5.6)."""
        # Simulated Seattle-like precipitation (wet winters)
        seattle_precip = {
            1: 150.0, 2: 100.0, 3: 90.0, 4: 60.0, 5: 50.0, 6: 40.0,
            7: 20.0, 8: 25.0, 9: 50.0, 10: 90.0, 11: 140.0, 12: 160.0
        }

        # Simulated Phoenix-like precipitation (dry except monsoon)
        phoenix_precip = {
            1: 20.0, 2: 20.0, 3: 25.0, 4: 10.0, 5: 5.0, 6: 5.0,
            7: 80.0, 8: 90.0, 9: 30.0, 10: 15.0, 11: 15.0, 12: 25.0
        }

        seattle_rainy = identify_rainy_months(seattle_precip)
        phoenix_rainy = identify_rainy_months(phoenix_precip)

        assert len(seattle_rainy) > len(phoenix_rainy)
        assert len(seattle_rainy) >= 5  # Seattle should have 5+ rainy months
        assert len(phoenix_rainy) <= 3  # Phoenix should have 2-3 rainy months (monsoon)

    def test_empty_precipitation_returns_empty_list(self):
        """Test empty precipitation dict returns empty list."""
        rainy_months = identify_rainy_months({})
        assert rainy_months == []


# =============================================================================
# Test Outdoor Work Adjustment
# =============================================================================


class TestOutdoorWorkAdjustment:
    """Tests for combined outdoor work adjustment factor."""

    def test_average_of_factors(self):
        """Test adjustment is average of winter and summer factors."""
        winter = 1.20
        summer = 1.10
        expected = (1.20 + 1.10) / 2  # 1.15

        adjustment = calculate_outdoor_adjustment(winter, summer)
        assert adjustment == 1.15

    def test_no_factors_returns_1_0(self):
        """Test no adjustments returns 1.0."""
        adjustment = calculate_outdoor_adjustment(1.0, 1.0)
        assert adjustment == 1.0


# =============================================================================
# Test Fallback Data (AC 4.5.8)
# =============================================================================


class TestFallbackWeather:
    """Tests for graceful fallback on API failure (AC 4.5.8)."""

    def test_fallback_returns_weather_factors(self):
        """Test fallback returns WeatherFactors object."""
        factors = _get_fallback_weather("10001")

        assert isinstance(factors, WeatherFactors)
        assert factors.zip_code == "10001"
        assert factors.source == "cached"

    def test_fallback_uses_regional_data(self):
        """Test fallback uses appropriate regional data."""
        # NYC should use northeast defaults
        nyc_factors = _get_fallback_weather("10001")
        assert nyc_factors.winter_slowdown >= 1.15  # Northeast has winter

        # Phoenix should use southwest defaults
        phoenix_factors = _get_fallback_weather("85001")
        assert phoenix_factors.summer_premium >= 1.15  # Southwest has heat

    def test_all_regions_have_defaults(self):
        """Verify all regions have default weather data."""
        expected_regions = ["northeast", "southeast", "midwest", "southwest", "west", "northwest"]

        for region in expected_regions:
            assert region in DEFAULT_WEATHER_BY_REGION
            data = DEFAULT_WEATHER_BY_REGION[region]
            assert "winter_slowdown" in data
            assert "summer_premium" in data
            assert "rainy_season_months" in data


# =============================================================================
# Test Weather Response Parsing
# =============================================================================


class TestWeatherResponseParsing:
    """Tests for parsing Open-Meteo API responses."""

    def test_parse_valid_response(self):
        """Test parsing a valid Open-Meteo response."""
        mock_response = {
            "daily": {
                "time": ["2024-01-01", "2024-01-02", "2024-07-01"],
                "temperature_2m_min": [-5.0, 2.0, 20.0],
                "temperature_2m_max": [5.0, 10.0, 40.0],
                "precipitation_sum": [10.0, 0.0, 5.0],
            }
        }

        freeze_days, heat_days, total_precip, monthly = _parse_weather_response(mock_response)

        assert freeze_days == 1  # Only day 1 has min < 0
        assert heat_days == 1  # Only day 3 has max > 35
        assert total_precip == 15.0
        assert 1 in monthly  # January has precipitation
        assert 7 in monthly  # July has precipitation

    def test_parse_empty_response(self):
        """Test parsing empty response returns zeros."""
        mock_response = {"daily": {}}

        freeze_days, heat_days, total_precip, monthly = _parse_weather_response(mock_response)

        assert freeze_days == 0
        assert heat_days == 0
        assert total_precip == 0.0
        assert monthly == {}


# =============================================================================
# Test Main Service Function
# =============================================================================


class TestGetWeatherFactors:
    """Tests for main get_weather_factors function."""

    @pytest.mark.asyncio
    async def test_returns_weather_factors(self):
        """Test that function returns WeatherFactors object."""
        factors = await get_weather_factors("10001")

        assert isinstance(factors, WeatherFactors)
        assert factors.zip_code == "10001"
        assert factors.winter_slowdown >= 1.0
        assert factors.summer_premium >= 1.0
        assert isinstance(factors.rainy_season_months, list)

    @pytest.mark.asyncio
    async def test_unknown_zip_uses_fallback(self):
        """Test that unknown zip uses regional fallback."""
        factors = await get_weather_factors("00000")

        assert factors.source == "cached"


# =============================================================================
# Test Comparison Function
# =============================================================================


class TestCompareWeatherFactors:
    """Tests for weather factor comparison utility."""

    @pytest.mark.asyncio
    async def test_compare_returns_both_locations(self):
        """Test comparison returns data for both locations."""
        result = await compare_weather_factors("80202", "77001")  # Denver vs Houston

        assert "location_1" in result
        assert "location_2" in result
        assert "comparison" in result

        assert result["location_1"]["zip_code"] == "80202"
        assert result["location_2"]["zip_code"] == "77001"

    @pytest.mark.asyncio
    async def test_denver_vs_houston_winter_diff(self):
        """Test Denver has higher winter slowdown than Houston."""
        result = await compare_weather_factors("80202", "77001")

        # Denver should have higher winter slowdown
        denver_winter = result["location_1"]["factors"].winter_slowdown
        houston_winter = result["location_2"]["factors"].winter_slowdown

        assert denver_winter > houston_winter
