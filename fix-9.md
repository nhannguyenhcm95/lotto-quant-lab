# FIX-9 — ĐẶC TẢ SỬA ĐÚNG THUẬT TOÁN, BACKTEST VÀ THANG ĐIỂM

**Dự án:** LOTTO-QUANT LAB  
**Phạm vi:** 8 thuật toán, Ensemble, dự đoán giải đặc biệt XSMN, Random Baseline, Backtest/Leaderboard và bộ test tham chiếu.  
**Mục tiêu:** Sửa nguyên nhân toán học/logic đã được xác định; không chỉ làm test hiện tại PASS.  
**Nguyên tắc:** Bằng chứng đúng của một kỳ quá khứ không chứng minh khả năng dự đoán kỳ tương lai. Không thuật toán nào được tuyên bố bảo đảm trúng xổ số 100%.

---

## 0. Lệnh bắt buộc cho coding agent

Đọc `fix-1.md` đến `fix-9.md`, source hiện tại và report gần nhất. Thực thi sửa code, không chỉ viết kế hoạch. Không sửa/ghi đè seed lịch sử chính thức khi đang chạy fixture. Trước mỗi lỗi: (1) tạo test tái hiện lỗi, (2) chạy và lưu bằng chứng FAIL, (3) sửa nguyên nhân gốc, (4) chạy test hồi quy, (5) chạy suite liên quan, (6) chạy `npm run verify:strict`.

**Không được sang issue tiếp theo nếu test của issue hiện tại còn FAIL.** Không được xóa, skip, nới assertion, đổi expected value chỉ để làm test xanh. Nếu thiếu nguồn chuẩn hay không thể tái hiện do môi trường, đánh dấu `BLOCKED`, giải thích chính xác; không giả tạo `PASS`.

Mọi metric phải có định nghĩa rõ: *probability* (xác suất đã được hiệu chuẩn), *empirical rate* (tỷ lệ quan sát), *expected count* (số lần kỳ vọng), hoặc *ranking score* (điểm xếp hạng). Không dùng lẫn bốn khái niệm này.

## 1. Các lỗi đã tái hiện trong source hiện tại

Bộ `node test/test-algorithm-reference.js` hiện báo 33 PASS / 0 FAIL nhưng các assertion còn quá yếu, nên không chứng minh công thức đúng. Tôi đã chạy thêm hai fixture đối kháng độc lập:

### ALG-01 — Frequency Gap chấm số chưa từng xuất hiện như đang đúng chu kỳ

**File:** `js/algorithms/frequency-gap.js`, khoảng dòng 61–81.

Code hiện tại đặt `currentGap = nDraws` cho số chưa từng xuất hiện, rồi đặt `allIntervals = [nDraws]`. Vì vậy `avgCycle = nDraws`, `currentGap / avgCycle = 1`, `cycleScore = 90`. Trong fixture 5 kỳ, các số 40, 41 và 45 chưa từng xuất hiện nhưng đều có điểm `54`, cao hơn số 1 vừa xuất hiện ở kỳ mới nhất (điểm `37.3`). Đây là lỗi logic rõ ràng, không chỉ là ý kiến về hiệu suất.

**Yêu cầu sửa:** Phân biệt trạng thái `never-observed`, `one-observation`, `has-intervals`. Không lấy `nDraws` làm chu kỳ trung bình giả cho số chưa có lần xuất hiện. Nếu chưa có đủ khoảng cách để ước lượng chu kỳ, `avgCycle` phải là `null` và score phải theo prior/neutral evidence được khai báo, không được tự nhận điểm chu kỳ tối ưu. Tách metric `hitsInRecentWindow` khỏi `totalHits`.

### ALG-02 — `hits15` và mẫu số cửa sổ gần đây sai

**File:** `js/algorithms/frequency-gap.js`, khoảng dòng 84–121.

`hotScore` dùng `hits15 / 15` kể cả khi lịch sử có ít hơn 15 kỳ; metric `hits15` lại trả về `s.totalHits` đếm trên tối đa 50 kỳ. Tên field và phép tính không đồng nghĩa.

**Yêu cầu sửa:** `recentWindow = min(configuredWindow, nDraws)`, `hitsInRecentWindow` đếm đúng trên `historyData.slice(0, recentWindow)`, `recentRate = hitsInRecentWindow / recentWindow`. Nếu `recentWindow === 0`, trả `insufficient-data`. Thêm fixture 20–30 kỳ để phân biệt số lần trong 15 kỳ gần nhất với số lần trong toàn bộ cửa sổ 50 kỳ.

### ALG-03 — Poisson đang diễn giải xác suất của Vietlott không đúng loại biến

**File:** `js/algorithms/poisson.js`, khoảng dòng 37–58.

Đối với Vietlott, một số bóng chỉ có thể xuất hiện 0 hoặc 1 lần trong một kỳ. Code đếm `hits / nDraws` (tỷ lệ số kỳ có số đó xuất hiện), rồi áp dụng `1 - exp(-lambda)` và hiển thị dưới dạng phần trăm. Trong fixture 5 kỳ, số 1 xuất hiện 4/5 lần: code gọi `lambda = 0.8` và chấm `55.1%`; số chưa xuất hiện bị gán `0%`. Nhưng `hits/nDraws` là tỷ lệ Bernoulli quan sát, không phải số sự kiện Poisson trên mỗi kỳ; từ đó chuyển thành `1-exp(-lambda)` không phải cách tính xác suất inclusion của một bóng Vietlott. Với một kỳ quay công bằng, xác suất nền mỗi bóng là `pickBalls / totalBalls` (Mega: 6/45; Power: 6/55), không phải zero chỉ vì mẫu ngắn chưa quan sát thấy bóng đó.

