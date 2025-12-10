"""Final Critic stub for TrueCost."""

from typing import Dict, Any, Optional

from agents.critics.base_critic import BaseCritic
from services.firestore_service import FirestoreService
from services.llm_service import LLMService


class FinalCritic(BaseCritic):
    """Critic for Final Agent output."""
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        super().__init__(
            name="final_critic",
            primary_agent_name="final",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_critique_prompt(self) -> str:
        return self.get_base_critique_prompt() + """
Focus on:
- Executive summary completeness
- Consistency with previous agent outputs
- Cost breakdown accuracy
- Recommendation quality
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
        
        summary = output.get("executiveSummary", {})
        required_fields = ["totalCost", "duration", "confidenceRange"]
        missing = [f for f in required_fields if f not in summary]
        
        if missing:
            issues.append(f"Executive summary missing: {', '.join(missing)}")
            how_to_fix.append(f"Add {', '.join(missing)} to executive summary")
        
        breakdown = output.get("costBreakdown", {})
        if len(breakdown) < 3:
            issues.append("Cost breakdown incomplete")
            how_to_fix.append("Include materials, labor, equipment, overhead in breakdown")
        
        recommendations = output.get("recommendations", [])
        if len(recommendations) < 2:
            issues.append(f"Only {len(recommendations)} recommendations")
            how_to_fix.append("Provide at least 3-4 actionable recommendations")
        
        return {
            "issues": issues if issues else ["Final estimate quality below threshold"],
            "why_wrong": "Final estimate incomplete or inconsistent",
            "how_to_fix": how_to_fix if how_to_fix else ["Review final synthesis"]
        }

