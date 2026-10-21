/**
 * LOTTO-QUANT LAB: DATA RECONCILIATION EXPORTER (FIX-5 GATE 1)
 * Xuất bảng đối chiếu 100% dữ liệu lịch sử (3.339 bản ghi) với nguồn gốc xác thực
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function generateReconciliationCsv(outputPath) {
  const rootDir = path.join(__dirname, '..');
  const seedPath = path.join(rootDir, 'data', 'historical-seed.json');
  const targetPath = outputPath || path.join(rootDir, 'reports', 'fix5', 'data-reconciliation.csv');

  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed data file not found at: ${seedPath}`);
  }

  const rawSeed = fs.readFileSync(seedPath, 'utf-8').replace(/^\uFEFF/, '');
  const data = JSON.parse(rawSeed);

  const outDir = path.dirname(targetPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const csvRows = [];
  // Header
  csvRows.push([
    'Scope',
    'GameOrStation',
    'DrawId',
    'Date',
    'NumbersOrSpecialPrize',
    'BonusNumber',
    'JackpotOrPrize',
    'SourceName',
    'SourceUrl',
    'RetrievedAt',
    'VerificationStatus',
    'RecordSha256'
  ].join(','));

  function cleanCsv(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  function hashRecord(record) {
    return crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex');
  }

  let totalCount = 0;

  // 1. Mega 6/45
  if (data.vietlott && Array.isArray(data.vietlott['mega-6-45'])) {
    for (const r of data.vietlott['mega-6-45']) {
      const numbersStr = Array.isArray(r.winningNumbers) ? r.winningNumbers.join('-') : '';
      const row = [
        cleanCsv('vietlott-mega-6-45'),
        cleanCsv(r.gameType || 'mega-6-45'),
        cleanCsv(r.drawId),
        cleanCsv(r.date),
        cleanCsv(numbersStr),
        cleanCsv(r.bonusNumber || 'N/A'),
        cleanCsv(r.jackpotEst || 'N/A'),
        cleanCsv(r.sourceName),
        cleanCsv(r.sourceUrl),
        cleanCsv(r.retrievedAt),
        cleanCsv(r.verificationStatus),
        cleanCsv(hashRecord(r))
      ];
      csvRows.push(row.join(','));
      totalCount++;
    }
  }

  // 2. Power 6/55
  if (data.vietlott && Array.isArray(data.vietlott['power-6-55'])) {
    for (const r of data.vietlott['power-6-55']) {
      const numbersStr = Array.isArray(r.winningNumbers) ? r.winningNumbers.join('-') : '';
      const row = [
        cleanCsv('vietlott-power-6-55'),
        cleanCsv(r.gameType || 'power-6-55'),
        cleanCsv(r.drawId),
        cleanCsv(r.date),
        cleanCsv(numbersStr),
        cleanCsv(r.bonusNumber || 'N/A'),
        cleanCsv(r.jackpotEst || 'N/A'),
        cleanCsv(r.sourceName),
        cleanCsv(r.sourceUrl),
        cleanCsv(r.retrievedAt),
        cleanCsv(r.verificationStatus),
        cleanCsv(hashRecord(r))
      ];
      csvRows.push(row.join(','));
      totalCount++;
    }
  }

  // 3. XSMN
  if (Array.isArray(data.xsmn)) {
    for (const r of data.xsmn) {
      const row = [
        cleanCsv('xsmn-21-stations'),
        cleanCsv(r.stationId || r.stationName),
        cleanCsv(r.drawId || 'N/A'),
        cleanCsv(r.date),
        cleanCsv(r.specialPrize || ''),
        cleanCsv('N/A'),
        cleanCsv('Đặc biệt 2 tỷ VNĐ'),
        cleanCsv(r.sourceName),
        cleanCsv(r.sourceUrl),
        cleanCsv(r.retrievedAt),
        cleanCsv(r.verificationStatus),
        cleanCsv(hashRecord(r))
      ];
      csvRows.push(row.join(','));
      totalCount++;
    }
  }

  fs.writeFileSync(targetPath, csvRows.join('\n'), 'utf-8');
  console.log(`[OK] Đã xuất bảng đối chiếu dữ liệu: ${targetPath} (${totalCount} bản ghi)`);
  return { count: totalCount, path: targetPath };
}

// Chạy trực tiếp CLI
if (process.argv[1] && process.argv[1].endsWith('generate-reconciliation.js')) {
  generateReconciliationCsv();
}