**Yêu cầu sửa:** Tách mô hình theo game và định nghĩa lại output. Với Vietlott, ưu tiên output `empiricalRate` cùng khoảng bất định, hoặc posterior mean Beta-Binomial với prior lấy từ xác suất nền luật quay. Ví dụ nếu dùng prior strength `kappa`:

```js
const priorP = pickBalls / totalBalls;
const posteriorRate = (observedHits + kappa * priorP) / (nDraws + kappa);
```

Đây là **ước lượng tỷ lệ đã làm trơn**, không tự động là lợi thế dự đoán. Nếu giữ Poisson cho XSMN, dùng `countPerDraw` (multiplicity của cặp trong từng kỳ), `lambda = totalOccurrences / nDraws`, và báo `expectedOccurrencesPerDraw`; xác suất `P(count >= 1)` nên được lấy từ tỷ lệ kỳ có xuất hiện hoặc chỉ dùng `1-exp(-lambda)` khi mô hình Poisson đã được kiểm tra phù hợp. Không gọi `lambda` là xác suất. Không cho trường hợp không thấy trong vài kỳ tạo ra xác suất đúng bằng 0.

### ALG-04 — Association Rules học quan hệ thời gian ngược

**File:** `js/algorithms/association-rules.js`, khoảng dòng 43–72.

Input contract của project và các module khác là `historyData[0]` mới nhất. Vòng hiện tại đặt `draw = historyData[t]`, `nextDraw = historyData[t + 1]`; `t+1` thực chất là **kỳ cũ hơn**, không phải kỳ kế tiếp trong tương lai. Sau đó model lấy số kỳ mới nhất làm antecedent nên có thể dùng quan hệ ngược chiều để xếp số kỳ cũ cao hơn.

**Yêu cầu sửa:** Khi input sắp mới → cũ, mỗi transition phải có `older = historyData[i + 1]`, `newer = historyData[i]`, và đếm **older → newer**. Viết test fixture có quan hệ tiến thời gian bất đối xứng, ví dụ các kỳ theo thứ tự thời gian cũ→mới là `{A}`, `{B}`, `{C}`; input module mới→cũ là `[{C}, {B}, {A}]`. Test phải xác nhận chuyển tiếp đã học là `A→B`, `B→C`, không phải `C→B`, `B→A`.

Code khung yêu cầu:

```js
// history newest-first. Only learn older -> newer.
for (let newerIndex = 0; newerIndex < nDraws - 1; newerIndex++) {
  const newerSet = getDrawEventSet(historyData[newerIndex], options);
  const olderSet = getDrawEventSet(historyData[newerIndex + 1], options);
  recordTransition(olderSet, newerSet);
}
```

Tách hai thống kê: **same-draw co-occurrence** và **cross-draw sequential transition**. Không đưa `confidence = coOccurrenceCount / singleCounts[a]` vào object nhưng gắn nó vào điểm `combinedLift` đã trộn sequential. Nếu dùng lift chuyển tiếp, xác định rõ tập cặp chuyển tiếp hợp lệ `N-1`, marginals ở source-draw/target-draw tương ứng và công thức:

`transitionSupport(A→B) = edges(A in older and B in newer) / eligibleEdges`

`transitionConfidence(A→B) = edges(A in older and B in newer) / edges(A in older)`

`transitionLift(A→B) = transitionConfidence(A→B) / P(B appears in the newer side)`

Không trộn 70/30 giữa sequential lift và same-draw lift trừ khi trọng số được xác định trước và đánh giá trong inner walk-forward train folds. Các metric phải ghi rõ loại luật.

### ALG-05 — Markov là mô hình sự kiện đa nhãn nhưng đang diễn giải như xác suất chuyển trạng thái chuẩn

**File:** `js/algorithms/markov.js`, khoảng dòng 41–105.

Mỗi kỳ có nhiều số. `P(j|i)` được ước lượng như xác suất sự kiện bóng `j` xuất hiện ở kỳ tiếp theo khi `i` xuất hiện ở kỳ trước; đây là mô hình **multi-label conditional association**, không phải một chuỗi Markov đơn trạng thái loại trừ lẫn nhau. Với XSMN, `prevNums.forEach()` không khử trùng `lottoPairs`, nên số lặp cùng kỳ có thể làm tăng mẫu số và transition counts theo multiplicity dù output dự đoán là presence/absence. Smoothing `(transCount + 0.05) / (countI + 0.05 * K)` dùng dạng pseudo-count cho nhiều lớp nhưng numerator của từng `j` là một sự kiện Bernoulli riêng; định nghĩa prior không nhất quán. `1 - product(1-p_ij)` còn giả định các sự kiện điều kiện độc lập khi không có bằng chứng cho giả định đó.

**Yêu cầu sửa:** Định nghĩa rõ mục tiêu là `number present in next draw` hay `number occurrences`. Với dự đoán danh sách số xuất hiện/không xuất hiện, khử trùng từng draw trước khi đếm. Với từng antecedent `i` và target `j`, thống kê:

- `sourceDrawCount[i]`: số cặp kỳ hợp lệ mà `i` xuất hiện trong kỳ cũ.
- `transitionHit[i][j]`: số cặp kỳ có `i` ở kỳ cũ và `j` xuất hiện ở kỳ mới.
- `conditionalRate[i][j] = (transitionHit[i][j] + kappa * priorP[j]) / (sourceDrawCount[i] + kappa)`.

