"""Cost Critic stub for TrueCost."""

from typing import Dict, Any, Optional

from agents.critics.base_critic import BaseCritic
from services.firestore_service import FirestoreService
from services.llm_service import LLMService


class CostCritic(BaseCritic):
    """Critic for Cost Agent output."""
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        super().__init__(
            name="cost_critic",
            primary_agent_name="cost",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_critique_prompt(self) -> str:
        return self.get_base_critique_prompt() + """
Focus on:
- Mathematical accuracy of calculations
- Location factor application
- Overhead and profit percentages
- Cost reasonableness for project type
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
        
        total = output.get("total", 0)
        if total <= 0:
            issues.append("Total cost is zero or negative")
            how_to_fix.append("Recalculate costs from line items")
        
        adjustments = output.get("adjustments", {})
        if "locationFactor" not in adjustments:
            issues.append("Location factor not applied")
            how_to_fix.append("Apply location factor from location output")
        
        if "overhead" not in adjustments:
            issues.append("Overhead not included")
            how_to_fix.append("Add overhead percentage (typically 10%)")
        
        subtotals = output.get("subtotals", {})
        if subtotals.get("materials", 0) == 0:
            issues.append("Material costs are zero")
            how_to_fix.append("Calculate material costs from BoQ quantities")
        
        return {
            "issues": issues if issues else ["Cost calculation quality below threshold"],
            "why_wrong": "Cost estimate incomplete or inaccurate",
            "how_to_fix": how_to_fix if how_to_fix else ["Review cost calculations"]
        }

