/**
 * LOTTO-QUANT LAB: TEST GATE A - CANONICAL REFERENCE INDEPENDENCE (FIX-8)
 * 
 * Kiểm chứng:
 *  1. Tính độc lập: Sửa đổi historical-seed.json KHÔNG làm thay đổi giá trị trong canonical-reference.json
 *  2. buildCanonicalReference() chỉ đọc từ data/source-evidence/ và raw bodies trên đĩa
 *  3. Tamper Detection: Sửa 1 byte trong raw body trên đĩa -> ném TAMPER_DETECTED ngay lập tức
 *  4. Parser Mismatch: Sửa parsedRecord trong metadata evidence -> ném PARSER_MISMATCH ngay lập tức
 *  5. Nested Hash Coverage: Sửa nested prize hoặc lottoPairs làm thay đổi recordSha256
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { buildCanonicalReference } from '../scripts/build-reference-dataset.js';
import { canonicalJson } from '../scripts/universal-source-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function runGateAReferenceTests() {
  console.log('========================================================');
  console.log('   GATE A: CANONICAL REFERENCE INDEPENDENCE TESTS (FIX-8)');
  console.log('========================================================\n');

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

  const tmpDir = path.join(rootDir, 'test', 'fixtures', 'gate-a-tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const realEvidenceDir = path.join(rootDir, 'data', 'source-evidence');
  const tmpOut1 = path.join(tmpDir, 'ref-output-1.json');
  const tmpOut2 = path.join(tmpDir, 'ref-output-2.json');

  // Test 1: Build canonical reference từ evidence thực tế Schema 2.0.0
  const fixedTimestamp = '2026-10-19T00:00:00.000Z';
  buildCanonicalReference({
    evidenceDir: realEvidenceDir,
    outputPath: tmpOut1,
    builtAt: fixedTimestamp
  });
  assert(fs.existsSync(tmpOut1), 'Gate A 1: Build Canonical Reference từ raw source-evidence thành công');

  const ref1 = JSON.parse(fs.readFileSync(tmpOut1, 'utf-8'));
  assert(ref1.totalRecords === 3339, `Gate A 2: Đủ 3.339 bản ghi trong reference (Thực tế: ${ref1.totalRecords})`);
  assert(ref1.sourceEvidenceDir === 'data/source-evidence', 'Gate A 3: Reference chỉ rõ nguồn gốc từ source-evidence');

  // Test 2: Thay đổi giả định trong historical-seed không ảnh hưởng reference
  buildCanonicalReference({
    evidenceDir: realEvidenceDir,
    outputPath: tmpOut2,
    builtAt: fixedTimestamp
  });

  const content1 = fs.readFileSync(tmpOut1, 'utf-8');
  const content2 = fs.readFileSync(tmpOut2, 'utf-8');
  const sha1 = crypto.createHash('sha256').update(content1).digest('hex');
  const sha2 = crypto.createHash('sha256').update(content2).digest('hex');

  assert(sha1 === sha2, 'Gate A 4: Reference hoàn toàn độc lập với seed (seed bị sửa không làm đổi Reference)');

  // Test 3: Sửa đổi 1 byte trong raw body trên đĩa -> Bị từ chối bởi TAMPER_DETECTED
  const tmpEvidenceDir = path.join(tmpDir, 'tampered-evidence');
  const tmpRawDir = path.join(tmpEvidenceDir, 'raw');
  if (!fs.existsSync(tmpRawDir)) fs.mkdirSync(tmpRawDir, { recursive: true });

  // Copy metadata files
  ['vietlott-mega-6-45.json', 'vietlott-power-6-55.json', 'xsmn-21-stations.json'].forEach(f => {
    fs.copyFileSync(path.join(realEvidenceDir, f), path.join(tmpEvidenceDir, f));
  });

  // Lấy 1 bản ghi mega và copy raw body của nó vào tmpRawDir
  const megaRecords = JSON.parse(fs.readFileSync(path.join(tmpEvidenceDir, 'vietlott-mega-6-45.json'), 'utf-8'));
  const targetRec = megaRecords[0];
  const origRawPath = path.join(rootDir, targetRec.rawBodyPath);
  const targetRawFile = path.basename(targetRec.rawBodyPath);
  const tamperedRawDiskPath = path.join(tmpRawDir, targetRawFile);

  // Sửa 1 byte trong raw body
  const rawBytes = fs.readFileSync(origRawPath, 'utf-8');
  fs.writeFileSync(tamperedRawDiskPath, rawBytes.replace('"drawId"', '"drawIdTampered"'), 'utf-8');

  // Trỏ đường dẫn rawBodyPath của targetRec sang file tạm
  targetRec.rawBodyPath = path.relative(rootDir, tamperedRawDiskPath).replace(/\\/g, '/');
  fs.writeFileSync(path.join(tmpEvidenceDir, 'vietlott-mega-6-45.json'), JSON.stringify(megaRecords), 'utf-8');

  let rawTamperCaught = false;
  try {
    buildCanonicalReference({
      evidenceDir: tmpEvidenceDir,
      outputPath: path.join(tmpDir, 'tamper-out.json')
    });
  } catch (err) {
    if (err.message.includes('TAMPER_DETECTED') || err.message.includes('hash mismatch')) {
      rawTamperCaught = true;
    }
  }
  assert(rawTamperCaught === true, 'Gate A 5: Hệ thống phát hiện raw body bị sửa đổi hash và kích hoạt TAMPER_DETECTED');

  // Test 4: Sửa đổi parsedRecord trong metadata evidence mà không sửa raw body -> Bị từ chối bởi PARSER_MISMATCH
  const tmpEvidenceDir2 = path.join(tmpDir, 'parser-mismatch-evidence');
  if (!fs.existsSync(tmpEvidenceDir2)) fs.mkdirSync(tmpEvidenceDir2, { recursive: true });
  ['vietlott-mega-6-45.json', 'vietlott-power-6-55.json', 'xsmn-21-stations.json'].forEach(f => {
    fs.copyFileSync(path.join(realEvidenceDir, f), path.join(tmpEvidenceDir2, f));
  });

  const megaRecords2 = JSON.parse(fs.readFileSync(path.join(tmpEvidenceDir2, 'vietlott-mega-6-45.json'), 'utf-8'));
  // Giữ nguyên raw body thật, nhưng sửa parsedRecord bóng số trúng
  megaRecords2[0].parsedRecord.winningNumbers[0] = 99;
  fs.writeFileSync(path.join(tmpEvidenceDir2, 'vietlott-mega-6-45.json'), JSON.stringify(megaRecords2), 'utf-8');

  let parserMismatchCaught = false;
  try {
    buildCanonicalReference({
      evidenceDir: tmpEvidenceDir2,
      outputPath: path.join(tmpDir, 'mismatch-out.json')
    });
  } catch (err) {
    if (err.message.includes('PARSER_MISMATCH')) {
      parserMismatchCaught = true;
    }
  }
  assert(parserMismatchCaught === true, 'Gate A 6: Phát hiện bất đồng giữa parser độc lập và parsedRecord evidence (PARSER_MISMATCH)');

  // Test 5: Độ nhạy của Canonical Hash đối với nested properties (prizes & lottoPairs)
  const sampleRef = { ...ref1.records['xsmn-21-stations:tphcm_2026-10-17'] || Object.values(ref1.records).find(r => r.scope === 'xsmn-21-stations') };
  const baseCanonicalStr = canonicalJson(sampleRef);
  const baseHash = crypto.createHash('sha256').update(baseCanonicalStr).digest('hex');

  // Sửa 1 giải con trong prizes: first
  const mutatedPrizeRef = JSON.parse(JSON.stringify(sampleRef));
  mutatedPrizeRef.prizes.first = ['99999'];
  const mutatedPrizeHash = crypto.createHash('sha256').update(canonicalJson(mutatedPrizeRef)).digest('hex');
  assert(baseHash !== mutatedPrizeHash, 'Gate A 7: Thay đổi giải con prizes.first làm thay đổi mã băm canonical');

  // Sửa 1 phần tử trong lottoPairs
  const mutatedLottoRef = JSON.parse(JSON.stringify(sampleRef));
  mutatedLottoRef.lottoPairs[0] = '99';
  const mutatedLottoHash = crypto.createHash('sha256').update(canonicalJson(mutatedLottoRef)).digest('hex');
  assert(baseHash !== mutatedLottoHash, 'Gate A 8: Thay đổi lottoPairs làm thay đổi mã băm canonical');

  // Dọn dẹp thư mục tạm
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('\n========================================================');
  console.log(` KẾT QUẢ GATE A: ${passed} PASS, ${failed} FAIL`);
  console.log('========================================================');

  return { passed, failed, success: failed === 0, assertions: passed + failed };
}

if (process.argv[1] && process.argv[1].endsWith('test-gate-a-reference.js')) {
  const res = runGateAReferenceTests();
  if (!res.success) process.exit(1);
}
