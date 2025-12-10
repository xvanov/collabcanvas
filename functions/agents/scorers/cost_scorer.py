"""Cost Scorer stub for TrueCost."""

from typing import Dict, Any, List, Optional

from agents.scorers.base_scorer import BaseScorer
from services.firestore_service import FirestoreService
from services.llm_service import LLMService


class CostScorer(BaseScorer):
    """Scorer for Cost Agent output."""
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        super().__init__(
            name="cost_scorer",
            primary_agent_name="cost",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_scoring_criteria(self) -> List[Dict[str, Any]]:
        return [
            {"name": "totals_valid", "description": "Totals are calculated correctly", "weight": 3},
            {"name": "adjustments_applied", "description": "Location and overhead applied", "weight": 2},
            {"name": "confidence_present", "description": "Confidence score present", "weight": 1}
        ]
    
    async def evaluate_criterion(
        self,
        criterion: Dict[str, Any],
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        name = criterion.get("name")
        
        if name == "totals_valid":
            total = output.get("total", 0)
            return {"score": 100 if total > 0 else 20, "feedback": f"Total: ${total:,.2f}"}
        elif name == "adjustments_applied":
            adj = output.get("adjustments", {})
            has_factor = "locationFactor" in adj
            has_overhead = "overhead" in adj
            score = 100 if has_factor and has_overhead else 60
            return {"score": score, "feedback": "Adjustments check"}
        elif name == "confidence_present":
            conf = output.get("confidence")
            return {"score": 100 if conf else 50, "feedback": f"Confidence: {conf}"}
        
        return {"score": 85, "feedback": "Default pass"}

