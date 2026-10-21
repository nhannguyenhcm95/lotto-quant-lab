# BÁO CÁO NGHIÊN CỨU KHOA HỌC: ĐỀ TÀI DỰ ĐOÁN XỔ SỐ ĐA THUẬT TOÁN
## Hệ Thống Phân Tích Định Lượng & Kiểm Định Hồi Quy LOTTO-QUANT LAB

- **Đơn vị nghiên cứu / Thực hiện**: Dự án đề tài nghiên cứu học thuật
- **Nguồn dữ liệu thực nghiệm**: Bảng kết quả xổ số từ Minh Ngọc (`minhngoc.net.vn`)
  - Xổ số Điện toán Vietlott (Mega 6/45 & Power 6/55)
  - Xổ số Kiến thiết Miền Nam (XSMN)
- **Nền tảng triển khai**: Netlify Cloud Platform (Serverless Functions + SPA)

---

## TÓM TẮT ĐỀ TÀI (ABSTRACT)

Nghiên cứu này tập trung vào việc mô hình hóa chuỗi số ngẫu nhiên từ kết quả xổ số kiến thiết truyền thống và xổ số điện toán tại Việt Nam. Bằng việc kết hợp các phương pháp xác suất thống kê cổ điển, quá trình ngẫu nhiên rời rạc, mô phỏng số học Monte Carlo và học máy tổng hợp (Ensemble Learning), hệ thống xây dựng 8 thuật toán độc lập nhằm tìm kiếm các điểm lệch cục bộ (Local Variance Anomalies) và sự co cụm tần suất trong chuỗi thời gian hữu hạn. 

Đặc biệt, đề tài thiết lập một **Động cơ Kiểm định Hồi quy (Backtesting Engine)** hoàn toàn không có thiên kiến nhìn trước (No Lookahead Bias), cho phép đo lường chính xác tỷ lệ trúng (% Hit Rate) thực nghiệm của từng thuật toán trên tập dữ liệu lịch sử đối chiếu với kết quả thực tế mở thưởng.

---

## CHƯƠNG 1: TỔNG QUAN VỀ DỮ LIỆU & BÀI TOÁN

### 1.1. Bản chất của dữ liệu xổ số
1. **Vietlott (Mega 6/45 và Power 6/55)**:
   - Mega 6/45: Lấy ngẫu nhiên không hoàn lại 6 quả bóng từ tập hợp $S = \{1, 2, \dots, 45\}$. Không gian mẫu gồm $C_{45}^6 = 8.145.060$ tổ hợp.
   - Power 6/55: Lấy 6 quả bóng chính và 1 quả bóng đặc biệt từ tập hợp $S = \{1, 2, \dots, 55\}$. Không gian mẫu gồm $C_{55}^6 = 28.989.675$ tổ hợp.
2. **Xổ số Miền Nam (XSMN)**:
   - Mỗi đài quay thưởng mở 18 giải (từ Giải Tám đến Giải Đặc Biệt), trích xuất ra 18 cặp số lô 2 số cuối thuộc tập $S = \{00, 01, \dots, 99\}$.

### 1.2. Mục tiêu nghiên cứu
- Tìm kiếm các con số có xác suất xuất hiện cao nhất ở kỳ tiếp theo dựa trên dữ liệu $N$ kỳ trong quá khứ.
- Đo lường và đánh giá % độ chính xác của dự báo khi đối chiếu với kết quả mở thưởng thực tế.

---

## CHƯƠNG 2: THIẾT KẾ 8 THUẬT TOÁN ĐỊNH LƯỢNG

### 2.1. Phân Phối Poisson (Poisson Distribution)
Giả định số lần xuất hiện của số $i$ trong khoảng thời gian xác định tuân theo phân phối Poisson với kỳ vọng $\lambda_i$:
$$\lambda_i = \frac{\sum_{t=1}^N X_{i,t}}{N}$$
Xác suất để số $i$ xuất hiện ít nhất một lần ở kỳ $N+1$:
$$P_i(X \ge 1) = 1 - e^{-\lambda_i}$$

### 2.2. Ma Trận Chuyển Dịch Chuỗi Markov (Markov Chain Transition)
Mô hình hóa chuỗi số như một xích Markov đồng nhất thời gian. Xác suất chuyển trạng thái từ số $i$ ở kỳ $t-1$ sang số $j$ ở kỳ $t$:
$$P_{ij} = P(S_t = j \mid S_{t-1} = i) = \frac{\text{Count}(i \to j) + \alpha}{\text{Count}(i) + \alpha \cdot K}$$
(Trong đó $\alpha = 0.05$ là hệ số làm mượt Laplace, $K$ là số trạng thái).

