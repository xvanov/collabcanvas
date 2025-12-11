"""
Unit tests for storage_service.py
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.storage_service import (
    StorageService,
    StorageServiceError,
    InvalidFileTypeError,
    FileSizeExceededError,
)
from config import settings


class TestStorageServiceValidation:
    """Test file validation logic."""

    def test_validate_cad_file_valid_pdf(self):
        """Test validation of valid PDF file."""
        service = StorageService()
        result = service.validate_cad_file(
            filename="plan.pdf",
            content_type="application/pdf",
            file_size=1024 * 1024  # 1MB
        )
        assert result["valid"] is True

    def test_validate_cad_file_valid_dwg(self):
        """Test validation of valid DWG file."""
        service = StorageService()
        result = service.validate_cad_file(
            filename="plan.dwg",
            content_type="image/vnd.dwg",
            file_size=5 * 1024 * 1024  # 5MB
        )
        assert result["valid"] is True

    def test_validate_cad_file_valid_dxf(self):
        """Test validation of valid DXF file."""
        service = StorageService()
        result = service.validate_cad_file(
            filename="plan.dxf",
            content_type="application/dxf",
            file_size=2 * 1024 * 1024  # 2MB
        )
        assert result["valid"] is True

    def test_validate_cad_file_valid_image(self):
        """Test validation of valid image files."""
        service = StorageService()
        
        # PNG
        result = service.validate_cad_file(
            filename="plan.png",
            content_type="image/png",
            file_size=3 * 1024 * 1024
        )
        assert result["valid"] is True
        
        # JPEG
        result = service.validate_cad_file(
            filename="plan.jpg",
            content_type="image/jpeg",
            file_size=3 * 1024 * 1024
        )
        assert result["valid"] is True

    def test_validate_cad_file_invalid_extension(self):
        """Test validation fails for invalid extension."""
        service = StorageService()
        
        with pytest.raises(InvalidFileTypeError) as exc_info:
            service.validate_cad_file(
                filename="document.txt",
                content_type="text/plain",
                file_size=1024
            )
        assert "not allowed" in str(exc_info.value)
        assert ".txt" in str(exc_info.value)

    def test_validate_cad_file_invalid_mime_type(self):
        """Test validation fails for invalid MIME type."""
        service = StorageService()
        
        with pytest.raises(InvalidFileTypeError) as exc_info:
            service.validate_cad_file(
                filename="plan.pdf",
                content_type="text/plain",
                file_size=1024
            )
        assert "MIME type" in str(exc_info.value)

    def test_validate_cad_file_size_exceeded(self):
        """Test validation fails when file size exceeds limit."""
        service = StorageService()
        
        # File larger than 50MB
        large_size = 51 * 1024 * 1024
        
        with pytest.raises(FileSizeExceededError) as exc_info:
            service.validate_cad_file(
                filename="plan.pdf",
                content_type="application/pdf",
                file_size=large_size
            )
        assert "exceeds maximum" in str(exc_info.value)
        assert "50MB" in str(exc_info.value)

    def test_validate_cad_file_at_size_limit(self):
        """Test validation succeeds at exact size limit."""
        service = StorageService()
        
        # Exactly 50MB
        result = service.validate_cad_file(
            filename="plan.pdf",
            content_type="application/pdf",
            file_size=50 * 1024 * 1024
        )
        assert result["valid"] is True

    def test_validate_cad_file_generic_mime_type_inference(self):
        """Test MIME type inference from filename when generic type provided."""
        service = StorageService()
        
        # Should infer application/pdf from filename
        result = service.validate_cad_file(
            filename="plan.pdf",
            content_type="application/octet-stream",
            file_size=1024
        )
        assert result["valid"] is True

    def test_validate_cad_file_case_insensitive_extension(self):
        """Test extension validation is case-insensitive."""
        service = StorageService()
        
        result = service.validate_cad_file(
            filename="PLAN.PDF",
            content_type="application/pdf",
            file_size=1024
        )
        assert result["valid"] is True


class TestStorageServiceUpload:
    """Test file upload functionality."""

    @patch('services.storage_service.storage')
    def test_upload_cad_file_success(self, mock_storage):
        """Test successful file upload."""
        # Setup mocks
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_storage.bucket.return_value = mock_bucket
        
        # Mock blob methods
        mock_blob.upload_from_string = Mock()
        mock_blob.make_public = Mock()
        mock_blob.public_url = "https://storage.googleapis.com/bucket/cad/est123/plan.pdf"
        
        service = StorageService()
        service._bucket = mock_bucket
        
        file_data = b"fake pdf data"
        result = service.upload_cad_file(
            estimate_id="est123",
            filename="plan.pdf",
            file_data=file_data,
            content_type="application/pdf"
        )
        
        # Verify upload was called
        mock_blob.upload_from_string.assert_called_once_with(
            file_data,
            content_type="application/pdf"
        )
        
        # Verify result
        assert result["fileUrl"] == "https://storage.googleapis.com/bucket/cad/est123/plan.pdf"
        assert result["filePath"] == "cad/est123/plan.pdf"
        assert result["fileName"] == "plan.pdf"
        assert result["fileSize"] == len(file_data)
        assert result["contentType"] == "application/pdf"
        assert result["estimateId"] == "est123"
        assert "uploadedAt" in result

    @patch('services.storage_service.storage')
    def test_upload_cad_file_emulator_mode(self, mock_storage):
        """Test file upload in emulator mode returns local URL."""
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_storage.bucket.return_value = mock_bucket
        
        mock_blob.upload_from_string = Mock()
        
        with patch.object(settings, 'IS_EMULATOR', True):
            service = StorageService("test-bucket")
            service._bucket = mock_bucket
            
            result = service.upload_cad_file(
                estimate_id="est123",
                filename="plan.pdf",
                file_data=b"data",
                content_type="application/pdf"
            )
            
            assert "localhost:9199" in result["fileUrl"]
            assert "cad%2Fest123%2Fplan.pdf" in result["fileUrl"]

    @patch('services.storage_service.storage')
    def test_upload_cad_file_invalid_type(self, mock_storage):
        """Test upload fails for invalid file type."""
        service = StorageService()
        
        with pytest.raises(InvalidFileTypeError):
            service.upload_cad_file(
                estimate_id="est123",
                filename="document.txt",
                file_data=b"text data",
                content_type="text/plain"
            )

    @patch('services.storage_service.storage')
    def test_upload_cad_file_size_exceeded(self, mock_storage):
        """Test upload fails when file too large."""
        service = StorageService()
        
        # Create fake data larger than 50MB
        large_data = b"x" * (51 * 1024 * 1024)
        
        with pytest.raises(FileSizeExceededError):
            service.upload_cad_file(
                estimate_id="est123",
                filename="plan.pdf",
                file_data=large_data,
                content_type="application/pdf"
            )

    @patch('services.storage_service.storage')
    def test_upload_cad_file_with_metadata(self, mock_storage):
        """Test upload with custom metadata."""
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_storage.bucket.return_value = mock_bucket
        
        mock_blob.upload_from_string = Mock()
        mock_blob.make_public = Mock()
        mock_blob.public_url = "https://storage.googleapis.com/bucket/cad/est123/plan.pdf"
        
        service = StorageService()
        service._bucket = mock_bucket
        
        custom_metadata = {
            "userId": "user456",
            "projectName": "Kitchen Remodel"
        }
        
        result = service.upload_cad_file(
            estimate_id="est123",
            filename="plan.pdf",
            file_data=b"data",
            metadata=custom_metadata
        )
        
        # Verify metadata was set on blob
        assert mock_blob.metadata is not None
        assert "estimateId" in mock_blob.metadata
        assert "originalFilename" in mock_blob.metadata

    @patch('services.storage_service.storage')
    def test_upload_cad_file_infers_content_type(self, mock_storage):
        """Test content type inference when not provided."""
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_storage.bucket.return_value = mock_bucket
        
        mock_blob.upload_from_string = Mock()
        mock_blob.make_public = Mock()
        mock_blob.public_url = "https://example.com/file"
        
        service = StorageService()
        service._bucket = mock_bucket
        
        result = service.upload_cad_file(
            estimate_id="est123",
            filename="plan.png",
            file_data=b"data"
            # No content_type provided
        )
        
        assert result["contentType"] == "image/png"


class TestStorageServiceHelpers:
    """Test helper methods."""

    @patch('services.storage_service.storage')
    def test_get_cad_file_url_exists(self, mock_storage):
        """Test getting URL for existing file."""
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.exists.return_value = True
        mock_blob.public_url = "https://storage.googleapis.com/bucket/cad/est123/plan.pdf"
        mock_bucket.blob.return_value = mock_blob
        mock_storage.bucket.return_value = mock_bucket
        
        service = StorageService()
        service._bucket = mock_bucket
        
        url = service.get_cad_file_url("est123", "plan.pdf")
        
        assert url == "https://storage.googleapis.com/bucket/cad/est123/plan.pdf"
        mock_blob.exists.assert_called_once()

    @patch('services.storage_service.storage')
    def test_get_cad_file_url_not_exists(self, mock_storage):
        """Test getting URL for non-existent file."""
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.exists.return_value = False
        mock_bucket.blob.return_value = mock_blob
        mock_storage.bucket.return_value = mock_bucket
        
        service = StorageService()
        service._bucket = mock_bucket
        
        url = service.get_cad_file_url("est123", "nonexistent.pdf")
        
        assert url is None

    @patch('services.storage_service.storage')
    def test_delete_cad_file_success(self, mock_storage):
        """Test successful file deletion."""
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.exists.return_value = True
        mock_blob.delete = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_storage.bucket.return_value = mock_bucket
        
        service = StorageService()
        service._bucket = mock_bucket
        
        result = service.delete_cad_file("est123", "plan.pdf")
        
        assert result is True
        mock_blob.delete.assert_called_once()

    @patch('services.storage_service.storage')
    def test_delete_cad_file_not_exists(self, mock_storage):
        """Test deleting non-existent file."""
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.exists.return_value = False
        mock_bucket.blob.return_value = mock_blob
        mock_storage.bucket.return_value = mock_bucket
        
        service = StorageService()
        service._bucket = mock_bucket
        
        result = service.delete_cad_file("est123", "nonexistent.pdf")
        
        assert result is False

    @patch('services.storage_service.storage')
    def test_list_cad_files(self, mock_storage):
        """Test listing CAD files for an estimate."""
        mock_bucket = Mock()
        
        # Mock blobs
        mock_blob1 = Mock()
        mock_blob1.name = "cad/est123/plan.pdf"
        mock_blob1.size = 1024
        mock_blob1.content_type = "application/pdf"
        mock_blob1.time_created = datetime(2025, 12, 10, 12, 0, 0)
        mock_blob1.public_url = "https://example.com/plan.pdf"
        
        mock_blob2 = Mock()
        mock_blob2.name = "cad/est123/elevation.dwg"
        mock_blob2.size = 2048
        mock_blob2.content_type = "image/vnd.dwg"
        mock_blob2.time_created = datetime(2025, 12, 10, 12, 5, 0)
        mock_blob2.public_url = "https://example.com/elevation.dwg"
        
        mock_bucket.list_blobs.return_value = [mock_blob1, mock_blob2]
        mock_storage.bucket.return_value = mock_bucket
        
        service = StorageService()
        service._bucket = mock_bucket
        
        files = service.list_cad_files("est123")
        
        assert len(files) == 2
        assert files[0]["fileName"] == "plan.pdf"
        assert files[0]["fileSize"] == 1024
        assert files[1]["fileName"] == "elevation.dwg"
        assert files[1]["fileSize"] == 2048

    @patch('services.storage_service.storage')
    def test_list_cad_files_empty(self, mock_storage):
        """Test listing CAD files when none exist."""
        mock_bucket = Mock()
        mock_bucket.list_blobs.return_value = []
        mock_storage.bucket.return_value = mock_bucket
        
        service = StorageService()
        service._bucket = mock_bucket
        
        files = service.list_cad_files("est123")
        
        assert files == []

