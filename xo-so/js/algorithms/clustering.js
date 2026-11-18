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
    let normHistory;
    try {
      normHistory = InputNormalizer.normalizeHistory(historyData, {
        ...options,
        minDraws: 1
      });
    } catch (err) {
      return {
        status: 'invalid-input',
        id: this.id,
        name: this.name,
        predictions: [],
        scores: {},
        scoreType: this.scoreType,
        metrics: { nDrawsEvaluated: 0, error: err.message },
        explanation: `Dữ liệu lịch sử không hợp lệ: ${err.message}`,
        warnings: [err.message]
      };
    }

    const isVietlott = InputNormalizer.resolveIsVietlott(options, normHistory);
    const totalBalls = InputNormalizer.resolveTotalBalls(options, normHistory, isVietlott);
    const universe = InputNormalizer.getUniverse({ ...options, isVietlott, totalBalls }, normHistory);
    const topN = options.topN || (isVietlott ? 6 : 5);
    const nDrawsRequested = options.analysisWindow || options.nDraws || 30;

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
    const evenUniverseCount = universe.members.filter(m => Number(m) % 2 === 0).length;
    const theoreticalEvenRatio = universeSize > 0
      ? Math.round((evenUniverseCount / universeSize) * 1000) / 1000
      : 0.5;
    const highThreshold = Math.ceil(theoreticalMean);
    const theoreticalHighRatio = universeSize > 0
      ? Math.round(((maxNum - highThreshold + 1) / universeSize) * 1000) / 1000
      : 0.5;

    // 1. Thống kê tần suất toàn cửa sổ, xung lượng ngắn hạn và khoảng cách hiện tại (bất biến nhãn số - Label Exchangeability)
    const freq = new Map();
    const shortFreq = new Map();
    const lastSeen = new Map();
    const shortWindow = Math.max(1, Math.ceil(nDraws / 3));

    universe.members.forEach(m => {
      freq.set(m, 0);
      shortFreq.set(m, 0);
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
        if (val >= highThreshold) totalHighCount += count; else totalLowCount += count;

        if (freq.has(ball)) {
          freq.set(ball, freq.get(ball) + count);
          if (idx < shortWindow) {
            shortFreq.set(ball, shortFreq.get(ball) + count);
          }
          if (lastSeen.get(ball) === -1) {
            lastSeen.set(ball, idx);
          }
        }
      });
    }

    const observedEvenRatio = totalBallCount > 0 ? totalEvenCount / totalBallCount : 0.5;
    const observedHighRatio = totalBallCount > 0 ? totalHighCount / totalBallCount : 0.5;
    const observedMean = totalBallCount > 0 ? totalSum / totalBallCount : theoreticalMean;

    // 2. Xây dựng feature vectors thực nghiệm chuẩn hóa nghiêm ngặt trong [0, 1] và bất biến hoán vị nhãn
    let minFreq = Infinity, maxFreq = -Infinity;
    let minShort = Infinity, maxShort = -Infinity;
    universe.members.forEach(cand => {
      const c = freq.get(cand) || 0;
      const sc = shortFreq.get(cand) || 0;
      if (c < minFreq) minFreq = c;
      if (c > maxFreq) maxFreq = c;
      if (sc < minShort) minShort = sc;
      if (sc > maxShort) maxShort = sc;
    });

    const featureVectors = [];
    universe.members.forEach(cand => {
      const count = freq.get(cand) || 0;
      const sCount = shortFreq.get(cand) || 0;
      const seenIdx = lastSeen.get(cand);
      const currentGap = seenIdx === -1 ? nDraws : seenIdx;

      // Feature 1: Tần suất chuẩn hóa toàn cửa sổ [0, 1]
      const f1 = maxFreq > minFreq ? (count - minFreq) / (maxFreq - minFreq) : (maxFreq > 0 ? 0.5 : 0);
      // Feature 2: Độ tươi mới chuẩn hóa [0, 1] (1 = vừa ra, 0 = chưa về trong cửa sổ)
      const f2 = Math.max(0, 1 - (currentGap / nDraws));
      // Feature 3: Xung lượng ngắn hạn chuẩn hóa [0, 1]
      const f3 = maxShort > minShort ? (sCount - minShort) / (maxShort - minShort) : (maxShort > 0 ? 0.5 : 0);

      featureVectors.push({
        num: cand,
        vector: [f1, f2, f3],
        currentGap,
        count
      });
    });

    // 3. Khởi tạo K=3 centroids xác định trong không gian hành vi [0, 1]^3
    const K = 3;
    let centroids = [
      [0.2, 0.2, 0.2], // Khởi tạo Cụm 0: Cold / Ít về
      [0.5, 0.5, 0.5], // Khởi tạo Cụm 1: Moderate / Trung bình
      [0.8, 0.8, 0.8]  // Khởi tạo Cụm 2: Active / Điểm rơi
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
    let clusterAssignments = new Array(featureVectors.length).fill(0);

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

      // Xử lý cụm rỗng an toàn: chỉ rút phần tử xa tâm cụm nhất từ cụm đang có > 1 phần tử
      const memberCounts = new Array(K).fill(0);
      for (let i = 0; i < clusterAssignments.length; i++) {
        memberCounts[clusterAssignments[i]]++;
      }
      for (let k = 0; k < K; k++) {
        if (memberCounts[k] === 0 && featureVectors.length >= K) {
          let farthestIdx = -1;
          let farthestDist = -1;
          for (let i = 0; i < featureVectors.length; i++) {
            const curK = clusterAssignments[i];
            if (memberCounts[curK] <= 1) continue;
            const d = dist(featureVectors[i].vector, centroids[curK]);
            if (d > farthestDist) {
              farthestDist = d;
              farthestIdx = i;
            }
          }
          if (farthestIdx !== -1 && farthestDist > 1e-6) {
            const donorK = clusterAssignments[farthestIdx];
            memberCounts[donorK]--;
            memberCounts[k]++;
            clusterAssignments[farthestIdx] = k;
            changed = true;
          }
        }
      }

      // Update centroids
      let maxCentroidShift = 0;
      for (let k = 0; k < K; k++) {
        const members = featureVectors.filter((_, idx) => clusterAssignments[idx] === k);
        if (members.length === 0) continue;

        const newC = [0, 0, 0];
        members.forEach(m => {
          for (let d = 0; d < 3; d++) newC[d] += m.vector[d];
        });
        for (let d = 0; d < 3; d++) newC[d] /= members.length;

        const shift = dist(centroids[k], newC);
        if (shift > maxCentroidShift) maxCentroidShift = shift;
        centroids[k] = newC;
      }

      if (!changed || maxCentroidShift < 1e-4) break;
    }

    // Sắp xếp lại nhãn cụm theo mức hoạt động của tâm cụm tăng dần: 0 = Cold, 1 = Moderate, 2 = Active
    // Khắc phục triệt để hiện tượng đảo nhãn tâm cụm (Label Switching) giữa các tập dữ liệu
    const clusterOrder = [0, 1, 2].sort((ka, kb) => {
      const actA = (centroids[ka][0] + centroids[ka][1] + centroids[ka][2]) / 3;
      const actB = (centroids[kb][0] + centroids[kb][1] + centroids[kb][2]) / 3;
      return actA - actB;
    });
    const oldToRankedCluster = new Map();
    clusterOrder.forEach((oldK, rankedK) => {
      oldToRankedCluster.set(oldK, rankedK);
    });

    centroids = clusterOrder.map(oldK => centroids[oldK]);
    clusterAssignments = clusterAssignments.map(oldK => oldToRankedCluster.get(oldK));

    // 4. Tính điểm xếp hạng (Ranking Score) dựa trên bậc cụm, mức hoạt động và độ gắn kết tâm cụm
    const clusterWeights = [0.3, 0.7, 1.0];
    const candidateScores = [];

    for (let i = 0; i < featureVectors.length; i++) {
      const item = featureVectors[i];
      const k = clusterAssignments[i];
      const d = dist(item.vector, centroids[k]);
      const proximity = 1 / (1 + d);
      const activityScore = item.vector[0] * 0.45 + item.vector[1] * 0.30 + item.vector[2] * 0.25;
      const rawScore = clusterWeights[k] * 50 + activityScore * 30 + proximity * 20;

      candidateScores.push({
        num: item.num,
        rawScore,
        cluster: k,
        distToCentroid: Math.round(d * 1000) / 1000
      });
    }

    // Mid-rank Percentile-Rank normalization [0, 100] (bảo toàn đồng điểm khi bằng nhau)
    const ascScores = candidateScores.slice().sort((a, b) => a.rawScore - b.rawScore);
    const N = candidateScores.length;
    const scores = {};

    candidateScores.forEach(item => {
      let lessCount = 0;
      let equalCount = 0;
      for (let j = 0; j < N; j++) {
        if (Math.abs(ascScores[j].rawScore - item.rawScore) <= 1e-12) {
          equalCount++;
        } else if (ascScores[j].rawScore < item.rawScore) {
          lessCount++;
        }
      }
      const rankScore = N > 1
        ? Math.round((((lessCount + 0.5 * Math.max(0, equalCount - 1)) / (N - 1)) * 100) * 10) / 10
        : 50;
      scores[item.num] = rankScore;
      item.score = rankScore;
    });

    candidateScores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
      return InputNormalizer.compareCanonical(a.num, b.num);
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
        highRatio: observedHighRatio,
        theoreticalHighRatio,
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
