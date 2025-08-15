# Complete Deployment Script for Hood to Coast Time Tracker
# This script deploys both the CDK infrastructure and the web-app
# Simplified version - static hosting only, no Lambda functions

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "production")]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$InfrastructureOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$WebAppOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$Cyan = "Cyan"

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "=== Hood to Coast Time Tracker - Complete Deployment ===" $Blue
Write-ColorOutput "Environment: $Environment" $Yellow
Write-ColorOutput "Region: $Region" $Yellow
Write-ColorOutput "Infrastructure Only: $InfrastructureOnly" $Yellow
Write-ColorOutput "Web App Only: $WebAppOnly" $Yellow
Write-ColorOutput "Skip Build: $SkipBuild" $Yellow
Write-ColorOutput "Mode: Static Hosting Only (Mock Mode)" $Cyan

# Check if we're in the right directory
if (-not (Test-Path "cdk.json")) {
    Write-ColorOutput "Error: This script must be run from the infrastructure directory" $Red
    exit 1
}

# Step 1: Deploy Infrastructure (unless WebAppOnly is specified)
if (-not $WebAppOnly) {
    Write-ColorOutput "`n=== Step 1: Deploying CDK Infrastructure ===" $Green
    Write-ColorOutput "Creating S3 bucket and CloudFront distribution..." $Blue
    
    # Build the CDK project
    Write-ColorOutput "Building CDK project..." $Blue
    yarn build
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "CDK build failed!" $Red
        exit 1
    }
    
    # Deploy the CDK stack
    Write-ColorOutput "Deploying CDK stack..." $Blue
    yarn cdk deploy -- --require-approval never
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "CDK deployment failed!" $Red
        exit 1
    }
    
    Write-ColorOutput "✅ Infrastructure deployed successfully!" $Green
    Write-ColorOutput "Created: S3 bucket, CloudFront distribution" $Green
    
    if ($InfrastructureOnly) {
        Write-ColorOutput "Infrastructure only mode - deployment complete" $Yellow
        exit 0
    }
} else {
    Write-ColorOutput "Skipping infrastructure deployment (WebAppOnly mode)" $Yellow
}

# Step 2: Deploy Web App (unless InfrastructureOnly is specified)
if (-not $InfrastructureOnly) {
    Write-ColorOutput "`n=== Step 2: Deploying Web Application ===" $Green
    
    # Get the environment file content from CDK outputs
    Write-ColorOutput "Getting environment configuration from CDK outputs..." $Blue
    $cdkOutput = cdk list-exports --region $Region | Select-String "HoodToCoastStack:EnvironmentFileContent"
    if ($cdkOutput) {
        $envContent = ($cdkOutput -split " ")[-1]
        Write-ColorOutput "Found environment configuration" $Green
    } else {
        Write-ColorOutput "Could not find environment configuration from CDK outputs. Please run 'cdk deploy' first." $Red
        exit 1
    }
    
    # Create the environment file in the web-app directory
    Write-ColorOutput "Creating environment file..." $Blue
    $envFilePath = "../../web-app/.env.production"
    $envContent | Out-File -FilePath $envFilePath -Encoding UTF8
    Write-ColorOutput "Environment file created at: $envFilePath" $Green
    
    if (-not $SkipBuild) {
        # Build the frontend
        Write-ColorOutput "Building frontend..." $Blue
        Set-Location "../../web-app"
        
        # Set environment variables for the build
        $env:NODE_ENV = "production"
        $env:VITE_MOCK_MODE = if ($Environment -eq "development") { "true" } else { "false" }
        
        yarn build
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "Frontend build failed!" $Red
            exit 1
        }
        
        Write-ColorOutput "Frontend built successfully!" $Green
        Set-Location "../infrastructure"
    } else {
        Write-ColorOutput "Skipping frontend build" $Yellow
    }
    
    # Get the S3 bucket name from CDK outputs
    Write-ColorOutput "Getting S3 bucket name from CDK outputs..." $Blue
    $cdkOutput = cdk list-exports --region $Region | Select-String "HoodToCoastStack:S3BucketName"
    if ($cdkOutput) {
        $bucketName = ($cdkOutput -split " ")[-1]
        Write-ColorOutput "Found S3 bucket: $bucketName" $Green
    } else {
        Write-ColorOutput "Could not find S3 bucket name from CDK outputs. Please run 'cdk deploy' first." $Red
        exit 1
    }
    
    # Sync the built files to S3
    Write-ColorOutput "Uploading frontend to S3 bucket: $bucketName" $Blue
    Set-Location "../../web-app"
    $distPath = "dist/spa/*"
    aws s3 sync $distPath "s3://$bucketName" --region $Region --delete
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "Frontend deployed successfully!" $Green
        
        # Get the CloudFront URL
        Set-Location "../infrastructure"
        $cdkOutput = cdk list-exports --region $Region | Select-String "HoodToCoastStack:WebsiteUrl"
        if ($cdkOutput) {
            $websiteUrl = ($cdkOutput -split " ")[-1]
            Write-ColorOutput "Your application is now available at: $websiteUrl" $Cyan
        } else {
            Write-ColorOutput "Frontend deployed! Check CDK outputs for the CloudFront URL." $Cyan
        }
    } else {
        Write-ColorOutput "Frontend deployment failed!" $Red
        exit 1
    }
    
    # Return to infrastructure directory
    Set-Location "../infrastructure"
    Write-ColorOutput "✅ Web app deployed successfully!" $Green
}

Write-ColorOutput "`n=== Deployment Summary ===" $Blue
Write-ColorOutput "Environment: $Environment" $Yellow
Write-ColorOutput "Region: $Region" $Yellow
Write-ColorOutput "Infrastructure Deployed: $(-not $WebAppOnly)" $Green
Write-ColorOutput "Web App Deployed: $(-not $InfrastructureOnly)" $Green
Write-ColorOutput "Mode: Static hosting with mock data" $Cyan

if (-not $InfrastructureOnly -and -not $WebAppOnly) {
    Write-ColorOutput "`n🎉 Complete deployment finished successfully!" $Green
    Write-ColorOutput "Your Hood to Coast Time Tracker is now live in MOCK MODE!" $Cyan
    Write-ColorOutput "All data is local mock data - no backend required" $Cyan
} else {
    Write-ColorOutput "`n✅ Partial deployment completed as requested" $Green
}
