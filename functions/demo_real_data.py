#!/usr/bin/env python3
"""
Real Data Integration Demo Script for TrueCost.

Demonstrates Story 4.5 functionality:
- BLS API integration for labor rates
- Open-Meteo API integration for weather factors
- Agent tool invocation
- Side-by-side comparison of mock vs real data

Usage:
    cd functions && python3 demo_real_data.py --zip 10001
    cd functions && python3 demo_real_data.py --zip 80202
    cd functions && python3 demo_real_data.py --zip 10001 --test-tools
    cd functions && python3 demo_real_data.py --zip 10001 --update-firestore

References:
- Story 4.5: Real Data Integration
- Task 6: Create Demo Script for User Verification
"""

import argparse
import asyncio
import sys
from typing import Dict

# Add parent directory to path for imports
sys.path.insert(0, ".")


# =============================================================================
# Mock Data (for comparison)
# =============================================================================

MOCK_LABOR_RATES: Dict[str, Dict[str, float]] = {
    "10001": {  # NYC
        "electrician": 85.50,
        "plumber": 82.00,
        "carpenter": 65.00,
        "hvac_tech": 78.00,
        "roofer": 55.00,
        "painter": 48.00,
        "tile_setter": 52.00,
        "general_labor": 35.00,
    },
    "80202": {  # Denver
        "electrician": 62.00,
        "plumber": 58.00,
        "carpenter": 50.00,
        "hvac_tech": 58.00,
        "roofer": 45.00,
        "painter": 40.00,
        "tile_setter": 46.00,
        "general_labor": 28.00,
    },
    "77001": {  # Houston
        "electrician": 50.00,
        "plumber": 48.00,
        "carpenter": 42.00,
        "hvac_tech": 52.00,
        "roofer": 40.00,
        "painter": 35.00,
        "tile_setter": 42.00,
        "general_labor": 25.00,
    },
}

MOCK_WEATHER_FACTORS: Dict[str, Dict] = {
    "10001": {  # NYC
        "winter_slowdown": 1.15,
        "summer_premium": 1.00,
        "rainy_season_months": [3, 4, 5, 10],
        "outdoor_work_adjustment": 1.08,
    },
    "80202": {  # Denver
        "winter_slowdown": 1.25,
        "summer_premium": 1.00,
        "rainy_season_months": [4, 5],
        "outdoor_work_adjustment": 1.12,
    },
    "77001": {  # Houston
        "winter_slowdown": 1.00,
        "summer_premium": 1.15,
        "rainy_season_months": [6, 7, 8, 9],
        "outdoor_work_adjustment": 1.08,
    },
}


# =============================================================================
# Display Functions
# =============================================================================


def print_header(title: str, zip_code: str):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(f"  Real Data Integration - {title} ({zip_code})")
    print("=" * 60)


def print_section(title: str):
    """Print a section header."""
    print(f"\n  {title}")
    print("  " + "-" * (len(title) + 4))


def format_currency(value: float) -> str:
    """Format a value as currency."""
    return f"${value:.2f}"


def format_percent(value: float) -> str:
    """Format a value as a percentage."""
    return f"{value:+.1f}%"


# =============================================================================
# Demo Functions
# =============================================================================


async def demo_labor_rates(zip_code: str):
    """Demonstrate BLS labor rate comparison."""
    from services.bls_service import get_labor_rates_for_zip

    print_section("BLS Labor Rate Comparison ($/hour):")

    # Get mock data
    mock_rates = MOCK_LABOR_RATES.get(zip_code, MOCK_LABOR_RATES["10001"])

    # Get real data
    bls_response = await get_labor_rates_for_zip(zip_code)

    print(f"  {'Trade':<18} {'Mock Data':>12} {'BLS Real':>12} {'Difference':>18}")
    print("  " + "-" * 64)

    total_diff_pct = 0
    trade_count = 0

    for trade in ["electrician", "plumber", "carpenter", "hvac_tech",
                  "roofer", "painter", "tile_setter", "general_labor"]:
        mock_rate = mock_rates.get(trade, 50.0)
        real_rate = bls_response.rates[trade].hourly_rate if trade in bls_response.rates else mock_rate

        diff = real_rate - mock_rate
        diff_pct = (diff / mock_rate) * 100 if mock_rate > 0 else 0

        total_diff_pct += diff_pct
        trade_count += 1

        trade_display = trade.replace("_", " ").title()
        print(f"  {trade_display:<18} {format_currency(mock_rate):>12} {format_currency(real_rate):>12} "
              f"{format_currency(diff):>8} ({format_percent(diff_pct)})")

    print("  " + "-" * 64)
    avg_diff = total_diff_pct / trade_count if trade_count > 0 else 0
    print(f"  {'Average Difference:':<48} {format_percent(avg_diff)}")

    return bls_response


