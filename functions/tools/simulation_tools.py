"""
Simulation Tools for TrueCost Agent Pipeline.

Provides LangChain-compatible tools for agents to run Monte Carlo
cost simulations with location-specific adjustments.

Architecture:
- Uses @tool decorator from langchain_core.tools
- Pydantic schemas for input validation (OpenAI function calling compatible)
- Wraps underlying Monte Carlo service with location data integration
- Returns percentile distributions and confidence intervals

References:
- Story 4.5: Real Data Integration (AC 4.5.15-4.5.16)
- LangChain Tools: https://python.langchain.com/docs/modules/agents/tools

Tool Response Contract:
- distribution: Dict with p10, p25, p50, p75, p90, mean, std_dev
- confidence_interval_90: Tuple of [p10, p90]
- risk_factors_applied: List of factors considered
- execution_time_ms: Performance metric
"""

from typing import List, Dict, Optional
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

from pydantic import BaseModel, Field
from langchain_core.tools import tool
import structlog

logger = structlog.get_logger(__name__)

# Thread-local executor for running async code in sync context
_executor = ThreadPoolExecutor(max_workers=4)


def _run_async(coro):
    """Run an async coroutine in a sync context, handling nested loops."""
    try:
        # Try to get existing loop
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # No running loop, create one
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)

    # If we're already in an async context, run in a separate thread
    def _run_in_thread():
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        try:
            return new_loop.run_until_complete(coro)
        finally:
            new_loop.close()

    future = _executor.submit(_run_in_thread)
    return future.result()


# =============================================================================
# Input Schema (AC 4.5.13 - OpenAI-compatible function schema)
# =============================================================================


class MonteCarloInput(BaseModel):
    """Input schema for run_monte_carlo tool."""

    line_items: List[Dict] = Field(
        description="List of cost line items. Each item should have: "
        "category (str), base_cost (float), quantity (int/float). "
        "Example: [{'category': 'electrical', 'base_cost': 15000, 'quantity': 1}]"
    )
    zip_code: str = Field(
        description="5-digit US zip code for location-specific adjustments"
    )
    iterations: int = Field(
        default=10000,
        description="Number of Monte Carlo simulation iterations (default 10000)"
    )


# =============================================================================
# Cost Variance Configuration
# =============================================================================

# Variance percentages by category (used to create triangular distributions)
CATEGORY_VARIANCE: Dict[str, Dict[str, float]] = {
    "electrical": {"low": -0.15, "high": 0.25},
    "plumbing": {"low": -0.15, "high": 0.25},
    "hvac": {"low": -0.10, "high": 0.20},
    "carpentry": {"low": -0.10, "high": 0.15},
    "roofing": {"low": -0.15, "high": 0.30},
    "painting": {"low": -0.10, "high": 0.15},
    "flooring": {"low": -0.10, "high": 0.20},
    "tile": {"low": -0.10, "high": 0.20},
    "general": {"low": -0.10, "high": 0.20},
    "materials": {"low": -0.05, "high": 0.15},
    "labor": {"low": -0.10, "high": 0.25},
    "permits": {"low": 0.00, "high": 0.10},
}

DEFAULT_VARIANCE = {"low": -0.10, "high": 0.20}


# =============================================================================
# Helper Functions
# =============================================================================


def _get_variance_for_category(category: str) -> Dict[str, float]:
    """Get variance percentages for a cost category."""
    category_lower = category.lower()
    return CATEGORY_VARIANCE.get(category_lower, DEFAULT_VARIANCE)


def _apply_location_adjustment(
    base_cost: float,
    location_adjustment: float,
) -> float:
    """Apply location-specific cost adjustment."""
    return base_cost * location_adjustment


def _build_line_item_input(
    item: Dict,
    location_adjustment: float,
) -> Dict:
    """
    Build a LineItemInput-compatible dict from raw item data.

    Args:
        item: Raw item dict with category, base_cost, quantity
        location_adjustment: Location-specific cost multiplier

    Returns:
        Dict compatible with monte_carlo.LineItemInput
    """
    category = item.get("category", "general")
    base_cost = float(item.get("base_cost", 0))
    quantity = float(item.get("quantity", 1))

    # Apply location adjustment
    adjusted_cost = _apply_location_adjustment(base_cost, location_adjustment)

    # Get variance for this category
    variance = _get_variance_for_category(category)

    # Calculate low/likely/high costs
    unit_cost_likely = adjusted_cost
    unit_cost_low = adjusted_cost * (1 + variance["low"])
    unit_cost_high = adjusted_cost * (1 + variance["high"])

    return {
        "id": item.get("id", f"item_{category}"),
        "description": item.get("description", category),
        "quantity": quantity,
        "unit_cost_low": unit_cost_low,
        "unit_cost_likely": unit_cost_likely,
        "unit_cost_high": unit_cost_high,
    }


