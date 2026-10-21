# LOTTO-QUANT LAB: Kế Hoạch Triển Khai (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hoàn chỉnh hệ thống web phân tích và dự đoán xổ số đa thuật toán (Vietlott & XSMN), tích hợp công cụ dò số và tính % trúng thực nghiệm (Backtest), đóng gói trong thư mục `xo-so/` sẵn sàng triển khai công khai lên Netlify.

**Architecture:** Frontend Single Page Application (SPA) với giao diện Dark Mode Quant Terminal, kết hợp Chart.js trực quan hóa. Backend sử dụng Netlify Serverless Functions (Node.js + Cheerio) cào dữ liệu từ 2 đường dẫn Minh Ngọc, có 3 tầng dự phòng (Serverless Crawler $\to$ CORS Proxy Fallback $\to$ Historical Seed Data 60 kỳ) đảm bảo hoạt động 100% không gián đoạn. 8 module thuật toán độc lập cùng động cơ dò số không dính thiên kiến nhìn trước (No Lookahead Bias).

**Tech Stack:** Vanilla HTML5, Vanilla CSS3 (Custom Glassmorphism & Neon Design System), JavaScript ES6+ Modules, Node.js Serverless Functions (Cheerio, Axios), Chart.js (CDN), Netlify CLI / TOML.

