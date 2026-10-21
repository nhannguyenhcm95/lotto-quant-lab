import fs from 'fs';

async function testTphcmUrls() {
  const dates = [
    '05-01-2008',
    '12-01-2008',
    '01-01-2015',
    '01-01-2020',
    '01-01-2024'
  ];

  for (const d of dates) {
    const url = `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/tp-hcm/${d}.html`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const hasDb = html.includes('giaidb') || html.includes('G.ĐB') || html.includes('Đặc Biệt');
      console.log(`${d} => Status: ${res.status}, Size: ${html.length}, hasPrize: ${hasDb}`);
    } catch (e) {
      console.log(`${d} => Error: ${e.message}`);
    }
  }
}

testTphcmUrls();
