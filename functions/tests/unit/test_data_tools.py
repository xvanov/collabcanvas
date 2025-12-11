"""
Unit Tests for Agent Data Tools.

Tests for Story 4.5: Real Data Integration (AC 4.5.10-4.5.16)

Test Coverage:
- AC 4.5.10: get_labor_rates tool returns hourly rates for trades and zip code
- AC 4.5.11: get_weather_factors tool returns seasonal adjustments for zip code
- AC 4.5.12: get_location_factors tool returns complete location modifiers
- AC 4.5.13: Tool definitions follow OpenAI function calling schema
- AC 4.5.14: Agents can invoke data tools during execution
- AC 4.5.15: run_monte_carlo tool executes simulation with configurable iterations
- AC 4.5.16: Monte Carlo tool returns confidence intervals
"""

import pytest
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, str(__file__).replace("/tests/unit/test_data_tools.py", ""))

from tools.data_tools import (
    get_labor_rates,
    get_weather_factors,
    get_location_factors,
    LaborRatesInput,
    WeatherFactorsInput,
    LocationFactorsInput,
)
from tools.simulation_tools import (
    run_monte_carlo,
    MonteCarloInput,
)


# =============================================================================
# Test Tool Schema Compliance (AC 4.5.13)
# =============================================================================


class TestToolSchemaCompliance:
    """Tests for OpenAI function calling schema compliance (AC 4.5.13)."""

    def test_labor_rates_has_schema(self):
        """Test get_labor_rates has proper schema."""
        # Check it has args_schema
        assert hasattr(get_labor_rates, "args_schema")
        assert get_labor_rates.args_schema == LaborRatesInput

    def test_weather_factors_has_schema(self):
        """Test get_weather_factors has proper schema."""
        assert hasattr(get_weather_factors, "args_schema")
        assert get_weather_factors.args_schema == WeatherFactorsInput

    def test_location_factors_has_schema(self):
        """Test get_location_factors has proper schema."""
        assert hasattr(get_location_factors, "args_schema")
        assert get_location_factors.args_schema == LocationFactorsInput

    def test_monte_carlo_has_schema(self):
        """Test run_monte_carlo has proper schema."""
        assert hasattr(run_monte_carlo, "args_schema")
        assert run_monte_carlo.args_schema == MonteCarloInput

    def test_labor_rates_schema_fields(self):
        """Test LaborRatesInput has correct fields."""
        schema = LaborRatesInput.model_json_schema()

        assert "zip_code" in schema["properties"]
        assert "trades" in schema["properties"]
        assert schema["properties"]["zip_code"]["type"] == "string"

    def test_monte_carlo_schema_fields(self):
        """Test MonteCarloInput has correct fields."""
        schema = MonteCarloInput.model_json_schema()

        assert "line_items" in schema["properties"]
        assert "zip_code" in schema["properties"]
        assert "iterations" in schema["properties"]


# =============================================================================
# Test get_labor_rates Tool (AC 4.5.10)
# =============================================================================


class TestGetLaborRatesTool:
    """Tests for get_labor_rates tool (AC 4.5.10)."""

    def test_returns_dict_with_required_fields(self):
        """Test tool returns dict with all required fields."""
        result = get_labor_rates.invoke({"zip_code": "10001"})

        assert isinstance(result, dict)
        assert "zip_code" in result
        assert "metro_area" in result
        assert "rates" in result
        assert "data_date" in result
        assert "cached" in result

    def test_returns_rates_for_all_trades(self):
        """Test tool returns rates for all 8 trades by default."""
        result = get_labor_rates.invoke({"zip_code": "10001"})

        rates = result["rates"]
        expected_trades = [
            "electrician", "plumber", "carpenter", "hvac_tech",
            "roofer", "painter", "tile_setter", "general_labor"
        ]

        for trade in expected_trades:
            assert trade in rates, f"Missing rate for {trade}"
            assert "hourly_rate" in rates[trade]
            assert "source" in rates[trade]
            assert "soc_code" in rates[trade]

    def test_filters_to_specific_trades(self):
        """Test tool filters to specified trades."""
        result = get_labor_rates.invoke({
            "zip_code": "10001",
            "trades": ["electrician", "plumber"]
        })

        rates = result["rates"]
        assert len(rates) == 2
        assert "electrician" in rates
        assert "plumber" in rates
        assert "carpenter" not in rates

    def test_echoes_zip_code(self):
        """Test tool echoes zip_code for traceability."""
        result = get_labor_rates.invoke({"zip_code": "80202"})
        assert result["zip_code"] == "80202"


# =============================================================================
# Test get_weather_factors Tool (AC 4.5.11)
# =============================================================================


