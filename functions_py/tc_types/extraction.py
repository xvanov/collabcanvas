"""
Non-conflicting copy of CAD extraction TypedDicts.

This file mirrors the content of the former `functions_py/types/extraction.py`
so we can avoid shadowing Python's standard library `types` module.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, TypedDict


FileType = Literal["dwg", "dxf", "pdf", "png", "jpg"]
ExtractionMethod = Literal["ezdxf", "vision"]


class Dimensions(TypedDict, total=False):
    """Room dimensions."""

    length: float
    width: float
    height: Optional[float]


class Room(TypedDict, total=False):
    """Simplified room representation from CAD."""

    id: str
    name: str
    type: str  # e.g. "kitchen", "bathroom"
    sqft: float
    dimensions: Dimensions
    confidence: float
    needsVerification: bool


class Wall(TypedDict, total=False):
    """Wall segment between rooms."""

    id: str
    length: float
    height: Optional[float]
    thickness: Optional[float]
    type: Literal["interior", "exterior", "load_bearing", "partition"]
    material: Optional[str]
    connectsRooms: List[str]
    adjacentWalls: List[str]
    confidence: float


class OpeningPosition(TypedDict, total=False):
    """Relative position of an opening in a wall."""

    distanceFromCorner: float
    side: Literal["left", "right", "center"]


class Opening(TypedDict, total=False):
    """Door / window / opening in a wall."""

    id: str
    type: Literal["door", "window", "archway", "pass_through"]
    width: float
    height: float
    inWall: str
    connectsRooms: List[str]
    position: OpeningPosition
    swing: Literal["in", "out", "left", "right", "sliding", "pocket"]
    confidence: float


class BoundingBox(TypedDict, total=False):
    """Overall bounding box of the project space."""

    length: float
    width: float
    height: float
    units: Literal["feet", "inches", "meters"]


class Scale(TypedDict, total=False):
    """Scale information for the CAD drawing."""

    detected: bool
    ratio: Optional[float]
    units: Literal["feet", "inches", "meters"]


class SpaceModel(TypedDict, total=False):
    """
    Physical space model derived from CAD.

    This aligns with `SpaceModel` in the ClarificationOutput schema:
    - totalSqft
    - boundingBox
    - scale
    - rooms
    - walls
    - openings
    """

    totalSqft: float
    boundingBox: BoundingBox
    scale: Scale
    rooms: List[Room]
    walls: List[Wall]
    openings: List[Opening]


class RoomAdjacency(TypedDict, total=False):
    """Adjacency relationship between two rooms."""

    room1: str
    room2: str
    connection: Literal["door", "archway", "open", "window"]
    openingId: Optional[str]


class EntryPoint(TypedDict, total=False):
    """Entry points into the project space."""

    openingId: str
    fromSpace: str  # e.g. "hallway", "exterior", "garage"
    isPrimary: bool


class SpatialRelationships(TypedDict, total=False):
    """
    Narrative + structural relationships between rooms.

    Mirrors `SpatialRelationships` in the ClarificationOutput spec.
    """

    layoutNarrative: str
    roomAdjacencies: List[RoomAdjacency]
    entryPoints: List[EntryPoint]


class ExtractionResult(TypedDict, total=False):
    """
    Unified extraction result for both ezdxf and GPT-4o Vision paths.

    This is intentionally shaped like `CADData` so that later PRs can
    drop it directly into ClarificationOutput.cadData with minimal
    transformation.
    """

    # File info
    fileUrl: str
    fileType: FileType
    extractionMethod: ExtractionMethod
    extractionConfidence: float  # 0-1 overall confidence

    # Physical space & relationships
    spaceModel: SpaceModel
    spatialRelationships: SpatialRelationships

    # Raw extraction payload from parser / model (for debugging)
    rawExtraction: Dict[str, Any]


__all__ = [
    "FileType",
    "ExtractionMethod",
    "Dimensions",
    "Room",
    "Wall",
    "OpeningPosition",
    "Opening",
    "BoundingBox",
    "Scale",
    "SpaceModel",
    "RoomAdjacency",
    "EntryPoint",
    "SpatialRelationships",
    "ExtractionResult",
]



