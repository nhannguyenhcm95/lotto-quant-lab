/**
 * LOTTO-QUANT LAB: UNIVERSAL SOURCE PARSER (FIX-8 PRODUCTION READY)
 * Parser độc lập tái trích xuất kết quả từ raw response bodies của Vietlott & Minh Ngọc
 */

import { isValidPrizeSchema, deriveLottoPairsFromPrizes, canonicalize, canonicalJson, deepCanonicalEqual } from './audit-history.js';

export { canonicalize, canonicalJson, deepCanonicalEqual };

/**
 * Parse raw body của kỳ Vietlott
 */
export function parseVietlottRaw(rawContent, expectedGameType, expectedDrawId) {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Raw body content is empty or invalid');
  }

  // Trường hợp raw là JSON payload
  if (rawContent.trim().startsWith('{')) {
    try {
      const data = JSON.parse(rawContent);
      const balls = Array.isArray(data.winningNumbers) ? [...data.winningNumbers].map(Number).sort((a, b) => a - b) : [];
      return {
        date: data.date,
        drawId: data.drawId,
        gameType: data.gameType || expectedGameType,
        winningNumbers: balls,
        bonusNumber: data.bonusNumber !== undefined && data.bonusNumber !== null ? Number(data.bonusNumber) : null,
        jackpotEst: data.jackpotEst || null
      };
    } catch (e) {
      // Fall through to regex parse
    }
  }

  // Trường hợp raw là HTML
  const drawIdMatch = rawContent.match(/Kỳ vé:[^#]*?(#\d+)/i) || 
                      rawContent.match(/id="DT6X[45]5_KY_VE">([^<]+)<\/span>/i) ||
                      rawContent.match(/(#\d{5})/);
  const drawId = drawIdMatch ? (drawIdMatch[1].startsWith('#') ? drawIdMatch[1] : '#' + drawIdMatch[1]) : expectedDrawId;

  const dateMatch = rawContent.match(/quay thưởng\s*(\d{2}\/\d{2}\/\d{4})/i) || rawContent.match(/(\d{2}\/\d{2}\/\d{4})/);
  let dateFormatted = null;
  if (dateMatch) {
    const parts = dateMatch[1].split('/');
    dateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  const ballMatches = [...rawContent.matchAll(/class="[^"]*bool">(\d+)<\/div>/g)].map(m => parseInt(m[1], 10));
  const winningNumbers = ballMatches.slice(0, 6).sort((a, b) => a - b);
  const bonusNumber = (expectedGameType === 'power-6-55' && ballMatches.length > 6) ? ballMatches[6] : null;

  const jackpotMatch = rawContent.match(/id="DT6X[45]5_G_JACKPOT">([^<]+)/i) || 
                       rawContent.match(/class="giai_thuong_gia_tri"[^>]*><b>([^<]+)/i);
  let jackpotEst = jackpotMatch ? jackpotMatch[1].trim() : null;
  if (jackpotEst && !jackpotEst.endsWith('đ')) jackpotEst += ' đ';

  return {
    date: dateFormatted,
    drawId,
    gameType: expectedGameType,
    winningNumbers,
    bonusNumber,
    jackpotEst
  };
}

/**
 * Parse raw body của ngày mở thưởng XSMN
 */
export function parseXSMNRaw(rawContent, expectedStationId, expectedDate) {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Raw body content is empty or invalid');
  }

  // Trường hợp raw là JSON payload
  if (rawContent.trim().startsWith('{')) {
    try {
      const data = JSON.parse(rawContent);
      return {
        date: data.date || expectedDate,
        stationId: data.stationId || expectedStationId,
        stationName: data.stationName || '',
        drawId: data.drawId || null,
        specialPrize: data.specialPrize || (data.prizes && data.prizes.special ? data.prizes.special[0] : null),
        prizes: data.prizes || {},
        lottoPairs: data.lottoPairs || (data.prizes ? deriveLottoPairsFromPrizes(data.prizes) : [])
      };
    } catch (e) {
      // Fall through to regex
    }
  }

  // Trường hợp raw là HTML Minh Ngọc
  const dateMatch = rawContent.match(/class="ngay"[^>]*>[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i) ||
                    rawContent.match(/(\d{2}\/\d{2}\/\d{4})/);
  let dateFormatted = expectedDate;
  if (dateMatch) {
    const p = dateMatch[1].split('/');
    dateFormatted = `${p[2]}-${p[1]}-${p[0]}`;
  }

  // Trích xuất các giải từ block của đài
  function extractPrizeNumbers(block, className) {
    const regex = new RegExp(`class="${className}"[^>]*>([\\s\\S]*?)<\\/td>`, 'i');
    const m = block.match(regex);
    if (!m) return [];
    const divMatches = [...m[1].matchAll(/<div>([^<]+)<\/div>/g)].map(x => x[1].trim());
    if (divMatches.length > 0) return divMatches;
    const clean = m[1].replace(/<[^>]+>/g, '').trim();
    return clean ? clean.split(/[\s,-]+/).filter(Boolean) : [];
  }

  const special = extractPrizeNumbers(rawContent, 'giaidb');
  const first = extractPrizeNumbers(rawContent, 'giai1');
  const second = extractPrizeNumbers(rawContent, 'giai2');
  const third = extractPrizeNumbers(rawContent, 'giai3');
  const fourth = extractPrizeNumbers(rawContent, 'giai4');
  const fifth = extractPrizeNumbers(rawContent, 'giai5');
  const sixth = extractPrizeNumbers(rawContent, 'giai6');
  const seventh = extractPrizeNumbers(rawContent, 'giai7');
  const eighth = extractPrizeNumbers(rawContent, 'giai8');

  const prizes = { special, first, second, third, fourth, fifth, sixth, seventh, eighth };
  const specialPrize = special[0] || null;
  const lottoPairs = deriveLottoPairsFromPrizes(prizes);

  return {
    date: dateFormatted,
    stationId: expectedStationId,
    specialPrize,
    prizes,
    lottoPairs
  };
}
