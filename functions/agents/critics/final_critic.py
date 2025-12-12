"""Final Critic for TrueCost.

Provides actionable feedback for Final Agent output improvement.
"""

from typing import Any, Dict, List, Optional
import structlog

from agents.critics.base_critic import BaseCritic
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class FinalCritic(BaseCritic):
    """Critic for Final Agent output.
    
    Analyzes final estimate output and provides specific feedback
    for improving report completeness and professionalism.
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize FinalCritic."""
        super().__init__(
            name="final_critic",
            primary_agent_name="final",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_critique_prompt(self) -> str:
        """Get domain-specific critique prompt.
        
        Returns:
            Prompt string for LLM critique.
        """
        return """You are a senior construction estimator reviewing a final estimate report.

Critique Focus:
1. Is the executive summary clear and complete?
2. Does the cost breakdown reconcile correctly?
3. Is the timeline realistic for the scope?
4. Are risks properly summarized and addressed?
5. Are recommendations actionable?
6. Are professional disclaimers appropriate?

For each issue found, explain:
- What specifically is wrong or missing
- Why it matters for the client and contractor
- How to fix it to improve the estimate quality

Focus on:
- Clarity for non-technical readers
- Consistency between sections
- Professional presentation standards
- Completeness of information
- Appropriate caveats and disclaimers"""
    
    async def analyze_output(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any],
        score: int,
        scorer_feedback: str
    ) -> Dict[str, Any]:
        """Analyze final output and provide feedback.
        
        Args:
            output: Final Agent output to critique.
            input_data: Original input data.
            score: Score from scorer.
            scorer_feedback: Feedback from scorer.
            
        Returns:
            Dict with issues, why_wrong, and how_to_fix.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        # Analyze executive summary
        exec_issues = self._analyze_executive_summary(output, input_data)
        if exec_issues:
            issues.extend(exec_issues["issues"])
            why_wrong.extend(exec_issues["why_wrong"])
            how_to_fix.extend(exec_issues["how_to_fix"])
        
        # Analyze cost breakdown
        cost_issues = self._analyze_cost_breakdown(output, input_data)
        if cost_issues:
            issues.extend(cost_issues["issues"])
            why_wrong.extend(cost_issues["why_wrong"])
            how_to_fix.extend(cost_issues["how_to_fix"])
        
        # Analyze completeness
        complete_issues = self._analyze_completeness(output)
        if complete_issues:
            issues.extend(complete_issues["issues"])
            why_wrong.extend(complete_issues["why_wrong"])
            how_to_fix.extend(complete_issues["how_to_fix"])
        
        # Analyze recommendations
        rec_issues = self._analyze_recommendations(output)
        if rec_issues:
            issues.extend(rec_issues["issues"])
            why_wrong.extend(rec_issues["why_wrong"])
            how_to_fix.extend(rec_issues["how_to_fix"])
        
        # If no specific issues found, provide general guidance
        if not issues:
            issues.append("Final estimate could be more comprehensive")
            why_wrong.append("Score below threshold suggests room for improvement")
            how_to_fix.append("Review all sections for completeness and consistency")
        
        return {
            "issues": issues,
            "why_wrong": why_wrong,
            "how_to_fix": how_to_fix,
            "scorer_feedback": scorer_feedback,
            "priority_fixes": how_to_fix[:3]
        }
    
    def _analyze_executive_summary(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Optional[Dict[str, List[str]]]:
        """Analyze executive summary quality.
        
        Args:
            output: Final Agent output.
            input_data: Input data.
            
        Returns:
            Dict with issues if any found.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        exec_summary = output.get("executiveSummary", {})
        
        if not exec_summary:
            issues.append("Missing executive summary")
            why_wrong.append("Executive summary is the most important section for clients")
            how_to_fix.append("Add complete executive summary with total cost, timeline, and confidence range")
            return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
        
        # Check for key fields
        total_cost = exec_summary.get("totalCost", 0)
        if total_cost <= 0:
            issues.append("Executive summary has no total cost")
            why_wrong.append("Total cost is the primary output clients need")
            how_to_fix.append("Calculate and include total cost with contingency")
        
        # Check confidence range
        conf_range = exec_summary.get("confidenceRange", {})
        if not conf_range.get("p50") or not conf_range.get("p90"):
            issues.append("Missing confidence range in executive summary")
            why_wrong.append("Clients need to understand cost uncertainty")
            how_to_fix.append("Include P50 (likely) and P90 (conservative) cost estimates")
        
        # Check location
        location = exec_summary.get("location", "")
        if not location or location == "Unknown, XX":
            issues.append("Location not properly displayed in summary")
            why_wrong.append("Location affects cost expectations and comparisons")
            how_to_fix.append("Include city and state from clarification output")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix} if issues else None
    
    def _analyze_cost_breakdown(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Optional[Dict[str, List[str]]]:
        """Analyze cost breakdown consistency.
        
        Args:
            output: Final Agent output.
            input_data: Input data.
            
        Returns:
            Dict with issues if any found.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        cost_breakdown = output.get("costBreakdown", {})
        
        if not cost_breakdown:
            issues.append("Missing cost breakdown")
            why_wrong.append("Detailed breakdown helps clients understand where money goes")
            how_to_fix.append("Include materials, labor, equipment, overhead, profit, and contingency")
            return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
        
        # Check math consistency
        materials = cost_breakdown.get("materials", 0)
        labor = cost_breakdown.get("labor", 0)
        equipment = cost_breakdown.get("equipment", 0)
        direct_subtotal = cost_breakdown.get("directCostsSubtotal", 0)
        
        if direct_subtotal > 0:
            calculated = materials + labor + equipment
            if abs(calculated - direct_subtotal) > 1:
                issues.append("Direct costs don't add up correctly")
                why_wrong.append("Math errors undermine estimate credibility")
                how_to_fix.append(f"Verify: ${materials:,.0f} + ${labor:,.0f} + ${equipment:,.0f} = ${calculated:,.0f}")
        
        # Check contingency percentage vs amount
        contingency = cost_breakdown.get("contingency", 0)
        contingency_pct = cost_breakdown.get("contingencyPercentage", 0)
        total_before = cost_breakdown.get("totalBeforeContingency", 0)
        
        if total_before > 0 and contingency_pct > 0:
            expected_contingency = total_before * (contingency_pct / 100)
            if abs(expected_contingency - contingency) > 100:
                issues.append("Contingency amount doesn't match percentage")
                why_wrong.append("Inconsistency creates confusion about actual contingency")
                how_to_fix.append(f"Align contingency: {contingency_pct}% of ${total_before:,.0f} = ${expected_contingency:,.0f}")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix} if issues else None
    
    def _analyze_completeness(
        self,
        output: Dict[str, Any]
    ) -> Optional[Dict[str, List[str]]]:
        """Analyze overall completeness.
        
        Args:
            output: Final Agent output.
            
        Returns:
            Dict with issues if any found.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        # Check for all major sections
        sections = {
            "executiveSummary": "Executive Summary",
            "costBreakdown": "Cost Breakdown",
            "timeline": "Timeline Summary",
            "riskSummary": "Risk Summary",
            "recommendations": "Recommendations",
            "assumptions": "Key Assumptions",
            "disclaimers": "Disclaimers"
        }
        
        missing_sections = []
        for key, name in sections.items():
            if not output.get(key):
                missing_sections.append(name)
        
        if missing_sections:
            issues.append(f"Missing sections: {', '.join(missing_sections)}")
            why_wrong.append("Professional estimates require all standard sections")
            how_to_fix.append(f"Add missing sections: {', '.join(missing_sections)}")
        
        # Check for summary headline
        summary = output.get("summary", "")
        if not summary:
            issues.append("Missing summary headline")
            why_wrong.append("One-line summary is essential for quick reference")
            how_to_fix.append("Add headline like 'Kitchen remodel: $35,000 over 6 weeks'")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix} if issues else None
    
    def _analyze_recommendations(
        self,
        output: Dict[str, Any]
    ) -> Optional[Dict[str, List[str]]]:
        """Analyze recommendations quality.
        
        Args:
            output: Final Agent output.
            
        Returns:
            Dict with issues if any found.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        recommendations = output.get("recommendations", [])
        
        if not recommendations:
            issues.append("No recommendations provided")
            why_wrong.append("Recommendations add value and show expertise")
            how_to_fix.append("Add 3-5 recommendations for cost savings, scheduling, or risk mitigation")
        elif len(recommendations) < 2:
            issues.append("Too few recommendations")
            why_wrong.append("Multiple recommendations show thorough analysis")
            how_to_fix.append("Add recommendations covering cost, schedule, and risk areas")
        
        # Check recommendation quality
        if recommendations:
            generic_recs = 0
            for rec in recommendations:
                if isinstance(rec, dict):
                    desc = rec.get("description", "")
                    if len(desc) < 20:
                        generic_recs += 1
            
            if generic_recs > len(recommendations) / 2:
                issues.append("Recommendations lack detail")
                why_wrong.append("Generic recommendations don't provide actionable guidance")
                how_to_fix.append("Expand each recommendation with specific actions and expected benefits")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix} if issues else None
