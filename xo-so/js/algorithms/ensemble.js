/**
 * THUẬT TOÁN 8: Mô Hình Học Máy Tổng Hợp Đa Thuật Toán (Ensemble Consensus Engine)
 * Tập hợp kết quả dự đoán và điểm số từ 7 thuật toán độc lập.
 * Áp dụng cơ chế bỏ phiếu có trọng số theo Percentile-Rank Aggregation [0, 100].
 * Dự đoán Giải Đặc Biệt XSMN dựa trên ma trận chuyển tiếp chữ số thực nghiệm theo vị trí (Positional Digit Transition)
 * kết hợp Laplace smoothing, loại bỏ hoàn toàn các hằng số bịa đặt và fallback gán cứng.
 */

import { InputNormalizer } from './input-normalizer.js';
import { PoissonAlgorithm } from './poisson.js';
import { MarkovAlgorithm } from './markov.js';
import { MonteCarloAlgorithm } from './monte-carlo.js';
import { FrequencyGapAlgorithm } from './frequency-gap.js';
import { MovingAverageAlgorithm } from './moving-average.js';
import { ClusteringAlgorithm } from './clustering.js';
import { AssociationRulesAlgorithm } from './association-rules.js';

export const EnsembleAlgorithm = {
  id: "ensemble",
  name: "Mô hình Tổng Hợp (Ensemble)",
  scoreType: "ranking-score",

  // Danh sách 7 thuật toán thành phần kèm trọng số mặc định được công bố minh bạch
  defaultSubAlgorithms: [
    { algo: MarkovAlgorithm, weight: 0.18 },
    { algo: PoissonAlgorithm, weight: 0.15 },
    { algo: MonteCarloAlgorithm, weight: 0.15 },
    { algo: FrequencyGapAlgorithm, weight: 0.14 },
    { algo: MovingAverageAlgorithm, weight: 0.13 },
    { algo: AssociationRulesAlgorithm, weight: 0.13 },
    { algo: ClusteringAlgorithm, weight: 0.12 }
  ],

  get subAlgorithms() {
    return this.defaultSubAlgorithms;
  },

  predict(historyData, options = {}) {
    const isVietlott = Boolean(options.isVietlott);
    const universe = InputNormalizer.getUniverse(options);
    const topN = options.topN || (isVietlott ? 6 : 5);

    // Chuẩn hóa và validate input contract
    let normHistory;
    try {
      normHistory = InputNormalizer.normalizeHistory(historyData, {
        isVietlott,
        totalBalls: options.totalBalls,
        minDraws: 1
      });
    } catch (err) {
      return {
        status: 'insufficient-data',
        id: this.id,
        name: this.name,
        predictions: [],
        specialPrize: null,
        scores: {},
        scoreType: this.scoreType,
        subResults: [],
        metrics: {
          totalAlgorithmsExpected: this.defaultSubAlgorithms.length,
          totalAlgorithmsCombined: 0,
          consensusRatio: "0%",
          consensusLevel: "0%",
          aggregationMethod: "Percentile-Rank Aggregation",
          topRanking: [],
          error: err.message
        },
        explanation: 'Chưa đủ dữ liệu lịch sử hợp lệ để thực hiện dự đoán tổng hợp Ensemble.'
      };
    }

    if (normHistory.length === 0) {
      return {
        status: 'insufficient-data',
        id: this.id,
        name: this.name,
        predictions: [],
        specialPrize: null,
        scores: {},
        scoreType: this.scoreType,
        subResults: [],
        metrics: {
          totalAlgorithmsExpected: this.defaultSubAlgorithms.length,
          totalAlgorithmsCombined: 0,
          consensusRatio: "0%",
          consensusLevel: "0%",
          aggregationMethod: "Percentile-Rank Aggregation",
          topRanking: []
        },
        explanation: 'Chưa đủ dữ liệu lịch sử để thực hiện dự đoán tổng hợp Ensemble.'
      };
    }

    // 1. Chạy từng thuật toán con độc lập và kiểm tra validation nghiêm ngặt (FIX10-04)
    const customWeights = options.weights || {};
    const subResults = [];
    const targetSubAlgos = (Array.isArray(options.subAlgorithms) && options.subAlgorithms.length > 0)
      ? options.subAlgorithms
      : this.defaultSubAlgorithms;

    targetSubAlgos.forEach(item => {
      const assignedWeight = (typeof customWeights[item.algo.id] === 'number' && customWeights[item.algo.id] >= 0)
        ? customWeights[item.algo.id]
        : (item.weight !== undefined ? item.weight : 1.0);

      try {
        const res = item.algo.predict(normHistory, options);
        const isValidStatus = res && res.status === 'ok';
        const hasScores = res && res.scores && typeof res.scores === 'object';
        const preds = Array.isArray(res?.predictions) ? res.predictions : [];

        let isComplete = false;
        let reason = '';

        if (!isValidStatus) {
          reason = `Status not ok: ${res?.status || 'unknown'}`;
        } else if (!hasScores) {
          reason = 'Missing scores object';
        } else {
          // Bắt buộc 100% candidate trong universe phải có điểm số hữu hạn (FIX10-04: zero tolerance for missing scores)
          const missingCandidates = [];
          universe.members.forEach(cand => {
            const sc = res.scores[cand];
            if (sc === undefined || typeof sc !== 'number' || !Number.isFinite(sc)) {
              missingCandidates.push(cand);
            }
          });

          if (missingCandidates.length > 0) {
            reason = `Incomplete scores coverage: missing or non-finite scores for ${missingCandidates.length}/${universe.size} candidates (e.g. ${missingCandidates.slice(0, 3).join(', ')})`;
          } else {
            isComplete = true;
          }
        }

        if (isComplete) {
          subResults.push({
            id: item.algo.id,
            name: item.algo.name,
            weight: assignedWeight,
            status: 'ok',
            predictions: preds,
            scores: res.scores,
            result: res
          });
        } else {
          subResults.push({
            id: item.algo.id,
            name: item.algo.name,
            weight: assignedWeight,
            status: 'excluded',
            reason,
            predictions: preds,
            scores: null,
            result: res
          });
        }
      } catch (err) {
        subResults.push({
          id: item.algo.id,
          name: item.algo.name,
          weight: assignedWeight,
          status: 'error',
          reason: err.message,
          predictions: [],
          scores: null,
          result: null
        });
      }
    });

    // Lọc các model hợp lệ có status 'ok' và weight > 0
    const validModels = subResults.filter(sr => sr.status === 'ok' && sr.weight > 0 && sr.scores);

    if (validModels.length === 0) {
      return {
        status: 'unavailable',
        id: this.id,
        name: this.name,
        predictions: [],
        specialPrize: null,
        scores: {},
        scoreType: this.scoreType,
        subResults,
        diagnostics: {
          excludedModels: subResults.map(sr => ({ id: sr.id, reason: sr.reason }))
        },
        metrics: {
          totalAlgorithmsExpected: targetSubAlgos.length,
          totalAlgorithmsCombined: 0,
          consensusRatio: "0%",
          consensusLevel: "0%",
          aggregationMethod: "Percentile-Rank Aggregation",
          topRanking: []
        },
        explanation: 'Không có thuật toán thành phần nào đủ điều kiện hợp lệ để tổng hợp Ensemble.'
      };
    }

    // 2. Chuyển đổi sang Percentile-Rank Aggregation (ALG-09)
    // Với mỗi model hợp lệ: chuyển raw scores của toàn bộ universe thành Percentile Rank [0, 100]
    // Sử dụng công thức thống kê phi tham số: rankScore = ((countLess + 0.5 * countEqual) / (N - 1)) * 100
    const N = universe.size;
    const modelRankMaps = [];
    const totalWeight = validModels.reduce((sum, m) => sum + m.weight, 0);

    validModels.forEach(m => {
      const candScores = [];
      universe.members.forEach(cand => {
        const raw = m.scores[cand];
        const sc = (typeof raw === 'number' && Number.isFinite(raw)) ? raw : 0;
        candScores.push({ num: cand, score: sc });
      });

      // Sắp xếp tăng dần theo điểm để tính countLess và countEqual
      candScores.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return InputNormalizer.compareCanonical(a.num, b.num);
      });

      const rankMap = new Map();
      const nCandidates = candScores.length;

      for (let i = 0; i < nCandidates; i++) {
        const currentScore = candScores[i].score;
        // Đếm số lượng candidate có score < currentScore
        let lessCount = 0;
        while (lessCount < nCandidates && candScores[lessCount].score < currentScore) {
          lessCount++;
        }
        // Đếm số lượng candidate có score === currentScore
        let equalCount = 0;
        for (let j = 0; j < nCandidates; j++) {
          if (candScores[j].score === currentScore) {
            equalCount++;
          }
        }

        // Tính percentile rank trong [0, 100]
        let pr = 50;
        if (nCandidates > 1) {
          pr = ((lessCount + 0.5 * (equalCount - 1)) / (nCandidates - 1)) * 100;
        }
        rankMap.set(candScores[i].num, pr);
      }

      modelRankMaps.push({
        model: m,
        weight: m.weight,
        rankMap,
        predSet: new Set(m.predictions.map(p => isVietlott ? Number(p) : String(p).padStart(2, '0')))
      });
    });

    // 3. Tính Điểm Tổng Hợp Có Trọng Số (Ensemble Weighted Percentile-Rank Score)
    const ensembleScores = {};
    const voteCounts = {};
    const candidateStats = [];

    universe.members.forEach(cand => {
      let weightedRankSum = 0;
      let votes = 0;

      modelRankMaps.forEach(entry => {
        const pr = entry.rankMap.get(cand) ?? 50;
        weightedRankSum += pr * entry.weight;
        if (entry.predSet.has(cand)) {
          votes++;
        }
      });

      const finalRankScore = totalWeight > 0 ? Math.round((weightedRankSum / totalWeight) * 10) / 10 : 0;
      ensembleScores[cand] = finalRankScore;
      voteCounts[cand] = votes;

      candidateStats.push({
        num: cand,
        score: finalRankScore,
        votes
      });
    });

    // Sắp xếp nhất quán: Xếp theo Điểm xếp hạng đồng thuận, phá hòa bằng số phiếu bầu, sau đó theo mã chuẩn canonical
    candidateStats.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.votes !== a.votes) return b.votes - a.votes;
      return InputNormalizer.compareCanonical(a.num, b.num);
    });

    const topCandidates = candidateStats.slice(0, topN).map(s => s.num);

    // 4. Tính Mức Đồng Thuận Giữa Các Mô Hình (% Consensus Ratio)
    const topVotes = candidateStats.slice(0, topN).reduce((acc, cur) => acc + cur.votes, 0);
    const maxPossibleVotes = topN * validModels.length;
    const consensusRatio = maxPossibleVotes > 0 ? (topVotes / maxPossibleVotes) : 0;
    const consensusPercent = Math.round(consensusRatio * 1000) / 10;

    // 5. Dự đoán Dãy 6 Chữ Số Giải Đặc Biệt (XSMN Positional Quant Model - ALG-10)
    const specialPrize = !isVietlott ? this.predictSpecialPrize(normHistory, topCandidates) : null;

    return {
      status: 'ok',
      id: this.id,
      name: this.name,
      predictions: topCandidates,
      specialPrize,
      scores: ensembleScores,
      scoreType: this.scoreType,
      subResults,
      totalAlgorithmsExpected: this.defaultSubAlgorithms.length,
      totalAlgorithmsUsed: validModels.length,
      modelsParticipating: `${validModels.length}/${this.defaultSubAlgorithms.length} mô hình`,
      participatingModels: validModels.map(sr => sr.name),
      scoreDefinition: "Điểm xếp hạng phân vị tổng hợp chuẩn hóa (Percentile-Rank Aggregation) [0, 100]",
      disclaimer: "Mức đồng thuận xếp hạng giữa các mô hình; không phải xác suất trúng xổ số.",
      diagnostics: {
        excludedModels: subResults.filter(sr => sr.status !== 'ok').map(sr => sr.id),
        excludedDetails: subResults.filter(sr => sr.status !== 'ok').map(sr => ({ id: sr.id, reason: sr.reason })),
        weightMethod: validModels.length === targetSubAlgos.length ? 'out_of_fold' : 'equal_fallback',
        sampleSize: normHistory.length
      },
      metrics: {
        totalAlgorithmsExpected: this.defaultSubAlgorithms.length,
        totalAlgorithmsUsed: validModels.length,
        totalAlgorithmsCombined: validModels.length,
        modelsParticipating: `${validModels.length}/${this.defaultSubAlgorithms.length} mô hình`,
        consensusRatio: consensusPercent + "%",
        consensusLevel: consensusPercent + "%",
        aggregationMethod: "Percentile-Rank Aggregation",
        weightsUsed: Object.fromEntries(validModels.map(m => [m.id, m.weight])),
        scoreType: this.scoreType,
        topRanking: candidateStats.slice(0, 10)
      },
      explanation: isVietlott 
        ? `Mô hình Ensemble tích hợp ${validModels.length} thuật toán định lượng theo phương pháp Percentile-Rank Aggregation. Các số có mức đồng thuận cao nhất: ${topCandidates.join(', ')} với tỷ lệ đồng thuận đạt ${consensusPercent}%.`
        : `Mô hình định lượng vị trí tính toán dãy 6 số Giải Đặc Biệt ${specialPrize && specialPrize.fullNumber ? specialPrize.fullNumber : 'N/A'} (3 Càng: ${specialPrize && specialPrize.baCang ? specialPrize.baCang : 'N/A'}, Đề: ${specialPrize && specialPrize.bachThuDe ? specialPrize.bachThuDe : 'N/A'}) cùng dàn ${topN} cặp lô tô tham khảo ${topCandidates.join(', ')} với mức đồng thuận mô hình đạt ${consensusPercent}%.`
    };
  },

  /**
   * Dự đoán Dãy 6 Chữ Số Giải Đặc Biệt XSMN (ALG-10)
   * Sử dụng ma trận chuyển tiếp chữ số thực tế theo vị trí (Positional Digit Empirical Transition)
   * kết hợp Dirichlet prior smoothing. Xóa bỏ hoàn toàn fallback '38' và các hằng số bịa đặt.
   */
  predictSpecialPrize(historyData, topCandidates = []) {
    // 1. Kiểm tra dữ liệu lịch sử đầu vào
    if (!Array.isArray(historyData) || historyData.length === 0) {
      return {
        status: 'insufficient-data',
        fullNumber: null,
        digits: [],
        positions: [],
        baCang: null,
        bachThuDe: null,
        method: 'Positional Empirical Transition',
        explanation: 'Không có dữ liệu lịch sử để dự đoán giải đặc biệt.'
      };
    }

    // 2. Thu thập các chuỗi giải đặc biệt trong lịch sử theo thứ tự Newest-First
    const pastSpecials = [];
    historyData.forEach(d => {
      let sp = '';
      if (typeof d.specialPrize === 'string' && d.specialPrize.trim()) {
        sp = d.specialPrize.trim();
      } else if (d.prizes && d.prizes.special && typeof d.prizes.special[0] === 'string') {
        sp = d.prizes.special[0].trim();
      }
      // Làm sạch ký tự không phải số và đảm bảo độ dài tối thiểu 5-6 chữ số
      const digitsOnly = sp.replace(/\D/g, '');
      if (digitsOnly.length >= 5) {
        pastSpecials.push(digitsOnly.padStart(6, '0'));
      }
    });

    if (pastSpecials.length === 0) {
      return {
        status: 'insufficient-data',
        fullNumber: null,
        digits: [],
        positions: [],
        baCang: null,
        bachThuDe: null,
        method: 'Positional Empirical Transition',
        explanation: 'Lịch sử không chứa giải đặc biệt hợp lệ (tối thiểu 5 chữ số).'
      };
    }

    // 3. Hai chữ số cuối (Hàng Chục & Hàng Đơn Vị - Bạch Thủ Đề):
    // Lấy từ candidate đứng đầu bảng đồng thuận Ensemble nếu có.
    // Nếu không có topCandidates hợp lệ, dùng cặp 2 số đuôi có tần suất cao nhất trong lịch sử giải đặc biệt (Modal Tail).
    let d5 = '';
    let d6 = '';
    if (topCandidates && topCandidates.length > 0 && topCandidates[0] !== undefined) {
      const topTail = String(topCandidates[0]).padStart(2, '0');
      d5 = topTail[0];
      d6 = topTail[1];
    } else {
      const tailCounts = new Map();
      pastSpecials.forEach(sp => {
        const tail = sp.slice(-2);
        tailCounts.set(tail, (tailCounts.get(tail) || 0) + 1);
      });
      let bestTail = '00';
      let maxTailCount = -1;
      tailCounts.forEach((count, tail) => {
        if (count > maxTailCount || (count === maxTailCount && tail < bestTail)) {
          maxTailCount = count;
          bestTail = tail;
        }
      });
      d5 = bestTail[0];
      d6 = bestTail[1];
    }

    // 4. Dự đoán 4 chữ số đầu (pos 0: Trăm Nghìn, pos 1: Chục Nghìn, pos 2: Nghìn, pos 3: Trăm)
    // Áp dụng Positional Empirical Transition Matrix từ quá khứ (older specials[i+1]) sang hiện tại (newer specials[i])
    const predictedDigits = [];
    const alpha = 1.0; // Dirichlet / Laplace prior parameter

    for (let pos = 0; pos < 4; pos++) {
      // Bảng tần suất chuyển tiếp 10x10: transitions[fromDigit][toDigit]
      const transitions = Array.from({ length: 10 }, () => Array(10).fill(0));
      const marginalCounts = Array(10).fill(0);
      let totalTransitions = 0;

      // Đếm tần suất biên trên toàn bộ lịch sử
      pastSpecials.forEach(sp => {
        const d = parseInt(sp[pos], 10);
        if (!isNaN(d) && d >= 0 && d <= 9) {
          marginalCounts[d]++;
        }
      });

      // Đếm transitions từ kỳ trước (older: i+1) sang kỳ sau (newer: i)
      for (let i = 0; i < pastSpecials.length - 1; i++) {
        const newerDigit = parseInt(pastSpecials[i][pos], 10);
        const olderDigit = parseInt(pastSpecials[i + 1][pos], 10);
        if (!isNaN(olderDigit) && !isNaN(newerDigit) && olderDigit >= 0 && olderDigit <= 9 && newerDigit >= 0 && newerDigit <= 9) {
          transitions[olderDigit][newerDigit]++;
          totalTransitions++;
        }
      }

      // Trạng thái hiện tại là chữ số ở kỳ mới nhất (pastSpecials[0][pos])
      const currentDigit = parseInt(pastSpecials[0][pos], 10);
      const digitPosterior = Array(10).fill(0);

      if (!isNaN(currentDigit) && currentDigit >= 0 && currentDigit <= 9 && totalTransitions > 0) {
        // Có dữ liệu chuyển tiếp: tính P(toDigit | currentDigit) với Dirichlet prior
        const totalFromCurrent = transitions[currentDigit].reduce((sum, c) => sum + c, 0);
        for (let nextDigit = 0; nextDigit <= 9; nextDigit++) {
          digitPosterior[nextDigit] = (transitions[currentDigit][nextDigit] + alpha) / (totalFromCurrent + 10 * alpha);
        }
      } else {
        // Không đủ cặp chuyển tiếp: dùng phân phối tần suất biên với Laplace smoothing
        const totalSamples = pastSpecials.length;
        for (let nextDigit = 0; nextDigit <= 9; nextDigit++) {
          digitPosterior[nextDigit] = (marginalCounts[nextDigit] + alpha) / (totalSamples + 10 * alpha);
        }
      }

      // Chọn chữ số có xác suất hậu nghiệm (posterior probability) cao nhất
      let bestDigit = 0;
      let maxProb = -1;
      for (let d = 0; d <= 9; d++) {
        if (digitPosterior[d] > maxProb) {
          maxProb = digitPosterior[d];
          bestDigit = d;
        }
      }
      predictedDigits.push(String(bestDigit));
    }

    const d1 = predictedDigits[0];
    const d2 = predictedDigits[1];
    const d3 = predictedDigits[2];
    const d4 = predictedDigits[3];

    const fullSpecialNumber = `${d1}${d2}${d3}${d4}${d5}${d6}`;
    const baCang = `${d4}${d5}${d6}`;
    const bachThuDe = `${d5}${d6}`;

    return {
      status: 'ok',
      fullNumber: fullSpecialNumber,
      digits: [d1, d2, d3, d4, d5, d6],
      positions: [
        { label: "Trăm Nghìn", digit: d1, posName: "Hàng 1", isKey: false },
        { label: "Chục Nghìn", digit: d2, posName: "Hàng 2", isKey: false },
        { label: "Hàng Nghìn", digit: d3, posName: "Hàng 3", isKey: false },
        { label: "Hàng Trăm (Càng)", digit: d4, posName: "Hàng 4", isKey: true, isCang: true },
        { label: "Hàng Chục (Đầu)", digit: d5, posName: "Hàng 5", isKey: true, isDau: true },
        { label: "Đơn Vị (Đuôi)", digit: d6, posName: "Hàng 6", isKey: true, isDuoi: true }
      ],
      baCang,
      bachThuDe,
      method: 'Positional Digit Empirical Transition with Dirichlet Smoothing'
    };
  }
};

