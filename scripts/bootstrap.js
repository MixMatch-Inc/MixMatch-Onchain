#!/usr/bin/env node

/**
 * MixMatch Monorepo Developer Bootstrap Script
 * Minimizes manual setup steps for external contributors
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    white: '\x1b[37m'
};

// Command line arguments
const args = process.argv.slice(2);
const options = {
    full: !args.includes('--partial'),
    partial: args.includes('--partial'),
    skipDocker: args.includes('--skip-docker'),
    skipDemoData: args.includes('--skip-demo-data'),
    validateOnly: args.includes('--validate-only'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help')
};

// Help function
function showHelp() {
    console.log(`
MixMatch Monorepo Bootstrap Script

USAGE:
    node scripts/bootstrap.js [OPTIONS]

OPTIONS:
    --full              Run full setup (default)
    --partial           Run partial setup (skip optional services)
    --skip-docker       Skip Docker/MongoDB setup
    --skip-demo-data    Skip demo data seeding
    --validate-only     Only validate existing setup
    --verbose           Show detailed output
    --help              Show this help message

EXAMPLES:
    node scripts/bootstrap.js                    # Full setup
    node scripts/bootstrap.js --partial          # Partial setup
    node scripts/bootstrap.js --validate-only    # Validate existing setup
    node scripts/bootstrap.js --skip-docker      # Skip Docker setup
`);
}

// Logging functions
function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logInfo(message) {
    log(`[INFO] ${message}`, 'blue');
}

function logSuccess(message) {
    log(`[SUCCESS] ${message}`, 'green');
}

function logWarning(message) {
    log(`[WARNING] ${message}`, 'yellow');
}

function logError(message) {
    log(`[ERROR] ${message}`, 'red');
}

function logVerbose(message) {
    if (options.verbose) {
        log(`[VERBOSE] ${message}`, 'blue');
    }
}

// Execute command with promise
function execCommand(command, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
        logVerbose(`Executing: ${command}`);
        const child = spawn(command, { shell: true, cwd, stdio: 'pipe' });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

// Check if command exists
async function commandExists(command) {
    try {
        await execCommand(`which ${command}`);
        return true;
    } catch {
        try {
            await execCommand(`where ${command}`);
            return true;
        } catch {
            return false;
        }
    }
}

// Validate prerequisites
async function validatePrerequisites() {
    logInfo('Validating prerequisites...');
    
    let errors = 0;
    
    // Check Node.js
    if (await commandExists('node')) {
        try {
            const { stdout } = await execCommand('node --version');
            const nodeVersion = stdout.trim().replace('v', '');
            const requiredVersion = '18.0.0';
            
            if (require('semver').gte(nodeVersion, requiredVersion)) {
                logSuccess(`Node.js ${stdout.trim()} found`);
            } else {
                logError(`Node.js ${stdout.trim()} found. Required: v18+`);
                errors++;
            }
        } catch (error) {
            logError('Failed to check Node.js version');
            errors++;
        }
    } else {
        logError('Node.js not found. Please install Node.js v18+');
        errors++;
    }
    
    // Check pnpm
    if (await commandExists('pnpm')) {
        try {
            const { stdout } = await execCommand('pnpm --version');
            logSuccess(`pnpm ${stdout.trim()} found`);
        } catch (error) {
            logError('Failed to check pnpm version');
            errors++;
        }
    } else {
        logError('pnpm not found. Installing pnpm...');
        try {
            await execCommand('npm install -g pnpm');
            logSuccess('pnpm installed successfully');
        } catch (error) {
            logError('Failed to install pnpm');
            errors++;
        }
    }
    
    // Check Git
    if (await commandExists('git')) {
        logSuccess('Git found');
    } else {
        logError('Git not found. Please install Git');
        errors++;
    }
    
    // Check Docker (optional)
    if (!options.skipDocker) {
        if (await commandExists('docker')) {
            logSuccess('Docker found');
        } else {
            logWarning('Docker not found. MongoDB setup will be skipped');
            options.skipDocker = true;
        }
    }
    
    if (errors > 0) {
        logError(`${errors} prerequisite validation errors found`);
        throw new Error('Prerequisites validation failed');
    }
    
    logSuccess('All prerequisites validated');
}

// Setup environment files
function setupEnvironment() {
    logInfo('Setting up environment files...');
    
    const envFiles = [
        '.env',
        'apps/api/.env',
        'apps/web/.env.local',
        'apps/stellar-service/.env'
    ];
    
    envFiles.forEach(envFile => {
        if (!fs.existsSync(envFile)) {
            const exampleFile = `${envFile}.example`;
            if (fs.existsSync(exampleFile)) {
                logVerbose(`Copying ${exampleFile} to ${envFile}`);
                fs.copyFileSync(exampleFile, envFile);
                logSuccess(`Created ${envFile}`);
            } else {
                logWarning(`Example file not found for ${envFile}`);
            }
        } else {
            logVerbose(`${envFile} already exists`);
        }
    });
}

// Validate environment variables
async function validateEnvironment() {
    logInfo('Validating environment variables...');
    
    // Check if env-manifest package exists and run validation
    if (fs.existsSync('packages/env-manifest')) {
        try {
            await execCommand('pnpm --filter @mixmatch/env-manifest env:check');
            logSuccess('Environment variables validated');
        } catch (error) {
            logError('Environment variable validation failed');
            throw error;
        }
    } else {
        logWarning('env-manifest package not found, skipping validation');
    }
}

// Install dependencies
async function installDependencies() {
    logInfo('Installing dependencies...');
    
    try {
        logVerbose('Installing root dependencies...');
        await execCommand('pnpm install');
        logSuccess('Dependencies installed successfully');
    } catch (error) {
        logError('Failed to install dependencies');
        throw error;
    }
}

// Setup Docker services
async function setupDocker() {
    if (options.skipDocker) {
        logInfo('Skipping Docker setup');
        return;
    }
    
    logInfo('Setting up Docker services...');
    
    try {
        // Start MongoDB
        logVerbose('Starting MongoDB container...');
        await execCommand('docker compose up -d mongo');
        logSuccess('MongoDB container started');
        
        // Wait for MongoDB to be ready
        logInfo('Waiting for MongoDB to be ready...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check MongoDB health
        try {
            const { stdout } = await execCommand('docker compose ps mongo');
            if (stdout.includes('healthy')) {
                logSuccess('MongoDB is healthy and ready');
            } else {
                logWarning('MongoDB may not be fully ready yet');
            }
        } catch (error) {
            logWarning('Could not verify MongoDB health');
        }
    } catch (error) {
        logError('Failed to start MongoDB container');
        throw error;
    }
}

// Build packages
async function buildPackages() {
    logInfo('Building packages...');
    
    try {
        await execCommand('pnpm build');
        logSuccess('Packages built successfully');
    } catch (error) {
        logError('Failed to build packages');
        throw error;
    }
}

// Seed demo data
async function seedDemoData() {
    if (options.skipDemoData) {
        logInfo('Skipping demo data seeding');
        return;
    }
    
    logInfo('Seeding demo data...');
    
    let apiProcess = null;
    
    try {
        // Check if API is running first
        try {
            const response = await fetch('http://localhost:3001/health');
            logVerbose('API is already running');
        } catch (error) {
            logWarning('API is not running. Starting API in background...');
            apiProcess = spawn('pnpm', ['--filter', 'api', 'dev'], { 
                stdio: 'pipe',
                detached: true 
            });
            apiProcess.unref();
            
            // Wait for API to start
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            // Check again
            try {
                const response = await fetch('http://localhost:3001/health');
                logVerbose('API started successfully');
            } catch (error) {
                logError('Failed to start API for demo data seeding');
                if (apiProcess) {
                    apiProcess.kill();
                }
                throw error;
            }
        }
        
        // Seed demo data
        await execCommand('pnpm --filter api seed:demo');
        logSuccess('Demo data seeded successfully');
        
    } catch (error) {
        logError('Failed to seed demo data');
        if (apiProcess) {
            apiProcess.kill();
        }
        throw error;
    } finally {
        // Clean up background API process
        if (apiProcess) {
            apiProcess.kill();
        }
    }
}

// Run tests
async function runTests() {
    logInfo('Running tests...');
    
    try {
        await execCommand('pnpm test');
        logSuccess('All tests passed');
    } catch (error) {
        logWarning('Some tests failed. This may be expected during initial setup');
    }
}

// Print next steps
function printNextSteps() {
    console.log(`

${colors.green}🎉 Bootstrap completed successfully!${colors.reset}

${colors.blue}Next Steps:${colors.reset}

1. ${colors.yellow}Start Development Server:${colors.reset}
   pnpm dev

2. ${colors.yellow}Access Applications:${colors.reset}
   - Web App: http://localhost:3000
   - Backend API: http://localhost:3001
   - Stellar Service: http://localhost:3002

3. ${colors.yellow}Demo Credentials:${colors.reset}
   - dj.demo@mixmatch.io / mixmatch123
   - planner.demo@mixmatch.io / mixmatch123
   - fan.demo@mixmatch.io / mixmatch123

4. ${colors.yellow}Useful Commands:${colors.reset}
   - Build: pnpm build
   - Test: pnpm test
   - Lint: pnpm lint
   - Type check: pnpm typecheck

5. ${colors.yellow}Environment Variables:${colors.reset}
   - Validate: pnpm --filter @mixmatch/env-manifest env:check
   - List API vars: pnpm --filter @mixmatch/env-manifest env:list api
   - List Web vars: pnpm --filter @mixmatch/env-manifest env:list web

${colors.blue}Documentation:${colors.reset}
- README.md for detailed setup
- docs/ for architecture and guides
- .github/ for contribution guidelines

${colors.green}Happy coding! 🚀${colors.reset}

`);
}

// Validate existing setup
async function validateExistingSetup() {
    logInfo('Validating existing setup...');
    
    let errors = 0;
    
    try {
        await validatePrerequisites();
    } catch (error) {
        errors++;
    }
    
    try {
        await validateEnvironment();
    } catch (error) {
        errors++;
    }
    
    // Check if dependencies are installed
    if (!fs.existsSync('node_modules')) {
        logError('Dependencies not installed. Run \'node scripts/bootstrap.js\' first');
        errors++;
    } else {
        logSuccess('Dependencies are installed');
    }
    
    // Check if packages build
    try {
        logInfo('Testing package build...');
        await execCommand('pnpm build');
        logSuccess('Packages build successfully');
    } catch (error) {
        logError('Package build failed');
        errors++;
    }
    
    // Check Docker services
    if (!options.skipDocker) {
        try {
            const { stdout } = await execCommand('docker compose ps mongo');
            if (stdout.includes('Up')) {
                logSuccess('MongoDB is running');
            } else {
                logWarning('MongoDB is not running');
            }
        } catch (error) {
            logWarning('Could not check MongoDB status');
        }
    }
    
    if (errors === 0) {
        logSuccess('Setup validation passed');
        printNextSteps();
    } else {
        logError(`${errors} validation errors found`);
        logInfo('Run \'node scripts/bootstrap.js\' to fix issues');
        process.exit(1);
    }
}

// Main bootstrap function
async function runBootstrap() {
    logInfo('Starting MixMatch monorepo bootstrap...');
    
    if (options.validateOnly) {
        await validateExistingSetup();
        return;
    }
    
    try {
        await validatePrerequisites();
        setupEnvironment();
        await validateEnvironment();
        await installDependencies();
        
        if (options.full) {
            await setupDocker();
            await buildPackages();
            await runTests();
            await seedDemoData();
        } else {
            logInfo('Partial setup mode - skipping optional steps');
        }
        
        printNextSteps();
    } catch (error) {
        logError(`Bootstrap failed: ${error.message}`);
        process.exit(1);
    }
}

// Handle help
if (options.help) {
    showHelp();
    process.exit(0);
}

// Handle partial flag
if (options.partial) {
    options.full = false;
}

// Check for semver package
try {
    require('semver');
} catch (error) {
    logError('semver package is required. Please install it with: npm install semver');
    process.exit(1);
}

// Run bootstrap
runBootstrap().catch(error => {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
});
