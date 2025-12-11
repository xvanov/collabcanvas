#!/usr/bin/env python3
"""
Verification script for PR1 implementation.
Checks that all required files exist and basic imports work.
"""
import sys
from pathlib import Path


def check_file_exists(filepath: str) -> bool:
    """Check if a file exists."""
    path = Path(filepath)
    exists = path.exists()
    status = "✅" if exists else "❌"
    print(f"{status} {filepath}")
    return exists


def check_imports() -> bool:
    """Check that key modules can be imported."""
    print("\n📦 Checking imports...")
    
    try:
        from config import settings
        print("✅ config.settings")
    except ImportError as e:
        print(f"❌ config.settings - {e}")
        return False
    
    try:
        from services.storage_service import StorageService
        print("✅ services.storage_service.StorageService")
    except ImportError as e:
        print(f"❌ services.storage_service - {e}")
        return False
    
    return True


def main():
    """Run verification checks."""
    print("🔍 PR1 Implementation Verification\n")
    
    # Check required files
    print("📁 Checking required files...")
    required_files = [
        "config/__init__.py",
        "config/settings.py",
        "services/__init__.py",
        "services/storage_service.py",
        "tests/__init__.py",
        "tests/unit/__init__.py",
        "tests/unit/test_storage_service.py",
        "requirements.txt",
        ".env.example",
        "pytest.ini",
        "README.md",
        "setup.py",
        "setup.sh",
        "setup.ps1",
    ]
    
    all_exist = all(check_file_exists(f) for f in required_files)
    
    # Check imports
    imports_ok = check_imports()
    
    # Summary
    print("\n" + "="*50)
    if all_exist and imports_ok:
        print("✅ PR1 verification PASSED!")
        print("\nNext steps:")
        print("  1. Run tests: pytest")
        print("  2. Check coverage: pytest --cov=. --cov-report=html")
        print("  3. Review PR1-IMPLEMENTATION.md")
        return 0
    else:
        print("❌ PR1 verification FAILED!")
        print("\nPlease review the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

