#!/usr/bin/env python3
"""
Cost Data Seeding Script for TrueCost Estimation Database.

Seeds Firestore with comprehensive cost data including materials, labor rates,
and location factors for construction estimation.

Usage:
    python seed_cost_data.py              # Seed all data to Firestore
    python seed_cost_data.py --dry-run    # Preview without writing
    python seed_cost_data.py --verify     # Verify existing data

References:
- Story 4.4: Cost Data Seeding & Maintenance
- docs/sprint-artifacts/tech-spec-epic-4.md
"""

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

# Optional tqdm for progress bars - graceful fallback
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    def tqdm(iterable, **kwargs):
        """Simple fallback for tqdm."""
        desc = kwargs.get('desc', '')
        total = kwargs.get('total', len(iterable) if hasattr(iterable, '__len__') else None)
        for i, item in enumerate(iterable):
            if total:
                print(f"\r  {desc}: {i+1}/{total}", end='', flush=True)
            yield item
        print()  # newline after progress


def get_firestore_client():
    """Get Firestore client, initializing Firebase if needed."""
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        # Check if already initialized
        try:
            app = firebase_admin.get_app()
        except ValueError:
            # Not initialized - try to initialize
            # Look for service account key in common locations
            key_paths = [
                Path.cwd() / 'serviceAccountKey.json',
                Path.cwd().parent / 'serviceAccountKey.json',
                Path.home() / '.config' / 'firebase' / 'serviceAccountKey.json',
            ]

            cred = None
            for key_path in key_paths:
                if key_path.exists():
                    cred = credentials.Certificate(str(key_path))
                    break

            if cred:
                firebase_admin.initialize_app(cred)
            else:
                # Use application default credentials
                firebase_admin.initialize_app()

        return firestore.client()
    except ImportError:
        print("Error: firebase-admin package not installed.")
        print("Install with: pip install firebase-admin")
        return None
    except Exception as e:
        print(f"Error initializing Firestore: {e}")
        return None


def load_json_data(data_dir: Path) -> Dict:
    """Load all JSON data files from the data directory."""
    data = {}

    # Load materials
    materials_path = data_dir / 'materials.json'
    if materials_path.exists():
        with open(materials_path) as f:
            data['materials'] = json.load(f)['materials']
    else:
        data['materials'] = []

    # Load labor rates
    labor_path = data_dir / 'labor_rates.json'
    if labor_path.exists():
        with open(labor_path) as f:
            data['labor_rates'] = json.load(f)['labor_rates']
    else:
        data['labor_rates'] = []

    # Load location factors
    location_path = data_dir / 'location_factors.json'
    if location_path.exists():
        with open(location_path) as f:
            data['location_factors'] = json.load(f)['location_factors']
    else:
        data['location_factors'] = []

    return data


def print_header():
    """Print script header."""
    print("=" * 60)
    print("  Cost Data Seeding - TrueCost Estimation Database")
    print("=" * 60)
    print()


def print_summary(stats: Dict):
    """Print seeding summary."""
    print()
    print("  Seeding Complete!")
    print("  -----------------")
    print(f"  Materials:  {stats['materials']} documents in /costData/materials/")
    print(f"  Labor:      {stats['labor_rates']} documents in /costData/laborRates/")
    print(f"  Locations:  {stats['locations']} documents in /costData/locationFactors/")
    print()
    total = stats['materials'] + stats['labor_rates'] + stats['locations']
    print(f"  Total: {total} documents written")
    print(f"  Time: {stats['time']:.1f} seconds")
    print("=" * 60)


def seed_materials(db, materials: List[Dict], dry_run: bool = False) -> int:
    """Seed materials to Firestore."""
    count = 0
    for material in tqdm(materials, desc="Materials"):
        item_code = material['item_code']
        doc_data = {k: v for k, v in material.items() if k != 'item_code'}

        if not dry_run:
            db.collection('costData').document('materials').collection(item_code).document('data').set(doc_data)
        count += 1

    return count


