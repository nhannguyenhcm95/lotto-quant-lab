import fs from 'fs';

const html = fs.readFileSync('sample_mn.html', 'utf8');
const tableBlocks = html.split('class="bkqmiennam"');
console.log('Tables bkqmiennam count:', tableBlocks.length - 1);

for (let b = 1; b < tableBlocks.length; b++) {
  const tb = tableBlocks[b];
  const dateMatch = tb.match(/class="ngay"[^>]*>([\s\S]*?)<\/td>/i);
  const ngayRaw = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : 'N/A';
  
  const tinhMatches = [...tb.matchAll(/class="tinh"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi)].map(m => m[1].trim());
  console.log(`Table ${b} -> Ngay: "${ngayRaw}" -> Tinhs: [${tinhMatches.join(', ')}]`);
}
