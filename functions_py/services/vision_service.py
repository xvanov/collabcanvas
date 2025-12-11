"""
Vision service for extracting CAD data from PDF/images using GPT-4o Vision.

Epic 3 PR2 requirement:
- Implement GPT-4o Vision path for PDF/images; same unified ExtractionResult
  schema; include extractionMethod, extractionConfidence, rawExtraction.

Enhanced with:
- Multi-pass analysis for improved accuracy
- Chain-of-thought prompting
- Higher DPI option for complex plans
- Structured extraction with validation
"""

from __future__ import annotations

import base64
import io
import json
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from openai import OpenAI  # type: ignore[import-untyped]

from config import settings
from tc_types.extraction import ExtractionResult, FileType

# Try to import PyMuPDF for PDF conversion
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    print("[VisionService] PyMuPDF not installed - PDF support disabled. Run: pip install pymupdf")


SUPPORTED_VISION_TYPES: tuple[FileType, ...] = ("pdf", "png", "jpg")


# ============================================================================
# Configuration
# ============================================================================

@dataclass
class VisionServiceConfig:
    """
    Configuration for the VisionService with tunable parameters.
    """
    # Model selection
    model: str = "gpt-4o"  # Best vision capabilities
    
    # Default confidence
    default_confidence: float = 0.8
    
    # PDF conversion settings
    pdf_dpi: int = 200  # Higher DPI for better accuracy (was 150)
    pdf_max_pages: int = 3  # Max pages to analyze
    
    # Multi-pass settings
    enable_multi_pass: bool = True
    max_tokens_per_pass: int = 4096
    
    # Temperature (0 for consistency)
    temperature: float = 0.0


class VisionServiceError(Exception):
    """Base exception for Vision service errors."""


# ============================================================================
# Multi-Pass Prompts
# ============================================================================

SYSTEM_PROMPT = """You are an expert architectural floor plan analyzer with 20+ years of experience reading construction documents, blueprints, and CAD drawings.

Your expertise includes:
- Residential floor plans (single-family, multi-family, apartments)
- Commercial layouts (offices, retail, restaurants)
- Reading architectural symbols and conventions
- Understanding room labels, dimensions, and annotations
- Identifying structural elements (walls, doors, windows)

You provide PRECISE, ACCURATE extractions. You carefully examine every part of the image.
Always respond with ONLY valid JSON - no markdown, no explanations, no extra text."""


PASS1_ROOMS_PROMPT = """TASK: Carefully identify ALL rooms and spaces in this floor plan.

STEP-BY-STEP ANALYSIS:
1. First, scan the ENTIRE image from left to right, top to bottom
2. Look for ANY text labels that indicate room names
3. Look for enclosed areas that form rooms (even if unlabeled)
4. Pay special attention to:
   - Main living spaces (living room, bedroom, kitchen, dining)
   - Wet areas (bathrooms labeled "w.c.", "toilet", "bath", "shower")
   - Service areas (laundry, utility, mudroom)
   - Storage (closets, pantry, storage)
   - Circulation (hallways, corridors, stairs, landing)
   - Outdoor connected spaces (balcony, patio, deck, terrace)

IMPORTANT:
- Use the EXACT labels shown in the drawing (e.g., "w.c." not "bathroom", "Main Lounge" not "Living Room")
- If a space has a number/label like "Bedroom 1", use that exactly
- Estimate dimensions based on the visual proportions
- If you can read dimension text, use those actual values

Return a JSON object with this structure:
{
  "rooms": [
    {
      "id": "room_1",
      "name": "<EXACT label from drawing>",
      "type": "<category: bedroom|bathroom|kitchen|living_room|dining|garage|closet|storage|laundry|office|hallway|stairs|balcony|other>",
      "estimatedSqft": <number>,
      "dimensions": {
        "length": <number in feet>,
        "width": <number in feet>
      },
      "labelConfidence": <0.0-1.0 how sure you are about the label>,
      "position": "<rough location: top-left|top-center|top-right|center-left|center|center-right|bottom-left|bottom-center|bottom-right>"
    }
  ],
  "totalRoomCount": <number>,
  "floorLevel": "<ground|upper|basement|unknown>",
  "analysisNotes": "<brief notes about the plan, any labels you couldn't read clearly>"
}"""


