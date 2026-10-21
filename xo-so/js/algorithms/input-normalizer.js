/**
 * LOTTO-QUANT LAB: COMMON INPUT NORMALIZER & CANONICAL DATA CONTRACT (FIX-10)
 * 
 * Hợp đồng dữ liệu chung cho toàn bộ 8 thuật toán, Ensemble và Backtest Engine:
 *  1. Strict ISO Date Validation (UTC-only, không tự trôi ngày như 2026-02-30).
 *  2. Thứ tự thời gian chuẩn hóa: historyData[0] luôn là kỳ mới nhất (Newest-First).
 *  3. Canonical Number Representation:
 *     - Vietlott: Integer 1..45 hoặc 1..55, không trùng lặp trong cùng kỳ.
 *     - XSMN: Chuỗi 2 chữ số '00'..'99'. (1, '1', '01' đều thành '01').
 *  4. Tách biệt rõ ràng:
 *     - eventSet: Tập các số xuất hiện ít nhất một lần trong kỳ (Presence / Indicator).
 *     - eventCounts: Tần suất số lần xuất hiện trong kỳ (Multiplicity).
 *  5. parseStrictInteger: Từ chối triệt để chuỗi không chuẩn ("12abc", "1.5", " 7x").
 *  6. validateAndSortHistory: Chặn đứng bản ghi thiếu trường bắt buộc hoặc trùng bóng số.
 */

/**
 * Kiểm tra và chuyển đổi ngày ISO (YYYY-MM-DD) sang ngày trong tuần (0: Chủ Nhật, 1: Thứ Hai, ..., 6: Thứ Bảy)
 * Kiểm tra nghiêm ngặt tính hợp lệ của lịch (Strict Calendar Validity)
 */
export function strictUtcDayOfWeek(isoDate) {
  if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const err = new TypeError(`Date must be formatted as YYYY-MM-DD, got: ${isoDate}`);
    err.code = 'INVALID_DATE_FORMAT';
    throw err;
  }
  const dt = new Date(`${isoDate}T00:00:00.000Z`);
  if (!Number.isFinite(dt.getTime()) || dt.toISOString().slice(0, 10) !== isoDate) {
    const err = new RangeError(`Invalid calendar date: ${isoDate}`);
    err.code = 'INVALID_CALENDAR_DATE';
    throw err;
  }
  return dt.getUTCDay();
}

/**
 * Phân tích số nguyên nghiêm ngặt (FIX10-01)
 * Không dùng parseInt() lỏng lẻo; từ chối triệt để float, chuỗi lẫn ký tự, Infinity, NaN.
 */
export function parseStrictInteger(value, { min, max, field = 'value' } = {}) {
  let parsed;

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      const err = new TypeError(`${field}: expected a finite integer, got: ${value}`);
      err.code = 'INVALID_NUMBER_FORMAT';
      throw err;
    }
    parsed = value;
  } else if (typeof value === 'string') {
    const text = value.trim();
    if (!/^\d+$/.test(text)) {
      const err = new TypeError(`${field}: invalid integer format (got "${value}")`);
      err.code = 'INVALID_NUMBER_FORMAT';
      throw err;
    }
    parsed = Number(text);
  } else {
    const err = new TypeError(`${field}: unsupported value type (${typeof value})`);
    err.code = 'INVALID_NUMBER_FORMAT';
    throw err;
  }

  if (!Number.isSafeInteger(parsed)) {
    const err = new TypeError(`${field}: value is not a safe integer`);
    err.code = 'INVALID_NUMBER_FORMAT';
    throw err;
  }

  if (min !== undefined && parsed < min) {
    const err = new RangeError(`${field}: value ${parsed} outside [${min}, ${max ?? 'Infinity'}]`);
    err.code = 'NUMBER_OUT_OF_RANGE';
    throw err;
  }
  if (max !== undefined && parsed > max) {
    const err = new RangeError(`${field}: value ${parsed} outside [${min ?? '-Infinity'}, ${max}]`);
    err.code = 'NUMBER_OUT_OF_RANGE';
    throw err;
  }

  return parsed;
}

/**
 * Chuẩn hóa quả bóng Vietlott thành số nguyên trong miền 1..totalBalls
 */
