/**
 * LOTTO-QUANT LAB: VERIFY ARTIFACTS & LOG INTEGRITY (FIX-7 P0)
 * Kiểm chứng mã băm SHA-256 và tính toàn vẹn của toàn bộ artifacts/logs trên đĩa.
 * Bất kỳ sự thay đổi (dù chỉ 1 byte) hoặc thiếu file nào đều trả về exit code khác 0.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function computeFileSha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
}

export function verifyArtifacts(options = {}) {
  let manifestPath = options.manifestPath;

  if (!manifestPath) {
    // Tìm run mới nhất trong reports/fix7/runs/
    const runsBaseDir = path.join(rootDir, 'reports', 'fix7', 'runs');
    if (!fs.existsSync(runsBaseDir)) {
      console.error(`[FAIL] Không tìm thấy thư mục runs: ${runsBaseDir}`);
      return { success: false, reason: 'No runs directory' };
    }

    const runs = fs.readdirSync(runsBaseDir).filter(d => {
      const dirPath = path.join(runsBaseDir, d);
      return fs.statSync(dirPath).isDirectory() && fs.existsSync(path.join(dirPath, 'artifact-manifest.json'));
    }).sort().reverse();

    if (runs.length === 0) {
      console.error('[FAIL] Chưa có lượt chạy hoàn tất (có artifact-manifest.json) nào trong reports/fix7/runs/');
      return { success: false, reason: 'No completed runs with manifest found' };
    }

    manifestPath = path.join(runsBaseDir, runs[0], 'artifact-manifest.json');
  }

  if (!fs.existsSync(manifestPath)) {
    console.error(`[FAIL] Không tìm thấy manifest: ${manifestPath}`);
    return { success: false, reason: 'Missing artifact-manifest.json' };
  }

  const runDir = path.dirname(manifestPath);
  console.log('========================================================');
  console.log('   LOTTO-QUANT LAB: VERIFY ARTIFACT INTEGRITY (FIX-7)');
  console.log(`   Run Dir: ${runDir}`);
  console.log('========================================================\n');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const artifacts = manifest.artifacts || [];

  let matched = 0;
  let mismatched = 0;
  let missing = 0;
  const errors = [];

  for (const item of artifacts) {
    const fullPath = path.isAbsolute(item.path) ? item.path : path.resolve(runDir, item.path);

    if (!fs.existsSync(fullPath)) {
      missing++;
      errors.push(`[MISSING] Tệp không tồn tại trên đĩa: ${item.path}`);
      console.error(`  [FAIL] MISSING: ${item.path}`);
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (typeof item.sizeBytes === 'number' && stat.size !== item.sizeBytes) {
      mismatched++;
      errors.push(`[SIZE_MISMATCH] ${item.path} - Khai báo: ${item.sizeBytes} B, Thực tế: ${stat.size} B`);
      console.error(`  [FAIL] SIZE MISMATCH: ${item.path}`);
      continue;
    }

    const actualSha = computeFileSha256(fullPath);
    if (actualSha !== item.sha256) {
      mismatched++;
      errors.push(`[HASH_MISMATCH] ${item.path} - Khai báo: ${item.sha256}, Thực tế: ${actualSha}`);
      console.error(`  [FAIL] HASH MISMATCH: ${item.path}`);
      console.error(`         Kỳ vọng: ${item.sha256}`);
      console.error(`         Thực tế: ${actualSha}`);
    } else {
      matched++;
      console.log(`  [PASS] ${item.path} (${stat.size} B) | SHA-256: ${actualSha.substring(0, 16)}...`);
    }
  }

  console.log('\n--------------------------------------------------------');
  console.log(` KẾT QUẢ XÁC MINH ARTIFACTS: ${matched} MATCHED, ${mismatched} MISMATCHED, ${missing} MISSING`);
  console.log('--------------------------------------------------------');

  const isSuccess = mismatched === 0 && missing === 0 && matched > 0;
  if (isSuccess) {
    console.log('  [PASS] 100% ARTIFACTS & LOGS NGUYÊN VẸN KHÔNG BỊ XÂM PHẠM!');
  } else {
    console.error('  [FAIL] PHÁT HIỆN SAI LỆCH HOẶC THIẾU ARTIFACTS TRÊN ĐĨA!');
  }

  return {
    success: isSuccess,
    total: artifacts.length,
    matched,
    mismatched,
    missing,
    errors
  };
}

if (process.argv[1] && process.argv[1].endsWith('verify-artifacts.js')) {
  const args = process.argv.slice(2);
  let manifestPath = null;
  for (const a of args) {
    if (a.startsWith('--manifest=')) manifestPath = a.split('=')[1];
    else if (!a.startsWith('--')) manifestPath = a;
  }

  const res = verifyArtifacts({ manifestPath });
  if (!res.success) {
    process.exit(1);
  }
}