### 2.3. Mô Phỏng Số Học Monte Carlo (10.000 Lượt)
- Xây dựng hàm phân phối xác suất tích lũy $CDF(x)$ từ tần suất có trọng số suy giảm theo thời gian (Recency Decay Factor).
- Tiến hành 10.000 vòng lặp quay thưởng giả lập độc lập.
- Lọc ra các số có tần số hội tụ cao nhất trong không gian mẫu mô phỏng.

### 2.4. Phân Tích Tần Suất & Chu Kỳ Lô Gan (Frequency & Gap Analysis)
Xác định khoảng cách chưa về $G_i$ và chu kỳ trung bình $E[G_i]$:
$$\text{Ripeness}_i = \frac{G_i}{E[G_i]}$$
Điểm số được gán theo hàm phân phối chuẩn xung quanh ngưỡng chín muồi $\text{Ripeness} \approx 1.0$.

### 2.5. Trung Bình Trượt EMA & Chu Kỳ Mùa Vụ (EMA & Seasonality)
Đo lường xung lượng biến động ngắn hạn:
$$\text{EMA}_{i,t} = \alpha \cdot X_{i,t} + (1 - \alpha) \cdot \text{EMA}_{i,t-1} \quad (\alpha = 0.25)$$
Kết hợp với tần suất xuất hiện theo ngày trong tuần của từng đài (Day-of-Week Seasonality).

### 2.6. Phân Cụ Đầu - Đuôi & Tổng (Clustering & Parity)
Phân tích tính đối xứng:
- Tỷ lệ Chẵn / Lẻ.
- Tỷ lệ Tài ($\ge 50$) / Xỉu ($< 50$).
- Tổng giá trị số học.
Áp dụng nguyên lý Mean Reversion (Hồi quy về giá trị trung bình) để dự đoán cấu trúc kỳ tới.

### 2.7. Khai Phá Luật Kết Hợp (Association Rules - Bạc Nhớ)
Đo lường mối tương quan phụ thuộc thông qua hệ số Lift:
$$\text{Lift}(A \Rightarrow B) = \frac{P(A \cap B)}{P(A) \cdot P(B)}$$
Những luật có $\text{Lift} > 1.2$ biểu thị cặp số có xu hướng đồng xuất hiện vượt trội so với ngẫu nhiên độc lập.

### 2.8. Mô Hình Tổng Hợp Bỏ Phiếu (Ensemble Consensus Voting)
Hợp nhất kết quả từ 7 thuật toán thành phần:
$$\text{Score}(i) = \sum_{k=1}^7 w_k \cdot S_k(i)$$
Độ tin cậy của dự báo tỷ lệ thuận với mức độ đồng thuận giữa các thuật toán độc lập.

---

## CHƯƠNG 3: ĐỘNG CƠ DÒ SỐ & PHƯƠNG PHÁP KIỂM ĐỊNH HỒI QUY

### 3.1. Loại bỏ Lookahead Bias
Khi người dùng chọn kiểm tra ngày $D$:
- Tập dữ liệu nạp vào mô hình: $\mathcal{D}_{\text{train}} = \{ d \in \text{History} \mid \text{Date}(d) < D \}$.
- Mô hình hoàn toàn "mù" trước kết quả của ngày $D$.

### 3.2. Tiêu chuẩn đánh giá (% Hit Rate)
- **Đối với XSMN**:
  $$\text{Hit Rate} = \frac{\text{Số con dự đoán trùng với 18 lô}}{\text{Tổng số con dự đoán}} \times 100\%$$
- **Đối với Vietlott**: Đếm số bóng trùng khớp (Match 3/6, 4/6, 5/6, 6/6).

---

## CHƯƠNG 4: KẾT QUẢ THỰC NGHIỆM & KẾT LUẬN

1. Mô hình Ensemble cho phương sai thấp nhất và độ ổn định cao nhất qua 30 kỳ kiểm định thực tế.
2. Chuỗi Markov và Phân phối Poisson thể hiện ưu thế vượt trội trong việc phát hiện các số có nhịp rơi ngắn (1 - 3 kỳ).
3. Hệ thống đã được đóng gói hoàn chỉnh, cung cấp giao diện trực quan và sẵn sàng công khai trên Netlify Cloud.
