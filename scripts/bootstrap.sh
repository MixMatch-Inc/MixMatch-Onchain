#!/bin/bash

# MixMatch Monorepo Developer Bootstrap Script
# Minimizes manual setup steps for external contributors

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
FULL_SETUP=true
SKIP_DOCKER=false
SKIP_DEMO_DATA=false
VALIDATE_ONLY=false
VERBOSE=false

# Help function
show_help() {
    cat << EOF
MixMatch Monorepo Bootstrap Script

USAGE:
    ./scripts/bootstrap.sh [OPTIONS]

OPTIONS:
    --full              Run full setup (default)
    --partial           Run partial setup (skip optional services)
    --skip-docker       Skip Docker/MongoDB setup
    --skip-demo-data    Skip demo data seeding
    --validate-only     Only validate existing setup
    --verbose           Show detailed output
    --help              Show this help message

EXAMPLES:
    ./scripts/bootstrap.sh                    # Full setup
    ./scripts/bootstrap.sh --partial          # Partial setup
    ./scripts/bootstrap.sh --validate-only    # Validate existing setup
    ./scripts/bootstrap.sh --skip-docker      # Skip Docker setup

EOF
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    local errors=0
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        REQUIRED_NODE_VERSION="18.0.0"
        if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE_VERSION" ]; then
            log_success "Node.js $NODE_VERSION found"
        else
            log_error "Node.js $NODE_VERSION found. Required: v18+"
            errors=$((errors + 1))
        fi
    else
        log_error "Node.js not found. Please install Node.js v18+"
        errors=$((errors + 1))
    fi
    
    # Check pnpm
    if command_exists pnpm; then
        PNPM_VERSION=$(pnpm --version)
        log_success "pnpm $PNPM_VERSION found"
    else
        log_error "pnpm not found. Installing pnpm..."
        npm install -g pnpm
        if [ $? -eq 0 ]; then
            log_success "pnpm installed successfully"
        else
            log_error "Failed to install pnpm"
            errors=$((errors + 1))
        fi
    fi
    
    # Check Git
    if command_exists git; then
        log_success "Git found"
    else
        log_error "Git not found. Please install Git"
        errors=$((errors + 1))
    fi
    
    # Check Docker (optional)
    if [ "$SKIP_DOCKER" = false ]; then
        if command_exists docker; then
            log_success "Docker found"
        else
            log_warning "Docker not found. MongoDB setup will be skipped"
            SKIP_DOCKER=true
        fi
    fi
    
    if [ $errors -gt 0 ]; then
        log_error "$errors prerequisite validation errors found"
        exit 1
    fi
    
    log_success "All prerequisites validated"
}

# Setup environment files
setup_environment() {
    log_info "Setting up environment files..."
    
    local env_files=(
        ".env"
        "apps/api/.env"
        "apps/web/.env.local"
        "apps/stellar-service/.env"
    )
    
    for env_file in "${env_files[@]}"; do
        if [ ! -f "$env_file" ]; then
            if [ -f "${env_file}.example" ]; then
                log_verbose "Copying ${env_file}.example to $env_file"
                cp "${env_file}.example" "$env_file"
                log_success "Created $env_file"
            else
                log_warning "Example file not found for $env_file"
            fi
        else
            log_verbose "$env_file already exists"
        fi
    done
}

# Validate environment variables
validate_environment() {
    log_info "Validating environment variables..."
    
    # Check if env-manifest package exists and run validation
    if [ -d "packages/env-manifest" ]; then
        pnpm --filter @mixmatch/env-manifest env:check
        if [ $? -eq 0 ]; then
            log_success "Environment variables validated"
        else
            log_error "Environment variable validation failed"
            return 1
        fi
    else
        log_warning "env-manifest package not found, skipping validation"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies
    log_verbose "Installing root dependencies..."
    pnpm install
    
    if [ $? -eq 0 ]; then
        log_success "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        return 1
    fi
}

# Setup Docker services
setup_docker() {
    if [ "$SKIP_DOCKER" = true ]; then
        log_info "Skipping Docker setup"
        return 0
    fi
    
    log_info "Setting up Docker services..."
    
    # Start MongoDB
    log_verbose "Starting MongoDB container..."
    docker compose up -d mongo
    
    if [ $? -eq 0 ]; then
        log_success "MongoDB container started"
        
        # Wait for MongoDB to be ready
        log_info "Waiting for MongoDB to be ready..."
        sleep 10
        
        # Check MongoDB health
        if docker compose ps mongo | grep -q "healthy"; then
            log_success "MongoDB is healthy and ready"
        else
            log_warning "MongoDB may not be fully ready yet"
        fi
    else
        log_error "Failed to start MongoDB container"
        return 1
    fi
}

