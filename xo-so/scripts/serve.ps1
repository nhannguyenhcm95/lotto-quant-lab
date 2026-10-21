$port = 8088
$prefix = "http://localhost:$port/"
$baseDir = (Get-Item $PSScriptRoot).Parent.FullName

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
    $listener.Start()
    Write-Host "Server running at $prefix pointing to $baseDir"
} catch {
    Write-Error "Failed to start listener: $_"
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $request = $context.Request
            $response = $context.Response

            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")

            $urlPath = $request.Url.LocalPath
            if ($urlPath -eq "/" -or $urlPath -eq "") {
                $urlPath = "/index.html"
            }

            # Handle live Minh Ngoc API crawl endpoints
            if ($urlPath -eq "/api/crawl-xsmn") {
                $response.ContentType = "application/json; charset=utf-8"
                $respJson = ""
                try {
                    $wc = New-Object System.Net.WebClient
                    $wc.Encoding = [System.Text.Encoding]::UTF8
                    $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    $liveHtml = $wc.DownloadString("https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam.html")
                    $respObj = [PSCustomObject]@{
                        success = $true
                        source = "minhngoc.net.vn"
                        scrapedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                        html = $liveHtml
                    }
                    $respJson = $respObj | ConvertTo-Json -Depth 5
                } catch {
                    $seedPath = Join-Path $baseDir "data\historical-seed.json"
                    $seedContent = [System.IO.File]::ReadAllText($seedPath, [System.Text.Encoding]::UTF8)
                    $respJson = $seedContent
                }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                $response.ContentLength64 = $bytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                $response.Close()
                continue
            }

function Parse-VietlottHtml($rawHtml) {
    $results = @{
        power = @()
        mega = @()
    }
    $blocks = $rawHtml -split '<div class="boxkqxsdientoan">'
    foreach ($b in $blocks) {
        $isPower = ($b -match 'power-6x55')
        $isMega = ($b -match 'mega-6x45')
        if (-not $isPower -and -not $isMega) { continue }
        
        $dateStr = ""
        $dateRaw = ""
        if ($b -match '([0-9]{2})-([0-9]{2})-([0-9]{4})\.html') {
            $dateRaw = "$($matches[1])/$($matches[2])/$($matches[3])"
            $dateStr = "$($matches[3])-$($matches[2])-$($matches[1])"
        } elseif ($b -match '([0-9]{2})/([0-9]{2})/([0-9]{4})') {
            $dateRaw = $matches[0]
            $parts = $dateRaw.Split('/')
            $dateStr = "$($parts[2])-$($parts[1])-$($parts[0])"
        }
        
        $drawId = ""
        if ($b -match 'id="DT6X45_KY_VE"[^>]*>([^<]+)<') {
            $drawId = $matches[1].Trim()
        } elseif ($b -match '#[0-9]{5}') {
            $drawId = $matches[0]
        }
        
        $balls = @()
        for ($k = 1; $k -le 6; $k++) {
            if ($b -match "finnish$k bool`">([0-9]{1,2})<") {
                $balls += [int]$matches[1]
            }
        }
        
        $bonus = $null
        if ($isPower -and ($b -match 'finnish7 bool">([0-9]{1,2})<')) {
            $bonus = [int]$matches[1]
        }
        
        $jackpot = ""
        if ($b -match 'id="DT6X[45]5_G_JACKPOT"[^>]*>([^<]+)<') {
            $jackpot = $matches[1].Trim() + " đ"
        }
        
        if ($balls.Count -eq 6 -and $dateStr) {
            $item = [PSCustomObject]@{
                date = $dateStr
                drawDateRaw = $dateRaw
                gameType = if ($isPower) { "power-6-55" } else { "mega-6-45" }
                drawId = $drawId
                winningNumbers = $balls
                bonusNumber = $bonus
                jackpotEst = $jackpot
            }
            if ($isPower) {
                $results.power += $item
            } else {
                $results.mega += $item
            }
        }
    }
    return $results
}

            if ($urlPath -eq "/api/crawl-vietlott") {
                $response.ContentType = "application/json; charset=utf-8"
                $respJson = ""
                try {
                    $wc = New-Object System.Net.WebClient
                    $wc.Encoding = [System.Text.Encoding]::UTF8
                    $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    $liveHtml = $wc.DownloadString("https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott.html")
                    $parsed = Parse-VietlottHtml $liveHtml
                    $respObj = [PSCustomObject]@{
                        success = $true
                        source = "minhngoc.net.vn"
                        scrapedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                        data = $parsed
                        html = $liveHtml
                    }
                    $respJson = $respObj | ConvertTo-Json -Depth 6
                } catch {
                    $seedPath = Join-Path $baseDir "data\historical-seed.json"
                    $seedContent = [System.IO.File]::ReadAllText($seedPath, [System.Text.Encoding]::UTF8)
                    $respJson = $seedContent
                }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                $response.ContentLength64 = $bytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                $response.Close()
                continue
            }

            $localPath = Join-Path $baseDir ($urlPath.TrimStart("/").Replace("/", "\"))

            if (Test-Path $localPath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
                $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
                $response.ContentType = $contentType
                $bytes = [System.IO.File]::ReadAllBytes($localPath)
                $response.ContentLength64 = $bytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
                $response.ContentLength64 = $msg.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($msg, 0, $msg.Length)
                }
            }
            $response.Close()
        } catch {
            Write-Host "Error processing request: $_"
            try { $context.Response.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
}