Dùng `priorP[j]` có định nghĩa nhất quán theo luật game hoặc ước lượng chỉ từ training folds. Tổng hợp theo antecedents của kỳ mới nhất bằng phép tổng hợp được định nghĩa trước (ví dụ weighted mean theo support, có shrinkage), không tự nhân các xác suất như những sự kiện độc lập. Output `scoreType: 'conditional-association-ranking'` cho tới khi được hiệu chuẩn ngoài mẫu; không gọi score này là xác suất dự đoán đã hiệu chuẩn.

### ALG-06 — Monte Carlo có thể hoàn tất simulation với ít hơn số bóng cần rút

**File:** `js/algorithms/monte-carlo.js`, khoảng dòng 121–139.

Nhánh Vietlott dừng vòng `while` sau `numDrawBalls * 5` lần thử ngay cả khi `pickedThisSim.size < numDrawBalls`, sau đó vẫn ghi nhận simulation đó. Điều này có thể tạo mô phỏng không đủ 6 bóng. `deriveSeedFromHistory()` chỉ băm ngày/mã kỳ đầu tiên; sửa quả bóng của một kỳ cũ không thay seed dù nội dung history thay đổi. Với XSMN, `score = hits / SIMULATIONS * 100` là expected count × 100 khi một cặp có thể xuất hiện nhiều lần trong cùng mô phỏng, không phải xác suất 0–100%. `volatilityStdDev` tính độ lệch chuẩn của tổng hits cộng dồn theo số, không phải biến động của từng lượt mô phỏng.

**Yêu cầu sửa:**

1. Validate `SIMULATIONS` là số nguyên dương, `topN` và `pickBalls` nằm trong miền hợp lệ; `pickBalls <= universeSize`.
2. Với Vietlott, thực hiện weighted sampling without replacement đúng nghĩa bằng cách cập nhật tổng trọng số của các số còn lại sau mỗi lần chọn, không dừng và âm thầm trả bộ số chưa đủ. Nếu sampler không thể hoàn tất thì throw/lỗi rõ ràng, không trả `status: ok`.
3. Với XSMN, mô phỏng 18 lần có hoàn lại nếu mục tiêu là mô hình hóa 18 đuôi lô; lưu hai metric khác nhau: `probabilityAtLeastOnce = simulationsWithAnyHit / M` và `expectedOccurrencesPerDraw = totalOccurrences / M`.
4. `deriveSeedFromHistory()` phải phụ thuộc vào toàn bộ canonical history content và tham số/game, hoặc được truyền `historyFingerprint` từ tầng gọi. Cùng toàn bộ input + seed phải tái lập; thay đổi bất kỳ draw nào phải đổi fingerprint.
5. Đo sai số Monte Carlo đúng cách. Với tần suất event `pHat = hits/M`, có thể tính `SE = sqrt(pHat*(1-pHat)/M)`; với counts nhiều lần trong kỳ, dùng thống kê count theo từng simulation. Không gọi độ lệch chuẩn giữa tổng hits các candidate là `volatilityStdDev` của simulation.

Mẫu sampler không hoàn lại:

```js
function weightedSampleWithoutReplacement(items, k, rng) {
  const remaining = items.map(x => ({ ...x }));
  const picked = [];
  if (!Number.isInteger(k) || k < 0 || k > remaining.length) {
    throw new RangeError('pick count outside available universe');
  }
  while (picked.length < k) {
    const total = remaining.reduce((s, x) => s + x.weight, 0);
    if (!(total > 0) || !Number.isFinite(total)) {
      throw new Error('invalid remaining weight');
    }
    let r = rng() * total;
    let idx = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      r -= remaining[i].weight;
      if (r < 0) { idx = i; break; }
    }
    picked.push(remaining[idx].value);
    remaining.splice(idx, 1);
  }
  return picked;
}
```

### ALG-07 — EMA/Seasonality dùng ngày mặc định khi date sai và blend chưa được chứng minh

**File:** `js/algorithms/moving-average.js`, khoảng dòng 16–26, 50–61, 87–120.

`parseDayOfWeek()` trả thứ Hai khi date thiếu/sai; `new Date(y,m,d)` tự chuẩn hóa ngày không tồn tại như `2026-02-30` sang tháng kế tiếp. Điều này làm dữ liệu sai có vẻ hợp lệ. EMA khởi tạo tất cả số ở `0.1`, dùng `basePrior=topN/maxNum` cho Vietlott và prior XSMN cố định `0.18`, sau đó blend 70% EMA + 30% weekday score. Hai trọng số này chưa có bằng chứng out-of-sample. Phần giải thích gọi là “độ dốc EMA/momentum” nhưng code đang dùng **mức EMA**, không tính slope.

**Yêu cầu sửa:**

- Tạo parser ISO strict; không trả về thứ mặc định nếu date thiếu hoặc không hợp lệ. Trả validation error/`insufficient-data` và ghi rõ lý do.
- Validate input đã chuẩn hóa và sort mới → cũ; xử lý timezone theo UTC date-only.
- EMA chạy theo thời gian cũ → mới. Dùng biến cố nhị phân `appeared` cho từng bóng Vietlott; với XSMN nói rõ dùng indicator xuất hiện ít nhất một lần hay multiplicity. Không trộn hai định nghĩa.
- Prior phải được định nghĩa theo game/target/event. Nếu muốn tính xác suất Vietlott, dùng prior theo luật quay; nếu chỉ ranking, gọi `emaRateScore` và không ghi “xác suất”.
- Dùng một công thức shrinkage nhất quán: `(hits + kappa * priorRate) / (n + kappa)`; không đổi strength tuỳ theo ngưỡng `n >= 3` trừ khi có lý do và test.
- Chỉ giữ blend 70/30 nếu trọng số được chọn trong inner walk-forward train folds và khóa trước outer test; nếu chưa, dùng rank aggregation trung tính hoặc hiển thị riêng `emaRate` và `weekdayRate`.
- Nếu giao diện nói “momentum/slope”, phải tính slope thật (ví dụ chênh lệch EMA mới với EMA trước) và có test; nếu không thì đổi nội dung thành “EMA occurrence rate”.

