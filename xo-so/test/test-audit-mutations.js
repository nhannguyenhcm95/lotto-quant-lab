/**
 * LOTTO-QUANT LAB: STRICT AUDIT MUTATION TESTS (FIX-8 GATE B)
 * 
 * Kiểm chứng 17 đột biến có kiểm soát trên thư mục tạm.
 * Mỗi đột biến chứng minh audit phát hiện chính xác lỗi và từ chối PASS (Fail-Closed).
 * Bao gồm kiểm tra giải con (firstPrize, nested prizes), lottoPairs derivation, và tamper detection.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { auditHistory } from '../scripts/audit-history.js';
import { buildCanonicalReference } from '../scripts/build-reference-dataset.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function runAuditMutationTests() {
  console.log('========================================================');
  console.log('   GATE B: STRICT AUDIT 17 MUTATION TESTS (FIX-8)');
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

  const tmpDir = path.join(rootDir, 'test', 'fixtures', 'audit-mutations');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const realSeedPath = path.join(rootDir, 'data', 'historical-seed.json');
  const realScopePath = path.join(rootDir, 'data', 'history-scope.json');
  const realRefPath = path.join(rootDir, 'data', 'canonical-reference.json');

  // Baseline SHA-256 của các file chính thức
  const seedShaBefore = crypto.createHash('sha256').update(fs.readFileSync(realSeedPath)).digest('hex');
  const refShaBefore = crypto.createHash('sha256').update(fs.readFileSync(realRefPath)).digest('hex');

  function getFreshSeed() {
    return JSON.parse(fs.readFileSync(realSeedPath, 'utf-8').replace(/^\uFEFF/, ''));
  }

  function runOnMutatedSeed(mutatedSeed, testName) {
    const tmpSeedFile = path.join(tmpDir, 'mutated-seed.json');
    fs.writeFileSync(tmpSeedFile, JSON.stringify(mutatedSeed, null, 2), 'utf-8');
    const res = auditHistory({
      strict: true,
      seedPath: tmpSeedFile,
      scopePath: realScopePath,
      referencePath: realRefPath,
      noWrite: true
    });
    try { fs.unlinkSync(tmpSeedFile); } catch (e) {}
    return res;
  }

  // 1. Mutation 1: Thay 1 quả bóng trúng thành số hợp lệ khác
  console.log('1. Mutation 1 (Bóng số lệch giá trị trong miền hợp lệ):');
  const m1 = getFreshSeed();
  m1.vietlott['mega-6-45'][0].winningNumbers[5] = 39;
  const res1 = runOnMutatedSeed(m1, 'Mutation 1');
  assert(res1.success === false && res1.report.summary.mismatchedComparisons > 0, 'Phát hiện lệch bóng số và từ chối PASS');

  // 2. Mutation 2: Thay thứ tự số (không sắp xếp tăng dần)
  console.log('\n2. Mutation 2 (Sai thứ tự sắp xếp bóng số):');
  const m2 = getFreshSeed();
  const balls2 = [...m2.vietlott['mega-6-45'][0].winningNumbers];
  m2.vietlott['mega-6-45'][0].winningNumbers = [balls2[1], balls2[0], ...balls2.slice(2)];
  const res2 = runOnMutatedSeed(m2, 'Mutation 2');
  assert(res2.success === false && res2.report.summary.mismatchedComparisons > 0, 'Phát hiện sai thứ tự sắp xếp bóng số và từ chối PASS');

  // 3. Mutation 3: Thay ngày bằng ngày lịch hợp lệ nhưng sai kỳ
  console.log('\n3. Mutation 3 (Ngày quay sai lệch so với kỳ mở thưởng):');
  const m3 = getFreshSeed();
  m3.vietlott['mega-6-45'][0].date = '2026-10-11';
  const res3 = runOnMutatedSeed(m3, 'Mutation 3');
  assert(res3.success === false && res3.report.summary.mismatchedComparisons > 0, 'Phát hiện sai ngày quay so với kỳ và từ chối PASS');

  // 4. Mutation 4: Thay mã kỳ bằng mã hợp lệ của kỳ khác
  console.log('\n4. Mutation 4 (Mã kỳ lệch so với kết quả):');
  const m4 = getFreshSeed();
  m4.vietlott['mega-6-45'][0].drawId = '#01575';
  const res4 = runOnMutatedSeed(m4, 'Mutation 4');
  assert(res4.success === false, 'Phát hiện mã kỳ không khớp hoặc trùng lặp và từ chối PASS');

  // 5. Mutation 5: Thay số đặc biệt bonusNumber của Power 6/55
  console.log('\n5. Mutation 5 (Số đặc biệt Power 6/55 sai lệch):');
  const m5 = getFreshSeed();
  m5.vietlott['power-6-55'][0].bonusNumber = (m5.vietlott['power-6-55'][0].bonusNumber % 55) + 1;
  const res5 = runOnMutatedSeed(m5, 'Mutation 5');
  assert(res5.success === false && res5.report.summary.mismatchedComparisons > 0, 'Phát hiện sai bonusNumber Power 6/55 và từ chối PASS');

  // 6. Mutation 6: Thay Jackpot bằng giá trị dương khác
  console.log('\n6. Mutation 6 (Jackpot sai lệch giá trị tiền):');
  const m6 = getFreshSeed();
  m6.vietlott['mega-6-45'][0].jackpotEst = '99,999,999,999 đ';
  const res6 = runOnMutatedSeed(m6, 'Mutation 6');
  assert(res6.success === false && res6.report.summary.mismatchedComparisons > 0, 'Phát hiện sai giá trị Jackpot và từ chối PASS');

  // 7. Mutation 7: Đổi giải nhất XSMN (23288 -> 99999) (P0-03)
  console.log('\n7. Mutation 7 (Giải nhất XSMN con bị sửa đổi giá trị):');
  const m7 = getFreshSeed();
  if (m7.xsmn[0].prizes && m7.xsmn[0].prizes.first) {
    m7.xsmn[0].prizes.first = ['99999'];
  }
  const res7 = runOnMutatedSeed(m7, 'Mutation 7');
  assert(res7.success === false && res7.report.summary.mismatchedComparisons > 0, 'Phát hiện sai giải nhất con XSMN (P0-03) và từ chối PASS');

  // 8. Mutation 8: Đổi nested prize con khác (giải 3)
  console.log('\n8. Mutation 8 (Giải ba con XSMN bị sửa đổi):');
  const m8 = getFreshSeed();
  if (m8.xsmn[0].prizes && m8.xsmn[0].prizes.third) {
    m8.xsmn[0].prizes.third[0] = '99999';
  }
  const res8 = runOnMutatedSeed(m8, 'Mutation 8');
  assert(res8.success === false && res8.report.summary.mismatchedComparisons > 0, 'Phát hiện sai nested prize giải ba và từ chối PASS');

  // 9. Mutation 9: Đổi 1 phần tử lottoPairs của XSMN không khớp giải (P0-04)
  console.log('\n9. Mutation 9 (lottoPairs bị sửa không khớp với đuôi các giải):');
  const m9 = getFreshSeed();
  if (Array.isArray(m9.xsmn[0].lottoPairs) && m9.xsmn[0].lottoPairs.length > 0) {
    m9.xsmn[0].lottoPairs[0] = '99';
  }
  const res9 = runOnMutatedSeed(m9, 'Mutation 9');
  assert(res9.success === false && res9.report.summary.mismatchedComparisons > 0, 'Phát hiện lottoPairs không khớp đuôi giải và từ chối PASS');

  // 10. Mutation 10: Xóa 1 phần tử của lottoPairs XSMN
  console.log('\n10. Mutation 10 (lottoPairs thiếu phần tử):');
  const m10 = getFreshSeed();
  if (Array.isArray(m10.xsmn[0].lottoPairs)) {
    m10.xsmn[0].lottoPairs = m10.xsmn[0].lottoPairs.slice(1);
  }
  const res10 = runOnMutatedSeed(m10, 'Mutation 10');
  assert(res10.success === false && res10.report.summary.mismatchedComparisons > 0, 'Phát hiện lottoPairs thiếu số lượng phần tử và từ chối PASS');

  // 11. Mutation 11: Thay specialPrize của XSMN
  console.log('\n11. Mutation 11 (Giải đặc biệt XSMN sai lệch):');
  const m11 = getFreshSeed();
  m11.xsmn[0].specialPrize = '999999';
  const res11 = runOnMutatedSeed(m11, 'Mutation 11');
  assert(res11.success === false && res11.report.summary.mismatchedComparisons > 0, 'Phát hiện sai giải đặc biệt XSMN và từ chối PASS');

  // 12. Mutation 12: Thay sourceUrl sang URL khác
  console.log('\n12. Mutation 12 (Source URL không khớp kỳ mở thưởng):');
  const m12 = getFreshSeed();
  m12.vietlott['mega-6-45'][0].sourceUrl = 'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/645?id=00001&nocatche=1';
  const res12 = runOnMutatedSeed(m12, 'Mutation 12');
  assert(res12.success === false && res12.report.summary.mismatchedComparisons > 0, 'Phát hiện sai sourceUrl và từ chối PASS');

  // 13. Mutation 13: Sửa đổi tính toàn vẹn của Raw Evidence Body
  console.log('\n13. Mutation 13 (Xâm phạm toàn vẹn Source Evidence raw body):');
  const tmpEvidenceDir = path.join(tmpDir, 'evidence-tamper');
  const tmpRawDir = path.join(tmpEvidenceDir, 'raw');
  if (!fs.existsSync(tmpRawDir)) fs.mkdirSync(tmpRawDir, { recursive: true });
  const realEvidenceDir = path.join(rootDir, 'data', 'source-evidence');
  fs.copyFileSync(path.join(realEvidenceDir, 'vietlott-mega-6-45.json'), path.join(tmpEvidenceDir, 'vietlott-mega-6-45.json'));
  fs.copyFileSync(path.join(realEvidenceDir, 'vietlott-power-6-55.json'), path.join(tmpEvidenceDir, 'vietlott-power-6-55.json'));
  fs.copyFileSync(path.join(realEvidenceDir, 'xsmn-21-stations.json'), path.join(tmpEvidenceDir, 'xsmn-21-stations.json'));

  const megaEv = JSON.parse(fs.readFileSync(path.join(tmpEvidenceDir, 'vietlott-mega-6-45.json'), 'utf-8'));
  const rec0 = megaEv[0];
  const origRaw = path.join(rootDir, rec0.rawBodyPath);
  const corruptedRawPath = path.join(tmpRawDir, path.basename(rec0.rawBodyPath));
  fs.writeFileSync(corruptedRawPath, 'CORRUPTED_RAW_CONTENT', 'utf-8');
  rec0.rawBodyPath = path.relative(rootDir, corruptedRawPath).replace(/\\/g, '/');
  fs.writeFileSync(path.join(tmpEvidenceDir, 'vietlott-mega-6-45.json'), JSON.stringify(megaEv), 'utf-8');

  let tamperFailed = false;
  try {
    buildCanonicalReference({ evidenceDir: tmpEvidenceDir, outputPath: path.join(tmpDir, 'test-ref.json') });
  } catch (err) {
    tamperFailed = true;
  }
  assert(tamperFailed === true, 'Phát hiện sửa đổi raw body không khớp hash và từ chối build reference');

  // 14. Mutation 14: Xóa reference đối chiếu của 1 kỳ
  console.log('\n14. Mutation 14 (Thiếu Reference / Evidence của kỳ):');
  const mutatedRef = JSON.parse(fs.readFileSync(realRefPath, 'utf-8'));
  delete mutatedRef.records['vietlott-mega-6-45:#01576'];
  const tmpRefFile = path.join(tmpDir, 'mutated-ref.json');
  fs.writeFileSync(tmpRefFile, JSON.stringify(mutatedRef), 'utf-8');

  const res14 = auditHistory({
    strict: true,
    seedPath: realSeedPath,
    scopePath: realScopePath,
    referencePath: tmpRefFile,
    noWrite: true
  });
  try { fs.unlinkSync(tmpRefFile); } catch (e) {}
  assert(res14.success === false && res14.report.summary.missingReferenceRecords > 0, 'Phát hiện thiếu reference đối chiếu và từ chối PASS');

  // 15. Mutation 15: Đưa kỳ ngoài phạm vi manifest
  console.log('\n15. Mutation 15 (Kỳ vượt ngoài phạm vi manifest):');
  const m15 = getFreshSeed();
  m15.vietlott['mega-6-45'].unshift({
    date: '2026-10-18',
    gameType: 'mega-6-45',
    drawId: '#01577',
    winningNumbers: [1, 2, 3, 4, 5, 6],
    jackpotEst: '30,000,000,000 đ',
    sourceUrl: 'https://vietlott.vn/',
    verificationStatus: 'verified'
  });
  const res15 = runOnMutatedSeed(m15, 'Mutation 15');
  assert(res15.success === false, 'Phát hiện kỳ vượt ngoài phạm vi manifest và từ chối PASS');

  // 16. Mutation 16: Thay stationId của XSMN
  console.log('\n16. Mutation 16 (stationId của XSMN bị sai):');
  const m16 = getFreshSeed();
  m16.xsmn[0].stationId = 'sai-gon-invalid';
  const res16 = runOnMutatedSeed(m16, 'Mutation 16');
  assert(res16.success === false && (res16.report.summary.missingEvidence > 0 || res16.report.summary.mismatchedComparisons > 0 || res16.report.summary.unverifiedComparisons > 0), 'Phát hiện stationId không khớp và từ chối PASS');

  // 17. Mutation 17: Cấu trúc prizes sai schema (thiếu giải)
  console.log('\n17. Mutation 17 (prizes thiếu cấu trúc giải chuẩn):');
  const m17 = getFreshSeed();
  delete m17.xsmn[0].prizes.eighth; // Xóa giải 8
  const res17 = runOnMutatedSeed(m17, 'Mutation 17');
  assert(res17.success === false && res17.report.summary.mismatchedComparisons > 0, 'Phát hiện prizes thiếu giải 8 và từ chối PASS');

  // 18. Bảo vệ Artifact: Kiểm tra hash dữ liệu chính thức không hề bị thay đổi
  const seedShaAfter = crypto.createHash('sha256').update(fs.readFileSync(realSeedPath)).digest('hex');
  const refShaAfter = crypto.createHash('sha256').update(fs.readFileSync(realRefPath)).digest('hex');
  assert(seedShaBefore === seedShaAfter, 'Artifact Protection: historical-seed.json hoàn toàn giữ nguyên 100% hash');
  assert(refShaBefore === refShaAfter, 'Artifact Protection: canonical-reference.json hoàn toàn giữ nguyên 100% hash');

  // Dọn dẹp thư mục tạm
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}

  console.log('\n========================================================');
  console.log(` KẾT QUẢ MUTATION TESTS (GATE B): ${passed} PASS, ${failed} FAIL`);
  console.log('========================================================');

  return { passed, failed, success: failed === 0, assertions: passed + failed };
}

if (process.argv[1] && process.argv[1].endsWith('test-audit-mutations.js')) {
  const res = runAuditMutationTests();
  if (!res.success) process.exit(1);
}
