"""
Integration tests for cost data coverage.

Tests AC 4.4.6 and AC 4.4.7: Kitchen and Bathroom remodel BoQs can be
fully costed from seeded material data (100% coverage).

These tests verify that all line items in the sample BoQ files can be
matched to materials in the materials database, ensuring the estimation
pipeline has complete coverage for common remodel scenarios.

References:
- Story 4.4: Cost Data Seeding & Maintenance
- docs/sprint-artifacts/tech-spec-epic-4.md
"""

import json
import pytest
from pathlib import Path
from typing import Dict, List, Set


@pytest.fixture(scope="module")
def data_dir():
    """Get the data directory path."""
    return Path(__file__).parent.parent.parent / 'data'


@pytest.fixture(scope="module")
def materials(data_dir) -> Dict[str, Dict]:
    """Load materials data as a dictionary keyed by item_code."""
    with open(data_dir / 'materials.json') as f:
        materials_list = json.load(f)['materials']
    return {m['item_code']: m for m in materials_list}


@pytest.fixture(scope="module")
def kitchen_boq(data_dir) -> List[Dict]:
    """Load kitchen BoQ data."""
    with open(data_dir / 'sample_boq_kitchen.json') as f:
        return json.load(f)['line_items']


@pytest.fixture(scope="module")
def bathroom_boq(data_dir) -> List[Dict]:
    """Load bathroom BoQ data."""
    with open(data_dir / 'sample_boq_bathroom.json') as f:
        return json.load(f)['line_items']


# =============================================================================
# AC 4.4.6: Kitchen Remodel BoQ 100% Coverage
# =============================================================================

class TestKitchenBoQCoverage:
    """Tests for AC 4.4.6: Kitchen remodel BoQ can be fully costed (100% coverage)."""

    def test_kitchen_boq_has_items(self, kitchen_boq):
        """Kitchen BoQ must have items to test."""
        assert len(kitchen_boq) > 0, "Kitchen BoQ has no line items"
        assert len(kitchen_boq) >= 40, f"Expected >= 40 kitchen items, got {len(kitchen_boq)}"

    def test_kitchen_boq_100_percent_coverage(self, kitchen_boq, materials):
        """Every kitchen BoQ item must exist in materials database."""
        missing = []
        for item in kitchen_boq:
            item_code = item['item_code']
            if item_code not in materials:
                missing.append(item_code)

        coverage = (len(kitchen_boq) - len(missing)) / len(kitchen_boq) * 100

        assert len(missing) == 0, \
            f"Kitchen BoQ coverage is {coverage:.1f}%. Missing items: {missing}"

    def test_kitchen_boq_items_can_be_costed(self, kitchen_boq, materials):
        """Each kitchen BoQ item can have its cost calculated."""
        for item in kitchen_boq:
            item_code = item['item_code']
            quantity = item['quantity']

            material = materials.get(item_code)
            assert material is not None, f"Material {item_code} not found"

            # Verify we can calculate cost
            unit_cost = material['unit_cost']
            total_cost = unit_cost * quantity

            assert total_cost >= 0, f"Invalid cost calculation for {item_code}"

    def test_kitchen_boq_has_required_categories(self, kitchen_boq, materials):
        """Kitchen BoQ must include key categories for complete remodel."""
        categories_found = set()

        for item in kitchen_boq:
            item_code = item['item_code']
            material = materials.get(item_code)
            if material:
                categories_found.add(material['csi_division'])

        # Kitchen remodel should touch multiple divisions
        assert '06' in categories_found, "No wood/cabinet items (Division 06)"
        assert '22' in categories_found, "No plumbing items (Division 22)"
        assert '26' in categories_found, "No electrical items (Division 26)"
        assert '09' in categories_found, "No finishes items (Division 09)"


# =============================================================================
# AC 4.4.7: Bathroom Remodel BoQ 100% Coverage
# =============================================================================

class TestBathroomBoQCoverage:
    """Tests for AC 4.4.7: Bathroom remodel BoQ can be fully costed (100% coverage)."""

    def test_bathroom_boq_has_items(self, bathroom_boq):
        """Bathroom BoQ must have items to test."""
        assert len(bathroom_boq) > 0, "Bathroom BoQ has no line items"
        assert len(bathroom_boq) >= 25, f"Expected >= 25 bathroom items, got {len(bathroom_boq)}"

    def test_bathroom_boq_100_percent_coverage(self, bathroom_boq, materials):
        """Every bathroom BoQ item must exist in materials database."""
        missing = []
        for item in bathroom_boq:
            item_code = item['item_code']
            if item_code not in materials:
                missing.append(item_code)

        coverage = (len(bathroom_boq) - len(missing)) / len(bathroom_boq) * 100

        assert len(missing) == 0, \
            f"Bathroom BoQ coverage is {coverage:.1f}%. Missing items: {missing}"

    def test_bathroom_boq_items_can_be_costed(self, bathroom_boq, materials):
        """Each bathroom BoQ item can have its cost calculated."""
        for item in bathroom_boq:
            item_code = item['item_code']
            quantity = item['quantity']

            material = materials.get(item_code)
            assert material is not None, f"Material {item_code} not found"

            # Verify we can calculate cost
            unit_cost = material['unit_cost']
            total_cost = unit_cost * quantity

            assert total_cost >= 0, f"Invalid cost calculation for {item_code}"

    def test_bathroom_boq_has_required_categories(self, bathroom_boq, materials):
        """Bathroom BoQ must include key categories for complete remodel."""
        categories_found = set()

        for item in bathroom_boq:
            item_code = item['item_code']
            material = materials.get(item_code)
            if material:
                categories_found.add(material['csi_division'])

        # Bathroom remodel should touch multiple divisions
        assert '22' in categories_found, "No plumbing items (Division 22)"
        assert '09' in categories_found, "No finishes items (Division 09)"
        assert '10' in categories_found, "No specialties items (Division 10)"


