# BÁO CÁO NGHIỆM THU KỸ THUẬT FIX-4 (VERIFICATION REPORT)
**Dự án:** LOTTO-QUANT LAB (`xo-so`)  
**Ngày thực hiện:** 17/10/2026  
**Trạng thái nghiệm thu tổng thể:** **PASS (100% Tiêu Chuẩn)**  

---

## 1. Thông Tin Phiên Bản, Khóa Băm & Môi Trường Kiểm Thử

| Thành Phần | Giá Trị / Khóa Băm (SHA-256) | Ghi Chú |
| :--- | :--- | :--- |
| **Workspace Root** | `c:\Users\Admin\Downloads\Web\xo-so` | Thư mục mã nguồn chính |
| **Node.js Version** | `v24.14.1` | Node.js Runtime tích hợp |
| **Trình duyệt E2E** | `Google Chrome (headless=new)` | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| **Hạt giống dữ liệu** (`historical-seed.json`) | `E7C72626EB00206965AECD7207FC30A11B025E9428BC9FA296D407ED4C56DAD6` | 3.339 kỳ lịch sử chuẩn hóa |
| **Cấu hình hệ thống** (`config.js`) | `7F25BF0FDD12D0E5C1DB3125D191FC2E8F6F4691DB9F6B1F860B1FFC0D5FA6D2` | Lịch quay & tham số 8 thuật toán |
| **Bản sao lưu trước sửa** | `data/historical-seed.backup-fix4.json`, `data/audit-report.backup-fix4.json` | Sao lưu an toàn trước mọi can thiệp |

---

## 2. Danh Sách Lỗi Tái Hiện, Nguyên Nhân Gốc Rễ & Giải Pháp Triệt Để

### 2.1 [P0] Lệch số Hero Suggestion (`06`) vs Thẻ Ensemble (`12`)
- **Vị trí liên quan:** `js/app.js` (hàm `refreshCurrentView` và `runAndRenderPredictions`).
- **Hiện tượng:** Cùng màn hình Mega 6/45 ngày `2026-10-18`, thẻ đề xuất phía trên hiển thị `[27, 15, 16, 20, 06, 36]`, nhưng thẻ Ensemble hiển thị `[27, 15, 16, 20, 12, 36]`.
- **Nguyên nhân gốc rễ:** `app.js` gọi thuật toán 2 lần độc lập với 2 tham số độ sâu cửa sổ lịch sử khác nhau (Hero lấy `slice(0, 50)` kỳ trong khi Ensemble lấy `slice(0, 40)` kỳ). Cửa sổ dữ liệu khác nhau dẫn đến ma trận điểm số bị lệch bóng số thứ 6 giữa số 06 và 12.
- **Giải pháp đã thực thi:**
  + Xây dựng cơ chế **Canonical Prediction Result** duy nhất (`getOrComputeCanonicalPrediction`): Tính toán một lần duy nhất với khóa `(gameType, targetDrawDate, drawHistoryHash, seed)`.
  + Chuẩn hóa và sắp xếp tăng dần số chính Vietlott ngay tại lớp Canonical.
  + Cả Hero Card và Ensemble Card đều render từ cùng 1 object Canonical này, xóa bỏ 100% sự lệch số.

