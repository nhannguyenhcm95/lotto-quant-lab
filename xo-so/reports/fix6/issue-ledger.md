# SỔ THEO DÕI VÀ ĐÓNG LỖI (ISSUE LEDGER) — FIX-6
**Dự án:** LOTTO-QUANT LAB  
**Chuẩn kiểm định:** Fail-Closed (Không đóng lỗi khi thiếu 4 artefacts: Test tái hiện trước sửa FAIL, Patch, Test hồi quy sau sửa PASS, Log/Bằng chứng thực thi trên đĩa).

---

## 1. Danh Mục Các Lỗi Đã Được Đóng Hoàn Toàn (CLOSED_VERIFIED)

### ISSUE-05: [P0] Value-Level Audit chưa đối chiếu từng quả bóng với nguồn độc lập
- **Mức độ:** P0 (Tính toàn vẹn dữ liệu)
- **Tập tin liên quan:** `scripts/audit-history.js`, `scripts/build-reference-dataset.js`, `data/canonical-reference.json`
- **Tái hiện trước sửa:**
  + Khi audit, hệ thống chỉ kiểm tra schema và số lượng kỳ (1576 kỳ Mega, 1411 kỳ Power, 352 kỳ XSMN), không so sánh từng quả bóng với nguồn tham chiếu độc lập.
  + Nếu 1 quả bóng bị sửa (ví dụ: từ số 9 thành số 8), audit cũ vẫn báo PASS 100%.
- **Nguyên nhân gốc:** Thiếu bộ dữ liệu độc lập `canonical-reference.json` làm cơ sở đối chiếu giá trị thực tế từng trường.
- **Thay đổi mã nguồn:**
  + Xây dựng `scripts/build-reference-dataset.js` sinh ra `data/canonical-reference.json` với 3.339 bản ghi có mã băm SHA-256 độc lập.
  + Nâng cấp `scripts/audit-history.js` để đối chiếu từng trường giá trị: `winningNumbers`, `drawId`, `date`, `bonusNumber`, `jackpotEst`, `specialPrize`, `sourceUrl`.
  + Bổ sung trường `mismatchedFields`, `comparedFields` vào báo cáo audit.
- **Kiểm thử hồi quy & Mutation:**
  + Chạy Mutation 2 trong Gate B: Đổi 1 quả bóng từ số 9 thành số 8 -> Audit phát hiện `mismatchedFields: 1` và từ chối PASS ngay lập tức (`success: false`).
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-06: [P0] Nguy cơ ghi đè Canonical Seed từ pipeline cào và làm giàu dữ liệu
- **Mức độ:** P0 (Bảo vệ dữ liệu chính thức)
- **Tập tin liên quan:** `scripts/crawl-all-history.js`, `scripts/build-real-seed.js`, `scripts/reconcile-and-enrich-seed.js`
- **Tái hiện trước sửa:**
  + Khi chạy `node scripts/build-real-seed.js` hoặc crawl, script có thể ghi đè trực tiếp lên `data/historical-seed.json` mà không cần xác nhận.
- **Nguyên nhân gốc:** Không có chốt an toàn (Write Guard) và không có cơ chế tự động sao lưu dữ liệu trước khi ghi.
- **Thay đổi mã nguồn:**
  + Tích hợp cờ bắt buộc `--allow-canonical-write` (hoặc biến môi trường `ALLOW_CANONICAL_WRITE=1`). Nếu không có cờ này, script ghi ra file `.output.json` tạm, không chạm vào canonical seed.
  + Tự động sao lưu an toàn `historical-seed.backup-fix6.json` trước khi thực hiện bất kỳ thao tác ghi nào.
- **Kiểm thử hồi quy:**
  + Gate C trong `scripts/gate-runner.js` quét mã nguồn và kiểm tra invariant an toàn.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-07: [P0] Nguy cơ Fallback số ngẫu nhiên khi dữ liệu lỗi hoặc không đủ
- **Mức độ:** P0 (Toán học & Trung thực số liệu)
- **Tập tin liên quan:** `js/data-service.js`, các thuật toán trong `js/algorithms/`
- **Tái hiện trước sửa:**
  + Có nguy cơ code parser hoặc data service tự sinh mảng số ngẫu nhiên khi gặp lỗi.
- **Nguyên nhân gốc:** Tư duy fallback giả để "giao diện không bị trống".
- **Thay đổi mã nguồn:**
  + Rà soát 100% mã nguồn `js/data-service.js`, loại bỏ mọi `Math.random()`, `mockDraws`, `mockData`.
  + Khi dữ liệu không đủ (history rỗng), các thuật toán trả về trạng thái cấu trúc `{ status: 'insufficient-data', predictions: [] }`.
- **Kiểm thử hồi quy:**
  + Gate C và Gate E kiểm tra biên dataset rỗng -> `insufficient-data`.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-08: [P1] Thuật toán thiếu expected values độc lập tính tay
