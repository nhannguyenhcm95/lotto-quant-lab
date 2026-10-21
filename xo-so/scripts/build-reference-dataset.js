/**
 * LOTTO-QUANT LAB: BUILD CANONICAL REFERENCE DATASET (FIX-8 PRODUCTION READY)
 * 
 * Xây dựng bộ dữ liệu tham chiếu chuẩn ĐỘC LẬP HOÀN TOÀN với historical-seed.json
 * 
 * NGUYÊN TẮC FAIL-CLOSED (FIX-8 Gate A):
 *  1. CHỈ đọc từ kho bằng chứng nguồn bất biến Schema 2.0.0 (data/source-evidence/)
 *  2. TUYỆT ĐỐI KHÔNG đọc từ historical-seed.json
 *  3. Đọc raw body bytes từ file đĩa (record.rawBodyPath), tính SHA-256 từ đĩa so với rawBodySha256
 *     -> Lệch là ném lỗi TAMPER_DETECTED ngay lập tức.
 *  4. Tái parse độc lập từ raw body qua parseVietlottRaw / parseXSMNRaw.
 *  5. So sánh sâu từng trường với record.parsedRecord -> Lệch là ném PARSER_MISMATCH ngay lập tức.
 *  6. Tính recordSha256 bằng hàm đệ quy canonicalJson() bao phủ toàn bộ nested properties.
 *  7. Ghi an toàn Atomic Write qua file tạm .tmp.json trước khi đổi tên.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { 
  parseVietlottRaw, 
  parseXSMNRaw, 
  canonicalJson, 
  deepCanonicalEqual 
} from './universal-source-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function computeSha256(strOrBuffer) {
  return crypto.createHash('sha256').update(strOrBuffer).digest('hex').toUpperCase();
}

/**
 * Xây dựng Reference Dataset độc lập từ Source Evidence
 */
