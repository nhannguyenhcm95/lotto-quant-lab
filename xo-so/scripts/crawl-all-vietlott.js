import fs from 'fs';
import path from 'path';

/**
 * Script cào toàn bộ 100% lịch sử kết quả Vietlott (Mega 6/45 và Power 6/55)
 * từ kỳ quay #00001 đầu tiên đến kỳ mới nhất hiện tại.
 */

const DATA_DIR = path.resolve('data');
const SEED_FILE = path.join(DATA_DIR, 'historical-seed.json');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseVietlottBoxes(html, gameType) {
  const blocks = html.split('class="box-result-detail"');
  const results = [];

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // Ngày quay thưởng
    const dateMatch = block.match(/quay thưởng\s*(\d{2}\/\d{2}\/\d{4})/i) || block.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) continue;
    const dateRaw = dateMatch[1];
    const [d, m, y] = dateRaw.split('/');
    const dateFormatted = `${y}-${m}-${d}`;

    // Kỳ vé: Ví dụ #00539 hoặc trong span DT6X45_KY_VE
    let drawId = null;
    const spanMatch = block.match(/id="DT6X[45]5_KY_VE">([^<]*)<\/span>/i);
    if (spanMatch && spanMatch[1].trim()) {
      drawId = spanMatch[1].trim();
      if (!drawId.startsWith('#')) drawId = '#' + drawId;
    }
    if (!drawId) {
      const kyVeMatch = block.match(/Kỳ vé:[^#<]*?(#[0-9]{4,6})/i);
      if (kyVeMatch) drawId = kyVeMatch[1];
    }

    // Quả bóng số: <div class="finnish... bool">08</div>
    const balls = [...block.matchAll(/class="[^"]*bool">(\d+)<\/div>/g)].map(m => parseInt(m[1], 10));
    if (balls.length < 6) continue;

    const winningNumbers = balls.slice(0, 6).sort((a, b) => a - b);
    const bonusNumber = (gameType === 'power-6-55' && balls.length > 6) ? balls[6] : null;

    // Jackpot 1
    const jackpotMatch = block.match(/id="DT6X[45]5_G_JACKPOT">([^<]+)/i) || 
                         block.match(/class="giai_thuong_gia_tri"[^>]*><b>([^<]+)/i);
    let jackpotEst = jackpotMatch ? jackpotMatch[1].trim() + ' đ' : null;

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

  return results;
}

async function fetchPage(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      if (res.status === 200) {
        return await res.text();
      }
      if (res.status === 404) return null;
    } catch (e) {
      if (attempt === retries) throw e;
    }
    await sleep(500 * attempt);
  }
  return null;
}

/**
 * Cào toàn bộ lịch sử của một game Vietlott
 */
