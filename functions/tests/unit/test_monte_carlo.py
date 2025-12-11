"""
Unit Tests for Monte Carlo Simulation Service (Story 4.2).

Tests AC 4.2.2 through AC 4.2.7:
- 4.2.2: Simulation runs 1000+ iterations using triangular distributions
- 4.2.3: P50 < P80 < P90 percentiles always hold
- 4.2.4: Contingency formula is correctly applied
- 4.2.5: Top 5 risks are sorted by impact descending
- 4.2.6: Simulation completes in < 2 seconds for 100 items
- 4.2.7: Histogram bins sum to iteration count

Uses pytest for testing.
"""

import pytest
import time
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from services.monte_carlo import (
    LineItemInput,
    RiskFactor,
    HistogramBin,
    MonteCarloResult,
    run_simulation,
    create_line_item,
)


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def simple_line_items():
    """Simple 3-item estimate for basic tests."""
    return [
        LineItemInput("1", "Cabinets", 20.0, 175.0, 225.0, 350.0),
        LineItemInput("2", "Countertops", 40.0, 65.0, 85.0, 125.0),
        LineItemInput("3", "Paint", 500.0, 0.95, 1.25, 1.75),
    ]


@pytest.fixture
def kitchen_remodel_items():
    """20-item kitchen remodel estimate for comprehensive tests."""
    return [
        LineItemInput("1", "Cabinet installation", 20.0, 175.0, 225.0, 350.0),
        LineItemInput("2", "Countertop materials (granite)", 40.0, 65.0, 85.0, 125.0),
        LineItemInput("3", "Interior paint", 500.0, 0.95, 1.25, 1.75),
        LineItemInput("4", "Flooring (hardwood)", 200.0, 9.0, 12.0, 18.0),
        LineItemInput("5", "Electrical rough-in", 1.0, 2800.0, 3500.0, 4500.0),
        LineItemInput("6", "Plumbing fixtures", 1.0, 950.0, 1250.0, 1800.0),
        LineItemInput("7", "Plumbing rough-in", 1.0, 2200.0, 2800.0, 3800.0),
        LineItemInput("8", "Lighting fixtures (LED)", 12.0, 125.0, 175.0, 275.0),
        LineItemInput("9", "Appliance package", 1.0, 2500.0, 3500.0, 5500.0),
        LineItemInput("10", "Backsplash tile", 30.0, 6.50, 8.50, 12.00),
        LineItemInput("11", "Sink and faucet", 1.0, 400.0, 600.0, 900.0),
        LineItemInput("12", "Range hood", 1.0, 300.0, 500.0, 800.0),
        LineItemInput("13", "Garbage disposal", 1.0, 150.0, 250.0, 400.0),
        LineItemInput("14", "Drywall repair", 100.0, 0.75, 0.85, 1.10),
        LineItemInput("15", "Trim and molding", 60.0, 2.50, 3.50, 5.00),
        LineItemInput("16", "Permits and fees", 1.0, 800.0, 1200.0, 1800.0),
        LineItemInput("17", "Demolition", 1.0, 1500.0, 2000.0, 3000.0),
        LineItemInput("18", "Waste removal", 1.0, 400.0, 600.0, 900.0),
        LineItemInput("19", "Hardware (handles, knobs)", 30.0, 8.0, 12.0, 20.0),
        LineItemInput("20", "Contingency allowance", 1.0, 1000.0, 1500.0, 2500.0),
    ]


@pytest.fixture
def large_estimate_items():
    """100-item estimate for performance testing."""
    items = []
    for i in range(100):
        items.append(
            LineItemInput(
                id=str(i + 1),
                description=f"Line item {i + 1}",
                quantity=float((i % 10) + 1) * 10,
                unit_cost_low=100.0 + (i * 5),
                unit_cost_likely=120.0 + (i * 5),
                unit_cost_high=150.0 + (i * 5),
            )
        )
    return items


# =============================================================================
# Test: AC 4.2.2 - Simulation runs 1000+ iterations
# =============================================================================


def test_simulation_runs_1000_iterations(simple_line_items):
    """AC 4.2.2: Simulation runs 1000+ iterations."""
    result = run_simulation(simple_line_items, iterations=1000)

    assert result.iterations == 1000