PASS2_OPENINGS_PROMPT = """TASK: Carefully count and identify ALL doors and windows in this floor plan.

You previously identified these rooms: {rooms_summary}

## DOOR IDENTIFICATION GUIDE
Doors appear in floor plans as:
- **Arc/quarter-circle**: A curved line showing the door swing path (most common)
- **Break in wall**: A gap in the wall line with a thin rectangle (the door itself)
- **Double lines**: Two parallel lines across a wall opening
- **Labels**: "D", "DR", or door numbers near the opening

STEP-BY-STEP for doors:
1. Look at EVERY wall line for breaks or arcs
2. Count arcs carefully - each 90° arc = 1 door
3. Note if the door is on an exterior wall (edge of building) or interior
4. Identify what rooms each door connects

## WINDOW IDENTIFICATION GUIDE  
Windows appear in floor plans as:
- **Small rectangles on EXTERIOR walls**: Usually 3-6 feet wide on the building edge
- **Triple parallel lines**: Three thin lines across a wall section = window
- **Double lines with fill**: Two lines with hatching between them
- **Labels**: "W", "WIN", or window numbers

STEP-BY-STEP for windows:
1. Trace the EXTERIOR walls (the outer boundary of the building)
2. On each exterior wall segment, look for window symbols
3. Count each window symbol - don't miss small ones
4. Note which room each window serves
5. Bedrooms typically need at least 1 window (egress requirement)

IMPORTANT: 
- Exterior walls form the OUTER EDGE of the floor plan
- Interior walls divide rooms INSIDE the building
- Windows are almost always on EXTERIOR walls only
- Count EVERY opening - common counts are 5-15 windows, 8-15 doors for a house

Return a JSON object:
{{
  "doors": [
    {{
      "id": "door_1",
      "type": "standard|sliding|pocket|double|french|bi-fold",
      "widthInches": 36,
      "connectsRooms": ["Room Name 1", "Room Name 2 or Exterior"],
      "isExterior": false,
      "hasSwingArc": true,
      "wallLocation": "between Kitchen and Hallway"
    }}
  ],
  "windows": [
    {{
      "id": "window_1",
      "widthInches": 48,
      "heightInches": 48,
      "inRoom": "Master Bedroom",
      "wallDirection": "north|south|east|west",
      "windowType": "double-hung|casement|slider|fixed|picture"
    }}
  ],
  "windowsByRoom": {{
    "Master Bedroom": 2,
    "Living Room": 3,
    "Kitchen": 1,
    "Bathroom": 1
  }},
  "totalDoors": 12,
  "totalWindows": 10,
  "exteriorDoors": 2,
  "interiorDoors": 10,
  "analysisNotes": "List any windows or doors that were unclear. Describe what symbols you saw."
}}"""


PASS3_SPATIAL_PROMPT = """TASK: Analyze the walls, spatial layout, and relationships between rooms.

You identified these rooms: {rooms_summary}
You identified these openings: {openings_summary}

## WALL ANALYSIS
STEP-BY-STEP for walls:
1. Identify EXTERIOR WALLS (the outer boundary forming a complete closed shape)
   - Trace the entire perimeter of the building
   - Exterior walls are typically thicker (shown as double lines)
   - Count how many linear feet of exterior wall per direction (N/S/E/W)

2. Identify INTERIOR WALLS (dividing rooms inside)
   - These separate one room from another
   - Usually thinner than exterior walls
   - Note where doors create breaks in interior walls

## SPATIAL ANALYSIS
3. Identify the main entry point(s) - doors on exterior walls
4. Trace the circulation path from entry through the home
5. Note which rooms share walls (are adjacent)

## DIMENSIONS
6. Look for dimension annotations or scale indicators
7. Note any dimension text you can read (e.g., "12'-0\"", "3.6m")

Return a JSON object:
{{
  "walls": {{
    "exteriorWalls": [
      {{"direction": "north", "lengthFeet": 40, "windowCount": 3}},
      {{"direction": "south", "lengthFeet": 40, "windowCount": 2}},
      {{"direction": "east", "lengthFeet": 30, "windowCount": 2}},
      {{"direction": "west", "lengthFeet": 30, "windowCount": 1}}
    ],
    "totalExteriorLength": 140,
    "interiorWallCount": 12,
    "estimatedInteriorLength": 100
  }},
  "layoutNarrative": "Detailed 3-4 sentence description. Start from main entry, describe room positions relative to each other, note the circulation pattern (e.g., central hallway, open concept, etc.).",
  "mainEntry": {{
    "location": "front|side|rear|garage",
    "entersInto": "room name",
    "entryType": "single door|double door|covered porch"
  }},
  "adjacencies": [
    {{"room1": "Kitchen", "room2": "Dining Room", "connection": "archway|door|open"}},
    {{"room1": "Master Bedroom", "room2": "Master Bath", "connection": "door"}}
  ],
  "scaleInfo": {{
    "detected": true,
    "scaleText": "1/4 inch = 1 foot",
    "dimensionExamples": ["12'-0\"", "10'-6\""],
    "unitsUsed": "feet|meters"
  }},
  "buildingShape": "rectangular|L-shaped|U-shaped|irregular",
  "notableFeatures": ["open concept kitchen/living", "jack-and-jill bathroom", "walk-in closet", "en-suite master"],
  "planOrientation": "portrait|landscape",
  "estimatedTotalSqft": 1800
}}"""


