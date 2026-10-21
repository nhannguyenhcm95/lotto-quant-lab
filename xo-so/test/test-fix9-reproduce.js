/**
 * LOTTO-QUANT LAB: REPRODUCTION TESTS CHO CÁC LỖI FIX-9 (ALG-01 ĐẾN ALG-10)
 */

import { FrequencyGapAlgorithm } from '../js/algorithms/frequency-gap.js';
import { PoissonAlgorithm } from '../js/algorithms/poisson.js';
import { AssociationRulesAlgorithm } from '../js/algorithms/association-rules.js';
import { MarkovAlgorithm } from '../js/algorithms/markov.js';
import { MonteCarloAlgorithm } from '../js/algorithms/monte-carlo.js';
import { MovingAverageAlgorithm } from '../js/algorithms/moving-average.js';
import { ClusteringAlgorithm } from '../js/algorithms/clustering.js';
import { EnsembleAlgorithm } from '../js/algorithms/ensemble.js';

let passed = 0;
let failed = 0;

function assert(cond, name) {
  if (cond) {
    console.log(`  [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${name}`);
    failed++;
  }
}

export function testAlg01FrequencyGapNeverObserved() {
  console.log('\n--- Kiểm tra ALG-01: Frequency Gap số chưa từng xuất hiện ---');
  // Fixture 5 kỳ, số 40 không xuất hiện lần nào
  const history5 = [
    { drawId: '#05', date: '2026-10-16', winningNumbers: [1, 2, 3, 7, 15, 16] },
    { drawId: '#04', date: '2026-10-14', winningNumbers: [2, 4, 6, 8, 13, 14] },
    { drawId: '#03', date: '2026-10-11', winningNumbers: [1, 3, 5, 7, 11, 12] },
    { drawId: '#02', date: '2026-10-09', winningNumbers: [1, 2, 7, 8, 9, 10] },
    { drawId: '#01', date: '2026-10-07', winningNumbers: [1, 2, 3, 4, 5, 6] }
  ];
  const res = FrequencyGapAlgorithm.predict(history5, { isVietlott: true, totalBalls: 45, topN: 6 });
  const detail40 = res.metrics.topDetails.find(d => Number(d.num) === 40);

  // Số 40 chưa từng xuất hiện: avgCycle phải là null, evidenceStatus là 'never-observed', không được nhận avgCycle = 5 và ripeness = 1.0
  assert(detail40.evidenceStatus === 'never-observed', 'Số 40 có evidenceStatus là never-observed');
  assert(detail40.avgCycle === null, 'Số 40 chưa có đủ quan sát nên avgCycle phải là null');
  assert(detail40.ripenessIndex === null, 'Số 40 chưa có chu kỳ nên ripenessIndex phải là null');
  assert(res.scores[40] < res.scores[1], `Số 40 chưa từng xuất hiện (score ${res.scores[40]}) không được cao hơn số 1 đã về 4 lần (score ${res.scores[1]})`);
}

export function testAlg02FrequencyGapRecentWindow() {
  console.log('\n--- Kiểm tra ALG-02: Frequency Gap recent window divisor ---');
  const history5 = [
    { drawId: '#05', date: '2026-10-16', winningNumbers: [1, 2, 3, 7, 15, 16] },
    { drawId: '#04', date: '2026-10-14', winningNumbers: [2, 4, 6, 8, 13, 14] },
    { drawId: '#03', date: '2026-10-11', winningNumbers: [1, 3, 5, 7, 11, 12] },
    { drawId: '#02', date: '2026-10-09', winningNumbers: [1, 2, 7, 8, 9, 10] },
    { drawId: '#01', date: '2026-10-07', winningNumbers: [1, 2, 3, 4, 5, 6] }
  ];
  const res = FrequencyGapAlgorithm.predict(history5, { isVietlott: true, totalBalls: 45, topN: 6 });
  const detail1 = res.metrics.topDetails.find(d => Number(d.num) === 1);

  // Số 1 xuất hiện 4 lần trong 5 kỳ: recentRate phải là 4 / 5 = 0.8, không phải 4 / 15
  assert(detail1.recentWindow === 5, 'recentWindow phải là 5 khi lịch sử chỉ có 5 kỳ');
  assert(detail1.hitsInRecentWindow === 4, 'hitsInRecentWindow đếm đúng 4');
  assert(Math.abs(detail1.recentRate - 0.8) < 1e-6, `recentRate phải là 4/5 = 0.8 (Thực tế: ${detail1.recentRate})`);
}

