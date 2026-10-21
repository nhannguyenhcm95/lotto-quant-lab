# LOTTO-QUANT LAB: ALGORITHM CONTRACTS & QUANTITATIVE SPECIFICATIONS (FIX-8)

**Tài liệu:** Đặc tả kỹ thuật và hợp đồng toán học cho 8 thuật toán định lượng (Quantitative Algorithm Contracts)  
**Phiên bản hệ thống:** v2.0.0 (FIX-8 Production Ready)  
**Dự án:** LOTTO-QUANT LAB  
**Chuẩn kiểm định:** Fail-Closed, Deterministic Expected-Value Verification, Anti-Leakage Protection

---

## 1. TỔNG QUAN HỆ THỐNG ĐỊNH LƯỢNG

Hệ thống LOTTO-QUANT LAB vận hành 8 thuật toán định lượng độc lập để phân tích mẫu hình, chu kỳ và xác suất của kết quả xổ số (Vietlott Mega 6/45, Power 6/55 và XSMN). Mọi thuật toán phải tuân thủ nghiêm ngặt các nguyên tắc:
1. **Tính tất định (Determinism):** Cùng một tập dữ liệu đầu vào và tham số cấu hình phải cho ra cùng một kết quả dự đoán và điểm số (không dùng nguồn ngẫu nhiên không có seed).
2. **Chống rò rỉ dữ liệu (Anti-Leakage):** Chỉ sử dụng thông tin quá khứ nghiêm ngặt ($t \le T_{target}$); chèn kỳ tương lai cực đoan không được phép làm thay đổi dự đoán của kỳ quá khứ.
3. **An toàn điều kiện biên (Boundary Safety):** Khi dữ liệu lịch sử rỗng hoặc nhỏ hơn ngưỡng tối thiểu, thuật toán phải trả về trạng thái `status: 'insufficient-data'` một cách an toàn, tuyệt đối không bịa số ngẫu nhiên hoặc gán mock data.

---

## 2. BẢN ĐẶC TẢ CHI TIẾT 8 THUẬT TOÁN (ALGORITHM CONTRACTS)

### 2.1 Thuật toán Poisson Distribution (`poisson.js`)
- **Tập tin:** `js/algorithms/poisson.js` | **Phiên bản:** `1.0.0`
- **Bản chất toán học:** Mô hình hóa số lần xuất hiện của từng quả bóng theo phân phối Poisson độc lập:
  $$P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}$$
  Trong đó $\lambda_i = \frac{count_i}{N}$ là tần suất kỳ vọng trên mỗi kỳ quay, với $N$ là kích thước cửa sổ phân tích (mặc định $N = 50$).
- **Input Contract:**
  * `history`: Mảng các kỳ quay sắp xếp theo thời gian giảm dần (mới nhất ở index 0). Mỗi phần tử chứa `winningNumbers: number[]`.
  * `options`: `{ totalBalls: 45|55, topN: 6, isVietlott: boolean }`.
- **Điểm số (Score):** Xác suất Poisson $P(X \ge 1) = 1 - e^{-\lambda_i}$ biểu thị khả năng quả bóng $i$ xuất hiện ít nhất một lần ở kỳ kế tiếp.
- **Tie-Breaking Rule:** Khi 2 số có cùng điểm Poisson, ưu tiên số có **khoảng cách xuất hiện gần nhất (recency)** nhỏ hơn. Nếu vẫn bằng nhau, ưu tiên số có giá trị nhỏ hơn.
- **Output Contract:**
  ```json
  {
    "algorithm": "poisson",
    "predictions": [12, 24, 35, 3, 19, 41],
    "scores": { "12": 0.352, "24": 0.321, ... },
    "metrics": { "windowSize": 50, "avgLambda": 0.133 },
    "status": "ready"
  }
  ```

---

### 2.2 Thuật toán Chuỗi Markov Bậc 1 (`markov.js`)
- **Tập tin:** `js/algorithms/markov.js` | **Phiên bản:** `1.0.0`
- **Bản chất toán học:** Ma trận chuyển trạng thái bậc 1 (First-Order Transition Matrix) giữa các số xuất hiện liên tiếp:
  $$P(S_{t} = j \mid S_{t-1} = i) = \frac{Count(i \to j)}{\sum_k Count(i \to k)}$$
  Điểm số của bóng $j$ ở kỳ kế tiếp là tổng xác suất có điều kiện theo các bóng đã về ở kỳ gần nhất $T_0$:
  $$Score(j) = \sum_{i \in Draw_{T_0}} P(j \mid i)$$
- **Input Contract:** Tối thiểu 2 kỳ quay có `winningNumbers`.
- **Tie-Breaking Rule:** Ưu tiên số có tần suất xuất hiện tổng thể cao hơn; sau đó ưu tiên giá trị số nhỏ hơn.
- **Output Contract:** `{ algorithm: 'markov', predictions: number[], scores: Record<string, number>, status: 'ready' }`.

---

