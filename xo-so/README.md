# LOTTO-QUANT LAB 🎰📊
## Nền Tảng Phân Tích & Dự Đoán Xổ Số Đa Thuật Toán (Vietlott & XSMN)
### Tích Hợp Động Cơ Dò Kết Quả & Kiểm Định Hồi Quy (Backtest Engine)

Dự án nghiên cứu định lượng ứng dụng toán xác suất thống kê và học máy vào chuỗi kết quả xổ số từ Minh Ngọc (`minhngoc.net.vn`). Dự án được thiết kế chuyên biệt phục vụ nộp báo cáo đề tài khoa học và triển khai công khai trực tiếp lên **Netlify**.

---

## 🌟 Các Tính Năng Nổi Bật

1. **Thu thập dữ liệu tự động từ Minh Ngọc**:
   - Cào kết quả **Xổ số Điện toán Vietlott** (Mega 6/45 & Power 6/55).
   - Cào kết quả **Xổ số Miền Nam (XSMN)** đầy đủ các đài quay thưởng hàng ngày (TP.HCM, Cần Thơ, Đồng Nai, Tây Ninh, An Giang,...).
   - Cơ chế 3 tầng dự phòng: Netlify Serverless Functions $\to$ CORS Proxy $\to$ Hạt giống 180+ kỳ quay offline.
2. **Bộ 8 Thuật Toán Khoa Học**:
   - ⚡ **Phân phối Poisson**: Ước lượng kỳ vọng xuất hiện theo phân phối xác suất Poisson.
   - ⚡ **Chuỗi Markov Bậc 1 & 2**: Ma trận xác suất chuyển trạng thái từ kết quả kỳ trước.
   - ⚡ **Mô phỏng Monte Carlo (10.000 lượt)**: Chạy 10.000 kịch bản ngẫu nhiên có trọng số thời gian.
   - ⚡ **Tần suất & Chu kỳ Lô Gan**: Tính chỉ số chín muồi chu kỳ (Ripeness Index).
   - ⚡ **Trung bình trượt EMA & Chu kỳ Thứ**: Nhận diện xung lượng và tính mùa vụ theo ngày trong tuần.
   - ⚡ **Phân tích Cấu trúc & Phân nhóm (Clustering Heuristics)**: Phân tích cấu trúc Chẵn/Lẻ, Tài/Xỉu và biên độ khoảng cách mean distance.
   - ⚡ **Khai phá Luật Bạc Nhớ & Chuyển tiếp Cặp (Association Heuristic & Pair Transition)**: Đo lường tần suất đồng xuất hiện và liên kết cho các cặp số hay đi kèm.
   - ⚡ **Mô hình Tổng Hợp (Normalized Ensemble Consensus)**: Chuẩn hóa thang điểm Min-Max nội bộ và hợp nhất bằng Normalized Soft Voting.
3. **Động cơ Dò Kết Quả & Đánh Giá Thực Nghiệm (Backtesting Engine)**:
   - Cho phép chọn bất kỳ ngày nào trong quá khứ để chạy thuật toán thử nghiệm.
   - **Loại bỏ 100% Lookahead Bias**: Chỉ sử dụng dữ liệu trước ngày cần dò để huấn luyện.
   - Tự động đối chiếu với kết quả thực tế mở thưởng ngày hôm đó: Tính % trúng (Hit Rate), số nháy trúng, khớp bóng Vietlott, trúng giải đặc biệt.
4. **Bảng Xếp Hạng Thuật Toán (Leaderboard)**:
   - Chạy kiểm định hàng loạt qua 20 - 30 kỳ quay gần nhất để tìm ra thuật toán có tỷ lệ trúng cao nhất.
5. **Giao Diện Fresh Light Modern & All-in-One Liền Mạch**:
   - Thiết kế phong cách tươi sáng, tinh tế (Slate-50 kết hợp trắng tuyết, vàng hổ phách, xanh royal, xanh ngọc bích, đỏ may mắn).
   - Trải nghiệm 1 trang duy nhất không cần bấm chuyển tab: toàn bộ 6 phần nội dung được bố cục tuần tự từ trên xuống dưới, người dùng chỉ lướt cuộn ngón tay tự nhiên. Thao tác bấm duy nhất là khi chuyển giữa Xổ Số Miền Nam và Vietlott.
   - Biểu đồ động tương tác bằng Chart.js, tối ưu responsive 100% trên cả máy tính và điện thoại.

