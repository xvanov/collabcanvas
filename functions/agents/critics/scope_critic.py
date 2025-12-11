"""Scope Critic for TrueCost.

Provides detailed feedback when Scope Agent output scores below threshold.
Uses LLM to generate actionable critique and improvement suggestions.
"""

from typing import Dict, Any, List, Optional

import structlog

from agents.critics.base_critic import BaseCritic
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


# =============================================================================
# CONSTANTS
# =============================================================================

# Minimum expected line items by project type
MIN_LINE_ITEMS_BY_PROJECT: Dict[str, int] = {
    "kitchen_remodel": 25,
    "bathroom_remodel": 15,
    "bedroom_remodel": 10,
    "living_room_remodel": 10,
    "basement_finish": 20,
    "attic_conversion": 20,
    "whole_house_remodel": 50,
    "addition": 40,
    "deck_patio": 10,
    "garage": 15,
}

# Minimum included divisions by project type
MIN_DIVISIONS_BY_PROJECT: Dict[str, int] = {
    "kitchen_remodel": 7,
    "bathroom_remodel": 6,
    "bedroom_remodel": 4,
    "living_room_remodel": 4,
    "basement_finish": 7,
    "attic_conversion": 7,
    "whole_house_remodel": 10,
    "addition": 9,
    "deck_patio": 4,
    "garage": 6,
}

# CSI Division names
CSI_DIVISION_NAMES = {
    "01": "General Requirements",
    "02": "Existing Conditions",
    "03": "Concrete",
    "04": "Masonry",
    "05": "Metals",
    "06": "Wood, Plastics, and Composites",
    "07": "Thermal and Moisture Protection",
    "08": "Openings",
    "09": "Finishes",
    "10": "Specialties",
    "11": "Equipment",
    "12": "Furnishings",
    "13": "Special Construction",
    "14": "Conveying Equipment",
    "21": "Fire Suppression",
    "22": "Plumbing",
    "23": "HVAC",
    "25": "Integrated Automation",
    "26": "Electrical",
    "27": "Communications",
    "28": "Electronic Safety and Security",
    "31": "Earthwork",
    "32": "Exterior Improvements",
    "33": "Utilities",
}


# =============================================================================
# SCOPE CRITIC CLASS
# =============================================================================


