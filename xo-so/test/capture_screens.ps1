param(
    [string]$Url = "http://localhost:8080/",
    [string]$Prefix = "current",
    [int]$Height = 950,
    [int]$MobileHeight = 896,
    [string]$OutDir = ""
)

$browserPaths = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$browser = $browserPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $browser) {
    Write-Error "No Chromium browser (Edge/Chrome) found!"
    exit 1
}

if (-not $OutDir) {
    $OutDir = Join-Path $PSScriptRoot "screenshots"
}
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$desktopPng = Join-Path $outDir "$($Prefix)_desktop.png"
$mobilePng = Join-Path $outDir "$($Prefix)_mobile.png"

Write-Host "Capturing Desktop ($desktopPng)..."
$p1 = Start-Process -FilePath $browser -ArgumentList "--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=4000", "--window-size=1280,$Height", "--screenshot=`"$desktopPng`"", "`"$Url`"" -PassThru -NoNewWindow
$p1.WaitForExit(12000)

Write-Host "Capturing Mobile ($mobilePng)..."
$p2 = Start-Process -FilePath $browser -ArgumentList "--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=4000", "--window-size=414,$MobileHeight", "--user-agent=`"Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15`"", "--screenshot=`"$mobilePng`"", "`"$Url`"" -PassThru -NoNewWindow
$p2.WaitForExit(12000)

Write-Host "Done capturing screenshots!"
Write-Host "Desktop: $desktopPng"
Write-Host "Mobile: $mobilePng"
