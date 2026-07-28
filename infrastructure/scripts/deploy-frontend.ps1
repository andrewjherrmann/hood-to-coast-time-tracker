# Deploy Frontend to S3
# This script should be run after CDK deployment to upload the built frontend

param(
    [Parameter(Mandatory=$true)]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

Write-Host "Deploying frontend to $Environment environment in $Region region..." -ForegroundColor Green

# Get the S3 bucket name from CDK outputs
Write-Host "Getting S3 bucket name from CDK outputs..." -ForegroundColor Yellow
$cdkOutput = cdk list-exports --region $Region | Select-String "HoodToCoastStack:S3BucketName"
if ($cdkOutput) {
    $bucketName = ($cdkOutput -split " ")[-1]
    Write-Host "Found S3 bucket: $bucketName" -ForegroundColor Green
} else {
    Write-Host "Could not find S3 bucket name from CDK outputs. Please run 'cdk deploy' first." -ForegroundColor Red
    exit 1
}

# Build the frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
Set-Location "../../web-app"
yarn build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

# Sync the built files to S3
Write-Host "Uploading frontend to S3 bucket: $bucketName" -ForegroundColor Yellow
$distPath = "dist/spa/*"
aws s3 sync $distPath "s3://$bucketName" --region $Region --delete

if ($LASTEXITCODE -eq 0) {
    Write-Host "Frontend deployed successfully!" -ForegroundColor Green
    Write-Host "You can now access your application at the CloudFront URL shown in CDK outputs." -ForegroundColor Cyan
} else {
    Write-Host "Frontend deployment failed!" -ForegroundColor Red
    exit 1
}

# Return to infrastructure directory
Set-Location "../infrastructure"

