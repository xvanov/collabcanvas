"""Scope Scorer stub for TrueCost."""

from typing import Dict, Any, List, Optional

from agents.scorers.base_scorer import BaseScorer
from services.firestore_service import FirestoreService
from services.llm_service import LLMService


class ScopeScorer(BaseScorer):
    """Scorer for Scope Agent output."""
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        super().__init__(
            name="scope_scorer",
            primary_agent_name="scope",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_scoring_criteria(self) -> List[Dict[str, Any]]:
        return [
            {"name": "cost_codes_assigned", "description": "All items have cost codes", "weight": 2},
            {"name": "quantities_valid", "description": "Quantities are present and valid", "weight": 2},
            {"name": "divisions_complete", "description": "Required divisions are present", "weight": 1}
        ]
    
    async def evaluate_criterion(
        self,
        criterion: Dict[str, Any],
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        name = criterion.get("name")
        
        if name == "cost_codes_assigned":
            completeness = output.get("completeness", {})
            has_codes = completeness.get("allItemsHaveCostCodes", False)
            return {"score": 100 if has_codes else 50, "feedback": "Cost codes check"}
        elif name == "quantities_valid":
            completeness = output.get("completeness", {})
            has_qty = completeness.get("allItemsHaveQuantities", False)
            return {"score": 100 if has_qty else 50, "feedback": "Quantities check"}
        elif name == "divisions_complete":
            total = output.get("totalDivisions", 0)
            return {"score": 100 if total > 0 else 40, "feedback": f"{total} divisions"}
        
        return {"score": 85, "feedback": "Default pass"}

