# ĐẶC TẢ THIẾT KẾ HỆ THỐNG: LOTTO-QUANT LAB
## Nền Tảng Phân Tích & Dự Đoán Xổ Số Đa Thuật Toán (Vietlott & XSMN)

- **Ngày tạo**: 2026-10-15
- **Mục tiêu**: Đề tài nghiên cứu ứng dụng phương pháp xác suất thống kê và máy học cơ bản vào phân tích chuỗi kết quả xổ số (XSMN & Vietlott), tích hợp cơ chế đối soát hồi quy (Backtesting) kiểm định độ chính xác thực tế, triển khai công khai trên nền tảng Netlify.
- **Thư mục dự án**: `c:\Users\Admin\Downloads\Web\xo-so`

---

## 1. Mục Tiêu & Phạm Vi Đề Tài (Objectives & Scope)

### 1.1. Mục tiêu học thuật & ứng dụng
1. **Thu thập dữ liệu tự động**: Cào kết quả kỳ quay từ trang Minh Ngọc (`minhngoc.net.vn`) cho hai luồng dữ liệu chính:
   - Vietlott: Mega 6/45 và Power 6/55.
   - XSMN: Các đài mở thưởng trong ngày (TP.HCM, Cần Thơ, Đồng Nai, Tây Ninh, An Giang,...).
2. **Triển khai 8 thuật toán định lượng**:
   - Phân phối Poisson (Poisson Distribution).
   - Ma trận chuyển dịch chuỗi Markov bậc 1 & bậc 2 (Markov Chain Transition Matrix).
   - Mô phỏng Monte Carlo (Monte Carlo Simulation - 10.000 lượt).
   - Phân tích Tần suất & Chu kỳ Lô Gan (Frequency & Gap Analysis).
   - Chuỗi thời gian & Trung bình trượt (EMA / SMA & Day-of-Week Seasonality).
   - Phân cụ Đầu - Đuôi & Tổng số học (K-Means Clustering & Digit Parity).
   - Khai phá Luật Kết hợp (Association Rules / Co-occurrence Mining - "Bạc Nhớ").
   - Mô hình Tổng hợp Bỏ phiếu (Ensemble Consensus Voting Engine).
3. **Động cơ Dò kết quả & Đánh giá (Backtesting Engine)**:
   - Cho phép chọn ngày quá khứ $D$, chạy thuật toán chỉ dựa trên dữ liệu $\le D-1$ (loại trừ lookahead bias).
   - Đối chiếu với kết quả ngày $D$: tính % trúng lô tô 2 số (Hit rate %), số nháy trúng, khớp bóng Vietlott (3/6, 4/6, 5/6, Jackpot).
   - Xây dựng Bảng xếp hạng thuật toán (Algorithm Leaderboard) theo chuỗi 30 kỳ kiểm định.
4. **Triển khai Netlify**: Đóng gói chuẩn serverless API + static web trong thư mục `xo-so/`, hỗ trợ truy cập online 24/7 từ bất kỳ đâu.

---

## 2. Kiến Trúc Hệ Thống (Architecture & Folder Structure)

```text
xo-so/
├── netlify.toml                      # Cấu hình Netlify redirects & serverless functions
├── package.json                      # Quản lý dependencies (cheerio, axios, netlify-cli)
├── index.html                        # Giao diện Dashboard SPA duy nhất
├── css/
│   ├── main.css                      # Hệ thống màu sắc Dark Mode, typography, layout
│   └── components.css                # Style cho cards, badges, modal, tables, charts
├── js/
│   ├── config.js                     # Cấu hình đài XSMN, lịch quay, hằng số giải thưởng
│   ├── data-service.js               # Service quản lý gọi API / Cache / Fallback seed
│   ├── algorithms/                   # 8 module thuật toán độc lập
│   │   ├── poisson.js
│   │   ├── markov.js
│   │   ├── monte-carlo.js
│   │   ├── frequency-gap.js
│   │   ├── moving-average.js
│   │   ├── clustering.js
│   │   ├── association-rules.js
│   │   └── ensemble.js
│   ├── backtest-engine.js            # Kiểm thử hồi quy, dò số và tính % độ chính xác
│   ├── ui-controller.js              # Quản lý render DOM, tabs, bộ lọc ngày và đài
│   └── app.js                        # Khởi tạo ứng dụng & kết nối các thành phần
├── netlify/
│   └── functions/
│       ├── crawl-vietlott.js         # Serverless crawler Vietlott từ Minh Ngọc
│       └── crawl-xsmn.js             # Serverless crawler XSMN từ Minh Ngọc
├── data/
│   └── historical-seed.json          # Bộ dữ liệu 60 kỳ thực tế đề phòng offline
└── docs/
    └── scientific-report.md          # Tài liệu thuyết minh công thức toán học cho đề tài
```

---

## 3. Đặc Tả Dữ Liệu & Bộ Thu Thập (Data & Crawler Specification)

### 3.1. Nguồn dữ liệu Minh Ngọc
- URL 1: `https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott.html`
- URL 2: `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam.html`

