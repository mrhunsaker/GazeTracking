#!/bin/bash
#######################################################################
# Gaze Analysis Experiment Template
# Copyright 2024-21-24 Michael Ryan Hunsaker, M.Ed., Ph.D.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You can obtain a copy of the License at
#
# https://www.apache.org/licenses/LICENS
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied.
# See the License for the specific language governing permissions and
# limitations under the License
#######################################################################
# ANSI color codes - Colorblind friendly palette
# Using a combination of bright cyan and orange which work well for most color vision types
# and provide good contrast in dark terminals
CYAN='\033[1;36m'       # Bright cyan - for headers and borders
ORANGE='\033[38;5;214m' # Bright orange - for important information
WHITE='\033[1;37m'      # Bright white - for general text
BOLD='\033[1m'          # Bold text - for emphasis
NC='\033[0m'            # No Color
YELLOW='\033[33m'       # Bright yellow
PURPLE='\033[35m'       # Bright purple
GREEN='\033[32m'        # Bright green
BLUE='\033[34m'         # Blue

# Predefined student list
declare -a STUDENTS=(
    "2025_Students"
)

# Function to clear screen and display header
display_header() {
    clear
    echo
    echo -e "${CYAN}══════════════════════════════════════${NC}"
    echo -e "${YELLOW}${BOLD}Student Page Launch Interface${NC}"
    echo -e "${CYAN}══════════════════════════════════════${NC}"
    echo
}

# Function to display student menu
display_student_menu() {
    echo
    echo -e "${YELLOW}${BOLD}Available Students:${NC}"
    echo
    echo -e "${PURPLE}══════════════════════════════════════${NC}"
    echo
    for i in "${!STUDENTS[@]}"; do
        echo -e "  ${ORANGE}$((i+1))${NC}. ${WHITE}${STUDENTS[$i]}${NC}"
    done
    echo
    echo -e "${PURPLE}══════════════════════════════════════${NC}"
    echo
}

# Function to get student choice
get_student_choice() {
    while true; do
        echo -e -n "${WHITE}Enter student number ${ORANGE}(1-${#STUDENTS[@]})${WHITE}: ${NC}"
        read choice
        if [[ "$choice" =~ ^[1-9]$ ]] && [ "$choice" -le "${#STUDENTS[@]}" ]; then
            return $((choice-1))
        else
            echo -e "\n${ORANGE}Error: Please enter a valid number between 1 and ${#STUDENTS[@]}${NC}"
        fi
    done
}

# Function to validate if a directory exists
validate_directory() {
    if [ ! -d "$1" ]; then
        echo -e "\n${ORANGE}Error: Directory '$1' does not exist.${NC}"
        exit 1
    fi
}

# Function to validate if required files exist
validate_files() {
    local dir=$1
    if [ ! -f "$dir/cert.pem" ] || [ ! -f "$dir/key.pem" ]; then
        echo -e "\n${ORANGE}Error: Certificate files (cert.pem and key.pem) not found in $dir${NC}"
        exit 1
    fi
}

# Function to validate if required programs are installed
check_requirements() {
    # Check http-server
    if ! command -v http-server &> /dev/null; then
        echo -e "\n${ORANGE}Error: http-server is not installed.${NC}"
        echo -e "${WHITE}Please install it using: ${CYAN}npm install -g http-server${NC}"
        exit 1
    fi

    # Check chromium (supports multiple possible binary names)
    if ! command -v chromium &> /dev/null && ! command -v google-chrome &> /dev/null; then
        echo -e "\n${ORANGE}Error: Chrome is not installed.${NC}"
        echo -e "${WHITE}Please install Chrome using your system's package manager${NC}"
        exit 1
    fi
}

# Function to launch browser
launch_browser() {
    local url=$1
    local browser_cmd

    # Determine which Chrome command is available
    if command -v chrome &> /dev/null; then
        browser_cmd="chrome"
    else
        browser_cmd="google-chrome"
    fi

    # Wait a bit for the server to start
    sleep 2

    # Launch browser in background
    echo -e "${WHITE}Launching ${CYAN}Chromium${WHITE}...${NC}"
    $browser_cmd "$url" &> /dev/null &
}

# Function to start server and browser
start_server_and_browser() {
    local dir=$1
    local port=8080

    echo -e "\n${WHITE}Starting secure server...${NC}"

    # Start http-server in background
    cd "$dir"
    http-server -S -C ../cert.pem -K ../key.pem --loglevel=verbose -p $port &
    local server_pid=$!

    # Store server URL
    local url="https://localhost:$port"

    # Launch browser
    launch_browser "$url"

    echo -e "\n${WHITE}Server is running at ${CYAN}$url${NC}"
    echo -e "${ORANGE}Press Ctrl+C to stop the server${NC}"

    # Wait for user interrupt
    trap 'cleanup $server_pid' INT TERM
    wait $server_pid
}

# Function to clean up processes
cleanup() {
    local server_pid=$1
    echo -e "\n\n${WHITE}Shutting down server...${NC}"
    kill $server_pid 2>/dev/null
    exit 0
}

# Main script
display_header

# Check for required programs
check_requirements

# Get the base directory where student files are stored
default_base_dir="./StudentFolders"
echo -e -n "${WHITE}Enter the base directory path (press Enter for the default ./StudentFolders, which is correct in most cases): ${NC}"
read -p "$default_base_dir: " base_dir

# If the user presses Enter without input, use the default
if [[ -z "$base_dir" ]]; then
    base_dir="$default_base_dir"
fi

# Validate the base directory
validate_directory "$base_dir"
validate_files "$base_dir"

# Display student menu and get choice
display_student_menu
get_student_choice
student_dir=${STUDENTS[$?]}
full_path="$base_dir/$student_dir"

# Check if student directory exists
if [ ! -d "$full_path" ]; then
    echo -e "\n${ORANGE}Error: No directory found for student: $student_dir${NC}"
    echo -e "${WHITE}Expected path: ${CYAN}$full_path${NC}"
    exit 1
fi

# Check if index.html exists
if [ ! -f "$full_path/index.html" ]; then
    echo -e "\n${ORANGE}Error: No index.html found in student directory${NC}"
    exit 1
fi

# Start server and launch browser
start_server_and_browser "$full_path"