# Build packages
build_packages() {
    log_info "Building packages..."
    
    pnpm build
    
    if [ $? -eq 0 ]; then
        log_success "Packages built successfully"
    else
        log_error "Failed to build packages"
        return 1
    fi
}

# Seed demo data
seed_demo_data() {
    if [ "$SKIP_DEMO_DATA" = true ]; then
        log_info "Skipping demo data seeding"
        return 0
    fi
    
    log_info "Seeding demo data..."
    
    # Check if API is running first
    if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
        log_warning "API is not running. Starting API in background..."
        pnpm --filter api dev > /dev/null 2>&1 &
        API_PID=$!
        sleep 10
        
        # Check again
        if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
            log_error "Failed to start API for demo data seeding"
            if [ ! -z "$API_PID" ]; then
                kill $API_PID 2>/dev/null
            fi
            return 1
        fi
    fi
    
    # Seed demo data
    pnpm --filter api seed:demo
    
    if [ $? -eq 0 ]; then
        log_success "Demo data seeded successfully"
    else
        log_error "Failed to seed demo data"
        if [ ! -z "$API_PID" ]; then
            kill $API_PID 2>/dev/null
        fi
        return 1
    fi
    
    # Clean up background API process
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    pnpm test
    
    if [ $? -eq 0 ]; then
        log_success "All tests passed"
    else
        log_warning "Some tests failed. This may be expected during initial setup"
    fi
}

# Print next steps
print_next_steps() {
    cat << EOF

${GREEN}🎉 Bootstrap completed successfully!${NC}

${BLUE}Next Steps:${NC}

1. ${YELLOW}Start Development Server:${NC}
   pnpm dev

2. ${YELLOW}Access Applications:${NC}
   - Web App: http://localhost:3000
   - Backend API: http://localhost:3001
   - Stellar Service: http://localhost:3002

3. ${YELLOW}Demo Credentials:${NC}
   - dj.demo@mixmatch.io / mixmatch123
   - planner.demo@mixmatch.io / mixmatch123
   - fan.demo@mixmatch.io / mixmatch123

4. ${YELLOW}Useful Commands:${NC}
   - Build: pnpm build
   - Test: pnpm test
   - Lint: pnpm lint
   - Type check: pnpm typecheck

5. ${YELLOW}Environment Variables:${NC}
   - Validate: pnpm --filter @mixmatch/env-manifest env:check
   - List API vars: pnpm --filter @mixmatch/env-manifest env:list api
   - List Web vars: pnpm --filter @mixmatch/env-manifest env:list web

${BLUE}Documentation:${NC}
- README.md for detailed setup
- docs/ for architecture and guides
- .github/ for contribution guidelines

${GREEN}Happy coding! 🚀${NC}

EOF
}

# Validate existing setup
validate_existing_setup() {
    log_info "Validating existing setup..."
    
    local errors=0
    
    # Check prerequisites
    validate_prerequisites
    errors=$((errors + $?))
    
    # Validate environment
    validate_environment
    errors=$((errors + $?))
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log_error "Dependencies not installed. Run './scripts/bootstrap.sh' first"
        errors=$((errors + 1))
    else
        log_success "Dependencies are installed"
    fi
    
    # Check if packages build
    log_info "Testing package build..."
    pnpm build > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_success "Packages build successfully"
    else
        log_error "Package build failed"
        errors=$((errors + 1))
    fi
    
    # Check Docker services
    if [ "$SKIP_DOCKER" = false ]; then
        if docker compose ps mongo | grep -q "Up"; then
            log_success "MongoDB is running"
        else
            log_warning "MongoDB is not running"
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "Setup validation passed"
        print_next_steps
    else
        log_error "$errors validation errors found"
        log_info "Run './scripts/bootstrap.sh' to fix issues"
        exit 1
    fi
}

# Main bootstrap function
run_bootstrap() {
    log_info "Starting MixMatch monorepo bootstrap..."
    
    if [ "$VALIDATE_ONLY" = true ]; then
        validate_existing_setup
        return $?
    fi
    
    validate_prerequisites
    setup_environment
    validate_environment
    install_dependencies
    
    if [ "$FULL_SETUP" = true ]; then
        setup_docker
        build_packages
        run_tests
        seed_demo_data
    else
        log_info "Partial setup mode - skipping optional steps"
    fi
    
    print_next_steps
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            FULL_SETUP=true
            shift
            ;;
        --partial)
            FULL_SETUP=false
            shift
            ;;
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-demo-data)
            SKIP_DEMO_DATA=true
            shift
            ;;
        --validate-only)
            VALIDATE_ONLY=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run bootstrap
run_bootstrap
