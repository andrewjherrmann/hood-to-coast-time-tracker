# Deploy Web App with Environment Configuration
# This script deploys the web-app with proper environment variables for mock/production mode

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "production")]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$BuildOnly
)

Write-Host "=== Hood to Coast Web App Deployment ===" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Build Only: $BuildOnly" -ForegroundColor Yellow

# Get the environment file content from CDK outputs
Write-Host "Getting environment configuration from CDK outputs..." -ForegroundColor Blue
$cdkOutput = cdk list-exports --region $Region | Select-String "HoodToCoastStack:EnvironmentFileContent"
if ($cdkOutput) {
    $envContent = ($cdkOutput -split " ")[-1]
    Write-Host "Found environment configuration" -ForegroundColor Green
} else {
    Write-Host "Could not find environment configuration from CDK outputs. Please run 'cdk deploy' first." -ForegroundColor Red
    exit 1
}

# Create the environment file in the web-app directory
Write-Host "Creating environment file..." -ForegroundColor Blue
$envFilePath = "../../web-app/.env.production"
$envContent | Out-File -FilePath $envFilePath -Encoding UTF8
Write-Host "Environment file created at: $envFilePath" -ForegroundColor Green

# Build the frontend
Write-Host "Building frontend..." -ForegroundColor Blue
Set-Location "../../web-app"

# Set environment variables for the build
$env:NODE_ENV = "production"
$env:VITE_MOCK_MODE = if ($Environment -eq "development") { "true" } else { "false" }

yarn build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Frontend built successfully!" -ForegroundColor Green

if ($BuildOnly) {
    Write-Host "Build only mode - skipping deployment" -ForegroundColor Yellow
    Set-Location "../infrastructure"
    exit 0
}

# Get the S3 bucket name from CDK outputs
Write-Host "Getting S3 bucket name from CDK outputs..." -ForegroundColor Blue
Set-Location "../infrastructure"
$cdkOutput = cdk list-exports --region $Region | Select-String "HoodToCoastStack:S3BucketName"
if ($cdkOutput) {
    $bucketName = ($cdkOutput -split " ")[-1]
    Write-Host "Found S3 bucket: $bucketName" -ForegroundColor Green
} else {
    Write-Host "Could not find S3 bucket name from CDK outputs. Please run 'cdk deploy' first." -ForegroundColor Red
    exit 1
}

# Sync the built files to S3
Write-Host "Uploading frontend to S3 bucket: $bucketName" -ForegroundColor Blue
Set-Location "../web-app"
$distPath = "dist/spa/*"
aws s3 sync $distPath "s3://$bucketName" --region $Region --delete

if ($LASTEXITCODE -eq 0) {
    Write-Host "Frontend deployed successfully!" -ForegroundColor Green
    
    # Get the CloudFront URL
    Set-Location "../infrastructure"
    $cdkOutput = cdk list-exports --region $Region | Select-String "HoodToCoastStack:WebsiteUrl"
    if ($cdkOutput) {
        $websiteUrl = ($cdkOutput -split " ")[-1]
        Write-Host "Your application is now available at: $websiteUrl" -ForegroundColor Cyan
    } else {
        Write-Host "Frontend deployed! Check CDK outputs for the CloudFront URL." -ForegroundColor Cyan
    }
} else {
    Write-Host "Frontend deployment failed!" -ForegroundColor Red
    exit 1
}

# Return to infrastructure directory
Set-Location "../infrastructure"
Write-Host "Web app deployment completed!" -ForegroundColor Green
