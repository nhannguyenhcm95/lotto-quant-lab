/**
 * ĐỘNG CƠ DÒ KẾT QUẢ & KIỂM ĐỊNH HỒI QUY (Backtesting Engine - Fix 9)
 * Đảm bảo tính trung thực học thuật:
 *  - 0% Thiên kiến nhìn trước (No Lookahead Bias: Date strictly < Target Date).
 *  - Rolling Window thực tế: windowSize = W cắt đúng W kỳ gần nhất.
 *  - Phân lập đài XSMN độc lập (Station Scope Isolation).
 *  - Random Baseline độc lập: 100 replicates, seed phân biệt, tính Mean, SD, SE, CI 95%.
 *  - So khớp chuẩn canonical thông qua InputNormalizer.
 *  - Minh bạch các fold lỗi và tách bạch rõ ràng các metric thống kê.
 */

import { InputNormalizer } from './algorithms/input-normalizer.js';
import { EnsembleAlgorithm } from './algorithms/ensemble.js';
import { PoissonAlgorithm } from './algorithms/poisson.js';
import { MarkovAlgorithm } from './algorithms/markov.js';
import { MonteCarloAlgorithm } from './algorithms/monte-carlo.js';
import { FrequencyGapAlgorithm } from './algorithms/frequency-gap.js';
import { MovingAverageAlgorithm } from './algorithms/moving-average.js';
import { ClusteringAlgorithm } from './algorithms/clustering.js';
import { AssociationRulesAlgorithm } from './algorithms/association-rules.js';

export const RandomBaselineAlgorithm = {
  id: "random-baseline",
  name: "Chuẩn Ngẫu Nhiên (Random Baseline)",
  scoreType: "ranking-score",

  predict(historyData, options = {}) {
    const isVietlott = Boolean(options.isVietlott);
    const universe = InputNormalizer.getUniverse(options);
    const topN = options.topN || (isVietlott ? 6 : 5);
    const replicates = options.baselineReplicates || 100; // Tối thiểu 100 replicates theo BT-01

    // Seed giả lập xác định từ targetDrawDate, game và station để tái lập kết quả
    let baseSeed = 123456789;
    const seedStr = `${options.targetDrawDate || 'baseline'}_${isVietlott ? 'vietlott' : (options.stationId || 'xsmn')}`;
    for (let i = 0; i < seedStr.length; i++) {
      baseSeed = ((baseSeed << 5) - baseSeed + seedStr.charCodeAt(i)) | 0;
    }

    const generateOneSample = (replicateIndex) => {
      // Seed phân biệt độc lập cho từng replicate (BT-01)
      let s = ((baseSeed ^ Math.imul(replicateIndex + 1, 0x45D9F3B)) >>> 0) || (replicateIndex + 1);
      const rng = () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t >>> 0) / 4294967296);
      };

      const set = [];
      const universeMembers = universe.members;
      const uSize = universeMembers.length;

      while (set.length < topN && set.length < uSize) {
        const randIdx = Math.floor(rng() * uSize);
        const cand = universeMembers[randIdx];
        if (!set.includes(cand)) {
          set.push(cand);
        }
      }
      return set;
    };

    // Tạo replicateSamples gồm đúng số lượng replicates yêu cầu
    const replicateSamples = [];
    for (let r = 0; r < replicates; r++) {
      replicateSamples.push(generateOneSample(r));
    }

    // Mẫu dự đoán đại diện chính lấy từ replicate 0
    const primaryPreds = replicateSamples[0] || [];

    return {
      status: 'ok',
      id: this.id,
      name: this.name,
      predictions: primaryPreds,
      replicateSamples,
      scores: {},
      scoreType: this.scoreType,
      metrics: {
        isBaseline: true,
        replicatesRequested: replicates,
        replicatesExecuted: replicateSamples.length,
        baseSeed
      },
      explanation: `Mô hình đối chứng ngẫu nhiên đồng đều (Uniform Random Baseline) cùng quy mô lựa chọn (${topN} số, ${replicates} lần lặp Monte Carlo độc lập). Dùng để kiểm định xem các mô hình định lượng có thực sự tạo ra alpha so với chọn ngẫu nhiên hay không.`
    };
  }
};

