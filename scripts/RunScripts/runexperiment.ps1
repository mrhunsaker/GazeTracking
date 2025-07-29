<#
.SYNOPSIS
    Gaze Analysis Experiment Template
    Copyright 2024-21-24 Michael Ryan Hunsaker, M.Ed., Ph.D.

.LICENSE
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You can obtain a copy of the License at

    https://www.apache.org/licenses/LICENS

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
#>

# ANSI color codes - Colorblind friendly palette
$CYAN = "`e[1;36m"       # Bright cyan - for headers and borders
$ORANGE = "`e[38;5;214m" # Bright orange - for important information
$WHITE = "`e[1;37m"      # Bright white - for general text
$BOLD = "`e[1m"          # Bold text - for emphasis
$NC = "`e[0m"            # No Color
$YELLOW = "`e[33m"       # Bright yellow
$PURPLE = "`e[35m"       # Bright purple
$GREEN = "`e[32m"        # Bright green
$BLUE = "`e[34m"         # Blue

# Predefined student list
$STUDENTS = @(
    "2025_Students",
    "Development_Student"
)

# Function to clear screen and display header
function Display-Header {
    Clear-Host
    Write-Host ""
    Write-Host "${CYAN}══════════════════════════════════════${NC}"
    Write-Host "${YELLOW}${BOLD}Student Page Launch Interface${NC}"
    Write-Host "${CYAN}══════════════════════════════════════${NC}"
    Write-Host ""
}

# Function to display student menu
function Display-StudentMenu {
    Write-Host ""
    Write-Host "${YELLOW}${BOLD}Available Students:${NC}"
    Write-Host ""
    Write-Host "${PURPLE}══════════════════════════════════════${NC}"
    Write-Host ""
    for ($i = 0; $i -lt $STUDENTS.Length; $i++) {
        Write-Host "  ${ORANGE}$($i + 1)${NC}. ${WHITE}$($STUDENTS[$i])${NC}"
    }
    Write-Host ""
    Write-Host "${PURPLE}══════════════════════════════════════${NC}"
    Write-Host ""
}

# Function to get student choice
function Get-StudentChoice {
    while ($true) {
        Write-Host -NoNewline "${WHITE}Enter student number ${ORANGE}(1-$($STUDENTS.Length))${WHITE}: ${NC}"
        $choice = Read-Host
        if ($choice -match '^[1-9]$' -and $choice -le $STUDENTS.Length) {
            return ($choice - 1)
        } else {
            Write-Host "`n${ORANGE}Error: Please enter a valid number between 1 and $($STUDENTS.Length)${NC}"
        }
    }
}

# Function to validate if a directory exists
function Validate-Directory {
    param (
        [string]$dir
    )
    if (-not (Test-Path -Path $dir -PathType Container)) {
        Write-Host "`n${ORANGE}Error: Directory '$dir' does not exist.${NC}"
        exit 1
    }
}

# Function to validate if required files exist
function Validate-Files {
    param (
        [string]$dir
    )
    if (-not (Test-Path -Path "$dir/cert.pem") -or -not (Test-Path -Path "$dir/key.pem")) {
        Write-Host "`n${ORANGE}Error: Certificate files (cert.pem and key.pem) not found in $dir${NC}"
        exit 1
    }
}

# Function to validate if required programs are installed
function Check-Requirements {
    # Check http-server
    if (-not (Get-Command http-server -ErrorAction SilentlyContinue)) {
        Write-Host "`n${ORANGE}Error: http-server is not installed.${NC}"
        Write-Host "${WHITE}Please install it using: ${CYAN}npm install -g http-server${NC}"
        exit 1
    }

    # Check Microsoft Edge, Google Chrome, or Firefox
    if (-not (Get-Command msedge -ErrorAction SilentlyContinue) -and -not (Get-Command chrome -ErrorAction SilentlyContinue) -and -not (Get-Command firefox -ErrorAction SilentlyContinue)) {
        Write-Host "`n${ORANGE}Error: Neither Microsoft Edge, Google Chrome, nor Firefox is installed.${NC}"
        Write-Host "${WHITE}Please install one of these browsers using your system's package manager${NC}"
        exit 1
    }
}

# Function to launch browser
function Launch-Browser {
    param (
        [string]$url
    )
    $browserCmd = if (Get-Command msedge -ErrorAction SilentlyContinue) { "msedge" } elseif (Get-Command chrome -ErrorAction SilentlyContinue) { "chrome" } else { "firefox" }

    # Wait a bit for the server to start
    Start-Sleep -Seconds 2

    # Launch browser in background
    Write-Host "${WHITE}Launching ${CYAN}$browserCmd${WHITE}...${NC}"
    Start-Process $browserCmd $url
}

# Function to start server and browser
function Start-ServerAndBrowser {
    param (
        [string]$dir
    )
    $port = 8080

    Write-Host "`n${WHITE}Starting secure server...${NC}"

    # Start http-server in background
    Push-Location $dir
    Start-Process -NoNewWindow -FilePath "http-server" -ArgumentList "-S -C ../cert.pem -K ../key.pem --loglevel=verbose -p $port"
    Pop-Location

    # Store server URL
    $url = "https://localhost:$port"

    # Launch browser
    Launch-Browser $url

    Write-Host "`n${WHITE}Server is running at ${CYAN}$url${NC}"
    Write-Host "${ORANGE}Press Ctrl+C to stop the server${NC}"

    # Wait for user interrupt
    try {
        while ($true) {
            Start-Sleep -Seconds 1
        }
    } finally {
        Cleanup
    }
}

# Function to clean up processes
function Cleanup {
    Write-Host "`n`n${WHITE}Shutting down server...${NC}"
    Stop-Process -Name "http-server" -ErrorAction SilentlyContinue
    exit 0
}

# Main script
Display-Header

# Check for required programs
Check-Requirements

# Get the base directory where student files are stored
$defaultBaseDir = "./StudentFolders"
$baseDir = Read-Host -Prompt "${WHITE}Enter the base directory path (press Enter for the default ./StudentFolders, which is correct in most cases): ${NC}"
if ([string]::IsNullOrEmpty($baseDir)) {
    $baseDir = $defaultBaseDir
}

# Validate the base directory
Validate-Directory -dir $baseDir
Validate-Files -dir $baseDir

# Display student menu and get choice
Display-StudentMenu
$studentIndex = Get-StudentChoice
$studentDir = $STUDENTS[$studentIndex]
$fullPath = "$baseDir/$studentDir"

# Check if student directory exists
if (-not (Test-Path -Path $fullPath -PathType Container)) {
    Write-Host "`n${ORANGE}Error: No directory found for student: $studentDir${NC}"
    Write-Host "${WHITE}Expected path: ${CYAN}$fullPath${NC}"
    exit 1
fi

# Check if index.html exists
if (-not (Test-Path -Path "$fullPath/index.html")) {
    Write-Host "`n${ORANGE}Error: No index.html found in student directory${NC}"
    exit 1
fi

# Start server and launch browser
Start-ServerAndBrowser -dir $fullPath
