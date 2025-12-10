"""Cost Data Service for TrueCost.

Mock implementation of cost data service for location-based factors.
This will be replaced by Dev 4 with real RSMeans/cost database integration.
"""

from typing import Dict, Optional
import structlog

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

