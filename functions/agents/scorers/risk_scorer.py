"""Risk Scorer stub for TrueCost."""

from typing import Dict, Any, List, Optional

from agents.scorers.base_scorer import BaseScorer
from services.firestore_service import FirestoreService
from services.llm_service import LLMService


class RiskScorer(BaseScorer):
    """Scorer for Risk Agent output."""
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        super().__init__(
            name="risk_scorer",
            primary_agent_name="risk",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_scoring_criteria(self) -> List[Dict[str, Any]]:
        return [
            {"name": "percentiles_valid", "description": "P50 < P80 < P90", "weight": 3},
            {"name": "contingency_reasonable", "description": "Contingency in range", "weight": 2},
            {"name": "risks_identified", "description": "Top risks listed", "weight": 1}
        ]
    
    async def evaluate_criterion(
        self,
        criterion: Dict[str, Any],
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        name = criterion.get("name")
        
        if name == "percentiles_valid":
            mc = output.get("monteCarlo", {})
            p50, p80, p90 = mc.get("p50", 0), mc.get("p80", 0), mc.get("p90", 0)
            valid = p50 < p80 < p90 if all([p50, p80, p90]) else False
            return {"score": 100 if valid else 30, "feedback": f"P50={p50}, P80={p80}, P90={p90}"}
        elif name == "contingency_reasonable":
            cont = output.get("contingency", {}).get("recommended", 0)
            reasonable = 5 <= cont <= 30
            return {"score": 100 if reasonable else 50, "feedback": f"Contingency: {cont}%"}
        elif name == "risks_identified":
            risks = output.get("topRisks", [])
            score = min(100, len(risks) * 20)
            return {"score": score, "feedback": f"{len(risks)} risks identified"}
        
        return {"score": 85, "feedback": "Default pass"}

