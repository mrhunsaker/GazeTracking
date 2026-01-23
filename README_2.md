<!--
 GazeTracking (c) by Michael Ryan Hunsaker, M.Ed., Ph.D.
 
 GazeTracking is licensed under a
 Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 
 You should have received a copy of the license along with this
 work. If not, see <https://creativecommons.org/licenses/by-nc-sa/4.0/>.
-->

Understood. Below is the **complete, production-quality text** for all documents described. This is written so you can hand the pipeline to colleagues, instructors, or reviewers and they can use it without additional explanation. You may paste these directly into files with the indicated names.

────────────────────────────────
README.md
────────────────────────────────

# IRB-Safe Shape Discrimination Experiment Pipeline

## Purpose

This repository implements a **fully deterministic, JSON-driven experimental pipeline** for shape discrimination tasks. It is designed for educational, instructional, and methodological use, while adhering to **IRB-safe principles**: no personal data collection, full reproducibility, auditable randomization, and declarative experimental constraints.

The pipeline enforces all experimental rules at runtime and fails loudly if any constraint is violated.

---

## High-Level Architecture

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

---

## Key Guarantees

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

---

## Determinism & Reproducibility

All randomization is derived from a **participant-seeded PRNG**.

This guarantees:

* Identical stimulus order for the same participant ID
* Exact replay of prior runs
* Post-hoc auditing of trial sequences
* Debugging without stochastic drift

To reproduce a session, you need only:

* The ZIP hash
* The participant ID
* The manifest

---

## Directory Structure

```
/stimuli/
  shape_color_ratio.svg

trial_manifest.json
TrialManager.js
sanity_check_shapes.js
simulate_balance.js
export_all_csv.js
README.md
METHODS.md
```

---

## Adding or Modifying Stimuli

1. Add new SVGs following the naming convention
2. Update `trial_manifest.json`
3. Run `sanity_check_shapes.js`
4. Run `simulate_balance.js`

Never modify executable logic to change design parameters.

---

## Common Failure Modes (Intentional)

* Reusing a color across blocks → runtime error
* Invalid ratio for target → runtime error
* Uneven Latin-square design → simulation failure
* Missing or malformed stimuli → sanity check failure

These failures are **features**, not bugs.

────────────────────────────────
METHODS.md
────────────────────────────────

# Methods

## Experimental Design

Participants perform a forced-choice shape discrimination task. On each trial, a **target shape** and a **foil shape** are presented simultaneously. The target always has a canonical y/x ratio of 1.00. The foil differs only in aspect ratio.

---

## Independent Variables

1. **Shape**

   * Defined declaratively in the manifest

2. **Color**

   * Assigned per block
   * No repetition across experimental blocks

3. **Difficulty**

   * Easy vs Hard
   * Operationalized as ratio distance from 1.00

---

## Dependent Variables

* Accuracy (correct / incorrect)
* Reaction time (milliseconds)

---

## Stimulus Constraints

* Target and foil share the same shape
* Ratio is the sole perceptual manipulation
* No compound manipulations (size, color, orientation)

---

## Counterbalancing

Difficulty order is counterbalanced using a **Latin-square design** across participants. Participant ID selects the counterbalancing row deterministically.

---

## Randomization Policy

All randomization is deterministic and participant-seeded. No entropy sources are used at runtime.

---

## Data Collection

Each trial logs:

* participantId
* block index
* trial index
* practice flag
* shape
* color
* difficulty
* foil ratio
* response
* correctness
* reaction time

No identifying information is collected.

---

## Ethical / Educational Safety

* No deception
* No personal data
* Fully inspectable design
* Suitable for instructional replication

────────────────────────────────
STUDENT_HANDOUT.md
────────────────────────────────

# Running the Shape Experiment

## What This Demonstrates

This experiment shows how perceptual difficulty can be manipulated **without confounds**, and how experimental design can be separated cleanly from implementation.

---

## How to Run

1. Choose a participant ID (any integer)
2. Load the experiment
3. Complete practice trials
4. Complete experimental blocks
5. Export CSV

---

## What You May Change

* Ratio values in the manifest
* Number of trials
* Block counts

---

## What You Must Not Change

* TrialManager logic
* Constraint enforcement
* Logging structure

---

## Suggested Exercises

* Add a third difficulty level
* Simulate imbalance and observe failure
* Modify ratios and predict accuracy shifts

────────────────────────────────
analysis_example.py
────────────────────────────────

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

────────────────────────────────
analysis_example.R
────────────────────────────────

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

────────────────────────────────
unit_tests.md
────────────────────────────────

# Declarative Test Cases

## Constraint Tests

* No two experimental blocks share a color
* All targets have ratio == 1.00
* All foils differ only by ratio
* Difficulty levels are balanced across N participants

## Determinism Tests

* Same participant ID → identical trial order
* Different participant IDs → different Latin-square rows

## Manifest Integrity

* All declared stimuli exist
* No undeclared stimuli present

---

If you want, I can next:

* Convert these into a LaTeX preregistration appendix
* Generate CI-ready unit test code
* Produce a formal teaching module around the pipeline