class TestGetWeatherFactorsTool:
    """Tests for get_weather_factors tool (AC 4.5.11)."""

    def test_returns_dict_with_required_fields(self):
        """Test tool returns dict with all required fields."""
        result = get_weather_factors.invoke({"zip_code": "10001"})

        assert isinstance(result, dict)
        assert "zip_code" in result
        assert "winter_slowdown" in result
        assert "summer_premium" in result
        assert "rainy_season_months" in result
        assert "outdoor_work_adjustment" in result
        assert "freeze_days" in result
        assert "extreme_heat_days" in result
        assert "source" in result

    def test_winter_slowdown_valid_range(self):
        """Test winter_slowdown is in valid range (1.0 to 1.5)."""
        result = get_weather_factors.invoke({"zip_code": "10001"})

        assert 1.0 <= result["winter_slowdown"] <= 1.5

    def test_summer_premium_valid_range(self):
        """Test summer_premium is in valid range (1.0 to 1.3)."""
        result = get_weather_factors.invoke({"zip_code": "10001"})

        assert 1.0 <= result["summer_premium"] <= 1.3

    def test_rainy_months_are_valid(self):
        """Test rainy_season_months contains valid month numbers."""
        result = get_weather_factors.invoke({"zip_code": "10001"})

        for month in result["rainy_season_months"]:
            assert 1 <= month <= 12

    def test_echoes_zip_code(self):
        """Test tool echoes zip_code for traceability."""
        result = get_weather_factors.invoke({"zip_code": "98101"})
        assert result["zip_code"] == "98101"


# =============================================================================
# Test get_location_factors Tool (AC 4.5.12)
# =============================================================================


class TestGetLocationFactorsTool:
    """Tests for get_location_factors tool (AC 4.5.12)."""

    def test_returns_dict_with_required_fields(self):
        """Test tool returns dict with all required fields."""
        result = get_location_factors.invoke({"zip_code": "10001"})

        assert isinstance(result, dict)
        assert "zip_code" in result
        assert "labor_rates" in result
        assert "weather_factors" in result
        assert "regional_modifier" in result
        assert "cost_of_living_index" in result
        assert "is_union" in result
        assert "permit_costs" in result
        assert "combined_adjustment" in result

    def test_includes_all_labor_rates(self):
        """Test includes labor rates for all trades."""
        result = get_location_factors.invoke({"zip_code": "10001"})

        labor_rates = result["labor_rates"]
        assert len(labor_rates) == 8

    def test_includes_weather_factors(self):
        """Test includes weather factor data."""
        result = get_location_factors.invoke({"zip_code": "10001"})

        weather = result["weather_factors"]
        assert "winter_slowdown" in weather
        assert "summer_premium" in weather
        assert "rainy_season_months" in weather
        assert "outdoor_work_adjustment" in weather

    def test_includes_permit_costs(self):
        """Test includes permit cost data."""
        result = get_location_factors.invoke({"zip_code": "10001"})

        permits = result["permit_costs"]
        assert "base_percentage" in permits
        assert "minimum" in permits
        assert "inspection_fee" in permits

    def test_regional_modifier_is_numeric(self):
        """Test regional_modifier is a numeric value."""
        result = get_location_factors.invoke({"zip_code": "10001"})

        assert isinstance(result["regional_modifier"], (int, float))
        assert result["regional_modifier"] > 0


# =============================================================================
# Test run_monte_carlo Tool (AC 4.5.15-4.5.16)
# =============================================================================