**Spec:** [docs/superpowers/specs/2026-10-15-xo-so-quant-design.md](file:///c:/Users/Admin/Downloads/Web/docs/superpowers/specs/2026-10-15-xo-so-quant-design.md)

---

## Global Constraints

- Toàn bộ mã nguồn, tài nguyên, hàm serverless và tài liệu phải nằm gọn trong thư mục `c:\Users\Admin\Downloads\Web\xo-so`.
- Không sử dụng TailwindCSS (tuân thủ nguyên tắc Vanilla CSS trừ khi được yêu cầu).
- Không để xảy ra lỗi CORS khi gọi dữ liệu ngoài (sử dụng Netlify Functions và Fallback Seed).
- Dữ liệu dự đoán và dò kết quả lịch sử phải loại trừ hoàn toàn Lookahead Bias (chỉ dùng dữ liệu $\le D-1$ để dự đoán cho ngày $D$).
- Tương thích tốt trên cả màn hình máy tính và điện thoại thông minh (Responsive Design).

## Review Focus

1. **Kháng lỗi mạng & Minh Ngọc đổi HTML**: Nếu web Minh Ngọc phản hồi chậm hoặc cấu trúc bảng thay đổi, hệ thống phải tự động chuyển sang tập dữ liệu hạt giống 60 kỳ mà không làm sập giao diện.
2. **Độ chính xác phép tính chuỗi Markov & Monte Carlo**: Ma trận chuyển dịch phải xử lý đúng trường hợp số chưa từng xuất hiện (tránh chia cho 0 hoặc NaN).
3. **Phân biệt đúng quy tắc Vietlott và XSMN**: Vietlott rút 6 bóng trong tập 45 hoặc 55 bóng; XSMN tính 18 giải rút trích ra các cặp lô 2 số cuối (00-99) và Giải Đặc Biệt.
4. **Đúng ngày mở thưởng theo đài XSMN**: Mỗi ngày trong tuần có các đài cố định (Thứ 2: TP.HCM, Đồng Tháp, Cà Mau; Thứ 7: TP.HCM, Long An, Bình Phước, Hậu Giang...).
5. **Định dạng hiển thị số**: Luôn giữ số có 2 chữ số (ví dụ: `03`, `09`) để không làm lệch bảng hiển thị và ma trận xác suất.

---

## Tasks

### Task 1: Khởi Tạo Dự Án & Cấu Hình Netlify
**Files:**
- Create: `xo-so/package.json`
- Create: `xo-so/netlify.toml`
- Create: `xo-so/js/config.js`

**Interfaces:**
- Produces: `LOTTO_CONFIG` (lịch quay các đài XSMN, các loại vé Vietlott, danh sách 8 thuật toán, hằng số ngưỡng).

- [x] **Step 1: Viết kiểm thử kiểm tra file cấu hình**
- [x] **Step 2: Tạo `xo-so/package.json` khai báo dependencies (axios, cheerio)**
- [x] **Step 3: Tạo `xo-so/netlify.toml` cấu hình build và redirect `/api/*`**
- [x] **Step 4: Tạo `xo-so/js/config.js` chứa metadata đài quay, quy tắc giải, và trọng số thuật toán**

---

### Task 2: Xây Dựng Bộ Dữ Liệu Hạt Giống 60 Kỳ (Historical Seed Data)
**Files:**
- Create: `xo-so/data/historical-seed.json`

**Interfaces:**
- Produces: JSON dataset chứa 60 kỳ quay thực tế gần nhất của Vietlott (Mega 6/45, Power 6/55) và XSMN (các đài chính: TP.HCM, Cần Thơ, Đồng Nai, Tây Ninh, Tiền Giang, An Giang...).

- [x] **Step 1: Tạo tập dữ liệu chuẩn cho XSMN theo cấu trúc `DrawResultXSMN`**
- [x] **Step 2: Tạo tập dữ liệu chuẩn cho Vietlott (Mega 6/45 và Power 6/55)**
- [x] **Step 3: Kiểm tra định dạng JSON hợp lệ không có lỗi cú pháp**

---

### Task 3: Netlify Serverless Functions & Service Quản Lý Dữ Liệu
**Files:**
- Create: `xo-so/netlify/functions/crawl-vietlott.js`
- Create: `xo-so/netlify/functions/crawl-xsmn.js`
- Create: `xo-so/js/data-service.js`

**Interfaces:**
- Consumes: URL Minh Ngọc, `historical-seed.json`.
- Produces: `DataService.getXSMNResults(station, limit)`, `DataService.getVietlottResults(gameType, limit)`, `DataService.syncLiveMinhNgoc()`.

- [x] **Step 1: Viết serverless function `crawl-vietlott.js` bóc tách DOM Minh Ngọc**
- [x] **Step 2: Viết serverless function `crawl-xsmn.js` bóc tách bảng giải thưởng XSMN**
- [x] **Step 3: Viết `xo-so/js/data-service.js` với cơ chế 3 lớp (API $\to$ Proxy $\to$ Seed Cache) và lưu vào `localStorage`**

---

### Task 4: Triển Khai 8 Module Thuật Toán Phân Tích & Dự Đoán
**Files:**
- Create: `xo-so/js/algorithms/poisson.js`
- Create: `xo-so/js/algorithms/markov.js`
- Create: `xo-so/js/algorithms/monte-carlo.js`
- Create: `xo-so/js/algorithms/frequency-gap.js`
- Create: `xo-so/js/algorithms/moving-average.js`
- Create: `xo-so/js/algorithms/clustering.js`
- Create: `xo-so/js/algorithms/association-rules.js`
- Create: `xo-so/js/algorithms/ensemble.js`

**Interfaces:**
- Standard Algorithm Interface: `predict(historyData, options: { gameType, station, topN }) -> { predictions: string[]|number[], scores: Record<string, number>, metadata: object, explanation: string }`
- `ensemble.js`: Tổng hợp điểm từ 7 thuật toán và trả về kết quả tối ưu nhất với % Confidence.

- [x] **Step 1: Triển khai `poisson.js` (Phân phối Poisson)**
- [x] **Step 2: Triển khai `markov.js` (Ma trận chuyển dịch chuỗi Markov)**
- [x] **Step 3: Triển khai `monte-carlo.js` (10.000 lượt mô phỏng ngẫu nhiên có trọng số)**
- [x] **Step 4: Triển khai `frequency-gap.js` (Tần suất & Chu kỳ Lô Gan)**
- [x] **Step 5: Triển khai `moving-average.js` (EMA & Chu kỳ thứ trong tuần)**
- [x] **Step 6: Triển khai `clustering.js` (Phân cụ Chẵn-Lẻ, Tài-Xỉu, Biên độ Tổng)**
- [x] **Step 7: Triển khai `association-rules.js` (Khai phá luật kết hợp / Bạc nhớ)**
- [x] **Step 8: Triển khai `ensemble.js` (Tổng hợp trọng số đa thuật toán)**

---

### Task 5: Động Cơ Dò Kết Quả & Đánh Giá Thực Nghiệm (Backtesting Engine)
**Files:**
- Create: `xo-so/js/backtest-engine.js`

**Interfaces:**
- Produces:
  - `runSingleDateBacktest(date, stationOrGame, algorithms)`
  - `runBatchBacktest(stationOrGame, numDraws)`
  - `calculateMetrics(actualResult, predictions)` $\to$ Hit Rate %, Hits count, Match details.

- [x] **Step 1: Viết logic lọc dữ liệu nghiêm ngặt loại trừ Lookahead Bias**
- [x] **Step 2: Viết hàm đối chiếu kết quả dự đoán với bảng mở thưởng thực tế (XSMN & Vietlott)**
- [x] **Step 3: Viết bộ đánh giá hiệu suất hàng loạt (Batch Leaderboard)**

---

### Task 6: Hệ Thống Giao Diện Dark Mode Quant Terminal (CSS)
**Files:**
- Create: `xo-so/css/main.css`
- Create: `xo-so/css/components.css`

**Interfaces:**
- Produces: Thiết kế Dark Mode phong cách Quantitative Lab, Glassmorphism cards, glow effects, badge trạng thái, responsive typography, layout lưới cho biểu đồ và bảng kết quả.

- [x] **Step 1: Xây dựng design tokens trong `main.css` (màu sắc neon, nền Obsidian, typography Inter/Outfit)**
- [x] **Step 2: Thiết kế `components.css` cho bảng xổ số truyền thống, bóng số Vietlott, thẻ thuật toán, bảng thống kê và leaderboard**

---

### Task 7: Lắp Ráp Giao Diện Ứng Dụng & Điều Khiển Biểu Đồ
**Files:**
- Create: `xo-so/index.html`
- Create: `xo-so/js/ui-controller.js`
- Create: `xo-so/js/app.js`

**Interfaces:**
- Tích hợp toàn bộ components: Header status, Tabs (Kết quả mới nhất, Dự đoán đa thuật toán, Dò số lịch sử, Bảng xếp hạng & Thuyết minh đề tài), Chart.js renderers.

- [x] **Step 1: Xây dựng cấu trúc HTML5 ngữ nghĩa đầy đủ tại `index.html`**
- [x] **Step 2: Viết `ui-controller.js` xử lý chuyển tab, render bảng kết quả, bóng số, và biểu đồ Chart.js**
- [x] **Step 3: Viết `app.js` kết nối sự kiện người dùng (chọn đài, chọn ngày dò số, bấm nút dự đoán)**

---

### Task 8: Tài Liệu Thuyết Minh Học Thuật & Hướng Dẫn Netlify
**Files:**
- Create: `xo-so/docs/scientific-report.md`
- Create: `xo-so/README.md`

**Interfaces:**
- Produces: Bản thuyết minh công thức toán học chi tiết phục vụ viết báo cáo đề tài + Hướng dẫn 1-click deploy lên Netlify.

- [x] **Step 1: Soạn thảo `docs/scientific-report.md` đầy đủ cơ sở lý thuyết, công thức và trích dẫn**
- [x] **Step 2: Soạn thảo `README.md` hướng dẫn chạy local và triển khai lên Netlify**

---

### Task 9: Kiểm Thử Toàn Diện & Xác Minh Ứng Dụng
- [x] **Step 1: Chạy máy chủ kiểm thử cục bộ**
- [x] **Step 2: Xác minh hoạt động của 8 thuật toán trên dữ liệu thật**
- [x] **Step 3: Kiểm tra tính năng dò kết quả và tính % chính xác**
- [x] **Step 4: Dùng browser subagent kiểm tra trực quan giao diện**
