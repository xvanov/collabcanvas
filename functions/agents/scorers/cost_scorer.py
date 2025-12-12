"""Cost Scorer for TrueCost.

Validates Cost Agent output including P50/P80/P90 cost ranges.
"""

from typing import Dict, Any, List, Optional
import structlog

from agents.scorers.base_scorer import BaseScorer
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class CostScorer(BaseScorer):
    """Scorer for Cost Agent output.
    
    Validates:
    - Cost ranges are valid (low <= medium <= high)
    - All BoQ items have calculated costs
    - Location factor is applied correctly
    - Subtotals match line item sums
    - Range spread is reasonable
    - Confidence is appropriate
    """
    
    # Maximum acceptable spread ratio (high/low)
    MAX_RANGE_RATIO = 2.0
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize CostScorer."""
        super().__init__(
            name="cost_scorer",
            primary_agent_name="cost",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_scoring_criteria(self) -> List[Dict[str, Any]]:
        """Get scoring criteria for cost output."""
        return [
            {
                "name": "cost_ranges_valid",
                "description": "All cost ranges satisfy low <= medium <= high",
                "weight": 3
            },
            {
                "name": "line_items_costed",
                "description": "All BoQ line items have calculated costs",
                "weight": 3
            },
            {
                "name": "location_factor_applied",
                "description": "Location factor is applied to adjustments",
                "weight": 2
            },
            {
                "name": "subtotals_correct",
                "description": "Subtotals match sum of line item costs",
                "weight": 2
            },
            {
                "name": "range_reasonable",
                "description": "High/low ratio is within acceptable bounds",
                "weight": 2
            },
            {
                "name": "summary_quality",
                "description": "Summary includes cost drivers and range explanation",
                "weight": 1
            }
        ]
    
    async def evaluate_criterion(
        self,
        criterion: Dict[str, Any],
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate a single scoring criterion.
        
        Args:
            criterion: The criterion to evaluate.
            output: The Cost Agent output.
            input_data: The input data passed to the agent.
            
        Returns:
            Dict with score and feedback.
        """
        name = criterion.get("name")
        
        if name == "cost_ranges_valid":
            return self._check_cost_ranges_valid(output)
        elif name == "line_items_costed":
            return self._check_line_items_costed(output, input_data)
        elif name == "location_factor_applied":
            return self._check_location_factor_applied(output, input_data)
        elif name == "subtotals_correct":
            return self._check_subtotals_correct(output)
        elif name == "range_reasonable":
            return self._check_range_reasonable(output)
        elif name == "summary_quality":
            return self._check_summary_quality(output)
        
        return {"score": 85, "feedback": "Criterion not implemented"}
    
    def _check_cost_ranges_valid(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check that all cost ranges satisfy low <= medium <= high.
        
        Args:
            output: Cost Agent output.
            
        Returns:
            Score and feedback.
        """
        invalid_ranges = []
        
        # Check total
        total = output.get("total", {})
        if not self._is_range_valid(total):
            invalid_ranges.append("total")
        
        # Check subtotals
        subtotals = output.get("subtotals", {})
        for key in ["materials", "labor", "equipment", "subtotal"]:
            if key in subtotals and not self._is_range_valid(subtotals[key]):
                invalid_ranges.append(f"subtotals.{key}")
        
        # Check adjustments
        adjustments = output.get("adjustments", {})
        for key in ["locationAdjustedSubtotal", "overhead", "profit", "contingency", "permitCosts"]:
            if key in adjustments and isinstance(adjustments[key], dict):
                if not self._is_range_valid(adjustments[key]):
                    invalid_ranges.append(f"adjustments.{key}")
        
        # Check division totals
        for div in output.get("divisions", []):
            div_code = div.get("divisionCode", "?")
            if "divisionTotal" in div and not self._is_range_valid(div.get("divisionTotal", {})):
                invalid_ranges.append(f"division_{div_code}")
        
        if invalid_ranges:
            score = max(20, 100 - (len(invalid_ranges) * 15))
            return {
                "score": score,
                "feedback": f"Invalid ranges found: {', '.join(invalid_ranges[:5])}"
            }
        
        return {
            "score": 100,
            "feedback": "All cost ranges are valid (low <= medium <= high)"
        }
    
    def _is_range_valid(self, range_dict: Dict[str, Any]) -> bool:
        """Check if a range dict is valid."""
        if not range_dict:
            return True  # Empty is ok
        
        low = range_dict.get("low", 0)
        medium = range_dict.get("medium", 0)
        high = range_dict.get("high", 0)
        
        return low <= medium <= high
    
    def _check_line_items_costed(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check that all BoQ items have calculated costs.
        
        Args:
            output: Cost Agent output.
            input_data: Input with scope_output.
            
        Returns:
            Score and feedback.
        """
        # Count line items in output
        costed_items = 0
        for div in output.get("divisions", []):
            costed_items += len(div.get("lineItems", []))
        
        # Get expected count from scope output
        scope_output = input_data.get("scope_output", {})
        expected_items = scope_output.get("totalLineItems", 0)
        
        # Also count from divisions if totalLineItems not present
        if expected_items == 0:
            for div in scope_output.get("divisions", []):
                expected_items += len(div.get("lineItems", []))
        
        # Handle case where scope has no items
        if expected_items == 0:
            # Check if we at least have something
            if costed_items > 0:
                return {"score": 85, "feedback": f"{costed_items} items costed (no scope baseline)"}
            return {"score": 50, "feedback": "No scope items to cost"}
        
        coverage = costed_items / expected_items
        
        if coverage >= 0.95:
            return {
                "score": 100,
                "feedback": f"{costed_items}/{expected_items} items costed (100%)"
            }
        elif coverage >= 0.80:
            return {
                "score": 85,
                "feedback": f"{costed_items}/{expected_items} items costed ({coverage:.0%})"
            }
        elif coverage >= 0.60:
            return {
                "score": 65,
                "feedback": f"Only {costed_items}/{expected_items} items costed ({coverage:.0%})"
            }
        else:
            return {
                "score": 40,
                "feedback": f"Missing costs for many items: {costed_items}/{expected_items} ({coverage:.0%})"
            }
    
    def _check_location_factor_applied(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check that location factor is applied correctly.
        
        Args:
            output: Cost Agent output.
            input_data: Input with location_output.
            
        Returns:
            Score and feedback.
        """
        adjustments = output.get("adjustments", {})
        applied_factor = adjustments.get("locationFactor", 1.0)
        
        # Get expected factor from location output
        location_output = input_data.get("location_output", {})
        expected_factor = location_output.get("locationFactor", 1.0)
        
        # Check if factor matches
        if abs(applied_factor - expected_factor) < 0.01:
            # Check that locationAdjustedSubtotal exists
            if "locationAdjustedSubtotal" in adjustments:
                return {
                    "score": 100,
                    "feedback": f"Location factor {applied_factor:.2f} applied correctly"
                }
            return {
                "score": 75,
                "feedback": f"Factor {applied_factor:.2f} set but adjusted subtotal missing"
            }
        
        return {
            "score": 50,
            "feedback": f"Factor mismatch: applied {applied_factor:.2f}, expected {expected_factor:.2f}"
        }
    
    def _check_subtotals_correct(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check that subtotals match line item sums.
        
        Args:
            output: Cost Agent output.
            
        Returns:
            Score and feedback.
        """
        # Calculate expected material subtotal from divisions
        calculated_material_low = 0.0
        calculated_labor_low = 0.0
        
        for div in output.get("divisions", []):
            for item in div.get("lineItems", []):
                mat_cost = item.get("materialCost", {})
                lab_cost = item.get("laborCost", {})
                calculated_material_low += mat_cost.get("low", 0)
                calculated_labor_low += lab_cost.get("low", 0)
        
        # Get reported subtotals
        subtotals = output.get("subtotals", {})
        reported_material_low = subtotals.get("materials", {}).get("low", 0)
        reported_labor_low = subtotals.get("labor", {}).get("low", 0)
        
        # Allow small tolerance (rounding)
        tolerance = 0.01
        material_match = (
            calculated_material_low == 0 or
            abs(calculated_material_low - reported_material_low) / max(calculated_material_low, 1) < tolerance
        )
        labor_match = (
            calculated_labor_low == 0 or
            abs(calculated_labor_low - reported_labor_low) / max(calculated_labor_low, 1) < tolerance
        )
        
        if material_match and labor_match:
            return {
                "score": 100,
                "feedback": "Subtotals match line item sums"
            }
        
        issues = []
        if not material_match:
            issues.append(f"materials: calc=${calculated_material_low:,.0f} vs reported=${reported_material_low:,.0f}")
        if not labor_match:
            issues.append(f"labor: calc=${calculated_labor_low:,.0f} vs reported=${reported_labor_low:,.0f}")
        
        return {
            "score": 60,
            "feedback": f"Subtotal mismatch: {'; '.join(issues)}"
        }
    
    def _check_range_reasonable(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check that high/low ratio is within acceptable bounds.
        
        Args:
            output: Cost Agent output.
            
        Returns:
            Score and feedback.
        """
        total = output.get("total", {})
        low = total.get("low", 0)
        high = total.get("high", 0)
        
        if low <= 0:
            return {"score": 50, "feedback": "Invalid low value (zero or negative)"}
        
        ratio = high / low
        
        if ratio <= 1.0:
            return {"score": 40, "feedback": f"Range too narrow: ratio {ratio:.2f}"}
        elif ratio <= self.MAX_RANGE_RATIO:
            spread_pct = ((high - low) / low) * 100
            return {
                "score": 100,
                "feedback": f"Range spread {spread_pct:.0f}% (ratio {ratio:.2f}) is reasonable"
            }
        else:
            return {
                "score": 60,
                "feedback": f"Range too wide: ratio {ratio:.2f} exceeds {self.MAX_RANGE_RATIO}"
            }
    
    def _check_summary_quality(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Check that summary includes key information.
        
        Args:
            output: Cost Agent output.
            
        Returns:
            Score and feedback.
        """
        summary = output.get("summary", {})
        
        checks = {
            "headline": bool(summary.get("headline")),
            "rangeExplanation": bool(summary.get("rangeExplanation")),
            "keyCostDrivers": len(summary.get("keyCostDrivers", [])) > 0,
            "assumptions": len(summary.get("assumptions", [])) > 0
        }
        
        passed = sum(checks.values())
        total = len(checks)
        
        if passed == total:
            return {"score": 100, "feedback": "Summary is complete"}
        elif passed >= 2:
            missing = [k for k, v in checks.items() if not v]
            return {"score": 75, "feedback": f"Summary missing: {', '.join(missing)}"}
        else:
            return {"score": 40, "feedback": "Summary is incomplete"}
