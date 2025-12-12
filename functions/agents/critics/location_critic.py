"""Location Critic for TrueCost.

Provides detailed feedback when Location Agent output scores below threshold.
Uses LLM to generate actionable critique and improvement suggestions.
"""

from typing import Dict, Any, List, Optional

import structlog

from agents.critics.base_critic import BaseCritic
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


# =============================================================================
# SCORING THRESHOLDS (same as scorer)
# =============================================================================

REQUIRED_LABOR_TRADES = [
    "electrician",
    "plumber",
    "carpenter",
    "hvac",
    "general_labor",
    "painter"
]

REQUIRED_PERMIT_TYPES = [
    "buildingPermitBase",
    "electricalPermit",
    "plumbingPermit",
    "mechanicalPermit"
]

MIN_LOCATION_FACTOR = 0.7
MAX_LOCATION_FACTOR = 1.6
MIN_LABOR_RATE = 20.0
MAX_LABOR_RATE = 150.0


# =============================================================================
# LOCATION CRITIC CLASS
# =============================================================================


class LocationCritic(BaseCritic):
    """Critic for Location Agent output.
    
    Only called when scorer returns score < 80.
    Provides detailed feedback on:
    - What issues were found
    - Why each issue is problematic
    - How to fix each issue
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize LocationCritic.
        
        Args:
            firestore_service: Optional Firestore service instance.
            llm_service: Optional LLM service instance.
        """
        super().__init__(
            name="location_critic",
            primary_agent_name="location",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_critique_prompt(self) -> str:
        """Get the system prompt for critique generation.
        
        Returns:
            System prompt for LLM critique.
        """
        base_prompt = self.get_base_critique_prompt()
        
        location_specific = """
## Location Agent Specific Criteria

Focus your critique on these construction estimation requirements:

### 1. Labor Rates Completeness
Required trades (MUST have all):
- Electrician (typical: $45-95/hr)
- Plumber (typical: $48-100/hr)
- Carpenter (typical: $38-82/hr)
- HVAC Technician (typical: $50-92/hr)
- General Labor (typical: $28-55/hr)
- Painter (typical: $32-68/hr)

### 2. Location Data Accuracy
- ZIP code must match input
- City and state must be present and valid
- Region must be correctly identified

### 3. Location Factor Validity
- Must be between 0.7 and 1.6
- Should reflect actual regional cost differences
- High-cost areas: NY, CA, MA, CT (typically 1.15-1.35)
- Low-cost areas: MS, AR, AL, OK (typically 0.85-0.95)

### 4. Permit Costs
Required permits:
- Building permit (base fee + percentage)
- Electrical permit
- Plumbing permit  
- Mechanical permit

### 5. Weather Factors
- Winter impact level (none/minimal/moderate/severe)
- Seasonal adjustment factor (0.8-1.3)
- Should match regional climate patterns

### 6. Analysis Quality
- Must include substantive analysis
- 3+ key findings
- 2+ recommendations
- Risk factors identified

Be specific about which values are wrong and what they should be.
"""
        return base_prompt + location_specific
    
    async def analyze_output(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any],
        score: int,
        scorer_feedback: str
    ) -> Dict[str, Any]:
        """Analyze output for issues before LLM critique.
        
        This provides preliminary analysis that the LLM can enhance.
        
        Args:
            output: Location agent output.
            input_data: Original input data.
            score: Scorer's numerical score.
            scorer_feedback: Feedback from the scorer.
            
        Returns:
            Dict with issues, why_wrong, how_to_fix.
        """
        issues: List[str] = []
        why_wrong: List[str] = []
        how_to_fix: List[str] = []
        
        # Analyze labor rates
        labor_issues = self._analyze_labor_rates(output)
        issues.extend(labor_issues["issues"])
        why_wrong.extend(labor_issues["why_wrong"])
        how_to_fix.extend(labor_issues["how_to_fix"])
        
        # Analyze location data
        location_issues = self._analyze_location_data(output, input_data)
        issues.extend(location_issues["issues"])
        why_wrong.extend(location_issues["why_wrong"])
        how_to_fix.extend(location_issues["how_to_fix"])
        
        # Analyze location factor
        factor_issues = self._analyze_location_factor(output)
        issues.extend(factor_issues["issues"])
        why_wrong.extend(factor_issues["why_wrong"])
        how_to_fix.extend(factor_issues["how_to_fix"])
        
        # Analyze permit costs
        permit_issues = self._analyze_permit_costs(output)
        issues.extend(permit_issues["issues"])
        why_wrong.extend(permit_issues["why_wrong"])
        how_to_fix.extend(permit_issues["how_to_fix"])
        
        # Analyze weather factors
        weather_issues = self._analyze_weather_factors(output)
        issues.extend(weather_issues["issues"])
        why_wrong.extend(weather_issues["why_wrong"])
        how_to_fix.extend(weather_issues["how_to_fix"])
        
        # Analyze analysis quality
        analysis_issues = self._analyze_analysis_quality(output)
        issues.extend(analysis_issues["issues"])
        why_wrong.extend(analysis_issues["why_wrong"])
        how_to_fix.extend(analysis_issues["how_to_fix"])
        
        # If no specific issues found, provide generic feedback
        if not issues:
            issues = [f"Overall score ({score}) below threshold (80)"]
            why_wrong = ["Output quality did not meet minimum standards"]
            how_to_fix = ["Review all fields and ensure completeness and accuracy"]
        
        return {
            "issues": issues,
            "why_wrong": " ".join(why_wrong) if why_wrong else "Multiple quality issues detected",
            "how_to_fix": how_to_fix
        }
    
    def _analyze_labor_rates(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze labor rates for issues.
        
        Args:
            output: Location agent output.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        labor_rates = output.get("laborRates", {})
        
        if not labor_rates:
            issues.append("Labor rates section is missing entirely")
            why_wrong.append("Labor rates are essential for accurate cost estimation.")
            how_to_fix.append("Add laborRates object with rates for all required trades")
            return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
        
        # Check each required trade
        missing_trades = []
        invalid_trades = []
        
        for trade in REQUIRED_LABOR_TRADES:
            if trade not in labor_rates:
                missing_trades.append(trade)
            else:
                rate = labor_rates[trade]
                if not isinstance(rate, (int, float)):
                    invalid_trades.append(f"{trade} (not a number)")
                elif rate < MIN_LABOR_RATE:
                    invalid_trades.append(f"{trade} (${rate}/hr too low, min ${MIN_LABOR_RATE})")
                elif rate > MAX_LABOR_RATE:
                    invalid_trades.append(f"{trade} (${rate}/hr too high, max ${MAX_LABOR_RATE})")
        
        if missing_trades:
            issues.append(f"Missing labor rates for: {', '.join(missing_trades)}")
            why_wrong.append(f"Cannot estimate costs without rates for {len(missing_trades)} required trades.")
            how_to_fix.append(f"Add labor rates for: {', '.join(missing_trades)}")
        
        if invalid_trades:
            issues.append(f"Invalid labor rates: {', '.join(invalid_trades)}")
            why_wrong.append("Invalid rates will produce inaccurate cost estimates.")
            how_to_fix.append(f"Fix labor rates to be within ${MIN_LABOR_RATE}-${MAX_LABOR_RATE}/hr range")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
    
    def _analyze_location_data(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze location data for issues.
        
        Args:
            output: Location agent output.
            input_data: Original input data.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        # Get input location
        clarification = input_data.get("clarification_output", {})
        project_brief = clarification.get("projectBrief", {})
        input_location = project_brief.get("location", {})
        input_zip = input_location.get("zipCode", "")
        
        # Check output location
        output_zip = output.get("zipCode", "")
        output_city = output.get("city", "")
        output_state = output.get("state", "")
        
        if not output_zip:
            issues.append("ZIP code is missing")
            why_wrong.append("ZIP code is required for location-based cost lookup.")
            how_to_fix.append(f"Set zipCode to '{input_zip}' from input")
        elif input_zip and output_zip[:5] != input_zip[:5]:
            issues.append(f"ZIP code mismatch: output '{output_zip}' vs input '{input_zip}'")
            why_wrong.append("Mismatched ZIP will return wrong location data.")
            how_to_fix.append(f"Use input ZIP code: {input_zip}")
        
        if not output_city or output_city == "Unknown":
            issues.append("City name is missing or unknown")
            how_to_fix.append("Set city name from input or cost data lookup")
        
        if not output_state or len(output_state) != 2:
            issues.append(f"State is invalid: '{output_state}'")
            why_wrong.append("Valid 2-letter state code required for regional factors.")
            how_to_fix.append("Set state to valid 2-letter abbreviation (e.g., 'CO', 'NY')")
        
        if not output.get("region"):
            issues.append("Region is missing")
            how_to_fix.append("Set region based on state (e.g., Mountain, Northeast)")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
    
    def _analyze_location_factor(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze location factor for issues.
        
        Args:
            output: Location agent output.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        factor = output.get("locationFactor")
        
        if factor is None:
            issues.append("Location factor is missing")
            why_wrong.append("Location factor is critical for regional cost adjustment.")
            how_to_fix.append("Add locationFactor value between 0.7 and 1.6")
        elif not isinstance(factor, (int, float)):
            issues.append(f"Location factor has invalid type: {type(factor)}")
            how_to_fix.append("Set locationFactor to a numeric value")
        elif factor < MIN_LOCATION_FACTOR or factor > MAX_LOCATION_FACTOR:
            issues.append(f"Location factor {factor:.2f} is outside valid range ({MIN_LOCATION_FACTOR}-{MAX_LOCATION_FACTOR})")
            why_wrong.append("Extreme location factors indicate data error.")
            
            # Suggest correction based on state
            state = output.get("state", "")
            suggested = self._suggest_location_factor(state)
            how_to_fix.append(f"Adjust locationFactor to approximately {suggested:.2f} for {state or 'this region'}")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
    
    def _suggest_location_factor(self, state: str) -> float:
        """Suggest location factor based on state.
        
        Args:
            state: 2-letter state code.
            
        Returns:
            Suggested location factor.
        """
        high_cost = {"NY": 1.35, "CA": 1.25, "MA": 1.20, "CT": 1.18, "WA": 1.15, "NJ": 1.22}
        low_cost = {"MS": 0.88, "AR": 0.90, "AL": 0.91, "WV": 0.92, "OK": 0.92, "KY": 0.93}
        
        if state in high_cost:
            return high_cost[state]
        elif state in low_cost:
            return low_cost[state]
        else:
            return 1.0  # National average
    
    def _analyze_permit_costs(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze permit costs for issues.
        
        Args:
            output: Location agent output.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        permit_costs = output.get("permitCosts", {})
        
        if not permit_costs:
            issues.append("Permit costs section is missing")
            why_wrong.append("Permit costs are required for accurate total project cost.")
            how_to_fix.append("Add permitCosts object with building, electrical, plumbing, and mechanical permits")
            return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
        
        # Check required permits
        missing_permits = []
        for permit in REQUIRED_PERMIT_TYPES:
            if permit not in permit_costs:
                missing_permits.append(permit)
        
        if missing_permits:
            issues.append(f"Missing permit costs: {', '.join(missing_permits)}")
            why_wrong.append("Incomplete permit data leads to inaccurate cost estimates.")
            how_to_fix.append(f"Add costs for: {', '.join(missing_permits)}")
        
        # Check for zero or negative values
        for permit, cost in permit_costs.items():
            if isinstance(cost, (int, float)):
                if cost < 0:
                    issues.append(f"{permit} has negative cost: {cost}")
                    how_to_fix.append(f"Set {permit} to a positive value")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
    
    def _analyze_weather_factors(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze weather factors for issues.
        
        Args:
            output: Location agent output.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        weather = output.get("weatherFactors", {})
        
        if not weather:
            issues.append("Weather factors section is missing")
            how_to_fix.append("Add weatherFactors with winterImpact and seasonalAdjustment")
            return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
        
        # Check winter impact
        winter_impact = weather.get("winterImpact")
        valid_impacts = ["none", "minimal", "moderate", "severe"]
        if not winter_impact:
            issues.append("winterImpact is missing")
            how_to_fix.append("Set winterImpact to one of: none, minimal, moderate, severe")
        elif winter_impact not in valid_impacts:
            issues.append(f"winterImpact '{winter_impact}' is not valid")
            how_to_fix.append(f"Set winterImpact to one of: {', '.join(valid_impacts)}")
        
        # Check seasonal adjustment
        seasonal = weather.get("seasonalAdjustment")
        if seasonal is None:
            issues.append("seasonalAdjustment is missing")
            how_to_fix.append("Set seasonalAdjustment between 0.8 and 1.3")
        elif isinstance(seasonal, (int, float)) and (seasonal < 0.8 or seasonal > 1.3):
            issues.append(f"seasonalAdjustment {seasonal} is outside valid range (0.8-1.3)")
            how_to_fix.append("Adjust seasonalAdjustment to be within 0.8-1.3")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
    
    def _analyze_analysis_quality(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze LLM analysis quality for issues.
        
        Args:
            output: Location agent output.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        analysis = output.get("analysis", "")
        key_findings = output.get("keyFindings", [])
        recommendations = output.get("recommendations", [])
        
        if not analysis:
            issues.append("Analysis text is missing")
            how_to_fix.append("Generate substantive analysis of location factors")
        elif len(analysis.split()) < 20:
            issues.append("Analysis is too brief")
            how_to_fix.append("Expand analysis to at least 50 words explaining location factors")
        
        if not key_findings:
            issues.append("Key findings are missing")
            how_to_fix.append("Add at least 3 key findings about the location")
        elif len(key_findings) < 3:
            issues.append(f"Only {len(key_findings)} key findings (need at least 3)")
            how_to_fix.append("Add more key findings to reach minimum of 3")
        
        if not recommendations:
            issues.append("Recommendations are missing")
            how_to_fix.append("Add at least 2 recommendations based on location analysis")
        elif len(recommendations) < 2:
            issues.append(f"Only {len(recommendations)} recommendation(s) (need at least 2)")
            how_to_fix.append("Add more recommendations to reach minimum of 2")
        
        if issues:
            why_wrong.append("Incomplete analysis reduces value of location insights.")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
