// export_all_csv.js
// Simple utility to aggregate trialData objects from multiple participants
// into a single CSV. This expects an array of trial objects (e.g., combined
// from saved participant logs).

import fs from 'fs';

export function exportCSV(allTrials, outPath = 'all_participants.csv'){
  if (!allTrials.length) {
    console.warn('No trial data provided');
    return;
  }
  const headers = Object.keys(allTrials[0]);
  const rows = [headers.join(',')];
  for (const r of allTrials) rows.push(headers.map(h => r[h]).join(','));
  fs.writeFileSync(outPath, rows.join('\n'));
  console.log('Wrote', outPath);
}
import fs from 'fs';

export function exportCSV(allTrials){
  const h=Object.keys(allTrials[0]).join(',');
  const r=allTrials.map(o=>Object.values(o).join(','));
  fs.writeFileSync('all_participants.csv',[h,...r].join('\n'));
}