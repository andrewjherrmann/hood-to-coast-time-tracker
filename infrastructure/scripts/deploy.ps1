# Deployment script for Hood to Coast Time Tracker
# Usage: .\deploy.ps1 [environment] [action]
# Environment: development, production
# Action: deploy, destroy, diff, synth (default: deploy)

param(
    [Parameter(Position=0)]
    [ValidateSet("development", "production")]
    [string]$Environment = "development",
    
    [Parameter(Position=1)]
    [ValidateSet("deploy", "destroy", "diff", "synth")]
    [string]$Action = "deploy"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "=== Hood to Coast Time Tracker Deployment ===" $Blue
Write-ColorOutput "Environment: $Environment" $Yellow
Write-ColorOutput "Action: $Action" $Yellow

# Get configuration details
try {
    $configPath = Join-Path $PSScriptRoot "..\config\environments.ts"
    $region = "us-east-1" # Default fallback
    $domain = "example.com" # Default fallback
    
    # Try to read config (this is a simplified approach)
    if (Test-Path $configPath) {
        Write-ColorOutput "Region: $region" $Yellow
        Write-ColorOutput "Domain: $Environment.$domain" $Yellow
    }
} catch {
    Write-ColorOutput "Warning: Could not read configuration details" $Yellow
}

Write-Host ""

# Check if we're about to destroy production
if ($Environment -eq "production" -and $Action -eq "destroy") {
    Write-ColorOutput "⚠️  WARNING: You are about to DESTROY the PRODUCTION environment! ⚠️" $Red
    $confirmation = Read-Host "Are you absolutely sure? Type 'yes' to confirm"
    if ($confirmation -ne "yes") {
        Write-ColorOutput "Deployment cancelled." $Yellow
        exit 0
    }
}

# Build the project
Write-ColorOutput "Building project..." $Blue
yarn build

# Execute the CDK command
Write-ColorOutput "Executing CDK $Action..." $Blue
switch ($Action) {
    "deploy" {
        yarn cdk deploy -- --require-approval never
    }
    "destroy" {
        yarn cdk destroy -- --force
    }
    "diff" {
        yarn cdk diff
    }
    "synth" {
        yarn cdk synth
    }
}

Write-ColorOutput "✅ $Action completed successfully for $Environment environment!" $Green
