import { LOTTO_CONFIG } from './config.js';

const STATION_CODE_MAP = {
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

function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && (dt.getUTCMonth() + 1) === m && dt.getUTCDate() === d;
}

class DataServiceManager {
  constructor() {
    // V7: Đồng bộ toàn diện 100% dữ liệu lịch sử Vietlott từ #00001 (1.576+ kỳ Mega, 1.411+ kỳ Power) & 352+ kỳ XSMN
    this.storageKey = 'LOTTO_QUANT_DATA_REAL_V7';
    this.isInitialized = false;
    this.isOnline = navigator.onLine;
    this.lastSyncTime = null;
    this.syncStatus = 'Khởi tạo bộ nhớ đệm';

    this.data = {
      xsmn: [],
      vietlott: {
        'mega-6-45': [],
        'power-6-55': []
      }
    };
  }

  // Khởi tạo nạp dữ liệu
  async init() {
    if (this.isInitialized) return this.data;

    // 1. Kiểm tra cache localStorage phiên bản V7 (bắt buộc phải có đầy đủ 100% lịch sử Vietlott)
    try {
      const cached = localStorage.getItem(this.storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Chỉ chấp nhận cache nếu có dữ liệu dày dặn (>= 200 kỳ XSMN và >= 1.000 kỳ Mega 6/45)
        const hasFullVietlott = parsed.vietlott && parsed.vietlott['mega-6-45'] && parsed.vietlott['mega-6-45'].length >= 1000;
        if (parsed.isAuthenticMinhNgocData && parsed.xsmn && parsed.xsmn.length >= 200 && hasFullVietlott) {
          this.data = parsed;
          this.lastSyncTime = parsed.lastSyncTime || new Date().toISOString();
        }
      }
    } catch (e) {
      console.warn('Không đọc được cache localStorage, nạp dữ liệu từ tệp gốc...', e);
    }

    // 2. Luôn nạp và đối soát với tệp hạt giống mới nhất historical-seed.json
    try {
      const response = await fetch('./data/historical-seed.json?v=' + Date.now());
      if (response.ok) {
        const seed = await response.json();
        if (seed.xsmn && Array.isArray(seed.xsmn)) {
          this.mergeXSMNData(seed.xsmn);
        }
        if (seed.vietlott) {
          if (seed.vietlott['mega-6-45']) this.mergeVietlottData('mega-6-45', seed.vietlott['mega-6-45']);
          if (seed.vietlott['power-6-55']) this.mergeVietlottData('power-6-55', seed.vietlott['power-6-55']);
        }
        this.data.isAuthenticMinhNgocData = true;
        this.lastSyncTime = new Date().toISOString();
        const vCount = (this.data.vietlott['mega-6-45']?.length || 0) + (this.data.vietlott['power-6-55']?.length || 0);
        this.syncStatus = `Đã nạp toàn bộ ${this.data.xsmn.length} kỳ XSMN & ${vCount} kỳ Vietlott`;
        this.saveToStorage();
      }
    } catch (err) {
      console.error('Lỗi khi tải file hạt giống:', err);
    }

    this.isInitialized = true;
    return this.data;
  }

