// simulate_balance.js
// Simple script to verify Latin-square counterbalancing across many participants
import TrialManager from './TrialManager.js';

(async function(){
  const N = 240; // simulate many participants
  const counts = {};

  for (let p = 0; p < N; p++){
    const tm = new TrialManager(p);
    await tm.init();
    const ordering = tm.blockDifficultyOrder.join(',');
    counts[ordering] = (counts[ordering] || 0) + 1;
  }

  console.log('Latin-square rows observed and counts:');
  console.log(counts);
})();
import TrialManager from './TrialManager.js';

const N=1000;
const counts={easy:0,hard:0};

for(let p=0;p<N;p++){
  const tm=new TrialManager(p);
  await tm.init();
  tm.blockOrder.forEach(d=>counts[d]++);
}
console.log(counts);