export function buildCanonicalReference(options = {}) {
  const evidenceDir = options.evidenceDir || path.join(rootDir, 'data', 'source-evidence');
  const outputPath = options.outputPath || path.join(rootDir, 'data', 'canonical-reference.json');

  console.log('=== LOTTO-QUANT LAB: XÂY DỰNG CANONICAL REFERENCE TỪ SOURCE EVIDENCE (FIX-8) ===');

  const megaEvidenceFile = path.join(evidenceDir, 'vietlott-mega-6-45.json');
  const powerEvidenceFile = path.join(evidenceDir, 'vietlott-power-6-55.json');
  const xsmnEvidenceFile = path.join(evidenceDir, 'xsmn-21-stations.json');
  const manifestFile = path.join(evidenceDir, 'evidence-manifest.json');

  if (!fs.existsSync(megaEvidenceFile) || !fs.existsSync(powerEvidenceFile) || !fs.existsSync(xsmnEvidenceFile)) {
    throw new Error(`[FAIL] Thiếu tệp bằng chứng nguồn trong: ${evidenceDir}. Vui lòng chạy build-source-evidence.js trước.`);
  }

  const referenceDataset = {
    version: '2.0.0-canonical-fix8',
    builtAt: options.builtAt || new Date().toISOString(),
    sourceEvidenceDir: 'data/source-evidence',
    description: 'Ground Truth Reference Dataset generated EXCLUSIVELY from validated raw source-evidence',
    totalRecords: 0,
    records: {}
  };

  function computeRecordHash(obj) {
    // Loại bỏ recordSha256 trước khi băm để bảo đảm tính tất định
    const clone = { ...obj };
    delete clone.recordSha256;
    const canonicalStr = canonicalJson(clone);
    return computeSha256(canonicalStr);
  }

  // 1. Process Mega 6/45 Evidence
  const megaEvidence = JSON.parse(fs.readFileSync(megaEvidenceFile, 'utf-8'));
  for (const ev of megaEvidence) {
    const rawDiskPath = path.isAbsolute(ev.rawBodyPath) ? ev.rawBodyPath : path.join(rootDir, ev.rawBodyPath);
    if (!fs.existsSync(rawDiskPath)) {
      throw new Error(`[TAMPER_DETECTED] Không tìm thấy raw body tệp: ${ev.rawBodyPath} cho ${ev.recordId}`);
    }

    const rawBytes = fs.readFileSync(rawDiskPath);
    const computedSha = computeSha256(rawBytes);
    if (computedSha !== ev.rawBodySha256) {
      throw new Error(`[TAMPER_DETECTED] Raw body hash mismatch for record ${ev.recordId}: expected ${ev.rawBodySha256}, got ${computedSha}`);
    }

    // Tái parse độc lập từ raw body bytes
    const parsedFromDisk = parseVietlottRaw(rawBytes.toString('utf-8'), 'mega-6-45', ev.drawId);
    
    // So sánh sâu parsedFromDisk với ev.parsedRecord
    if (!deepCanonicalEqual(parsedFromDisk, ev.parsedRecord)) {
      throw new Error(`[PARSER_MISMATCH] Parser result does not match evidence parsedRecord for ${ev.recordId}`);
    }

    const key = `vietlott-mega-6-45:${ev.drawId}`;
    const sortedBalls = Array.isArray(parsedFromDisk.winningNumbers) 
      ? [...parsedFromDisk.winningNumbers].map(Number).sort((a, b) => a - b) 
      : [];

    const refItem = {
      scope: 'vietlott-mega-6-45',
      gameType: 'mega-6-45',
      drawId: ev.drawId,
      date: ev.date,
      winningNumbers: sortedBalls,
      bonusNumber: null,
      jackpotEst: ev.parsedRecord.jackpotEst || null,
      sourceName: ev.sourceName || 'vietlott.vn',
      sourceUrl: ev.sourceUrl || '',
      retrievedAt: ev.retrievedAt || '',
      rawBodyPath: ev.rawBodyPath,
      rawBodySha256: ev.rawBodySha256,
      parserVersion: ev.parserVersion || '2.0.0',
      evidenceFile: 'data/source-evidence/vietlott-mega-6-45.json',
      verificationStatus: 'verified'
    };

    refItem.recordSha256 = computeRecordHash(refItem);
    referenceDataset.records[key] = refItem;
    referenceDataset.totalRecords++;
  }

  // 2. Process Power 6/55 Evidence
  const powerEvidence = JSON.parse(fs.readFileSync(powerEvidenceFile, 'utf-8'));
  for (const ev of powerEvidence) {
    const rawDiskPath = path.isAbsolute(ev.rawBodyPath) ? ev.rawBodyPath : path.join(rootDir, ev.rawBodyPath);
    if (!fs.existsSync(rawDiskPath)) {
      throw new Error(`[TAMPER_DETECTED] Không tìm thấy raw body tệp: ${ev.rawBodyPath} cho ${ev.recordId}`);
    }

    const rawBytes = fs.readFileSync(rawDiskPath);
    const computedSha = computeSha256(rawBytes);
    if (computedSha !== ev.rawBodySha256) {
      throw new Error(`[TAMPER_DETECTED] Raw body hash mismatch for record ${ev.recordId}: expected ${ev.rawBodySha256}, got ${computedSha}`);
    }

    const parsedFromDisk = parseVietlottRaw(rawBytes.toString('utf-8'), 'power-6-55', ev.drawId);
    if (!deepCanonicalEqual(parsedFromDisk, ev.parsedRecord)) {
      throw new Error(`[PARSER_MISMATCH] Parser result does not match evidence parsedRecord for ${ev.recordId}`);
    }

    const key = `vietlott-power-6-55:${ev.drawId}`;
    const sortedBalls = Array.isArray(parsedFromDisk.winningNumbers) 
      ? [...parsedFromDisk.winningNumbers].map(Number).sort((a, b) => a - b) 
      : [];
    const bonus = parsedFromDisk.bonusNumber !== null && parsedFromDisk.bonusNumber !== undefined 
      ? Number(parsedFromDisk.bonusNumber) 
      : null;

    const refItem = {
      scope: 'vietlott-power-6-55',
      gameType: 'power-6-55',
      drawId: ev.drawId,
      date: ev.date,
      winningNumbers: sortedBalls,
      bonusNumber: bonus,
      jackpotEst: ev.parsedRecord.jackpotEst || null,
      sourceName: ev.sourceName || 'vietlott.vn',
      sourceUrl: ev.sourceUrl || '',
      retrievedAt: ev.retrievedAt || '',
      rawBodyPath: ev.rawBodyPath,
      rawBodySha256: ev.rawBodySha256,
      parserVersion: ev.parserVersion || '2.0.0',
      evidenceFile: 'data/source-evidence/vietlott-power-6-55.json',
      verificationStatus: 'verified'
    };

    refItem.recordSha256 = computeRecordHash(refItem);
    referenceDataset.records[key] = refItem;
    referenceDataset.totalRecords++;
  }

  // 3. Process XSMN (21 Đài) Evidence
  const xsmnEvidence = JSON.parse(fs.readFileSync(xsmnEvidenceFile, 'utf-8'));
  for (const ev of xsmnEvidence) {
    const rawDiskPath = path.isAbsolute(ev.rawBodyPath) ? ev.rawBodyPath : path.join(rootDir, ev.rawBodyPath);
    if (!fs.existsSync(rawDiskPath)) {
      throw new Error(`[TAMPER_DETECTED] Không tìm thấy raw body tệp: ${ev.rawBodyPath} cho ${ev.recordId}`);
    }

    const rawBytes = fs.readFileSync(rawDiskPath);
    const computedSha = computeSha256(rawBytes);
    if (computedSha !== ev.rawBodySha256) {
      throw new Error(`[TAMPER_DETECTED] Raw body hash mismatch for record ${ev.recordId}: expected ${ev.rawBodySha256}, got ${computedSha}`);
    }

    const station = ev.stationId || 'unknown';
    const parsedFromDisk = parseXSMNRaw(rawBytes.toString('utf-8'), station, ev.date);
    if (!deepCanonicalEqual(parsedFromDisk, ev.parsedRecord)) {
      throw new Error(`[PARSER_MISMATCH] Parser result does not match evidence parsedRecord for ${ev.recordId}`);
    }

    const key = `xsmn-21-stations:${station}_${ev.date}`;

    const refItem = {
      scope: 'xsmn-21-stations',
      stationId: station,
      stationName: ev.stationName || '',
      drawId: ev.drawId || '',
      date: ev.date,
      specialPrize: parsedFromDisk.specialPrize || '',
      prizes: parsedFromDisk.prizes || {},
      lottoPairs: Array.isArray(parsedFromDisk.lottoPairs) ? [...parsedFromDisk.lottoPairs] : [],
      sourceName: ev.sourceName || 'minhngoc.net.vn',
      sourceUrl: ev.sourceUrl || '',
      retrievedAt: ev.retrievedAt || '',
      rawBodyPath: ev.rawBodyPath,
      rawBodySha256: ev.rawBodySha256,
      parserVersion: ev.parserVersion || '2.0.0',
      evidenceFile: 'data/source-evidence/xsmn-21-stations.json',
      verificationStatus: 'verified'
    };

    refItem.recordSha256 = computeRecordHash(refItem);
    referenceDataset.records[key] = refItem;
    referenceDataset.totalRecords++;
  }

  // 4. Atomic Write với Temporary File
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const tmpPath = outputPath + '.tmp.json';
  const finalJson = JSON.stringify(referenceDataset, null, 2);
  fs.writeFileSync(tmpPath, finalJson, 'utf-8');

  // Kiểm tra file tạm hợp lệ trước khi atomic rename
  const stat = fs.statSync(tmpPath);
  if (stat.size < 100 * 1024) { // Ít nhất 100KB
    throw new Error(`File tạm tạo ra quá nhỏ (${stat.size} bytes), nghi ngờ dữ liệu bị mất mát.`);
  }

  // Atomic Rename
  fs.renameSync(tmpPath, outputPath);
  console.log(`[OK] Đã hoàn thành Atomic Write Canonical Reference Dataset: ${outputPath} (${referenceDataset.totalRecords} bản ghi, ${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

  return referenceDataset;
}

if (process.argv[1] && process.argv[1].endsWith('build-reference-dataset.js')) {
  buildCanonicalReference();
}
