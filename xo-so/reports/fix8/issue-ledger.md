# SỔ THEO DÕI VÀ ĐÓNG LỖI KỸ THUẬT (ISSUE LEDGER) — FIX-8
**Dự án:** LOTTO-QUANT LAB  
**Chuẩn kiểm định:** Fail-Closed (Không đóng lỗi khi thiếu 4 artefacts: Test tái hiện trước sửa FAIL, Patch, Test hồi quy sau sửa PASS, Log/Bằng chứng thực thi bất biến trên đĩa).

---

## Danh Mục 8 Issues Kỹ Thuật FIX-8 Đã Được Đóng Hoàn Toàn (CLOSED_VERIFIED)

### ISSUE-FIX8-01: [P0] Loại bỏ chuỗi giả tạo trong Source Evidence & Lưu trữ Raw Bodies
- **Mức độ:** P0 (Tính chân thực của dữ liệu nguồn)
- **Tập tin liên quan:** `scripts/build-source-evidence.js`, `data/source-evidence/raw/`, `data/source-evidence/*.json`
- **Tái hiện trước sửa:**
  + `build-source-evidence.js` đọc `historical-seed.json` rồi tạo chuỗi format giả `VIETLOTT_MEGA_645|DRAW:...|BALLS:...`.
  + Không có raw response body thực tế từ nhà đài, không có content-addressable storage.
- **Giải pháp triệt để:**
  + Tạo thư mục `data/source-evidence/raw/` lưu trữ 3.339 raw response bodies content-addressable dạng `<sha256>.[json|html]`.
  + Nâng cấp metadata schema lên Schema 2.0.0 (`rawBodyPath`, `rawBodySha256`, `parsedRecord`).
  + Khóa chế độ production: Cấm đọc `historical-seed.json`, chỉ đọc và xác thực raw bodies trên đĩa.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-FIX8-02: [P0] Reference Dataset Độc Lập Thực Sự Qua Parser Độc Lập & Canonical Hash Đệ Quy
- **Mức độ:** P0 (Tính độc lập của Ground Truth)
- **Tập tin liên quan:** `scripts/build-reference-dataset.js`, `scripts/universal-source-parser.js`
- **Tái hiện trước sửa:**
  + Reference dataset chỉ kiểm tra chuỗi giả tạo, hàm tính `recordSha256` dùng `Object.keys().sort()` nông (shallow), bỏ qua lồng nhau của `prizes` và `lottoPairs`.
- **Giải pháp triệt để:**
  + `buildCanonicalReference()` đọc trực tiếp raw bytes từ đĩa, tính SHA-256 từ đĩa so với `rawBodySha256` (bắt `TAMPER_DETECTED`).
  + Tái parse độc lập qua `parseVietlottRaw` và `parseXSMNRaw`, so sánh sâu với `parsedRecord` (bắt `PARSER_MISMATCH`).
  + Dùng `canonicalJson` đệ quy sort toàn bộ object keys ở mọi cấp lồng nhau để tính `recordSha256`.
  + Atomic write qua file `.tmp.json` rồi đổi tên.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-FIX8-03: [P0] Sửa Deep Value-Level Audit Trong `audit-history.js` (So Sánh Sâu Từng Giải Con XSMN)
- **Mức độ:** P0 (Toàn vẹn giá trị giải thưởng)
- **Tập tin liên quan:** `scripts/audit-history.js`
- **Tái hiện trước sửa:**
  + Audit cũ chỉ kiểm tra `typeof seedVal === 'object' && typeof refVal === 'object'`, do đó nếu sửa giải nhất `23288 -> 99999` thì audit vẫn báo PASS.
- **Giải pháp triệt để:**
  + Thêm `isValidPrizeSchema(prizes)` kiểm tra chuẩn 18 giải XSMN.
  + Thêm `deepCanonicalEqual()` so sánh sâu từng mảng giải con (`special`, `first`, `second`, `third`, `fourth`, `fifth`, `sixth`, `seventh`, `eighth`).
  + Truyền đầy đủ `refItem` trong mọi vòng lặp.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-FIX8-04: [P0] Đối Chiếu `lottoPairs` Toán Học & Bỏ Gán Cứng `sourceConflictCount = 0`
