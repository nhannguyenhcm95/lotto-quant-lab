/**
 * LOTTO-QUANT LAB: TEST GATE D - LOG & ARTIFACT INTEGRITY MUTATIONS (FIX-7)
 * Kiểm chứng tính bất biến của logs và artifacts:
 *  1. Thêm 1 byte vào log sau khi manifest tạo -> verify-artifacts FAIL
 *  2. Thay thế screenshot bằng ảnh khác -> verify-artifacts FAIL
 *  3. Xóa log hoặc artifact được khai báo trong manifest -> verify-artifacts FAIL
 *  4. Khai báo hash sai trong manifest -> verify-artifacts FAIL
 *  5. Bảo vệ toàn vẹn dữ liệu chính thức
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { verifyArtifacts, computeFileSha256 } from '../scripts/verify-artifacts.js';

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

export function runArtifactMutationTests() {
  console.log('========================================================');
  console.log('   GATE D: ARTIFACT MUTATION TESTS (FIX-7)');
  console.log('========================================================\n');

  const tmpDir = path.join(rootDir, 'test', 'fixtures', 'artifact-mutations');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // Tạo mock run environment trong tmpDir
  const mockLog1 = path.join(tmpDir, 'gate-a-baseline.log');
  const mockLog2 = path.join(tmpDir, 'gate-b-audit.log');
  const mockScreenshot = path.join(tmpDir, 'desktop-1440x900.png');
  const manifestPath = path.join(tmpDir, 'artifact-manifest.json');

  fs.writeFileSync(mockLog1, 'LOG GATE A: SUCCESS 100%\n', 'utf-8');
  fs.writeFileSync(mockLog2, 'LOG GATE B: AUDIT PASS\n', 'utf-8');
  fs.writeFileSync(mockScreenshot, Buffer.from('FAKE_PNG_BINARY_DATA_1234567890'), 'utf-8');

  function makeManifest() {
    return {
      runId: 'mock-run-001',
      generatedAt: new Date().toISOString(),
      artifacts: [
        {
          path: 'gate-a-baseline.log',
          sizeBytes: fs.statSync(mockLog1).size,
          sha256: computeFileSha256(mockLog1)
        },
        {
          path: 'gate-b-audit.log',
          sizeBytes: fs.statSync(mockLog2).size,
          sha256: computeFileSha256(mockLog2)
        },
        {
          path: 'desktop-1440x900.png',
          sizeBytes: fs.statSync(mockScreenshot).size,
          sha256: computeFileSha256(mockScreenshot)
        }
      ]
    };
  }

  // 1. Kiểm tra manifest nguyên bản phải PASS
  console.log('1. Kiểm tra Manifest nguyên bản:');
  fs.writeFileSync(manifestPath, JSON.stringify(makeManifest(), null, 2), 'utf-8');
  const baseRes = verifyArtifacts({ manifestPath });
  assert(baseRes.success === true && baseRes.matched === 3, 'Manifest ban đầu hoàn toàn hợp lệ (100% PASS)');

  // 2. Mutation 1: Thêm 1 byte vào mockLog1 sau khi manifest đã tạo
  console.log('\n2. Mutation 1: Thêm 1 byte vào log file sau khi hash:');
  fs.appendFileSync(mockLog1, 'X', 'utf-8'); // Thêm 1 byte 'X'
  const res1 = verifyArtifacts({ manifestPath });
  assert(res1.success === false && res1.mismatched > 0, 'Phát hiện sửa đổi 1 byte vào file log và từ chối PASS');

  // Khôi phục log1
  fs.writeFileSync(mockLog1, 'LOG GATE A: SUCCESS 100%\n', 'utf-8');

  // 3. Mutation 2: Thay thế mockScreenshot bằng nội dung khác
  console.log('\n3. Mutation 2: Thay thế screenshot bằng ảnh khác:');
  fs.writeFileSync(mockScreenshot, Buffer.from('CORRUPTED_SCREENSHOT_DIFFERENT_HASH'), 'utf-8');
  const res2 = verifyArtifacts({ manifestPath });
  assert(res2.success === false && res2.mismatched > 0, 'Phát hiện thay thế screenshot và từ chối PASS');

  // Khôi phục screenshot
  fs.writeFileSync(mockScreenshot, Buffer.from('FAKE_PNG_BINARY_DATA_1234567890'), 'utf-8');

  // 4. Mutation 3: Xóa một file log được khai báo trong manifest
  console.log('\n4. Mutation 3: Xóa file log được khai báo:');
  fs.unlinkSync(mockLog2);
  const res3 = verifyArtifacts({ manifestPath });
  assert(res3.success === false && res3.missing > 0, 'Phát hiện thiếu file artifact và từ chối PASS');

  // Khôi phục log2
  fs.writeFileSync(mockLog2, 'LOG GATE B: AUDIT PASS\n', 'utf-8');

  // 5. Mutation 4: Khai báo hash sai trong manifest
  console.log('\n5. Mutation 4: Khai báo hash sai lệch trong manifest:');
  const badManifest = makeManifest();
  badManifest.artifacts[0].sha256 = '0000000000000000000000000000000000000000000000000000000000000000';
  fs.writeFileSync(manifestPath, JSON.stringify(badManifest, null, 2), 'utf-8');
  const res4 = verifyArtifacts({ manifestPath });
  assert(res4.success === false && res4.mismatched > 0, 'Phát hiện mã băm sai lệch và từ chối PASS');

  // Dọn dẹp
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}

  console.log('\n========================================================');
  console.log(` KẾT QUẢ GATE D MUTATION TESTS: ${passed} PASS, ${failed} FAIL`);
  console.log('========================================================');

  return { passed, failed, success: failed === 0 };
}

if (process.argv[1] && process.argv[1].endsWith('test-artifact-mutations.js')) {
  const res = runArtifactMutationTests();
  if (!res.success) process.exit(1);
}
