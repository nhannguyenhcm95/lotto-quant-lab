# SỔ THEO DÕI VÀ ĐÓNG LỖI KỸ THUẬT (ISSUE LEDGER) — FIX-9
**Dự án:** LOTTO-QUANT LAB  
**Chuẩn kiểm định:** Fail-Closed (Không đóng lỗi khi thiếu 4 artefacts: Test tái hiện trước sửa FAIL, Patch, Test hồi quy sau sửa PASS, Log/Bằng chứng thực thi bất biến trên đĩa).

---

## Danh Mục 15 Issues Toán Học & Định Lượng Đã Được Đóng Hoàn Toàn (CLOSED_VERIFIED)

### ISSUE-FIX9-01: [P0] Frequency Gap — Số chưa từng xuất hiện được điểm cao phi lý
- **Mã lỗi:** ALG-01
- **File:** `js/algorithms/frequency-gap.js`
- **Mô tả:** Khi số chưa về bao giờ, code cũ gán `currentGap = 15` và `avgCycle = 15`, dẫn tới điểm chín muồi chu kỳ cao hơn cả số đã về nhiều lần.
- **Giải pháp:** Đặt `evidenceStatus: 'never-observed'`, `avgCycle = null`, `ripenessIndex = null`, gán điểm chu kỳ sàn 15.
- **Bằng chứng:** Test `testAlg01FrequencyGapNeverObserved` PASS.

### ISSUE-FIX9-02: [P0] Frequency Gap — Mẫu số recentRate bị chia cứng cho 15
- **Mã lỗi:** ALG-02
- **File:** `js/algorithms/frequency-gap.js`
- **Mô tả:** Mẫu số tính `recentRate` bị chia cứng cho 15 ngay cả khi lịch sử chỉ có 5 kỳ.
- **Giải pháp:** Đặt mẫu số là độ dài thực tế của cửa sổ: `recentWindow = Math.min(nDraws, 15)`.
- **Bằng chứng:** Test `testAlg02FrequencyGapRecentWindow` PASS.

### ISSUE-FIX9-03: [P0] Poisson — Gán nhãn sai calibrated-probability và bóng chưa về điểm 0
- **Mã lỗi:** ALG-03
- **File:** `js/algorithms/poisson.js`
- **Mô tả:** Tuyên bố xác suất độc lập trong khi các bóng rút không hoàn lại; bóng chưa về bị gán điểm 0.
- **Giải pháp:** Đổi `scoreType: 'ranking-score'`; áp dụng Beta-Binomial prior smoothing.
- **Bằng chứng:** Test `testAlg03Poisson` PASS.

### ISSUE-FIX9-04: [P0] Association Rules — Học ngược chiều thời gian
- **Mã lỗi:** ALG-04
- **File:** `js/algorithms/association-rules.js`
- **Mô tả:** Code cũ ghi nhận chuyển tiếp từ kỳ mới `[i]` sang kỳ cũ `[i+1]`.
- **Giải pháp:** Đảo đúng chiều thời gian: older `[i+1]` $\rightarrow$ newer `[i]`; tách bạch same-draw và sequential.
- **Bằng chứng:** Test `testAlg04AssociationRulesDirection` PASS.

### ISSUE-FIX9-05: [P0] Markov Chain — Đếm trùng lặp trong kỳ và thiếu Bayes shrinkage
- **Mã lỗi:** ALG-05
- **File:** `js/algorithms/markov.js`
- **Mô tả:** Nhận chuỗi lặp số trong 1 kỳ XSMN; không có shrinkage khi số mẫu ít.
- **Giải pháp:** Khử trùng qua `eventSet`; áp dụng Bayesian shrinkage co về phân phối biên.
- **Bằng chứng:** Test `testAlg05Markov` PASS.

### ISSUE-FIX9-06: [P0] Monte Carlo — Sampling thiếu bóng và seed bỏ qua kỳ cũ
- **Mã lỗi:** ALG-06
- **File:** `js/algorithms/monte-carlo.js`
- **Mô tả:** Dừng non khi bốc trùng; seed chỉ băm 10 kỳ gần nhất.
- **Giải pháp:** Rút thăm không hoàn lại không bao giờ thiếu bóng; seed băm toàn bộ canonical history.
- **Bằng chứng:** Test `testAlg06MonteCarlo` PASS.

