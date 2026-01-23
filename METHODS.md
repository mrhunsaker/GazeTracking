# Methods

This document provides a formal Methods-style description of the experiment suitable for IRB appendices or a methods section.

Design summary

Participants perform forced-choice shape discrimination. Each trial presents a target (canonical shape, 1.00 ratio) and a foil (same shape, altered y/x ratio). Difficulty is the foil ratio set (easy/hard).

Independent variables

- Shape: declaratively listed in `trial_manifest.json`
- Color: single color per block (no repetition across experimental blocks)
- Difficulty: `easy` vs `hard` (ratio sets declared in manifest)

Counterbalancing

Difficulty order is counterbalanced with a Latin-square across participants. Participant ID maps to a Latin-square row deterministically.

Randomization policy

All random choices use a PRNG seeded by `participantId`. This ensures reproducibility and auditability.

Data recorded (per trial)

- participantId
- practice flag
- block index
- trial index
- shape
- color
- difficulty
- foilRatio
- response
- correct (boolean)
- rt (ms)

Ethics and safety

No personally identifying data is collected. The manifest fully declares the experimental design. Sanity checks prevent accidental stimulus leakage.
