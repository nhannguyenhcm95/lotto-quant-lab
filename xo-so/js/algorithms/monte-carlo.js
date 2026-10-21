/**
 * THUẬT TOÁN 3: Mô Phỏng Số Học Monte Carlo (Monte Carlo Simulation - FIX-9)
 * 
 * Sửa triệt để các lỗi kỹ thuật (ALG-06):
 *  1. Weighted sampling without replacement đúng nghĩa cho Vietlott (không bao giờ trả thiếu bóng).
 *  2. Tách biệt hai metric cho XSMN: probabilityAtLeastOnce và expectedOccurrencesPerDraw.
 *  3. deriveSeedFromHistory() phụ thuộc 100% vào toàn bộ nội dung canonical history.
 *  4. Tính sai số chuẩn Monte Carlo (SE) chính xác theo công thức thống kê.
 */

import { validateAndSortHistory, getDrawEventSet, getDrawEventCounts, getUniverse } from './input-normalizer.js';

/**
 * Thuật toán băm chuỗi deterministic 32-bit (FNV-1a kết hợp avalanche mix)
 * Tương thích 100% cả môi trường Trình duyệt (Browser) lẫn Node.js không cần import module ngoại vi.
 */
function hashStringToUint32(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // 32-bit avalanche mixing (Murmur3 style)
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) || 123456789;
}

/**
 * Thuật toán sinh số ngẫu nhiên giả lập Mulberry32 xác định
 */
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tạo seed xác định dựa trên toàn bộ nội dung canonical của lịch sử (ALG-06)
 */
function deriveSeedFromHistory(historyData, isVietlott, extra = '') {
  if (!historyData || !historyData.length) return isVietlott ? 450001 : 990001;
  const canonicalStr = historyData.map(d => {
    const nums = Array.isArray(d.winningNumbers) 
      ? d.winningNumbers.slice().sort((a, b) => a - b).join('-')
      : (Array.isArray(d.lottoPairs) ? d.lottoPairs.slice().sort().join('-') : '');
    return `${d.drawId || ''}:${d.date || ''}:${nums}`;
  }).join('|') + `|${isVietlott ? 'V' : 'M'}|${extra}`;

  return hashStringToUint32(canonicalStr);
}

/**
 * Lấy mẫu có trọng số KHÔNG HOÀN LẠI (Weighted Sampling Without Replacement - ALG-06)
 */
function weightedSampleWithoutReplacement(items, k, rng) {
  if (!Number.isInteger(k) || k <= 0 || k > items.length) {
    throw new RangeError(`Pick count ${k} outside available universe size ${items.length}`);
  }
  const remaining = items.map(x => ({ value: x.num, weight: Math.max(x.weight, 1e-6) }));
  const picked = [];

  while (picked.length < k) {
    let totalWeight = 0;
    for (let i = 0; i < remaining.length; i++) {
      totalWeight += remaining[i].weight;
    }
    if (!(totalWeight > 0) || !Number.isFinite(totalWeight)) {
      throw new Error('Invalid remaining weight in Monte Carlo sampler');
    }

    let r = rng() * totalWeight;
    let selectedIdx = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      r -= remaining[i].weight;
      if (r <= 0) {
        selectedIdx = i;
        break;
      }
    }

    picked.push(remaining[selectedIdx].value);
    remaining.splice(selectedIdx, 1);
  }

  return picked;
}

