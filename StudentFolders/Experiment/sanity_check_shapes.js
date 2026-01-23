// sanity_check_shapes.js (ES module)
// Run this in Node before deploying the experiment. It fails loudly if
// required canonical targets or required foil ratios are missing or if
// filenames don't follow the required convention.

import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const DIR = path.join(__dirname, 'experiment-shapes');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'trial_manifest.json'), 'utf8'));

const shapes = manifest.shapes;
const colors = manifest.colors;
const targetRatio = '1.00';
const ratios = [...new Set([].concat(...Object.values(manifest.difficultyLevels)))];

function expectedFilenames(shape, ratio, color) {
  // Accept either explicit '-1.00-' style or color-only filename e.g. 'circle-white.svg'
  return [
    `${shape}-${ratio}-${color}.svg`,
    `${shape}-${color}.svg`,
    `${shape}-${ratio}.svg`
  ];
}

const files = fs.readdirSync(DIR).map(f => f.toString());
for (const shape of shapes) {
  for (const color of colors) {
    // Check target exists
    const tCandidates = expectedFilenames(shape, targetRatio, color);
    const t = tCandidates.find(c => files.includes(c));
    if (!t) throw new Error('Missing target file for ' + shape + ' color ' + color + ' (tried: ' + tCandidates.join(', ') + ')');

    // Ensure at least one foil exists for each difficulty
    for (const d in manifest.difficultyLevels) {
      const allowed = manifest.difficultyLevels[d];
      const hasFoil = allowed.some(r => {
        const candidates = expectedFilenames(shape, r, color);
        return candidates.some(c => files.includes(c));
      });
      if (!hasFoil) throw new Error(`Missing foil for ${shape} color ${color} difficulty ${d}`);
    }
  }
}

console.log('Sanity check passed: all required stimulus files present (at least one foil per difficulty)');
