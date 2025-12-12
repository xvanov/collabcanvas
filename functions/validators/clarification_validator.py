"""ClarificationOutput v3.0.0 parsing and validation.

Validation is handled by Dev 3 (Clarification Agent).
This module deserializes JSON into typed Pydantic models and validates the schema.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List

from pydantic import ValidationError as PydanticValidationError

from models.clarification_output import ClarificationOutput


@dataclass
class ValidationResult:
    """Result of ClarificationOutput validation."""
    is_valid: bool = True
    errors: List[str] = field(default_factory=list)
    parsed: ClarificationOutput = None


def parse_clarification_output(data: Dict[str, Any]) -> ClarificationOutput:
    """Parse raw JSON into a typed ClarificationOutput object.

    Args:
        data: Raw dictionary from Clarification Agent

    Returns:
        Typed ClarificationOutput object
    """
    return ClarificationOutput.model_validate(data)


def validate_clarification_output(data: Dict[str, Any]) -> ValidationResult:
    """Validate ClarificationOutput schema and return result.

    Args:
        data: Raw dictionary from Clarification Agent

    Returns:
        ValidationResult with is_valid, errors, and parsed object
    """
    try:
        parsed = ClarificationOutput.model_validate(data)
        return ValidationResult(is_valid=True, errors=[], parsed=parsed)
    except PydanticValidationError as e:
        errors = [f"{err['loc']}: {err['msg']}" for err in e.errors()]
        return ValidationResult(is_valid=False, errors=errors, parsed=None)
    except Exception as e:
        return ValidationResult(is_valid=False, errors=[str(e)], parsed=None)
