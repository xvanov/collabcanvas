"""
Location Intelligence Service for TrueCost.

Provides zip-code-based cost factors including labor rates, union status,
permit costs, and weather/seasonal factors for construction estimation.

Architecture:
- Firestore collection: /costData/locationFactors/{zipCode}
- Falls back to regional defaults when specific zip not found
- In-memory LRU cache with 24-hour TTL for performance
- Uses structlog for structured logging

References:
- docs/sprint-artifacts/tech-spec-epic-4.md
- docs/architecture.md (ADR-005: Firestore for cost data)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from functools import lru_cache
import time
import re
import asyncio

import structlog

# Configure structlog logger
logger = structlog.get_logger(__name__)


# =============================================================================
# Data Models (Task 1)
# =============================================================================


@dataclass
class PermitCosts:
    """
    Permit cost structure for a location.

    Attributes:
        base_percentage: Percentage of project value (e.g., 0.02 for 2%)
        minimum: Minimum permit fee in dollars
        maximum: Maximum permit fee cap (None if no cap)
        inspection_fee: Inspection fee in dollars
    """

    base_percentage: float
    minimum: float
    maximum: Optional[float]
    inspection_fee: float


@dataclass
class WeatherFactors:
    """
    Weather and seasonal factors affecting construction productivity.

    Attributes:
        winter_slowdown: Productivity multiplier for winter (e.g., 1.15 = 15% slower)
        summer_premium: Premium multiplier for summer work (e.g., 1.0 = no premium)
        rainy_season_months: List of month numbers (1-12) with elevated rain
        outdoor_work_adjustment: General outdoor work adjustment factor
    """

    winter_slowdown: float
    summer_premium: float
    rainy_season_months: List[int]
    outdoor_work_adjustment: float


@dataclass
class LaborRate:
    """
    Labor rate for an individual trade.

    Attributes:
        trade: Trade name (e.g., "electrician", "plumber")
        base_rate: Base hourly rate in dollars
        benefits_burden: Burden percentage (e.g., 0.35 for 35%)
        total_rate: Computed total rate including burden
    """

    trade: str
    base_rate: float
    benefits_burden: float
    total_rate: float


@dataclass
class MaterialCost:
    """
    Material cost data following RSMeans schema.

    Attributes:
        item_code: RSMeans-style code (e.g., "092900")
        description: Material description
        unit: Unit of measure ("sf", "lf", "each", etc.)
        unit_cost: Base unit cost in dollars
        labor_hours: Labor hours per unit
        crew: Crew composition (e.g., "2 Carpenters + 1 Laborer")
        crew_daily_output: Daily output for the crew
        productivity_factor: Productivity multiplier
        cost_low: Optimistic cost estimate
        cost_likely: Most likely cost estimate
        cost_high: Pessimistic cost estimate
        csi_division: CSI division code (e.g., "09" for Finishes)
        subdivision: Full subdivision code (e.g., "09 29 00" for Gypsum Board)
    """

    item_code: str
    description: str
    unit: str
    unit_cost: float
    labor_hours: float
    crew: str
    crew_daily_output: float
    productivity_factor: float
    cost_low: float
    cost_likely: float
    cost_high: float
    csi_division: str
    subdivision: str


@dataclass
class LocationFactors:
    """
    Complete location-specific cost factors for construction estimation.

    Attributes:
        zip_code: 5-digit US zip code
        region_code: Region identifier ("west", "midwest", "south", "northeast")
        city: City name
        state: State abbreviation
        labor_rates: Dict mapping trade name to hourly rate
        is_union: Whether this is a union market
        union_premium: Multiplier for union labor (e.g., 1.25)
        permit_costs: PermitCosts dataclass instance
        weather_factors: WeatherFactors dataclass instance
        is_default: True if using regional fallback data
        data_source: Where data came from ("firestore", "cache", "default")
    """

    zip_code: str
    region_code: str
    city: str
    state: str
    labor_rates: Dict[str, float]
    is_union: bool
    union_premium: float
    permit_costs: PermitCosts
    weather_factors: WeatherFactors
    is_default: bool = False
    data_source: str = "firestore"


# =============================================================================
# Custom Exceptions (Story 4.2)
# =============================================================================


class ItemNotFoundError(Exception):
    """Raised when a material item code is not found in the database."""

    def __init__(self, item_code: str):
        self.item_code = item_code
        super().__init__(f"Material item not found: {item_code}")


# =============================================================================
# Constants
# =============================================================================

# Required trades for labor rates (8 total per AC 4.1.1)
REQUIRED_TRADES = [
    "electrician",
    "plumber",
    "carpenter",
    "hvac_tech",
    "roofer",
    "painter",
    "tile_setter",
    "general_labor",
]

# Zip prefix to region mapping (per story dev notes)
ZIP_PREFIX_TO_REGION = {
    "0": "northeast",
    "1": "northeast",
    "2": "south",
    "3": "south",
    "4": "midwest",
    "5": "midwest",
    "6": "midwest",
    "7": "west",
    "8": "west",
    "9": "west",
}

# Cache TTL in seconds (24 hours)
CACHE_TTL_SECONDS = 24 * 60 * 60

# Regional default data for fallback (AC 4.1.5)
REGIONAL_DEFAULTS: Dict[str, Dict] = {
    "northeast": {
        "city": "Regional Default",
        "state": "NE",
        "labor_rates": {
            "electrician": 85.00,
            "plumber": 82.00,
            "carpenter": 65.00,
            "hvac_tech": 78.00,
            "roofer": 55.00,
            "painter": 48.00,
            "tile_setter": 58.00,
            "general_labor": 35.00,
        },
        "is_union": True,
        "union_premium": 1.25,
        "permit_costs": {
            "base_percentage": 0.025,
            "minimum": 200.0,
            "maximum": 15000.0,
            "inspection_fee": 150.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.20,
            "summer_premium": 1.0,
            "rainy_season_months": [3, 4, 11],
            "outdoor_work_adjustment": 1.10,
        },
    },
    "south": {
        "city": "Regional Default",
        "state": "SE",
        "labor_rates": {
            "electrician": 55.00,
            "plumber": 52.00,
            "carpenter": 45.00,
            "hvac_tech": 55.00,
            "roofer": 42.00,
            "painter": 38.00,
            "tile_setter": 45.00,
            "general_labor": 28.00,
        },
        "is_union": False,
        "union_premium": 1.0,
        "permit_costs": {
            "base_percentage": 0.015,
            "minimum": 100.0,
            "maximum": 8000.0,
            "inspection_fee": 75.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.0,
            "summer_premium": 1.10,
            "rainy_season_months": [6, 7, 8, 9],
            "outdoor_work_adjustment": 1.05,
        },
    },
    "midwest": {
        "city": "Regional Default",
        "state": "MW",
        "labor_rates": {
            "electrician": 70.00,
            "plumber": 68.00,
            "carpenter": 55.00,
            "hvac_tech": 65.00,
            "roofer": 48.00,
            "painter": 42.00,
            "tile_setter": 50.00,
            "general_labor": 30.00,
        },
        "is_union": True,
        "union_premium": 1.20,
        "permit_costs": {
            "base_percentage": 0.020,
            "minimum": 150.0,
            "maximum": 10000.0,
            "inspection_fee": 100.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.25,
            "summer_premium": 1.0,
            "rainy_season_months": [4, 5, 10],
            "outdoor_work_adjustment": 1.15,
        },
    },
    "west": {
        "city": "Regional Default",
        "state": "W",
        "labor_rates": {
            "electrician": 75.00,
            "plumber": 72.00,
            "carpenter": 60.00,
            "hvac_tech": 70.00,
            "roofer": 50.00,
            "painter": 45.00,
            "tile_setter": 52.00,
            "general_labor": 32.00,
        },
        "is_union": False,
        "union_premium": 1.0,
        "permit_costs": {
            "base_percentage": 0.020,
            "minimum": 175.0,
            "maximum": 12000.0,
            "inspection_fee": 125.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.15,
            "summer_premium": 1.05,
            "rainy_season_months": [1, 2, 12],
            "outdoor_work_adjustment": 1.05,
        },
    },
}

# Specific location data for major metros (for unit testing and common lookups)
LOCATION_DATA: Dict[str, Dict] = {
    # New York City (high cost, union) - AC 4.1.7
    "10001": {
        "city": "New York",
        "state": "NY",
        "region_code": "northeast",
        "labor_rates": {
            "electrician": 95.00,
            "plumber": 92.00,
            "carpenter": 75.00,
            "hvac_tech": 88.00,
            "roofer": 62.00,
            "painter": 55.00,
            "tile_setter": 65.00,
            "general_labor": 42.00,
        },
        "is_union": True,
        "union_premium": 1.30,
        "permit_costs": {
            "base_percentage": 0.03,
            "minimum": 300.0,
            "maximum": 20000.0,
            "inspection_fee": 200.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.20,
            "summer_premium": 1.0,
            "rainy_season_months": [3, 4, 11],
            "outdoor_work_adjustment": 1.10,
        },
    },
    # Chicago (union) - AC 4.1.2
    "60601": {
        "city": "Chicago",
        "state": "IL",
        "region_code": "midwest",
        "labor_rates": {
            "electrician": 80.00,
            "plumber": 78.00,
            "carpenter": 62.00,
            "hvac_tech": 75.00,
            "roofer": 52.00,
            "painter": 48.00,
            "tile_setter": 55.00,
            "general_labor": 35.00,
        },
        "is_union": True,
        "union_premium": 1.25,
        "permit_costs": {
            "base_percentage": 0.025,
            "minimum": 200.0,
            "maximum": 15000.0,
            "inspection_fee": 150.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.30,
            "summer_premium": 1.0,
            "rainy_season_months": [4, 5, 10],
            "outdoor_work_adjustment": 1.20,
        },
    },
    # Houston (non-union) - AC 4.1.2
    "77001": {
        "city": "Houston",
        "state": "TX",
        "region_code": "south",
        "labor_rates": {
            "electrician": 50.00,
            "plumber": 48.00,
            "carpenter": 42.00,
            "hvac_tech": 52.00,
            "roofer": 40.00,
            "painter": 35.00,
            "tile_setter": 42.00,
            "general_labor": 25.00,
        },
        "is_union": False,
        "union_premium": 1.0,
        "permit_costs": {
            "base_percentage": 0.015,
            "minimum": 100.0,
            "maximum": 8000.0,
            "inspection_fee": 75.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.0,
            "summer_premium": 1.15,
            "rainy_season_months": [6, 7, 8, 9],
            "outdoor_work_adjustment": 1.05,
        },
    },
    # Denver (winter slowdown > 1.0) - AC 4.1.4
    "80202": {
        "city": "Denver",
        "state": "CO",
        "region_code": "west",
        "labor_rates": {
            "electrician": 65.00,
            "plumber": 62.00,
            "carpenter": 52.00,
            "hvac_tech": 60.00,
            "roofer": 45.00,
            "painter": 40.00,
            "tile_setter": 48.00,
            "general_labor": 30.00,
        },
        "is_union": False,
        "union_premium": 1.0,
        "permit_costs": {
            "base_percentage": 0.018,
            "minimum": 150.0,
            "maximum": 10000.0,
            "inspection_fee": 100.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.25,
            "summer_premium": 1.0,
            "rainy_season_months": [4, 5],
            "outdoor_work_adjustment": 1.10,
        },
    },
    # Los Angeles
    "90001": {
        "city": "Los Angeles",
        "state": "CA",
        "region_code": "west",
        "labor_rates": {
            "electrician": 85.00,
            "plumber": 80.00,
            "carpenter": 68.00,
            "hvac_tech": 78.00,
            "roofer": 55.00,
            "painter": 50.00,
            "tile_setter": 58.00,
            "general_labor": 38.00,
        },
        "is_union": True,
        "union_premium": 1.20,
        "permit_costs": {
            "base_percentage": 0.025,
            "minimum": 250.0,
            "maximum": 18000.0,
            "inspection_fee": 175.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.0,
            "summer_premium": 1.05,
            "rainy_season_months": [1, 2, 12],
            "outdoor_work_adjustment": 1.0,
        },
    },
    # Phoenix
    "85001": {
        "city": "Phoenix",
        "state": "AZ",
        "region_code": "west",
        "labor_rates": {
            "electrician": 58.00,
            "plumber": 55.00,
            "carpenter": 48.00,
            "hvac_tech": 62.00,
            "roofer": 45.00,
            "painter": 38.00,
            "tile_setter": 45.00,
            "general_labor": 28.00,
        },
        "is_union": False,
        "union_premium": 1.0,
        "permit_costs": {
            "base_percentage": 0.015,
            "minimum": 100.0,
            "maximum": 8000.0,
            "inspection_fee": 75.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.0,
            "summer_premium": 1.20,
            "rainy_season_months": [7, 8],
            "outdoor_work_adjustment": 1.15,
        },
    },
    # Seattle
    "98101": {
        "city": "Seattle",
        "state": "WA",
        "region_code": "west",
        "labor_rates": {
            "electrician": 80.00,
            "plumber": 78.00,
            "carpenter": 65.00,
            "hvac_tech": 75.00,
            "roofer": 52.00,
            "painter": 48.00,
            "tile_setter": 55.00,
            "general_labor": 35.00,
        },
        "is_union": True,
        "union_premium": 1.15,
        "permit_costs": {
            "base_percentage": 0.022,
            "minimum": 200.0,
            "maximum": 15000.0,
            "inspection_fee": 150.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.15,
            "summer_premium": 1.0,
            "rainy_season_months": [10, 11, 12, 1, 2, 3],
            "outdoor_work_adjustment": 1.20,
        },
    },
    # Atlanta
    "30301": {
        "city": "Atlanta",
        "state": "GA",
        "region_code": "south",
        "labor_rates": {
            "electrician": 55.00,
            "plumber": 52.00,
            "carpenter": 45.00,
            "hvac_tech": 55.00,
            "roofer": 42.00,
            "painter": 38.00,
            "tile_setter": 45.00,
            "general_labor": 28.00,
        },
        "is_union": False,
        "union_premium": 1.0,
        "permit_costs": {
            "base_percentage": 0.018,
            "minimum": 125.0,
            "maximum": 10000.0,
            "inspection_fee": 100.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.05,
            "summer_premium": 1.10,
            "rainy_season_months": [3, 4, 7, 8],
            "outdoor_work_adjustment": 1.05,
        },
    },
    # Rural test data (low cost) - AC 4.1.7
    "59001": {
        "city": "Rural Montana",
        "state": "MT",
        "region_code": "west",
        "labor_rates": {
            "electrician": 45.00,
            "plumber": 42.00,
            "carpenter": 38.00,
            "hvac_tech": 45.00,
            "roofer": 35.00,
            "painter": 30.00,
            "tile_setter": 35.00,
            "general_labor": 22.00,
        },
        "is_union": False,
        "union_premium": 1.0,
        "permit_costs": {
            "base_percentage": 0.01,
            "minimum": 50.0,
            "maximum": 5000.0,
            "inspection_fee": 50.0,
        },
        "weather_factors": {
            "winter_slowdown": 1.30,
            "summer_premium": 1.0,
            "rainy_season_months": [5, 6],
            "outdoor_work_adjustment": 1.15,
        },
    },
}


# =============================================================================
# Material Cost Data (Story 4.2)
# =============================================================================

# Sample material cost data for development/testing
# In production, this is retrieved from Firestore at /costData/materials/{itemCode}
MATERIAL_DATA: Dict[str, Dict] = {
    # Division 09 - Finishes
    "092900": {
        "description": "Gypsum Board, 1/2 inch, standard",
        "unit": "sf",
        "unit_cost": 0.85,
        "labor_hours": 0.017,
        "crew": "2 Carpenters",
        "crew_daily_output": 2000,
        "productivity_factor": 1.0,
        "cost_low": 0.75,
        "cost_likely": 0.85,
        "cost_high": 1.10,
        "csi_division": "09",
        "subdivision": "09 29 00",
    },
    "093000": {
        "description": "Ceramic Tile, floor, standard",
        "unit": "sf",
        "unit_cost": 8.50,
        "labor_hours": 0.12,
        "crew": "1 Tile Setter + 1 Helper",
        "crew_daily_output": 100,
        "productivity_factor": 1.0,
        "cost_low": 6.50,
        "cost_likely": 8.50,
        "cost_high": 12.00,
        "csi_division": "09",
        "subdivision": "09 30 00",
    },
    "099100": {
        "description": "Interior Paint, latex, 2 coats",
        "unit": "sf",
        "unit_cost": 1.25,
        "labor_hours": 0.015,
        "crew": "1 Painter",
        "crew_daily_output": 800,
        "productivity_factor": 1.0,
        "cost_low": 0.95,
        "cost_likely": 1.25,
        "cost_high": 1.75,
        "csi_division": "09",
        "subdivision": "09 91 00",
    },
    # Division 12 - Furnishings
    "123200": {
        "description": "Kitchen Cabinets, wood, standard grade",
        "unit": "lf",
        "unit_cost": 225.00,
        "labor_hours": 1.5,
        "crew": "2 Carpenters",
        "crew_daily_output": 16,
        "productivity_factor": 1.0,
        "cost_low": 175.00,
        "cost_likely": 225.00,
        "cost_high": 350.00,
        "csi_division": "12",
        "subdivision": "12 32 00",
    },
    "123600": {
        "description": "Countertops, granite, standard",
        "unit": "sf",
        "unit_cost": 85.00,
        "labor_hours": 0.5,
        "crew": "2 Carpenters + 1 Laborer",
        "crew_daily_output": 40,
        "productivity_factor": 1.0,
        "cost_low": 65.00,
        "cost_likely": 85.00,
        "cost_high": 125.00,
        "csi_division": "12",
        "subdivision": "12 36 00",
    },
    # Division 22 - Plumbing
    "221100": {
        "description": "Plumbing Fixtures, standard bathroom set",
        "unit": "each",
        "unit_cost": 1250.00,
        "labor_hours": 8.0,
        "crew": "1 Plumber + 1 Helper",
        "crew_daily_output": 1,
        "productivity_factor": 1.0,
        "cost_low": 950.00,
        "cost_likely": 1250.00,
        "cost_high": 1800.00,
        "csi_division": "22",
        "subdivision": "22 11 00",
    },
    "224000": {
        "description": "Plumbing Rough-in, kitchen",
        "unit": "each",
        "unit_cost": 2800.00,
        "labor_hours": 24.0,
        "crew": "1 Plumber",
        "crew_daily_output": 0.5,
        "productivity_factor": 1.0,
        "cost_low": 2200.00,
        "cost_likely": 2800.00,
        "cost_high": 3800.00,
        "csi_division": "22",
        "subdivision": "22 40 00",
    },
    # Division 26 - Electrical
    "260500": {
        "description": "Electrical Rough-in, standard residential",
        "unit": "each",
        "unit_cost": 3500.00,
        "labor_hours": 32.0,
        "crew": "1 Electrician + 1 Helper",
        "crew_daily_output": 0.25,
        "productivity_factor": 1.0,
        "cost_low": 2800.00,
        "cost_likely": 3500.00,
        "cost_high": 4500.00,
        "csi_division": "26",
        "subdivision": "26 05 00",
    },
    "262700": {
        "description": "Lighting Fixtures, recessed LED",
        "unit": "each",
        "unit_cost": 175.00,
        "labor_hours": 0.75,
        "crew": "1 Electrician",
        "crew_daily_output": 12,
        "productivity_factor": 1.0,
        "cost_low": 125.00,
        "cost_likely": 175.00,
        "cost_high": 275.00,
        "csi_division": "26",
        "subdivision": "26 27 00",
    },
    # Division 23 - HVAC
    "233400": {
        "description": "HVAC System, residential, 3 ton",
        "unit": "each",
        "unit_cost": 8500.00,
        "labor_hours": 40.0,
        "crew": "1 HVAC Tech + 1 Helper",
        "crew_daily_output": 0.2,
        "productivity_factor": 1.0,
        "cost_low": 6500.00,
        "cost_likely": 8500.00,
        "cost_high": 12000.00,
        "csi_division": "23",
        "subdivision": "23 34 00",
    },
    # Division 06 - Wood/Plastics
    "061000": {
        "description": "Rough Carpentry, framing, walls",
        "unit": "sf",
        "unit_cost": 4.50,
        "labor_hours": 0.05,
        "crew": "2 Carpenters + 1 Laborer",
        "crew_daily_output": 400,
        "productivity_factor": 1.0,
        "cost_low": 3.50,
        "cost_likely": 4.50,
        "cost_high": 6.00,
        "csi_division": "06",
        "subdivision": "06 10 00",
    },
    "064100": {
        "description": "Wood Flooring, hardwood, 3/4 inch",
        "unit": "sf",
        "unit_cost": 12.00,
        "labor_hours": 0.08,
        "crew": "2 Carpenters",
        "crew_daily_output": 200,
        "productivity_factor": 1.0,
        "cost_low": 9.00,
        "cost_likely": 12.00,
        "cost_high": 18.00,
        "csi_division": "06",
        "subdivision": "06 41 00",
    },
    # Division 07 - Thermal/Moisture Protection
    "072100": {
        "description": "Building Insulation, fiberglass, R-19",
        "unit": "sf",
        "unit_cost": 1.50,
        "labor_hours": 0.012,
        "crew": "2 Carpenters",
        "crew_daily_output": 1500,
        "productivity_factor": 1.0,
        "cost_low": 1.15,
        "cost_likely": 1.50,
        "cost_high": 2.00,
        "csi_division": "07",
        "subdivision": "07 21 00",
    },
    "073100": {
        "description": "Asphalt Shingles, architectural grade",
        "unit": "sq",
        "unit_cost": 350.00,
        "labor_hours": 2.5,
        "crew": "3 Roofers",
        "crew_daily_output": 10,
        "productivity_factor": 1.0,
        "cost_low": 275.00,
        "cost_likely": 350.00,
        "cost_high": 450.00,
        "csi_division": "07",
        "subdivision": "07 31 00",
    },
    # Division 08 - Openings
    "081100": {
        "description": "Interior Door, hollow core, pre-hung",
        "unit": "each",
        "unit_cost": 185.00,
        "labor_hours": 1.0,
        "crew": "1 Carpenter",
        "crew_daily_output": 8,
        "productivity_factor": 1.0,
        "cost_low": 135.00,
        "cost_likely": 185.00,
        "cost_high": 250.00,
        "csi_division": "08",
        "subdivision": "08 11 00",
    },
    "085200": {
        "description": "Window, vinyl, double-hung",
        "unit": "each",
        "unit_cost": 425.00,
        "labor_hours": 1.5,
        "crew": "2 Carpenters",
        "crew_daily_output": 8,
        "productivity_factor": 1.0,
        "cost_low": 325.00,
        "cost_likely": 425.00,
        "cost_high": 600.00,
        "csi_division": "08",
        "subdivision": "08 52 00",
    },
    # Appliances (for kitchen remodel demos)
    "114100": {
        "description": "Appliance Package, standard kitchen",
        "unit": "set",
        "unit_cost": 3500.00,
        "labor_hours": 4.0,
        "crew": "1 Electrician + 1 Helper",
        "crew_daily_output": 2,
        "productivity_factor": 1.0,
        "cost_low": 2500.00,
        "cost_likely": 3500.00,
        "cost_high": 5500.00,
        "csi_division": "11",
        "subdivision": "11 41 00",
    },
}


# =============================================================================
# Cache Implementation (Task 3)
# =============================================================================


class LocationCache:
    """
    In-memory LRU cache for location factors with TTL support.

    Implements AC 4.1.6: Response time < 500ms for cached lookups.
    Cache TTL is 24 hours per story requirements.
    """

    def __init__(self, maxsize: int = 128, ttl_seconds: int = CACHE_TTL_SECONDS):
        self._cache: Dict[str, tuple] = {}  # {zip_code: (data, timestamp)}
        self._maxsize = maxsize
        self._ttl = ttl_seconds
        self._access_order: List[str] = []

    def get(self, zip_code: str) -> Optional[LocationFactors]:
        """Get cached location factors if present and not expired."""
        if zip_code not in self._cache:
            return None

        data, timestamp = self._cache[zip_code]
        if time.time() - timestamp > self._ttl:
            # Expired - remove and return None
            self._remove(zip_code)
            logger.info(
                "cache_expired",
                zip_code=zip_code,
                age_seconds=time.time() - timestamp,
            )
            return None

        # Update access order for LRU
        self._access_order.remove(zip_code)
        self._access_order.append(zip_code)

        logger.info("cache_hit", zip_code=zip_code)
        return data

    def set(self, zip_code: str, data: LocationFactors) -> None:
        """Store location factors in cache."""
        if len(self._cache) >= self._maxsize and zip_code not in self._cache:
            # Evict least recently used
            oldest = self._access_order.pop(0)
            del self._cache[oldest]
            logger.info("cache_evicted", evicted_zip=oldest)

        self._cache[zip_code] = (data, time.time())
        if zip_code in self._access_order:
            self._access_order.remove(zip_code)
        self._access_order.append(zip_code)
        logger.info("cache_set", zip_code=zip_code)

    def _remove(self, zip_code: str) -> None:
        """Remove entry from cache."""
        if zip_code in self._cache:
            del self._cache[zip_code]
        if zip_code in self._access_order:
            self._access_order.remove(zip_code)

    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
        self._access_order.clear()


# Global cache instance
_location_cache = LocationCache()


# =============================================================================
# Helper Functions
# =============================================================================


def _validate_zip_code(zip_code: str) -> None:
    """
    Validate zip code format (5-digit US zip).

    Args:
        zip_code: Zip code to validate

    Raises:
        ValueError: If zip code format is invalid
    """
    if not isinstance(zip_code, str):
        raise ValueError(f"Zip code must be a string, got {type(zip_code).__name__}")
    if not re.match(r"^\d{5}$", zip_code):
        raise ValueError(
            f"Invalid zip code format: '{zip_code}'. Expected 5-digit US zip code."
        )


def _get_region_from_zip(zip_code: str) -> str:
    """
    Map zip code prefix to region code.

    Args:
        zip_code: 5-digit zip code

    Returns:
        Region code: "northeast", "south", "midwest", or "west"
    """
    prefix = zip_code[0]
    return ZIP_PREFIX_TO_REGION.get(prefix, "west")


def _build_location_factors(
    zip_code: str,
    data: Dict,
    is_default: bool = False,
    data_source: str = "firestore",
) -> LocationFactors:
    """
    Build LocationFactors dataclass from raw data dict.

    Args:
        zip_code: The zip code
        data: Raw data dictionary
        is_default: Whether this is fallback data
        data_source: Source of the data

    Returns:
        LocationFactors instance
    """
    permit_data = data.get("permit_costs", {})
    weather_data = data.get("weather_factors", {})

    return LocationFactors(
        zip_code=zip_code,
        region_code=data.get("region_code", _get_region_from_zip(zip_code)),
        city=data.get("city", "Unknown"),
        state=data.get("state", ""),
        labor_rates=data.get("labor_rates", {}),
        is_union=data.get("is_union", False),
        union_premium=data.get("union_premium", 1.0),
        permit_costs=PermitCosts(
            base_percentage=permit_data.get("base_percentage", 0.02),
            minimum=permit_data.get("minimum", 100.0),
            maximum=permit_data.get("maximum"),
            inspection_fee=permit_data.get("inspection_fee", 100.0),
        ),
        weather_factors=WeatherFactors(
            winter_slowdown=weather_data.get("winter_slowdown", 1.0),
            summer_premium=weather_data.get("summer_premium", 1.0),
            rainy_season_months=weather_data.get("rainy_season_months", []),
            outdoor_work_adjustment=weather_data.get("outdoor_work_adjustment", 1.0),
        ),
        is_default=is_default,
        data_source=data_source,
    )


def _get_regional_default(zip_code: str) -> LocationFactors:
    """
    Get regional default data for fallback.

    Args:
        zip_code: Zip code to determine region

    Returns:
        LocationFactors with regional defaults and is_default=True
    """
    region = _get_region_from_zip(zip_code)
    regional_data = REGIONAL_DEFAULTS.get(region, REGIONAL_DEFAULTS["west"])
    regional_data["region_code"] = region

    return _build_location_factors(
        zip_code=zip_code,
        data=regional_data,
        is_default=True,
        data_source="default",
    )


# =============================================================================
# Firestore Integration (Async)
# =============================================================================


async def _lookup_firestore(zip_code: str) -> Optional[Dict]:
    """
    Look up location factors from Firestore.

    Args:
        zip_code: Zip code to look up

    Returns:
        Document data dict if found, None otherwise

    Note:
        In production, this connects to Firestore at /costData/locationFactors/{zipCode}.
        For unit testing, this function can be mocked.
    """
    try:
        # Import firebase_admin here to allow graceful fallback in tests
        from firebase_admin import firestore
        import asyncio

        db = firestore.client()
        doc_ref = db.collection("costData").document("locationFactors").collection(zip_code).document("data")
        loop = asyncio.get_event_loop()
        doc = await loop.run_in_executor(None, doc_ref.get)

        if doc.exists:
            return doc.to_dict()
        return None
    except ImportError:
        # Firebase not available - use local data for development/testing
        logger.warning(
            "firestore_unavailable",
            message="firebase_admin not installed, using local data",
        )
        return LOCATION_DATA.get(zip_code)
    except Exception as e:
        logger.error(
            "firestore_lookup_failed",
            zip_code=zip_code,
            error=str(e),
        )
        return None


# =============================================================================
# Main Service Function (Task 2)
# =============================================================================


async def get_location_factors(zip_code: str) -> LocationFactors:
    """
    Retrieve location-specific cost factors for a zip code.

    This is the main entry point for the Location Intelligence Service.
    Implements AC 4.1.1 through AC 4.1.7.

    Args:
        zip_code: 5-digit US zip code

    Returns:
        LocationFactors with labor rates, union status, permits, weather

    Raises:
        ValueError: If zip_code format is invalid (not 5 digits)

    Notes:
        - Falls back to regional defaults if specific zip not found (AC 4.1.5)
        - Results are cached for 24 hours (AC 4.1.6)
        - Sets is_default=True when using fallback data
        - Response time < 500ms for cached lookups (AC 4.1.6)

    Example:
        >>> factors = await get_location_factors("80202")
        >>> factors.city
        'Denver'
        >>> factors.labor_rates["electrician"]
        65.00
    """
    start_time = time.perf_counter()

    # Validate input (Task 2.3)
    _validate_zip_code(zip_code)

    # Check cache first (Task 3)
    cached = _location_cache.get(zip_code)
    if cached is not None:
        latency_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            "location_lookup",
            zip_code=zip_code,
            data_source="cache",
            latency_ms=round(latency_ms, 2),
        )
        return cached

    # Try local data first (for known metros)
    local_data = LOCATION_DATA.get(zip_code)
    if local_data:
        result = _build_location_factors(
            zip_code=zip_code,
            data=local_data,
            is_default=False,
            data_source="firestore",  # Treat local data as if from Firestore
        )
        _location_cache.set(zip_code, result)
        latency_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            "location_lookup",
            zip_code=zip_code,
            data_source="firestore",
            latency_ms=round(latency_ms, 2),
        )
        return result

    # Try Firestore lookup (Task 2.4)
    firestore_data = await _lookup_firestore(zip_code)
    if firestore_data:
        result = _build_location_factors(
            zip_code=zip_code,
            data=firestore_data,
            is_default=False,
            data_source="firestore",
        )
        _location_cache.set(zip_code, result)
        latency_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            "location_lookup",
            zip_code=zip_code,
            data_source="firestore",
            latency_ms=round(latency_ms, 2),
        )
        return result

    # Fallback to regional defaults (Task 2.5, 2.6, 2.7) - AC 4.1.5
    logger.info(
        "location_fallback",
        zip_code=zip_code,
        region=_get_region_from_zip(zip_code),
    )
    result = _get_regional_default(zip_code)
    _location_cache.set(zip_code, result)
    latency_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        "location_lookup",
        zip_code=zip_code,
        data_source="default",
        latency_ms=round(latency_ms, 2),
        is_default=True,
    )
    return result


# =============================================================================
# Synchronous Wrapper (for non-async contexts)
# =============================================================================


def get_location_factors_sync(zip_code: str) -> LocationFactors:
    """
    Synchronous wrapper for get_location_factors.

    For use in contexts where async is not available.
    """
    return asyncio.run(get_location_factors(zip_code))


# =============================================================================
# Cache Management Functions
# =============================================================================


def clear_location_cache() -> None:
    """Clear the location factors cache. Useful for testing."""
    _location_cache.clear()
    logger.info("cache_cleared")


def get_cache_stats() -> Dict:
    """Get cache statistics for monitoring."""
    return {
        "size": len(_location_cache._cache),
        "maxsize": _location_cache._maxsize,
        "ttl_seconds": _location_cache._ttl,
    }


# =============================================================================
# Material Cost Service Functions (Story 4.2 - Task 2)
# =============================================================================


def _build_material_cost(item_code: str, data: Dict) -> MaterialCost:
    """
    Build MaterialCost dataclass from raw data dict.

    Args:
        item_code: The material item code
        data: Raw data dictionary from Firestore or local data

    Returns:
        MaterialCost instance
    """
    return MaterialCost(
        item_code=item_code,
        description=data.get("description", ""),
        unit=data.get("unit", ""),
        unit_cost=data.get("unit_cost", 0.0),
        labor_hours=data.get("labor_hours", 0.0),
        crew=data.get("crew", ""),
        crew_daily_output=data.get("crew_daily_output", 0.0),
        productivity_factor=data.get("productivity_factor", 1.0),
        cost_low=data.get("cost_low", 0.0),
        cost_likely=data.get("cost_likely", 0.0),
        cost_high=data.get("cost_high", 0.0),
        csi_division=data.get("csi_division", ""),
        subdivision=data.get("subdivision", ""),
    )


async def _lookup_material_firestore(item_code: str) -> Optional[Dict]:
    """
    Look up material cost from Firestore.

    Args:
        item_code: Material item code to look up

    Returns:
        Document data dict if found, None otherwise

    Note:
        In production, this connects to Firestore at /costData/materials/{itemCode}.
        For unit testing, this function can be mocked.
    """
    try:
        from firebase_admin import firestore

        db = firestore.client()
        doc_ref = db.collection("costData").document("materials").collection(item_code).document("data")
        doc = doc_ref.get()

        if doc.exists:
            return doc.to_dict()
        return None
    except ImportError:
        # Firebase not available - use local data for development/testing
        logger.warning(
            "firestore_unavailable",
            message="firebase_admin not installed, using local material data",
        )
        return MATERIAL_DATA.get(item_code)
    except Exception as e:
        logger.error(
            "firestore_material_lookup_failed",
            item_code=item_code,
            error=str(e),
        )
        return None


async def get_material_cost(item_code: str) -> MaterialCost:
    """
    Retrieve cost data for a material item.

    Implements AC 4.2.1: Returns unit cost, labor hours, crew for valid RSMeans item codes.

    Args:
        item_code: RSMeans-style item code (e.g., "092900")

    Returns:
        MaterialCost with all cost data fields

    Raises:
        ItemNotFoundError: If item code is not found in database

    Example:
        >>> material = await get_material_cost("092900")
        >>> material.description
        'Gypsum Board, 1/2 inch, standard'
        >>> material.unit_cost
        0.85
    """
    start_time = time.perf_counter()

    # Try local data first (for development/testing)
    local_data = MATERIAL_DATA.get(item_code)
    if local_data:
        result = _build_material_cost(item_code, local_data)
        latency_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            "material_lookup",
            item_code=item_code,
            latency_ms=round(latency_ms, 2),
        )
        return result

    # Try Firestore lookup
    firestore_data = await _lookup_material_firestore(item_code)
    if firestore_data:
        result = _build_material_cost(item_code, firestore_data)
        latency_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            "material_lookup",
            item_code=item_code,
            latency_ms=round(latency_ms, 2),
        )
        return result

    # Item not found
    latency_ms = (time.perf_counter() - start_time) * 1000
    logger.warning(
        "material_not_found",
        item_code=item_code,
        latency_ms=round(latency_ms, 2),
    )
    raise ItemNotFoundError(item_code)


async def get_labor_rate(trade: str, zip_code: str) -> LaborRate:
    """
    Get labor rate for a specific trade at a location.

    Implements AC 4.2.1: Returns labor rate information for trades.

    Args:
        trade: Trade name (e.g., "electrician", "plumber")
        zip_code: 5-digit US zip code

    Returns:
        LaborRate with base rate, burden, and total rate

    Raises:
        ValueError: If trade is not found or zip code is invalid

    Example:
        >>> rate = await get_labor_rate("electrician", "80202")
        >>> rate.base_rate
        65.00
    """
    # Get location factors which include labor rates
    location = await get_location_factors(zip_code)

    if trade not in location.labor_rates:
        raise ValueError(f"Unknown trade: {trade}. Valid trades: {REQUIRED_TRADES}")

    base_rate = location.labor_rates[trade]
    # Standard benefits burden of 35%
    benefits_burden = 0.35
    total_rate = base_rate * (1 + benefits_burden)

    # Apply union premium if applicable
    if location.is_union:
        total_rate *= location.union_premium

    return LaborRate(
        trade=trade,
        base_rate=base_rate,
        benefits_burden=benefits_burden,
        total_rate=round(total_rate, 2),
    )


async def search_materials(
    query: str,
    csi_division: Optional[str] = None,
    limit: int = 20
) -> List[MaterialCost]:
    """
    Search materials database by description or code.

    Implements AC 4.2.1: Search functionality for material lookup.

    Args:
        query: Search query (matches description or item code)
        csi_division: Optional CSI division filter (e.g., "09" for Finishes)
        limit: Maximum number of results to return (default 20)

    Returns:
        List of matching MaterialCost items

    Example:
        >>> results = await search_materials("cabinet", csi_division="12")
        >>> len(results)
        1
        >>> results[0].description
        'Kitchen Cabinets, wood, standard grade'
    """
    start_time = time.perf_counter()
    results = []
    query_lower = query.lower()

    # Search local data
    for item_code, data in MATERIAL_DATA.items():
        # Check if query matches item code or description
        if query_lower in item_code.lower() or query_lower in data.get("description", "").lower():
            # Apply CSI division filter if specified
            if csi_division is None or data.get("csi_division") == csi_division:
                results.append(_build_material_cost(item_code, data))

                if len(results) >= limit:
                    break

    latency_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        "material_search",
        query=query,
        csi_division=csi_division,
        results_count=len(results),
        latency_ms=round(latency_ms, 2),
    )

    return results
