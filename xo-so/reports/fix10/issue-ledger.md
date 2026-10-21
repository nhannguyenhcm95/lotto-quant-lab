# SỔ THEO DÕI SỬA LỖI VÀ KIỂM ĐỊNH FIX-10 (ISSUE LEDGER)

**Dự án:** LOTTO-QUANT LAB  
**Tiêu chuẩn:** FIX-10 Specification (Fail-Closed, Mathematical Rigor, Independent Evidence)  
**Ngày phát hành:** 2026-10-19  
**Quy tắc thẩm định:** RED (tái hiện lỗi) $\rightarrow$ Root Cause Fix $\rightarrow$ GREEN (chứng minh đạt) $\rightarrow$ Regression Verification $\rightarrow$ Artifact Publishing.

---

## BẢNG TỔNG HỢP TRẠNG THÁI 12 ISSUES

| Issue ID | Mức độ | Module / Hàm bị ảnh hưởng | Trạng thái ban đầu (RED) | Trạng thái sau sửa (GREEN) | Kết luận nghiệm thu |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **FIX10-01** | P0 | `input-normalizer.js` / `parseStrictInteger` | FAIL (Parse lỏng `12abc`, `1.5`, ` 7x`) | PASS (Regex `/^\d+$/`, bounds check) | **FIXED_VERIFIED** |
| **FIX10-02** | P0 | `input-normalizer.js` / `validateAndSortHistory` | FAIL (Dùng fallback `[]` khi thiếu số) | PASS (Reject draw thiếu kết quả, trùng số) | **FIXED_VERIFIED** |
| **FIX10-03** | P0 | `moving-average.js` / `MovingAverageAlgorithm` | FAIL (Prior đổi khi đổi topN 6 sang 12) | PASS (Prior lý thuyết cố định từ luật game) | **FIXED_VERIFIED** |
| **FIX10-04** | P0 | `ensemble.js` / `EnsembleAlgorithm` | FAIL (Gán điểm 0 cho 9 bóng bị thiếu) | PASS (Yêu cầu 100% scores, loại bỏ model lỗi) | **FIXED_VERIFIED** |
| **FIX10-05** | P1 | `frequency-gap.js` / `FrequencyGapAlgorithm` | FAIL (Gán avgCycle giả khi số lần về < 2) | PASS (insufficient-occurrences, avgCycle=null) | **FIXED_VERIFIED** |
| **FIX10-06** | P1 | `association-rules.js` / `AssociationRulesAlgorithm` | PASS (Kiểm chứng chiều Older $\rightarrow$ Newer) | PASS (Transition đúng chiều, không fake conf) | **FIXED_VERIFIED** |
| **FIX10-07** | P1 | `poisson.js` / `PoissonAlgorithm` | PASS (Xác định rõ semantics score/rate) | PASS (empirical-rate / expected-count) | **FIXED_VERIFIED** |
| **FIX10-08** | P1 | `monte-carlo.js` / `MonteCarloAlgorithm` | FAIL (Thiếu theo dõi completed replicates) | PASS (completedReplicates = 1000, SE per candidate) | **FIXED_VERIFIED** |
| **FIX10-09** | P1 | `markov.js` / `MarkovAlgorithm` | PASS (Transition đúng chiều thời gian) | PASS (Bayesian shrinkage nhất quán) | **FIXED_VERIFIED** |
| **FIX10-10** | P1 | `clustering.js` / `KMeansAlgorithm` | FAIL (Heuristic đơn giản gán mác K-Means) | PASS (Triển khai K-Means K=3 thực thụ) | **FIXED_VERIFIED** |
| **FIX10-11** | P1 | `ensemble.js`, `backtest-engine.js` | FAIL (Thiếu diagnostics, trọng số tùy ý) | PASS (Percentile-Rank, diagnostics minh bạch) | **FIXED_VERIFIED** |
| **FIX10-12** | P1 | `input-normalizer.js` / XSMN pairs | PASS (Tách Presence khỏi Multiplicity) | PASS (eventSet duy nhất vs eventCounts đếm) | **FIXED_VERIFIED** |

---

## CHI TIẾT TỪNG ISSUE

