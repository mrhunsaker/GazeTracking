# Gaze Analysis Experiment Manager

This project implements a comprehensive gaze tracking experiment system using WebGazer.js. It includes a TrialManager for executing visual experiments, collecting gaze data, and managing participant interactions.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Component Details](#component-details)
5. [Usage Guide](#usage-guide)
6. [File Structure](#file-structure)
7. [ANalysis Script](#analysis-script)
8. [How to Contribute](#how-to-contribute)
9. [License](#license)

## Overview

The Gaze Analysis Experiment Manager enables researchers to:

- Track participant gaze data using WebGazer.js
- Run configurable visual trials with randomized image objects
- Apply dynamic exclusions based on participant input
- Collect and store experimental data locally
- Support multiple test types (Shapes, Colors, Abstract, Pictures)

## Features

### Core Features

- **Dynamic Test Configuration:**
  - Participant initials collection
  - Test type selection (Shapes/Colors/Abstract/Pictures)
  - Configurable trial count (10-50 trials)

- **Calibration System:**
  - Interactive calibration points
  - Visual feedback during calibration
  - Webcam-based gaze tracking setup

- **Trial Management:**
  - Two trial types:
    - Type 1: Single repeated object trials
    - Type 2: Varied object trials
  - Randomized object presentation
  - Configurable display durations
  - Black screen transitions

- **Data Collection:**
  - Real-time gaze tracking
  - Trial metadata recording
  - Automatic data export to JSON
  - Local storage using localforage

### Technical Features

- WebGazer.js integration for eye tracking
- Secure HTTPS server support
- Browser compatibility (Chrome/Firefox/Edge)
- Modular JavaScript architecture

## Installation

### Prerequisites

1. Install Node.js and npm
2. Install required global packages:

```bash
npm install -g http-server
```

### Setup Steps

1. Clone the repository:

```bash
git clone https://github.com/mrhunsaker/GazeTracking.git
cd GazeTracking
```

2. Set up SSL certificates:

- Place `cert.pem` and `key.pem` in the StudentFolders directory

3. Install dependencies:

```bash
npm install
```

4. Start the experiment server:

```bash
bash runexperiment.sh
```

## Component Details

### index.html

The main experiment interface that:

- Loads required scripts (WebGazer, localforage)
- Provides experiment instructions
- Handles video feed display
- Manages experiment container styling

### trialManager.js

Core experiment logic including:

- Trial execution and sequencing
- Gaze data collection
- Calibration procedures
- Image loading and display
- Data storage and export

### runexperiment.sh

Experiment launcher script featuring:

- Secure HTTPS server setup
- Student folder management
- Browser autolaunch
- Dependency validation
- Colorblind-friendly terminal output

## Usage Guide

1. Launch the experiment:

```bash
bash runexperiment.sh
```

2. Select student folder when prompted

3. Wait for browser launch with experiment interface

4. Follow on-screen instructions for:
   - Entering participant details
   - Completing calibration
   - Running trials

5. Data will automatically download after completion

## File Structure

```
GazeTracking/
├── StudentFolders/
│   ├── cert.pem
│   ├── key.pem
│   └── [Student_Folder]/
│       ├── Abstract/
│       ├── Colors/
│       ├── Pictures/
│       ├── Shapes/
│       ├── index.html
│       ├── trialManager.js
│       ├── objectExclusions.js
│       └── webgazer.js
├── scripts/
│   ├── runexperiment.bat
│   └── runexperiment.ps1
└── runexperiment.sh
```

## Analysis Script

This project contains tools and scripts designed for generating detailed visualizations and statistical summaries of the GazeTracking data collected by this app.

- **Description:** A Python script that processes data (e.g., JSON inputs), performs statistical analysis, and generates Markdown reports with visualizations.
- **Features:**
  - Generates scatter plots and violin plots to visualize data trends.
  - Performs statistical tests including Wilcoxon, T-tests, and ANOVA.
  - Creates descriptive statistical summaries.
  - Outputs a Markdown report summarizing results with inline images of the generated plots.
- **Usage:**
  1. Prepare a JSON file with the required format (e.g., trial data).
  2. Run the script with:

```bash
    python AnalysisPlotting.py <path_to_json>
```

  3. Check the `./experimentalData/<filename>` directory for the generated report and plots.

---

## How to Contribute

We welcome contributions to improve the Gaze Analysis Experiment Manager! Here's how you can help:

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

- **Core Features**
  - New trial types
  - Additional analysis tools
  - Enhanced calibration methods

- **Documentation**
  - Usage examples
  - API documentation
  - Tutorial content

- **Testing**
  - Unit tests
  - Integration tests
  - Browser compatibility testing

### Getting Started

1. Check existing issues
2. Discuss major changes first
3. Follow the coding style guide
4. Include tests with new features
5. Update documentation

For questions or help, open an issue or contact the maintainers.

## License

Copyright 2024-11-30 Michael Ryan Hunsaker, M.Ed., Ph.D.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
