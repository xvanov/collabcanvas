"""Timeline Agent stub for TrueCost.

Stub implementation for pipeline testing.
Real implementation will be added in PR #7.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import structlog

from agents.base_agent import BaseA2AAgent
from services.firestore_service import FirestoreService
from services.llm_service import LLMService

logger = structlog.get_logger()


class TimelineAgent(BaseA2AAgent):
    """Timeline Agent - generates project timeline with dependencies.
    
    This is a stub implementation for pipeline testing.
    Real implementation in PR #7 will:
    - Calculate task durations from scope
    - Create task dependencies
    - Identify critical path
    - Account for weather and seasonal factors
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize TimelineAgent."""
        super().__init__(
            name="timeline",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    async def run(
        self,
        estimate_id: str,
        input_data: Dict[str, Any],
        feedback: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run timeline generation.
        
        Args:
            estimate_id: The estimate document ID.
            input_data: Input containing scope_output, cost_output.
            feedback: Optional critic feedback for retry.
            
        Returns:
            Project timeline with tasks and dependencies.
        """
        logger.info(
            "timeline_agent_running",
            estimate_id=estimate_id,
            has_feedback=feedback is not None
        )
        
        # Get scope to determine task complexity
        scope_output = input_data.get("scope_output", {})
        total_items = scope_output.get("totalLineItems", 10)
        
        # Generate stub timeline
        start_date = datetime.now() + timedelta(days=14)  # Start in 2 weeks
        
        tasks = [
            {
                "id": "task-1",
                "name": "Permits & Planning",
                "duration": 5,
                "start": start_date.isoformat(),
                "end": (start_date + timedelta(days=5)).isoformat(),
                "dependencies": [],
                "milestone": False
            },
            {
                "id": "task-2",
                "name": "Demolition & Prep",
                "duration": 3,
                "start": (start_date + timedelta(days=5)).isoformat(),
                "end": (start_date + timedelta(days=8)).isoformat(),
                "dependencies": ["task-1"],
                "milestone": False
            },
            {
                "id": "task-3",
                "name": "Rough-In (Electrical/Plumbing)",
                "duration": 5,
                "start": (start_date + timedelta(days=8)).isoformat(),
                "end": (start_date + timedelta(days=13)).isoformat(),
                "dependencies": ["task-2"],
                "milestone": False
            },
            {
                "id": "task-4",
                "name": "Framing & Drywall",
                "duration": 4,
                "start": (start_date + timedelta(days=13)).isoformat(),
                "end": (start_date + timedelta(days=17)).isoformat(),
                "dependencies": ["task-3"],
                "milestone": False
            },
            {
                "id": "task-5",
                "name": "Finish Work",
                "duration": 7,
                "start": (start_date + timedelta(days=17)).isoformat(),
                "end": (start_date + timedelta(days=24)).isoformat(),
                "dependencies": ["task-4"],
                "milestone": False
            },
            {
                "id": "task-6",
                "name": "Final Inspection",
                "duration": 1,
                "start": (start_date + timedelta(days=24)).isoformat(),
                "end": (start_date + timedelta(days=25)).isoformat(),
                "dependencies": ["task-5"],
                "milestone": True
            }
        ]
        
        total_duration = sum(t["duration"] for t in tasks)
        
        output = {
            "tasks": tasks,
            "totalDuration": total_duration,
            "startDate": start_date.isoformat(),
            "endDate": (start_date + timedelta(days=total_duration)).isoformat(),
            "criticalPath": ["task-1", "task-2", "task-3", "task-4", "task-5", "task-6"],
            "milestones": [
                {
                    "name": "Project Start",
                    "date": start_date.isoformat()
                },
                {
                    "name": "Rough-In Complete",
                    "date": (start_date + timedelta(days=13)).isoformat()
                },
                {
                    "name": "Project Complete",
                    "date": (start_date + timedelta(days=25)).isoformat()
                }
            ],
            "assumptions": [
                "No major weather delays",
                "Materials available as scheduled",
                "Permits approved within standard timeframe"
            ],
            "summary": f"Project duration: {total_duration} days ({len(tasks)} tasks)"
        }
        
        # Save output to Firestore
        await self.firestore.save_agent_output(
            estimate_id=estimate_id,
            agent_name=self.name,
            output=output,
            summary=output["summary"],
            confidence=0.75,
            tokens_used=self._tokens_used,
            duration_ms=self.duration_ms
        )
        
        return output

