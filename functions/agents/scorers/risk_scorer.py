"""Risk Scorer for TrueCost.

Evaluates Risk Agent output for Monte Carlo validity,
contingency reasonableness, and risk identification completeness.
"""

from typing import Any, Dict, List, Optional
import structlog

from agents.scorers.base_scorer import BaseScorer
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class RiskScorer(BaseScorer):
    """Scorer for Risk Agent output.
    
    Evaluates:
    1. Monte Carlo percentiles validity (P50 < P80 < P90)
    2. Contingency reasonableness (within industry norms)
    3. Risk factors identified (coverage)
    4. Variance contribution totals
    5. Risk mitigation provided
    6. Statistical validity (CV in reasonable range)
    """
    
    # Industry standard contingency range
    MIN_CONTINGENCY = 3.0  # Minimum 3%
    MAX_CONTINGENCY = 35.0  # Maximum 35%
    
    # Expected risk factor count
    MIN_RISK_FACTORS = 3
    TARGET_RISK_FACTORS = 5
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize RiskScorer."""
        super().__init__(
            name="risk_scorer",
            primary_agent_name="risk",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_scoring_criteria(self) -> List[Dict[str, Any]]:
        """Get scoring criteria for risk output.
        
        Returns:
            List of criteria with names, descriptions, and weights.
        """
        return [
            {
                "name": "percentiles_valid",
                "description": "Monte Carlo percentiles are valid (P50 < P80 < P90)",
                "weight": 3
            },
            {
                "name": "contingency_reasonable",
                "description": "Contingency percentage within industry norms",
                "weight": 3
            },
            {
                "name": "risks_identified",
                "description": "Adequate number of risk factors identified",
                "weight": 2
            },
            {
                "name": "variance_contributions_valid",
                "description": "Risk variance contributions sum correctly",
                "weight": 2
            },
            {
                "name": "mitigation_provided",
                "description": "Risk mitigation strategies provided",
                "weight": 1
            },
            {
                "name": "statistics_reasonable",
                "description": "Statistical measures are reasonable",
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
            output: Risk Agent output.
            input_data: Original input data.
            
        Returns:
            Dict with score and feedback.
        """
        name = criterion.get("name")
        
        if name == "percentiles_valid":
            return self._check_percentiles_valid(output)
        elif name == "contingency_reasonable":
            return self._check_contingency_reasonable(output, input_data)
        elif name == "risks_identified":
            return self._check_risks_identified(output)
        elif name == "variance_contributions_valid":
            return self._check_variance_contributions(output)
        elif name == "mitigation_provided":
            return self._check_mitigation_provided(output)
        elif name == "statistics_reasonable":
            return self._check_statistics_reasonable(output, input_data)
        
        return {"score": 85, "feedback": "Unknown criterion"}
    
    def _check_percentiles_valid(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check that Monte Carlo percentiles are valid.
        
        Args:
            output: Risk Agent output.
            
        Returns:
            Score and feedback.
        """
        mc = output.get("monteCarlo", {})
        p50 = mc.get("p50", 0)
        p80 = mc.get("p80", 0)
        p90 = mc.get("p90", 0)
        
        if not all([p50, p80, p90]):
            return {
                "score": 20,
                "feedback": "Missing percentile values in Monte Carlo output"
            }
        
        if p50 <= 0:
            return {
                "score": 30,
                "feedback": f"P50 value is invalid: {p50}"
            }
        
        # Check ascending order: P50 <= P80 <= P90
        if not (p50 <= p80 <= p90):
            return {
                "score": 40,
                "feedback": f"Percentiles not in order: P50={p50:,.0f}, P80={p80:,.0f}, P90={p90:,.0f}"
            }
        
        # Check for reasonable spread (P90 should be 5-50% higher than P50)
        spread = (p90 - p50) / p50 if p50 > 0 else 0
        
        if spread < 0.05:
            return {
                "score": 70,
                "feedback": f"Percentile spread too narrow: {spread:.1%}"
            }
        if spread > 0.50:
            return {
                "score": 70,
                "feedback": f"Percentile spread too wide: {spread:.1%}"
            }
        
        return {
            "score": 100,
            "feedback": f"Valid percentiles: P50=${p50:,.0f}, P80=${p80:,.0f}, P90=${p90:,.0f} ({spread:.0%} spread)"
        }
    
    def _check_contingency_reasonable(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check that contingency is within reasonable range.
        
        Args:
            output: Risk Agent output.
            input_data: Original input data.
            
        Returns:
            Score and feedback.
        """
        contingency = output.get("contingency", {})
        recommended = contingency.get("recommended", 0)
        
        if recommended <= 0:
            return {
                "score": 30,
                "feedback": "No contingency recommended"
            }
        
        if recommended < self.MIN_CONTINGENCY:
            return {
                "score": 60,
                "feedback": f"Contingency {recommended:.1f}% below minimum {self.MIN_CONTINGENCY}%"
            }
        
        if recommended > self.MAX_CONTINGENCY:
            return {
                "score": 60,
                "feedback": f"Contingency {recommended:.1f}% above maximum {self.MAX_CONTINGENCY}%"
            }
        
        # Check that dollar amount matches percentage
        dollar_amount = contingency.get("dollarAmount", 0)
        base_cost = output.get("baseCost", 0)
        
        if base_cost > 0 and dollar_amount > 0:
            calculated_pct = (dollar_amount / base_cost) * 100
            if abs(calculated_pct - recommended) > 2:
                return {
                    "score": 75,
                    "feedback": f"Contingency % ({recommended:.1f}%) doesn't match amount ({calculated_pct:.1f}%)"
                }
        
        # Check if rationale provided
        rationale = contingency.get("rationale", "")
        if not rationale:
            return {
                "score": 85,
                "feedback": f"Contingency {recommended:.1f}% reasonable, but no rationale provided"
            }
        
        return {
            "score": 100,
            "feedback": f"Contingency {recommended:.1f}% is reasonable with rationale"
        }
    
    def _check_risks_identified(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check that adequate risk factors were identified.
        
        Args:
            output: Risk Agent output.
            
        Returns:
            Score and feedback.
        """
        top_risks = output.get("topRisks", [])
        all_risks = output.get("allRisks", [])
        
        risk_count = len(top_risks) if top_risks else len(all_risks)
        
        if risk_count == 0:
            return {
                "score": 20,
                "feedback": "No risk factors identified"
            }
        
        if risk_count < self.MIN_RISK_FACTORS:
            return {
                "score": 60,
                "feedback": f"Only {risk_count} risks identified (minimum {self.MIN_RISK_FACTORS})"
            }
        
        if risk_count >= self.TARGET_RISK_FACTORS:
            # Check quality of risk data
            has_descriptions = all(r.get("description") for r in top_risks) if top_risks else True
            has_probabilities = all(r.get("probability", 0) > 0 for r in top_risks) if top_risks else True
            
            if has_descriptions and has_probabilities:
                return {
                    "score": 100,
                    "feedback": f"{risk_count} risks with complete data"
                }
            return {
                "score": 85,
                "feedback": f"{risk_count} risks identified but some missing details"
            }
        
        return {
            "score": 80,
            "feedback": f"{risk_count} risks identified"
        }
    
    def _check_variance_contributions(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check that variance contributions are valid.
        
        Args:
            output: Risk Agent output.
            
        Returns:
            Score and feedback.
        """
        top_risks = output.get("topRisks", [])
        
        if not top_risks:
            return {
                "score": 50,
                "feedback": "No variance contribution data"
            }
        
        # Sum variance contributions
        total_contribution = sum(
            r.get("varianceContribution", 0) for r in top_risks
        )
        
        # Contributions should be between 0 and 1, and top 5 should cover significant portion
        has_valid_contributions = all(
            0 <= r.get("varianceContribution", 0) <= 1 for r in top_risks
        )
        
        if not has_valid_contributions:
            return {
                "score": 50,
                "feedback": "Invalid variance contribution values"
            }
        
        # Top 5 should typically cover 50-100% of variance
        if total_contribution < 0.3:
            return {
                "score": 70,
                "feedback": f"Top risks only explain {total_contribution:.0%} of variance"
            }
        
        if total_contribution > 1.0:
            return {
                "score": 60,
                "feedback": f"Variance contributions sum to {total_contribution:.0%} (>100%)"
            }
        
        return {
            "score": 100,
            "feedback": f"Top 5 risks explain {total_contribution:.0%} of variance"
        }
    
    def _check_mitigation_provided(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check that risk mitigation strategies are provided.
        
        Args:
            output: Risk Agent output.
            
        Returns:
            Score and feedback.
        """
        top_risks = output.get("topRisks", [])
        recommendations = output.get("recommendations", [])
        
        if not top_risks and not recommendations:
            return {
                "score": 40,
                "feedback": "No mitigation strategies provided"
            }
        
        # Check for mitigation in top risks
        risks_with_mitigation = sum(
            1 for r in top_risks if r.get("mitigation")
        )
        
        if risks_with_mitigation == 0 and not recommendations:
            return {
                "score": 50,
                "feedback": "No specific mitigation for identified risks"
            }
        
        if risks_with_mitigation >= len(top_risks) * 0.8:
            return {
                "score": 100,
                "feedback": f"{risks_with_mitigation}/{len(top_risks)} risks have mitigation strategies"
            }
        
        if recommendations:
            return {
                "score": 85,
                "feedback": f"General recommendations provided"
            }
        
        return {
            "score": 70,
            "feedback": f"Only {risks_with_mitigation}/{len(top_risks)} risks have mitigation"
        }
    
    def _check_statistics_reasonable(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check that statistical measures are reasonable.
        
        Args:
            output: Risk Agent output.
            input_data: Original input data.
            
        Returns:
            Score and feedback.
        """
        mc = output.get("monteCarlo", {})
        
        mean = mc.get("mean", 0)
        std_dev = mc.get("stdDev", 0)
        p50 = mc.get("p50", 0)
        
        if mean <= 0 or p50 <= 0:
            return {
                "score": 50,
                "feedback": "Missing statistical values"
            }
        
        # Calculate coefficient of variation
        cv = std_dev / mean if mean > 0 else 0
        
        # CV should typically be 5-25% for construction estimates
        if cv < 0.03:
            return {
                "score": 70,
                "feedback": f"Coefficient of variation ({cv:.1%}) unusually low"
            }
        
        if cv > 0.30:
            return {
                "score": 70,
                "feedback": f"Coefficient of variation ({cv:.1%}) unusually high"
            }
        
        # Mean should be close to P50 (within 10%)
        mean_p50_diff = abs(mean - p50) / p50 if p50 > 0 else 0
        
        if mean_p50_diff > 0.15:
            return {
                "score": 80,
                "feedback": f"Mean (${mean:,.0f}) differs significantly from P50 (${p50:,.0f})"
            }
        
        return {
            "score": 100,
            "feedback": f"Statistics reasonable: CV={cv:.1%}, Mean=${mean:,.0f}"
        }
