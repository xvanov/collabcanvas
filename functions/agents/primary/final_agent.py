"""Final Agent for TrueCost.

Synthesizes all previous agent outputs into a comprehensive
final estimate with executive summary.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import time
import structlog

from agents.base_agent import BaseA2AAgent
from services.firestore_service import FirestoreService
from services.llm_service import LLMService
from models.final_estimate import (
    ConfidenceRange,
    CostBreakdownSummary,
    EstimateConfidence,
    ExecutiveSummary,
    FinalEstimate,
    ProjectComplexity,
    Recommendation,
    RiskSummaryForEstimate,
    TimelineSummaryForEstimate,
)

logger = structlog.get_logger()


# =============================================================================
# FINAL AGENT SYSTEM PROMPT
# =============================================================================


FINAL_AGENT_SYSTEM_PROMPT = """You are a senior construction estimator preparing a final estimate report.

Your role is to synthesize all analysis into actionable recommendations:

## Analysis Focus
1. Review cost, risk, and timeline data for consistency
2. Identify opportunities for cost savings
3. Recommend value engineering options
4. Highlight key decision points for the client
5. Provide clear next steps

## Output Requirements
Provide analysis in this JSON format:
{
    "executive_insights": ["key insight 1", "key insight 2"],
    "recommendations": [
        {
            "category": "cost|schedule|risk",
            "title": "Brief title",
            "description": "Detailed recommendation",
            "priority": "high|medium|low",
            "potential_savings": 0
        }
    ],
    "value_engineering_options": ["option 1", "option 2"],
    "key_assumptions": ["assumption 1", "assumption 2"],
    "exclusions": ["exclusion 1", "exclusion 2"],
    "next_steps": ["step 1", "step 2"]
}

