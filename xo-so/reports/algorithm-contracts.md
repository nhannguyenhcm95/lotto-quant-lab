# BẢNG HỢP ĐỒNG ĐỊNH LƯỢNG 8 THUẬT TOÁN (ALGORITHM CONTRACTS)
## DỰ ÁN: LOTTO-QUANT LAB — HỆ THỐNG PHÂN TÍCH & DỰ ĐOÁN XỔ SỐ ĐỊNH LƯỢNG
**Phiên bản hệ thống:** v3.0.0 (Production Verified)  
**Tiêu chuẩn tài liệu:** Tuân thủ Mục 8.1 & 8.2 của `fix-4.md`

---

## 1. BẢNG TỔNG QUAN HỢP ĐỒNG KỸ THUẬT (MASTER SPECIFICATION TABLE)

| STT | Tên Hiển Thị UI | Mã ID Code | Object Module | Công Thức Thực Tế Triển Khai | Thang Điểm (Score Range) | Số Kỳ Tối Thiểu | Tính Ngẫu Nhiên (Randomness) | Cơ Chế Tái Lập (Seed / RNG) | Điều Kiện Thiếu Dữ Liệu (`insufficient-data`) |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1** | **Phân phối Poisson** | `poisson` | `PoissonAlgorithm` | $\lambda = \frac{\text{Hits}}{N}$; $P(X \ge 1) = 1 - e^{-\lambda}$ | $[0, 100]$ (%) | 1 kỳ | Hoàn toàn xác định (Deterministic) | Không dùng RNG | $N = 0$ bản ghi |
| **2** | **Chuỗi Markov Bậc 1** | `markov` | `MarkovAlgorithm` | $P(S_t = j \mid S_{t-1} = i) = \frac{\text{Trans}(i \to j) + 0.05}{\text{Count}(i) + 0.05 \cdot K}$ | $[0, 100]$ (%) | 2 kỳ | Hoàn toàn xác định (Deterministic) | Không dùng RNG | $N < 2$ kỳ |
| **3** | **Mô phỏng Monte Carlo (10k)** | `monte-carlo` | `MonteCarloAlgorithm` | 10.000 kịch bản giả lập theo hàm phân phối tích lũy (CDF) với trọng số thời gian phân rã $w_i$ | $[0, 100]$ (Thị phần trúng %) | 1 kỳ | Giả ngẫu nhiên có Seed (Pseudo-Random) | Mulberry32 PRNG (Seeded từ ngày/kỳ hoặc inject seed) | $N = 0$ bản ghi |
| **4** | **Tần suất & Chu kỳ Lô Gan** | `frequency-gap` | `FrequencyGapAlgorithm` | $\text{Ripeness} = \frac{\text{CurrentGap}}{\text{AvgCycle}}$; $\text{Score} = f(\text{Ripeness}, \text{Hits}_{15}, \text{MaxGan})$ | $[0, 100]$ (Điểm chín muồi) | 1 kỳ | Hoàn toàn xác định (Deterministic) | Không dùng RNG | $N = 0$ bản ghi |
| **5** | **EMA & Chu kỳ Thứ** | `moving-average` | `MovingAverageAlgorithm` | $\text{EMA}_t = \alpha X_t + (1-\alpha)\text{EMA}_{t-1}$ ($\alpha = 0.25$); Tra cứu target day theo lịch đài | $[0, 100]$ (Điểm xung lượng) | 3 kỳ | Hoàn toàn xác định (Deterministic) | Không dùng RNG | $N < 3$ kỳ |
| **6** | **Đặc trưng Cấu trúc & Tổng** | `clustering` | `ClusteringAlgorithm` | Phân tích hồi quy trung bình (Mean Reversion Heuristic): Tỷ lệ Chẵn/Lẻ, Tài/Xỉu, Tổng biên độ | $[0, 100]$ (Điểm cân bằng) | 1 kỳ | Hoàn toàn xác định (Deterministic) | Không dùng RNG | $N = 0$ bản ghi |
| **7** | **Khai phá Luật Bạc Nhớ** | `association-rules` | `AssociationRulesAlgorithm` | $\text{Lift}(A \to B) = \frac{P(A \cap B)}{P(A) \cdot P(B)}$; Tích hợp 70% Sequential Lift + 30% In-Draw Lift | $[0, 100]$ (Điểm liên kết) | 2 kỳ | Hoàn toàn xác định (Deterministic) | Không dùng RNG | $N < 2$ kỳ |
| **8** | **Mô hình Tổng Hợp (Ensemble)** | `ensemble` | `EnsembleAlgorithm` | Weighted Normalized Soft Voting: Min-Max Normalization từng model về $[0, 100]$ rồi tổng hợp có trọng số | $[0, 100]$ (Điểm đồng thuận chuẩn hóa) | 1 kỳ | Phụ thuộc seed của Monte Carlo con | Kế thừa Seed xác định của kỳ chạy canonical | Không có model con nào hợp lệ |

---

## 2. CHI TIẾT HỢP ĐỒNG TỪNG THUẬT TOÁN