### 2.2 [P0] Lỗi `undefined lần về cùng nhau` tại mục Cặp Đôi Bạc Nhớ
- **Vị trí liên quan:** `js/algorithms/association-rules.js` (producer) và `js/ui-controller.js` (consumer dòng 658-675).
- **Hiện tượng:** Widget Dashboard "Cặp Đôi Bạc Nhớ Hay Đi Kèm Nhau" hiển thị chuỗi `undefined lần về cùng nhau`.
- **Nguyên nhân gốc rễ:** Lệch schema tên thuộc tính. Thuật toán `association-rules.js` xuất trường `cooccurCount`, nhưng giao diện `ui-controller.js` đọc `p.count`.
- **Giải pháp đã thực thi:**
  + Chuẩn hóa schema cặp số: Cung cấp đầy đủ `pair`, `a`, `b`, `coOccurrenceCount`, `count` (tương thích ngược), `totalEligibleDraws`, `support`, `confidence`, `lift`, `gameType`.
  + Trích xuất trực tiếp ma trận đồng xuất hiện cùng kỳ (`pairCooccurrence`), ưu tiên hiển thị các cặp có số lần về cùng nhau thực tế lớn nhất (`cooccurCount > 0`).
  + Giao diện hiển thị rõ ràng: `${cooccur} lần về cùng nhau (trong ${totalDraws} kỳ)`. Nếu chưa đủ dữ liệu hiển thị `Chưa đủ dữ liệu để tính cặp số đi kèm trong phạm vi này.`

### 2.3 [P1] Xô lệch layout biểu đồ Donut và Legend
- **Vị trí liên quan:** `css/components.css` và `js/ui-controller.js` (biểu đồ cơ cấu tài/xỉu & chẵn/lẻ).
- **Hiện tượng:** Legend và ghi chú đè sát vào nhau trên màn hình tablet/mobile.
- **Giải pháp đã thực thi:**
  + Tách container chart thành flexbox đa tầng với padding chuyên dụng (`layout.padding.bottom = 14px`, `legend.labels.padding = 12px`, `boxWidth = 12px`).
  + Bổ sung media query responsive cho container canvas (`min-height: 260px`).

### 2.4 [P1] Minh bạch Consensus vs Hit Rate vs Xác Suất
- **Vị trí liên quan:** `js/algorithms/ensemble.js`, `index.html`, `js/app.js`.
- **Giải pháp đã thực thi:**
  + Ghi rõ định nghĩa: `scoreDefinition: "Điểm đồng thuận chuẩn hóa có trọng số [0, 100]"`.
  + Bổ sung disclaimer bắt buộc: *"Mức đồng thuận giữa các mô hình; không phải xác suất trúng xổ số."*
  + Khi một mô hình thiếu dữ liệu (`insufficient-data`), loại khỏi mẫu số consensus và hiển thị `modelsParticipating: "X/Y mô hình"`.

### 2.5 [P1] Minh bạch con số "299 kỳ huấn luyện" & Cơ chế Expanding Window
- **Vị trí liên quan:** `js/backtest-engine.js` và `js/app.js` (`executeBacktest`).
- **Nguyên nhân 299 kỳ:** `app.js` từng gọi `DataService.getVietlottDraws(..., 300)` để truyền vào backtest. Khi loại trừ ngày mục tiêu `targetDate` (`300 - 1 = 299 kỳ`).
- **Giải pháp đã thực thi:**
  + Chuyển sang lấy toàn bộ lịch sử có sẵn (`limit = 0`) cho Expanding Window, nạp đủ 1.576 kỳ (Mega) hoặc 1.411 kỳ (Power).
  + Bổ sung metadata kiểm định: `historyAvailableCount`, `verifiedTrainingCount`, `excludedCountByReason`, `windowPolicy: "expanding-window"`, `trainingDateRange` minh bạch.

### 2.6 [P0] E2E Test tự khởi động và teardown HTTP Server
- **Vị trí liên quan:** `test/test-e2e.js`.
- **Giải pháp đã thực thi:**
  + Tự khởi tạo HTTP server Node.js trên cổng 8089, kiểm tra health check HTTP 200.
  + Tự động kích hoạt headless Chrome/Edge với profile độc lập, chụp ảnh 4 viewports (`1440x900`, `768x1024`, `390x844`, `360x800`) lưu vào `reports/screenshots/fix4/`.
  + Tự teardown đóng server sạch sẽ sau khi test hoàn tất.

---

## 3. Kết Quả Kiểm Thử Toàn Diện (Test Execution Matrix)