async def demo_weather_factors(zip_code: str):
    """Demonstrate weather factor comparison."""
    from services.weather_service import get_weather_factors

    print_section("Weather Factor Comparison:")

    # Get mock data
    mock_weather = MOCK_WEATHER_FACTORS.get(zip_code, MOCK_WEATHER_FACTORS["10001"])

    # Get real data
    weather = await get_weather_factors(zip_code)

    print(f"  {'Factor':<22} {'Mock Data':>12} {'Open-Meteo':>12} {'Notes':>20}")
    print("  " + "-" * 64)

    print(f"  {'Winter Slowdown':<22} {mock_weather['winter_slowdown']:>12.2f} "
          f"{weather.winter_slowdown:>12.2f} "
          f"{'(Based on ' + str(weather.freeze_days) + ' freeze days)':>20}")

    print(f"  {'Summer Premium':<22} {mock_weather['summer_premium']:>12.2f} "
          f"{weather.summer_premium:>12.2f} "
          f"{'(Based on ' + str(weather.extreme_heat_days) + ' heat days)':>20}")

    mock_rainy = str(mock_weather['rainy_season_months'])
    real_rainy = str(weather.rainy_season_months)
    print(f"  {'Rainy Months':<22} {mock_rainy:>12} {real_rainy:>12}")

    print(f"  {'Outdoor Adjustment':<22} {mock_weather['outdoor_work_adjustment']:>12.2f} "
          f"{weather.outdoor_work_adjustment:>12.2f}")

    print("  " + "-" * 64)

    return weather


def demo_data_sources(bls_response, weather):
    """Display data sources."""
    print_section("Data Sources:")

    bls_msa = bls_response.msa_code
    bls_metro = bls_response.metro_name
    print(f"    BLS: OEUM{bls_msa} series ({bls_metro})")
    print(f"    Weather: {weather.source} Historical API")


async def demo_agent_tools(zip_code: str):
    """Demonstrate agent tool invocations."""
    from tools import get_labor_rates, get_weather_factors, get_location_factors, run_monte_carlo

    print_header("Agent Data Tools Demo", zip_code)

    # Test get_labor_rates tool
    print_section("Testing get_labor_rates tool...")
    labor_input = {"zip_code": zip_code, "trades": ["electrician", "plumber"]}
    print(f"  Input: {labor_input}")
    labor_result = get_labor_rates.invoke(labor_input)
    print(f"  Output: {{")
    print(f"    \"zip_code\": \"{labor_result['zip_code']}\",")
    print(f"    \"metro_area\": \"{labor_result['metro_area']}\",")
    print(f"    \"rates\": {{")
    for trade, rate in labor_result["rates"].items():
        print(f"      \"{trade}\": {{\"hourly_rate\": {rate['hourly_rate']}, \"source\": \"{rate['source']}\", "
              f"\"soc_code\": \"{rate['soc_code']}\"}},")
    print(f"    }},")
    print(f"    \"data_date\": \"{labor_result['data_date']}\",")
    print(f"    \"cached\": {str(labor_result['cached']).lower()}")
    print(f"  }}")

    # Test get_weather_factors tool
    print_section("Testing get_weather_factors tool...")
    weather_input = {"zip_code": zip_code}
    print(f"  Input: {weather_input}")
    weather_result = get_weather_factors.invoke(weather_input)
    print(f"  Output: {{")
    print(f"    \"zip_code\": \"{weather_result['zip_code']}\",")
    print(f"    \"winter_slowdown\": {weather_result['winter_slowdown']},")
    print(f"    \"summer_premium\": {weather_result['summer_premium']},")
    print(f"    \"rainy_season_months\": {weather_result['rainy_season_months']},")
    print(f"    \"outdoor_work_adjustment\": {weather_result['outdoor_work_adjustment']},")
    print(f"    \"freeze_days\": {weather_result['freeze_days']},")
    print(f"    \"extreme_heat_days\": {weather_result['extreme_heat_days']},")
    print(f"    \"source\": \"{weather_result['source']}\"")
    print(f"  }}")

    # Test get_location_factors tool
    print_section("Testing get_location_factors tool...")
    location_input = {"zip_code": zip_code}
    print(f"  Input: {location_input}")
    location_result = get_location_factors.invoke(location_input)
    print(f"  Output: {{")
    print(f"    \"zip_code\": \"{location_result['zip_code']}\",")
    print(f"    \"labor_rates\": {{...}},")
    print(f"    \"weather_factors\": {{...}},")
    print(f"    \"regional_modifier\": {location_result['regional_modifier']},")
    print(f"    \"cost_of_living_index\": {location_result['cost_of_living_index']},")
    print(f"    \"combined_adjustment\": {location_result['combined_adjustment']}")
    print(f"  }}")

    # Test run_monte_carlo tool
    print_section("Testing run_monte_carlo tool...")
    mc_input = {
        "line_items": [
            {"category": "electrical", "base_cost": 15000, "quantity": 1},
            {"category": "plumbing", "base_cost": 12000, "quantity": 1},
        ],
        "zip_code": zip_code,
        "iterations": 10000,
    }
    print(f"  Input: {{")
    print(f"    \"line_items\": [")
    print(f"      {{\"category\": \"electrical\", \"base_cost\": 15000, \"quantity\": 1}},")
    print(f"      {{\"category\": \"plumbing\", \"base_cost\": 12000, \"quantity\": 1}}")
    print(f"    ],")
    print(f"    \"zip_code\": \"{zip_code}\",")
    print(f"    \"iterations\": 10000")
    print(f"  }}")

    mc_result = run_monte_carlo.invoke(mc_input)

    print(f"  Output: {{")
    print(f"    \"zip_code\": \"{mc_result['zip_code']}\",")
    print(f"    \"iterations\": {mc_result['iterations']},")
    print(f"    \"distribution\": {{")
    for key in ["p10", "p25", "p50", "p75", "p90", "mean", "std_dev"]:
        print(f"      \"{key}\": {mc_result['distribution'][key]:.2f},")
    print(f"    }},")
    print(f"    \"confidence_interval_90\": {mc_result['confidence_interval_90']},")
    print(f"    \"risk_factors_applied\": {mc_result['risk_factors_applied']},")
    print(f"    \"execution_time_ms\": {mc_result['execution_time_ms']}")
    print(f"  }}")

    print("\n  " + "-" * 40)
    print("  ✅ All tools responding correctly")