def test_simulation_runs_custom_iterations(simple_line_items):
    """AC 4.2.2: Simulation respects custom iteration count."""
    result = run_simulation(simple_line_items, iterations=5000)

    assert result.iterations == 5000


def test_simulation_uses_triangular_distribution(simple_line_items):
    """AC 4.2.2: Results should fall within low-high bounds (triangular)."""
    result = run_simulation(simple_line_items, iterations=1000)

    # Calculate expected bounds
    min_total = sum(item.unit_cost_low * item.quantity for item in simple_line_items)
    max_total = sum(item.unit_cost_high * item.quantity for item in simple_line_items)

    assert result.min_value >= min_total * 0.99  # Allow small floating point variance
    assert result.max_value <= max_total * 1.01


# =============================================================================
# Test: AC 4.2.3 - P50 < P80 < P90 percentiles
# =============================================================================


def test_percentiles_ordered_correctly(simple_line_items):
    """AC 4.2.3: P50 < P80 < P90 always holds."""
    result = run_simulation(simple_line_items, iterations=1000)

    assert result.p50 < result.p80, f"P50 ({result.p50}) should be < P80 ({result.p80})"
    assert result.p80 < result.p90, f"P80 ({result.p80}) should be < P90 ({result.p90})"


def test_percentiles_ordered_multiple_runs(simple_line_items):
    """AC 4.2.3: P50 < P80 < P90 holds across multiple runs."""
    for _ in range(10):
        result = run_simulation(simple_line_items, iterations=1000)
        assert result.p50 < result.p80 < result.p90


def test_percentiles_ordered_large_estimate(kitchen_remodel_items):
    """AC 4.2.3: P50 < P80 < P90 holds for large estimates."""
    result = run_simulation(kitchen_remodel_items, iterations=1000)

    assert result.p50 < result.p80 < result.p90


def test_percentiles_positive(simple_line_items):
    """AC 4.2.3: All percentiles should be positive."""
    result = run_simulation(simple_line_items, iterations=1000)

    assert result.p50 > 0
    assert result.p80 > 0
    assert result.p90 > 0


def test_mean_near_p50(simple_line_items):
    """AC 4.2.3: Mean should be reasonably close to P50 for triangular distributions."""
    result = run_simulation(simple_line_items, iterations=1000)

    # For roughly symmetric distributions, mean should be within 20% of P50
    ratio = result.mean / result.p50
    assert 0.8 < ratio < 1.3


# =============================================================================
# Test: AC 4.2.4 - Contingency formula
# =============================================================================


def test_contingency_formula_applied(simple_line_items):
    """AC 4.2.4: Contingency = (P80 - P50) / P50 * 100."""
    result = run_simulation(simple_line_items, iterations=1000)

    expected_contingency = (result.p80 - result.p50) / result.p50 * 100

    assert abs(result.recommended_contingency - expected_contingency) < 0.1


def test_contingency_is_percentage(simple_line_items):
    """AC 4.2.4: Contingency should be a reasonable percentage."""
    result = run_simulation(simple_line_items, iterations=1000)

    # Contingency should typically be between 5% and 50%
    assert 0 < result.recommended_contingency < 100


def test_contingency_with_known_values():
    """AC 4.2.4: Test contingency formula with known input values."""
    # Create items with very small variance
    items = [
        LineItemInput("1", "Low variance cost", 1.0, 990.0, 1000.0, 1010.0),
    ]
    result = run_simulation(items, iterations=1000)

    # With minimal variance, contingency should be very small
    assert result.recommended_contingency < 5.0


# =============================================================================
# Test: AC 4.2.5 - Top 5 risk factors
# =============================================================================


def test_top_risks_has_five_items(kitchen_remodel_items):
    """AC 4.2.5: Top risks list has exactly 5 items."""
    result = run_simulation(kitchen_remodel_items, iterations=1000)

    assert len(result.top_risks) == 5


def test_top_risks_sorted_by_impact(kitchen_remodel_items):
    """AC 4.2.5: Top 5 risks are sorted by impact descending."""
    result = run_simulation(kitchen_remodel_items, iterations=1000)

    impacts = [risk.impact for risk in result.top_risks]
    assert impacts == sorted(impacts, reverse=True)


