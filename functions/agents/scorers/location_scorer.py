"""Location Scorer for TrueCost.

Objective scoring of Location Agent output to determine quality.
Score >= 80 means PASS, score < 80 triggers critic.
"""

from typing import Dict, Any, List, Optional
import structlog

from agents.scorers.base_scorer import BaseScorer
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


# =============================================================================
# SCORING CONSTANTS
# =============================================================================

# Required labor rate trades
REQUIRED_LABOR_TRADES = [
    "electrician",
    "plumber", 
    "carpenter",
    "hvac",
    "general_labor",
    "painter"
]

# Optional but valuable labor trades
OPTIONAL_LABOR_TRADES = [
    "tile_setter",
    "roofer",
    "concrete_finisher",
    "drywall_installer"
]

# Required permit types
REQUIRED_PERMIT_TYPES = [
    "buildingPermitBase",
    "electricalPermit",
    "plumbingPermit",
    "mechanicalPermit"
]

# Valid location factor range
MIN_LOCATION_FACTOR = 0.7
MAX_LOCATION_FACTOR = 1.6

# Valid labor rate range ($/hr)
MIN_LABOR_RATE = 20.0
MAX_LABOR_RATE = 150.0


# =============================================================================
# LOCATION SCORER CLASS
# =============================================================================