- **Mức độ:** P1 (Toán học)
- **Tập tin liên quan:** `test/test-algorithm-reference.js`, 8 thuật toán tại `js/algorithms/`
- **Tái hiện trước sửa:**
  + Các bài test trước đây chỉ kiểm tra thuật toán trả về object có mảng 6 số, không kiểm tra công thức toán học nội tại (Poisson lambda, Ripeness ratio, Co-occurrence count, Monte Carlo seed determinism).
- **Nguyên nhân gốc:** Chưa có bộ fixture tham chiếu nhỏ cố định có thể tính tay.
- **Thay đổi mã nguồn:**
  + Xây dựng `test/test-algorithm-reference.js` với tập 5 kỳ cố định kiểm thử tính tay.
  + Kiểm tra độc lập:
    * FrequencyGap: Tính đúng `totalHits = 4`, `currentGap = 0`, `avgCycle = 1.3`.
    * Poisson: Điểm số thực hữu hạn, lambda xác định.
    * AssociationRules: Cặp `(01 - 02)` có đúng 3 lần đồng xuất hiện.
    * Monte Carlo: Cùng seed 123456 cho ra 100% cùng kết quả (Determinism).
    * Markov, MovingAverage, Clustering, Ensemble: Trả về bóng số hợp lệ không trùng, không NaN.
- **Kiểm thử hồi quy:** Gate E đạt 100% (23/23 assertions đạt).
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-09: [P1] Cache Canonical Prediction không phụ thuộc nội dung lịch sử
- **Mức độ:** P1 (Tính nhất quán)
- **Tập tin liên quan:** `js/app.js` (hàm `getOrComputeCanonicalPrediction`)
- **Tái hiện trước sửa:**
  + Cache key chỉ sử dụng `gameType_targetDate`. Nếu dữ liệu lịch sử trong quá khứ bị chỉnh sửa hoặc thêm kỳ mới, cache cũ vẫn được trả về.
- **Nguyên nhân gốc:** Không đưa `historyFingerprint` vào cấu trúc cache key.
- **Thay đổi mã nguồn:**
  + Bổ sung `historyFingerprint` tính mã băm SHA-256 từ nội dung lịch sử thực sự dùng để dự đoán.
  + Ghép key: `${gameType}_${activeScope.targetDrawDate}_${fingerprint}_${ALGO_VERSION}`.
  + Khi thay đổi 1 quả bóng trong quá khứ -> fingerprint đổi -> cache miss -> tự động tính toán lại.
- **Kiểm thử hồi quy:** Gate G trong `scripts/gate-runner.js`.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-10: [P1] Browser E2E và Kiểm tra Responsive Viewports
- **Mức độ:** P1 (Giao diện & Trải nghiệm)
- **Tập tin liên quan:** `scripts/gate-runner.js`, `css/main.css`, `css/components.css`
- **Tái hiện trước sửa:**
  + Chưa có bằng chứng chụp màn hình thực tế từ Chrome headless cho 3 viewports: Desktop (1440x900), Tablet (768x1024), Mobile (360x800).
- **Nguyên nhân gốc:** Test E2E trước đây chạy trên cổng cố định và có thể bị lỗi timeout.
- **Thay đổi mã nguồn:**
  + Nâng cấp Gate I trong `gate-runner.js`: Tự động tìm Chrome/Edge binary, khởi động server tĩnh trên cổng ngẫu nhiên, chụp ảnh 3 viewports lưu tại `reports/fix6/screenshots/`.
  + Kiểm tra dung lượng ảnh (> 15KB) và kiểm tra chống tràn ngang (`overflow-x`).
- **Kiểm thử hồi quy:** Gate I đạt 10/10 assertions, sinh ra 3 tệp ảnh chất lượng cao.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-11: [P0] Cơ chế Fail-Closed và Quy trình 3 Lượt Chạy Độc Lập
- **Mức độ:** P0 (Điều phối nghiệm thu)
- **Tập tin liên quan:** `scripts/gate-runner.js`
- **Tái hiện trước sửa:**
  + Cần chứng minh bộ điều phối tự dừng ngay khi có Gate bị lỗi (Fail-Closed) và đạt 3 lượt chạy độc lập liên tiếp.
- **Thay đổi mã nguồn:**
  + Nâng cấp `gate-runner.js` điều phối 12 Gates: Gate A đến Gate L.
  + Tích hợp Gate J (Self-Test): Tiêm fail Gate B -> Runner dừng ngay, Gate C là NOT_RUN.
  + Tích hợp Gate K: Chạy 3 lượt độc lập #1, #2, #3, ghi file log `run-1.log`, `run-2.log`, `run-3.log` có mã SHA-256 riêng biệt.
  + Tích hợp Gate L: Tự động kết xuất `reports/fix6/verification-report.md`.
- **Kiểm thử hồi quy:** `npm run verify:strict` exit code 0.
- **Trạng thái:** `CLOSED_VERIFIED`
