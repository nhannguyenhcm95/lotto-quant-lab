import fs from 'fs';

async function testVietlott() {
  const urls = [
    'https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott.html',
    'https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/14-10-2026.html',
    'https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/07-10-2026.html',
    'https://www.minhngoc.net.vn/xo-so-dien-toan/mega-6-45.html',
    'https://www.minhngoc.net.vn/xo-so-dien-toan/power-6-55.html'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const boxes = html.split('class="boxkqxsdientoan"');
      const boxResultDetail = html.split('class="box-result-detail"');
      console.log(`URL: ${url} -> Status: ${res.status} -> Size: ${html.length} -> boxkqxsdientoan: ${boxes.length - 1} -> boxResultDetail: ${boxResultDetail.length - 1}`);
      
      if (boxes.length > 1) {
        for (let b = 1; b < Math.min(boxes.length, 4); b++) {
          const box = boxes[b];
          const text = box.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          const isMega = text.includes('MEGA 6/45');
          const isPower = text.includes('POWER 6/55');
          const mDate = box.match(/([0-9]{2}[-/][0-9]{2}[-/][0-9]{4})/);
          const mKy = box.match(/#[0-9]{4,6}/);
          console.log(`   Box ${b}: Mega=${isMega}, Power=${isPower}, Ky=${mKy ? mKy[0] : 'N/A'}, Date=${mDate ? mDate[1] : 'N/A'}`);
        }
      }
    } catch (e) {
      console.error(url, e.message);
    }
  }
}

testVietlott();
