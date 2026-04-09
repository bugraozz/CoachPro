param(
  [Parameter(Mandatory = $true)]
  [string]$Email,

  [Parameter(Mandatory = $true)]
  [string]$Password,

  [Parameter(Mandatory = $false)]
  [string]$BaseUrl = "http://localhost:4321"
)

$ErrorActionPreference = "Stop"

Write-Host "[1/4] Login istegi gonderiliyor..." -ForegroundColor Cyan
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$loginResponse = Invoke-WebRequest -Uri "$BaseUrl/auth/login" `
  -Method POST `
  -Body @{ email = $Email; password = $Password } `
  -UseBasicParsing `
  -WebSession $session `
  -MaximumRedirection 0 `
  -ErrorAction SilentlyContinue

if (-not $loginResponse) {
  throw "Login cevabi alinamadi."
}

if ($loginResponse.StatusCode -ne 302 -and $loginResponse.StatusCode -ne 200) {
  throw "Login basarisiz. StatusCode: $($loginResponse.StatusCode)"
}

Write-Host "[2/4] Odeme gecmisi cekiliyor..." -ForegroundColor Cyan
$history = Invoke-RestMethod -Uri "$BaseUrl/api/payments/history" -Method GET -WebSession $session

Write-Host "[3/4] Odeme raporu cekiliyor..." -ForegroundColor Cyan
$report = Invoke-RestMethod -Uri "$BaseUrl/api/payments/report" -Method GET -WebSession $session

Write-Host "[4/4] Ozet" -ForegroundColor Green
Write-Host "History kayit adedi: $($history.Count)"
Write-Host "Toplam islem: $($report.summary.totalCount)"
Write-Host "Basarili: $($report.summary.paidCount)"
Write-Host "Basarisiz: $($report.summary.failedCount)"
Write-Host "Bekleyen: $($report.summary.pendingCount)"
Write-Host "Retry: $($report.summary.retryCount)"
Write-Host "Toplam tahsilat: $($report.summary.totalRevenue)"
Write-Host "Aylik tahsilat: $($report.summary.monthRevenue)"

if ($report.topFailureReasons -and $report.topFailureReasons.Count -gt 0) {
  Write-Host "En sik hata nedenleri:" -ForegroundColor Yellow
  $report.topFailureReasons | ForEach-Object {
    Write-Host "- $($_.reason): $($_.count)"
  }
} else {
  Write-Host "Hata nedeni kaydi yok."
}

Write-Host "Tamamlandi." -ForegroundColor Green
