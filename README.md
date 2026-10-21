# 🎰 LOTTO-QUANT LAB

> **Hệ Thống Phân Tích Xác Suất & Kiểm Định Hồi Quy Xổ Số Kiến Thiết Miền Nam (XSMN) & Vietlott (Mega 6/45, Power 6/55)**
> 
> Tích hợp 8 Mô hình Định lượng AI & Biểu đồ Hội tụ Chartist.dev SVG siêu tốc.

---

## 🌟 Tính Năng Nổi Bật

- **8 Thuật toán Định lượng Độc lập & Ensemble Consensus:**
  1. Mô hình Tổng hợp (Ensemble Model)
  2. Chuỗi Markov Bậc 1 & Ma trận Chuyển dịch Trạng thái
  3. Phân phối Poisson & Tần suất Thực nghiệm
  4. Mô phỏng Số học Monte Carlo (10.000 kịch bản ngẫu nhiên)
  5. Tần suất & Chu kỳ Lô Gan (Ripeness Index)
  6. Đường Trung Bình Trượt (EMA) & Chu kỳ Thứ
  7. Khai phá Luật Bạc Nhớ (Association Rules)
  8. Phân cụm K-Means & Cấu trúc (K-Means Clustering)
- **Kiểm định Hồi quy (Walk-Forward Backtesting Engine):** Đánh giá độ tin cậy lịch sử không rò rỉ dữ liệu tương lai.
- **Biểu đồ Trực quan hóa Cao cấp:**
  - **Chartist.dev (SVG):** Siêu nhẹ (<10KB), đáp ứng linh hoạt, hiển thị sắc nét 30 cột phân phối xác suất.
  - **Chart.js (HTML5 Canvas):** Chuyển đổi linh hoạt một chạm.
- **Hỗ trợ 21 Đài XSMN & 2 Đài Vietlott:** Dữ liệu chuẩn hóa 3.355 kỳ mở thưởng thực tế.
- **Netlify Serverless Functions:** Cập nhật kết quả mở thưởng tự động theo thời gian thực.

---

## 🚀 Triển Khai Lên Netlify (Deploy to Netlify)

Dự án đã được cấu hình tối ưu sẵn theo chuẩn Netlify qua `netlify.toml`, `_redirects` và `_headers`.

### Cấu hình khi Import từ GitHub vào Netlify:
- **Base directory:** `(để trống)`
- **Build command:** `npm --prefix xo-so test`
- **Publish directory:** `xo-so`
- **Functions directory:** `xo-so/netlify/functions`

*(Netlify sẽ tự động chạy 60 bài Unit Test kiểm định thuật toán trước khi xuất bản bản build).*

---

## 💻 Chạy Tại Máy Cục Bộ (Local Development)

```bash
# Cài đặt dependencies
npm install --prefix xo-so

# Chạy Unit Tests
npm test

# Khởi chạy máy chủ cục bộ
npm start
```
Truy cập: `http://localhost:8088/` (hoặc cổng được hiển thị).

---

## 📄 Bản Quyền
Phát triển bởi Đội ngũ Nghiên cứu Định lượng LOTTO-QUANT LAB. Giấy phép MIT.