Ví dụ kiểm tra ngày:

```js
function strictUtcDayOfWeek(isoDate) {
  if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new TypeError('date must be YYYY-MM-DD');
  }
  const dt = new Date(`${isoDate}T00:00:00.000Z`);
  if (!Number.isFinite(dt.getTime()) || dt.toISOString().slice(0, 10) !== isoDate) {
    throw new RangeError(`invalid calendar date: ${isoDate}`);
  }
  return dt.getUTCDay();
}
```

### ALG-08 — Clustering chưa phải clustering và giả định mean reversion có tính chất gambler’s fallacy

**File:** `js/algorithms/clustering.js`.

Code hiện tính parity, high/low, distance-to-mean và frequency score; nó không thực hiện K-means, không tạo cluster assignments/centroids, và phần “decile buckets” trong contract không được dùng. `targetEvenBias = evenRatio > 0.52 ? 0.40 : 0.60` tự động đảo tỷ lệ chẵn/lẻ sau khi quá khứ vượt 52%; `targetHighBias` cũng làm tương tự. Với một cuộc quay độc lập, chẵn nhiều trong lịch sử không khiến kỳ tới tự động ưu tiên lẻ. Điểm số đánh từng số độc lập, vì vậy không bảo đảm tổ hợp Top 6 có cơ cấu 3:3, dải tổng hoặc các đặc trưng cấp-tổ hợp như phần giải thích hàm ý.

**Yêu cầu sửa và chọn một trong hai hướng:**

**Hướng A — trung thực, ít rủi ro (được ưu tiên cho bản hiện tại):** đổi tên thành `structure-heuristic`, xóa cách diễn đạt như “dự báo hồi quy trung bình chắc chắn”, bỏ rule đảo bias 0.52 nếu chưa được kiểm chứng, xuất `parityRate`, `highLowRate`, `historicalMean`, `frequencyScore` như các đặc trưng mô tả. Ghi rõ đây là ranking heuristic, không phải K-means và không phải xác suất.

**Hướng B — nếu thật sự muốn K-means:** định nghĩa feature vectors được scale, deterministic initialization (ví dụ k-means++ seeded), `k`, `maxIterations`, convergence tolerance, cluster assignment và inertia. Chỉ dùng clustering để mô tả nhóm kỳ tương tự; không tự suy ra “số có xác suất trúng cao” nếu chưa có mapping out-of-sample từ cluster đến outcome kỳ sau. Thêm test cho centroids/assignments trên fixture tính tay.

Nếu cần chọn một bộ số có tỷ lệ chẵn/lẻ hoặc tổng nhất định, đây là ràng buộc **cấp bộ số**, không thể tuyên bố đạt chỉ bằng cách xếp hạng từng số riêng lẻ. Hoặc implement optimizer cấp-tổ-hợp với hàm objective công khai, hoặc loại bỏ lời hứa về cơ cấu tổ hợp.

### ALG-09 — Ensemble chuẩn hóa Min-Max, trọng số và đầu vào chưa có căn cứ thống kê

**File:** `js/algorithms/ensemble.js`, khoảng dòng 20–29, 84–165.

Trọng số `0.18, 0.15, 0.15, 0.14, 0.13, 0.13, 0.12` đang được hard-code. Đặc tả trước đó ghi “trọng số theo hiệu năng” nhưng source không fit trọng số từ walk-forward performance. Min-Max trên mỗi model tự ép score của model có min/max thành 0/100 dù dải raw score có thể chỉ khác nhau do nhiễu; điểm số vốn khác ý nghĩa bị xem như cùng thang đo. `validSubResults` chỉ yêu cầu `scores` là object truthy; object rỗng vẫn lọt vào, `normMap` có thể toàn zero nhưng model vẫn chiếm trọng số. Một vài model lỗi bị bỏ qua âm thầm rồi trọng số còn lại được chuẩn hóa lại, làm ý nghĩa Ensemble thay đổi không được thông báo.

**Yêu cầu sửa:**

1. Tạm thời dùng **equal-weight percentile-rank aggregation** nếu chưa có bằng chứng học trọng số. Với từng model, xếp toàn bộ universe theo raw score; chuyển thành percentile rank `rankScore ∈ [0,100]` với tie rule cố định. Ensemble score là trung bình có trọng số đã công bố của rankScore. UI gọi nó là “consensus/ranking score”, không gọi là xác suất.
2. Nếu muốn weights theo hiệu năng: chỉ học weights trên **inner walk-forward folds** nằm hoàn toàn trước outer target date. Không bao giờ tối ưu trên outer test folds rồi báo kết quả của cùng folds là hiệu năng ngoài mẫu.
3. Validate từng model trước khi tham gia: `status === 'ok'`, `predictions` đúng độ dài, không trùng và nằm trong universe; có một score hữu hạn cho từng candidate trong universe. Thiếu score, score NaN/Infinity hoặc model lỗi phải được đánh dấu `excluded` với nguyên nhân; không âm thầm chuyển thành score 0.
4. Nếu thiếu số model tối thiểu, trả `insufficient-data` hoặc `partial` rõ ràng theo contract; không ghi “8/8” nếu chỉ chạy được 5 model.
5. `consensusRatio` là mức đồng thuận ranking, không phải xác suất trúng; disclaimer phải hiển thị cạnh KPI.
6. Thêm test dùng mock models có rankings đã biết để tính tay toàn bộ percentile ranks, weights, tie-breaking và Top N.

