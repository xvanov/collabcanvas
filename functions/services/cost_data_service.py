"""Cost Data Service for TrueCost.

Mock implementation of cost data service for location-based factors.
This will be replaced by Dev 4 with real RSMeans/cost database integration.

PR #6 Addition: Material cost and labor rate lookups with P50/P80/P90 ranges.
"""

from typing import Dict, List, Optional, Tuple, Any
import re
import structlog

from models.cost_estimate import CostRange, CostConfidenceLevel
from models.bill_of_quantities import TradeCategory
from models.location_factors import (
    LocationFactors,
    LaborRates,
    PermitCosts,
    WeatherFactors,
    MaterialCostAdjustments,
    Region,
    UnionStatus,
    WinterImpact,
    SeasonalAdjustmentReason,
    get_default_location_factors,
)

logger = structlog.get_logger()


# =============================================================================
# MOCK DATA - ZIP CODE TO LOCATION FACTORS
# =============================================================================

# State to region mapping
STATE_REGIONS: Dict[str, Region] = {
    # Northeast
    "CT": Region.NORTHEAST, "ME": Region.NORTHEAST, "MA": Region.NORTHEAST,
    "NH": Region.NORTHEAST, "NJ": Region.NORTHEAST, "NY": Region.NORTHEAST,
    "PA": Region.NORTHEAST, "RI": Region.NORTHEAST, "VT": Region.NORTHEAST,
    # Southeast
    "AL": Region.SOUTHEAST, "FL": Region.SOUTHEAST, "GA": Region.SOUTHEAST,
    "KY": Region.SOUTHEAST, "MS": Region.SOUTHEAST, "NC": Region.SOUTHEAST,
    "SC": Region.SOUTHEAST, "TN": Region.SOUTHEAST, "VA": Region.SOUTHEAST,
    "WV": Region.SOUTHEAST,
    # Midwest
    "IL": Region.MIDWEST, "IN": Region.MIDWEST, "MI": Region.MIDWEST,
    "MN": Region.MIDWEST, "OH": Region.MIDWEST, "WI": Region.MIDWEST,
    "IA": Region.MIDWEST, "MO": Region.MIDWEST, "ND": Region.MIDWEST,
    "SD": Region.MIDWEST, "NE": Region.MIDWEST, "KS": Region.MIDWEST,
    # South
    "AR": Region.SOUTH, "LA": Region.SOUTH, "OK": Region.SOUTH, "TX": Region.SOUTH,
    # Southwest
    "AZ": Region.SOUTHWEST, "NM": Region.SOUTHWEST, "NV": Region.SOUTHWEST,
    # Mountain
    "CO": Region.MOUNTAIN, "ID": Region.MOUNTAIN, "MT": Region.MOUNTAIN,
    "UT": Region.MOUNTAIN, "WY": Region.MOUNTAIN,
    # Pacific
    "AK": Region.PACIFIC, "CA": Region.PACIFIC, "HI": Region.PACIFIC,
    "OR": Region.PACIFIC, "WA": Region.PACIFIC,
}

# States with predominantly union labor markets
UNION_STATES = {"NY", "NJ", "IL", "CA", "WA", "MA", "CT", "PA", "OH", "MI"}

# High cost states (location factor > 1.1)
HIGH_COST_STATES = {"NY", "CA", "MA", "CT", "WA", "NJ", "HI", "AK"}

# Low cost states (location factor < 0.95)
LOW_COST_STATES = {"MS", "AR", "AL", "WV", "KY", "OK", "TN", "SC"}

# National average labor rates by trade (P50 values)
NATIONAL_AVERAGE_LABOR_RATES: Dict[TradeCategory, float] = {
    TradeCategory.ELECTRICIAN: 55.0,
    TradeCategory.PLUMBER: 58.0,
    TradeCategory.CARPENTER: 45.0,
    TradeCategory.HVAC: 56.0,
    TradeCategory.GENERAL_LABOR: 32.0,
    TradeCategory.PAINTER: 40.0,
    TradeCategory.TILE_SETTER: 48.0,
    TradeCategory.ROOFER: 42.0,
    TradeCategory.CONCRETE_FINISHER: 45.0,
    TradeCategory.DRYWALL_INSTALLER: 42.0,
    TradeCategory.MASON: 48.0,
    TradeCategory.WELDER: 52.0,
    TradeCategory.FLOORING_INSTALLER: 44.0,
    TradeCategory.CABINET_INSTALLER: 46.0,
    TradeCategory.COUNTERTOP_INSTALLER: 48.0,
    TradeCategory.APPLIANCE_INSTALLER: 38.0,
    TradeCategory.DEMOLITION: 35.0,
}


# =============================================================================
# MOCK LOCATION DATA - MAJOR METROS
# =============================================================================

MOCK_LOCATIONS: Dict[str, LocationFactors] = {}


def _create_denver_factors() -> LocationFactors:
    """Create location factors for Denver, CO (80202)."""
    return LocationFactors(
        zip_code="80202",
        city="Denver",
        state="CO",
        county="Denver",
        region=Region.MOUNTAIN,
        labor_rates=LaborRates(
            electrician=58.0,
            plumber=62.0,
            carpenter=48.0,
            hvac=60.0,
            general_labor=36.0,
            painter=42.0,
            tile_setter=52.0,
            roofer=45.0,
            concrete_finisher=46.0,
            drywall_installer=44.0
        ),
        permit_costs=PermitCosts(
            building_permit_base=500.0,
            building_permit_percentage=0.015,
            electrical_permit=175.0,
            plumbing_permit=175.0,
            mechanical_permit=150.0,
            plan_review_fee=200.0,
            impact_fees=0.0,
            inspection_fees=125.0
        ),
        weather_factors=WeatherFactors(
            winter_impact=WinterImpact.MODERATE,
            seasonal_adjustment=1.05,
            seasonal_reason=SeasonalAdjustmentReason.WINTER_WEATHER,
            frost_line_depth_inches=36,
            average_rain_days_per_month=8,
            extreme_heat_days=15
        ),
        material_adjustments=MaterialCostAdjustments(
            transportation_factor=1.02,
            local_availability_factor=0.98,
            lumber_regional_adjustment=1.05,
            concrete_regional_adjustment=1.0
        ),
        union_status=UnionStatus.MIXED,
        location_factor=1.05,
        confidence=0.92,
        summary="Denver, CO (80202) - Mountain region with mixed union market. Moderate winter impact on construction schedules."
    )


def _create_nyc_factors() -> LocationFactors:
    """Create location factors for New York City (10001)."""
    return LocationFactors(
        zip_code="10001",
        city="New York",
        state="NY",
        county="New York",
        region=Region.NORTHEAST,
        labor_rates=LaborRates(
            electrician=95.0,
            plumber=100.0,
            carpenter=82.0,
            hvac=92.0,
            general_labor=55.0,
            painter=68.0,
            tile_setter=78.0,
            roofer=72.0,
            concrete_finisher=75.0,
            drywall_installer=70.0
        ),
        permit_costs=PermitCosts(
            building_permit_base=1500.0,
            building_permit_percentage=0.025,
            electrical_permit=400.0,
            plumbing_permit=400.0,
            mechanical_permit=350.0,
            plan_review_fee=500.0,
            impact_fees=250.0,
            inspection_fees=300.0
        ),
        weather_factors=WeatherFactors(
            winter_impact=WinterImpact.SEVERE,
            seasonal_adjustment=1.12,
            seasonal_reason=SeasonalAdjustmentReason.WINTER_WEATHER,
            frost_line_depth_inches=48,
            average_rain_days_per_month=11,
            extreme_heat_days=8
        ),
        material_adjustments=MaterialCostAdjustments(
            transportation_factor=1.15,
            local_availability_factor=1.10,
            lumber_regional_adjustment=1.20,
            concrete_regional_adjustment=1.15
        ),
        union_status=UnionStatus.UNION,
        location_factor=1.35,
        confidence=0.95,
        summary="New York City, NY (10001) - Northeast region with strong union market. High labor and material costs. Severe winter impact."
    )


