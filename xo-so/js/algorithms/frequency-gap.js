/**
 * THUẬT TOÁN 4: Phân Tích Tần Suất & Chu Kỳ Lô Gan (Frequency & Gap Analysis - FIX-9)
 * 
 * Sửa triệt để các lỗi toán học:
 *  - ALG-01: Phân biệt never-observed, one-observation, has-intervals.
 *            Không gán avgCycle = nDraws cho số chưa từng về.
 *  - ALG-02: recentWindow = min(configuredWindow, nDraws), recentRate = hitsInRecentWindow / recentWindow.
 *            Tách biệt hitsInRecentWindow và totalHits.
 */

import { validateAndSortHistory, getDrawEventSet, getUniverse } from './input-normalizer.js';

export const FrequencyGapAlgorithm = {
  id: "frequency-gap",
  name: "Tần suất & Chu kỳ Lô Gan",

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
    const nDraws = Math.min(nDrawsTotal, options.analysisWindow || 50);

    if (nDraws === 0) {
      return {
        status: 'insufficient-data',
        id: this.id,
        name: this.name,
        predictions: [],
        scores: {},
        scoreType: 'ranking-score',
        metrics: { nDrawsInput: nDrawsTotal, nDrawsUsed: 0 },
        explanation: 'Chưa đủ dữ liệu lịch sử để phân tích tần suất và chu kỳ lô gan.',
        warnings: ['Dữ liệu lịch sử rỗng']
      };
    }

    const isVietlott = options.isVietlott !== false;
    const topN = options.topN || (isVietlott ? 6 : 5);
    const universe = getUniverse({ isVietlott, totalBalls: options.totalBalls });

    const gapStats = {};
    for (const item of universe) {
      gapStats[item] = {
        num: item,
        currentGap: -1,
        intervals: [],
        lastSeenIdx: -1,
        totalHits: 0
      };
    }

    // Duyệt cửa sổ nDraws từ kỳ mới nhất (index 0) đến kỳ cũ nhất
    for (let idx = 0; idx < nDraws; idx++) {
      const draw = sortedHistory[idx];
      const eventSet = getDrawEventSet(draw, { isVietlott, totalBalls: options.totalBalls });

      for (const num of eventSet) {
        if (gapStats[num]) {
          gapStats[num].totalHits++;
          if (gapStats[num].lastSeenIdx === -1) {
            gapStats[num].currentGap = idx;
          } else {
            gapStats[num].intervals.push(idx - gapStats[num].lastSeenIdx);
          }
          gapStats[num].lastSeenIdx = idx;
        }
      }
    }

    // Xác định recentWindow chuẩn xác (ALG-02)
    const configuredWindow = options.recentWindow || 15;
    const recentWindow = Math.min(configuredWindow, nDraws);
    const recentDraws = sortedHistory.slice(0, recentWindow);
    const recentHitsMap = new Map();

    for (const draw of recentDraws) {
      const eventSet = getDrawEventSet(draw, { isVietlott, totalBalls: options.totalBalls });
      for (const num of eventSet) {
        recentHitsMap.set(num, (recentHitsMap.get(num) || 0) + 1);
      }
    }

    // Hoàn tất tính toán chỉ số cho từng số trong universe (ALG-01)
    for (const num of universe) {
      const item = gapStats[num];

      if (item.totalHits === 0) {
        // Trạng thái 1: Chưa từng xuất hiện trong toàn bộ cửa sổ nDraws (FIX10-05)
        item.evidenceStatus = 'never-observed';
        item.gapStatus = 'insufficient-occurrences';
        item.currentGap = nDraws;
        item.avgCycle = null;
        item.ripenessIndex = null;
        item.maxGap = nDraws;
        item.cycleScore = 20;
      } else if (item.intervals.length === 0) {
        // Trạng thái 2: Chỉ xuất hiện đúng 1 lần duy nhất (FIX10-05)
        item.evidenceStatus = 'one-observation';
        item.gapStatus = 'insufficient-occurrences';
        item.avgCycle = null;
        item.ripenessIndex = null;
        item.maxGap = Math.max(item.currentGap, nDraws - 1 - item.lastSeenIdx);
        item.cycleScore = 35;
      } else {
        // Trạng thái 3: Có từ 2 lần xuất hiện trở lên -> có ít nhất 1 khoảng cách (interval)
        item.evidenceStatus = 'has-intervals';
        item.gapStatus = 'has-intervals';
        const sumIntervals = item.intervals.reduce((a, b) => a + b, 0);
        item.avgCycle = Math.round((sumIntervals / item.intervals.length) * 10) / 10;
        item.maxGap = Math.max(...item.intervals, item.currentGap);

        if (item.avgCycle > 0) {
          const ratio = item.currentGap / item.avgCycle;
          item.ripenessIndex = Math.round(ratio * 100) / 100;

          // Điểm chu kỳ chín muồi phân phối hình chuông xung quanh ratio = 1.0
          if (ratio >= 0.7 && ratio <= 1.4) {
            item.cycleScore = 90 - Math.abs(1.0 - ratio) * 50;
          } else if (ratio < 0.7) {
            item.cycleScore = 40 + ratio * 30; // Vừa ra, chưa tới điểm rơi chu kỳ
          } else {
            item.cycleScore = Math.max(10, 80 - (ratio - 1.4) * 25); // Gan quá lâu
          }
        } else {
          item.ripenessIndex = null;
          item.cycleScore = 30;
        }
      }

      // Tần suất trong cửa sổ gần đây (ALG-02 & FIX10-05)
      const hitsInRecent = recentHitsMap.get(num) || 0;
      item.hitsInRecentWindow = hitsInRecent;
      item.recentWindow = recentWindow;
      item.recentRate = recentWindow > 0 ? (hitsInRecent / recentWindow) : 0;
      item.frequencyScore = Math.round(item.recentRate * 1000) / 10;
      item.gapDescriptiveScore = item.cycleScore;

      // Điểm tổng hợp xếp hạng: 60% chu kỳ mô tả + 40% tần suất gần đây
      item.finalScore = Math.round((item.cycleScore * 0.6 + item.frequencyScore * 0.4) * 10) / 10;
    }

    const stats = Object.values(gapStats);
    const scores = {};
    for (const s of stats) {
      scores[s.num] = s.finalScore;
    }

    // Sắp xếp giảm dần theo điểm số tổng hợp, tie-break theo khoảng cách vắng mặt
    stats.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      if (a.currentGap !== b.currentGap) return a.currentGap - b.currentGap;
      return String(a.num).localeCompare(String(b.num));
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
        recentWindow,
        topRipeNumbers: stats
          .filter(s => s.ripenessIndex !== null)
          .slice(0, 5)
          .map(s => ({ num: s.num, gap: s.currentGap, avgCycle: s.avgCycle, ripeness: s.ripenessIndex, score: s.finalScore })),
        maxGanDetected: stats.slice().sort((a, b) => b.currentGap - a.currentGap).slice(0, 5),
        topDetails: stats.map(s => ({
          num: s.num,
          evidenceStatus: s.evidenceStatus,
          currentGap: s.currentGap,
          avgCycle: s.avgCycle,
          ripenessIndex: s.ripenessIndex,
          hitsInRecentWindow: s.hitsInRecentWindow,
          recentWindow: s.recentWindow,
          recentRate: s.recentRate,
          totalHits: s.totalHits,
          hits15: s.totalHits
        }))
      },
      explanation: `Xếp hạng heuristic theo độ lệch chu kỳ chín muồi (Ripeness Index) và tần suất quan sát trong ${recentWindow} kỳ gần nhất. Top ${topN} ứng viên: ${topCandidates.join(', ')}.`
    };
  }
};
