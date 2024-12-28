# Experiment Manager

This project comprises a **TrialManager** and supporting logic to manage and execute experiments utilizing visual
stimuli, gaze tracking, and interactive user inputs. The experiments can be configured by the participant at runtime,
involving calibration steps, image displays, and gaze data collection.

## Table of Contents

1. [Overview]()
2. [Features]()
3. [Installation]()
4. [How to Use]()
5. [File Structure]()
6. [API Reference]()
7. [Contributions]()
8. [License]()

## Overview

The **Experiment Manager** enables researchers to:

- Collect gaze tracking data using **WebGazer**.
- Execute pre-defined visual trials using randomized image objects.
- Dynamically control and apply exclusions for experiments based on participant input.
- Store experiment data locally and allow JSON file downloads for analysis.

The core of the setup is the `TrialManager` class, which handles trial logic, gaze data collection, calibration, and
user interaction setup.

## Features

- **Dynamic Test Initialization:**
    - Participants provide initials, test type, and trial count using a graphical dialog.

- **Calibration Phase:**
    - Interactive calibration points are displayed, allowing participants to calibrate gaze tracking.

- **Trial Execution:**
    - Options to run simple trials (repeat objects) or varied trials (randomized selections).
    - Each trial sequence includes displays of specific objects and pauses (e.g., `showBlackScreen()` transitions).

- **Object Exclusions:**
    - Pre-defined exclusions are dynamically imported and applied per test type.

- **Gaze Data Collection:**
    - Tracks gaze positions and stores them with trial metadata.

- **Result Storage:**
    - Saves experimental data locally (via `localforage`).
    - Automatically downloads a JSON file containing trial information and gaze data.

- **Multiple Test Types (e.g., Shapes, Colors):**
    - Pre-configured test image categories (expandable by adding exclusions).

## Installation

### Prerequisites

- Ensure **Node.js** and `npm` are installed.
- A modern browser with camera support is required for gaze tracking (e.g., Chrome, Edge).
- Ensure **WebGazer** script is loaded:

---

- **Error: Certificate files not found**:
    - Ensure `cert.pem` and `key.pem` are in the base directory.

- **Error: Chromium/Chrome not installed**:
    - Install Chrome or Chromium from your system's package manager or [Google's website]().

## License

This project is licensed under the **Apache License 2.0**. See the `LICENSE` file for details.
For additional information or inquiries, contact **Michael Ryan Hunsaker, M.Ed., Ph.D.**

---

# Gaze Analysis Experiment Launcher

This project provides a **bash script** for securely serving web-based experiment templates for gaze analysis. The
script ensures ease of deployment, verifies dependencies, and allows quick access to experiment pages using **Chromium**
or **Google Chrome**.

## Features

- **Menu for Student Selection**:
    - Dynamically lists available student directories for easy navigation.

- **Secure Server Configuration**:
    - Automates launching an HTTPS server using `http-server` (Node.js tool).

- **Browser Integration**:
    - Automatically opens the experiment page in **Chromium** or **Google Chrome**.

- **Dependency Validation**:
    - Verifies required programs (`http-server`, `Chromium/Chrome`) and certificates (`cert.pem`, `key.pem`).

- **Error Handling**:
    - Catches common errors such as missing directories, certificates, or required programs.

- **Color-Friendly Terminal Output**:
    - Uses ANSI colors with a palette that works well for most users, including those with color vision deficiencies.

## Requirements

### Prerequisites

- **Node.js** (to install `http-server`)
- **Chromium/Google Chrome** installed
- **Certificates**:
    - `cert.pem` – SSL certificate
    - `key.pem` – Private key for SSL

- **Student Folders**: Each student should have a dedicated folder containing an `index.html` file.

### Required Programs

The script will check for the following:

1. **http-server** (install globally using `npm`):

---

## Contributors

We welcome contributions from the community to help improve and enhance this project! Whether you're reporting a bug,
suggesting a new feature, submitting a pull request, or updating documentation, your insights and expertise are greatly
appreciated.

### How to Contribute

1. **Fork the Repository**:

- Create a fork of this repository and work freely on your own branch.

2. **Open Issues**:

- If you encounter bugs or have feature ideas, open an issue to discuss them with the community.

3. **Submit Pull Requests**:

- Send a pull request (PR) with a detailed description of your changes.
- Ensure your code is clean, well-documented, and follows the existing code standards of the project.

4. **Participate in Discussions**:

- Share your knowledge and opinions to help improve the project.

### Code of Conduct

To maintain a welcoming and productive environment, we ask that all contributors adhere to the following norms of
behavior:

- Be **respectful** and **inclusive** towards others.
- Avoid offensive, rude, or disruptive language.
- Provide constructive feedback and welcome feedback on your own work.
- Be patient and understanding, especially with newcomers or when addressing misunderstandings.
- Follow the existing **coding guidelines** and commit message conventions to ensure consistency and readability.

### How to Acknowledge Contributions

When submitting a contribution, add your name to the **Contributors** section of the `README.md` (if applicable) or
ensure it is acknowledged in the change logs.
We are grateful for your time and effort in helping this project grow. Your contributions make a difference—thank you
for being part of our community! ❤️
If you have any questions or need help getting started, please feel free to reach out via the [issues section]().
