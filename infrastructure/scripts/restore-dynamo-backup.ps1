# Restores DynamoDB items from an aws dynamodb scan backup file
# Usage: .\restore-dynamo-backup.ps1 -BackupFile <path> -TargetTable <table> [-Region <region>]
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,

    [Parameter(Mandatory=$true)]
    [string]$TargetTable,

    [string]$Region = "us-east-1"
)

$data = Get-Content $BackupFile -Raw | ConvertFrom-Json
$items = $data.Items

if (-not $items -or $items.Count -eq 0) {
    Write-Host "No items found in backup file." -ForegroundColor Yellow
    exit 0
}

Write-Host "Restoring $($items.Count) items to $TargetTable..." -ForegroundColor Cyan

# batch-write-item supports max 25 items per call
$batchSize = 25
$total = 0

for ($i = 0; $i -lt $items.Count; $i += $batchSize) {
    $batch = $items[$i..([Math]::Min($i + $batchSize - 1, $items.Count - 1))]

    $putRequests = $batch | ForEach-Object { @{ PutRequest = @{ Item = $_ } } }
    $requestItems = @{ $TargetTable = $putRequests }
    $payload = @{ RequestItems = $requestItems } | ConvertTo-Json -Depth 20 -Compress

    $tmpFile = [System.IO.Path]::GetTempFileName()
    $payload | Out-File -FilePath $tmpFile -Encoding UTF8 -NoNewline

    aws dynamodb batch-write-item --request-items "file://$tmpFile" --region $Region | Out-Null
    Remove-Item $tmpFile

    $total += $batch.Count
    Write-Host "  Restored $total / $($items.Count) items..."
}

Write-Host "Done. $total items restored to $TargetTable." -ForegroundColor Green
