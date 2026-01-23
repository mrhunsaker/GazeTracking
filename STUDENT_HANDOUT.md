# Student Handout: Running the Shape Experiment

What this exercise demonstrates

- How to separate design (manifest) from implementation (TrialManager)
- Deterministic counterbalancing and stimulus selection
- How to collect trial-level data and export for analysis

Running locally

1. Choose a `participantId` (any integer).
2. Create a `TrialManager(participantId)` instance and `await tm.init()`.
3. For each block:
   - `tm.startBlock(blockIndex)` (practice blocks use `startBlock(idx, true)`).
   - For each trial: `tm.generateTrial()` → render the `target.img` and `foil.img` → collect response → `tm.handleTrialResponse(response)`.
4. After completion, call `tm.exportCSV()` to get a CSV string.

Exercises

- Change the number of trials per block in `trial_manifest.json` and rerun `simulate_balance.js`.
- Add a new color to the manifest and observe how color pools change.
- Run `sanity_check_shapes.js` after adding new stimuli.