Pseudocode đề xuất (percentile rank):

```js
function percentileRanks(scoreEntries) {
  const ordered = [...scoreEntries].sort((a, b) =>
    b.score - a.score || compareCanonicalNumber(a.num, b.num)
  );
  const n = ordered.length;
  if (n <= 1) return new Map(ordered.map(x => [x.num, 100]));
  return new Map(ordered.map((x, idx) => [x.num, 100 * (n - 1 - idx) / (n - 1)]));
}
```

Tie groups should either share average rank or use a documented deterministic tie-break. The test and output must use exactly one policy.

### ALG-10 — `predictSpecialPrize()` bịa cấu trúc dự đoán giải đặc biệt

**File:** `js/algorithms/ensemble.js`, khoảng dòng 228–315.

Code mặc định hai chữ số cuối là `'38'` khi không có `topCandidates`; bốn chữ số đầu được chấm bằng hằng số (`1.5`, `3.5`, recency `0.85`) và tự cộng bonus cho chữ số `(lastDigit + 3) % 10`, `+7`, `+5` với trọng số `2.8`, `2.2`, `2.5`. Không có bằng chứng nguồn hay công thức ước lượng những offset này. Hai chữ số cuối còn bị buộc theo số lô đứng đầu Ensemble, dù quan hệ dự đoán đó chưa được đánh giá độc lập.

**Yêu cầu sửa:**

- Xóa fallback `'38'`. Khi thiếu dữ liệu hoặc không có `topCandidates` hợp lệ, trả `status: 'insufficient-data'`; không tạo số dự đoán mặc định.
- Không cộng các offset `+3/+7/+5` nếu không có transition counts thực tế. Nếu giữ positional model, tạo bảng chuyển tiếp cho từng vị trí chữ số từ cặp kỳ `olderSpecial -> newerSpecial`; với input mới → cũ, dùng index `[i+1]` làm older và `[i]` làm newer. Smoothing bằng Dirichlet prior đã công khai.
- Không mặc định gắn 2 chữ số cuối của giải đặc biệt với Top 1 lô tô nếu chưa chứng minh được cải thiện trong out-of-sample backtest.
- Tốt hơn là xuất phân phối/Top-K chữ số và điểm ranking, hoặc một số candidate mang nhãn “heuristic experimental”; không hiển thị một dãy 6 chữ số như dự đoán chắc chắn.
- Thêm fixture positional có transitions được biết trước; test phải kiểm tra từng count và candidate distribution tính tay.

---

## 2. Sửa cách chuẩn hóa dữ liệu chung trước khi chạy model

Tạo helper dùng chung, ví dụ `js/algorithms/input-normalizer.js`. Tất cả thuật toán và Backtest phải dùng cùng một hợp đồng dữ liệu.

### 2.1 Contract chung

- Input phải là array hợp lệ, mỗi draw có ISO date thật `YYYY-MM-DD` và game/station scope rõ ràng.
- Quy ước toàn hệ thống: `historyData[0]` là kỳ mới nhất. Validate hoặc sort rõ ràng; không để module tự đoán thứ tự.
- Vietlott: normalize số thành integer và kiểm tra domain 1..45 hoặc 1..55, không trùng bóng trong cùng kỳ.
- XSMN: normalize cặp lô tô thành chuỗi 2 ký tự `00`–`99`. Numeric `1`, string `'1'`, string `'01'` phải thành `'01'` trong **presence-based algorithms**. Giữ multiplicity trong các metric count-based.
- Phân biệt `eventSet` (số có xuất hiện ít nhất một lần trong kỳ) và `eventCounts` (số lần xuất hiện trong kỳ). Không dùng chung một cấu trúc cho cả hai định nghĩa.
- Không mutate input. Trả `status: 'invalid-input'` hoặc throw typed error khi schema/date/order sai; không âm thầm dùng `|| []` cho field bắt buộc bị thiếu.

Ví dụ:

```js
export function normalizeLottoPair(value) {
  if (!(typeof value === 'string' || typeof value === 'number')) {
    throw new TypeError('lotto pair must be string/number');
  }
  const raw = String(value).trim();
  if (!/^\d{1,2}$/.test(raw)) throw new RangeError(`invalid lotto pair: ${raw}`);
  return raw.padStart(2, '0');
}
```

Tạo `getDrawEventSet(draw, options)` riêng cho từng game. Unit tests phải bao phủ `[1, '01', '1']` canonicalize nhất quán, số ngoài miền, ngày không tồn tại và lịch sử không đúng thứ tự.

---

## 3. Sửa Backtest Engine — hiện có lỗi ảnh hưởng trực tiếp kết luận model

**File:** `js/backtest-engine.js`.

### BT-01 — Random baseline bị tính một mẫu, các replicates không được dùng

`RandomBaselineAlgorithm.predict()` tạo `primaryPreds = generateOneSample(0)` rồi vòng `for (r = 0; r < replicates; r++)` cũng tạo `generateOneSample(0)` ở replicate đầu. Mẫu chính trùng replicate đầu tiên. `runSingleDateBacktest()` chỉ chấm `basePred.predictions`, bỏ qua `replicateSamples`; default là 10 trong code nhưng contract FIX-8 ghi 100.