export function normalizeVietlottBall(value, totalBalls = 45) {
  return parseStrictInteger(value, { min: 1, max: totalBalls, field: 'Vietlott ball' });
}

/**
 * Chuẩn hóa cặp số lô tô XSMN thành chuỗi 2 ký tự '00'..'99'
 */
export function normalizeLottoPair(value) {
  if (value === null || value === undefined) {
    const err = new TypeError('Lotto pair cannot be null or undefined');
    err.code = 'INVALID_NUMBER_FORMAT';
    throw err;
  }

  let text;
  if (typeof value === 'number') {
    const intVal = parseStrictInteger(value, { min: 0, max: 99, field: 'Lotto pair' });
    return String(intVal).padStart(2, '0');
  } else if (typeof value === 'string') {
    text = value.trim();
    if (!/^\d{1,2}$/.test(text)) {
      const err = new RangeError(`Invalid lotto pair format: "${value}" (must be 1-2 digits)`);
      err.code = 'INVALID_NUMBER_FORMAT';
      throw err;
    }
    return text.padStart(2, '0');
  } else {
    const err = new TypeError(`Lotto pair unsupported type: ${typeof value}`);
    err.code = 'INVALID_NUMBER_FORMAT';
    throw err;
  }
}

/**
 * So sánh 2 số chuẩn hóa canonical (deterministic tie-breaking)
 */
export function compareCanonical(a, b) {
  const numA = Number(a);
  const numB = Number(b);
  if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
    return numA - numB;
  }
  return String(a).localeCompare(String(b));
}

export const compareCanonicalNumbers = compareCanonical;

/**
 * Trích xuất tập hợp các số trúng (Presence - không trùng lặp) cho một kỳ quay
 * Bắt buộc kiểm tra tính hợp lệ của draw; không dùng fallback [] khi thiếu dữ liệu (FIX10-02)
 */
