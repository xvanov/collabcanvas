"""Cost Critic for TrueCost.

Provides detailed feedback for Cost Agent when output scores below threshold.
"""

from typing import Dict, Any, Optional, List
import structlog

from agents.critics.base_critic import BaseCritic
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class CostCritic(BaseCritic):
    """Critic for Cost Agent output.
    
    Analyzes cost estimate issues and provides actionable feedback for:
    - Invalid cost ranges (low/medium/high ordering)
    - Missing line item costs
    - Location factor application
    - Subtotal calculation errors
    - Range spread issues
    """
    
    # Maximum acceptable spread ratio
    MAX_RANGE_RATIO = 2.0
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize CostCritic."""
        super().__init__(
            name="cost_critic",
            primary_agent_name="cost",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_critique_prompt(self) -> str:
        """Get the critique prompt for LLM analysis."""
        return self.get_base_critique_prompt() + """

## Cost Estimate Specific Criteria

### Cost Range Validity
- All cost ranges must satisfy: low <= medium <= high
- This applies to: total, subtotals, division totals, and line items
- P50 (low) < P80 (medium) < P90 (high) for proper Monte Carlo input

### Line Item Coverage
- Every item from the Bill of Quantities should have a calculated cost
- Each line item should have: materialCost, laborCost, and totalCost ranges
- Labor hours should be multiplied by location-specific labor rates

### Location Factor Application
- The location factor from Location Agent must be applied
- It should multiply the base subtotal before overhead/profit
- The locationAdjustedSubtotal should reflect this multiplication

### Subtotal Accuracy
- Material subtotal = sum of all line item material costs
- Labor subtotal = sum of all line item labor costs  
- Division totals = sum of line items in that division
- Grand total = location_adjusted_subtotal + overhead + profit + contingency + permits

### Range Reasonableness
- High/low ratio should typically be < 2.0 (100% spread)
- Wider spreads indicate high uncertainty - note the reasons
- Narrower spreads may underestimate risk

### Required Summary Elements
- Headline with total range (e.g., "$28,000 - $36,000")
- Range explanation for homeowner
- Key cost drivers
- Assumptions made

