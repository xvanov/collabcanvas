"""Risk Critic stub for TrueCost."""

from typing import Dict, Any, Optional

from agents.critics.base_critic import BaseCritic
from services.firestore_service import FirestoreService
from services.llm_service import LLMService


class RiskCritic(BaseCritic):
    """Critic for Risk Agent output."""
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        super().__init__(
            name="risk_critic",
            primary_agent_name="risk",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_critique_prompt(self) -> str:
        return self.get_base_critique_prompt() + """
Focus on:
- Statistical validity of Monte Carlo results
- Percentile ordering (P50 < P80 < P90)
- Contingency reasonableness (5-25% typical)
- Risk factor coverage
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
        
        mc = output.get("monteCarlo", {})
        p50, p80, p90 = mc.get("p50", 0), mc.get("p80", 0), mc.get("p90", 0)
        
        if not (p50 < p80 < p90):
            issues.append(f"Invalid percentile ordering: P50={p50}, P80={p80}, P90={p90}")
            how_to_fix.append("Ensure P50 < P80 < P90 from Monte Carlo simulation")
        
        contingency = output.get("contingency", {}).get("recommended", 0)
        if contingency < 5:
            issues.append(f"Contingency {contingency}% too low")
            how_to_fix.append("Recommend at least 5% contingency")
        elif contingency > 30:
            issues.append(f"Contingency {contingency}% unusually high")
            how_to_fix.append("Review risk factors for excessive contingency")
        
        risks = output.get("topRisks", [])
        if len(risks) < 3:
            issues.append(f"Only {len(risks)} risks identified")
            how_to_fix.append("Identify at least 3-5 top risk factors")
        
        return {
            "issues": issues if issues else ["Risk analysis quality below threshold"],
            "why_wrong": "Risk analysis incomplete or statistically invalid",
            "how_to_fix": how_to_fix if how_to_fix else ["Review Monte Carlo and risk factors"]
        }