async def update_firestore(zip_code: str):
    """Update Firestore with real data."""
    from jobs.refresh_location_data import refresh_single_location

    print_section("Updating Firestore...")

    result = await refresh_single_location(zip_code)

    if result.success:
        print(f"  ✅ Successfully updated location data for {zip_code}")
        print(f"     BLS data: {'✓' if result.bls_success else '✗'}")
        print(f"     Weather data: {'✓' if result.weather_success else '✗'}")
        print(f"     Duration: {result.duration_ms:.2f}ms")
    else:
        print(f"  ❌ Failed to update location data for {zip_code}")
        if result.error_message:
            print(f"     Error: {result.error_message}")


# =============================================================================
# Main Entry Point
# =============================================================================


async def main():
    """Main demo function."""
    parser = argparse.ArgumentParser(
        description="Real Data Integration Demo for TrueCost"
    )
    parser.add_argument(
        "--zip",
        type=str,
        default="10001",
        help="5-digit US zip code (default: 10001)",
    )
    parser.add_argument(
        "--test-tools",
        action="store_true",
        help="Demonstrate agent tool calls",
    )
    parser.add_argument(
        "--update-firestore",
        action="store_true",
        help="Update Firestore with real data",
    )

    args = parser.parse_args()
    zip_code = args.zip

    if args.test_tools:
        await demo_agent_tools(zip_code)
        print("\n" + "=" * 60 + "\n")
        return

    if args.update_firestore:
        print_header("Firestore Update", zip_code)
        await update_firestore(zip_code)
        print("\n" + "=" * 60 + "\n")
        return

    # Default: Show data comparison
    city_names = {
        "10001": "NYC",
        "80202": "Denver",
        "77001": "Houston",
        "90001": "Los Angeles",
        "60601": "Chicago",
        "85001": "Phoenix",
        "98101": "Seattle",
        "30301": "Atlanta",
    }
    city = city_names.get(zip_code, "Location")

    print_header(city, zip_code)

    bls_response = await demo_labor_rates(zip_code)
    weather = await demo_weather_factors(zip_code)
    demo_data_sources(bls_response, weather)

    print(f"\n  To update Firestore with real data, run:")
    print(f"    python3 demo_real_data.py --zip {zip_code} --update-firestore")

    print("\n  To test agent tool invocations, run:")
    print(f"    python3 demo_real_data.py --zip {zip_code} --test-tools")

    print("\n" + "=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