**Yêu cầu sửa:**
- Seed của primary và mỗi replicate phải phân biệt/ghi rõ.
- Cấu hình official evaluation dùng ít nhất 100 replicates mỗi fold (hoặc một giá trị đã được pre-register); không hard-code hit rate.
- Tính cùng metric giống mô hình: per-fold hit rate distribution, mean, SD/SE và CI 95% từ replicates. Không so một mẫu ngẫu nhiên với trung bình 30 fold của model.
- Nếu bất kỳ baseline replicate nào có số bóng sai/duplicate ngoài luật game, fold phải thất bại.

### BT-02 — `windowSize` chỉ đổi nhãn báo cáo, không đổi tập train

`runSingleDateBacktest()` luôn dùng `buildTrainingSet(fullHistory, targetDate)`; `windowSize` chỉ ảnh hưởng chuỗi `windowPolicy`. Khi giao diện nói “Rolling Window 50 kỳ”, code vẫn có thể dùng toàn bộ history.

**Yêu cầu sửa:** chuẩn hóa/cắt lịch sử thành newest-first, lọc `date < targetDate`, sau đó nếu có `windowSize = W`, lấy đúng `trainingData.slice(0, W)`. `trainingDateRange`, `trainingDataCount` và `windowPolicy` phải tính từ tập cuối cùng thực sự truyền cho model. Thêm test: với 100 draw và W=20, mọi model nhận đúng 20 draw, ngày đều trước target.

### BT-03 — XSMN backtest trộn dữ liệu các đài

`runSingleDateBacktest()` lọc `actualDraw` theo `stationOrGame`, nhưng `trainingData` lấy từ toàn bộ `fullHistory` cho mọi station. Với dữ liệu gộp 21 đài, mô hình cho TP.HCM có thể học từ các đài khác. `runBatchBacktest()` lại lấy `sortedHistory.slice(0,numDraws)` từ toàn bộ mảng nên nhiều bản ghi cùng ngày ở các đài khác nhau có thể khiến cùng một target station/date được đánh giá lặp.

**Yêu cầu sửa:**
- Khi `stationOrGame` là một đài, lọc `stationId` trước khi chọn fold và trước khi xây training set.
- Khi `stationOrGame === 'all'`, mỗi fold phải có identity `(date, stationId)` và gọi backtest đúng cặp đó; không chỉ dùng date làm khóa.
- Vietlott dùng identity `(gameType/drawId/date)` để phân biệt game/kỳ.
- Test fixture có hai đài cùng ngày nhưng kết quả khác nhau; thay số ở đài còn lại không được thay prediction của đài đang test.

### BT-04 — Canonical comparison và failed models

Vietlott dùng `actualWinningNumbers.includes(predNum)` nên sẽ fail nếu actual lưu string. XSMN dùng `String(n) === predStr`, làm `'1'` không khớp `'01'`. `catch` của baseline bị nuốt; lỗi model đôi khi bị log và bỏ qua, còn fold vẫn được coi thành công với các model còn lại.

**Yêu cầu sửa:** so sánh qua normalizer chung. Mỗi result có `status`, `errorCode`, `trainingDrawCount`; `insufficient-data` không được tính như 0% hit rồi rank cuối bảng. Leaderboard phải dùng cùng tập fold hợp lệ giữa các model, hoặc công bố rõ số fold của mỗi model và loại model không đủ mẫu khỏi Top 1. Không dùng empty `catch {}`.

### BT-05 — Metric và công thức Top 1

Tách tối thiểu các metric:
- Vietlott: `matchedBalls / predictedBalls` trung bình mỗi fold, `meanHitsPerDraw`, baseline cùng định nghĩa.
- XSMN: `predictedPairsHitAtLeastOnce / predictedPairs` và `totalOccurrencesPerPredictedSet` riêng. Không nhập số lần xuất hiện lặp lại vào hit-rate mà không công bố.
- Tổng hợp across folds: `meanFoldHitRate`, `microHitRate`, `meanOccurrencesPerDraw`, `foldCount`, `baselineMean`, `baselineCI`, `differenceVsBaseline`.

Top 1 chỉ dựa trên `primaryMetric` công bố trước, kèm số fold, CI và baseline. Không dùng `bestHitRate` của một kỳ làm metric chính và không tuyên bố statistical superiority nếu CI/difference chưa hỗ trợ.

---

## 4. Hợp đồng output thống nhất cho mọi model

Mỗi model phải trả object tương thích:

```js
{
  status: 'ok' | 'insufficient-data' | 'invalid-input' | 'error',
  id: 'model-id',
  name: 'Model name',
  predictions: [],             // distinct, canonical, in-range, exact topN
  scores: {},                  // score for every candidate in universe OR documented sparse scores
  scoreType: 'ranking-score' | 'empirical-rate' | 'expected-count' | 'calibrated-probability',
  metrics: {
    nDrawsInput: 0,
    nDrawsUsed: 0,
    dateRange: { from: null, to: null },
    parameters: {},
    evidence: {}
  },
  explanation: '',
  warnings: []
}
```

Không đặt `confidenceScore = consensusRatio` rồi gọi là probability. Nếu `scoreType` là `ranking-score`, UI phải hiển thị “điểm xếp hạng”, không có dấu `%` nếu nó không phải tỷ lệ có ý nghĩa.

---

## 5. Bộ test bắt buộc — phải chứng minh các lỗi cũ đã bị bắt

Thêm hoặc nâng cấp `test/test-algorithm-reference.js` và tách test cho mỗi module. Không chỉ kiểm tra `predictions.length === 6`.

### 5.1 Frequency Gap

