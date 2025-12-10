"""ClarificationOutput v3.0.0 parsing.

Validation is handled by Dev 3 (Clarification Agent).
This module just deserializes JSON into typed Pydantic models.
"""

from typing import Any, Dict

from models.clarification_output import ClarificationOutput


def parse_clarification_output(data: Dict[str, Any]) -> ClarificationOutput:
    """Parse raw JSON into a typed ClarificationOutput object.

    Args:
        data: Raw dictionary from Clarification Agent

    Returns:
        Typed ClarificationOutput object
    """
    return ClarificationOutput.model_validate(data)
