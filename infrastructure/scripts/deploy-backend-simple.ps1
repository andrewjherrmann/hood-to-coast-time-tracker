param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

# CONFIGURE THESE VALUES FOR YOUR ENVIRONMENT
$DomainName = "your-domain.com"  # Replace with your actual domain
$Subdomain = "your-subdomain"    # Replace with your actual subdomain

Write-Host "Deploying Hood to Coast Backend Infrastructure (Simple)" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Domain: $DomainName" -ForegroundColor Yellow
Write-Host "Subdomain: $Subdomain" -ForegroundColor Yellow

# Change to infrastructure directory
Set-Location $PSScriptRoot\..

Write-Host "Deploying CDK Infrastructure..." -ForegroundColor Yellow

# Deploy the CDK stack
Write-Host "Running CDK deploy..." -ForegroundColor Yellow
cdk deploy --context Environment=$Environment --context Region=$Region --context UseCustomDomain=true --context DomainName=$DomainName --context Subdomain=$Subdomain --context MockMode=false --context GenerateEnvFile=true --require-approval never

if ($LASTEXITCODE -ne 0) {
    Write-Host "CDK deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "CDK deployment completed successfully!" -ForegroundColor Green
Write-Host "Backend deployment completed successfully!" -ForegroundColor Green
Write-Host "Deployment complete!" -ForegroundColor Green
