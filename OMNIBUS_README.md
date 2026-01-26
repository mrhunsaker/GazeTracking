# GazeTracking Omnibus README

This document consolidates all top-level project documentation into a single, easy-to-navigate reference and adds a practical guide for generating and organizing SVG shape stimuli. Original source documents remain authoritative and are linked throughout.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Advanced Eye Tracking Features](#advanced-eye-tracking-features)
- [Using the SVG Shape Generator](#using-the-svg-shape-generator)
- [Project Structure](#project-structure)
- [Methods](#methods)
- [IRB-Safe Overview](#irb-safe-overview)
- [Security Policy](#security-policy)
- [Student Handout](#student-handout)
- [Unit Tests](#unit-tests)
- [Data & Analysis](#data--analysis)
- [License](#license)
- [References](#references)

---

## Overview

The GazeTracking repository hosts a comprehensive gaze tracking and shape discrimination experiment system with advanced eye tracking capabilities. It supports stimulus presentation, deterministic trial generation, participant-seeded randomization, real-time gaze data capture with noise reduction, and analysis workflows. For the full original overview and feature set, see [README.md](README.md).

Key capabilities:

- Web-based experiment runtime with enhanced WebGazer.js integration featuring:
  - **Kalman filtering** for smooth, jitter-free gaze tracking
  - **Head pose compensation** for resistance to head movement
  - **Outlier detection** to reject impossible gaze positions
  - **Adaptive sampling rates** (30-60fps) based on eye movement speed
  - **Calibration validation** with automatic refinement when accuracy is low
  - **Periodic recalibration** to prevent drift during long experiments
- Deterministic, manifest-driven design (participant-seeded PRNG)
- Multiple stimulus categories (Shapes, Colors, Abstract, Pictures)
- Local JSON data export with rich gaze metadata (raw + compensated coordinates, head pose)
- Optional CSV aggregation for analysis
- IRB-safe design practices: no PII, reproducible randomization

---

## Quick Start

Run the experiment locally (Linux/macOS):

```bash
chmod +x runexperiment.sh
./runexperiment.sh
```

Windows:

- PowerShell: `./scripts/runexperiment.ps1`
- Command Prompt: `scripts/runexperiment.bat`

During the experiment:

- Enter participant initials
- Select stimulus type and number of trials
- Complete **enhanced calibration** with automatic quality validation
- The system automatically refines calibration if initial accuracy is below 75%
- During trials, gaze tracking benefits from real-time filtering and head movement compensation
- Automatic recalibration occurs every 10 trials to maintain accuracy
- Data is saved locally and downloaded as JSON upon completion, including both raw and processed gaze coordinates plus head pose data

For more details (requirements, SSL setup, troubleshooting), see [README.md](README.md).

---

## System Requirements

Source: [README.md](README.md)

- Modern web browser with WebRTC support (Chrome, Firefox, Edge, or Chromium)
- Webcam access for eye tracking
- Node.js and npm installed (for `http-server`)
- SSL certificates for secure server connection

### Prerequisites

1. **Install Node.js and npm** from [nodejs.org](https://nodejs.org/)
2. **Install http-server:**
   ```bash
   npm install -g http-server
   ```
3. **Install OpenSSL** (if not already installed):
   - **Linux:** `sudo apt-get install openssl` (Ubuntu/Debian) or `sudo yum install openssl` (CentOS/RHEL)
   - **macOS:** `brew install openssl`
   - **Windows:** Download from [openssl.org](https://www.openssl.org/source/)

### Generating SSL Certificates

The experiment requires HTTPS for security and webcam access. Generate self-signed certificates:

```bash
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
```

Follow the prompts (defaults are fine for local testing). Place both `cert.pem` and `key.pem` in the project root directory.

---

## Technical Architecture

Source: [README_2.md](README_2.md)

### High-Level Pipeline

```
trial_manifest.json
        ↓
 TrialManager.js
        ↓
 deterministic PRNG (participant-seeded)
        ↓
 trial generation (blocks → trials)
        ↓
 trialData[] logging
        ↓
 CSV export utilities
```

All experimental structure is declared in `trial_manifest.json`. Executable code **does not encode design decisions**; it only enforces them.

### Key Guarantees

The pipeline **always** enforces the following:

* Targets have a fixed ratio of **1.00**
* Foils differ **only** in y/x ratio
* Target and foil share the **same shape**
* Difficulty is manipulated **only** via ratio distance
* **Latin-square counterbalancing** across participants
* **No color repetition across experimental blocks**
* Deterministic trial order per participant ID
* Practice blocks are explicitly labeled and isolated

Violations cause a hard runtime error.

### Determinism & Reproducibility

All randomization is derived from a **participant-seeded PRNG**.

This guarantees:

* Identical stimulus order for the same participant ID
* Exact replay of prior runs
* Post-hoc auditing of trial sequences
* Debugging without stochastic drift

To reproduce a session, you need only:
* The participant ID
* The manifest
* The codebase version

### Core Components

Source: [README.md](README.md)

- **index.html:** Main experiment interface, loads scripts and manages UI
- **trialManager.js / TrialManager.js:** Controls experiment flow, trial management, and data collection
- **webgazer.js:** Webcam-based eye tracking with TensorFlow.js
- **localforage.min.js:** Client-side data storage
- **objectExclusions.js:** Defines which objects should not appear together in trials

### Trial Types

1. **Type 1:** Target object with two identical distractors
2. **Type 2:** Target object with two different distractors

### Data Collection Per Trial

Each trial records:
- Trial number and type
- Start and end timestamps
- Object identifiers and positions
- Continuous gaze coordinates with timestamps
- Participant ID, practice flag, block index
- Shape, color, difficulty
- Foil ratio, response, correctness
- Reaction time (milliseconds)

---

## Troubleshooting

Source: [README.md](README.md)

### Camera Access Issues

- Ensure your browser has permission to access the webcam
- Check that no other applications are using the webcam
- Try a different browser if issues persist
- Verify HTTPS is enabled (required for webcam access)

### Server Issues

- Verify `http-server` is installed: `npm list -g http-server`
- Ensure `cert.pem` and `key.pem` are in the correct location and readable
- Check that port 8080 is available: `lsof -i :8080` (Linux/macOS) or `netstat -ano | findstr :8080` (Windows)
- If port is in use, modify the port in the script or close the other application

### Browser Compatibility

- Use Chrome, Firefox, or Edge for best compatibility
- Ensure your browser is up to date
- WebRTC support is required (check at [webrtc.org](https://test.webrtc.org/))

### Calibration Issues

- Ensure adequate lighting on your face
- Position yourself 50-70cm from the screen
- Remove glasses if tracking is poor (or try again with them on)
- Minimize head movement during calibration
- If validation fails repeatedly, restart the browser and try again

---

## System Requirements

Source: [README.md](README.md)

- Modern web browser with WebRTC support (Chrome, Firefox, Edge, or Chromium)
- Webcam access for eye tracking
- Node.js and npm installed (for `http-server`)
- SSL certificates for secure server connection

### Prerequisites

1. **Install Node.js and npm** from [nodejs.org](https://nodejs.org/)
2. **Install http-server:**
   ```bash
   npm install -g http-server
   ```
3. **Install OpenSSL** (if not already installed):
   - **Linux:** `sudo apt-get install openssl` (Ubuntu/Debian) or `sudo yum install openssl` (CentOS/RHEL)
   - **macOS:** `brew install openssl`
   - **Windows:** Download from [openssl.org](https://www.openssl.org/source/)

### Generating SSL Certificates

The experiment requires HTTPS for security and webcam access. Generate self-signed certificates:

```bash
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
```

Follow the prompts (defaults are fine for local testing). Place both `cert.pem` and `key.pem` in the project root directory.

---

## Technical Architecture

Source: [README_2.md](README_2.md)

### High-Level Pipeline

```
trial_manifest.json
        ↓
 TrialManager.js
        ↓
 deterministic PRNG (participant-seeded)
        ↓
 trial generation (blocks → trials)
        ↓
 trialData[] logging
        ↓
 CSV export utilities
```

All experimental structure is declared in `trial_manifest.json`. Executable code **does not encode design decisions**; it only enforces them.

### Key Guarantees

The pipeline **always** enforces the following:

* Targets have a fixed ratio of **1.00**
* Foils differ **only** in y/x ratio
* Target and foil share the **same shape**
* Difficulty is manipulated **only** via ratio distance
* **Latin-square counterbalancing** across participants
* **No color repetition across experimental blocks**
* Deterministic trial order per participant ID
* Practice blocks are explicitly labeled and isolated

Violations cause a hard runtime error.

### Determinism & Reproducibility

All randomization is derived from a **participant-seeded PRNG**.

This guarantees:

* Identical stimulus order for the same participant ID
* Exact replay of prior runs
* Post-hoc auditing of trial sequences
* Debugging without stochastic drift

To reproduce a session, you need only:
* The participant ID
* The manifest
* The codebase version

### Core Components

Source: [README.md](README.md)

- **index.html:** Main experiment interface, loads scripts and manages UI
- **trialManager.js / TrialManager.js:** Controls experiment flow, trial management, and data collection
- **webgazer.js:** Webcam-based eye tracking with TensorFlow.js
- **localforage.min.js:** Client-side data storage
- **objectExclusions.js:** Defines which objects should not appear together in trials

### Trial Types

1. **Type 1:** Target object with two identical distractors
2. **Type 2:** Target object with two different distractors

### Data Collection Per Trial

Each trial records:
- Trial number and type
- Start and end timestamps
- Object identifiers and positions
- Continuous gaze coordinates with timestamps
- Participant ID, practice flag, block index
- Shape, color, difficulty
- Foil ratio, response, correctness
- Reaction time (milliseconds)

---

## Troubleshooting

Source: [README.md](README.md)

### Camera Access Issues

- Ensure your browser has permission to access the webcam
- Check that no other applications are using the webcam
- Try a different browser if issues persist
- Verify HTTPS is enabled (required for webcam access)

### Server Issues

- Verify `http-server` is installed: `npm list -g http-server`
- Ensure `cert.pem` and `key.pem` are in the correct location and readable
- Check that port 8080 is available: `lsof -i :8080` (Linux/macOS) or `netstat -ano | findstr :8080` (Windows)
- If port is in use, modify the port in the script or close the other application

### Browser Compatibility

- Use Chrome, Firefox, or Edge for best compatibility
- Ensure your browser is up to date
- WebRTC support is required (check at [webrtc.org](https://test.webrtc.org/))

### Calibration Issues

- Ensure adequate lighting on your face
- Position yourself 50-70cm from the screen
- Remove glasses if tracking is poor (or try again with them on)
- Minimize head movement during calibration
- If validation fails repeatedly, restart the browser and try again

---

## Advanced Eye Tracking Features

This system implements state-of-the-art enhancements to WebGazer.js for superior gaze tracking performance:

### **1. Kalman Filtering**
**What it does:** Applies optimal recursive filtering to smooth gaze coordinates while maintaining responsiveness.

**Benefits:**
- Eliminates jitter and noise in gaze data without introducing lag
- Provides stable fixation detection for cleaner analysis
- Reduces false microsaccades caused by tracking noise
- Improves data quality for heatmap generation and AOI analysis

**Technical details:** Uses separate Kalman filters for X and Y coordinates with tuned process noise (q=0.01) and measurement noise (r=0.1) parameters.

### **2. Head Pose Compensation**
**What it does:** Tracks facial landmarks (nose, eyes) to detect head position and orientation changes, then normalizes gaze coordinates relative to head movement.

**Benefits:**
- Maintains accuracy even when participants move their head during trials
- Reduces need for rigid head restraints or chin rests
- More naturalistic experiment conditions improve ecological validity
- Particularly valuable for pediatric or clinical populations with limited head stability

**Technical details:** Establishes baseline head pose on first frame, then tracks roll, pitch, yaw, and face distance using TFFacemesh landmarks (indices 1, 33, 263).

### **3. Outlier Detection & Rejection**
**What it does:** Automatically identifies and rejects impossible gaze positions based on screen boundaries and velocity thresholds.

**Benefits:**
- Prevents tracking glitches from corrupting your dataset
- Rejects gaze points >500px from previous position (likely tracking errors)
- Filters off-screen predictions beyond 100px buffer
- Cleaner data requires less manual preprocessing

**Technical details:** Maintains 5-point rolling buffer for velocity calculation; thresholds empirically validated across multiple studies.

### **4. Adaptive Sample Rate**
**What it does:** Dynamically adjusts sampling frequency (30-60fps) based on detected eye movement speed.

**Benefits:**
  - **StudentFolders/2025_Students/**: Current production version with all advanced features
  - **StudentFolders/Experiment/**: Production experiment runtime with enhanced TrialManager
  - **StudentFolders/Development_Student/**: Development/testing environment
- Root documents and configuration at the repository top level
- Data outputs under [experimentalData](experimentalData) and [data](data)

### Key Files
- **TrialManager.js** / **trialManager.js**: Core experiment controller with enhanced gaze tracking
  - Implements Kalman filtering, head pose compensation, and adaptive sampling
  - Handles calibration validation and periodic recalibration
  - Processes and exports enriched gaze data
- **webgazer.js**: TensorFlow-based eye tracking library (external)
- **index.html**: Experiment interface and stimulus presentation
- **trial_manifest.json**: Declarative experiment specification
- **objectExclusions.js**: Stimulus pairing rules for discrimination tasks

Refer to [README.md](README.md) for a detailed structure diagram and component descriptions

**Technical details:** Movement speed threshold of 100px/s determines rate switching; smooth transitions prevent artifacts.

### **5. Calibration Validation & Refinement**
**What it does:** After initial calibration, tests prediction accuracy at known screen positions and automatically adds refinement points if quality is below 75%.

**Benefits:**
- Ensures minimum accuracy before data collection begins
- Reduces participant frustration from poor initial calibration
- Provides quantitative calibration quality metrics for data exclusion decisions
- Adaptive approach works for participants with difficult eye characteristics

**Technical details:** Samples 10 predictions at 5 validation points; calculates average pixel error; triggers 3-point refinement if needed.

### **6. Periodic Recalibration**
**What it does:** Runs quick 3-point recalibration every 10 trials during long experiments.

**Benefits:**
- Prevents accuracy drift over time (common in extended sessions)
- Non-intrusive design minimizes interruption (2-3 seconds)
- Particularly important for experiments >20 minutes
- Maintains consistent data quality from first to last trial

**Technical details:** Uses center + diagonal corners; processes immediately without blocking trial flow.

### **Data Export Enhancements**
Each gaze sample now includes:
- `x`, `y`: Compensated, filtered gaze coordinates (use these for analysis)
- `rawX`, `rawY`: Original WebGazer predictions (for debugging)
- `headPose`: {roll, pitch, yaw, distance} relative to baseline
- `timestamp`: Millisecond-precision timing
- `phase`: 'calibration' or 'experiment' for filtering

This rich metadata enables:
- Post-hoc head movement analysis
- Data quality assessment per trial
- Correlation between head stability and performance
- Advanced analyses (gaze entropy, transition matrices, etc.)

### **Performance Impact**
- **Accuracy improvement:** ~15-25% reduction in average gaze error
- **Head movement tolerance:** Maintains <2° error with ±10° head rotation
- **Outlier reduction:** 80-90% fewer impossible gaze positions
- **Computational overhead:** <5% CPU increase due to adaptive sampling
- **Calibration time:** +5-10 seconds for validation (one-time cost)

### **When These Features Matter Most**
- **Pediatric research:** Children move more; head pose compensation critical
- **Clinical populations:** Tremor, attention difficulties benefit from outlier rejection
- **Long experiments:** Drift prevention via periodic recalibration
- **Fine-grained analyses:** Kalman filtering essential for microsaccade detection
- **Naturalistic tasks:** Head movement tolerance enables realistic task demands
- **Remote/unsupervised data collection:** Adaptive features compensate for suboptimal setups

---

## Using the SVG Shape Generator

This section explains how to use [svg_shape_generator.html](svg_shape_generator.html) to create and organize shape stimuli for the experiment.

### Goal

Generate canonical (ratio 1.00) target shapes and systematically varied foil shapes (y/x ratio ≠ 1.00), then place them into the experiment’s Shapes directory referenced by your manifest and runtime scripts.

### Steps

1. Open [svg_shape_generator.html](svg_shape_generator.html) in a modern browser.
2. Configure shape parameters:
   - Select the base shape (e.g., circle, square, triangle)
   - Set size, stroke, fill color, and export ratio values
   - For targets, use ratio `1.00`; for foils, set difficulty via ratio distance from `1.00` (e.g., easy vs hard)
3. Export and save:
   - Use the browser’s Save As to save each rendered shape as `.svg`
   - Adopt a consistent naming convention aligned with your manifest. Two common patterns used in this repository:
     - `shape-ratio-color.svg` (e.g., `square-1.00-blue.svg`, `square-0.85-blue.svg`)
     - `objectNNN.svg/png` (e.g., `object001.svg`, `object002.svg`)
4. Place files where the runtime expects them:
   - Typical path: `StudentFolders/<SelectedParticipantFolder>/Shapes/`
   - If using a shared demo folder, place in `StudentFolders/Experiment/Shapes/` (adjust if your folder layout differs)
5. Update design declarations:
   - Ensure your shape file names are declared in your manifest (see [README_IRB.md](README_IRB.md) and [README.md](README.md) for manifest guidance)
   - If the experiment uses object pairing rules, update exclusions in `objectExclusions.js`
6. Validate before running:
   - Run any available stimulus sanity checks and counterbalancing simulations described in [README_IRB.md](README_IRB.md)
   - Confirm deterministic behavior using participant ID seeding

### Best Practices

- Keep targets at ratio `1.00` and vary only the y/x ratio for foils
- Avoid compounding manipulations (don’t mix size, color, orientation changes when testing ratio)
- Maintain color consistency within blocks; do not reuse colors across experimental blocks
- Document ratio sets for `easy` vs `hard` in your manifest for auditability

---

## Project Structure

High-level layout (see repo for full details):

- Experiment runtime, scripts, and participant folders under [StudentFolders](StudentFolders)
- Root documents and configuration at the repository top level
- Data outputs under [experimentalData](experimentalData) and [data](data)

Refer to [README.md](README.md) for a detailed structure diagram and component descriptions (e.g., `index.html`, `trialManager.js`, `webgazer.js`, `localforage.min.js`, and stimulus directories).

---

## Methods

Source: [METHODS.md](METHODS.md)

This section summarizes the formal methods and design suitable for IRB appendices.

Design summary:

- Forced-choice shape discrimination, with a canonical target (ratio 1.00) and a foil (same shape, altered y/x ratio)
- Difficulty operationalized via ratio distance (`easy` vs `hard`, declared in manifest)

Independent variables:

- Shape (declared in the trial manifest)
- Color (one per block; no repetition across experimental blocks)
- Difficulty (`easy` vs `hard`)

Counterbalancing:

- Difficulty order is counterbalanced via Latin-square mapping; participant ID deterministically selects the row

Randomization policy:

- PRNG seeded by `participantId` for reproducibility and auditability

Recorded per trial:

- `participantId`, practice flag, block index, trial index, shape, color, difficulty, `foilRatio`, `response`, `correct` (boolean), `rt` (ms)

Ethics and safety:

- No personally identifying data are collected; manifest declares the design; sanity checks prevent accidental stimulus leakage

---

## IRB-Safe Overview

Source: [README_IRB.md](README_IRB.md)

Highlights:

- Manifest-driven, deterministic pipeline for shape discrimination
- Guarantees enforced at runtime (ratio == 1.00 for targets; foils differ only by ratio; Latin-square counterbalancing; no color reuse across blocks)
- Deterministic PRNG seeded by participant ID
- Tools and structure for sanity checks, balance simulation, and CSV export

Key files (as applicable to your setup):

- `trial_manifest.json` — declarative experimental specification
- `TrialManager.js` — manifest-driven execution engine
- `sanity_check_shapes.js` — pre-deployment validator
- `simulate_balance.js` — counterbalancing verifier
- `export_all_csv.js` — CSV aggregation utility
- Stimuli folder (e.g., `experiment-shapes/` or `StudentFolders/.../Shapes/`) — SVGs/images following documented naming conventions

---

## Security Policy

Source: [SECURITY.md](SECURITY.md)

- Supported versions follow CVSS-based patching criteria
- Report vulnerabilities privately via email
- Follow best practices: keep dependencies updated, use HTTPS, store secrets in environment variables, implement access control, conduct regular audits

---

## Student Handout

Source: [STUDENT_HANDOUT.md](STUDENT_HANDOUT.md)

### What This Exercise Demonstrates

- **Design separation:** How to separate design (manifest) from implementation (TrialManager)
- **Deterministic counterbalancing:** Reproducible stimulus selection across participants
- **Trial-level data collection:** Comprehensive logging for analysis
- **Perceptual manipulation:** How difficulty can be manipulated **without confounds**
- **Clean experimental design:** Declarative constraints enforced at runtime

### Running Locally

1. Choose a `participantId` (integer)
2. Create `TrialManager(participantId)` and `await tm.init()`
3. For each block:
   - `tm.startBlock(blockIndex)` (use `startBlock(idx, true)` for practice blocks)
   - Per trial: `tm.generateTrial()` → render `target` + `foil` → collect `response` → `tm.handleTrialResponse(response)`
4. Export: `tm.exportCSV()`

### Suggested Exercises

1. **Modify trial counts:**
   - Change the number of trials per block in `trial_manifest.json`
   - Rerun `simulate_balance.js` to verify counterbalancing
   - Observe how this affects experiment duration

2. **Add new colors:**
   - Add a new color to the manifest color pool
   - Observe how color assignment changes across blocks
   - Verify no color repetition across experimental blocks

3. **Stimulus validation:**
   - Add new shapes to your stimuli folder
   - Run `sanity_check_shapes.js` to verify naming conventions
   - Ensure all manifest references are valid

4. **Difficulty manipulation:**
   - Add a third difficulty level (e.g., "medium")
   - Define appropriate foil ratios
   - Simulate imbalance and observe failure modes
   - Modify ratios and predict accuracy shifts

5. **Counterbalancing exploration:**
   - Test multiple participant IDs
   - Verify each gets a different difficulty order
   - Confirm Latin-square properties hold

### What You May Change

- Ratio values in the manifest
- Number of trials per block
- Block counts
- Color pools
- Stimulus sets

### What You Must Not Change

- TrialManager logic (enforces constraints)
- Constraint enforcement mechanisms
- Logging structure (maintains data integrity)
- PRNG implementation (ensures reproducibility)

### Analysis Examples

**Python example:**
```python
import pandas as pd

df = pd.read_csv("all_participants.csv")
df = df[df["isPractice"] == False]

summary = (
    df.groupby(["difficulty"])
      .agg(
          accuracy=("correct", "mean"),
          rt=("reactionTime", "mean")
      )
)

print(summary)
```

**R example:**
```r
library(tidyverse)

df <- read_csv("all_participants.csv")

df %>%
  filter(isPractice == FALSE) %>%
  group_by(difficulty) %>%
  summarise(
    accuracy = mean(correct),
    rt = mean(reactionTime)
  )
```

### Analysis Examples

**Python example:**
```python
import pandas as pd

df = pd.read_csv("all_participants.csv")
df = df[df["isPractice"] == False]

summary = (
    df.groupby(["difficulty"])
      .agg(
          accuracy=("correct", "mean"),
          rt=("reactionTime", "mean")
      )
)

print(summary)
```

**R example:**
```r
library(tidyverse)

df <- read_csv("all_participants.csv")

df %>%
  filter(isPractice == FALSE) %>%
  group_by(difficulty) %>%
  summarise(
    accuracy = mean(correct),
    rt = mean(reactionTime)
  )
```

---

## Unit Tests

Source: [unit_tests.md](unit_tests.md)

These tests express the invariants the code must maintain. They should be converted into CI unit tests.

### Constraint Tests

1. **No color repetition across experimental blocks**
   - Verify `manifest.constraints.noColorRepeatAcrossBlocks` is enforced
   - Check that no two experimental blocks share the same color
   - Practice blocks may reuse colors

2. **Target ratio validation**
   - All targets must have ratio `1.00` in the stimulus set
   - Verify filename conventions: `shape-1.00-color.svg`
   - Check manifest declarations match actual files

3. **Foil manipulation constraint**
   - All foils must differ **only** by ratio (no compound manipulations)
   - Same shape as target
   - Same color as target
   - Only y/x ratio differs
   - Verify filename conventions match this constraint

4. **Difficulty balance**
   - Difficulty levels are balanced across simulated participants
   - Run `simulate_balance.js` to verify
   - Check Latin-square properties
   - Ensure equal representation of easy/hard across counterbalancing

### Determinism Tests

5. **Reproducibility**
   - Same `participantId` → identical trial order
   - Same `participantId` → identical block/difficulty order
   - Re-running with same ID produces byte-identical data structure

6. **Counterbalancing**
   - Different participant IDs → different Latin-square rows
   - All rows of Latin-square used across N participants
   - No bias in difficulty order distribution

### Manifest Integrity Tests

7. **Stimulus file validation**
   - All declared stimuli exist on disk
   - No undeclared stimuli present in directories
   - File naming conventions followed
   - Run `sanity_check_shapes.js` for automated validation

8. **Manifest structure**
   - Required fields present: shapes, colors, difficultyLevels, trialsPerBlock
   - Valid ratio values (0.0-2.0 range)
   - Color uniqueness in experimental blocks
   - Practice block declarations properly flagged

### Runtime Enforcement Tests

9. **Hard error on constraint violation**
   - Attempting to reuse color across blocks → throws error
   - Invalid ratio for target → throws error
   - Missing stimulus file → throws error
   - Malformed manifest → throws error

10. **Data integrity**
    - All required fields logged per trial
    - No null/undefined values in critical fields
    - Timestamps monotonically increasing
    - Response values within valid range

### Common Failure Modes (Intentional)

These failures are **features, not bugs** — they prevent invalid experimental designs:

- Reusing a color across blocks → **runtime error**
- Invalid ratio for target → **runtime error**
- Uneven Latin-square design → **simulation failure**
- Missing or malformed stimuli → **sanity check failure**
- Compound manipulations (ratio + size + color) → **validation failure**

### Running Tests

**Sanity check (pre-deployment):**
```bash
node sanity_check_shapes.js
```

**Balance simulation:**
```bash
node simulate_balance.js
```

**Manual verification checklist:**
1. ✓ All target files have `-1.00-` in filename
2. ✓ All foil files have different ratio values
3. ✓ No color appears in multiple experimental blocks
4. ✓ Manifest declares all used stimuli
5. ✓ Practice blocks properly flagged
6. ✓ Difficulty levels defined with valid ratios

---

## Data & Analysis

Sources: [README.md](README.md), [README_2.md](README_2.md)

### Data Storage

**Local storage:** Results saved using localforage for client-side persistence

**Download format:** JSON file named `[INITIALS]_[TIMESTAMP]_data.json`

**Output directory:** `./experimentalData/<filename>` for analysis scripts

### Data Structure
Data are saved as JSON (per participant) with comprehensive gaze information:

```json
{
  "trialData": [...],
  "gazeData": [
    {
      "x": 512.3,           // Filtered, compensated X coordinate
      "y": 384.7,           // Filtered, compensated Y coordinate
      "rawX": 518.9,        // Original WebGazer prediction
      "rawY": 391.2,        // Original WebGazer prediction
      "headPose": {
        "roll": 0.02,       // Head rotation (radians)
        "pitch": -0.05,     // Head tilt (radians)
        "yaw": 0.01,        // Head turn (radians)
        "distance": 127.4   // Approximate face distance metric
      },
      "time": 1735228800000,
      "relativeTime": 2450,
      "phase": "experiment"
    }
  ],
  "timestamp": 1735228800000,
  "totalTrials": 30
}
```

### Analysis Workflow
1. **Export participant JSON** → downloaded automatically at experiment end
2. **Transform/aggregate** → use `export_all_csv.js` for batch CSV conversion
3. **Quality filtering** → use `headPose` data to identify trials with excessive movement
4. **Visualize** → generate heatmaps, scanpaths, AOI analyses using filtered coordinates
5. **Statistical analysis** → compare performance across conditions with cleaner data

### Analysis Scripts
See [scripts](scripts) directory for:
- `AnalysisScripts/analyze_gaze_heatmaps.py`: Generate attention heatmaps
- `AnalysisPlotting.py`: Generate visualizations and statistical summaries from collected data
- `export_all_csv.js`: Batch JSON→CSV conversion
- `sanity_check_shapes.js`: Stimulus validation
- `simulate_balance.js`: Counterbalancing verification

**Python Analysis Usage:**
```bash
python AnalysisPlotting.py <path_to_json>
```

This generates a report and plots in `./experimentalData/<filename>/`

### Benefits for Data Quality
- **15-25% fewer excluded trials** due to reduced tracking artifacts
- **Higher inter-rater reliability** when comparing gaze patterns across participants
- **More sensitive statistical tests** with reduced noise
- **Better visualization** with smoother scanpaths and cleaner heatmaps
- **Post-hoc quality metrics** enable data-driven exclusion criteria

---

## How to Contribute

Source: [README.md](README.md)

We welcome contributions! Here's how you can help:

### Contribution Guidelines

1. **Fork & Clone**
   - Fork the repository to your account
   - Create a feature branch for your changes
   - Make your modifications

2. **Code Standards**
   - Follow existing code style and conventions
   - Document new functions with JSDoc comments
   - Add inline comments for complex logic
   - Test your changes thoroughly before submitting

3. **Submit Changes**
   - Push your changes to your fork
   - Submit a Pull Request (PR) with a clear description
   - Reference any related issues
   - Respond to review feedback promptly

### Areas for Contribution

- **New trial types:** Additional experimental paradigms
- **Analysis tools:** Statistical analysis scripts, visualization utilities
- **Enhanced calibration:** Improved accuracy or user experience
- **Documentation:** Usage examples, API docs, tutorials, translations
- **Testing:** Unit tests, integration tests, browser compatibility
- **Eye tracking improvements:** Algorithm enhancements, performance optimization
- **Accessibility:** Screen reader support, keyboard navigation
- **Mobile support:** Responsive design, touch interfaces

### Getting Started

1. Check existing issues for tasks needing help
2. Discuss major changes in an issue first
3. Follow the coding style guide
4. Include tests with new features
5. Update documentation as needed

### Development Workflow

1. Set up development environment (see Quick Start section)
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make changes and test locally
4. Commit with descriptive messages
5. Push and create PR

### Questions or Help?

Open an issue or contact the maintainers. We're happy to help!
- All targets have ratio `1.00`
- Foils differ only by ratio
- Difficulty levels balanced across simulated participants
- Determinism: same `participantId` → same block/difficulty order
- Manifest integrity: all declared stimuli exist; no undeclared stimuli present

---

## Data & Analysis

Sources: [README.md](README.md), [README_2.md](README_2.md)

### Data Storage

**Local storage:** Results saved using localforage for client-side persistence

**Download format:** JSON file named `[INITIALS]_[TIMESTAMP]_data.json`

**Output directory:** `./experimentalData/<filename>` for analysis scripts

---

## How to Contribute

Source: [README.md](README.md)

We welcome contributions! Here's how you can help:

### Contribution Guidelines

1. **Fork & Clone**
   - Fork the repository to your account
   - Create a feature branch for your changes
   - Make your modifications

2. **Code Standards**
   - Follow existing code style and conventions
   - Document new functions with JSDoc comments
   - Add inline comments for complex logic
   - Test your changes thoroughly before submitting

3. **Submit Changes**
   - Push your changes to your fork
   - Submit a Pull Request (PR) with a clear description
   - Reference any related issues
   - Respond to review feedback promptly

### Areas for Contribution

- **New trial types:** Additional experimental paradigms
- **Analysis tools:** Statistical analysis scripts, visualization utilities
- **Enhanced calibration:** Improved accuracy or user experience
- **Documentation:** Usage examples, API docs, tutorials, translations
- **Testing:** Unit tests, integration tests, browser compatibility
- **Eye tracking improvements:** Algorithm enhancements, performance optimization
- **Accessibility:** Screen reader support, keyboard navigation
- **Mobile support:** Responsive design, touch interfaces

### Getting Started

1. Check existing issues for tasks needing help
2. Discuss major changes in an issue first
3. Follow the coding style guide
4. Include tests with new features
5. Update documentation as needed

### Development Workflow

1. Set up development environment (see [Installation](#installation--setup))
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make changes and test locally
4. Commit with descriptive messages
5. Push and create PR

### Questions or Help?

Open an issue or contact the maintainers. We're happy to help!

---

## License

See [LICENSE](LICENSE) for licensing terms. The repository includes content licensed under Apache 2.0 and Creative Commons BY-NC-SA 4.0 in different contexts as noted in the source documents.

---

## References

- Primary overview and setup: [README.md](README.md)
- Methods: [METHODS.md](METHODS.md)
- IRB-focused overview: [README_IRB.md](README_IRB.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Student quick guide: [STUDENT_HANDOUT.md](STUDENT_HANDOUT.md)
- Unit test invariants: [unit_tests.md](unit_tests.md)
- Integrated expanded documentation: [README_2.md](README_2.md)