### 2.1. THUẬT TOÁN 1: Phân Phối Xác Suất Poisson (`poisson.js`)
- **Tên hiển thị & Bản chất:** Phân phối Poisson (Poisson Distribution).
- **Nguyên lý toán học:** Mô hình hóa xác suất một con số xuất hiện ít nhất một lần trong kỳ quay tiếp theo dựa trên tham số cường độ $\lambda$ (trung bình số lần xuất hiện trên một kỳ trong cửa sổ $N$ kỳ gần nhất):
  $$P(X \ge 1) = 1 - e^{-\lambda}$$
  Điểm số được chuẩn hóa: $\text{Score} = \text{round}((1 - e^{-\lambda}) \times 1000) / 10$ (thang đo 0 đến 100).
- **Đặc điểm loại trừ Lookahead Bias:** Cửa sổ trượt lấy tối đa 30 kỳ lịch sử strictly trước ngày mục tiêu (`date < targetDate`). Không bao giờ đọc kết quả ngày hiện tại.
- **Xử lý biên:** Khi lịch sử rỗng ($N = 0$), trả về `status: 'insufficient-data'`, `predictions: []`, `scores: {}`.

### 2.2. THUẬT TOÁN 2: Chuỗi Markov Bậc 1 (`markov.js`)
- **Tên hiển thị & Bản chất:** Chuỗi Markov Bậc 1 (First-order Markov Transition Chain).
- **Lý giải tên gọi:** Mô hình tính toán ma trận chuyển dịch trạng thái từ kỳ $t-1$ sang kỳ $t$. Vì chỉ phụ thuộc trực tiếp vào trạng thái của đúng 1 kỳ liền kề trước đó, thuật toán được định danh chính xác là **Bậc 1** (không gọi là Bậc 2).
- **Công thức chuyển dịch có làm mượt Laplace:**
  $$P(i \to j) = \frac{\text{Count}(i \to j) + 0.05}{\text{Total}(i) + 0.05 \times K}$$
  Với $K$ là số trạng thái khả dĩ (45 đối với Mega, 55 đối với Power, 100 đối với XSMN).
- **Xác suất tích lũy:** Với tập số tiền đề ở kỳ mới nhất $U$, xác suất số $j$ xuất hiện là:
  $$P(j) = 1 - \prod_{i \in U} [1 - P(i \to j)]$$

### 2.3. THUẬT TOÁN 3: Mô Phỏng Số Học Monte Carlo (`monte-carlo.js`)
- **Tên hiển thị & Bản chất:** Mô phỏng Monte Carlo (Monte Carlo Simulation).
- **Số lần mô phỏng:** 10.000 vòng lặp (hoặc theo cấu hình `options.simulations`).
- **Cơ chế tái lập (Reproducibility):**
  - Sử dụng thuật toán Mulberry32 32-bit PRNG.
  - Khi không truyền seed ngoài, seed được băm tự động từ metadata ngày và mã kỳ mở thưởng gần nhất (`deriveSeedFromHistory`). Cùng một tập dữ liệu đầu vào luôn sinh ra cùng một chuỗi số 100% tái lập.
- **Phân biệt luật chơi game:**
  - **Vietlott (Mega/Power):** Rút **không hoàn lại** (Strictly non-replacement) đảm bảo 6 bóng số trong một kỳ hoàn toàn phân biệt.
  - **XSMN (18 giải):** Rút **độc lập từng giải** (Independent sampling with replacement), cho phép các đuôi lô tô trùng nhau giữa các giải thưởng.

### 2.4. THUẬT TOÁN 4: Tần Suất & Chu Kỳ Lô Gan (`frequency-gap.js`)
- **Tên hiển thị & Bản chất:** Tần suất & Chu kỳ Lô Gan (Frequency & Gap Analysis).
- **Chỉ số điểm rơi chín muồi (Ripeness Index):**
  $$\text{Ripeness} = \frac{\text{CurrentGap}}{\text{AvgCycle}}$$
- **Logic chấm điểm:**
  - Ưu tiên cao nhất các con số nằm trong "Vùng Chín Muồi" ($\text{Ripeness} \in [0.85, 1.35]$).
  - Phạt điểm nặng đối với các con số rơi vào vùng "Gan Cực Đại" ($\text{CurrentGap} > 1.5 \times \text{AvgCycle}$) để ngăn ngừa người chơi mù quáng nuôi số gan.
  - Tích hợp đà rơi ngắn hạn ($\text{Hits}_{15} \ge 3$ lần nổ trong 15 kỳ gần nhất).

