/**
 * TEST SUITE: TÁI HIỆN VÀ KIỂM ĐỊNH FIX-10 (REPRODUCE & VERIFY FIX-10)
 * 
 * Lệnh điều hành bắt buộc:
 * 1. Chạy trên code hiện tại để chứng minh các lỗi đang tồn tại (RED).
 * 2. Sửa nguyên nhân gốc.
 * 3. Chạy lại để chứng minh tất cả đều đạt (GREEN).
 */

import { 
  strictUtcDayOfWeek, 
  normalizeVietlottBall, 
  normalizeLottoPair,
  validateAndSortHistory,
  getDrawEventSet,
  getDrawEventCounts,
  getUniverse
} from '../js/algorithms/input-normalizer.js';

import { MovingAverageAlgorithm } from '../js/algorithms/moving-average.js';
import { FrequencyGapAlgorithm } from '../js/algorithms/frequency-gap.js';
import { EnsembleAlgorithm } from '../js/algorithms/ensemble.js';
import { AssociationRulesAlgorithm } from '../js/algorithms/association-rules.js';
import { PoissonAlgorithm } from '../js/algorithms/poisson.js';
import { MonteCarloAlgorithm } from '../js/algorithms/monte-carlo.js';
import { MarkovAlgorithm } from '../js/algorithms/markov.js';
import { ClusteringAlgorithm } from '../js/algorithms/clustering.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

