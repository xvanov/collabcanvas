"""
Storage service for handling CAD file uploads to Firebase Storage.
"""
import os
import mimetypes
from typing import Dict, Any, Optional
from datetime import datetime
from firebase_admin import storage
from ..config import settings


class StorageServiceError(Exception):
    """Base exception for storage service errors."""
    pass


class InvalidFileTypeError(StorageServiceError):
    """Raised when file type is not allowed."""
    pass


class FileSizeExceededError(StorageServiceError):
    """Raised when file size exceeds limit."""
    pass


class StorageService:
    """Service for handling CAD file uploads to Firebase Storage."""

    def __init__(self, bucket_name: Optional[str] = None):
        """
        Initialize storage service.
        
        Args:
            bucket_name: Override default storage bucket name
        """
        self.bucket_name = bucket_name or settings.STORAGE_BUCKET
        self._bucket = None

    @property
    def bucket(self):
        """Lazy-load storage bucket."""
        if self._bucket is None:
            self._bucket = storage.bucket(self.bucket_name)
        return self._bucket

    def validate_cad_file(
        self, 
        filename: str, 
        content_type: Optional[str] = None,
        file_size: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Validate CAD file before upload.
        
        Args:
            filename: Name of the file
            content_type: MIME type of the file
            file_size: Size of file in bytes
            
        Returns:
            Dict with validation result: {valid: bool, error: str?}
            
        Raises:
            InvalidFileTypeError: If file extension or MIME type not allowed
            FileSizeExceededError: If file size exceeds limit
        """
        # Validate extension
        if not settings.validate_cad_extension(filename):
            ext = os.path.splitext(filename)[1]
            raise InvalidFileTypeError(
                f"File type '{ext}' not allowed. "
                f"Allowed types: {', '.join(settings.CAD_ALLOWED_EXTENSIONS)}"
            )

        # Validate MIME type if provided
        if content_type:
            # Infer from filename if content_type is generic
            if content_type in ["application/octet-stream", "binary/octet-stream"]:
                content_type, _ = mimetypes.guess_type(filename)
            
            if content_type and not settings.validate_cad_mime_type(content_type):
                raise InvalidFileTypeError(
                    f"MIME type '{content_type}' not allowed. "
                    f"Allowed types: {', '.join(settings.CAD_ALLOWED_MIME_TYPES)}"
                )

        # Validate file size if provided
        if file_size is not None:
            if not settings.validate_cad_file_size(file_size):
                max_mb = settings.CAD_MAX_FILE_SIZE_MB
                actual_mb = file_size / (1024 * 1024)
                raise FileSizeExceededError(
                    f"File size {actual_mb:.2f}MB exceeds maximum {max_mb}MB"
                )

        return {"valid": True}

    def upload_cad_file(
        self,
        estimate_id: str,
        filename: str,
        file_data: bytes,
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Upload CAD file to Firebase Storage.
        
        Args:
            estimate_id: Unique estimate ID
            filename: Original filename
            file_data: Binary file data
            content_type: MIME type of the file
            metadata: Optional custom metadata
            
        Returns:
            Dict with file info: {
                fileUrl: str,
                filePath: str,
                fileName: str,
                fileSize: int,
                contentType: str,
                uploadedAt: str,
                estimateId: str
            }
            
        Raises:
            InvalidFileTypeError: If file validation fails
            FileSizeExceededError: If file size exceeds limit
            StorageServiceError: If upload fails
        """
        # Validate file
        file_size = len(file_data)
        self.validate_cad_file(filename, content_type, file_size)

        # Infer content type if not provided
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            if not content_type:
                content_type = "application/octet-stream"

        # Construct storage path: cad/{estimateId}/{filename}
        storage_path = f"{settings.CAD_UPLOAD_PATH}/{estimate_id}/{filename}"

        try:
            # Upload to Firebase Storage
            blob = self.bucket.blob(storage_path)
            
            # Set metadata
            blob_metadata = {
                "estimateId": estimate_id,
                "originalFilename": filename,
                "uploadedAt": datetime.utcnow().isoformat(),
            }
            if metadata:
                blob_metadata.update(metadata)
            
            blob.metadata = blob_metadata
            blob.content_type = content_type

            # Upload data
            blob.upload_from_string(file_data, content_type=content_type)

            # Make file publicly accessible (or use signed URLs in production)
            if settings.IS_EMULATOR:
                # In emulator, construct local URL
                file_url = f"http://localhost:9199/v0/b/{self.bucket_name}/o/{storage_path.replace('/', '%2F')}?alt=media"
            else:
                # Get public URL or signed URL
                blob.make_public()
                file_url = blob.public_url

            return {
                "fileUrl": file_url,
                "filePath": storage_path,
                "fileName": filename,
                "fileSize": file_size,
                "contentType": content_type,
                "uploadedAt": blob_metadata["uploadedAt"],
                "estimateId": estimate_id,
            }

        except Exception as e:
            raise StorageServiceError(f"Failed to upload file: {str(e)}") from e

    def get_cad_file_url(self, estimate_id: str, filename: str) -> Optional[str]:
        """
        Get public URL for an uploaded CAD file.
        
        Args:
            estimate_id: Unique estimate ID
            filename: Filename
            
        Returns:
            Public URL or None if file doesn't exist
        """
        storage_path = f"{settings.CAD_UPLOAD_PATH}/{estimate_id}/{filename}"
        
        try:
            blob = self.bucket.blob(storage_path)
            if not blob.exists():
                return None
            
            if settings.IS_EMULATOR:
                return f"http://localhost:9199/v0/b/{self.bucket_name}/o/{storage_path.replace('/', '%2F')}?alt=media"
            else:
                return blob.public_url
        except Exception:
            return None

    def delete_cad_file(self, estimate_id: str, filename: str) -> bool:
        """
        Delete a CAD file from storage.
        
        Args:
            estimate_id: Unique estimate ID
            filename: Filename to delete
            
        Returns:
            True if deleted, False if file didn't exist
        """
        storage_path = f"{settings.CAD_UPLOAD_PATH}/{estimate_id}/{filename}"
        
        try:
            blob = self.bucket.blob(storage_path)
            if not blob.exists():
                return False
            
            blob.delete()
            return True
        except Exception:
            return False

    def list_cad_files(self, estimate_id: str) -> list[Dict[str, Any]]:
        """
        List all CAD files for an estimate.
        
        Args:
            estimate_id: Unique estimate ID
            
        Returns:
            List of file info dicts
        """
        prefix = f"{settings.CAD_UPLOAD_PATH}/{estimate_id}/"
        
        try:
            blobs = self.bucket.list_blobs(prefix=prefix)
            files = []
            
            for blob in blobs:
                file_info = {
                    "fileName": os.path.basename(blob.name),
                    "filePath": blob.name,
                    "fileSize": blob.size,
                    "contentType": blob.content_type,
                    "uploadedAt": blob.time_created.isoformat() if blob.time_created else None,
                }
                
                if settings.IS_EMULATOR:
                    file_info["fileUrl"] = f"http://localhost:9199/v0/b/{self.bucket_name}/o/{blob.name.replace('/', '%2F')}?alt=media"
                else:
                    file_info["fileUrl"] = blob.public_url
                
                files.append(file_info)
            
            return files
        except Exception:
            return []

