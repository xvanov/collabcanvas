"""
Unit Tests for Cost Data Service (Story 4.2).

Tests AC 4.2.1:
- get_material_cost returns unit cost, labor hours, crew for valid RSMeans item codes
- get_material_cost raises ItemNotFoundError for invalid code
- search_materials returns matching items
- get_labor_rate returns labor rate with burden and union premium

Uses pytest and pytest-asyncio for async testing.
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from services.cost_data_service import (
    MaterialCost,
    LaborRate,
    ItemNotFoundError,
    get_material_cost,
    get_labor_rate,
    search_materials,
    MATERIAL_DATA,
    clear_location_cache,
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
def valid_item_code():
    """Valid RSMeans item code for gypsum board."""
    return "092900"


@pytest.fixture
def invalid_item_code():
    """Invalid item code that doesn't exist."""
    return "999999"


@pytest.fixture
def cabinet_item_code():
    """Valid item code for kitchen cabinets."""
    return "123200"


# =============================================================================
# Test: AC 4.2.1 - get_material_cost returns all required fields
# =============================================================================


@pytest.mark.asyncio
async def test_get_material_cost_returns_all_fields(valid_item_code):
    """AC 4.2.1: get_material_cost returns unit cost, labor hours, crew."""
    result = await get_material_cost(valid_item_code)

    assert isinstance(result, MaterialCost)
    assert result.item_code == valid_item_code
    assert result.unit_cost > 0, "unit_cost should be positive"
    assert result.labor_hours >= 0, "labor_hours should be non-negative"
    assert len(result.crew) > 0, "crew should not be empty"
    assert result.cost_low > 0, "cost_low should be positive"
    assert result.cost_likely > 0, "cost_likely should be positive"
    assert result.cost_high > 0, "cost_high should be positive"


@pytest.mark.asyncio
async def test_get_material_cost_triangular_distribution_valid(valid_item_code):
    """AC 4.2.1: cost_low <= cost_likely <= cost_high for triangular distribution."""
    result = await get_material_cost(valid_item_code)

    assert result.cost_low <= result.cost_likely, "cost_low should be <= cost_likely"
    assert result.cost_likely <= result.cost_high, "cost_likely should be <= cost_high"


@pytest.mark.asyncio
async def test_get_material_cost_all_items_valid():
    """AC 4.2.1: All items in MATERIAL_DATA have valid structure."""
    for item_code in MATERIAL_DATA.keys():
        result = await get_material_cost(item_code)
        assert isinstance(result, MaterialCost)
        assert result.item_code == item_code
        assert result.unit_cost >= 0
        assert result.labor_hours >= 0
        assert len(result.description) > 0
        assert len(result.unit) > 0
        assert len(result.csi_division) > 0


@pytest.mark.asyncio
async def test_get_material_cost_cabinet_specific(cabinet_item_code):
    """AC 4.2.1: Kitchen cabinets item returns expected values."""
    result = await get_material_cost(cabinet_item_code)

    assert "Cabinet" in result.description
    assert result.unit == "lf"
    assert result.csi_division == "12"
    assert result.labor_hours > 0


# =============================================================================
# Test: AC 4.2.1 - get_material_cost raises ItemNotFoundError
# =============================================================================


@pytest.mark.asyncio
async def test_get_material_cost_raises_item_not_found(invalid_item_code):
    """AC 4.2.1: get_material_cost raises ItemNotFoundError for invalid code."""
    with pytest.raises(ItemNotFoundError) as exc_info:
        await get_material_cost(invalid_item_code)

    assert exc_info.value.item_code == invalid_item_code
    assert invalid_item_code in str(exc_info.value)


@pytest.mark.asyncio
async def test_item_not_found_error_has_item_code():
    """AC 4.2.1: ItemNotFoundError contains the item code."""
    error = ItemNotFoundError("TEST123")
    assert error.item_code == "TEST123"
    assert "TEST123" in str(error)


# =============================================================================
# Test: AC 4.2.1 - search_materials returns matching items
# =============================================================================


@pytest.mark.asyncio
async def test_search_materials_by_description():
    """AC 4.2.1: search_materials returns items matching description."""
    results = await search_materials("cabinet")

    assert len(results) > 0
    assert any("Cabinet" in r.description for r in results)


