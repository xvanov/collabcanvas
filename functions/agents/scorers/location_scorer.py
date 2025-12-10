"""Location Scorer stub for TrueCost.

Stub implementation for pipeline testing.
"""

from typing import Dict, Any, List, Optional
import structlog

from agents.scorers.base_scorer import BaseScorer
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class LocationScorer(BaseScorer):
    """Scorer for Location Agent output.
    
    Evaluates location factor output for:
    - Completeness of labor rates
    - Valid location data
    - Reasonable cost factors
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
        """Get scoring criteria for location output."""
        return [
            {
                "name": "labor_rates_completeness",
                "description": "All required labor rates are present",
                "weight": 2
            },
            {
                "name": "location_data_valid",
                "description": "Location data matches input",
                "weight": 2
            },
            {
                "name": "location_factor_reasonable",
                "description": "Location factor is within expected range",
                "weight": 1
            },
            {
                "name": "permit_costs_present",
                "description": "Permit costs are specified",
                "weight": 1
            }
        ]
    
    async def evaluate_criterion(
        self,
        criterion: Dict[str, Any],
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate a single criterion."""
        name = criterion.get("name")
        
        if name == "labor_rates_completeness":
            return self._check_labor_rates(output)
        elif name == "location_data_valid":
            return self._check_location_data(output, input_data)
        elif name == "location_factor_reasonable":
            return self._check_location_factor(output)
        elif name == "permit_costs_present":
            return self._check_permit_costs(output)
        
        return {"score": 80, "feedback": "Default pass"}
    
    def _check_labor_rates(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check labor rates completeness."""
        labor_rates = output.get("laborRates", {})
        required = ["electrician", "plumber", "carpenter", "general_labor"]
        
        present = sum(1 for r in required if r in labor_rates)
        score = int((present / len(required)) * 100)
        
        return {
            "score": score,
            "feedback": f"{present}/{len(required)} required labor rates present"
        }
    
    def _check_location_data(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check location data validity."""
        has_zip = bool(output.get("zipCode"))
        has_city = bool(output.get("city"))
        has_state = bool(output.get("state"))
        
        score = 100 if all([has_zip, has_city, has_state]) else 60
        
        return {
            "score": score,
            "feedback": "Location data complete" if score == 100 else "Missing location fields"
        }
    
    def _check_location_factor(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check location factor is reasonable."""
        factor = output.get("locationFactor", 1.0)
        
        if 0.8 <= factor <= 1.5:
            return {"score": 100, "feedback": f"Location factor {factor} is reasonable"}
        elif 0.5 <= factor <= 2.0:
            return {"score": 70, "feedback": f"Location factor {factor} is borderline"}
        else:
            return {"score": 30, "feedback": f"Location factor {factor} is out of range"}
    
    def _check_permit_costs(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check permit costs are present."""
        permit_costs = output.get("permitCosts", {})
        
        if permit_costs and len(permit_costs) >= 2:
            return {"score": 100, "feedback": "Permit costs specified"}
        elif permit_costs:
            return {"score": 70, "feedback": "Partial permit costs"}
        return {"score": 40, "feedback": "Missing permit costs"}

