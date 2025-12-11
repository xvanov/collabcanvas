"""Timeline Agent for TrueCost.

Generates project timeline with tasks, dependencies, and critical path.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import time
import structlog

from agents.base_agent import BaseA2AAgent
from services.firestore_service import FirestoreService
from services.llm_service import LLMService
from models.timeline import (
    CriticalPath,
    DependencyType,
    Milestone,
    PhaseType,
    ProjectTimeline,
    TaskDependency,
    TaskPriority,
    TaskStatus,
    TimelineTask,
    TimelineSummary,
    WeatherImpact,
)

logger = structlog.get_logger()


# =============================================================================
# TIMELINE AGENT SYSTEM PROMPT
# =============================================================================


TIMELINE_AGENT_SYSTEM_PROMPT = """You are a construction scheduling expert for TrueCost.

Your role is to analyze scope and provide timeline insights:

## Analysis Focus
1. Validate task durations based on scope complexity
2. Identify potential scheduling conflicts
3. Assess weather impacts on schedule
4. Recommend schedule optimizations
5. Identify opportunities for parallel work

## Output Requirements
Provide analysis in this JSON format:
{
    "schedule_assessment": "Overall schedule feasibility",
    "duration_notes": ["note about specific durations"],
    "parallel_opportunities": ["tasks that could overlap"],
    "weather_considerations": ["seasonal/weather impacts"],
    "recommendations": ["scheduling recommendations"],
    "confidence_factors": ["what affects schedule confidence"]
}

