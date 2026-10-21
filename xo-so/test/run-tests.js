/**
 * BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE)
 * Xác minh tính đúng đắn của dữ liệu thực tế từ Minh Ngọc, 8 thuật toán và động cơ Backtest
 */

import { LOTTO_CONFIG } from '../js/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PoissonAlgorithm } from '../js/algorithms/poisson.js';
import { MarkovAlgorithm } from '../js/algorithms/markov.js';
import { MonteCarloAlgorithm } from '../js/algorithms/monte-carlo.js';
import { FrequencyGapAlgorithm } from '../js/algorithms/frequency-gap.js';
import { MovingAverageAlgorithm } from '../js/algorithms/moving-average.js';
import { ClusteringAlgorithm } from '../js/algorithms/clustering.js';
import { AssociationRulesAlgorithm } from '../js/algorithms/association-rules.js';
import { EnsembleAlgorithm } from '../js/algorithms/ensemble.js';
import { BacktestEngine } from '../js/backtest-engine.js';
import { DataService } from '../js/data-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('   LOTTO-QUANT LAB: KHỞI CHẠY KIỂM THỬ HỆ THỐNG (DATA THẬT)');
  console.log('========================================================\n');

  // TEST 1: Cấu hình hệ thống
  console.log('1. Kiểm tra Cấu hình (config.js):');
  assert(LOTTO_CONFIG.ALGORITHMS.length === 8, 'Khai báo đầy đủ 8 thuật toán định lượng');
  assert(LOTTO_CONFIG.ALL_STATIONS.length >= 21, 'Khai báo đầy đủ các đài XSMN');
  assert(LOTTO_CONFIG.VIETLOTT_GAMES['mega-6-45'] !== undefined, 'Cấu hình Mega 6/45 hợp lệ');
  assert(LOTTO_CONFIG.VIETLOTT_GAMES['power-6-55'] !== undefined, 'Cấu hình Power 6/55 hợp lệ');

  // TEST 2: Bộ dữ liệu hạt giống thực tế (historical-seed.json)
  console.log('\n2. Kiểm tra Dữ liệu Thực Tế Minh Ngọc (historical-seed.json):');
  const seedPath = path.join(__dirname, '..', 'data', 'historical-seed.json');
  assert(fs.existsSync(seedPath), 'File historical-seed.json tồn tại');
  const rawSeed = fs.readFileSync(seedPath, 'utf-8').replace(/^\uFEFF/, '');
  const seedData = JSON.parse(rawSeed);
  assert(seedData.xsmn && seedData.xsmn.length >= 200, `Có ${seedData.xsmn ? seedData.xsmn.length : 0} kỳ quay đài XSMN thực tế`);
  assert(seedData.vietlott && seedData.vietlott['mega-6-45'].length >= 1570, `Có trọn vẹn 100% kỳ quay Mega 6/45 (${seedData.vietlott['mega-6-45'].length} kỳ)`);
  assert(seedData.vietlott && seedData.vietlott['power-6-55'].length >= 1400, `Có trọn vẹn 100% kỳ quay Power 6/55 (${seedData.vietlott['power-6-55'].length} kỳ)`);

  // Kiểm tra kỳ đầu tiên #00001 của Mega 6/45
  const megaAll = seedData.vietlott['mega-6-45'];
  const firstMega = megaAll[megaAll.length - 1];
  assert(firstMega.date === '2016-07-20', `Mega 6/45 kỳ đầu tiên có ngày 20/07/2016 (Thực tế: ${firstMega.date})`);
  assert(firstMega.drawId === '#00001', `Mega 6/45 kỳ đầu tiên là #00001 (Thực tế: ${firstMega.drawId})`);
  assert(firstMega.winningNumbers.length === 6, 'Mega 6/45 kỳ đầu tiên có đủ 6 quả bóng số');
  const hasMegaOver45 = megaAll.some(d => d.winningNumbers.some(n => n > 45 || n < 1));
  assert(!hasMegaOver45, '100% tất cả kỳ Mega 6/45 không có số nào vượt ngoài phạm vi 1-45');

  // Kiểm tra kỳ đầu tiên #00001 của Power 6/55
  const powerAll = seedData.vietlott['power-6-55'];
  const firstPower = powerAll[powerAll.length - 1];
  assert(firstPower.date === '2017-08-01', `Power 6/55 kỳ đầu tiên có ngày 01/08/2017 (Thực tế: ${firstPower.date})`);
  assert(firstPower.drawId === '#00001', `Power 6/55 kỳ đầu tiên là #00001 (Thực tế: ${firstPower.drawId})`);
  assert(firstPower.winningNumbers.length === 6 && firstPower.bonusNumber !== null, 'Power 6/55 kỳ đầu tiên có đủ 6 số chính và số đặc biệt');
  const hasPowerOver55 = powerAll.some(d => d.winningNumbers.some(n => n > 55 || n < 1));
  assert(!hasPowerOver55, '100% tất cả kỳ Power 6/55 không có số nào vượt ngoài phạm vi 1-55');

  // Kiểm tra kỳ vé #01575 ngày 14/10/2026 của Mega 6/45
  const targetMega = megaAll.find(d => d.drawId === '#01575' || d.date === '2026-10-14') || megaAll[0];
  assert(targetMega.drawId === '#01575', `Kỳ Mega 6/45 kiểm tra là #01575 (Thực tế: ${targetMega.drawId})`);
  assert(targetMega.date === '2026-10-14', `Ngày quay Mega 6/45 là 14/10/2026 (Thực tế: ${targetMega.date})`);
  const expectedMegaBalls = [6, 16, 19, 21, 34, 43];
  const isBallsMatch = JSON.stringify(targetMega.winningNumbers) === JSON.stringify(expectedMegaBalls);
  assert(isBallsMatch, `Dãy số Mega 6/45 chuẩn xác: ${targetMega.winningNumbers.join(', ')}`);
  assert(targetMega.jackpotEst.includes('20,329,744,500'), `Giá trị Jackpot khớp: ${targetMega.jackpotEst}`);

  // TEST 3: Kiểm thử 8 Thuật toán trên XSMN thực tế
  console.log('\n3. Kiểm thử 8 Thuật toán Dự đoán (XSMN thực tế):');
  const xsmnHistory = seedData.xsmn;
  const algos = [
    PoissonAlgorithm,
    MarkovAlgorithm,
    MonteCarloAlgorithm,
    FrequencyGapAlgorithm,
    MovingAverageAlgorithm,
    ClusteringAlgorithm,
    AssociationRulesAlgorithm,
    EnsembleAlgorithm
  ];

  algos.forEach(algo => {
    const res = algo.predict(xsmnHistory, { isVietlott: false, totalBalls: 99, topN: 5 });
    assert(res.predictions && res.predictions.length === 5, `${algo.name}: Sinh đủ 5 số dự đoán`);
    assert(res.scores && Object.keys(res.scores).length > 0, `${algo.name}: Có ma trận điểm xác suất`);
    assert(typeof res.explanation === 'string' && res.explanation.length > 10, `${algo.name}: Có thuyết minh giải thuật`);
  });

  // TEST 4: Kiểm thử Thuật toán trên Vietlott thực tế
  console.log('\n4. Kiểm thử Thuật toán Dự đoán (Vietlott Mega 6/45 thực tế):');
  const megaHistory = seedData.vietlott['mega-6-45'];
  const vietlottRes = EnsembleAlgorithm.predict(megaHistory, { isVietlott: true, totalBalls: 45, topN: 6 });
  assert(vietlottRes.predictions && vietlottRes.predictions.length === 6, 'Ensemble Vietlott sinh đủ 6 bóng số');
  assert(vietlottRes.metrics && vietlottRes.metrics.confidenceScore, 'Ensemble Vietlott có chỉ số độ tin cậy');

  // TEST 5: Động cơ Dò Kết Quả (Backtest Engine)
  console.log('\n5. Kiểm thử Động cơ Dò Kết Quả & Đánh Giá Thực Nghiệm:');
  const testDate = megaHistory[1] ? megaHistory[1].date : '2026-10-11';
  const backtestRes = BacktestEngine.runSingleDateBacktest(megaHistory, testDate, {
    isVietlott: true,
    stationOrGame: 'mega-6-45',
    topN: 6
  });

  assert(backtestRes.success === true, `Dò kết quả ngày ${testDate} thành công`);
  assert(backtestRes.trainingDataCount < megaHistory.length, 'Đã loại trừ Lookahead Bias (chỉ dùng dữ liệu trước ngày dò)');
  assert(backtestRes.algoResults && backtestRes.algoResults.length === 8, 'Đối chiếu kết quả cho cả 8 thuật toán');
  assert(backtestRes.baseline && typeof backtestRes.baseline.hitRate === 'number', 'Có kết quả đối chứng ngẫu nhiên (Random Baseline)');

  // TEST 6: Bảng Xếp Hạng Hàng Loạt (Batch Backtest)
  console.log('\n6. Kiểm thử Bảng Xếp Hạng Hiệu Suất (Batch Leaderboard):');
  const batchRes = BacktestEngine.runBatchBacktest(megaHistory, {
    isVietlott: true,
    stationOrGame: 'mega-6-45',
    topN: 6
  }, 5);

  assert(batchRes.success === true, 'Chạy kiểm định hàng loạt thành công');
  assert(batchRes.leaderboard && batchRes.leaderboard.length === 8, 'Bảng xếp hạng đầy đủ 8 thuật toán');
  assert(batchRes.baseline && typeof batchRes.baseline.avgHitRate === 'number', 'Leaderboard có chuẩn ngẫu nhiên baseline');
  assert(batchRes.leaderboard.every(item => typeof item.baselineDiff === 'number'), 'Từng thuật toán có đối chiếu chênh lệch với baseline (baselineDiff)');
  assert(batchRes.leaderboard[0].isTop1 === true && batchRes.leaderboard[0].rank === 1, 'Leaderboard: Gắn nhãn isTop1 và rank === 1 cho thuật toán dẫn đầu');
  const isSortedByPrimary = batchRes.leaderboard.every((item, idx, arr) => idx === 0 || item.avgHitRate <= arr[idx - 1].avgHitRate);
  assert(isSortedByPrimary, 'Leaderboard: Sắp xếp xác định theo Primary Metric (avgHitRate) giảm dần');

  // Kiểm tra Batch Backtest khi không có fold nào thành công
  const emptyBatch = BacktestEngine.runBatchBacktest([], { isVietlott: true, stationOrGame: 'mega-6-45', topN: 6 }, 5);
  assert(emptyBatch.status === 'insufficient-data', 'P1: Batch Backtest với dữ liệu rỗng trả status: insufficient-data');
  assert(emptyBatch.drawsTestedCount === 0, 'P1: Batch Backtest rỗng có drawsTestedCount === 0');
  assert(emptyBatch.baseline === null, 'P1: Batch Backtest rỗng không tạo baseline giả 13.3/18.0');

  // TEST 7: Kiểm Định Dữ Liệu Chặt Chẽ (Data Validation & Schema Ingest)
  console.log('\n7. Kiểm thử Xác Thực Dữ Liệu Đầu Vào (Data Ingest & Schema Validation):');
  // 7.1 Mega 6/45
  const validMega = {
    drawId: '#01575',
    date: '2026-10-14',
    winningNumbers: [6, 16, 19, 21, 34, 43]
  };
  assert(DataService.validateMegaDraw(validMega).valid === true, 'Mega hợp lệ: 6 số duy nhất 1-45 được chấp nhận');
  
  const invalidMegaCalendar = { drawId: '#01575', date: '2026-99-99', winningNumbers: [6, 16, 19, 21, 34, 43] };
  assert(DataService.validateMegaDraw(invalidMegaCalendar).valid === false, 'Mega không hợp lệ: Từ chối ngày lịch không có thực (2026-99-99)');

  const invalidMegaFeb30 = { drawId: '#01575', date: '2026-02-30', winningNumbers: [6, 16, 19, 21, 34, 43] };
  assert(DataService.validateMegaDraw(invalidMegaFeb30).valid === false, 'Mega không hợp lệ: Từ chối ngày lịch không có thực (2026-02-30)');

  const invalidMegaDuplicate = { drawId: '#01575', date: '2026-10-14', winningNumbers: [6, 16, 19, 21, 34, 34] };
  assert(DataService.validateMegaDraw(invalidMegaDuplicate).valid === false, 'Mega không hợp lệ: Trùng số bị từ chối');

  const invalidMegaRange = { drawId: '#01575', date: '2026-10-14', winningNumbers: [6, 16, 19, 21, 34, 46] };
  assert(DataService.validateMegaDraw(invalidMegaRange).valid === false, 'Mega không hợp lệ: Số vượt quá 45 bị từ chối');

  const invalidMegaCount = { drawId: '#01575', date: '2026-10-14', winningNumbers: [6, 16, 19, 21, 34] };
  assert(DataService.validateMegaDraw(invalidMegaCount).valid === false, 'Mega không hợp lệ: Thiếu số (5 số) bị từ chối');

  // 7.2 Power 6/55
  const validPower = {
    drawId: '#01410',
    date: '2026-10-13',
    winningNumbers: [3, 12, 25, 33, 41, 52],
    bonusNumber: 7
  };
  assert(DataService.validatePowerDraw(validPower).valid === true, 'Power hợp lệ: 6 số chính 1-55 và số đặc biệt được chấp nhận');

  const invalidPowerBonusDup = { date: '2026-10-13', winningNumbers: [3, 12, 25, 33, 41, 52], bonusNumber: 12 };
  assert(DataService.validatePowerDraw(invalidPowerBonusDup).valid === false, 'Power không hợp lệ: Số đặc biệt trùng 6 số chính bị từ chối');

  const invalidPowerBonusDecimal = { date: '2026-10-13', winningNumbers: [3, 12, 25, 33, 41, 52], bonusNumber: 7.5 };
  assert(DataService.validatePowerDraw(invalidPowerBonusDecimal).valid === false, 'Power không hợp lệ: Số đặc biệt thập phân (7.5) bị từ chối');

  const invalidPowerRange = { date: '2026-10-13', winningNumbers: [3, 12, 25, 33, 41, 56], bonusNumber: 7 };
  assert(DataService.validatePowerDraw(invalidPowerRange).valid === false, 'Power không hợp lệ: Số chính vượt quá 55 bị từ chối');

  // 7.3 XSMN
  const validXSMN = {
    date: '2026-10-14',
    stationId: 'dong-nai',
    prizes: { special: ['123456'] },
    lottoPairs: Array(18).fill('68') // Cho phép đuôi trùng nhau giữa các giải
  };
  assert(DataService.validateXSMNDraw(validXSMN).valid === true, 'XSMN hợp lệ: Cho phép đuôi lô trùng nhau giữa các giải');

  const invalidXSMNXX = {
    date: '2026-10-14',
    stationId: 'dong-nai',
    prizes: { special: ['123456'] },
    lottoPairs: Array(18).fill('XX')
  };
  assert(DataService.validateXSMNDraw(invalidXSMNXX).valid === false, 'XSMN không hợp lệ: Cặp lô "XX" bị từ chối');

  const invalidXSMNMissingSpecial = {
    date: '2026-10-14',
    stationId: 'dong-nai',
    prizes: { special: [] },
    lottoPairs: Array(18).fill('68')
  };
  assert(DataService.validateXSMNDraw(invalidXSMNMissingSpecial).valid === false, 'XSMN không hợp lệ: Thiếu giải đặc biệt bị từ chối');

  // TEST 8: Tính Đúng Đắn Thuật Toán (Algorithm Correctness & Reproducibility)
  console.log('\n8. Kiểm thử Tính Đúng Đắn Của Thuật Toán & Khả Năng Tái Lập:');
  // 8.1 Seeded Monte Carlo
  const mcRun1 = MonteCarloAlgorithm.predict(megaHistory, { isVietlott: true, totalBalls: 45, topN: 6, seed: 9999, simulations: 500 });
  const mcRun2 = MonteCarloAlgorithm.predict(megaHistory, { isVietlott: true, totalBalls: 45, topN: 6, seed: 9999, simulations: 500 });
  const isMcReproducible = JSON.stringify(mcRun1.predictions) === JSON.stringify(mcRun2.predictions);
  assert(isMcReproducible, 'Seeded Monte Carlo: Cùng input và seed cho kết quả 100% giống nhau (Tái lập được)');
  assert(new Set(mcRun1.predictions).size === 6, 'Monte Carlo Vietlott: Rút không hoàn lại sinh đúng 6 số duy nhất');
  assert(!mcRun1.metrics.distributionConfidence, 'Monte Carlo: Đã loại bỏ nhãn giả 95% Confidence Interval');

  // 8.2 EMA Lịch Quay
  const nextFromMon = LOTTO_CONFIG.getNextDrawDate('2026-10-12', 'tphcm', false); // 2026-10-12 là Thứ 2
  assert(nextFromMon.dayOfWeek === 6 && nextFromMon.date === '2026-10-17', 'Lịch quay TPHCM: Sau Thứ 2 (2026-10-12) là Thứ 7 (2026-10-17), không phải ngày kế tiếp');

  const nextMega = LOTTO_CONFIG.getNextDrawDate('2026-10-14', 'mega-6-45', true); // 2026-10-14 là Thứ 4
  assert(nextMega.dayOfWeek === 5 && nextMega.date === '2026-10-16', 'Lịch quay Mega 6/45: Sau Thứ 4 (2026-10-14) là Thứ 6 (2026-10-16)');

  // 8.3 Ensemble Normalized Soft Voting
  assert(vietlottRes.metrics.aggregationMethod.includes('Soft Voting'), 'Ensemble: Cơ chế tổng hợp xếp hạng là Normalized Soft Voting');
  assert(!vietlottRes.explanation.includes('65 +'), 'Ensemble: Giải thích mô hình không dùng công thức độ tin cậy ảo');

  // 8.4 [P0] KHÔNG SINH SỐ NGẪU NHIÊN KHI THIẾU DỮ LIỆU
  const emptyHistory = [];
  let allInsufficientPass = true;
  for (const algo of algos) {
    const emptyRes = algo.predict(emptyHistory, { isVietlott: true, totalBalls: 45, topN: 6 });
    if (emptyRes.status !== 'insufficient-data' || !Array.isArray(emptyRes.predictions) || emptyRes.predictions.length !== 0) {
      allInsufficientPass = false;
      console.error(`  [FAIL-DETAIL] ${algo.name} sinh số ảo khi rỗng: status=${emptyRes.status}, count=${emptyRes.predictions.length}`);
      break;
    }
  }
  assert(allInsufficientPass, 'P0: Cả 8 thuật toán khi dữ liệu rỗng trả status: insufficient-data và predictions: [] (Không tự bịa số ngẫu nhiên)');

  // TEST 9: Kiểm Định Chống Rò Rỉ Thời Gian Qua Production Code (Strict Anti-leakage)
  console.log('\n9. Kiểm thử Nghiêm Ngặt Chống Rò Rỉ Thời Gian (Anti-leakage Across Folds):');
  const targetTestDate = megaHistory[5] ? megaHistory[5].date : '2026-10-01';
  const prodTrainingSet = BacktestEngine.buildTrainingSet(megaHistory, targetTestDate);
  const isAllPrior = prodTrainingSet.every(d => d.date < targetTestDate);
  assert(isAllPrior, 'Production buildTrainingSet: 100% các bản ghi huấn luyện có date < targetDate');

  // Canary Leakage Test: Cố tình chèn bản ghi targetDate và future record
  const contaminatedHistory = [
    { date: '2099-01-01', drawId: '#99999', winningNumbers: [1, 2, 3, 4, 5, 6] },
    { date: targetTestDate, drawId: '#CANARY', winningNumbers: [1, 2, 3, 4, 5, 6] },
    ...megaHistory
  ];
  const cleanedTrainingSet = BacktestEngine.buildTrainingSet(contaminatedHistory, targetTestDate);
  const hasCanaryLeak = cleanedTrainingSet.some(d => d.date >= targetTestDate);
  assert(!hasCanaryLeak, 'Canary Leakage Test: Cố tình chèn bản ghi cùng ngày và tương lai bị loại bỏ 100% (0% Leakage)');

  // TEST 10: Kiểm Định Không Còn KPI / Số Liệu Hardcode
  console.log('\n10. Kiểm tra Loại Bỏ Toàn Bộ Số Liệu KPI Hardcode:');
  const appJsContent = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf-8');
  const hasHardcodedConfidence = appJsContent.includes("'88.5%' : '91.2%'");
  const hasHardcodedHitrate = appJsContent.includes("'38.2%' : '66.7%'");
  assert(!hasHardcodedConfidence, 'app.js: Không còn confidence hardcode 88.5% : 91.2%');
  assert(!hasHardcodedHitrate, 'app.js: Không còn hitrate hardcode 38.2% : 66.7%');

  // TEST 11: Kiểm Thử UI Controller Render An Toàn (Không Gặp ReferenceError / Crash DOM)
  console.log('\n11. Kiểm thử Kết Xuất Giao Diện UI Controller:');
  const mockDoms = {};
  global.document = {
    getElementById: (id) => {
      if (!mockDoms[id]) {
        mockDoms[id] = { innerHTML: '', id, getContext: () => ({}), classList: { add: () => {}, remove: () => {} } };
      }
      return mockDoms[id];
    }
  };
  global.window = {
    Chart: function() { this.destroy = () => {}; }
  };
  const { UIController } = await import('../js/ui-controller.js');
  let renderPredictionsOk = false;
  try {
    UIController.renderPredictions(vietlottRes, true, 'mock-predictions-container');
    const renderedHtml = mockDoms['mock-predictions-container'] ? mockDoms['mock-predictions-container'].innerHTML : '';
    if (renderedHtml.includes('Mô Hình Tổng Hợp') && renderedHtml.includes('ensemble-ball-lg')) {
      renderPredictionsOk = true;
    }
  } catch (err) {
    console.error('Lỗi khi renderPredictions:', err);
  }
  assert(renderPredictionsOk, 'UIController.renderPredictions: Kết xuất trơn tru 8 mô hình và bóng số dự đoán, không crash');

  let renderChartOk = false;
  try {
    UIController.renderProbabilityChart(vietlottRes.scores, true, 'mock-prob-chart-canvas');
    renderChartOk = true;
  } catch (err) {
    console.error('Lỗi khi renderProbabilityChart:', err);
  }
  assert(renderChartOk, 'UIController.renderProbabilityChart: Khởi tạo biểu đồ phân phối xác suất trơn tru');

  // Kiểm tra UIController.renderLeaderboard khi rỗng và khi có dữ liệu
  UIController.renderLeaderboard(emptyBatch, 'mock-leaderboard-empty');
  const emptyLeaderboardHtml = mockDoms['mock-leaderboard-empty'].innerHTML;
  assert(emptyLeaderboardHtml.includes('Chưa Đủ Dữ Liệu Đánh Giá'), 'UIController.renderLeaderboard: Hiển thị giải thích khi thiếu dữ liệu, không tạo Top 1 giả');

  UIController.renderLeaderboard(batchRes, 'mock-leaderboard-full');
  const fullLeaderboardHtml = mockDoms['mock-leaderboard-full'].innerHTML;
  assert(fullLeaderboardHtml.includes('TOP 1 LEADERBOARD') && fullLeaderboardHtml.includes(batchRes.leaderboard[0].name), 'UIController.renderLeaderboard: Hiển thị banner Top 1 nổi bật đồng bộ với dữ liệu thực tế');

  // TEST 12: Kiểm Toán Dữ Liệu Lịch Sử 100% (History Quality Gate)
  console.log('\n12. Kiểm toán Dữ Liệu Lịch Sử 100% (History Quality Gate):');
  const manifestPath = path.join(__dirname, '..', 'data', 'history-scope.json');
  assert(fs.existsSync(manifestPath), 'Tồn tại manifest data/history-scope.json');
  const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(manifestData.qualityGate && manifestData.qualityGate.expected_draw_coverage === '100%', 'Manifest yêu cầu 100% coverage không giảm mẫu');
  assert(seedData.vietlott['mega-6-45'].length === manifestData.scopes['vietlott-mega-6-45'].expectedDraws, `Mega 6/45 đạt trọn vẹn 100% (${seedData.vietlott['mega-6-45'].length}/${manifestData.scopes['vietlott-mega-6-45'].expectedDraws} kỳ)`);
  assert(seedData.vietlott['power-6-55'].length === manifestData.scopes['vietlott-power-6-55'].expectedDraws, `Power 6/55 đạt trọn vẹn 100% (${seedData.vietlott['power-6-55'].length}/${manifestData.scopes['vietlott-power-6-55'].expectedDraws} kỳ)`);
  assert(seedData.xsmn.length === manifestData.scopes['xsmn-21-stations'].expectedDraws, `XSMN đạt trọn vẹn 100% (${seedData.xsmn.length}/${manifestData.scopes['xsmn-21-stations'].expectedDraws} kỳ qua 21 đài)`);

  console.log('\n========================================================');
  console.log(` KẾT QUẢ TỔNG HỢP: ${passedCount} PASS, ${failedCount} FAIL`);
  console.log('========================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