def seed_labor_rates(db, rates: List[Dict], dry_run: bool = False) -> int:
    """Seed labor rates to Firestore."""
    count = 0
    for rate in tqdm(rates, desc="Labor Rates"):
        rate_id = f"{rate['trade']}_{rate['region']}"
        doc_data = {
            'trade': rate['trade'],
            'region': rate['region'],
            'baseRate': rate['base_rate'],
            'benefitsBurden': rate['benefits_burden'],
            'totalRate': rate['total_rate']
        }

        if not dry_run:
            db.collection('costData').document('laborRates').collection(rate_id).document('data').set(doc_data)
        count += 1

    return count


def seed_locations(db, locations: List[Dict], dry_run: bool = False) -> int:
    """Seed location factors to Firestore."""
    count = 0
    for location in tqdm(locations, desc="Locations"):
        zip_code = location['zip_code']
        doc_data = {
            'regionCode': location['region_code'],
            'city': location['city'],
            'state': location['state'],
            'laborRates': location['labor_rates'],
            'isUnion': location['is_union'],
            'unionPremium': location['union_premium'],
            'permitCosts': location['permit_costs'],
            'weatherFactors': location['weather_factors']
        }

        if not dry_run:
            db.collection('costData').document('locationFactors').collection(zip_code).document('data').set(doc_data)
        count += 1

    return count


def verify_data(db) -> Dict:
    """Verify existing data in Firestore."""
    stats = {
        'materials': 0,
        'labor_rates': 0,
        'locations': 0
    }

    print("  Verifying existing data...")
    print()

    # Count materials
    materials_ref = db.collection('costData').document('materials')
    try:
        # Get all subcollections
        collections = materials_ref.collections()
        for coll in collections:
            stats['materials'] += 1
    except Exception as e:
        print(f"  Warning: Could not count materials: {e}")

    # Count labor rates
    labor_ref = db.collection('costData').document('laborRates')
    try:
        collections = labor_ref.collections()
        for coll in collections:
            stats['labor_rates'] += 1
    except Exception as e:
        print(f"  Warning: Could not count labor rates: {e}")

    # Count locations
    locations_ref = db.collection('costData').document('locationFactors')
    try:
        collections = locations_ref.collections()
        for coll in collections:
            stats['locations'] += 1
    except Exception as e:
        print(f"  Warning: Could not count locations: {e}")

    return stats


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Seed Firestore with construction cost data'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview data without writing to Firestore'
    )
    parser.add_argument(
        '--verify',
        action='store_true',
        help='Verify existing data in Firestore'
    )
    parser.add_argument(
        '--data-dir',
        type=Path,
        default=Path(__file__).parent.parent / 'data',
        help='Directory containing JSON data files'
    )

    args = parser.parse_args()

    print_header()

    # Load data files
    print("  Loading data files...")
    data = load_json_data(args.data_dir)
    print(f"    [x] materials.json: {len(data['materials'])} items")
    print(f"    [x] labor_rates.json: {len(data['labor_rates'])} rates (8 trades x 4 regions)")
    print(f"    [x] location_factors.json: {len(data['location_factors'])} zip codes")
    print()

    if args.dry_run:
        print("  DRY RUN MODE - No data will be written")
        print()
        print("  Would seed:")
        print(f"    - {len(data['materials'])} materials to /costData/materials/")
        print(f"    - {len(data['labor_rates'])} labor rates to /costData/laborRates/")
        print(f"    - {len(data['location_factors'])} locations to /costData/locationFactors/")
        print()
        print("=" * 60)
        return 0

    # Get Firestore client
    db = get_firestore_client()
    if not db:
        print("  Error: Could not connect to Firestore")
        return 1

    if args.verify:
        stats = verify_data(db)
        print("  Existing Data:")
        print(f"    Materials:  {stats['materials']} documents")
        print(f"    Labor:      {stats['labor_rates']} documents")
        print(f"    Locations:  {stats['locations']} documents")
        print()
        print("=" * 60)
        return 0

    # Seed data
    print("  Seeding Firestore collections...")
    print()

    start_time = time.time()

    stats = {
        'materials': seed_materials(db, data['materials']),
        'labor_rates': seed_labor_rates(db, data['labor_rates']),
        'locations': seed_locations(db, data['location_factors']),
        'time': 0
    }

    stats['time'] = time.time() - start_time

    print_summary(stats)

    return 0


if __name__ == '__main__':
    sys.exit(main())