class ScopeCritic(BaseCritic):
    """Critic for Scope Agent output.
    
    Only called when scorer returns score < 80.
    Provides detailed feedback on:
    - What issues were found
    - Why each issue is problematic
    - How to fix each issue
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize ScopeCritic.
        
        Args:
            firestore_service: Optional Firestore service instance.
            llm_service: Optional LLM service instance.
        """
        super().__init__(
            name="scope_critic",
            primary_agent_name="scope",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    def get_critique_prompt(self) -> str:
        """Get the system prompt for critique generation.
        
        Returns:
            System prompt for LLM critique.
        """
        base_prompt = self.get_base_critique_prompt()
        
        scope_specific = """
## Scope Agent Specific Criteria

Focus your critique on these Bill of Quantities requirements:

### 1. Cost Code Assignment
Every line item MUST have:
- A valid cost code (RSMeans format or CSI subdivision)
- A description matching the code
- A confidence score for the assignment

### 2. Quantity Completeness
All line items MUST have:
- Non-zero quantity values
- Appropriate units (SF, LF, EA, etc.)
- Quantities that make sense for the scope

### 3. Division Coverage
For project types, expected divisions:
- Kitchen remodel: 01, 02, 06, 08, 09, 10, 11, 12, 22, 26
- Bathroom remodel: 01, 02, 06, 08, 09, 10, 12, 22, 26
- General: 01 (General), 02 (Demo), 06 (Carpentry), 09 (Finishes), 26 (Electrical)

### 4. Estimate Reasonableness
Material costs and labor hours should be:
- Proportional to square footage
- Appropriate for finish level
- Within typical ranges for project type

### 5. Analysis Quality
The scope analysis must include:
- Substantive summary (30+ words)
- 3+ key observations
- 2+ recommendations
- Material highlights

### 6. Item Details
Each line item should have:
- Clear item description
- Specifications where applicable
- Primary trade assignment
- Material cost per unit
- Labor hours per unit

Be specific about which items are missing data and what values are needed.
"""
        return base_prompt + scope_specific
    
    async def analyze_output(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any],
        score: int,
        scorer_feedback: str
    ) -> Dict[str, Any]:
        """Analyze output for issues before LLM critique.
        
        This provides preliminary analysis that the LLM can enhance.
        
        Args:
            output: Scope agent output.
            input_data: Original input data.
            score: Scorer's numerical score.
            scorer_feedback: Feedback from the scorer.
            
        Returns:
            Dict with issues, why_wrong, how_to_fix.
        """
        issues: List[str] = []
        why_wrong: List[str] = []
        how_to_fix: List[str] = []
        
        # Get project type for context
        clarification = input_data.get("clarification_output", {})
        project_brief = clarification.get("projectBrief", {})
        project_type = project_brief.get("projectType", "other")
        
        # Analyze cost code coverage
        code_issues = self._analyze_cost_code_coverage(output)
        issues.extend(code_issues["issues"])
        why_wrong.extend(code_issues["why_wrong"])
        how_to_fix.extend(code_issues["how_to_fix"])
        
        # Analyze quantity completeness
        qty_issues = self._analyze_quantity_completeness(output)
        issues.extend(qty_issues["issues"])
        why_wrong.extend(qty_issues["why_wrong"])
        how_to_fix.extend(qty_issues["how_to_fix"])
        
        # Analyze division coverage
        div_issues = self._analyze_division_coverage(output, project_type)
        issues.extend(div_issues["issues"])
        why_wrong.extend(div_issues["why_wrong"])
        how_to_fix.extend(div_issues["how_to_fix"])
        
        # Analyze line item count
        item_issues = self._analyze_line_item_count(output, project_type)
        issues.extend(item_issues["issues"])
        why_wrong.extend(item_issues["why_wrong"])
        how_to_fix.extend(item_issues["how_to_fix"])
        
        # Analyze estimate reasonableness
        est_issues = self._analyze_estimate_reasonableness(output, input_data)
        issues.extend(est_issues["issues"])
        why_wrong.extend(est_issues["why_wrong"])
        how_to_fix.extend(est_issues["how_to_fix"])
        
        # Analyze analysis quality
        analysis_issues = self._analyze_analysis_quality(output)
        issues.extend(analysis_issues["issues"])
        why_wrong.extend(analysis_issues["why_wrong"])
        how_to_fix.extend(analysis_issues["how_to_fix"])
        
        # If no specific issues found, provide generic feedback
        if not issues:
            issues = [f"Overall score ({score}) below threshold (80)"]
            why_wrong = ["Bill of Quantities quality did not meet minimum standards"]
            how_to_fix = ["Review all divisions and ensure complete cost codes and quantities"]
        
        return {
            "issues": issues,
            "why_wrong": " ".join(why_wrong) if why_wrong else "Multiple quality issues detected",
            "how_to_fix": how_to_fix
        }
    
    def _analyze_cost_code_coverage(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze cost code coverage issues.
        
        Args:
            output: Scope agent output.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        completeness = output.get("completeness", {})
        coverage = completeness.get("costCodeCoverage", 0)
        all_have_codes = completeness.get("allItemsHaveCostCodes", False)
        
        if not all_have_codes and coverage < 0.90:
            issues.append(f"Cost code coverage is only {coverage:.0%}")
            why_wrong.append("Missing cost codes prevent accurate cost estimation.")
            how_to_fix.append("Assign cost codes to all line items using CSI MasterFormat or RSMeans codes")
        
        # Check individual divisions for missing codes
        divisions = output.get("divisions", [])
        items_missing_codes = []
        
        for div in divisions:
            if div.get("status") != "included":
                continue
            items = div.get("lineItems", [])
            for item in items:
                code = item.get("costCode", "")
                if not code or code.startswith("GEN-"):
                    items_missing_codes.append({
                        "id": item.get("id"),
                        "item": item.get("item"),
                        "division": div.get("divisionCode")
                    })
        
        if items_missing_codes:
            sample = items_missing_codes[:3]
            item_list = ", ".join([f"{i['id']}: {i['item'][:30]}..." for i in sample])
            issues.append(f"{len(items_missing_codes)} items have missing/generic cost codes")
            how_to_fix.append(f"Lookup cost codes for: {item_list}")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
    
    def _analyze_quantity_completeness(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze quantity completeness issues.
        
        Args:
            output: Scope agent output.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        completeness = output.get("completeness", {})
        all_have_qty = completeness.get("allItemsHaveQuantities", False)
        
        # Find items with zero or missing quantities
        divisions = output.get("divisions", [])
        zero_qty_items = []
        
        for div in divisions:
            if div.get("status") != "included":
                continue
            items = div.get("lineItems", [])
            for item in items:
                qty = item.get("quantity", 0)
                if qty <= 0:
                    zero_qty_items.append({
                        "id": item.get("id"),
                        "item": item.get("item"),
                        "division": div.get("divisionCode")
                    })
        
        if zero_qty_items:
            issues.append(f"{len(zero_qty_items)} items have zero or missing quantities")
            why_wrong.append("Zero quantities result in $0 cost estimates for actual scope items.")
            
            sample = zero_qty_items[:3]
            item_list = ", ".join([f"{i['id']}: {i['item'][:25]}..." for i in sample])
            how_to_fix.append(f"Add valid quantities for: {item_list}")
        
        # Check for unreasonable quantities
        for div in divisions:
            if div.get("status") != "included":
                continue
            for item in div.get("lineItems", []):
                qty = item.get("quantity", 0)
                unit = item.get("unit", "").upper()
                
                # Flag potentially wrong quantities
                if unit == "SF" and qty > 10000:
                    issues.append(f"Item {item.get('id')} has unusually high SF quantity: {qty}")
                    how_to_fix.append(f"Verify {item.get('item')} quantity of {qty} SF is correct")
                elif unit == "LF" and qty > 1000:
                    issues.append(f"Item {item.get('id')} has unusually high LF quantity: {qty}")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
    
    def _analyze_division_coverage(
        self,
        output: Dict[str, Any],
        project_type: str
    ) -> Dict[str, Any]:
        """Analyze division coverage issues.
        
        Args:
            output: Scope agent output.
            project_type: Type of project.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        # Expected divisions by project type
        expected_by_type = {
            "kitchen_remodel": ["01", "02", "06", "08", "09", "10", "11", "12", "22", "26"],
            "bathroom_remodel": ["01", "02", "06", "08", "09", "10", "12", "22", "26"],
            "bedroom_remodel": ["01", "02", "06", "08", "09", "26"],
            "living_room_remodel": ["01", "02", "06", "08", "09", "26"],
        }
        
        expected_divs = expected_by_type.get(project_type, ["01", "02", "06", "09", "26"])
        
        # Get included divisions
        divisions = output.get("divisions", [])
        included_codes = [
            div.get("divisionCode") for div in divisions
            if div.get("status") == "included"
        ]
        
        # Find missing expected divisions
        missing = [d for d in expected_divs if d not in included_codes]
        
        if missing:
            missing_names = [f"{d} ({CSI_DIVISION_NAMES.get(d, 'Unknown')})" for d in missing]
            issues.append(f"Missing expected divisions: {', '.join(missing_names)}")
            why_wrong.append(f"For {project_type}, these divisions are typically required.")
            how_to_fix.append(f"Add divisions {', '.join(missing)} with appropriate line items")
        
        # Check for divisions with no items
        empty_divs = [
            div.get("divisionCode") for div in divisions
            if div.get("status") == "included" and div.get("itemCount", 0) == 0
        ]
        
        if empty_divs:
            issues.append(f"Divisions {', '.join(empty_divs)} are included but have no line items")
            how_to_fix.append(f"Add line items to divisions: {', '.join(empty_divs)}")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
    
    def _analyze_line_item_count(
        self,
        output: Dict[str, Any],
        project_type: str
    ) -> Dict[str, Any]:
        """Analyze line item count issues.
        
        Args:
            output: Scope agent output.
            project_type: Type of project.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        min_items = MIN_LINE_ITEMS_BY_PROJECT.get(project_type, 10)
        total_items = output.get("totalLineItems", 0)
        
        if total_items < min_items:
            issues.append(f"Only {total_items} line items (expected {min_items}+ for {project_type})")
            why_wrong.append("Incomplete scope leads to underestimated costs.")
            how_to_fix.append(f"Add more line items. For {project_type}, include items for demo, materials, fixtures, finishes, and labor")
        
        if total_items == 0:
            issues.append("No line items in Bill of Quantities")
            why_wrong.append("Cannot generate cost estimate without line items.")
            how_to_fix.append("Extract line items from CSI scope divisions")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
    
    def _analyze_estimate_reasonableness(
        self,
        output: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze estimate reasonableness issues.
        
        Args:
            output: Scope agent output.
            input_data: Original input data.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        # Get context
        clarification = input_data.get("clarification_output", {})
        project_brief = clarification.get("projectBrief", {})
        scope_summary = project_brief.get("scopeSummary", {})
        total_sqft = scope_summary.get("totalSqft", 100)
        finish_level = scope_summary.get("finishLevel", "mid_range")
        
        if total_sqft <= 0:
            total_sqft = 100
        
        material_cost = output.get("preliminaryMaterialCost", 0)
        labor_hours = output.get("preliminaryLaborHours", 0)
        
        # Check material cost
        if material_cost <= 0:
            issues.append("No material costs calculated")
            why_wrong.append("Zero material costs indicates missing unit cost data.")
            how_to_fix.append("Ensure all line items have material_cost_per_unit values from cost codes")
        else:
            cost_per_sqft = material_cost / total_sqft
            expected_ranges = {
                "budget": (30, 100),
                "mid_range": (60, 200),
                "high_end": (100, 350),
                "luxury": (200, 500)
            }
            min_cost, max_cost = expected_ranges.get(finish_level, (50, 200))
            
            if cost_per_sqft < min_cost * 0.3:
                issues.append(f"Material costs very low: ${cost_per_sqft:.0f}/sqft")
                why_wrong.append(f"Expected ${min_cost}-${max_cost}/sqft for {finish_level} finish.")
                how_to_fix.append("Check that material cost_per_unit values are correct for each item")
            elif cost_per_sqft > max_cost * 2:
                issues.append(f"Material costs very high: ${cost_per_sqft:.0f}/sqft")
                how_to_fix.append("Verify quantities and unit costs are not duplicated")
        
        # Check labor hours
        if labor_hours <= 0:
            issues.append("No labor hours calculated")
            how_to_fix.append("Ensure all line items have labor_hours_per_unit values")
        else:
            hours_per_sqft = labor_hours / total_sqft
            if hours_per_sqft < 0.05:
                issues.append(f"Labor hours very low: {hours_per_sqft:.2f} hrs/sqft")
                how_to_fix.append("Add labor hour estimates for all scope items")
            elif hours_per_sqft > 3.0:
                issues.append(f"Labor hours very high: {hours_per_sqft:.2f} hrs/sqft")
                how_to_fix.append("Verify labor hours per unit are not inflated")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
    
    def _analyze_analysis_quality(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze scope analysis quality issues.
        
        Args:
            output: Scope agent output.
            
        Returns:
            Analysis results.
        """
        issues = []
        why_wrong = []
        how_to_fix = []
        
        analysis = output.get("analysis", {})
        summary = analysis.get("summary", "") or output.get("summary", "")
        key_observations = analysis.get("keyObservations", [])
        recommendations = analysis.get("recommendations", [])
        
        if not summary:
            issues.append("Scope summary is missing")
            how_to_fix.append("Generate a 2-3 sentence summary of the project scope")
        elif len(summary.split()) < 20:
            issues.append("Scope summary is too brief")
            how_to_fix.append("Expand summary to at least 30 words covering project type, scope, and complexity")
        
        if not key_observations:
            issues.append("Key observations are missing")
            how_to_fix.append("Add at least 3 key observations about the scope")
        elif len(key_observations) < 3:
            issues.append(f"Only {len(key_observations)} key observations (need 3+)")
            how_to_fix.append("Add more observations about material selections, complexity factors, and scope gaps")
        
        if not recommendations:
            issues.append("Recommendations are missing")
            how_to_fix.append("Add at least 2 recommendations for the project")
        elif len(recommendations) < 2:
            issues.append(f"Only {len(recommendations)} recommendation(s) (need 2+)")
            how_to_fix.append("Add recommendations about verification needs or scope additions")
        
        if issues:
            why_wrong.append("Incomplete analysis reduces the value of the Bill of Quantities.")
        
        return {"issues": issues, "why_wrong": why_wrong, "how_to_fix": how_to_fix}