## Best Practices
- Consider trade sequencing requirements
- Account for inspection wait times
- Factor in material lead times
- Consider crew availability
- Allow for weather buffers in appropriate seasons
"""


# =============================================================================
# DEFAULT TASK TEMPLATES BY PROJECT TYPE
# =============================================================================


KITCHEN_REMODEL_TASKS = [
    {"phase": PhaseType.PRECONSTRUCTION, "name": "Permits & Planning", "duration": 5, "trade": "general"},
    {"phase": PhaseType.DEMOLITION, "name": "Demolition", "duration": 2, "trade": "demolition"},
    {"phase": PhaseType.ROUGH_IN, "name": "Plumbing Rough-In", "duration": 2, "trade": "plumber"},
    {"phase": PhaseType.ROUGH_IN, "name": "Electrical Rough-In", "duration": 2, "trade": "electrician"},
    {"phase": PhaseType.FRAMING, "name": "Framing & Blocking", "duration": 1, "trade": "carpenter"},
    {"phase": PhaseType.DRYWALL, "name": "Drywall & Taping", "duration": 3, "trade": "drywall_installer"},
    {"phase": PhaseType.FINISH, "name": "Cabinet Installation", "duration": 3, "trade": "cabinet_installer"},
    {"phase": PhaseType.FINISH, "name": "Countertop Installation", "duration": 2, "trade": "countertop_installer"},
    {"phase": PhaseType.FIXTURES, "name": "Plumbing Fixtures", "duration": 1, "trade": "plumber"},
    {"phase": PhaseType.FIXTURES, "name": "Electrical Fixtures", "duration": 1, "trade": "electrician"},
    {"phase": PhaseType.FINISH, "name": "Backsplash & Finish", "duration": 2, "trade": "tile_setter"},
    {"phase": PhaseType.FINISH, "name": "Appliance Installation", "duration": 1, "trade": "appliance_installer"},
    {"phase": PhaseType.PUNCH_LIST, "name": "Punch List & Cleanup", "duration": 1, "trade": "general"},
    {"phase": PhaseType.FINAL_INSPECTION, "name": "Final Inspection", "duration": 1, "trade": "general"},
]

BATHROOM_REMODEL_TASKS = [
    {"phase": PhaseType.PRECONSTRUCTION, "name": "Permits & Planning", "duration": 5, "trade": "general"},
    {"phase": PhaseType.DEMOLITION, "name": "Demolition", "duration": 2, "trade": "demolition"},
    {"phase": PhaseType.ROUGH_IN, "name": "Plumbing Rough-In", "duration": 3, "trade": "plumber"},
    {"phase": PhaseType.ROUGH_IN, "name": "Electrical Rough-In", "duration": 2, "trade": "electrician"},
    {"phase": PhaseType.FRAMING, "name": "Framing & Blocking", "duration": 1, "trade": "carpenter"},
    {"phase": PhaseType.INSULATION, "name": "Waterproofing", "duration": 2, "trade": "tile_setter"},
    {"phase": PhaseType.DRYWALL, "name": "Drywall & Cement Board", "duration": 2, "trade": "drywall_installer"},
    {"phase": PhaseType.FINISH, "name": "Tile Installation", "duration": 4, "trade": "tile_setter"},
    {"phase": PhaseType.FINISH, "name": "Vanity & Countertop", "duration": 2, "trade": "cabinet_installer"},
    {"phase": PhaseType.FIXTURES, "name": "Plumbing Fixtures", "duration": 2, "trade": "plumber"},
    {"phase": PhaseType.FIXTURES, "name": "Electrical Fixtures", "duration": 1, "trade": "electrician"},
    {"phase": PhaseType.FINISH, "name": "Paint & Accessories", "duration": 2, "trade": "painter"},
    {"phase": PhaseType.PUNCH_LIST, "name": "Punch List & Cleanup", "duration": 1, "trade": "general"},
    {"phase": PhaseType.FINAL_INSPECTION, "name": "Final Inspection", "duration": 1, "trade": "general"},
]

DEFAULT_REMODEL_TASKS = [
    {"phase": PhaseType.PRECONSTRUCTION, "name": "Permits & Planning", "duration": 5, "trade": "general"},
    {"phase": PhaseType.DEMOLITION, "name": "Demolition & Prep", "duration": 3, "trade": "demolition"},
    {"phase": PhaseType.ROUGH_IN, "name": "Rough-In (Plumbing/Electrical)", "duration": 5, "trade": "general"},
    {"phase": PhaseType.FRAMING, "name": "Framing & Structural", "duration": 3, "trade": "carpenter"},
    {"phase": PhaseType.INSULATION, "name": "Insulation", "duration": 2, "trade": "insulation_installer"},
    {"phase": PhaseType.DRYWALL, "name": "Drywall", "duration": 4, "trade": "drywall_installer"},
    {"phase": PhaseType.FINISH, "name": "Finish Work", "duration": 7, "trade": "general"},
    {"phase": PhaseType.FIXTURES, "name": "Fixtures & Trim", "duration": 3, "trade": "general"},
    {"phase": PhaseType.PUNCH_LIST, "name": "Punch List", "duration": 2, "trade": "general"},
    {"phase": PhaseType.FINAL_INSPECTION, "name": "Final Inspection", "duration": 1, "trade": "general"},
]


class TimelineAgent(BaseA2AAgent):
    """Timeline Agent - generates project timeline with dependencies.
    
    Creates:
    - Task sequence based on scope and project type
    - Task dependencies (finish-to-start primarily)
    - Critical path analysis
    - Duration ranges (optimistic/pessimistic)
    - Weather impact assessment
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
            input_data: Input containing scope_output, location_output, cost_output.
            feedback: Optional critic feedback for retry.
            
        Returns:
            Project timeline with tasks and dependencies.
        """
        self._start_time = time.time()
        
        logger.info(
            "timeline_agent_running",
            estimate_id=estimate_id,
            has_feedback=feedback is not None
        )
        
        # Extract inputs
        scope_output = input_data.get("scope_output", {})
        location_output = input_data.get("location_output", {})
        cost_output = input_data.get("cost_output", {})
        clarification = input_data.get("clarification_output", {})
        
        # Get project type
        project_brief = clarification.get("projectBrief", {})
        project_type = project_brief.get("projectType", "renovation").lower()
        total_sqft = project_brief.get("scopeSummary", {}).get("totalSqft", 200)
        
        logger.info(
            "timeline_agent_inputs",
            estimate_id=estimate_id,
            project_type=project_type,
            total_sqft=total_sqft
        )
        
        # Get weather factors for scheduling
        weather = location_output.get("weatherFactors", {})
        seasonal_adjustment = weather.get("seasonalAdjustment", 1.0)
        winter_impact = weather.get("winterImpact", "low")
        
        # Calculate start date (2 weeks from now by default)
        start_date = datetime.now() + timedelta(days=14)
        
        # Select task template based on project type
        task_templates = self._get_task_templates(project_type)
        
        # Adjust durations based on project size
        size_factor = self._calculate_size_factor(total_sqft, project_type)
        
        # Apply feedback adjustments if retry
        if feedback:
            task_templates = self._apply_feedback(task_templates, feedback)
        
        # Generate tasks with scheduling
        tasks = self._generate_tasks(
            task_templates=task_templates,
            start_date=start_date,
            size_factor=size_factor,
            seasonal_adjustment=seasonal_adjustment
        )
        
        # Calculate critical path
        critical_path = self._calculate_critical_path(tasks)
        
        # Mark critical tasks
        for task in tasks:
            task.is_critical = task.id in critical_path.path_task_ids
            if task.is_critical:
                task.priority = TaskPriority.CRITICAL
        
        # Generate milestones
        milestones = self._generate_milestones(tasks)
        
        # Calculate weather impact
        weather_impact = self._calculate_weather_impact(
            tasks=tasks,
            winter_impact=winter_impact,
            seasonal_adjustment=seasonal_adjustment
        )
        
        # Calculate total durations
        total_duration = critical_path.total_duration
        end_date = self._calculate_end_date(tasks)
        calendar_days = (end_date - start_date).days
        
        # Generate summary
        summary = await self._generate_summary(
            tasks=tasks,
            total_duration=total_duration,
            calendar_days=calendar_days,
            project_type=project_type,
            weather_impact=weather_impact
        )
        
        # Build timeline model
        timeline = ProjectTimeline(
            estimate_id=estimate_id,
            project_start_date=start_date.isoformat(),
            project_end_date=end_date.isoformat(),
            tasks=tasks,
            milestones=milestones,
            critical_path=critical_path,
            total_duration_days=total_duration,
            total_calendar_days=calendar_days,
            duration_optimistic=int(total_duration * 0.85),
            duration_pessimistic=int(total_duration * 1.35),
            weather_impact=weather_impact,
            summary=summary,
            schedule_confidence=self._calculate_confidence(tasks, weather_impact)
        )
        
        # Convert to output format
        output = timeline.to_agent_output()
        
        # Save output to Firestore
        await self.firestore.save_agent_output(
            estimate_id=estimate_id,
            agent_name=self.name,
            output=output,
            summary=summary.headline,
            confidence=timeline.schedule_confidence,
            tokens_used=self._tokens_used,
            duration_ms=self.duration_ms
        )
        
        logger.info(
            "timeline_agent_completed",
            estimate_id=estimate_id,
            total_days=total_duration,
            task_count=len(tasks),
            critical_path_length=len(critical_path.path_task_ids),
            duration_ms=self.duration_ms
        )
        
        return output
    
    def _get_task_templates(self, project_type: str) -> List[Dict[str, Any]]:
        """Get task templates based on project type.
        
        Args:
            project_type: Type of project.
            
        Returns:
            List of task template dicts.
        """
        if "kitchen" in project_type:
            return KITCHEN_REMODEL_TASKS.copy()
        elif "bathroom" in project_type:
            return BATHROOM_REMODEL_TASKS.copy()
        else:
            return DEFAULT_REMODEL_TASKS.copy()
    
    def _calculate_size_factor(self, sqft: float, project_type: str) -> float:
        """Calculate duration adjustment factor based on project size.
        
        Args:
            sqft: Project square footage.
            project_type: Type of project.
            
        Returns:
            Duration multiplier (0.8 - 1.5).
        """
        # Base sizes by project type
        base_sizes = {
            "kitchen": 150,
            "bathroom": 75,
            "renovation": 500,
            "addition": 400,
        }
        
        # Find matching base
        base_sqft = 200
        for key, size in base_sizes.items():
            if key in project_type.lower():
                base_sqft = size
                break
        
        # Calculate factor (logarithmic scaling)
        ratio = sqft / base_sqft
        
        if ratio <= 0.5:
            return 0.85
        elif ratio <= 1.0:
            return 0.9 + (ratio - 0.5) * 0.2
        elif ratio <= 2.0:
            return 1.0 + (ratio - 1.0) * 0.25
        else:
            return min(1.5, 1.25 + (ratio - 2.0) * 0.1)
    
    def _apply_feedback(
        self,
        task_templates: List[Dict[str, Any]],
        feedback: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Apply critic feedback to task templates.
        
        Args:
            task_templates: Original templates.
            feedback: Critic feedback.
            
        Returns:
            Adjusted templates.
        """
        issues = feedback.get("issues", [])
        
        for issue in issues:
            issue_lower = issue.lower()
            
            # Adjust durations based on feedback
            if "too short" in issue_lower or "insufficient" in issue_lower:
                for template in task_templates:
                    template["duration"] = int(template["duration"] * 1.2)
            elif "too long" in issue_lower or "excessive" in issue_lower:
                for template in task_templates:
                    template["duration"] = max(1, int(template["duration"] * 0.85))
        
        return task_templates
    
    def _generate_tasks(
        self,
        task_templates: List[Dict[str, Any]],
        start_date: datetime,
        size_factor: float,
        seasonal_adjustment: float
    ) -> List[TimelineTask]:
        """Generate timeline tasks from templates.
        
        Args:
            task_templates: Task templates.
            start_date: Project start date.
            size_factor: Size-based duration multiplier.
            seasonal_adjustment: Weather-based duration multiplier.
            
        Returns:
            List of TimelineTask objects.
        """
        tasks = []
        current_date = start_date
        
        for i, template in enumerate(task_templates):
            task_id = f"task-{i + 1:02d}"
            
            # Calculate adjusted duration
            base_duration = template["duration"]
            adjusted_duration = max(1, int(base_duration * size_factor * seasonal_adjustment))
            
            # Create dependencies (sequential by default)
            dependencies = []
            if i > 0:
                dependencies.append(TaskDependency(
                    predecessor_id=f"task-{i:02d}",
                    dependency_type=DependencyType.FINISH_TO_START,
                    lag_days=0
                ))
            
            # Determine if weather-sensitive
            weather_sensitive = template["phase"] in [
                PhaseType.DEMOLITION,
                PhaseType.SITE_PREP,
                PhaseType.FOUNDATION,
            ]
            
            task = TimelineTask(
                id=task_id,
                name=template["name"],
                phase=template["phase"],
                primary_trade=template.get("trade", "general"),
                duration_days=adjusted_duration,
                start_date=current_date.isoformat(),
                end_date=(current_date + timedelta(days=adjusted_duration)).isoformat(),
                dependencies=dependencies,
                is_milestone=template["phase"] == PhaseType.FINAL_INSPECTION,
                weather_sensitive=weather_sensitive,
                labor_hours=adjusted_duration * 8,  # 8 hours per day
            )
            
            tasks.append(task)
            current_date = current_date + timedelta(days=adjusted_duration)
        
        return tasks
    
    def _calculate_critical_path(self, tasks: List[TimelineTask]) -> CriticalPath:
        """Calculate critical path through tasks.
        
        Simple implementation - assumes sequential tasks.
        Real implementation would use network analysis.
        
        Args:
            tasks: List of tasks.
            
        Returns:
            CriticalPath object.
        """
        # For sequential tasks, all are on critical path
        path_task_ids = [task.id for task in tasks]
        total_duration = sum(task.duration_days for task in tasks)
        
        # Identify bottlenecks (longest tasks)
        sorted_tasks = sorted(tasks, key=lambda t: t.duration_days, reverse=True)
        bottlenecks = [t.id for t in sorted_tasks[:3]]
        
        return CriticalPath(
            path_task_ids=path_task_ids,
            total_duration=total_duration,
            bottlenecks=bottlenecks
        )
    
    def _generate_milestones(self, tasks: List[TimelineTask]) -> List[Milestone]:
        """Generate project milestones from tasks.
        
        Args:
            tasks: List of tasks.
            
        Returns:
            List of Milestone objects.
        """
        milestones = []
        
        if not tasks:
            return milestones
        
        # Project Start
        milestones.append(Milestone(
            id="ms-1",
            name="Project Start",
            date=tasks[0].start_date,
            description="Project kickoff and mobilization"
        ))
        
        # Find rough-in completion
        rough_in_tasks = [t for t in tasks if t.phase == PhaseType.ROUGH_IN]
        if rough_in_tasks:
            milestones.append(Milestone(
                id="ms-2",
                name="Rough-In Complete",
                date=rough_in_tasks[-1].end_date,
                description="All rough-in work complete, ready for inspection",
                related_task_id=rough_in_tasks[-1].id,
                is_payment_milestone=True
            ))
        
        # Find finish phase start
        finish_tasks = [t for t in tasks if t.phase == PhaseType.FINISH]
        if finish_tasks:
            milestones.append(Milestone(
                id="ms-3",
                name="Finish Phase Start",
                date=finish_tasks[0].start_date,
                description="Beginning finish work",
                related_task_id=finish_tasks[0].id
            ))
        
        # Project Complete
        milestones.append(Milestone(
            id="ms-4",
            name="Project Complete",
            date=tasks[-1].end_date,
            description="Final inspection passed, project handover",
            related_task_id=tasks[-1].id,
            is_payment_milestone=True
        ))
        
        return milestones
    
    def _calculate_weather_impact(
        self,
        tasks: List[TimelineTask],
        winter_impact: str,
        seasonal_adjustment: float
    ) -> WeatherImpact:
        """Calculate weather impact on schedule.
        
        Args:
            tasks: List of tasks.
            winter_impact: Winter impact level (low/moderate/high).
            seasonal_adjustment: Seasonal multiplier.
            
        Returns:
            WeatherImpact object.
        """
        # Count weather-sensitive task days
        sensitive_days = sum(
            t.duration_days for t in tasks if t.weather_sensitive
        )
        
        # Calculate expected weather delays
        impact_multipliers = {"low": 0.05, "moderate": 0.15, "high": 0.25}
        impact_mult = impact_multipliers.get(winter_impact, 0.10)
        
        expected_delay = int(sensitive_days * impact_mult)
        buffer_days = max(2, expected_delay + 2)
        
        # Determine risk level
        if expected_delay > 5:
            risk_level = "high"
        elif expected_delay > 2:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Determine season
        now = datetime.now()
        month = now.month
        if month in [12, 1, 2]:
            season = "winter"
        elif month in [3, 4, 5]:
            season = "spring"
        elif month in [6, 7, 8]:
            season = "summer"
        else:
            season = "fall"
        
        return WeatherImpact(
            expected_weather_days=expected_delay,
            weather_buffer_days=buffer_days,
            season=season,
            weather_risk_level=risk_level,
            notes=f"Schedule accounts for {buffer_days} weather buffer days during {season}"
        )
    
    def _calculate_end_date(self, tasks: List[TimelineTask]) -> datetime:
        """Calculate project end date from tasks.
        
        Args:
            tasks: List of tasks.
            
        Returns:
            End datetime.
        """
        if not tasks:
            return datetime.now()
        
        last_task = tasks[-1]
        if last_task.end_date:
            return datetime.fromisoformat(last_task.end_date.replace("Z", ""))
        
        # Calculate from durations
        start = datetime.fromisoformat(tasks[0].start_date.replace("Z", ""))
        total_days = sum(t.duration_days for t in tasks)
        return start + timedelta(days=total_days)
    
    async def _generate_summary(
        self,
        tasks: List[TimelineTask],
        total_duration: int,
        calendar_days: int,
        project_type: str,
        weather_impact: WeatherImpact
    ) -> TimelineSummary:
        """Generate timeline summary.
        
        Args:
            tasks: List of tasks.
            total_duration: Total working days.
            calendar_days: Total calendar days.
            project_type: Type of project.
            weather_impact: Weather impact analysis.
            
        Returns:
            TimelineSummary object.
        """
        weeks = round(calendar_days / 7, 1)
        
        # Get key phases
        phases = list(set(t.phase.value for t in tasks))
        
        # Generate assumptions
        assumptions = [
            "Standard 5-day work week",
            "Normal weather conditions",
            "Materials available as scheduled",
            "Permits approved within standard timeframe",
            "Single crew per trade"
        ]
        
        # Generate risks
        risks = []
        if weather_impact.weather_risk_level == "high":
            risks.append(f"High weather risk during {weather_impact.season}")
        risks.append("Material lead times may vary")
        risks.append("Inspection delays possible")
        
        return TimelineSummary(
            headline=f"Project duration: {total_duration} working days ({weeks} weeks)",
            total_working_days=total_duration,
            total_calendar_days=calendar_days,
            weeks=weeks,
            key_phases=phases,
            assumptions=assumptions,
            risks=risks
        )
    
    def _calculate_confidence(
        self,
        tasks: List[TimelineTask],
        weather_impact: WeatherImpact
    ) -> float:
        """Calculate schedule confidence.
        
        Args:
            tasks: List of tasks.
            weather_impact: Weather impact analysis.
            
        Returns:
            Confidence score (0-1).
        """
        confidence = 0.80  # Base confidence
        
        # Reduce for weather risk
        if weather_impact.weather_risk_level == "high":
            confidence -= 0.10
        elif weather_impact.weather_risk_level == "medium":
            confidence -= 0.05
        
        # Increase for good task coverage
        if len(tasks) >= 10:
            confidence += 0.05
        
        return max(0.5, min(0.95, confidence))
