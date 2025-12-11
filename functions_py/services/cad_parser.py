"""
CAD parsing service for DWG/DXF files using ezdxf.

Epic 3 PR2 requirement:
- Implement ezdxf parser for DWG/DXF to unified `ExtractionResult`
  (rooms, walls, openings, scale, confidences).

This module focuses on a stable service surface and schema alignment with
`ExtractionResult`. Enhanced with multi-pass extraction for improved accuracy:
- Pass 1: Basic geometry extraction (lines, polylines, text, arcs)
- Pass 2: Wall detection with thickness from parallel lines
- Pass 3: Room detection with area calculation and labeling
- Pass 4: Opening detection (doors from arcs, windows from short gaps)
- Pass 5: Scale detection from DIMENSION entities
- Pass 6: Spatial relationships and adjacency analysis

NOTE: ezdxf only supports DXF format natively. For DWG files, we route
to the Vision service as a fallback since DWG is a proprietary format.
"""

from __future__ import annotations

import math
import os
from collections import defaultdict
from dataclasses import dataclass, field
from tempfile import NamedTemporaryFile
from typing import Any, Dict, List, Optional, Set, Tuple

import ezdxf  # type: ignore[import-untyped]
from ezdxf.entities import DXFEntity  # type: ignore[import-untyped]

from tc_types.extraction import ExtractionResult, FileType, SpaceModel, SpatialRelationships


# ============================================================================
# Configuration
# ============================================================================

@dataclass
class CADParserConfig:
    """
    Configuration for the CAD parser with tunable thresholds.
    """
    # Units
    default_units: str = "feet"
    default_confidence: float = 0.5
    
    # Wall detection thresholds
    min_wall_length: float = 24.0  # Minimum wall length in drawing units (2ft = 24in)
    max_wall_thickness: float = 12.0  # Maximum wall thickness (12 inches)
    wall_parallel_tolerance: float = 2.0  # Tolerance for parallel line detection
    
    # Room detection thresholds
    min_room_area: float = 36.0  # Minimum room area in sq units (6ft x 6ft)
    max_room_aspect_ratio: float = 10.0  # Max length/width ratio for valid room
    
    # Door detection thresholds
    door_arc_angle_min: float = 75.0  # Minimum arc angle for door swing
    door_arc_angle_max: float = 105.0  # Maximum arc angle for door swing
    min_door_width: float = 24.0  # Minimum door width (2ft)
    max_door_width: float = 48.0  # Maximum door width (4ft)
    
    # Window detection thresholds
    min_window_width: float = 18.0  # Minimum window width
    max_window_width: float = 96.0  # Maximum window width (8ft)
    
    # Scale detection
    common_scales: List[str] = field(default_factory=lambda: [
        "1/4\"=1'-0\"", "1/8\"=1'-0\"", "3/16\"=1'-0\"", 
        "1:48", "1:96", "1:24", "1:100", "1:50"
    ])
    
    # Layer hints for better classification
    wall_layer_keywords: List[str] = field(default_factory=lambda: [
        "wall", "walls", "a-wall", "s-wall", "partition"
    ])
    door_layer_keywords: List[str] = field(default_factory=lambda: [
        "door", "doors", "a-door", "opening"
    ])
    window_layer_keywords: List[str] = field(default_factory=lambda: [
        "window", "windows", "a-glaz", "glazing"
    ])
    room_layer_keywords: List[str] = field(default_factory=lambda: [
        "room", "space", "area", "a-area", "text", "anno"
    ])


class CADParserError(Exception):
    """Base exception for CAD parsing errors."""


# ============================================================================
# Geometry Helpers
# ============================================================================

