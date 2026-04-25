# MixMatch Monorepo Developer Bootstrap Script (PowerShell Version)
# Minimizes manual setup steps for external contributors

param(
    [switch]$Full = $true,
    [switch]$Partial,
    [switch]$SkipDocker,
    [switch]$SkipDemoData,
    [switch]$ValidateOnly,
    [switch]$Verbose,
    [switch]$Help
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Logging functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" "Blue"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" "Green"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" "Yellow"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" "Red"
}

function Write-Verbose {
    param([string]$Message)
    if ($Verbose) {
        Write-ColorOutput "[VERBOSE] $Message" "Blue"
    }
}

# Show help
function Show-Help {
    @"
MixMatch Monorepo Bootstrap Script (PowerShell)

USAGE:
    .\scripts\bootstrap.ps1 [OPTIONS]

OPTIONS:
    -Full              Run full setup (default)
    -Partial           Run partial setup (skip optional services)
    -SkipDocker        Skip Docker/MongoDB setup
    -SkipDemoData      Skip demo data seeding
    -ValidateOnly      Only validate existing setup
    -Verbose           Show detailed output
    -Help              Show this help message

EXAMPLES:
    .\scripts\bootstrap.ps1                    # Full setup
    .\scripts\bootstrap.ps1 -Partial          # Partial setup
    .\scripts\bootstrap.ps1 -ValidateOnly    # Validate existing setup
    .\scripts\bootstrap.ps1 -SkipDocker      # Skip Docker setup

"@
}

# Test if command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Validate prerequisites
function Test-Prerequisites {
    Write-Info "Validating prerequisites..."
    
    $errors = 0
    
    # Check Node.js
    if (Test-Command "node") {
        $nodeVersion = node --version
        $versionNumber = $nodeVersion -replace 'v', ''
        $requiredVersion = "18.0.0"
        
        if ([version]$versionNumber -ge [version]$requiredVersion) {
            Write-Success "Node.js $nodeVersion found"
        } else {
            Write-Error "Node.js $nodeVersion found. Required: v18+"
            $errors++
        }
    } else {
        Write-Error "Node.js not found. Please install Node.js v18+"
        $errors++
    }
    
    # Check pnpm
    if (Test-Command "pnpm") {
        $pnpmVersion = pnpm --version
        Write-Success "pnpm $pnpmVersion found"
    } else {
        Write-Error "pnpm not found. Installing pnpm..."
        npm install -g pnpm
        if ($LASTEXITCODE -eq 0) {
            Write-Success "pnpm installed successfully"
        } else {
            Write-Error "Failed to install pnpm"
            $errors++
        }
    }
    
    # Check Git
    if (Test-Command "git") {
        Write-Success "Git found"
    } else {
        Write-Error "Git not found. Please install Git"
        $errors++
    }
    
    # Check Docker (optional)
    if (-not $SkipDocker) {
        if (Test-Command "docker") {
            Write-Success "Docker found"
        } else {
            Write-Warning "Docker not found. MongoDB setup will be skipped"
            $script:SkipDocker = $true
        }
    }
    
    if ($errors -gt 0) {
        Write-Error "$errors prerequisite validation errors found"
        exit 1
    }
    
    Write-Success "All prerequisites validated"
}

# Setup environment files
function Initialize-Environment {
    Write-Info "Setting up environment files..."
    
    $envFiles = @(
        ".env",
        "apps/api/.env",
        "apps/web/.env.local",
        "apps/stellar-service/.env"
    )
    
    foreach ($envFile in $envFiles) {
        if (-not (Test-Path $envFile)) {
            $exampleFile = "$envFile.example"
            if (Test-Path $exampleFile) {
                Write-Verbose "Copying $exampleFile to $envFile"
                Copy-Item $exampleFile $envFile
                Write-Success "Created $envFile"
            } else {
                Write-Warning "Example file not found for $envFile"
            }
        } else {
            Write-Verbose "$envFile already exists"
        }
    }
}

# Validate environment variables
function Test-Environment {
    Write-Info "Validating environment variables..."
    
    # Check if env-manifest package exists and run validation
    if (Test-Path "packages/env-manifest") {
        pnpm --filter @mixmatch/env-manifest env:check
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Environment variables validated"
        } else {
            Write-Error "Environment variable validation failed"
            return $false
        }
    } else {
        Write-Warning "env-manifest package not found, skipping validation"
    }
    
    return $true
}

# Install dependencies
function Install-Dependencies {
    Write-Info "Installing dependencies..."
    
    Write-Verbose "Installing root dependencies..."
    pnpm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed successfully"
    } else {
        Write-Error "Failed to install dependencies"
        return $false
    }
    
    return $true
}

# Setup Docker services
function Initialize-Docker {
    if ($SkipDocker) {
        Write-Info "Skipping Docker setup"
        return $true
    }
    
    Write-Info "Setting up Docker services..."
    
    # Start MongoDB
    Write-Verbose "Starting MongoDB container..."
    docker compose up -d mongo
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "MongoDB container started"
        
        # Wait for MongoDB to be ready
        Write-Info "Waiting for MongoDB to be ready..."
        Start-Sleep -Seconds 10
        
        # Check MongoDB health
        $mongoStatus = docker compose ps mongo
        if ($mongoStatus -match "healthy") {
            Write-Success "MongoDB is healthy and ready"
        } else {
            Write-Warning "MongoDB may not be fully ready yet"
        }
    } else {
        Write-Error "Failed to start MongoDB container"
        return $false
    }
    
    return $true
}

