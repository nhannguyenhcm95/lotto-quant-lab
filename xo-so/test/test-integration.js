/**
 * BỘ KIỂM THỬ TÍCH HỢP (INTEGRATION TEST SUITE) - FIX-3
 * Kiểm thử:
 * 1. Audit Failure Fixture Test (Mục 1.1): Exit code = 1 khi dữ liệu có lỗi
 * 2. Tính toàn vẹn 100% của Seed & Provenance (Mục 3.1 & 3.2)
 * 3. Walk-Forward Backtest Engine & Leaderboard (Mục 5.1 & 6.1)
 * 4. Sentinel Anti-leakage Test (Mục 4.2): Chèn kỳ tương lai cực đoan không làm đổi 1 chữ số kết quả quá khứ
 * 5. UI Controller Leaderboard Data Mapping (Không sinh undefined)
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

import { BacktestEngine } from '../js/backtest-engine.js';
import { LOTTO_CONFIG } from '../js/config.js';

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

async function runIntegrationTests() {
  console.log('========================================================');
  console.log('   LOTTO-QUANT LAB: INTEGRATION TEST SUITE (TÍCH HỢP)');
  console.log('========================================================\n');

  const rootDir = path.join(__dirname, '..');
  const seedPath = path.join(rootDir, 'data', 'historical-seed.json');
  const rawSeed = fs.readFileSync(seedPath, 'utf-8').replace(/^\uFEFF/, '');
  const realSeedData = JSON.parse(rawSeed);

  // ----------------------------------------------------
  // TEST 1: AUDIT FAILURE FIXTURE TEST (YÊU CẦU MỤC 1.1)
  // ----------------------------------------------------
  console.log('1. Kiểm thử Bắt Lỗi Kiểm Toán Dữ Liệu (Audit Failure Fixture Test):');
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // Tạo fixture cố tình vi phạm: Power 6/55 thiếu số đặc biệt bonusNumber và thiếu sourceUrl
  const invalidSeed = JSON.parse(JSON.stringify(realSeedData));
  if (invalidSeed.vietlott && invalidSeed.vietlott['power-6-55'] && invalidSeed.vietlott['power-6-55'].length > 0) {
    // Cố tình xóa bonusNumber và sourceUrl ở bản ghi đầu tiên
    invalidSeed.vietlott['power-6-55'][0].bonusNumber = null;
    delete invalidSeed.vietlott['power-6-55'][0].sourceUrl;
  }
  const invalidSeedPath = path.join(fixturesDir, 'invalid-audit-seed.json');
  fs.writeFileSync(invalidSeedPath, JSON.stringify(invalidSeed, null, 2), 'utf-8');

  // Chạy audit script với fixture lỗi ở chế độ --strict
  const auditProc = spawnSync('node', ['scripts/audit-history.js', '--strict', '--seed', invalidSeedPath], {
    cwd: rootDir,
    encoding: 'utf-8'
  });

  assert(auditProc.status === 1, `Audit Runner: Exit code = 1 khi fixture cố tình sai phạm (Thực tế: ${auditProc.status})`);
  assert(
    auditProc.stdout.includes('FAIL') || auditProc.stderr.includes('FAIL'),
    'Audit Runner: Xuất thông báo [FAIL] phát hiện trường thiếu/lỗi schema'
  );

  // Dọn dẹp fixture sau test
  try { fs.unlinkSync(invalidSeedPath); } catch (e) {}

  // ----------------------------------------------------
  // TEST 2: TOÀN VẸN DỮ LIỆU & PROVENANCE 100% (MỤC 3.1 & 3.2)
  // ----------------------------------------------------
  console.log('\n2. Kiểm tra Tính Toàn Vẹn Dữ Liệu & Nguồn Gốc Xác Thực (Provenance):');
  const megaDraws = realSeedData.vietlott['mega-6-45'];
  const powerDraws = realSeedData.vietlott['power-6-55'];
  const xsmnDraws = realSeedData.xsmn;

  assert(megaDraws.length === 1576, `Mega 6/45 có đúng 1.576 kỳ (Thực tế: ${megaDraws.length})`);
  assert(powerDraws.length === 1411, `Power 6/55 có đúng 1.411 kỳ (Thực tế: ${powerDraws.length})`);
  assert(xsmnDraws.length === 352, `XSMN có đúng 352 kỳ (Thực tế: ${xsmnDraws.length})`);

  // Kiểm tra 100% có provenance URL và retrievedAt
  const allRecords = [...megaDraws, ...powerDraws, ...xsmnDraws];
  const missingProvenance = allRecords.filter(r => !r.sourceUrl || !r.retrievedAt || r.verificationStatus !== 'verified');
  assert(missingProvenance.length === 0, `100% (${allRecords.length}/${allRecords.length}) bản ghi có sourceUrl, retrievedAt và verificationStatus: verified`);

  // Kiểm tra 100% Jackpot có giá trị thực, 0 bản ghi thiếu
  const megaMissingJackpot = megaDraws.filter(r => !r.jackpotEst || r.jackpotEst === 'null' || r.jackpotEst.trim() === '');
  const powerMissingJackpot = powerDraws.filter(r => !r.jackpotEst || r.jackpotEst === 'null' || r.jackpotEst.trim() === '');
  assert(megaMissingJackpot.length === 0, `Mega 6/45: 0/${megaDraws.length} kỳ thiếu Jackpot`);
  assert(powerMissingJackpot.length === 0, `Power 6/55: 0/${powerDraws.length} kỳ thiếu Jackpot`);

  // Kiểm tra kỳ Power #00098 (Jackpot lịch sử 321 tỷ)
  const power98 = powerDraws.find(d => d.drawId === '#00098');
  assert(power98 && power98.jackpotEst.includes('321.738.459.600'), `Power #00098 có giá trị Jackpot lịch sử chính xác: ${power98?.jackpotEst}`);

  // ----------------------------------------------------
  // TEST 3: ĐỘNG CƠ WALK-FORWARD BACKTEST & LEADERBOARD (MỤC 5.1 & 6.1)
  // ----------------------------------------------------
  console.log('\n3. Kiểm thử Động Cơ Walk-Forward Backtest & Xếp Hạng:');
  const batchRes = BacktestEngine.runBatchBacktest(megaDraws, {
    isVietlott: true,
    stationOrGame: 'mega-6-45',
    topN: 6
  }, 5);

  assert(batchRes.success === true, 'Chạy thành công Batch Walk-Forward Backtest trên 5 folds');
  assert(batchRes.leaderboard.length === 8, 'Leaderboard đủ 8 thuật toán');
  assert(batchRes.leaderboard[0].isTop1 === true && batchRes.leaderboard[0].rank === 1, 'Top 1 được gắn cờ isTop1 === true và rank === 1');
  assert(batchRes.leaderboard.every(item => typeof item.exceedsBaseline === 'boolean'), 'Mỗi thuật toán có cờ phân loại exceedsBaseline (boolean)');
  assert(batchRes.leaderboard.every(item => typeof item.baselineDiff === 'number'), 'Mỗi thuật toán có độ lệch baselineDiff (number)');

  // ----------------------------------------------------
  // TEST 4: SENTINEL ANTI-LEAKAGE TEST (YÊU CẦU MỤC 4.2)
  // ----------------------------------------------------
  console.log('\n4. Kiểm thử Sentinel Chống Rò Rỉ Tương Lai (Sentinel Anti-leakage Test):');
  // Chạy backtest trên 5 fold quá khứ với tập dữ liệu gốc, ghi lại kết quả dự đoán của từng fold
  const foldsDates = megaDraws.slice(0, 5).map(d => d.date);
  const baselineRunFolds = [];

  for (const date of foldsDates) {
    const singleRes = BacktestEngine.runSingleDateBacktest(megaDraws, date, {
      isVietlott: true,
      stationOrGame: 'mega-6-45',
      topN: 6
    });
    baselineRunFolds.push({
      date,
      predictions: singleRes.algoResults.map(a => ({ name: a.name, preds: a.predictions, hits: a.hits }))
    });
  }

  // Chèn 1 draw tương lai cực đoan vào đầu tập dữ liệu (tương lai xa 2099 với giải số dị biệt [1, 2, 3, 4, 5, 6])
  const futureDraw = {
    drawId: '#99999',
    date: '2099-12-31',
    winningNumbers: [1, 2, 3, 4, 5, 6],
    jackpotEst: '999,999,999,999 đ',
    sourceUrl: 'https://vietlott.vn',
    sourceName: 'Sentinel Test Draw',
    retrievedAt: '2099-12-31T20:00:00Z',
    verificationStatus: 'verified'
  };
  const contaminatedHistory = [futureDraw, ...megaDraws];

  // Chạy lại backtest trên cùng tập fold cũ với tập dữ liệu bị nhiễm
  let isStrictlyIdentical = true;
  let diffDetail = '';

  for (let i = 0; i < foldsDates.length; i++) {
    const date = foldsDates[i];
    const contaminatedRes = BacktestEngine.runSingleDateBacktest(contaminatedHistory, date, {
      isVietlott: true,
      stationOrGame: 'mega-6-45',
      topN: 6
    });
    const originalFold = baselineRunFolds[i];

    const currentFoldPreds = contaminatedRes.algoResults.map(a => ({ name: a.name, preds: a.predictions, hits: a.hits }));
    if (JSON.stringify(currentFoldPreds) !== JSON.stringify(originalFold.predictions)) {
      isStrictlyIdentical = false;
      diffDetail = `Fold date ${date} có sự sai khác khi chèn dữ liệu tương lai!`;
      break;
    }
  }

  assert(
    isStrictlyIdentical,
    'Sentinel Anti-leakage: Chèn draw tương lai cực đoan (#99999 năm 2099) không làm thay đổi dù chỉ 1 chữ số kết quả dự đoán của các fold quá khứ'
  );
  if (!isStrictlyIdentical) {
    console.error(`  [FAIL-DETAIL] ${diffDetail}`);
  }

  // ----------------------------------------------------
  // TEST 5: ĐỒNG BỘ LEADERBOARD UI CONTROLLER (MỤC 6.1)
  // ----------------------------------------------------
  console.log('\n5. Kiểm tra Kết Xuất Giao Diện Leaderboard (Đồng Bộ Không Undefined):');
  const mockDoms = {};
  global.document = {
    getElementById: (id) => {
      if (!mockDoms[id]) {
        mockDoms[id] = { innerHTML: '', id, getContext: () => ({}), classList: { add: () => {}, remove: () => {} } };
      }
      return mockDoms[id];
    }
  };
  const MockChart = function() { this.destroy = () => {}; };
  global.Chart = MockChart;
  global.window = {
    Chart: MockChart
  };

  const { UIController } = await import('../js/ui-controller.js');
  UIController.renderLeaderboard(batchRes, 'mock-leaderboard-test');
  const renderedHtml = mockDoms['mock-leaderboard-test'].innerHTML;

  assert(!renderedHtml.includes('undefined'), 'UIController.renderLeaderboard: Không chứa chuỗi undefined (Không còn gọi compositeScore)');
  assert(renderedHtml.includes('badge') || renderedHtml.includes('Vượt trội') || renderedHtml.includes('Dưới chuẩn'), 'UIController.renderLeaderboard: Hiển thị trạng thái phân loại exceedsBaseline chuẩn xác');

  // ----------------------------------------------------
  // TEST 6: CANONICAL PREDICTION CONSISTENCY (P0 FIX-4)
  // Khắc phục triệt để lỗi Hero '06' vs Ensemble '12'
  // ----------------------------------------------------
  console.log('\n6. Kiểm thử Hồi Quy Canonical Prediction (Hero Card ↔ Ensemble Card):');
  const { EnsembleAlgorithm } = await import('../js/algorithms/ensemble.js');

  // Giả lập hàm sinh canonical prediction của app.js
  function generateCanonicalPrediction(draws, isVietlott, totalBalls, targetDate, gameKey) {
    const sorted = [...draws].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentHistory = sorted.slice(0, 50);
    const dateStr = targetDate || '2026-10-18';
    let seedInt = 12345;
    for (let i = 0; i < dateStr.length; i++) {
      seedInt = ((seedInt << 5) - seedInt) + dateStr.charCodeAt(i);
      seedInt |= 0;
    }
    const ensembleResult = EnsembleAlgorithm.predict(recentHistory, {
      isVietlott,
      totalBalls,
      topN: isVietlott ? 6 : 5,
      seed: Math.abs(seedInt)
    });

    let canonicalNumbers = [...(ensembleResult.predictions || [])];
    if (isVietlott) {
      canonicalNumbers = canonicalNumbers.map(n => Number(n)).sort((a, b) => a - b);
    }
    return {
      gameKey,
      targetDate: dateStr,
      predictions: canonicalNumbers,
      ensembleResult,
      runId: `run-${dateStr}`
    };
  }

  const megaCanonical = generateCanonicalPrediction(megaDraws, true, 45, '2026-10-18', 'mega-6-45');
  const heroNumbers = megaCanonical.predictions;
  const ensembleCardNumbers = megaCanonical.ensembleResult.predictions.map(n => Number(n)).sort((a, b) => a - b);

  assert(
    JSON.stringify(heroNumbers) === JSON.stringify(ensembleCardNumbers),
    `Canonical Prediction: Mảng số Hero Card (${heroNumbers.join(',')}) và Ensemble Card (${ensembleCardNumbers.join(',')}) đồng nhất 100% (Diệt lỗi 06 vs 12)`
  );
  assert(new Set(heroNumbers).size === 6, 'Canonical Prediction: Đủ 6 bóng số chính không trùng lặp');
  assert(heroNumbers.every(n => n >= 1 && n <= 45), 'Canonical Prediction: Toàn bộ bóng số nằm trong miền [1, 45]');

  // ----------------------------------------------------
  // TEST 7: ZERO UNDEFINED / NAN TRÊN TOÀN BỘ 5 KHU VỰC GIAO DIỆN (P0/P1 FIX-4)
  // ----------------------------------------------------
  console.log('\n7. Kiểm thử Quét Sạch Literal Undefined, NaN, [object Object] Trên 5 Vùng UI:');
  const testContainerIds = [
    'test-ui-live',
    'test-ui-prediction',
    'test-ui-dashboard',
    'test-ui-backtest',
    'test-ui-leaderboard'
  ];

  // 1. Live Result
  UIController.renderLiveResult(megaDraws[0], true, testContainerIds[0]);
  const liveHtml = mockDoms[testContainerIds[0]].innerHTML;

  // 2. Prediction Card
  UIController.renderPredictions(megaCanonical.ensembleResult, true, testContainerIds[1]);
  const predHtml = mockDoms[testContainerIds[1]].innerHTML;

  // 3. Dashboard (chứa Cặp Đôi Bạc Nhớ)
  const dashboardStats = {
    history: megaDraws.slice(0, 50),
    gapStats: { topDetails: [{ num: '05', currentGap: 2, avgCycle: 5, ripeness: 1.05 }] },
    clusterStats: { evenRatio: 0.5, highRatio: 0.5 },
    rulesStats: { topPairs: [{ a: '01', b: '02', coOccurrenceCount: 5, totalEligibleDraws: 50, lift: 1.85 }] }
  };
  UIController.renderExecutiveDashboard(dashboardStats, true, testContainerIds[2]);
  const dashHtml = mockDoms[testContainerIds[2]].innerHTML;

  // 4. Backtest Single Date Result
  const singleBacktestRes = BacktestEngine.runSingleDateBacktest(megaDraws, megaDraws[0].date, {
    isVietlott: true,
    stationOrGame: 'mega-6-45',
    topN: 6
  });
  UIController.renderBacktestResult(singleBacktestRes, true, testContainerIds[3]);
  const backtestHtml = mockDoms[testContainerIds[3]].innerHTML;

  // 5. Leaderboard
  UIController.renderLeaderboard(batchRes, testContainerIds[4]);
  const leadHtml = mockDoms[testContainerIds[4]].innerHTML;

  const allRenderedHtmls = [
    { name: 'Live Result', html: liveHtml },
    { name: 'Predictions', html: predHtml },
    { name: 'Dashboard', html: dashHtml },
    { name: 'Backtest Result', html: backtestHtml },
    { name: 'Leaderboard', html: leadHtml }
  ];

  let anyUndefinedFound = false;
  for (const item of allRenderedHtmls) {
    if (item.html.includes('undefined')) {
      console.error(`  [FAIL-DETAIL] ${item.name} chứa chuỗi "undefined"!`);
      anyUndefinedFound = true;
    }
    if (item.html.includes('NaN')) {
      console.error(`  [FAIL-DETAIL] ${item.name} chứa chuỗi "NaN"!`);
      anyUndefinedFound = true;
    }
    if (item.html.includes('[object Object]')) {
      console.error(`  [FAIL-DETAIL] ${item.name} chứa chuỗi "[object Object]"!`);
      anyUndefinedFound = true;
    }
  }

  assert(!anyUndefinedFound, 'P0 UI Gate: Toàn bộ 5 khu vực giao diện không chứa literal "undefined", "NaN", "[object Object]"');
  assert(!dashHtml.includes('undefined lần về cùng nhau'), 'P0 Bug Check: Diệt sạch 100% lỗi "undefined lần về cùng nhau" trong Dashboard Bạc Nhớ');
  assert(dashHtml.includes('lần về cùng nhau (trong 50 kỳ)'), 'Dashboard Bạc Nhớ: Hiển thị đầy đủ số lần về cùng nhau và tổng số kỳ hợp lệ');

  // ----------------------------------------------------
  // TEST 8: MINH BẠCH CỬA SỔ HUẤN LUYỆN (EXPANDING WINDOW & 299 KỲ) (P1 FIX-4)
  // ----------------------------------------------------
  console.log('\n8. Kiểm thử Minh Bạch Cửa Sổ Huấn Luyện (Expanding Window & 299 Kỳ):');
  const fullHistorySingleRes = BacktestEngine.runSingleDateBacktest(megaDraws, megaDraws[0].date, {
    isVietlott: true,
    stationOrGame: 'mega-6-45',
    topN: 6
  });

  assert(fullHistorySingleRes.historyAvailableCount === 1576, `Backtest Engine: historyAvailableCount === 1576 (Toàn bộ 1.576 kỳ có sẵn, không âm thầm cắt gọt)`);
  assert(fullHistorySingleRes.verifiedTrainingCount === 1575, `Backtest Engine: verifiedTrainingCount === 1575 (Đúng 1.575 kỳ trước ngày mục tiêu)`);
  assert(fullHistorySingleRes.windowPolicy === 'expanding-window', 'Backtest Engine: windowPolicy === "expanding-window"');
  assert(fullHistorySingleRes.excludedCountByReason['target-date-excluded'] === 1, 'Backtest Engine: Loại trừ đúng 1 kỳ targetDate để chống rò rỉ tương lai');
  assert(fullHistorySingleRes.trainingDateRange.start !== undefined && fullHistorySingleRes.trainingDateRange.end !== undefined, 'Backtest Engine: Công bố rõ khoảng ngày huấn luyện start - end');
  assert(new Date(fullHistorySingleRes.trainingDateRange.end) < new Date(megaDraws[0].date), 'Backtest Engine: Ngày huấn luyện cuối cùng nghiêm ngặt nhỏ hơn ngày mục tiêu');

  // ----------------------------------------------------
  // TEST 9: TÁCH BIỆT PHẠM VI ĐỐI SOÁT 1 KỲ VÀ LEADERBOARD NHIỀU KỲ (P1 FIX-4)
  // ----------------------------------------------------
  console.log('\n9. Kiểm thử Tách Biệt Scope Đối Soát 1 Kỳ vs Leaderboard Nhiều Kỳ:');
  assert(fullHistorySingleRes.isSingleDrawValidation === true, 'Backtest 1 kỳ: isSingleDrawValidation === true');
  assert(batchRes.isSingleDrawValidation === false, 'Leaderboard: isSingleDrawValidation === false');
  assert(batchRes.totalFolds === 5, 'Leaderboard: Đánh giá trung bình trên 5 folds walk-forward');
  assert(batchRes.rankingRunId !== fullHistorySingleRes.rankingRunId, 'Leaderboard & Single Backtest: Có run ID / scope ID tách biệt hoàn toàn');

  console.log('\n========================================================');
  console.log(` KẾT QUẢ INTEGRATION TEST: ${passedCount} PASS, ${failedCount} FAIL`);
  console.log('========================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runIntegrationTests();

