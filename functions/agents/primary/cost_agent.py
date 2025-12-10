"""Cost Agent stub for TrueCost.

Stub implementation for pipeline testing.
Real implementation will be added in PR #6.
"""

from typing import Dict, Any, Optional, List
import structlog

from agents.base_agent import BaseA2AAgent
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class CostAgent(BaseA2AAgent):
    """Cost Agent - calculates material, labor, and equipment costs.
    
    This is a stub implementation for pipeline testing.
    Real implementation in PR #6 will:
    - Look up unit costs from cost database
    - Calculate material costs: quantity × unit cost
    - Calculate labor costs with location rates
    - Apply overhead and profit percentages
    - Apply location factor adjustments
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize CostAgent."""
        super().__init__(
            name="cost",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    async def run(
        self,
        estimate_id: str,
        input_data: Dict[str, Any],
        feedback: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run cost calculation.
        
        Args:
            estimate_id: The estimate document ID.
            input_data: Input containing scope_output and location_output.
            feedback: Optional critic feedback for retry.
            
        Returns:
            Cost estimate breakdown.
        """
        logger.info(
            "cost_agent_running",
            estimate_id=estimate_id,
            has_feedback=feedback is not None
        )
        
        # Get previous agent outputs
        scope_output = input_data.get("scope_output", {})
        location_output = input_data.get("location_output", {})
        
        location_factor = location_output.get("locationFactor", 1.0)
        labor_rates = location_output.get("laborRates", {})
        
        # Calculate costs from BoQ
        line_items = []
        materials_total = 0.0
        labor_total = 0.0
        equipment_total = 0.0
        
        for division in scope_output.get("divisions", []):
            for item in division.get("lineItems", []):
                quantity = item.get("quantity", 1)
                unit_cost = item.get("unitCost", 50.0)
                labor_hours = item.get("laborHours", 1.0)
                
                material_cost = quantity * unit_cost
                labor_cost = labor_hours * quantity * labor_rates.get("general_labor", 35.0)
                
                line_items.append({
                    "description": item.get("description"),
                    "costCode": item.get("costCode"),
                    "quantity": quantity,
                    "unit": item.get("unit", "EA"),
                    "materialCost": round(material_cost, 2),
                    "laborCost": round(labor_cost, 2),
                    "totalCost": round(material_cost + labor_cost, 2)
                })
                
                materials_total += material_cost
                labor_total += labor_cost
        
        # Apply adjustments
        subtotal = materials_total + labor_total + equipment_total
        location_adjusted = subtotal * location_factor
        overhead = location_adjusted * 0.10  # 10% overhead
        profit = location_adjusted * 0.10    # 10% profit
        grand_total = location_adjusted + overhead + profit
        
        output = {
            "lineItems": line_items,
            "subtotals": {
                "materials": round(materials_total, 2),
                "labor": round(labor_total, 2),
                "equipment": round(equipment_total, 2),
                "subtotal": round(subtotal, 2)
            },
            "adjustments": {
                "locationFactor": location_factor,
                "locationAdjusted": round(location_adjusted, 2),
                "overhead": round(overhead, 2),
                "overheadPercent": 0.10,
                "profit": round(profit, 2),
                "profitPercent": 0.10
            },
            "total": round(grand_total, 2),
            "confidence": 0.85,
            "summary": f"Total estimate: ${grand_total:,.2f} ({len(line_items)} items)"
        }
        
        # Save output to Firestore
        await self.firestore.save_agent_output(
            estimate_id=estimate_id,
            agent_name=self.name,
            output=output,
            summary=output["summary"],
            confidence=output["confidence"],
            tokens_used=self._tokens_used,
            duration_ms=self.duration_ms
        )
        
        return output

