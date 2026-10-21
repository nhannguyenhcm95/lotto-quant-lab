import fs from 'fs';

async function testHistoricalDate(dateStr, station = 'tp-hcm') {
  // dateStr format: YYYY-MM-DD or DD-MM-YYYY
  let dFormatted = dateStr;
  if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
    const [y, m, d] = dateStr.split('-');
    dFormatted = `${d}-${m}-${y}`;
  }
  
  const url = `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${station}/${dFormatted}.html`;
  console.log(`Đang cào thử ngày quá khứ: ${url}...`);

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    
    // Tìm các giải
    const dbMatch = html.match(/class="giaidb"[^>]*>([\s\S]*?)<\/td>/i);
    const dbVal = dbMatch ? dbMatch[1].replace(/<[^>]+>/g, '').trim() : 'N/A';
    
    // Tìm ngày chính thức
    const dateMatch = html.match(/class="ngay"[^>]*>([\s\S]*?)<\/td>/i) || html.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
    const officialDate = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : 'N/A';

    console.log(`Kết quả cào ngày ${dFormatted}:`);
    console.log(`- Trạng thái HTTP: ${res.status}`);
    console.log(`- Ngày tìm thấy: ${officialDate}`);
    console.log(`- Giải Đặc Biệt: ${dbVal}`);

    return { success: res.status === 200, specialPrize: dbVal, officialDate };
  } catch (e) {
    console.error(`Lỗi:`, e.message);
    return { success: false, error: e.message };
  }
}

// Thử cào ngày 12-10-2024 (cách đây 2 năm) và 05-01-2008 (cách đây 18 năm)
async function run() {
  await testHistoricalDate('2024-10-12', 'tp-hcm');
  await testHistoricalDate('2023-05-13', 'tp-hcm');
  await testHistoricalDate('2008-01-05', 'tp-hcm');
}

run();
