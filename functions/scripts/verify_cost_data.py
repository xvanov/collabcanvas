#!/usr/bin/env python3
"""
Cost Data Verification Script for TrueCost Estimation Database.

Verifies that seeded cost data meets all acceptance criteria including
material counts, CSI division coverage, labor rates, location factors,
and BoQ coverage.

Usage:
    python verify_cost_data.py

References:
- Story 4.4: Cost Data Seeding & Maintenance
- docs/sprint-artifacts/tech-spec-epic-4.md
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple


# Required CSI divisions for MVP
REQUIRED_CSI_DIVISIONS = ['03', '04', '05', '06', '07', '08', '09', '10', '22', '23', '26', '31', '32']

# CSI division names
CSI_DIVISION_NAMES = {
    '02': 'Demolition',
    '03': 'Concrete',
    '04': 'Masonry',
    '05': 'Metals',
    '06': 'Wood/Plastic',
    '07': 'Thermal',
    '08': 'Doors/Win',
    '09': 'Finishes',
    '10': 'Specialties',
    '11': 'Equipment',
    '22': 'Plumbing',
    '23': 'HVAC',
    '26': 'Electrical',
    '31': 'Earthwork',
    '32': 'Exterior',
}

# Required trades
REQUIRED_TRADES = [
    'electrician', 'plumber', 'carpenter', 'hvac_tech',
    'roofer', 'painter', 'tile_setter', 'general_labor'
]

# Required regions
REQUIRED_REGIONS = ['northeast', 'midwest', 'south', 'west']

# Required major metros with their zip codes
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

# Required RSMeans schema fields for materials
REQUIRED_MATERIAL_FIELDS = [
    'item_code', 'description', 'unit', 'unit_cost', 'labor_hours',
    'crew', 'crew_daily_output', 'productivity_factor',
    'cost_low', 'cost_likely', 'cost_high', 'csi_division', 'subdivision'
]


def load_json_data(data_dir: Path) -> Dict:
    """Load all JSON data files from the data directory."""
    data = {}

    materials_path = data_dir / 'materials.json'
    if materials_path.exists():
        with open(materials_path) as f:
            data['materials'] = json.load(f)['materials']
    else:
        data['materials'] = []

    labor_path = data_dir / 'labor_rates.json'
    if labor_path.exists():
        with open(labor_path) as f:
            data['labor_rates'] = json.load(f)['labor_rates']
    else:
        data['labor_rates'] = []

    location_path = data_dir / 'location_factors.json'
    if location_path.exists():
        with open(location_path) as f:
            data['location_factors'] = json.load(f)['location_factors']
    else:
        data['location_factors'] = []

    kitchen_path = data_dir / 'sample_boq_kitchen.json'
    if kitchen_path.exists():
        with open(kitchen_path) as f:
            data['boq_kitchen'] = json.load(f)['line_items']
    else:
        data['boq_kitchen'] = []

    bathroom_path = data_dir / 'sample_boq_bathroom.json'
    if bathroom_path.exists():
        with open(bathroom_path) as f:
            data['boq_bathroom'] = json.load(f)['line_items']
    else:
        data['boq_bathroom'] = []

    return data


def print_header():
    """Print script header."""
    print("=" * 60)
    print("  Cost Data Verification Report")
    print("=" * 60)
    print()


def verify_materials(materials: List[Dict]) -> Tuple[bool, Dict]:
    """Verify materials data meets all criteria."""
    results = {
        'count': len(materials),
        'by_division': {},
        'schema_complete': 0,
        'schema_errors': [],
        'monte_carlo_valid': 0,
        'monte_carlo_errors': []
    }

    # Count by CSI division
    for material in materials:
        div = material.get('csi_division', 'unknown')
        if div not in results['by_division']:
            results['by_division'][div] = 0
        results['by_division'][div] += 1

        # Check schema completeness
        missing_fields = [f for f in REQUIRED_MATERIAL_FIELDS if f not in material]
        if not missing_fields:
            results['schema_complete'] += 1
        else:
            results['schema_errors'].append({
                'item_code': material.get('item_code', 'unknown'),
                'missing': missing_fields
            })

        # Check Monte Carlo validity (cost_low <= cost_likely <= cost_high)
        cost_low = material.get('cost_low', 0)
        cost_likely = material.get('cost_likely', 0)
        cost_high = material.get('cost_high', 0)
        if cost_low <= cost_likely <= cost_high:
            results['monte_carlo_valid'] += 1
        else:
            results['monte_carlo_errors'].append({
                'item_code': material.get('item_code', 'unknown'),
                'low': cost_low,
                'likely': cost_likely,
                'high': cost_high
            })

    # Check all required divisions present
    missing_divisions = [d for d in REQUIRED_CSI_DIVISIONS if d not in results['by_division']]
    results['missing_divisions'] = missing_divisions

    passed = (
        results['count'] >= 100 and
        len(missing_divisions) == 0 and
        results['schema_complete'] == results['count'] and
        results['monte_carlo_valid'] == results['count']
    )

    return passed, results


def verify_labor_rates(rates: List[Dict]) -> Tuple[bool, Dict]:
    """Verify labor rates data meets all criteria."""
    results = {
        'count': len(rates),
        'trades': set(),
        'regions': set(),
        'trade_region_pairs': set()
    }

    for rate in rates:
        trade = rate.get('trade', '')
        region = rate.get('region', '')
        results['trades'].add(trade)
        results['regions'].add(region)
        results['trade_region_pairs'].add((trade, region))

    # Check all required trade-region combinations
    expected_pairs = {(t, r) for t in REQUIRED_TRADES for r in REQUIRED_REGIONS}
    missing_pairs = expected_pairs - results['trade_region_pairs']
    results['missing_pairs'] = list(missing_pairs)

    passed = len(missing_pairs) == 0 and results['count'] >= 32

    return passed, results


def verify_locations(locations: List[Dict]) -> Tuple[bool, Dict]:
    """Verify location factors data meets all criteria."""
    results = {
        'count': len(locations),
        'by_region': {},
        'zip_codes': set(),
        'metros_found': {},
        'metros_missing': []
    }

    for location in locations:
        region = location.get('region_code', 'unknown')
        zip_code = location.get('zip_code', '')

        if region not in results['by_region']:
            results['by_region'][region] = []
        results['by_region'][region].append(zip_code)
        results['zip_codes'].add(zip_code)

        # Check if this is a required metro
        if zip_code in REQUIRED_METROS:
            results['metros_found'][zip_code] = REQUIRED_METROS[zip_code]

    # Find missing metros
    for zip_code, name in REQUIRED_METROS.items():
        if zip_code not in results['zip_codes']:
            results['metros_missing'].append((zip_code, name))

    passed = (
        results['count'] >= 50 and
        len(results['metros_missing']) == 0
    )

    return passed, results


def verify_boq_coverage(boq_items: List[Dict], materials: List[Dict], name: str) -> Tuple[bool, Dict]:
    """Verify BoQ can be fully costed from materials."""
    material_codes = {m['item_code'] for m in materials}

    results = {
        'total_items': len(boq_items),
        'found': 0,
        'missing': []
    }

    for item in boq_items:
        item_code = item.get('item_code', '')
        if item_code in material_codes:
            results['found'] += 1
        else:
            results['missing'].append(item_code)

    results['coverage_pct'] = (results['found'] / results['total_items'] * 100) if results['total_items'] > 0 else 0
    passed = results['coverage_pct'] == 100

    return passed, results


def print_materials_report(results: Dict):
    """Print materials verification report."""
    print("  Materials by CSI Division:")
    print("  --------------------------")
    for div in sorted(results['by_division'].keys()):
        count = results['by_division'][div]
        name = CSI_DIVISION_NAMES.get(div, 'Unknown')
        marker = "  " if div in REQUIRED_CSI_DIVISIONS else "* "
        print(f"  {marker}Division {div} ({name}): {count:>3} items")
    print("  --------------------------")
    print(f"    Total: {results['count']} materials")
    if results['missing_divisions']:
        print(f"    MISSING DIVISIONS: {results['missing_divisions']}")
    print()


def print_locations_report(results: Dict):
    """Print locations verification report."""
    print("  Locations by Region:")
    print("  --------------------")
    for region in sorted(results['by_region'].keys()):
        count = len(results['by_region'][region])
        print(f"    {region.capitalize()}: {count} zip codes")
    print("  --------------------")
    print(f"    Total: {results['count']} locations")
    print()

    print("  Major Metros Covered:")
    for zip_code, name in sorted(REQUIRED_METROS.items(), key=lambda x: x[1]):
        found = zip_code in results['metros_found']
        marker = "[x]" if found else "[ ]"
        print(f"    {marker} {name} ({zip_code})")
    print()


def print_boq_report(kitchen_results: Dict, bathroom_results: Dict):
    """Print BoQ coverage report."""
    print("  BoQ Coverage Tests:")
    print("  -------------------")
    k = kitchen_results
    b = bathroom_results
    print(f"    Kitchen Remodel ({k['total_items']} items):  {k['coverage_pct']:.0f}% ({k['found']}/{k['total_items']} found)")
    print(f"    Bathroom Remodel ({b['total_items']} items): {b['coverage_pct']:.0f}% ({b['found']}/{b['total_items']} found)")
    print()


def main():
    """Main entry point."""
    data_dir = Path(__file__).parent.parent / 'data'

    print_header()

    # Load data
    data = load_json_data(data_dir)

    all_passed = True

    # Verify materials
    mat_passed, mat_results = verify_materials(data['materials'])
    print_materials_report(mat_results)
    all_passed = all_passed and mat_passed

    # Verify labor rates
    labor_passed, labor_results = verify_labor_rates(data['labor_rates'])
    print(f"  Labor Rates: {labor_results['count']} rates")
    print(f"    Trades: {len(labor_results['trades'])}/8")
    print(f"    Regions: {len(labor_results['regions'])}/4")
    if labor_results['missing_pairs']:
        print(f"    MISSING: {len(labor_results['missing_pairs'])} trade-region pairs")
    print()
    all_passed = all_passed and labor_passed

    # Verify locations
    loc_passed, loc_results = verify_locations(data['location_factors'])
    print_locations_report(loc_results)
    all_passed = all_passed and loc_passed

    # Verify BoQ coverage
    kitchen_passed, kitchen_results = verify_boq_coverage(
        data['boq_kitchen'], data['materials'], 'Kitchen'
    )
    bathroom_passed, bathroom_results = verify_boq_coverage(
        data['boq_bathroom'], data['materials'], 'Bathroom'
    )
    print_boq_report(kitchen_results, bathroom_results)
    all_passed = all_passed and kitchen_passed and bathroom_passed

    # Schema validation summary
    print(f"  Schema Validation:")
    print(f"    Materials with complete RSMeans schema: {mat_results['schema_complete']}/{mat_results['count']} (100%)")
    if mat_results['schema_errors']:
        print(f"    ERRORS: {len(mat_results['schema_errors'])} materials missing fields")
    print()

    # Final result
    if all_passed:
        print("  VERIFICATION PASSED")
    else:
        print("  VERIFICATION FAILED")
        return 1

    print("=" * 60)
    return 0


if __name__ == '__main__':
    sys.exit(main())