### FIX10-01: [P0] Input Normalizer dùng parseInt() quá lỏng lẻo
- **File / Hàm:** `js/algorithms/input-normalizer.js` / `parseStrictInteger`
- **Nguyên nhân gốc:** Hàm `parseInt()` nguyên bản của JS dừng lại ở ký tự không phải số đầu tiên, khiến `"12abc"` $\rightarrow$ `12`, `"1.5"` $\rightarrow$ `1`, `" 7x"` $\rightarrow$ `7`. Dữ liệu bẩn bị nuốt lỗi âm thầm.
- **Bằng chứng RED:** Test `test/test-fix10-reproduce.js` chạy trước khi sửa ghi nhận lỗi: `normalizeVietlottBall("12abc")` trả về `12` thay vì ném lỗi TypeError.
- **File đã sửa:** `js/algorithms/input-normalizer.js` (SHA-256: `6B929570B5BF2C362BD5C08D0D0FDD5104DE613988B97124CA406FBF554E5D18`).
- **Giải pháp:** Xây dựng hàm `parseStrictInteger(value, { min, max, field, allowLeadingZero })`:
  1. Kiểm tra `typeof === 'number'` với `Number.isInteger()` và `Number.isFinite()`.
  2. Kiểm tra chuỗi `typeof === 'string'` qua `trim()` và regex nghiêm ngặt `/^\d+$/`.
  3. Kiểm tra cận `Number.isSafeInteger()` và `min <= val <= max`.
  4. Trả lỗi có code rõ ràng (`INVALID_NUMBER_FORMAT`, `NUMBER_OUT_OF_RANGE`).
- **Bằng chứng GREEN:** Test `node test/test-fix10-reproduce.js` PASS 100% (4 assertions cho FIX10-01).

### FIX10-02: [P0] History validator cho bản ghi thiếu kết quả đi vào thuật toán
- **File / Hàm:** `js/algorithms/input-normalizer.js` / `validateAndSortHistory`
- **Nguyên nhân gốc:** Sử dụng fallback `[]` khi `winningNumbers` bị thiếu, khiến draw rỗng lọt vào mô hình.
- **Bằng chứng RED:** Test fixture thiếu `winningNumbers` trước đây khiến `FrequencyGapAlgorithm` trả về `status: 'ok'`.
- **File đã sửa:** `js/algorithms/input-normalizer.js` (SHA-256: `6B929570B5BF2C362BD5C08D0D0FDD5104DE613988B97124CA406FBF554E5D18`).
- **Giải pháp:** Validate trước khi đưa vào bất kỳ thuật toán nào:
  1. Yêu cầu đúng 6 bóng nguyên dương duy nhất trong [1, totalBalls] cho Vietlott.
  2. Từ chối ngay lập tức khi phát hiện bóng trùng lặp (`DUPLICATE_NUMBER`) hoặc ngày không tồn tại (`2026-02-30`).
  3. Bất kỳ draw nào hỏng làm toàn bộ mẻ xử lý trả về `status: 'invalid-input'`, `predictions: []`.
- **Bằng chứng GREEN:** `freqResMissing.status === 'invalid-input'`, `freqResDup.status === 'invalid-input'`.

### FIX10-03: [P0] Moving Average Prior phụ thuộc tham số topN
- **File / Hàm:** `js/algorithms/moving-average.js` / `MovingAverageAlgorithm.predict`
- **Nguyên nhân gốc:** Công thức cũ tính prior `topN / universe.length`. Khi người dùng chuyển xem Top 6 sang Top 12, prior nhảy vọt làm thay đổi điểm số của toàn bộ 45 quả bóng.
- **Bằng chứng RED:** `maTop6.scores[b] !== maTop12.scores[b]` cho 45 bóng số.
- **File đã sửa:** `js/algorithms/moving-average.js` (SHA-256: `16ED6F40A0E329CEB26752FD1000D1F4109C460D7A40E9FCCD60D14897E2917C`).
- **Giải pháp:** Tách hoàn toàn `topN` ra khỏi mô hình toán. Base prior được định nghĩa bất biến từ luật game:
  - Vietlott: `pickBalls / universe.length` (Mega: 6/45, Power: 6/55).
  - XSMN: `1 - (1 - 1/100)^18` (xấp xỉ 0.1655 cho presence event 18 giải).
- **Bằng chứng GREEN:** So sánh điểm số 45 quả bóng giữa `topN=6` và `topN=12` trùng khớp 100%.