export function getDrawEventSet(draw, options = {}) {
  if (!draw || typeof draw !== 'object') {
    const err = new TypeError('Draw must be a non-null object');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const isVietlott = options.isVietlott !== undefined 
    ? Boolean(options.isVietlott)
    : (draw.gameType === 'mega-6-45' || draw.gameType === 'power-6-55');
  const totalBalls = options.totalBalls || (draw.gameType === 'power-6-55' ? 55 : 45);

  if (isVietlott) {
    if (!Array.isArray(draw.winningNumbers) || draw.winningNumbers.length !== 6) {
      const err = new TypeError(`Vietlott draw ${draw.drawId || ''} missing valid winningNumbers array of 6 balls`);
      err.code = 'INVALID_WINNING_NUMBERS';
      throw err;
    }
    const ballSet = new Set();
    for (const b of draw.winningNumbers) {
      ballSet.add(normalizeVietlottBall(b, totalBalls));
    }
    if (ballSet.size !== 6) {
      const err = new RangeError(`Vietlott draw ${draw.drawId || ''} contains duplicate winning numbers`);
      err.code = 'DUPLICATE_NUMBER';
      throw err;
    }
    return Array.from(ballSet).sort((a, b) => a - b);
  } else {
    // XSMN: Lấy từ lottoPairs hoặc derive từ prizes
    let rawPairs = draw.lottoPairs;
    if (!Array.isArray(rawPairs) && draw.prizes && typeof draw.prizes === 'object') {
      rawPairs = [];
      Object.values(draw.prizes).forEach(p => {
        if (Array.isArray(p)) {
          p.forEach(numStr => {
            if (typeof numStr === 'string' && numStr.length >= 2) {
              rawPairs.push(numStr.slice(-2));
            }
          });
        }
      });
    }

    if (!Array.isArray(rawPairs) || rawPairs.length === 0) {
      const err = new TypeError(`XSMN draw ${draw.drawId || ''} missing lottoPairs or prizes`);
      err.code = 'INVALID_LOTTO_PAIRS';
      throw err;
    }

    const pairSet = new Set();
    for (const p of rawPairs) {
      pairSet.add(normalizeLottoPair(p));
    }
    return Array.from(pairSet).sort();
  }
}

/**
 * Trích xuất số lần xuất hiện (Multiplicity) cho từng số trong một kỳ quay
 */
export function getDrawEventCounts(draw, options = {}) {
  if (!draw || typeof draw !== 'object') {
    const err = new TypeError('Draw must be a non-null object');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const isVietlott = options.isVietlott !== undefined 
    ? Boolean(options.isVietlott) 
    : (draw.gameType === 'mega-6-45' || draw.gameType === 'power-6-55');
  const totalBalls = options.totalBalls || (draw.gameType === 'power-6-55' ? 55 : 45);
  const counts = new Map();

  if (isVietlott) {
    if (!Array.isArray(draw.winningNumbers) || draw.winningNumbers.length !== 6) {
      const err = new TypeError(`Vietlott draw ${draw.drawId || ''} missing valid winningNumbers array of 6 balls`);
      err.code = 'INVALID_WINNING_NUMBERS';
      throw err;
    }
    const set = new Set();
    for (const b of draw.winningNumbers) {
      const norm = normalizeVietlottBall(b, totalBalls);
      if (set.has(norm)) {
        const err = new RangeError(`Vietlott draw ${draw.drawId || ''} contains duplicate winning numbers`);
        err.code = 'DUPLICATE_NUMBER';
        throw err;
      }
      set.add(norm);
      counts.set(norm, (counts.get(norm) || 0) + 1);
    }
  } else {
    let rawPairs = draw.lottoPairs;
    if (!Array.isArray(rawPairs) && draw.prizes && typeof draw.prizes === 'object') {
      rawPairs = [];
      Object.values(draw.prizes).forEach(p => {
        if (Array.isArray(p)) {
          p.forEach(numStr => {
            if (typeof numStr === 'string' && numStr.length >= 2) {
              rawPairs.push(numStr.slice(-2));
            }
          });
        }
      });
    }

    if (!Array.isArray(rawPairs) || rawPairs.length === 0) {
      const err = new TypeError(`XSMN draw ${draw.drawId || ''} missing lottoPairs or prizes`);
      err.code = 'INVALID_LOTTO_PAIRS';
      throw err;
    }

    for (const p of rawPairs) {
      const norm = normalizeLottoPair(p);
      counts.set(norm, (counts.get(norm) || 0) + 1);
    }
  }

  return counts;
}

/**
 * Kiểm tra và chuẩn hóa mảng lịch sử (History):
 *  - Đảm bảo không mutate mảng đầu vào
 *  - Sắp xếp đảm bảo Newest-First (kỳ mới nhất ở index 0)
 *  - Validate tính hợp lệ của ngày tháng và cấu trúc kỳ (FIX10-02)
 */
export function validateAndSortHistory(historyData, options = {}) {
  if (!Array.isArray(historyData)) {
    const err = new TypeError('History data must be an array');
    err.code = 'INVALID_INPUT';
    throw err;
  }
  if (historyData.length === 0) {
    return [];
  }

  const isVietlott = options.isVietlott !== undefined 
    ? Boolean(options.isVietlott) 
    : undefined;
  const totalBalls = options.totalBalls || 45;

  // Clone để không mutate input gốc và validate từng bản ghi
  const cloned = historyData.map((d, idx) => {
    if (!d || typeof d !== 'object') {
      const err = new TypeError(`Draw at index ${idx} is not an object`);
      err.code = 'INVALID_INPUT';
      throw err;
    }
    if (!d.date) {
      const err = new Error(`Draw at index ${idx} is missing date`);
      err.code = 'MISSING_DATE';
      throw err;
    }
    // Validate ngày nghiêm ngặt (Strict Calendar Validity)
    strictUtcDayOfWeek(d.date);

    // Xác định loại game của draw
    const drawIsVietlott = isVietlott !== undefined 
      ? isVietlott 
      : (d.gameType === 'mega-6-45' || d.gameType === 'power-6-55' || Array.isArray(d.winningNumbers));

    if (drawIsVietlott) {
      if (!Array.isArray(d.winningNumbers) || d.winningNumbers.length !== 6) {
        const err = new TypeError(`Draw at index ${idx} (${d.drawId || d.date}) must contain winningNumbers with exactly 6 balls`);
        err.code = 'INVALID_WINNING_NUMBERS';
        throw err;
      }
      const ballSet = new Set();
      const normBalls = [];
      for (const b of d.winningNumbers) {
        const norm = normalizeVietlottBall(b, totalBalls);
        if (ballSet.has(norm)) {
          const err = new RangeError(`Draw at index ${idx} (${d.drawId || d.date}) contains duplicate ball: ${norm}`);
          err.code = 'DUPLICATE_NUMBER';
          throw err;
        }
        ballSet.add(norm);
        normBalls.push(norm);
      }

      // Kiểm tra bonusNumber nếu có
      if (d.bonusNumber !== undefined && d.bonusNumber !== null) {
        const bonusNorm = normalizeVietlottBall(d.bonusNumber, totalBalls);
        if (ballSet.has(bonusNorm)) {
          const err = new RangeError(`Draw at index ${idx} (${d.drawId || d.date}) bonusNumber duplicates winning numbers: ${bonusNorm}`);
          err.code = 'DUPLICATE_NUMBER';
          throw err;
        }
      }

      return {
        ...d,
        winningNumbers: normBalls
      };
    } else {
      // XSMN
      let rawPairs = d.lottoPairs;
      if (!Array.isArray(rawPairs) && d.prizes && typeof d.prizes === 'object') {
        rawPairs = [];
        Object.values(d.prizes).forEach(p => {
          if (Array.isArray(p)) {
            p.forEach(numStr => {
              if (typeof numStr === 'string' && numStr.length >= 2) {
                rawPairs.push(numStr.slice(-2));
              }
            });
          }
        });
      }

      if (!Array.isArray(rawPairs) || rawPairs.length === 0) {
        const err = new TypeError(`Draw at index ${idx} (${d.drawId || d.date}) missing lottoPairs or prizes`);
        err.code = 'INVALID_LOTTO_PAIRS';
        throw err;
      }

      const normPairs = rawPairs.map(p => normalizeLottoPair(p));
      return {
        ...d,
        lottoPairs: normPairs
      };
    }
  });

  // Sắp xếp Newest-First theo date giảm dần, nếu cùng date thì theo drawId giảm dần
  cloned.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    const drawA = String(a.drawId || '');
    const drawB = String(b.drawId || '');
    return drawB.localeCompare(drawA);
  });

  return cloned;
}