# Build packages
function Build-Packages {
    Write-Info "Building packages..."
    
    pnpm build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Packages built successfully"
    } else {
        Write-Error "Failed to build packages"
        return $false
    }
    
    return $true
}

# Seed demo data
function Initialize-DemoData {
    if ($SkipDemoData) {
        Write-Info "Skipping demo data seeding"
        return $true
    }
    
    Write-Info "Seeding demo data..."
    
    # Check if API is running first
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -ErrorAction Stop
        Write-Verbose "API is already running"
    } catch {
        Write-Warning "API is not running. Starting API in background..."
        Start-Process -FilePath "pnpm" -ArgumentList "--filter","api","dev" -WindowStyle Hidden
        $script:ApiPid = $true
        Start-Sleep -Seconds 10
        
        # Check again
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -ErrorAction Stop
        } catch {
            Write-Error "Failed to start API for demo data seeding"
            if ($script:ApiPid) {
                Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
            }
            return $false
        }
    }
    
    # Seed demo data
    pnpm --filter api seed:demo
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Demo data seeded successfully"
    } else {
        Write-Error "Failed to seed demo data"
        if ($script:ApiPid) {
            Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
        }
        return $false
    }
    
    # Clean up background API process
    if ($script:ApiPid) {
        Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    }
    
    return $true
}

# Run tests
function Invoke-Tests {
    Write-Info "Running tests..."
    
    pnpm test
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "All tests passed"
    } else {
        Write-Warning "Some tests failed. This may be expected during initial setup"
    }
}

# Print next steps
function Show-NextSteps {
    @"

🎉 Bootstrap completed successfully!

Next Steps:

1. Start Development Server:
   pnpm dev

2. Access Applications:
   - Web App: http://localhost:3000
   - Backend API: http://localhost:3001
   - Stellar Service: http://localhost:3002

3. Demo Credentials:
   - dj.demo@mixmatch.io / mixmatch123
   - planner.demo@mixmatch.io / mixmatch123
   - fan.demo@mixmatch.io / mixmatch123

4. Useful Commands:
   - Build: pnpm build
   - Test: pnpm test
   - Lint: pnpm lint
   - Type check: pnpm typecheck

5. Environment Variables:
   - Validate: pnpm --filter @mixmatch/env-manifest env:check
   - List API vars: pnpm --filter @mixmatch/env-manifest env:list api
   - List Web vars: pnpm --filter @mixmatch/env-manifest env:list web

Documentation:
- README.md for detailed setup
- docs/ for architecture and guides
- .github/ for contribution guidelines

Happy coding! 🚀

"@
}

# Validate existing setup
function Test-ExistingSetup {
    Write-Info "Validating existing setup..."
    
    $errors = 0
    
    # Check prerequisites
    Test-Prerequisites
    $errors += if ($?) { 0 } else { 1 }
    
    # Validate environment
    Test-Environment
    $errors += if ($?) { 0 } else { 1 }
    
    # Check if dependencies are installed
    if (-not (Test-Path "node_modules")) {
        Write-Error "Dependencies not installed. Run '.\scripts\bootstrap.ps1' first"
        $errors++
    } else {
        Write-Success "Dependencies are installed"
    }
    
    # Check if packages build
    Write-Info "Testing package build..."
    pnpm build *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Packages build successfully"
    } else {
        Write-Error "Package build failed"
        $errors++
    }
    
    # Check Docker services
    if (-not $SkipDocker) {
        $mongoStatus = docker compose ps mongo
        if ($mongoStatus -match "Up") {
            Write-Success "MongoDB is running"
        } else {
            Write-Warning "MongoDB is not running"
        }
    }
    
    if ($errors -eq 0) {
        Write-Success "Setup validation passed"
        Show-NextSteps
    } else {
        Write-Error "$errors validation errors found"
        Write-Info "Run '.\scripts\bootstrap.ps1' to fix issues"
        exit 1
    }
}

# Main bootstrap function
function Start-Bootstrap {
    Write-Info "Starting MixMatch monorepo bootstrap..."
    
    if ($ValidateOnly) {
        Test-ExistingSetup
        return
    }
    
    Test-Prerequisites
    Initialize-Environment
    
    if (-not (Test-Environment)) {
        exit 1
    }
    
    if (-not (Install-Dependencies)) {
        exit 1
    }
    
    if ($Full) {
        if (-not (Initialize-Docker)) {
            exit 1
        }
        
        if (-not (Build-Packages)) {
            exit 1
        }
        
        Invoke-Tests
        Initialize-DemoData
    } else {
        Write-Info "Partial setup mode - skipping optional steps"
    }
    
    Show-NextSteps
}

# Handle help
if ($Help) {
    Show-Help
    exit 0
}

# Handle partial flag
if ($Partial) {
    $Full = $false
}

# Run bootstrap
try {
    Start-Bootstrap
} catch {
    Write-Error "Bootstrap failed: $($_.Exception.Message)"
    exit 1
}
