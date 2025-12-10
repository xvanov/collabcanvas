"""Scope Agent stub for TrueCost.

Stub implementation for pipeline testing.
Real implementation will be added in PR #5.
"""

from typing import Dict, Any, Optional, List
import structlog

from agents.base_agent import BaseA2AAgent
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class ScopeAgent(BaseA2AAgent):
    """Scope Agent - enriches Bill of Quantities with cost codes.
    
    This is a stub implementation for pipeline testing.
    Real implementation in PR #5 will:
    - Read csiScope from ClarificationOutput
    - Map line items to RSMeans cost codes
    - Validate quantities against CAD data
    - Check completeness for project type
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize ScopeAgent."""
        super().__init__(
            name="scope",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    async def run(
        self,
        estimate_id: str,
        input_data: Dict[str, Any],
        feedback: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run scope enrichment.
        
        Args:
            estimate_id: The estimate document ID.
            input_data: Input containing clarification_output and location_output.
            feedback: Optional critic feedback for retry.
            
        Returns:
            Enriched Bill of Quantities.
        """
        logger.info(
            "scope_agent_running",
            estimate_id=estimate_id,
            has_feedback=feedback is not None
        )
        
        # Extract CSI scope from clarification output
        clarification = input_data.get("clarification_output", {})
        csi_scope = clarification.get("csiScope", {})
        
        # Process divisions and enrich with cost codes
        divisions = []
        total_items = 0
        
        for div_key, div_data in csi_scope.items():
            if div_data.get("status") == "included":
                div_num = div_key.split("_")[0].replace("div", "")
                enriched_items = self._enrich_line_items(
                    div_data.get("lineItems", []),
                    div_num
                )
                
                if enriched_items:
                    divisions.append({
                        "division": div_num,
                        "name": self._get_division_name(div_num),
                        "lineItems": enriched_items
                    })
                    total_items += len(enriched_items)
        
        output = {
            "divisions": divisions,
            "totalLineItems": total_items,
            "totalDivisions": len(divisions),
            "completeness": {
                "allItemsHaveCostCodes": True,
                "allItemsHaveQuantities": True,
                "warnings": []
            },
            "summary": f"Enriched {total_items} line items across {len(divisions)} divisions"
        }
        
        # Save output to Firestore
        await self.firestore.save_agent_output(
            estimate_id=estimate_id,
            agent_name=self.name,
            output=output,
            summary=output["summary"],
            confidence=0.90,
            tokens_used=self._tokens_used,
            duration_ms=self.duration_ms
        )
        
        return output
    
    def _enrich_line_items(
        self,
        items: List[Dict[str, Any]],
        division: str
    ) -> List[Dict[str, Any]]:
        """Enrich line items with cost codes."""
        enriched = []
        for item in items:
            enriched.append({
                **item,
                "costCode": f"{division}-{len(enriched) + 1:04d}",
                "unitCost": self._estimate_unit_cost(item),
                "laborHours": self._estimate_labor_hours(item)
            })
        return enriched
    
    def _estimate_unit_cost(self, item: Dict[str, Any]) -> float:
        """Estimate unit cost based on description."""
        desc = item.get("description", "").lower()
        
        # Simple heuristics for stub
        if "cabinet" in desc:
            return 250.0
        elif "countertop" in desc or "granite" in desc:
            return 85.0
        elif "tile" in desc:
            return 12.0
        elif "paint" in desc:
            return 2.5
        elif "electrical" in desc or "outlet" in desc:
            return 75.0
        elif "plumbing" in desc or "fixture" in desc:
            return 150.0
        return 50.0
    
    def _estimate_labor_hours(self, item: Dict[str, Any]) -> float:
        """Estimate labor hours per unit."""
        unit = item.get("unit", "EA")
        if unit == "SF":
            return 0.1
        elif unit == "LF":
            return 0.5
        return 1.0
    
    def _get_division_name(self, div_num: str) -> str:
        """Get CSI division name."""
        names = {
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
            "22": "Plumbing",
            "23": "HVAC",
            "26": "Electrical"
        }
        return names.get(div_num, f"Division {div_num}")

