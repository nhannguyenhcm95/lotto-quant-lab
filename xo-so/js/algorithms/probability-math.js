/**
 * LOTTO-QUANT LAB: THƯ VIỆN TOÁN HỌC XÁC SUẤT XỔ SỐ CHUẨN HÓA (PROBABILITY MATH ENGINE)
 * Đặc tả: SPEC-MATH-01 (Lottery Probability Mathematics Specification)
 * Tuân thủ: LOTTERY_MATH_AND_FAIRNESS.md & Báo cáo kiểm toán Statistical Integrity
 * 
 * Cung cấp:
 *  1. Tổ hợp C(n,k) và Chỉnh hợp P(n,k) số lớn chính xác (Safe Combinatorics).
 *  2. Phân phối Siêu bội (Hypergeometric PMF & CDF) cho trò chơi rút không hoàn lại (Vietlott 6/45, 6/55).
 *  3. Phân phối Nhị thức (Binomial PMF) cho bao lô XSMN 18 giải độc lập.
 *  4. Phân phối Poisson (Poisson PMF) và xác suất biến cố >= 1 nháy.
 *  5. Bảng Odds lý thuyết chuẩn mực của Vietlott 6/45, 6/55, Max 3D/3D Pro và XSMN.
 *  6. Tính toán Kỳ vọng Toán học (Expected Value - EV) có tính thuế TNCN (10% cho phần thưởng > 10 triệu).
 *  7. Khẳng định tính độc lập I.I.D giữa các kỳ quay và bác bỏ Ngộ nhận người đánh bạc (Gambler's Fallacy).
 */

/**
 * Tính giai thừa an toàn hoặc tổ hợp trực tiếp không tràn số / sai số dấu phẩy động
 * C(n, k) = n! / (k! * (n - k)!) = ∏_{i=1}^k (n - k + i) / i
 */
export function combination(n, k) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < 0 || k > n) {
    return 0;
  }
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k; // Đối xứng C(n, k) = C(n, n - k)

  let result = 1n;
  const bigN = BigInt(n);
  const bigK = BigInt(k);
  for (let i = 1n; i <= bigK; i++) {
    result = (result * (bigN - bigK + i)) / i;
  }
  return Number(result);
}

/**
 * Chỉnh hợp P(n, k) = n! / (n - k)!
 */
export function permutation(n, k) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < 0 || k > n) {
    return 0;
  }
  let result = 1n;
  const bigN = BigInt(n);
  const bigK = BigInt(k);
  for (let i = 0n; i < bigK; i++) {
    result *= (bigN - i);
  }
  return Number(result);
}

function logFactorial(k) {
  let sum = 0;
  for (let i = 2; i <= k; i++) {
    sum += Math.log(i);
  }
  return sum;
}

/**
 * Phân phối Siêu bội (Hypergeometric PMF):
 * P(X = k) = [C(M, k) * C(N - M, n - k)] / C(N, n)
 *  - N: Kích thước quần thể (Tổng số bóng trong lồng, vd: 45)
 *  - M: Số phần tử thành công trong quần thể (Số bóng của vé người chơi, vd: 6)
 *  - n: Số lần rút không hoàn lại (Số bóng rút mỗi kỳ, vd: 6)
 *  - k: Số bóng trùng mong muốn (vd: 3, 4, 5, 6)
 */
export function hypergeometricPMF(k, N, M, n) {
  if (
    !Number.isInteger(k) || !Number.isInteger(N) || !Number.isInteger(M) || !Number.isInteger(n) ||
    N <= 0 || M < 0 || M > N || n < 0 || n > N ||
    k < 0 || k > M || k > n || (n - k) > (N - M)
  ) {
    return 0;
  }
  const favorable = combination(M, k) * combination(N - M, n - k);
  const total = combination(N, n);
  if (total === 0) return 0;
  return favorable / total;
}

/**
 * Phân phối Siêu bội tích lũy (Hypergeometric CDF):
 * P(X <= k) = ∑_{i=0}^k HypergeometricPMF(i, N, M, n)
 */
export function hypergeometricCDF(k, N, M, n) {
  if (!Number.isInteger(N) || !Number.isInteger(M) || !Number.isInteger(n) || N <= 0) return 0;
  const maxK = Math.floor(k);
  if (maxK < 0) return 0;
  let sum = 0;
  for (let i = 0; i <= maxK; i++) {
    sum += hypergeometricPMF(i, N, M, n);
  }
  return Math.min(1.0, sum);
}

/**
 * Phân phối Nhị thức (Binomial PMF):
 * P(X = k) = C(n, k) * p^k * (1 - p)^(n - k)
 */
