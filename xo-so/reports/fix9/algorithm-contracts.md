# LOTTO-QUANT LAB: TÀI LIỆU HỢP ĐỒNG THUẬT TOÁN & CHUẨN ĐỊNH LƯỢNG (ALGORITHM CONTRACTS - FIX-9)

---

## 1. HỢP ĐỒNG DỮ LIỆU CHUNG (COMMON DATA CONTRACT - INPUT NORMALIZER)

Tất cả 8 thuật toán, Ensemble, Random Baseline và Backtest Engine đều sử dụng chung một hợp đồng dữ liệu duy nhất qua `js/algorithms/input-normalizer.js`:

1. **Strict ISO Date Validation (UTC-only):**
   - Định dạng ngày bắt buộc: `YYYY-MM-DD`.
   - Kiểm tra tính hợp lệ của lịch bằng hàm `strictUtcDayOfWeek(isoDate)`: Từ chối các ngày phi lý như `2026-02-30`, không tự động tràn ngày.
2. **Quy ước Thứ tự Thời Gian (Newest-First):**
   - Toàn hệ thống thống nhất: `historyData[0]` là kỳ quay mới nhất (thời điểm $t$), `historyData[1]` là kỳ trước đó ($t-1$).
   - Dữ liệu luôn được chuẩn hóa và kiểm tra sắp xếp Newest-First trước khi đưa vào mô hình.
3. **Định danh Số Chuẩn Canonical (Canonical Number Representation):**
   - **Vietlott (Mega 6/45, Power 6/55):** Số nguyên (`Integer`) trong miền $[1, totalBalls]$ (1..45 hoặc 1..55), không trùng lặp bóng trong cùng một kỳ quay.
   - **XSMN (21 đài Nam Bộ):** Chuỗi 2 ký tự chuẩn `'00'` đến `'99'` (`normalizeLottoPair`). Các giá trị `1`, `'1'`, `'01'` đều được chuẩn hóa thành `'01'`.
4. **Tách biệt Cấu trúc Dữ liệu Quan sát:**
   - `eventSet`: Tập hợp các số có xuất hiện ít nhất 1 lần trong kỳ (Presence / Binary Indicator).
   - `eventCounts`: Tần suất số lần xuất hiện của từng số trong kỳ (Multiplicity).
5. **Tính Bất biến (Immutability):**
   - Tuyệt đối không thay đổi (mutate) mảng dữ liệu đầu vào.
   - Khi dữ liệu không đủ hoặc sai schema, trả về typed status `insufficient-data` hoặc `invalid-input`, không nuốt lỗi âm thầm.

---

## 2. HỢP ĐỒNG 8 THUẬT TOÁN ĐỊNH LƯỢNG (ALGORITHMS CONTRACTS)

### 2.1 Thuật toán 1: Tần Suất & Chu Kỳ Lô Gan (Frequency Gap Algorithm)
- **ID:** `frequency-gap`
- **Loại điểm số (`scoreType`):** `ranking-score` (Điểm xếp hạng phân vị kết hợp chu kỳ và tần suất gần đây).
- **Quy chuẩn sửa lỗi (ALG-01 & ALG-02):**
  - **Số chưa từng xuất hiện (`never-observed`):**
    * Khi số chưa từng về trong lịch sử quan sát: `currentGap = nDraws`, `avgCycle = null`, `ripenessIndex = null`, `evidenceStatus: 'never-observed'`.
    * Điểm `cycleScore = 15` (thấp hơn số đã có chu kỳ quan sát). Không được xếp hạng cao hơn các số về nhiều lần chỉ vì gan lâu.
  - **Mẫu số Cửa sổ gần đây (`recentWindow`):**
    * Mẫu số tính `recentRate` là số kỳ thực tế quan sát được trong cửa sổ: `recentWindow = Math.min(nDraws, 15)`. Mẫu số luôn bằng `recentWindow` thực tế, không gán cứng 15 khi dữ liệu ít hơn.

### 2.2 Thuật toán 2: Phân Phối Poisson & Tần Suất Thực Nghiệm (Poisson Algorithm)
- **ID:** `poisson`
- **Loại điểm số (`scoreType`):** `ranking-score` (Điểm tần suất thực nghiệm có làm mịn Dirichlet/Beta-Binomial).
- **Quy chuẩn sửa lỗi (ALG-03):**
  - Không tuyên bố điểm số là "xác suất hiệu chuẩn" (`calibrated-probability`) khi các quả bóng trong cùng một kỳ quay không thỏa mãn giả định độc lập Poisson.
  - **Vietlott:** Áp dụng Beta-Binomial prior smoothing:
    $$\hat{p}_i = \frac{k_i + \alpha}{N + \alpha + \beta}$$
    với $\alpha = 1.0, \beta = \frac{totalBalls}{pickBalls} - 1$. Đảm bảo bóng chưa về có điểm số dương dựa trên xác suất tiên nghiệm lý thuyết.
  - **XSMN:** Tính số lần về kỳ vọng (`expectedOccurrencesPerDraw`) dựa trên tổng số lượt quay giải (18 giải).