Focus your critique on:
1. Mathematical accuracy of all calculations
2. Proper P50/P80/P90 range structure
3. Location factor correctly applied
4. All scope items are costed
5. Summary is helpful for the homeowner
"""
    
    async def analyze_output(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any],
        score: int,
        scorer_feedback: str
    ) -> Dict[str, Any]:
        """Analyze cost output and provide detailed feedback.
        
        Args:
            output: The Cost Agent output.
            input_data: The input data passed to the agent.
            score: The score from the Cost Scorer.
            scorer_feedback: Feedback from the scorer.
            
        Returns:
            Dict with issues, why_wrong, and how_to_fix.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        # Check cost range validity
        range_issues = self._analyze_cost_ranges(output)
        if range_issues:
            issues.extend(range_issues["issues"])
            why_wrong.extend(range_issues["reasons"])
            how_to_fix.extend(range_issues["fixes"])
        
        # Check line item coverage
        coverage_issues = self._analyze_line_item_coverage(output, input_data)
        if coverage_issues:
            issues.extend(coverage_issues["issues"])
            why_wrong.extend(coverage_issues["reasons"])
            how_to_fix.extend(coverage_issues["fixes"])
        
        # Check location factor
        location_issues = self._analyze_location_factor(output, input_data)
        if location_issues:
            issues.extend(location_issues["issues"])
            why_wrong.extend(location_issues["reasons"])
            how_to_fix.extend(location_issues["fixes"])
        
        # Check subtotals
        subtotal_issues = self._analyze_subtotals(output)
        if subtotal_issues:
            issues.extend(subtotal_issues["issues"])
            why_wrong.extend(subtotal_issues["reasons"])
            how_to_fix.extend(subtotal_issues["fixes"])
        
        # Check range spread
        spread_issues = self._analyze_range_spread(output)
        if spread_issues:
            issues.extend(spread_issues["issues"])
            why_wrong.extend(spread_issues["reasons"])
            how_to_fix.extend(spread_issues["fixes"])
        
        # Check summary quality
        summary_issues = self._analyze_summary(output)
        if summary_issues:
            issues.extend(summary_issues["issues"])
            why_wrong.extend(summary_issues["reasons"])
            how_to_fix.extend(summary_issues["fixes"])
        
        # If no specific issues found, provide generic feedback
        if not issues:
            issues = [f"Cost estimate scored {score}/100 - below threshold"]
            why_wrong = ["General quality issues detected by scorer"]
            how_to_fix = ["Review scorer feedback and improve calculations"]
        
        logger.info(
            "cost_critic_analysis",
            issues_found=len(issues),
            score=score
        )
        
        return {
            "issues": issues[:5],  # Limit to top 5 issues
            "why_wrong": "; ".join(why_wrong[:3]),
            "how_to_fix": how_to_fix[:5]
        }
    
    def _analyze_cost_ranges(self, output: Dict[str, Any]) -> Optional[Dict[str, List[str]]]:
        """Analyze cost range validity.
        
        Args:
            output: Cost Agent output.
            
        Returns:
            Dict with issues, reasons, and fixes or None.
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
        
        # Check division totals
        for div in output.get("divisions", []):
            if not self._is_range_valid(div.get("divisionTotal", {})):
                invalid_ranges.append(f"division {div.get('divisionCode', '?')}")
        
        if invalid_ranges:
            return {
                "issues": [f"Invalid cost ranges: {', '.join(invalid_ranges[:3])}"],
                "reasons": [
                    "Cost ranges must satisfy low <= medium <= high for Monte Carlo compatibility",
                    "P50 should be lowest, P80 in middle, P90 highest"
                ],
                "fixes": [
                    "Recalculate ranges using CostRange.from_base_cost() with proper multipliers",
                    f"Check these specific ranges: {', '.join(invalid_ranges[:3])}"
                ]
            }
        
        return None
    
    def _is_range_valid(self, range_dict: Dict[str, Any]) -> bool:
        """Check if a range dict is valid."""
        if not range_dict:
            return True
        
        low = range_dict.get("low", 0)
        medium = range_dict.get("medium", 0)
        high = range_dict.get("high", 0)
        
        return low <= medium <= high
    
    def _analyze_line_item_coverage(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Optional[Dict[str, List[str]]]:
        """Analyze line item cost coverage.
        
        Args:
            output: Cost Agent output.
            input_data: Input with scope_output.
            
        Returns:
            Dict with issues, reasons, and fixes or None.
        """
        # Count costed items
        costed = 0
        for div in output.get("divisions", []):
            costed += len(div.get("lineItems", []))
        
        # Get expected from scope
        scope = input_data.get("scope_output", {})
        expected = scope.get("totalLineItems", 0)
        if expected == 0:
            for div in scope.get("divisions", []):
                expected += len(div.get("lineItems", []))
        
        if expected > 0 and costed < expected * 0.8:
            coverage = costed / expected if expected > 0 else 0
            return {
                "issues": [f"Only {costed}/{expected} items costed ({coverage:.0%})"],
                "reasons": [
                    "All Bill of Quantities items need calculated costs",
                    f"Missing costs for {expected - costed} items"
                ],
                "fixes": [
                    "Process all line items from scope_output divisions",
                    "Use get_material_cost() for each item's cost code",
                    "Apply labor rate from get_labor_rate() for each trade"
                ]
            }
        
        # Check for zero-cost items
        zero_cost_items = []
        for div in output.get("divisions", []):
            for item in div.get("lineItems", []):
                total = item.get("totalCost", {})
                if total.get("low", 0) == 0 and total.get("high", 0) == 0:
                    zero_cost_items.append(item.get("description", "unknown")[:30])
        
        if zero_cost_items:
            return {
                "issues": [f"{len(zero_cost_items)} items have zero cost"],
                "reasons": ["Line items should not have zero total cost"],
                "fixes": [
                    "Check cost code lookup for these items",
                    f"Items with issues: {', '.join(zero_cost_items[:3])}"
                ]
            }
        
        return None
    
    def _analyze_location_factor(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Optional[Dict[str, List[str]]]:
        """Analyze location factor application.
        
        Args:
            output: Cost Agent output.
            input_data: Input with location_output.
            
        Returns:
            Dict with issues, reasons, and fixes or None.
        """
        adjustments = output.get("adjustments", {})
        applied = adjustments.get("locationFactor", 1.0)
        
        location = input_data.get("location_output", {})
        expected = location.get("locationFactor", 1.0)
        
        # Check factor mismatch
        if abs(applied - expected) > 0.01:
            return {
                "issues": [f"Location factor mismatch: applied {applied:.2f}, expected {expected:.2f}"],
                "reasons": [
                    "Location factor from Location Agent must be used",
                    "This affects all costs for geographic accuracy"
                ],
                "fixes": [
                    f"Set location_factor = {expected:.2f} from location_output.locationFactor",
                    "Recalculate locationAdjustedSubtotal = subtotal × locationFactor"
                ]
            }
        
        # Check adjusted subtotal exists
        if "locationAdjustedSubtotal" not in adjustments:
            return {
                "issues": ["Missing locationAdjustedSubtotal in adjustments"],
                "reasons": ["Location-adjusted costs are needed for downstream calculations"],
                "fixes": [
                    "Calculate locationAdjustedSubtotal = subtotals.subtotal × locationFactor",
                    "Apply overhead and profit to the location-adjusted amount"
                ]
            }
        
        return None
    
    def _analyze_subtotals(self, output: Dict[str, Any]) -> Optional[Dict[str, List[str]]]:
        """Analyze subtotal calculations.
        
        Args:
            output: Cost Agent output.
            
        Returns:
            Dict with issues, reasons, and fixes or None.
        """
        # Calculate expected from line items
        calc_material = 0.0
        calc_labor = 0.0
        
        for div in output.get("divisions", []):
            for item in div.get("lineItems", []):
                calc_material += item.get("materialCost", {}).get("low", 0)
                calc_labor += item.get("laborCost", {}).get("low", 0)
        
        # Get reported
        subtotals = output.get("subtotals", {})
        reported_material = subtotals.get("materials", {}).get("low", 0)
        reported_labor = subtotals.get("labor", {}).get("low", 0)
        
        issues = []
        
        # Check material
        if calc_material > 0:
            diff_pct = abs(calc_material - reported_material) / calc_material
            if diff_pct > 0.05:  # > 5% difference
                issues.append(f"Material subtotal mismatch: reported ${reported_material:,.0f} vs calculated ${calc_material:,.0f}")
        
        # Check labor
        if calc_labor > 0:
            diff_pct = abs(calc_labor - reported_labor) / calc_labor
            if diff_pct > 0.05:
                issues.append(f"Labor subtotal mismatch: reported ${reported_labor:,.0f} vs calculated ${calc_labor:,.0f}")
        
        if issues:
            return {
                "issues": issues,
                "reasons": ["Subtotals must equal sum of line item costs"],
                "fixes": [
                    "Recalculate material_subtotal = sum(item.materialCost for all items)",
                    "Recalculate labor_subtotal = sum(item.laborCost for all items)",
                    "Ensure division subtotals also match their line items"
                ]
            }
        
        return None
    
    def _analyze_range_spread(self, output: Dict[str, Any]) -> Optional[Dict[str, List[str]]]:
        """Analyze cost range spread reasonableness.
        
        Args:
            output: Cost Agent output.
            
        Returns:
            Dict with issues, reasons, and fixes or None.
        """
        total = output.get("total", {})
        low = total.get("low", 0)
        high = total.get("high", 0)
        
        if low <= 0:
            return {
                "issues": ["Total low value is zero or negative"],
                "reasons": ["Cannot have zero or negative cost estimate"],
                "fixes": [
                    "Check line item calculations",
                    "Ensure material and labor costs are being summed"
                ]
            }
        
        ratio = high / low
        
        if ratio > self.MAX_RANGE_RATIO:
            spread = ((high - low) / low) * 100
            return {
                "issues": [f"Range spread too wide: {spread:.0f}% (ratio {ratio:.2f})"],
                "reasons": [
                    f"High/low ratio > {self.MAX_RANGE_RATIO} indicates excessive uncertainty",
                    "May indicate inconsistent variance multipliers"
                ],
                "fixes": [
                    "Review variance multipliers (P80=1.15, P90=1.25 are standard)",
                    "Check for outlier items with very high variance",
                    "Consider if some items have inflated uncertainty"
                ]
            }
        
        if ratio < 1.1:
            return {
                "issues": [f"Range spread too narrow: ratio {ratio:.2f}"],
                "reasons": ["Very narrow ranges underestimate uncertainty"],
                "fixes": [
                    "Use standard variance multipliers: P80=1.15, P90=1.25",
                    "Ensure CostRange.from_base_cost() is being used consistently"
                ]
            }
        
        return None
    
    def _analyze_summary(self, output: Dict[str, Any]) -> Optional[Dict[str, List[str]]]:
        """Analyze summary completeness.
        
        Args:
            output: Cost Agent output.
            
        Returns:
            Dict with issues, reasons, and fixes or None.
        """
        summary = output.get("summary", {})
        
        missing = []
        if not summary.get("headline"):
            missing.append("headline")
        if not summary.get("rangeExplanation"):
            missing.append("rangeExplanation")
        if not summary.get("keyCostDrivers"):
            missing.append("keyCostDrivers")
        
        if missing:
            return {
                "issues": [f"Summary missing: {', '.join(missing)}"],
                "reasons": ["Complete summary helps homeowners understand the estimate"],
                "fixes": [
                    "Add headline: 'Total estimate: $X - $Y (N items)'",
                    "Add rangeExplanation for P50/P80/P90 meaning",
                    "List top 3-5 keyCostDrivers (highest cost items/categories)"
                ]
            }
        
        return None