### 3.2. Cấu trúc dữ liệu chuẩn hóa (Data Schema)
```typescript
interface DrawResultXSMN {
  date: string;           // "YYYY-MM-DD"
  station: string;        // "TP.HCM", "Đồng Nai", ...
  prizes: {
    special: string[];    // ["123456"]
    first: string[];      // ["65432"]
    second: string[];
    third: string[];
    fourth: string[];
    fifth: string[];
    sixth: string[];
    seventh: string[];
    eighth: string[];     // ["89"]
  };
  lottoPairs: string[];   // Toàn bộ 18 con số lô 2 số cuối rút trích từ các giải
  headTail: {
    head: Record<string, string[]>; // Đầu 0-9
    tail: Record<string, string[]>; // Đuôi 0-9
  };
}

interface DrawResultVietlott {
  date: string;           // "YYYY-MM-DD"
  gameType: "mega-6-45" | "power-6-55";
  drawId: string;         // Mã kỳ quay, ví dụ "#01234"
  winningNumbers: number[]; // [03, 12, 25, 33, 41, 45]
  bonusNumber?: number;   // Số đặc biệt (đối với Power 6/55)
  jackpot1Est: string;    // Giá trị ước tính
}
```

### 3.3. Cơ chế Kháng lỗi (Resilience Strategy)
1. **Serverless Crawler**: Hàm `crawl-vietlott.js` và `crawl-xsmn.js` chạy trên môi trường Node.js của Netlify, dùng `cheerio` để parse bảng DOM, không bị rào cản CORS của trình duyệt.
2. **CORS Proxy Fallback**: Nếu IP Netlify tạm thời bị chặn hoặc mạng chậm, client tự động kích hoạt truy vấn phụ trợ qua proxy dự phòng.
3. **Historical Seed Cache (`data/historical-seed.json`)**: Chứa sẵn 60 kỳ quay lịch sử chuẩn xác. Khi máy chấm thi không có mạng hoặc truy cập chậm, toàn bộ ứng dụng vẫn phân tích và chạy mô hình mượt mà không có độ trễ.

---

## 4. Đặc Tả 8 Thuật Toán Định Lượng (Algorithmic Models)

### 4.1. Phân phối Poisson (Poisson Distribution)
- Tham số: $\lambda_i = \frac{\text{Số lần số } i \text{ xuất hiện trong } N \text{ kỳ}}{N}$.
- Xác suất kỳ tới số $i$ xuất hiện ít nhất 1 lần: $P_i = 1 - e^{-\lambda_i}$.
- Xếp hạng điểm số từ cao xuống thấp để chọn ra tập ứng viên.

### 4.2. Chuỗi Markov Bậc 1 & Bậc 2 (Markov Chain Transition)
- Xây dựng ma trận chuyển dịch trạng thái kích thước $100 \times 100$ (với XSMN: các cặp số từ 00 đến 99) hoặc $45 \times 45 / 55 \times 55$ (với Vietlott).
- Tính xác suất điều kiện: $P(S_t = j \mid S_{t-1} = i) = \frac{\text{Count}(i \to j)}{\text{Count}(i)}$.
- Dự đoán dựa trên các số $i$ vừa xuất hiện ở kỳ $t-1$.

### 4.3. Mô phỏng Monte Carlo (Monte Carlo 10,000 Iterations)
- Xây dựng hàm phân phối tích lũy (CDF) từ trọng số tần suất và chu kỳ lịch sử.
- Chạy 10.000 lượt quay ảo ngẫu nhiên theo phân phối tích lũy.
- Ghi nhận phân phối xác suất thực nghiệm và lọc ra bộ số có tần suất xuất hiện cao nhất trong 10.000 kịch bản.

### 4.4. Phân tích Tần suất & Chu kỳ Lô Gan (Frequency & Gap Analysis)
- Đo lường: Khoảng cách hiện tại $G_i$, chu kỳ trung bình $E[G_i]$, chu kỳ cực đại $\max(G_i)$.
- Chỉ số chín muồi (Ripeness Index): $R_i = \frac{G_i}{E[G_i]}$.
- Cảnh báo số "siêu gan" vượt ngưỡng cực đại và phát hiện các số đang ở điểm rơi chu kỳ chuẩn.

### 4.5. Chuỗi thời gian & Trung bình trượt (EMA / SMA & Seasonality)
- Tính đường trung bình động hàm mũ cho xác suất xuất hiện: $\text{EMA}_t = \alpha \cdot X_t + (1 - \alpha) \cdot \text{EMA}_{t-1}$.
- Phân tích tương quan theo thứ trong tuần (Day-of-Week Seasonality): Tách chu kỳ riêng cho từng ngày mở thưởng của mỗi đài.

### 4.6. Phân cụ Đầu - Đuôi & Tổng (K-Means Clustering & Digit Parity)
- Không gian đặc trưng 3 chiều: Tỷ lệ Chẵn/Lẻ, Tỷ lệ Tài/Xỉu (ngưỡng 50), Tổng chữ số (Sum of digits).
- Phân cụm các kỳ quay lịch sử để xác định cấu trúc hình học của kỳ quay tiếp theo (ví dụ: kỳ tới xác suất rơi vào cụm 60% Chẵn, Tổng từ 110-140).

