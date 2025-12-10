"""Final Scorer stub for TrueCost."""

from typing import Dict, Any, List, Optional

from agents.scorers.base_scorer import BaseScorer
from services.firestore_service import FirestoreService
from services.llm_service import LLMService


class FinalScorer(BaseScorer):
    """Scorer for Final Agent output."""
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        super().__init__(
            name="final_scorer",
            primary_agent_name="final",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_scoring_criteria(self) -> List[Dict[str, Any]]:
        return [
            {"name": "executive_summary_complete", "description": "Summary has all fields", "weight": 3},
            {"name": "cost_breakdown_present", "description": "Cost breakdown included", "weight": 2},
            {"name": "recommendations_provided", "description": "Recommendations listed", "weight": 1}
        ]
    
    async def evaluate_criterion(
        self,
        criterion: Dict[str, Any],
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        name = criterion.get("name")
        
        if name == "executive_summary_complete":
            summary = output.get("executiveSummary", {})
            fields = ["totalCost", "duration", "confidenceRange"]
            present = sum(1 for f in fields if f in summary)
            score = int((present / len(fields)) * 100)
            return {"score": score, "feedback": f"{present}/{len(fields)} summary fields"}
        elif name == "cost_breakdown_present":
            breakdown = output.get("costBreakdown", {})
            has_breakdown = len(breakdown) >= 3
            return {"score": 100 if has_breakdown else 50, "feedback": "Breakdown check"}
        elif name == "recommendations_provided":
            recs = output.get("recommendations", [])
            score = min(100, len(recs) * 25)
            return {"score": score, "feedback": f"{len(recs)} recommendations"}
        
        return {"score": 85, "feedback": "Default pass"}

