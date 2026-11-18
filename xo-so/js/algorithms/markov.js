/**
 * THUẬT TOÁN 2: Ma Trận Chuyển Dịch Trạng Thái Liên Kế (Markov Conditional Association - FIX-9)
 * 
 * Sửa triệt để các lỗi kỹ thuật (ALG-05):
 *  1. Khử trùng draw cho presence-based prediction (tránh inflate counts ở XSMN).
 *  2. Tính conditional rate với Bernoulli prior nhất quán:
 *     conditionalRate[i][j] = (transitionHit[i][j] + kappa * priorP[j]) / (sourceDrawCount[i] + kappa)
 *  3. Tổng hợp có trọng số theo support (weighted mean), không nhân độc lập 1 - prod(1 - p_ij).
 *  4. Output contract: scoreType = 'ranking-score'.
 */

import {
  validateAndSortHistory,
  getDrawEventSet,
  getUniverse,
  compareCanonical,
  resolveIsVietlott,
  resolveTotalBalls
} from './input-normalizer.js';

export const MarkovAlgorithm = {
  id: "markov",
  name: "Chuỗi Markov Bậc 1 & Liên Kết Chuyển Dịch",

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

    if (nDraws < 2) {
      return {
        status: 'insufficient-data',
        id: this.id,
        name: this.name,
        predictions: [],
        scores: {},
        scoreType: 'ranking-score',
        metrics: { nDrawsInput: nDrawsTotal, nDrawsUsed: nDraws },
        explanation: 'Cần tối thiểu 2 kỳ quay lịch sử để xây dựng chuỗi chuyển dịch trạng thái.',
        warnings: ['Số lượng kỳ nhỏ hơn 2']
      };
    }

    const isVietlott = resolveIsVietlott(options, sortedHistory);
    const totalBalls = resolveTotalBalls(options, sortedHistory, isVietlott);
    const universe = getUniverse({ ...options, isVietlott, totalBalls }, sortedHistory);
    const topN = options.topN || (isVietlott ? 6 : 5);
    const pickBalls = isVietlott ? (options.pickBalls || 6) : 18;

    // XSMN dùng eventSet (biến cố hiện diện nhị phân có khử trùng trên 18 giải hoàn lại): P(X >= 1) = 1 - (0.99)^18
    const priorP = isVietlott ? (pickBalls / universe.length) : (1 - Math.pow(1 - 1 / 100, 18));
    const kappa = 2.0; // Độ mạnh của prior làm trơn

    // 1. Thống kê số lần xuất hiện ở kỳ cũ (sourceDrawCount) và chuyển dịch sang kỳ mới (transitionHit)
    const sourceDrawCount = {};
    const transitionHit = {};

    for (const key of universe) {
      sourceDrawCount[key] = 0;
      transitionHit[key] = {};
    }

    // Duyệt qua các cặp kỳ liên tiếp (t cũ hơn kéo theo t-1 mới hơn)
    // sortedHistory[0] là mới nhất -> older = sortedHistory[t], newer = sortedHistory[t-1]
    for (let t = nDraws - 1; t >= 1; t--) {
      const olderSet = getDrawEventSet(sortedHistory[t], { isVietlott, totalBalls });
      const newerSet = getDrawEventSet(sortedHistory[t - 1], { isVietlott, totalBalls });

      for (const i of olderSet) {
        if (sourceDrawCount[i] !== undefined) {
          sourceDrawCount[i]++;
          for (const j of newerSet) {
            transitionHit[i][j] = (transitionHit[i][j] || 0) + 1;
          }
        }
      }
    }

    // 2. Lấy các số ở kỳ mới nhất (index 0) làm tập Antecedents
    const latestEventSet = getDrawEventSet(sortedHistory[0], { isVietlott, totalBalls });
    const antecedents = latestEventSet.filter(num => universe.includes(num));

    // 3. Tính điểm xếp hạng chuyển dịch cho từng số j trong universe
    const scores = {};
    const stats = [];

    for (const j of universe) {
      let weightedRateSum = 0;
      let totalWeight = 0;

      for (const i of antecedents) {
        const countI = sourceDrawCount[i] || 0;
        const hitsIJ = (transitionHit[i] && transitionHit[i][j]) || 0;

        // Conditional Rate với Bayesian Shrinkage nhất quán:
        const condRate = (hitsIJ + kappa * priorP) / (countI + kappa);
        const weight = countI + 1; // Ưu tiên antecedent có nhiều bằng chứng lịch sử hơn

        weightedRateSum += condRate * weight;
        totalWeight += weight;
      }

      const aggregatedRate = totalWeight > 0 ? (weightedRateSum / totalWeight) : priorP;
      const score = Math.round(aggregatedRate * 1000) / 10; // Thang 0 - 100
      scores[j] = score;

      stats.push({
        num: j,
        aggregatedRate: Math.round(aggregatedRate * 1000) / 1000,
        rawRate: aggregatedRate,
        score
      });
    }

    // Sắp xếp giảm dần theo điểm số, phá hòa bằng xác suất hậu nghiệm thực rồi theo chuẩn canonical
    stats.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.rawRate !== a.rawRate) return b.rawRate - a.rawRate;
      return compareCanonical(a.num, b.num);
    });

    const topCandidates = stats.slice(0, topN).map(s => s.num);

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
        antecedents,
        priorP: Math.round(priorP * 1000) / 1000,
        topTransitions: stats.slice(0, 10)
      },
      explanation: `Xếp hạng chuyển dịch trạng thái từ ${antecedents.length} số ở kỳ gần nhất (${antecedents.join(', ')}) với Bayesian shrinkage. Top ${topN} ứng viên: ${topCandidates.join(', ')}.`
    };
  }
};
