"""Location Critic stub for TrueCost."""

from typing import Dict, Any, Optional

from agents.critics.base_critic import BaseCritic
from services.firestore_service import FirestoreService
from services.llm_service import LLMService


class LocationCritic(BaseCritic):
    """Critic for Location Agent output."""
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        super().__init__(
            name="location_critic",
            primary_agent_name="location",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_critique_prompt(self) -> str:
        return self.get_base_critique_prompt() + """
Focus on:
- Completeness of labor rates for all required trades
- Accuracy of location factor for the region
- Permit cost reasonableness
- Weather factor applicability
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
        
        labor_rates = output.get("laborRates", {})
        required_trades = ["electrician", "plumber", "carpenter", "general_labor"]
        
        missing_trades = [t for t in required_trades if t not in labor_rates]
        if missing_trades:
            issues.append(f"Missing labor rates for: {', '.join(missing_trades)}")
            how_to_fix.append(f"Add labor rates for: {', '.join(missing_trades)}")
        
        if not output.get("permitCosts"):
            issues.append("Permit costs not specified")
            how_to_fix.append("Add permit costs for building, electrical, plumbing")
        
        factor = output.get("locationFactor", 1.0)
        if not (0.8 <= factor <= 1.5):
            issues.append(f"Location factor {factor} outside typical range (0.8-1.5)")
            how_to_fix.append("Verify location factor against regional data")
        
        return {
            "issues": issues if issues else ["Output quality below threshold"],
            "why_wrong": "Location data incomplete or inaccurate for cost estimation",
            "how_to_fix": how_to_fix if how_to_fix else ["Review and complete all location fields"]
        }

