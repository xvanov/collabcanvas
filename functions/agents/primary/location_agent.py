"""Location Agent stub for TrueCost.

Stub implementation for pipeline testing.
Real implementation will be added in PR #4.
"""

from typing import Dict, Any, Optional
import structlog

from agents.base_agent import BaseA2AAgent
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class LocationAgent(BaseA2AAgent):
    """Location Agent - analyzes location factors for construction estimates.
    
    This is a stub implementation for pipeline testing.
    Real implementation in PR #4 will:
    - Extract zip code from ClarificationOutput
    - Look up labor rates, permit costs, weather factors
    - Determine union vs non-union market
    - Apply location multipliers
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize LocationAgent."""
        super().__init__(
            name="location",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    async def run(
        self,
        estimate_id: str,
        input_data: Dict[str, Any],
        feedback: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run location analysis.
        
        Args:
            estimate_id: The estimate document ID.
            input_data: Input containing clarification_output.
            feedback: Optional critic feedback for retry.
            
        Returns:
            Location factors dict.
        """
        logger.info(
            "location_agent_running",
            estimate_id=estimate_id,
            has_feedback=feedback is not None
        )
        
        # Extract location from clarification output
        clarification = input_data.get("clarification_output", {})
        project_brief = clarification.get("projectBrief", {})
        location = project_brief.get("location", {})
        
        zip_code = location.get("zipCode", "00000")
        city = location.get("city", "Unknown")
        state = location.get("state", "XX")
        
        # Return stub location factors
        # Real implementation will call cost data service
        output = {
            "zipCode": zip_code,
            "city": city,
            "state": state,
            "region": self._get_region(state),
            "laborRates": {
                "electrician": 55.0,
                "plumber": 60.0,
                "carpenter": 45.0,
                "hvac": 58.0,
                "general_labor": 35.0,
                "painter": 40.0,
                "tile_setter": 50.0
            },
            "isUnion": self._is_union_market(state),
            "permitCosts": {
                "buildingPermit": 500,
                "electricalPermit": 150,
                "plumbingPermit": 150,
                "mechanicalPermit": 100
            },
            "locationFactor": self._get_location_factor(state),
            "weatherFactors": {
                "winterImpact": "moderate",
                "seasonalAdjustment": 1.0
            },
            "summary": f"Location analysis for {city}, {state} ({zip_code})"
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
    
    def _get_region(self, state: str) -> str:
        """Get region for state."""
        regions = {
            "CO": "Mountain", "WY": "Mountain", "MT": "Mountain",
            "NY": "Northeast", "NJ": "Northeast", "CT": "Northeast",
            "CA": "Pacific", "WA": "Pacific", "OR": "Pacific",
            "TX": "South", "FL": "South", "GA": "South",
            "IL": "Midwest", "OH": "Midwest", "MI": "Midwest"
        }
        return regions.get(state, "National")
    
    def _is_union_market(self, state: str) -> bool:
        """Check if state is typically union."""
        union_states = {"NY", "NJ", "IL", "CA", "WA", "MA", "CT"}
        return state in union_states
    
    def _get_location_factor(self, state: str) -> float:
        """Get location cost factor."""
        factors = {
            "NY": 1.25, "CA": 1.20, "WA": 1.15,
            "CO": 1.05, "TX": 0.95, "FL": 0.98
        }
        return factors.get(state, 1.0)

