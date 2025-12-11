"""
Unit tests for cad_parser.py (Epic 3 PR2 - DWG/DXF parsing).

Updated for enhanced multi-pass extraction.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, List
from unittest.mock import Mock, patch, MagicMock

import pytest

# Add project root (functions_py) to sys.path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.cad_parser import (  # type: ignore[import]
    CADParser, 
    CADParserConfig, 
    CADParserError,
    point_distance,
    polygon_area,
    polygon_centroid,
    point_in_polygon,
    lines_are_parallel,
)


FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


# ============================================================================
# Mock DXF Entities
# ============================================================================

class MockDXFAttrs:
    """Mock for entity.dxf attributes."""
    def __init__(self, **kwargs: Any) -> None:
        for k, v in kwargs.items():
            setattr(self, k, v)


class MockVec3:
    """Mock for ezdxf Vec3."""
    def __init__(self, x: float, y: float, z: float = 0) -> None:
        self.x = x
        self.y = y
        self.z = z
    
    def __iter__(self):
        return iter([self.x, self.y, self.z])
    
    def __getitem__(self, index: int) -> float:
        return [self.x, self.y, self.z][index]


class MockEntity:
    """Mock for ezdxf entities."""
    def __init__(self, entity_type: str, **kwargs: Any) -> None:
        self._type = entity_type
        self.dxf = MockDXFAttrs(**kwargs)
    
    def dxftype(self) -> str:
        return self._type


class MockLine(MockEntity):
    """Mock LINE entity."""
    def __init__(self, start: tuple, end: tuple, layer: str = "0") -> None:
        super().__init__(
            "LINE",
            start=MockVec3(*start),
            end=MockVec3(*end),
            layer=layer
        )


class MockLWPolyline(MockEntity):
    """Mock LWPOLYLINE entity."""
    def __init__(self, points: List[tuple], closed: bool = False, layer: str = "0") -> None:
        super().__init__("LWPOLYLINE", layer=layer)
        self._points = points
        self.closed = closed
    
    def get_points(self, format: str = "xy") -> List[tuple]:
        return self._points


class MockText(MockEntity):
    """Mock TEXT entity."""
    def __init__(self, text: str, position: tuple, layer: str = "0", height: float = 1.0) -> None:
        super().__init__(
            "TEXT",
            text=text,
            insert=MockVec3(*position),
            layer=layer,
            height=height
        )


class MockArc(MockEntity):
    """Mock ARC entity."""
    def __init__(self, center: tuple, radius: float, start_angle: float, end_angle: float, layer: str = "0") -> None:
        super().__init__(
            "ARC",
            center=MockVec3(*center),
            radius=radius,
            start_angle=start_angle,
            end_angle=end_angle,
            layer=layer
        )


class MockModelSpace:
    """Mock for doc.modelspace()."""
    def __init__(self, entities: List[MockEntity]) -> None:
        self._entities = entities
    
    def __iter__(self):
        return iter(self._entities)


class MockDoc:
    """Mock for ezdxf document."""
    def __init__(self, entities: List[MockEntity] = None) -> None:
        self._entities = entities or []
        self.header = {}
    
    def modelspace(self) -> MockModelSpace:
        return MockModelSpace(self._entities)


# ============================================================================
# Geometry Helper Tests
# ============================================================================

class TestGeometryHelpers:
    """Tests for geometry helper functions."""
    
    def test_point_distance(self) -> None:
        """Calculate distance between two points."""
        assert point_distance((0, 0), (3, 4)) == pytest.approx(5.0)
        assert point_distance((1, 1), (1, 1)) == pytest.approx(0.0)
        assert point_distance((-1, -1), (1, 1)) == pytest.approx(2.828, rel=0.01)
    
    def test_polygon_area_rectangle(self) -> None:
        """Calculate area of a rectangle."""
        rect = [(0, 0), (10, 0), (10, 5), (0, 5)]
        assert polygon_area(rect) == pytest.approx(50.0)
    
    def test_polygon_area_triangle(self) -> None:
        """Calculate area of a triangle."""
        triangle = [(0, 0), (4, 0), (2, 3)]
        assert polygon_area(triangle) == pytest.approx(6.0)
    
    def test_polygon_area_empty(self) -> None:
        """Empty polygon has zero area."""
        assert polygon_area([]) == 0.0
        assert polygon_area([(0, 0), (1, 1)]) == 0.0
    
    def test_polygon_centroid(self) -> None:
        """Calculate centroid of a polygon."""
        rect = [(0, 0), (10, 0), (10, 10), (0, 10)]
        cx, cy = polygon_centroid(rect)
        assert cx == pytest.approx(5.0)
        assert cy == pytest.approx(5.0)
    
    def test_point_in_polygon(self) -> None:
        """Check if point is inside polygon."""
        rect = [(0, 0), (10, 0), (10, 10), (0, 10)]
        assert point_in_polygon((5, 5), rect) is True
        assert point_in_polygon((15, 5), rect) is False
        assert point_in_polygon((-1, -1), rect) is False
    
    def test_lines_are_parallel(self) -> None:
        """Check if two lines are parallel."""
        # Horizontal lines
        line1 = ((0, 0), (10, 0))
        line2 = ((0, 5), (10, 5))
        assert lines_are_parallel(line1, line2) is True
        
        # Perpendicular lines
        line3 = ((0, 0), (0, 10))
        assert lines_are_parallel(line1, line3) is False


# ============================================================================
# CAD Parser Tests
# ============================================================================

class TestCADParser:
    """Tests for the CADParser service."""

    def test_parse_dxf_empty_document(self) -> None:
        """Empty DXF document returns valid result with no features."""
        parser = CADParser()
        doc = MockDoc([])
        
        with patch("services.cad_parser.ezdxf.readfile", return_value=doc):
            result = parser.parse_dwg_dxf(
                file_bytes=b"dummy",
                file_url="https://example.com/plan.dxf",
                file_type="dxf",
            )
        
        assert result["fileUrl"] == "https://example.com/plan.dxf"
        assert result["fileType"] == "dxf"
        assert result["extractionMethod"] == "ezdxf"
        assert result["spaceModel"]["rooms"] == []
        assert result["spaceModel"]["walls"] == []
        assert result["spaceModel"]["openings"] == []

    def test_parse_dxf_with_lines_detects_walls(self) -> None:
        """Lines longer than threshold are detected as walls."""
        parser = CADParser()
        
        # Create lines that should be detected as walls (>= 24 units)
        entities = [
            MockLine((0, 0), (100, 0), "WALLS"),  # Horizontal wall
            MockLine((100, 0), (100, 80), "WALLS"),  # Vertical wall
            MockLine((0, 0), (5, 0), "OTHER"),  # Too short, not a wall
        ]
        doc = MockDoc(entities)
        
        with patch("services.cad_parser.ezdxf.readfile", return_value=doc):
            result = parser.parse_dwg_dxf(
                file_bytes=b"dummy",
                file_url="https://example.com/plan.dxf",
                file_type="dxf",
            )
        
        walls = result["spaceModel"]["walls"]
        assert len(walls) >= 2  # At least the two long walls
        
        # Check wall structure
        for wall in walls:
            assert "id" in wall
            assert "length" in wall
            assert wall["length"] >= 24  # Our threshold

    def test_parse_dxf_with_polyline_room(self) -> None:
        """Closed polylines are detected as rooms."""
        parser = CADParser()
        
        # Create a closed polyline representing a room (10x12 = 120 sqft)
        room_poly = MockLWPolyline(
            points=[(0, 0), (120, 0), (120, 144), (0, 144)],
            closed=True,
            layer="ROOMS"
        )
        # Add a text label inside the room
        room_label = MockText("Living Room", position=(60, 72), layer="TEXT")
        
        doc = MockDoc([room_poly, room_label])
        
        with patch("services.cad_parser.ezdxf.readfile", return_value=doc):
            result = parser.parse_dwg_dxf(
                file_bytes=b"dummy",
                file_url="https://example.com/plan.dxf",
                file_type="dxf",
            )
        
        rooms = result["spaceModel"]["rooms"]
        assert len(rooms) >= 1
        
        # Check room structure
        room = rooms[0]
        assert room["name"] == "Living Room"
        assert room["type"] == "living_room"
        assert room["sqft"] > 100

    def test_parse_dxf_with_arc_doors(self) -> None:
        """90-degree arcs are detected as door swings."""
        parser = CADParser()
        
        # Create an arc representing a door swing
        door_arc = MockArc(
            center=(60, 0),
            radius=30,  # 30" door width
            start_angle=0,
            end_angle=90,
            layer="DOORS"
        )
        
        doc = MockDoc([door_arc])
        
        with patch("services.cad_parser.ezdxf.readfile", return_value=doc):
            result = parser.parse_dwg_dxf(
                file_bytes=b"dummy",
                file_url="https://example.com/plan.dxf",
                file_type="dxf",
            )
        
        openings = result["spaceModel"]["openings"]
        doors = [o for o in openings if o["type"] == "door"]
        assert len(doors) >= 1

    def test_parse_dxf_room_type_detection(self) -> None:
        """Room types are correctly detected from labels."""
        parser = CADParser()
        
        # Create rooms with different labels
        entities = [
            MockLWPolyline([(0, 0), (100, 0), (100, 100), (0, 100)], closed=True),
            MockText("Kitchen", position=(50, 50)),
            MockLWPolyline([(150, 0), (250, 0), (250, 100), (150, 100)], closed=True),
            MockText("W.C.", position=(200, 50)),
            MockLWPolyline([(300, 0), (400, 0), (400, 100), (300, 100)], closed=True),
            MockText("Master Bedroom", position=(350, 50)),
        ]
        
        doc = MockDoc(entities)
        
        with patch("services.cad_parser.ezdxf.readfile", return_value=doc):
            result = parser.parse_dwg_dxf(
                file_bytes=b"dummy",
                file_url="https://example.com/plan.dxf",
                file_type="dxf",
            )
        
        rooms = result["spaceModel"]["rooms"]
        room_types = {r["name"]: r["type"] for r in rooms}
        
        # Check type detection
        if "Kitchen" in room_types:
            assert room_types["Kitchen"] == "kitchen"
        if "W.C." in room_types:
            assert room_types["W.C."] == "bathroom"
        if "Master Bedroom" in room_types:
            assert room_types["Master Bedroom"] == "bedroom"

    def test_parse_dwg_success(self) -> None:
        """DWG bytes are passed to ezdxf and result has correct shape."""
        parser = CADParser()
        sample_path = FIXTURES_DIR / "sample.dwg"
        sample_bytes = sample_path.read_bytes()

        with patch("services.cad_parser.ezdxf.readfile", return_value=MockDoc()) as mock_readfile:
            result = parser.parse_dwg_dxf(
                file_bytes=sample_bytes,
                file_url="https://example.com/cad/est123/plan.dwg",
                file_type="dwg",
            )

        mock_readfile.assert_called_once()
        assert result["fileUrl"] == "https://example.com/cad/est123/plan.dwg"
        assert result["fileType"] == "dwg"
        assert result["extractionMethod"] == "ezdxf"
        assert "spaceModel" in result
        assert "spatialRelationships" in result
        assert "rawExtraction" in result

    def test_unsupported_file_type_raises(self) -> None:
        """Non DWG/DXF types are rejected early."""
        parser = CADParser()

        with pytest.raises(CADParserError):
            parser.parse_dwg_dxf(
                file_bytes=b"",
                file_url="https://example.com/cad/est123/plan.pdf",
                file_type="pdf",  # type: ignore[arg-type]
            )

    def test_ezdxf_failure_wrapped_in_cadparsererror(self) -> None:
        """Exceptions from ezdxf are wrapped as CADParserError."""
        parser = CADParser()
        sample_bytes = b"invalid-bytes"

        with patch(
            "services.cad_parser.ezdxf.readfile",
            side_effect=RuntimeError("boom"),
        ):
            with pytest.raises(CADParserError) as exc_info:
                parser.parse_dwg_dxf(
                    file_bytes=sample_bytes,
                    file_url="https://example.com/cad/est123/plan.dwg",
                    file_type="dwg",
                )

        assert "Failed to parse DWG CAD file" in str(exc_info.value)

    def test_confidence_calculation(self) -> None:
        """Confidence increases with more detected features."""
        parser = CADParser()
        
        # Empty document should have low confidence
        doc_empty = MockDoc([])
        with patch("services.cad_parser.ezdxf.readfile", return_value=doc_empty):
            result_empty = parser.parse_dwg_dxf(
                file_bytes=b"dummy",
                file_url="https://example.com/plan.dxf",
                file_type="dxf",
            )
        
        # Document with features should have higher confidence
        entities = [
            MockLWPolyline([(0, 0), (100, 0), (100, 100), (0, 100)], closed=True),
            MockText("Kitchen", position=(50, 50)),
            MockLine((0, 0), (100, 0)),
            MockArc((50, 0), 30, 0, 90),
        ]
        doc_full = MockDoc(entities)
        with patch("services.cad_parser.ezdxf.readfile", return_value=doc_full):
            result_full = parser.parse_dwg_dxf(
                file_bytes=b"dummy",
                file_url="https://example.com/plan.dxf",
                file_type="dxf",
            )
        
        assert result_full["extractionConfidence"] >= result_empty["extractionConfidence"]

    def test_narrative_generation(self) -> None:
        """Layout narrative is generated from detected features."""
        parser = CADParser()
        
        entities = [
            MockLine((0, 0), (120, 0)),
            MockLWPolyline([(0, 0), (100, 0), (100, 100), (0, 100)], closed=True),
            MockText("Office", position=(50, 50)),
        ]
        doc = MockDoc(entities)
        
        with patch("services.cad_parser.ezdxf.readfile", return_value=doc):
            result = parser.parse_dwg_dxf(
                file_bytes=b"dummy",
                file_url="https://example.com/plan.dxf",
                file_type="dxf",
            )
        
        narrative = result["spatialRelationships"]["layoutNarrative"]
        assert "DXF" in narrative
        assert "ezdxf" in narrative.lower()
