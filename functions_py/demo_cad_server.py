#!/usr/bin/env python3
"""
Demo HTTP server to expose CAD parsing results for Epic 3 PR2.

This is a lightweight development harness – not the final Firebase
Functions deployment. It lets the Epic 3 PR2 UI call into the real
Python CAD parser / Vision service and display the returned
`ExtractionResult` in the browser.

Usage (from project root or functions_py/):

  cd functions_py
  python demo_cad_server.py

The server listens on http://localhost:8081 and exposes:

  POST /parse-cad
    Body (option 1 - remote URL):
      { "fileUrl": string, "fileType": "dwg" | "dxf" | "pdf" | "png" | "jpg" }
    Body (option 2 - local file bytes):
      { "fileBytes": base64-encoded-string, "fileName": string, "fileType": "dwg" | "dxf" | "pdf" | "png" | "jpg" }
    Resp: ExtractionResult JSON (or error)

In the frontend, set:
  VITE_USE_BACKEND_CAD_PARSE=true
  VITE_CAD_PARSE_URL=http://localhost:8081/parse-cad

For PDF/image parsing (Vision), set OPENAI_API_KEY in functions_py/.env
"""

from __future__ import annotations

import base64
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.request import urlopen

# Load .env file if it exists (for OPENAI_API_KEY etc.)
def _load_dotenv() -> None:
    """Load environment variables from .env file."""
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        print(f"[demo_cad_server] Loading .env from {env_path}")
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = value
                        print(f"[demo_cad_server]   Set {key}={'*' * min(len(value), 8)}...")
    else:
        print(f"[demo_cad_server] No .env file found at {env_path}")
        print("[demo_cad_server] PDF/image parsing requires OPENAI_API_KEY")

_load_dotenv()

from services.cad_parser import CADParser, CADParserError  # type: ignore[import]
from services.vision_service import (  # type: ignore[import]
    VisionService,
    VisionServiceError,
)
from tc_types.extraction import ExtractionResult, FileType  # type: ignore[import]


def _parse_json_body(handler: BaseHTTPRequestHandler) -> Dict[str, Any]:
    length_header = handler.headers.get("Content-Length", "0")
    try:
      length = int(length_header)
    except ValueError:
      length = 0

    raw = handler.rfile.read(length) if length > 0 else b""
    if not raw:
        return {}

    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON body")