1. Fixture không có số `40` trong bất kỳ kỳ nào: `currentGap = nDraws`, `totalHits = 0`, `evidenceStatus = 'never-observed'`; tuyệt đối không tự đặt `avgCycle = nDraws` để khiến `ripeness = 1` và `cycleScore = 90`.
2. Fixture có 2 lần xuất hiện tạo interval chính xác: expected interval/average phải khớp tay.
3. Fixture 25 kỳ: `hitsInRecentWindow` phải đếm đúng 15 kỳ mới nhất, còn `totalHits` đếm đúng cửa sổ model.
4. History ngắn 5 kỳ: divisor của recent rate phải bằng 5 chứ không phải 15.

### 5.2 Poisson/Frequency Rate

1. Với Vietlott, test công thức prior/rate được chọn và khai báo đúng loại metric; số chưa quan sát không được hiển thị `0% probability` nếu đang dùng prior smoothing.
2. Nếu model vẫn xuất calibrated probability, chạy reliability/calibration report out-of-sample; nếu chưa có, buộc `scoreType` không phải `calibrated-probability`.
3. XSMN: fixture có cặp xuất hiện 2 lần trong một draw; event rate (có/không) và expected count phải cho kết quả khác nhau đúng định nghĩa.

### 5.3 Markov và Association Rules

1. Fixture transition bất đối xứng theo thời gian: cũ `A`, sau đó `B`, sau đó `C`; xác nhận learned transitions là `A→B`, `B→C`.
2. Đặt `historyData[0]` là kỳ mới nhất; cấm code ghi nhận `historyData[i] → historyData[i+1]` như tương lai.
3. Fixture XSMN có `'01'`, `1`, `'1'`: presence-based counts chỉ đếm 1 event/kỳ; count-based occurrence giữ multiplicity nhưng ghi rõ.
4. Tính tay `support`, `confidence`, `lift` từ fixture nhỏ; assert từng giá trị exact/tolerance rõ ràng, không chỉ kiểm tra một cặp có `count=3`.
5. Smoothing: probability/rate nằm trong `[0,1]`; số mẫu bằng 0 phải dùng prior hoặc đánh dấu thiếu evidence.

### 5.4 Monte Carlo

1. Mọi simulation Vietlott phải đủ đúng `pickBalls` số khác nhau; không có simulation thiếu bóng do hết attempts.
2. `pickBalls > universeSize`, weight âm/NaN, `simulations=0` phải từ chối.
3. Cùng history đầy đủ + seed + config cho cùng output; sửa một số cũ phải đổi `historyFingerprint`.
4. XSMN báo expected occurrence và probability at least once riêng; test có thể tạo một cặp 2 lần trong một draw.
5. Báo `simulationsExecuted === simulationsRequested` và không gọi SD của aggregate candidate totals là uncertainty per draw.

### 5.5 EMA/Seasonality

1. `2026-02-30`, date thiếu và date sai định dạng phải bị từ chối, không được mặc định Monday.
2. Fixture tính tay EMA theo chuỗi cũ→mới với alpha đã khai báo; score phải khớp expected.
3. Thứ target lấy từ `targetDrawDate` hợp lệ hoặc official schedule; không lấy ngày hiện tại một cách ngầm định.
4. Mọi prior/weight có trong metrics để có thể tái lập.

### 5.6 Structure Heuristic

1. Test cấu trúc đúng tên gọi: nếu không triển khai K-means thì không tự nhận là K-means.
2. `targetEvenBias` không được đổi 0.52 theo kiểu mặc định mean-reversion nếu chưa có kiểm định; thêm test chứng minh metric lịch sử chỉ mô tả dữ liệu và không biến thành tuyên bố xác suất.
3. Nếu model tuyên bố set-level parity/sum constraint, test toàn bộ bộ số đầu ra thực sự thỏa constraint; nếu không, loại bỏ claim đó.

### 5.7 Ensemble

1. Tạo 2–3 mock model có điểm/thu hạng và weights đã biết; tính tay score/rank của từng ứng viên và kiểm tra exact topN.
2. Một model trả `scores: {}`, score NaN/Infinity, thiếu một số trong universe hoặc duplicate predictions phải bị loại với error/warning cụ thể, không âm thầm đóng góp weight.
3. Nếu dùng fixed/equal weights, hiển thị đúng phương pháp; nếu học weight, chứng minh weights chỉ dùng training folds trước target date.
4. Score và consensus không được gọi là xác suất. Không được dùng model lỗi để tạo một Top 1 giả.

### 5.8 Giải đặc biệt XSMN

1. Khi thiếu lịch sử hoặc không có `topCandidates`, output phải `insufficient-data`; cấm fallback `'38'`.
2. Không còn bonus cố định `+3`, `+7`, `+5` nếu không có transition table/count làm căn cứ.
3. Có fixture positional 6 digits với transitions được biết; test tính đúng mỗi digit posterior/score.
4. Không bắt buộc hai chữ số cuối giải đặc biệt trùng Top 1 lô tô trừ khi có nghiên cứu outer-test riêng chứng minh cách kết hợp.

### 5.9 Backtest/Leaderboard

1. `windowSize=20` trên 100 kỳ phải truyền đúng 20 kỳ cho algorithm.
2. Input gộp XSMN nhiều station không được trộn station; target fold là `(date, stationId)`.
3. History `'1'`/`'01'` phải match sau normalize; Vietlott actual string/number cũng phải match.
4. Baseline replicates dùng seed độc lập; không dùng replicate đầu cùng seed với primary prediction; backtest phải tổng hợp tất cả replicates.
5. Nếu 1 algorithm trả `error/insufficient-data`, record rõ; không rank như model đạt 0% trên fold đó.
6. Chèn future draw có date > target không được thay prediction, metric train hoặc fitted weights ở target fold.

---

## 6. Thiết kế kiểm định walk-forward không leakage

