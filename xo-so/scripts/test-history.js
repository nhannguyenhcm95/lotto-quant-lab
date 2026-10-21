import fs from 'fs';

async function testHistory() {
  const urls = [
    'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/tp-hcm.html',
    'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/03-10-2026.html',
    'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/26-09-2026.html',
    'https://www.minhngoc.net.vn/xo-so-dien-toan/vietlott.html'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const tableBlocks = html.split('class="bkqmiennam"');
      const boxDienToan = html.split('class="boxkqxsdientoan"');
      console.log(`URL: ${url} -> Status: ${res.status} -> Size: ${html.length} -> bkqmiennam: ${tableBlocks.length - 1} -> dienToan: ${boxDienToan.length - 1}`);
      
      if (tableBlocks.length > 1) {
        for (let b = 1; b < Math.min(tableBlocks.length, 5); b++) {
          const tb = tableBlocks[b];
          const dateMatch = tb.match(/class="ngay"[^>]*>([\s\S]*?)<\/td>/i);
          const ngayRaw = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : 'N/A';
          const tinhMatches = [...tb.matchAll(/class="tinh"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi)].map(m => m[1].trim());
          console.log(`   [MN] Table ${b}: Ngay: "${ngayRaw}" -> Tinhs: [${tinhMatches.join(', ')}]`);
        }
      }

      if (boxDienToan.length > 1) {
        for (let b = 1; b < Math.min(boxDienToan.length, 5); b++) {
          const box = boxDienToan[b];
          const text = box.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          const isMega = text.includes('MEGA 6/45');
          const isPower = text.includes('POWER 6/55');
          const dateMatch = box.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
          console.log(`   [DT] Box ${b}: Mega: ${isMega}, Power: ${isPower}, Date: ${dateMatch ? dateMatch[1] : 'N/A'}`);
        }
      }
    } catch (e) {
      console.error(url, e.message);
    }
  }
}

testHistory();