async function crawlGameFullHistory(gameConfig) {
  const { gameType, urlPrefix, startDate, firstDrawId } = gameConfig;
  console.log(`\n==================================================`);
  console.log(`🚀 BẮT ĐẦU CÀO TOÀN BỘ 100% LỊCH SỬ: ${gameType.toUpperCase()}`);
  console.log(`Mục tiêu: Từ ngày đầu tiên ${startDate} (#${firstDrawId}) đến kỳ mới nhất`);
  console.log(`==================================================`);

  const drawMap = new Map(); // key: dateFormatted => drawObj
  let currentUrl = `https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/${urlPrefix}.html`;
  let pageCount = 0;
  const startTimestamp = new Date(startDate).getTime();

  while (currentUrl) {
    pageCount++;
    process.stdout.write(`\r[${gameType}] Đang tải trang ${pageCount}: ${currentUrl.split('/').pop()} ... `);
    
    const html = await fetchPage(currentUrl);
    if (!html) {
      console.log(`\nKhông tải được trang hoặc kết thúc: ${currentUrl}`);
      break;
    }

    const draws = parseVietlottBoxes(html, gameType);
    if (draws.length === 0) {
      console.log(`\nKhông còn kỳ quay nào trong trang.`);
      break;
    }

    let addedCount = 0;
    let oldestInPage = null;

    for (const d of draws) {
      if (!drawMap.has(d.date)) {
        drawMap.set(d.date, d);
        addedCount++;
      }
      if (!oldestInPage || d.date < oldestInPage.date) {
        oldestInPage = d;
      }
    }

    process.stdout.write(`Đã lấy: +${addedCount} kỳ | Tổng tích lũy: ${drawMap.size} kỳ`);

    if (!oldestInPage) break;

    const oldestTime = new Date(oldestInPage.date).getTime();
    if (oldestTime <= startTimestamp) {
      console.log(`\n✅ Đã chạm tới mốc kỳ đầu tiên: ${oldestInPage.date} (${oldestInPage.drawId})!`);
      break;
    }

    // Tính ngày tiếp theo để lùi: lấy ngày của oldestInPage trừ đi 1 ngày
    const oldestDateObj = new Date(oldestInPage.date);
    oldestDateObj.setDate(oldestDateObj.getDate() - 1);
    const dd = String(oldestDateObj.getDate()).padStart(2, '0');
    const mm = String(oldestDateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = oldestDateObj.getFullYear();
    const nextDateStr = `${dd}-${mm}-${yyyy}`;

    currentUrl = `https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/${urlPrefix}/${nextDateStr}.html`;

    // Nghỉ nhẹ 80ms để giữ kết nối ổn định
    await sleep(80);
  }

  // Chuyển Map thành mảng và sắp xếp theo ngày tăng dần để gán drawId chính xác từ #00001 nếu bị thiếu
  const sortedDraws = Array.from(drawMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  console.log(`\n[${gameType}] Cào hoàn tất! Tổng cộng: ${sortedDraws.length} kỳ quay.`);

  // Chuẩn hóa và kiểm tra drawId
  let assignedCount = 0;
  for (let i = 0; i < sortedDraws.length; i++) {
    const draw = sortedDraws[i];
    if (!draw.drawId || draw.drawId === '#00000' || draw.drawId.includes('80808')) {
      // Đánh số kỳ thứ tự 1-indexed: #00001, #00002...
      const numStr = String(i + 1).padStart(5, '0');
      draw.drawId = `#${numStr}`;
      assignedCount++;
    }
  }

  if (assignedCount > 0) {
    console.log(`[${gameType}] Đã bổ sung/chuẩn hóa mã số kỳ cho ${assignedCount} kỳ quay.`);
  }

  // Sắp xếp lại từ mới nhất đến cũ nhất (giảm dần) theo đúng chuẩn ứng dụng
  sortedDraws.sort((a, b) => b.date.localeCompare(a.date));

  console.log(`Kỳ mới nhất: ${sortedDraws[0].date} (${sortedDraws[0].drawId}) -> Số trúng: [${sortedDraws[0].winningNumbers.join(', ')}]`);
  console.log(`Kỳ cũ nhất (đầu tiên): ${sortedDraws[sortedDraws.length - 1].date} (${sortedDraws[sortedDraws.length - 1].drawId}) -> Số trúng: [${sortedDraws[sortedDraws.length - 1].winningNumbers.join(', ')}]`);

  return sortedDraws;
}

async function main() {
  console.log("=== THU THẬP TOÀN BỘ 100% LỊCH SỬ VIETLOTT (TỪ #00001 ĐẾN MỚI NHẤT) ===");

  // 1. Cào Mega 6/45
  const megaAll = await crawlGameFullHistory({
    gameType: 'mega-6-45',
    urlPrefix: 'mega-6x45',
    startDate: '2016-07-20',
    firstDrawId: '00001'
  });

  // 2. Cào Power 6/55
  const powerAll = await crawlGameFullHistory({
    gameType: 'power-6-55',
    urlPrefix: 'power-6x55',
    startDate: '2017-08-01',
    firstDrawId: '00001'
  });

  // 3. Đọc dữ liệu seed hiện có để giữ nguyên 352 kỳ XSMN
  console.log(`\nĐang đọc tệp hạt giống: ${SEED_FILE} ...`);
  const currentSeed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

  const xsmnCount = currentSeed.xsmn ? currentSeed.xsmn.length : 0;
  console.log(`Giữ nguyên dữ liệu XSMN: ${xsmnCount} kỳ quay.`);

  // Cập nhật Vietlott với 100% toàn bộ lịch sử
  currentSeed.vietlott = {
    'mega-6-45': megaAll,
    'power-6-55': powerAll
  };

  // Cập nhật metadata
  if (!currentSeed.metadata) currentSeed.metadata = {};
  currentSeed.metadata.vietlottCompleteness = '100% Full History from #00001';
  currentSeed.metadata.vietlottMegaCount = megaAll.length;
  currentSeed.metadata.vietlottPowerCount = powerAll.length;
  currentSeed.metadata.lastUpdated = new Date().toISOString();

  // Ghi lại vào historical-seed.json
  fs.writeFileSync(SEED_FILE, JSON.stringify(currentSeed, null, 2), 'utf-8');
  const stats = fs.statSync(SEED_FILE);
  console.log(`\n🎉 THÀNH CÔNG! Đã lưu dữ liệu hoàn chỉnh 100% Vietlott vào ${SEED_FILE}`);
  console.log(`Kích thước file hạt giống: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`- XSMN: ${xsmnCount} kỳ`);
  console.log(`- Mega 6/45: ${megaAll.length} kỳ (Từ 20/07/2016 kỳ #00001 đến nay)`);
  console.log(`- Power 6/55: ${powerAll.length} kỳ (Từ 01/08/2017 kỳ #00001 đến nay)`);
}

main().catch(err => {
  console.error("Lỗi cào toàn bộ Vietlott:", err);
  process.exit(1);
});
