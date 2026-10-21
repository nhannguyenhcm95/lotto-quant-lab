import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stationCodeMap = {
  'TP. HCM': 'tphcm',
  'TP.HCM': 'tphcm',
  'Hồ Chí Minh': 'tphcm',
  'Đồng Nai': 'dong-nai',
  'Cần Thơ': 'can-tho',
  'Sóc Trăng': 'soc-trang',
  'Tây Ninh': 'tay-ninh',
  'An Giang': 'an-giang',
  'Bình Thuận': 'binh-thuan',
  'Vĩnh Long': 'vinh-long',
  'Bình Dương': 'binh-duong',
  'Trà Vinh': 'tra-vinh',
  'Long An': 'long-an',
  'Bình Phước': 'binh-phuoc',
  'Hậu Giang': 'hau-giang',
  'Tiền Giang': 'tien-giang',
  'Kiên Giang': 'kien-giang',
  'Đà Lạt': 'da-lat',
  'Lâm Đồng': 'da-lat',
  'Đồng Tháp': 'dong-thap',
  'Cà Mau': 'ca-mau',
  'Bến Tre': 'ben-tre',
  'Vũng Tàu': 'vung-tau',
  'Bạc Liêu': 'bac-lieu'
};

function parseXSMNFromHTML(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') return [];
  const tableBlocks = htmlContent.split('class="bkqmiennam"');
  const allDraws = [];

  for (let b = 1; b < tableBlocks.length; b++) {
    const tableBlock = tableBlocks[b];

    const dateMatch = tableBlock.match(/class="ngay"[^>]*>[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
    let dateStr = '';
    let dateRaw = '';
    if (dateMatch) {
      dateRaw = dateMatch[1];
      const p = dateRaw.split('/');
      dateStr = `${p[2]}-${p[1]}-${p[0]}`;
    }
    if (!dateStr) continue;

    const stationBlocks = tableBlock.split('class="rightcl"');
    for (let s = 1; s < stationBlocks.length; s++) {
      const stBlock = stationBlocks[s];

      const tinhMatch = stBlock.match(/class="tinh"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
      const stationName = tinhMatch ? tinhMatch[1].trim() : '';
      if (!stationName) continue;
      const stationId = stationCodeMap[stationName] || stationName.toLowerCase().replace(/[^a-z0-9]/g, '-');

      const matinhMatch = stBlock.match(/class="matinh"[^>]*>\s*([^<\r\n]+)/i);
      const drawId = matinhMatch ? matinhMatch[1].trim() : `K${dateStr.replace(/-/g, '').slice(2)}`;

      const extractNumbers = (className) => {
        const regex = new RegExp(`class="${className}"[^>]*>([\\s\\S]*?)<\\/td>`, 'i');
        const match = stBlock.match(regex);
        if (!match) return [];
        const divMatches = [...match[1].matchAll(/<div>([^<]+)<\/div>/g)].map(m => m[1].trim());
        return divMatches.length > 0 ? divMatches : [match[1].replace(/<[^>]+>/g, '').trim()].filter(Boolean);
      };

      const special = extractNumbers('giaidb');
      if (special.length === 0) continue;

      const prizes = {
        special,
        first: extractNumbers('giai1'),
        second: extractNumbers('giai2'),
        third: extractNumbers('giai3'),
        fourth: extractNumbers('giai4'),
        fifth: extractNumbers('giai5'),
        sixth: extractNumbers('giai6'),
        seventh: extractNumbers('giai7'),
        eighth: extractNumbers('giai8')
      };

      const lottoPairs = [];
      Object.values(prizes).forEach(arr => {
        arr.forEach(val => {
          if (val.length >= 2) lottoPairs.push(val.slice(-2));
        });
      });

      const head = {};
      const tail = {};
      for (let d = 0; d <= 9; d++) { head[d] = []; tail[d] = []; }
      lottoPairs.forEach(num => {
        head[num[0]].push(num[1]);
        tail[num[1]].push(num[0]);
      });
      for (let d = 0; d <= 9; d++) { head[d].sort(); tail[d].sort(); }

      allDraws.push({
        date: dateStr,
        drawDateRaw: dateRaw,
        stationId,
        stationName,
        drawId,
        specialPrize: special[0],
        prizes,
        lottoPairs,
        headTail: { head, tail }
      });
    }
  }

  return allDraws;
}

function parseVietlottFromHTML(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') return { power: [], mega: [] };
  const power = [];
  const mega = [];

  const boxes = htmlContent.split('class="boxkqxsdientoan"');
  for (let i = 1; i < boxes.length; i++) {
    const box = boxes[i];
    const isPower = box.includes('POWER 6/55') || box.includes('power-6x55') || box.includes('DT6X55');
    const isMega = box.includes('MEGA 6/45') || box.includes('mega-6x45') || box.includes('DT6X45');
    if (!isPower && !isMega) continue;

    let dateStr = '';
    let dateRaw = '';
    const dateMatch = box.match(/([0-9]{2})-([0-9]{2})-([0-9]{4})\.html/) || 
                      box.match(/quay thưởng\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i) ||
                      box.match(/([0-9]{2})\/([0-9]{2})\/([0-9]{4})/);
    if (dateMatch) {
      if (dateMatch[0].includes('-') && dateMatch[0].includes('.html')) {
        dateRaw = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
        dateStr = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      } else {
        const parts = (dateMatch[1] || dateMatch[0]).split('/');
        if (parts.length === 3) {
          dateRaw = `${parts[0]}/${parts[1]}/${parts[2]}`;
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
    }
    if (!dateStr) continue;

    const kyMatch = box.match(/Kỳ vé:[^#<]*?(#[0-9]{4,6})/i) || 
                    box.match(/id="DT6X[45]5_KY_VE"[^>]*>\s*(#[0-9]{4,6})/i) ||
                    box.match(/class="time-result"[^>]*>[\s\S]*?(#[0-9]{4,6})/i);
    const drawId = kyMatch ? kyMatch[1] : `#${dateStr.replace(/-/g, '').slice(2)}`;

    // Trích xuất các bóng số
    const ballMatches = [...box.matchAll(/class="[^"]*bool">(\d+)<\/div>/g)].map(m => parseInt(m[1], 10));
    if (ballMatches.length < 6) continue;

    const winningNumbers = ballMatches.slice(0, 6).sort((a, b) => a - b);
    const bonusNumber = isPower && ballMatches.length > 6 ? ballMatches[6] : null;

    const jackpotMatch = box.match(/id="DT6X[45]5_G_JACKPOT">([^<]+)/i) || 
                         box.match(/class="giai_thuong_gia_tri"[^>]*><b>([^<]+)/i);
    const jackpotEst = jackpotMatch ? jackpotMatch[1].trim() + ' đ' : null;

    // Chặn sai loại game
    if (isMega && winningNumbers.some(n => n > 45)) continue;

    const item = {
      date: dateStr,
      drawDateRaw: dateRaw,
      gameType: isPower ? 'power-6-55' : 'mega-6-45',
      drawId,
      winningNumbers,
      bonusNumber,
      jackpotEst
    };

    if (isPower) power.push(item);
    else mega.push(item);
  }

  return { power, mega };
}

// Hàm tính lùi ngày (Format DD-MM-YYYY)
function getSteppedDates(startDateStr, weeksBack = 16) {
  const [day, month, year] = startDateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dates = [];

  for (let w = 0; w < weeksBack; w++) {
    const cur = new Date(date.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const dd = String(cur.getDate()).padStart(2, '0');
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const yyyy = cur.getFullYear();
    dates.push(`${dd}-${mm}-${yyyy}`);
  }
  return dates;
}

async function fetchUrl(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (err) {
    console.warn(`Lỗi tải ${url}:`, err.message);
  }
  return null;
}

async function main() {
  console.log('=== KHỞI CHẠY CÀO TOÀN BỘ DỮ LIỆU MINH NGỌC (LỊCH SỬ DÀI HẠN) ===\n');

  const seedPath = path.join(__dirname, '..', 'data', 'historical-seed.json');
  let currentSeed = { xsmn: [], vietlott: { 'mega-6-45': [], 'power-6-55': [] } };

  if (fs.existsSync(seedPath)) {
    try {
      const raw = fs.readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, '');
      currentSeed = JSON.parse(raw);
    } catch (e) {
      console.warn('Lỗi đọc seed cũ:', e);
    }
  }

  const xsmnMap = new Map();
  (currentSeed.xsmn || []).forEach(d => xsmnMap.set(`${d.date}_${d.stationId}`, d));

  const megaMap = new Map();
  ((currentSeed.vietlott && currentSeed.vietlott['mega-6-45']) || []).forEach(d => megaMap.set(`${d.date}_${d.drawId}`, d));

  const powerMap = new Map();
  ((currentSeed.vietlott && currentSeed.vietlott['power-6-55']) || []).forEach(d => powerMap.set(`${d.date}_${d.drawId}`, d));

  console.log(`Dữ liệu hiện có trước khi cào:`);
  console.log(`- XSMN: ${xsmnMap.size} kỳ quay`);
  console.log(`- Vietlott Mega: ${megaMap.size} kỳ quay`);
  console.log(`- Vietlott Power: ${powerMap.size} kỳ quay\n`);

  // 1. Cào 16 tuần XSMN (~112 ngày, tương đương gần 4 tháng đầy đủ các đài)
  const xsmnDates = getSteppedDates('16-10-2026', 16);
  console.log(`1. Bắt đầu cào ${xsmnDates.length} tuần XSMN từ Minh Ngọc...`);

  for (let i = 0; i < xsmnDates.length; i++) {
    const dStr = xsmnDates[i];
    const url = i === 0 
      ? 'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam.html'
      : `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${dStr}.html`;

    process.stdout.write(`   [${i + 1}/${xsmnDates.length}] Đang cào ${dStr}... `);
    const html = await fetchUrl(url);
    if (html) {
      const draws = parseXSMNFromHTML(html);
      let newCount = 0;
      draws.forEach(d => {
        const key = `${d.date}_${d.stationId}`;
        if (!xsmnMap.has(key)) newCount++;
        xsmnMap.set(key, d);
      });
      console.log(`Thu được ${draws.length} kỳ (${newCount} kỳ mới).`);
    } else {
      console.log('Thất bại (Bỏ qua).');
    }
    // Độ trễ nhẹ tránh bị chặn
    await new Promise(r => setTimeout(r, 400));
  }

  // 2. Cào 12 tuần Vietlott (~84 ngày)
  const vietlottDates = getSteppedDates('16-10-2026', 12);
  console.log(`\n2. Bắt đầu cào ${vietlottDates.length} kỳ Vietlott từ Minh Ngọc...`);

  for (let i = 0; i < vietlottDates.length; i++) {
    const dStr = vietlottDates[i];
    const url = i === 0
      ? 'https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott.html'
      : `https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/${dStr}.html`;

    process.stdout.write(`   [${i + 1}/${vietlottDates.length}] Đang cào Vietlott ${dStr}... `);
    const html = await fetchUrl(url);
    if (html) {
      const { power, mega } = parseVietlottFromHTML(html);
      let newP = 0, newM = 0;
      power.forEach(p => {
        const key = `${p.date}_${p.drawId}`;
        if (!powerMap.has(key)) newP++;
        powerMap.set(key, p);
      });
      mega.forEach(m => {
        const key = `${m.date}_${m.drawId}`;
        if (!megaMap.has(key)) newM++;
        megaMap.set(key, m);
      });
      console.log(`Mega: +${newM}, Power: +${newP}.`);
    } else {
      console.log('Thất bại (Bỏ qua).');
    }
    await new Promise(r => setTimeout(r, 400));
  }

  // Sắp xếp giảm dần theo ngày
  const finalXSMN = Array.from(xsmnMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
  const finalMega = Array.from(megaMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
  const finalPower = Array.from(powerMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));

  const finalOutput = {
    generatedAt: new Date().toISOString(),
    description: "Bộ dữ liệu thực tế đầy đủ cào trực tiếp từ minhngoc.net.vn",
    xsmn: finalXSMN,
    vietlott: {
      'mega-6-45': finalMega,
      'power-6-55': finalPower
    }
  };

  const allowWrite = process.argv.includes('--allow-canonical-write') || process.env.ALLOW_CANONICAL_WRITE === '1';
  const targetPath = allowWrite ? seedPath : path.join(__dirname, '..', 'data', 'crawled-output.json');

  if (allowWrite && fs.existsSync(seedPath)) {
    const backupPath = path.join(__dirname, '..', 'data', 'historical-seed.backup-before-crawl.json');
    fs.copyFileSync(seedPath, backupPath);
  }

  fs.writeFileSync(targetPath, JSON.stringify(finalOutput, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log(`🎉 ĐÃ CÀO TOÀN BỘ VÀ LƯU THÀNH CÔNG VÀO ${targetPath}`);
  console.log(`- Tổng XSMN: ${finalXSMN.length} kỳ quay thực tế`);
  console.log(`- Tổng Vietlott Mega 6/45: ${finalMega.length} kỳ quay`);
  console.log(`- Tổng Vietlott Power 6/55: ${finalPower.length} kỳ quay`);

  // Phân tích thống kê số kỳ theo đài
  const stCount = {};
  finalXSMN.forEach(d => { stCount[d.stationId] = (stCount[d.stationId] || 0) + 1; });
  console.log('\nPhân bổ số kỳ theo từng đài XSMN:');
  console.log(stCount);
  console.log('======================================================');
}

main();
