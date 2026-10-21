/**
 * LOTTO-QUANT LAB: Hệ thống Cấu hình Toàn cục
 * Chứa lịch quay các đài XSMN, các giải thưởng Vietlott, và metadata của 8 thuật toán
 */

export const LOTTO_CONFIG = {
  APP_NAME: "LOTTO-QUANT LAB",
  VERSION: "1.0.0",

  // Cấu hình các đài Xổ số Miền Nam (XSMN) theo ngày trong tuần
  XSMN_SCHEDULE: {
    1: [ // Thứ 2
      { id: "tphcm", name: "TP. Hồ Chí Minh", code: "TP" },
      { id: "dong-thap", name: "Đồng Tháp", code: "DT" },
      { id: "ca-mau", name: "Cà Mau", code: "CM" }
    ],
    2: [ // Thứ 3
      { id: "ben-tre", name: "Bến Tre", code: "BT" },
      { id: "vung-tau", name: "Vũng Tàu", code: "VT" },
      { id: "bac-lieu", name: "Bạc Liêu", code: "BL" }
    ],
    3: [ // Thứ 4
      { id: "dong-nai", name: "Đồng Nai", code: "DN" },
      { id: "can-tho", name: "Cần Thơ", code: "CT" },
      { id: "soc-trang", name: "Sóc Trăng", code: "ST" }
    ],
    4: [ // Thứ 5
      { id: "tay-ninh", name: "Tây Ninh", code: "TN" },
      { id: "an-giang", name: "An Giang", code: "AG" },
      { id: "binh-thuan", name: "Bình Thuận", code: "BTH" }
    ],
    5: [ // Thứ 6
      { id: "vinh-long", name: "Vĩnh Long", code: "VL" },
      { id: "binh-duong", name: "Bình Dương", code: "BD" },
      { id: "tra-vinh", name: "Trà Vinh", code: "TV" }
    ],
    6: [ // Thứ 7
      { id: "tphcm", name: "TP. Hồ Chí Minh", code: "TP" },
      { id: "long-an", name: "Long An", code: "LA" },
      { id: "binh-phuoc", name: "Bình Phước", code: "BP" },
      { id: "hau-giang", name: "Hậu Giang", code: "HG" }
    ],
    0: [ // Chủ Nhật
      { id: "tien-giang", name: "Tiền Giang", code: "TG" },
      { id: "kien-giang", name: "Kiên Giang", code: "KG" },
      { id: "da-lat", name: "Đà Lạt (Lâm Đồng)", code: "DL" }
    ]
  },

  // Tất cả các đài XSMN
  ALL_STATIONS: [
    { id: "tphcm", name: "TP. Hồ Chí Minh" },
    { id: "dong-nai", name: "Đồng Nai" },
    { id: "can-tho", name: "Cần Thơ" },
    { id: "tay-ninh", name: "Tây Ninh" },
    { id: "an-giang", name: "An Giang" },
    { id: "tien-giang", name: "Tiền Giang" },
    { id: "vung-tau", name: "Vũng Tàu" },
    { id: "vinh-long", name: "Vĩnh Long" },
    { id: "binh-duong", name: "Bình Dương" },
    { id: "ben-tre", name: "Bến Tre" },
    { id: "dong-thap", name: "Đồng Tháp" },
    { id: "long-an", name: "Long An" },
    { id: "kien-giang", name: "Kiên Giang" },
    { id: "ca-mau", name: "Cà Mau" },
    { id: "bac-lieu", name: "Bạc Liêu" },
    { id: "soc-trang", name: "Sóc Trăng" },
    { id: "tra-vinh", name: "Trà Vinh" },
    { id: "binh-phuoc", name: "Bình Phước" },
    { id: "hau-giang", name: "Hậu Giang" },
    { id: "da-lat", name: "Đà Lạt" },
    { id: "binh-thuan", name: "Bình Thuận" }
  ],

  // Cấu hình Vietlott
  VIETLOTT_GAMES: {
    "mega-6-45": {
      name: "Mega 6/45",
      totalBalls: 45,
      pickBalls: 6,
      hasBonusBall: false,
      drawDays: [3, 5, 0], // Thứ 4, 6, Chủ nhật (0)
      urlSlug: "mega-6-45"
    },
    "power-6-55": {
      name: "Power 6/55",
      totalBalls: 55,
      pickBalls: 6,
      hasBonusBall: true,
      drawDays: [2, 4, 6], // Thứ 3, 5, 7
      urlSlug: "power-6-55"
    }
  },

  // Danh mục 8 Thuật toán định lượng
  ALGORITHMS: [
    {
      id: "poisson",
      name: "Phân phối Poisson",
      code: "ALG-01",
      icon: "fa-chart-area",
      category: "Xác suất Thống kê",
      formula: "P(X = k) = (λ^k * e^-λ) / k!",
      summary: "Ước lượng kỳ vọng xuất hiện dựa trên tốc độ Poisson qua các kỳ gần nhất.",
      defaultWeight: 0.15
    },
    {
      id: "markov",
      name: "Chuỗi Markov Bậc 1",
      code: "ALG-02",
      icon: "fa-project-diagram",
      category: "Quá trình Ngẫu nhiên",
      formula: "P(S_t = j | S_{t-1} = i) = Count(i → j) / Count(i)",
      summary: "Tính toán xác suất chuyển trạng thái từ kết quả kỳ trước sang kỳ tiếp theo.",
      defaultWeight: 0.18
    },
    {
      id: "monte-carlo",
      name: "Mô phỏng Monte Carlo (10k)",
      code: "ALG-03",
      icon: "fa-dice",
      category: "Mô phỏng Số học",
      formula: "CDF(x) = ∫ P(t) dt qua 10.000 kịch bản ngẫu nhiên",
      summary: "Chạy 10.000 lượt quay ảo với trọng số xác suất tích lũy để tìm điểm hội tụ.",
      defaultWeight: 0.15
    },
    {
      id: "frequency-gap",
      name: "Tần suất & Chu kỳ Lô Gan",
      code: "ALG-04",
      icon: "fa-fire-alt",
      category: "Phân tích Chu kỳ",
      formula: "Ripeness = CurrentGap / AvgCycle",
      summary: "Phát hiện số nóng (Hot) và số chín muồi chạm ngưỡng chu kỳ cực đại (Max Gan).",
      defaultWeight: 0.12
    },
    {
      id: "moving-average",
      name: "EMA & Chu kỳ Thứ",
      code: "ALG-05",
      icon: "fa-chart-line",
      category: "Chuỗi Thời gian",
      formula: "EMA_t = α * X_t + (1 - α) * EMA_{t-1}",
      summary: "Đo lường xu hướng biến động và tính chất chu kỳ định kỳ theo thứ trong tuần.",
      defaultWeight: 0.10
    },
    {
      id: "clustering",
      name: "Đặc trưng Cấu trúc & Tổng",
      code: "ALG-06",
      icon: "fa-cubes",
      category: "Phân tích Cấu trúc",
      formula: "Score(x) = f(Parity, High/Low, Mean Distance, Freq)",
      summary: "Đánh giá cấu trúc phân bổ chẵn/lẻ, tài/xỉu và xu hướng hồi quy về trung bình.",
      defaultWeight: 0.10
    },
    {
      id: "association-rules",
      name: "Khai phá Luật Bạc Nhớ",
      code: "ALG-07",
      icon: "fa-link",
      category: "Khai phá Dữ liệu",
      formula: "Lift(A → B) = P(A ∩ B) / [P(A) * P(B)]",
      summary: "Khai phá quy luật chuyển tiếp theo chu kỳ giữa các con số qua các kỳ mở thưởng.",
      defaultWeight: 0.10
    },
    {
      id: "ensemble",
      name: "Mô hình Tổng Hợp (Ensemble)",
      code: "ALG-08",
      icon: "fa-brain",
      category: "Học máy Tổng hợp",
      formula: "Score(i) = ∑ [w_k * S_k(i)] (Normalized Soft Voting)",
      summary: "Hợp nhất đa thuật toán bằng cơ chế bỏ phiếu có trọng số (Weighted Soft Voting).",
      defaultWeight: 1.0 // Bản thân Ensemble là bộ tổng hợp
    }
  ],

  // Nguồn cào dữ liệu gốc
  DATA_SOURCES: {
    VIETLOTT_URL: "https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott.html",
    XSMN_URL: "https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam.html",
    // CORS proxy dự phòng khi client gọi trực tiếp
    CORS_PROXIES: [
      "https://api.allorigins.win/raw?url=",
      "https://corsproxy.io/?"
    ]
  },

  /**
   * Lấy danh sách các thứ trong tuần (0: CN, 1: T2, ... 6: T7) đài XSMN quay thưởng
   */
  getDrawDaysForStation(stationId) {
    if (!stationId) return [1, 6]; // Mặc định TPHCM
    const days = [];
    for (const [dayStr, stations] of Object.entries(this.XSMN_SCHEDULE)) {
      if (stations.some(s => s.id === stationId)) {
        days.push(Number(dayStr));
      }
    }
    return days.length > 0 ? days : [1];
  },

  /**
   * Lấy danh sách thứ quay thưởng của game Vietlott
   */
  getDrawDaysForGame(gameId) {
    const game = this.VIETLOTT_GAMES[gameId];
    return game ? game.drawDays : [3, 5, 0];
  },

  /**
   * Tính ngày quay kế tiếp chuẩn xác theo lịch quay chính thức (tránh lệch timezone)
   * @param {string} fromDateStr - Ngày bắt đầu (YYYY-MM-DD)
   * @param {string} stationOrGame - Mã đài hoặc mã game Vietlott
   * @param {boolean} isVietlott - Cờ Vietlott hay XSMN
   * @returns {{ date: string, dayOfWeek: number }}
   */
  getNextDrawDate(fromDateStr, stationOrGame, isVietlott = false) {
    const validDays = isVietlott 
      ? this.getDrawDaysForGame(stationOrGame) 
      : this.getDrawDaysForStation(stationOrGame);

    let year = 2026, month = 9, day = 14;
    if (fromDateStr && typeof fromDateStr === 'string') {
      const parts = fromDateStr.split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      }
    }

    // Khởi tạo ngày với giờ trưa 12:00 để triệt tiêu hoàn toàn rủi ro timezone shift
    const cur = new Date(year, month, day, 12, 0, 0);

    // Duyệt tiến tối đa 14 ngày để tìm ngày quay hợp lệ kế tiếp
    for (let step = 1; step <= 14; step++) {
      cur.setDate(cur.getDate() + 1);
      const dow = cur.getDay();
      if (validDays.includes(dow)) {
        const yStr = cur.getFullYear();
        const mStr = String(cur.getMonth() + 1).padStart(2, '0');
        const dStr = String(cur.getDate()).padStart(2, '0');
        return {
          date: `${yStr}-${mStr}-${dStr}`,
          dayOfWeek: dow
        };
      }
    }

    // Fallback an toàn
    return {
      date: fromDateStr,
      dayOfWeek: 1
    };
  }
};
