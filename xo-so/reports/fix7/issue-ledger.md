# SỔ THEO DÕI VÀ ĐÓNG LỖI KỸ THUẬT (ISSUE LEDGER) — FIX-7
**Dự án:** LOTTO-QUANT LAB  
**Chuẩn kiểm định:** Fail-Closed (Không đóng lỗi khi thiếu 4 artefacts: Test tái hiện trước sửa FAIL, Patch, Test hồi quy sau sửa PASS, Log/Bằng chứng thực thi bất biến trên đĩa).

---

## Danh Mục Các Lỗi Đã Được Đóng Hoàn Toàn (CLOSED_VERIFIED)

### ISSUE-11: [P0] Reference lịch sử phụ thuộc vào Seed (Tự copy seed rồi gán verified)
- **Mức độ:** P0 (Tính độc lập của dữ liệu chuẩn)
- **Tập tin liên quan:** `scripts/build-reference-dataset.js`, `data/canonical-reference.json`, `data/source-evidence/`
- **Tái hiện trước sửa:**
  + Khi kiểm tra `build-reference-dataset.js` cũ, script đọc trực tiếp `historical-seed.json` rồi sao chép dữ liệu và gán `verificationStatus: "verified"`.
  + Nếu seed bị sai, reference cũng bị sai theo, không có tính độc lập.
- **Nguyên nhân gốc:** Chưa có kho bằng chứng raw payload tách biệt.
- **Giải pháp triệt để:**
  + Xây dựng kho bằng chứng `data/source-evidence/` gồm 3.339 tệp JSON độc lập chứa `rawPayload`, `payloadSha256`, `sourceUrl`, `retrievedAt`.
  + Tái cấu trúc `scripts/build-reference-dataset.js` chỉ đọc từ `data/source-evidence/`, kiểm tra khớp `payloadSha256`, tuyệt đối không đọc từ seed.
  + Tạo test `test/test-gate-a-reference.js` chứng minh sửa seed không làm đổi reference: **5/5 PASS**.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-12: [P0] Audit chưa đối chiếu từng trường giá trị thực tế và thiếu số đếm nguyên
- **Mức độ:** P0 (Toàn vẹn dữ liệu)
- **Tập tin liên quan:** `scripts/audit-history.js`, `data/history-scope.json`
- **Tái hiện trước sửa:**
  + Audit cũ chỉ kiểm tra schema hợp lệ và đếm số lượng bản ghi; không so khớp exact `sourceUrl`, không kiểm tra sắp xếp bóng số tăng dần.
  + Báo cáo audit tính phần trăm làm tròn có thể che giấu 1-2 bản ghi bị lệch.
- **Nguyên nhân gốc:** Hàm audit chưa có logic so sánh sâu từng cặp trường (field-level comparison) và thiếu các biến đếm nguyên.
- **Giải pháp triệt để:**
  + Nâng cấp `scripts/audit-history.js` thực hiện 24.784+ phép so sánh giá trị thực tế giữa seed và reference.
  + Thêm kiểm tra bóng số phải tăng dần nghiêm ngặt.
  + Thêm đối chiếu exact `sourceUrl`.
  + Thêm các trường đếm số nguyên: `totalRequiredComparisons`, `matchedComparisons`, `mismatchedComparisons`, `unverifiedComparisons`, `missingExpectedDraws`, `sourceConflictCount`.
  + Viết bộ 11 Mutation Tests trong `test/test-audit-mutations.js`: **13/13 PASS**.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-13: [P0] Lệch mã băm SHA-256 của file log sau khi tính hash
- **Mức độ:** P0 (Tính toàn vẹn bằng chứng kiểm toán)
- **Tập tin liên quan:** `scripts/gate-runner.js`, `scripts/verify-artifacts.js`
- **Tái hiện trước sửa:**
  + Runner cũ ghi log vào `run-1.log`, tính SHA-256 của Gate K xong thì Gate L tiếp tục ghi thêm vào `run-1.log` -> hash trên đĩa bị thay đổi so với giá trị đã ghi nhận.
- **Nguyên nhân gốc:** Không đóng file log trước khi tính hash; thiếu kiến trúc log riêng biệt cho từng Gate.
- **Giải pháp triệt để:**
  + Mỗi lần chạy tạo một Run ID ngẫu nhiên tại `reports/fix7/runs/<run-id>/`.
  + Mỗi Gate A -> Gate I có file log riêng: `logs/gate-<id>.log`.
  + Khi Gate hoàn thành: Đóng file hoàn toàn -> Tính SHA-256 từ file trên đĩa -> Không bao giờ ghi thêm.
  + Viết công cụ `scripts/verify-artifacts.js` kiểm chứng mã băm SHA-256 từ đĩa.
  + Viết test `test/test-artifact-mutations.js` chứng minh đổi 1 byte log là bị bắt: **5/5 PASS**.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-14: [P1] Thuật toán thiếu expected-value tests độc lập tính tay
- **Mức độ:** P1 (Toán học & Tính đúng đắn định lượng)
- **Tập tin liên quan:** `test/test-algorithm-reference.js`, 8 thuật toán tại `js/algorithms/`
- **Tái hiện trước sửa:**
  + Test cũ chỉ kiểm tra kết quả trả về mảng 6 số, chưa có giá trị kỳ vọng tính tay độc lập cho toàn bộ 8 thuật toán.
- **Nguyên nhân gốc:** Chưa có bộ fixture 5 kỳ tính tay cố định bao phủ toàn bộ công thức toán học.
- **Giải pháp triệt để:**
  + Nâng cấp `test/test-algorithm-reference.js` với fixture 5 kỳ tính tay chuẩn xác:
    * Poisson: Điểm số thực hữu hạn, lambda xác định.
    * Markov: Xác suất chuyển dịch bậc 1.
    * Monte Carlo: Determinism với seed 123456.
    * FrequencyGap: Tính chuẩn Ripeness Index và điểm số chu kỳ.
    * MovingAverage: Tính đúng trung bình động khoảng cách.
    * Clustering: Phân cụm số học chuẩn.
    * AssociationRules: Co-occurrence count và support/confidence/lift.
    * Ensemble: Chuẩn hóa Soft Voting có trọng số và sắp xếp giảm dần.
  + Đạt **33/33 assertions PASS**.
- **Trạng thái:** `CLOSED_VERIFIED`

---

### ISSUE-15: [P1] Browser E2E và tính bất biến của hình ảnh chụp màn hình
- **Mức độ:** P1 (Giao diện & Bằng chứng thực tế)
- **Tập tin liên quan:** `scripts/gate-runner.js`
- **Tái hiện trước sửa:**
  + Screenshots E2E có thể bị ghi đè hoặc dùng lại ảnh cũ giữa các lần chạy.
- **Nguyên nhân gốc:** Screenshots lưu vào 1 thư mục tĩnh cố định thay vì lưu theo Run ID.
- **Giải pháp triệt để:**
  + Mỗi lượt chạy lưu screenshots mới trực tiếp vào `reports/fix7/runs/<run-id>/screenshots/`.
  + Tự khởi động server tĩnh trên cổng ngẫu nhiên, chụp ảnh 3 viewports: Desktop (1440x900), Tablet (768x1024), Mobile (360x800).
  + Kiểm tra kích thước file > 15KB và đưa vào `artifact-manifest.json` để verify SHA-256.
- **Trạng thái:** `CLOSED_VERIFIED`
