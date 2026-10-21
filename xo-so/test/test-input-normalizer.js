/**
 * LOTTO-QUANT LAB: UNIT TESTS CHO INPUT NORMALIZER (FIX-9 PHASE A)
 */

import { 
  strictUtcDayOfWeek, 
  normalizeVietlottBall, 
  normalizeLottoPair, 
  getDrawEventSet, 
  getDrawEventCounts, 
  validateAndSortHistory,
  getUniverse
} from '../js/algorithms/input-normalizer.js';

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

export function runInputNormalizerTests() {
  console.log('========================================================');
  console.log('   TEST SUITE: INPUT NORMALIZER & DATA CONTRACTS (FIX-9)');
  console.log('========================================================\n');

  // 1. Strict ISO Date Validation
  console.log('1. Kiểm thử Strict ISO Date Validation:');
  assert(strictUtcDayOfWeek('2026-10-18') === 0, '2026-10-18 là Chủ Nhật (0)');
  assert(strictUtcDayOfWeek('2026-10-19') === 1, '2026-10-19 là Thứ Hai (1)');

  let caughtFeb30 = false;
  try {
    strictUtcDayOfWeek('2026-02-30'); // Ngày không tồn tại
  } catch (e) {
    caughtFeb30 = e instanceof RangeError;
  }
  assert(caughtFeb30, 'Từ chối ngày phi lý 2026-02-30 bằng RangeError');

  let caughtInvalidFormat = false;
  try {
    strictUtcDayOfWeek('19-10-2026');
  } catch (e) {
    caughtInvalidFormat = e instanceof TypeError;
  }
  assert(caughtInvalidFormat, 'Từ chối format sai YYYY-MM-DD');

  // 2. Normalize Vietlott Ball
  console.log('\n2. Kiểm thử Normalize Vietlott Ball:');
  assert(normalizeVietlottBall(5, 45) === 5, 'Số 5 -> 5');
  assert(normalizeVietlottBall('07', 45) === 7, 'Chuỗi "07" -> 7');
  
  let caughtOutRange = false;
  try {
    normalizeVietlottBall(46, 45);
  } catch (e) {
    caughtOutRange = e instanceof RangeError;
  }
  assert(caughtOutRange, 'Từ chối bóng 46 khi totalBalls = 45');

  // 3. Normalize Lotto Pair
  console.log('\n3. Kiểm thử Normalize Lotto Pair:');
  assert(normalizeLottoPair(1) === '01', 'Số 1 -> "01"');
  assert(normalizeLottoPair('1') === '01', 'Chuỗi "1" -> "01"');
  assert(normalizeLottoPair('01') === '01', 'Chuỗi "01" -> "01"');
  assert(normalizeLottoPair('99') === '99', 'Chuỗi "99" -> "99"');

  let caughtBadPair = false;
  try {
    normalizeLottoPair('123');
  } catch (e) {
    caughtBadPair = e instanceof RangeError;
  }
  assert(caughtBadPair, 'Từ chối cặp số quá 2 chữ số ("123")');

  // 4. Presence Event Set vs Multiplicity Counts
  console.log('\n4. Kiểm thử Presence Event Set vs Multiplicity Counts:');
  const xsmnDraw = {
    date: '2026-10-17',
    lottoPairs: ['01', '25', '01', '88', 25, '09']
  };

  const eventSet = getDrawEventSet(xsmnDraw, { isVietlott: false });
  assert(eventSet.length === 4, `EventSet loại bỏ trùng lặp: có đúng 4 số khác nhau (Thực tế: ${eventSet.length})`);
  assert(JSON.stringify(eventSet) === JSON.stringify(['01', '09', '25', '88']), 'EventSet được sắp xếp chuẩn xác');

  const counts = getDrawEventCounts(xsmnDraw, { isVietlott: false });
  assert(counts.get('01') === 2, 'Multiplicity: "01" xuất hiện 2 lần');
  assert(counts.get('25') === 2, 'Multiplicity: "25" xuất hiện 2 lần');
  assert(counts.get('88') === 1, 'Multiplicity: "88" xuất hiện 1 lần');

  // 5. Newest-First Sorting & Immutability
  console.log('\n5. Kiểm thử Newest-First Sorting & Immutability:');
  const rawHistory = [
    { drawId: '#001', date: '2026-10-10', winningNumbers: [1, 2, 3, 4, 5, 6] },
    { drawId: '#003', date: '2026-10-14', winningNumbers: [1, 2, 3, 4, 5, 6] },
    { drawId: '#002', date: '2026-10-12', winningNumbers: [1, 2, 3, 4, 5, 6] }
  ];

  const sorted = validateAndSortHistory(rawHistory);
  assert(sorted[0].date === '2026-10-14', 'Kỳ mới nhất (2026-10-14) được đưa lên index 0');
  assert(sorted[2].date === '2026-10-10', 'Kỳ cũ nhất (2026-10-10) ở index cuối');
  assert(rawHistory[0].date === '2026-10-10', 'Không làm thay đổi (mutate) mảng đầu vào');

  console.log('\n========================================================');
  console.log(` KẾT QUẢ TEST INPUT NORMALIZER: ${passed} PASS, ${failed} FAIL`);
  console.log('========================================================');

  return { passed, failed, success: failed === 0 };
}

if (process.argv[1] && process.argv[1].endsWith('test-input-normalizer.js')) {
  const res = runInputNormalizerTests();
  if (!res.success) process.exit(1);
}