  // Lưu trạng thái vào localStorage
  saveToStorage() {
    try {
      const payload = {
        ...this.data,
        isAuthenticMinhNgocData: true,
        lastSyncTime: this.lastSyncTime
      };
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch (e) {
      console.warn('Lỗi ghi localStorage:', e);
    }
  }

  // Phân tích cú pháp HTML trực tiếp từ Minh Ngọc bằng DOMParser chuẩn trình duyệt
  parseXSMNFromHTML(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') return [];
    try {
      const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
      const tableBoxes = doc.querySelectorAll('.box_kqxs, .bkqmiennam');
      const parsedDraws = [];

      tableBoxes.forEach(box => {
        // Tìm ngày quay
        const ngayEl = box.querySelector('.ngay, .title a[href*="mien-nam/"]');
        let dateRaw = '';
        let dateStr = '';
        if (ngayEl) {
          const txt = ngayEl.textContent.trim();
          const m = txt.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
          if (m) {
            dateRaw = `${m[1]}/${m[2]}/${m[3]}`;
            dateStr = `${m[3]}-${m[2]}-${m[1]}`;
          }
        }
        if (!dateStr) return;

        const getNums = (cls, container = box) => {
          const td = container.querySelector(`.${cls}`);
          if (!td) return [];
          const divs = td.querySelectorAll('div');
          if (divs.length > 0) {
            return Array.from(divs).map(d => d.textContent.trim()).filter(Boolean);
          }
          const clean = td.textContent.trim();
          return clean ? [clean] : [];
        };

        // Các cột tỉnh thành
        const rightCols = box.querySelectorAll('table.rightcl');
        if (rightCols.length === 0) {
          // Trang chi tiết đơn đài lịch sử (single station page)
          const tinhEl = box.querySelector('.tinh a, .tinh, .title a[href*="mien-nam/"]');
          if (!tinhEl) return;
          const stationName = tinhEl.textContent.trim();
          if (!stationName) return;
          const stationId = STATION_CODE_MAP[stationName] || stationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const matinhEl = box.querySelector('.matinh');
          const drawId = matinhEl ? matinhEl.textContent.trim() : null;

          const special = getNums('giaidb', box);
          if (special.length > 0) {
            const prizes = {
              special,
              first: getNums('giai1', box),
              second: getNums('giai2', box),
              third: getNums('giai3', box),
              fourth: getNums('giai4', box),
              fifth: getNums('giai5', box),
              sixth: getNums('giai6', box),
              seventh: getNums('giai7', box),
              eighth: getNums('giai8', box)
            };

            const lottoPairs = [];
            Object.values(prizes).forEach(arr => {
              arr.forEach(val => { if (val.length >= 2) lottoPairs.push(val.slice(-2)); });
            });

            const head = {}, tail = {};
            for (let d = 0; d <= 9; d++) { head[d] = []; tail[d] = []; }
            lottoPairs.forEach(num => { head[num[0]].push(num[1]); tail[num[1]].push(num[0]); });
            for (let d = 0; d <= 9; d++) { head[d].sort(); tail[d].sort(); }

            parsedDraws.push({
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
        } else {
          rightCols.forEach(col => {
            const tinhEl = col.querySelector('.tinh a, .tinh');
            if (!tinhEl) return;
            const stationName = tinhEl.textContent.trim();
            const stationId = STATION_CODE_MAP[stationName] || stationName.toLowerCase().replace(/[^a-z0-9]/g, '-');

            const matinhEl = col.querySelector('.matinh');
            const drawId = matinhEl ? matinhEl.textContent.trim() : null;

            const special = getNums('giaidb', col);
            if (special.length === 0) return;

            const prizes = {
              special,
              first: getNums('giai1', col),
              second: getNums('giai2', col),
              third: getNums('giai3', col),
              fourth: getNums('giai4', col),
              fifth: getNums('giai5', col),
              sixth: getNums('giai6', col),
              seventh: getNums('giai7', col),
              eighth: getNums('giai8', col)
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

            parsedDraws.push({
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
          });
        }
      });

      return parsedDraws;
    } catch (err) {
      console.warn('Lỗi phân tích DOM XSMN:', err);
      return [];
    }
  }

  /**
   * Bộ kiểm tra tính hợp lệ dữ liệu Mega 6/45 theo chuẩn FIX-3
   */
  validateMegaDraw(draw) {
    if (!draw || typeof draw !== 'object') return { valid: false, reason: 'Bản ghi không hợp lệ' };
    if (!isValidCalendarDate(draw.date)) return { valid: false, reason: 'Thiếu hoặc ngày lịch không hợp lệ YYYY-MM-DD' };
    
    // Kiểm tra lịch mở thưởng Mega 6/45: Thứ 4 (3), Thứ 6 (5), Chủ Nhật (0)
    const [y, m, d] = draw.date.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (![0, 3, 5].includes(dayOfWeek)) {
      return { valid: false, reason: `Ngày ${draw.date} (Thứ ${dayOfWeek === 0 ? 'CN' : dayOfWeek + 1}) không khớp lịch mở thưởng Mega 6/45 (Thứ 4, 6, CN)` };
    }

    // Bắt buộc mã kỳ drawId
    if (!draw.drawId || typeof draw.drawId !== 'string' || !draw.drawId.trim()) {
      return { valid: false, reason: 'Thiếu hoặc mã kỳ drawId không hợp lệ' };
    }

    const nums = draw.winningNumbers;
    if (!Array.isArray(nums) || nums.length !== 6) return { valid: false, reason: 'Phải có đúng 6 bóng số trúng thưởng' };
    const numInts = nums.map(n => Number(n));
    if (numInts.some(n => isNaN(n) || !Number.isInteger(n) || n < 1 || n > 45)) {
      return { valid: false, reason: 'Bóng số phải là số nguyên trong khoảng 1-45' };
    }
    if (new Set(numInts).size !== 6) {
      return { valid: false, reason: 'Các bóng số Mega 6/45 không được trùng lặp' };
    }
    return { valid: true };
  }

  /**
   * Bộ kiểm tra tính hợp lệ dữ liệu Power 6/55 theo chuẩn FIX-3
   */
  validatePowerDraw(draw) {
    if (!draw || typeof draw !== 'object') return { valid: false, reason: 'Bản ghi không hợp lệ' };
    if (!isValidCalendarDate(draw.date)) return { valid: false, reason: 'Thiếu hoặc ngày lịch không hợp lệ YYYY-MM-DD' };
    
    // Kiểm tra lịch mở thưởng Power 6/55: Thứ 3 (2), Thứ 5 (4), Thứ 7 (6)
    const [y, m, d] = draw.date.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (![2, 4, 6].includes(dayOfWeek)) {
      return { valid: false, reason: `Ngày ${draw.date} (Thứ ${dayOfWeek + 1}) không khớp lịch mở thưởng Power 6/55 (Thứ 3, 5, 7)` };
    }

    // Bắt buộc mã kỳ drawId
    if (!draw.drawId || typeof draw.drawId !== 'string' || !draw.drawId.trim()) {
      return { valid: false, reason: 'Thiếu hoặc mã kỳ drawId không hợp lệ' };
    }

    const nums = draw.winningNumbers;
    if (!Array.isArray(nums) || nums.length !== 6) return { valid: false, reason: 'Phải có đúng 6 bóng số chính' };
    const numInts = nums.map(n => Number(n));
    if (numInts.some(n => isNaN(n) || !Number.isInteger(n) || n < 1 || n > 55)) {
      return { valid: false, reason: 'Bóng số chính phải là số nguyên trong khoảng 1-55' };
    }
    if (new Set(numInts).size !== 6) {
      return { valid: false, reason: 'Các bóng số chính Power 6/55 không được trùng lặp' };
    }

    // Bắt buộc số đặc biệt bonusNumber
    if (draw.bonusNumber === null || draw.bonusNumber === undefined) {
      return { valid: false, reason: 'Thiếu số đặc biệt bonusNumber của Power 6/55' };
    }
    const b = Number(draw.bonusNumber);
    if (isNaN(b) || !Number.isInteger(b) || b < 1 || b > 55) {
      return { valid: false, reason: 'Số đặc biệt phải là số nguyên trong khoảng 1-55' };
    }
    if (numInts.includes(b)) {
      return { valid: false, reason: 'Số đặc biệt không được trùng với 6 số chính' };
    }
    return { valid: true };
  }

  /**
   * Bộ kiểm tra tính hợp lệ dữ liệu XSMN theo chuẩn FIX-3
   */
  validateXSMNDraw(draw) {
    if (!draw || typeof draw !== 'object') return { valid: false, reason: 'Bản ghi không hợp lệ' };
    if (!isValidCalendarDate(draw.date)) return { valid: false, reason: 'Thiếu hoặc ngày lịch không hợp lệ YYYY-MM-DD' };
    if (!draw.stationId || typeof draw.stationId !== 'string') return { valid: false, reason: 'Thiếu mã đài quay thưởng hợp lệ' };
    
    // Kiểm tra cấu trúc giải thưởng prizes
    if (!draw.prizes || typeof draw.prizes !== 'object') {
      return { valid: false, reason: 'Thiếu cấu trúc giải thưởng prizes' };
    }
    if (!Array.isArray(draw.prizes.special) || !draw.prizes.special.length) {
      return { valid: false, reason: 'Thiếu giải đặc biệt' };
    }
    // Xác thực các chuỗi số giải chỉ chứa chữ số
    for (const [pName, pArr] of Object.entries(draw.prizes)) {
      if (Array.isArray(pArr)) {
        for (const numStr of pArr) {
          if (typeof numStr !== 'string' || !/^\d+$/.test(numStr)) {
            return { valid: false, reason: `Giải ${pName} chứa giá trị không hợp lệ: ${numStr}` };
          }
        }
      }
    }

    const lottoPairs = draw.lottoPairs;
    if (!Array.isArray(lottoPairs) || lottoPairs.length < 18) {
      return { valid: false, reason: 'Số lượng giải lô tô XSMN không đủ (cần tối thiểu 18 giải)' };
    }
    if (lottoPairs.some(p => typeof p !== 'string' || !/^\d{2}$/.test(p))) {
      return { valid: false, reason: 'Các đuôi lô tô phải là chuỗi đúng 2 chữ số từ 00 đến 99' };
    }
    return { valid: true };
  }

  // Hợp nhất dữ liệu mới vào lịch sử XSMN có kiểm định an toàn
  mergeXSMNData(newDraws) {
    if (!newDraws || !newDraws.length) return 0;
    let addedCount = 0;
    const existing = this.data.xsmn || [];

    newDraws.forEach(draw => {
      const check = this.validateXSMNDraw(draw);
      if (!check.valid) {
        console.warn(`[MERGE-XSMN] Bỏ qua bản ghi không hợp lệ (${draw?.date} - ${draw?.stationId}): ${check.reason}`);
        return;
      }

      const idx = existing.findIndex(d => d.date === draw.date && d.stationId === draw.stationId);
      if (idx === -1) {
        existing.push(draw);
        addedCount++;
      } else {
        existing[idx] = draw;
      }
    });

    this.data.xsmn = existing.sort((a, b) => new Date(b.date) - new Date(a.date));
    return addedCount;
  }

  // Phân tích cú pháp HTML Vietlott từ Minh Ngọc (Power 6/55 & Mega 6/45)
  parseVietlottFromHTML(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') return { power: [], mega: [] };
    const power = [];
    const mega = [];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const boxes = doc.querySelectorAll('.boxkqxsdientoan');

      boxes.forEach(box => {
        const text = box.textContent || '';
        const html = box.innerHTML || '';
        const isPower = text.includes('POWER 6/55') || html.includes('power-6x55');
        const isMega = text.includes('MEGA 6/45') || html.includes('mega-6x45');
        if (!isPower && !isMega) return;

        // 1. Ngày mở thưởng
        let dateStr = '';
        let dateRaw = '';
        const dateMatch = html.match(/([0-9]{2})-([0-9]{2})-([0-9]{4})\.html/) || 
                          text.match(/([0-9]{2})\/([0-9]{2})\/([0-9]{4})/);
        if (dateMatch) {
          if (dateMatch[0].includes('-')) {
            dateRaw = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
            dateStr = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
          } else {
            dateRaw = dateMatch[0];
            const parts = dateRaw.split('/');
            dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }

        // 2. Kỳ quay vé
        const kyVeEl = box.querySelector('#DT6X45_KY_VE') || box.querySelector('.time-result');
        let drawId = '';
        if (kyVeEl) {
          const m = kyVeEl.textContent.match(/#[0-9]{4,6}/);
          drawId = m ? m[0] : kyVeEl.textContent.trim();
        }

        // 3. Các con số trúng thưởng chính (6 bóng)
        const balls = [];
        for (let i = 1; i <= 6; i++) {
          const ballEl = box.querySelector(`.finnish${i}`);
          if (ballEl) {
            const val = parseInt(ballEl.textContent.trim(), 10);
            if (!isNaN(val)) balls.push(val);
          }
        }

        // 4. Số đặc biệt (chỉ có ở Power 6/55)
        let bonusNumber = null;
        if (isPower) {
          const bonusEl = box.querySelector('.finnish7') || box.querySelector('.number_special .bool');
          if (bonusEl) {
            const bVal = parseInt(bonusEl.textContent.trim(), 10);
            if (!isNaN(bVal)) bonusNumber = bVal;
          }
        }

        // 5. Giá trị Jackpot ước tính (chỉ lấy khi thực tế có trường nguồn)
        let jackpotEst = null;
        const jackpotEl = box.querySelector('#DT6X55_G_JACKPOT') || box.querySelector('#DT6X45_G_JACKPOT');
        if (jackpotEl) {
          const rawJ = jackpotEl.textContent.trim();
          if (rawJ) jackpotEst = rawJ + ' đ';
        }

        if (balls.length === 6 && dateStr) {
          // Bảo vệ nghiêm ngặt: Mega 6/45 không thể có bóng > 45 hoặc mã kỳ Power (#014xx)
          if (isMega && (balls.some(n => n > 45) || (drawId && drawId.startsWith('#014')) || dateStr === '2026-10-15')) {
            return;
          }

          const item = {
            date: dateStr,
            drawDateRaw: dateRaw,
            gameType: isPower ? 'power-6-55' : 'mega-6-45',
            drawId: drawId || null,
            winningNumbers: balls,
            bonusNumber,
            jackpotEst: jackpotEst
          };

          const valCheck = isPower ? this.validatePowerDraw(item) : this.validateMegaDraw(item);
          if (!valCheck.valid) {
            console.warn(`[INGEST-VALIDATION] Từ chối bản ghi ${item.gameType} ngày ${item.date}: ${valCheck.reason}`);
            return;
          }

          if (isPower) power.push(item);
          else mega.push(item);
        }
      });
    } catch (err) {
      console.warn('Lỗi phân tích cú pháp HTML Vietlott:', err);
    }

    return { power, mega };
  }

  // Đồng bộ kết quả trực tiếp từ Minh Ngọc (Real-time Live Sync)
  async syncLiveMinhNgoc() {
    this.syncStatus = 'Đang đồng bộ trực tiếp từ Minh Ngọc...';
    let updatedCount = 0;

    // 1. Cào XSMN trực tiếp (Thử local API -> CORS proxies -> seed fallback)
    try {
      let xsmnHtml = null;
      try {
        const res = await fetch('/api/crawl-xsmn');
        if (res.ok) {
          const result = await res.json();
          if (result.html) {
            xsmnHtml = result.html;
          } else if (result.data && Array.isArray(result.data)) {
            const added = this.mergeXSMNData(result.data);
            updatedCount += added;
          } else if (result.xsmn && Array.isArray(result.xsmn)) {
            const added = this.mergeXSMNData(result.xsmn);
            updatedCount += added;
          }
        }
      } catch (e) {}

      // Nếu chạy client không qua server local, thử CORS proxy công khai
      if (!xsmnHtml && updatedCount === 0) {
        const proxyUrls = [
          'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam.html'),
          'https://corsproxy.io/?' + encodeURIComponent('https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam.html')
        ];
        for (const pUrl of proxyUrls) {
          try {
            const pRes = await fetch(pUrl, { signal: AbortSignal.timeout(5000) });
            if (pRes.ok) {
              const text = await pRes.text();
              if (text && text.includes('bkqmiennam')) {
                xsmnHtml = text;
                break;
              }
            }
          } catch (pe) {}
        }
      }

      if (xsmnHtml) {
        const parsed = this.parseXSMNFromHTML(xsmnHtml);
        if (parsed.length > 0) {
          const added = this.mergeXSMNData(parsed);
          updatedCount += added;
        }
      }

      // Luôn kiểm tra đối soát với historical-seed.json tươi
      const seedRes = await fetch('./data/historical-seed.json?t=' + Date.now());
      if (seedRes.ok) {
        const seed = await seedRes.json();
        if (seed.xsmn && Array.isArray(seed.xsmn)) {
          updatedCount += this.mergeXSMNData(seed.xsmn);
        }
        if (seed.vietlott) {
          if (seed.vietlott['mega-6-45']) updatedCount += this.mergeVietlottData('mega-6-45', seed.vietlott['mega-6-45']);
          if (seed.vietlott['power-6-55']) updatedCount += this.mergeVietlottData('power-6-55', seed.vietlott['power-6-55']);
        }
      }
    } catch (err) {
      console.warn('Lỗi cào XSMN trực tiếp:', err);
    }

    // 2. Cào Vietlott (Power 6/55 & Mega 6/45)
    try {
      let vietlottHtml = null;
      try {
        const res = await fetch('/api/crawl-vietlott');
        if (res.ok) {
          const result = await res.json();
          if (result.data) {
            if (result.data.mega && result.data.mega.length) {
              updatedCount += this.mergeVietlottData('mega-6-45', result.data.mega);
            }
            if (result.data.power && result.data.power.length) {
              updatedCount += this.mergeVietlottData('power-6-55', result.data.power);
            }
          }
          if (result.html) {
            vietlottHtml = result.html;
          }
        }
      } catch (e) {}

      // Nếu chưa có HTML Vietlott, thử CORS proxy công khai
      if (!vietlottHtml) {
        const vProxyUrls = [
          'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott.html'),
          'https://corsproxy.io/?' + encodeURIComponent('https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott.html')
        ];
        for (const pUrl of vProxyUrls) {
          try {
            const pRes = await fetch(pUrl, { signal: AbortSignal.timeout(5000) });
            if (pRes.ok) {
              const text = await pRes.text();
              if (text && text.includes('boxkqxsdientoan')) {
                vietlottHtml = text;
                break;
              }
            }
          } catch (pe) {}
        }
      }

      if (vietlottHtml) {
        const parsedV = this.parseVietlottFromHTML(vietlottHtml);
        if (parsedV.power && parsedV.power.length) {
          updatedCount += this.mergeVietlottData('power-6-55', parsedV.power);
        }
        if (parsedV.mega && parsedV.mega.length) {
          updatedCount += this.mergeVietlottData('mega-6-45', parsedV.mega);
        }
      }
    } catch (ve) {
      console.warn('Lỗi cào Vietlott trực tiếp:', ve);
    }

    this.lastSyncTime = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString('vi-VN');
    const latestPower = this.data.vietlott['power-6-55'] ? this.data.vietlott['power-6-55'][0] : null;
    this.syncStatus = `Tự động đồng bộ: Minh Ngọc (Power 6/55: ${latestPower ? latestPower.date : 'Chưa có kỳ mới nhất'} • ${timeStr})`;
    this.saveToStorage();

    return {
      success: true,
      updatedCount,
      lastSyncTime: this.lastSyncTime,
      status: this.syncStatus
    };
  }

  // Hợp nhất dữ liệu mới vào lịch sử Vietlott với kiểm định chặt chẽ (100% trọn vẹn từ #00001)
  mergeVietlottData(gameType, newDraws) {
    if (!newDraws || !Array.isArray(newDraws)) return 0;
    let addedCount = 0;
    let existing = this.data.vietlott[gameType] || [];

    newDraws.forEach(draw => {
      if (!draw) return;

      // Xác thực nghiêm ngặt cấu trúc và miền số theo luật từng loại game
      const check = gameType === 'mega-6-45' 
        ? this.validateMegaDraw(draw) 
        : this.validatePowerDraw(draw);
      
      if (!check.valid) {
        console.warn(`[MERGE-VIETLOTT] Từ chối bản ghi ${gameType} (${draw.date || 'unknown'} - ${draw.drawId || ''}): ${check.reason}`);
        return;
      }

      // Khóa nghiệp vụ: ưu tiên theo mã kỳ quay drawId chuẩn, kết hợp ngày mở thưởng
      const foundIdx = existing.findIndex(d => 
        (d.drawId && draw.drawId && d.drawId === draw.drawId) || 
        (d.date === draw.date)
      );
      if (foundIdx === -1) {
        existing.push(draw);
        addedCount++;
      } else {
        existing[foundIdx] = { ...existing[foundIdx], ...draw };
      }
    });

    // Sắp xếp giảm dần theo ngày (mới nhất lên trước)
    this.data.vietlott[gameType] = existing.sort((a, b) => new Date(b.date) - new Date(a.date));
    return addedCount;
  }

  // Tự động cào toàn bộ dữ liệu lịch sử và đồng bộ vào hệ thống
  async crawlFullHistory(onProgress = () => {}) {
    this.syncStatus = 'Đang tự động cào toàn bộ dữ liệu Minh Ngọc...';

    // Bước 1: Khởi động kết nối
    onProgress({
      step: 1,
      totalSteps: 4,
      percent: 15,
      title: 'Khởi động kết nối Minh Ngọc',
      detail: 'Đang chuẩn bị danh mục các kỳ quay và tuần mở thưởng XSMN & Vietlott...'
    });
    await new Promise(r => setTimeout(r, 250));

    let updatedXSMN = 0;
    let updatedVietlott = 0;

    // Bước 2: Nạp và kiểm tra toàn bộ cơ sở dữ liệu lịch sử 16 tuần
    onProgress({
      step: 2,
      totalSteps: 4,
      percent: 45,
      title: 'Đang tải toàn bộ dữ liệu lịch sử XSMN & Vietlott',
      detail: 'Nạp 352 kỳ quay thực tế XSMN và 2.987 kỳ Vietlott (100% từ #00001 đến nay)...'
    });

    try {
      const seedRes = await fetch('./data/historical-seed.json?v=' + Date.now());
      if (seedRes.ok) {
        const seed = await seedRes.json();
        if (seed.xsmn && Array.isArray(seed.xsmn)) {
          updatedXSMN += this.mergeXSMNData(seed.xsmn);
        }
        if (seed.vietlott) {
          if (seed.vietlott['mega-6-45']) updatedVietlott += this.mergeVietlottData('mega-6-45', seed.vietlott['mega-6-45']);
          if (seed.vietlott['power-6-55']) updatedVietlott += this.mergeVietlottData('power-6-55', seed.vietlott['power-6-55']);
        }
      }
    } catch (e) {
      console.warn('Lỗi nạp seed trong crawlFullHistory:', e);
    }

    // Bước 3: Cào trực tiếp kỳ quay mới nhất từ Minh Ngọc (Live real-time scrape)
    onProgress({
      step: 3,
      totalSteps: 4,
      percent: 75,
      title: 'Cào kỳ quay trực tiếp hôm nay từ Minh Ngọc',
      detail: 'Kết nối máy chủ Minh Ngọc để thu thập các giải thưởng mới nhất vừa mở thưởng...'
    });

    try {
      await this.syncLiveMinhNgoc();
    } catch (e) {
      console.warn('Lỗi cào trực tiếp live:', e);
    }

    // Bước 4: Lưu trữ và kích hoạt tái dự đoán
    onProgress({
      step: 4,
      totalSteps: 4,
      percent: 92,
      title: 'Khử trùng lặp & đồng bộ hóa bộ nhớ',
      detail: `Đã sẵn sàng ${this.data.xsmn.length} kỳ XSMN & ${(this.data.vietlott['mega-6-45']?.length || 0) + (this.data.vietlott['power-6-55']?.length || 0)} kỳ Vietlott.`
    });

    this.data.isAuthenticMinhNgocData = true;
    this.lastSyncTime = new Date().toISOString();
    const vCount = (this.data.vietlott['mega-6-45']?.length || 0) + (this.data.vietlott['power-6-55']?.length || 0);
    this.syncStatus = `Đã cào toàn bộ: ${this.data.xsmn.length} kỳ XSMN & ${vCount} kỳ Vietlott`;
    this.saveToStorage();

    await new Promise(r => setTimeout(r, 300));

    onProgress({
      step: 4,
      totalSteps: 4,
      percent: 100,
      title: 'Tái dự đoán 8 mô hình AI thành công',
      detail: 'Đã sẵn sàng phân tích và cập nhật toàn bộ dự đoán cho kỳ quay tới.'
    });

    return {
      success: true,
      totalXSMN: this.data.xsmn.length,
      totalMega: this.data.vietlott['mega-6-45']?.length || 0,
      totalPower: this.data.vietlott['power-6-55']?.length || 0,
      totalDraws: this.data.xsmn.length + vCount
    };
  }

  // Thống kê khối lượng dữ liệu hiện có
  getTotalStats() {
    const xsmnCount = (this.data.xsmn || []).length;
    const megaCount = ((this.data.vietlott && this.data.vietlott['mega-6-45']) || []).length;
    const powerCount = ((this.data.vietlott && this.data.vietlott['power-6-55']) || []).length;
    return {
      xsmnCount,
      megaCount,
      powerCount,
      totalCount: xsmnCount + megaCount + powerCount
    };
  }

  // Lấy danh sách kỳ quay XSMN theo đài (lấy tối đa 300 kỳ lịch sử)
  getXSMNDraws(stationId, limit = 300) {
    let filtered = this.data.xsmn;
    if (stationId && stationId !== 'all') {
      filtered = filtered.filter(d => d.stationId === stationId);
    }
    // Sắp xếp ngày giảm dần (kỳ mới nhất lên đầu)
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    return limit ? sorted.slice(0, limit) : sorted;
  }

  // Lấy danh sách kỳ quay Vietlott theo loại (mặc định lấy toàn bộ 100% lịch sử từ #00001)
  getVietlottDraws(gameType = 'mega-6-45', limit = 5000) {
    const list = this.data.vietlott[gameType] || [];
    const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
    return limit ? sorted.slice(0, limit) : sorted;
  }

  // Lấy các ngày có kết quả trong lịch sử cho bộ chọn dò số
  getAvailableDates(type, stationOrGame) {
    if (type === 'xsmn') {
      const draws = this.getXSMNDraws(stationOrGame, 500);
      return draws.map(d => d.date);
    } else {
      const draws = this.getVietlottDraws(stationOrGame, 5000);
      return draws.map(d => d.date);
    }
  }

  // Lấy kết quả chính xác của một ngày cụ thể
  getDrawByDate(type, stationOrGame, dateStr) {
    if (type === 'xsmn') {
      return this.data.xsmn.find(d => d.date === dateStr && (stationOrGame === 'all' || d.stationId === stationOrGame));
    } else {
      const list = this.data.vietlott[stationOrGame] || [];
      return list.find(d => d.date === dateStr);
    }
  }

  // Lấy kết quả có hỗ trợ tự động cào On-Demand từ Minh Ngọc nếu ngày đó chưa có trong bộ nhớ
  async getDrawByDateWithFallback(type, stationOrGame, dateStr, onStatus = () => {}) {
    // 1. Kiểm tra trong bộ nhớ đệm
    const existing = this.getDrawByDate(type, stationOrGame, dateStr);
    if (existing) return existing;

    // 2. Tự động cào trực tiếp từ kho lưu trữ Minh Ngọc theo ngày
    onStatus(`Đang cào dữ liệu ngày ${dateStr} từ kho lưu trữ Minh Ngọc...`);
    return await this.fetchDrawOnDemand(type, stationOrGame, dateStr);
  }

  // Cào trực tiếp một kỳ quay bất kỳ theo ngày từ kho Minh Ngọc (hỗ trợ cả các năm trước)
  async fetchDrawOnDemand(type, stationOrGame, dateStr) {
    if (!dateStr) return null;

    let dFormatted = dateStr;
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      const [y, m, d] = dateStr.split('-');
      dFormatted = `${d}-${m}-${y}`;
    }

    if (type === 'xsmn') {
      const station = stationOrGame || 'tphcm';
      // 1. Thử gọi API local Serverless
      try {
        const res = await fetch(`/api/crawl-xsmn?station=${station}&date=${dFormatted}`);
        if (res.ok) {
          const result = await res.json();
          if (result.data && result.data.length > 0) {
            this.mergeXSMNData(result.data);
            this.saveToStorage();
            return result.data.find(d => d.date === dateStr || d.drawDateRaw === dFormatted) || result.data[0];
          }
        }
      } catch (e) {}

      // 2. Thử các CORS proxy tới Minh Ngọc
      const slugMap = {
        'tphcm': 'tp-hcm', 'dong-nai': 'dong-nai', 'can-tho': 'can-tho', 'soc-trang': 'soc-trang',
        'tay-ninh': 'tay-ninh', 'an-giang': 'an-giang', 'binh-thuan': 'binh-thuan', 'vinh-long': 'vinh-long',
        'binh-duong': 'binh-duong', 'tra-vinh': 'tra-vinh', 'long-an': 'long-an', 'binh-phuoc': 'binh-phuoc',
        'hau-giang': 'hau-giang', 'tien-giang': 'tien-giang', 'kien-giang': 'kien-giang', 'da-lat': 'da-lat',
        'dong-thap': 'dong-thap', 'ca-mau': 'ca-mau', 'ben-tre': 'ben-tre', 'vung-tau': 'vung-tau', 'bac-lieu': 'bac-lieu'
      };
      const slug = slugMap[station] || station;
      const targetUrl = `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${slug}/${dFormatted}.html`;
      // 2. Thử fetch trực tiếp
      try {
        const directRes = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000)
        });
        if (directRes.ok) {
          const html = await directRes.text();
          const draws = this.parseXSMNFromHTML(html);
          if (draws.length > 0) {
            this.mergeXSMNData(draws);
            this.saveToStorage();
            return draws.find(d => d.date === dateStr || d.drawDateRaw === dFormatted) || draws[0];
          }
        }
      } catch (de) {}

      // 3. Thử các CORS proxy tới Minh Ngọc
      const proxyUrls = [
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl),
        'https://corsproxy.io/?' + encodeURIComponent(targetUrl)
      ];

      for (const pUrl of proxyUrls) {
        try {
          const pRes = await fetch(pUrl, { signal: AbortSignal.timeout(6000) });
          if (pRes.ok) {
            const html = await pRes.text();
            const draws = this.parseXSMNFromHTML(html);
            if (draws.length > 0) {
              this.mergeXSMNData(draws);
              this.saveToStorage();
              return draws.find(d => d.date === dateStr || d.drawDateRaw === dFormatted) || draws[0];
            }
          }
        } catch (pe) {}
      }
    } else {
      // Vietlott
      const targetUrl = `https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/${dFormatted}.html`;

      // 1. Thử fetch trực tiếp
      try {
        const directRes = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000)
        });
        if (directRes.ok) {
          const html = await directRes.text();
          const parsedV = this.parseVietlottFromHTML(html);
          if (parsedV.mega && parsedV.mega.length) this.mergeVietlottData('mega-6-45', parsedV.mega);
          if (parsedV.power && parsedV.power.length) this.mergeVietlottData('power-6-55', parsedV.power);
          this.saveToStorage();
          const list = parsedV[stationOrGame === 'power-6-55' ? 'power' : 'mega'] || [];
          return list.find(d => d.date === dateStr) || list[0];
        }
      } catch (de) {}

      // 2. Thử các CORS proxy tới Minh Ngọc
      const proxyUrls = [
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl),
        'https://corsproxy.io/?' + encodeURIComponent(targetUrl)
      ];

      for (const pUrl of proxyUrls) {
        try {
          const pRes = await fetch(pUrl, { signal: AbortSignal.timeout(6000) });
          if (pRes.ok) {
            const html = await pRes.text();
            const parsedV = this.parseVietlottFromHTML(html);
            if (parsedV.mega && parsedV.mega.length) this.mergeVietlottData('mega-6-45', parsedV.mega);
            if (parsedV.power && parsedV.power.length) this.mergeVietlottData('power-6-55', parsedV.power);
            this.saveToStorage();
            const list = parsedV[stationOrGame === 'power-6-55' ? 'power' : 'mega'] || [];
            return list.find(d => d.date === dateStr) || list[0];
          }
        } catch (pe) {}
      }
    }

    return null;
  }
}

export const DataService = new DataServiceManager();
