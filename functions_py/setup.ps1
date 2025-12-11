# Setup script for TrueCost Python Functions (Windows PowerShell)

Write-Host "Setting up TrueCost Python Functions..." -ForegroundColor Green

# Check Python version
$pythonVersion = python --version 2>&1
Write-Host "Python version: $pythonVersion"

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv venv
} else {
    Write-Host "Virtual environment already exists"
}

# Activate virtual environment
Write-Host "Activating virtual environment..."
& ".\venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "Upgrading pip..."
python -m pip install --upgrade pip

# Install dependencies
Write-Host "Installing dependencies..."
pip install -r requirements.txt

# Create .env if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env from .env.example..."
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit .env and add your API keys!" -ForegroundColor Yellow
} else {
    Write-Host ".env already exists"
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Edit .env and add your API keys"
Write-Host "  2. Run tests: pytest"
Write-Host "  3. Start Firebase emulators: firebase emulators:start"
Write-Host ""
Write-Host "To activate virtual environment in the future:"
Write-Host "  .\venv\Scripts\Activate.ps1"

