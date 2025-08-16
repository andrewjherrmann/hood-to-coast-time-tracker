param(
    [Parameter(Mandatory=$true)]
    [string]$ApiUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

Write-Host "Testing Hood to Coast API Endpoints" -ForegroundColor Green
Write-Host "API URL: $ApiUrl" -ForegroundColor Yellow
Write-Host "API Key: $ApiKey" -ForegroundColor Yellow

# Test function
function Test-ApiEndpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null
    )
    
    $headers = @{
        "X-Api-Key" = $ApiKey
        "Content-Type" = "application/json"
    }
    
    $uri = "$ApiUrl$Endpoint"
    
    Write-Host "Testing $Method $Endpoint" -ForegroundColor Cyan
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
        } elseif ($Method -eq "POST") {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $Body
        } else {
            Write-Host "Method $Method not implemented in test script" -ForegroundColor Yellow
            return
        }
        
        Write-Host "Success: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode
            Write-Host "Status Code: $statusCode" -ForegroundColor Red
        }
        return $null
    }
}

# Test data
$testRace = @{
    name = "Test Race 2024"
    year = 2024
    location = "Portland, OR"
    description = "Test race for API validation"
    status = "upcoming"
} | ConvertTo-Json

$testTeam = @{
    name = "Test Team Alpha"
    raceId = "test_race_id"
    captainName = "John Doe"
    captainEmail = "john@example.com"
    division = "open"
    status = "registered"
} | ConvertTo-Json

$testRunner = @{
    name = "Jane Smith"
    teamId = "test_team_id"
    raceId = "test_race_id"
    email = "jane@example.com"
    experience = "intermediate"
} | ConvertTo-Json

$testLeg = @{
    name = "Test Leg 1"
    raceId = "test_race_id"
    teamId = "test_team_id"
    runnerId = "test_runner_id"
    legNumber = 1
    distance = 5.2
    difficulty = "moderate"
    status = "pending"
} | ConvertTo-Json

Write-Host "Starting API Tests..." -ForegroundColor Green

# Test Races endpoints
Write-Host "Testing Races API" -ForegroundColor Magenta
Test-ApiEndpoint -Method "GET" -Endpoint "/races"
Test-ApiEndpoint -Method "POST" -Endpoint "/races" -Body $testRace

# Test Teams endpoints
Write-Host "Testing Teams API" -ForegroundColor Magenta
Test-ApiEndpoint -Method "GET" -Endpoint "/teams"
Test-ApiEndpoint -Method "POST" -Endpoint "/teams" -Body $testTeam

# Test Runners endpoints
Write-Host "Testing Runners API" -ForegroundColor Magenta
Test-ApiEndpoint -Method "GET" -Endpoint "/runners"
Test-ApiEndpoint -Method "POST" -Endpoint "/runners" -Body $testRunner

# Test Legs endpoints
Write-Host "Testing Legs API" -ForegroundColor Magenta
Test-ApiEndpoint -Method "GET" -Endpoint "/legs"
Test-ApiEndpoint -Method "POST" -Endpoint "/legs" -Body $testLeg

Write-Host "API testing completed!" -ForegroundColor Green
