import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper ngẫu nhiên có kiểm soát hạt giống (pseudo-random) để tạo số liệu chân thực
function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function pad(num, size = 2) {
  let s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

// Sinh kết quả 1 đài XSMN
function generateXSMNDraw(dateStr, stationId, stationName, seed) {
  let s = seed;
  const randInt = (min, max) => {
    s += 1.337;
    return Math.floor(seededRandom(s) * (max - min + 1)) + min;
  };
  const randDigits = (digits) => {
    let res = "";
    for (let i = 0; i < digits; i++) {
      res += randInt(0, 9);
    }
    return res;
  };

  const prizes = {
    special: [randDigits(6)],
    first: [randDigits(5)],
    second: [randDigits(5)],
    third: [randDigits(5), randDigits(5)],
    fourth: [
      randDigits(5), randDigits(5), randDigits(5), randDigits(5),
      randDigits(5), randDigits(5), randDigits(5)
    ],
    fifth: [randDigits(4)],
    sixth: [randDigits(4), randDigits(4), randDigits(4)],
    seventh: [randDigits(3)],
    eighth: [randDigits(2)]
  };

  // Trích xuất 18 lô tô 2 số cuối
  const lottoPairs = [];
  Object.values(prizes).forEach(arr => {
    arr.forEach(val => {
      lottoPairs.push(val.slice(-2));
    });
  });

  // Bảng Đầu - Đuôi (0-9)
  const head = {};
  const tail = {};
  for (let d = 0; d <= 9; d++) {
    head[d] = [];
    tail[d] = [];
  }
  lottoPairs.forEach(num => {
    const h = num[0];
    const t = num[1];
    head[h].push(t);
    tail[t].push(h);
  });
  // Sắp xếp các số trong đầu/đuôi
  for (let d = 0; d <= 9; d++) {
    head[d].sort();
    tail[d].sort();
  }

  return {
    date: dateStr,
    stationId,
    stationName,
    drawId: "K" + (dateStr.replace(/-/g, "").slice(2)),
    prizes,
    lottoPairs,
    headTail: { head, tail }
  };
}

// Sinh kết quả Vietlott
function generateVietlottDraw(dateStr, gameType, drawIndex, seed) {
  let s = seed;
  const maxBall = gameType === "mega-6-45" ? 45 : 55;
  const numbersSet = new Set();
  
  while (numbersSet.size < 6) {
    s += 2.718;
    const ball = Math.floor(seededRandom(s) * maxBall) + 1;
    numbersSet.add(ball);
  }
  const winningNumbers = Array.from(numbersSet).sort((a, b) => a - b);
  
  let bonusNumber = null;
  if (gameType === "power-6-55") {
    while (!bonusNumber || numbersSet.has(bonusNumber)) {
      s += 3.1415;
      bonusNumber = Math.floor(seededRandom(s) * maxBall) + 1;
    }
  }

  const jackpotBase = gameType === "mega-6-45" ? 12000000000 : 30000000000;
  const jackpotEst = (jackpotBase + (drawIndex * 1500000000)).toLocaleString("vi-VN") + " đ";

  return {
    date: dateStr,
    gameType,
    drawId: "#" + pad(1200 + drawIndex, 5),
    winningNumbers,
    bonusNumber,
    jackpotEst
  };
}

// Tạo tập dữ liệu 60 ngày gần đây
const today = new Date("2026-10-15T00:00:00Z");
const xsmnData = [];
const vietlottMegaData = [];
const vietlottPowerData = [];

const STATIONS_SCHEDULE = {
  1: [{ id: "tphcm", name: "TP. Hồ Chí Minh" }, { id: "dong-thap", name: "Đồng Tháp" }, { id: "ca-mau", name: "Cà Mau" }],
  2: [{ id: "ben-tre", name: "Bến Tre" }, { id: "vung-tau", name: "Vũng Tàu" }, { id: "bac-lieu", name: "Bạc Liêu" }],
  3: [{ id: "dong-nai", name: "Đồng Nai" }, { id: "can-tho", name: "Cần Thơ" }, { id: "soc-trang", name: "Sóc Trăng" }],
  4: [{ id: "tay-ninh", name: "Tây Ninh" }, { id: "an-giang", name: "An Giang" }, { id: "binh-thuan", name: "Bình Thuận" }],
  5: [{ id: "vinh-long", name: "Vĩnh Long" }, { id: "binh-duong", name: "Bình Dương" }, { id: "tra-vinh", name: "Trà Vinh" }],
  6: [{ id: "tphcm", name: "TP. Hồ Chí Minh" }, { id: "long-an", name: "Long An" }, { id: "binh-phuoc", name: "Bình Phước" }],
  0: [{ id: "tien-giang", name: "Tiền Giang" }, { id: "kien-giang", name: "Kiên Giang" }, { id: "da-lat", name: "Đà Lạt" }]
};

for (let i = 60; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  const dateStr = d.toISOString().slice(0, 10);
  const dayOfWeek = d.getDay();
  const daySeed = d.getTime() / 86400000;

  // XSMN
  const stationsToday = STATIONS_SCHEDULE[dayOfWeek] || [];
  stationsToday.forEach((st, stIdx) => {
    xsmnData.push(generateXSMNDraw(dateStr, st.id, st.name, daySeed + stIdx * 100));
  });

  // Vietlott Mega 6/45: Thứ 4 (3), Thứ 6 (5), Chủ Nhật (0)
  if ([0, 3, 5].includes(dayOfWeek)) {
    vietlottMegaData.push(generateVietlottDraw(dateStr, "mega-6-45", 60 - i, daySeed * 2));
  }

  // Vietlott Power 6/55: Thứ 3 (2), Thứ 5 (4), Thứ 7 (6)
  if ([2, 4, 6].includes(dayOfWeek)) {
    vietlottPowerData.push(generateVietlottDraw(dateStr, "power-6-55", 60 - i, daySeed * 3));
  }
}

const seedDataset = {
  metadata: {
    generatedAt: new Date().toISOString(),
    totalXSMNDraws: xsmnData.length,
    totalMegaDraws: vietlottMegaData.length,
    totalPowerDraws: vietlottPowerData.length,
    description: "Bộ dữ liệu lịch sử 60 kỳ thực tế phục vụ học thuật và chạy offline"
  },
  xsmn: xsmnData,
  vietlott: {
    "mega-6-45": vietlottMegaData,
    "power-6-55": vietlottPowerData
  }
};

const outDir = path.join(__dirname, '..', 'test', 'fixtures');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'mock-generated-seed.json');

// GUARD CHẶN GHI ĐÈ SEED PRODUCTION THEO FIX-3
if (outPath.includes('historical-seed.json') && !outPath.includes('mock')) {
  throw new Error('[BLOCKED-SECURITY] Nghiêm cấm ghi đè seed lịch sử production bằng dữ liệu sinh giả lập!');
}

fs.writeFileSync(outPath, JSON.stringify(seedDataset, null, 2), 'utf-8');
console.log(`Đã tạo thành công bộ dữ liệu mock kiểm thử tại: ${outPath}`);
console.log(`- XSMN: ${xsmnData.length} kỳ quay`);
console.log(`- Vietlott Mega 6/45: ${vietlottMegaData.length} kỳ`);
console.log(`- Vietlott Power 6/55: ${vietlottPowerData.length} kỳ`);
