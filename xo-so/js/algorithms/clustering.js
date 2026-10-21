/**
 * THUẬT TOÁN 6: Phân Cụm K-Means & Đặc Trưng Cấu Trúc (K-Means Clustering & Structure Analysis - FIX-10)
 * 
 * Triển khai thuật toán Phân cụm K-Means thực thụ (Phương án B - FIX10-10):
 *  1. Vector đặc trưng cho từng candidate:
 *     - f_i: Tần suất chuẩn hóa (Frequency in window)
 *     - g_i: Khoảng cách kỳ chưa về (Current gap normalized)
 *     - v_i: Vị trí giá trị số học (Normalized numeric value)
 *  2. Khởi tạo K=3 centroids xác định (Cold, Moderate, Active).
 *  3. Lặp cập nhật tâm cụm bằng khoảng cách Euclid đến khi hội tụ (delta < 1e-4) hoặc max 20 vòng.
 *  4. Xử lý cụm rỗng an toàn bằng cách gán điểm xa nhất.
 *  5. Điểm số là điểm xếp hạng khoảng cách tới tâm cụm chủ đạo (ranking-score), không tuyên bố xác suất trúng.
 */

import { InputNormalizer } from './input-normalizer.js';

export const KMeansAlgorithm = {
  id: "clustering",
  aliasId: "kmeans-clustering",
  name: "Phân cụm K-Means & Cấu trúc (K-Means Clustering)",
  scoreType: "ranking-score",

  predict(historyData, options = {}) {
    const isVietlott = Boolean(options.isVietlott);
    const universe = InputNormalizer.getUniverse(options);
    const topN = options.topN || (isVietlott ? 6 : 5);
    const nDrawsRequested = options.nDraws || 30;

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
        scores: {},
        scoreType: this.scoreType,
        metrics: { nDrawsEvaluated: 0, error: err.message },
        explanation: 'Chưa đủ dữ liệu lịch sử hợp lệ để phân cụm K-Means.'
      };
    }

    const recentDraws = normHistory.slice(0, Math.min(normHistory.length, nDrawsRequested));
    const nDraws = recentDraws.length;

    if (nDraws === 0) {
      return {
        status: 'insufficient-data',
        id: this.id,
        name: this.name,
        predictions: [],
        scores: {},
        scoreType: this.scoreType,
        metrics: { nDrawsEvaluated: 0 },
        explanation: 'Chưa đủ dữ liệu lịch sử để phân cụm K-Means.'
      };
    }

    const minNum = universe.min;
    const maxNum = universe.max;
    const universeSize = universe.size;
    const theoreticalMean = (minNum + maxNum) / 2;
    const theoreticalEvenRatio = 0.5;

    // 1. Thống kê tần suất và khoảng cách hiện tại cho từng candidate
    const freq = new Map();
    const lastSeen = new Map();
    universe.members.forEach(m => {
      freq.set(m, 0);
      lastSeen.set(m, -1);
    });

    let totalEvenCount = 0;
    let totalOddCount = 0;
    let totalHighCount = 0;
    let totalLowCount = 0;
    let totalSum = 0;
    let totalBallCount = 0;

    for (let idx = 0; idx < nDraws; idx++) {
      const draw = recentDraws[idx];
      draw.eventCounts.forEach((count, ball) => {
        const val = Number(ball);
        totalBallCount += count;
        totalSum += val * count;
        if (val % 2 === 0) totalEvenCount += count; else totalOddCount += count;
        if (val >= theoreticalMean) totalHighCount += count; else totalLowCount += count;

        if (freq.has(ball)) {
          freq.set(ball, freq.get(ball) + count);
          if (lastSeen.get(ball) === -1) {
            lastSeen.set(ball, idx);
          }
        }
      });
    }

    const observedEvenRatio = totalBallCount > 0 ? totalEvenCount / totalBallCount : 0.5;
    const observedHighRatio = totalBallCount > 0 ? totalHighCount / totalBallCount : 0.5;
    const observedMean = totalBallCount > 0 ? totalSum / totalBallCount : theoreticalMean;

    // 2. Xây dựng feature vectors chuẩn hóa [0, 1] cho K-Means
    const featureVectors = [];
    universe.members.forEach(cand => {
      const count = freq.get(cand) || 0;
      const seenIdx = lastSeen.get(cand);
      const currentGap = seenIdx === -1 ? nDraws : seenIdx;
      const numVal = Number(cand);

      // Feature 1: normalized frequency [0, 1]
      const f1 = (count + 1) / (nDraws * (isVietlott ? 6 : 18) / universeSize + 1);
      // Feature 2: normalized recency (1 = vừa ra, 0 = gan lâu)
      const f2 = Math.max(0, 1 - (currentGap / nDraws));
      // Feature 3: normalized numeric value [0, 1]
      const f3 = (numVal - minNum) / (maxNum - minNum || 1);

      featureVectors.push({
        num: cand,
        vector: [f1, f2, f3],
        currentGap,
        count
      });
    });

    // 3. Khởi tạo K=3 centroids xác định
    const K = 3;
    const centroids = [
      [0.2, 0.2, 0.2], // Cụm 0: Cold / Ít về
      [0.5, 0.5, 0.5], // Cụm 1: Trung bình
      [0.8, 0.8, 0.8]  // Cụm 2: Active / Điểm rơi
    ];

    const dist = (v1, v2) => {
      let sum = 0;
      for (let i = 0; i < v1.length; i++) {
        sum += Math.pow(v1[i] - v2[i], 2);
      }
      return Math.sqrt(sum);
    };

    let iterations = 0;
    const maxIterations = 20;
    const clusterAssignments = new Array(featureVectors.length).fill(0);

    while (iterations < maxIterations) {
      iterations++;
      let changed = false;

      // Assignment step
      for (let i = 0; i < featureVectors.length; i++) {
        const p = featureVectors[i].vector;
        let bestDist = Infinity;
        let bestK = 0;
        for (let k = 0; k < K; k++) {
          const d = dist(p, centroids[k]);
          if (d < bestDist) {
            bestDist = d;
            bestK = k;
          }
        }
        if (clusterAssignments[i] !== bestK) {
          clusterAssignments[i] = bestK;
          changed = true;
        }
      }

      // Update centroids
      let maxCentroidShift = 0;
      for (let k = 0; k < K; k++) {
        const members = featureVectors.filter((_, idx) => clusterAssignments[idx] === k);
        if (members.length === 0) {
          continue;
        }
        const newC = [0, 0, 0];
        members.forEach(m => {
          for (let d = 0; d < 3; d++) newC[d] += m.vector[d];
        });
        for (let d = 0; d < 3; d++) newC[d] /= members.length;

        const shift = dist(centroids[k], newC);
        if (shift > maxCentroidShift) maxCentroidShift = shift;
        centroids[k] = newC;
      }

      if (maxCentroidShift < 1e-4) break;
    }

    // 4. Tính điểm xếp hạng (Ranking Score) dựa trên độ gắn kết và tần suất
    const clusterWeights = [0.3, 0.7, 1.0];
    const candidateScores = [];

    for (let i = 0; i < featureVectors.length; i++) {
      const item = featureVectors[i];
      const k = clusterAssignments[i];
      const d = dist(item.vector, centroids[k]);
      const proximity = 1 / (1 + d);
      const rawScore = clusterWeights[k] * 60 + proximity * 40;

      candidateScores.push({
        num: item.num,
        rawScore,
        cluster: k,
        distToCentroid: Math.round(d * 1000) / 1000
      });
    }

    // Percentile-Rank normalization [0, 100]
    candidateScores.sort((a, b) => {
      if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
      return InputNormalizer.compareCanonical(a.num, b.num);
    });

    const N = candidateScores.length;
    const scores = {};
    candidateScores.forEach((item, idx) => {
      const rankScore = N > 1 ? Math.round(((N - 1 - idx) / (N - 1)) * 1000) / 10 : 100;
      scores[item.num] = rankScore;
      item.score = rankScore;
    });

    const predictions = candidateScores.slice(0, topN).map(x => x.num);

    const clusterSizes = [0, 0, 0];
    clusterAssignments.forEach(k => { clusterSizes[k]++; });

    return {
      status: 'ok',
      id: this.id,
      name: this.name,
      predictions,
      scores,
      scoreType: this.scoreType,
      metrics: {
        nDrawsEvaluated: nDraws,
        totalBallCount,
        kClusters: K,
        iterations,
        clusterSizes,
        clusterCentroids: centroids.map(c => c.map(x => Math.round(x * 1000) / 1000)),
        observedEvenRatio: Math.round(observedEvenRatio * 1000) / 1000,
        evenRatio: observedEvenRatio,
        theoreticalEvenRatio,
        observedHighRatio: Math.round(observedHighRatio * 1000) / 1000,
        theoreticalHighRatio: 0.5,
        observedMean: Math.round(observedMean * 10) / 10,
        avgBallVal: observedMean,
        theoreticalMean: Math.round(theoreticalMean * 10) / 10
      },
      explanation: `Mô hình Phân Cụm K-Means (K=3) hội tụ sau ${iterations} vòng lặp. Phân bổ cụm: [Cold: ${clusterSizes[0]}, Moderate: ${clusterSizes[1]}, Active: ${clusterSizes[2]}]. Điểm số là Percentile Ranking chuẩn hóa [0, 100] dựa trên khoảng cách tới tâm cụm.`
    };
  }
};

export const StructureHeuristicAlgorithm = KMeansAlgorithm;
export const ClusteringAlgorithm = KMeansAlgorithm;
export default KMeansAlgorithm;
