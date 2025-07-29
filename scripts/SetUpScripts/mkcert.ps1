# Check for mkcert
if (-not (Get-Command "mkcert.exe" -ErrorAction SilentlyContinue)) {
    Write-Host "🔧 mkcert not found. Installing via Chocolatey..."
    if (-not (Get-Command "choco.exe" -ErrorAction SilentlyContinue)) {
        Write-Error "Chocolatey is not installed. Install it from https://chocolatey.org/install"
        exit 1
    }
    choco install mkcert -y
    $env:PATH += ";$env:ChocolateyInstall\bin"
}

# Setup local CA
Write-Host "✅ Installing local CA..."
mkcert -install

# Generate certificate
$certName = "localhost+2"
$certFile = "$certName.pem"
$keyFile = "$certName-key.pem"

if (-not (Test-Path $certFile -and (Test-Path $keyFile))) {
    Write-Host "🔐 Generating certificates for localhost..."
    mkcert localhost 127.0.0.1 ::1
} else {
    Write-Host "✅ Certificate already exists."
}

# Check for http-server
if (-not (Get-Command "http-server.cmd" -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing http-server via npm..."
    npm install -g http-server
}

# Start server
Write-Host "🚀 Starting HTTPS server on https://localhost:8080"
Start-Process "http-server" -ArgumentList "-S", "-C", $certFile, "-K", $keyFile
Write-Host "🔗 Open your browser and navigate to https://localhost:8080"