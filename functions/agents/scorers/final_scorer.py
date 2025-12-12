"""Final Scorer for TrueCost.

Evaluates Final Agent output for completeness and quality.
"""

from typing import Any, Dict, List, Optional
import structlog

from agents.scorers.base_scorer import BaseScorer
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class FinalScorer(BaseScorer):
    """Scorer for Final Agent output.
    
    Evaluates:
    1. Executive summary completeness
    2. Cost breakdown present
    3. Timeline summary present
    4. Risk summary present
    5. Recommendations provided
    6. All required sections present
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize FinalScorer."""
        super().__init__(
            name="final_scorer",
            primary_agent_name="final",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_scoring_criteria(self) -> List[Dict[str, Any]]:
        """Get scoring criteria for final output.
        
        Returns:
            List of criteria with names, descriptions, and weights.
        """
        return [
            {
                "name": "executive_summary_complete",
                "description": "Executive summary has all required fields",
                "weight": 3
            },
            {
                "name": "cost_breakdown_valid",
                "description": "Cost breakdown is complete and consistent",
                "weight": 3
            },
            {
                "name": "timeline_included",
                "description": "Timeline summary is included",
                "weight": 2
            },
            {
                "name": "risk_included",
                "description": "Risk summary is included",
                "weight": 2
            },
            {
                "name": "recommendations_present",
                "description": "Actionable recommendations provided",
                "weight": 2
            },
            {
                "name": "disclaimers_present",
                "description": "Professional disclaimers included",
                "weight": 1
            }
        ]
    
    async def evaluate_criterion(
        self,
        criterion: Dict[str, Any],
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate a single criterion.
        
        Args:
            criterion: The criterion to evaluate.
            output: Final Agent output.
            input_data: Original input data.
            
        Returns:
            Dict with score and feedback.
        """
        name = criterion.get("name")
        
        if name == "executive_summary_complete":
            return self._check_executive_summary(output)
        elif name == "cost_breakdown_valid":
            return self._check_cost_breakdown(output, input_data)
        elif name == "timeline_included":
            return self._check_timeline_included(output)
        elif name == "risk_included":
            return self._check_risk_included(output)
        elif name == "recommendations_present":
            return self._check_recommendations(output)
        elif name == "disclaimers_present":
            return self._check_disclaimers(output)
        
        return {"score": 85, "feedback": "Unknown criterion"}
    
    def _check_executive_summary(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check executive summary completeness.
        
        Args:
            output: Final Agent output.
            
        Returns:
            Score and feedback.
        """
        exec_summary = output.get("executiveSummary", {})
        
        if not exec_summary:
            return {
                "score": 20,
                "feedback": "Missing executive summary"
            }
        
        # Required fields
        required = ["totalCost", "location", "projectType", "duration"]
        missing = [f for f in required if not exec_summary.get(f)]
        
        if missing:
            return {
                "score": 60,
                "feedback": f"Executive summary missing: {', '.join(missing)}"
            }
        
        # Check confidence range
        confidence_range = exec_summary.get("confidenceRange", {})
        if not confidence_range.get("p50") or not confidence_range.get("p90"):
            return {
                "score": 75,
                "feedback": "Executive summary missing confidence range"
            }
        
        # Check values are reasonable
        total_cost = exec_summary.get("totalCost", 0)
        if total_cost <= 0:
            return {
                "score": 50,
                "feedback": "Executive summary has invalid total cost"
            }
        
        return {
            "score": 100,
            "feedback": f"Complete executive summary: ${total_cost:,.0f}"
        }
    
    def _check_cost_breakdown(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check cost breakdown validity.
        
        Args:
            output: Final Agent output.
            input_data: Input data with cost output.
            
        Returns:
            Score and feedback.
        """
        cost_breakdown = output.get("costBreakdown", {})
        
        if not cost_breakdown:
            return {
                "score": 20,
                "feedback": "Missing cost breakdown"
            }
        
        # Check required categories
        required = ["materials", "labor", "totalWithContingency"]
        missing = [f for f in required if cost_breakdown.get(f) is None]
        
        if missing:
            return {
                "score": 60,
                "feedback": f"Cost breakdown missing: {', '.join(missing)}"
            }
        
        # Check math
        materials = cost_breakdown.get("materials", 0)
        labor = cost_breakdown.get("labor", 0)
        equipment = cost_breakdown.get("equipment", 0)
        direct_subtotal = cost_breakdown.get("directCostsSubtotal", 0)
        
        calculated_direct = materials + labor + equipment
        
        if direct_subtotal > 0 and abs(calculated_direct - direct_subtotal) > 100:
            return {
                "score": 70,
                "feedback": "Cost breakdown subtotal doesn't match components"
            }
        
        # Check total includes contingency
        total_before = cost_breakdown.get("totalBeforeContingency", 0)
        contingency = cost_breakdown.get("contingency", 0)
        total_with = cost_breakdown.get("totalWithContingency", 0)
        
        if total_before > 0 and contingency > 0:
            expected_total = total_before + contingency
            if abs(expected_total - total_with) > 100:
                return {
                    "score": 75,
                    "feedback": "Total with contingency doesn't match components"
                }
        
        return {
            "score": 100,
            "feedback": "Valid cost breakdown with contingency"
        }
    
    def _check_timeline_included(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check timeline summary inclusion.
        
        Args:
            output: Final Agent output.
            
        Returns:
            Score and feedback.
        """
        timeline = output.get("timeline", {})
        
        if not timeline:
            return {
                "score": 40,
                "feedback": "Missing timeline summary"
            }
        
        # Check key fields
        total_days = timeline.get("totalDays", 0)
        start_date = timeline.get("startDate")
        end_date = timeline.get("endDate")
        
        if total_days <= 0:
            return {
                "score": 50,
                "feedback": "Timeline missing duration"
            }
        
        if not start_date or not end_date:
            return {
                "score": 70,
                "feedback": "Timeline missing start/end dates"
            }
        
        # Check milestones
        milestones = timeline.get("milestones", [])
        if not milestones:
            return {
                "score": 80,
                "feedback": f"Timeline has {total_days} days but no milestones"
            }
        
        return {
            "score": 100,
            "feedback": f"Timeline: {total_days} days with {len(milestones)} milestones"
        }
    
    def _check_risk_included(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check risk summary inclusion.
        
        Args:
            output: Final Agent output.
            
        Returns:
            Score and feedback.
        """
        risk_summary = output.get("riskSummary", {})
        
        if not risk_summary:
            return {
                "score": 40,
                "feedback": "Missing risk summary"
            }
        
        # Check risk level
        risk_level = risk_summary.get("riskLevel")
        if not risk_level:
            return {
                "score": 60,
                "feedback": "Risk summary missing risk level"
            }
        
        # Check top risks
        top_risks = risk_summary.get("topRisks", [])
        if not top_risks:
            return {
                "score": 70,
                "feedback": "Risk summary missing top risks"
            }
        
        # Check contingency rationale
        rationale = risk_summary.get("contingencyRationale", "")
        if not rationale:
            return {
                "score": 80,
                "feedback": "Risk summary missing contingency rationale"
            }
        
        return {
            "score": 100,
            "feedback": f"Risk summary: {risk_level} level, {len(top_risks)} risks"
        }
    
    def _check_recommendations(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check recommendations presence.
        
        Args:
            output: Final Agent output.
            
        Returns:
            Score and feedback.
        """
        recommendations = output.get("recommendations", [])
        
        if not recommendations:
            return {
                "score": 50,
                "feedback": "No recommendations provided"
            }
        
        if len(recommendations) < 2:
            return {
                "score": 70,
                "feedback": "Only 1 recommendation - need more"
            }
        
        # Check recommendation quality
        good_recs = 0
        for rec in recommendations:
            if isinstance(rec, dict):
                if rec.get("title") and rec.get("description"):
                    good_recs += 1
        
        if good_recs < len(recommendations) * 0.5:
            return {
                "score": 75,
                "feedback": "Some recommendations lack detail"
            }
        
        return {
            "score": 100,
            "feedback": f"{len(recommendations)} actionable recommendations"
        }
    
    def _check_disclaimers(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check disclaimers presence.
        
        Args:
            output: Final Agent output.
            
        Returns:
            Score and feedback.
        """
        disclaimers = output.get("disclaimers", [])
        assumptions = output.get("assumptions", [])
        exclusions = output.get("exclusions", [])
        
        # At least some professional caveats needed
        total_caveats = len(disclaimers) + len(assumptions) + len(exclusions)
        
        if total_caveats == 0:
            return {
                "score": 50,
                "feedback": "No disclaimers, assumptions, or exclusions"
            }
        
        if not disclaimers:
            return {
                "score": 70,
                "feedback": "Missing professional disclaimers"
            }
        
        if not assumptions:
            return {
                "score": 80,
                "feedback": "Missing key assumptions"
            }
        
        return {
            "score": 100,
            "feedback": f"Proper caveats: {len(disclaimers)} disclaimers, {len(assumptions)} assumptions"
        }
