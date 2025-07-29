@echo off
set CERT_NAME=localhost+2
set CERT_FILE=%CERT_NAME%.pem
set KEY_FILE=%CERT_NAME%-key.pem

where mkcert >nul 2>nul
if errorlevel 1 (
    echo 🔧 mkcert not found.
    echo Please install it via Chocolatey: choco install mkcert
    exit /b 1
)

mkcert -install

if not exist %CERT_FILE% (
    echo 🔐 Generating certificate...
    mkcert localhost 127.0.0.1 ::1
) else (
    echo ✅ Certificate already exists.
)

where http-server >nul 2>nul
if errorlevel 1 (
    echo 📦 Installing http-server via npm...
    npm install -g http-server
)

echo 🚀 Starting HTTPS server on https://localhost:8080
http-server -S -C %CERT_FILE% -K %KEY_FILE%
echo Press any key to stop the server...