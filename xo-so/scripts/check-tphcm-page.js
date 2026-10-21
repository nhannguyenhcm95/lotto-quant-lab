import fs from 'fs';

async function checkSinglePage() {
  const url = 'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/tp-hcm/05-10-2026.html';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  
  // Find all boxes or draws
  const boxMatches = html.split('class="box_kqxs"');
  console.log('box_kqxs count on single page:', boxMatches.length - 1);

  // Check dates inside each box
  for (let i = 1; i < boxMatches.length; i++) {
    const box = boxMatches[i];
    const dateMatch = box.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
    const dbMatch = box.match(/class="giaidb"[^>]*>([\s\S]*?)<\/td>/i);
    const dbVal = dbMatch ? dbMatch[1].replace(/<[^>]+>/g, '').trim() : 'N/A';
    console.log(`Box ${i} -> Date: ${dateMatch ? dateMatch[1] : 'N/A'}, Special: ${dbVal}`);
  }
}

checkSinglePage();
