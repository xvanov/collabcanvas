"""
Unit tests for cost data schema validation.

Tests AC 4.4.1 through AC 4.4.8 for the Cost Data Seeding story.
Validates materials count, CSI division coverage, labor rates,
location factors, and schema completeness.

References:
- Story 4.4: Cost Data Seeding & Maintenance
- docs/sprint-artifacts/tech-spec-epic-4.md
"""

import json
import pytest
from pathlib import Path


# =============================================================================
# Test Data Loading
# =============================================================================

@pytest.fixture(scope="module")
def data_dir():
    """Get the data directory path."""
    return Path(__file__).parent.parent.parent / 'data'


@pytest.fixture(scope="module")
def materials(data_dir):
    """Load materials data."""
    with open(data_dir / 'materials.json') as f:
        return json.load(f)['materials']


@pytest.fixture(scope="module")
def labor_rates(data_dir):
    """Load labor rates data."""
    with open(data_dir / 'labor_rates.json') as f:
        return json.load(f)['labor_rates']


@pytest.fixture(scope="module")
def location_factors(data_dir):
    """Load location factors data."""
    with open(data_dir / 'location_factors.json') as f:
        return json.load(f)['location_factors']


@pytest.fixture(scope="module")
def boq_kitchen(data_dir):
    """Load kitchen BoQ data."""
    with open(data_dir / 'sample_boq_kitchen.json') as f:
        return json.load(f)['line_items']


@pytest.fixture(scope="module")
def boq_bathroom(data_dir):
    """Load bathroom BoQ data."""
    with open(data_dir / 'sample_boq_bathroom.json') as f:
        return json.load(f)['line_items']


# =============================================================================
# AC 4.4.1: Materials Count >= 100
# =============================================================================

class TestMaterialsCount:
    """Tests for AC 4.4.1: Firestore /costData/materials/ has 100+ documents."""

    def test_materials_count_minimum(self, materials):
        """Materials count must be at least 100."""
        assert len(materials) >= 100, f"Expected >= 100 materials, got {len(materials)}"

    def test_materials_have_unique_codes(self, materials):
        """Each material must have a unique item_code."""
        codes = [m['item_code'] for m in materials]
        assert len(codes) == len(set(codes)), "Duplicate item codes found"


# =============================================================================
# AC 4.4.2: All MVP CSI Divisions Covered
# =============================================================================

class TestCSIDivisionCoverage:
    """Tests for AC 4.4.2: All MVP-scope CSI divisions have material data."""

    REQUIRED_DIVISIONS = ['03', '04', '05', '06', '07', '08', '09', '10', '22', '23', '26', '31', '32']

    def test_all_required_divisions_present(self, materials):
        """All 13 required CSI divisions must have at least one material."""
        divisions_present = {m['csi_division'] for m in materials}

        for div in self.REQUIRED_DIVISIONS:
            assert div in divisions_present, f"CSI division {div} has no materials"

    def test_each_division_has_materials(self, materials):
        """Each required division should have at least one material item."""
        by_division = {}
        for m in materials:
            div = m['csi_division']
            if div not in by_division:
                by_division[div] = []
            by_division[div].append(m['item_code'])

        for div in self.REQUIRED_DIVISIONS:
            count = len(by_division.get(div, []))
            assert count >= 1, f"Division {div} should have >= 1 material, got {count}"


# =============================================================================
# AC 4.4.3: Labor Rates for All Trades and Regions
# =============================================================================

class TestLaborRates:
    """Tests for AC 4.4.3: Labor rates exist for all 8 trades across regions."""

    REQUIRED_TRADES = [
        'electrician', 'plumber', 'carpenter', 'hvac_tech',
        'roofer', 'painter', 'tile_setter', 'general_labor'
    ]
    REQUIRED_REGIONS = ['northeast', 'midwest', 'south', 'west']

    def test_labor_rates_count(self, labor_rates):
        """Should have 32 labor rates (8 trades x 4 regions)."""
        assert len(labor_rates) >= 32, f"Expected >= 32 labor rates, got {len(labor_rates)}"

    def test_all_trades_present(self, labor_rates):
        """All 8 required trades must be present."""
        trades = {r['trade'] for r in labor_rates}
        for trade in self.REQUIRED_TRADES:
            assert trade in trades, f"Trade '{trade}' not found in labor rates"

    def test_all_regions_present(self, labor_rates):
        """All 4 required regions must be present."""
        regions = {r['region'] for r in labor_rates}
        for region in self.REQUIRED_REGIONS:
            assert region in regions, f"Region '{region}' not found in labor rates"

    def test_all_trade_region_combinations(self, labor_rates):
        """Every trade-region combination must exist."""
        pairs = {(r['trade'], r['region']) for r in labor_rates}

        for trade in self.REQUIRED_TRADES:
            for region in self.REQUIRED_REGIONS:
                assert (trade, region) in pairs, f"Missing rate for {trade} in {region}"

    def test_labor_rate_schema(self, labor_rates):
        """Each labor rate must have required fields."""
        required_fields = ['trade', 'region', 'base_rate', 'benefits_burden', 'total_rate']

        for rate in labor_rates:
            for field in required_fields:
                assert field in rate, f"Rate missing field '{field}': {rate}"

    def test_benefits_burden_is_35_percent(self, labor_rates):
        """Benefits burden should be 35% (0.35) per story requirements."""
        for rate in labor_rates:
            assert rate['benefits_burden'] == 0.35, \
                f"Expected 35% burden for {rate['trade']}/{rate['region']}, got {rate['benefits_burden']}"


# =============================================================================
# AC 4.4.4: Location Factors Count >= 50
# =============================================================================

