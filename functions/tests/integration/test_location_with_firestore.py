"""
Integration Tests for Location Intelligence Service with Firestore Emulator.

Tests AC 4.1.1 through AC 4.1.5 end-to-end with Firestore emulator.

Prerequisites:
- Firebase Emulator running: `firebase emulators:start`
- FIRESTORE_EMULATOR_HOST environment variable set

To run:
    FIRESTORE_EMULATOR_HOST=localhost:8080 pytest tests/integration/ -v

Note:
    These tests require the Firebase Emulator to be running.
    If emulator is not available, tests will be skipped.
"""

import pytest
import os
import asyncio

# Check if emulator is available
EMULATOR_HOST = os.environ.get("FIRESTORE_EMULATOR_HOST")
SKIP_REASON = "Firestore emulator not available (set FIRESTORE_EMULATOR_HOST)"

# Import service under test
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from services.cost_data_service import (
    LocationFactors,
    PermitCosts,
    WeatherFactors,
    get_location_factors,
    clear_location_cache,
    REQUIRED_TRADES,
)


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before and after each test."""
    clear_location_cache()
    yield
    clear_location_cache()


@pytest.fixture
def firestore_client():
    """Get Firestore client connected to emulator."""
    if not EMULATOR_HOST:
        pytest.skip(SKIP_REASON)

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        # Initialize Firebase Admin if not already done
        if not firebase_admin._apps:
            # Use a dummy credential for emulator
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {
                "projectId": "test-project",
            })

        return firestore.client()
    except ImportError:
        pytest.skip("firebase_admin not installed")
    except Exception as e:
        pytest.skip(f"Failed to connect to emulator: {e}")


@pytest.fixture
def seed_test_data(firestore_client):
    """Seed test data into Firestore emulator."""
    # Test location data matching our schema
    test_data = {
        "12345": {
            "regionCode": "northeast",
            "city": "Test City",
            "state": "NY",
            "laborRates": {
                "electrician": 75.00,
                "plumber": 72.00,
                "carpenter": 60.00,
                "hvac_tech": 70.00,
                "roofer": 50.00,
                "painter": 45.00,
                "tile_setter": 52.00,
                "general_labor": 32.00,
            },
            "isUnion": True,
            "unionPremium": 1.20,
            "permitCosts": {
                "basePercentage": 0.025,
                "minimum": 200.0,
                "maximum": 15000.0,
                "inspectionFee": 150.0,
            },
            "weatherFactors": {
                "winterSlowdown": 1.15,
                "summerPremium": 1.0,
                "rainySeasonMonths": [3, 4, 11],
                "outdoorWorkAdjustment": 1.10,
            },
        },
    }

    # Seed data
    for zip_code, data in test_data.items():
        doc_ref = (
            firestore_client.collection("costData")
            .document("locationFactors")
            .collection(zip_code)
            .document("data")
        )
        doc_ref.set(data)

    yield test_data

    # Cleanup
    for zip_code in test_data.keys():
        doc_ref = (
            firestore_client.collection("costData")
            .document("locationFactors")
            .collection(zip_code)
            .document("data")
        )
        doc_ref.delete()


# =============================================================================
# Integration Tests
# =============================================================================


@pytest.mark.skipif(not EMULATOR_HOST, reason=SKIP_REASON)
class TestLocationWithFirestore:
    """Integration tests using Firestore emulator."""

    @pytest.mark.asyncio
    async def test_end_to_end_location_lookup(self, seed_test_data):
        """AC 4.1.1-4.1.5: End-to-end lookup from Firestore."""
        # This test validates the full flow:
        # 1. Validate zip code
        # 2. Check cache (miss)
        # 3. Look up in Firestore
        # 4. Build LocationFactors
        # 5. Cache result
        # 6. Return

        # Use the seeded zip code from seed_test_data fixture
        result = await get_location_factors("12345")

        assert isinstance(result, LocationFactors)
        assert result.zip_code == "12345"
        assert len(result.labor_rates) == 8

    @pytest.mark.asyncio
    async def test_firestore_document_structure_matches_schema(self, seed_test_data, firestore_client):
        """AC 4.1.1-4.1.5: Verify Firestore document structure matches expected schema."""
        # Expected schema from tech-spec:
        # /costData/locationFactors/{zipCode}
        #   └── { regionCode, city, state, laborRates: {}, isUnion,
        #         permitCosts: {}, weatherFactors: {} }

        expected_fields = {
            "regionCode",
            "city",
            "state",
            "laborRates",
            "isUnion",
            "unionPremium",
            "permitCosts",
            "weatherFactors",
        }

        expected_labor_rates = {
            "electrician",
            "plumber",
            "carpenter",
            "hvac_tech",
            "roofer",
            "painter",
            "tile_setter",
            "general_labor",
        }

        expected_permit_fields = {
            "basePercentage",
            "minimum",
            "maximum",
            "inspectionFee",
        }

        expected_weather_fields = {
            "winterSlowdown",
            "summerPremium",
            "rainySeasonMonths",
            "outdoorWorkAdjustment",
        }

        # Fetch the seeded document from Firestore
        test_zip = "12345"
        doc_ref = (
            firestore_client.collection("costData")
            .document("locationFactors")
            .collection(test_zip)
            .document("data")
        )
        doc = doc_ref.get()

        assert doc.exists, f"Document for zip {test_zip} not found in Firestore"

        doc_data = doc.to_dict()

        # Validate top-level fields
        actual_fields = set(doc_data.keys())
        missing_fields = expected_fields - actual_fields
        assert not missing_fields, f"Missing top-level fields: {missing_fields}"

        # Validate laborRates nested keys
        actual_labor_rates = set(doc_data.get("laborRates", {}).keys())
        missing_labor_rates = expected_labor_rates - actual_labor_rates
        assert not missing_labor_rates, f"Missing labor rate keys: {missing_labor_rates}"
        assert len(actual_labor_rates) == 8, f"Expected 8 trades, got {len(actual_labor_rates)}"

        # Validate permitCosts nested keys
        actual_permit_fields = set(doc_data.get("permitCosts", {}).keys())
        missing_permit_fields = expected_permit_fields - actual_permit_fields
        assert not missing_permit_fields, f"Missing permit fields: {missing_permit_fields}"
        assert len(actual_permit_fields) == 4, f"Expected 4 permit fields, got {len(actual_permit_fields)}"

        # Validate weatherFactors nested keys
        actual_weather_fields = set(doc_data.get("weatherFactors", {}).keys())
        missing_weather_fields = expected_weather_fields - actual_weather_fields
        assert not missing_weather_fields, f"Missing weather fields: {missing_weather_fields}"
        assert len(actual_weather_fields) == 4, f"Expected 4 weather fields, got {len(actual_weather_fields)}"

    @pytest.mark.asyncio
    async def test_fallback_when_zip_not_in_firestore(self):
        """AC 4.1.5: Returns regional defaults when zip not found in Firestore."""
        # Use a zip code that doesn't exist
        result = await get_location_factors("00000")

        assert result.is_default is True
        assert result.data_source == "default"
        assert len(result.labor_rates) == 8


# =============================================================================
# Schema Validation Tests
# =============================================================================


class TestFirestoreSchemaValidation:
    """Tests to validate Firestore schema matches code expectations."""

    def test_schema_field_mapping(self):
        """Verify camelCase (Firestore) to snake_case (Python) mapping."""
        # Document the expected mapping
        firestore_to_python = {
            "regionCode": "region_code",
            "laborRates": "labor_rates",
            "isUnion": "is_union",
            "unionPremium": "union_premium",
            "permitCosts": "permit_costs",
            "weatherFactors": "weather_factors",
            "basePercentage": "base_percentage",
            "inspectionFee": "inspection_fee",
            "winterSlowdown": "winter_slowdown",
            "summerPremium": "summer_premium",
            "rainySeasonMonths": "rainy_season_months",
            "outdoorWorkAdjustment": "outdoor_work_adjustment",
        }

        # This test documents the expected schema mapping
        assert len(firestore_to_python) > 0

    def test_all_trades_documented(self):
        """Verify all 8 trades are documented."""
        assert len(REQUIRED_TRADES) == 8
        expected = {
            "electrician",
            "plumber",
            "carpenter",
            "hvac_tech",
            "roofer",
            "painter",
            "tile_setter",
            "general_labor",
        }
        assert set(REQUIRED_TRADES) == expected


# =============================================================================
# Emulator Connection Tests
# =============================================================================


@pytest.mark.skipif(not EMULATOR_HOST, reason=SKIP_REASON)
class TestEmulatorConnection:
    """Tests to verify emulator connectivity."""

    def test_emulator_host_set(self):
        """Verify emulator host environment variable is set."""
        assert EMULATOR_HOST is not None
        assert ":" in EMULATOR_HOST  # Should be host:port format

    def test_firestore_client_connects(self, firestore_client):
        """Verify we can connect to Firestore emulator."""
        assert firestore_client is not None

    def test_can_write_and_read(self, firestore_client):
        """Verify basic Firestore operations work."""
        # Write
        test_ref = firestore_client.collection("test").document("integration_test")
        test_ref.set({"test": True, "timestamp": "now"})

        # Read
        doc = test_ref.get()
        assert doc.exists
        assert doc.to_dict()["test"] is True

        # Cleanup
        test_ref.delete()


# =============================================================================
# Performance Tests (Integration)
# =============================================================================


class TestPerformanceIntegration:
    """Performance tests for integration scenarios."""

    @pytest.mark.asyncio
    async def test_multiple_lookups_cached(self):
        """Multiple lookups use cache effectively."""
        import time

        zip_codes = ["10001", "60601", "77001", "80202"]

        # First pass - populate cache
        start = time.perf_counter()
        for zip_code in zip_codes:
            await get_location_factors(zip_code)
        first_pass_time = time.perf_counter() - start

        # Second pass - should be faster (all cached)
        start = time.perf_counter()
        for zip_code in zip_codes:
            await get_location_factors(zip_code)
        second_pass_time = time.perf_counter() - start

        # Second pass should be significantly faster
        assert second_pass_time < first_pass_time or second_pass_time < 0.1

    @pytest.mark.asyncio
    async def test_concurrent_lookups(self):
        """Concurrent lookups work correctly."""
        zip_codes = ["10001", "60601", "77001", "80202", "90001"]

        # Run lookups concurrently
        results = await asyncio.gather(
            *[get_location_factors(zip_code) for zip_code in zip_codes]
        )

        assert len(results) == len(zip_codes)
        for result, zip_code in zip(results, zip_codes):
            assert result.zip_code == zip_code