export function testAlg04AssociationRulesDirection() {
  console.log('\n--- Kiểm tra ALG-04: Association Rules hướng chuyển tiếp thời gian ---');
  // 3 kỳ theo thời gian CŨ -> MỚI là:
  // Kỳ 1 (cũ nhất): [1, 10, 11, 12, 13, 14]
  // Kỳ 2: [2, 10, 11, 12, 13, 14] -> 1 kéo theo 2
  // Kỳ 3 (mới nhất): [3, 10, 11, 12, 13, 14] -> 2 kéo theo 3
  const history3 = [
    { drawId: '#03', date: '2026-10-14', winningNumbers: [3, 10, 11, 12, 13, 14] }, // Mới nhất
    { drawId: '#02', date: '2026-10-12', winningNumbers: [2, 10, 11, 12, 13, 14] },
    { drawId: '#01', date: '2026-10-10', winningNumbers: [1, 10, 11, 12, 13, 14] }  // Cũ nhất
  ];

  const res = AssociationRulesAlgorithm.predict(history3, { isVietlott: true, totalBalls: 45, topN: 6 });
  const metrics = res.metrics;

  // Luật chuyển tiếp thời gian thật:
  // Kỳ 1 -> Kỳ 2: 1 kéo theo 2
  // Kỳ 2 -> Kỳ 3: 2 kéo theo 3
  // Kỳ 3 mới nhất có số 3 (chưa từng kéo theo số nào trong quá khứ).
  // Số 2 KHÔNG được có transition từ 3 -> 2 (đó là ngược chiều thời gian).
  assert(metrics.transitionCounts && metrics.transitionCounts['1'] && metrics.transitionCounts['1']['2'] === 1, 'Học đúng chuyển tiếp 1 -> 2 (cũ kéo theo mới)');
  assert(!metrics.transitionCounts || !metrics.transitionCounts['2'] || metrics.transitionCounts['2']['1'] !== 1, 'Cấm học ngược chiều thời gian 2 -> 1');
  assert(!metrics.transitionCounts || !metrics.transitionCounts['3'] || metrics.transitionCounts['3']['2'] !== 1, 'Cấm học ngược chiều thời gian 3 -> 2');
}

export function testAlg06MonteCarlo() {
  console.log('\n--- Kiểm tra ALG-06: Monte Carlo seed dependency và sampling ---');
  const historyA = [
    { drawId: '#02', date: '2026-10-12', winningNumbers: [1, 2, 3, 4, 5, 6] },
    { drawId: '#01', date: '2026-10-10', winningNumbers: [10, 11, 12, 13, 14, 15] }
  ];
  const historyB = [
    { drawId: '#02', date: '2026-10-12', winningNumbers: [1, 2, 3, 4, 5, 6] },
    { drawId: '#01', date: '2026-10-10', winningNumbers: [10, 11, 12, 13, 14, 16] } // Thay số 15 thành 16 ở kỳ cũ #01
  ];

  const resA = MonteCarloAlgorithm.predict(historyA, { isVietlott: true, totalBalls: 45, topN: 6 });
  const resB = MonteCarloAlgorithm.predict(historyB, { isVietlott: true, totalBalls: 45, topN: 6 });

  assert(resA.metrics.seedUsed !== resB.metrics.seedUsed, 'Sửa bóng số ở kỳ cũ #01 phải làm thay đổi seedUsed của Monte Carlo');

  // Kiểm tra XSMN phân biệt expectedOccurrences và probabilityAtLeastOnce
  const xsmnHistory = [
    { drawId: '#X1', date: '2026-10-12', lottoPairs: ['01', '01', '02', '03'] }
  ];
  const resX = MonteCarloAlgorithm.predict(xsmnHistory, { isVietlott: false, simulations: 1000 });
  assert(resX.metrics.probabilityAtLeastOnce !== undefined, 'XSMN có trường metrics.probabilityAtLeastOnce');
  assert(resX.metrics.expectedOccurrencesPerDraw !== undefined, 'XSMN có trường metrics.expectedOccurrencesPerDraw');
}

