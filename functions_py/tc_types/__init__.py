"""
Type definitions package for TrueCost Python Functions (non-conflicting).

This module intentionally avoids the name `types` to prevent collisions
with Python's standard library `types` module.
"""

from .extraction import (  # noqa: F401
    FileType,
    ExtractionMethod,
    Dimensions,
    Room,
    Wall,
    Opening,
    BoundingBox,
    Scale,
    SpaceModel,
    RoomAdjacency,
    EntryPoint,
    SpatialRelationships,
    ExtractionResult,
)

__all__ = [
    "FileType",
    "ExtractionMethod",
    "Dimensions",
    "Room",
    "Wall",
    "Opening",
    "BoundingBox",
    "Scale",
    "SpaceModel",
    "RoomAdjacency",
    "EntryPoint",
    "SpatialRelationships",
    "ExtractionResult",
]


