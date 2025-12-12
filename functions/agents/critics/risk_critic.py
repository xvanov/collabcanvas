"""Risk Critic for TrueCost.

Provides actionable feedback for Risk Agent output improvement.
"""

from typing import Any, Dict, List, Optional
import structlog

from agents.critics.base_critic import BaseCritic
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class RiskCritic(BaseCritic):
    """Critic for Risk Agent output.
    
    Analyzes risk analysis output and provides specific feedback
    for improving Monte Carlo results and risk identification.
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize RiskCritic."""
        super().__init__(
            name="risk_critic",
            primary_agent_name="risk",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_critique_prompt(self) -> str:
        """Get domain-specific critique prompt.
        
        Returns:
            Prompt string for LLM critique.
        """
        return """You are a construction risk analysis expert reviewing Monte Carlo simulation results.

Critique Focus:
1. Are the percentile values (P50/P80/P90) realistic for this project type?
2. Is the recommended contingency appropriate for the risk profile?
3. Are the identified risks comprehensive and properly quantified?
4. Are the variance contributions accurately reflecting risk impacts?
5. Are mitigation strategies actionable and specific?

For each issue found, explain:
- What specifically is wrong
- Why it's a problem for accurate risk assessment
- How to fix it with specific adjustments

Focus on:
- Percentile spread (typically 15-30% from P50 to P90)
- Contingency alignment with risk level
- Missing high-impact risks for this project type
- Unrealistic probability or impact values
- Generic vs. project-specific mitigation"""
    
    async def analyze_output(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any],
        score: int,
        scorer_feedback: str
    ) -> Dict[str, Any]:
        """Analyze risk output and provide feedback.
        
        Args:
            output: Risk Agent output to critique.
            input_data: Original input data.
            score: Score from scorer.
            scorer_feedback: Feedback from scorer.
            
        Returns:
            Dict with issues, why_wrong, and how_to_fix.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        # Analyze percentiles
        percentile_issues = self._analyze_percentiles(output, input_data)
        if percentile_issues:
            issues.extend(percentile_issues["issues"])
            why_wrong.extend(percentile_issues["why_wrong"])
            how_to_fix.extend(percentile_issues["how_to_fix"])
        
        # Analyze contingency
        contingency_issues = self._analyze_contingency(output, input_data)
        if contingency_issues:
            issues.extend(contingency_issues["issues"])
            why_wrong.extend(contingency_issues["why_wrong"])
            how_to_fix.extend(contingency_issues["how_to_fix"])
        
        # Analyze risk factors
        risk_issues = self._analyze_risk_factors(output, input_data)
        if risk_issues:
            issues.extend(risk_issues["issues"])
            why_wrong.extend(risk_issues["why_wrong"])
            how_to_fix.extend(risk_issues["how_to_fix"])
        
        # Analyze mitigation
        mitigation_issues = self._analyze_mitigation(output, input_data)
        if mitigation_issues:
            issues.extend(mitigation_issues["issues"])
            why_wrong.extend(mitigation_issues["why_wrong"])
            how_to_fix.extend(mitigation_issues["how_to_fix"])
        
        # If no specific issues found, provide general guidance
        if not issues:
            issues.append("Risk analysis quality could be improved")
            why_wrong.append("Score below threshold suggests areas for enhancement")
            how_to_fix.append("Review risk probabilities and impacts for accuracy")
        
        return {
            "issues": issues,
            "why_wrong": why_wrong,
            "how_to_fix": how_to_fix,
            "scorer_feedback": scorer_feedback,
            "priority_fixes": how_to_fix[:3]
        }
    
    def _analyze_percentiles(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Optional[Dict[str, List[str]]]:
        """Analyze Monte Carlo percentile values.
        
        Args:
            output: Risk Agent output.
            input_data: Input data.
            
        Returns:
            Dict with issues if any found.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        mc = output.get("monteCarlo", {})
        p50 = mc.get("p50", 0)
        p80 = mc.get("p80", 0)
        p90 = mc.get("p90", 0)
        
        if not p50:
            issues.append("Missing P50 (median) value")
            why_wrong.append("P50 is the base cost expectation for project planning")
            how_to_fix.append("Ensure Monte Carlo simulation produces valid P50 value")
            return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
        
        # Check ordering
        if not (p50 <= p80 <= p90):
            issues.append(f"Percentiles not in ascending order: P50={p50:,.0f}, P80={p80:,.0f}, P90={p90:,.0f}")
            why_wrong.append("Higher percentiles must always be >= lower percentiles")
            how_to_fix.append("Verify Monte Carlo simulation logic; ensure proper sorting of results")
        
        # Check spread
        spread = (p90 - p50) / p50 if p50 > 0 else 0
        
        if spread < 0.08:
            issues.append(f"Percentile spread too narrow ({spread:.1%})")
            why_wrong.append("Construction projects typically have 15-30% cost variance")
            how_to_fix.append("Increase risk factor impacts or add more risk factors to reflect realistic uncertainty")
        
        if spread > 0.45:
            issues.append(f"Percentile spread too wide ({spread:.1%})")
            why_wrong.append("Excessive spread indicates very high uncertainty or data issues")
            how_to_fix.append("Review risk probabilities - some may be too high; ensure base cost is accurate")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix} if issues else None
    
    def _analyze_contingency(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Optional[Dict[str, List[str]]]:
        """Analyze contingency recommendation.
        
        Args:
            output: Risk Agent output.
            input_data: Input data.
            
        Returns:
            Dict with issues if any found.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        contingency = output.get("contingency", {})
        recommended = contingency.get("recommended", 0)
        risk_level = output.get("riskLevel", "medium").lower()
        
        # Check contingency vs risk level alignment
        if risk_level == "high" and recommended < 12:
            issues.append(f"Contingency ({recommended:.1f}%) too low for high-risk project")
            why_wrong.append("High-risk projects typically need 12-20% contingency")
            how_to_fix.append("Increase contingency to 12-15% minimum for high-risk classification")
        
        if risk_level == "low" and recommended > 15:
            issues.append(f"Contingency ({recommended:.1f}%) high for low-risk project")
            why_wrong.append("Low-risk projects typically need 5-10% contingency")
            how_to_fix.append("Review risk assessment; either lower contingency or reassess risk level")
        
        # Check for rationale
        rationale = contingency.get("rationale", "")
        if not rationale:
            issues.append("Contingency lacks rationale")
            why_wrong.append("Clients need to understand why contingency is recommended")
            how_to_fix.append("Add explanation linking contingency to specific risks and P80 confidence level")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix} if issues else None
    
    def _analyze_risk_factors(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Optional[Dict[str, List[str]]]:
        """Analyze identified risk factors.
        
        Args:
            output: Risk Agent output.
            input_data: Input data.
            
        Returns:
            Dict with issues if any found.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        top_risks = output.get("topRisks", [])
        
        if len(top_risks) < 3:
            issues.append(f"Only {len(top_risks)} top risks identified")
            why_wrong.append("Comprehensive risk analysis should identify at least 5 key risks")
            how_to_fix.append("Add risk factors for: material costs, labor, weather, permits, scope changes")
        
        # Check for project-specific risks
        clarification = input_data.get("clarification_output", {})
        project_type = clarification.get("projectBrief", {}).get("projectType", "")
        
        risk_names = [r.get("item", "").lower() for r in top_risks]
        
        # Check for common missing risks
        common_risks = ["material", "labor", "weather", "permit", "scope"]
        missing_common = [r for r in common_risks if not any(r in name for name in risk_names)]
        
        if missing_common:
            issues.append(f"Missing common risk categories: {', '.join(missing_common)}")
            why_wrong.append("Standard construction risks should be evaluated for all projects")
            how_to_fix.append(f"Add risk factors for: {', '.join(missing_common)}")
        
        # Check variance contributions
        total_variance = sum(r.get("varianceContribution", 0) for r in top_risks)
        
        if total_variance < 0.5:
            issues.append(f"Top risks only explain {total_variance:.0%} of variance")
            why_wrong.append("Major risks should explain majority of cost variance")
            how_to_fix.append("Review risk impacts; top 5 should explain 50-80% of variance")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix} if issues else None
    
    def _analyze_mitigation(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Optional[Dict[str, List[str]]]:
        """Analyze risk mitigation strategies.
        
        Args:
            output: Risk Agent output.
            input_data: Input data.
            
        Returns:
            Dict with issues if any found.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        top_risks = output.get("topRisks", [])
        recommendations = output.get("recommendations", [])
        
        risks_without_mitigation = [
            r.get("item", "Unknown") for r in top_risks
            if not r.get("mitigation")
        ]
        
        if len(risks_without_mitigation) > 2:
            issues.append(f"{len(risks_without_mitigation)} risks lack mitigation strategies")
            why_wrong.append("Each identified risk should have actionable mitigation")
            how_to_fix.append(f"Add mitigation for: {', '.join(risks_without_mitigation[:3])}")
        
        # Check if mitigation is generic
        generic_terms = ["monitor", "review", "track", "careful"]
        generic_mitigations = 0
        
        for r in top_risks:
            mitigation = r.get("mitigation", "").lower()
            if any(term in mitigation for term in generic_terms) and len(mitigation) < 50:
                generic_mitigations += 1
        
        if generic_mitigations >= len(top_risks) / 2:
            issues.append("Mitigation strategies are too generic")
            why_wrong.append("Generic advice doesn't provide actionable risk reduction")
            how_to_fix.append("Provide specific actions: early procurement, contractor vetting, phased scheduling")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix} if issues else None
