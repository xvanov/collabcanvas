"""Timeline Critic stub for TrueCost."""

from typing import Dict, Any, Optional

from agents.critics.base_critic import BaseCritic
from services.firestore_service import FirestoreService
from services.llm_service import LLMService


class TimelineCritic(BaseCritic):
    """Critic for Timeline Agent output."""
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        super().__init__(
            name="timeline_critic",
            primary_agent_name="timeline",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_critique_prompt(self) -> str:
        return self.get_base_critique_prompt() + """
Focus on:
- Task completeness for project scope
- Dependency logic validity
- Duration reasonableness
- Critical path identification
"""
    
    async def analyze_output(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any],
        score: int,
        scorer_feedback: str
    ) -> Dict[str, Any]:
        issues = []
        how_to_fix = []
        
        tasks = output.get("tasks", [])
        if len(tasks) < 3:
            issues.append(f"Only {len(tasks)} tasks defined")
            how_to_fix.append("Add tasks for all major work phases")
        
        has_dependencies = any(t.get("dependencies") for t in tasks)
        if not has_dependencies:
            issues.append("No task dependencies defined")
            how_to_fix.append("Add dependencies between sequential tasks")
        
        if not output.get("criticalPath"):
            issues.append("Critical path not identified")
            how_to_fix.append("Calculate and specify critical path")
        
        total_duration = output.get("totalDuration", 0)
        if total_duration == 0:
            issues.append("Total duration is zero")
            how_to_fix.append("Calculate duration from task list")
        
        return {
            "issues": issues if issues else ["Timeline quality below threshold"],
            "why_wrong": "Project timeline incomplete or unrealistic",
            "how_to_fix": how_to_fix if how_to_fix else ["Review timeline tasks and dependencies"]
        }

