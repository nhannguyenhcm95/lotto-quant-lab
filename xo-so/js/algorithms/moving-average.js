/**
 * THUẬT TOÁN 5: Chuỗi Thời Gian & Trung Bình Trượt (EMA & Day-of-Week Seasonality - FIX-9)
 * 
 * Sửa triệt để các lỗi kỹ thuật (ALG-07):
 *  1. Dùng strictUtcDayOfWeek() chuẩn xác, từ chối ngày phi lý (không mặc định thứ Hai).
 *  2. Tính toán độ dốc EMA (Slope / Momentum) thực tế thay vì chỉ lấy mức EMA.
 *  3. Áp dụng công thức Bayesian Shrinkage nhất quán: (hits + kappa * prior) / (total + kappa).
 *  4. Output contract chuẩn mực: scoreType = 'ranking-score'.
 */

import { LOTTO_CONFIG } from '../config.js';
import { 
  validateAndSortHistory, 
  strictUtcDayOfWeek, 
  getDrawEventSet, 
  getUniverse 
} from './input-normalizer.js';

export const MovingAverageAlgorithm = {
  id: "moving-average",
  name: "EMA & Chu kỳ Thứ",

  predict(historyData, options = {}) {
    let sortedHistory = [];
    try {
      sortedHistory = validateAndSortHistory(historyData, options);
    } catch (e) {
      return {
        status: 'invalid-input',
        id: this.id,
        name: this.name,
        predictions: [],
        scores: {},
        scoreType: 'ranking-score',
        metrics: { error: e.message },
        explanation: `Dữ liệu lịch sử không hợp lệ: ${e.message}`,
        warnings: [e.message]
      };
    }

    const nDrawsTotal = sortedHistory.length;
    const nDraws = Math.min(nDrawsTotal, options.analysisWindow || 40);
    const alpha = typeof options.alpha === 'number' && options.alpha > 0 && options.alpha <= 1 ? options.alpha : 0.25;

    if (nDraws < 3) {
      return {
        status: 'insufficient-data',
        id: this.id,
        name: this.name,
        predictions: [],
        scores: {},
        scoreType: 'ranking-score',
        metrics: { nDrawsInput: nDrawsTotal, nDrawsUsed: nDraws },
        explanation: 'Cần tối thiểu 3 kỳ quay lịch sử để tính toán đường trung bình động hàm mũ EMA.',
        warnings: ['Số lượng kỳ nhỏ hơn 3']
      };
    }

    const isVietlott = options.isVietlott !== false;
    const universe = getUniverse({ isVietlott, totalBalls: options.totalBalls });
    const topN = options.topN || (isVietlott ? 6 : 5);
    const stationOrGame = options.stationOrGame || (isVietlott ? 'mega-6-45' : 'tphcm');

    // 1. Xác định thứ trong tuần của kỳ quay MỤC TIÊU chuẩn xác
    let targetDayOfWeek = 1;
    let targetDateStr = options.targetDrawDate || null;

    if (targetDateStr) {
      try {
        targetDayOfWeek = strictUtcDayOfWeek(targetDateStr);
      } catch (e) {
        return {
          status: 'invalid-input',
          id: this.id,
          name: this.name,
          predictions: [],
          scores: {},
          scoreType: 'ranking-score',
          metrics: { error: `Invalid targetDrawDate: ${e.message}` },
          explanation: `Ngày mục tiêu targetDrawDate không hợp lệ: ${targetDateStr}`,
          warnings: [e.message]
        };
      }
    } else if (sortedHistory[0] && sortedHistory[0].date) {
      const nextDraw = LOTTO_CONFIG.getNextDrawDate(sortedHistory[0].date, stationOrGame, isVietlott);
      targetDayOfWeek = nextDraw.dayOfWeek;
      targetDateStr = nextDraw.date;
    }

    // 2. Khởi tạo bảng chỉ số: Prior độc lập hoàn toàn với topN theo luật game (FIX10-03)
    const numStats = {};
    const pickBalls = isVietlott ? (options.pickBalls || (universe.length === 55 ? 6 : 6)) : 18;
    const basePrior = isVietlott ? (pickBalls / universe.length) : (1 - Math.pow(1 - 1 / 100, 18));

    for (const key of universe) {
      numStats[key] = {
        num: key,
        ema: basePrior, // Khởi tạo tại prior kỳ vọng lý thuyết thay vì hằng số tùy tiện
        prevEma: basePrior,
        slope: 0,
        dayOfWeekHits: 0,
        dayOfWeekTotal: 0
      };
    }

    // 3. Duyệt chuỗi thời gian từ cũ đến mới (t = nDraws-1 lùi về 0)
    for (let t = nDraws - 1; t >= 0; t--) {
      const draw = sortedHistory[t];
      const eventSet = new Set(getDrawEventSet(draw, { isVietlott, totalBalls: options.totalBalls }));
      const drawDay = strictUtcDayOfWeek(draw.date);

      for (const key of universe) {
        const appeared = eventSet.has(key) ? 1.0 : 0.0;
        const item = numStats[key];
        
        item.prevEma = item.ema;
        item.ema = alpha * appeared + (1 - alpha) * item.prevEma;
        item.slope = item.ema - item.prevEma;

        if (drawDay === targetDayOfWeek) {
          item.dayOfWeekTotal++;
          if (appeared > 0) item.dayOfWeekHits++;
        }
      }
    }

    // 4. Tính điểm tổng hợp với Bayesian Shrinkage nhất quán
    const kappa = 2.0; // Độ mạnh của prior smoothing
    const stats = [];
    const scores = {};

    for (const key of universe) {
      const item = numStats[key];
      const emaRate = item.ema; // Tỷ lệ xuất hiện theo EMA [0, 1]

      // Bayesian Shrinkage nhất quán: (hits + kappa * prior) / (total + kappa)
      const smoothedDayRate = (item.dayOfWeekHits + kappa * basePrior) / (item.dayOfWeekTotal + kappa);

      // Điểm tổng hợp xếp hạng: 70% mức EMA + 30% tỷ lệ theo thứ
      const finalScore = Math.round((emaRate * 70 + smoothedDayRate * 30) * 100) / 100;
      scores[key] = finalScore;

      stats.push({
        num: key,
        emaRate: Math.round(emaRate * 1000) / 1000,
        emaSlope: Math.round(item.slope * 1000) / 1000,
        dayHits: item.dayOfWeekHits,
        dayTotal: item.dayOfWeekTotal,
        smoothedDayRate: Math.round(smoothedDayRate * 1000) / 1000,
        finalScore
      });
    }

    // Sắp xếp giảm dần theo finalScore, tie-break theo emaSlope
    stats.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      if (b.emaSlope !== a.emaSlope) return b.emaSlope - a.emaSlope;
      return String(a.num).localeCompare(String(b.num));
    });

    const topCandidates = stats.slice(0, topN).map(s => s.num);
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const targetDayName = dayNames[targetDayOfWeek] || `Thứ ${targetDayOfWeek + 1}`;

    return {
      status: 'ok',
      id: this.id,
      name: this.name,
      predictions: topCandidates,
      scores,
      scoreType: 'ranking-score',
      metrics: {
        nDrawsInput: nDrawsTotal,
        nDrawsUsed: nDraws,
        alphaSmoothing: alpha,
        targetDayOfWeek,
        targetDayName,
        targetDate: targetDateStr,
        shrinkageKappa: kappa,
        basePrior: Math.round(basePrior * 1000) / 1000,
        topMomentum: stats.slice(0, 10)
      },
      explanation: `Đường trung bình trượt EMA kết hợp hiệu ứng lịch quay ${targetDayName}. Top ${topN} số có điểm xung lượng cao nhất: ${topCandidates.join(', ')}.`
    };
  }
};