/**
 * Chuẩn hóa lịch sử hoàn chỉnh kèm theo eventSet và eventCounts cho từng draw
 */
export function normalizeHistory(historyData, options = {}) {
  const sorted = validateAndSortHistory(historyData, options);
  const isVietlott = Boolean(options.isVietlott);
  const totalBalls = options.totalBalls || (isVietlott ? 45 : 100);

  return sorted.map(d => {
    const eventSet = getDrawEventSet(d, { isVietlott, totalBalls });
    const eventCounts = getDrawEventCounts(d, { isVietlott, totalBalls });
    return {
      ...d,
      eventSet,
      eventCounts
    };
  });
}

/**
 * Tạo Universe tập các candidate chuẩn cho từng game (trả về mảng có kèm metadata .min, .max, .size, .members)
 */
export function getUniverse(options = {}) {
  const isVietlott = Boolean(options.isVietlott);
  const totalBalls = options.totalBalls || (isVietlott ? 45 : 100);

  const universe = [];
  if (isVietlott) {
    for (let i = 1; i <= totalBalls; i++) {
      universe.push(i);
    }
    universe.min = 1;
    universe.max = totalBalls;
  } else {
    for (let i = 0; i <= 99; i++) {
      universe.push(String(i).padStart(2, '0'));
    }
    universe.min = 0;
    universe.max = 99;
  }

  universe.size = universe.length;
  universe.members = universe;
  return universe;
}

export const InputNormalizer = {
  strictUtcDayOfWeek,
  parseStrictInteger,
  normalizeVietlottBall,
  normalizeLottoPair,
  compareCanonical,
  compareCanonicalNumbers: compareCanonical,
  getDrawEventSet,
  getDrawEventCounts,
  validateAndSortHistory,
  normalizeHistory,
  getUniverse
};

export default InputNormalizer;