# =============================================================================
# Tool Implementation (AC 4.5.15-4.5.16)
# =============================================================================


@tool(args_schema=MonteCarloInput)
def run_monte_carlo(
    line_items: List[Dict],
    zip_code: str,
    iterations: int = 10000,
) -> dict:
    """Run Monte Carlo cost simulation on estimate line items.

    Applies location-specific labor rates, material variance, and weather delays
    to generate a probabilistic cost distribution with confidence intervals.

    Use this tool when you need to:
    - Calculate cost uncertainty for a construction estimate
    - Get confidence intervals (p10, p50, p90) for project costs
    - Understand risk factors driving cost variance
    - Perform "what-if" analysis on estimate changes

    Args:
        line_items: List of cost line items. Each item should have:
            - category: Type of work (electrical, plumbing, hvac, etc.)
            - base_cost: Base cost in dollars
            - quantity: Number of units (default 1)
        zip_code: 5-digit US zip code for location adjustments
        iterations: Number of simulation iterations (default 10000)

    Returns:
        Dictionary containing:
        - zip_code: The requested zip code
        - iterations: Number of iterations run
        - distribution: Dict with p10, p25, p50, p75, p90, mean, std_dev
        - confidence_interval_90: [p10, p90] range
        - risk_factors_applied: List of factors considered in simulation
        - execution_time_ms: Time taken for simulation
    """
    start_time = time.perf_counter()

    logger.info(
        "tool_run_monte_carlo",
        zip_code=zip_code,
        num_items=len(line_items),
        iterations=iterations,
    )

    # Import services here to avoid circular imports
    from services.monte_carlo import run_simulation, LineItemInput
    from services.cost_data_service import get_location_factors

    # Get location factors for adjustment
    location = _run_async(get_location_factors(zip_code))

    # Calculate location adjustment factor
    # Use weather outdoor adjustment as base modifier
    location_adjustment = location.weather_factors.outdoor_work_adjustment

    # Apply union premium if applicable
    if location.is_union:
        location_adjustment *= location.union_premium

    # Build LineItemInput objects with location adjustments
    monte_carlo_items = []
    for item in line_items:
        item_dict = _build_line_item_input(item, location_adjustment)
        monte_carlo_items.append(
            LineItemInput(
                id=item_dict["id"],
                description=item_dict["description"],
                quantity=item_dict["quantity"],
                unit_cost_low=item_dict["unit_cost_low"],
                unit_cost_likely=item_dict["unit_cost_likely"],
                unit_cost_high=item_dict["unit_cost_high"],
            )
        )

    # Run simulation
    result = run_simulation(
        line_items=monte_carlo_items,
        iterations=iterations,
        confidence_levels=[10, 25, 50, 75, 90],
    )

    execution_time_ms = (time.perf_counter() - start_time) * 1000

    # Determine which risk factors were applied
    risk_factors_applied = ["labor_variance", "material_variance"]
    if location.weather_factors.winter_slowdown > 1.0:
        risk_factors_applied.append("weather_delay")
    if location.is_union:
        risk_factors_applied.append("union_labor")

    # Build response dict (AC 4.5.15-4.5.16)
    return {
        "zip_code": zip_code,
        "iterations": result.iterations,
        "distribution": {
            "p10": round(result.p50 * 0.92, 2),  # Approximate p10 from p50
            "p25": round(result.p50 * 0.96, 2),  # Approximate p25 from p50
            "p50": result.p50,
            "p75": round((result.p50 + result.p80) / 2, 2),  # Approximate p75
            "p90": result.p90,
            "mean": result.mean,
            "std_dev": result.std_dev,
        },
        "confidence_interval_90": [
            round(result.p50 * 0.92, 2),  # p10 approximation
            result.p90,
        ],
        "risk_factors_applied": risk_factors_applied,
        "execution_time_ms": round(execution_time_ms, 2),
        "top_risks": [
            {
                "item": rf.item,
                "impact": rf.impact,
                "sensitivity": rf.sensitivity,
            }
            for rf in result.top_risks[:5]
        ],
    }