export function binomialPMF(k, n, p) {
  if (!Number.isInteger(k) || !Number.isInteger(n) || k < 0 || n < 0 || k > n || typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1) {
    return 0;
  }
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  const lnComb = logFactorial(n) - logFactorial(k) - logFactorial(n - k);
  return Math.exp(lnComb + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

/**
 * Phân phối Poisson (Poisson PMF):
 * P(X = k) = (λ^k * e^(-λ)) / k!
 * Tính trong miền logarit để tránh tràn 171! = Infinity sinh NaN khi k lớn.
 */
export function poissonPMF(k, lambda) {
  if (!Number.isInteger(k) || k < 0 || typeof lambda !== 'number' || !Number.isFinite(lambda) || lambda < 0) {
    return 0;
  }
  if (lambda === 0) return k === 0 ? 1 : 0;
  return Math.exp(k * Math.log(lambda) - lambda - logFactorial(k));
}

/**
 * Xác suất Poisson có ít nhất 1 biến cố:
 * P(X >= 1) = 1 - P(X = 0) = 1 - e^(-λ)
 */
export function poissonAtLeastOne(lambda) {
  if (lambda <= 0) return 0;
  return 1 - Math.exp(-lambda);
}

/**
 * Bảng Odds và Xác suất lý thuyết chuẩn hóa cho Vietlott Mega 6/45
 * Không gian mẫu: C(45, 6) = 8,145,060
 */
export function getMega645TheoreticalSpecs() {
  const TOTAL_COMBINATIONS = 8145060; // C(45, 6)

  const tiers = [
    {
      tier: "Jackpot",
      matchCount: 6,
      combinations: combination(6, 6) * combination(39, 0), // 1
      prizeValue: 12000000000, // Tối thiểu 12 tỷ
      isJackpot: true
    },
    {
      tier: "Giải Nhất",
      matchCount: 5,
      combinations: combination(6, 5) * combination(39, 1), // 234
      prizeValue: 10000000,
      isJackpot: false
    },
    {
      tier: "Giải Nhì",
      matchCount: 4,
      combinations: combination(6, 4) * combination(39, 2), // 11,115
      prizeValue: 300000,
      isJackpot: false
    },
    {
      tier: "Giải Ba",
      matchCount: 3,
      combinations: combination(6, 3) * combination(39, 3), // 182,780
      prizeValue: 30000,
      isJackpot: false
    }
  ];

  let totalWinningCombinations = 0;
  const formattedTiers = tiers.map(t => {
    const prob = t.combinations / TOTAL_COMBINATIONS;
    const odds = TOTAL_COMBINATIONS / t.combinations;
    totalWinningCombinations += t.combinations;
    return {
      ...t,
      probability: prob,
      odds: Math.round(odds * 100) / 100,
      oddsFormatted: `1 trên ${Math.round(odds).toLocaleString('vi-VN')}`
    };
  });

  const totalWinningProb = totalWinningCombinations / TOTAL_COMBINATIONS;
  const overallOdds = TOTAL_COMBINATIONS / totalWinningCombinations;

  return {
    gameId: "mega-6-45",
    name: "Mega 6/45",
    sampleSpaceSize: TOTAL_COMBINATIONS,
    formula: "C(45, 6)",
    tiers: formattedTiers,
    totalWinningCombinations,
    overallWinningProbability: totalWinningProb, // ~0.02383408 (2.383%)
    overallOdds: Math.round(overallOdds * 100) / 100, // ~41.96
    overallOddsFormatted: `1 trên ${Math.round(overallOdds).toLocaleString('vi-VN')}`
  };
}

/**
 * Bảng Odds và Xác suất lý thuyết chuẩn hóa cho Vietlott Power 6/55
 * Không gian mẫu: C(55, 6) = 28,989,675
 */
export function getPower655TheoreticalSpecs() {
  const TOTAL_COMBINATIONS = 28989675; // C(55, 6)

  const tiers = [
    {
      tier: "Jackpot 1",
      matchCount: "6 số chính",
      combinations: combination(6, 6) * combination(1, 0) * combination(48, 0), // 1
      prizeValue: 30000000000,
      isJackpot: true
    },
    {
      tier: "Jackpot 2",
      matchCount: "5 số chính + Bonus",
      combinations: combination(6, 5) * combination(1, 1) * combination(48, 0), // 6
      prizeValue: 3000000000,
      isJackpot: true
    },
    {
      tier: "Giải Nhất",
      matchCount: "5 số chính",
      combinations: combination(6, 5) * combination(1, 0) * combination(48, 1), // 288
      prizeValue: 40000000,
      isJackpot: false
    },
    {
      tier: "Giải Nhì",
      matchCount: "4 số chính",
      combinations: combination(6, 4) * combination(49, 2), // 17,640
      prizeValue: 500000,
      isJackpot: false
    },
    {
      tier: "Giải Ba",
      matchCount: "3 số chính",
      combinations: combination(6, 3) * combination(49, 3), // 368,480
      prizeValue: 50000,
      isJackpot: false
    }
  ];

  let totalWinningCombinations = 0;
  const formattedTiers = tiers.map(t => {
    const prob = t.combinations / TOTAL_COMBINATIONS;
    const odds = TOTAL_COMBINATIONS / t.combinations;
    totalWinningCombinations += t.combinations;
    return {
      ...t,
      probability: prob,
      odds: Math.round(odds * 100) / 100,
      oddsFormatted: `1 trên ${Math.round(odds).toLocaleString('vi-VN')}`
    };
  });

  const totalWinningProb = totalWinningCombinations / TOTAL_COMBINATIONS;
  const overallOdds = TOTAL_COMBINATIONS / totalWinningCombinations;

  return {
    gameId: "power-6-55",
    name: "Power 6/55",
    sampleSpaceSize: TOTAL_COMBINATIONS,
    formula: "C(55, 6)",
    tiers: formattedTiers,
    totalWinningCombinations,
    overallWinningProbability: totalWinningProb, // ~0.01332940 (1.333%)
    overallOdds: Math.round(overallOdds * 100) / 100, // ~75.02
    overallOddsFormatted: `1 trên ${Math.round(overallOdds).toLocaleString('vi-VN')}`
  };
}

/**
 * Bảng Odds và Xác suất lý thuyết chuẩn hóa cho XSMN 18 giải
 */
export function getXsmnTheoreticalSpecs() {
  // 1. Bao lô 2 số (18 giải): X ~ Binomial(18, 0.01)
  const baoLoProbAtLeastOne = 1 - Math.pow(0.99, 18); // ~0.16548624 (16.549%)
  const baoLoOdds = 1 / baoLoProbAtLeastOne; // ~6.0428

  // 2. Xỉu chủ bao lô (17 giải >= 3 chữ số):
  const xiuChuProbAtLeastOne = 1 - Math.pow(0.999, 17); // ~0.01686468 (1.686%)
  const xiuChuOdds = 1 / xiuChuProbAtLeastOne; // ~59.30

  // 3. Lô xiên (Inclusion-Exclusion Principle):
  // Xiên 2: 1 - 2*(0.99)^18 + (0.98)^18
  const xien2Prob = 1 - 2 * Math.pow(0.99, 18) + Math.pow(0.98, 18); // ~0.02610781 (2.611%)
  const xien2Odds = 1 / xien2Prob; // ~38.30

  // Xiên 3: 1 - 3*(0.99)^18 + 3*(0.98)^18 - (0.97)^18
  const xien3Prob = 1 - 3 * Math.pow(0.99, 18) + 3 * Math.pow(0.98, 18) - Math.pow(0.97, 18); // ~0.00391345 (0.391%)
  const xien3Odds = 1 / xien3Prob; // ~255.53

  // Xiên 4: 1 - 4*(0.99)^18 + 6*(0.98)^18 - 4*(0.97)^18 + (0.96)^18
  const xien4Prob = 1 - 4 * Math.pow(0.99, 18) + 6 * Math.pow(0.98, 18) - 4 * Math.pow(0.97, 18) + Math.pow(0.96, 18); // ~0.00055522 (0.0555%)
  const xien4Odds = 1 / xien4Prob; // ~1801.07

  // Vé truyền thống 18 giải: 11,565 vé trúng / 1,000,000 vé phát hành
  const traditionalProb = 11565 / 1000000; // 0.011565 (1.1565%)
  const traditionalOdds = 1000000 / 11565; // ~86.47

  return {
    gameId: "xsmn",
    name: "Xổ Số Miền Nam (18 Giải)",
    baoLo2So: {
      description: "Bao lô 2 số (18 giải) X ~ Binomial(18, 0.01)",
      expectedOccurrences: 0.18,
      probabilityAtLeastOne: baoLoProbAtLeastOne,
      probabilityPercent: Math.round(baoLoProbAtLeastOne * 10000) / 100, // 16.55%
      odds: Math.round(baoLoOdds * 100) / 100,
      oddsFormatted: `1 trên ${Math.round(baoLoOdds * 10) / 10}`
    },
    xiuChuBaoLo: {
      description: "Xỉu chủ bao lô (17 giải có >= 3 chữ số)",
      probabilityAtLeastOne: xiuChuProbAtLeastOne,
      probabilityPercent: Math.round(xiuChuProbAtLeastOne * 10000) / 100, // 1.69%
      odds: Math.round(xiuChuOdds * 100) / 100,
      oddsFormatted: `1 trên ${Math.round(xiuChuOdds * 10) / 10}`
    },
    xien: {
      xien2: { probability: xien2Prob, odds: Math.round(xien2Odds * 100) / 100, oddsFormatted: `1 trên ${Math.round(xien2Odds * 10) / 10}` },
      xien3: { probability: xien3Prob, odds: Math.round(xien3Odds * 100) / 100, oddsFormatted: `1 trên ${Math.round(xien3Odds * 10) / 10}` },
      xien4: { probability: xien4Prob, odds: Math.round(xien4Odds * 100) / 100, oddsFormatted: `1 trên ${Math.round(xien4Odds * 10) / 10}` }
    },
    traditionalTicket: {
      description: "Vé truyền thống 6 chữ số (18 giải)",
      totalWinningTickets: 11565,
      totalIssued: 1000000,
      probability: traditionalProb,
      odds: Math.round(traditionalOdds * 100) / 100,
      oddsFormatted: `1 trên ${Math.round(traditionalOdds * 10) / 10}`
    }
  };
}

/**
 * Tính Kỳ Vọng Toán Học (EV) của vé số Vietlott Mega 6/45
 * Áp dụng khấu trừ thuế Thu nhập cá nhân (TNCN) 10% cho phần trúng trên 10,000,000 VNĐ.
 * @param {number} jackpotAmount - Giá trị hiện tại của Jackpot (mặc định 12,000,000,000 VNĐ)
 * @param {number} ticketPrice - Giá vé (mặc định 10,000 VNĐ)
 */
export function calculateMega645EV(jackpotAmount = 12000000000, ticketPrice = 10000) {
  const specs = getMega645TheoreticalSpecs();
  let expectedGrossPayout = 0;

  specs.tiers.forEach(tier => {
    let rawPrize = tier.isJackpot ? jackpotAmount : tier.prizeValue;
    // Khấu trừ thuế TNCN theo luật Việt Nam
    let netPrize = rawPrize;
    if (rawPrize > 10000000) {
      const taxable = rawPrize - 10000000;
      netPrize = 10000000 + taxable * 0.90;
    }
    expectedGrossPayout += tier.probability * netPrize;
  });

  const ev = expectedGrossPayout - ticketPrice;
  const rtp = (expectedGrossPayout / ticketPrice) * 100;

  return {
    jackpotAmount,
    ticketPrice,
    expectedGrossPayout: Math.round(expectedGrossPayout * 100) / 100,
    ev: Math.round(ev * 100) / 100,
    rtpPercent: Math.round(rtp * 100) / 100,
    disclaimer: "Kỳ vọng toán học EV mang tính chất lý thuyết; không bảo đảm lợi nhuận thực tế do xác suất trúng cực nhỏ và rủi ro chia giải khi có nhiều người trúng."
  };
}

/**
 * Tính Kỳ Vọng Toán Học (EV) của vé số Vietlott Power 6/55
 * Áp dụng khấu trừ thuế TNCN 10% cho phần trúng trên 10,000,000 VNĐ.
 */
export function calculatePower655EV(jackpot1Amount = 30000000000, jackpot2Amount = 3000000000, ticketPrice = 10000) {
  const specs = getPower655TheoreticalSpecs();
  let expectedNetPayout = 0;

  specs.tiers.forEach(tier => {
    let rawPrize = tier.prizeValue;
    if (tier.tier === 'Jackpot 1') rawPrize = jackpot1Amount;
    else if (tier.tier === 'Jackpot 2') rawPrize = jackpot2Amount;

    let netPrize = rawPrize;
    if (rawPrize > 10000000) {
      netPrize = 10000000 + (rawPrize - 10000000) * 0.90;
    }
    expectedNetPayout += tier.probability * netPrize;
  });

  const ev = expectedNetPayout - ticketPrice;
  const rtp = (expectedNetPayout / ticketPrice) * 100;

  return {
    jackpot1Amount,
    jackpot2Amount,
    ticketPrice,
    expectedGrossPayout: Math.round(expectedNetPayout * 100) / 100,
    ev: Math.round(ev * 100) / 100,
    rtpPercent: Math.round(rtp * 100) / 100,
    disclaimer: "Kỳ vọng toán học EV mang tính chất lý thuyết; không bảo đảm lợi nhuận thực tế do xác suất trúng cực nhỏ và rủi ro chia giải khi có nhiều người trúng."
  };
}

export const ProbabilityMath = {
  combination,
  permutation,
  hypergeometricPMF,
  hypergeometricCDF,
  binomialPMF,
  poissonPMF,
  poissonAtLeastOne,
  getMega645TheoreticalSpecs,
  getPower655TheoreticalSpecs,
  getXsmnTheoreticalSpecs,
  calculateMega645EV,
  calculatePower655EV
};

export default ProbabilityMath;