### ISSUE-FIX9-07: [P0] Moving Average — Không kiểm tra ngày và độ dốc giả định
- **Mã lỗi:** ALG-07
- **File:** `js/algorithms/moving-average.js`
- **Mô tả:** Bỏ qua kiểm tra ngày hợp lệ, tự động gán thứ Hai cho ngày lỗi.
- **Giải pháp:** Dùng `strictUtcDayOfWeek`, tính độ dốc thực tế giữa EMA ngắn và dài.
- **Bằng chứng:** Test `testAlg07MovingAverage` PASS.

### ISSUE-FIX9-08: [P0] Structure Heuristic — Ngụy biện con bạc (Gambler's Fallacy)
- **Mã lỗi:** ALG-08
- **File:** `js/algorithms/clustering.js`
- **Mô tả:** Tự ý đảo bias `targetEvenBias = 0.40` khi `evenRatio > 0.52`.
- **Giải pháp:** Đổi tên thành StructureHeuristic, xóa bỏ hoàn toàn luật đảo bias; xuất đặc trưng mô tả thuần túy.
- **Bằng chứng:** Test `testAlg08StructureHeuristic` PASS.

### ISSUE-FIX9-09: [P0] Ensemble — Min-Max ép 0/100 giả tạo & Trọng số gán cứng
- **Mã lỗi:** ALG-09
- **File:** `js/algorithms/ensemble.js`
- **Mô tả:** Min-Max bóp méo tương quan; không validate model tham gia.
- **Giải pháp:** Chuyển sang Percentile-Rank Aggregation; loại trừ model lỗi có lý do minh bạch.
- **Bằng chứng:** Test `testAlg09Ensemble` PASS.

### ISSUE-FIX9-10: [P0] Giải Đặc Biệt XSMN — Fallback '38' và offset bịa đặt `+3/+7/+5`
- **Mã lỗi:** ALG-10
- **File:** `js/algorithms/ensemble.js`
- **Mô tả:** Fallback cứng '38' và cộng bonus theo offset bịa đặt.
- **Giải pháp:** Xóa bỏ '38' và các offset; áp dụng ma trận chuyển tiếp chữ số theo vị trí có Dirichlet smoothing.
- **Bằng chứng:** Test `testAlg10SpecialPrize` PASS.

### ISSUE-FIX9-11: [P0] Random Baseline — Quá ít replicates và trùng seed
- **Mã lỗi:** BT-01
- **File:** `js/backtest-engine.js`
- **Mô tả:** Chạy 10 replicates, replicate 0 trùng seed.
- **Giải pháp:** Chạy $\ge 100$ replicates độc lập, seed phân biệt, tính Mean, SD, SE, CI 95%.
- **Bằng chứng:** Test `testBt01RandomBaselineReplicates` PASS.

### ISSUE-FIX9-12: [P0] Rolling Window — Cắt sai số kỳ huấn luyện
- **Mã lỗi:** BT-02
- **File:** `js/backtest-engine.js`
- **Mô tả:** Gửi toàn bộ train set thay vì cắt đúng $W$ kỳ.
- **Giải pháp:** Cắt đúng `trainingData = draws.slice(0, W)`.
- **Bằng chứng:** Test `testBt02RollingWindowTrainingCut` PASS.

### ISSUE-FIX9-13: [P0] Scope Isolation — Trộn lẫn các đài XSMN
- **Mã lỗi:** BT-03
- **File:** `js/backtest-engine.js`
- **Mô tả:** Không lọc đài trước khi train mô hình.
- **Giải pháp:** Phân lập theo cặp `(date, stationId)`, chỉ train trên đúng đài chỉ định.
- **Bằng chứng:** Test `testBt03StationScopeIsolation` PASS.

### ISSUE-FIX9-14: [P0] Canonical Matching — So khớp lỏng lẻo và nuốt lỗi
- **Mã lỗi:** BT-04
- **File:** `js/backtest-engine.js`
- **Mô tả:** So khớp không qua normalizer, empty catch.
- **Giải pháp:** Chuẩn hóa qua `InputNormalizer`, ghi nhận rõ ràng `foldsFailed`.
- **Bằng chứng:** Test `testBt04And05BacktestMetrics` PASS.

### ISSUE-FIX9-15: [P0] Metric Separation — Tách bạch các chỉ số đánh giá
- **Mã lỗi:** BT-05
- **File:** `js/backtest-engine.js`
- **Mô tả:** Gộp lẫn tỷ lệ trúng và số lần về (nháy).
- **Giải pháp:** Tách bạch `meanFoldHitRate`, `microHitRate`, `meanOccurrencesPerDraw`, `baselineMean`, `differenceVsBaseline`.
- **Bằng chứng:** Test `testBt04And05BacktestMetrics` PASS.