# =============================================================================
# Cross-BoQ Coverage Tests
# =============================================================================

class TestCrossBoQCoverage:
    """Tests for overall BoQ material coverage patterns."""

    def test_boqs_share_common_materials(self, kitchen_boq, bathroom_boq, materials):
        """Some materials should be shared between kitchen and bathroom BoQs."""
        kitchen_codes = {item['item_code'] for item in kitchen_boq}
        bathroom_codes = {item['item_code'] for item in bathroom_boq}

        shared = kitchen_codes & bathroom_codes

        # Should share some common items like paint, drywall, etc.
        assert len(shared) >= 3, \
            f"Expected >= 3 shared materials between BoQs, got {len(shared)}"

    def test_combined_boq_coverage_uses_diverse_materials(self, kitchen_boq, bathroom_boq, materials):
        """Combined BoQs should use a diverse set of materials."""
        all_codes = {item['item_code'] for item in kitchen_boq}
        all_codes.update(item['item_code'] for item in bathroom_boq)

        # Combined should use significant portion of materials database
        coverage_pct = len(all_codes) / len(materials) * 100

        assert coverage_pct >= 30, \
            f"Combined BoQs only use {coverage_pct:.1f}% of materials database"

    def test_monte_carlo_costs_available_for_all_boq_items(self, kitchen_boq, bathroom_boq, materials):
        """All BoQ items must have cost_low/likely/high for Monte Carlo simulation."""
        all_items = list(kitchen_boq) + list(bathroom_boq)

        for item in all_items:
            item_code = item['item_code']
            material = materials.get(item_code)

            assert material is not None, f"Material {item_code} not found"
            assert 'cost_low' in material, f"Material {item_code} missing cost_low"
            assert 'cost_likely' in material, f"Material {item_code} missing cost_likely"
            assert 'cost_high' in material, f"Material {item_code} missing cost_high"

            # Verify Monte Carlo range is valid
            assert material['cost_low'] <= material['cost_likely'] <= material['cost_high'], \
                f"Material {item_code} has invalid cost range"


# =============================================================================
# Integration with Cost Data Service
# =============================================================================

class TestCostDataServiceIntegration:
    """Tests that verify materials can be used with cost_data_service functions."""

    def test_materials_match_service_schema(self, materials):
        """Materials should match the schema expected by cost_data_service.py."""
        # These fields are required by the MaterialCost dataclass
        required_fields = [
            'item_code', 'description', 'unit', 'unit_cost', 'labor_hours',
            'crew', 'crew_daily_output', 'productivity_factor',
            'cost_low', 'cost_likely', 'cost_high', 'csi_division', 'subdivision'
        ]

        for item_code, material in materials.items():
            for field in required_fields:
                assert field in material, \
                    f"Material {item_code} missing service-required field '{field}'"

    def test_kitchen_boq_estimate_calculation(self, kitchen_boq, materials):
        """Simulate a full kitchen estimate calculation."""
        total_material_cost = 0
        total_labor_hours = 0

        for item in kitchen_boq:
            item_code = item['item_code']
            quantity = item['quantity']

            material = materials.get(item_code)
            if material:
                total_material_cost += material['unit_cost'] * quantity
                total_labor_hours += material['labor_hours'] * quantity

        # Sanity checks for a kitchen remodel
        assert total_material_cost > 5000, \
            f"Kitchen estimate seems too low: ${total_material_cost:.2f}"
        assert total_material_cost < 100000, \
            f"Kitchen estimate seems too high: ${total_material_cost:.2f}"
        assert total_labor_hours > 50, \
            f"Kitchen labor hours seem too low: {total_labor_hours:.1f}"

    def test_bathroom_boq_estimate_calculation(self, bathroom_boq, materials):
        """Simulate a full bathroom estimate calculation."""
        total_material_cost = 0
        total_labor_hours = 0

        for item in bathroom_boq:
            item_code = item['item_code']
            quantity = item['quantity']

            material = materials.get(item_code)
            if material:
                total_material_cost += material['unit_cost'] * quantity
                total_labor_hours += material['labor_hours'] * quantity

        # Sanity checks for a bathroom remodel
        assert total_material_cost > 3000, \
            f"Bathroom estimate seems too low: ${total_material_cost:.2f}"
        assert total_material_cost < 50000, \
            f"Bathroom estimate seems too high: ${total_material_cost:.2f}"
        assert total_labor_hours > 30, \
            f"Bathroom labor hours seem too low: {total_labor_hours:.1f}"
