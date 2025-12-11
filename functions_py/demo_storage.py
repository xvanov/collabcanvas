#!/usr/bin/env python3
"""
Demo script to test storage service functionality.
Run with: python demo_storage.py
"""
from services.storage_service import StorageService, InvalidFileTypeError, FileSizeExceededError

def demo_validation():
    """Demo file validation."""
    print("=" * 60)
    print("DEMO: File Validation")
    print("=" * 60)
    
    service = StorageService()
    
    # Test valid files
    test_cases = [
        ("floor_plan.pdf", "application/pdf", 1024 * 1024),  # 1MB
        ("elevation.dwg", "image/vnd.dwg", 5 * 1024 * 1024),  # 5MB
        ("site.dxf", "application/dxf", 2 * 1024 * 1024),  # 2MB
        ("sketch.png", "image/png", 3 * 1024 * 1024),  # 3MB
    ]
    
    print("\n✅ Valid Files:")
    for filename, content_type, size in test_cases:
        try:
            result = service.validate_cad_file(filename, content_type, size)
            print(f"  ✓ {filename} ({size / (1024*1024):.1f}MB) - {result['valid']}")
        except Exception as e:
            print(f"  ✗ {filename} - ERROR: {e}")
    
    # Test invalid files
    print("\n❌ Invalid Files (Expected Errors):")
    
    # Invalid extension
    try:
        service.validate_cad_file("document.txt", "text/plain", 1024)
        print("  ✗ document.txt - Should have failed!")
    except InvalidFileTypeError as e:
        print(f"  ✓ document.txt - Correctly rejected: {str(e)[:50]}...")
    
    # File too large
    try:
        service.validate_cad_file("huge.pdf", "application/pdf", 51 * 1024 * 1024)
        print("  ✗ huge.pdf - Should have failed!")
    except FileSizeExceededError as e:
        print(f"  ✓ huge.pdf - Correctly rejected: {str(e)[:50]}...")
    
    print()


def demo_settings():
    """Demo configuration settings."""
    print("=" * 60)
    print("DEMO: Configuration Settings")
    print("=" * 60)
    
    from config import settings
    
    print(f"\n📁 Storage Configuration:")
    print(f"  Bucket: {settings.STORAGE_BUCKET}")
    print(f"  Upload Path: {settings.CAD_UPLOAD_PATH}/{{estimateId}}/{{filename}}")
    
    print(f"\n📋 File Constraints:")
    print(f"  Max Size: {settings.CAD_MAX_FILE_SIZE_MB}MB")
    print(f"  Allowed Extensions: {', '.join(settings.CAD_ALLOWED_EXTENSIONS)}")
    
    print(f"\n🔧 Environment:")
    print(f"  ENV: {settings.ENV}")
    print(f"  Emulator Mode: {settings.IS_EMULATOR}")
    print(f"  LLM Model: {settings.LLM_MODEL}")
    print(f"  Vision Model: {settings.VISION_MODEL}")
    
    print(f"\n🎛️  Feature Flags:")
    print(f"  Voice Input: {settings.ENABLE_VOICE_INPUT}")
    print(f"  Whisper Fallback: {settings.ENABLE_WHISPER_FALLBACK}")
    
    print()


def main():
    """Run all demos."""
    print("\n" + "🎯 " * 20)
    print("PR1 Storage Service Demo")
    print("🎯 " * 20 + "\n")
    
    try:
        demo_settings()
        demo_validation()
        
        print("=" * 60)
        print("✅ Demo Complete!")
        print("=" * 60)
        print("\nNote: Upload demo requires Firebase Admin SDK initialization.")
        print("Run unit tests to see full functionality:")
        print("  pytest tests/unit/test_storage_service.py -v")
        print()
        
    except Exception as e:
        print(f"\n❌ Demo failed: {e}")
        print("\nMake sure you're in the functions_py directory")
        print("and have activated the virtual environment:")
        print("  source venv/bin/activate  # Unix/Mac")
        print("  .\\venv\\Scripts\\activate  # Windows")


if __name__ == "__main__":
    main()

