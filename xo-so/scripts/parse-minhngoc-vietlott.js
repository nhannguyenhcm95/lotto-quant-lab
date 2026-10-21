import fs from 'fs';

const html = fs.readFileSync('temp_vietlott.html', 'utf-8');

// Tìm từ khóa 14/10/2026 hoặc 01575
const idx = html.indexOf('14/10/2026');
console.log('Index of 14/10/2026:', idx);

if (idx !== -1) {
  console.log('Snippet around 14/10/2026:');
  console.log(html.slice(Math.max(0, idx - 200), Math.min(html.length, idx + 1500)));
} else {
  // Tìm MEGA 6/45
  const mIdx = html.indexOf('Mega 6/45');
  console.log('Index of Mega 6/45:', mIdx);
  if (mIdx !== -1) {
    console.log(html.slice(mIdx - 100, mIdx + 1500));
  }
}
