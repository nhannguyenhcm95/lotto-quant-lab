/**
 * LOTTO-QUANT LAB: WALK-FORWARD BACKTEST & ALGORITHM REFERENCE EXPORTER (FIX-9)
 * 
 * Thực thi kiểm định Walk-Forward ngoài mẫu (Out-of-sample) 0% Lookahead Bias:
 *  - Scope 1: Vietlott Mega 6/45 (30 kỳ gần nhất)
 *  - Scope 2: XSMN Đài TP.HCM (30 kỳ gần nhất, phân lập đài nghiêm ngặt)
 * Xuất bản:
 *  - reports/fix9/walk-forward-results.csv
 *  - reports/fix9/algorithm-reference-results.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BacktestEngine } from '../js/backtest-engine.js';
import { PoissonAlgorithm } from '../js/algorithms/poisson.js';
import { MarkovAlgorithm } from '../js/algorithms/markov.js';
import { MonteCarloAlgorithm } from '../js/algorithms/monte-carlo.js';
import { FrequencyGapAlgorithm } from '../js/algorithms/frequency-gap.js';
import { MovingAverageAlgorithm } from '../js/algorithms/moving-average.js';
import { ClusteringAlgorithm } from '../js/algorithms/clustering.js';
import { AssociationRulesAlgorithm } from '../js/algorithms/association-rules.js';
import { EnsembleAlgorithm } from '../js/algorithms/ensemble.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'reports', 'fix9');

export function runWalkForwardAndExport(options = {}) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const seedPath = path.join(rootDir, 'data', 'historical-seed.json');
  const rawSeed = fs.readFileSync(seedPath, 'utf-8').replace(/^\uFEFF/, '');
  const seedData = JSON.parse(rawSeed);

  const megaHistory = seedData.vietlott['mega-6-45'] || [];
  const xsmnHistory = seedData.xsmn || [];

  console.log(`Bắt đầu Walk-Forward Backtest trên dữ liệu lịch sử chuẩn:`);
  console.log(` - Vietlott Mega 6/45: ${megaHistory.length} kỳ`);
  console.log(` - XSMN Tổng hợp: ${xsmnHistory.length} kỳ\n`);

  const numFolds = options.numFolds || 30;

  // 1. Chạy Backtest Vietlott Mega 6/45
  console.log(`1. Chạy Walk-Forward ${numFolds} kỳ cho Vietlott Mega 6/45...`);
  const megaBatchRes = BacktestEngine.runBatchBacktest(megaHistory, {
    isVietlott: true,
    totalBalls: 45,
    topN: 6,
    baselineReplicates: 100,
    windowSize: 30
  }, numFolds);

  // 2. Chạy Backtest XSMN TP.HCM
  console.log(`2. Chạy Walk-Forward ${numFolds} kỳ cho XSMN Đài TP.HCM...`);
  const xsmnBatchRes = BacktestEngine.runBatchBacktest(xsmnHistory, {
    isVietlott: false,
    stationId: 'tphcm',
    topN: 5,
    baselineReplicates: 100,
    windowSize: 30
  }, numFolds);

  // 3. Xuất file reports/fix9/walk-forward-results.csv
  const csvHeaders = [
    'scope',
    'rank',
    'algoId',
    'algoName',
    'foldsAttempted',
    'foldsSucceeded',
    'foldsFailed',
    'meanFoldHitRate',
    'microHitRate',
    'meanOccurrencesPerDraw',
    'bestHitRate',
    'totalHits',
    'baselineMean',
    'differenceVsBaseline',
    'exceedsBaseline'
  ];

  const csvRows = [csvHeaders.join(',')];

  megaBatchRes.leaderboard.forEach(item => {
    csvRows.push([
      'vietlott-mega-6-45',
      item.rank,
      item.id,
      `"${item.name}"`,
      item.foldsAttempted,
      item.foldsSucceeded,
      item.foldsFailed,
      item.meanFoldHitRate,
      item.microHitRate,
      item.meanOccurrencesPerDraw,
      item.bestHitRate,
      item.totalHits,
      item.baselineMean,
      item.differenceVsBaseline,
      item.exceedsBaseline
    ].join(','));
  });

  xsmnBatchRes.leaderboard.forEach(item => {
    csvRows.push([
      'xsmn-tphcm',
      item.rank,
      item.id,
      `"${item.name}"`,
      item.foldsAttempted,
      item.foldsSucceeded,
      item.foldsFailed,
      item.meanFoldHitRate,
      item.microHitRate,
      item.meanOccurrencesPerDraw,
      item.bestHitRate,
      item.totalHits,
      item.baselineMean,
      item.differenceVsBaseline,
      item.exceedsBaseline
    ].join(','));
  });

  const csvPath = path.join(outDir, 'walk-forward-results.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf-8');
  console.log(`\nĐã xuất bản CSV Walk-Forward: ${csvPath} (${csvRows.length - 1} bản ghi)`);

  // 4. Chạy và xuất kết quả thuật toán trên Reference Fixture ra reports/fix9/algorithm-reference-results.json
  const referenceHistory = [
    { drawId: '#00005', date: '2026-10-16', winningNumbers: [1, 2, 3, 7, 15, 16] },
    { drawId: '#00004', date: '2026-10-14', winningNumbers: [2, 4, 6, 8, 13, 14] },
    { drawId: '#00003', date: '2026-10-11', winningNumbers: [1, 3, 5, 7, 11, 12] },
    { drawId: '#00002', date: '2026-10-09', winningNumbers: [1, 2, 7, 8, 9, 10] },
    { drawId: '#00001', date: '2026-10-07', winningNumbers: [1, 2, 3, 4, 5, 6] }
  ];

  const refOpts = { isVietlott: true, totalBalls: 45, topN: 6 };
  const algorithms = [
    FrequencyGapAlgorithm,
    PoissonAlgorithm,
    MarkovAlgorithm,
    MonteCarloAlgorithm,
    MovingAverageAlgorithm,
    ClusteringAlgorithm,
    AssociationRulesAlgorithm,
    EnsembleAlgorithm
  ];

  const algoReferenceResults = {
    generatedAt: new Date().toISOString(),
    fixture: referenceHistory,
    fixtureLength: referenceHistory.length,
    results: {}
  };

  algorithms.forEach(algo => {
    try {
      const res = algo.predict(referenceHistory, refOpts);
      algoReferenceResults.results[algo.id] = {
        id: algo.id,
        name: algo.name,
        status: res.status,
        scoreType: res.scoreType || 'ranking-score',
        predictions: res.predictions,
        metrics: res.metrics,
        explanation: res.explanation
      };
    } catch (err) {
      algoReferenceResults.results[algo.id] = {
        id: algo.id,
        name: algo.name,
        status: 'error',
        error: err.message
      };
    }
  });

  const jsonPath = path.join(outDir, 'algorithm-reference-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(algoReferenceResults, null, 2), 'utf-8');
  console.log(`Đã xuất bản JSON Reference Results: ${jsonPath}`);

  return {
    success: true,
    megaLeaderboard: megaBatchRes.leaderboard,
    xsmnLeaderboard: xsmnBatchRes.leaderboard,
    csvPath,
    jsonPath
  };
}

if (process.argv[1] && process.argv[1].endsWith('run-walk-forward.js')) {
  runWalkForwardAndExport();
}