### 2.5. THUẬT TOÁN 5: EMA & Chu Kỳ Thứ (`moving-average.js`)
- **Tên hiển thị & Bản chất:** Trung bình trượt hàm mũ & Tương quan theo Thứ trong tuần (EMA & Day-of-Week Seasonality).
- **Công thức EMA:** $\text{EMA}_t = 0.25 \times X_t + 0.75 \times \text{EMA}_{t-1}$.
- **Tính toán ngày mục tiêu:** Tra cứu lịch mở thưởng tiếp theo chính thức qua `LOTTO_CONFIG.getNextDrawDate(currentDate, stationOrGame, isVietlott)`. Đảm bảo:
  - Mega 6/45: Sau Thứ 4 là Thứ 6, sau Thứ 6 là Chủ Nhật, sau Chủ Nhật là Thứ 4.
  - Power 6/55: Sau Thứ 3 là Thứ 5, sau Thứ 5 là Thứ 7, sau Thứ 7 là Thứ 3.
  - TPHCM: Sau Thứ 2 là Thứ 7, sau Thứ 7 là Thứ 2 tuần kế tiếp.
  Tuyệt đối không lấy ngày lịch kế tiếp ($t+1$).

### 2.6. THUẬT TOÁN 6: Đặc Trưng Cấu Trúc & Tổng (`clustering.js`)
- **Tên hiển thị & Bản chất:** Đặc trưng Cấu trúc & Tổng (Parity & Mean Reversion Heuristic).
- **Minh bạch thuật toán:** Thuật toán **không sử dụng K-Means**, mà phân tích đặc trưng hình học của các dãy số trúng (tỷ lệ Chẵn/Lẻ, Tài/Xỉu, tổng giá trị so với kỳ vọng trung bình).
- **Quy tắc hồi quy trung bình (Mean Reversion):** Nếu trong các kỳ gần đây số Chẵn chiếm ưu thế vượt trội ($> 52\%$), mô hình sẽ gia tăng trọng số cho các số Lẻ để đón đầu xu hướng cân bằng tự nhiên của chuỗi ngẫu nhiên.

### 2.7. THUẬT TOÁN 7: Khai Phá Luật Bạc Nhớ (`association-rules.js`)
- **Tên hiển thị & Bản chất:** Khai phá Luật Bạc Nhớ & Cặp Số Đi Kèm (Association Rules & Apriori Heuristic).
- **Công thức đo lường Lift:**
  - Lift tiếp nối sang kỳ sau: $\text{SeqLift}(A \to B) = \frac{P(A_t \cap B_{t+1})}{P(A_t) \times P(B_{t+1})}$
  - Lift đồng xuất hiện cùng kỳ: $\text{CooccurLift}(A, B) = \frac{P(A_t \cap B_t)}{P(A_t) \times P(B_t)}$
  - Lift kết hợp: $\text{CombinedLift} = 0.7 \times \text{SeqLift} + 0.3 \times \text{CooccurLift}$
- **Hợp đồng Schema Cặp Số Chuẩn Hóa:**
  Mọi cặp số trả về trong `metrics.topPairs` bắt buộc tuân thủ schema:
  - `pair`: Chuỗi biểu diễn cặp số (ví dụ `"12 - 24"` hoặc `"68 - 86"`).
  - `a`: Số thứ nhất.
  - `b`: Số thứ hai.
  - `coOccurrenceCount`: Số kỳ mà cặp cùng xuất hiện trong 1 kỳ (Integer $\ge 0$).
  - `sequentialCount`: Số kỳ số A kỳ trước kéo theo số B kỳ sau.
  - `totalEligibleDraws`: Tổng số kỳ hợp lệ được khảo sát.
  - `support`: Tỷ lệ xuất hiện so với tổng số kỳ.
  - `confidence`: Độ tin cậy có điều kiện.
  - `lift`: Hệ số nâng (Lift index).

### 2.8. THUẬT TOÁN 8: Mô Hình Tổng Hợp Ensemble (`ensemble.js`)
- **Tên hiển thị & Bản chất:** Mô hình Tổng Hợp Học Máy (Ensemble Consensus Engine).
- **Cơ chế tổng hợp:** Bỏ phiếu chuẩn hóa có trọng số (Weighted Normalized Soft Voting).
- **Chuẩn hóa điểm số (Min-Max Normalization):**
  Trước khi tổng hợp, điểm số của từng mô hình thành phần được đưa về cùng thang đo $[0, 100]$:
  $$\text{NormScore}_i(x) = \frac{\text{Score}_i(x) - \min(\text{Score}_i)}{\max(\text{Score}_i) - \min(\text{Score}_i)} \times 100$$
- **Loại trừ mô hình thiếu dữ liệu:** Các mô hình trả về `insufficient-data` bị loại bỏ 100% khỏi mẫu số tính điểm và consensus.
- **Hợp đồng Metrics Đồng Thuận:**
  - `consensusRatio`: Tỷ lệ đồng thuận thực tế giữa các mô hình tham gia:
    $$\text{ConsensusRatio} = \frac{\text{Tổng số phiếu bầu top candidate}}{\text{topN} \times \text{Số mô hình hợp lệ}}$$
  - `disclaimer`: `"Mức đồng thuận giữa các mô hình; không phải xác suất trúng xổ số."`

---
*Tài liệu được thẩm định và xác nhận bởi Hệ Thống Kiểm Định Kỹ Thuật LOTTO-QUANT LAB.*