Dùng outer walk-forward folds; ví dụ mỗi fold có target date T:

1. Tạo `train = draws with date < T`.
2. Lọc game/station scope **trước** fit model.
3. Nếu rolling window W: giữ chính xác W kỳ gần nhất từ train; nếu expanding window thì dùng toàn bộ train.
4. Những việc lựa chọn weights, alpha, prior strength hoặc ngưỡng phải dùng **inner folds nằm hoàn toàn trong train**.
5. Freeze config rồi dự đoán target T đúng một lần.
6. So kết quả với actual draw lấy riêng để chấm, actual draw tuyệt đối không truyền vào `predict()`.
7. Lưu `targetDrawId`, `targetDate`, `scope`, `trainDrawIdsHash`, `configHash`, `modelVersion`, `prediction`, `actual`, metrics.
8. Lặp qua outer targets. Mọi model được so sánh trên cùng fold IDs; fold fail phải báo rõ và không tự coi là 0-hit.

Lưu ý quan trọng: với xổ số công bằng và độc lập, việc số đã “gan lâu”, “nóng”, parity đã lệch hay một chuỗi digit vừa xuất hiện không tự động làm kỳ tiếp theo đảo chiều. Các heuristic này phải được xem là feature/ranking hypothesis cần kiểm định, không phải quy luật xác suất đã được chứng minh.

---

## 7. Metric, Top 1 và báo cáo

Report phải tách riêng:

- `meanFoldHitRate`: trung bình tỷ lệ trúng trên từng fold.
- `microHitRate`: tổng hit / tổng số dự đoán, nếu metric phù hợp.
- `meanOccurrencesPerDraw`: XSMN, giữ multiplicity.
- `baselineMean`, `baselineStandardError`, `baselineCI95`.
- `differenceVsBaseline`, `foldCount`, `foldsFailed`, `scope`.
- `scoreType` của mỗi model và có hay không việc calibration.

Nếu chưa chứng minh lợi thế với baseline ngoài mẫu, UI chỉ ghi “Top 1 theo metric của mẫu backtest”, không ghi “thuật toán chính xác nhất” hoặc “xác suất trúng cao nhất”. Cấm dùng kỷ lục tốt nhất một lần làm metric xếp hạng chính.

---

## 8. Thứ tự thực hiện và cổng không được bỏ qua

### Phase A — Input contract và unit tests

Hoàn thành common normalizer và test date/order/number coercion. Gate FAIL thì dừng.

### Phase B — Sửa các lỗi chắc chắn

1. Frequency Gap never-observed/recent window.
2. Association Rules transition direction và metrics.
3. Monte Carlo complete sampling/metric semantics.
4. EMA strict date validation.
5. Remove arbitrary `38`/digit offsets khỏi special prize prediction.

Với mỗi mục: chạy targeted regression test trước/sau, sau đó test module liên quan. Gate FAIL thì quay về mục đó.

### Phase C — Định nghĩa toán học và output semantics

Sửa Poisson, Markov, Clustering và Ensemble theo các hợp đồng ở trên. Xóa tuyên bố probability nếu output chỉ là ranking score. Gate FAIL thì không sang Phase D.

### Phase D — Backtest và baseline

Sửa station/game isolation, rolling-window thật, canonical comparisons, replicate aggregation, failed-model accounting và common folds. Chạy test chống leakage trên fixture nhiều đài.

### Phase E — Strict release

1. Chạy toàn bộ unit, algorithm reference, integration, mutations và E2E.
2. Chạy `npm run verify:strict` 3 lần độc lập trên cùng source commit/hash.
3. Mỗi run có thư mục riêng, log đóng trước khi hash, gate status và exit code thật.
4. So sánh logs/artifacts với manifest được tạo sau khi file hoàn tất.
5. Bất kỳ FAIL, skipped test, exception bị nuốt, browser chưa chạy hoặc contract thiếu test đều chặn release.

---

## 9. Tiêu chí nghiệm thu — không tự đánh dấu hoàn thành

Chỉ đóng issue nếu có đủ:

1. Test tái hiện bug trước sửa và log FAIL trước sửa.
2. Patch có thay đổi logic thực chất.
3. Regression test PASS sau sửa.
4. Expected values độc lập tính tay hoặc oracle được giải thích rõ.
5. Mutation test chứng minh lỗi tương đương không lọt lại.
6. Full regression suite PASS.
7. Nếu thay đổi model formula, backtest comparison được tạo lại trên các fold ngoài mẫu chưa dùng để chọn công thức/trọng số.
8. Report nêu rõ model nào là heuristic, model nào xuất calibrated probability và bằng chứng calibration.

Nếu công thức hiện tại chỉ tạo ranking nhưng không có bằng chứng dự báo tốt hơn ngẫu nhiên, **vẫn có thể coi implementation đúng theo định nghĩa**, nhưng phải gắn nhãn exploratory ranking; không được tuyên bố “dự đoán chính xác” hoặc tự nâng Top 1 lên thành bằng chứng thắng lợi.

### Báo cáo bắt buộc tạo

- `reports/fix9/verification-report.md`
- `reports/fix9/algorithm-contracts.md`
- `reports/fix9/algorithm-reference-results.json`
- `reports/fix9/walk-forward-results.csv`
- `reports/fix9/issue-ledger.md`
- `reports/fix9/gate-results.json`

Các số lượng PASS/FAIL phải được sinh từ log thật; không gõ tay. `RELEASE_READY` chỉ được đặt khi tất cả gate bắt buộc chạy thật và đạt, không có issue P0/P1 mở, không còn metric probability giả và có report walk-forward tái lập.
