"""Scope Critic stub for TrueCost."""

from typing import Dict, Any, Optional

from agents.critics.base_critic import BaseCritic
from services.firestore_service import FirestoreService
from services.llm_service import LLMService


class ScopeCritic(BaseCritic):
    """Critic for Scope Agent output."""
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        super().__init__(
            name="scope_critic",
            primary_agent_name="scope",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_critique_prompt(self) -> str:
        return self.get_base_critique_prompt() + """
Focus on:
- Cost code assignment accuracy
- Quantity completeness
- Division coverage for project type
- Unit consistency
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
        
        completeness = output.get("completeness", {})
        
        if not completeness.get("allItemsHaveCostCodes"):
            issues.append("Some items missing cost codes")
            how_to_fix.append("Assign cost codes to all line items")
        
        if not completeness.get("allItemsHaveQuantities"):
            issues.append("Some items missing quantities")
            how_to_fix.append("Ensure all items have valid quantities")
        
        total_items = output.get("totalLineItems", 0)
        if total_items == 0:
            issues.append("No line items in Bill of Quantities")
            how_to_fix.append("Extract line items from CSI scope")
        
        return {
            "issues": issues if issues else ["Scope data quality below threshold"],
            "why_wrong": "Bill of Quantities incomplete for accurate costing",
            "how_to_fix": how_to_fix if how_to_fix else ["Review and complete BoQ"]
        }