export const BacktestEngine = {
  algorithms: [
    EnsembleAlgorithm,
    MarkovAlgorithm,
    PoissonAlgorithm,
    MonteCarloAlgorithm,
    FrequencyGapAlgorithm,
    MovingAverageAlgorithm,
    ClusteringAlgorithm,
    AssociationRulesAlgorithm
  ],
  baselineAlgorithm: RandomBaselineAlgorithm,

  /**
   * Phương thức chuẩn hóa cắt tập dữ liệu huấn luyện chống rò rỉ thời gian (0% Lookahead Bias - BT-02 & BT-03)
   */
  buildTrainingSet(fullHistory, targetDate, options = {}) {
    if (!Array.isArray(fullHistory) || typeof targetDate !== 'string') return [];

    const isVietlott = Boolean(options.isVietlott);
    const stationId = options.stationId || options.stationOrGame;

    // 1. Phân lập đài nghiêm ngặt (Station Scope Isolation - BT-03)
    let filtered = fullHistory.filter(d => {
      if (!d || typeof d.date !== 'string') return false;
      // Ngày phải tuyệt đối trước ngày mục tiêu
      if (d.date >= targetDate) return false;

      // Nếu là XSMN và có chỉ định đài cụ thể, chỉ giữ lại đài đó
      if (!isVietlott && stationId && stationId !== 'all') {
        return d.stationId === stationId;
      }
      return true;
    });

    // 2. Chuẩn hóa và sắp xếp Newest-First qua InputNormalizer
    const sorted = InputNormalizer.validateAndSortHistory(filtered, options);

    // 3. Cắt Rolling Window chính xác (BT-02)
    if (options.windowSize && typeof options.windowSize === 'number' && options.windowSize > 0) {
      return sorted.slice(0, options.windowSize);
    }

    return sorted;
  },

  /**
   * Chạy dò kết quả cho một ngày cụ thể (Single Date Backtest - BT-04 & BT-05)
   */
  runSingleDateBacktest(fullHistory, targetDate, options = {}) {
    const isVietlott = Boolean(options.isVietlott);
    const stationId = options.stationId || options.stationOrGame || (isVietlott ? 'vietlott' : 'tphcm');
    const totalBalls = options.totalBalls || (isVietlott ? 45 : 100);

    // 1. Tìm kết quả thực tế của ngày targetDate khớp đài
    let actualDraw = null;
    if (isVietlott) {
      actualDraw = fullHistory.find(d => d && d.date === targetDate);
    } else {
      actualDraw = fullHistory.find(d => d && d.date === targetDate && (stationId === 'all' || d.stationId === stationId));
    }

    if (!actualDraw) {
      return {
        success: false,
        message: `Không tìm thấy bảng kết quả thực tế ngày ${targetDate} cho scope ${stationId}`
      };
    }

    // 2. Nghiêm ngặt loại trừ Lookahead Bias: Chỉ lấy dữ liệu TRƯỚC ngày targetDate qua buildTrainingSet
    const trainingData = this.buildTrainingSet(fullHistory, targetDate, { ...options, isVietlott, stationId });

    if (trainingData.length < 1) {
      return {
        success: false,
        message: `Không đủ dữ liệu lịch sử trước ngày ${targetDate} để huấn luyện mô hình (cần tối thiểu 1 kỳ trước đó).`
      };
    }

    // 3. Chuẩn bị kết quả thực tế đối soát canonical qua InputNormalizer (BT-04)
    let actualWinningNumbers = [];
    let actualWinningSet = new Set();
    let actualWinningCounts = new Map();
    let specialPrize = null;

    if (isVietlott) {
      const rawBalls = Array.isArray(actualDraw.winningNumbers) ? actualDraw.winningNumbers : [];
      rawBalls.forEach(b => {
        try {
          const norm = InputNormalizer.normalizeVietlottBall(b, totalBalls);
          actualWinningNumbers.push(norm);
          actualWinningSet.add(norm);
          actualWinningCounts.set(norm, (actualWinningCounts.get(norm) || 0) + 1);
        } catch (e) {}
      });
    } else {
      const rawPairs = Array.isArray(actualDraw.lottoPairs) ? actualDraw.lottoPairs : [];
      rawPairs.forEach(p => {
        try {
          const norm = InputNormalizer.normalizeLottoPair(p);
          actualWinningNumbers.push(norm);
          actualWinningSet.add(norm);
          actualWinningCounts.set(norm, (actualWinningCounts.get(norm) || 0) + 1);
        } catch (e) {}
      });
      specialPrize = actualDraw.specialPrize || (actualDraw.prizes && actualDraw.prizes.special ? actualDraw.prizes.special[0] : null);
    }

    // 4. Chạy từng thuật toán để sinh dự đoán và đối soát
    const algoResults = [];
    const predOptions = { ...options, isVietlott, stationId, totalBalls, targetDrawDate: targetDate };

    this.algorithms.forEach(algo => {
      try {
        const predResult = algo.predict(trainingData, predOptions);
        const status = predResult?.status || 'ok';

        if (status !== 'ok') {
          algoResults.push({
            algoId: algo.id,
            algoName: algo.name,
            status,
            error: predResult?.explanation || 'Status not ok',
            predictions: [],
            hitCount: 0,
            totalOccurrences: 0,
            totalPredicted: 0,
            hitRate: 0,
            hitDetails: []
          });
          return;
        }

        const rawPredictions = Array.isArray(predResult.predictions) ? predResult.predictions : [];
        const normalizedPreds = [];

        rawPredictions.forEach(p => {
          try {
            const normP = isVietlott 
              ? InputNormalizer.normalizeVietlottBall(p, totalBalls) 
              : InputNormalizer.normalizeLottoPair(p);
            if (!normalizedPreds.includes(normP)) {
              normalizedPreds.push(normP);
            }
          } catch (e) {}
        });

        // Đếm số lượng trúng và chi tiết
        let hitCount = 0;
        let totalOccurrences = 0;
        const hitDetails = [];

        normalizedPreds.forEach(p => {
          if (isVietlott) {
            if (actualWinningSet.has(p)) {
              hitCount++;
              totalOccurrences++;
              hitDetails.push({ num: p, hits: 1, isSpecial: false });
            }
          } else {
            const occurrences = actualWinningCounts.get(p) || 0;
            const isSpecialHit = specialPrize && String(specialPrize).trim().endsWith(p);
            if (occurrences > 0) {
              hitCount++;
              totalOccurrences += occurrences;
              hitDetails.push({ num: p, hits: occurrences, isSpecial: isSpecialHit });
            }
          }
        });

        const totalPredicted = normalizedPreds.length;
        const hitRate = totalPredicted > 0 ? Math.round((hitCount / totalPredicted) * 1000) / 10 : 0;

        algoResults.push({
          algoId: algo.id,
          algoName: algo.name,
          status: 'ok',
          predictions: normalizedPreds,
          hitCount,
          totalOccurrences,
          totalPredicted,
          hitRate,
          hitDetails,
          scoreType: predResult.scoreType || 'ranking-score',
          explanation: predResult.explanation
        });
      } catch (err) {
        algoResults.push({
          algoId: algo.id,
          algoName: algo.name,
          status: 'error',
          error: err.message,
          predictions: [],
          hitCount: 0,
          totalOccurrences: 0,
          totalPredicted: 0,
          hitRate: 0,
          hitDetails: []
        });
      }
    });

    // 5. Chạy đối chứng ngẫu nhiên (Random Baseline) trên 100 replicates độc lập (BT-01)
    let baselineResult = null;
    try {
      const basePred = this.baselineAlgorithm.predict(trainingData, predOptions);
      const replicates = basePred.replicateSamples || [basePred.predictions];
      const replicateHitRates = [];
      let totalReplicateHits = 0;

      replicates.forEach(sample => {
        let sampleHits = 0;
        sample.forEach(p => {
          const normP = isVietlott 
            ? InputNormalizer.normalizeVietlottBall(p, totalBalls) 
            : InputNormalizer.normalizeLottoPair(p);
          if (actualWinningSet.has(normP)) {
            sampleHits++;
          }
        });
        totalReplicateHits += sampleHits;
        const rate = sample.length > 0 ? (sampleHits / sample.length) * 100 : 0;
        replicateHitRates.push(rate);
      });

      const R = replicateHitRates.length;
      const baselineMean = R > 0 ? replicateHitRates.reduce((a, b) => a + b, 0) / R : 0;
      let variance = 0;
      if (R > 1) {
        variance = replicateHitRates.reduce((sum, r) => sum + Math.pow(r - baselineMean, 2), 0) / (R - 1);
      }
      const baselineSD = Math.sqrt(variance);
      const baselineSE = R > 0 ? baselineSD / Math.sqrt(R) : 0;
      const baselineCI95 = [
        Math.max(0, Math.round((baselineMean - 1.96 * baselineSE) * 10) / 10),
        Math.round((baselineMean + 1.96 * baselineSE) * 10) / 10
      ];

      baselineResult = {
        name: this.baselineAlgorithm.name,
        replicatesTested: R,
        predictions: basePred.predictions,
        hitCount: Math.round(totalReplicateHits / Math.max(R, 1)),
        hitRate: Math.round(baselineMean * 10) / 10,
        baselineMean: Math.round(baselineMean * 10) / 10,
        baselineSD: Math.round(baselineSD * 100) / 100,
        baselineSE: Math.round(baselineSE * 100) / 100,
        baselineCI95
      };
    } catch (err) {
      baselineResult = {
        name: this.baselineAlgorithm.name,
        status: 'error',
        error: err.message,
        hitRate: 0
      };
    }

    // Sắp xếp các model hợp lệ theo hitRate giảm dần
    algoResults.sort((a, b) => {
      if (a.status !== 'ok' && b.status === 'ok') return 1;
      if (a.status === 'ok' && b.status !== 'ok') return -1;
      return b.hitRate - a.hitRate || b.totalOccurrences - a.totalOccurrences;
    });

    const validResults = algoResults.filter(r => r.status === 'ok');

    return {
      success: true,
      targetDate,
      stationId,
      stationOrGame: options.stationOrGame || stationId,
      actualDraw,
      isSingleDrawValidation: true,
      rankingRunId: `single-${targetDate}-${Date.now()}`,
      trainingDataCount: trainingData.length,
      verifiedTrainingCount: trainingData.length,
      historyAvailableCount: fullHistory.length,
      excludedCountByReason: {
        'target-date-excluded': fullHistory.length - trainingData.length
      },
      windowPolicy: options.windowSize ? `Rolling Window ${options.windowSize} kỳ` : 'expanding-window',
      trainingDateRange: {
        from: trainingData[trainingData.length - 1]?.date || 'N/A',
        to: trainingData[0]?.date || 'N/A',
        start: trainingData[trainingData.length - 1]?.date || 'N/A',
        end: trainingData[0]?.date || 'N/A'
      },
      algoResults,
      baseline: baselineResult,
      summary: {
        bestAlgo: validResults[0] ? validResults[0].algoName : 'N/A',
        bestHitRate: validResults[0] ? validResults[0].hitRate : 0,
        randomBaselineHitRate: baselineResult?.hitRate || 0,
        averageHitRate: validResults.length > 0 
          ? Math.round((validResults.reduce((acc, c) => acc + c.hitRate, 0) / validResults.length) * 10) / 10 
          : 0
      }
    };
  },

  /**
   * Chạy kiểm định hàng loạt (Walk-Forward Batch Backtesting - BT-05)
   */
  runBatchBacktest(fullHistory, options = {}, numDraws = 20) {
    const isVietlott = Boolean(options.isVietlott);
    const stationId = options.stationId || options.stationOrGame || (isVietlott ? 'vietlott' : 'tphcm');

    // Lọc theo station trước khi chọn các target draws
    let filteredHistory = fullHistory;
    if (!isVietlott && stationId && stationId !== 'all') {
      filteredHistory = fullHistory.filter(d => d && d.stationId === stationId);
    }

    const sortedHistory = InputNormalizer.validateAndSortHistory(filteredHistory, options);
    const testDraws = sortedHistory.slice(0, numDraws);

    const statsByAlgo = {};
    this.algorithms.forEach(algo => {
      statsByAlgo[algo.id] = {
        id: algo.id,
        name: algo.name,
        foldsAttempted: 0,
        foldsSucceeded: 0,
        foldsFailed: 0,
        totalPredictions: 0,
        totalHits: 0,
        totalOccurrences: 0,
        foldHitRates: [],
        bestHitRate: 0,
        specialMatches: 0
      };
    });

    let baselineTotalRates = 0;
    let baselineFoldCount = 0;
    let successfulFolds = 0;

    // Walk-Forward Loop: Mỗi fold chỉ train trên dữ liệu strictly trước ngày của draw
    testDraws.forEach(draw => {
      const singleRes = this.runSingleDateBacktest(fullHistory, draw.date, { ...options, stationId });
      if (singleRes.success && singleRes.algoResults) {
        successfulFolds++;
        singleRes.algoResults.forEach(item => {
          const s = statsByAlgo[item.algoId];
          if (s) {
            s.foldsAttempted++;
            if (item.status === 'ok') {
              s.foldsSucceeded++;
              s.totalPredictions += item.totalPredicted;
              s.totalHits += item.hitCount;
              s.totalOccurrences += item.totalOccurrences;
              s.foldHitRates.push(item.hitRate);
              if (item.hitRate > s.bestHitRate) s.bestHitRate = item.hitRate;
              if (item.hitDetails && item.hitDetails.some(h => h.isSpecial)) s.specialMatches++;
            } else {
              s.foldsFailed++;
            }
          }
        });

        if (singleRes.baseline && singleRes.baseline.hitRate !== undefined) {
          baselineTotalRates += singleRes.baseline.hitRate;
          baselineFoldCount++;
        }
      }
    });

    if (successfulFolds === 0) {
      return {
        status: 'insufficient-data',
        success: false,
        drawsRequested: numDraws,
        drawsEligible: testDraws.length,
        drawsTestedCount: 0,
        drawsFailed: testDraws.length,
        baseline: null,
        leaderboard: [],
        message: 'Không đủ kỳ hợp lệ để thực hiện kiểm định hồi quy (0 fold thành công).'
      };
    }

    const baselineAvgHitRate = baselineFoldCount > 0 
      ? Math.round((baselineTotalRates / baselineFoldCount) * 10) / 10 
      : 0;

    // Tổng hợp các chỉ số độc lập theo BT-05
    const leaderboard = Object.values(statsByAlgo).map(s => {
      const meanFoldHitRate = s.foldHitRates.length > 0
        ? Math.round((s.foldHitRates.reduce((a, b) => a + b, 0) / s.foldHitRates.length) * 10) / 10
        : 0;

      const microHitRate = s.totalPredictions > 0
        ? Math.round((s.totalHits / s.totalPredictions) * 1000) / 10
        : 0;

      const meanOccurrencesPerDraw = s.foldsSucceeded > 0
        ? Math.round((s.totalOccurrences / s.foldsSucceeded) * 100) / 100
        : 0;

      const differenceVsBaseline = Math.round((meanFoldHitRate - baselineAvgHitRate) * 10) / 10;

      return {
        id: s.id,
        name: s.name,
        foldsAttempted: s.foldsAttempted,
        foldsSucceeded: s.foldsSucceeded,
        foldsFailed: s.foldsFailed,
        meanFoldHitRate,
        microHitRate,
        meanOccurrencesPerDraw,
        bestHitRate: s.bestHitRate,
        totalHits: s.totalHits,
        totalOccurrences: s.totalOccurrences,
        specialMatches: s.specialMatches,
        baselineMean: baselineAvgHitRate,
        differenceVsBaseline,
        exceedsBaseline: meanFoldHitRate > baselineAvgHitRate,
        avgHitRate: meanFoldHitRate,
        baselineDiff: differenceVsBaseline
      };
    });

    // Sắp xếp nhất quán: meanFoldHitRate -> differenceVsBaseline -> totalHits -> id
    leaderboard.sort((a, b) => {
      return b.meanFoldHitRate - a.meanFoldHitRate ||
             b.differenceVsBaseline - a.differenceVsBaseline ||
             b.totalHits - a.totalHits ||
             a.id.localeCompare(b.id);
    });

    leaderboard.forEach((item, idx) => {
      item.rank = idx + 1;
      item.isTop1 = idx === 0 && item.foldsSucceeded > 0;
    });

    return {
      status: 'ok',
      success: true,
      isSingleDrawValidation: false,
      rankingRunId: `batch-${Date.now()}`,
      totalFolds: successfulFolds,
      drawsRequested: numDraws,
      drawsEligible: testDraws.length,
      drawsTestedCount: successfulFolds,
      drawsFailed: testDraws.length - successfulFolds,
      primaryMetric: 'meanFoldHitRate',
      top1Algorithm: leaderboard[0] || null,
      top1Label: "Top 1 theo metric của mẫu backtest (không phải xác suất trúng)",
      disclaimer: "Kết quả kiểm định quá khứ dùng để so sánh hiệu năng tương đối; không cấu thành bảo đảm xác suất trúng trong tương lai.",
      baseline: {
        name: "Chuẩn Ngẫu Nhiên (Random Baseline)",
        meanHitRate: baselineAvgHitRate,
        avgHitRate: baselineAvgHitRate,
        replicatesPerFold: 100
      },
      leaderboard
    };
  }
};