class TestLocationFactorsCount:
    """Tests for AC 4.4.4: Location factors exist for 50+ zip codes."""

    def test_location_count_minimum(self, location_factors):
        """Location factors count must be at least 50."""
        assert len(location_factors) >= 50, f"Expected >= 50 locations, got {len(location_factors)}"

    def test_locations_have_unique_zips(self, location_factors):
        """Each location must have a unique zip code."""
        zips = [loc['zip_code'] for loc in location_factors]
        assert len(zips) == len(set(zips)), "Duplicate zip codes found"


# =============================================================================
# AC 4.4.5: Major Metros Covered
# =============================================================================

class TestMajorMetros:
    """Tests for AC 4.4.5: Major metros covered (NYC, LA, Chicago, Houston, Phoenix, Denver, Atlanta, Seattle)."""

    REQUIRED_METROS = {
        '10001': 'NYC',
        '90001': 'LA',
        '60601': 'Chicago',
        '77001': 'Houston',
        '85001': 'Phoenix',
        '80202': 'Denver',
        '98101': 'Seattle',
        '30301': 'Atlanta'
    }

    def test_all_major_metros_present(self, location_factors):
        """All 8 required major metros must have location data."""
        zip_codes = {loc['zip_code'] for loc in location_factors}

        for zip_code, metro in self.REQUIRED_METROS.items():
            assert zip_code in zip_codes, f"Metro {metro} (zip {zip_code}) not found"

    def test_metro_has_complete_data(self, location_factors):
        """Each major metro must have complete location data."""
        locations_by_zip = {loc['zip_code']: loc for loc in location_factors}

        required_fields = [
            'region_code', 'city', 'state', 'labor_rates', 'is_union',
            'union_premium', 'permit_costs', 'weather_factors'
        ]

        for zip_code, metro in self.REQUIRED_METROS.items():
            location = locations_by_zip.get(zip_code)
            assert location is not None, f"Metro {metro} location data not found"

            for field in required_fields:
                assert field in location, f"Metro {metro} missing field '{field}'"


# =============================================================================
# AC 4.4.8: RSMeans Schema Compliance
# =============================================================================

class TestRSMeansSchema:
    """Tests for AC 4.4.8: Each material has RSMeans schema."""

    REQUIRED_FIELDS = [
        'item_code', 'description', 'unit', 'unit_cost', 'labor_hours',
        'crew', 'crew_daily_output', 'productivity_factor',
        'cost_low', 'cost_likely', 'cost_high', 'csi_division', 'subdivision'
    ]

    def test_all_materials_have_required_fields(self, materials):
        """Every material must have all RSMeans schema fields."""
        for material in materials:
            item_code = material.get('item_code', 'unknown')
            for field in self.REQUIRED_FIELDS:
                assert field in material, f"Material {item_code} missing field '{field}'"

    def test_cost_range_valid_for_monte_carlo(self, materials):
        """Cost range must satisfy: cost_low <= cost_likely <= cost_high."""
        for material in materials:
            item_code = material['item_code']
            low = material['cost_low']
            likely = material['cost_likely']
            high = material['cost_high']

            assert low <= likely, \
                f"Material {item_code}: cost_low ({low}) > cost_likely ({likely})"
            assert likely <= high, \
                f"Material {item_code}: cost_likely ({likely}) > cost_high ({high})"

    def test_unit_cost_positive(self, materials):
        """Unit cost must be positive."""
        for material in materials:
            item_code = material['item_code']
            assert material['unit_cost'] > 0, f"Material {item_code} has non-positive unit_cost"

    def test_labor_hours_non_negative(self, materials):
        """Labor hours must be non-negative."""
        for material in materials:
            item_code = material['item_code']
            assert material['labor_hours'] >= 0, f"Material {item_code} has negative labor_hours"

    def test_productivity_factor_positive(self, materials):
        """Productivity factor must be positive."""
        for material in materials:
            item_code = material['item_code']
            assert material['productivity_factor'] > 0, \
                f"Material {item_code} has non-positive productivity_factor"


# =============================================================================
# Location Schema Tests
# =============================================================================

class TestLocationSchema:
    """Tests for location factors schema compliance."""

    def test_all_locations_have_labor_rates_for_all_trades(self, location_factors):
        """Each location must have labor rates for all 8 trades."""
        required_trades = [
            'electrician', 'plumber', 'carpenter', 'hvac_tech',
            'roofer', 'painter', 'tile_setter', 'general_labor'
        ]

        for location in location_factors:
            zip_code = location['zip_code']
            labor_rates = location.get('labor_rates', {})

            for trade in required_trades:
                assert trade in labor_rates, \
                    f"Location {zip_code} missing labor rate for '{trade}'"

    def test_permit_costs_schema(self, location_factors):
        """Each location must have complete permit costs."""
        required_fields = ['base_percentage', 'minimum', 'maximum', 'inspection_fee']

        for location in location_factors:
            zip_code = location['zip_code']
            permit_costs = location.get('permit_costs', {})

            for field in required_fields:
                assert field in permit_costs, \
                    f"Location {zip_code} permit_costs missing '{field}'"

    def test_weather_factors_schema(self, location_factors):
        """Each location must have complete weather factors."""
        required_fields = ['winter_slowdown', 'summer_premium', 'rainy_season_months', 'outdoor_work_adjustment']

        for location in location_factors:
            zip_code = location['zip_code']
            weather = location.get('weather_factors', {})

            for field in required_fields:
                assert field in weather, \
                    f"Location {zip_code} weather_factors missing '{field}'"

    def test_union_premium_valid(self, location_factors):
        """Union premium must be >= 1.0."""
        for location in location_factors:
            zip_code = location['zip_code']
            premium = location.get('union_premium', 0)
            assert premium >= 1.0, f"Location {zip_code} has invalid union_premium: {premium}"