### 2.3 Thuật toán Mô Phỏng Monte Carlo (`monte-carlo.js`)
- **Tập tin:** `js/algorithms/monte-carlo.js` | **Phiên bản:** `1.0.0`
- **Bản chất toán học:** Mô phỏng ngẫu nhiên có trọng số (Weighted Sampling) với phân phối xác suất thực nghiệm từ $N$ kỳ gần nhất qua $M = 10.000$ vòng lặp thử nghiệm độc lập.
- **Tính tất định:** Sử dụng Pseudo-Random Number Generator (PRNG) tuyến tính đồng dư (LCG / Mulberry32) với seed cố định phái sinh từ `historyFingerprint`:
  $$Seed = \text{CRC32}(historyFingerprint) \oplus 0x12345678$$
- **Điểm số:** Tỷ lệ phần trăm số lần quả bóng $i$ được chọn trong $M$ vòng mô phỏng: $Score(i) = \frac{Hits_i}{M}$.
- **Output Contract:** `{ algorithm: 'monte-carlo', predictions: number[], simulations: 10000, seed: number, status: 'ready' }`.

---

### 2.4 Thuật toán Khoảng Cách & Chu Kỳ (Frequency Gap / Ripeness Index) (`frequency-gap.js`)
- **Tập tin:** `js/algorithms/frequency-gap.js` | **Phiên bản:** `1.0.0`
- **Bản chất toán học:** Đánh giá độ "chín" (Ripeness) của số dựa trên tỷ số giữa khoảng cách vắng mặt hiện tại ($Gap_{current}$) và chu kỳ vắng mặt trung bình ($Gap_{avg}$):
  $$Ripeness(i) = \frac{Gap_{current}(i) + 1}{Gap_{avg}(i) + 1}$$
  Nếu $Ripeness(i) > 1.0$, số đã vượt quá chu kỳ kỳ vọng và có xu hướng hồi quy về giá trị trung bình (Mean-Reverting).
- **Tie-Breaking Rule:** Ưu tiên số có $Gap_{current}$ lớn hơn; sau đó ưu tiên giá trị số nhỏ hơn.

---

### 2.5 Thuật toán Trung Bình Động Khoảng Cách (Moving Average Gap) (`moving-average.js`)
- **Tập tin:** `js/algorithms/moving-average.js` | **Phiên bản:** `1.0.0`
- **Bản chất toán học:** Tính trung bình động hàm mũ (EMA - Exponential Moving Average) của khoảng cách giữa các lần xuất hiện:
  $$EMA_t(i) = \alpha \cdot Gap_t(i) + (1 - \alpha) \cdot EMA_{t-1}(i), \quad \alpha = \frac{2}{k + 1}$$
  với $k = 10$ là chu kỳ làm mịn. Điểm số là độ lệch chuẩn hóa giữa khoảng cách hiện tại và $EMA$.

---

### 2.6 Thuật toán Heuristic Phân Cụm & Cân Bằng Đặc Trưng (`clustering.js`)
- **Tập tin:** `js/algorithms/clustering.js` | **Phiên bản:** `1.0.0`
- **Bản chất toán học (Minh bạch hóa thuật ngữ):**
  > [!IMPORTANT]
  > Trong phiên bản này, thuật toán thực hiện **Feature Clustering & Parity-Sum Heuristic** (Heuristic phân cụm đặc trưng chẵn/lẻ, tổng giải và nhóm thập phân), KHÔNG PHẢI thuật toán Unsupervised K-Means lặp ma trận vector khoảng cách Euclidean. Tài liệu và UI chuẩn hóa tên gọi là: **Feature Clustering Heuristic**.
- **Quy tắc phân cụm:**
  * Nhóm chẵn/lẻ (Parity Ratio): Phân bổ mục tiêu $3:3$ hoặc $4:2$.
  * Nhóm dải số (Decile Buckets): $[1-10], [11-20], [21-30], [31-40], [41-45/55]$.
  * Tổng giá trị bóng (Sum Range): Dải kỳ vọng lý thuyết $[120, 160]$ cho Mega 6/45.
- **Điểm số:** Trọng số hài hòa kết hợp giữa độ lệch phân bổ cụm và tần suất lịch sử của bóng.

---

### 2.7 Thuật toán Khai Phá Luật Kết Hợp (Association Rules / Co-Occurrence) (`association-rules.js`)
- **Tập tin:** `js/algorithms/association-rules.js` | **Phiên bản:** `1.0.0`
- **Bản chất toán học:** Đào bới các cặp số hay về cùng nhau (Frequent Itemsets) dựa trên thuật toán Apriori đơn giản:
  $$Support(i, j) = \frac{Count(i \land j)}{N}, \quad Confidence(i \to j) = \frac{Count(i \land j)}{Count(i)}, \quad Lift(i, j) = \frac{P(i \land j)}{P(i) \cdot P(j)}$$
- **Điểm số:** Tổng điểm Lift của bóng $j$ với các bóng đã về ở kỳ gần nhất.