## Best Practices
- Present total cost prominently with confidence range
- Explain what contingency covers
- Recommend payment milestones aligned with schedule
- Highlight any unusual risks or costs
- Provide clear disclaimers about estimate accuracy
"""


# Standard disclaimers
STANDARD_DISCLAIMERS = [
    "This estimate is based on information provided and current market conditions. "
    "Actual costs may vary based on final specifications and unforeseen conditions.",
    "Pricing is valid for 30 days from estimate date.",
    "This estimate assumes normal site access and working conditions.",
    "All work to be performed in compliance with local building codes and permits.",
    "Client-requested changes during construction may affect cost and schedule."
]


class FinalAgent(BaseA2AAgent):
    """Final Agent - synthesizes final estimate with executive summary.
    
    Aggregates outputs from all previous agents:
    - Location factors
    - Scope (Bill of Quantities)
    - Cost estimate with P50/P80/P90
    - Risk analysis and contingency
    - Timeline with milestones
    
    Produces comprehensive estimate report.
    """
    
    def __init__(
        self,
        firestore_service: Optional[FirestoreService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """Initialize FinalAgent."""
        super().__init__(
            name="final",
            firestore_service=firestore_service,
            llm_service=llm_service
        )
    
    async def run(
        self,
        estimate_id: str,
        input_data: Dict[str, Any],
        feedback: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run final synthesis.
        
        Args:
            estimate_id: The estimate document ID.
            input_data: Input containing all previous agent outputs.
            feedback: Optional critic feedback for retry.
            
        Returns:
            Final estimate with executive summary.
        """
        self._start_time = time.time()
        
        logger.info(
            "final_agent_running",
            estimate_id=estimate_id,
            has_feedback=feedback is not None
        )
        
        # Extract all previous outputs
        clarification = input_data.get("clarification_output", {})
        location_output = input_data.get("location_output", {})
        scope_output = input_data.get("scope_output", {})
        cost_output = input_data.get("cost_output", {})
        risk_output = input_data.get("risk_output", {})
        timeline_output = input_data.get("timeline_output", {})
        
        logger.info(
            "final_agent_inputs",
            estimate_id=estimate_id,
            has_location=bool(location_output),
            has_scope=bool(scope_output),
            has_cost=bool(cost_output),
            has_risk=bool(risk_output),
            has_timeline=bool(timeline_output)
        )
        
        # Extract project info
        project_brief = clarification.get("projectBrief", {})
        location = project_brief.get("location", {})
        scope_summary = project_brief.get("scopeSummary", {})
        
        # Build cost breakdown
        cost_breakdown = self._build_cost_breakdown(cost_output, risk_output)
        
        # Build confidence range from risk analysis
        confidence_range = self._build_confidence_range(risk_output, cost_output)
        
        # Build executive summary
        executive_summary = self._build_executive_summary(
            project_brief=project_brief,
            location=location,
            scope_summary=scope_summary,
            cost_breakdown=cost_breakdown,
            confidence_range=confidence_range,
            timeline_output=timeline_output
        )
        
        # Build timeline summary
        timeline_summary = self._build_timeline_summary(timeline_output)
        
        # Build risk summary
        risk_summary = self._build_risk_summary(risk_output)
        
        # Get LLM recommendations
        llm_analysis = await self._get_llm_analysis(
            project_brief=project_brief,
            cost_breakdown=cost_breakdown,
            risk_output=risk_output,
            timeline_output=timeline_output
        )
        
        # Build recommendations
        recommendations = self._build_recommendations(llm_analysis)
        
        # Calculate data quality
        data_completeness = self._calculate_data_completeness(
            location_output, scope_output, cost_output, risk_output, timeline_output
        )
        
        # Determine overall confidence
        estimate_confidence = self._determine_confidence_level(
            data_completeness=data_completeness,
            risk_level=risk_output.get("riskLevel", "medium"),
            cost_confidence=cost_output.get("confidence", 0.75)
        )
        
        # Build final estimate
        final_estimate = FinalEstimate(
            estimate_id=estimate_id,
            executive_summary=executive_summary,
            cost_breakdown=cost_breakdown,
            timeline_summary=timeline_summary,
            risk_summary=risk_summary,
            recommendations=recommendations,
            key_assumptions=llm_analysis.get("key_assumptions", [
                "Standard working hours (no overtime)",
                "Materials at current market prices",
                "Normal site access and conditions",
                "Permits approved within standard timeframe"
            ]),
            exclusions=llm_analysis.get("exclusions", [
                "Furniture and decor",
                "Landscaping",
                "Financing costs",
                "Owner's contingency"
            ]),
            disclaimers=STANDARD_DISCLAIMERS[:3],
            data_completeness=data_completeness,
            cost_data_quality="high" if data_completeness > 0.8 else "medium",
            summary_headline=self._generate_headline(
                executive_summary, timeline_summary
            )
        )
        
        # Convert to output format
        output = final_estimate.to_agent_output()
        
        # Add status update flag
        output["estimateComplete"] = True
        
        # Calculate overall confidence
        confidence = min(0.95, data_completeness + 0.1)
        
        # Save output to Firestore
        await self.firestore.save_agent_output(
            estimate_id=estimate_id,
            agent_name=self.name,
            output=output,
            summary=final_estimate.summary_headline,
            confidence=confidence,
            tokens_used=self._tokens_used,
            duration_ms=self.duration_ms
        )
        
        logger.info(
            "final_agent_completed",
            estimate_id=estimate_id,
            total_cost=executive_summary.total_cost,
            duration_days=executive_summary.duration_days,
            confidence=estimate_confidence.value,
            duration_ms=self.duration_ms
        )
        
        return output
    
    def _build_cost_breakdown(
        self,
        cost_output: Dict[str, Any],
        risk_output: Dict[str, Any]
    ) -> CostBreakdownSummary:
        """Build cost breakdown summary.
        
        Args:
            cost_output: Cost Agent output.
            risk_output: Risk Agent output.
            
        Returns:
            CostBreakdownSummary object.
        """
        subtotals = cost_output.get("subtotals", {})
        adjustments = cost_output.get("adjustments", {})
        
        # Extract material costs (P50 values)
        materials = subtotals.get("materials", {})
        if isinstance(materials, dict):
            material_cost = materials.get("low", 0)
        else:
            material_cost = float(materials) if materials else 0
        
        labor = subtotals.get("labor", {})
        if isinstance(labor, dict):
            labor_cost = labor.get("low", 0)
        else:
            labor_cost = float(labor) if labor else 0
        
        equipment = subtotals.get("equipment", {})
        if isinstance(equipment, dict):
            equipment_cost = equipment.get("low", 0)
        else:
            equipment_cost = float(equipment) if equipment else 0
        
        # Calculate direct costs subtotal
        direct_costs = material_cost + labor_cost + equipment_cost
        
        # Get overhead and profit
        overhead = adjustments.get("overhead", {})
        if isinstance(overhead, dict):
            overhead_amount = overhead.get("low", 0)
        else:
            overhead_amount = float(overhead) if overhead else 0
        
        profit = adjustments.get("profit", {})
        if isinstance(profit, dict):
            profit_amount = profit.get("low", 0)
        else:
            profit_amount = float(profit) if profit else 0
        
        # Get contingency from risk analysis
        contingency_info = risk_output.get("contingency", {})
        contingency_pct = contingency_info.get("recommended", 10)
        contingency_amount = contingency_info.get("dollarAmount", 0)
        
        # Get permits
        permits = adjustments.get("permitCosts", {})
        if isinstance(permits, dict):
            permit_cost = permits.get("low", 0)
        else:
            permit_cost = float(permits) if permits else 0
        
        # Get taxes
        tax = adjustments.get("tax", {})
        if isinstance(tax, dict):
            tax_amount = tax.get("low", 0)
        else:
            tax_amount = float(tax) if tax else 0
        
        # Calculate totals
        total_before_contingency = (
            direct_costs + overhead_amount + profit_amount + permit_cost + tax_amount
        )
        total_with_contingency = total_before_contingency + contingency_amount
        
        return CostBreakdownSummary(
            materials=round(material_cost, 2),
            labor=round(labor_cost, 2),
            equipment=round(equipment_cost, 2),
            direct_costs_subtotal=round(direct_costs, 2),
            overhead=round(overhead_amount, 2),
            profit=round(profit_amount, 2),
            contingency=round(contingency_amount, 2),
            contingency_percentage=contingency_pct,
            permits=round(permit_cost, 2),
            taxes=round(tax_amount, 2),
            total_before_contingency=round(total_before_contingency, 2),
            total_with_contingency=round(total_with_contingency, 2)
        )
    
    def _build_confidence_range(
        self,
        risk_output: Dict[str, Any],
        cost_output: Dict[str, Any]
    ) -> ConfidenceRange:
        """Build confidence range from Monte Carlo results.
        
        Args:
            risk_output: Risk Agent output.
            cost_output: Cost Agent output.
            
        Returns:
            ConfidenceRange object.
        """
        mc = risk_output.get("monteCarlo", {})
        
        p50 = mc.get("p50", 0)
        p80 = mc.get("p80", 0)
        p90 = mc.get("p90", 0)
        
        # Fallback to cost output if risk not available
        if not p50:
            total = cost_output.get("total", {})
            if isinstance(total, dict):
                p50 = total.get("low", 0)
                p80 = total.get("medium", p50 * 1.15)
                p90 = total.get("high", p50 * 1.25)
            else:
                p50 = float(total) if total else 0
                p80 = p50 * 1.15
                p90 = p50 * 1.25
        
        # Calculate spread percentage
        spread_pct = ((p90 - p50) / p50 * 100) if p50 > 0 else 0
        
        return ConfidenceRange(
            p50=round(p50, 2),
            p80=round(p80, 2),
            p90=round(p90, 2),
            likely_range_low=round(p50, 2),
            likely_range_high=round(p90, 2),
            range_spread_percentage=round(spread_pct, 1)
        )
    
    def _build_executive_summary(
        self,
        project_brief: Dict[str, Any],
        location: Dict[str, Any],
        scope_summary: Dict[str, Any],
        cost_breakdown: CostBreakdownSummary,
        confidence_range: ConfidenceRange,
        timeline_output: Dict[str, Any]
    ) -> ExecutiveSummary:
        """Build executive summary.
        
        Args:
            project_brief: Project brief from clarification.
            location: Location info.
            scope_summary: Scope summary.
            cost_breakdown: Cost breakdown.
            confidence_range: Confidence range.
            timeline_output: Timeline output.
            
        Returns:
            ExecutiveSummary object.
        """
        project_type = project_brief.get("projectType", "renovation")
        city = location.get("city", "Unknown")
        state = location.get("state", "XX")
        sqft = scope_summary.get("totalSqft", 0)
        finish_level = scope_summary.get("finishLevel", "mid-range")
        
        # Get timeline info
        duration_days = timeline_output.get("totalDuration", 30)
        start_date = timeline_output.get("startDate", "")
        end_date = timeline_output.get("endDate", "")
        
        # Calculate cost per sqft
        cost_per_sqft = (
            cost_breakdown.total_with_contingency / sqft
            if sqft > 0 else 0
        )
        
        return ExecutiveSummary(
            project_type=project_type,
            project_location=f"{city}, {state}",
            project_size_sqft=sqft,
            finish_level=finish_level,
            total_cost=cost_breakdown.total_with_contingency,
            base_cost=cost_breakdown.total_before_contingency,
            contingency_amount=cost_breakdown.contingency,
            contingency_percentage=cost_breakdown.contingency_percentage,
            cost_per_sqft=round(cost_per_sqft, 2),
            confidence_range=confidence_range,
            duration_days=duration_days,
            duration_weeks=round(duration_days / 5, 1),  # Working days to weeks
            start_date=start_date,
            end_date=end_date,
            estimate_confidence=EstimateConfidence.MEDIUM,
            project_complexity=ProjectComplexity.MODERATE
        )
    
    def _build_timeline_summary(
        self,
        timeline_output: Dict[str, Any]
    ) -> TimelineSummaryForEstimate:
        """Build timeline summary for estimate.
        
        Args:
            timeline_output: Timeline Agent output.
            
        Returns:
            TimelineSummaryForEstimate object.
        """
        milestones = timeline_output.get("milestones", [])
        key_milestones = [
            {"name": m.get("name", ""), "date": m.get("date", "")}
            for m in milestones[:4]
        ]
        
        duration_range = timeline_output.get("durationRange", {})
        
        return TimelineSummaryForEstimate(
            total_duration_days=timeline_output.get("totalDuration", 30),
            total_weeks=round(timeline_output.get("totalDuration", 30) / 5, 1),
            start_date=timeline_output.get("startDate", ""),
            end_date=timeline_output.get("endDate", ""),
            key_milestones=key_milestones,
            duration_optimistic=duration_range.get("optimistic", 0),
            duration_pessimistic=duration_range.get("pessimistic", 0)
        )
    
    def _build_risk_summary(
        self,
        risk_output: Dict[str, Any]
    ) -> RiskSummaryForEstimate:
        """Build risk summary for estimate.
        
        Args:
            risk_output: Risk Agent output.
            
        Returns:
            RiskSummaryForEstimate object.
        """
        top_risks = risk_output.get("topRisks", [])
        risk_names = [r.get("item", r.get("name", "")) for r in top_risks[:5]]
        
        contingency = risk_output.get("contingency", {})
        
        recommendations = risk_output.get("recommendations", [])
        mitigation = [
            r.get("action", str(r)) if isinstance(r, dict) else str(r)
            for r in recommendations[:3]
        ]
        
        return RiskSummaryForEstimate(
            risk_level=risk_output.get("riskLevel", "Medium"),
            top_risks=risk_names,
            contingency_rationale=contingency.get("rationale", "Based on P80 confidence level"),
            mitigation_strategies=mitigation
        )
    
    async def _get_llm_analysis(
        self,
        project_brief: Dict[str, Any],
        cost_breakdown: CostBreakdownSummary,
        risk_output: Dict[str, Any],
        timeline_output: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get LLM analysis for recommendations.
        
        Args:
            project_brief: Project brief.
            cost_breakdown: Cost breakdown.
            risk_output: Risk output.
            timeline_output: Timeline output.
            
        Returns:
            LLM analysis dict.
        """
        try:
            prompt = self._build_llm_prompt(
                project_brief, cost_breakdown, risk_output, timeline_output
            )
            
            response = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=FINAL_AGENT_SYSTEM_PROMPT
            )
            
            self._tokens_used += response.get("tokens_used", 0)
            return response.get("content", {})
            
        except Exception as e:
            logger.warning("llm_analysis_failed", error=str(e))
            return self._generate_default_analysis()
    
    def _build_llm_prompt(
        self,
        project_brief: Dict[str, Any],
        cost_breakdown: CostBreakdownSummary,
        risk_output: Dict[str, Any],
        timeline_output: Dict[str, Any]
    ) -> str:
        """Build prompt for LLM analysis.
        
        Args:
            project_brief: Project brief.
            cost_breakdown: Cost breakdown.
            risk_output: Risk output.
            timeline_output: Timeline output.
            
        Returns:
            Formatted prompt string.
        """
        return f"""Generate recommendations for this construction estimate:

## Project
- Type: {project_brief.get('projectType', 'renovation')}
- Size: {project_brief.get('scopeSummary', {}).get('totalSqft', 0)} sqft
- Finish Level: {project_brief.get('scopeSummary', {}).get('finishLevel', 'mid-range')}

## Cost Summary
- Materials: ${cost_breakdown.materials:,.0f}
- Labor: ${cost_breakdown.labor:,.0f}
- Total with Contingency: ${cost_breakdown.total_with_contingency:,.0f}
- Contingency: {cost_breakdown.contingency_percentage:.0f}%

## Risk Level: {risk_output.get('riskLevel', 'Medium')}

## Timeline: {timeline_output.get('totalDuration', 30)} days

Please provide recommendations in the required JSON format."""
    
    def _generate_default_analysis(self) -> Dict[str, Any]:
        """Generate default analysis if LLM fails.
        
        Returns:
            Default analysis dict.
        """
        return {
            "executive_insights": [
                "Estimate based on current market conditions",
                "Contingency covers identified project risks"
            ],
            "recommendations": [
                {
                    "category": "cost",
                    "title": "Lock in material prices early",
                    "description": "Consider early procurement to lock in prices",
                    "priority": "medium",
                    "potential_savings": 0
                },
                {
                    "category": "schedule",
                    "title": "Book contractors early",
                    "description": "Secure contractor commitments to ensure availability",
                    "priority": "high"
                },
                {
                    "category": "risk",
                    "title": "Maintain contingency buffer",
                    "description": "Do not allocate contingency to known costs",
                    "priority": "high"
                }
            ],
            "value_engineering_options": [
                "Consider alternative material grades",
                "Bundle trade work for efficiency"
            ],
            "key_assumptions": [
                "Standard working hours",
                "Current material prices",
                "Normal site conditions"
            ],
            "exclusions": [
                "Furniture and decor",
                "Landscaping",
                "Financing costs"
            ],
            "next_steps": [
                "Review estimate with client",
                "Obtain contractor bids",
                "Finalize scope details"
            ]
        }
    
    def _build_recommendations(
        self,
        llm_analysis: Dict[str, Any]
    ) -> List[Recommendation]:
        """Build recommendation objects from LLM analysis.
        
        Args:
            llm_analysis: LLM analysis output.
            
        Returns:
            List of Recommendation objects.
        """
        recs = llm_analysis.get("recommendations", [])
        recommendations = []
        
        for rec in recs[:6]:
            if isinstance(rec, dict):
                recommendations.append(Recommendation(
                    category=rec.get("category", "general"),
                    title=rec.get("title", "Recommendation"),
                    description=rec.get("description", ""),
                    priority=rec.get("priority", "medium"),
                    potential_savings=rec.get("potential_savings")
                ))
        
        return recommendations
    
    def _calculate_data_completeness(
        self,
        location_output: Dict[str, Any],
        scope_output: Dict[str, Any],
        cost_output: Dict[str, Any],
        risk_output: Dict[str, Any],
        timeline_output: Dict[str, Any]
    ) -> float:
        """Calculate how complete the input data is.
        
        Args:
            All previous agent outputs.
            
        Returns:
            Completeness score (0-1).
        """
        completeness = 0.0
        
        # Each major section contributes to completeness
        if location_output and location_output.get("locationFactor"):
            completeness += 0.20
        
        if scope_output and scope_output.get("divisions"):
            completeness += 0.20
        
        if cost_output and cost_output.get("total"):
            completeness += 0.25
        
        if risk_output and risk_output.get("monteCarlo"):
            completeness += 0.20
        
        if timeline_output and timeline_output.get("tasks"):
            completeness += 0.15
        
        return min(1.0, completeness)
    
    def _determine_confidence_level(
        self,
        data_completeness: float,
        risk_level: str,
        cost_confidence: float
    ) -> EstimateConfidence:
        """Determine overall estimate confidence level.
        
        Args:
            data_completeness: Data completeness score.
            risk_level: Risk level string.
            cost_confidence: Cost estimate confidence.
            
        Returns:
            EstimateConfidence enum value.
        """
        # Start with data completeness
        score = data_completeness * 50
        
        # Add cost confidence
        score += cost_confidence * 30
        
        # Adjust for risk level
        risk_adjustments = {"low": 15, "medium": 10, "high": 0}
        score += risk_adjustments.get(risk_level.lower(), 10)
        
        if score >= 85:
            return EstimateConfidence.HIGH
        elif score >= 75:
            return EstimateConfidence.MEDIUM_HIGH
        elif score >= 60:
            return EstimateConfidence.MEDIUM
        elif score >= 45:
            return EstimateConfidence.MEDIUM_LOW
        else:
            return EstimateConfidence.LOW
    
    def _generate_headline(
        self,
        executive_summary: ExecutiveSummary,
        timeline_summary: TimelineSummaryForEstimate
    ) -> str:
        """Generate summary headline.
        
        Args:
            executive_summary: Executive summary.
            timeline_summary: Timeline summary.
            
        Returns:
            Headline string.
        """
        return (
            f"Final estimate: ${executive_summary.total_cost:,.0f} "
            f"({executive_summary.project_type.replace('_', ' ').title()}) "
            f"over {timeline_summary.total_weeks} weeks"
        )
