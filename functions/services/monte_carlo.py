"""
Monte Carlo Simulation Service for TrueCost.

Provides probabilistic cost estimation using Monte Carlo simulation
with triangular distributions for risk analysis.

Architecture:
- Uses NumPy for efficient vectorized operations
- Calculates P50, P80, P90 confidence intervals
- Performs sensitivity analysis to identify top risk factors
- Generates histogram data for visualization

References:
- docs/sprint-artifacts/tech-spec-epic-4.md
- docs/architecture.md (ADR-007: NumPy for Monte Carlo)
"""

from dataclasses import dataclass, field
from typing import List, Optional
import time

import numpy as np
import structlog

# Configure structlog logger
logger = structlog.get_logger(__name__)


# =============================================================================
# Data Models (Story 4.2 - Task 1)
# =============================================================================


@dataclass
class LineItemInput:
    """
    Input structure for a single line item in Monte Carlo simulation.

    Attributes:
        id: Unique identifier for the line item
        description: Human-readable description
        quantity: Number of units
        unit_cost_low: Optimistic unit cost estimate
        unit_cost_likely: Most likely unit cost estimate
        unit_cost_high: Pessimistic unit cost estimate
    """

    id: str
    description: str
    quantity: float
    unit_cost_low: float
    unit_cost_likely: float
    unit_cost_high: float


@dataclass
class RiskFactor:
    """
    Individual risk factor identified by sensitivity analysis.

    Attributes:
        item: Description or ID of the line item
        impact: Dollar impact on total cost
        probability: Probability of occurrence (0-1)
        sensitivity: Correlation coefficient (higher = more impact on variance)
    """

    item: str
    impact: float
    probability: float
    sensitivity: float


@dataclass
class HistogramBin:
    """
    Single histogram bin for distribution visualization.

    Attributes:
        range_low: Lower bound of the bin
        range_high: Upper bound of the bin
        count: Number of iterations falling in this bin
        percentage: Percentage of total iterations
    """

    range_low: float
    range_high: float
    count: int
    percentage: float


@dataclass
class MonteCarloResult:
    """
    Complete Monte Carlo simulation result.

    Attributes:
        iterations: Number of simulation iterations run
        p50: 50th percentile (median) cost estimate
        p80: 80th percentile cost estimate
        p90: 90th percentile cost estimate
        mean: Mean cost across all iterations
        std_dev: Standard deviation of cost distribution
        min_value: Minimum cost from all iterations
        max_value: Maximum cost from all iterations
        recommended_contingency: Recommended contingency percentage
        top_risks: List of top 5 risk factors by impact
        histogram: Histogram bins for visualization
    """

    iterations: int
    p50: float
    p80: float
    p90: float
    mean: float
    std_dev: float
    min_value: float
    max_value: float
    recommended_contingency: float
    top_risks: List[RiskFactor]
    histogram: List[HistogramBin]


# =============================================================================
# Monte Carlo Simulation (Story 4.2 - Task 3)
# =============================================================================


def run_simulation(
    line_items: List[LineItemInput],
    iterations: int = 1000,
    confidence_levels: Optional[List[int]] = None,
    num_histogram_bins: int = 20,
) -> MonteCarloResult:
    """
    Run Monte Carlo simulation on cost estimate.

    Implements AC 4.2.2 through AC 4.2.7:
    - AC 4.2.2: Runs 1000+ iterations using triangular distributions
    - AC 4.2.3: Calculates P50, P80, P90 percentiles correctly
    - AC 4.2.4: Derives contingency from P80-P50 spread
    - AC 4.2.5: Identifies top 5 risk factors by variance contribution
    - AC 4.2.6: Performance target < 2 seconds for 100 line items
    - AC 4.2.7: Returns histogram data for chart visualization

    Args:
        line_items: List of LineItemInput with cost ranges
        iterations: Number of simulation iterations (default 1000)
        confidence_levels: Percentile levels to calculate (default [50, 80, 90])
        num_histogram_bins: Number of bins for histogram (default 20)

    Returns:
        MonteCarloResult with percentiles, risks, and histogram

    Example:
        >>> items = [
        ...     LineItemInput("1", "Cabinets", 20, 175, 225, 350),
        ...     LineItemInput("2", "Countertops", 40, 65, 85, 125),
        ... ]
        >>> result = run_simulation(items, iterations=1000)
        >>> result.p50 < result.p80 < result.p90
        True
    """
    start_time = time.perf_counter()

    if confidence_levels is None:
        confidence_levels = [50, 80, 90]

    if not line_items:
        logger.warning("monte_carlo_empty_input", message="No line items provided")
        return MonteCarloResult(
            iterations=0,
            p50=0.0,
            p80=0.0,
            p90=0.0,
            mean=0.0,
            std_dev=0.0,
            min_value=0.0,
            max_value=0.0,
            recommended_contingency=0.0,
            top_risks=[],
            histogram=[],
        )

    # Set random seed for reproducibility in tests (but allow variance in production)
    # np.random.seed(None) is the default, which uses system entropy

    num_items = len(line_items)

    # Vectorized simulation using NumPy
    # Create arrays for triangular distribution parameters
    lows = np.array([item.unit_cost_low * item.quantity for item in line_items])
    modes = np.array([item.unit_cost_likely * item.quantity for item in line_items])
    highs = np.array([item.unit_cost_high * item.quantity for item in line_items])

    # Generate samples for all items across all iterations
    # Shape: (iterations, num_items)
    samples = np.zeros((iterations, num_items))
    for i, (low, mode, high) in enumerate(zip(lows, modes, highs)):
        if low == high:
            # No variance - use constant value
            samples[:, i] = np.full(iterations, mode)
        else:
            samples[:, i] = np.random.triangular(low, mode, high, size=iterations)

    # Calculate totals for each iteration
    totals = np.sum(samples, axis=1)

    # Calculate percentiles (AC 4.2.3)
    p50 = float(np.percentile(totals, 50))
    p80 = float(np.percentile(totals, 80))
    p90 = float(np.percentile(totals, 90))

    # Calculate statistics
    mean = float(np.mean(totals))
    std_dev = float(np.std(totals))
    min_value = float(np.min(totals))
    max_value = float(np.max(totals))

    # Calculate recommended contingency (AC 4.2.4)
    # Formula: (P80 - P50) / P50 * 100
    if p50 > 0:
        recommended_contingency = round((p80 - p50) / p50 * 100, 2)
    else:
        recommended_contingency = 0.0

    # Sensitivity analysis to identify top risk factors (AC 4.2.5)
    # Calculate correlation between each item's samples and total
    top_risks = _calculate_risk_factors(samples, totals, line_items)

    # Generate histogram (AC 4.2.7)
    histogram = _generate_histogram(totals, num_histogram_bins, iterations)

    duration_ms = (time.perf_counter() - start_time) * 1000

    # Structured logging (Task 4)
    logger.info(
        "monte_carlo_complete",
        iterations=iterations,
        num_items=num_items,
        p50=round(p50, 2),
        p80=round(p80, 2),
        p90=round(p90, 2),
        contingency=recommended_contingency,
        duration_ms=round(duration_ms, 2),
    )

    return MonteCarloResult(
        iterations=iterations,
        p50=round(p50, 2),
        p80=round(p80, 2),
        p90=round(p90, 2),
        mean=round(mean, 2),
        std_dev=round(std_dev, 2),
        min_value=round(min_value, 2),
        max_value=round(max_value, 2),
        recommended_contingency=recommended_contingency,
        top_risks=top_risks,
        histogram=histogram,
    )