@pytest.mark.asyncio
async def test_search_materials_by_item_code():
    """AC 4.2.1: search_materials returns items matching item code."""
    results = await search_materials("0929")  # Partial match

    assert len(results) > 0
    assert any(r.item_code.startswith("0929") for r in results)


@pytest.mark.asyncio
async def test_search_materials_with_csi_filter():
    """AC 4.2.1: search_materials filters by CSI division."""
    # Search for all items in division 12 (Furnishings)
    results = await search_materials("", csi_division="12")

    assert len(results) > 0
    assert all(r.csi_division == "12" for r in results)


@pytest.mark.asyncio
async def test_search_materials_respects_limit():
    """AC 4.2.1: search_materials respects limit parameter."""
    results = await search_materials("", limit=3)

    assert len(results) <= 3


@pytest.mark.asyncio
async def test_search_materials_no_matches():
    """AC 4.2.1: search_materials returns empty list for no matches."""
    results = await search_materials("NONEXISTENT_MATERIAL_XYZ123")

    assert results == []


@pytest.mark.asyncio
async def test_search_materials_case_insensitive():
    """AC 4.2.1: search_materials is case-insensitive."""
    results_upper = await search_materials("CABINET")
    results_lower = await search_materials("cabinet")
    results_mixed = await search_materials("CaBiNeT")

    assert len(results_upper) == len(results_lower) == len(results_mixed)


# =============================================================================
# Test: get_labor_rate function
# =============================================================================


@pytest.mark.asyncio
async def test_get_labor_rate_returns_labor_rate():
    """get_labor_rate returns LaborRate dataclass."""
    result = await get_labor_rate("electrician", "80202")

    assert isinstance(result, LaborRate)
    assert result.trade == "electrician"
    assert result.base_rate > 0
    assert result.benefits_burden == 0.35
    assert result.total_rate > result.base_rate


@pytest.mark.asyncio
async def test_get_labor_rate_applies_burden():
    """get_labor_rate applies 35% benefits burden."""
    result = await get_labor_rate("electrician", "80202")

    # Total should include burden (base * 1.35)
    expected_min = result.base_rate * 1.35
    assert result.total_rate >= expected_min * 0.99  # Allow for rounding


@pytest.mark.asyncio
async def test_get_labor_rate_union_premium():
    """get_labor_rate applies union premium for union markets."""
    # Chicago is a union market
    result = await get_labor_rate("electrician", "60601")

    # Union premium should be applied on top of burden
    base_with_burden = result.base_rate * (1 + result.benefits_burden)
    assert result.total_rate > base_with_burden


@pytest.mark.asyncio
async def test_get_labor_rate_non_union():
    """get_labor_rate has no union premium for non-union markets."""
    # Houston is non-union
    result = await get_labor_rate("electrician", "77001")

    # Without union premium, total should be base * 1.35
    expected = result.base_rate * (1 + result.benefits_burden)
    assert abs(result.total_rate - expected) < 0.01


@pytest.mark.asyncio
async def test_get_labor_rate_invalid_trade():
    """get_labor_rate raises ValueError for unknown trade."""
    with pytest.raises(ValueError, match="Unknown trade"):
        await get_labor_rate("unknown_trade", "80202")


@pytest.mark.asyncio
async def test_get_labor_rate_invalid_zip():
    """get_labor_rate raises ValueError for invalid zip code."""
    with pytest.raises(ValueError, match="Invalid zip code"):
        await get_labor_rate("electrician", "invalid")


# =============================================================================
# Test: Data Model Correctness
# =============================================================================


def test_material_cost_dataclass():
    """MaterialCost dataclass works correctly."""
    material = MaterialCost(
        item_code="TEST001",
        description="Test Material",
        unit="sf",
        unit_cost=10.00,
        labor_hours=0.5,
        crew="1 Worker",
        crew_daily_output=100,
        productivity_factor=1.0,
        cost_low=8.00,
        cost_likely=10.00,
        cost_high=12.00,
        csi_division="09",
        subdivision="09 00 00",
    )

    assert material.item_code == "TEST001"
    assert material.unit_cost == 10.00
    assert material.cost_low < material.cost_likely < material.cost_high


def test_item_not_found_error_inheritance():
    """ItemNotFoundError is a proper Exception subclass."""
    error = ItemNotFoundError("TEST123")
    assert isinstance(error, Exception)
    assert hasattr(error, "item_code")
