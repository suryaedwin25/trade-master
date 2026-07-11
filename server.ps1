# C:\Users\surya\.gemini\antigravity\scratch\trademaster\server.ps1
$port = 8080
$dir = Resolve-Path .
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Prefixes.Add("http://localhost:$port/")

# Try to add IPv6 loopback prefix (suppress error if it fails due to privilege limits)
try {
    $listener.Prefixes.Add("http://[::1]:$port/")
} catch {}

try {
    $listener.Start()
    Write-Output "Server running locally!"
    Write-Output "Access URLs:"
    Write-Output " - http://127.0.0.1:$port/ (Recommended)"
    Write-Output " - http://localhost:$port/"
    Write-Output "Press Ctrl+C to stop the server."
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $url = $request.Url.LocalPath
        if ($url -eq "/") { $url = "/index.html" }
        
        # Strip leading slash and combine paths
        $cleanUrl = $url.TrimStart('/')
        $path = [System.IO.Path]::Combine($dir, $cleanUrl)
        
        if (Test-Path $path -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($path)
            
            # Determine content type
            $ext = [System.IO.Path]::GetExtension($path).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".gif"  { $response.ContentType = "image/gif" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                default { $response.ContentType = "application/octet-stream" }
            }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $url")
            $response.ContentType = "text/plain"
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Error $_
} finally {
    $listener.Stop()
}
