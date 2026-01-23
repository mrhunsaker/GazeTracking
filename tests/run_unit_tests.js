import fs from 'fs';
import path from 'path';

const EXP_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'StudentFolders', 'Experiment');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(EXP_DIR, 'trial_manifest.json')));
const SHAPES = MANIFEST.shapes;
const COLORS = MANIFEST.colors;
const DIFFICULTIES = MANIFEST.difficultyLevels;
const RATIO_TARGET = MANIFEST.constraints.targetRatio || '1.00';

function fileExists(p) {
  return fs.existsSync(path.join(EXP_DIR, 'experiment-shapes', p));
}

console.log('Running unit tests against manifest and stimulus folder...');

// 1) For each shape/color ensure target exists
for (const shape of SHAPES) {
  for (const color of COLORS) {
    const tf = `${shape}-${RATIO_TARGET}-${color}.svg`;
    if (!fileExists(tf)) throw new Error('Missing target file: ' + tf);
  }
}
console.log('PASS: All canonical target files exist');

// 2) For each difficulty ensure at least one foil exists per shape/color (allowed set)
for (const shape of SHAPES) {
  for (const color of COLORS) {
    for (const d in DIFFICULTIES) {
      const allowed = DIFFICULTIES[d];
      const has = allowed.some(r => fileExists(`${shape}-${r}-${color}.svg`));
      if (!has) throw new Error(`Missing foil for ${shape} ${color} difficulty ${d}`);
    }
  }
}
console.log('PASS: Foils exist for all shape/color/difficulty (at least one)');

// 3) Color pool vs blocks
if (MANIFEST.constraints.noColorRepeatAcrossBlocks) {
  const blocks = MANIFEST.blocks;
  if (blocks > COLORS.length) throw new Error('Design invalid: blocks > unique colors while noColorRepeatAcrossBlocks is true');
  console.log('PASS: color pool sufficient for blocks');
}

// 4) Latin-square properties
function generateLatinSquare(levels) {
  const square = [];
  for (let i = 0; i < levels.length; i++) square.push(levels.slice(i).concat(levels.slice(0, i)));
  return square;
}

const levels = Object.keys(DIFFICULTIES);
const square = generateLatinSquare(levels);
if (square.length !== levels.length) throw new Error('Latin square size mismatch');
// uniqueness
const rows = new Set(square.map(r => r.join(',')));
if (rows.size !== square.length) throw new Error('Latin square rows not unique');
console.log('PASS: Latin-square generated with unique rows');

// 5) Deterministic RNG / assignment test (simple)
function seededRandom(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function assignCounterbalancing(pid) {
  const sq = generateLatinSquare(levels);
  return sq[pid % sq.length];
}

// ensure deterministic for a few sample pids
const a = assignCounterbalancing(5);
const b = assignCounterbalancing(5);
if (a.join(',') !== b.join(',')) throw new Error('Counterbalancing not deterministic');
console.log('PASS: Counterbalancing deterministic for same participant ID');

console.log('\nALL UNIT TESTS PASSED');
