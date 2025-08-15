# Deploy Hood to Coast Time Tracker in Mock Mode
# This script deploys the web-app with mock data only - no backend required

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

Write-Host "=== Hood to Coast Time Tracker - Mock Mode Deployment ===" -ForegroundColor Green
Write-Host "Mode: Mock Mode (Static hosting only)" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Yellow

# Check if we're in the right directory
if (-not (Test-Path "cdk.json")) {
    Write-Host "Error: This script must be run from the infrastructure directory" -ForegroundColor Red
    exit 1
}

# Get the project root directory (parent of infrastructure)
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$webAppDir = Join-Path $projectRoot "web-app"

Write-Host "Project root: $projectRoot" -ForegroundColor Yellow
Write-Host "Web app directory: $webAppDir" -ForegroundColor Yellow

# Step 1: Deploy Infrastructure
Write-Host "`n=== Step 1: Deploying Infrastructure ===" -ForegroundColor Blue
Write-Host "Creating S3 bucket and CloudFront distribution..." -ForegroundColor Yellow

# Build the CDK project
Write-Host "Building CDK project..." -ForegroundColor Yellow
yarn build
if ($LASTEXITCODE -ne 0) {
    Write-Host "CDK build failed!" -ForegroundColor Red
    exit 1
}

# Deploy the CDK stack
Write-Host "Deploying CDK stack..." -ForegroundColor Yellow
yarn cdk deploy -- --require-approval never
if ($LASTEXITCODE -ne 0) {
    Write-Host "CDK deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Infrastructure deployed successfully!" -ForegroundColor Green

# Step 2: Deploy Web App
Write-Host "`n=== Step 2: Deploying Web Application ===" -ForegroundColor Blue

# Get the environment file content from CDK outputs
Write-Host "Getting environment configuration..." -ForegroundColor Yellow

# Use AWS CLI to get CloudFormation outputs
$stackName = "HoodToCoastStack"
$cfOutputs = aws cloudformation describe-stacks --stack-name $stackName --region $Region --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json

# Find the EnvironmentFileContent output
$envContentOutput = $cfOutputs | Where-Object { $_.OutputKey -eq "EnvironmentFileContent" }
if ($envContentOutput) {
    $envContent = $envContentOutput.OutputValue
    Write-Host "Found environment configuration" -ForegroundColor Green
} else {
    Write-Host "Could not find environment configuration from CDK outputs." -ForegroundColor Red
    exit 1
}

# Create the environment file in the web-app directory
Write-Host "Creating environment file..." -ForegroundColor Yellow
$envFilePath = Join-Path $webAppDir ".env.production"
$envContent | Out-File -FilePath $envFilePath -Encoding UTF8
Write-Host "Environment file created at: $envFilePath" -ForegroundColor Green

# Build the frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
Set-Location $webAppDir

# Set environment variables for the build
$env:NODE_ENV = "production"
$env:VITE_MOCK_MODE = "true"

# Create a .env file with the required environment variables
Write-Host "Creating .env file with VITE_MOCK_MODE=true..." -ForegroundColor Yellow
$envFileContent = @"
NODE_ENV=production
VITE_MOCK_MODE=true
"@
$envFilePath = Join-Path $webAppDir ".env"
$envFileContent | Out-File -FilePath $envFilePath -Encoding UTF8
Write-Host "Created .env file at: $envFilePath" -ForegroundColor Green

# Also replace the placeholder in the environment.ts file
Write-Host "Updating environment.ts with build-time mock mode..." -ForegroundColor Yellow
$envTsPath = Join-Path $webAppDir "src\config\environment.ts"
$envTsContent = Get-Content $envTsPath -Raw
$envTsContent = $envTsContent -replace 'BUILD_TIME_MOCK_MODE_PLACEHOLDER', 'true'
$envTsContent | Out-File -FilePath $envTsPath -Encoding UTF8
Write-Host "Updated environment.ts with BUILD_TIME_MOCK_MODE=true" -ForegroundColor Green

# Build the frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
yarn build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Frontend built successfully!" -ForegroundColor Green
Set-Location (Join-Path $projectRoot "infrastructure")

# Get the S3 bucket name from CDK outputs
Write-Host "Getting S3 bucket name..." -ForegroundColor Yellow
$s3BucketOutput = $cfOutputs | Where-Object { $_.OutputKey -eq "S3BucketName" }
if ($s3BucketOutput) {
    $bucketName = $s3BucketOutput.OutputValue
    Write-Host "Found S3 bucket: $bucketName" -ForegroundColor Green
} else {
    Write-Host "Could not find S3 bucket name from CDK outputs." -ForegroundColor Red
    exit 1
}

# Sync the built files to S3
Write-Host "Uploading frontend to S3..." -ForegroundColor Yellow
Set-Location $webAppDir
$distPath = "dist/spa"
aws s3 sync $distPath "s3://$bucketName" --region $Region --delete

if ($LASTEXITCODE -eq 0) {
    Write-Host "Frontend deployed successfully!" -ForegroundColor Green
    
    # Get the CloudFront URL
    Set-Location (Join-Path $projectRoot "infrastructure")
    $websiteUrlOutput = $cfOutputs | Where-Object { $_.OutputKey -eq "WebsiteUrl" }
    if ($websiteUrlOutput) {
        $websiteUrl = $websiteUrlOutput.OutputValue
        Write-Host "`n🎉 Your application is now live!" -ForegroundColor Green
        Write-Host "URL: $websiteUrl" -ForegroundColor Cyan
        Write-Host "Mode: Mock Mode (all data is local mock data)" -ForegroundColor Yellow
    } else {
        Write-Host "Frontend deployed! Check CDK outputs for the CloudFront URL." -ForegroundColor Cyan
    }
} else {
    Write-Host "Frontend deployment failed!" -ForegroundColor Red
    exit 1
}

# Return to infrastructure directory
Set-Location (Join-Path $projectRoot "infrastructure")

Write-Host "`n=== Deployment Summary ===" -ForegroundColor Blue
Write-Host "✅ Infrastructure: S3 + CloudFront" -ForegroundColor Green
Write-Host "✅ Web App: Vue.js with mock data" -ForegroundColor Green
Write-Host "✅ Mode: Mock Mode (no backend required)" -ForegroundColor Green
Write-Host "✅ Cost: Minimal (static hosting only)" -ForegroundColor Green

Write-Host "`nYour Hood to Coast Time Tracker is now deployed and running in mock mode!" -ForegroundColor Green
Write-Host "All data is local mock data - perfect for testing and development." -ForegroundColor Cyan