def _calculate_risk_factors(
    samples: np.ndarray,
    totals: np.ndarray,
    line_items: List[LineItemInput],
) -> List[RiskFactor]:
    """
    Calculate top 5 risk factors by variance contribution.

    Uses correlation coefficients to determine sensitivity of each
    line item to the total cost variance.

    Args:
        samples: Array of shape (iterations, num_items)
        totals: Array of total costs per iteration
        line_items: Original line item inputs

    Returns:
        List of top 5 RiskFactor sorted by impact descending
    """
    risk_factors = []

    for i, item in enumerate(line_items):
        item_samples = samples[:, i]

        # Calculate correlation coefficient (sensitivity)
        if np.std(item_samples) > 0 and np.std(totals) > 0:
            correlation = np.corrcoef(item_samples, totals)[0, 1]
        else:
            correlation = 0.0

        # Calculate impact as the variance contribution
        # Impact is the difference between high and likely estimate * sensitivity
        expected = item.unit_cost_likely * item.quantity
        high_end = item.unit_cost_high * item.quantity
        impact = (high_end - expected) * abs(correlation)

        # Probability estimate based on distribution shape
        # For triangular distribution, probability of exceeding likely is ~33%
        probability = 0.33

        risk_factors.append(
            RiskFactor(
                item=item.description,
                impact=round(impact, 2),
                probability=probability,
                sensitivity=round(abs(correlation), 4),
            )
        )

    # Sort by impact descending and take top 5
    risk_factors.sort(key=lambda x: x.impact, reverse=True)
    return risk_factors[:5]


def _generate_histogram(
    totals: np.ndarray,
    num_bins: int,
    iterations: int,
) -> List[HistogramBin]:
    """
    Generate histogram bins for distribution visualization.

    Args:
        totals: Array of total costs per iteration
        num_bins: Number of histogram bins
        iterations: Total number of iterations

    Returns:
        List of HistogramBin for chart rendering
    """
    # Use NumPy's histogram function
    counts, bin_edges = np.histogram(totals, bins=num_bins)

    histogram = []
    for i in range(len(counts)):
        histogram.append(
            HistogramBin(
                range_low=round(bin_edges[i], 2),
                range_high=round(bin_edges[i + 1], 2),
                count=int(counts[i]),
                percentage=round(counts[i] / iterations * 100, 2),
            )
        )

    return histogram


# =============================================================================
# Utility Functions
# =============================================================================


def create_line_item(
    id: str,
    description: str,
    quantity: float,
    unit_cost: float,
    variance_pct: float = 0.20,
) -> LineItemInput:
    """
    Convenience function to create a LineItemInput with symmetric variance.

    Args:
        id: Unique identifier
        description: Item description
        quantity: Number of units
        unit_cost: Base unit cost (used as "likely" estimate)
        variance_pct: Percentage variance for low/high (default 20%)

    Returns:
        LineItemInput with calculated low/likely/high costs

    Example:
        >>> item = create_line_item("1", "Cabinets", 20, 225)
        >>> item.unit_cost_low
        180.0
        >>> item.unit_cost_likely
        225.0
        >>> item.unit_cost_high
        270.0
    """
    low = unit_cost * (1 - variance_pct)
    high = unit_cost * (1 + variance_pct)

    return LineItemInput(
        id=id,
        description=description,
        quantity=quantity,
        unit_cost_low=low,
        unit_cost_likely=unit_cost,
        unit_cost_high=high,
    )