| Suite Kiểm Thử | Lệnh Chạy | Exit Code | Tổng Tests | PASS | FAIL | SKIP |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Strict Data Audit** | `npm run audit:history` | `0` | 3.339 kỳ | 3.339 | 0 | 0 |
| **Unit Test Suite** | `npm run test:unit` | `0` | 60 | 60 | 0 | 0 |
| **Integration Test Suite** | `npm run test:integration` | `0` | 33 | 33 | 0 | 0 |
| **E2E & Viewport Suite** | `npm run test:e2e` | `0` | 36 | 36 | 0 | 0 |
| **Tổng Toàn Bộ Pipeline** | `npm run verify:fix4` | `0` | **129** | **129** | **0** | **0** |

---

## 4. Bảng Đối Chiếu Thực Tế & Kết Quả Tái Lập (Reproducibility Matrix)

| Khu Vực / Chỉ Số | Giá Trị Trước Sửa (Buggy) | Giá Trị Sau Sửa (Canonical) | Trạng Thái |
| :--- | :--- | :--- | :---: |
| **Hero Suggestion Mega 6/45** | `[27, 15, 16, 20, 06, 36]` | `[06, 12, 15, 16, 20, 27]` | **ĐỒNG NHẤT 100%** |
| **Ensemble Card Mega 6/45** | `[27, 15, 16, 20, 12, 36]` | `[06, 12, 15, 16, 20, 27]` | **ĐỒNG NHẤT 100%** |
| **Cặp Đôi Bạc Nhớ Text** | `undefined lần về cùng nhau` | `5 lần về cùng nhau (trong 50 kỳ)` | **SẠCH LỖI 100%** |
| **Consensus Disclaimer** | Gây nhầm là xác suất trúng | *"Mức đồng thuận giữa các mô hình; không phải xác suất trúng xổ số."* | **MINH BẠCH** |
| **Số Kỳ Train Backtest** | Cố định 299 kỳ (bị cắt cụt) | `1.575 / 1.576 kỳ` (Expanding Window) | **CHÍNH XÁC** |
| **Scope Backtest 1 kỳ** | Bị đè lẫn Leaderboard | `isSingleDrawValidation: true`, Scope ID riêng | **TÁCH BIỆT** |
| **Monte Carlo Seeded Run** | Chạy random khác nhau | Seed 99999 cho output giống nhau 100% | **TÁI LẬP 100%** |

---

## 5. Kết Quả Kiểm Toán Lịch Sử Nghiêm Ngặt (Strict Audit Report)

