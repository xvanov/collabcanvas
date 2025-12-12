"""Risk Analysis Pydantic models for TrueCost.

This module defines the data models for risk analysis including
Monte Carlo simulation results and risk factor identification.
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# =============================================================================
# ENUMS
# =============================================================================


class RiskImpact(str, Enum):
    """Risk impact level."""
    
    CRITICAL = "critical"  # Would stop project or add >25% to cost
    HIGH = "high"          # Could add 15-25% to cost
    MEDIUM = "medium"      # Could add 5-15% to cost
    LOW = "low"            # Could add <5% to cost


class RiskCategory(str, Enum):
    """Risk category types."""
    
    MATERIAL_COST = "material_cost"
    LABOR_AVAILABILITY = "labor_availability"
    LABOR_PRODUCTIVITY = "labor_productivity"
    WEATHER = "weather"
    PERMIT = "permit"
    SCOPE_CHANGE = "scope_change"
    SITE_CONDITIONS = "site_conditions"
    SUPPLY_CHAIN = "supply_chain"
    REGULATORY = "regulatory"
    DESIGN_CHANGE = "design_change"
    SUBCONTRACTOR = "subcontractor"
    OTHER = "other"


class ConfidenceLevel(str, Enum):
    """Confidence level in risk analysis."""
    
    HIGH = "high"       # Based on historical data and complete information
    MEDIUM = "medium"   # Based on industry standards and partial information
    LOW = "low"         # Based on estimates and limited information


# =============================================================================
# RISK FACTOR MODEL
# =============================================================================


class RiskFactor(BaseModel):
    """Individual risk factor identified in the project.
    
    Each risk factor contributes to cost variance and is used
    in Monte Carlo simulation.
    """
    
    id: str = Field(..., description="Unique risk identifier")
    name: str = Field(..., description="Short risk name")
    description: str = Field(..., description="Detailed risk description")
    category: RiskCategory = Field(..., description="Risk category")
    impact: RiskImpact = Field(..., description="Potential impact level")
    
    # Probability and impact quantification
    probability: float = Field(
        ..., ge=0, le=1, description="Probability of occurrence (0-1)"
    )
    cost_impact_low: float = Field(
        ..., ge=0, description="Minimum cost impact if risk occurs ($)"
    )
    cost_impact_high: float = Field(
        ..., description="Maximum cost impact if risk occurs ($)"
    )
    
    # Variance contribution (calculated by Monte Carlo)
    variance_contribution: float = Field(
        default=0.0, ge=0, le=1, description="Percentage of total variance"
    )
    
    # Mitigation
    mitigation: Optional[str] = Field(
        None, description="Suggested mitigation strategy"
    )
    
    @model_validator(mode="after")
    def validate_impacts(self) -> "RiskFactor":
        """Ensure cost_impact_low <= cost_impact_high."""
        if self.cost_impact_low > self.cost_impact_high:
            raise ValueError(
                f"cost_impact_low ({self.cost_impact_low}) must be <= "
                f"cost_impact_high ({self.cost_impact_high})"
            )
        return self

    def expected_impact(self) -> float:
        """Calculate expected impact = probability × average impact."""
        avg_impact = (self.cost_impact_low + self.cost_impact_high) / 2
        return self.probability * avg_impact


# =============================================================================
# MONTE CARLO RESULTS MODEL
# =============================================================================


class DistributionStatistics(BaseModel):
    """Statistical summary of a distribution."""
    
    min: float = Field(..., description="Minimum value")
    max: float = Field(..., description="Maximum value")
    mean: float = Field(..., description="Mean value")
    std_dev: float = Field(..., ge=0, description="Standard deviation")
    median: float = Field(..., description="Median (50th percentile)")
    skewness: float = Field(default=0.0, description="Distribution skewness")


class PercentileValues(BaseModel):
    """Key percentile values from Monte Carlo simulation."""
    
    p10: float = Field(..., description="10th percentile (optimistic)")
    p25: float = Field(..., description="25th percentile")
    p50: float = Field(..., description="50th percentile (median)")
    p75: float = Field(..., description="75th percentile")
    p80: float = Field(..., description="80th percentile (conservative)")
    p90: float = Field(..., description="90th percentile (pessimistic)")
    p95: float = Field(..., description="95th percentile")
    
    @model_validator(mode="after")
    def validate_order(self) -> "PercentileValues":
        """Ensure percentiles are in ascending order."""
        values = [self.p10, self.p25, self.p50, self.p75, self.p80, self.p90, self.p95]
        if values != sorted(values):
            raise ValueError("Percentile values must be in ascending order")
        return self


class MonteCarloResult(BaseModel):
    """Results from Monte Carlo cost simulation.
    
    Contains percentile values, statistics, and top risk contributors.
    """
    
    # Simulation parameters
    iterations: int = Field(..., ge=100, description="Number of iterations run")
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")
    
    # Percentile values
    percentiles: PercentileValues = Field(
        ..., description="Key percentile values"
    )
    
    # Distribution statistics
    statistics: DistributionStatistics = Field(
        ..., description="Distribution statistics"
    )
    
    # Histogram data (for visualization)
    histogram_bins: List[float] = Field(
        default_factory=list, description="Histogram bin edges"
    )
    histogram_counts: List[int] = Field(
        default_factory=list, description="Histogram bin counts"
    )
    top_risks: List[Dict[str, Any]] = Field(
        default_factory=list, description="Top risks with impact/variance data"
    )
    
    # Top risk contributors (by variance contribution)
    top_risk_contributors: List[str] = Field(
        default_factory=list, description="Risk IDs sorted by variance contribution"
    )
    
    def get_range_spread(self) -> float:
        """Calculate P90/P50 ratio."""
        if self.percentiles.p50 <= 0:
            return 0.0
        return self.percentiles.p90 / self.percentiles.p50
    
    def get_coefficient_of_variation(self) -> float:
        """Calculate CV = std_dev / mean."""
        if self.statistics.mean <= 0:
            return 0.0
        return self.statistics.std_dev / self.statistics.mean


# =============================================================================
# CONTINGENCY CALCULATION MODEL
# =============================================================================


class ContingencyRecommendation(BaseModel):
    """Recommended contingency based on risk analysis."""
    
    # Recommended contingency
    recommended_percentage: float = Field(
        ..., ge=0, le=50, description="Recommended contingency percentage"
    )
    recommended_amount: float = Field(
        ..., ge=0, description="Recommended contingency dollar amount"
    )
    
    # Basis for recommendation
    basis: str = Field(
        ..., description="Explanation of how contingency was calculated"
    )
    confidence_level: str = Field(
        default="P80", description="Confidence level used (e.g., P80)"
    )
    
    # Alternative scenarios
    conservative_percentage: float = Field(
        ..., ge=0, description="Conservative contingency (P90 basis)"
    )
    conservative_amount: float = Field(
        ..., ge=0, description="Conservative contingency amount"
    )
    
    optimistic_percentage: float = Field(
        ..., ge=0, description="Optimistic contingency (P50 basis)"
    )
    optimistic_amount: float = Field(
        ..., ge=0, description="Optimistic contingency amount"
    )


# =============================================================================
# RISK ANALYSIS OUTPUT MODEL
# =============================================================================


class RiskAnalysisSummary(BaseModel):
    """Human-readable risk analysis summary."""
    
    headline: str = Field(
        ..., description="One-line summary"
    )
    risk_level: str = Field(
        ..., description="Overall project risk level (Low/Medium/High)"
    )
    key_findings: List[str] = Field(
        default_factory=list, description="Top 3-5 key findings"
    )
    recommendations: List[str] = Field(
        default_factory=list, description="Risk mitigation recommendations"
    )


class RiskAnalysis(BaseModel):
    """Complete risk analysis output from Risk Agent.
    
    Contains Monte Carlo results, identified risks, and
    contingency recommendations.
    """
    
    # Metadata
    estimate_id: str = Field(..., description="Parent estimate ID")
    base_cost: float = Field(..., ge=0, description="Base cost before contingency")
    
    # Monte Carlo results
    monte_carlo: MonteCarloResult = Field(
        ..., description="Monte Carlo simulation results"
    )
    
    # Identified risks
    risk_factors: List[RiskFactor] = Field(
        default_factory=list, description="All identified risk factors"
    )
    top_risks: List[RiskFactor] = Field(
        default_factory=list, description="Top 5 risks by variance contribution"
    )
    
    # Contingency
    contingency: ContingencyRecommendation = Field(
        ..., description="Contingency recommendation"
    )
    
    # Confidence range
    confidence_range: Dict[str, float] = Field(
        default_factory=dict,
        description="Cost range by confidence level"
    )
    
    # Summary
    summary: RiskAnalysisSummary = Field(
        ..., description="Human-readable summary"
    )
    
    # Analysis confidence
    analysis_confidence: ConfidenceLevel = Field(
        default=ConfidenceLevel.MEDIUM,
        description="Confidence in the analysis"
    )
    
    def to_agent_output(self) -> Dict[str, Any]:
        """Convert to dict format for agent output storage."""
        return {
            "estimateId": self.estimate_id,
            "baseCost": self.base_cost,
            "monteCarlo": {
                "iterations": self.monte_carlo.iterations,
                "p50": self.monte_carlo.percentiles.p50,
                "p80": self.monte_carlo.percentiles.p80,
                "p90": self.monte_carlo.percentiles.p90,
                "mean": self.monte_carlo.statistics.mean,
                "stdDev": self.monte_carlo.statistics.std_dev,
                "min": self.monte_carlo.statistics.min,
                "max": self.monte_carlo.statistics.max,
                "histogram_bins": self.monte_carlo.histogram_bins,
                "histogram_counts": self.monte_carlo.histogram_counts,
                "topRisks": self.monte_carlo.top_risks,
                "topRiskContributors": self.monte_carlo.top_risk_contributors,
            },
            "contingency": {
                "recommended": self.contingency.recommended_percentage,
                "dollarAmount": self.contingency.recommended_amount,
                "rationale": self.contingency.basis,
                "confidenceLevel": self.contingency.confidence_level,
            },
            "topRisks": [
                {
                    "id": risk.id,
                    "item": risk.name,
                    "description": risk.description,
                    "category": risk.category.value,
                    "impact": risk.impact.value,
                    "probability": risk.probability,
                    "costImpactLow": risk.cost_impact_low,
                    "costImpactHigh": risk.cost_impact_high,
                    "varianceContribution": risk.variance_contribution,
                    "mitigation": risk.mitigation,
                }
                for risk in self.top_risks
            ],
            "allRisks": [
                {
                    "id": risk.id,
                    "name": risk.name,
                    "category": risk.category.value,
                    "impact": risk.impact.value,
                    "probability": risk.probability,
                }
                for risk in self.risk_factors
            ],
            "confidenceRange": {
                "p50": self.monte_carlo.percentiles.p50,
                "p80": self.monte_carlo.percentiles.p80,
                "p90": self.monte_carlo.percentiles.p90,
                "low": self.monte_carlo.percentiles.p10,
                "likely": self.monte_carlo.percentiles.p50,
                "high": self.monte_carlo.percentiles.p90,
            },
            "summary": self.summary.headline,
            "riskLevel": self.summary.risk_level,
            "keyFindings": self.summary.key_findings,
            "recommendations": self.summary.recommendations,
            "analysisConfidence": self.analysis_confidence.value,
        }