def _create_houston_factors() -> LocationFactors:
    """Create location factors for Houston, TX (77001)."""
    return LocationFactors(
        zip_code="77001",
        city="Houston",
        state="TX",
        county="Harris",
        region=Region.SOUTH,
        labor_rates=LaborRates(
            electrician=45.0,
            plumber=48.0,
            carpenter=38.0,
            hvac=50.0,
            general_labor=28.0,
            painter=32.0,
            tile_setter=42.0,
            roofer=38.0,
            concrete_finisher=40.0,
            drywall_installer=36.0
        ),
        permit_costs=PermitCosts(
            building_permit_base=350.0,
            building_permit_percentage=0.01,
            electrical_permit=125.0,
            plumbing_permit=125.0,
            mechanical_permit=100.0,
            plan_review_fee=150.0,
            impact_fees=0.0,
            inspection_fees=100.0
        ),
        weather_factors=WeatherFactors(
            winter_impact=WinterImpact.NONE,
            seasonal_adjustment=1.03,
            seasonal_reason=SeasonalAdjustmentReason.SUMMER_HEAT,
            frost_line_depth_inches=0,
            average_rain_days_per_month=9,
            extreme_heat_days=95
        ),
        material_adjustments=MaterialCostAdjustments(
            transportation_factor=0.95,
            local_availability_factor=0.92,
            lumber_regional_adjustment=0.95,
            concrete_regional_adjustment=0.90
        ),
        union_status=UnionStatus.NON_UNION,
        location_factor=0.92,
        confidence=0.93,
        summary="Houston, TX (77001) - South region with non-union market. Lower labor costs. Summer heat impacts outdoor work schedules."
    )


def _create_la_factors() -> LocationFactors:
    """Create location factors for Los Angeles, CA (90001)."""
    return LocationFactors(
        zip_code="90001",
        city="Los Angeles",
        state="CA",
        county="Los Angeles",
        region=Region.PACIFIC,
        labor_rates=LaborRates(
            electrician=78.0,
            plumber=82.0,
            carpenter=68.0,
            hvac=75.0,
            general_labor=48.0,
            painter=55.0,
            tile_setter=65.0,
            roofer=60.0,
            concrete_finisher=62.0,
            drywall_installer=58.0
        ),
        permit_costs=PermitCosts(
            building_permit_base=1200.0,
            building_permit_percentage=0.02,
            electrical_permit=350.0,
            plumbing_permit=350.0,
            mechanical_permit=300.0,
            plan_review_fee=400.0,
            impact_fees=500.0,
            inspection_fees=250.0
        ),
        weather_factors=WeatherFactors(
            winter_impact=WinterImpact.NONE,
            seasonal_adjustment=1.0,
            seasonal_reason=SeasonalAdjustmentReason.NONE,
            frost_line_depth_inches=0,
            average_rain_days_per_month=3,
            extreme_heat_days=25
        ),
        material_adjustments=MaterialCostAdjustments(
            transportation_factor=1.08,
            local_availability_factor=1.02,
            lumber_regional_adjustment=1.15,
            concrete_regional_adjustment=1.08
        ),
        union_status=UnionStatus.UNION,
        location_factor=1.25,
        confidence=0.94,
        summary="Los Angeles, CA (90001) - Pacific region with union market. High labor and permit costs. Minimal weather impact on construction."
    )


def _create_chicago_factors() -> LocationFactors:
    """Create location factors for Chicago, IL (60601)."""
    return LocationFactors(
        zip_code="60601",
        city="Chicago",
        state="IL",
        county="Cook",
        region=Region.MIDWEST,
        labor_rates=LaborRates(
            electrician=72.0,
            plumber=78.0,
            carpenter=62.0,
            hvac=70.0,
            general_labor=42.0,
            painter=50.0,
            tile_setter=58.0,
            roofer=55.0,
            concrete_finisher=58.0,
            drywall_installer=52.0
        ),
        permit_costs=PermitCosts(
            building_permit_base=800.0,
            building_permit_percentage=0.018,
            electrical_permit=275.0,
            plumbing_permit=275.0,
            mechanical_permit=225.0,
            plan_review_fee=300.0,
            impact_fees=100.0,
            inspection_fees=200.0
        ),
        weather_factors=WeatherFactors(
            winter_impact=WinterImpact.SEVERE,
            seasonal_adjustment=1.10,
            seasonal_reason=SeasonalAdjustmentReason.WINTER_WEATHER,
            frost_line_depth_inches=42,
            average_rain_days_per_month=10,
            extreme_heat_days=5
        ),
        material_adjustments=MaterialCostAdjustments(
            transportation_factor=1.02,
            local_availability_factor=0.98,
            lumber_regional_adjustment=1.08,
            concrete_regional_adjustment=1.02
        ),
        union_status=UnionStatus.UNION,
        location_factor=1.18,
        confidence=0.93,
        summary="Chicago, IL (60601) - Midwest region with strong union market. Severe winter impact. Moderate to high labor costs."
    )


def _create_phoenix_factors() -> LocationFactors:
    """Create location factors for Phoenix, AZ (85001)."""
    return LocationFactors(
        zip_code="85001",
        city="Phoenix",
        state="AZ",
        county="Maricopa",
        region=Region.SOUTHWEST,
        labor_rates=LaborRates(
            electrician=48.0,
            plumber=52.0,
            carpenter=40.0,
            hvac=55.0,
            general_labor=30.0,
            painter=35.0,
            tile_setter=45.0,
            roofer=42.0,
            concrete_finisher=42.0,
            drywall_installer=38.0
        ),
        permit_costs=PermitCosts(
            building_permit_base=400.0,
            building_permit_percentage=0.012,
            electrical_permit=150.0,
            plumbing_permit=150.0,
            mechanical_permit=125.0,
            plan_review_fee=175.0,
            impact_fees=50.0,
            inspection_fees=125.0
        ),
        weather_factors=WeatherFactors(
            winter_impact=WinterImpact.NONE,
            seasonal_adjustment=1.08,
            seasonal_reason=SeasonalAdjustmentReason.SUMMER_HEAT,
            frost_line_depth_inches=0,
            average_rain_days_per_month=3,
            extreme_heat_days=150
        ),
        material_adjustments=MaterialCostAdjustments(
            transportation_factor=1.05,
            local_availability_factor=1.0,
            lumber_regional_adjustment=1.02,
            concrete_regional_adjustment=0.98
        ),
        union_status=UnionStatus.NON_UNION,
        location_factor=0.96,
        confidence=0.91,
        summary="Phoenix, AZ (85001) - Southwest region with non-union market. Extreme summer heat impacts work schedules significantly."
    )


# Initialize mock data
MOCK_LOCATIONS["80202"] = _create_denver_factors()
MOCK_LOCATIONS["80203"] = _create_denver_factors()  # Near Denver
MOCK_LOCATIONS["80204"] = _create_denver_factors()  # Near Denver
MOCK_LOCATIONS["10001"] = _create_nyc_factors()
MOCK_LOCATIONS["10002"] = _create_nyc_factors()  # Near NYC
MOCK_LOCATIONS["10003"] = _create_nyc_factors()  # Near NYC
MOCK_LOCATIONS["77001"] = _create_houston_factors()
MOCK_LOCATIONS["77002"] = _create_houston_factors()  # Near Houston
MOCK_LOCATIONS["77003"] = _create_houston_factors()  # Near Houston
MOCK_LOCATIONS["90001"] = _create_la_factors()
MOCK_LOCATIONS["90002"] = _create_la_factors()  # Near LA
MOCK_LOCATIONS["60601"] = _create_chicago_factors()
MOCK_LOCATIONS["60602"] = _create_chicago_factors()  # Near Chicago
MOCK_LOCATIONS["85001"] = _create_phoenix_factors()
MOCK_LOCATIONS["85002"] = _create_phoenix_factors()  # Near Phoenix


# =============================================================================
# COST DATA SERVICE CLASS
# =============================================================================