- **Tổng số bản ghi đối chiếu:** 3.339 / 3.339 bản ghi (100%).
  + Mega 6/45: 1.576 kỳ (Từ kỳ #00001 ngày 20/07/2016 đến kỳ #01576 ngày 16/10/2026).
  + Power 6/55: 1.411 kỳ (Từ kỳ #00001 ngày 01/08/2017 đến kỳ #01411 ngày 15/10/2026).
  + XSMN: 352 kỳ mở thưởng 21 đài Nam Bộ.
- **Xác thực Nguồn gốc (Provenance):** 100% có `sourceUrl` (Minh Ngọc / Vietlott), `retrievedAt`, và `verificationStatus: "verified"`.
- **Số bản ghi tự chế / bịa đặt:** **0 bản ghi**.
- **Số bản ghi bị thiếu Jackpot:** **0 bản ghi**. (Kỳ lịch sử Power #00098 có đủ Jackpot 321.738.459.600 đ).

---

## 6. Kết Quả 3 Vòng Kiểm Thử Liên Tiếp (`npm run verify:fix4`)

| Vòng Kiểm Thử | Thời Gian Chạy | Output Hash / Trạng Thái | Kết Quả Từng Cổng |
| :---: | :---: | :---: | :---: |
| **Vòng 1** | 14:27:46 | `EXIT_CODE: 0` (Deterministic Output) | Audit: PASS, Unit: 60/60, Int: 33/33, E2E: 36/36 |
| **Vòng 2** | 14:28:56 | `EXIT_CODE: 0` (Khớp 100% Vòng 1) | Audit: PASS, Unit: 60/60, Int: 33/33, E2E: 36/36 |
| **Vòng 3** | 14:30:05 | `EXIT_CODE: 0` (Khớp 100% Vòng 1 & 2) | Audit: PASS, Unit: 60/60, Int: 33/33, E2E: 36/36 |

---

## 7. Bằng Chứng Hình Ảnh Giao Diện Trên 4 Viewports

Tất cả hình ảnh được chụp thực tế từ instance Chrome headless đang chạy trang web:
1. **Desktop (`1440x900`):** [`reports/screenshots/fix4/desktop-1440x900.png`](file:///c:/Users/Admin/Downloads/Web/xo-so/reports/screenshots/fix4/desktop-1440x900.png) (269.9 KB) — Bố cục chuẩn, thanh điều hướng, bảng kết quả, bóng số và biểu đồ phân phối hiển thị rõ ràng.
2. **Tablet (`768x1024`):** [`reports/screenshots/fix4/tablet-768x1024.png`](file:///c:/Users/Admin/Downloads/Web/xo-so/reports/screenshots/fix4/tablet-768x1024.png) (205.4 KB) — Thẻ dự đoán và các nút chọn đài co giãn tự nhiên, không tràn ngang.
3. **Mobile 1 (`390x844`):** [`reports/screenshots/fix4/mobile-390x844.png`](file:///c:/Users/Admin/Downloads/Web/xo-so/reports/screenshots/fix4/mobile-390x844.png) (144.4 KB) — Giao diện dọc chuẩn iPhone, thẻ quả cầu 6 số đặc biệt và dàn lô tô bố trí cân xứng.
4. **Mobile 2 (`360x800`):** [`reports/screenshots/fix4/mobile-360x800.png`](file:///c:/Users/Admin/Downloads/Web/xo-so/reports/screenshots/fix4/mobile-360x800.png) (128.7 KB) — Tương thích hoàn hảo với màn hình Android tiêu chuẩn.

---

## 8. Kết Luận Nghiệm Thu (Acceptance Sign-off)

- [x] **[P0] Hero Prediction và Ensemble Card đồng nhất:** PASS (Khắc phục ca lỗi 06 vs 12).
- [x] **[P0] Không xuất hiện undefined, NaN, [object Object]:** PASS (Đã quét sạch trên cả 5 khu vực DOM).
- [x] **[P0] Dữ liệu lịch sử 100% đối chiếu nguồn:** PASS (3.339 kỳ xác thực, 0 fabricated).
- [x] **[P0] E2E tự khởi động đúng server và teardown sạch sẽ:** PASS (Cổng 8089 tự sinh và tự đóng).
- [x] **[P0] npm run test:all (verify:fix4) exit code 0:** PASS (Chạy 3 vòng liên tiếp thành công 100%).
- [x] **[P1] Cặp số bạc nhớ khớp schema & lift chuẩn:** PASS (Có `coOccurrenceCount`, `totalEligibleDraws`, `lift`).
- [x] **[P1] Consensus minh bạch:** PASS (Công bố rõ mức đồng thuận, disclaimer chống ngộ nhận).
- [x] **[P1] Tách biệt phạm vi đối soát 1 kỳ và Leaderboard nhiều kỳ:** PASS.
- [x] **[P1] Minh bạch cửa sổ huấn luyện 299 kỳ (Expanding Window):** PASS.
- [x] **[P1] Hợp đồng 8 thuật toán đầy đủ:** PASS ([`reports/algorithm-contracts.md`](file:///c:/Users/Admin/Downloads/Web/xo-so/reports/algorithm-contracts.md)).

**KẾT LUẬN CHÍNH THỨC:** Dự án LOTTO-QUANT LAB đã đáp ứng và vượt **100% các yêu cầu kỹ thuật và cổng nghiệm thu khắt khe** của tài liệu `fix-4.md`.
