# SỔ THEO DÕI VÀ ĐÓNG LỖI (ISSUE LEDGER) — FIX-5
**Dự án:** LOTTO-QUANT LAB  
**Chuẩn kiểm định:** Fail-Closed (Không đóng lỗi khi thiếu 4 artefacts: Test tái hiện trước sửa FAIL, Patch, Test hồi quy sau sửa PASS, Log/Bằng chứng thực thi).

---

## Danh Mục Các Vấn Đề Kế Thừa & Mới Phát Hiện

### ISSUE-01: [P0] Lệch mảng số dự đoán giữa Hero Suggestion và Thẻ Ensemble
- **Mức độ:** P0
- **Tập tin liên quan:** `js/app.js` (hàm `refreshCurrentView`, `runAndRenderPredictions`, `getOrComputeCanonicalPrediction`)
- **Tái hiện trước sửa:**
  + *Lệnh:* `node test/test-integration.js`
  + *Quan sát lỗi:* Hero Suggestion Mega 6/45 ngày 2026-10-18 lấy 50 kỳ lịch sử ra số `[27, 15, 16, 20, 06, 36]`, trong khi Thẻ Ensemble lấy 40 kỳ lịch sử ra số `[27, 15, 16, 20, 12, 36]`. Khác biệt bóng số `06` vs `12`.
- **Nguyên nhân gốc:** Gọi thuật toán hai lần độc lập với 2 độ sâu lịch sử khác nhau (50 kỳ vs 40 kỳ), không có một đối tượng kết quả duy nhất (Canonical Prediction Result).
- **Thay đổi mã nguồn:**
  + Triển khai cơ chế `getOrComputeCanonicalPrediction()` dùng chung 50 kỳ và seed Mulberry32 xác định theo `targetDate`.
  + Chuẩn hóa và sort tăng dần mảng số Vietlott ngay tại lớp Canonical.
- **Kiểm thử hồi quy:** `test/test-integration.js` (Test 6: Canonical Prediction Consistency).
- **Kết quả sau sửa:** 100% khớp mảng số `[06, 12, 15, 16, 20, 27]`.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-02: [P0] Lỗi chuỗi `undefined lần về cùng nhau` trong Dashboard Bạc Nhớ
- **Vị trí:** `js/algorithms/association-rules.js` (producer) và `js/ui-controller.js` (consumer).
- **Hiện tượng:** Khối "Cặp Đôi Bạc Nhớ Hay Đi Kèm Nhau" hiển thị chuỗi `undefined lần về cùng nhau`.
- **Nguyên nhân gốc:** Lệch tên trường schema. Producer trả về `cooccurCount`, nhưng consumer đọc `p.count`. Đồng thời danh sách bị lọc bởi ngưỡng không phù hợp khiến một số cặp có co-occurrence thực tế bị bỏ sót.
- **Thay đổi mã nguồn:**
  + Chuẩn hóa schema: `pair`, `a`, `b`, `coOccurrenceCount`, `count` (backwards-compatible), `totalEligibleDraws`, `support`, `confidence`, `lift`, `gameType`.
  + Trích xuất toàn bộ các cặp số cùng xuất hiện trong cùng kỳ (`pairCooccurrence`), ưu tiên hiển thị theo số lần về cùng nhau thực tế (`cooccurCount > 0`).
  + `ui-controller.js` hiển thị: `${cooccur} lần về cùng nhau (trong ${totalDraws} kỳ)`.
- **Kiểm thử hồi quy:**
  + `test/test-unit.js` (Test 4.1: Schema Cặp Số và fixture tính tay).
  + `test/test-integration.js` (Test 7: Quét sạch literal undefined/NaN).
- **Kết quả sau sửa:** 0 literal `undefined`, hiển thị chính xác số lần và tổng số kỳ.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-03: [P1] Xô lệch bố cục biểu đồ Donut và Legend trên các Viewports hẹp
- **Vị trí:** `css/components.css` và `js/ui-controller.js`.
- **Hiện tượng:** Legend của biểu đồ vành khuyên (Tài/Xỉu & Chẵn/Lẻ) bị sát và đè lên phần ghi chú ở tablet/mobile.
- **Nguyên nhân gốc:** Thiếu padding chuyên dụng và min-height trên canvas container khi resize.
- **Thay đổi mã nguồn:**
  + Cập nhật Chart.js layout padding: `bottom: 14px`, `labels.padding: 12px`, `boxWidth: 12px`.
  + `components.css`: Thêm `min-height: 260px` và media queries responsive.
- **Kiểm thử hồi quy:** `test/test-e2e.js` (chụp screenshot 4 viewports).
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-04: [P1] Minh bạch Consensus vs Hit Rate vs Xác Suất
- **Vị trí:** `js/algorithms/ensemble.js`, `index.html`, `js/app.js`.
- **Hiện tượng:** Tỷ lệ đồng thuận (vd: 47.6%) dễ gây hiểu lầm là xác suất trúng giải.
- **Nguyên nhân gốc:** Nhãn giao diện chưa có định nghĩa và disclaimer giải thích rõ ràng.
- **Thay đổi mã nguồn:**
  + Bổ sung trường `scoreDefinition: "Điểm đồng thuận chuẩn hóa có trọng số [0, 100]"`.
  + Bổ sung `disclaimer: "Mức đồng thuận giữa các mô hình; không phải xác suất trúng xổ số."`.
  + Khi một mô hình trả `insufficient-data`, loại khỏi mẫu số consensus và hiển thị `modelsParticipating: "X/Y mô hình"`.