class CostDataService:
    """Service for retrieving location-based cost data.
    
    This is a mock implementation that will be replaced by Dev 4
    with real RSMeans/cost database integration.
    """
    
    def __init__(self):
        """Initialize CostDataService."""
        self._cache: Dict[str, LocationFactors] = {}
        logger.info("cost_data_service_initialized", mock=True)
    
    async def get_location_factors(self, zip_code: str) -> LocationFactors:
        """Get location factors for a ZIP code.
        
        Args:
            zip_code: 5-digit ZIP code.
            
        Returns:
            LocationFactors for the ZIP code.
        """
        # Normalize ZIP code
        zip_code = zip_code.strip()[:5]
        
        # Check cache first
        if zip_code in self._cache:
            logger.debug("location_factors_cache_hit", zip_code=zip_code)
            return self._cache[zip_code]
        
        # Check mock data
        if zip_code in MOCK_LOCATIONS:
            factors = MOCK_LOCATIONS[zip_code]
            self._cache[zip_code] = factors
            logger.info(
                "location_factors_found",
                zip_code=zip_code,
                city=factors.city,
                state=factors.state
            )
            return factors
        
        # Generate regional defaults for unknown ZIP
        factors = self._generate_regional_factors(zip_code)
        self._cache[zip_code] = factors
        
        logger.info(
            "location_factors_generated",
            zip_code=zip_code,
            region=factors.region.value,
            confidence=factors.confidence
        )
        
        return factors
    
    def _generate_regional_factors(self, zip_code: str) -> LocationFactors:
        """Generate regional factors for unknown ZIP codes.
        
        Uses ZIP code prefix to estimate state and region.
        
        Args:
            zip_code: 5-digit ZIP code.
            
        Returns:
            LocationFactors based on regional estimates.
        """
        # ZIP prefix to state mapping (simplified)
        state = self._estimate_state_from_zip(zip_code)
        region = STATE_REGIONS.get(state, Region.NATIONAL)
        is_union = state in UNION_STATES
        is_high_cost = state in HIGH_COST_STATES
        is_low_cost = state in LOW_COST_STATES
        
        # Calculate location factor
        if is_high_cost:
            location_factor = 1.15
        elif is_low_cost:
            location_factor = 0.90
        else:
            location_factor = 1.0
        
        # Get default and adjust
        defaults = get_default_location_factors()
        
        # Adjust labor rates based on cost level
        labor_multiplier = location_factor
        
        return LocationFactors(
            zip_code=zip_code,
            city="Unknown",
            state=state,
            region=region,
            labor_rates=LaborRates(
                electrician=defaults.labor_rates.electrician * labor_multiplier,
                plumber=defaults.labor_rates.plumber * labor_multiplier,
                carpenter=defaults.labor_rates.carpenter * labor_multiplier,
                hvac=defaults.labor_rates.hvac * labor_multiplier,
                general_labor=defaults.labor_rates.general_labor * labor_multiplier,
                painter=defaults.labor_rates.painter * labor_multiplier,
                tile_setter=defaults.labor_rates.tile_setter * labor_multiplier,
                roofer=defaults.labor_rates.roofer * labor_multiplier,
                concrete_finisher=defaults.labor_rates.concrete_finisher * labor_multiplier,
                drywall_installer=defaults.labor_rates.drywall_installer * labor_multiplier
            ),
            permit_costs=PermitCosts(
                building_permit_base=defaults.permit_costs.building_permit_base * location_factor,
                building_permit_percentage=defaults.permit_costs.building_permit_percentage,
                electrical_permit=defaults.permit_costs.electrical_permit * location_factor,
                plumbing_permit=defaults.permit_costs.plumbing_permit * location_factor,
                mechanical_permit=defaults.permit_costs.mechanical_permit * location_factor,
                plan_review_fee=defaults.permit_costs.plan_review_fee * location_factor,
                impact_fees=0.0,
                inspection_fees=defaults.permit_costs.inspection_fees
            ),
            weather_factors=self._get_regional_weather(region),
            material_adjustments=MaterialCostAdjustments(
                transportation_factor=1.0 + (0.05 if is_high_cost else -0.02 if is_low_cost else 0),
                local_availability_factor=1.0,
                lumber_regional_adjustment=location_factor,
                concrete_regional_adjustment=location_factor
            ),
            union_status=UnionStatus.UNION if is_union else UnionStatus.NON_UNION,
            location_factor=location_factor,
            confidence=0.65,  # Lower confidence for estimated data
            summary=f"Regional estimate for {state} ({zip_code}) - {region.value} region"
        )
    
    def _estimate_state_from_zip(self, zip_code: str) -> str:
        """Estimate state from ZIP code prefix.
        
        Args:
            zip_code: 5-digit ZIP code.
            
        Returns:
            2-letter state abbreviation.
        """
        if not zip_code or len(zip_code) < 3:
            return "XX"
        
        prefix = zip_code[:3]
        prefix_int = int(prefix) if prefix.isdigit() else 0
        
        # Simplified ZIP prefix to state mapping
        # This is an approximation - real implementation would use a complete database
        if 100 <= prefix_int <= 149:
            return "NY"
        elif 150 <= prefix_int <= 196:
            return "PA"
        elif 197 <= prefix_int <= 199:
            return "DE"
        elif 200 <= prefix_int <= 205:
            return "DC"
        elif 206 <= prefix_int <= 219:
            return "MD"
        elif 220 <= prefix_int <= 246:
            return "VA"
        elif 247 <= prefix_int <= 268:
            return "WV"
        elif 270 <= prefix_int <= 289:
            return "NC"
        elif 290 <= prefix_int <= 299:
            return "SC"
        elif 300 <= prefix_int <= 319:
            return "GA"
        elif 320 <= prefix_int <= 339:
            return "FL"
        elif 350 <= prefix_int <= 369:
            return "AL"
        elif 370 <= prefix_int <= 385:
            return "TN"
        elif 386 <= prefix_int <= 397:
            return "MS"
        elif 400 <= prefix_int <= 427:
            return "KY"
        elif 430 <= prefix_int <= 458:
            return "OH"
        elif 460 <= prefix_int <= 479:
            return "IN"
        elif 480 <= prefix_int <= 499:
            return "MI"
        elif 500 <= prefix_int <= 528:
            return "IA"
        elif 530 <= prefix_int <= 549:
            return "WI"
        elif 550 <= prefix_int <= 567:
            return "MN"
        elif 570 <= prefix_int <= 577:
            return "SD"
        elif 580 <= prefix_int <= 588:
            return "ND"
        elif 590 <= prefix_int <= 599:
            return "MT"
        elif 600 <= prefix_int <= 629:
            return "IL"
        elif 630 <= prefix_int <= 658:
            return "MO"
        elif 660 <= prefix_int <= 679:
            return "KS"
        elif 680 <= prefix_int <= 693:
            return "NE"
        elif 700 <= prefix_int <= 714:
            return "LA"
        elif 716 <= prefix_int <= 729:
            return "AR"
        elif 730 <= prefix_int <= 749:
            return "OK"
        elif 750 <= prefix_int <= 799:
            return "TX"
        elif 800 <= prefix_int <= 816:
            return "CO"
        elif 820 <= prefix_int <= 831:
            return "WY"
        elif 832 <= prefix_int <= 838:
            return "ID"
        elif 840 <= prefix_int <= 847:
            return "UT"
        elif 850 <= prefix_int <= 865:
            return "AZ"
        elif 870 <= prefix_int <= 884:
            return "NM"
        elif 889 <= prefix_int <= 898:
            return "NV"
        elif 900 <= prefix_int <= 961:
            return "CA"
        elif 967 <= prefix_int <= 968:
            return "HI"
        elif 970 <= prefix_int <= 979:
            return "OR"
        elif 980 <= prefix_int <= 994:
            return "WA"
        elif 995 <= prefix_int <= 999:
            return "AK"
        else:
            return "XX"
    
    def _get_regional_weather(self, region: Region) -> WeatherFactors:
        """Get typical weather factors for a region.
        
        Args:
            region: Geographic region.
            
        Returns:
            WeatherFactors for the region.
        """
        regional_weather = {
            Region.NORTHEAST: WeatherFactors(
                winter_impact=WinterImpact.SEVERE,
                seasonal_adjustment=1.08,
                seasonal_reason=SeasonalAdjustmentReason.WINTER_WEATHER,
                frost_line_depth_inches=42
            ),
            Region.SOUTHEAST: WeatherFactors(
                winter_impact=WinterImpact.MINIMAL,
                seasonal_adjustment=1.02,
                seasonal_reason=SeasonalAdjustmentReason.HURRICANE_SEASON
            ),
            Region.MIDWEST: WeatherFactors(
                winter_impact=WinterImpact.SEVERE,
                seasonal_adjustment=1.08,
                seasonal_reason=SeasonalAdjustmentReason.WINTER_WEATHER,
                frost_line_depth_inches=48
            ),
            Region.SOUTH: WeatherFactors(
                winter_impact=WinterImpact.NONE,
                seasonal_adjustment=1.03,
                seasonal_reason=SeasonalAdjustmentReason.SUMMER_HEAT
            ),
            Region.SOUTHWEST: WeatherFactors(
                winter_impact=WinterImpact.NONE,
                seasonal_adjustment=1.05,
                seasonal_reason=SeasonalAdjustmentReason.SUMMER_HEAT,
                extreme_heat_days=120
            ),
            Region.MOUNTAIN: WeatherFactors(
                winter_impact=WinterImpact.MODERATE,
                seasonal_adjustment=1.05,
                seasonal_reason=SeasonalAdjustmentReason.WINTER_WEATHER,
                frost_line_depth_inches=36
            ),
            Region.PACIFIC: WeatherFactors(
                winter_impact=WinterImpact.MINIMAL,
                seasonal_adjustment=1.0,
                seasonal_reason=SeasonalAdjustmentReason.NONE
            ),
            Region.NATIONAL: WeatherFactors(
                winter_impact=WinterImpact.MODERATE,
                seasonal_adjustment=1.0,
                seasonal_reason=SeasonalAdjustmentReason.NONE
            )
        }
        
        return regional_weather.get(region, regional_weather[Region.NATIONAL])
    
    def clear_cache(self) -> None:
        """Clear the location factors cache."""
        self._cache.clear()
        logger.info("cost_data_cache_cleared")

    # =========================================================================
    # PR #6: MATERIAL COST AND LABOR RATE LOOKUPS WITH COST RANGES
    # =========================================================================

    async def get_material_cost(
        self,
        cost_code: str,
        item_description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get material cost with P50/P80/P90 range for a cost code.
        
        Uses variance multipliers to generate cost ranges:
        - P50 (low): Base cost (median)
        - P80 (medium): Base × 1.15 (conservative)
        - P90 (high): Base × 1.25 (pessimistic)
        
        Args:
            cost_code: Cost code to look up.
            item_description: Optional item description for fuzzy matching.
            
        Returns:
            Dict with unit_cost (CostRange), labor_hours, equipment_cost (CostRange),
            primary_trade, unit, and confidence.
        """
        logger.debug(
            "get_material_cost",
            cost_code=cost_code,
            item_description=item_description[:50] if item_description else None
        )
        
        # Try exact cost code match first
        for code_data in MOCK_COST_CODES:
            if code_data["code"] == cost_code:
                return self._build_material_cost_result(code_data)
        
        # Try fuzzy match on item description if provided
        if item_description:
            desc_lower = item_description.lower()
            best_match = None
            best_score = 0.0
            
            for code_data in MOCK_COST_CODES:
                score = self._calculate_fuzzy_score(desc_lower, code_data)
                if score > best_score:
                    best_score = score
                    best_match = code_data
            
            if best_match and best_score >= 0.3:
                return self._build_material_cost_result(best_match, confidence=0.75)
        
        # Return default costs based on code prefix
        division = cost_code[:2] if len(cost_code) >= 2 else "00"
        return self._get_default_material_cost(division)
    
    def _build_material_cost_result(
        self,
        code_data: Dict[str, Any],
        confidence: float = 0.90
    ) -> Dict[str, Any]:
        """Build material cost result with P50/P80/P90 ranges.
        
        Args:
            code_data: Cost code data from mock database.
            confidence: Confidence in the cost data.
            
        Returns:
            Material cost result with CostRange values.
        """
        base_material = code_data["material_cost_per_unit"]
        base_equipment = code_data.get("equipment_cost_per_unit", 0.0)
        
        # Apply variance multipliers for P80 and P90
        # P80 = 15% higher, P90 = 25% higher (typical construction variance)
        return {
            "cost_code": code_data["code"],
            "description": code_data["description"],
            "unit": code_data.get("unit", "EA"),
            "unit_cost": CostRange.from_base_cost(base_material),
            "labor_hours_per_unit": code_data["labor_hours_per_unit"],
            "equipment_cost": CostRange.from_base_cost(base_equipment) if base_equipment > 0 else CostRange.zero(),
            "primary_trade": TradeCategory(code_data["primary_trade"]),
            "secondary_trades": [
                TradeCategory(t) for t in code_data.get("secondary_trades", [])
            ],
            "confidence": CostConfidenceLevel.HIGH if confidence >= 0.85 else CostConfidenceLevel.MEDIUM,
            "confidence_score": confidence
        }
    
    def _get_default_material_cost(self, division: str) -> Dict[str, Any]:
        """Get default material cost for a division.
        
        Args:
            division: 2-digit CSI division code.
            
        Returns:
            Default material cost with CostRange values.
        """
        # Default costs by division (P50 base values)
        defaults = {
            "01": {"material": 50.0, "labor": 0.5, "equipment": 0.0, "trade": TradeCategory.GENERAL_LABOR},
            "02": {"material": 5.0, "labor": 0.25, "equipment": 5.0, "trade": TradeCategory.DEMOLITION},
            "03": {"material": 8.0, "labor": 0.3, "equipment": 2.0, "trade": TradeCategory.CONCRETE_FINISHER},
            "04": {"material": 12.0, "labor": 0.4, "equipment": 0.0, "trade": TradeCategory.MASON},
            "05": {"material": 25.0, "labor": 0.5, "equipment": 5.0, "trade": TradeCategory.WELDER},
            "06": {"material": 45.0, "labor": 0.5, "equipment": 0.0, "trade": TradeCategory.CARPENTER},
            "07": {"material": 8.0, "labor": 0.3, "equipment": 0.0, "trade": TradeCategory.ROOFER},
            "08": {"material": 150.0, "labor": 1.0, "equipment": 0.0, "trade": TradeCategory.CARPENTER},
            "09": {"material": 3.0, "labor": 0.15, "equipment": 0.0, "trade": TradeCategory.PAINTER},
            "10": {"material": 50.0, "labor": 0.5, "equipment": 0.0, "trade": TradeCategory.GENERAL_LABOR},
            "11": {"material": 800.0, "labor": 2.0, "equipment": 0.0, "trade": TradeCategory.APPLIANCE_INSTALLER},
            "12": {"material": 200.0, "labor": 1.5, "equipment": 0.0, "trade": TradeCategory.CABINET_INSTALLER},
            "13": {"material": 100.0, "labor": 1.0, "equipment": 0.0, "trade": TradeCategory.GENERAL_LABOR},
            "14": {"material": 500.0, "labor": 4.0, "equipment": 50.0, "trade": TradeCategory.GENERAL_LABOR},
            "21": {"material": 50.0, "labor": 1.0, "equipment": 0.0, "trade": TradeCategory.PLUMBER},
            "22": {"material": 75.0, "labor": 1.5, "equipment": 0.0, "trade": TradeCategory.PLUMBER},
            "23": {"material": 100.0, "labor": 2.0, "equipment": 0.0, "trade": TradeCategory.HVAC},
            "25": {"material": 150.0, "labor": 2.0, "equipment": 0.0, "trade": TradeCategory.ELECTRICIAN},
            "26": {"material": 50.0, "labor": 0.75, "equipment": 0.0, "trade": TradeCategory.ELECTRICIAN},
            "27": {"material": 75.0, "labor": 1.0, "equipment": 0.0, "trade": TradeCategory.ELECTRICIAN},
            "28": {"material": 200.0, "labor": 2.0, "equipment": 0.0, "trade": TradeCategory.ELECTRICIAN},
            "31": {"material": 5.0, "labor": 0.1, "equipment": 10.0, "trade": TradeCategory.GENERAL_LABOR},
            "32": {"material": 10.0, "labor": 0.2, "equipment": 5.0, "trade": TradeCategory.GENERAL_LABOR},
            "33": {"material": 100.0, "labor": 2.0, "equipment": 20.0, "trade": TradeCategory.PLUMBER},
        }
        
        div_defaults = defaults.get(
            division,
            {"material": 50.0, "labor": 0.5, "equipment": 0.0, "trade": TradeCategory.GENERAL_LABOR}
        )
        
        return {
            "cost_code": f"GEN-{division}-001",
            "description": f"General Division {division} item",
            "unit": "EA",
            "unit_cost": CostRange.from_base_cost(div_defaults["material"]),
            "labor_hours_per_unit": div_defaults["labor"],
            "equipment_cost": CostRange.from_base_cost(div_defaults["equipment"]) if div_defaults["equipment"] > 0 else CostRange.zero(),
            "primary_trade": div_defaults["trade"],
            "secondary_trades": [],
            "confidence": CostConfidenceLevel.LOW,
            "confidence_score": 0.50
        }

    async def get_labor_rate(
        self,
        trade: TradeCategory,
        zip_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get labor rate with P50/P80/P90 range for a trade.
        
        Uses location data if available, otherwise returns national averages.
        Applies variance multipliers for range:
        - P50 (low): Base rate
        - P80 (medium): Base × 1.12 (typical overtime/premium)
        - P90 (high): Base × 1.20 (rush/after-hours)
        
        Args:
            trade: Trade category (e.g., ELECTRICIAN, PLUMBER).
            zip_code: Optional ZIP code for location-specific rates.
            
        Returns:
            Dict with hourly_rate (CostRange), union_status, and confidence.
        """
        logger.debug(
            "get_labor_rate",
            trade=trade.value,
            zip_code=zip_code
        )
        
        # Get location factors if ZIP provided
        base_rate = NATIONAL_AVERAGE_LABOR_RATES.get(trade, 40.0)
        union_status = UnionStatus.MIXED
        confidence = 0.70
        
        if zip_code:
            try:
                location = await self.get_location_factors(zip_code)
                # Get trade-specific rate from location data
                trade_rate = self._get_trade_rate_from_location(trade, location)
                if trade_rate:
                    base_rate = trade_rate
                    union_status = location.union_status
                    confidence = 0.90
            except Exception as e:
                logger.warning(
                    "labor_rate_location_lookup_failed",
                    zip_code=zip_code,
                    error=str(e)
                )
        
        # Labor rate variance is typically lower than material variance
        # P80 = 12% higher (overtime consideration)
        # P90 = 20% higher (rush/premium work)
        return {
            "trade": trade,
            "hourly_rate": CostRange.from_base_cost(
                base_rate,
                p80_multiplier=1.12,
                p90_multiplier=1.20
            ),
            "union_status": union_status,
            "confidence": CostConfidenceLevel.HIGH if confidence >= 0.85 else CostConfidenceLevel.MEDIUM,
            "confidence_score": confidence
        }
    
    def _get_trade_rate_from_location(
        self,
        trade: TradeCategory,
        location: LocationFactors
    ) -> Optional[float]:
        """Get trade-specific rate from location factors.
        
        Args:
            trade: Trade category.
            location: Location factors with labor rates.
            
        Returns:
            Hourly rate for the trade, or None if not found.
        """
        trade_mapping = {
            TradeCategory.ELECTRICIAN: location.labor_rates.electrician,
            TradeCategory.PLUMBER: location.labor_rates.plumber,
            TradeCategory.CARPENTER: location.labor_rates.carpenter,
            TradeCategory.HVAC: location.labor_rates.hvac,
            TradeCategory.GENERAL_LABOR: location.labor_rates.general_labor,
            TradeCategory.PAINTER: location.labor_rates.painter,
            TradeCategory.TILE_SETTER: location.labor_rates.tile_setter,
            TradeCategory.ROOFER: location.labor_rates.roofer,
            TradeCategory.CONCRETE_FINISHER: location.labor_rates.concrete_finisher,
            TradeCategory.DRYWALL_INSTALLER: location.labor_rates.drywall_installer,
            # Map additional trades to closest match
            TradeCategory.CABINET_INSTALLER: location.labor_rates.carpenter,
            TradeCategory.COUNTERTOP_INSTALLER: location.labor_rates.carpenter,
            TradeCategory.FLOORING_INSTALLER: location.labor_rates.tile_setter,
            TradeCategory.APPLIANCE_INSTALLER: location.labor_rates.general_labor,
            TradeCategory.DEMOLITION: location.labor_rates.general_labor,
            TradeCategory.MASON: location.labor_rates.concrete_finisher,
            TradeCategory.WELDER: location.labor_rates.carpenter * 1.2,  # Premium
        }
        
        return trade_mapping.get(trade)

    async def get_equipment_cost(
        self,
        equipment_type: str,
        duration_days: int = 1
    ) -> Dict[str, Any]:
        """Get equipment rental cost with P50/P80/P90 range.
        
        Args:
            equipment_type: Type of equipment (e.g., 'dumpster', 'scaffold').
            duration_days: Number of days.
            
        Returns:
            Dict with daily_rate (CostRange), total_cost (CostRange), and confidence.
        """
        logger.debug(
            "get_equipment_cost",
            equipment_type=equipment_type,
            duration_days=duration_days
        )
        
        # Mock equipment rates (P50 base)
        equipment_rates = {
            "dumpster_10yd": 450.0,
            "dumpster_20yd": 550.0,
            "dumpster_30yd": 650.0,
            "scaffold": 75.0,
            "lift": 250.0,
            "compressor": 85.0,
            "generator": 125.0,
            "saw_table": 45.0,
            "saw_miter": 35.0,
            "drill_hammer": 55.0,
        }
        
        # Normalize equipment type
        equipment_key = equipment_type.lower().replace(" ", "_").replace("-", "_")
        
        # Find best match
        base_rate = None
        for key, rate in equipment_rates.items():
            if key in equipment_key or equipment_key in key:
                base_rate = rate
                break
        
        if base_rate is None:
            base_rate = 100.0  # Default
        
        daily_rate = CostRange.from_base_cost(base_rate, p80_multiplier=1.10, p90_multiplier=1.18)
        total_cost = daily_rate * duration_days
        
        return {
            "equipment_type": equipment_type,
            "daily_rate": daily_rate,
            "duration_days": duration_days,
            "total_cost": total_cost,
            "confidence": CostConfidenceLevel.MEDIUM,
            "confidence_score": 0.75
        }
    
    async def get_cost_code(
        self,
        item_description: str,
        division_code: str,
        subdivision_code: Optional[str] = None
    ) -> Dict[str, any]:
        """Get cost code and unit costs for an item.
        
        Uses fuzzy matching on item description to find the best matching
        cost code from the mock database.
        
        Args:
            item_description: Description of the line item.
            division_code: CSI division code (e.g., '06', '22').
            subdivision_code: Optional CSI subdivision code (e.g., '06 41 00').
            
        Returns:
            Dict with cost_code, description, material_cost_per_unit,
            labor_hours_per_unit, primary_trade, and confidence.
        """
        logger.debug(
            "cost_code_lookup",
            item=item_description[:50],
            division=division_code,
            subdivision=subdivision_code
        )
        
        # Normalize description for matching
        desc_lower = item_description.lower()
        
        # Try subdivision code match first
        if subdivision_code:
            normalized_sub = subdivision_code.replace(" ", "")
            for code_data in MOCK_COST_CODES:
                if code_data.get("subdivision", "").replace(" ", "") == normalized_sub:
                    return self._build_cost_code_result(code_data, 0.95)
        
        # Try fuzzy keyword matching within division
        division_codes = [c for c in MOCK_COST_CODES if c["division"] == division_code]
        
        best_match = None
        best_score = 0.0
        
        for code_data in division_codes:
            score = self._calculate_fuzzy_score(desc_lower, code_data)
            if score > best_score:
                best_score = score
                best_match = code_data
        
        # If no good match in division, try global search
        if best_score < 0.3:
            for code_data in MOCK_COST_CODES:
                score = self._calculate_fuzzy_score(desc_lower, code_data)
                if score > best_score:
                    best_score = score
                    best_match = code_data
        
        # If still no match, return generic based on division
        if best_match is None or best_score < 0.2:
            return self._get_default_cost_code(division_code, item_description)
        
        return self._build_cost_code_result(best_match, min(0.95, best_score + 0.3))
    
    def _calculate_fuzzy_score(
        self,
        description: str,
        code_data: Dict[str, any]
    ) -> float:
        """Calculate fuzzy match score between description and cost code.
        
        Args:
            description: Normalized item description (lowercase).
            code_data: Cost code data from mock database.
            
        Returns:
            Match score from 0.0 to 1.0.
        """
        keywords = code_data.get("keywords", [])
        if not keywords:
            return 0.0
        
        matches = 0
        for keyword in keywords:
            if keyword.lower() in description:
                matches += 1
        
        return matches / len(keywords) if keywords else 0.0
    
    def _build_cost_code_result(
        self,
        code_data: Dict[str, any],
        confidence: float
    ) -> Dict[str, any]:
        """Build cost code result dict from code data.
        
        Args:
            code_data: Cost code data from mock database.
            confidence: Match confidence.
            
        Returns:
            Formatted cost code result.
        """
        return {
            "cost_code": code_data["code"],
            "subdivision": code_data.get("subdivision"),
            "description": code_data["description"],
            "material_cost_per_unit": code_data["material_cost_per_unit"],
            "labor_hours_per_unit": code_data["labor_hours_per_unit"],
            "equipment_cost_per_unit": code_data.get("equipment_cost_per_unit", 0.0),
            "primary_trade": code_data["primary_trade"],
            "secondary_trades": code_data.get("secondary_trades", []),
            "unit": code_data.get("unit", "EA"),
            "source": "rsmeans",
            "confidence": confidence
        }
    
    def _get_default_cost_code(
        self,
        division_code: str,
        item_description: str
    ) -> Dict[str, any]:
        """Get default cost code for a division when no match found.
        
        Args:
            division_code: CSI division code.
            item_description: Original item description.
            
        Returns:
            Default cost code for the division.
        """
        # Default values by division
        defaults = {
            "01": {"trade": "general_labor", "material": 50.0, "labor": 0.5},
            "02": {"trade": "demolition", "material": 5.0, "labor": 0.25},
            "03": {"trade": "concrete_finisher", "material": 8.0, "labor": 0.3},
            "04": {"trade": "mason", "material": 12.0, "labor": 0.4},
            "05": {"trade": "welder", "material": 25.0, "labor": 0.5},
            "06": {"trade": "carpenter", "material": 45.0, "labor": 0.5},
            "07": {"trade": "roofer", "material": 8.0, "labor": 0.3},
            "08": {"trade": "carpenter", "material": 150.0, "labor": 1.0},
            "09": {"trade": "painter", "material": 3.0, "labor": 0.15},
            "10": {"trade": "general_labor", "material": 50.0, "labor": 0.5},
            "11": {"trade": "appliance_installer", "material": 800.0, "labor": 2.0},
            "12": {"trade": "cabinet_installer", "material": 200.0, "labor": 1.5},
            "13": {"trade": "general_labor", "material": 100.0, "labor": 1.0},
            "14": {"trade": "general_labor", "material": 500.0, "labor": 4.0},
            "21": {"trade": "plumber", "material": 50.0, "labor": 1.0},
            "22": {"trade": "plumber", "material": 75.0, "labor": 1.5},
            "23": {"trade": "hvac", "material": 100.0, "labor": 2.0},
            "25": {"trade": "electrician", "material": 150.0, "labor": 2.0},
            "26": {"trade": "electrician", "material": 50.0, "labor": 0.75},
            "27": {"trade": "electrician", "material": 75.0, "labor": 1.0},
            "28": {"trade": "electrician", "material": 200.0, "labor": 2.0},
            "31": {"trade": "general_labor", "material": 5.0, "labor": 0.1},
            "32": {"trade": "general_labor", "material": 10.0, "labor": 0.2},
            "33": {"trade": "plumber", "material": 100.0, "labor": 2.0},
        }
        
        div_defaults = defaults.get(
            division_code,
            {"trade": "general_labor", "material": 50.0, "labor": 0.5}
        )
        
        return {
            "cost_code": f"GEN-{division_code}-001",
            "subdivision": None,
            "description": f"General {division_code} work item",
            "material_cost_per_unit": div_defaults["material"],
            "labor_hours_per_unit": div_defaults["labor"],
            "equipment_cost_per_unit": 0.0,
            "primary_trade": div_defaults["trade"],
            "secondary_trades": [],
            "unit": "EA",
            "source": "inferred",
            "confidence": 0.5
        }


# =============================================================================
# MOCK COST CODE DATABASE
# =============================================================================

# Mock RSMeans-style cost codes for common construction items
MOCK_COST_CODES: List[Dict[str, any]] = [
    # Division 01 - General Requirements
    {
        "code": "01-3100-0100",
        "subdivision": "01 31 00",
        "division": "01",
        "description": "Project supervision and coordination",
        "keywords": ["supervision", "coordination", "project management", "site management"],
        "material_cost_per_unit": 0.0,
        "labor_hours_per_unit": 8.0,
        "primary_trade": "general_labor",
        "unit": "day"
    },
    {
        "code": "01-5600-0100",
        "subdivision": "01 56 00",
        "division": "01",
        "description": "Temporary floor protection",
        "keywords": ["floor protection", "ram board", "protection", "temporary"],
        "material_cost_per_unit": 0.35,
        "labor_hours_per_unit": 0.02,
        "primary_trade": "general_labor",
        "unit": "SF"
    },
    {
        "code": "01-7400-0100",
        "subdivision": "01 74 00",
        "division": "01",
        "description": "Daily cleaning and debris removal",
        "keywords": ["cleanup", "cleaning", "debris", "daily"],
        "material_cost_per_unit": 25.0,
        "labor_hours_per_unit": 2.0,
        "primary_trade": "general_labor",
        "unit": "day"
    },
    {
        "code": "01-7400-0200",
        "subdivision": "01 74 00",
        "division": "01",
        "description": "Final construction cleaning",
        "keywords": ["final", "cleaning", "post-construction", "detail"],
        "material_cost_per_unit": 0.15,
        "labor_hours_per_unit": 0.05,
        "primary_trade": "general_labor",
        "unit": "SF"
    },
    
    # Division 02 - Existing Conditions (Demolition)
    {
        "code": "02-4119-0100",
        "subdivision": "02 41 19",
        "division": "02",
        "description": "Cabinet demolition and removal",
        "keywords": ["cabinet", "demolition", "removal", "kitchen"],
        "material_cost_per_unit": 2.0,
        "labor_hours_per_unit": 0.5,
        "primary_trade": "demolition",
        "unit": "LF"
    },
    {
        "code": "02-4119-0200",
        "subdivision": "02 41 19",
        "division": "02",
        "description": "Countertop demolition and removal",
        "keywords": ["countertop", "demolition", "removal"],
        "material_cost_per_unit": 1.0,
        "labor_hours_per_unit": 0.15,
        "primary_trade": "demolition",
        "unit": "SF"
    },
    {
        "code": "02-4119-0300",
        "subdivision": "02 41 19",
        "division": "02",
        "description": "Flooring demolition and removal",
        "keywords": ["flooring", "floor", "demolition", "removal", "vinyl", "tile"],
        "material_cost_per_unit": 0.50,
        "labor_hours_per_unit": 0.05,
        "primary_trade": "demolition",
        "unit": "SF"
    },
    {
        "code": "02-4119-0400",
        "subdivision": "02 41 19",
        "division": "02",
        "description": "Plumbing fixture disconnection",
        "keywords": ["fixture", "disconnect", "plumbing", "sink"],
        "material_cost_per_unit": 0.0,
        "labor_hours_per_unit": 0.75,
        "primary_trade": "plumber",
        "unit": "EA"
    },
    {
        "code": "02-4100-0100",
        "subdivision": "02 41 00",
        "division": "02",
        "description": "Dumpster rental - 10 yard",
        "keywords": ["dumpster", "rental", "disposal", "debris"],
        "material_cost_per_unit": 450.0,
        "labor_hours_per_unit": 0.5,
        "primary_trade": "general_labor",
        "unit": "EA"
    },
    
    # Division 06 - Wood, Plastics, Composites (Cabinets, Trim)
    {
        "code": "06-4100-0100",
        "subdivision": "06 41 00",
        "division": "06",
        "description": "Base cabinets - mid-range",
        "keywords": ["base cabinet", "cabinet", "lower", "kitchen cabinet"],
        "material_cost_per_unit": 175.0,
        "labor_hours_per_unit": 1.0,
        "primary_trade": "cabinet_installer",
        "unit": "LF"
    },
    {
        "code": "06-4100-0200",
        "subdivision": "06 41 00",
        "division": "06",
        "description": "Upper/wall cabinets - mid-range",
        "keywords": ["upper cabinet", "wall cabinet", "cabinet"],
        "material_cost_per_unit": 150.0,
        "labor_hours_per_unit": 0.85,
        "primary_trade": "cabinet_installer",
        "unit": "LF"
    },
    {
        "code": "06-4100-0300",
        "subdivision": "06 41 00",
        "division": "06",
        "description": "Island cabinet unit",
        "keywords": ["island", "cabinet", "kitchen island"],
        "material_cost_per_unit": 1200.0,
        "labor_hours_per_unit": 4.0,
        "primary_trade": "cabinet_installer",
        "unit": "EA"
    },
    {
        "code": "06-4100-0400",
        "subdivision": "06 41 00",
        "division": "06",
        "description": "Tall pantry cabinet",
        "keywords": ["pantry", "tall cabinet", "utility cabinet"],
        "material_cost_per_unit": 800.0,
        "labor_hours_per_unit": 2.0,
        "primary_trade": "cabinet_installer",
        "unit": "EA"
    },
    {
        "code": "06-2200-0100",
        "subdivision": "06 22 00",
        "division": "06",
        "description": "Crown molding",
        "keywords": ["crown", "molding", "trim", "ceiling trim"],
        "material_cost_per_unit": 4.50,
        "labor_hours_per_unit": 0.15,
        "primary_trade": "carpenter",
        "unit": "LF"
    },
    {
        "code": "06-2200-0200",
        "subdivision": "06 22 00",
        "division": "06",
        "description": "Base/shoe molding",
        "keywords": ["base", "shoe", "molding", "baseboard", "trim"],
        "material_cost_per_unit": 3.50,
        "labor_hours_per_unit": 0.12,
        "primary_trade": "carpenter",
        "unit": "LF"
    },
    {
        "code": "06-1000-0100",
        "subdivision": "06 10 00",
        "division": "06",
        "description": "Blocking for cabinet mounting",
        "keywords": ["blocking", "framing", "support", "backing"],
        "material_cost_per_unit": 2.50,
        "labor_hours_per_unit": 0.25,
        "primary_trade": "carpenter",
        "unit": "LF"
    },
    
    # Division 08 - Openings (Hardware)
    {
        "code": "08-7100-0100",
        "subdivision": "08 71 00",
        "division": "08",
        "description": "Cabinet hardware - pulls",
        "keywords": ["hardware", "pull", "handle", "cabinet pull"],
        "material_cost_per_unit": 12.0,
        "labor_hours_per_unit": 0.15,
        "primary_trade": "carpenter",
        "unit": "EA"
    },
    {
        "code": "08-7100-0200",
        "subdivision": "08 71 00",
        "division": "08",
        "description": "Cabinet hardware - knobs",
        "keywords": ["hardware", "knob", "cabinet knob"],
        "material_cost_per_unit": 8.0,
        "labor_hours_per_unit": 0.1,
        "primary_trade": "carpenter",
        "unit": "EA"
    },
    
    # Division 09 - Finishes (Flooring, Paint, Tile)
    {
        "code": "09-6400-0100",
        "subdivision": "09 64 00",
        "division": "09",
        "description": "Engineered hardwood flooring",
        "keywords": ["hardwood", "flooring", "engineered", "wood floor"],
        "material_cost_per_unit": 7.50,
        "labor_hours_per_unit": 0.08,
        "primary_trade": "flooring_installer",
        "unit": "SF"
    },
    {
        "code": "09-6400-0200",
        "subdivision": "09 64 00",
        "division": "09",
        "description": "Flooring underlayment",
        "keywords": ["underlayment", "moisture barrier", "subfloor"],
        "material_cost_per_unit": 0.75,
        "labor_hours_per_unit": 0.02,
        "primary_trade": "flooring_installer",
        "unit": "SF"
    },
    {
        "code": "09-6200-0100",
        "subdivision": "09 62 00",
        "division": "09",
        "description": "Subfloor prep and leveling",
        "keywords": ["subfloor", "leveling", "prep", "floor prep"],
        "material_cost_per_unit": 150.0,
        "labor_hours_per_unit": 4.0,
        "primary_trade": "flooring_installer",
        "unit": "allowance"
    },
    {
        "code": "09-9100-0100",
        "subdivision": "09 91 00",
        "division": "09",
        "description": "Wall paint - 2 coats",
        "keywords": ["paint", "wall paint", "interior paint", "painting"],
        "material_cost_per_unit": 0.45,
        "labor_hours_per_unit": 0.02,
        "primary_trade": "painter",
        "unit": "SF"
    },
    {
        "code": "09-9100-0200",
        "subdivision": "09 91 00",
        "division": "09",
        "description": "Ceiling paint",
        "keywords": ["ceiling", "paint", "ceiling paint"],
        "material_cost_per_unit": 0.35,
        "labor_hours_per_unit": 0.015,
        "primary_trade": "painter",
        "unit": "SF"
    },
    {
        "code": "09-2900-0100",
        "subdivision": "09 29 00",
        "division": "09",
        "description": "Drywall repair and patching",
        "keywords": ["drywall", "repair", "patch", "wall repair"],
        "material_cost_per_unit": 200.0,
        "labor_hours_per_unit": 4.0,
        "primary_trade": "drywall_installer",
        "unit": "allowance"
    },
    {
        "code": "09-3000-0100",
        "subdivision": "09 30 00",
        "division": "09",
        "description": "Ceramic tile - subway backsplash",
        "keywords": ["tile", "backsplash", "subway", "ceramic", "wall tile"],
        "material_cost_per_unit": 8.0,
        "labor_hours_per_unit": 0.15,
        "primary_trade": "tile_setter",
        "unit": "SF"
    },
    {
        "code": "09-3000-0200",
        "subdivision": "09 30 00",
        "division": "09",
        "description": "Tile setting materials",
        "keywords": ["thinset", "grout", "tile mortar", "setting materials"],
        "material_cost_per_unit": 2.50,
        "labor_hours_per_unit": 0.0,
        "primary_trade": "tile_setter",
        "unit": "SF"
    },
    
    # Division 10 - Specialties
    {
        "code": "10-2800-0100",
        "subdivision": "10 28 00",
        "division": "10",
        "description": "Paper towel holder",
        "keywords": ["paper towel", "holder", "accessory"],
        "material_cost_per_unit": 35.0,
        "labor_hours_per_unit": 0.25,
        "primary_trade": "general_labor",
        "unit": "EA"
    },
    
    # Division 11 - Equipment (Appliances)
    {
        "code": "11-3100-0100",
        "subdivision": "11 31 00",
        "division": "11",
        "description": "Refrigerator - mid-range",
        "keywords": ["refrigerator", "fridge", "french door", "counter depth"],
        "material_cost_per_unit": 1800.0,
        "labor_hours_per_unit": 1.0,
        "primary_trade": "appliance_installer",
        "unit": "EA"
    },
    {
        "code": "11-3100-0200",
        "subdivision": "11 31 00",
        "division": "11",
        "description": "Gas range - mid-range",
        "keywords": ["range", "stove", "gas range", "oven"],
        "material_cost_per_unit": 900.0,
        "labor_hours_per_unit": 1.5,
        "primary_trade": "appliance_installer",
        "secondary_trades": ["plumber"],
        "unit": "EA"
    },
    {
        "code": "11-3100-0300",
        "subdivision": "11 31 00",
        "division": "11",
        "description": "Dishwasher - mid-range",
        "keywords": ["dishwasher", "built-in"],
        "material_cost_per_unit": 750.0,
        "labor_hours_per_unit": 2.0,
        "primary_trade": "appliance_installer",
        "secondary_trades": ["plumber"],
        "unit": "EA"
    },
    {
        "code": "11-3100-0400",
        "subdivision": "11 31 00",
        "division": "11",
        "description": "Range hood",
        "keywords": ["range hood", "hood", "ventilation", "exhaust"],
        "material_cost_per_unit": 450.0,
        "labor_hours_per_unit": 2.5,
        "primary_trade": "appliance_installer",
        "secondary_trades": ["electrician"],
        "unit": "EA"
    },
    {
        "code": "11-3100-0500",
        "subdivision": "11 31 00",
        "division": "11",
        "description": "Microwave - countertop",
        "keywords": ["microwave", "countertop microwave"],
        "material_cost_per_unit": 200.0,
        "labor_hours_per_unit": 0.25,
        "primary_trade": "appliance_installer",
        "unit": "EA"
    },
    
    # Division 12 - Furnishings (Countertops, Sink)
    {
        "code": "12-3600-0100",
        "subdivision": "12 36 00",
        "division": "12",
        "description": "Granite countertops - level 2",
        "keywords": ["granite", "countertop", "counter", "stone"],
        "material_cost_per_unit": 55.0,
        "labor_hours_per_unit": 0.2,
        "primary_trade": "countertop_installer",
        "unit": "SF"
    },
    {
        "code": "12-3640-0100",
        "subdivision": "12 36 40",
        "division": "12",
        "description": "Undermount kitchen sink - stainless",
        "keywords": ["sink", "undermount", "kitchen sink", "stainless"],
        "material_cost_per_unit": 350.0,
        "labor_hours_per_unit": 2.0,
        "primary_trade": "plumber",
        "unit": "EA"
    },
    
    # Division 22 - Plumbing
    {
        "code": "22-4100-0100",
        "subdivision": "22 41 00",
        "division": "22",
        "description": "Kitchen faucet",
        "keywords": ["faucet", "kitchen faucet", "pull-down"],
        "material_cost_per_unit": 275.0,
        "labor_hours_per_unit": 1.5,
        "primary_trade": "plumber",
        "unit": "EA"
    },
    {
        "code": "22-4100-0200",
        "subdivision": "22 41 00",
        "division": "22",
        "description": "Garbage disposal",
        "keywords": ["disposal", "garbage disposal", "insinkerator"],
        "material_cost_per_unit": 225.0,
        "labor_hours_per_unit": 1.5,
        "primary_trade": "plumber",
        "unit": "EA"
    },
    {
        "code": "22-1300-0100",
        "subdivision": "22 13 00",
        "division": "22",
        "description": "Sink drain assembly",
        "keywords": ["drain", "p-trap", "tailpiece", "drain assembly"],
        "material_cost_per_unit": 45.0,
        "labor_hours_per_unit": 0.75,
        "primary_trade": "plumber",
        "unit": "EA"
    },
    {
        "code": "22-1100-0100",
        "subdivision": "22 11 00",
        "division": "22",
        "description": "Water supply lines",
        "keywords": ["supply line", "water line", "supply"],
        "material_cost_per_unit": 25.0,
        "labor_hours_per_unit": 0.5,
        "primary_trade": "plumber",
        "unit": "EA"
    },
    {
        "code": "22-1100-0200",
        "subdivision": "22 11 00",
        "division": "22",
        "description": "Dishwasher supply line with valve",
        "keywords": ["dishwasher supply", "supply line", "valve"],
        "material_cost_per_unit": 45.0,
        "labor_hours_per_unit": 0.75,
        "primary_trade": "plumber",
        "unit": "EA"
    },
    {
        "code": "22-1100-0300",
        "subdivision": "22 11 00",
        "division": "22",
        "description": "Ice maker line",
        "keywords": ["ice maker", "refrigerator line", "water line"],
        "material_cost_per_unit": 35.0,
        "labor_hours_per_unit": 0.75,
        "primary_trade": "plumber",
        "unit": "EA"
    },
    
    # Division 26 - Electrical
    {
        "code": "26-5100-0100",
        "subdivision": "26 51 00",
        "division": "26",
        "description": "Recessed LED light fixture",
        "keywords": ["recessed", "LED", "light", "can light", "downlight"],
        "material_cost_per_unit": 75.0,
        "labor_hours_per_unit": 0.75,
        "primary_trade": "electrician",
        "unit": "EA"
    },
    {
        "code": "26-5100-0200",
        "subdivision": "26 51 00",
        "division": "26",
        "description": "Pendant light rough-in",
        "keywords": ["pendant", "light rough-in", "junction box"],
        "material_cost_per_unit": 35.0,
        "labor_hours_per_unit": 1.0,
        "primary_trade": "electrician",
        "unit": "EA"
    },
    {
        "code": "26-5100-0300",
        "subdivision": "26 51 00",
        "division": "26",
        "description": "Under-cabinet LED lighting",
        "keywords": ["under-cabinet", "LED strip", "task light"],
        "material_cost_per_unit": 15.0,
        "labor_hours_per_unit": 0.25,
        "primary_trade": "electrician",
        "unit": "LF"
    },
    {
        "code": "26-2700-0100",
        "subdivision": "26 27 00",
        "division": "26",
        "description": "GFCI outlet",
        "keywords": ["GFCI", "outlet", "receptacle", "countertop outlet"],
        "material_cost_per_unit": 35.0,
        "labor_hours_per_unit": 0.5,
        "primary_trade": "electrician",
        "unit": "EA"
    },
    {
        "code": "26-2700-0200",
        "subdivision": "26 27 00",
        "division": "26",
        "description": "Dedicated circuit verification",
        "keywords": ["circuit", "dedicated", "range circuit", "appliance circuit"],
        "material_cost_per_unit": 25.0,
        "labor_hours_per_unit": 0.5,
        "primary_trade": "electrician",
        "unit": "EA"
    },
    {
        "code": "26-2700-0300",
        "subdivision": "26 27 00",
        "division": "26",
        "description": "Dimmer switch",
        "keywords": ["dimmer", "switch", "light switch"],
        "material_cost_per_unit": 45.0,
        "labor_hours_per_unit": 0.5,
        "primary_trade": "electrician",
        "unit": "EA"
    },
    {
        "code": "26-2700-0400",
        "subdivision": "26 27 00",
        "division": "26",
        "description": "Disposal switch (air or wall)",
        "keywords": ["disposal switch", "air switch", "garbage disposal"],
        "material_cost_per_unit": 55.0,
        "labor_hours_per_unit": 0.75,
        "primary_trade": "electrician",
        "unit": "EA"
    },
]