def test_top_risks_are_risk_factors(kitchen_remodel_items):
    """AC 4.2.5: Top risks are RiskFactor instances."""
    result = run_simulation(kitchen_remodel_items, iterations=1000)

    for risk in result.top_risks:
        assert isinstance(risk, RiskFactor)
        assert hasattr(risk, "item")
        assert hasattr(risk, "impact")
        assert hasattr(risk, "sensitivity")


def test_top_risks_sensitivity_valid(kitchen_remodel_items):
    """AC 4.2.5: Sensitivity values are valid correlation coefficients."""
    result = run_simulation(kitchen_remodel_items, iterations=1000)

    for risk in result.top_risks:
        assert 0 <= risk.sensitivity <= 1, "Sensitivity should be between 0 and 1"


def test_fewer_than_five_items_returns_all():
    """AC 4.2.5: With fewer than 5 items, return all as risks."""
    items = [
        LineItemInput("1", "Item A", 1.0, 100.0, 150.0, 200.0),
        LineItemInput("2", "Item B", 1.0, 200.0, 250.0, 300.0),
    ]
    result = run_simulation(items, iterations=1000)

    assert len(result.top_risks) == 2


# =============================================================================
# Test: AC 4.2.6 - Performance (< 2 seconds for 100 items)
# =============================================================================


def test_performance_100_items(large_estimate_items):
    """AC 4.2.6: Simulation completes in < 2 seconds for 100 line items."""
    start_time = time.perf_counter()
    result = run_simulation(large_estimate_items, iterations=1000)
    elapsed = time.perf_counter() - start_time

    assert elapsed < 2.0, f"Simulation took {elapsed:.2f}s, should be < 2s"
    assert result.iterations == 1000


def test_performance_with_more_iterations(simple_line_items):
    """AC 4.2.6: Performance is acceptable with 10000 iterations."""
    start_time = time.perf_counter()
    result = run_simulation(simple_line_items, iterations=10000)
    elapsed = time.perf_counter() - start_time

    assert elapsed < 5.0, f"Simulation took {elapsed:.2f}s, should be < 5s"
    assert result.iterations == 10000


# =============================================================================
# Test: AC 4.2.7 - Histogram data
# =============================================================================


def test_histogram_bins_sum_to_iterations(simple_line_items):
    """AC 4.2.7: Histogram bins sum to iteration count."""
    iterations = 1000
    result = run_simulation(simple_line_items, iterations=iterations)

    total_count = sum(bin.count for bin in result.histogram)
    assert total_count == iterations


def test_histogram_has_reasonable_bins(simple_line_items):
    """AC 4.2.7: Histogram has reasonable bin count (10-50 bins)."""
    result = run_simulation(simple_line_items, iterations=1000)

    assert 10 <= len(result.histogram) <= 50


def test_histogram_bins_are_histogram_bin_type(simple_line_items):
    """AC 4.2.7: Histogram contains HistogramBin instances."""
    result = run_simulation(simple_line_items, iterations=1000)

    for bin in result.histogram:
        assert isinstance(bin, HistogramBin)
        assert hasattr(bin, "range_low")
        assert hasattr(bin, "range_high")
        assert hasattr(bin, "count")
        assert hasattr(bin, "percentage")


def test_histogram_bins_contiguous(simple_line_items):
    """AC 4.2.7: Histogram bins are contiguous (no gaps)."""
    result = run_simulation(simple_line_items, iterations=1000)

    for i in range(len(result.histogram) - 1):
        assert abs(result.histogram[i].range_high - result.histogram[i + 1].range_low) < 0.01


def test_histogram_percentages_sum_to_100(simple_line_items):
    """AC 4.2.7: Histogram percentages sum to approximately 100%."""
    result = run_simulation(simple_line_items, iterations=1000)

    total_percentage = sum(bin.percentage for bin in result.histogram)
    assert abs(total_percentage - 100.0) < 0.1


def test_histogram_covers_distribution_range(simple_line_items):
    """AC 4.2.7: Histogram covers min to max of distribution."""
    result = run_simulation(simple_line_items, iterations=1000)

    assert result.histogram[0].range_low <= result.min_value + 1
    assert result.histogram[-1].range_high >= result.max_value - 1


# =============================================================================
# Test: Edge Cases and Error Handling
# =============================================================================