### 4.7. Khai phá Luật Kết hợp (Association Rules Mining - "Bạc Nhớ")
- Áp dụng nguyên lý Apriori: Tính Support, Confidence và Lift cho các cặp số $(A \Rightarrow B)$.
- $\text{Lift}(A \Rightarrow B) = \frac{P(A \cap B)}{P(A) \cdot P(B)}$.
- Lọc ra các quy luật có $\text{Lift} > 1.5$ và $\text{Confidence} > 40\%$.

### 4.8. Mô hình Tổng hợp Bỏ phiếu (Ensemble Consensus Scoring Engine)
- Mỗi thuật toán chuẩn hóa điểm số $S_k(i) \in [0, 100]$ cho từng con số $i$.
- Điểm tổng hợp: $E(i) = \sum_{k=1}^7 w_k \cdot S_k(i)$, với $\sum w_k = 1$.
- Trọng số $w_k$ được hiệu chỉnh động dựa trên hiệu suất trúng thực tế trong 10 kỳ gần nhất của thuật toán đó.
- Trả về danh sách Top 5 số tiềm năng nhất kèm % Độ tin cậy (Confidence Rate).

---

## 5. Đặc Tả Động Cơ Dò Kết Quả & Đối Soát (Backtest Engine)

1. **Giao diện Dò số**:
   - Chọn Đài xổ số và Chọn Ngày quay trong lịch sử (từ danh sách các kỳ đã lưu).
   - Nút "Thực thi Dò Số & Đánh Giá".
2. **Quy trình Thực thi (No Lookahead Bias)**:
   - Cắt lát dữ liệu: `historicalData.filter(draw => draw.date < selectedDate)`.
   - Nạp dữ liệu cắt lát vào 8 thuật toán để sinh dự đoán cho ngày `selectedDate`.
   - Lấy kết quả thực tế mở thưởng của ngày `selectedDate`.
3. **Chỉ số Đánh giá (Metrics Calculation)**:
   - **XSMN**:
     - Tỷ lệ Trúng Lô: $\text{Hit Rate} = \frac{\text{Số con trúng}}{\text{Số con dự đoán}} \times 100\%$.
     - Số nháy trúng (Một số trúng nhiều giải).
     - Kiểm tra trúng Đầu / Đuôi / Giải Đặc Biệt.
   - **Vietlott**:
     - Số lượng bóng trùng khớp (Match 3/6, 4/6, 5/6, 6/6).
     - Đánh giá trúng giải thưởng quy đổi tương đương.
4. **Bảng Xếp Hạng Hiệu Suất (Algorithm Leaderboard)**:
   - Chạy hàng loạt (Batch Backtest) qua 30 kỳ gần nhất.
   - Bảng tổng hợp so sánh % trúng trung bình của từng thuật toán.
   - Biểu đồ đường trực quan thể hiện biến động độ chính xác theo thời gian.

---

## 6. Thiết Kế Giao Diện & Trải Nghiệm Người Dùng (UI/UX)

- **Phong cách thị giác**: Dark Mode phòng Lab Khoa Học Dữ Liệu (Quantitative Research Terminal).
  - Background: `#0B0F19` (Deep Obsidian).
  - Surface/Card: `#111827` với viền mỏng glassmorphism `#1F2937` & shadow neon nhẹ.
  - Accent colors:
    - Cyan `#06B6D4`: Trạng thái crawler & Vietlott.
    - Emerald `#10B981`: Tỷ lệ trúng, điểm tin cậy cao, số trúng thưởng.
    - Violet `#8B5CF6`: Thuật toán học máy & Ensemble.
    - Amber `#F59E0B`: Cảnh báo Lô Gan & số liệu chú ý.
- **Biểu đồ động**: Sử dụng Chart.js (tải qua CDN nhanh, không cần build nặng):
  - Biểu đồ cột: Tần suất xuất hiện & Phân phối Poisson.
  - Biểu đồ đường: Biến động hiệu suất thuật toán qua các kỳ.
  - Ma trận Heatmap: Bảng 10x10 các cặp số từ 00 đến 99 thể hiện độ nóng/lạnh.

---

## 7. Cấu Hình & Triển Khai Netlify (Netlify Deployment)

### 7.1. File `xo-so/netlify.toml`
```toml
[build]
  publish = "."
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/crawl-vietlott"
  to = "/.netlify/functions/crawl-vietlott"
  status = 200

[[redirects]]
  from = "/api/crawl-xsmn"
  to = "/.netlify/functions/crawl-xsmn"
  status = 200
```

### 7.2. Hướng dẫn Public lên Netlify:
1. Đăng ký tài khoản miễn phí tại [netlify.com](https://www.netlify.com).
2. Kéo thả trực tiếp thư mục `xo-so` vào [app.netlify.com/drop](https://app.netlify.com/drop) hoặc đẩy lên kho lưu trữ GitHub và chọn repo trong Netlify.
3. Nhận ngay đường dẫn URL công khai dạng `https://xo-so-quant-lab.netlify.app`.