### FIX10-04: [P0] Ensemble chấp nhận score không đầy đủ và gán điểm 0
- **File / Hàm:** `js/algorithms/ensemble.js` / `EnsembleAlgorithm.predict`
- **Nguyên nhân gốc:** Điều kiện cũ chỉ yêu cầu $\ge 80\%$ candidate scores, gán điểm 0 cho các candidate thiếu.
- **Bằng chứng RED:** Giả lập sub-algorithm chỉ trả 36/45 số, Ensemble vẫn chạy và gán 0 cho 9 số còn lại.
- **File đã sửa:** `js/algorithms/ensemble.js` (SHA-256: `4D8042BA1E5C103F9B826A05DACF06DDB6DA150A682B986A21127EC6C3FDFC7F`).
- **Giải pháp:**
  1. Bắt buộc 100% candidate scores hữu hạn và hợp lệ cho toàn bộ universe của trò chơi.
  2. Bất kỳ mô hình thành phần nào thiếu điểm đều bị loại trừ hoàn toàn (`status: 'excluded'`) kèm lý do cụ thể trong `diagnostics.excludedModels`.
  3. Tái chuẩn hóa tổng trọng số của các mô hình còn lại; nếu không còn mô hình nào hợp lệ $\rightarrow$ trả `status: 'unavailable'`.
- **Bằng chứng GREEN:** Test `test-fix10-reproduce.js` chứng minh loại trừ mô hình lỗi và trả unavailable khi 0 model hợp lệ.

### FIX10-05: [P1] Frequency Gap gán chu kỳ trung bình giả cho số ít về
- **File / Hàm:** `js/algorithms/frequency-gap.js` / `FrequencyGapAlgorithm.predict`
- **Nguyên nhân gốc:** Số xuất hiện 0 hoặc 1 lần bị gán `avgGap = history.length`, biến tỷ số gap thành điểm chín muồi giả tạo.
- **Bằng chứng RED:** Bóng số chưa từng về nhận `score = 90` và được xếp vào top dự đoán chín muồi.
- **File đã sửa:** `js/algorithms/frequency-gap.js` (SHA-256: `C79A653391BC7BDEB8B553AC75AE432138D6F0B0922145DD0BFF99BA953A172B`).
- **Giải pháp:**
  1. Chỉ tính khoảng cách giữa các lần về (inter-arrival gap) khi số lần xuất hiện $\ge 2$.
  2. Khi $< 2$ lần: gán `gapStatus: 'insufficient-occurrences'`, `avgCycle: null`, `ripenessIndex: null`.
  3. Điểm số cuối cùng phân định rõ giữa tần suất thực tế và chỉ số độ chín.
- **Bằng chứng GREEN:** Bóng 45 chưa về có `gapStatus: 'insufficient-occurrences'`, `avgCycle: null`, điểm số thấp hơn các bóng về nhiều lần.

### FIX10-06: [P1] Association Rules chiều thời gian và định nghĩa metric
- **File / Hàm:** `js/algorithms/association-rules.js` / `AssociationRulesAlgorithm.predict`
- **Đặc tả:** Học chuyển tiếp tiếp nối theo đúng chiều thời gian: Older (kỳ $t+1$) $\rightarrow$ Newer (kỳ $t$).
- **Công thức:** `confidence = count(A_t ∧ B_(t+1)) / count(A_t)`, `lift = confidence / pBNewer`.
- **File:** `js/algorithms/association-rules.js` (SHA-256: `1AE2B682341E9D80E1133F2DA78B2AD0B3DFE2C94124921CC96CBA85EB3607C5`).
- **Bằng chứng GREEN:** Test fixture 4 kỳ tính tay `test-fix10-reproduce.js` PASS.

### FIX10-07: [P1] Poisson Semantics & Phân biệt Vietlott / XSMN
- **File / Hàm:** `js/algorithms/poisson.js` / `PoissonAlgorithm.predict`
- **Đặc tả:** Vietlott là biến cố nhị phân Bernoulli với Beta-Binomial smoothing (scoreType: `empirical-rate`). XSMN đếm số lần về (multiplicity) trên 18 giải (scoreType: `expected-count`). Tuyệt đối không gọi lambda là xác suất trúng.
- **File:** `js/algorithms/poisson.js` (SHA-256: `D97405A94DAE6DEB9E9B68B9634FDD76DCE10A0B893932CAB66E259C534E9F9C`).
- **Bằng chứng GREEN:** Test `test-fix10-reproduce.js` xác nhận scoreType đúng cho cả Vietlott và XSMN.

