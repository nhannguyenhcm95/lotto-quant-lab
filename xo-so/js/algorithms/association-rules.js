/**
 * THUẬT TOÁN 7: Khai Phá Luật Kết Hợp & Bạc Nhớ Đi Kèm (Association Rules - FIX-9)
 * 
 * Sửa triệt để lỗi học ngược chiều thời gian (ALG-04):
 *  - Input Newest-First: draw[0] là mới nhất, draw[i+1] là kỳ cũ hơn.
 *  - Học chuyển tiếp đúng chiều: older = history[i+1] -> newer = history[i].
 *  - Tách bạch hai thống kê: same-draw co-occurrence và cross-draw sequential transition.
 */

import { validateAndSortHistory, getDrawEventSet, getUniverse } from './input-normalizer.js';

export const AssociationRulesAlgorithm = {
  id: "association-rules",
  name: "Khai phá Luật Bạc Nhớ",

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
    const nDraws = Math.min(nDrawsTotal, options.analysisWindow || 45);

    if (nDraws < 2) {
      return {
        status: 'insufficient-data',
        id: this.id,
        name: this.name,
        predictions: [],
        scores: {},
        scoreType: 'ranking-score',
        metrics: { nDrawsInput: nDrawsTotal, nDrawsUsed: nDraws },
        explanation: 'Cần tối thiểu 2 kỳ quay lịch sử để khai phá quy luật chuyển tiếp và đi kèm.',
        warnings: ['Số lượng kỳ nhỏ hơn 2']
      };
    }

    const isVietlott = options.isVietlott !== false;
    const topN = options.topN || (isVietlott ? 6 : 5);
    const universe = getUniverse({ isVietlott, totalBalls: options.totalBalls });

    // 1. Khởi tạo cấu trúc thống kê
    const singleCounts = {};
    const pairCooccurrence = {};     // Same-draw: a và b cùng ra trong 1 kỳ
    const sequentialTransition = {}; // Cross-draw: older (i+1) ra a -> newer (i) ra b

    for (const item of universe) {
      singleCounts[item] = 0;
      pairCooccurrence[item] = {};
      sequentialTransition[item] = {};
    }

    // 2. Thống kê cùng kỳ (Same-Draw Co-occurrence)
    for (let t = 0; t < nDraws; t++) {
      const eventSet = getDrawEventSet(sortedHistory[t], { isVietlott, totalBalls: options.totalBalls });
      for (const a of eventSet) {
        if (singleCounts[a] !== undefined) {
          singleCounts[a]++;
        }
        for (const b of eventSet) {
          if (a !== b) {
            if (!pairCooccurrence[a]) pairCooccurrence[a] = {};
            pairCooccurrence[a][b] = (pairCooccurrence[a][b] || 0) + 1;
          }
        }
      }
    }

    // 3. Thống kê chuyển tiếp tiếp nối theo thời gian: CŨ (i+1) -> MỚI (i) (ALG-04)
    const eligibleTransitions = nDraws - 1;
    const olderSideCounts = {};
    const newerSideCounts = {};

    for (let i = 0; i < nDraws - 1; i++) {
      const newerSet = getDrawEventSet(sortedHistory[i], { isVietlott, totalBalls: options.totalBalls });
      const olderSet = getDrawEventSet(sortedHistory[i + 1], { isVietlott, totalBalls: options.totalBalls });

      for (const b of newerSet) {
        newerSideCounts[b] = (newerSideCounts[b] || 0) + 1;
      }
      for (const a of olderSet) {
        olderSideCounts[a] = (olderSideCounts[a] || 0) + 1;
        if (!sequentialTransition[a]) sequentialTransition[a] = {};
        for (const b of newerSet) {
          sequentialTransition[a][b] = (sequentialTransition[a][b] || 0) + 1;
        }
      }
    }

    // 4. Lấy các số ở kỳ mới nhất (index 0) làm Antecedents (Tiền đề hiện tại)
    const latestEventSet = getDrawEventSet(sortedHistory[0], { isVietlott, totalBalls: options.totalBalls });
    const antecedents = latestEventSet.filter(num => universe.includes(num));

    // 5. Tính điểm xếp hạng kết hợp (Combined Ranking Score)
    const scores = {};
    const candidateDetails = [];

    for (const b of universe) {
      const pB = (singleCounts[b] || 0) / nDraws;
      const pBNewer = (newerSideCounts[b] || 0) / eligibleTransitions;

      let totalSequentialLift = 0;
      let totalCooccurrenceLift = 0;
      let matchedSequentialRules = 0;
      let matchedCooccurRules = 0;

      for (const a of antecedents) {
        const edgesA = olderSideCounts[a] || 0;
        const seqEdgeAB = (sequentialTransition[a] && sequentialTransition[a][b]) || 0;
        if (edgesA > 0 && seqEdgeAB > 0) {
          const confidence = seqEdgeAB / edgesA;
          const lift = pBNewer > 0 ? (confidence / pBNewer) : (confidence * 2);
          totalSequentialLift += lift;
          matchedSequentialRules++;
        }

        const cooccurAB = (pairCooccurrence[a] && pairCooccurrence[a][b]) || 0;
        const countA = singleCounts[a] || 0;
        if (countA > 0 && cooccurAB > 0 && pB > 0) {
          const cooccurConf = cooccurAB / countA;
          const cooccurLift = cooccurConf / pB;
          totalCooccurrenceLift += cooccurLift;
          matchedCooccurRules++;
        }
      }

      // Điểm chuẩn hóa cho từng khía cạnh
      const avgSeqLift = matchedSequentialRules > 0 ? (totalSequentialLift / matchedSequentialRules) : 0;
      const avgCooccurLift = matchedCooccurRules > 0 ? (totalCooccurrenceLift / matchedCooccurRules) : 0;

      // Điểm tổng hợp heuristic (thang 0-100)
      const baseFreqScore = pB * 100;
      const seqBonus = Math.min(avgSeqLift * 20, 60);
      const cooccurBonus = Math.min(avgCooccurLift * 15, 40);

      const finalScore = Math.round((baseFreqScore * 0.3 + seqBonus * 0.4 + cooccurBonus * 0.3) * 10) / 10;
      scores[b] = finalScore;

      candidateDetails.push({
        num: b,
        finalScore,
        matchedSequentialRules,
        avgSequentialLift: Math.round(avgSeqLift * 100) / 100,
        matchedCooccurRules,
        avgCooccurLift: Math.round(avgCooccurLift * 100) / 100,
        empiricalRate: Math.round(pB * 1000) / 1000
      });
    }

    // Sắp xếp ứng viên giảm dần theo điểm số
    candidateDetails.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      if (b.avgSequentialLift !== a.avgSequentialLift) return b.avgSequentialLift - a.avgSequentialLift;
      return String(a.num).localeCompare(String(b.num));
    });

    const frequentPairs = [];
    const seenPairKeys = new Set();
    for (const a of Object.keys(pairCooccurrence)) {
      for (const b of Object.keys(pairCooccurrence[a])) {
        const count = pairCooccurrence[a][b];
        const minK = String(a).localeCompare(String(b)) < 0 ? a : b;
        const maxK = minK === a ? b : a;
        const pairKey = `${minK}_${maxK}`;
        if (!seenPairKeys.has(pairKey)) {
          seenPairKeys.add(pairKey);
          const pA = (singleCounts[minK] || 0) / nDraws;
          const pB = (singleCounts[maxK] || 0) / nDraws;
          const pAB = count / nDraws;
          const lift = (pA * pB > 0) ? Math.round((pAB / (pA * pB)) * 100) / 100 : 1.0;
          const conf = singleCounts[minK] > 0 ? Math.round((count / singleCounts[minK]) * 1000) / 1000 : 0;

          frequentPairs.push({
            pair: `${String(minK).padStart(2, '0')} - ${String(maxK).padStart(2, '0')}`,
            a: String(minK).padStart(2, '0'),
            b: String(maxK).padStart(2, '0'),
            coOccurrenceCount: count,
            count,
            totalEligibleDraws: nDraws,
            support: Math.round((count / nDraws) * 1000) / 1000,
            confidence: conf,
            lift
          });
        }
      }
    }
    frequentPairs.sort((x, y) => y.coOccurrenceCount - x.coOccurrenceCount || x.pair.localeCompare(y.pair));

    const topCandidates = candidateDetails.slice(0, topN).map(c => c.num);

    return {
      status: 'ok',
      id: this.id,
      name: this.name,
      predictions: topCandidates,
      frequentPairs,
      scores,
      scoreType: 'ranking-score',
      metrics: {
        nDrawsInput: nDrawsTotal,
        nDrawsUsed: nDraws,
        eligibleTransitions,
        antecedents,
        frequentPairs,
        transitionCounts: sequentialTransition,
        cooccurrenceCounts: pairCooccurrence,
        topRules: candidateDetails.slice(0, 10)
      },
      explanation: `Khai phá bạc nhớ chuyển tiếp từ ${antecedents.length} số ở kỳ gần nhất (${antecedents.join(', ')}) kết hợp đồng xuất hiện. Top ${topN} ứng viên: ${topCandidates.join(', ')}.`
    };
  }
};
