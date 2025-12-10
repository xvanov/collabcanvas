"""Timeline Scorer stub for TrueCost."""

from typing import Dict, Any, List, Optional

from agents.scorers.base_scorer import BaseScorer
from services.firestore_service import FirestoreService
from services.llm_service import LLMService


class TimelineScorer(BaseScorer):
    """Scorer for Timeline Agent output."""
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        super().__init__(
            name="timeline_scorer",
            primary_agent_name="timeline",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_scoring_criteria(self) -> List[Dict[str, Any]]:
        return [
            {"name": "tasks_present", "description": "Tasks are defined", "weight": 2},
            {"name": "dependencies_valid", "description": "Dependencies are logical", "weight": 2},
            {"name": "dates_consistent", "description": "Start/end dates make sense", "weight": 2}
        ]
    
    async def evaluate_criterion(
        self,
        criterion: Dict[str, Any],
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        name = criterion.get("name")
        
        if name == "tasks_present":
            tasks = output.get("tasks", [])
            score = min(100, len(tasks) * 15)
            return {"score": score, "feedback": f"{len(tasks)} tasks defined"}
        elif name == "dependencies_valid":
            tasks = output.get("tasks", [])
            has_deps = any(t.get("dependencies") for t in tasks)
            return {"score": 100 if has_deps else 50, "feedback": "Dependencies check"}
        elif name == "dates_consistent":
            has_dates = output.get("startDate") and output.get("endDate")
            return {"score": 100 if has_dates else 40, "feedback": "Dates check"}
        
        return {"score": 85, "feedback": "Default pass"}