export function testAlg07MovingAverage() {
  console.log('\n--- Kiểm tra ALG-07: Moving Average strict date validation ---');
  // Chèn ngày không tồn tại 2026-02-30 vào history
  const badHistory = [
    { drawId: '#01', date: '2026-02-30', winningNumbers: [1, 2, 3, 4, 5, 6] }
  ];
  const res = MovingAverageAlgorithm.predict(badHistory, { isVietlott: true });
  assert(res.status === 'invalid-input', 'Moving Average từ chối ngày phi lý 2026-02-30 bằng status: invalid-input');
}

export function testAlg03Poisson() {
  console.log('\n--- Kiểm tra ALG-03: Poisson / Empirical Rate smoothing ---');
  const history5 = [
    { drawId: '#05', date: '2026-10-16', winningNumbers: [1, 2, 3, 7, 15, 16] },
    { drawId: '#04', date: '2026-10-14', winningNumbers: [2, 4, 6, 8, 13, 14] },
    { drawId: '#03', date: '2026-10-11', winningNumbers: [1, 3, 5, 7, 11, 12] },
    { drawId: '#02', date: '2026-10-09', winningNumbers: [1, 2, 7, 8, 9, 10] },
    { drawId: '#01', date: '2026-10-07', winningNumbers: [1, 2, 3, 4, 5, 6] }
  ];

  const res = PoissonAlgorithm.predict(history5, { isVietlott: true, totalBalls: 45, topN: 6 });
  assert(res.scoreType !== 'calibrated-probability', 'scoreType không được là calibrated-probability');
  assert(res.scores[40] > 0, `Bóng 40 chưa từng xuất hiện không được có score = 0 (Thực tế: ${res.scores[40]})`);
}

export function testAlg05Markov() {
  console.log('\n--- Kiểm tra ALG-05: Markov deduplication và conditional rate ---');
  // Fixture XSMN có số trùng lặp trong draw
  const xsmnHistory = [
    { drawId: '#X2', date: '2026-10-14', lottoPairs: ['05', '06'] },
    { drawId: '#X1', date: '2026-10-12', lottoPairs: ['01', '01', '01', '02'] } // '01' trùng 3 lần
  ];
  const res = MarkovAlgorithm.predict(xsmnHistory, { isVietlott: false, topN: 5 });
  assert(res.scoreType === 'ranking-score', 'Markov scoreType là ranking-score');
  assert(res.predictions.length === 5, 'Markov trả về đúng 5 số XSMN');
}

export function testAlg08StructureHeuristic() {
  console.log('\n--- Kiểm tra ALG-08: Structure Heuristic không chứa Gambler\'s Fallacy ---');
  const allEvenHistory = [
    { drawId: '#03', date: '2026-10-14', winningNumbers: [2, 4, 6, 8, 10, 12] },
    { drawId: '#02', date: '2026-10-12', winningNumbers: [14, 16, 18, 20, 22, 24] },
    { drawId: '#01', date: '2026-10-10', winningNumbers: [26, 28, 30, 32, 34, 36] }
  ];
  const res = ClusteringAlgorithm.predict(allEvenHistory, { isVietlott: true, totalBalls: 45 });
  assert(res.status === 'ok', 'Status là ok');
  assert(res.scoreType === 'ranking-score', 'scoreType là ranking-score');
  assert(res.metrics.observedEvenRatio === 1.0, 'observedEvenRatio phản ánh đúng 100% chẵn');
  assert(res.metrics.theoreticalEvenRatio === 0.5, 'theoreticalEvenRatio lý thuyết là 0.5');
  assert(res.metrics.targetProfile === undefined, 'Đã xóa targetProfile đảo bias của Gambler\'s Fallacy');
}