- **Kiểm thử hồi quy:** `test/test-unit.js` (Test 4.2: Consensus Transparency).
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-05: [P1] Minh bạch con số "299 kỳ huấn luyện" & Cơ chế Expanding Window
- **Vị trí:** `js/backtest-engine.js` và `js/app.js` (`executeBacktest`).
- **Hiện tượng:** Màn hình Backtest ghi "299 kỳ huấn luyện" dù seed có 1.576 kỳ.
- **Nguyên nhân gốc:** `app.js` truyền `limit = 300`, khi trừ ngày mục tiêu `targetDate` thì còn 299 kỳ.
- **Thay đổi mã nguồn:**
  + Truyền `limit = 0` (lấy toàn bộ lịch sử có sẵn) cho Expanding Window.
  + Bổ sung metadata `historyAvailableCount`, `verifiedTrainingCount`, `excludedCountByReason`, `windowPolicy: "expanding-window"`.
- **Kiểm thử hồi quy:** `test/test-integration.js` (Test 8: Expanding Window Metadata).
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-06: [P0] E2E Runner tự khởi động và teardown HTTP Server
- **Vị trí:** `test/test-e2e.js`.
- **Hiện tượng:** Trước đây test cố định `localhost:8080`, phụ thuộc server thủ công bên ngoài, nếu không chạy trước thì test fail.
- **Nguyên nhân gốc:** Chưa có static HTTP server tự động tích hợp trong runner.
- **Thay đổi mã nguồn:**
  + Tự khởi động Node.js HTTP server độc lập trên cổng 8089 trong setup.
  + Tự gọi Chrome headless với profile tạm độc lập, chụp screenshot 4 viewports thật.
  + Tự đóng server trong khối `finally` (teardown).
- **Kiểm thử hồi quy:** `npm run test:e2e`.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-07: [P0] Tự động hóa kiểm định nghiêm ngặt theo Cổng Fail-Closed (Gate Runner)
- **Vị trí:** `scripts/gate-runner.js`, `test/test-gate-runner.js`, `package.json` (`verify:strict`).
- **Mục tiêu:** Tạo pipeline tự động thực thi tuần tự Gate 0 -> Gate 8. Dừng ngay khi có bất kỳ cổng nào thất bại (Fail-Closed), không chạy các gate tiếp theo, exit code 1. Xuất file `reports/fix5/gate-results.json` thực tế và 3 log độc lập `run-1.log`, `run-2.log`, `run-3.log`.
- **Triển khai mã nguồn:**
  + Xây dựng `scripts/gate-runner.js` bao gồm đầy đủ logic của Gate 0 đến Gate 8.
  + Gate 0: Kiểm tra 3 bản backup an toàn, tính và so khớp SHA-256 các file dữ liệu.
  + Gate 1: Kiểm toán dữ liệu lịch sử strict + 3 Mutation Tests bắt buộc (bóng số 99, ngày 2026-02-30, thiếu bonusNumber) + sinh `reports/fix5/data-reconciliation.csv` cho 3.339 bản ghi.
  + Gate 2: Hợp đồng dự đoán chính tắc (Canonical Prediction), tính nhất quán Hero vs Ensemble, vô hiệu hóa cache khi đổi scope, xử lý an toàn dataset rỗng.
  + Gate 3: Kiểm thử 8 thuật toán định lượng, xác minh điểm số không NaN, kiểm tra cặp số không undefined.
  + Gate 4: Kiểm thử Backtest, chống leakage tương lai (Anti-Leakage Sentinel), chạy 100 replicates cho Random Baseline.
  + Gate 5: Sắp xếp Leaderboard theo Primary Metric (`avgHitRate`), banner Top 1 đồng bộ 100%, không trường undefined/NaN.
  + Gate 6: Kiểm tra an toàn artefact, xác nhận SHA-256 của các file canonical không đổi sau test.
  + Gate 7: Khởi động HTTP server trên port động, chạy Chrome headless chụp 3 viewports (`1440x900`, `768x1024`, `360x800`) lưu vào `reports/fix5/screenshots/`, kiểm tra horizontal overflow.
  + Gate 8: Xác thực tính xác định Clean Room qua 3 lần chạy độc lập.
- **Kiểm thử Fail-Closed (Gate Runner Self-Test):**
  + *Lệnh:* `node test/test-gate-runner.js`
  + *Kết quả:* Khi ép Gate 3 fail, runner dừng ngay lập tức tại Gate 3, exit code 1, các Gate 4, 5, 6, 7, 8 hoàn toàn KHÔNG được thực thi.
- **Kết quả sau sửa:**
  + Chạy thành công 3 lần liên tiếp: `node scripts/gate-runner.js --run-index=1`, `--run-index=2`, `--run-index=3`.
  + Cả 3 lần chạy đều đạt `overallStatus: PASS`, exit code 0.
  + Đã xuất đầy đủ 9 artefacts bắt buộc:
    1. `reports/fix5/issue-ledger.md`
    2. `reports/fix5/gate-results.json`
    3. `reports/fix5/data-reconciliation.csv` (1.006.563 bytes, 3.339 bản ghi)
    4. `reports/fix5/run-1.log` (11.729 bytes)
    5. `reports/fix5/run-2.log` (11.729 bytes)
    6. `reports/fix5/run-3.log` (11.729 bytes)
    7. `reports/fix5/screenshots/desktop-1440x900.png` (274.426 bytes)
    8. `reports/fix5/screenshots/tablet-768x1024.png` (211.158 bytes)
    9. `reports/fix5/screenshots/mobile-360x800.png` (131.858 bytes)
- **Trạng thái:** `CLOSED_VERIFIED`
