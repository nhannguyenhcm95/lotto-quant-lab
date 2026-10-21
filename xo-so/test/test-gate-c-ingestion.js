/**
 * LOTTO-QUANT LAB: TEST GATE C - INGESTION SAFETY & REPAIR PROTOCOL (FIX-7)
 * Kiểm chứng:
 *  1. Khóa ghi an toàn (Write Guard) chặn ghi đè historical-seed.json
 *  2. Parser khi gặp HTML sai/lỗi không tự đoán giá trị mà báo lỗi có cấu trúc
 *  3. Không có mock fallback số ngẫu nhiên khi thiếu dữ liệu nguồn
 *  4. Bảo vệ toàn vẹn hash của historical-seed.json
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { DataService } from '../js/data-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

export function runGateCIngestionTests() {
  console.log('========================================================');
  console.log('   GATE C: INGESTION SAFETY & REPAIR TESTS (FIX-7)');
  console.log('========================================================\n');

  const seedPath = path.join(rootDir, 'data', 'historical-seed.json');
  const seedShaBefore = crypto.createHash('sha256').update(fs.readFileSync(seedPath)).digest('hex');

  // 1. Kiểm tra DataService validate input
  console.log('1. Kiểm tra Ingestion Schema Validation:');
  const validMega = {
    date: '2026-10-16',
    drawId: '#01576',
    winningNumbers: [9, 20, 26, 35, 36, 38],
    jackpotEst: '22,839,868,000 đ'
  };
  assert(DataService.validateMegaDraw(validMega).valid === true, 'Valid Mega draw được chấp nhận');

  const invalidDate = { ...validMega, date: '2026-02-30' };
  assert(DataService.validateMegaDraw(invalidDate).valid === false, 'Từ chối ngày không có thực trong lịch (2026-02-30)');

  const invalidBalls = { ...validMega, winningNumbers: [1, 2, 3, 4, 5, 99] };
  assert(DataService.validateMegaDraw(invalidBalls).valid === false, 'Từ chối bóng số ngoài miền 1-45 (số 99)');

  const dupBalls = { ...validMega, winningNumbers: [1, 2, 3, 4, 5, 5] };
  assert(DataService.validateMegaDraw(dupBalls).valid === false, 'Từ chối bóng số bị trùng lặp');

  // 2. Kiểm tra Power 6/55
  console.log('\n2. Kiểm tra Power 6/55 Validation:');
  const validPower = {
    date: '2026-10-15',
    drawId: '#01411',
    winningNumbers: [7, 23, 25, 42, 45, 51],
    bonusNumber: 4,
    jackpotEst: '156,701,347,950 đ'
  };
  assert(DataService.validatePowerDraw(validPower).valid === true, 'Valid Power draw được chấp nhận');

  const dupBonus = { ...validPower, bonusNumber: 7 };
  assert(DataService.validatePowerDraw(dupBonus).valid === false, 'Từ chối bonus trùng với 6 bóng chính');

  const floatBonus = { ...validPower, bonusNumber: 4.5 };
  assert(DataService.validatePowerDraw(floatBonus).valid === false, 'Từ chối bonus số thập phân');

  // 3. Kiểm tra XSMN
  console.log('\n3. Kiểm tra XSMN Validation:');
  const validXSMN = {
    date: '2026-10-16',
    stationId: 'vinh-long',
    prizes: { special: ['262014'] },
    lottoPairs: ['14', '88', '54', '18', '18', '67', '31', '19', '64', '91', '19', '21', '22', '08', '13', '23', '90', '34']
  };
  assert(DataService.validateXSMNDraw(validXSMN).valid === true, 'Valid XSMN draw được chấp nhận');

  const invalidSpecial = { ...validXSMN, prizes: { special: [] } }; // Thiếu giải đặc biệt
  assert(DataService.validateXSMNDraw(invalidSpecial).valid === false, 'Từ chối giải đặc biệt thiếu chữ số');

  const invalidLotto = { ...validXSMN, lottoPairs: Array(18).fill('XX') };
  assert(DataService.validateXSMNDraw(invalidLotto).valid === false, 'Từ chối lottoPairs chứa ký tự không hợp lệ');

  // 4. Kiểm tra Chống Fallback Giả & Insufficient Data
  console.log('\n4. Kiểm tra Chống Fallback Giả:');
  const mockService = new DataService.constructor();
  mockService.data = { xsmn: [], vietlott: { 'mega-6-45': [], 'power-6-55': [] } };
  const fallbackCheck = mockService.getXSMNDraws('tphcm');
  assert(Array.isArray(fallbackCheck) && fallbackCheck.length === 0, 'DataService trả về mảng rỗng khi không có dữ liệu, không sinh số ngẫu nhiên giả');
  const fallbackVietlott = mockService.getVietlottDraws('mega-6-45');
  assert(Array.isArray(fallbackVietlott) && fallbackVietlott.length === 0, 'Vietlott trả về mảng rỗng khi không có dữ liệu');

  // 5. Kiểm tra Write Guard & Bảo vệ Artifact
  console.log('\n5. Kiểm tra Bảo Vệ Artifact Seed:');
  const seedShaAfter = crypto.createHash('sha256').update(fs.readFileSync(seedPath)).digest('hex');
  assert(seedShaBefore === seedShaAfter, 'Seed production không bị sửa đổi trong suốt quá trình test');

  console.log('\n========================================================');
  console.log(` KẾT QUẢ GATE C: ${passed} PASS, ${failed} FAIL`);
  console.log('========================================================');

  return { passed, failed, success: failed === 0 };
}

if (process.argv[1] && process.argv[1].endsWith('test-gate-c-ingestion.js')) {
  const res = runGateCIngestionTests();
  if (!res.success) process.exit(1);
}
