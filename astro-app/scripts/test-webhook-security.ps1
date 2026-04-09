param(
  [Parameter(Mandatory = $false)]
  [string]$AllowedHostUrl = "http://localhost:4321",

  [Parameter(Mandatory = $false)]
  [string]$DifferentHostUrl = "http://127.0.0.1:4321"
)

$ErrorActionPreference = "Stop"

function Get-StatusCode($url) {
  try {
    Invoke-WebRequest -Uri "$url/api/payments/webhook" -Method POST -Body @{} -MaximumRedirection 0 | Out-Null
    return 200
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      return [int]$_.Exception.Response.StatusCode
    }
    throw
  }
}

Write-Host "Webhook guvenlik smoke testi basladi" -ForegroundColor Cyan

$allowedStatus = Get-StatusCode -url $AllowedHostUrl
Write-Host "Allowed host status ($AllowedHostUrl): $allowedStatus"

$differentStatus = Get-StatusCode -url $DifferentHostUrl
Write-Host "Different host status ($DifferentHostUrl): $differentStatus"

if ($allowedStatus -eq 400 -and $differentStatus -eq 403) {
  Write-Host "Beklenen sonuc alindi: host korumasi aktif." -ForegroundColor Green
} else {
  Write-Host "Beklenen status kombinasyonu alinamadi (400/403)." -ForegroundColor Yellow
}