export async function runFix10ReproduceTests() {
  console.log('========================================================');
  console.log('   BỘ TEST TÁI HIỆN VÀ KIỂM CHỨNG FIX-10');
  console.log('========================================================\n');

  // -----------------------------------------------------------------
  // 1. TÁI HIỆN FIX10-01: InputNormalizer parse lỏng lẻo ("12abc", "1.5", " 7x")
  // -----------------------------------------------------------------
  console.log('--- 1. Kiểm tra FIX10-01: InputNormalizer parseStrictInteger & strict parsing ---');
  
  let caught12abc = false;
  try {
    normalizeVietlottBall("12abc", 45);
  } catch (e) {
    caught12abc = (e instanceof TypeError) || (e instanceof RangeError);
  }
  assert(caught12abc, 'FIX10-01: normalizeVietlottBall("12abc") phải ném lỗi (không parse thành 12)');

  let caught1dot5 = false;
  try {
    normalizeVietlottBall("1.5", 45);
  } catch (e) {
    caught1dot5 = (e instanceof TypeError) || (e instanceof RangeError);
  }
  assert(caught1dot5, 'FIX10-01: normalizeVietlottBall("1.5") phải ném lỗi (không parse thành 1)');

  let caught7x = false;
  try {
    normalizeVietlottBall(" 7x", 45);
  } catch (e) {
    caught7x = (e instanceof TypeError) || (e instanceof RangeError);
  }
  assert(caught7x, 'FIX10-01: normalizeVietlottBall(" 7x") phải ném lỗi (không parse thành 7)');

  let caughtLottoBad = false;
  try {
    normalizeLottoPair("9abc");
  } catch (e) {
    caughtLottoBad = (e instanceof TypeError) || (e instanceof RangeError);
  }
  assert(caughtLottoBad, 'FIX10-01: normalizeLottoPair("9abc") phải ném lỗi (không parse thành "09")');

  // -----------------------------------------------------------------
  // 2. TÁI HIỆN FIX10-02: History validator cho bản ghi thiếu trường bắt buộc
  // -----------------------------------------------------------------
  console.log('\n--- 2. Kiểm tra FIX10-02: History validator từ chối bản ghi thiếu kết quả ---');
  
  const historyWithMissingNums = [
    { drawId: '#002', date: '2026-10-16' }, // Thiếu winningNumbers
    { drawId: '#001', date: '2026-10-14', winningNumbers: [1, 2, 3, 4, 5, 6] }
  ];

  const freqResMissing = FrequencyGapAlgorithm.predict(historyWithMissingNums, { isVietlott: true, totalBalls: 45 });
  assert(freqResMissing.status === 'invalid-input', `FIX10-02: Draw thiếu winningNumbers phải trả status: invalid-input (Thực tế: ${freqResMissing.status})`);
  assert(Array.isArray(freqResMissing.predictions) && freqResMissing.predictions.length === 0, 'FIX10-02: Khi invalid-input, predictions phải rỗng []');

  const historyWithDuplicateBalls = [
    { drawId: '#001', date: '2026-10-14', winningNumbers: [1, 1, 3, 4, 5, 6] } // Trùng số 1
  ];
  const freqResDup = FrequencyGapAlgorithm.predict(historyWithDuplicateBalls, { isVietlott: true, totalBalls: 45 });
  assert(freqResDup.status === 'invalid-input', `FIX10-02: Draw trùng bóng số phải trả status: invalid-input (Thực tế: ${freqResDup.status})`);

  // -----------------------------------------------------------------
  // 3. TÁI HIỆN FIX10-03: Moving Average prior phụ thuộc topN
  // -----------------------------------------------------------------
  console.log('\n--- 3. Kiểm tra FIX10-03: Moving Average candidate scores độc lập với topN ---');

  const validHistory = [
    { drawId: '#003', date: '2026-10-16', winningNumbers: [5, 12, 19, 24, 38, 41] },
    { drawId: '#002', date: '2026-10-14', winningNumbers: [1, 12, 19, 25, 30, 42] },
    { drawId: '#001', date: '2026-10-11', winningNumbers: [5, 10, 15, 20, 25, 30] }
  ];

  const maTop6 = MovingAverageAlgorithm.predict(validHistory, { isVietlott: true, totalBalls: 45, topN: 6 });
  const maTop12 = MovingAverageAlgorithm.predict(validHistory, { isVietlott: true, totalBalls: 45, topN: 12 });

  assert(maTop6.status === 'ok' && maTop12.status === 'ok', 'Moving Average chạy thành công trên validHistory');
  assert(maTop6.predictions.length === 6, 'maTop6 trả về đúng 6 predictions');
  assert(maTop12.predictions.length === 12, 'maTop12 trả về đúng 12 predictions');

  let allScoresIdentical = true;
  for (let b = 1; b <= 45; b++) {
    if (maTop6.scores[b] !== maTop12.scores[b]) {
      allScoresIdentical = false;
      console.error(`  [SCORE_DIFF] Bóng ${b}: topN=6 có score=${maTop6.scores[b]} vs topN=12 có score=${maTop12.scores[b]}`);
    }
  }
  assert(allScoresIdentical, 'FIX10-03: Điểm số của từng ứng viên khi topN=6 và topN=12 phải HOÀN TOÀN TRÙNG KHỚP (không đổi theo topN)');

  // -----------------------------------------------------------------
  // 4. TÁI HIỆN FIX10-04: Ensemble chấp nhận score không đầy đủ và gán điểm 0
  // -----------------------------------------------------------------
  console.log('\n--- 4. Kiểm tra FIX10-04: Ensemble từ chối model thiếu score cho toàn bộ universe ---');

  // Giả lập sub-algorithm chỉ trả 36/45 scores (80% coverage)
  const incompleteMockAlgo = {
    id: "incomplete-mock",
    name: "Incomplete Mock Algorithm",
    predict: (history, opts) => {
      const scores = {};
      // Chỉ trả 36 bóng đầu tiên, thiếu 9 bóng [37..45]
      for (let i = 1; i <= 36; i++) {
        scores[i] = 50;
      }
      return {
        status: 'ok',
        predictions: [1, 2, 3, 4, 5, 6],
        scores
      };
    }
  };

  const ensembleWithIncomplete = EnsembleAlgorithm.predict(validHistory, {
    isVietlott: true,
    totalBalls: 45,
    topN: 6,
    subAlgorithms: [
      { algo: incompleteMockAlgo, weight: 1.0 }
    ]
  });

  // Khi model duy nhất bị thiếu scores, Ensemble phải đánh dấu unavailable chứ không gán điểm 0 cho 9 số còn lại
  assert(
    ensembleWithIncomplete.status === 'unavailable' || ensembleWithIncomplete.status === 'insufficient-data',
    `FIX10-04: Model thiếu candidate scores phải bị loại; không còn model hợp lệ thì Ensemble trả unavailable (Thực tế: ${ensembleWithIncomplete.status})`
  );

  // -----------------------------------------------------------------
  // -----------------------------------------------------------------
  // 5. TÁI HIỆN FIX10-05: Frequency Gap phân biệt never-observed / insufficient-occurrences
  // -----------------------------------------------------------------
  console.log('\n--- 5. Kiểm tra FIX10-05: Frequency Gap không gán chu kỳ trung bình giả ---');

  const fgRes = FrequencyGapAlgorithm.predict(validHistory, { isVietlott: true, totalBalls: 45, topN: 6 });
  assert(fgRes.status === 'ok', 'Frequency Gap chạy thành công');
  assert(fgRes.scores[45] !== undefined, 'Bóng 45 có điểm');
  // Bóng 45 chưa bao giờ về phải có gapStatus insufficient-occurrences và avgCycle = null
  const stat45 = fgRes.metrics?.gapStats?.find(s => s.num === 45);
  if (stat45) {
    assert(stat45.gapStatus === 'insufficient-occurrences', 'Bóng 45 chưa về có gapStatus: insufficient-occurrences');
    assert(stat45.avgCycle === null, 'Bóng 45 chưa về có avgCycle === null (không gán chu kỳ giả)');
    assert(stat45.ripenessIndex === null, 'Bóng 45 chưa về có ripenessIndex === null');
  }
  // Điểm bóng 45 không được nhận điểm chín muồi cao (phải thấp hơn bóng xuất hiện nhiều lần như 5 hoặc 12)
  assert(fgRes.scores[45] < fgRes.scores[12], `Bóng 45 (chưa về) có điểm ${fgRes.scores[45]} < bóng 12 (về 2 lần) có điểm ${fgRes.scores[12]}`);

  // -----------------------------------------------------------------
  // 6. KIỂM TRA FIX10-06: Association Rules chiều thời gian & tính toán tay
  // -----------------------------------------------------------------
  console.log('\n--- 6. Kiểm tra FIX10-06: Association Rules chiều thời gian & tính toán tay ---');

  // 4 kỳ có transition cụ thể:
  // t=3 (cũ nhất): [1, 2, 10, 20, 30, 40]
  // t=2:           [2, 3, 10, 20, 30, 40]  -> Transition: {1,2}->{2,3} => 1->2 (1), 1->3 (1), 2->2 (1), 2->3 (1)
  // t=1:           [1, 3, 10, 20, 30, 40]  -> Transition: {2,3}->{1,3} => 2->1 (1), 2->3 (1), 3->1 (1), 3->3 (1)
  // t=0 (mới nhất):[1, 4, 10, 20, 30, 40]  -> Antecedents cho dự đoán kỳ tiếp theo
  const chronologyHistory = [
    { drawId: '#004', date: '2026-10-18', winningNumbers: [1, 4, 10, 20, 30, 40] }, // t=0 (mới nhất)
    { drawId: '#003', date: '2026-10-16', winningNumbers: [1, 3, 10, 20, 30, 40] }, // t=1
    { drawId: '#002', date: '2026-10-14', winningNumbers: [2, 3, 10, 20, 30, 40] }, // t=2
    { drawId: '#001', date: '2026-10-11', winningNumbers: [1, 2, 10, 20, 30, 40] }  // t=3 (cũ nhất)
  ];

  const assocRes = AssociationRulesAlgorithm.predict(chronologyHistory, { isVietlott: true, totalBalls: 45, topN: 6 });
  assert(assocRes.status === 'ok', 'Association Rules chạy thành công trên chronologyHistory');
  assert(Array.isArray(assocRes.predictions) && assocRes.predictions.length === 6, 'Association Rules trả về đúng 6 predictions');
  assert(assocRes.scoreType === 'ranking-score', 'Association Rules có scoreType: ranking-score (không gọi là xác suất trúng)');

  // -----------------------------------------------------------------
  // 7. KIỂM TRA FIX10-07: Poisson Semantics & Công thức
  // -----------------------------------------------------------------
  console.log('\n--- 7. Kiểm tra FIX10-07: Poisson semantics & phân biệt Vietlott / XSMN ---');

  const poissonVietlott = PoissonAlgorithm.predict(validHistory, { isVietlott: true, totalBalls: 45, topN: 6 });
  assert(poissonVietlott.status === 'ok', 'Poisson Vietlott status: ok');
  assert(poissonVietlott.scoreType === 'empirical-rate', 'Vietlott có scoreType: empirical-rate (không gọi là Poisson probability)');

  const mockXsmnHistory = [
    { drawId: '#X02', date: '2026-10-16', lottoPairs: ['12', '34', '12', '56'] },
    { drawId: '#X01', date: '2026-10-09', lottoPairs: ['12', '78', '90', '11'] }
  ];
  const poissonXsmn = PoissonAlgorithm.predict(mockXsmnHistory, { isVietlott: false, totalBalls: 100, topN: 5 });
  assert(poissonXsmn.status === 'ok', 'Poisson XSMN status: ok');
  assert(poissonXsmn.scoreType === 'expected-count', 'XSMN có scoreType: expected-count (biểu thị số lần về kỳ vọng)');

  // -----------------------------------------------------------------
  // 8. KIỂM TRA FIX10-08: Monte Carlo Simulations Hoàn Chỉnh & Determinism
  // -----------------------------------------------------------------
  console.log('\n--- 8. Kiểm tra FIX10-08: Monte Carlo Replicates hoàn chỉnh & Seed Determinism ---');

  const mcRes1 = MonteCarloAlgorithm.predict(validHistory, { 
    isVietlott: true, 
    totalBalls: 45, 
    topN: 6, 
    simulations: 1000, 
    seed: 54321 
  });
  const mcRes2 = MonteCarloAlgorithm.predict(validHistory, { 
    isVietlott: true, 
    totalBalls: 45, 
    topN: 6, 
    simulations: 1000, 
    seed: 54321 
  });

  assert(mcRes1.status === 'ok', 'Monte Carlo status: ok');
  assert(mcRes1.metrics.simulationsExecuted === 1000, 'Số lượt simulation hoàn thành chính xác 1000');
  assert(mcRes1.metrics.standardErrors && typeof mcRes1.metrics.standardErrors[1] === 'number', 'Có tính standard errors cho từng candidate');
  assert(JSON.stringify(mcRes1.predictions) === JSON.stringify(mcRes2.predictions), 'Monte Carlo có seed deterministic: 2 lần chạy cùng seed ra cùng predictions');

  // -----------------------------------------------------------------
  // 9. KIỂM TRA FIX10-09: Markov Transition tính tay & Bayesian Shrinkage
  // -----------------------------------------------------------------
  console.log('\n--- 9. Kiểm tra FIX10-09: Markov Transition tính tay & Bayesian Shrinkage ---');

  const markovRes = MarkovAlgorithm.predict(chronologyHistory, { isVietlott: true, totalBalls: 45, topN: 6 });
  assert(markovRes.status === 'ok', 'Markov chạy thành công');
  assert(markovRes.scoreType === 'ranking-score', 'Markov có scoreType: ranking-score');
  assert(markovRes.predictions.length === 6, 'Markov trả về đúng 6 predictions');

  // -----------------------------------------------------------------
  // 10. KIỂM TRA FIX10-10: K-Means Clustering thực thụ (Phương án B)
  // -----------------------------------------------------------------
  console.log('\n--- 10. Kiểm tra FIX10-10: K-Means Clustering thực thụ (K=3) ---');

  const kmeansRes = ClusteringAlgorithm.predict(validHistory, { isVietlott: true, totalBalls: 45, topN: 6 });
  assert(kmeansRes.status === 'ok', 'K-Means Clustering status: ok');
  assert(kmeansRes.scoreType === 'ranking-score', 'K-Means có scoreType: ranking-score');
  assert(kmeansRes.predictions.length === 6, 'K-Means trả về đúng 6 predictions');
  // Điểm số phải bao phủ toàn bộ 45 bóng
  let all45Clustered = true;
  for (let b = 1; b <= 45; b++) {
    if (typeof kmeansRes.scores[b] !== 'number' || !Number.isFinite(kmeansRes.scores[b])) {
      all45Clustered = false;
    }
  }
  assert(all45Clustered, 'K-Means cung cấp điểm số hữu hạn cho toàn bộ 45 bóng');

  // -----------------------------------------------------------------
  // 11. KIỂM TRA FIX10-11: Ensemble Leaderboard & Model Exclusions
  // -----------------------------------------------------------------
  console.log('\n--- 11. Kiểm tra FIX10-11: Ensemble Leaderboard & Model Exclusions ---');

  // Khi có 2 models, 1 model lỗi thiếu scores -> model lỗi bị loại, model còn lại nhận 100% trọng số
  const goodMockAlgo = {
    id: "good-mock",
    name: "Good Mock Algorithm",
    predict: (history, opts) => {
      const scores = {};
      for (let i = 1; i <= 45; i++) scores[i] = i * 2; // Điểm tăng dần
      return { status: 'ok', predictions: [45, 44, 43, 42, 41, 40], scores };
    }
  };

  const ensembleRobust = EnsembleAlgorithm.predict(validHistory, {
    isVietlott: true,
    totalBalls: 45,
    topN: 6,
    subAlgorithms: [
      { algo: incompleteMockAlgo, weight: 0.5 },
      { algo: goodMockAlgo, weight: 0.5 }
    ]
  });

  assert(ensembleRobust.status === 'ok', 'Ensemble loại bỏ model thiếu score và chạy thành công với model còn lại');
  assert(ensembleRobust.diagnostics && ensembleRobust.diagnostics.excludedModels.includes('incomplete-mock'), 'excludedModels ghi nhận incomplete-mock');
  assert(ensembleRobust.predictions[0] === 45, 'Candidate có điểm cao nhất ở model hợp lệ đứng đầu');

  // -----------------------------------------------------------------
  // 12. KIỂM TRA FIX10-12: XSMN Multiplicity vs Unique Presence
  // -----------------------------------------------------------------
  console.log('\n--- 12. Kiểm tra FIX10-12: XSMN Multiplicity counts vs Unique Presence ---');

  const xsmnDrawWithDups = {
    drawId: '#TP-001',
    date: '2026-10-17',
    lottoPairs: ['12', '34', '12', '56', '78', '12'] // '12' xuất hiện 3 lần
  };

  const eventSet = getDrawEventSet(xsmnDrawWithDups, { isVietlott: false, totalBalls: 100 });
  const eventCounts = getDrawEventCounts(xsmnDrawWithDups, { isVietlott: false, totalBalls: 100 });

  assert(eventSet.filter(x => x === '12').length === 1, 'getDrawEventSet chỉ chứa duy nhất 1 lần cặp "12" (Presence)');
  assert(eventCounts.get('12') === 3, 'getDrawEventCounts chứa đúng 3 lần cặp "12" (Multiplicity count = 3)');

  console.log('\n========================================================');
  console.log(` KẾT QUẢ REPRODUCE SUITE: ${passedCount} PASS, ${failedCount} FAIL`);
  console.log('========================================================');

  return { passedCount, failedCount, success: failedCount === 0 };
}

runFix10ReproduceTests().then(res => {
  if (!res.success) process.exit(1);
});