class CadParseHandler(BaseHTTPRequestHandler):
    """Minimal HTTP handler for /parse-cad."""

    server_version = "TrueCostCADDemo/1.0"

    def _send_json(self, status: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        # Simple CORS for Vite dev server
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: Any) -> None:  # pragma: no cover - console noise
        """Reduce noise; still print minimal log to stdout."""
        print(f"[demo_cad_server] {self.address_string()} - {format % args}")

    def do_OPTIONS(self) -> None:  # noqa: N802
        """Handle CORS preflight."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        """Handle POST /parse-cad."""
        if self.path != "/parse-cad":
            self._send_json(404, {"error": "Not Found"})
            return

        try:
            body = _parse_json_body(self)
        except ValueError as exc:
            self._send_json(400, {"error": str(exc)})
            return

        file_type = body.get("fileType")
        file_url = body.get("fileUrl")
        file_bytes_b64 = body.get("fileBytes")
        file_name = body.get("fileName", "uploaded_file")

        if not isinstance(file_type, str):
            self._send_json(400, {"error": "'fileType' (string) is required."})
            return

        # Need either fileUrl OR fileBytes
        if not file_url and not file_bytes_b64:
            self._send_json(
                400,
                {"error": "Either 'fileUrl' or 'fileBytes' (base64) is required."},
            )
            return

        ft: FileType
        try:
            ft = file_type  # type: ignore[assignment]
        except Exception:
            self._send_json(400, {"error": f"Invalid fileType '{file_type}'."})
            return

        # Get file bytes from either source
        file_bytes: Optional[bytes] = None
        effective_url = file_url or f"local://{file_name}"

        try:
            if file_bytes_b64:
                # Decode base64-encoded file bytes from frontend
                try:
                    file_bytes = base64.b64decode(file_bytes_b64)
                    print(f"[demo_cad_server] Received {len(file_bytes)} bytes from base64 upload")
                except Exception as e:
                    self._send_json(400, {"error": f"Invalid base64 fileBytes: {e}"})
                    return
            elif file_url:
                # Download from URL (for real Firebase Storage URLs)
                try:
                    with urlopen(file_url) as response:  # nosec: B310 - dev-only server
                        file_bytes = response.read()
                    print(f"[demo_cad_server] Downloaded {len(file_bytes)} bytes from URL")
                except Exception as e:
                    self._send_json(400, {"error": f"Failed to fetch file from URL: {e}"})
                    return

            if not file_bytes:
                self._send_json(400, {"error": "Could not obtain file bytes."})
                return

            if ft == "dxf":
                # Parse DXF with ezdxf (native support).
                parser = CADParser()
                result: ExtractionResult = parser.parse_dwg_dxf(
                    file_bytes=file_bytes,
                    file_url=effective_url,
                    file_type=ft,
                )
            elif ft == "dwg":
                # DWG is a proprietary binary format - ezdxf cannot read it.
                # Return a placeholder result with a note about the limitation.
                # In production, we'd use ODA File Converter or similar.
                print("[demo_cad_server] DWG format detected - returning placeholder (ezdxf only supports DXF)")
                result = {
                    "fileUrl": effective_url,
                    "fileType": ft,
                    "extractionMethod": "ezdxf",
                    "extractionConfidence": 0.3,
                    "spaceModel": {
                        "totalSqft": 0.0,
                        "boundingBox": {
                            "length": 0.0,
                            "width": 0.0,
                            "height": 0.0,
                            "units": "feet",
                        },
                        "scale": {
                            "detected": False,
                            "ratio": None,
                            "units": "feet",
                        },
                        "rooms": [],
                        "walls": [],
                        "openings": [],
                    },
                    "spatialRelationships": {
                        "layoutNarrative": (
                            "DWG file received. Note: ezdxf only supports DXF format natively. "
                            "For full DWG support, please convert to DXF format or upload as "
                            "PDF/PNG/JPG for Vision-based extraction. File size: "
                            f"{len(file_bytes):,} bytes."
                        ),
                        "roomAdjacencies": [],
                        "entryPoints": [],
                    },
                    "rawExtraction": {
                        "summary": "DWG file detected but not parsed (ezdxf limitation)",
                        "fileSize": len(file_bytes),
                        "recommendation": "Convert to DXF or export as PDF for better results",
                    },
                }
            else:
                # Vision path (PDF / images) – requires OPENAI_API_KEY.
                # For local files, we need to send bytes to Vision API
                vision = VisionService()
                result = vision.extract_cad_data(
                    file_url=effective_url,
                    file_type=ft,
                    file_bytes=file_bytes,
                )

        except CADParserError as exc:
            self._send_json(400, {"error": f"CAD parser error: {exc}"})
            return
        except VisionServiceError as exc:
            self._send_json(500, {"error": f"Vision service error: {exc}"})
            return
        except Exception as exc:  # pragma: no cover - generic safety net
            import traceback
            traceback.print_exc()
            self._send_json(500, {"error": f"Unexpected error: {exc}"})
            return

        self._send_json(200, result)


def main() -> None:
    """Start the demo CAD parsing HTTP server."""
    host = "0.0.0.0"
    port = 8081
    server = HTTPServer((host, port), CadParseHandler)

    print("=" * 60)
    print("🚀 TrueCost CAD Parsing Demo Server (PR2)")
    print("=" * 60)
    print(f"Listening on http://{host}:{port}")
    print()
    print("Frontend configuration:")
    print("  VITE_USE_BACKEND_CAD_PARSE=true")
    print("  VITE_CAD_PARSE_URL=http://localhost:8081/parse-cad")
    print()
    print("Then open the Epic 3 Test Lab at /epic3-lab and use the PR2 panel.")
    print("=" * 60)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down demo CAD server...")
        server.server_close()


if __name__ == "__main__":
    main()