### 2.3 Thuật toán 3: Khai Phá Luật Bạc Nhớ (Association Rules Algorithm)
- **ID:** `association-rules`
- **Loại điểm số (`scoreType`):** `ranking-score`.
- **Quy chuẩn sửa lỗi (ALG-04):**
  - **Học đúng chiều thời gian:**
    * Chuyển tiếp tiếp nối (Sequential Transition) học nghiêm ngặt theo chiều từ kỳ cũ sang kỳ mới: `sortedHistory[i+1]` (thời điểm $t-1$) $\rightarrow$ `sortedHistory[i]` (thời điểm $t$).
    * Tuyệt đối không học ngược chiều thời gian từ hiện tại về quá khứ.
  - **Tách bạch 2 định nghĩa quan sát:**
    * Đồng xuất hiện cùng kỳ (Same-Draw Co-occurrence): $A$ và $B$ cùng xuất hiện trong một kỳ quay.
    * Chuyển tiếp tiếp nối (Sequential Transition): $A$ xuất hiện ở kỳ trước, $B$ xuất hiện ở kỳ sau.
  - Tích hợp Laplace smoothing vào Support, Confidence và Lift.

### 2.4 Thuật toán 4: Chuỗi Markov Bậc 1 (Markov Chain Algorithm)
- **ID:** `markov`
- **Loại điểm số (`scoreType`):** `ranking-score`.
- **Quy chuẩn sửa lỗi (ALG-05):**
  - **Khử trùng lặp trong kỳ:** Dùng `eventSet` để xây dựng chuỗi chuyển tiếp nhị phân, loại bỏ sai lệch khi một số về nhiều nháy trong cùng một kỳ XSMN.
  - **Conditional Rate có Bayesian Shrinkage:**
    $$P(j | i) = \frac{C(i \rightarrow j) + \alpha \cdot \text{Prior}(j)}{\sum_k C(i \rightarrow k) + \alpha}$$
    với $\alpha = 2.0$. Khi số mẫu chuyển tiếp của trạng thái $i$ nhỏ, tự động co về phân phối biên (marginal distribution).
  - Điểm số tổng hợp được trọng số theo độ hỗ trợ (Support-Weighted Mean) từ tập các số trúng ở kỳ mới nhất.

### 2.5 Thuật toán 5: Mô Phỏng Monte Carlo (Monte Carlo Simulation)
- **ID:** `monte-carlo`
- **Loại điểm số (`scoreType`):** `ranking-score`.
- **Quy chuẩn sửa lỗi (ALG-06):**
  - **Sampling without replacement hoàn hảo (Vietlott):** Mỗi lượt quay mô phỏng rút đủ $pickBalls$ số phân biệt từ phân phối trọng số, không dừng non do hết số lần thử.
  - **XSMN (18 lượt rút có hoàn lại):**
    * Tách biệt rõ ràng: `probabilityAtLeastOnce` (xác suất về ít nhất 1 nháy) và `expectedOccurrencesPerDraw` (kỳ vọng số lần về).
  - **Băm Seed toàn bộ dữ liệu lịch sử:** `historyFingerprint` băm toàn bộ chuỗi canonical của lịch sử. Thay đổi bất kỳ bóng số nào ở kỳ cũ đều làm thay đổi seed và kết quả mô phỏng.

### 2.6 Thuật toán 6: Đường Trung Bình Động & Chu Kỳ Thứ (Moving Average & Day Seasonality)
- **ID:** `moving-average`
- **Loại điểm số (`scoreType`):** `ranking-score`.
- **Quy chuẩn sửa lỗi (ALG-07):**
  - Kiểm tra ngày mở thưởng nghiêm ngặt (`strictUtcDayOfWeek`), từ chối ngày sai lịch.
  - Thứ mục tiêu (`targetDayOfWeek`) lấy từ ngày mục tiêu hợp lệ (`targetDrawDate`).
  - Điểm xu hướng ngắn hạn tính toán độ dốc thực tế giữa EMA ngắn hạn và EMA dài hạn, co về phân phối đều khi dữ liệu quá ngắn.

