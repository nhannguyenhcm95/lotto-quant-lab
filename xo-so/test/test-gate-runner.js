/**
 * BỘ KIỂM THỬ CHO CHÍNH GATE RUNNER (GATE RUNNER SELF-TEST - FIX-5 MỤC 2)
 * Chứng minh:
 *  1. Cố tình làm một gate fail -> Runner dừng ngay lập tức tại gate đó.
 *  2. Exit code trả về là 1 (non-zero).
 *  3. Các gate kế tiếp KHÔNG được thực thi (Fail-Closed).
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function assert(cond, name) {
  if (cond) {
    console.log(`  [PASS] ${name}`);
  } else {
    console.error(`  [FAIL] ${name}`);
    process.exit(1);
  }
}

async function testGateRunnerFailure() {
  console.log('========================================================');
  console.log('   KIỂM THỬ CƠ CHẾ FAIL-CLOSED CỦA GATE RUNNER');
  console.log('========================================================\n');

  const fixturesDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
  const testLogPath = path.join(fixturesDir, 'simulated-fail.log');

  console.log('1. Khởi chạy Gate Runner với giả lập cố tình làm Gate 3 fail...');
  const proc = spawnSync('node', [
    'scripts/gate-runner.js',
    '--simulate-fail-gate=3',
    `--log-file=${testLogPath}`
  ], {
    cwd: rootDir,
    encoding: 'utf-8'
  });

  // 1. Kiểm tra Exit code phải khác 0
  assert(proc.status === 1, `Gate Runner: Exit code trả về là 1 khi Gate 3 fail (Thực tế: ${proc.status})`);

  // 2. Kiểm tra log
  const logContent = fs.existsSync(testLogPath) ? fs.readFileSync(testLogPath, 'utf-8') : '';
  assert(logContent.includes('[FAIL] Gate 3'), 'Gate Runner: Ghi nhận lỗi FAIL tại Gate 3');
  assert(logContent.includes('FAIL-CLOSED: Không thực thi các Gate tiếp theo'), 'Gate Runner: Thông báo dừng ngay quy trình');

  // 3. Chứng minh Gate 4, Gate 5, Gate 6, Gate 7, Gate 8 KHÔNG được thực thi
  assert(!logContent.includes('BẮT ĐẦU Gate 4'), 'Gate Runner: Gate 4 KHÔNG được thực thi');
  assert(!logContent.includes('BẮT ĐẦU Gate 5'), 'Gate Runner: Gate 5 KHÔNG được thực thi');
  assert(!logContent.includes('BẮT ĐẦU Gate 6'), 'Gate Runner: Gate 6 KHÔNG được thực thi');
  assert(!logContent.includes('BẮT ĐẦU Gate 7'), 'Gate Runner: Gate 7 KHÔNG được thực thi');
  assert(!logContent.includes('BẮT ĐẦU Gate 8'), 'Gate Runner: Gate 8 KHÔNG được thực thi');

  // Dọn dẹp
  try { fs.unlinkSync(testLogPath); } catch (e) {}

  console.log('\n========================================================');
  console.log('  [PASS] CƠ CHẾ FAIL-CLOSED CỦA GATE RUNNER ĐẠT CHUẨN 100%');
  console.log('========================================================');
}

testGateRunnerFailure();
