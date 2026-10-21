/**
 * THUẬT TOÁN 1: Phân Phối Poisson & Tỷ Lệ Thực Nghiệm Làm Mượt (Poisson / Empirical Rate - FIX-9)
 * 
 * Sửa triệt để các lỗi kỹ thuật (ALG-03):
 *  1. Tách biệt mô hình theo luật quay của từng game.
 *  2. Vietlott: Mô hình hóa biến cố nhị phân (Bernoulli), áp dụng Beta-Binomial smoothing với prior P(prior) = pickBalls / totalBalls.
 *     Không để số chưa quan sát có xác suất = 0%. Output scoreType = 'empirical-rate'.
 *  3. XSMN: Multiplicity counts (18 giải), lambda = totalOccurrences / nDraws biểu thị số lần xuất hiện kỳ vọng.
 *     Output scoreType = 'expected-count'.
 *  4. Không gọi lambda là xác suất.
 */

import { validateAndSortHistory, getDrawEventSet, getDrawEventCounts, getUniverse } from './input-normalizer.js';

export const PoissonAlgorithm = {
  id: "poisson",
  name: "Phân phối Poisson & Tần suất Thực nghiệm",

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
    const nDraws = Math.min(nDrawsTotal, options.analysisWindow || 30);

    if (nDraws === 0) {
      return {
        status: 'insufficient-data',
        id: this.id,
        name: this.name,
        predictions: [],
        scores: {},
        scoreType: 'ranking-score',
        metrics: { nDrawsInput: nDrawsTotal, nDrawsUsed: 0 },
        explanation: 'Chưa đủ dữ liệu lịch sử để thực hiện phân tích xác suất Poisson.',
        warnings: ['Dữ liệu lịch sử rỗng']
      };
    }

    const isVietlott = options.isVietlott !== false;
    const universe = getUniverse({ isVietlott, totalBalls: options.totalBalls });
    const topN = options.topN || (isVietlott ? 6 : 5);
    const pickBalls = isVietlott ? (options.pickBalls || 6) : 18;

    // Prior nền theo luật quay của game
    const priorP = isVietlott ? (pickBalls / universe.length) : (18 / 100);
    const kappa = 2.0; // Độ mạnh của prior làm mượt (Bayesian smoothing strength)

    const counts = new Map();
    for (const num of universe) {
      counts.set(num, 0);
    }

    // Đếm tần suất quan sát trong nDraws kỳ
    for (let i = 0; i < nDraws; i++) {
      const draw = sortedHistory[i];
      if (isVietlott) {
        // Vietlott: đếm presence (mỗi kỳ tối đa 1 lần)
        const eventSet = getDrawEventSet(draw, { isVietlott, totalBalls: options.totalBalls });
        for (const num of eventSet) {
          counts.set(num, (counts.get(num) || 0) + 1);
        }
      } else {
        // XSMN: đếm multiplicity (số lần về trên 18 giải)
        const eventCounts = getDrawEventCounts(draw, { isVietlott, totalBalls: options.totalBalls });
        eventCounts.forEach((c, num) => {
          counts.set(num, (counts.get(num) || 0) + c);
        });
      }
    }

    const scores = {};
    const stats = [];

    for (const num of universe) {
      const observed = counts.get(num) || 0;
      
      if (isVietlott) {
        // Vietlott: Ước lượng tỷ lệ thực nghiệm làm trơn (Smoothed Empirical Rate)
        const empiricalRate = observed / nDraws;
        const smoothedRate = (observed + kappa * priorP) / (nDraws + kappa);
        const score = Math.round(smoothedRate * 1000) / 10; // Thang 0 - 100
        scores[num] = score;

        stats.push({
          num,
          observedHits: observed,
          empiricalRate: Math.round(empiricalRate * 1000) / 1000,
          smoothedRate: Math.round(smoothedRate * 1000) / 1000,
          score
        });
      } else {
        // XSMN: Số lần xuất hiện kỳ vọng (Expected Occurrences per Draw)
        const lambda = observed / nDraws;
        const smoothedLambda = (observed + kappa * priorP) / (nDraws + kappa);
        const score = Math.round(smoothedLambda * 100) / 100;
        scores[num] = score;

        stats.push({
          num,
          totalOccurrences: observed,
          lambda: Math.round(lambda * 1000) / 1000,
          expectedOccurrences: Math.round(smoothedLambda * 1000) / 1000,
          score
        });
      }
    }

    // Sắp xếp giảm dần theo điểm số
    stats.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.num).localeCompare(String(b.num));
    });

    const topCandidates = stats.slice(0, topN).map(s => s.num);

    return {
      status: 'ok',
      id: this.id,
      name: this.name,
      predictions: topCandidates,
      scores,
      scoreType: isVietlott ? 'empirical-rate' : 'expected-count',
      metrics: {
        nDrawsInput: nDrawsTotal,
        nDrawsUsed: nDraws,
        priorP: Math.round(priorP * 1000) / 1000,
        smoothingKappa: kappa,
        topDetails: stats.slice(0, 10)
      },
      explanation: isVietlott
        ? `Ước lượng tỷ lệ xuất hiện thực nghiệm đã làm trơn (Beta-Binomial prior ${Math.round(priorP * 100)}%). Top ${topN} ứng viên: ${topCandidates.join(', ')}.`
        : `Ước lượng số lần xuất hiện kỳ vọng mỗi kỳ (Poisson Expected Occurrences). Top ${topN} ứng viên: ${topCandidates.join(', ')}.`
    };
  }
};