### 2.7 Thuật toán 7: Đặc Trưng Cấu Trúc & Tần Suất (Structure Heuristic Algorithm)
- **ID:** `clustering` (alias: `structure-heuristic`)
- **Loại điểm số (`scoreType`):** `ranking-score`.
- **Quy chuẩn sửa lỗi (ALG-08):**
  - **Xóa bỏ ngụy biện con bạc (Gambler's Fallacy):**
    * Xóa bỏ hoàn toàn quy tắc tự ý đảo bias (`targetEvenBias = evenRatio > 0.52 ? 0.40 : 0.60`). Việc quá khứ xuất hiện nhiều chẵn không hề làm tăng xác suất ra số lẻ ở kỳ tiếp theo trong các phép thử độc lập.
  - Xuất các đặc trưng thống kê mô tả thuần túy: `observedEvenRatio`, `theoreticalEvenRatio: 0.5`, `observedHighRatio`, `theoreticalHighRatio: 0.5`, `observedMean`, `theoreticalMean`.
  - Chấm điểm kết hợp tần suất có Laplace smoothing và độ hội tụ trung tâm lý thuyết, chuẩn hóa theo Percentile Rank $[0, 100]$.

### 2.8 Thuật toán 8: Mô Hình Tổng Hợp Đồng Thuận (Ensemble Consensus Engine)
- **ID:** `ensemble`
- **Loại điểm số (`scoreType`):** `ranking-score`.
- **Quy chuẩn sửa lỗi (ALG-09 & ALG-10):**
  - **Percentile-Rank Aggregation (ALG-09):**
    * Từng mô hình con hợp lệ chuyển đổi điểm thô thành Percentile Rank $[0, 100]$:
      $$\text{rankScore}(c) = \frac{\text{count}(< s_c) + 0.5 \cdot (\text{count}(== s_c) - 1)}{N - 1} \times 100$$
    * Điểm Ensemble là trung bình có trọng số công khai của các percentile ranks.
    * Model lỗi hoặc thiếu độ phủ điểm được đánh dấu `excluded` kèm lý do cụ thể, không âm thầm gán điểm 0.
  - **Dự đoán Giải Đặc Biệt XSMN (ALG-10):**
    * Xóa bỏ hoàn toàn số fallback `'38'` và các offset cố định bịa đặt `+3, +7, +5`.
    * Hai chữ số cuối (Bạch thủ đề): Lấy từ ứng viên số 1 của bảng đồng thuận Ensemble (hoặc modal tail pair nếu thiếu candidate).
    * Bốn chữ số đầu (Trăm nghìn, Chục nghìn, Nghìn, Càng): Học ma trận chuyển tiếp chữ số thực tế theo vị trí (Positional Empirical Digit Transition Matrix) từ cặp kỳ $older \rightarrow newer$ kết hợp Dirichlet smoothing $\alpha = 1.0$.

---

## 3. HỢP ĐỒNG ĐỘNG CƠ BACKTEST (BACKTEST ENGINE & BASELINE)

- **BT-01 (Random Baseline):**
  * Tối thiểu 100 replicates Monte Carlo độc lập cho mỗi fold kiểm định.
  * Mỗi replicate $r$ có seed phân biệt độc lập.
  * Xuất đầy đủ các chỉ số thống kê phân phối: `baselineMean`, `baselineSD`, `baselineSE`, `baselineCI95`.
- **BT-02 (Rolling Window):**
  * Khi chỉ định `windowSize = W`, tập huấn luyện được cắt đúng $W$ kỳ gần nhất trước ngày mục tiêu: `trainingData = draws.slice(0, W)`.
- **BT-03 (Phân Lập Đài XSMN):**
  * Identity của mỗi fold kiểm định là cặp `(date, stationId)`.
  * Lọc đúng đài chỉ định trước khi xây dựng tập huấn luyện; không trộn dữ liệu các đài vào nhau.
- **BT-04 (Canonical Matching & Error Accounting):**
  * Đối chiếu số trúng qua `InputNormalizer.normalizeVietlottBall` và `InputNormalizer.normalizeLottoPair`.
  * Không nuốt ngoại lệ bằng empty catch; fold bị lỗi được ghi nhận `foldsFailed`.
- **BT-05 (Tách Bạch Metrics):**
  * Tách riêng: `meanFoldHitRate`, `microHitRate`, `meanOccurrencesPerDraw`, `baselineMean`, `differenceVsBaseline`.
  * UI chỉ ghi "Top 1 theo metric của mẫu backtest", kèm disclaimer trung thực về tính ngẫu nhiên độc lập của xổ số.