export const MonteCarloAlgorithm = {
  id: "monte-carlo",
  name: "Mô phỏng Monte Carlo (10k)",

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
    const nDraws = Math.min(nDrawsTotal, options.analysisWindow || 35);
    const SIMULATIONS = Number.isInteger(options.simulations) && options.simulations > 0 ? options.simulations : 10000;

    if (nDraws === 0) {
      return {
        status: 'insufficient-data',
        id: this.id,
        name: this.name,
        predictions: [],
        scores: {},
        scoreType: 'ranking-score',
        metrics: { totalSimulations: 0, nDrawsInput: nDrawsTotal, nDrawsUsed: 0 },
        explanation: 'Chưa đủ dữ liệu lịch sử để thực hiện mô phỏng Monte Carlo.',
        warnings: ['Dữ liệu lịch sử rỗng']
      };
    }

    const isVietlott = options.isVietlott !== false;
    const universe = getUniverse({ isVietlott, totalBalls: options.totalBalls });
    const topN = options.topN || (isVietlott ? 6 : 5);
    const numDrawBalls = isVietlott ? (options.pickBalls || 6) : 18;

    if (isVietlott && numDrawBalls > universe.length) {
      return {
        status: 'invalid-input',
        id: this.id,
        name: this.name,
        predictions: [],
        scores: {},
        scoreType: 'ranking-score',
        metrics: { error: 'pickBalls cannot exceed universe size' },
        explanation: 'Số bóng cần rút vượt quá phạm vi universe.',
        warnings: ['pickBalls > universeSize']
      };
    }

    // 1. Khởi tạo Seeded PRNG phụ thuộc toàn bộ history content (ALG-06)
    const seed = options.seed !== undefined 
      ? options.seed 
      : deriveSeedFromHistory(sortedHistory, isVietlott, `${numDrawBalls}_${SIMULATIONS}`);
    const random = mulberry32(seed);

    // 2. Thống kê tần suất lịch sử làm trọng số thực nghiệm (Empirical Weights)
    const rawCounts = new Map();
    for (const num of universe) {
      rawCounts.set(num, 0);
    }

    for (let i = 0; i < nDraws; i++) {
      const draw = sortedHistory[i];
      if (isVietlott) {
        const eventSet = getDrawEventSet(draw, { isVietlott, totalBalls: options.totalBalls });
        for (const num of eventSet) {
          rawCounts.set(num, (rawCounts.get(num) || 0) + 1);
        }
      } else {
        const counts = getDrawEventCounts(draw, { isVietlott, totalBalls: options.totalBalls });
        counts.forEach((c, num) => {
          rawCounts.set(num, (rawCounts.get(num) || 0) + c);
        } );
      }
    }

    // Laplace Smoothing để mọi số đều có cơ hội xuất hiện
    const itemsWithWeights = universe.map(num => ({
      num,
      weight: (rawCounts.get(num) || 0) + 1
    }));

    // 3. Thực hiện mô phỏng Monte Carlo
    const totalOccurrencesMap = new Map();
    const simsWithAnyHitMap = new Map();
    for (const num of universe) {
      totalOccurrencesMap.set(num, 0);
      simsWithAnyHitMap.set(num, 0);
    }

    if (isVietlott) {
      // Vietlott: Rút KHÔNG HOÀN LẠI đúng numDrawBalls số phân biệt
      for (let sim = 0; sim < SIMULATIONS; sim++) {
        const picked = weightedSampleWithoutReplacement(itemsWithWeights, numDrawBalls, random);
        for (const b of picked) {
          totalOccurrencesMap.set(b, totalOccurrencesMap.get(b) + 1);
          simsWithAnyHitMap.set(b, simsWithAnyHitMap.get(b) + 1);
        }
      }
    } else {
      // XSMN: 18 lượt rút có hoàn lại (mỗi giải là một lượt độc lập)
      // Xây dựng CDF cho 1 lượt rút
      const totalW = itemsWithWeights.reduce((s, x) => s + x.weight, 0);
      const cdf = [];
      let accum = 0;
      for (const item of itemsWithWeights) {
        accum += item.weight / totalW;
        cdf.push({ num: item.num, cumProb: accum });
      }

      const sampleOne = () => {
        const r = random();
        for (let i = 0; i < cdf.length; i++) {
          if (r <= cdf[i].cumProb) return cdf[i].num;
        }
        return cdf[cdf.length - 1].num;
      };

      for (let sim = 0; sim < SIMULATIONS; sim++) {
        const simSet = new Set();
        for (let prize = 0; prize < numDrawBalls; prize++) {
          const ball = sampleOne();
          totalOccurrencesMap.set(ball, totalOccurrencesMap.get(ball) + 1);
          simSet.add(ball);
        }
        for (const b of simSet) {
          simsWithAnyHitMap.set(b, simsWithAnyHitMap.get(b) + 1);
        }
      }
    }

    // 4. Tính toán Metrics và Scores (FIX10-08)
    const scores = {};
    const probAtLeastOnceMap = {};
    const expectedOccurrencesMap = {};
    const standardErrorsMap = {};
    const standardDeviationsMap = {};
    const candidateList = [];

    for (const num of universe) {
      const hitsAny = simsWithAnyHitMap.get(num) || 0;
      const totalOcc = totalOccurrencesMap.get(num) || 0;

      const pAtLeastOnce = hitsAny / SIMULATIONS;
      const expOccurrences = totalOcc / SIMULATIONS;
      const se = Math.sqrt((pAtLeastOnce * (1 - pAtLeastOnce)) / SIMULATIONS);
      const sd = Math.sqrt((SIMULATIONS / (SIMULATIONS - 1)) * pAtLeastOnce * (1 - pAtLeastOnce));

      probAtLeastOnceMap[num] = Math.round(pAtLeastOnce * 10000) / 10000;
      expectedOccurrencesMap[num] = Math.round(expOccurrences * 10000) / 10000;
      standardErrorsMap[num] = Math.round(se * 100000) / 100000;
      standardDeviationsMap[num] = Math.round(sd * 100000) / 100000;

      const scoreVal = isVietlott 
        ? Math.round(pAtLeastOnce * 1000) / 10 // Phần trăm xuất hiện (0-100)
        : Math.round(expOccurrences * 100) / 100; // Số lần xuất hiện kỳ vọng
      scores[num] = scoreVal;

      candidateList.push({
        num,
        score: scoreVal,
        pAtLeastOnce,
        expOccurrences,
        se,
        sd
      });
    }

    // Sắp xếp giảm dần theo điểm số
    candidateList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.pAtLeastOnce !== a.pAtLeastOnce) return b.pAtLeastOnce - a.pAtLeastOnce;
      return String(a.num).localeCompare(String(b.num));
    });

    const topCandidates = candidateList.slice(0, topN).map(c => c.num);

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
        simulationsExecuted: SIMULATIONS,
        completedReplicates: SIMULATIONS,
        incompleteReplicates: 0,
        seedUsed: seed,
        probabilityAtLeastOnce: probAtLeastOnceMap,
        expectedOccurrencesPerDraw: expectedOccurrencesMap,
        standardErrors: standardErrorsMap,
        standardDeviations: standardDeviationsMap,
        topConvergedNumbers: candidateList.slice(0, 5).map(c => ({
          num: c.num,
          score: c.score,
          probAtLeastOnce: c.pAtLeastOnce,
          expectedOccurrences: c.expOccurrences,
          stdError: c.se,
          stdDev: c.sd
        }))
      },
      explanation: `Mô phỏng ngẫu nhiên ${SIMULATIONS.toLocaleString()} kịch bản độc lập (Seeded PRNG: ${seed}, 100% completed replicates). Top ${topN} ứng viên hội tụ cao nhất: ${topCandidates.join(', ')}.`
    };
  }
};
