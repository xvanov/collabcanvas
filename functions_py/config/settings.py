"""
Configuration settings for TrueCost Python Functions.
"""
import os
from typing import List

# Firebase/GCP
PROJECT_ID = os.getenv("GCLOUD_PROJECT", "truecost-dev")
STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET", f"{PROJECT_ID}.appspot.com")

# CAD Upload Configuration
CAD_UPLOAD_PATH = "cad"  # Base path in Storage: cad/{estimateId}/filename
CAD_ALLOWED_EXTENSIONS = [".pdf", ".dwg", ".dxf", ".png", ".jpg", ".jpeg"]
CAD_ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/vnd.dwg",
    "image/x-dwg",
    "application/x-dwg",
    "application/dxf",
    "image/vnd.dxf",
    "image/png",
    "image/jpeg",
]
CAD_MAX_FILE_SIZE_MB = 50
CAD_MAX_FILE_SIZE_BYTES = CAD_MAX_FILE_SIZE_MB * 1024 * 1024  # 50MB

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4.1")
VISION_MODEL = os.getenv("VISION_MODEL", "gpt-4o")

# LangSmith (optional)
LANGSMITH_API_KEY = os.getenv("LANGSMITH_API_KEY", "")
LANGSMITH_PROJECT = os.getenv("LANGSMITH_PROJECT", "truecost")

# Feature Flags
ENABLE_VOICE_INPUT = os.getenv("ENABLE_VOICE_INPUT", "true").lower() == "true"
ENABLE_WHISPER_FALLBACK = os.getenv("ENABLE_WHISPER_FALLBACK", "true").lower() == "true"

# Environment
ENV = os.getenv("ENV", "development")
IS_PRODUCTION = ENV == "production"
IS_EMULATOR = os.getenv("FIREBASE_EMULATOR", "false").lower() == "true"

# Validation helpers
def validate_cad_extension(filename: str) -> bool:
    """Check if filename has an allowed CAD extension."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in CAD_ALLOWED_EXTENSIONS

def validate_cad_mime_type(mime_type: str) -> bool:
    """Check if MIME type is allowed for CAD files."""
    return mime_type in CAD_ALLOWED_MIME_TYPES

def validate_cad_file_size(size_bytes: int) -> bool:
    """Check if file size is within allowed limit."""
    return size_bytes <= CAD_MAX_FILE_SIZE_BYTES