export function testAlg09Ensemble() {
  console.log('\n--- Kiểm tra ALG-09: Ensemble Percentile-Rank Aggregation & Validation ---');
  const history = [
    { drawId: '#03', date: '2026-10-14', winningNumbers: [2, 4, 6, 8, 10, 12] },
    { drawId: '#02', date: '2026-10-12', winningNumbers: [1, 3, 5, 7, 9, 11] },
    { drawId: '#01', date: '2026-10-10', winningNumbers: [10, 20, 30, 40, 41, 42] }
  ];
  const res = EnsembleAlgorithm.predict(history, { isVietlott: true, totalBalls: 45 });
  assert(res.status === 'ok', 'Ensemble status là ok');
  assert(res.scoreType === 'ranking-score', 'Ensemble scoreType là ranking-score');
  assert(res.predictions.length === 6, 'Ensemble trả về đủ 6 bóng Vietlott');
  
  // Kiểm tra điểm số của mọi bóng nằm trong [0, 100]
  for (let b = 1; b <= 45; b++) {
    assert(res.scores[b] >= 0 && res.scores[b] <= 100, `Điểm bóng ${b} phải nằm trong [0, 100] (Thực tế: ${res.scores[b]})`);
  }
}

export function testAlg10SpecialPrize() {
  console.log('\n--- Kiểm tra ALG-10: Special Prize không còn fallback "38" và offset bịa đặt ---');
  // Khi không có dữ liệu lịch sử giải đặc biệt
  const emptyRes = EnsembleAlgorithm.predictSpecialPrize([], []);
  assert(emptyRes.status === 'insufficient-data', 'Khi thiếu dữ liệu, status là insufficient-data');
  assert(emptyRes.fullNumber === null, 'Khi thiếu dữ liệu, fullNumber là null (không còn fallback 38)');

  // Khi có dữ liệu lịch sử giải đặc biệt
  const fixtureSpecials = [
    { drawId: '#02', date: '2026-10-14', specialPrize: '123456' },
    { drawId: '#01', date: '2026-10-12', specialPrize: '654321' }
  ];
  const validRes = EnsembleAlgorithm.predictSpecialPrize(fixtureSpecials, ['79']);
  assert(validRes.status === 'ok', 'Status là ok');
  assert(validRes.fullNumber.length === 6, 'Dãy đặc biệt có đủ 6 chữ số');
  assert(validRes.bachThuDe === '79', '2 chữ số cuối lấy từ top candidate 79');
  assert(!validRes.fullNumber.includes('NaN'), 'Không có ký tự NaN');
}

import { BacktestEngine, RandomBaselineAlgorithm } from '../js/backtest-engine.js';

export function testBt01RandomBaselineReplicates() {
  console.log('\n--- Kiểm tra BT-01: Random Baseline 100 replicates độc lập & Seed phân biệt ---');
  const res = RandomBaselineAlgorithm.predict([], { isVietlott: true, baselineReplicates: 100 });
  assert(res.replicateSamples && res.replicateSamples.length === 100, 'Tạo đủ 100 replicates độc lập');
  
  // Replicate 0 và Replicate 1 không được trùng hệt nhau do seed khác nhau
  const rep0 = res.replicateSamples[0].join(',');
  const rep1 = res.replicateSamples[1].join(',');
  assert(rep0 !== rep1, `Replicate 0 (${rep0}) và Replicate 1 (${rep1}) phải độc lập không trùng nhau`);
}

