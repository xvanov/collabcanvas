# TrueCost Python Functions

This directory contains the Python-based Firebase Cloud Functions for TrueCost's 7-agent Deep Agents pipeline.

## Structure

```
functions_py/
├── agents/              # 7 Deep Agents (Clarification, CAD Analysis, etc.)
├── config/              # Configuration and settings
├── services/            # Business logic services
│   ├── storage_service.py      # CAD file upload/storage
│   ├── cad_parser.py          # DWG/DXF parsing (ezdxf)
│   ├── vision_service.py      # GPT-4o Vision for images/PDFs
│   └── whisper_service.py     # Voice transcription
├── types/               # Type definitions and schemas
├── tests/               # Unit and integration tests
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── fixtures/       # Test fixtures (sample CAD files, etc.)
├── requirements.txt     # Python dependencies
├── .env.example        # Environment variable template
└── README.md           # This file
```

## Setup

### Prerequisites

- Python 3.11 or higher
- Firebase CLI
- OpenAI API key

### Installation

1. **Create virtual environment:**
   ```bash
   cd functions_py
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys
   ```

4. **Initialize Firebase Admin:**
   The service uses Firebase Admin SDK which requires credentials. For local development:
   - Use Firebase emulators (recommended)
   - Or set `GOOGLE_APPLICATION_CREDENTIALS` to your service account JSON

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/unit/test_storage_service.py

# Run with verbose output
pytest -v
```

### Using Firebase Emulators

Start the Firebase emulators for local development:

```bash
# From project root
firebase emulators:start

# Or specific emulators
firebase emulators:start --only functions,firestore,storage
```

Set `FIREBASE_EMULATOR=true` in your `.env` file.

## PR1: Storage & CAD Upload Plumbing

PR1 implements the foundation for CAD file uploads:

### Components

1. **`config/settings.py`**
   - Configuration for storage paths, file types, size limits
   - Validation helpers for CAD files
   - Environment variables and feature flags

2. **`services/storage_service.py`**
   - `StorageService` class for Firebase Storage operations
   - CAD file validation (type, size, MIME)
   - Upload/download/list/delete operations
   - Emulator and production mode support

3. **`tests/unit/test_storage_service.py`**
   - Comprehensive unit tests (40+ test cases)
   - Mocked Firebase Storage interactions
   - Validation, upload, and helper method tests

### Supported CAD Formats

- **PDF** - Plans exported as PDF
- **DWG** - AutoCAD native format
- **DXF** - AutoCAD exchange format
- **PNG/JPG** - Scanned or photographed plans

### File Constraints

- **Max size:** 50 MB
- **Storage path:** `cad/{estimateId}/{filename}`
- **Validation:** Extension, MIME type, and size checks

### Usage Example

```python
from services.storage_service import StorageService

# Initialize service
service = StorageService()

# Upload CAD file
result = service.upload_cad_file(
    estimate_id="est_123",
    filename="floor_plan.pdf",
    file_data=file_bytes,
    content_type="application/pdf",
    metadata={"userId": "user_456"}
)

# Returns:
# {
#     "fileUrl": "https://...",
#     "filePath": "cad/est_123/floor_plan.pdf",
#     "fileName": "floor_plan.pdf",
#     "fileSize": 1024000,
#     "contentType": "application/pdf",
#     "uploadedAt": "2025-12-10T12:00:00",
#     "estimateId": "est_123"
# }
```

### Error Handling

```python
from services.storage_service import (
    InvalidFileTypeError,
    FileSizeExceededError,
    StorageServiceError
)

try:
    result = service.upload_cad_file(...)
except InvalidFileTypeError as e:
    # Handle invalid file type
    print(f"Invalid file: {e}")
except FileSizeExceededError as e:
    # Handle oversized file
    print(f"File too large: {e}")
except StorageServiceError as e:
    # Handle other storage errors
    print(f"Upload failed: {e}")
```

## Next Steps

After PR1, the following PRs will build on this foundation:

- **PR2:** CAD parsing services (ezdxf + GPT-4o Vision)
- **PR3:** Voice transcription (Whisper fallback)
- **PR4:** Clarification Agent and endpoints
- **PR5:** ClarificationOutput assembly
- **PR6:** Handoff to Deep Pipeline
- **PR7:** Firestore/Storage rules
- **PR8:** Mocks and test harness

## Contributing

### Code Style

- Follow PEP 8
- Use type hints
- Document functions with docstrings
- Run `black` for formatting: `black .`
- Run `flake8` for linting: `flake8 .`
- Run `mypy` for type checking: `mypy .`

### Testing

- Write unit tests for all new functions
- Aim for >80% code coverage
- Use descriptive test names
- Mock external dependencies

## License

See project root LICENSE file.