class TestRunMonteCarloTool:
    """Tests for run_monte_carlo tool (AC 4.5.15-4.5.16)."""

    def test_returns_dict_with_required_fields(self):
        """Test tool returns dict with all required fields."""
        result = run_monte_carlo.invoke({
            "line_items": [
                {"category": "electrical", "base_cost": 15000, "quantity": 1},
                {"category": "plumbing", "base_cost": 12000, "quantity": 1},
            ],
            "zip_code": "10001",
            "iterations": 100,  # Small for test speed
        })

        assert isinstance(result, dict)
        assert "zip_code" in result
        assert "iterations" in result
        assert "distribution" in result
        assert "confidence_interval_90" in result
        assert "risk_factors_applied" in result
        assert "execution_time_ms" in result

    def test_distribution_has_percentiles(self):
        """Test distribution includes required percentiles."""
        result = run_monte_carlo.invoke({
            "line_items": [
                {"category": "electrical", "base_cost": 15000, "quantity": 1},
            ],
            "zip_code": "10001",
            "iterations": 100,
        })

        dist = result["distribution"]
        assert "p10" in dist
        assert "p25" in dist
        assert "p50" in dist
        assert "p75" in dist
        assert "p90" in dist
        assert "mean" in dist
        assert "std_dev" in dist

    def test_percentiles_in_order(self):
        """Test p10 < p50 < p90."""
        result = run_monte_carlo.invoke({
            "line_items": [
                {"category": "electrical", "base_cost": 15000, "quantity": 1},
                {"category": "plumbing", "base_cost": 12000, "quantity": 1},
            ],
            "zip_code": "10001",
            "iterations": 1000,
        })

        dist = result["distribution"]
        assert dist["p10"] <= dist["p50"] <= dist["p90"]

    def test_confidence_interval_format(self):
        """Test confidence_interval_90 is [p10, p90] format."""
        result = run_monte_carlo.invoke({
            "line_items": [
                {"category": "electrical", "base_cost": 15000, "quantity": 1},
            ],
            "zip_code": "10001",
            "iterations": 100,
        })

        ci = result["confidence_interval_90"]
        assert isinstance(ci, list)
        assert len(ci) == 2
        assert ci[0] <= ci[1]

    def test_respects_iterations_parameter(self):
        """Test tool uses specified iterations."""
        result = run_monte_carlo.invoke({
            "line_items": [
                {"category": "electrical", "base_cost": 15000, "quantity": 1},
            ],
            "zip_code": "10001",
            "iterations": 500,
        })

        assert result["iterations"] == 500

    def test_risk_factors_applied(self):
        """Test risk_factors_applied is populated."""
        result = run_monte_carlo.invoke({
            "line_items": [
                {"category": "electrical", "base_cost": 15000, "quantity": 1},
            ],
            "zip_code": "10001",
            "iterations": 100,
        })

        assert isinstance(result["risk_factors_applied"], list)
        assert len(result["risk_factors_applied"]) > 0
        assert "labor_variance" in result["risk_factors_applied"]

    def test_execution_time_recorded(self):
        """Test execution_time_ms is recorded."""
        result = run_monte_carlo.invoke({
            "line_items": [
                {"category": "electrical", "base_cost": 15000, "quantity": 1},
            ],
            "zip_code": "10001",
            "iterations": 100,
        })

        assert result["execution_time_ms"] > 0


# =============================================================================
# Test Agent Tool Invocation (AC 4.5.14)
# =============================================================================


class TestAgentToolInvocation:
    """Tests for agent tool invocation simulation (AC 4.5.14)."""

    def test_labor_rates_callable_with_dict_args(self):
        """Test tool can be called with dict arguments (agent-style)."""
        # Simulate how an agent would call the tool via invoke
        args = {"zip_code": "10001", "trades": ["electrician"]}

        result = get_labor_rates.invoke(args)

        assert result["zip_code"] == "10001"
        assert "electrician" in result["rates"]

    def test_weather_factors_callable_with_dict_args(self):
        """Test weather tool can be called with dict arguments."""
        args = {"zip_code": "98101"}

        result = get_weather_factors.invoke(args)

        assert result["zip_code"] == "98101"

    def test_monte_carlo_callable_with_dict_args(self):
        """Test Monte Carlo tool can be called with dict arguments."""
        args = {
            "line_items": [
                {"category": "electrical", "base_cost": 15000, "quantity": 1}
            ],
            "zip_code": "10001",
            "iterations": 100,
        }

        result = run_monte_carlo.invoke(args)

        assert result["zip_code"] == "10001"
        assert "distribution" in result


# =============================================================================
# Test Tool Response Contract
# =============================================================================


class TestToolResponseContract:
    """Tests for tool response structure contract."""

    def test_all_tools_return_zip_code(self):
        """Test all tools echo zip_code for traceability."""
        zip_code = "60601"

        labor_result = get_labor_rates.invoke({"zip_code": zip_code})
        weather_result = get_weather_factors.invoke({"zip_code": zip_code})
        location_result = get_location_factors.invoke({"zip_code": zip_code})

        assert labor_result["zip_code"] == zip_code
        assert weather_result["zip_code"] == zip_code
        assert location_result["zip_code"] == zip_code

    def test_labor_rates_includes_source(self):
        """Test labor rates include source for provenance."""
        result = get_labor_rates.invoke({"zip_code": "10001"})

        for trade, rate in result["rates"].items():
            assert "source" in rate
            assert rate["source"] in ["BLS", "cached"]

    def test_weather_includes_source(self):
        """Test weather factors include source."""
        result = get_weather_factors.invoke({"zip_code": "10001"})

        assert "source" in result
        assert result["source"] in ["Open-Meteo", "cached"]