def point_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Calculate Euclidean distance between two points."""
    return math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)


def point_to_line_distance(
    point: Tuple[float, float],
    line_start: Tuple[float, float],
    line_end: Tuple[float, float]
) -> float:
    """Calculate perpendicular distance from a point to a line segment."""
    x0, y0 = point
    x1, y1 = line_start
    x2, y2 = line_end
    
    # Line length squared
    line_len_sq = (x2 - x1)**2 + (y2 - y1)**2
    
    if line_len_sq == 0:
        return point_distance(point, line_start)
    
    # Projection parameter
    t = max(0, min(1, ((x0 - x1) * (x2 - x1) + (y0 - y1) * (y2 - y1)) / line_len_sq))
    
    # Closest point on line segment
    proj_x = x1 + t * (x2 - x1)
    proj_y = y1 + t * (y2 - y1)
    
    return point_distance(point, (proj_x, proj_y))


def lines_are_parallel(
    line1: Tuple[Tuple[float, float], Tuple[float, float]],
    line2: Tuple[Tuple[float, float], Tuple[float, float]],
    angle_tolerance: float = 5.0  # degrees
) -> bool:
    """Check if two lines are parallel within a tolerance."""
    dx1 = line1[1][0] - line1[0][0]
    dy1 = line1[1][1] - line1[0][1]
    dx2 = line2[1][0] - line2[0][0]
    dy2 = line2[1][1] - line2[0][1]
    
    # Calculate angles
    angle1 = math.atan2(dy1, dx1)
    angle2 = math.atan2(dy2, dx2)
    
    # Normalize angle difference
    diff = abs(angle1 - angle2) % math.pi
    diff = min(diff, math.pi - diff)
    
    return diff < math.radians(angle_tolerance)


def lines_overlap_projection(
    line1: Tuple[Tuple[float, float], Tuple[float, float]],
    line2: Tuple[Tuple[float, float], Tuple[float, float]],
    min_overlap: float = 0.3  # 30% overlap required
) -> bool:
    """Check if two parallel lines have overlapping projections."""
    # Project both lines onto the dominant axis
    dx = abs(line1[1][0] - line1[0][0])
    dy = abs(line1[1][1] - line1[0][1])
    
    if dx > dy:  # Mostly horizontal
        proj1 = sorted([line1[0][0], line1[1][0]])
        proj2 = sorted([line2[0][0], line2[1][0]])
    else:  # Mostly vertical
        proj1 = sorted([line1[0][1], line1[1][1]])
        proj2 = sorted([line2[0][1], line2[1][1]])
    
    # Calculate overlap
    overlap_start = max(proj1[0], proj2[0])
    overlap_end = min(proj1[1], proj2[1])
    overlap = max(0, overlap_end - overlap_start)
    
    # Calculate minimum line length
    len1 = proj1[1] - proj1[0]
    len2 = proj2[1] - proj2[0]
    min_len = min(len1, len2)
    
    if min_len == 0:
        return False
    
    return (overlap / min_len) >= min_overlap


def polygon_area(points: List[Tuple[float, float]]) -> float:
    """Calculate area of a polygon using the shoelace formula."""
    n = len(points)
    if n < 3:
        return 0.0
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += points[i][0] * points[j][1]
        area -= points[j][0] * points[i][1]
    return abs(area) / 2.0


def polygon_centroid(points: List[Tuple[float, float]]) -> Tuple[float, float]:
    """Calculate centroid of a polygon."""
    n = len(points)
    if n == 0:
        return (0.0, 0.0)
    cx = sum(p[0] for p in points) / n
    cy = sum(p[1] for p in points) / n
    return (cx, cy)


def point_in_polygon(point: Tuple[float, float], polygon: List[Tuple[float, float]]) -> bool:
    """Check if a point is inside a polygon using ray casting."""
    x, y = point
    n = len(polygon)
    inside = False
    
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    
    return inside


# ============================================================================
# CAD Parser
# ============================================================================

class CADParser:
    """
    Service for parsing DWG/DXF CAD files into an `ExtractionResult`.

    Uses multi-pass extraction for improved accuracy:
    1. Raw geometry collection
    2. Wall detection with thickness analysis
    3. Room detection with area calculation
    4. Opening detection (doors/windows)
    5. Scale detection
    6. Spatial relationship analysis

    Usage:
        parser = CADParser()
        result = parser.parse_dwg_dxf(
            file_bytes=file_bytes,
            file_url=file_url,
            file_type="dxf",
        )
    """

    def __init__(self, config: Optional[CADParserConfig] = None) -> None:
        self.config = config or CADParserConfig()

    def parse_dwg_dxf(
        self,
        *,
        file_bytes: bytes,
        file_url: str,
        file_type: FileType,
    ) -> ExtractionResult:
        """
        Parse a DWG/DXF file into a unified `ExtractionResult`.

        Args:
            file_bytes: Raw DWG/DXF file content.
            file_url: Public or emulator URL for the file in Storage.
            file_type: `"dwg"` or `"dxf"`.

        Returns:
            ExtractionResult shaped dict.

        Raises:
            CADParserError: On unsupported type or ezdxf failures.
        """
        if file_type not in ("dwg", "dxf"):
            raise CADParserError(
                f"Unsupported file_type '{file_type}' for CADParser.parse_dwg_dxf. "
                "Expected 'dwg' or 'dxf'."
            )

        # Write bytes to a temporary file so we can delegate to ezdxf.readfile.
        try:
            with NamedTemporaryFile(suffix=f".{file_type}", delete=False, mode='wb') as tmp:
                tmp.write(file_bytes)
                tmp.flush()
                tmp_name = tmp.name
            
            try:
                doc = ezdxf.readfile(tmp_name)
            finally:
                try:
                    os.unlink(tmp_name)
                except OSError:
                    pass
                    
        except Exception as exc:
            import traceback
            traceback.print_exc()
            raise CADParserError(f"Failed to parse {file_type.upper()} CAD file: {exc}") from exc

        # Multi-pass extraction
        raw_geometry = self._pass1_collect_geometry(doc)
        walls = self._pass2_detect_walls(raw_geometry)
        rooms = self._pass3_detect_rooms(raw_geometry, walls)
        openings = self._pass4_detect_openings(raw_geometry, walls)
        scale_info = self._pass5_detect_scale(raw_geometry, doc)
        adjacencies, entry_points = self._pass6_analyze_relationships(rooms, walls, openings)
        
        # Calculate totals
        total_sqft = sum(r["sqft"] for r in rooms) if rooms else raw_geometry["total_area"]
        
        space_model: SpaceModel = {
            "totalSqft": total_sqft,
            "boundingBox": {
                "length": raw_geometry["bbox_length"],
                "width": raw_geometry["bbox_width"],
                "height": 96.0,  # Default 8' ceiling
                "units": self.config.default_units,
            },
            "scale": scale_info,
            "rooms": rooms,
            "walls": walls,
            "openings": openings,
        }

        # Build narrative
        narrative = self._build_narrative(raw_geometry, rooms, walls, openings, scale_info)
        
        spatial_relationships: SpatialRelationships = {
            "layoutNarrative": narrative,
            "roomAdjacencies": adjacencies,
            "entryPoints": entry_points,
        }

        # Calculate overall confidence
        confidence = self._calculate_confidence(rooms, walls, openings, scale_info, raw_geometry)

        result: ExtractionResult = {
            "fileUrl": file_url,
            "fileType": file_type,
            "extractionMethod": "ezdxf",
            "extractionConfidence": confidence,
            "spaceModel": space_model,
            "spatialRelationships": spatial_relationships,
            "rawExtraction": raw_geometry["raw"],
        }

        return result

    # ========================================================================
    # Pass 1: Collect Raw Geometry
    # ========================================================================
    
    def _pass1_collect_geometry(self, doc: Any) -> Dict[str, Any]:
        """
        Pass 1: Extract all geometric entities from the DXF document.
        """
        msp = doc.modelspace()
        
        lines: List[Dict[str, Any]] = []
        polylines: List[Dict[str, Any]] = []
        texts: List[Dict[str, Any]] = []
        dimensions: List[Dict[str, Any]] = []
        circles: List[Dict[str, Any]] = []
        arcs: List[Dict[str, Any]] = []
        blocks: List[Dict[str, Any]] = []
        
        min_x, min_y = float('inf'), float('inf')
        max_x, max_y = float('-inf'), float('-inf')
        
        entity_count = 0
        layer_names: Set[str] = set()
        
        for entity in msp:
            entity_count += 1
            layer = getattr(entity.dxf, 'layer', 'default') if hasattr(entity, 'dxf') else 'default'
            layer_names.add(layer)
            
            try:
                entity_type = entity.dxftype()
                
                if entity_type == 'LINE':
                    start = (entity.dxf.start.x, entity.dxf.start.y)
                    end = (entity.dxf.end.x, entity.dxf.end.y)
                    length = point_distance(start, end)
                    
                    if length > 0.1:  # Skip degenerate lines
                        lines.append({
                            "start": start,
                            "end": end,
                            "length": length,
                            "layer": layer,
                            "angle": math.atan2(end[1] - start[1], end[0] - start[0]),
                        })
                        min_x, min_y = min(min_x, start[0], end[0]), min(min_y, start[1], end[1])
                        max_x, max_y = max(max_x, start[0], end[0]), max(max_y, start[1], end[1])
                
                elif entity_type == 'LWPOLYLINE':
                    points = list(entity.get_points(format='xy'))
                    if len(points) >= 2:
                        polylines.append({
                            "points": points,
                            "closed": entity.closed,
                            "layer": layer,
                        })
                        for p in points:
                            min_x, min_y = min(min_x, p[0]), min(min_y, p[1])
                            max_x, max_y = max(max_x, p[0]), max(max_y, p[1])
                
                elif entity_type == 'POLYLINE':
                    points = [(v.dxf.location.x, v.dxf.location.y) for v in entity.vertices]
                    if len(points) >= 2:
                        polylines.append({
                            "points": points,
                            "closed": entity.is_closed,
                            "layer": layer,
                        })
                        for p in points:
                            min_x, min_y = min(min_x, p[0]), min(min_y, p[1])
                            max_x, max_y = max(max_x, p[0]), max(max_y, p[1])
                
                elif entity_type in ('TEXT', 'MTEXT'):
                    insert = getattr(entity.dxf, 'insert', (0, 0, 0))
                    text_content = getattr(entity.dxf, 'text', '') or getattr(entity, 'text', '')
                    height = getattr(entity.dxf, 'height', 1.0)
                    
                    if text_content.strip():
                        pos = (insert[0], insert[1]) if hasattr(insert, '__iter__') else (0, 0)
                        texts.append({
                            "text": text_content.strip(),
                            "position": pos,
                            "height": height,
                            "layer": layer,
                        })
                
                elif entity_type == 'DIMENSION':
                    # Extract dimension information for scale detection
                    try:
                        dim_text = getattr(entity, 'text', '') or getattr(entity.dxf, 'text', '')
                        measurement = getattr(entity, 'measurement', None)
                        dimensions.append({
                            "text": dim_text,
                            "measurement": measurement,
                            "layer": layer,
                        })
                    except Exception:
                        pass
                
                elif entity_type == 'CIRCLE':
                    center = entity.dxf.center
                    circles.append({
                        "center": (center.x, center.y),
                        "radius": entity.dxf.radius,
                        "layer": layer,
                    })
                
                elif entity_type == 'ARC':
                    center = entity.dxf.center
                    arcs.append({
                        "center": (center.x, center.y),
                        "radius": entity.dxf.radius,
                        "start_angle": entity.dxf.start_angle,
                        "end_angle": entity.dxf.end_angle,
                        "layer": layer,
                    })
                
                elif entity_type == 'INSERT':
                    # Block reference
                    insert_pos = entity.dxf.insert
                    block_name = entity.dxf.name
                    blocks.append({
                        "name": block_name,
                        "position": (insert_pos.x, insert_pos.y),
                        "layer": layer,
                    })
                    
            except Exception as e:
                print(f"[CADParser] Skipping entity {entity.dxftype() if hasattr(entity, 'dxftype') else 'unknown'}: {e}")
                continue
        
        # Calculate bounding box
        if min_x == float('inf'):
            bbox_length, bbox_width = 0.0, 0.0
        else:
            bbox_length = max_x - min_x
            bbox_width = max_y - min_y
        
        return {
            "lines": lines,
            "polylines": polylines,
            "texts": texts,
            "dimensions": dimensions,
            "circles": circles,
            "arcs": arcs,
            "blocks": blocks,
            "bbox_length": round(bbox_length, 2),
            "bbox_width": round(bbox_width, 2),
            "bbox_min": (min_x, min_y) if min_x != float('inf') else (0, 0),
            "bbox_max": (max_x, max_y) if max_x != float('-inf') else (0, 0),
            "total_area": bbox_length * bbox_width,
            "entity_count": entity_count,
            "layer_names": list(layer_names),
            "raw": {
                "entity_count": entity_count,
                "layer_names": list(layer_names),
                "line_count": len(lines),
                "polyline_count": len(polylines),
                "text_count": len(texts),
                "dimension_count": len(dimensions),
                "circle_count": len(circles),
                "arc_count": len(arcs),
                "block_count": len(blocks),
                "text_samples": [t["text"][:50] for t in texts[:15] if t["text"]],
            },
        }

    # ========================================================================
    # Pass 2: Detect Walls with Thickness (Enhanced)
    # ========================================================================
    
    def _pass2_detect_walls(self, geometry: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Pass 2: Enhanced wall detection using multiple strategies.
        
        Strategies:
        1. Parallel line pairs (walls with thickness)
        2. Room boundary polyline edges
        3. Building outline detection (largest closed polyline)
        4. Layer-based detection (walls, a-wall, etc.)
        5. Lines on wall-like layers
        """
        walls: List[Dict[str, Any]] = []
        used_lines: Set[int] = set()
        wall_id = 0
        lines = geometry["lines"]
        polylines = geometry["polylines"]
        
        # Strategy 1: Find parallel line pairs (walls with thickness)
        for i, line1 in enumerate(lines):
            if i in used_lines:
                continue
            if line1["length"] < self.config.min_wall_length:
                continue
                
            best_pair = None
            best_thickness = float('inf')
            
            for j, line2 in enumerate(lines):
                if j <= i or j in used_lines:
                    continue
                if line2["length"] < self.config.min_wall_length:
                    continue
                
                l1 = (line1["start"], line1["end"])
                l2 = (line2["start"], line2["end"])
                
                if not lines_are_parallel(l1, l2):
                    continue
                
                if not lines_overlap_projection(l1, l2, min_overlap=0.5):
                    continue
                
                mid1 = ((l1[0][0] + l1[1][0]) / 2, (l1[0][1] + l1[1][1]) / 2)
                dist = point_to_line_distance(mid1, l2[0], l2[1])
                
                if dist < self.config.max_wall_thickness and dist < best_thickness:
                    best_pair = j
                    best_thickness = dist
            
            wall_id += 1
            layer = line1["layer"].lower()
            wall_type = self._classify_wall_type(layer, line1["start"], line1["end"], geometry)
            
            if best_pair is not None:
                used_lines.add(i)
                used_lines.add(best_pair)
                thickness = round(best_thickness, 1)
                confidence = 0.85
            else:
                used_lines.add(i)
                thickness = 4.0
                confidence = 0.6
            
            walls.append({
                "id": f"wall_{wall_id}",
                "length": round(line1["length"], 2),
                "height": 96.0,
                "thickness": thickness,
                "type": wall_type,
                "material": None,
                "connectsRooms": [],
                "adjacentWalls": [],
                "confidence": confidence,
                "startPoint": line1["start"],
                "endPoint": line1["end"],
            })
        
        # Strategy 2: Find building outline (largest closed polyline = exterior walls)
        largest_poly = None
        largest_area = 0
        for poly in polylines:
            if poly["closed"] and len(poly["points"]) >= 4:
                area = polygon_area(poly["points"])
                if area > largest_area:
                    largest_area = area
                    largest_poly = poly
        
        if largest_poly:
            # The largest closed polyline is likely the building footprint
            points = largest_poly["points"]
            for i in range(len(points)):
                j = (i + 1) % len(points)
                p1, p2 = points[i], points[j]
                length = point_distance(p1, p2)
                
                if length >= self.config.min_wall_length:
                    # Check if this edge is already represented by a wall
                    if not self._wall_exists_at(walls, p1, p2):
                        wall_id += 1
                        walls.append({
                            "id": f"wall_{wall_id}",
                            "length": round(length, 2),
                            "height": 96.0,
                            "thickness": 6.0,  # Exterior walls typically thicker
                            "type": "exterior",
                            "material": None,
                            "connectsRooms": [],
                            "adjacentWalls": [],
                            "confidence": 0.8,
                            "startPoint": p1,
                            "endPoint": p2,
                        })
        
        # Strategy 3: Room boundary edges as interior walls
        for poly in polylines:
            if not poly["closed"] or len(poly["points"]) < 3:
                continue
            
            # Skip if this is the building outline we already processed
            if poly == largest_poly:
                continue
            
            area = polygon_area(poly["points"])
            # Skip if too small (not a room) or too large (building outline)
            if area < self.config.min_room_area or (largest_area > 0 and area > largest_area * 0.9):
                continue
            
            layer = poly["layer"].lower()
            points = poly["points"]
            
            for i in range(len(points)):
                j = (i + 1) % len(points)
                p1, p2 = points[i], points[j]
                length = point_distance(p1, p2)
                
                if length >= self.config.min_wall_length:
                    if not self._wall_exists_at(walls, p1, p2):
                        wall_id += 1
                        walls.append({
                            "id": f"wall_{wall_id}",
                            "length": round(length, 2),
                            "height": 96.0,
                            "thickness": 4.0,
                            "type": "interior",
                            "material": None,
                            "connectsRooms": [],
                            "adjacentWalls": [],
                            "confidence": 0.7,
                            "startPoint": p1,
                            "endPoint": p2,
                        })
        
        # Strategy 4: Lines on wall layers
        for i, line in enumerate(lines):
            if i in used_lines:
                continue
            
            layer = line["layer"].lower()
            is_wall_layer = any(kw in layer for kw in self.config.wall_layer_keywords)
            
            if is_wall_layer and line["length"] >= self.config.min_wall_length:
                if not self._wall_exists_at(walls, line["start"], line["end"]):
                    wall_id += 1
                    wall_type = self._classify_wall_type(layer, line["start"], line["end"], geometry)
                    walls.append({
                        "id": f"wall_{wall_id}",
                        "length": round(line["length"], 2),
                        "height": 96.0,
                        "thickness": 4.0,
                        "type": wall_type,
                        "material": None,
                        "connectsRooms": [],
                        "adjacentWalls": [],
                        "confidence": 0.75,
                        "startPoint": line["start"],
                        "endPoint": line["end"],
                    })
        
        return walls
    
    def _wall_exists_at(
        self, 
        walls: List[Dict[str, Any]], 
        p1: Tuple[float, float], 
        p2: Tuple[float, float],
        tolerance: float = 5.0
    ) -> bool:
        """Check if a wall already exists at the given location."""
        for wall in walls:
            wp1 = wall["startPoint"]
            wp2 = wall["endPoint"]
            
            # Check if endpoints match (in either order)
            if (point_distance(p1, wp1) < tolerance and point_distance(p2, wp2) < tolerance) or \
               (point_distance(p1, wp2) < tolerance and point_distance(p2, wp1) < tolerance):
                return True
        
        return False
    
    def _classify_wall_type(
        self, 
        layer: str, 
        start: Tuple[float, float], 
        end: Tuple[float, float],
        geometry: Dict[str, Any]
    ) -> str:
        """Classify wall type based on layer and position."""
        # Layer-based classification
        if any(kw in layer for kw in ["ext", "outer", "facade", "perim"]):
            return "exterior"
        if any(kw in layer for kw in ["struct", "load", "bearing"]):
            return "load_bearing"
        if any(kw in layer for kw in ["part", "int", "interior"]):
            return "interior"
        
        # Position-based: walls at drawing boundary are likely exterior
        bbox_min = geometry["bbox_min"]
        bbox_max = geometry["bbox_max"]
        margin = min(geometry["bbox_length"], geometry["bbox_width"]) * 0.05
        
        # Check if wall is at the edge of the drawing
        at_edge = (
            (abs(start[0] - bbox_min[0]) < margin and abs(end[0] - bbox_min[0]) < margin) or
            (abs(start[0] - bbox_max[0]) < margin and abs(end[0] - bbox_max[0]) < margin) or
            (abs(start[1] - bbox_min[1]) < margin and abs(end[1] - bbox_min[1]) < margin) or
            (abs(start[1] - bbox_max[1]) < margin and abs(end[1] - bbox_max[1]) < margin)
        )
        
        if at_edge:
            return "exterior"
        
        return "interior"

    # ========================================================================
    # Pass 3: Detect Rooms with Enhanced Labeling
    # ========================================================================
    
    def _pass3_detect_rooms(
        self, 
        geometry: Dict[str, Any], 
        walls: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Pass 3: Detect rooms from closed polylines with enhanced text matching.
        
        Improved logic:
        - Use centroid-based text matching (not just bounding box)
        - Calculate room areas accurately with shoelace formula
        - Detect room type from text labels
        - Assign confidence based on label quality
        """
        rooms: List[Dict[str, Any]] = []
        texts = geometry["texts"]
        room_id = 0
        
        for poly in geometry["polylines"]:
            if not poly["closed"] or len(poly["points"]) < 3:
                continue
            
            points = poly["points"]
            area = polygon_area(points)
            
            # Skip if too small or too large
            if area < self.config.min_room_area:
                continue
            
            # Calculate dimensions
            min_x = min(p[0] for p in points)
            max_x = max(p[0] for p in points)
            min_y = min(p[1] for p in points)
            max_y = max(p[1] for p in points)
            length = max_x - min_x
            width = max_y - min_y
            
            # Skip if aspect ratio is too extreme (probably not a room)
            if length == 0 or width == 0:
                continue
            aspect_ratio = max(length, width) / min(length, width)
            if aspect_ratio > self.config.max_room_aspect_ratio:
                continue
            
            # Find room label using multiple strategies
            centroid = polygon_centroid(points)
            room_label = self._find_room_label_enhanced(points, centroid, texts)
            room_type = self._guess_room_type_enhanced(room_label)
            
            room_id += 1
            
            # Determine confidence based on label quality
            if room_label:
                # Check if it's a standard room label
                is_standard_label = any(
                    kw in room_label.lower() 
                    for kw in ["bedroom", "bath", "kitchen", "living", "dining", "garage", 
                              "closet", "laundry", "office", "hall", "entry", "master"]
                )
                confidence = 0.9 if is_standard_label else 0.75
            else:
                confidence = 0.5
            
            rooms.append({
                "id": f"room_{room_id}",
                "name": room_label or f"Room {room_id}",
                "type": room_type,
                "sqft": round(area, 1),
                "dimensions": {
                    "length": round(length, 1),
                    "width": round(width, 1),
                    "height": 96.0,
                },
                "confidence": confidence,
                "needsVerification": room_label is None,
                "centroid": centroid,
                "polygon": points,
            })
        
        return rooms

    def _find_room_label_enhanced(
        self,
        polygon_points: List[Tuple[float, float]],
        centroid: Tuple[float, float],
        texts: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        Enhanced room label detection using multiple strategies:
        1. Text inside polygon (highest priority)
        2. Text near centroid
        3. Text within bounding box
        """
        if not texts:
            return None
        
        # Strategy 1: Find text inside the polygon
        for text_item in texts:
            pos = text_item["position"]
            text = text_item["text"].strip()
            
            if not text or len(text) > 50 or len(text) < 2:
                continue
            
            # Skip dimension-like text
            if self._is_dimension_text(text):
                continue
            
            if point_in_polygon(pos, polygon_points):
                return text
        
        # Strategy 2: Find text closest to centroid
        min_dist = float('inf')
        closest_text = None
        
        for text_item in texts:
            pos = text_item["position"]
            text = text_item["text"].strip()
            
            if not text or len(text) > 50 or len(text) < 2:
                continue
            if self._is_dimension_text(text):
                continue
            
            dist = point_distance(pos, centroid)
            
            # Only consider if within reasonable distance
            bbox_size = max(
                max(p[0] for p in polygon_points) - min(p[0] for p in polygon_points),
                max(p[1] for p in polygon_points) - min(p[1] for p in polygon_points)
            )
            
            if dist < bbox_size * 0.5 and dist < min_dist:
                min_dist = dist
                closest_text = text
        
        return closest_text

    def _is_dimension_text(self, text: str) -> bool:
        """Check if text looks like a dimension rather than a room label."""
        import re
        
        # Common dimension patterns
        dimension_patterns = [
            r"^\d+['\"]",  # Starts with number and foot/inch
            r"^\d+-\d+",  # Foot-inch format
            r"^\d+\.\d+$",  # Decimal number
            r"^\d+\s*(ft|in|mm|cm|m)$",  # Number with unit
            r"^\d+x\d+",  # Dimension format
            r"^[<>=]",  # Comparison symbols
        ]
        
        for pattern in dimension_patterns:
            if re.match(pattern, text, re.IGNORECASE):
                return True
        
        return False

    def _guess_room_type_enhanced(self, room_name: Optional[str]) -> str:
        """Enhanced room type detection with more keywords."""
        if not room_name:
            return "unknown"
        
        name_lower = room_name.lower()
        
        type_keywords = {
            "kitchen": ["kitchen", "kit", "ktchn", "cocina", "küche"],
            "bathroom": ["bathroom", "bath", "wc", "w.c.", "toilet", "restroom", 
                        "lavatory", "powder", "half bath", "full bath", "shower"],
            "bedroom": ["bedroom", "bed", "bdrm", "br", "master", "mbr", "guest"],
            "living_room": ["living", "lounge", "family", "great room", "sitting", 
                           "tv room", "media"],
            "dining": ["dining", "dinette", "eat-in", "breakfast"],
            "garage": ["garage", "gar", "carport", "car port", "parking"],
            "closet": ["closet", "clst", "wic", "walk-in", "wardrobe", "linen"],
            "storage": ["storage", "stor", "mechanical", "utility room"],
            "pantry": ["pantry", "butler"],
            "laundry": ["laundry", "utility", "mud room", "mudroom"],
            "office": ["office", "study", "den", "library", "home office"],
            "hallway": ["hall", "corridor", "entry", "foyer", "vestibule", "lobby"],
            "stairs": ["stair", "steps", "landing"],
            "balcony": ["balcony", "deck", "patio", "terrace", "porch", "veranda"],
            "basement": ["basement", "cellar"],
            "attic": ["attic", "loft"],
        }
        
        for room_type, keywords in type_keywords.items():
            for kw in keywords:
                if kw in name_lower:
                    return room_type
        
        return "other"

    # ========================================================================
    # Pass 4: Detect Openings (Doors & Windows) - Enhanced
    # ========================================================================
    
    def _pass4_detect_openings(
        self, 
        geometry: Dict[str, Any],
        walls: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Pass 4: Enhanced door and window detection.
        
        Door detection:
        1. 90-degree arcs (door swings)
        2. Block references with door keywords
        3. Door layer lines
        
        Window detection:
        1. Block references with window keywords
        2. Small rectangles on exterior walls
        3. Window layer lines (parallel short lines)
        4. Gaps in wall lines
        5. Lines on glazing/window layers
        """
        openings: List[Dict[str, Any]] = []
        opening_id = 0
        
        # =====================================================================
        # DOOR DETECTION
        # =====================================================================
        
        # Strategy 1: Doors from arc swings
        for arc in geometry["arcs"]:
            angle_span = abs(arc["end_angle"] - arc["start_angle"])
            radius = arc["radius"]
            layer = arc["layer"].lower()
            
            is_door_arc = (
                self.config.door_arc_angle_min <= angle_span <= self.config.door_arc_angle_max
                and self.config.min_door_width / 2 <= radius <= self.config.max_door_width / 2
            )
            
            is_door_layer = any(kw in layer for kw in self.config.door_layer_keywords)
            
            if is_door_arc or is_door_layer:
                opening_id += 1
                width = radius * 2
                
                mid_angle = (arc["start_angle"] + arc["end_angle"]) / 2
                swing = "in" if 0 <= mid_angle <= 180 else "out"
                
                # Find which wall this door is in
                in_wall = self._find_wall_for_opening(arc["center"], walls)
                
                openings.append({
                    "id": f"opening_{opening_id}",
                    "type": "door",
                    "width": round(width, 1),
                    "height": 80.0,
                    "inWall": in_wall,
                    "connectsRooms": [],
                    "position": {
                        "center": arc["center"],
                        "distanceFromCorner": 0,
                        "side": "center",
                    },
                    "swing": swing,
                    "confidence": 0.8 if is_door_arc else 0.65,
                })
        
        # Strategy 2: Doors from blocks
        door_keywords = ["door", "dr", "d-", "swing", "entry", "exit"]
        
        for block in geometry["blocks"]:
            name_lower = block["name"].lower()
            layer_lower = block["layer"].lower()
            
            if any(kw in name_lower or kw in layer_lower for kw in door_keywords):
                # Check if we already have a door near this position
                if not self._opening_exists_at(openings, block["position"], "door"):
                    opening_id += 1
                    in_wall = self._find_wall_for_opening(block["position"], walls)
                    
                    openings.append({
                        "id": f"opening_{opening_id}",
                        "type": "door",
                        "width": 36.0,
                        "height": 80.0,
                        "inWall": in_wall,
                        "connectsRooms": [],
                        "position": {
                            "center": block["position"],
                            "distanceFromCorner": 0,
                            "side": "center",
                        },
                        "swing": "in",
                        "confidence": 0.75,
                    })
        
        # =====================================================================
        # WINDOW DETECTION
        # =====================================================================
        
        window_keywords = ["window", "win", "w-", "glazing", "glaz", "glass", "fenest"]
        
        # Strategy 1: Windows from blocks
        for block in geometry["blocks"]:
            name_lower = block["name"].lower()
            layer_lower = block["layer"].lower()
            
            if any(kw in name_lower or kw in layer_lower for kw in window_keywords):
                if not self._opening_exists_at(openings, block["position"], "window"):
                    opening_id += 1
                    in_wall = self._find_wall_for_opening(block["position"], walls)
                    
                    openings.append({
                        "id": f"opening_{opening_id}",
                        "type": "window",
                        "width": 36.0,
                        "height": 48.0,
                        "inWall": in_wall,
                        "connectsRooms": [],
                        "position": {
                            "center": block["position"],
                            "distanceFromCorner": 0,
                            "side": "center",
                        },
                        "swing": "fixed",
                        "confidence": 0.8,
                    })
        
        # Strategy 2: Windows from small rectangles on exterior walls
        exterior_walls = [w for w in walls if w["type"] == "exterior"]
        
        for poly in geometry["polylines"]:
            if not poly["closed"] or len(poly["points"]) != 4:
                continue
            
            points = poly["points"]
            area = polygon_area(points)
            
            # Window-sized rectangle (roughly 2-12 sq ft in drawing units)
            # Assuming inches: 288 sq in to 1728 sq in (2-12 sq ft)
            min_window_area = self.config.min_window_width * 24  # width * min height
            max_window_area = self.config.max_window_width * 60  # width * max height
            
            if min_window_area <= area <= max_window_area:
                # Check if this rectangle is near an exterior wall
                centroid = polygon_centroid(points)
                
                for wall in exterior_walls:
                    dist = point_to_line_distance(centroid, wall["startPoint"], wall["endPoint"])
                    
                    # If centroid is within 12 units of an exterior wall
                    if dist < 12:
                        if not self._opening_exists_at(openings, centroid, "window"):
                            opening_id += 1
                            
                            # Calculate width from rectangle
                            width = max(
                                point_distance(points[0], points[1]),
                                point_distance(points[1], points[2])
                            )
                            
                            openings.append({
                                "id": f"opening_{opening_id}",
                                "type": "window",
                                "width": round(width, 1),
                                "height": 48.0,
                                "inWall": wall["id"],
                                "connectsRooms": [],
                                "position": {
                                    "center": centroid,
                                    "distanceFromCorner": 0,
                                    "side": "center",
                                },
                                "swing": "fixed",
                                "confidence": 0.7,
                            })
                        break
        
        # Strategy 3: Windows from lines on window/glazing layers
        window_lines: List[Dict[str, Any]] = []
        for line in geometry["lines"]:
            layer = line["layer"].lower()
            if any(kw in layer for kw in window_keywords):
                window_lines.append(line)
        
        # Group nearby parallel short lines as windows
        used_window_lines: Set[int] = set()
        for i, line1 in enumerate(window_lines):
            if i in used_window_lines:
                continue
            
            # Window lines are typically short (2-8 feet)
            if not (self.config.min_window_width <= line1["length"] <= self.config.max_window_width):
                continue
            
            # Find parallel lines nearby (window symbol pattern)
            parallel_group = [i]
            for j, line2 in enumerate(window_lines):
                if j <= i or j in used_window_lines:
                    continue
                
                l1 = (line1["start"], line1["end"])
                l2 = (line2["start"], line2["end"])
                
                if lines_are_parallel(l1, l2):
                    mid1 = ((l1[0][0] + l1[1][0]) / 2, (l1[0][1] + l1[1][1]) / 2)
                    dist = point_to_line_distance(mid1, l2[0], l2[1])
                    
                    # Parallel lines within ~6 inches = likely window symbol
                    if dist < 6:
                        parallel_group.append(j)
            
            if len(parallel_group) >= 2:
                # Multiple parallel lines = window symbol
                for idx in parallel_group:
                    used_window_lines.add(idx)
                
                mid = ((line1["start"][0] + line1["end"][0]) / 2, 
                       (line1["start"][1] + line1["end"][1]) / 2)
                
                if not self._opening_exists_at(openings, mid, "window"):
                    opening_id += 1
                    in_wall = self._find_wall_for_opening(mid, walls)
                    
                    openings.append({
                        "id": f"opening_{opening_id}",
                        "type": "window",
                        "width": round(line1["length"], 1),
                        "height": 48.0,
                        "inWall": in_wall,
                        "connectsRooms": [],
                        "position": {
                            "center": mid,
                            "distanceFromCorner": 0,
                            "side": "center",
                        },
                        "swing": "fixed",
                        "confidence": 0.75,
                    })
            else:
                # Single line on window layer - still likely a window
                used_window_lines.add(i)
                mid = ((line1["start"][0] + line1["end"][0]) / 2,
                       (line1["start"][1] + line1["end"][1]) / 2)
                
                if not self._opening_exists_at(openings, mid, "window"):
                    opening_id += 1
                    in_wall = self._find_wall_for_opening(mid, walls)
                    
                    openings.append({
                        "id": f"opening_{opening_id}",
                        "type": "window",
                        "width": round(line1["length"], 1),
                        "height": 48.0,
                        "inWall": in_wall,
                        "connectsRooms": [],
                        "position": {
                            "center": mid,
                            "distanceFromCorner": 0,
                            "side": "center",
                        },
                        "swing": "fixed",
                        "confidence": 0.65,
                    })
        
        # Strategy 4: Detect gaps in exterior walls (potential windows)
        openings = self._detect_gaps_in_walls(openings, walls, geometry, opening_id)
        
        return openings
    
    def _opening_exists_at(
        self, 
        openings: List[Dict[str, Any]], 
        position: Tuple[float, float],
        opening_type: str,
        tolerance: float = 24.0
    ) -> bool:
        """Check if an opening of the given type already exists near this position."""
        for opening in openings:
            if opening["type"] != opening_type:
                continue
            pos = opening["position"].get("center", (0, 0))
            if pos and point_distance(position, pos) < tolerance:
                return True
        return False
    
    def _find_wall_for_opening(
        self, 
        position: Tuple[float, float], 
        walls: List[Dict[str, Any]],
        max_distance: float = 24.0
    ) -> str:
        """Find the wall that contains or is nearest to the opening."""
        best_wall = ""
        best_dist = float('inf')
        
        for wall in walls:
            dist = point_to_line_distance(position, wall["startPoint"], wall["endPoint"])
            if dist < best_dist and dist < max_distance:
                best_dist = dist
                best_wall = wall["id"]
        
        return best_wall
    
    def _detect_gaps_in_walls(
        self,
        openings: List[Dict[str, Any]],
        walls: List[Dict[str, Any]],
        geometry: Dict[str, Any],
        current_id: int
    ) -> List[Dict[str, Any]]:
        """
        Detect windows from gaps in exterior wall lines.
        
        If there are breaks/gaps in wall lines along exterior walls,
        these may represent windows.
        """
        opening_id = current_id
        exterior_walls = [w for w in walls if w["type"] == "exterior"]
        
        # For each exterior wall, look for gaps
        for wall in exterior_walls:
            start = wall["startPoint"]
            end = wall["endPoint"]
            wall_length = wall["length"]
            
            # Find all lines that are collinear with this wall
            collinear_segments: List[Tuple[float, float]] = []
            
            for line in geometry["lines"]:
                l = (line["start"], line["end"])
                w = (start, end)
                
                # Check if line is roughly on the same path as wall
                if lines_are_parallel(l, w, angle_tolerance=3.0):
                    # Project onto wall direction
                    dx = end[0] - start[0]
                    dy = end[1] - start[1]
                    
                    if abs(dx) > abs(dy):
                        # Horizontal wall - project X coordinates
                        t1 = (line["start"][0] - start[0]) / dx if dx != 0 else 0
                        t2 = (line["end"][0] - start[0]) / dx if dx != 0 else 0
                    else:
                        # Vertical wall - project Y coordinates
                        t1 = (line["start"][1] - start[1]) / dy if dy != 0 else 0
                        t2 = (line["end"][1] - start[1]) / dy if dy != 0 else 0
                    
                    # Check if projection falls within wall segment
                    if (0 <= min(t1, t2) <= 1) or (0 <= max(t1, t2) <= 1):
                        collinear_segments.append((min(t1, t2), max(t1, t2)))
            
            # Look for gaps between segments
            if len(collinear_segments) >= 2:
                # Sort by start position
                collinear_segments.sort()
                
                for i in range(len(collinear_segments) - 1):
                    gap_start = collinear_segments[i][1]
                    gap_end = collinear_segments[i + 1][0]
                    gap_size = (gap_end - gap_start) * wall_length
                    
                    # Gap of 2-6 feet could be a window
                    if self.config.min_window_width <= gap_size <= self.config.max_window_width:
                        # Calculate gap center
                        gap_t = (gap_start + gap_end) / 2
                        gap_center = (
                            start[0] + gap_t * (end[0] - start[0]),
                            start[1] + gap_t * (end[1] - start[1])
                        )
                        
                        if not self._opening_exists_at(openings, gap_center, "window"):
                            opening_id += 1
                            openings.append({
                                "id": f"opening_{opening_id}",
                                "type": "window",
                                "width": round(gap_size, 1),
                                "height": 48.0,
                                "inWall": wall["id"],
                                "connectsRooms": [],
                                "position": {
                                    "center": gap_center,
                                    "distanceFromCorner": 0,
                                    "side": "center",
                                },
                                "swing": "fixed",
                                "confidence": 0.6,
                            })
        
        return openings

    # ========================================================================
    # Pass 5: Detect Scale
    # ========================================================================
    
    def _pass5_detect_scale(
        self, 
        geometry: Dict[str, Any],
        doc: Any
    ) -> Dict[str, Any]:
        """
        Pass 5: Detect drawing scale from DIMENSION entities and text.
        
        Strategies:
        - Check DIMENSION entities for measurement values
        - Look for scale text in title block area
        - Infer scale from common room sizes
        """
        import re
        
        scale_detected = False
        scale_ratio = None
        
        # Strategy 1: Check dimension entities
        for dim in geometry["dimensions"]:
            measurement = dim.get("measurement")
            text = dim.get("text", "")
            
            if measurement and measurement > 0:
                # We found an actual dimension - this helps validate scale
                scale_detected = True
                break
        
        # Strategy 2: Look for scale notation in text
        scale_patterns = [
            r"1/4\s*[\"']\s*=\s*1\s*['\-]",  # 1/4" = 1'-0"
            r"1/8\s*[\"']\s*=\s*1\s*['\-]",  # 1/8" = 1'-0"
            r"3/16\s*[\"']\s*=\s*1\s*['\-]",  # 3/16" = 1'-0"
            r"scale\s*:\s*([\d/]+)",
            r"1\s*:\s*(\d+)",  # 1:48, 1:96, etc.
        ]
        
        scale_text_found = None
        for text_item in geometry["texts"]:
            text = text_item["text"].lower()
            for pattern in scale_patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    scale_detected = True
                    scale_text_found = text_item["text"]
                    
                    # Try to extract ratio
                    match = re.search(r"1\s*:\s*(\d+)", text)
                    if match:
                        scale_ratio = 1.0 / float(match.group(1))
                    break
            if scale_detected:
                break
        
        # Strategy 3: Try to infer from units header
        try:
            header = doc.header
            if hasattr(header, 'get'):
                insunits = header.get('$INSUNITS', 0)
                # 1 = inches, 2 = feet, 4 = mm, 5 = cm, 6 = m
                unit_map = {1: "inches", 2: "feet", 4: "millimeters", 5: "centimeters", 6: "meters"}
                units = unit_map.get(insunits, "feet")
            else:
                units = "feet"
        except Exception:
            units = "feet"
        
        return {
            "detected": scale_detected,
            "ratio": scale_ratio,
            "units": units,
            "scaleText": scale_text_found,
        }

    # ========================================================================
    # Pass 6: Analyze Spatial Relationships
    # ========================================================================
    
    def _pass6_analyze_relationships(
        self,
        rooms: List[Dict[str, Any]],
        walls: List[Dict[str, Any]],
        openings: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Pass 6: Analyze room adjacencies and entry points.
        
        - Find which rooms share walls
        - Determine which openings connect which rooms
        - Identify primary entry points
        """
        adjacencies: List[Dict[str, Any]] = []
        entry_points: List[Dict[str, Any]] = []
        
        # Find room adjacencies based on proximity
        for i, room1 in enumerate(rooms):
            for j, room2 in enumerate(rooms):
                if j <= i:
                    continue
                
                # Check if rooms share any wall segment (simplified)
                c1 = room1.get("centroid", (0, 0))
                c2 = room2.get("centroid", (0, 0))
                
                # Get room dimensions for distance calculation
                dim1 = room1.get("dimensions", {})
                dim2 = room2.get("dimensions", {})
                avg_size = (
                    (dim1.get("length", 0) + dim1.get("width", 0) +
                     dim2.get("length", 0) + dim2.get("width", 0)) / 4
                )
                
                dist = point_distance(c1, c2)
                
                # If centroids are close relative to room sizes, rooms are adjacent
                if dist < avg_size * 1.5 and avg_size > 0:
                    # Check for opening between them
                    connection = "wall"
                    connecting_opening = None
                    
                    for opening in openings:
                        pos = opening.get("position", {}).get("center", (0, 0))
                        
                        # Check if opening is between the two rooms
                        if pos:
                            dist_to_1 = point_distance(pos, c1)
                            dist_to_2 = point_distance(pos, c2)
                            
                            if dist_to_1 < avg_size and dist_to_2 < avg_size:
                                connection = opening["type"]
                                connecting_opening = opening["id"]
                                break
                    
                    adjacencies.append({
                        "room1": room1["id"],
                        "room2": room2["id"],
                        "connection": connection,
                        "openingId": connecting_opening,
                    })
        
        # Identify entry points (doors near the boundary of the drawing)
        bbox_min = (0, 0)
        bbox_max = (0, 0)
        if rooms:
            all_centroids = [r.get("centroid", (0, 0)) for r in rooms]
            if all_centroids:
                bbox_min = (min(c[0] for c in all_centroids), min(c[1] for c in all_centroids))
                bbox_max = (max(c[0] for c in all_centroids), max(c[1] for c in all_centroids))
        
        for opening in openings:
            if opening["type"] != "door":
                continue
            
            pos = opening.get("position", {}).get("center", (0, 0))
            if not pos:
                continue
            
            # Check if near boundary
            margin = 50  # Distance from edge to be considered entry
            is_near_edge = (
                pos[0] < bbox_min[0] + margin or
                pos[0] > bbox_max[0] - margin or
                pos[1] < bbox_min[1] + margin or
                pos[1] > bbox_max[1] - margin
            )
            
            if is_near_edge:
                entry_points.append({
                    "openingId": opening["id"],
                    "fromSpace": "exterior",
                    "isPrimary": len(entry_points) == 0,  # First one is primary
                })
        
        return adjacencies, entry_points

    # ========================================================================
    # Narrative & Confidence
    # ========================================================================
    
    def _build_narrative(
        self,
        geometry: Dict[str, Any],
        rooms: List[Dict[str, Any]],
        walls: List[Dict[str, Any]],
        openings: List[Dict[str, Any]],
        scale_info: Dict[str, Any]
    ) -> str:
        """Build a descriptive narrative of the floor plan."""
        parts = [
            f"DXF floor plan analyzed with enhanced ezdxf extraction.",
            f"Found {geometry['entity_count']} entities across {len(geometry['layer_names'])} layers.",
        ]
        
        if scale_info.get("detected"):
            scale_text = scale_info.get("scaleText", "detected")
            parts.append(f"Scale: {scale_text}.")
        
        parts.append(f"Drawing bounds: {geometry['bbox_length']:.1f} x {geometry['bbox_width']:.1f} units.")
        
        if rooms:
            room_types = defaultdict(int)
            for r in rooms:
                room_types[r["type"]] += 1
            
            total_sqft = sum(r["sqft"] for r in rooms)
            parts.append(f"Detected {len(rooms)} rooms totaling {total_sqft:.0f} sq units.")
            
            # List room types
            type_list = ", ".join(f"{count} {rtype}" for rtype, count in room_types.items())
            parts.append(f"Room breakdown: {type_list}.")
            
            # List rooms by name
            named_rooms = [r["name"] for r in rooms if not r["name"].startswith("Room ")]
            if named_rooms:
                parts.append(f"Labeled spaces: {', '.join(named_rooms[:10])}{'...' if len(named_rooms) > 10 else ''}.")
        
        if walls:
            ext_walls = sum(1 for w in walls if w["type"] == "exterior")
            int_walls = sum(1 for w in walls if w["type"] == "interior")
            parts.append(f"Identified {len(walls)} wall segments ({ext_walls} exterior, {int_walls} interior).")
        
        if openings:
            doors = sum(1 for o in openings if o["type"] == "door")
            windows = sum(1 for o in openings if o["type"] == "window")
            parts.append(f"Found {doors} doors and {windows} windows.")
        
        return " ".join(parts)

    def _calculate_confidence(
        self,
        rooms: List[Dict[str, Any]],
        walls: List[Dict[str, Any]],
        openings: List[Dict[str, Any]],
        scale_info: Dict[str, Any],
        geometry: Dict[str, Any]
    ) -> float:
        """Calculate overall extraction confidence."""
        confidence = 0.3  # Base
        
        # Rooms found and labeled
        if rooms:
            confidence += 0.2
            labeled = sum(1 for r in rooms if not r["name"].startswith("Room "))
            if labeled > len(rooms) * 0.5:
                confidence += 0.1  # Bonus for good labeling
        
        # Walls found
        if walls:
            confidence += 0.15
            high_conf_walls = sum(1 for w in walls if w["confidence"] >= 0.8)
            if high_conf_walls > len(walls) * 0.3:
                confidence += 0.05  # Bonus for parallel pair detection
        
        # Openings found
        if openings:
            confidence += 0.1
        
        # Scale detected
        if scale_info.get("detected"):
            confidence += 0.1
        
        # Text found (helps with labeling)
        if geometry["raw"]["text_count"] > 5:
            confidence += 0.05
        
        return min(confidence, 0.95)


__all__ = ["CADParser", "CADParserConfig", "CADParserError"]