- **Mức độ:** P0 (Toàn vẹn dữ liệu và tính trung thực của báo cáo)
- **Tập tin liên quan:** `scripts/audit-history.js`
- **Tái hiện trước sửa:**
  + `lottoPairs` chỉ kiểm tra `Array.isArray()`, không đối chiếu với 2 chữ số cuối của các giải.
  + Dòng code `report.summary.sourceConflictCount = 0;` bị gán cứng.
  + Tỷ lệ phần trăm làm tròn có thể báo 100.0% dù có lỗi.
- **Giải pháp triệt để:**
  + Viết hàm `deriveLottoPairsFromPrizes(prizes)` suy ra 18 đuôi từ 18 giải và so sánh khớp tuyệt đối.
  + Xóa bỏ gán cứng: `sourceConflictCount` lấy từ độ dài thực tế của `sourceConflictsList`.
  + Tỷ lệ phần trăm bị chặn ở tối đa 99.9% nếu có bất kỳ lỗi nào.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-FIX8-05: [P0] Khắc Phục Subtest Return Value Ignored Trong `gate-runner.js`
- **Mức độ:** P0 (Độ tin cậy của Test Runner)
- **Tập tin liên quan:** `scripts/gate-runner.js`
- **Tái hiện trước sửa:**
  + Runner gọi subtests nhưng không kiểm tra return value, chỉ gọi `this.assert(true, '...')`.
- **Giải pháp triệt để:**
  + Thêm phương thức `assertSubtestSuccess(subtestResult, testName, gateResult)` bắt buộc `result.success === true && result.failed === 0`.
  + Tích hợp 4 bài kiểm tra Failure Injection trong Gate I chứng minh subtest lỗi là bị bắt ngay lập tức.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-FIX8-06: [P0] Nâng Cấp `test-gate-a-reference.js` Chứng Minh Tính Độc Lập Thực Sự
- **Mức độ:** P0 (Kiểm thử độc lập)
- **Tập tin liên quan:** `test/test-gate-a-reference.js`
- **Tái hiện trước sửa:**
  + Test Gate A chỉ kiểm tra 5 bài cơ bản, chưa kiểm tra can thiệp raw byte trên đĩa hoặc nested prize hash.
- **Giải pháp triệt để:**
  + Bổ sung 8 bài kiểm tra chuyên sâu: Build từ raw evidence Schema 2.0.0, sửa seed không đổi reference, sửa raw byte kích hoạt TAMPER_DETECTED, sửa parsedRecord kích hoạt PARSER_MISMATCH, sửa `prizes.first` và `lottoPairs` làm thay đổi `recordSha256`.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-FIX8-07: [P0] Đồng Bộ Runtime Inventory Giữa Gate Runner Và Báo Cáo
- **Mức độ:** P0 (Tính nhất quán của quy trình)
- **Tập tin liên quan:** `scripts/gate-runner.js`, `reports/fix8/`
- **Tái hiện trước sửa:**
  + Danh mục các Gate giữa runner và tài liệu chưa đồng bộ thống nhất.
- **Giải pháp triệt để:**
  + Chuẩn hóa danh mục 9 Gates: Gate A (Reference Independence), Gate B (Audit & 17 Mutations), Gate C (Ingestion Safety), Gate D (Immutable Logs), Gate E (Expected-Value Algorithm Tests), Gate F (Performance & Sentinel), Gate G (Cache Invalidation), Gate H (Browser E2E), Gate I (Runner Self-Tests).
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-FIX8-08: [P0] Mở Rộng 17 Mutation Tests & Verify Artifacts Từ Đĩa
- **Mức độ:** P0 (Fail-Closed Assurance)
- **Tập tin liên quan:** `test/test-audit-mutations.js`, `scripts/verify-artifacts.js`
- **Tái hiện trước sửa:**
  + Chỉ có 11 mutations, thiếu kiểm tra giải con, nested prizes, lottoPairs derivation, và stationId.
- **Giải pháp triệt để:**
  + Mở rộng lên đủ 17 mutations bao phủ toàn bộ các trường hợp sai lệch.
  + Kiểm tra toàn vẹn SHA-256 từ byte đĩa trước và sau khi chạy test để bảo vệ artifact gốc.
- **Trạng thái:** `CLOSED_VERIFIED`