# ============================================================================
# Vision Service
# ============================================================================

class VisionService:
    """
    Service wrapper around GPT-4o Vision for CAD extraction.

    Uses multi-pass analysis for improved accuracy:
    - Pass 1: Room identification and labeling
    - Pass 2: Door and window counting
    - Pass 3: Spatial relationships and layout narrative

    The results are merged into a unified ExtractionResult.
    """

    def __init__(
        self,
        client: Optional[OpenAI] = None,
        config: Optional[VisionServiceConfig] = None,
    ) -> None:
        self.config = config or VisionServiceConfig()

        if client is not None:
            self._client = client
        else:
            if not settings.OPENAI_API_KEY:
                raise VisionServiceError(
                    "OPENAI_API_KEY is not configured; cannot create VisionService client."
                )
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def extract_cad_data(
        self,
        *,
        file_url: str,
        file_type: FileType,
        file_bytes: Optional[bytes] = None,
        use_multi_pass: Optional[bool] = None,
    ) -> ExtractionResult:
        """
        Extract CAD data from a PDF/image using GPT-4o Vision.

        Args:
            file_url: Public/emulator URL of the CAD file in Storage.
            file_type: One of `"pdf" | "png" | "jpg"`.
            file_bytes: Optional raw file bytes (for local dev without real URLs).
            use_multi_pass: Override config setting for multi-pass analysis.

        Returns:
            ExtractionResult-shaped dict.

        Raises:
            VisionServiceError: On unsupported file type, API errors, or invalid JSON.
        """
        if file_type not in SUPPORTED_VISION_TYPES:
            raise VisionServiceError(
                f"Unsupported file_type '{file_type}' for VisionService. "
                f"Supported types: {', '.join(SUPPORTED_VISION_TYPES)}"
            )

        # Prepare image URL for Vision API
        image_url = self._prepare_image_url(file_bytes, file_type, file_url)
        
        # Determine if using multi-pass
        multi_pass = use_multi_pass if use_multi_pass is not None else self.config.enable_multi_pass
        
        if multi_pass:
            return self._extract_multi_pass(image_url, file_url, file_type)
        else:
            return self._extract_single_pass(image_url, file_url, file_type)

    def _prepare_image_url(
        self, 
        file_bytes: Optional[bytes], 
        file_type: FileType, 
        file_url: str
    ) -> str:
        """Prepare the image URL for the Vision API."""
        if file_bytes:
            if file_type == "pdf":
                image_bytes = self._convert_pdf_to_image(file_bytes)
                b64_content = base64.b64encode(image_bytes).decode("utf-8")
                return f"data:image/png;base64,{b64_content}"
            else:
                mime_map = {"png": "image/png", "jpg": "image/jpeg"}
                mime_type = mime_map.get(file_type, "image/png")
                b64_content = base64.b64encode(file_bytes).decode("utf-8")
                return f"data:{mime_type};base64,{b64_content}"
        else:
            if file_type == "pdf":
                raise VisionServiceError(
                    "PDF files require file_bytes for conversion. "
                    "URL-based PDF access is not supported."
                )
            return file_url

    # ========================================================================
    # Multi-Pass Extraction
    # ========================================================================

    def _extract_multi_pass(
        self, 
        image_url: str, 
        file_url: str, 
        file_type: FileType
    ) -> ExtractionResult:
        """
        Perform multi-pass extraction for improved accuracy.
        
        Pass 1: Identify all rooms and spaces
        Pass 2: Count doors and windows
        Pass 3: Analyze spatial relationships
        """
        print("[VisionService] Starting multi-pass extraction...")
        
        # Pass 1: Rooms
        print("[VisionService] Pass 1: Room identification...")
        pass1_result = self._execute_vision_pass(
            image_url=image_url,
            user_prompt=PASS1_ROOMS_PROMPT,
            pass_name="rooms"
        )
        
        # Prepare summary for next passes
        rooms_summary = self._summarize_rooms(pass1_result)
        
        # Pass 2: Openings
        print("[VisionService] Pass 2: Door and window detection...")
        pass2_prompt = PASS2_OPENINGS_PROMPT.format(rooms_summary=rooms_summary)
        pass2_result = self._execute_vision_pass(
            image_url=image_url,
            user_prompt=pass2_prompt,
            pass_name="openings"
        )
        
        # Prepare openings summary
        openings_summary = self._summarize_openings(pass2_result)
        
        # Pass 3: Spatial relationships
        print("[VisionService] Pass 3: Spatial analysis...")
        pass3_prompt = PASS3_SPATIAL_PROMPT.format(
            rooms_summary=rooms_summary,
            openings_summary=openings_summary
        )
        pass3_result = self._execute_vision_pass(
            image_url=image_url,
            user_prompt=pass3_prompt,
            pass_name="spatial"
        )
        
        # Merge results into ExtractionResult
        return self._merge_pass_results(
            pass1_result=pass1_result,
            pass2_result=pass2_result,
            pass3_result=pass3_result,
            file_url=file_url,
            file_type=file_type
        )

    def _execute_vision_pass(
        self, 
        image_url: str, 
        user_prompt: str, 
        pass_name: str
    ) -> Dict[str, Any]:
        """Execute a single vision analysis pass."""
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_url, "detail": "high"}},
                    {"type": "text", "text": user_prompt},
                ],
            },
        ]

        try:
            response = self._client.chat.completions.create(
                model=self.config.model,
                messages=messages,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens_per_pass,
            )
        except Exception as exc:
            print(f"[VisionService] Pass '{pass_name}' failed: {exc}")
            raise VisionServiceError(f"Vision model call failed on {pass_name} pass: {exc}") from exc

        content = response.choices[0].message.content
        if not content:
            return {}

        # Parse JSON response
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            parsed = self._extract_json_from_text(content)
            if parsed:
                return parsed
            print(f"[VisionService] Could not parse {pass_name} response: {content[:300]}...")
            return {}

    def _summarize_rooms(self, pass1_result: Dict[str, Any]) -> str:
        """Create a summary of rooms for subsequent passes."""
        rooms = pass1_result.get("rooms", [])
        if not rooms:
            return "No rooms were identified in the previous pass."
        
        room_list = []
        for r in rooms:
            name = r.get("name", "Unknown")
            rtype = r.get("type", "unknown")
            sqft = r.get("estimatedSqft", 0)
            room_list.append(f"- {name} ({rtype}, ~{sqft} sqft)")
        
        return f"Rooms identified ({len(rooms)} total):\n" + "\n".join(room_list)

    def _summarize_openings(self, pass2_result: Dict[str, Any]) -> str:
        """Create a summary of openings for the spatial pass."""
        doors = pass2_result.get("doors", [])
        windows = pass2_result.get("windows", [])
        
        summary_parts = [f"{len(doors)} doors, {len(windows)} windows"]
        
        if doors:
            ext_doors = sum(1 for d in doors if d.get("isExterior"))
            summary_parts.append(f"({ext_doors} exterior doors)")
        
        return " ".join(summary_parts)

    def _merge_pass_results(
        self,
        pass1_result: Dict[str, Any],
        pass2_result: Dict[str, Any],
        pass3_result: Dict[str, Any],
        file_url: str,
        file_type: FileType
    ) -> ExtractionResult:
        """Merge results from all passes into a unified ExtractionResult."""
        
        # Convert rooms from pass1
        rooms: List[Dict[str, Any]] = []
        for r in pass1_result.get("rooms", []):
            rooms.append({
                "id": r.get("id", f"room_{len(rooms)+1}"),
                "name": r.get("name", f"Room {len(rooms)+1}"),
                "type": r.get("type", "unknown"),
                "sqft": r.get("estimatedSqft", 0),
                "dimensions": {
                    "length": r.get("dimensions", {}).get("length", 0),
                    "width": r.get("dimensions", {}).get("width", 0),
                    "height": 96.0,
                },
                "confidence": r.get("labelConfidence", 0.7),
                "needsVerification": r.get("labelConfidence", 0.7) < 0.7,
            })
        
        # Convert openings from pass2 (enhanced with widthInches)
        openings: List[Dict[str, Any]] = []
        
        for d in pass2_result.get("doors", []):
            # Support both width and widthInches
            width = d.get("widthInches", d.get("width", 36))
            openings.append({
                "id": d.get("id", f"door_{len(openings)+1}"),
                "type": "door",
                "width": width,
                "height": 80.0,
                "inWall": d.get("wallLocation", ""),
                "connectsRooms": d.get("connectsRooms", []),
                "position": {"distanceFromCorner": 0, "side": "center"},
                "swing": "in" if d.get("hasSwingArc") else "unknown",
                "confidence": 0.8 if d.get("hasSwingArc") else 0.7,
                "isExterior": d.get("isExterior", False),
            })
        
        for w in pass2_result.get("windows", []):
            # Support both width and widthInches
            width = w.get("widthInches", w.get("width", 36))
            height = w.get("heightInches", w.get("height", 48))
            openings.append({
                "id": w.get("id", f"window_{len(openings)+1}"),
                "type": "window",
                "width": width,
                "height": height,
                "inWall": w.get("wallDirection", ""),
                "connectsRooms": [w.get("inRoom", "")],
                "position": {"distanceFromCorner": 0, "side": "center"},
                "swing": "fixed",
                "confidence": 0.75,
                "windowType": w.get("windowType", "unknown"),
            })
        
        # Calculate totals
        total_sqft = pass3_result.get("estimatedTotalSqft", 0) or sum(r["sqft"] for r in rooms)
        
        # Build walls from Pass 3 data (enhanced)
        walls: List[Dict[str, Any]] = []
        wall_id = 0
        
        # Extract wall data from pass3
        walls_data = pass3_result.get("walls", {})
        exterior_walls_data = walls_data.get("exteriorWalls", [])
        
        # Create exterior walls from pass3 data
        for ext_wall in exterior_walls_data:
            wall_id += 1
            length_feet = ext_wall.get("lengthFeet", 20)
            window_count = ext_wall.get("windowCount", 0)
            direction = ext_wall.get("direction", "unknown")
            
            walls.append({
                "id": f"wall_{wall_id}",
                "length": length_feet * 12,  # Convert to inches
                "height": 96.0,
                "thickness": 6.0,  # Exterior walls thicker
                "type": "exterior",
                "material": None,
                "connectsRooms": [],
                "adjacentWalls": [],
                "confidence": 0.7,
                "direction": direction,
                "windowCount": window_count,
            })
        
        # If no exterior walls from pass3, estimate from building shape
        if not exterior_walls_data:
            # Create 4 exterior walls based on building shape
            building_shape = pass3_result.get("buildingShape", "rectangular")
            total_ext_length = walls_data.get("totalExteriorLength", 120)
            
            if building_shape == "rectangular":
                # Estimate wall lengths
                side_length = total_ext_length / 4 if total_ext_length else 30
                for direction in ["north", "south", "east", "west"]:
                    wall_id += 1
                    walls.append({
                        "id": f"wall_{wall_id}",
                        "length": side_length * 12,
                        "height": 96.0,
                        "thickness": 6.0,
                        "type": "exterior",
                        "material": None,
                        "connectsRooms": [],
                        "adjacentWalls": [],
                        "confidence": 0.5,
                        "direction": direction,
                    })
        
        # Add interior walls (estimated from interior wall count)
        interior_wall_count = walls_data.get("interiorWallCount", max(4, len(rooms) * 2))
        est_interior_length = walls_data.get("estimatedInteriorLength", interior_wall_count * 10)
        avg_int_wall_length = est_interior_length / interior_wall_count if interior_wall_count else 10
        
        for i in range(interior_wall_count):
            wall_id += 1
            walls.append({
                "id": f"wall_{wall_id}",
                "length": avg_int_wall_length * 12,  # Convert to inches
                "height": 96.0,
                "thickness": 4.0,
                "type": "interior",
                "material": None,
                "connectsRooms": [],
                "adjacentWalls": [],
                "confidence": 0.5,
            })
        
        # Build spatial relationships from pass3
        layout_narrative = pass3_result.get("layoutNarrative", "Floor plan analyzed via multi-pass vision extraction.")
        
        adjacencies = []
        for adj in pass3_result.get("adjacencies", []):
            adjacencies.append({
                "room1": adj.get("room1", ""),
                "room2": adj.get("room2", ""),
                "connection": adj.get("connection", "wall"),
            })
        
        entry_points = []
        main_entry = pass3_result.get("mainEntry", {})
        if main_entry:
            entry_points.append({
                "openingId": "door_1",
                "fromSpace": main_entry.get("location", "exterior"),
                "isPrimary": True,
            })
        
        # Scale info
        scale_info = pass3_result.get("scaleInfo", {})
        
        # Calculate confidence based on completeness
        confidence = self._calculate_multi_pass_confidence(
            rooms, openings, pass1_result, pass2_result, pass3_result
        )
        
        space_model = {
            "totalSqft": total_sqft,
            "boundingBox": {
                "length": 0,  # Unknown from vision
                "width": 0,
                "height": 96,
                "units": "feet",
            },
            "scale": {
                "detected": scale_info.get("detected", False),
                "ratio": None,
                "units": "feet",
            },
            "rooms": rooms,
            "walls": walls,
            "openings": openings,
        }
        
        spatial_relationships = {
            "layoutNarrative": layout_narrative,
            "roomAdjacencies": adjacencies,
            "entryPoints": entry_points,
        }
        
        raw_extraction = {
            "source": "vision_multi_pass",
            "pass1_rooms": pass1_result,
            "pass2_openings": pass2_result,
            "pass3_spatial": pass3_result,
            "notes": pass1_result.get("analysisNotes", ""),
        }
        
        result: ExtractionResult = {
            "fileUrl": file_url,
            "fileType": file_type,
            "extractionMethod": "vision",
            "extractionConfidence": confidence,
            "spaceModel": space_model,
            "spatialRelationships": spatial_relationships,
            "rawExtraction": raw_extraction,
        }
        
        return result

    def _calculate_multi_pass_confidence(
        self,
        rooms: List[Dict[str, Any]],
        openings: List[Dict[str, Any]],
        pass1: Dict[str, Any],
        pass2: Dict[str, Any],
        pass3: Dict[str, Any],
    ) -> float:
        """Calculate confidence based on multi-pass results."""
        confidence = 0.5  # Base for vision
        
        # Rooms found
        if rooms:
            confidence += 0.15
            # Bonus for labeled rooms
            labeled = sum(1 for r in rooms if r.get("confidence", 0) > 0.7)
            if labeled > len(rooms) * 0.5:
                confidence += 0.1
        
        # Openings found
        if openings:
            confidence += 0.1
        
        # Spatial analysis quality
        if pass3.get("layoutNarrative") and len(pass3.get("layoutNarrative", "")) > 50:
            confidence += 0.05
        if pass3.get("adjacencies"):
            confidence += 0.05
        
        return min(confidence, 0.9)  # Vision caps at 0.9

    # ========================================================================
    # Single-Pass Extraction (Legacy)
    # ========================================================================

    def _extract_single_pass(
        self, 
        image_url: str, 
        file_url: str, 
        file_type: FileType
    ) -> ExtractionResult:
        """
        Single-pass extraction (legacy mode).
        Uses a comprehensive prompt for backward compatibility.
        """
        user_prompt = """CAREFULLY analyze this architectural floor plan image. Extract ALL information.

STEP 1: Identify EVERY labeled room/space:
- Bedrooms, Living rooms, Lounges, Family rooms
- Kitchen, Dining, Pantry
- Bathrooms: "w.c.", "toilet", "bathroom", "shower"
- Utility: Laundry, Storage, Closet
- Circulation: Hallway, Corridor, Entry, Foyer, Stairs
- Outdoor: Balcony, Patio, Deck, Terrace

STEP 2: Count ALL doors (arcs/swings) and windows

STEP 3: Describe the spatial layout

Return a JSON object with this structure:
{
  "extractionMethod": "vision",
  "extractionConfidence": 0.85,
  "spaceModel": {
    "totalSqft": <estimated>,
    "boundingBox": {"length": <feet>, "width": <feet>, "height": 96, "units": "feet"},
    "scale": {"detected": false, "ratio": null, "units": "feet"},
    "rooms": [
      {"id": "room_1", "name": "<EXACT label>", "type": "<category>", "sqft": <estimate>, "dimensions": {"length": <n>, "width": <n>, "height": 96}, "confidence": 0.8, "needsVerification": true}
    ],
    "walls": [
      {"id": "wall_1", "length": <n>, "height": 96, "thickness": 4, "type": "interior|exterior", "material": null, "connectsRooms": [], "adjacentWalls": [], "confidence": 0.7}
    ],
    "openings": [
      {"id": "opening_1", "type": "door|window", "width": 36, "height": 80, "inWall": "", "connectsRooms": [], "position": {"distanceFromCorner": 0, "side": "center"}, "swing": "in", "confidence": 0.7}
    ]
  },
  "spatialRelationships": {
    "layoutNarrative": "<Detailed description from entry through spaces>",
    "roomAdjacencies": [{"room1": "room_1", "room2": "room_2", "connection": "door|archway|open"}],
    "entryPoints": [{"openingId": "opening_1", "fromSpace": "exterior", "isPrimary": true}]
  },
  "rawExtraction": {"source": "vision", "notes": "<all text labels visible>"}
}

Use EXACT labels from the plan. Include ALL rooms. Respond with ONLY JSON."""

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_url, "detail": "high"}},
                    {"type": "text", "text": user_prompt},
                ],
            },
        ]

        try:
            response = self._client.chat.completions.create(
                model=self.config.model,
                messages=messages,
                temperature=self.config.temperature,
                max_tokens=4096,
            )
        except Exception as exc:
            raise VisionServiceError(f"Vision model call failed: {exc}") from exc

        content = response.choices[0].message.content
        if not content:
            raise VisionServiceError("Vision model returned empty content")

        # Parse JSON
        parsed: Dict[str, Any]
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            parsed_result = self._extract_json_from_text(content)
            if parsed_result is None:
                print(f"[VisionService] Failed to parse: {content[:500]}...")
                raise VisionServiceError("Vision model returned non-JSON content")
            parsed = parsed_result

        # Normalize fields
        parsed.setdefault("fileUrl", file_url)
        parsed.setdefault("fileType", file_type)
        parsed["extractionMethod"] = "vision"
        if "extractionConfidence" not in parsed:
            parsed["extractionConfidence"] = self.config.default_confidence
        if "rawExtraction" not in parsed:
            parsed["rawExtraction"] = {"source": "vision", "raw": parsed}

        result: ExtractionResult = parsed  # type: ignore[assignment]
        return result

    # ========================================================================
    # Utilities
    # ========================================================================

    def _extract_json_from_text(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from text that may contain markdown or extra content."""
        # Try code blocks first
        code_block_patterns = [
            r'```json\s*([\s\S]*?)\s*```',
            r'```\s*([\s\S]*?)\s*```',
        ]
        
        for pattern in code_block_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                try:
                    return json.loads(match)
                except json.JSONDecodeError:
                    continue
        
        # Try to find raw JSON object
        try:
            # Find first { and last }
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1 and end > start:
                return json.loads(text[start:end+1])
        except json.JSONDecodeError:
            pass
        
        return None

    def _convert_pdf_to_image(self, pdf_bytes: bytes, dpi: Optional[int] = None) -> bytes:
        """
        Convert a PDF to a PNG image.
        
        For multi-page PDFs, renders the first page (main floor plan).
        Uses higher DPI for better text recognition.
        """
        if not HAS_PYMUPDF:
            raise VisionServiceError(
                "PDF conversion requires PyMuPDF. Install with: pip install pymupdf"
            )
        
        dpi = dpi or self.config.pdf_dpi
        
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            if doc.page_count == 0:
                raise VisionServiceError("PDF has no pages")
            
            # Render first page
            page = doc[0]
            
            # Higher DPI for better accuracy
            zoom = dpi / 72.0
            matrix = fitz.Matrix(zoom, zoom)
            
            pixmap = page.get_pixmap(matrix=matrix)
            png_bytes = pixmap.tobytes("png")
            
            doc.close()
            
            print(f"[VisionService] Converted PDF to PNG at {dpi} DPI: {len(pdf_bytes)} -> {len(png_bytes)} bytes")
            
            return png_bytes
            
        except Exception as exc:
            if "VisionServiceError" in type(exc).__name__:
                raise
            raise VisionServiceError(f"Failed to convert PDF to image: {exc}") from exc


__all__ = ["VisionService", "VisionServiceConfig", "VisionServiceError"]
