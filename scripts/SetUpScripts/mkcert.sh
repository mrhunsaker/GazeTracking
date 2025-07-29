#!/usr/bin/env bash

set -e

CERT_NAME="localhost+2"
CERT_FILE="${CERT_NAME}.pem"
KEY_FILE="${CERT_NAME}-key.pem"


# Check if mkcert is installed
if ! command -v mkcert >/dev/null 2>&1; then
  echo "🔧 mkcert not found. Installing..."

  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo apt update
    sudo apt install -y libnss3-tools curl
    curl -JLO https://dl.filippo.io/mkcert/latest?for=linux/amd64
    chmod +x mkcert-v*-linux-amd64
    sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew install mkcert
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "Please install mkcert via Chocolatey: choco install mkcert"
    exit 1
  else
    echo "❌ Unsupported OS"
    exit 1
  fi
fi

# Install local CA if not already
echo "✅ Setting up local CA..."
mkcert -install

# Generate certs
if [[ ! -f "$CERT_FILE" || ! -f "$KEY_FILE" ]]; then
  echo "🔐 Generating certificate for localhost..."
  mkcert localhost 127.0.0.1 ::1
else
  echo "✅ Certificate already exists."
fi

# Install http-server if not installed
if ! command -v http-server >/dev/null 2>&1; then
  echo "📦 Installing http-server globally with npm..."
  npm install -g http-server
fi

# Start the HTTPS server
echo "🚀 Starting HTTPS server at https://localhost:8080"
http-server -S -C "$CERT_FILE" -K "$KEY_FILE"
echo "🔗 Open your browser and navigate to https://localhost:8080"

