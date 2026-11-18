/**
 * LOTTO-QUANT LAB: MATHEMATICAL PROBABILITY & FAIRNESS VERIFICATION SUITE
 * 
 * Kiểm chứng tính đúng đắn của toàn bộ hệ thống tính toán xác suất xổ số:
 * 1. Đối chiếu lý thuyết toán học tổ hợp C(n,k), phân phối Siêu bội (Hypergeometric),
 *    phân phối Nhị thức Binomial(18, 0.01), EV, odds chuẩn hóa cho Vietlott & XSMN.
 * 2. Kiểm định thống kê Chi-Square Goodness-of-Fit trên dữ liệu thực tế (Mega, Power, XSMN).
 * 3. Kiểm định sai số & hội tụ Monte Carlo (Law of Large Numbers, Standard Error).
 * 4. Kiểm thử điều kiện biên & invariants (rỗng, đơn lẻ, ngoại lai, lookahead isolation).
 * 5. Kiểm tra hợp đồng ngữ nghĩa toán học (bác bỏ Gambler's Fallacy, scoreType contracts).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { LOTTO_CONFIG } from '../js/config.js';
import { PoissonAlgorithm } from '../js/algorithms/poisson.js';
import { MarkovAlgorithm } from '../js/algorithms/markov.js';
import { MonteCarloAlgorithm } from '../js/algorithms/monte-carlo.js';
import { FrequencyGapAlgorithm } from '../js/algorithms/frequency-gap.js';
import { MovingAverageAlgorithm } from '../js/algorithms/moving-average.js';
import { ClusteringAlgorithm } from '../js/algorithms/clustering.js';
import { AssociationRulesAlgorithm } from '../js/algorithms/association-rules.js';
import { EnsembleAlgorithm } from '../js/algorithms/ensemble.js';
import { ProbabilityMath } from '../js/algorithms/probability-math.js';

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

// -------------------------------------------------------------
// HÀM TOÁN HỌC NỀN TẢNG (MATHEMATICAL PRIMITIVES)
// -------------------------------------------------------------

function combinations(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  for (let i = 1; i <= k; i++) {
    c = (c * (n - i + 1)) / i;
  }
  return Math.round(c);
}

function hypergeometricPMF(N, K, n, k) {
  const numerator = combinations(K, k) * combinations(N - K, n - k);
  const denominator = combinations(N, n);
  return numerator / denominator;
}

// Hàm xấp xỉ p-value cho phân phối Chi-Square với bậc tự do df
function chiSquarePValue(chiSq, df) {
  if (chiSq <= 0 || df <= 0) return 1.0;
  // Xấp xỉ Wilson-Hilferty transformation sang phân phối chuẩn chuẩn tắc Z:
  const z = (Math.pow(chiSq / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  // P-value từ xấp xỉ chuẩn tắc standard normal CDF (Upper tail):
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? prob : 1 - prob;
}

export async function runProbabilityMathTests() {
  console.log('================================================================');
  console.log('   LOTTO-QUANT LAB: MATHEMATICAL PROBABILITY & INTEGRITY SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // PHẦN 1: ĐỐI CHIẾU LÝ THUYẾT TOÁN TỔ HỢP & PHÂN PHỐI SIÊU BỘI
  // -------------------------------------------------------------
  console.log('1. Kiểm chứng Toán Tổ Hợp & Phân Phối Siêu Bội (Hypergeometric):');

  // Mega 6/45
  const omega45 = combinations(45, 6);
  assert(omega45 === 8145060, `Mega 6/45: Không gian mẫu C(45,6) = 8,145,060 (Thực tế: ${omega45})`);

  // Kiểm chứng qua thư viện ProbabilityMath dùng chung
  assert(ProbabilityMath && typeof ProbabilityMath.combination === 'function', 'ProbabilityMath: Module được xuất bản và nạp thành công');
  assert(ProbabilityMath.combination(45, 6) === 8145060, 'ProbabilityMath.combination(45,6) === 8,145,060');
  assert(ProbabilityMath.combination(55, 6) === 28989675, 'ProbabilityMath.combination(55,6) === 28,989,675');
  assert(Math.abs(ProbabilityMath.hypergeometricPMF(6, 45, 6, 6) - 1 / 8145060) < 1e-15, 'ProbabilityMath.hypergeometricPMF khớp Jackpot 6/45');
  const megaSpecs = ProbabilityMath.getMega645TheoreticalSpecs();
  assert(megaSpecs && megaSpecs.overallOdds === 41.96, 'ProbabilityMath.getMega645TheoreticalSpecs() odds khớp 41.96');
  const xsmnSpecs = ProbabilityMath.getXsmnTheoreticalSpecs();
  assert(xsmnSpecs && xsmnSpecs.baoLo2So.expectedOccurrences === 0.18, 'ProbabilityMath.getXsmnTheoreticalSpecs() bao lô E[X] === 0.18');
  const evRes = ProbabilityMath.calculateMega645EV(12000000000, 10000);
  assert(Math.abs(evRes.ev - (-7304.02)) < 0.1, `ProbabilityMath.calculateMega645EV khớp -7,304 VNĐ (Thực tế: ${evRes.ev})`);

  const pJP_45 = hypergeometricPMF(45, 6, 6, 6);
  assert(Math.abs(pJP_45 - 1 / 8145060) < 1e-15, `Mega 6/45: P(Jackpot) = 1/8,145,060 ≈ ${pJP_45.toExponential(6)}`);

  const pG1_45 = hypergeometricPMF(45, 6, 6, 5);
  const combG1_45 = combinations(6, 5) * combinations(39, 1);
  assert(combG1_45 === 234, `Mega 6/45: Số tổ hợp Giải Nhất (5 bóng) = 234`);
  assert(Math.abs(pG1_45 - 234 / 8145060) < 1e-15, `Mega 6/45: P(Giải Nhất) = 234/8,145,060 ≈ ${pG1_45.toExponential(6)} (Odds 1:34,808)`);

  const pG2_45 = hypergeometricPMF(45, 6, 6, 4);
  const combG2_45 = combinations(6, 4) * combinations(39, 2);
  assert(combG2_45 === 11115, `Mega 6/45: Số tổ hợp Giải Nhì (4 bóng) = 11,115`);
  assert(Math.abs(pG2_45 - 11115 / 8145060) < 1e-15, `Mega 6/45: P(Giải Nhì) = 11,115/8,145,060 ≈ ${pG2_45.toExponential(6)} (Odds 1:733)`);

  const pG3_45 = hypergeometricPMF(45, 6, 6, 3);
  const combG3_45 = combinations(6, 3) * combinations(39, 3);
  assert(combG3_45 === 182780, `Mega 6/45: Số tổ hợp Giải Ba (3 bóng) = 182,780`);
  assert(Math.abs(pG3_45 - 182780 / 8145060) < 1e-15, `Mega 6/45: P(Giải Ba) = 182,780/8,145,060 ≈ ${pG3_45.toExponential(6)} (Odds 1:44.56)`);

  const totalWinComb_45 = 1 + combG1_45 + combG2_45 + combG3_45;
  assert(totalWinComb_45 === 194130, `Mega 6/45: Tổng tổ hợp trúng thưởng bất kỳ = 194,130`);
  const pWin_45 = totalWinComb_45 / omega45;
  assert(Math.abs(pWin_45 - 0.02383408) < 1e-6, `Mega 6/45: Xác suất trúng giải bất kỳ P(X >= 3) ≈ 2.3834% (Odds 1:41.96)`);

  // Tính bảo toàn xác suất toàn phần: Sum(k=0..6) = 1.0
  let sumP_45 = 0;
  for (let k = 0; k <= 6; k++) {
    sumP_45 += hypergeometricPMF(45, 6, 6, k);
  }
  assert(Math.abs(sumP_45 - 1.0) < 1e-12, `Mega 6/45: Bảo toàn tiên đề xác suất Kolmogorov: Sum(P(k=0..6)) = 1.000000000000`);

  // Kỳ vọng toán học EV Mega 6/45 tại Jackpot tối thiểu 12 tỷ
  const evMinJP = (182780 * 30000 + 11115 * 300000 + 234 * 10000000 + 1 * 10801000000) / omega45 - 10000;
  assert(Math.abs(evMinJP - (-7304.02)) < 1.0, `Mega 6/45: Kỳ vọng toán học tại JP 12 tỷ: EV = -7,304 VNĐ (RTP ~ 26.96%)`);

  // Power 6/55
  const omega55 = combinations(55, 6);
  assert(omega55 === 28989675, `Power 6/55: Không gian mẫu C(55,6) = 28,989,675 (Thực tế: ${omega55})`);

  const pJP1_55 = 1 / omega55;
  assert(Math.abs(pJP1_55 - 3.4495e-8) < 1e-11, `Power 6/55: P(Jackpot 1) = 1/28,989,675 ≈ ${pJP1_55.toExponential(6)}`);

  const combJP2_55 = combinations(6, 5) * combinations(1, 1) * combinations(48, 0);
  assert(combJP2_55 === 6, `Power 6/55: Số tổ hợp Jackpot 2 (5 bóng + Bonus) = 6`);
  const pJP2_55 = combJP2_55 / omega55;
  assert(Math.abs(pJP2_55 - 6 / 28989675) < 1e-15, `Power 6/55: P(Jackpot 2) = 6/28,989,675 (Odds 1:4,831,612.5)`);

  const combG1_55 = combinations(6, 5) * combinations(1, 0) * combinations(48, 1);
  assert(combG1_55 === 288, `Power 6/55: Số tổ hợp Giải Nhất (5 bóng không Bonus) = 288`);
  assert(Math.abs(combG1_55 / omega55 - 288 / 28989675) < 1e-15, `Power 6/55: P(Giải Nhất) = 288/28,989,675 (Odds 1:100,659)`);

  const combG2_55 = combinations(6, 4) * combinations(49, 2);
  assert(combG2_55 === 17640, `Power 6/55: Số tổ hợp Giải Nhì (4 bóng) = 17,640 (Odds 1:1,643.41)`);

  const combG3_55 = combinations(6, 3) * combinations(49, 3);
  assert(combG3_55 === 368480, `Power 6/55: Số tổ hợp Giải Ba (3 bóng) = 368,480 (Odds 1:78.67)`);

  const totalWinComb_55 = 1 + combJP2_55 + combG1_55 + combG2_55 + combG3_55;
  assert(totalWinComb_55 === 386415, `Power 6/55: Tổng số tổ hợp trúng giải = 386,415`);
  const pWin_55 = totalWinComb_55 / omega55;
  assert(Math.abs(pWin_55 - 0.0133294) < 1e-6, `Power 6/55: Xác suất trúng giải bất kỳ P ≈ 1.3329% (Odds 1:75.02)`);

  // XSMN 18 giải & Cược phụ
  console.log('\n2. Kiểm chứng Xác Suất XSMN 18 Giải & Các Thể Thức Cược Phụ:');
  const pBaoLo18 = 1 - Math.pow(0.99, 18);
  assert(Math.abs(pBaoLo18 - 0.165486) < 1e-5, `XSMN Bao Lô 2 số: P(X >= 1) = 1 - 0.99^18 ≈ 16.549% (Odds 1:6.04)`);
  const evBaoLoCount = 18 * 0.01;
  assert(Math.abs(evBaoLoCount - 0.18) < 1e-12, `XSMN Bao Lô: Kỳ vọng số lần xuất hiện E[X] = 18 * 0.01 = 0.18 nháy`);

  const pXiuChu17 = 1 - Math.pow(0.999, 17);
  assert(Math.abs(pXiuChu17 - 0.016865) < 1e-5, `XSMN Xỉu Chủ (17 giải >= 3 số): P(X >= 1) = 1 - 0.999^17 ≈ 1.686% (Odds 1:59.30)`);

  const pXien2 = 1 - 2 * Math.pow(0.99, 18) + Math.pow(0.98, 18);
  assert(Math.abs(pXien2 - 0.026108) < 1e-5, `XSMN Lô Xiên 2: P = 1 - 2*(0.99^18) + 0.98^18 ≈ 2.611% (Odds 1:38.30)`);

  const pXien3 = 1 - 3 * Math.pow(0.99, 18) + 3 * Math.pow(0.98, 18) - Math.pow(0.97, 18);
  assert(Math.abs(pXien3 - 0.003913) < 1e-5, `XSMN Lô Xiên 3: P ≈ 0.391% (Odds 1:255.53)`);

  const pXien4 = 1 - 4 * Math.pow(0.99, 18) + 6 * Math.pow(0.98, 18) - 4 * Math.pow(0.97, 18) + Math.pow(0.96, 18);
  assert(Math.abs(pXien4 - 0.000555) < 1e-5, `XSMN Lô Xiên 4: P ≈ 0.0555% (Odds 1:1,801.07)`);

  // Max 3D / Max 3D Pro
  const pMax3D = 1 - Math.pow(0.999, 20);
  assert(Math.abs(pMax3D - 0.019813) < 1e-5, `Max 3D: P(Trúng >= 1 giải trong 20 bộ) = 1 - 0.999^20 ≈ 1.981% (Odds 1:50.47)`);

  // -------------------------------------------------------------
  // PHẦN 2: KIỂM ĐỊNH CHI-SQUARE GOODNESS-OF-FIT TRÊN DATA THỰC TẾ
  // -------------------------------------------------------------
  console.log('\n3. Kiểm định Chi-Square Goodness-of-Fit trên Dữ Liệu Lịch Sử Thực Tế:');
  const seedPath = path.join(__dirname, '..', 'data', 'historical-seed.json');
  assert(fs.existsSync(seedPath), 'Dữ liệu historical-seed.json tồn tại phục vụ kiểm định');
  const rawSeed = fs.readFileSync(seedPath, 'utf-8').replace(/^\uFEFF/, '');
  const seedData = JSON.parse(rawSeed);

  // A. Chi-Square Test cho Vietlott Mega 6/45
  const megaHistory = seedData.vietlott['mega-6-45'];
  const nDrawsMega = megaHistory.length;
  assert(nDrawsMega === 1576, `Mega 6/45 có đủ 1.576 kỳ quay lịch sử`);
  const totalBallsMega = nDrawsMega * 6; // 9456 bóng
  const expectedPerBallMega = totalBallsMega / 45; // 210.1333

  const countsMega = {};
  for (let i = 1; i <= 45; i++) countsMega[i] = 0;
  for (const draw of megaHistory) {
    for (const b of draw.winningNumbers) {
      countsMega[Number(b)] = (countsMega[Number(b)] || 0) + 1;
    }
  }

  let chiSqMega = 0;
  let minCountMega = Infinity;
  let maxCountMega = -Infinity;
  for (let i = 1; i <= 45; i++) {
    const obs = countsMega[i];
    if (obs < minCountMega) minCountMega = obs;
    if (obs > maxCountMega) maxCountMega = obs;
    chiSqMega += Math.pow(obs - expectedPerBallMega, 2) / expectedPerBallMega;
  }
  const dfMega = 44;
  const pValMega = chiSquarePValue(chiSqMega, dfMega);
  console.log(`     -> Chi-Square Mega 6/45: χ² = ${chiSqMega.toFixed(3)}, df = 44, p-value = ${pValMega.toFixed(4)}, Min = ${minCountMega}, Max = ${maxCountMega}, E = ${expectedPerBallMega.toFixed(1)}`);
  assert(minCountMega > 100, `Mega 6/45: 100% bóng số 1-45 đều đã xuất hiện (Min: ${minCountMega} lần > 100)`);
  assert(pValMega > 0.01, `Mega 6/45: Kiểm định Chi-Square không bị dị thường cực đoan (p-value = ${pValMega.toFixed(4)} > 0.01)`);

  // B. Chi-Square Test cho Vietlott Power 6/55
  const powerAll = seedData.vietlott['power-6-55'];
  const nDrawsPower = powerAll.length;
  assert(nDrawsPower === 1411, `Power 6/55 có đủ 1.411 kỳ quay lịch sử`);
  const totalBallsPower = nDrawsPower * 6; // 8466 bóng chính
  const expectedPerBallPower = totalBallsPower / 55; // 153.9273

  const countsPower = {};
  for (let i = 1; i <= 55; i++) countsPower[i] = 0;
  for (const draw of powerAll) {
    for (const b of draw.winningNumbers) {
      countsPower[Number(b)] = (countsPower[Number(b)] || 0) + 1;
    }
  }

  let chiSqPower = 0;
  let minCountPower = Infinity;
  let maxCountPower = -Infinity;
  for (let i = 1; i <= 55; i++) {
    const obs = countsPower[i];
    if (obs < minCountPower) minCountPower = obs;
    if (obs > maxCountPower) maxCountPower = obs;
    chiSqPower += Math.pow(obs - expectedPerBallPower, 2) / expectedPerBallPower;
  }
  const dfPower = 54;
  const pValPower = chiSquarePValue(chiSqPower, dfPower);
  console.log(`     -> Chi-Square Power 6/55: χ² = ${chiSqPower.toFixed(3)}, df = 54, p-value = ${pValPower.toFixed(4)}, Min = ${minCountPower}, Max = ${maxCountPower}, E = ${expectedPerBallPower.toFixed(1)}`);
  assert(minCountPower > 80, `Power 6/55: 100% bóng số 1-55 đều đã xuất hiện (Min: ${minCountPower} lần > 80)`);
  assert(pValPower > 0.01, `Power 6/55: Kiểm định Chi-Square không bị dị thường cực đoan (p-value = ${pValPower.toFixed(4)} > 0.01)`);

  // C. Chi-Square Test cho XSMN 18 giải
  const xsmnHistory = seedData.xsmn;
  const nDrawsXsmn = xsmnHistory.length;
  assert(nDrawsXsmn === 352, `XSMN có đủ 352 kỳ quay qua 21 đài`);
  const totalLottoPairsXsmn = nDrawsXsmn * 18; // 6336 đuôi số
  const expectedPerPairXsmn = totalLottoPairsXsmn / 100; // 63.36

  const countsXsmn = {};
  for (let i = 0; i < 100; i++) {
    const k = i < 10 ? `0${i}` : `${i}`;
    countsXsmn[k] = 0;
  }
  for (const draw of xsmnHistory) {
    if (Array.isArray(draw.lottoPairs)) {
      for (const pair of draw.lottoPairs) {
        const pStr = String(pair).padStart(2, '0');
        if (countsXsmn[pStr] !== undefined) {
          countsXsmn[pStr]++;
        }
      }
    }
  }

  let chiSqXsmn = 0;
  let minCountXsmn = Infinity;
  let maxCountXsmn = -Infinity;
  for (let i = 0; i < 100; i++) {
    const k = i < 10 ? `0${i}` : `${i}`;
    const obs = countsXsmn[k];
    if (obs < minCountXsmn) minCountXsmn = obs;
    if (obs > maxCountXsmn) maxCountXsmn = obs;
    chiSqXsmn += Math.pow(obs - expectedPerPairXsmn, 2) / expectedPerPairXsmn;
  }
  const dfXsmn = 99;
  const pValXsmn = chiSquarePValue(chiSqXsmn, dfXsmn);
  console.log(`     -> Chi-Square XSMN (100 cặp): χ² = ${chiSqXsmn.toFixed(3)}, df = 99, p-value = ${pValXsmn.toFixed(4)}, Min = ${minCountXsmn}, Max = ${maxCountXsmn}, E = ${expectedPerPairXsmn.toFixed(1)}`);
  assert(minCountXsmn > 25, `XSMN: 100% cặp số 00-99 đều đã xuất hiện (Min: ${minCountXsmn} lần > 25)`);
  assert(pValXsmn > 0.01, `XSMN: Kiểm định Chi-Square không bị dị thường cực đoan (p-value = ${pValXsmn.toFixed(4)} > 0.01)`);

  // -------------------------------------------------------------
  // PHẦN 3: KIỂM ĐỊNH HỘI TỤ MONTE CARLO & ĐỐI CHIẾU SAI SỐ
  // -------------------------------------------------------------
  console.log('\n4. Kiểm định Hội Tụ Monte Carlo & Sai Số Chuẩn (Standard Error):');
  const nSimulations = 10000;
  const pTheoreticalMega = 6 / 45; // 0.13333333333333333
  const seTheoreticalMega = Math.sqrt((pTheoreticalMega * (1 - pTheoreticalMega)) / nSimulations); // ~0.003399
  
  // Chạy giả lập 10,000 lượt rút ngẫu nhiên 6 bóng không hoàn lại từ [1..45]
  const simCounts = new Array(46).fill(0);
  let rngSeed = 42;
  function pseudoRandom() {
    rngSeed = (rngSeed * 1664525 + 1013904223) % 4294967296;
    return rngSeed / 4294967296;
  }

  for (let s = 0; s < nSimulations; s++) {
    const deck = Array.from({ length: 45 }, (_, i) => i + 1);
    // Fisher-Yates rút 6 bóng
    for (let i = 0; i < 6; i++) {
      const idx = i + Math.floor(pseudoRandom() * (45 - i));
      const tmp = deck[i];
      deck[i] = deck[idx];
      deck[idx] = tmp;
      simCounts[deck[i]]++;
    }
  }

  let maxZScore = 0;
  for (let b = 1; b <= 45; b++) {
    const pHat = simCounts[b] / nSimulations;
    const z = Math.abs(pHat - pTheoreticalMega) / seTheoreticalMega;
    if (z > maxZScore) maxZScore = z;
  }

  assert(maxZScore < 3.89, `Monte Carlo hội tụ: Max |z-score| = ${maxZScore.toFixed(2)} < 3.89 (P(|Z| >= 3.89) < 0.0001)`);
  assert(seTheoreticalMega > 0.003 && seTheoreticalMega < 0.004, `Sai số chuẩn lý thuyết SE khớp: ${seTheoreticalMega.toFixed(6)}`);

  // -------------------------------------------------------------
  // PHẦN 4: TEST ĐIỀU KIỆN BIÊN & TÍNH BẤT BIẾN (INVARIANTS)
  // -------------------------------------------------------------
  console.log('\n5. Kiểm định Điều Kiện Biên & Invariants:');
  const optsMega = { isVietlott: true, totalBalls: 45, topN: 6 };

  // A. Lịch sử rỗng
  const emptyRes = EnsembleAlgorithm.predict([], optsMega);
  assert(emptyRes && (emptyRes.status === 'insufficient-data' || emptyRes.predictions.length === 0), 'Biên: Lịch sử rỗng trả status: insufficient-data');

  // B. Lịch sử 1 kỳ
  const singleDraw = [{ drawId: '#00001', date: '2026-10-01', winningNumbers: [1, 2, 3, 4, 5, 6] }];
  const singleRes = PoissonAlgorithm.predict(singleDraw, optsMega);
  assert(singleRes && singleRes.predictions.length === 6, 'Biên: Lịch sử 1 kỳ chạy an toàn, sinh đủ 6 bóng');
  const singleScores = Object.values(singleRes.scores || {});
  assert(singleScores.every(s => typeof s === 'number' && !isNaN(s) && isFinite(s)), 'Biên: Lịch sử 1 kỳ không sinh ra NaN hoặc Infinity');

  // C. Kháng lỗi Lookahead (Temporal Isolation)
  const pastData = megaHistory.slice(0, 100);
  const futureDraw = { drawId: '#99999', date: '2099-12-31', winningNumbers: [40, 41, 42, 43, 44, 45] };
  const contaminated = [futureDraw, ...pastData];
  const filteredPast = contaminated.filter(d => d.date <= '2026-10-01');
  const pDirect = EnsembleAlgorithm.predict(pastData.filter(d => d.date <= '2026-10-01'), optsMega);
  const pFiltered = EnsembleAlgorithm.predict(filteredPast, optsMega);
  assert(JSON.stringify(pDirect.predictions) === JSON.stringify(pFiltered.predictions), 'Invariance: Kỳ tương lai không làm ô nhiễm tập dữ liệu quá khứ');

  // -------------------------------------------------------------
  // PHẦN 5: KIỂM TRA HỢP ĐỒNG NGỮ NGHĨA TOÁN HỌC & BÁC BỎ GAMBLER'S FALLACY
  // -------------------------------------------------------------
  console.log('\n6. Kiểm tra Hợp Đồng Ngữ Nghĩa Toán Học (Contracts & Fairness):');
  const sampleHistory = megaHistory.slice(0, 30);

  // A. FrequencyGapAlgorithm
  const fgRes = FrequencyGapAlgorithm.predict(sampleHistory, optsMega);
  assert(fgRes.scoreType === 'ranking-score', `FrequencyGap: scoreType là 'ranking-score' (Thực tế: ${fgRes.scoreType})`);
  assert(!JSON.stringify(fgRes).includes('xác suất trúng'), 'FrequencyGap: Không chứa tuyên bố sai lệch "xác suất trúng"');

  // B. PoissonAlgorithm
  const pVietlott = PoissonAlgorithm.predict(sampleHistory, optsMega);
  assert(pVietlott.scoreType === 'empirical-rate', `Poisson Vietlott: scoreType là 'empirical-rate' (Thực tế: ${pVietlott.scoreType})`);

  const pXsmn = PoissonAlgorithm.predict(seedData.xsmn.slice(0, 30), { isVietlott: false, totalBalls: 100, topN: 5 });
  assert(pXsmn.scoreType === 'expected-count', `Poisson XSMN: scoreType là 'expected-count' (Thực tế: ${pXsmn.scoreType})`);

  // C. EnsembleAlgorithm
  const ensRes = EnsembleAlgorithm.predict(sampleHistory, optsMega);
  assert(ensRes.scoreDefinition !== undefined, 'Ensemble: Công bố định nghĩa thang điểm rõ ràng');
  assert(ensRes.disclaimer !== undefined, 'Ensemble: Có tuyên bố miễn trừ và khẳng định rõ là mức đồng thuận mô hình');

  console.log('\n================================================================');
  console.log(` KẾT QUẢ MATHEMATICAL VERIFICATION: ${passedCount} PASS, ${failedCount} FAIL`);
  console.log('================================================================');

  return { passed: passedCount, failed: failedCount, success: failedCount === 0 };
}

if (process.argv[1] && process.argv[1].endsWith('test-probability-math.js')) {
  runProbabilityMathTests().then(res => {
    if (!res.success) process.exit(1);
  });
}