export function testBt02RollingWindowTrainingCut() {
  console.log('\n--- Kiểm tra BT-02: Rolling Window cắt chính xác W kỳ ---');
  const history10 = [];
  for (let i = 1; i <= 10; i++) {
    const day = i < 10 ? '0' + i : '' + i;
    history10.push({ drawId: `#${i}`, date: `2026-10-${day}`, winningNumbers: [1, 2, 3, 4, 5, 6] });
  }
  const training = BacktestEngine.buildTrainingSet(history10, '2026-10-10', { windowSize: 4 });
  assert(training.length === 4, `Cắt đúng 4 kỳ khi windowSize = 4 (Thực tế: ${training.length})`);
  assert(training[0].date === '2026-10-09', 'Kỳ đầu tiên trong training là kỳ mới nhất trước target (2026-10-09)');
}

export function testBt03StationScopeIsolation() {
  console.log('\n--- Kiểm tra BT-03: Phân lập đài XSMN (Station Scope Isolation) ---');
  const mixedHistory = [
    { drawId: '#01', stationId: 'tphcm', date: '2026-10-05', lottoPairs: ['01', '02'] },
    { drawId: '#02', stationId: 'dong-thap', date: '2026-10-06', lottoPairs: ['03', '04'] },
    { drawId: '#03', stationId: 'tphcm', date: '2026-10-12', lottoPairs: ['05', '06'] }
  ];
  const tphcmTraining = BacktestEngine.buildTrainingSet(mixedHistory, '2026-10-15', { isVietlott: false, stationId: 'tphcm' });
  assert(tphcmTraining.length === 2, `Chỉ lấy đúng 2 kỳ của đài tphcm (Thực tế: ${tphcmTraining.length})`);
  assert(tphcmTraining.every(d => d.stationId === 'tphcm'), 'Không bị lẫn đài dong-thap');
}

export function testBt04And05BacktestMetrics() {
  console.log('\n--- Kiểm tra BT-04 & BT-05: Canonical Matching & Tách bạch các Metric ---');
  const history = [
    { drawId: '#03', date: '2026-10-14', winningNumbers: [1, 2, 3, 4, 5, 6] },
    { drawId: '#02', date: '2026-10-12', winningNumbers: [7, 8, 9, 10, 11, 12] },
    { drawId: '#01', date: '2026-10-10', winningNumbers: [13, 14, 15, 16, 17, 18] }
  ];
  const singleRes = BacktestEngine.runSingleDateBacktest(history, '2026-10-14', { isVietlott: true });
  assert(singleRes.success === true, 'Single date backtest chạy thành công');
  assert(singleRes.baseline && singleRes.baseline.replicatesTested >= 100, 'Baseline chạy tối thiểu 100 replicates');
  assert(singleRes.baseline.baselineCI95 && singleRes.baseline.baselineCI95.length === 2, 'Baseline có khoảng tin cậy 95%');

  const batchRes = BacktestEngine.runBatchBacktest(history, { isVietlott: true }, 2);
  assert(batchRes.status === 'ok', 'Batch backtest status ok');
  assert(batchRes.leaderboard.length > 0, 'Leaderboard có kết quả');
  const top = batchRes.leaderboard[0];
  assert(top.meanFoldHitRate !== undefined, 'Có chỉ số meanFoldHitRate');
  assert(top.microHitRate !== undefined, 'Có chỉ số microHitRate');
  assert(top.differenceVsBaseline !== undefined, 'Có chỉ số differenceVsBaseline');
  assert(batchRes.disclaimer !== undefined, 'Có disclaimer trung thực về xác suất độc lập');
}

if (process.argv[1] && process.argv[1].endsWith('test-fix9-reproduce.js')) {
  testAlg01FrequencyGapNeverObserved();
  testAlg02FrequencyGapRecentWindow();
  testAlg04AssociationRulesDirection();
  testAlg06MonteCarlo();
  testAlg07MovingAverage();
  testAlg03Poisson();
  testAlg05Markov();
  testAlg08StructureHeuristic();
  testAlg09Ensemble();
  testAlg10SpecialPrize();
  testBt01RandomBaselineReplicates();
  testBt02RollingWindowTrainingCut();
  testBt03StationScopeIsolation();
  testBt04And05BacktestMetrics();
}


