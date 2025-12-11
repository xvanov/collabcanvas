"""
Unit tests for vision_service.py (Epic 3 PR2 - GPT-4o Vision path).

Updated for multi-pass analysis.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, List

import pytest

# Add project root (functions_py) to sys.path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.vision_service import (  # type: ignore[import]
    VisionService,
    VisionServiceConfig,
    VisionServiceError,
)


# ============================================================================
# Mock OpenAI Client
# ============================================================================

class _DummyMsg:
    def __init__(self, content: str) -> None:
        self.content = content


class _DummyChoice:
    def __init__(self, content: str) -> None:
        self.message = _DummyMsg(content)


class _DummyResponse:
    def __init__(self, content: str) -> None:
        self.choices = [_DummyChoice(content)]


class _DummyCompletions:
    """Mock for client.chat.completions."""
    
    def __init__(self, responses: List[str]) -> None:
        """
        Args:
            responses: List of JSON responses to return in sequence.
        """
        self._responses = responses
        self._call_count = 0

    def create(self, *args: Any, **kwargs: Any) -> _DummyResponse:
        if self._call_count < len(self._responses):
            content = self._responses[self._call_count]
            self._call_count += 1
            return _DummyResponse(content)
        return _DummyResponse("{}")


class _DummyChat:
    def __init__(self, responses: List[str]) -> None:
        self.completions = _DummyCompletions(responses)


class _DummyClient:
    """Mock OpenAI client that returns predefined responses."""
    
    def __init__(self, responses: List[str]) -> None:
        """
        Args:
            responses: List of JSON responses for multi-pass analysis.
                       For single-pass, just provide one response.
        """
        self.chat = _DummyChat(responses)


def single_pass_response(content: str) -> List[str]:
    """Helper to create a single-pass response list."""
    return [content]


def multi_pass_responses(
    pass1: dict | None = None,
    pass2: dict | None = None,
    pass3: dict | None = None,
) -> List[str]:
    """Helper to create multi-pass response list."""
    default_pass1 = {
        "rooms": [
            {"id": "room_1", "name": "Living Room", "type": "living_room", 
             "estimatedSqft": 200, "dimensions": {"length": 20, "width": 10},
             "labelConfidence": 0.9, "position": "center"}
        ],
        "totalRoomCount": 1,
        "floorLevel": "ground",
        "analysisNotes": "Test plan"
    }
    
    default_pass2 = {
        "doors": [
            {"id": "door_1", "type": "door", "width": 36, 
             "connectsRooms": ["Living Room", "exterior"], "isExterior": True, "hasSwingArc": True}
        ],
        "windows": [
            {"id": "window_1", "width": 48, "inRoom": "Living Room", "wallDirection": "south"}
        ],
        "totalDoors": 1,
        "totalWindows": 1,
        "exteriorDoors": 1,
        "analysisNotes": ""
    }
    
    default_pass3 = {
        "layoutNarrative": "A simple floor plan with a central living room and south-facing windows.",
        "mainEntry": {"location": "front", "entersInto": "Living Room"},
        "adjacencies": [],
        "scaleInfo": {"detected": False, "scaleText": None, "dimensionExamples": []},
        "notableFeatures": ["open concept"],
        "planOrientation": "landscape",
        "estimatedTotalSqft": 200
    }
    
    return [
        json.dumps(pass1 or default_pass1),
        json.dumps(pass2 or default_pass2),
        json.dumps(pass3 or default_pass3),
    ]


# ============================================================================
# Tests
# ============================================================================

class TestVisionService:
    """Tests for the VisionService wrapper."""

    def test_extract_single_pass_success(self) -> None:
        """Single-pass extraction works correctly."""
        payload = {
            "spaceModel": {
                "totalSqft": 250.0,
                "boundingBox": {"length": 25.0, "width": 10.0, "height": 9.0, "units": "feet"},
                "scale": {"detected": True, "ratio": 48.0, "units": "inches"},
                "rooms": [],
                "walls": [],
                "openings": [],
            },
            "spatialRelationships": {
                "layoutNarrative": "Simple one-room layout.",
                "roomAdjacencies": [],
                "entryPoints": [],
            },
            "extractionConfidence": 0.92,
        }

        client = _DummyClient(single_pass_response(json.dumps(payload)))
        config = VisionServiceConfig(enable_multi_pass=False)
        service = VisionService(client=client, config=config)

        result = service.extract_cad_data(
            file_url="https://example.com/plan.png",
            file_type="png",
        )

        assert result["fileUrl"] == "https://example.com/plan.png"
        assert result["fileType"] == "png"
        assert result["extractionMethod"] == "vision"
        assert result["extractionConfidence"] == pytest.approx(0.92)
        assert "spaceModel" in result
        assert "spatialRelationships" in result

    def test_extract_multi_pass_success(self) -> None:
        """Multi-pass extraction combines all pass results."""
        client = _DummyClient(multi_pass_responses())
        config = VisionServiceConfig(enable_multi_pass=True)
        service = VisionService(client=client, config=config)

        result = service.extract_cad_data(
            file_url="https://example.com/plan.png",
            file_type="png",
        )

        assert result["fileUrl"] == "https://example.com/plan.png"
        assert result["fileType"] == "png"
        assert result["extractionMethod"] == "vision"
        
        # Check rooms from pass1
        rooms = result["spaceModel"]["rooms"]
        assert len(rooms) == 1
        assert rooms[0]["name"] == "Living Room"
        assert rooms[0]["type"] == "living_room"
        
        # Check openings from pass2
        openings = result["spaceModel"]["openings"]
        doors = [o for o in openings if o["type"] == "door"]
        windows = [o for o in openings if o["type"] == "window"]
        assert len(doors) == 1
        assert len(windows) == 1
        
        # Check narrative from pass3
        narrative = result["spatialRelationships"]["layoutNarrative"]
        assert "living room" in narrative.lower()

    def test_multi_pass_with_multiple_rooms(self) -> None:
        """Multi-pass correctly handles multiple rooms."""
        pass1 = {
            "rooms": [
                {"id": "room_1", "name": "Kitchen", "type": "kitchen", 
                 "estimatedSqft": 150, "dimensions": {"length": 15, "width": 10},
                 "labelConfidence": 0.95, "position": "center-left"},
                {"id": "room_2", "name": "W.C.", "type": "bathroom", 
                 "estimatedSqft": 40, "dimensions": {"length": 8, "width": 5},
                 "labelConfidence": 0.85, "position": "center-right"},
                {"id": "room_3", "name": "Master Bedroom", "type": "bedroom", 
                 "estimatedSqft": 180, "dimensions": {"length": 15, "width": 12},
                 "labelConfidence": 0.9, "position": "top-center"},
            ],
            "totalRoomCount": 3,
            "floorLevel": "ground",
            "analysisNotes": "Clear labels visible"
        }
        
        pass2 = {
            "doors": [
                {"id": "door_1", "type": "door", "width": 30, 
                 "connectsRooms": ["Kitchen", "W.C."], "isExterior": False, "hasSwingArc": True},
                {"id": "door_2", "type": "door", "width": 36, 
                 "connectsRooms": ["Kitchen", "exterior"], "isExterior": True, "hasSwingArc": True},
            ],
            "windows": [
                {"id": "window_1", "width": 60, "inRoom": "Master Bedroom", "wallDirection": "north"},
            ],
            "totalDoors": 2,
            "totalWindows": 1,
            "exteriorDoors": 1,
            "analysisNotes": ""
        }
        
        pass3 = {
            "layoutNarrative": "Enter through kitchen, W.C. on right, master bedroom upstairs.",
            "mainEntry": {"location": "front", "entersInto": "Kitchen"},
            "adjacencies": [
                {"room1": "Kitchen", "room2": "W.C.", "connection": "door"},
            ],
            "scaleInfo": {"detected": False, "scaleText": None, "dimensionExamples": []},
            "notableFeatures": [],
            "planOrientation": "portrait",
            "estimatedTotalSqft": 370
        }
        
        client = _DummyClient(multi_pass_responses(pass1, pass2, pass3))
        config = VisionServiceConfig(enable_multi_pass=True)
        service = VisionService(client=client, config=config)

        result = service.extract_cad_data(
            file_url="https://example.com/plan.png",
            file_type="png",
        )

        rooms = result["spaceModel"]["rooms"]
        assert len(rooms) == 3
        
        room_names = {r["name"] for r in rooms}
        assert "Kitchen" in room_names
        assert "W.C." in room_names
        assert "Master Bedroom" in room_names
        
        openings = result["spaceModel"]["openings"]
        assert len(openings) == 3  # 2 doors + 1 window

    def test_missing_confidence_gets_default(self) -> None:
        """If the model omits extractionConfidence, we inject a default."""
        payload = {
            "spaceModel": {
                "totalSqft": 100.0,
                "boundingBox": {"length": 10.0, "width": 10.0, "height": 9.0, "units": "feet"},
                "scale": {"detected": False, "ratio": None, "units": "feet"},
                "rooms": [],
                "walls": [],
                "openings": [],
            },
            "spatialRelationships": {
                "layoutNarrative": "Square room.",
                "roomAdjacencies": [],
                "entryPoints": [],
            },
        }

        client = _DummyClient(single_pass_response(json.dumps(payload)))
        cfg = VisionServiceConfig(default_confidence=0.75, enable_multi_pass=False)
        service = VisionService(client=client, config=cfg)

        result = service.extract_cad_data(
            file_url="https://example.com/plan.png",
            file_type="png",
        )

        assert result["extractionConfidence"] == pytest.approx(0.75)

    def test_unsupported_file_type_raises(self) -> None:
        """Non-vision file types are rejected."""
        client = _DummyClient(single_pass_response("{}"))
        service = VisionService(client=client, config=VisionServiceConfig())

        with pytest.raises(VisionServiceError):
            service.extract_cad_data(
                file_url="https://example.com/plan.dwg",
                file_type="dwg",  # type: ignore[arg-type]
            )

    def test_non_json_response_raises_single_pass(self) -> None:
        """If the model returns non-JSON in single-pass, we raise VisionServiceError."""
        client = _DummyClient(single_pass_response("not-json"))
        config = VisionServiceConfig(enable_multi_pass=False)
        service = VisionService(client=client, config=config)

        with pytest.raises(VisionServiceError):
            service.extract_cad_data(
                file_url="https://example.com/plan.png",
                file_type="png",
            )

    def test_markdown_wrapped_json_is_parsed(self) -> None:
        """JSON wrapped in markdown code blocks is correctly parsed."""
        payload = {
            "spaceModel": {
                "totalSqft": 100.0,
                "boundingBox": {"length": 10, "width": 10, "height": 9, "units": "feet"},
                "scale": {"detected": False, "ratio": None, "units": "feet"},
                "rooms": [],
                "walls": [],
                "openings": [],
            },
            "spatialRelationships": {
                "layoutNarrative": "Test.",
                "roomAdjacencies": [],
                "entryPoints": [],
            },
        }
        
        # Wrap in markdown
        markdown_response = f"```json\n{json.dumps(payload)}\n```"

        client = _DummyClient(single_pass_response(markdown_response))
        config = VisionServiceConfig(enable_multi_pass=False)
        service = VisionService(client=client, config=config)

        result = service.extract_cad_data(
            file_url="https://example.com/plan.png",
            file_type="png",
        )

        assert result["spaceModel"]["totalSqft"] == 100.0

    def test_override_multi_pass_setting(self) -> None:
        """use_multi_pass parameter overrides config setting."""
        client = _DummyClient(multi_pass_responses())
        config = VisionServiceConfig(enable_multi_pass=False)  # Disabled in config
        service = VisionService(client=client, config=config)

        # Override with use_multi_pass=True
        result = service.extract_cad_data(
            file_url="https://example.com/plan.png",
            file_type="png",
            use_multi_pass=True,
        )

        # Should use multi-pass (raw extraction shows it)
        assert result["rawExtraction"].get("source") == "vision_multi_pass"

    def test_raw_extraction_contains_pass_data(self) -> None:
        """Multi-pass extraction stores all pass results in rawExtraction."""
        client = _DummyClient(multi_pass_responses())
        config = VisionServiceConfig(enable_multi_pass=True)
        service = VisionService(client=client, config=config)

        result = service.extract_cad_data(
            file_url="https://example.com/plan.png",
            file_type="png",
        )

        raw = result["rawExtraction"]
        assert raw["source"] == "vision_multi_pass"
        assert "pass1_rooms" in raw
        assert "pass2_openings" in raw
        assert "pass3_spatial" in raw

    def test_pdf_requires_file_bytes(self) -> None:
        """PDF files require file_bytes for conversion."""
        client = _DummyClient(single_pass_response("{}"))
        config = VisionServiceConfig(enable_multi_pass=False)
        service = VisionService(client=client, config=config)

        with pytest.raises(VisionServiceError) as exc_info:
            service.extract_cad_data(
                file_url="https://example.com/plan.pdf",
                file_type="pdf",
                # No file_bytes provided
            )
        
        assert "file_bytes" in str(exc_info.value).lower()
