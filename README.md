# Gaze Analysis Experiment Manager

This project implements a comprehensive gaze tracking experiment system using WebGazer.js. It enables researchers to present stimuli, track participants' gaze patterns, and collect data for visual attention and object recognition studies.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [System Requirements](#system-requirements)
4. [Installation & Setup](#installation--setup)
5. [Project Structure](#project-structure)
6. [Usage Guide](#usage-guide)
7. [Technical Details](#technical-details)
8. [Troubleshooting](#troubleshooting)
9. [How to Contribute](#how-to-contribute)
10. [License](#license)

---

## Overview

The Gaze Analysis Experiment Manager allows researchers to:

- Track participant gaze data using WebGazer.js
- Run configurable visual trials with randomized image objects
- Apply dynamic exclusions based on participant input
- Collect and store experimental data locally
- Support multiple test types (Shapes, Colors, Abstract, Pictures)

---

## Features

- **Multiple stimulus categories:** Shapes, Colors, Abstract images, and Pictures
- **Configurable trials:** Select from 10-50 trials per session
- **Automated calibration:** Built-in eye tracker calibration procedure
- **Data collection:** Comprehensive gaze data recording with timestamps
- **Local data storage:** Results saved locally as JSON files
- **Secure delivery:** HTTPS protocol implementation for secure content delivery
- **Browser compatibility:** Chrome, Firefox, Edge
- **Modular JavaScript architecture**

---

## System Requirements

- Modern web browser with WebRTC support (Chrome, Firefox, Edge, or Chromium)
- Webcam access for eye tracking
- Node.js and npm installed (for `http-server`)
- SSL certificates for secure server connection

---

## Installation & Setup

### Prerequisites

1. Install Node.js and npm from [nodejs.org](https://nodejs.org/)
2. Install the required http-server package:

   ```bash
   npm install -g http-server
   ```

3. Install OpenSSL (if not already installed):
   - **Linux:** `sudo apt-get install openssl` (Ubuntu/Debian) or `sudo yum install openssl` (CentOS/RHEL)
   - **macOS:** `brew install openssl`
   - **Windows:** Download from [openssl.org](https://www.openssl.org/source/) or use a binary distribution
4. Generate SSL certificates (`cert.pem` and `key.pem`) or use provided ones

### Generating SSL Certificates

The experiment requires HTTPS for security and webcam access. Generate self-signed certificates with OpenSSL:

```bash
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
```

Follow the prompts (defaults are fine for local testing). Place both `cert.pem` and `key.pem` in the project root directory.

---

## Project Structure

```bash
GazeTracking/
├── cert.pem                  # SSL certificate
├── key.pem                   # SSL key
├── runexperiment.sh          # Bash script to start experiment
├── scripts/                  # Windows script versions
│   ├── runexperiment.ps1     # PowerShell script
│   └── runexperiment.bat     # Windows batch file
├── StudentFolders/           # Contains participant folders
│   ├── [Student_Folder]/
│   │   ├── index.html
│   │   ├── trialManager.js
│   │   ├── objectExclusions.js
│   │   ├── webgazer.js
│   │   ├── localforage.min.js
│   │   ├── Shapes/
│   │   ├── Colors/
│   │   ├── Abstract/
│   │   └── Pictures/
└── AnalysisPlotting.py       # Data analysis script
```

**Stimulus images** should be placed in the respective folders and named as `object001.png`, `object002.png`, etc. Update `objectExclusions.js` if certain stimuli should not appear together.

---

## Usage Guide

### Running the Experiment

#### On Linux/macOS

```bash
chmod +x runexperiment.sh
./runexperiment.sh
```

#### On Windows

- **PowerShell:** `.\scripts\runexperiment.ps1`
- **Command Prompt:** `scripts\runexperiment.bat`

#### Steps

1. When prompted, select the base directory (default: `./StudentFolders`)
2. Choose a student folder from the list
3. The experiment will launch in your default browser

#### During the Experiment

1. Enter participant initials when prompted
2. Select the stimulus type (Shapes, Colors, Abstract, or Pictures)
3. Choose the number of trials to run (10-50)
4. Complete the calibration phase by looking at and clicking yellow dots
5. The experiment will run automatically, presenting stimuli and recording gaze data
6. Upon completion, data will be saved locally and downloaded as a JSON file

---

## Technical Details

### Core Components

- **index.html:** Main experiment interface, loads scripts and manages UI
- **trialManager.js:** Controls experiment flow, trial management, and data collection
- **webgazer.js:** Webcam-based eye tracking
- **localforage.min.js:** Client-side data storage
- **objectExclusions.js:** Defines which objects should not appear together in trials

### Eye Tracking

Uses WebGazer.js for webcam-based eye tracking. Calibration requires participants to look at and click on a series of points to improve gaze prediction accuracy.

### Trial Types

1. **Type 1:** Target object with two identical distractors
2. **Type 2:** Target object with two different distractors

### Data Collection

Each trial records:

- Trial number and type
- Start and end timestamps
- Object identifiers and positions
- Continuous gaze coordinates with timestamps

### Data Storage

- Locally using localforage
- Downloaded as a JSON file: `[INITIALS]_[TIMESTAMP]_data.json`

### Analysis Script

A Python script (`AnalysisPlotting.py`) is provided for generating visualizations and statistical summaries from collected data.

**Usage:**

```bash
python AnalysisPlotting.py <path_to_json>
```

Check the `./experimentalData/<filename>` directory for the generated report and plots.

---

## Troubleshooting

### Camera Access Issues

- Ensure your browser has permission to access the webcam
- Check that no other applications are using the webcam
- Try a different browser if issues persist

### Server Issues

- Verify `http-server` is installed: `npm list -g http-server`
- Ensure `cert.pem` and `key.pem` are in the correct location and readable
- Check that port 8080 is available: `lsof -i :8080`
- If port is in use, modify the port in the script or close the other application

### Browser Compatibility

- Use Chrome, Firefox, or Edge for best compatibility
- Ensure your browser is up to date

---

## How to Contribute

We welcome contributions! Here's how you can help:

### Contribution Guidelines

1. **Fork & Clone**
   - Fork the repository
   - Create a feature branch
   - Make your changes

2. **Code Standards**
   - Follow existing code style
   - Document new functions
   - Add comments for complex logic
   - Test your changes thoroughly

3. **Submit Changes**
   - Push to your fork
   - Submit a Pull Request (PR)
   - Describe your changes in detail
   - Reference any related issues

### Areas for Contribution

- New trial types
- Additional analysis tools
- Enhanced calibration methods
- Documentation (usage examples, API docs, tutorials)
- Testing (unit, integration, browser compatibility)

#### Getting Started

1. Check existing issues
2. Discuss major changes first
3. Follow the coding style guide
4. Include tests with new features
5. Update documentation

For questions or help, open an issue or contact the maintainers.

---

## License

Copyright 2024-11-30 Michael Ryan Hunsaker, M.Ed., Ph.D.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

<https://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