---

## 📁 Cấu Trúc Thư Mục

```text
xo-so/
├── index.html                  # Giao diện chính Dashboard SPA
├── netlify.toml                # Cấu hình Netlify redirects & serverless functions
├── package.json                # Dependencies (cheerio, axios)
├── css/
│   ├── main.css                # Hệ thống màu sắc Dark Mode & layout
│   └── components.css          # Style bóng số, bảng xổ số, thẻ thuật toán
├── js/
│   ├── config.js               # Cấu hình đài, giải thưởng, metadata thuật toán
│   ├── data-service.js         # Service quản lý nạp dữ liệu & bộ nhớ đệm
│   ├── ui-controller.js        # Điều khiển render DOM và biểu đồ Chart.js
│   ├── backtest-engine.js      # Động cơ dò số và tính % trúng
│   ├── app.js                  # Entry point ứng dụng
│   └── algorithms/             # 8 Module thuật toán độc lập
│       ├── poisson.js
│       ├── markov.js
│       ├── monte-carlo.js
│       ├── frequency-gap.js
│       ├── moving-average.js
│       ├── clustering.js
│       ├── association-rules.js
│       └── ensemble.js
├── netlify/
│   └── functions/              # Serverless crawler cào từ Minh Ngọc
│       ├── crawl-vietlott.js
│       └── crawl-xsmn.js
├── data/
│   └── historical-seed.json    # Bộ dữ liệu 180+ kỳ thực tế đề phòng offline
└── docs/
    └── scientific-report.md    # Báo cáo khoa học & công thức toán học nộp đề tài
```

---

## 🚀 HƯỚNG DẪN TRIỂN KHAI LÊN NETLIFY (PUBLIC TOÀN CẦU)

Bạn có thể đưa trang web lên Netlify để bất kỳ ai ở đâu cũng có thể truy cập chỉ trong 1 phút bằng 1 trong 3 cách sau:

### Cách 1: Kéo thả trực tiếp (Đơn giản nhất - Không cần cài đặt gì)
1. Đăng ký/Đăng nhập tài khoản miễn phí tại [netlify.com](https://www.netlify.com).
2. Truy cập vào trang: **[app.netlify.com/drop](https://app.netlify.com/drop)**.
3. Kéo toàn bộ thư mục `xo-so` và thả vào ô tải lên trên trình duyệt.
4. Netlify sẽ tự động đóng gói và cung cấp cho bạn một đường link công khai dạng `https://ten-du-an.netlify.app`.

### Cách 2: Triển khai qua lệnh Netlify CLI
1. Mở terminal tại thư mục `xo-so`:
   ```bash
   cd xo-so
   npx netlify deploy --prod
   ```
2. Đăng nhập và làm theo hướng dẫn trên màn hình, trang web sẽ được xuất bản ngay lập tức.

### Cách 3: Kết nối qua GitHub Repository
1. Đẩy mã nguồn thư mục `xo-so` lên kho lưu trữ GitHub của bạn.
2. Trên bảng điều khiển Netlify, chọn **Add new site** $\to$ **Import an existing project** $\to$ Chọn GitHub repo.
3. Nhấn **Deploy site**. Mỗi khi bạn cập nhật code trên GitHub, Netlify sẽ tự động build lại phiên bản mới nhất.

---

## 💻 HƯỚNG DẪN CHẠY THỬ NGHIỆM TẠI MÁY CỤC BỘ (LOCAL)

Nếu muốn chạy kiểm thử trực tiếp trên máy tính của bạn:

```bash
# 1. Di chuyển vào thư mục xo-so
cd xo-so

# 2. Chạy máy chủ tĩnh
npx serve .
# Hoặc chạy với Netlify Dev (hỗ trợ cả serverless functions):
# npx netlify dev
```

Sau đó mở trình duyệt tại: `http://localhost:3000` hoặc cổng được hiển thị trên terminal.

---

## 🎓 TÀI LIỆU NỘP ĐỀ TÀI

Toàn bộ thuyết minh công thức toán học, phương pháp luận nghiên cứu và phân tích số liệu thực nghiệm đã được biên soạn chi tiết tại tệp:
👉 **[docs/scientific-report.md](docs/scientific-report.md)**

Bạn có thể sao chép trực tiếp nội dung này vào báo cáo Word hoặc tạo slide thuyết trình bảo vệ đề tài.