class LocationScorer(BaseScorer):
    """Scorer for Location Agent output.
    
    Evaluates location factor output for:
    - Completeness of labor rates
    - Valid location data
    - Reasonable cost factors
    - Presence of required fields
    - Quality of analysis
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize LocationScorer."""
        super().__init__(
            name="location_scorer",
            primary_agent_name="location",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_scoring_criteria(self) -> List[Dict[str, Any]]:
        """Get scoring criteria for location output.
        
        Returns:
            List of scoring criteria with weights.
        """
        return [
            {
                "name": "labor_rates_completeness",
                "description": "All required labor rates are present and valid",
                "weight": 3
            },
            {
                "name": "location_data_accuracy",
                "description": "Location data matches input and is complete",
                "weight": 2
            },
            {
                "name": "location_factor_validity",
                "description": "Location factor is within expected range",
                "weight": 2
            },
            {
                "name": "permit_costs_completeness",
                "description": "Permit costs are specified and reasonable",
                "weight": 2
            },
            {
                "name": "weather_factors_presence",
                "description": "Weather factors are present and reasonable",
                "weight": 1
            },
            {
                "name": "analysis_quality",
                "description": "LLM analysis is present and substantive",
                "weight": 2
            },
            {
                "name": "data_confidence",
                "description": "Data confidence score is reasonable",
                "weight": 1
            }
        ]
    
    async def evaluate_criterion(
        self,
        criterion: Dict[str, Any],
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate a single criterion.
        
        Args:
            criterion: The criterion to evaluate.
            output: Location agent output.
            input_data: Original input data.
            
        Returns:
            Dict with score (0-100) and feedback.
        """
        name = criterion.get("name")
        
        if name == "labor_rates_completeness":
            return self._check_labor_rates(output)
        elif name == "location_data_accuracy":
            return self._check_location_data(output, input_data)
        elif name == "location_factor_validity":
            return self._check_location_factor(output)
        elif name == "permit_costs_completeness":
            return self._check_permit_costs(output)
        elif name == "weather_factors_presence":
            return self._check_weather_factors(output)
        elif name == "analysis_quality":
            return self._check_analysis_quality(output)
        elif name == "data_confidence":
            return self._check_confidence(output)
        
        return {"score": 50, "feedback": "Unknown criterion"}
    
    def _check_labor_rates(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check labor rates completeness and validity.
        
        Args:
            output: Location agent output.
            
        Returns:
            Score and feedback.
        """
        labor_rates = output.get("laborRates", {})
        
        if not labor_rates:
            return {
                "score": 0,
                "feedback": "Labor rates missing entirely"
            }
        
        # Check required trades
        required_present = 0
        required_valid = 0
        issues = []
        
        for trade in REQUIRED_LABOR_TRADES:
            if trade in labor_rates:
                required_present += 1
                rate = labor_rates[trade]
                if isinstance(rate, (int, float)) and MIN_LABOR_RATE <= rate <= MAX_LABOR_RATE:
                    required_valid += 1
                else:
                    issues.append(f"{trade} rate ({rate}) out of range")
            else:
                issues.append(f"Missing {trade}")
        
        # Check optional trades (bonus points)
        optional_present = sum(1 for t in OPTIONAL_LABOR_TRADES if t in labor_rates)
        
        # Calculate score
        required_score = (required_valid / len(REQUIRED_LABOR_TRADES)) * 80
        optional_bonus = (optional_present / len(OPTIONAL_LABOR_TRADES)) * 20
        score = min(100, int(required_score + optional_bonus))
        
        if score >= 90:
            feedback = f"Excellent: All {required_present} required and {optional_present} optional trades present"
        elif score >= 70:
            feedback = f"Good: {required_valid}/{len(REQUIRED_LABOR_TRADES)} required trades valid"
        else:
            feedback = f"Issues: {'; '.join(issues[:3])}"
        
        return {"score": score, "feedback": feedback}
    
    def _check_location_data(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check location data accuracy and completeness.
        
        Args:
            output: Location agent output.
            input_data: Original input data.
            
        Returns:
            Score and feedback.
        """
        # Extract input location
        clarification = input_data.get("clarification_output", {})
        project_brief = clarification.get("projectBrief", {})
        input_location = project_brief.get("location", {})
        
        input_zip = input_location.get("zipCode", "")
        input_city = input_location.get("city", "")
        input_state = input_location.get("state", "")
        
        # Check output location
        output_zip = output.get("zipCode", "")
        output_city = output.get("city", "")
        output_state = output.get("state", "")
        output_region = output.get("region", "")
        
        score = 0
        issues = []
        
        # ZIP code match (most important)
        if output_zip and output_zip[:5] == input_zip[:5]:
            score += 40
        elif output_zip:
            score += 20
            issues.append("ZIP code mismatch")
        else:
            issues.append("Missing ZIP code")
        
        # City present
        if output_city and output_city != "Unknown":
            score += 20
            if input_city and input_city.lower() != output_city.lower():
                score -= 5  # Slight penalty for mismatch
        else:
            issues.append("Missing city")
        
        # State present and valid
        if output_state and len(output_state) == 2:
            score += 20
            if input_state and input_state.upper() != output_state.upper():
                score -= 10
                issues.append("State mismatch")
        else:
            issues.append("Invalid state")
        
        # Region present
        if output_region:
            score += 20
        else:
            issues.append("Missing region")
        
        if score >= 90:
            feedback = "Location data complete and accurate"
        elif score >= 70:
            feedback = f"Location data mostly complete: {', '.join(issues)}"
        else:
            feedback = f"Location data issues: {', '.join(issues)}"
        
        return {"score": score, "feedback": feedback}
    
    def _check_location_factor(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check location factor is reasonable.
        
        Args:
            output: Location agent output.
            
        Returns:
            Score and feedback.
        """
        factor = output.get("locationFactor")
        
        if factor is None:
            return {"score": 0, "feedback": "Location factor missing"}
        
        if not isinstance(factor, (int, float)):
            return {"score": 0, "feedback": f"Location factor invalid type: {type(factor)}"}
        
        if MIN_LOCATION_FACTOR <= factor <= MAX_LOCATION_FACTOR:
            # Excellent - in expected range
            if 0.85 <= factor <= 1.35:
                # Most common range
                return {
                    "score": 100,
                    "feedback": f"Location factor {factor:.2f} is in typical range"
                }
            else:
                # Edge of range but still valid
                return {
                    "score": 85,
                    "feedback": f"Location factor {factor:.2f} is at edge of typical range"
                }
        elif 0.5 <= factor <= 2.0:
            # Borderline - possible but unusual
            return {
                "score": 60,
                "feedback": f"Location factor {factor:.2f} is unusual - verify accuracy"
            }
        else:
            # Out of range - likely error
            return {
                "score": 20,
                "feedback": f"Location factor {factor:.2f} is outside valid range ({MIN_LOCATION_FACTOR}-{MAX_LOCATION_FACTOR})"
            }
    
    def _check_permit_costs(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check permit costs are present and reasonable.
        
        Args:
            output: Location agent output.
            
        Returns:
            Score and feedback.
        """
        permit_costs = output.get("permitCosts", {})
        
        if not permit_costs:
            return {"score": 0, "feedback": "Permit costs missing entirely"}
        
        # Check required permit types
        present_count = 0
        valid_count = 0
        issues = []
        
        for permit_type in REQUIRED_PERMIT_TYPES:
            if permit_type in permit_costs:
                present_count += 1
                cost = permit_costs[permit_type]
                # Permit costs should be positive and reasonable
                if isinstance(cost, (int, float)) and 0 <= cost <= 10000:
                    valid_count += 1
                else:
                    issues.append(f"{permit_type} cost invalid: {cost}")
            else:
                issues.append(f"Missing {permit_type}")
        
        # Calculate score
        score = int((valid_count / len(REQUIRED_PERMIT_TYPES)) * 100)
        
        # Bonus for additional permit data
        extra_fields = ["planReviewFee", "impactFees", "inspectionFees"]
        extras = sum(1 for f in extra_fields if f in permit_costs)
        score = min(100, score + extras * 5)
        
        if score >= 90:
            feedback = f"All {present_count} required permits + {extras} extra fields present"
        elif score >= 70:
            feedback = f"{valid_count}/{len(REQUIRED_PERMIT_TYPES)} required permits valid"
        else:
            feedback = f"Permit issues: {'; '.join(issues[:2])}"
        
        return {"score": score, "feedback": feedback}
    
    def _check_weather_factors(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check weather factors are present and reasonable.
        
        Args:
            output: Location agent output.
            
        Returns:
            Score and feedback.
        """
        weather = output.get("weatherFactors", {})
        
        if not weather:
            return {"score": 40, "feedback": "Weather factors missing"}
        
        score = 0
        
        # Winter impact
        winter_impact = weather.get("winterImpact")
        valid_impacts = ["none", "minimal", "moderate", "severe"]
        if winter_impact in valid_impacts:
            score += 40
        elif winter_impact:
            score += 20  # Has value but may be wrong format
        
        # Seasonal adjustment
        seasonal = weather.get("seasonalAdjustment")
        if isinstance(seasonal, (int, float)) and 0.8 <= seasonal <= 1.3:
            score += 40
        elif seasonal:
            score += 20
        
        # Bonus for frost line or other details
        if weather.get("frostLineDepthInches") is not None:
            score += 10
        if weather.get("seasonalReason"):
            score += 10
        
        score = min(100, score)
        
        if score >= 80:
            feedback = "Weather factors complete and reasonable"
        elif score >= 50:
            feedback = "Weather factors partially complete"
        else:
            feedback = "Weather factors incomplete or invalid"
        
        return {"score": score, "feedback": feedback}
    
    def _check_analysis_quality(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check quality of LLM analysis.
        
        Args:
            output: Location agent output.
            
        Returns:
            Score and feedback.
        """
        analysis = output.get("analysis", "")
        key_findings = output.get("keyFindings", [])
        recommendations = output.get("recommendations", [])
        risk_factors = output.get("riskFactors", [])
        
        score = 0
        
        # Analysis text (40 points)
        if analysis:
            word_count = len(analysis.split())
            if word_count >= 50:
                score += 40
            elif word_count >= 20:
                score += 25
            else:
                score += 10
        
        # Key findings (25 points)
        if key_findings and len(key_findings) >= 3:
            score += 25
        elif key_findings:
            score += 15
        
        # Recommendations (20 points)
        if recommendations and len(recommendations) >= 2:
            score += 20
        elif recommendations:
            score += 10
        
        # Risk factors (15 points)
        if risk_factors and len(risk_factors) >= 1:
            score += 15
        
        if score >= 80:
            feedback = f"Analysis comprehensive: {len(key_findings)} findings, {len(recommendations)} recommendations"
        elif score >= 50:
            feedback = "Analysis present but could be more detailed"
        else:
            feedback = "Analysis missing or minimal"
        
        return {"score": score, "feedback": feedback}
    
    def _check_confidence(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check data confidence score.
        
        Args:
            output: Location agent output.
            
        Returns:
            Score and feedback.
        """
        confidence = output.get("confidence")
        
        if confidence is None:
            return {"score": 50, "feedback": "Confidence score missing"}
        
        if not isinstance(confidence, (int, float)):
            return {"score": 30, "feedback": f"Invalid confidence type: {type(confidence)}"}
        
        if 0 <= confidence <= 1:
            if confidence >= 0.8:
                return {
                    "score": 100,
                    "feedback": f"High confidence: {confidence:.0%}"
                }
            elif confidence >= 0.6:
                return {
                    "score": 80,
                    "feedback": f"Moderate confidence: {confidence:.0%}"
                }
            else:
                return {
                    "score": 60,
                    "feedback": f"Low confidence: {confidence:.0%} - verification recommended"
                }
        else:
            return {
                "score": 40,
                "feedback": f"Confidence out of range: {confidence}"
            }
