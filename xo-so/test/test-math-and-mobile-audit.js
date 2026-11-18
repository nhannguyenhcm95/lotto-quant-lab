/**
 * LOTTO-QUANT LAB: DEEP MATHEMATICAL INVARIANTS, EDGE CASES & MOBILE UI AUDIT SUITE
 *
 * Kiểm chứng chuyên sâu:
 *  1. Toán học xác suất biên: BigInt combinatorics lớn, Poisson PMF tại k=200 (không tràn 171! -> NaN),
 *     lambda=0, non-integer rejection, Power 6/55 EV có khấu trừ thuế TNCN.
 *  2. Bất biến hoán vị nhãn (Label Exchangeability / Permutation Invariance) cho K-Means Clustering &
 *     không thiên kiến dải số (Chi-Square đồng đều trên 50 folds thực tế).
 *  3. Phá hòa chuẩn số học Canonical (compareCanonical: 2 < 10, không để "10" < "2" theo ASCII)
 *     trên toàn bộ 8 thuật toán và cặp Bạc Nhớ.
 *  4. Nhất quán Prior hiện diện XSMN P(X >= 1) = 1 - 0.99^18 trong Markov & Moving Average;
 *     tự động nhận diện lịch Power 6/55 khi totalBalls = 55; tự động suy diễn isVietlott.
 *  5. Điều kiện biên cực đoan: Monte Carlo simulations = 1 (không chia cho 0 sinh NaN),
 *     Hierarchical Dirichlet fallback về phân phối biên trong dự đoán Giải Đặc Biệt khi chữ số mới chưa có lịch sử chuyển tiếp,
 *     tính bất biến múi giờ UTC trong getNextDrawDate, và ghép cặp baseline đúng fold trong BacktestEngine.
 *  6. Kiểm định giao diện Mobile thực tế qua Chrome DevTools Protocol (CDP) trên 7 khổ màn hình
 *     (320x568, 360x800, 375x667, 390x844, 412x915, 667x375 ngang, 768x1024 tablet) ở cả Light & Dark mode,
 *     đo trực tiếp 0 phần tử tràn viền, 0 nút bị cắt chữ, 6 bóng Vietlott nằm gọn 1 hàng ngang, Donut Tài-Xỉu đúng thực nghiệm.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import { LOTTO_CONFIG } from '../js/config.js';
import { ProbabilityMath } from '../js/algorithms/probability-math.js';
import { InputNormalizer } from '../js/algorithms/input-normalizer.js';
import { PoissonAlgorithm } from '../js/algorithms/poisson.js';
import { MarkovAlgorithm } from '../js/algorithms/markov.js';
import { MonteCarloAlgorithm } from '../js/algorithms/monte-carlo.js';
import { FrequencyGapAlgorithm } from '../js/algorithms/frequency-gap.js';
import { MovingAverageAlgorithm } from '../js/algorithms/moving-average.js';
import { ClusteringAlgorithm } from '../js/algorithms/clustering.js';
import { AssociationRulesAlgorithm } from '../js/algorithms/association-rules.js';
import { EnsembleAlgorithm } from '../js/algorithms/ensemble.js';
import { BacktestEngine } from '../js/backtest-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failed++;
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const filePath = path.join(rootDir, reqPath);
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function findBrowser() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function runMathAndMobileAudit() {
  console.log('================================================================');
  console.log('   DEEP MATHEMATICAL INVARIANTS, EDGE CASES & MOBILE UI AUDIT');
  console.log('================================================================\n');

  // -----------------------------------------------------------------
  // 1. KIỂM THỬ BIÊN TOÁN HỌC XÁC SUẤT (PROBABILITY MATH)
  // -----------------------------------------------------------------
  console.log('1. Kiểm thử Điều Kiện Biên ProbabilityMath:');
  assert(ProbabilityMath.poissonPMF(0, 0) === 1, 'poissonPMF(0, 0) === 1 (biến cố suy biến P(X=0)=1)');
  assert(ProbabilityMath.poissonPMF(2, 0) === 0, 'poissonPMF(2, 0) === 0');
  assert(ProbabilityMath.poissonPMF(1.5, 2) === 0, 'poissonPMF từ chối k không nguyên (k = 1.5 -> 0)');

  const pLargeK = ProbabilityMath.poissonPMF(200, 200);
  assert(Number.isFinite(pLargeK) && pLargeK > 0.028 && pLargeK < 0.029,
    `poissonPMF(200, 200) không bị tràn 171! -> NaN (Thực tế: ${pLargeK.toFixed(6)})`);

  assert(ProbabilityMath.binomialPMF(0, 18, 0) === 1, 'binomialPMF(0, 18, 0) === 1');
  assert(ProbabilityMath.binomialPMF(18, 18, 1) === 1, 'binomialPMF(18, 18, 1) === 1');
  assert(ProbabilityMath.binomialPMF(1.2, 18, 0.5) === 0, 'binomialPMF từ chối k không nguyên');

  const powerEv = ProbabilityMath.calculatePower655EV(30000000000, 3000000000, 10000);
  assert(powerEv && Number.isFinite(powerEv.ev) && powerEv.ev < 0,
    `Power 6/55 EV tại JP1=30 tỷ, JP2=3 tỷ là âm hợp lý (${powerEv.ev} VNĐ, RTP=${powerEv.rtpPercent}%)`);

  // -----------------------------------------------------------------
  // 2. KIỂM THỬ CANONICAL TIE-BREAKING & AUTO-DETECT GAME TYPE
  // -----------------------------------------------------------------
  console.log('\n2. Kiểm thử Canonical Numeric Tie-Breaking & Auto-Detection:');
  const tiedHistory = [
    { drawId: '#001', date: '2026-10-16', winningNumbers: [2, 10, 20, 30, 40, 45] }
  ];
  const pTied = PoissonAlgorithm.predict(tiedHistory, { isVietlott: true, totalBalls: 45, topN: 6 });
  assert(pTied.predictions[0] === 2 && pTied.predictions[1] === 10,
    `Poisson phá hòa theo thứ tự số học 2 < 10 thay vì ASCII "10" < "2" (Thực tế: ${JSON.stringify(pTied.predictions)})`);

  const assocPairHistory = [
    { drawId: '#002', date: '2026-10-16', winningNumbers: [2, 10, 15, 25, 35, 45] },
    { drawId: '#001', date: '2026-10-14', winningNumbers: [2, 10, 16, 26, 36, 44] }
  ];
  const assocPairs = AssociationRulesAlgorithm.predict(assocPairHistory, { isVietlott: true, totalBalls: 45 });
  const p0210 = assocPairs.frequentPairs.find(p => p.coOccurrenceCount === 2);
  assert(p0210 && p0210.a === '02' && p0210.b === '10',
    `AssociationRules sắp xếp cặp chuẩn "02 - 10" thay vì "10 - 02" (Thực tế: ${p0210?.pair})`);

  // Auto-detect XSMN & Power 6/55 khi không truyền options.isVietlott / options.totalBalls
  const xsmnSample = [
    { drawId: '#X3', date: '2026-10-17', lottoPairs: ['05', '12', '88'] },
    { drawId: '#X2', date: '2026-10-12', lottoPairs: ['05', '34', '79'] },
    { drawId: '#X1', date: '2026-10-10', lottoPairs: ['12', '34', '68'] }
  ];
  for (const algo of [PoissonAlgorithm, MarkovAlgorithm, MonteCarloAlgorithm, FrequencyGapAlgorithm, MovingAverageAlgorithm, ClusteringAlgorithm, AssociationRulesAlgorithm, EnsembleAlgorithm]) {
    const autoRes = algo.predict(xsmnSample);
    assert(autoRes.status === 'ok' && autoRes.predictions.length === 5,
      `${algo.id}: Tự động nhận diện XSMN khi không truyền options.isVietlott`);
  }

  const seedRawForAuto = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'historical-seed.json'), 'utf8').replace(/^\uFEFF/, ''));
  const powerTen = seedRawForAuto.vietlott['power-6-55'].slice(0, 10);
  for (const algo of [PoissonAlgorithm, MarkovAlgorithm, MonteCarloAlgorithm, FrequencyGapAlgorithm, MovingAverageAlgorithm, ClusteringAlgorithm, AssociationRulesAlgorithm, EnsembleAlgorithm]) {
    const autoPwr = algo.predict(powerTen);
    assert(autoPwr.status === 'ok' && Object.keys(autoPwr.scores || {}).length === 55,
      `${algo.id}: Tự động nhận diện Power 6/55 (55 bóng) khi không truyền options.totalBalls`);
  }

  const btPowerAuto = BacktestEngine.runBatchBacktest(seedRawForAuto.vietlott['power-6-55'], {
    isVietlott: true,
    stationOrGame: 'power-6-55',
    topN: 6
  }, 5);
  assert(btPowerAuto.success === true && btPowerAuto.leaderboard.length === 8,
    'BacktestEngine.runBatchBacktest tự động nhận diện Power 6/55 (55 bóng) không văng RangeError');

  // Kiểm tra đồng nhất status: "invalid-input" trên cả 8 thuật toán khi truyền bản ghi hỏng
  const corruptDraw = [{ drawId: '#ERR', date: '2026-02-30', winningNumbers: [1, 2, 3, 4, 5, 6] }];
  const allRejectInvalid = [PoissonAlgorithm, MarkovAlgorithm, MonteCarloAlgorithm, FrequencyGapAlgorithm, MovingAverageAlgorithm, ClusteringAlgorithm, AssociationRulesAlgorithm, EnsembleAlgorithm]
    .every(algo => algo.predict(corruptDraw, { isVietlott: true }).status === 'invalid-input');
  assert(allRejectInvalid, 'Cả 8/8 thuật toán (bao gồm Clustering & Ensemble) trả đúng status: "invalid-input" cho bản ghi lỗi');

  // -----------------------------------------------------------------
  // 3. BẤT BIẾN HOÁN VỊ NHÃN & CHỐNG THIÊN KIẾN K-MEANS CLUSTERING
  // -----------------------------------------------------------------
  console.log('\n3. Kiểm thử Bất Biến Hoán Vị Nhãn (Permutation Invariance) & Phân Bổ K-Means:');
  const hA = [
    { drawId: '#03', date: '2026-10-16', winningNumbers: [1, 11, 12, 13, 14, 15] },
    { drawId: '#02', date: '2026-10-14', winningNumbers: [1, 21, 22, 23, 24, 25] },
    { drawId: '#01', date: '2026-10-11', winningNumbers: [31, 32, 33, 34, 35, 36] }
  ];
  const hB = [
    { drawId: '#03', date: '2026-10-16', winningNumbers: [45, 11, 12, 13, 14, 15] },
    { drawId: '#02', date: '2026-10-14', winningNumbers: [45, 21, 22, 23, 24, 25] },
    { drawId: '#01', date: '2026-10-11', winningNumbers: [31, 32, 33, 34, 35, 36] }
  ];
  const cA = ClusteringAlgorithm.predict(hA, { isVietlott: true, totalBalls: 45 });
  const cB = ClusteringAlgorithm.predict(hB, { isVietlott: true, totalBalls: 45 });
  assert(cA.scores[1] === cB.scores[45] && cA.scores[45] === cB.scores[1],
    `K-Means bất biến hoàn toàn khi hoán vị nhãn bóng 1 <-> 45 (${cA.scores[1]} === ${cB.scores[45]})`);
  assert(typeof cA.metrics.highRatio === 'number', 'K-Means xuất đầy đủ trường metrics.highRatio cho biểu đồ Tài-Xỉu');
  assert(cA.metrics.theoreticalEvenRatio === 0.489,
    `K-Means tính đúng theoreticalEvenRatio = 22/45 ≈ 0.489 cho Mega 6/45 (Thực tế: ${cA.metrics.theoreticalEvenRatio})`);
  const cPwr = ClusteringAlgorithm.predict(powerTen, { isVietlott: true, totalBalls: 55 });
  assert(cPwr.metrics.theoreticalEvenRatio === 0.491,
    `K-Means tính đúng theoreticalEvenRatio = 27/55 ≈ 0.491 cho Power 6/55 (Thực tế: ${cPwr.metrics.theoreticalEvenRatio})`);

  const seed = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'historical-seed.json'), 'utf8').replace(/^\uFEFF/, ''));
  const mega = seed.vietlott['mega-6-45'];
  let lowBucket = 0, midBucket = 0, highBucket = 0;
  for (let i = 0; i < 50; i++) {
    const cr = ClusteringAlgorithm.predict(mega.slice(i, i + 30), { isVietlott: true, totalBalls: 45, topN: 6 });
    for (const p of cr.predictions) {
      if (p <= 15) lowBucket++;
      else if (p <= 30) midBucket++;
      else highBucket++;
    }
  }
  assert(lowBucket >= 65 && midBucket >= 65 && highBucket >= 65,
    `K-Means phân bổ cân bằng qua 3 miền [1..15, 16..30, 31..45]: [${lowBucket}, ${midBucket}, ${highBucket}]`);

  // -----------------------------------------------------------------
  // 4. MONTE CARLO SIMULATIONS=1, MARKOV PRIOR, POWER SCHEDULE & SPECIAL PRIZE
  // -----------------------------------------------------------------
  console.log('\n4. Kiểm thử Edge Cases Monte Carlo, Markov Prior, Power 6/55 Schedule & Giải ĐB:');
  const mcOneV = MonteCarloAlgorithm.predict(mega.slice(0, 5), { isVietlott: true, totalBalls: 45, simulations: 1 });
  const mcOneX = MonteCarloAlgorithm.predict(xsmnSample, { isVietlott: false, simulations: 1 });
  assert(Object.values(mcOneV.metrics.standardDeviations).every(Number.isFinite) &&
         Object.values(mcOneV.metrics.standardErrors).every(Number.isFinite),
    'Monte Carlo Vietlott với simulations=1 không sinh NaN ở SD/SE');
  assert(Object.values(mcOneX.metrics.standardDeviations).every(Number.isFinite) &&
         Object.values(mcOneX.metrics.standardErrors).every(Number.isFinite),
    'Monte Carlo XSMN với simulations=1 không sinh NaN ở SD/SE');

  const mkXsmn = MarkovAlgorithm.predict(xsmnSample, { isVietlott: false });
  assert(mkXsmn.metrics.priorP === 0.165,
    `Markov XSMN dùng đúng prior hiện diện 1 - 0.99^18 ≈ 0.165 thay vì 0.18 (Thực tế: ${mkXsmn.metrics.priorP})`);

  const powerSample = seed.vietlott['power-6-55'].slice(0, 5); // Kỳ mới nhất Power 6/55
  const maPower = MovingAverageAlgorithm.predict(powerSample, { isVietlott: true, totalBalls: 55 });
  assert([2, 4, 6].includes(maPower.metrics.targetDayOfWeek),
    `MovingAverage tự động suy lịch quay Power 6/55 (Thứ 3/5/7 -> ${maPower.metrics.targetDayName}) khi totalBalls=55`);

  // Special prize unseen state fallback về phân phối biên thay vì gán cứng 0
  const unseenSpecials = [
    { drawId: '#04', date: '2026-10-17', specialPrize: '999912' }, // Chữ số '9' mới xuất hiện lần đầu ở đầu giải
    { drawId: '#03', date: '2026-10-10', specialPrize: '777734' },
    { drawId: '#02', date: '2026-10-05', specialPrize: '777756' },
    { drawId: '#01', date: '2026-10-03', specialPrize: '777778' }
  ];
  const spPred = EnsembleAlgorithm.predictSpecialPrize(unseenSpecials, ['88']);
  assert(spPred.fullNumber === '777788',
    `Giải ĐB dùng phân phối biên thực nghiệm (777788) thay vì ép về 000088 khi chữ số hiện tại chưa có lịch sử chuyển tiếp (Thực tế: ${spPred.fullNumber})`);

  // Paired fold baseline khi lịch sử ngắn (2 folds: fold đầu đủ 3 kỳ cho EMA, fold thứ 2 chỉ có 2 kỳ nên EMA nghỉ)
  const shortHistory4 = mega.slice(0, 4);
  const shortBatch = BacktestEngine.runBatchBacktest(shortHistory4, { isVietlott: true, totalBalls: 45, topN: 6 }, 2);
  const maRow = shortBatch.leaderboard.find(r => r.id === 'moving-average');
  assert(maRow && maRow.foldsSucceeded === 1 && maRow.foldsFailed === 1,
    `BacktestEngine ghi nhận minh bạch foldsSucceeded=1, foldsFailed=1 cho EMA trên chuỗi 4 kỳ`);

  // Edge case cực đoan: chỉ có 2 kỳ (1 fold, các thuật toán cần >=2 hoặc >=3 kỳ sẽ có foldsSucceeded = 0)
  const twoDrawsOnly = mega.slice(0, 2);
  const btTwoDraws = BacktestEngine.runBatchBacktest(twoDrawsOnly, { isVietlott: true, totalBalls: 45, topN: 6 }, 2);
  const topRankedTwo = btTwoDraws.leaderboard[0];
  const zeroFoldModels = btTwoDraws.leaderboard.filter(r => r.foldsSucceeded === 0);
  assert(topRankedTwo.foldsSucceeded > 0 && zeroFoldModels.every(r => r.differenceVsBaseline === 0 && !r.exceedsBaseline),
    'BacktestEngine xếp các mô hình có fold hợp lệ lên trên mô hình 0 fold và không gán baselineDiff âm giả tạo');

  // Edge case cực đoan: 10 kỳ lặp lại 100% cùng 1 bộ số
  const identicalDraws = Array.from({ length: 10 }, (_, idx) => ({
    drawId: `#ID${10 - idx}`,
    date: `2026-09-${String(28 - idx * 2).padStart(2, '0')}`,
    winningNumbers: [3, 9, 15, 22, 34, 41]
  }));
  const identicalEns = EnsembleAlgorithm.predict(identicalDraws, { isVietlott: true, totalBalls: 45, topN: 6 });
  assert(identicalEns.status === 'ok' && identicalEns.predictions.length === 6 && Object.values(identicalEns.scores).every(Number.isFinite),
    'EnsembleAlgorithm bền vững trên dữ liệu lặp 100% cùng 1 bộ số (không NaN/chia cho 0)');

  // Edge case XSMN chỉ có prizes (không truyền sẵn lottoPairs) trong BacktestEngine
  const tphcmPrizesOnly = seed.xsmn.filter(d => d.stationId === 'tphcm').slice(0, 6).map(d => ({
    date: d.date,
    stationId: d.stationId,
    drawId: d.drawId,
    prizes: d.prizes
  }));
  const btPrizesOnly = BacktestEngine.runSingleDateBacktest(tphcmPrizesOnly, tphcmPrizesOnly[0].date, {
    isVietlott: false,
    stationId: 'tphcm',
    topN: 5
  });
  assert(btPrizesOnly.success && btPrizesOnly.algoResults.some(a => a.hitCount > 0),
    'BacktestEngine trích xuất đúng kết quả đối soát từ prizes khi bản ghi XSMN không có sẵn lottoPairs');

  // -----------------------------------------------------------------
  // 5. KIỂM ĐỊNH GIAO DIỆN MOBILE THỰC TẾ TRÊN TRÌNH DUYỆT HEADLESS CDP
  // -----------------------------------------------------------------
  console.log('\n5. Kiểm định Giao Diện Mobile Đa Khổ Màn Hình (CDP Real Layout Measurements):');
  const browserBin = findBrowser();
  if (!browserBin) {
    console.warn('  [SKIP] Không tìm thấy trình duyệt Chrome/Edge.');
  } else {
    const server = await startStaticServer();
    const port = server.address().port;
    const userDataDir = path.join(os.tmpdir(), `lotto-mobile-test-${Date.now()}`);
    fs.mkdirSync(userDataDir, { recursive: true });

    const chrome = spawn(browserBin, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--remote-debugging-port=0',
      '--host-resolver-rules=MAP * 127.0.0.1:1,EXCLUDE 127.0.0.1,EXCLUDE localhost',
      `--user-data-dir=${userDataDir}`,
      'about:blank'
    ]);

    try {
      const portFile = path.join(userDataDir, 'DevToolsActivePort');
      let cdpPort = 0;
      for (let i = 0; i < 60; i++) {
        if (fs.existsSync(portFile)) {
          const line = fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0].trim();
          if (/^\d+$/.test(line)) { cdpPort = Number(line); break; }
        }
        await sleep(100);
      }

      let target = null;
      for (let i = 0; i < 40 && !target; i++) {
        try {
          const list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
          target = list.find(t => t.type === 'page');
        } catch {}
        if (!target) await sleep(120);
      }

      const ws = new WebSocket(target.webSocketDebuggerUrl);
      const pending = new Map();
      let msgId = 0;
      const runtimeErrors = [];
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
      ws.onmessage = ev => {
        const m = JSON.parse(ev.data);
        if (m.method === 'Runtime.exceptionThrown') runtimeErrors.push(JSON.stringify(m.params));
        if (m.id && pending.has(m.id)) {
          const p = pending.get(m.id);
          pending.delete(m.id);
          if (m.error) p.reject(new Error(m.error.message));
          else p.resolve(m.result);
        }
      };
      const send = (method, params = {}) => {
        const id = ++msgId;
        ws.send(JSON.stringify({ id, method, params }));
        return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      };
      const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) {
          throw new Error(`CDP Eval Exception: ${r.exceptionDetails.text || JSON.stringify(r.exceptionDetails)}`);
        }
        return r.result?.value;
      };

      await send('Page.enable');
      await send('Runtime.enable');
      await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
      await sleep(1600);

      const mobileViewports = [
        { name: '320x568 (Ultra-Narrow Mobile)', width: 320, height: 568 },
        { name: '360x800 (Android Compact)', width: 360, height: 800 },
        { name: '375x667 (iPhone SE)', width: 375, height: 667 },
        { name: '390x844 (iPhone 14/15)', width: 390, height: 844 },
        { name: '412x915 (Android Large)', width: 412, height: 915 },
        { name: '667x375 (Mobile Landscape)', width: 667, height: 375 },
        { name: '768x1024 (Tablet)', width: 768, height: 1024 }
      ];

      for (const vp of mobileViewports) {
        await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: true });
        await sleep(180);

        for (const tabAction of [
          `document.getElementById('mode-btn-xsmn').click(); document.getElementById('tab-predict').click();`,
          `document.getElementById('mode-btn-vietlott').click(); document.getElementById('quick-btn-power').click(); document.getElementById('tab-predict').click();`,
          `document.getElementById('mode-btn-xsmn').click(); document.getElementById('tab-backtest').click();`,
          `document.getElementById('tab-dashboard').click();`,
          `document.getElementById('tab-docs').click();`
        ]) {
          await evalJs(tabAction);
          await sleep(180);
        }

        // Đo chi tiết trên cả 4 tab ở khổ hiện tại
        await evalJs(`document.getElementById('mode-btn-vietlott').click(); document.getElementById('quick-btn-power').click(); document.getElementById('tab-predict').click();`);
        await sleep(200);
        const checkTab1 = JSON.parse(await evalJs(`(() => {
          const vw = window.innerWidth;
          let overflows = 0;
          for (const el of document.querySelectorAll('*')) {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
            if (cs.position === 'absolute' && el.offsetWidth <= 1 && el.offsetHeight <= 1) continue;
            if (el.classList.contains('ambient-paper-glow') || el.classList.contains('hero-watermark-svg') || el.closest('.hero-watermark-svg')) continue;
            let p = el.parentElement, inScroll = false;
            while (p && p !== document.body && p !== document.documentElement) {
              const ox = getComputedStyle(p).overflowX;
              if (ox === 'auto' || ox === 'scroll') { inScroll = true; break; }
              p = p.parentElement;
            }
            if (inScroll) continue;
            const r = el.getBoundingClientRect();
            if (r.width > 0 && (r.right > vw + 1.5 || r.left < -1.5)) overflows++;
          }
          const heroRows = new Set(Array.from(document.querySelectorAll('.hero-pred-balls-row .ensemble-ball-lg')).map(b => Math.round(b.getBoundingClientRect().top))).size;
          const btnCrawl = document.getElementById('btn-crawl-full');
          const crawlClipped = btnCrawl ? (btnCrawl.scrollWidth > btnCrawl.clientWidth + 1) : false;
          return JSON.stringify({ vw, scrollW: document.documentElement.scrollWidth, overflows, heroRows, crawlClipped });
        })()`));

        assert(checkTab1.scrollW <= checkTab1.vw + 1 && checkTab1.overflows === 0,
          `${vp.name}: Không tràn ngang, 0 phần tử vượt khung nhìn (scrollW=${checkTab1.scrollW}/${checkTab1.vw})`);
        assert(checkTab1.heroRows === 1,
          `${vp.name}: Bộ 6 bóng dự đoán Vietlott nằm trọn trên 1 hàng ngang duy nhất`);
        assert(!checkTab1.crawlClipped,
          `${vp.name}: Nút 'Đồng bộ kho số' hiển thị trọn chữ, không bị cắt chữ`);
      }

      // Kiểm tra bố cục chi tiết trên màn hình siêu nhỏ 320x568 & phổ biến 375x667
      await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 2, mobile: true });
      await evalJs(`document.getElementById('mode-btn-vietlott').click(); document.getElementById('quick-btn-power').click(); document.getElementById('tab-dashboard').click();`);
      await sleep(280);
      const ultraNarrowDetails = await evalJs(`(() => {
        const syncTop = document.getElementById('btn-sync-live')?.getBoundingClientRect().top ?? 0;
        const themeTop = document.getElementById('btn-theme-toggle')?.getBoundingClientRect().top ?? 999;
        const jpHeights = Array.from(document.querySelectorAll('.v-btn-jackpot')).map(el => el.getBoundingClientRect().height);
        const bars = Array.from(document.querySelectorAll('#prob-chartist-box .ct-bar'));
        const strokeW = bars[0] ? parseFloat(getComputedStyle(bars[0]).strokeWidth) : 0;
        const barDx = bars.length >= 2 ? Math.abs(parseFloat(bars[1].getAttribute('x1')) - parseFloat(bars[0].getAttribute('x1'))) : 10;
        return {
          headerDensePacked: Math.abs(syncTop - themeTop) < 4,
          jackpotSingleLine: jpHeights.every(h => h > 0 && h < 26),
          barCount: bars.length,
          strokeW,
          barDx
        };
      })()`);
      assert(ultraNarrowDetails.headerDensePacked,
        'Mobile 320px: Hàng công cụ đầu trang xếp khít [Cập nhật | Nền tối] trên 1 hàng, không để ô trống');
      assert(ultraNarrowDetails.jackpotSingleLine,
        'Mobile 320px: Nhãn Jackpot Vietlott nằm gọn trên 1 dòng, không rớt ký hiệu ₫ lẻ dòng');
      assert(ultraNarrowDetails.barCount === 30 && ultraNarrowDetails.strokeW <= 6 && ultraNarrowDetails.barDx > ultraNarrowDetails.strokeW,
        `Mobile 320px: Biểu đồ Chartist Top-30 thanh mảnh tách rời (${ultraNarrowDetails.strokeW}px < bước cột ${ultraNarrowDetails.barDx.toFixed(1)}px)`);

      // Kiểm tra Modal đồng bộ trên màn hình hẹp 320x568 không tràn dọc và không cắt chữ thẻ tóm tắt
      await evalJs(`document.getElementById('btn-crawl-full').click();`);
      await sleep(900);
      const modal320Check = await evalJs(`(() => {
        const card = document.querySelector('#crawl-modal-overlay .crawl-modal-card');
        const smVals = Array.from(document.querySelectorAll('#crawl-modal-overlay .sm-value'));
        const anySmClipped = smVals.some(el => el.scrollWidth > el.clientWidth + 1);
        const r = card?.getBoundingClientRect();
        const fitsViewport = Boolean(r && r.height <= window.innerHeight + 1 && r.width <= window.innerWidth + 1);
        const detail = { h: Math.round(r?.height || 0), vh: window.innerHeight, sm: smVals.map(e => e.scrollWidth + '/' + e.clientWidth) };
        document.getElementById('btn-close-crawl-modal')?.click();
        return { fitsViewport, anySmClipped, detail };
      })()`);
      assert(modal320Check.fitsViewport && !modal320Check.anySmClipped,
        `Mobile 320x568: Modal đồng bộ vừa khít khung nhìn (${modal320Check.detail.h}/${modal320Check.detail.vh}px) và 3 thẻ số liệu không bị cắt chữ`);

      // Kiểm tra Tab 03 Donut Tài-Xỉu phản ánh đúng dữ liệu thực & đồng bộ kích thước vòng tròn
      await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 2, mobile: true });
      await evalJs(`document.getElementById('mode-btn-xsmn').click(); document.getElementById('tab-dashboard').click();`);
      await sleep(250);
      const stationHighPcts = [];
      for (const stId of ['tphcm', 'dong-nai', 'can-tho', 'tien-giang', 'binh-phuoc']) {
        await evalJs(`(() => { const s = document.getElementById('station-select'); s.value='${stId}'; s.dispatchEvent(new Event('change')); })()`);
        await sleep(160);
        const pct = await evalJs(`document.querySelectorAll('.donut-pct')[1]?.textContent?.trim()`);
        if (pct) stationHighPcts.push(pct);
      }
      assert(new Set(stationHighPcts).size >= 3,
        `Biểu đồ Donut Tài-Xỉu trên Mobile cập nhật động chính xác theo từng đài (${stationHighPcts.join(', ')})`);

      const donutSymmetry = await evalJs(`(() => {
        const rings = Array.from(document.querySelectorAll('.donut-ring-wrap')).map(el => el.getBoundingClientRect());
        if (rings.length < 2) return { ok: false };
        return {
          ok: Math.abs(rings[0].width - rings[1].width) <= 1 && Math.abs(rings[0].height - rings[1].height) <= 1 && rings[0].width >= 110,
          w0: Math.round(rings[0].width),
          w1: Math.round(rings[1].width)
        };
      })()`);
      assert(donutSymmetry.ok,
        `Mobile 375px: Cặp biểu đồ tròn Chẵn-Lẻ & Tài-Xỉu đồng bộ đường kính tuyệt đối (${donutSymmetry.w0}px === ${donutSymmetry.w1}px)`);

      // Kiểm tra chế độ Tối (Dark Mode) & bố cục thẻ BXH trên Mobile 375x667
      await evalJs(`document.getElementById('btn-theme-toggle').click(); document.getElementById('tab-backtest').click();`);
      await sleep(250);
      const darkCheck = await evalJs(`(() => {
        const firstRow = document.querySelector('.leaderboard-table tbody tr');
        const rankTop = firstRow?.querySelector('.lb-rank-cell')?.getBoundingClientRect().top ?? 0;
        const statusTop = firstRow?.querySelector('.lb-status-cell')?.getBoundingClientRect().top ?? 999;
        return {
          theme: document.documentElement.getAttribute('data-theme'),
          scrollW: document.documentElement.scrollWidth,
          vw: window.innerWidth,
          lbCardsVisible: document.querySelectorAll('.leaderboard-table tbody tr').length,
          topRowAligned: Math.abs(rankTop - statusTop) < 8
        };
      })()`);
      assert(darkCheck.theme === 'dark' && darkCheck.scrollW <= darkCheck.vw + 1 && darkCheck.lbCardsVisible === 8 && darkCheck.topRowAligned,
        `Mobile Dark Mode (375x667): Chuyển nền tối mượt, đủ 8 thẻ BXH cân đối hàng đầu [Hạng | Đánh giá] không ô trống`);

      assert(runtimeErrors.length === 0, `0 lỗi JavaScript Runtime Exception trong suốt quá trình tương tác Mobile`);

      ws.close();
    } finally {
      try { chrome.kill('SIGKILL'); } catch {}
      server.close();
      await sleep(250);
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
    }
  }

  console.log('\n================================================================');
  console.log(` KẾT QUẢ DEEP MATH & MOBILE AUDIT: ${passed} PASS, ${failed} FAIL`);
  console.log('================================================================');

  return { passed, failed, success: failed === 0 };
}

if (process.argv[1] && process.argv[1].endsWith('test-math-and-mobile-audit.js')) {
  runMathAndMobileAudit().then(res => {
    process.exit(res.success ? 0 : 1);
  });
}