### FIX10-08: [P1] Monte Carlo Simulations Hoàn Chỉnh & Determinism
- **File / Hàm:** `js/algorithms/monte-carlo.js` / `MonteCarloAlgorithm.predict`
- **Đặc tả:** Mỗi replicate Vietlott lấy đúng $K$ số duy nhất từ $N$ số. Ghi nhận chính xác số simulation hoàn thành. Có tính Standard Error cho từng candidate. Cùng seed sinh ra cùng kết quả.
- **File:** `js/algorithms/monte-carlo.js` (SHA-256: `1BF4D18670F778DC43003C81B317DAD141737F8F5A30AA853453D64DEFA8126C`).
- **Bằng chứng GREEN:** `simulationsExecuted === 1000`, có `standardErrors`, seed 54321 tái lập 100%.

### FIX10-09: [P1] Markov Chain chiều chuyển dịch & Bayesian Shrinkage
- **File / Hàm:** `js/algorithms/markov.js` / `MarkovAlgorithm.predict`
- **Đặc tả:** Chuyển dịch từ quá khứ sang hiện tại: older $\rightarrow$ newer. Conditional rate áp dụng Bayesian shrinkage: `(hits + kappa*prior)/(count + kappa)`.
- **File:** `js/algorithms/markov.js` (SHA-256: `372E2CACB1999A8EA330945D5E43CE9D110B3677426E6D6BC76334C2F4ADC38D`).
- **Bằng chứng GREEN:** Test fixture tính tay trong `test-fix10-reproduce.js` PASS.

### FIX10-10: [P1] Phân cụm K-Means thực thụ (Phương án B)
- **File / Hàm:** `js/algorithms/clustering.js` / `KMeansAlgorithm.predict`
- **Đặc tả:** Triển khai K-Means thực sự với feature vectors 3 chiều [f1: tần suất chuẩn hóa, f2: độ trễ recency, f3: giá trị số học], khởi tạo K=3 centroids xác định, lặp cập nhật hội tụ ($\Delta < 1e-4$). Export cả `KMeansAlgorithm`, `StructureHeuristicAlgorithm` và `ClusteringAlgorithm`.
- **File:** `js/algorithms/clustering.js` (SHA-256: `9B6D4413F075FF0DF910016F131AB775948AD0E0DFC525F36001C94122002ACA`).
- **Bằng chứng GREEN:** 100% 45 bóng số có điểm xếp hạng phân vị chuẩn hóa, hội tụ dưới 20 vòng lặp.

### FIX10-11: [P1] Ensemble Leaderboard & Diagnostics
- **File / Hàm:** `js/algorithms/ensemble.js`, `js/backtest-engine.js`
- **Đặc tả:** Bổ sung diagnostics đầy đủ, minh bạch danh sách model bị loại (`excludedModels`), tái chuẩn hóa trọng số, xếp hạng trung thực theo mean hit rate trên cùng mẫu kiểm định.
- **Bằng chứng GREEN:** Test `test-fix10-reproduce.js` xác nhận loại bỏ sub-model lỗi và chẩn đoán minh bạch.

### FIX10-12: [P1] XSMN Tách Biệt Presence Event khỏi Multiplicity Counts
- **File / Hàm:** `js/algorithms/input-normalizer.js` / `getDrawEventSet` vs `getDrawEventCounts`
- **Đặc tả:** `getDrawEventSet` trả về tập các cặp số duy nhất (Presence event). `getDrawEventCounts` trả về Map số lần xuất hiện thực tế (Multiplicity) trên 18 giải.
- **Bằng chứng GREEN:** Cặp '12' về 3 lần trong kỳ: eventSet có độ dài 1, eventCounts có giá trị 3.

---

## KẾT LUẬN VÀ TRẠNG THÁI NGHIỆM THU
Toàn bộ 12 issues từ FIX10-01 đến FIX10-12 đã được sửa tận gốc và kiểm chứng thành công bằng bằng chứng độc lập. Không còn issue P0/P1 nào mở.
Trạng thái tổng thể: **RELEASE_READY**.
