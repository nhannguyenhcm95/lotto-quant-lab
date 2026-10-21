/**
 * BỘ KIỂM THỬ UNIT (UNIT TEST SUITE) - FIX-3
 * Kiểm thử độc lập từng module: Validators, Game Configs, 8 Thuật toán, Xử lý biên
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { LOTTO_CONFIG } from '../js/config.js';
import { DataService } from '../js/data-service.js';
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

async function runUnitTests() {
  console.log('========================================================');
  console.log('   LOTTO-QUANT LAB: UNIT TEST SUITE (TẦNG ĐƠN VỊ)');
  console.log('========================================================\n');

  // 1. Cấu hình hệ thống (config.js)
  console.log('1. Kiểm tra Cấu hình Hệ thống & Game Specs:');
  assert(LOTTO_CONFIG.ALGORITHMS.length === 8, 'Khai báo đầy đủ 8 thuật toán định lượng');
  assert(LOTTO_CONFIG.ALL_STATIONS.length >= 21, 'Khai báo đầy đủ 21 đài XSMN');
  assert(LOTTO_CONFIG.VIETLOTT_GAMES['mega-6-45'] !== undefined, 'Cấu hình Mega 6/45 hợp lệ');
  assert(LOTTO_CONFIG.VIETLOTT_GAMES['power-6-55'] !== undefined, 'Cấu hình Power 6/55 hợp lệ');

  // Lịch quay
  const nextFromMon = LOTTO_CONFIG.getNextDrawDate('2026-10-12', 'tphcm', false); // 2026-10-12 là Thứ 2
  assert(nextFromMon.dayOfWeek === 6 && nextFromMon.date === '2026-10-17', 'Lịch TPHCM: Sau Thứ 2 (2026-10-12) là Thứ 7 (2026-10-17)');

  const nextMega = LOTTO_CONFIG.getNextDrawDate('2026-10-14', 'mega-6-45', true); // 2026-10-14 là Thứ 4
  assert(nextMega.dayOfWeek === 5 && nextMega.date === '2026-10-16', 'Lịch Mega 6/45: Sau Thứ 4 (2026-10-14) là Thứ 6 (2026-10-16)');

  const nextPower = LOTTO_CONFIG.getNextDrawDate('2026-10-15', 'power-6-55', true); // 2026-10-15 là Thứ 5
  assert(nextPower.dayOfWeek === 6 && nextPower.date === '2026-10-17', 'Lịch Power 6/55: Sau Thứ 5 (2026-10-15) là Thứ 7 (2026-10-17)');

  // 2. DataService Validator (Siết chặt theo Fix-3)
  console.log('\n2. Kiểm tra DataService Validators:');
  
  // 2.1 Mega 6/45 Validator
  const validMega = {
    drawId: '#01576',
    date: '2026-10-16', // Thứ 6
    winningNumbers: [5, 12, 19, 24, 38, 41]
  };
  assert(DataService.validateMegaDraw(validMega).valid === true, 'Mega hợp lệ: Đủ drawId, đúng Thứ 6, 6 bóng số 1-45');

  const invalidMegaWrongSchedule = {
    drawId: '#09999',
    date: '2026-10-15', // Thứ 5 (Mega không quay Thứ 5)
    winningNumbers: [5, 12, 19, 24, 38, 41]
  };
  assert(DataService.validateMegaDraw(invalidMegaWrongSchedule).valid === false, 'Mega từ chối: Lịch quay sai ngày Thứ 5 (chỉ quay Thứ 4, 6, CN)');

  const invalidMegaMissingDrawId = {
    date: '2026-10-16',
    winningNumbers: [5, 12, 19, 24, 38, 41]
  };
  assert(DataService.validateMegaDraw(invalidMegaMissingDrawId).valid === false, 'Mega từ chối: Thiếu trường bắt buộc drawId');

  const invalidMegaFeb30 = {
    drawId: '#01000',
    date: '2026-02-30',
    winningNumbers: [1, 2, 3, 4, 5, 6]
  };
  assert(DataService.validateMegaDraw(invalidMegaFeb30).valid === false, 'Mega từ chối: Ngày không có thực (2026-02-30)');

  const invalidMegaDuplicate = {
    drawId: '#01000',
    date: '2026-10-16',
    winningNumbers: [5, 12, 19, 24, 41, 41]
  };
  assert(DataService.validateMegaDraw(invalidMegaDuplicate).valid === false, 'Mega từ chối: Trùng bóng số');

  const invalidMegaOutOfRange = {
    drawId: '#01000',
    date: '2026-10-16',
    winningNumbers: [5, 12, 19, 24, 41, 46]
  };
  assert(DataService.validateMegaDraw(invalidMegaOutOfRange).valid === false, 'Mega từ chối: Bóng số 46 vượt quá 45');

  // 2.2 Power 6/55 Validator
  const validPower = {
    drawId: '#01411',
    date: '2026-10-15', // Thứ 5
    winningNumbers: [7, 14, 22, 35, 48, 51],
    bonusNumber: 9
  };
  assert(DataService.validatePowerDraw(validPower).valid === true, 'Power hợp lệ: Đủ drawId, đúng Thứ 5, 6 số chính 1-55 và bonusNumber');

  const invalidPowerWrongSchedule = {
    drawId: '#09999',
    date: '2026-10-16', // Thứ 6 (Power không quay Thứ 6)
    winningNumbers: [7, 14, 22, 35, 48, 51],
    bonusNumber: 9
  };
  assert(DataService.validatePowerDraw(invalidPowerWrongSchedule).valid === false, 'Power từ chối: Lịch quay sai ngày Thứ 6 (chỉ quay Thứ 3, 5, 7)');

  const invalidPowerMissingBonus = {
    drawId: '#01411',
    date: '2026-10-15',
    winningNumbers: [7, 14, 22, 35, 48, 51]
  };
  assert(DataService.validatePowerDraw(invalidPowerMissingBonus).valid === false, 'Power từ chối: Thiếu số đặc biệt bonusNumber');

  const invalidPowerBonusOverlap = {
    drawId: '#01411',
    date: '2026-10-15',
    winningNumbers: [7, 14, 22, 35, 48, 51],
    bonusNumber: 14 // Trùng với số chính
  };
  assert(DataService.validatePowerDraw(invalidPowerBonusOverlap).valid === false, 'Power từ chối: bonusNumber trùng với 1 trong 6 số chính');

  // 2.3 XSMN Validator
  const validXSMN = {
    date: '2026-10-16',
    stationId: 'vinh-long',
    prizes: {
      special: ['123456'],
      g1: ['23456'],
      g8: ['78']
    },
    lottoPairs: Array(18).fill('56')
  };
  assert(DataService.validateXSMNDraw(validXSMN).valid === true, 'XSMN hợp lệ: Có đầy đủ prizes, đủ 18 đuôi lottoPairs');

  const invalidXSMNInvalidDigits = {
    date: '2026-10-16',
    stationId: 'vinh-long',
    prizes: {
      special: ['ABCDEF']
    },
    lottoPairs: ['01']
  };
  assert(DataService.validateXSMNDraw(invalidXSMNInvalidDigits).valid === false, 'XSMN từ chối: Giải chứa chữ cái (không phải số)');

  // 3. Kiểm thử 8 Thuật Toán Độc Lập
  console.log('\n3. Kiểm thử 8 Thuật Toán Độc Lập (Đúng đắn & Xử lý biên):');
  const mockHistory = [
    { date: '2026-10-14', winningNumbers: [6, 16, 19, 21, 34, 43] },
    { date: '2026-10-11', winningNumbers: [3, 11, 20, 25, 33, 40] },
    { date: '2026-10-09', winningNumbers: [1, 15, 22, 28, 35, 44] },
    { date: '2026-10-07', winningNumbers: [4, 12, 19, 29, 36, 42] },
    { date: '2026-10-04', winningNumbers: [7, 14, 21, 30, 37, 45] },
    { date: '2026-10-02', winningNumbers: [2, 10, 18, 26, 34, 41] },
    { date: '2026-09-30', winningNumbers: [5, 13, 23, 31, 38, 43] },
    { date: '2026-09-27', winningNumbers: [8, 17, 24, 32, 39, 44] }
  ];

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
    const res = algo.predict(mockHistory, { isVietlott: true, totalBalls: 45, topN: 6, seed: 12345 });
    assert(res.predictions && res.predictions.length === 6, `${algo.name}: Sinh đủ 6 bóng số trên dữ liệu mẫu`);
    assert(res.scores && Object.keys(res.scores).length > 0, `${algo.name}: Trả về ma trận điểm xác suất`);
    assert(typeof res.explanation === 'string' && res.explanation.length > 10, `${algo.name}: Có giải trình thuật toán`);
  });

  // Kiểm tra xử lý rỗng: không sinh số giả
  let allCleanOnEmpty = true;
  for (const algo of algos) {
    const emptyRes = algo.predict([], { isVietlott: true, totalBalls: 45, topN: 6 });
    if (emptyRes.status !== 'insufficient-data' || emptyRes.predictions.length !== 0) {
      allCleanOnEmpty = false;
      console.error(`  [FAIL-DETAIL] ${algo.name} khi rỗng không trả insufficient-data!`);
    }
  }
  assert(allCleanOnEmpty, 'P0: Cả 8 thuật toán trả về status: "insufficient-data" và predictions: [] khi tập dữ liệu rỗng');

  // 4. KIỂM THỬ HỒI QUY FIX-4 (FIX-4 REGRESSION TESTS)
  console.log('\n4. Kiểm thử Hồi Quy FIX-4: Schema Cặp Số, Consensus, và Tính Tái Lập:');

  // 4.1 Schema Cặp Số Bạc Nhớ (Association Rules)
  const pairTestHistory = [
    { date: '2026-10-14', winningNumbers: [1, 2, 3, 4, 5, 6] },
    { date: '2026-10-11', winningNumbers: [1, 2, 7, 8, 9, 10] },
    { date: '2026-10-09', winningNumbers: [1, 3, 11, 12, 13, 14] },
    { date: '2026-10-07', winningNumbers: [2, 4, 15, 16, 17, 18] }
  ];

  const assocRes = AssociationRulesAlgorithm.predict(pairTestHistory, { isVietlott: true, totalBalls: 45, topN: 6 });
  assert(assocRes.status === 'ok' && Array.isArray(assocRes.frequentPairs), 'AssociationRules: Trả về mảng frequentPairs');
  assert(assocRes.frequentPairs.length > 0, 'AssociationRules: Tìm thấy các cặp số xuất hiện cùng nhau');

  // Kiểm tra cặp (01, 02)
  const pair12 = assocRes.frequentPairs.find(p => (p.a === '01' && p.b === '02') || (p.a === '02' && p.b === '01') || (typeof p.pair === 'string' && (p.pair.includes('01 - 02') || p.pair.includes('02 - 01'))));
  assert(pair12 !== undefined, 'AssociationRules: Phát hiện cặp (01, 02) đi cùng nhau');
  assert(pair12?.coOccurrenceCount === 2, `AssociationRules: Cặp (1, 2) có đúng coOccurrenceCount = 2 (Thực tế: ${pair12?.coOccurrenceCount})`);
  assert(pair12?.count === 2, `AssociationRules: Tương thích ngược thuộc tính count === 2 (Thực tế: ${pair12?.count})`);
  assert(pair12?.totalEligibleDraws === 4, `AssociationRules: totalEligibleDraws === 4 (Thực tế: ${pair12?.totalEligibleDraws})`);
  assert(typeof pair12?.lift === 'number' && !isNaN(pair12.lift), `AssociationRules: Lift là số hợp lệ không NaN (Thực tế: ${pair12?.lift})`);
  assert(typeof pair12?.support === 'number' && !isNaN(pair12.support), `AssociationRules: Support là số hợp lệ không NaN (Thực tế: ${pair12?.support})`);
  assert(typeof pair12?.confidence === 'number' && !isNaN(pair12.confidence), `AssociationRules: Confidence là số hợp lệ không NaN (Thực tế: ${pair12?.confidence})`);

  // 4.2 Consensus Transparency & Mẫu số hợp lệ
  const ensembleRes = EnsembleAlgorithm.predict(mockHistory, { isVietlott: true, totalBalls: 45, topN: 6, seed: 12345 });
  assert(ensembleRes.totalAlgorithmsExpected === 7, `Ensemble: totalAlgorithmsExpected === 7 (7 mô hình thành phần)`);
  assert(ensembleRes.totalAlgorithmsUsed === 7, `Ensemble: totalAlgorithmsUsed === 7 khi dữ liệu đủ`);
  assert(Array.isArray(ensembleRes.participatingModels) && ensembleRes.participatingModels.length === 7, 'Ensemble: participatingModels chứa danh sách 7 mô hình hợp lệ');
  assert(typeof ensembleRes.scoreDefinition === 'string' && ensembleRes.scoreDefinition.includes('chuẩn hóa'), 'Ensemble: scoreDefinition công bố rõ thang đo điểm chuẩn hóa');
  assert(ensembleRes.disclaimer.includes('không phải xác suất trúng xổ số'), 'Ensemble: disclaimer khẳng định đây là mức đồng thuận mô hình, không phải xác suất trúng');

  // 4.3 Tính tái lập của Monte Carlo Seeded Engine
  const seedRunA = MonteCarloAlgorithm.predict(mockHistory, { isVietlott: true, totalBalls: 45, topN: 6, seed: 99999 });
  const seedRunB = MonteCarloAlgorithm.predict(mockHistory, { isVietlott: true, totalBalls: 45, topN: 6, seed: 99999 });
  assert(JSON.stringify(seedRunA.predictions) === JSON.stringify(seedRunB.predictions), 'Monte Carlo (Fix-4): Seed 99999 tái lập 100% kết quả dự đoán');
  assert(JSON.stringify(seedRunA.scores) === JSON.stringify(seedRunB.scores), 'Monte Carlo (Fix-4): Seed 99999 tái lập 100% ma trận điểm xác suất');

  console.log('\n========================================================');
  console.log(` KẾT QUẢ UNIT TEST: ${passedCount} PASS, ${failedCount} FAIL`);
  console.log('========================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runUnitTests();

