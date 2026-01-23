# Unit Tests (human-readable)

These tests are intended to be converted into CI unit tests. They express the invariants the code must maintain.

1. No two experimental blocks share the same color (manifest.constraints.noColorRepeatAcrossBlocks)
2. All targets have ratio `1.00` in the stimulus set
3. All foils present differ only by ratio (filename convention)
4. Difficulty levels are balanced across simulated participants (simulate_balance.js)
5. Determinism: same participantId => same blockDifficultyOrder
