"""Final Agent stub for TrueCost.

Stub implementation for pipeline testing.
Real implementation will be added in PR #7.
"""

from typing import Dict, Any, Optional
import structlog

from agents.base_agent import BaseA2AAgent
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class FinalAgent(BaseA2AAgent):
    """Final Agent - synthesizes final estimate with executive summary.
    
    This is a stub implementation for pipeline testing.
    Real implementation in PR #7 will:
    - Aggregate all previous agent outputs
    - Generate executive summary
    - Create professional report format
    - Generate recommendations
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize FinalAgent."""
        super().__init__(
            name="final",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    async def run(
        self,
        estimate_id: str,
        input_data: Dict[str, Any],
        feedback: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run final synthesis.
        
        Args:
            estimate_id: The estimate document ID.
            input_data: Input containing all previous agent outputs.
            feedback: Optional critic feedback for retry.
            
        Returns:
            Final estimate with executive summary.
        """
        logger.info(
            "final_agent_running",
            estimate_id=estimate_id,
            has_feedback=feedback is not None
        )
        
        # Get all previous outputs
        clarification = input_data.get("clarification_output", {})
        location_output = input_data.get("location_output", {})
        scope_output = input_data.get("scope_output", {})
        cost_output = input_data.get("cost_output", {})
        risk_output = input_data.get("risk_output", {})
        timeline_output = input_data.get("timeline_output", {})
        
        # Extract key values
        project_brief = clarification.get("projectBrief", {})
        location = project_brief.get("location", {})
        
        total_cost = cost_output.get("total", 0)
        contingency = risk_output.get("contingency", {})
        contingency_percent = contingency.get("recommended", 10)
        contingency_amount = total_cost * (contingency_percent / 100)
        
        p50 = risk_output.get("monteCarlo", {}).get("p50", total_cost)
        p80 = risk_output.get("monteCarlo", {}).get("p80", total_cost * 1.1)
        p90 = risk_output.get("monteCarlo", {}).get("p90", total_cost * 1.2)
        
        total_duration = timeline_output.get("totalDuration", 30)
        
        output = {
            "executiveSummary": {
                "projectType": project_brief.get("projectType", "renovation"),
                "location": f"{location.get('city', 'Unknown')}, {location.get('state', 'XX')}",
                "totalCost": round(total_cost + contingency_amount, 2),
                "baseCost": round(total_cost, 2),
                "contingency": round(contingency_amount, 2),
                "contingencyPercent": contingency_percent,
                "duration": total_duration,
                "confidenceRange": {
                    "p50": round(p50, 2),
                    "p80": round(p80, 2),
                    "p90": round(p90, 2)
                }
            },
            "costBreakdown": {
                "materials": cost_output.get("subtotals", {}).get("materials", 0),
                "labor": cost_output.get("subtotals", {}).get("labor", 0),
                "equipment": cost_output.get("subtotals", {}).get("equipment", 0),
                "overhead": cost_output.get("adjustments", {}).get("overhead", 0),
                "profit": cost_output.get("adjustments", {}).get("profit", 0),
                "contingency": round(contingency_amount, 2)
            },
            "timeline": {
                "totalDays": total_duration,
                "startDate": timeline_output.get("startDate"),
                "endDate": timeline_output.get("endDate"),
                "milestones": timeline_output.get("milestones", [])
            },
            "riskSummary": {
                "topRisks": [r["item"] for r in risk_output.get("topRisks", [])[:3]],
                "contingencyRationale": contingency.get("rationale", "")
            },
            "recommendations": [
                "Consider locking in material prices with early procurement",
                "Schedule work during optimal weather windows",
                "Maintain 10-15% contingency buffer for unforeseen issues",
                "Get multiple bids for major subcontracts"
            ],
            "disclaimer": "This estimate is based on available information and industry data. "
                         "Actual costs may vary based on final specifications and market conditions.",
            "summary": f"Final estimate: ${total_cost + contingency_amount:,.0f} over {total_duration} days"
        }
        
        # Save output to Firestore
        await self.firestore.save_agent_output(
            estimate_id=estimate_id,
            agent_name=self.name,
            output=output,
            summary=output["summary"],
            confidence=0.85,
            tokens_used=self._tokens_used,
            duration_ms=self.duration_ms
        )
        
        return output

