#!/usr/bin/env python3
"""
Demo script to test the Location Intelligence Service.

Usage:
    python3 demo_location_service.py [zip_code]

Examples:
    python3 demo_location_service.py 80202    # Denver
    python3 demo_location_service.py 60601    # Chicago (union)
    python3 demo_location_service.py 77001    # Houston (non-union)
    python3 demo_location_service.py 10001    # NYC (high cost)
    python3 demo_location_service.py 00000    # Unknown (fallback)
"""

import asyncio
import sys

from services.cost_data_service import get_location_factors, REQUIRED_TRADES


def format_currency(value: float) -> str:
    return f"${value:,.2f}"


async def demo(zip_code: str):
    print(f"\n{'='*60}")
    print(f"  Location Intelligence Service - Lookup: {zip_code}")
    print(f"{'='*60}\n")

    try:
        result = await get_location_factors(zip_code)
    except ValueError as e:
        print(f"Error: {e}")
        return

    # Basic info
    print(f"📍 Location: {result.city}, {result.state}")
    print(f"   Region: {result.region_code}")
    print(f"   Zip: {result.zip_code}")
    print(f"   Data source: {result.data_source}")
    if result.is_default:
        print(f"   ⚠️  Using regional defaults (specific zip not found)")

    # Union status
    print(f"\n🏗️  Union Status:")
    print(f"   Union market: {'Yes' if result.is_union else 'No'}")
    if result.is_union:
        print(f"   Union premium: {result.union_premium:.0%}")

    # Labor rates
    print(f"\n👷 Labor Rates (hourly):")
    for trade in REQUIRED_TRADES:
        rate = result.labor_rates.get(trade, 0)
        print(f"   {trade.replace('_', ' ').title():20} {format_currency(rate)}/hr")

    # Permit costs
    print(f"\n📋 Permit Costs:")
    pc = result.permit_costs
    print(f"   Base percentage: {pc.base_percentage:.1%} of project value")
    print(f"   Minimum fee: {format_currency(pc.minimum)}")
    if pc.maximum:
        print(f"   Maximum fee: {format_currency(pc.maximum)}")
    print(f"   Inspection fee: {format_currency(pc.inspection_fee)}")

    # Weather factors
    print(f"\n🌤️  Weather/Seasonal Factors:")
    wf = result.weather_factors
    print(f"   Winter slowdown: {wf.winter_slowdown:.0%} productivity")
    print(f"   Summer premium: {wf.summer_premium:.0%}")
    if wf.rainy_season_months:
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        rainy = [months[m-1] for m in wf.rainy_season_months]
        print(f"   Rainy season: {', '.join(rainy)}")
    print(f"   Outdoor work adjustment: {wf.outdoor_work_adjustment:.0%}")

    print(f"\n{'='*60}\n")


async def compare_locations():
    """Compare multiple locations side by side."""
    zips = {
        "10001": "NYC",
        "60601": "Chicago",
        "77001": "Houston",
        "80202": "Denver",
        "59001": "Rural MT",
    }

    print(f"\n{'='*70}")
    print("  Regional Labor Rate Comparison (Electrician)")
    print(f"{'='*70}\n")

    print(f"{'Location':<20} {'Rate':>10} {'Union':>8} {'Winter':>10}")
    print("-" * 50)

    for zip_code, name in zips.items():
        result = await get_location_factors(zip_code)
        rate = result.labor_rates["electrician"]
        union = "Yes" if result.is_union else "No"
        winter = f"{result.weather_factors.winter_slowdown:.0%}"
        print(f"{name:<20} {format_currency(rate):>10} {union:>8} {winter:>10}")

    print(f"\n{'='*70}\n")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--compare":
            asyncio.run(compare_locations())
        else:
            asyncio.run(demo(sys.argv[1]))
    else:
        # Default: show Denver and comparison
        asyncio.run(demo("80202"))
        asyncio.run(compare_locations())