def test_empty_line_items():
    """Empty line items returns zero values."""
    result = run_simulation([], iterations=1000)

    assert result.iterations == 0
    assert result.p50 == 0.0
    assert result.p80 == 0.0
    assert result.p90 == 0.0
    assert result.top_risks == []
    assert result.histogram == []


def test_single_item():
    """Single item works correctly."""
    items = [LineItemInput("1", "Single item", 10.0, 100.0, 150.0, 200.0)]
    result = run_simulation(items, iterations=1000)

    assert result.iterations == 1000
    assert result.p50 > 0
    assert len(result.top_risks) == 1


def test_zero_variance_item():
    """Items with no variance (low=likely=high) work correctly."""
    items = [
        LineItemInput("1", "Fixed cost", 1.0, 1000.0, 1000.0, 1000.0),  # Zero variance
        LineItemInput("2", "Variable cost", 1.0, 500.0, 750.0, 1000.0),
    ]
    result = run_simulation(items, iterations=1000)

    # Should still produce valid results
    assert result.iterations == 1000
    assert result.p50 > 0
    # The fixed cost should contribute exactly 1000 to all iterations
    # So minimum total should be at least 1000 + (500*1) = 1500
    assert result.min_value >= 1500


def test_all_zero_variance_items():
    """All items with zero variance should produce identical results."""
    items = [
        LineItemInput("1", "Fixed A", 1.0, 1000.0, 1000.0, 1000.0),
        LineItemInput("2", "Fixed B", 1.0, 500.0, 500.0, 500.0),
    ]
    result = run_simulation(items, iterations=1000)

    # All iterations should have the same total
    assert result.p50 == result.p80 == result.p90 == 1500.0
    assert result.std_dev == 0.0


# =============================================================================
# Test: Data Model Correctness
# =============================================================================


def test_line_item_input_dataclass():
    """LineItemInput dataclass works correctly."""
    item = LineItemInput(
        id="TEST",
        description="Test item",
        quantity=10.0,
        unit_cost_low=100.0,
        unit_cost_likely=150.0,
        unit_cost_high=200.0,
    )

    assert item.id == "TEST"
    assert item.quantity == 10.0
    assert item.unit_cost_low < item.unit_cost_likely < item.unit_cost_high


def test_risk_factor_dataclass():
    """RiskFactor dataclass works correctly."""
    risk = RiskFactor(
        item="Cabinets",
        impact=2400.0,
        probability=0.33,
        sensitivity=0.85,
    )

    assert risk.item == "Cabinets"
    assert risk.impact == 2400.0
    assert risk.sensitivity == 0.85


def test_histogram_bin_dataclass():
    """HistogramBin dataclass works correctly."""
    bin = HistogramBin(
        range_low=40000.0,
        range_high=42000.0,
        count=150,
        percentage=15.0,
    )

    assert bin.range_low == 40000.0
    assert bin.range_high == 42000.0
    assert bin.count == 150
    assert bin.percentage == 15.0


def test_monte_carlo_result_dataclass():
    """MonteCarloResult dataclass works correctly."""
    result = MonteCarloResult(
        iterations=1000,
        p50=45000.0,
        p80=49000.0,
        p90=52000.0,
        mean=46000.0,
        std_dev=3500.0,
        min_value=38000.0,
        max_value=58000.0,
        recommended_contingency=8.9,
        top_risks=[],
        histogram=[],
    )

    assert result.iterations == 1000
    assert result.p50 == 45000.0
    assert result.recommended_contingency == 8.9


# =============================================================================
# Test: Utility Functions
# =============================================================================


def test_create_line_item_helper():
    """create_line_item convenience function works correctly."""
    item = create_line_item("1", "Cabinets", 20.0, 225.0)

    assert item.id == "1"
    assert item.description == "Cabinets"
    assert item.quantity == 20.0
    assert item.unit_cost_likely == 225.0
    # Default 20% variance
    assert item.unit_cost_low == 225.0 * 0.8
    assert item.unit_cost_high == 225.0 * 1.2


def test_create_line_item_custom_variance():
    """create_line_item with custom variance."""
    item = create_line_item("1", "Cabinets", 20.0, 225.0, variance_pct=0.30)

    assert item.unit_cost_low == 225.0 * 0.7
    assert item.unit_cost_high == 225.0 * 1.3
