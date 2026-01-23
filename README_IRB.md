# IRB-Safe Shape Discrimination Experiment

This folder contains a manifest-driven, deterministic pipeline for a shape discrimination experiment.

Key guarantees

- Targets always use the canonical `1.00` ratio
- Foils differ only by y/x ratio (difficulty: easy vs hard)
- Latin-square counterbalancing by participant ID
- No color repetition across experimental blocks
- Deterministic PRNG seeded by `participantId`
- Sanity checks and audit-ready CSV export

Files of interest

- `trial_manifest.json` — authoritative experiment specification
- `TrialManager.js` — execution engine (manifest-driven)
- `sanity_check_shapes.js` — pre-deployment validator
- `simulate_balance.js` — counterbalancing verifier
- `export_all_csv.js` — aggregator utility
- `experiment-shapes/` — stimulus SVGs (naming: `shape-ratio-color.svg`)

Quick start

1. Run the sanity check (Node):

```bash
node sanity_check_shapes.js
```

2. In the browser UI, create and init a `TrialManager(participantId)`, then call `startBlock`, `generateTrial`, render stimuli, collect response, then `handleTrialResponse`.

3. Export CSV via `TrialManager.exportCSV()` or use `export_all_csv.js` to aggregate multiple saved participant logs.

See `METHODS.md` for formal documentation intended for IRB or papers.
