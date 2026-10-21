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

function parseVietlott(html, gameType) {
  const blocks = html.split('class="box-result-detail"');
  const results = [];

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    
    const drawIdMatch = block.match(/Kỳ vé:[^#]*?(#\d+)/i) || 
                        block.match(/id="DT6X[45]5_KY_VE">([^<]+)<\/span>/i) ||
                        block.match(/(#\d{5})/);
    const drawId = drawIdMatch ? (drawIdMatch[1].startsWith('#') ? drawIdMatch[1] : '#' + drawIdMatch[1]) : null;

    const dateMatch = block.match(/quay thưởng\s*(\d{2}\/\d{2}\/\d{4})/i) || block.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) continue;
    const dateRaw = dateMatch[1];
    const parts = dateMatch[1].split('/');
    const dateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;

    const ballMatches = [...block.matchAll(/class="[^"]*bool">(\d+)<\/div>/g)].map(m => parseInt(m[1], 10));

    const jackpotMatch = block.match(/id="DT6X[45]5_G_JACKPOT">([^<]+)/i) || 
                         block.match(/class="giai_thuong_gia_tri"[^>]*><b>([^<]+)/i);
    let jackpotEst = jackpotMatch ? jackpotMatch[1].trim() + ' đ' : null;

    if (ballMatches.length >= 6) {
      const winningNumbers = ballMatches.slice(0, 6).sort((a, b) => a - b);
      const bonusNumber = (gameType === 'power-6-55' && ballMatches.length > 6) ? ballMatches[6] : null;

      results.push({
        date: dateFormatted,
        drawDateRaw: dateRaw,
        gameType,
        drawId,
        winningNumbers,
        bonusNumber,
        jackpotEst
      });
    }
  }

  // Loại bỏ các kỳ trùng lặp nếu có
  const unique = [];
  const seen = new Set();
  results.forEach(r => {
    const key = `${r.date}_${r.drawId}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  });

  return unique.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function parseXSMN(htmlContent) {
  const tableBlocks = htmlContent.split('class="bkqmiennam"');
  const allDraws = [];

  for (let b = 1; b < tableBlocks.length; b++) {
    const tableBlock = tableBlocks[b];

    const dateMatch = tableBlock.match(/class="ngay"[^>]*>[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
    if (!dateMatch) continue;
    const dateRaw = dateMatch[1];
    const p = dateRaw.split('/');
    const dateStr = `${p[2]}-${p[1]}-${p[0]}`;

    const stationBlocks = tableBlock.split('class="rightcl"');
    for (let s = 1; s < stationBlocks.length; s++) {
      const stBlock = stationBlocks[s];

      const tinhMatch = stBlock.match(/class="tinh"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
      if (!tinhMatch) continue;
      const stationName = tinhMatch[1].trim();
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

      const prizes = {
        special: extractNumbers('giaidb'),
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

      if (lottoPairs.length > 0) {
        allDraws.push({
          date: dateStr,
          drawDateRaw: dateRaw,
          stationId,
          stationName,
          drawId,
          prizes,
          lottoPairs,
          headTail: { head, tail }
        });
      }
    }
  }

  return allDraws;
}

async function main() {
  console.log('--- ĐANG TỔNG HỢP BỘ DỮ LIỆU THỰC TẾ 100% TỪ MINH NGỌC ---');

  // 1. Vietlott Mega 6/45
  const htmlMega = fs.readFileSync('temp_vietlott.html', 'utf-8');
  const megaList = parseVietlott(htmlMega, 'mega-6-45');

  // 2. Vietlott Power 6/55
  const htmlPower = fs.readFileSync('temp_power.html', 'utf-8');
  const powerList = parseVietlott(htmlPower, 'power-6-55');

  // 3. XSMN chính
  const htmlXSMN = fs.readFileSync('temp_xsmn.html', 'utf-8');
  let xsmnList = parseXSMN(htmlXSMN);

  // Thử tải thêm các ngày trước của XSMN để tập dữ liệu dày hơn (30 - 50 kỳ)
  const previousDates = ['13-10-2026', '12-10-2026', '11-10-2026', '10-10-2026', '09-10-2026', '08-10-2026', '07-10-2026'];
  for (const dateStr of previousDates) {
    try {
      const url = `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${dateStr}.html`;
      console.log(`Đang cào bổ sung XSMN ngày ${dateStr}...`);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (res.ok) {
        const text = await res.text();
        const moreDraws = parseXSMN(text);
        if (moreDraws.length > 0) {
          console.log(`  -> Tìm thấy thêm ${moreDraws.length} đài quay.`);
          xsmnList = xsmnList.concat(moreDraws);
        }
      }
    } catch (e) {
      console.log(`  -> Bỏ qua ngày ${dateStr}: ${e.message}`);
    }
  }

  // Khử trùng lặp XSMN
  const uniqueXSMN = [];
  const seenXSMN = new Set();
  xsmnList.forEach(item => {
    const key = `${item.date}_${item.stationId}`;
    if (!seenXSMN.has(key)) {
      seenXSMN.add(key);
      uniqueXSMN.push(item);
    }
  });
  uniqueXSMN.sort((a, b) => new Date(b.date) - new Date(a.date));

  const realSeedDataset = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "minhngoc.net.vn",
      isAuthenticMinhNgocData: true,
      totalXSMNDraws: uniqueXSMN.length,
      totalMegaDraws: megaList.length,
      totalPowerDraws: powerList.length,
      description: "Dữ liệu thực tế 100% cào trực tiếp từ trang minhngoc.net.vn"
    },
    xsmn: uniqueXSMN,
    vietlott: {
      'mega-6-45': megaList,
      'power-6-55': powerList
    }
  };

  const allowWrite = process.argv.includes('--allow-canonical-write') || process.env.ALLOW_CANONICAL_WRITE === '1';
  const outPath = allowWrite 
    ? path.join(__dirname, '..', 'data', 'historical-seed.json')
    : path.join(__dirname, '..', 'data', 'build-real-seed.output.json');

  if (allowWrite) {
    const backupPath = path.join(__dirname, '..', 'data', 'historical-seed.backup-before-build.json');
    if (fs.existsSync(outPath)) fs.copyFileSync(outPath, backupPath);
  }

  fs.writeFileSync(outPath, JSON.stringify(realSeedDataset, null, 2), 'utf-8');

  console.log(`\n=== ĐÃ CẬP NHẬT THÀNH CÔNG DỮ LIỆU THỰC TẾ VÀO ${outPath} ===`);
  console.log(`- Vietlott Mega 6/45: ${megaList.length} kỳ quay thực tế`);
  console.log(`  Kỳ mới nhất: ${megaList[0].drawId} ngày ${megaList[0].date} - Dãy số: ${megaList[0].winningNumbers.join(', ')} - Jackpot: ${megaList[0].jackpotEst}`);
  console.log(`- Vietlott Power 6/55: ${powerList.length} kỳ quay thực tế`);
  console.log(`  Kỳ mới nhất: ${powerList[0].drawId} ngày ${powerList[0].date} - Dãy số: ${powerList[0].winningNumbers.join(', ')} + (${powerList[0].bonusNumber})`);
  console.log(`- XSMN: ${uniqueXSMN.length} lượt quay đài thực tế từ Minh Ngọc`);
  console.log(`  Đài mới nhất: ${uniqueXSMN[0].stationName} ngày ${uniqueXSMN[0].date} - Giải ĐB: ${uniqueXSMN[0].prizes.special[0]}`);
}

main();