---

### 2.8 Thuật toán Hợp Tuyển Đa Mô Hình (Ensemble Soft Voting) (`ensemble.js`)
- **Tập tin:** `js/algorithms/ensemble.js` | **Phiên bản:** `2.0.0`
- **Bản chất toán học:** Hợp tuyển có trọng số (Normalized Soft Voting) từ 7 mô hình thành phần:
  $$FinalScore(i) = \sum_{m=1}^{7} w_m \cdot NormScore_m(i)$$
  Trong đó:
  * $w_m$ là trọng số hiệu năng của mô hình $m$ (chuẩn hóa $\sum w_m = 1.0$).
  * $NormScore_m(i) = \frac{Score_m(i) - \min(Score_m)}{\max(Score_m) - \min(Score_m)}$ chuẩn hóa điểm số về khoảng $[0, 1]$.
- **Sắp xếp:** Mảng `predictions` gồm đúng `topN` số có $FinalScore$ cao nhất, sắp xếp giảm dần theo điểm số.

---

## 3. FAIR RANDOM BASELINE CONTRACT

Mô hình kiểm định Random Baseline dùng để so sánh hiệu năng của các thuật toán định lượng với phân phối ngẫu nhiên thuần túy:
1. **Điều kiện thử nghiệm công bằng:**
   * Cùng tập dữ liệu kiểm thử (Test Folds: 30 kỳ kiểm tra độc lập ngoài tập huấn luyện).
   * Chạy đủ **100 replicates** độc lập để lấy phân phối hội tụ thống kê.
   * Dùng PRNG chuẩn, không lọc số, không can thiệp kết quả.
2. **Kỳ vọng toán học lý thuyết:**
   * Đối với Vietlott Mega 6/45 (chọn 6 bóng từ 45):
     $$E[Hits] = 6 \times \frac{6}{45} = 0.800 \text{ số trúng/kỳ}$$
   * Dải biến thiên thống kê 95% tin cậy qua 100 replicates: $[0.500, 1.100]$.
3. **Cấm kỵ (Strict Prohibition):**
   * Tuyệt đối không hardcode giá trị baseline hit rate.
   * Tuyệt đối không dùng mock numbers trong bài kiểm tra so sánh.

---

## 4. CACHE CONTENT-HASH DEPENDENCY & INVALIDATION CONTRACT

Cơ chế lưu đệm kết quả phân tích đảm bảo tốc độ phản hồi và tính nhất quán dữ liệu:
1. **Công thức `historyFingerprint`:**
   $$Fingerprint = \text{SHA256}\left(\sum_{k} DrawId_k + ":" + Date_k + ":" + Balls_k\right)[0..16]$$
   Mã băm này bao phủ 100% các kỳ quay trong tập dữ liệu đầu vào.
2. **Quy tắc vô hiệu hóa đệm (Cache Invalidation):**
   * Thêm kỳ mới -> Fingerprint thay đổi -> Cache Miss -> Tự động tính toán lại.
   * Sửa 1 quả bóng quá khứ (kể cả kỳ cách đây 10 năm) -> Fingerprint thay đổi -> Cache Miss.
3. **Namespace của Khóa Đệm (Cache Key):**
   $$\text{CacheKey} = \text{Scope} + "\_" + \text{historyFingerprint} + "\_v" + \text{AlgorithmVersion} + "\_" + \text{ParamHash}$$
   Đảm bảo không bao giờ có xung đột đệm giữa các phiên bản hoặc bộ tham số khác nhau.

---

## 5. BẢNG PHÊ DUYỆT & ĐỐI CHIẾU TIÊU CHUẨN

| Thuật toán | Module | Phân loại | Độ phức tạp | Deterministic | Anti-Leakage Tested |
|:---|:---|:---|:---:|:---:|:---:|
| **Poisson** | `poisson.js` | Statistical Distribution | $O(N \cdot B)$ | **PASS** | **PASS** |
| **Markov** | `markov.js` | Stochastic State Matrix | $O(N \cdot B^2)$ | **PASS** | **PASS** |
| **Monte Carlo** | `monte-carlo.js` | PRNG Simulation | $O(M \cdot TopN)$ | **PASS** | **PASS** |
| **Frequency Gap** | `frequency-gap.js` | Cycle / Ripeness Index | $O(N \cdot B)$ | **PASS** | **PASS** |
| **Moving Average** | `moving-average.js` | EMA Time-Series | $O(N \cdot B)$ | **PASS** | **PASS** |
| **Clustering** | `clustering.js` | Feature Parity Heuristic | $O(N \cdot B)$ | **PASS** | **PASS** |
| **Association Rules**| `association-rules.js`| Co-Occurrence Itemset | $O(N \cdot B^2)$ | **PASS** | **PASS** |
| **Ensemble** | `ensemble.js` | Soft Voting Meta-Model | $O(\sum Alg)$ | **PASS** | **PASS** |
