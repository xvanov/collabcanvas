# TrueCost Services
from .cost_data_service import (
    LocationFactors,
    PermitCosts,
    WeatherFactors,
    LaborRate,
    MaterialCost,
    ItemNotFoundError,
    get_location_factors,
    get_material_cost,
    get_labor_rate,
    search_materials,
)
from .monte_carlo import (
    LineItemInput,
    RiskFactor,
    HistogramBin,
    MonteCarloResult,
    run_simulation,
    create_line_item,
)
from .pdf_generator import (
    PDFGenerationRequest,
    PDFGenerationResult,
    generate_pdf,
    generate_pdf_local,
    get_available_sections,
    validate_sections,
)
# Story 4.5: Real Data Integration
from .bls_service import (
    BLSLaborRate,
    BLSResponse,
    SOC_CODE_MAP,
    MSA_CODE_MAP,
    get_labor_rates_for_zip,
    get_single_trade_rate,
    get_all_trades,
    get_soc_code,
    get_msa_for_zip,
)
from .weather_service import (
    WeatherFactors as OpenMeteoWeatherFactors,
    get_weather_factors as get_weather_factors_from_api,
    compare_weather_factors,
    calculate_winter_slowdown,
    calculate_summer_premium,
    identify_rainy_months,
)

__all__ = [
    # Location Intelligence Service
    "LocationFactors",
    "PermitCosts",
    "WeatherFactors",
    "LaborRate",
    "get_location_factors",
    # Cost Data Service (Story 4.2)
    "MaterialCost",
    "ItemNotFoundError",
    "get_material_cost",
    "get_labor_rate",
    "search_materials",
    # Monte Carlo Service (Story 4.2)
    "LineItemInput",
    "RiskFactor",
    "HistogramBin",
    "MonteCarloResult",
    "run_simulation",
    "create_line_item",
    # PDF Generator Service (Story 4.3)
    "PDFGenerationRequest",
    "PDFGenerationResult",
    "generate_pdf",
    "generate_pdf_local",
    "get_available_sections",
    "validate_sections",
    # BLS Service (Story 4.5)
    "BLSLaborRate",
    "BLSResponse",
    "SOC_CODE_MAP",
    "MSA_CODE_MAP",
    "get_labor_rates_for_zip",
    "get_single_trade_rate",
    "get_all_trades",
    "get_soc_code",
    "get_msa_for_zip",
    # Weather Service (Story 4.5)
    "OpenMeteoWeatherFactors",
    "get_weather_factors_from_api",
    "compare_weather_factors",
    "calculate_winter_slowdown",
    "calculate_summer_premium",
    "identify_rainy_months",
]
