# FIX-10 — Đặc tả sửa lỗi thuật toán, chuẩn hóa input và kiểm định thống kê

**Dự án:** LOTTO-QUANT LAB  
**Mục tiêu:** Sửa các lỗi logic đã tái hiện sau FIX-9; không chỉ làm test PASS mà phải chứng minh công thức được triển khai đúng hợp đồng đã công bố.  
**Phạm vi:** `input-normalizer.js`, `data-service.js` / history validator, 8 algorithm modules, `ensemble.js`, Backtest Engine, leaderboard, test suites và gate runner.  
**Quy tắc phát hành:** Không tuyên bố dự đoán chính xác tương lai 100%. Chỉ có thể xác nhận rằng dữ liệu đầu vào đã được xác minh trong phạm vi xác định, code tuân thủ công thức được mô tả và hiệu suất được đánh giá trung thực trên các kỳ out-of-sample.

---

## 0. Lệnh điều hành bắt buộc cho coding agent

Đọc `AGENTS.md`/`agent.md` nếu có, `fix-1.md` đến `fix-9.md`, các algorithm contracts, source code và test hiện tại trước khi thay đổi. Không giả định tên hàm hoặc schema khác với code đang có; nếu tên khác, truy ra implementation tương ứng và ghi rõ file/hàm thật trong issue ledger.

**Không được làm theo kiểu “sửa xong rồi báo”.** Với từng lỗi, bắt buộc theo thứ tự:

1. Tạo fixture tái hiện lỗi và test thất bại trên code hiện tại (RED).
2. Ghi lại lệnh chạy, exit code và thông báo lỗi kỳ vọng.
3. Sửa nguyên nhân gốc, không vá chuỗi hiển thị hoặc vô hiệu hóa assertion.
4. Chạy đúng test vừa thất bại và chứng minh PASS (GREEN).
5. Chạy regression suite liên quan.
6. Chạy mutation/negative test để chứng minh hệ thống vẫn từ chối dữ liệu sai.
7. Cập nhật issue ledger bằng bằng chứng thực: file sửa, test ID, command, exit code và artifact.
8. Chỉ đóng issue sau khi tất cả bước trên đạt. Nếu thiếu nguồn, môi trường hoặc bằng chứng: `BLOCKED`, không được giả định PASS.

Không được:

- giảm assertion, bỏ test, `skip`, `todo`, bắt exception rồi trả PASS, hoặc thay metric để che thất bại;
- sửa expected value chỉ để khớp output sai của thuật toán;
- dùng dữ liệu của kỳ mục tiêu hoặc tương lai để huấn luyện, chọn trọng số, chọn tham số hay chuẩn hóa score cho fold đó;
- trình bày heuristic score/consensus score như xác suất trúng đã được hiệu chuẩn;
- tự tạo dữ liệu lịch sử, ngày quay, số trúng hoặc Jackpot;
- tuyên bố “đã sửa” chỉ vì code compile hoặc thuật toán tạo được đủ số.

### Definition of Done

Chỉ đóng FIX-10 khi:

- input không hợp lệ bị từ chối rõ ràng;
- 8 thuật toán tuân thủ input/output contract và expected-value test độc lập;
- Ensemble không dùng điểm giả cho score bị thiếu;
- backtest walk-forward không leakage và baseline so sánh công bằng;
- leaderboard thể hiện đúng metric/phạm vi/mẫu kiểm định;
- các suite và `npm run verify:strict` chạy thành công ba lần liên tiếp trên source cuối cùng;
- mỗi lần có `runId`, log hoàn chỉnh, exit code, report và SHA-256 tính sau khi log đóng;
- không còn issue P0/P1 mở. Những phần chưa chứng minh được phải được ghi `BLOCKED`, không được đánh dấu `RELEASE_READY`.

---

## 1. Lỗi đã tái hiện cần giải quyết

### FIX10-01 — Input Normalizer dùng `parseInt()` quá lỏng (P0)

Đã quan sát trong `js/algorithms/input-normalizer.js`: chuỗi như `"12abc"`, `"1.5"` và `" 7x"` có thể bị `parseInt()` biến thành số hợp lệ. Đây là lỗi dữ liệu vì đầu vào sai định dạng âm thầm đổi thành số khác.

**Cách sửa bắt buộc**

1. Nếu input là number: yêu cầu `Number.isInteger(value)` và finite.
2. Nếu input là string: `trim()` rồi yêu cầu toàn chuỗi khớp `/^\d+$/`. Không dùng `parseInt()` trước bước regex.
3. Sau khi parse bằng `Number()`, kiểm tra miền theo game: Mega 1–45; Power số chính 1–55; số đặc biệt đúng miền luật; XSMN đuôi số chính xác hai chữ số `00`–`99` (không dùng integer 0–99 nếu UI cần giữ định dạng hai chữ số; lưu numeric và format ở view cũng được nhưng phải nhất quán).
4. Không “sửa hộ” giá trị không hợp lệ. Trả lỗi có code như `INVALID_NUMBER_FORMAT`, `NUMBER_OUT_OF_RANGE`, `DUPLICATE_NUMBER`.

Mẫu code tham khảo, phải tích hợp theo style/schema thực tế của dự án:

```js
export function parseStrictInteger(value, { min, max, field = 'value' }) {
  let parsed;

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new TypeError(`${field}: expected a finite integer`);
    }
    parsed = value;
  } else if (typeof value === 'string') {
    const text = value.trim();
    if (!/^\d+$/.test(text)) {
      throw new TypeError(`${field}: invalid integer format`);
    }
    parsed = Number(text);
  } else {
    throw new TypeError(`${field}: unsupported value type`);
  }

  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new RangeError(`${field}: value outside [${min}, ${max}]`);
  }
  return parsed;
}
```

**Tests bắt buộc**

- PASS: `"07" -> 7`, `7 -> 7`, `" 7 " -> 7` nếu policy cho phép whitespace ngoài.
- FAIL: `"12abc"`, `"1.5"`, `" 7x"`, `""`, `"+7"` nếu grammar không cho dấu cộng, `NaN`, `Infinity`, `7.2`, `0`, `46` cho Mega.
- Property test: mọi input được chấp nhận đều là integer trong miền được chỉ định.

### FIX10-02 — History validator cho bản ghi thiếu kết quả đi vào thuật toán (P0)

`validateAndSortHistory()` và `getDrawEventSet()` từng cho phép `winningNumbers` thiếu hoặc không phải mảng, rồi dùng `[]` như fallback. Kết quả là Frequency Gap/Ensemble vẫn có thể trả `status: ok` khi không có sáu bóng lịch sử hợp lệ.

**Cách sửa bắt buộc**

- Validation phải diễn ra trước khi gọi bất kỳ model nào.
- Không được biến trường thiếu/sai thành mảng rỗng, 0, ngày mặc định hoặc số mặc định.
- Một bản ghi có ngày/kỳ hợp lệ nhưng thiếu trường bắt buộc là `invalid-input`; toàn bộ history không đạt contract thì prediction không chạy.
- `insufficient-data` chỉ dành cho history hợp lệ nhưng số kỳ hợp lệ ít hơn ngưỡng của model.
- `invalid-input` dành cho record bị sai schema, sai ngày lịch, ID trùng, bóng trùng hoặc số nằm ngoài miền.
- Không silently drop record lỗi. Trả về `errors[]` chỉ rõ `recordId`, `field`, `code`.

Contract Vietlott tối thiểu:

```ts
interface VietlottDraw {
  gameType: 'MEGA_645' | 'POWER_655';
  drawId: string;
  date: string;             // ngày lịch hợp lệ, canonical ISO date
  winningNumbers: number[]; // đúng 6 số nguyên duy nhất trong miền game
  bonusNumber?: number;     // bắt buộc với POWER_655, không dùng cho MEGA_645
  jackpotEst?: number | null; // thiếu phải thể hiện rõ, tuyệt đối không giả lập
  sourceEvidenceId?: string;
  verificationStatus?: 'verified' | 'unverified' | 'conflict';
}
```

Contract XSMN phải xác định chính xác cấu trúc giải theo nguồn, gồm đúng các giải và đúng số lượng kết quả mỗi giải. Từ `prizes` suy ra `lottoPairs` bằng hàm thuần độc lập. Nếu dữ liệu giải bắt buộc thiếu thì bản ghi không hợp lệ; không chấp nhận một object chỉ có giải đặc biệt hoặc chỉ có danh sách 18 cặp tự khai mà không có giải gốc.

Mẫu kết quả chung:

```js
{ status: 'ok' | 'insufficient-data' | 'invalid-input' | 'unavailable',
  predictions: [], errors: [], diagnostics: {} }
```

Model không được trả `ok` nếu validation đầu vào thất bại. Không dự đoán khi `history.length === 0` hoặc history chứa draw invalid.

**Regression tests**

- History rỗng → `insufficient-data`.
- History có một record thiếu `winningNumbers` → `invalid-input`.
- History có record 6 bóng nhưng bóng trùng → `invalid-input`.
- Power thiếu `bonusNumber` → `invalid-input`.
- Date `2026-02-30` → `invalid-input`; không chấp nhận ngày do JS tự normalize.
- Fixture hợp lệ ở mỗi game → status bình thường, output có đúng số lượng, không trùng bóng chính.

### FIX10-03 — EMA prior phụ thuộc `topN` (P0)

Trong `js/algorithms/moving-average.js`, prior từng được tính kiểu `topN / universe.length`. Số ứng viên muốn hiển thị không phải tham số của luật quay và không được làm thay đổi score của một candidate.

**Cách sửa**

- Tách `candidateLimit`/`topN` (chỉ để cắt output cuối) khỏi toàn bộ tham số mô hình.
- Prior phải được định nghĩa từ luật game và loại target:
  - Vietlott: xác suất biên một bóng thuộc một kỳ = `pickCount / universeSize` (Mega 6/45: `6/45`; Power 6/55 số chính: `6/55`). Đây là baseline lý thuyết, không phải kết luận từ EMA.
  - XSMN khi target là “đuôi xuất hiện ít nhất một lần trong kỳ” với `r` giải đuôi và giả định mỗi đuôi đều độc lập, đồng đều: `1 - (1 - 1/100)^r`; với `r=18` xấp xỉ `0.1655`. Khi target là số lần xuất hiện, kỳ vọng là `r/100 = 0.18`. **Không trộn hai target này.**
- EMA chạy theo thứ tự thời gian cũ → mới. Với mỗi draw `t`, tạo `x[t,n]` là 1/0 theo đúng định nghĩa target, rồi `ema[t,n] = alpha*x[t,n] + (1-alpha)*ema[t-1,n]`.
- `alpha` phải nằm trong `(0,1]`, được cấu hình rõ; không tune trên test set. Ưu tiên `alpha` theo config cố định hoặc chọn bằng validation window bên trong từng training fold.
- Nếu trộn EMA với prior, công thức/trọng số phải nêu trong `algorithm-contracts.md`; output là `score` nếu chưa calibrate thành xác suất.
- `parseDayOfWeek()` phải xác thực ngày trước khi tính thứ; từ chối ngày không tồn tại thay vì để Date chuẩn hóa sang ngày khác.

Mẫu pseudo-code:

```js
function computeEma(valuesOldestToNewest, alpha, initialPrior) {
  if (!(alpha > 0 && alpha <= 1)) throw new RangeError('alpha must be in (0, 1]');
  let ema = initialPrior;
  for (const value of valuesOldestToNewest) {
    if (value !== 0 && value !== 1) throw new TypeError('EMA input must be binary');
    ema = alpha * value + (1 - alpha) * ema;
  }
  return ema;
}
```

**Tests bắt buộc**

- Cùng history/config nhưng `topN=6` và `topN=12`: raw score của mọi candidate phải giống hệt nhau; chỉ độ dài output khác.
- Với `alpha=0.5`, prior 0, values `[1,0]`, EMA cuối phải là `0.25`.
- Input ngày `2026-02-30` bị từ chối.
- History đảo thứ tự phải khác output so với chronological order; hàm chính phải chuẩn hóa đúng hoặc từ chối dữ liệu không theo thứ tự, không âm thầm học ngược thời gian.

### FIX10-04 — Ensemble chấp nhận score không đầy đủ và giả định điểm thiếu = 0 (P0)

Trong `js/algorithms/ensemble.js`, điều kiện chỉ cần ít nhất 80% candidate score là hợp lệ; các candidate còn thiếu có thể bị cho điểm 0 hoặc xếp cuối giả tạo.

**Cách sửa bắt buộc**

- Mỗi model khả dụng phải trả score hữu hạn cho **toàn bộ universe** của game, hoặc đánh dấu `unavailable` và không tham gia fold đó.
- Tuyệt đối không thay candidate score thiếu bằng 0, trung bình hoặc giá trị giả.
- Validate `Number.isFinite(score)` và candidate IDs đầy đủ, không trùng.
- Chuẩn hóa mỗi model trên toàn bộ universe bằng một transform được tài liệu hóa và được áp dụng giống nhau ở mọi fold (ví dụ rank percentile). Không dùng `topN` để tính normalization.
- Trọng số model: dùng hiệu suất out-of-fold chỉ từ dữ liệu quá khứ của fold hiện tại; nếu chưa đủ validation data, dùng trọng số đều giữa các model hợp lệ và ghi rõ `weightMethod: 'equal_fallback'`. Không dùng trọng số tùy ý để tạo ấn tượng chính xác.
- Nếu một model thất bại thì loại **toàn model** khỏi fold, ghi `excludedModels` và reason; sau đó chuẩn hóa lại tổng trọng số của các model còn lại. Nếu không còn model hợp lệ → `unavailable`, không bịa output.
- Hiển thị riêng `ensembleScore`, `modelAgreement` và calibrated probability (chỉ khi thực sự có calibration ngoài mẫu). Không gọi các score này là “xác suất trúng”.

Mẫu pseudo-code:

```js
function validateModelScores(result, universe) {
  if (!result || result.status !== 'ok' || !Array.isArray(result.scores)) return false;
  const map = new Map(result.scores.map(x => [String(x.number), x.score]));
  if (map.size !== universe.length) return false; // catches duplicate/missing IDs
  return universe.every(n => map.has(String(n)) && Number.isFinite(map.get(String(n))));
}

function weightedEnsemble(modelMaps, weights, universe) {
  const eligible = modelMaps.filter(m => validateModelScores(m.result, universe));
  if (eligible.length === 0) return { status: 'unavailable', predictions: [] };
  const totalWeight = eligible.reduce((s, m) => s + Math.max(0, weights[m.name] ?? 0), 0);
  const useEqualWeights = totalWeight <= 0;
  const denom = useEqualWeights ? eligible.length : totalWeight;
  const scores = universe.map(number => ({
    number,
    score: eligible.reduce((sum, model) => {
      const w = useEqualWeights ? 1 : Math.max(0, weights[model.name] ?? 0);
      return sum + w * model.normalizedScoreByNumber.get(number);
    }, 0) / denom,
  }));
  return { status: 'ok', scores, diagnostics: { excludedModels: modelMaps.filter(m => !eligible.includes(m)).map(m => m.name), weightMethod: useEqualWeights ? 'equal_fallback' : 'out_of_fold' } };
}
```

Đây là mẫu logic; coding agent phải khớp schema thực tế, đảm bảo `normalizedScoreByNumber` được tạo đúng và trọng số chỉ đến từ validation quá khứ.

**Tests**

- Model có 36/45 scores → loại toàn model, không tự điền 9 score còn thiếu.
- Model có score `NaN`, `Infinity`, ID duplicate → loại và ghi reason.
- Không model hợp lệ → `unavailable`.
- Cùng input và config → output deterministic (trừ phần Monte Carlo có seed được khai báo).
- Thay `topN` không đổi raw/normalized score của candidate.

### FIX10-05 — Frequency Gap: số chưa xuất hiện nhận điểm tối ưu giả (P1)

Không dùng `avgGap = history.length` khi số xuất hiện 0 hoặc 1 lần rồi biến `currentGap / avgGap` thành điểm tối ưu. Trung bình chu kỳ không xác định nếu số lần xuất hiện không đủ.

**Cách sửa**

- Tính `occurrenceIndices` từ history oldest→newest.
- Chỉ tính inter-arrival gap nếu có ít nhất hai lần xuất hiện.
- Nếu ít hơn hai lần, trả diagnostics `gapStatus: 'insufficient-occurrences'`; không tự gán chu kỳ trung bình giả.
- Tách các thành phần `frequencyScore` và `gapDescriptiveScore`; score cuối phải có công thức rõ, không gọi `overdue` là xác suất trúng hay “sắp đến lượt”.
- So sánh với null model trong backtest; không mặc định một số “gan” lâu sẽ có xác suất kỳ tiếp theo cao hơn.

Tests: số xuất hiện 0 lần, 1 lần, 2 lần cách xa nhau; expected output được tính tay; không số nào được nhận `score=90` chỉ vì chưa từng xuất hiện.

### FIX10-06 — Association Rules: chiều thời gian và định nghĩa metric (P1)

History phải có chiều thời gian được xác định bằng schema. Mọi transition phải đi từ kỳ cũ đến kỳ mới. Nếu nguồn/API trả mới→cũ, phải chuẩn hóa một lần tại data boundary hoặc từ chối; không để từng thuật toán tự giả định chiều.

**Định nghĩa bắt buộc**

Với `T` transition giữa các kỳ liên tiếp, `A_t` là sự kiện antecedent tại kỳ `t`, `B_(t+1)` là sự kiện consequent của kỳ kế tiếp:

- `support(A→B) = count(A_t ∧ B_(t+1)) / T`
- `confidence(A→B) = count(A_t ∧ B_(t+1)) / count(A_t)` nếu mẫu số > 0
- `lift(A→B) = confidence(A→B) / support(B_(t+1))` nếu support consequent > 0

Ghi rõ “presence event” hay “occurrence count”. Với XSMN, một đuôi có thể xuất hiện nhiều lần trong cùng kỳ; nếu model chỉ dùng Set thì metrics là xác suất “có xuất hiện ít nhất một lần”, không phải số lần xuất hiện.

**Tests**: tạo fixture 4–6 kỳ có transition tính tay; đảo thứ tự lịch sử phải phát hiện/chuẩn hóa; không dùng target/future draw để tạo transition. Nếu antecedent không xuất hiện, confidence phải `null`/unavailable, không trả 0 giả.

### FIX10-07 — Poisson: không gọi biến đổi heuristic là xác suất đã hiệu chuẩn (P1)

Đối với Vietlott, một bóng có mặt tối đa một lần trong mỗi kỳ và xác suất biên lý thuyết theo cơ chế rút `K` bóng từ `N` bóng là `K/N`. Số lần xuất hiện của một bóng qua `D` kỳ theo null model có phân phối Binomial(`D`, `K/N`), không phải Poisson chính xác.

Đối với XSMN, cần xác định target:

- event “đuôi xuất hiện ít nhất một lần trong `r` đuôi”: theo giả định uniform độc lập, baseline là `1 - (1 - 1/100)^r`;
- occurrence count: kỳ vọng `r/100` mỗi kỳ và có thể dùng Poisson như xấp xỉ chỉ khi ghi rõ giả định/giới hạn.

**Cách sửa**

- Nếu module hiện dùng `1 - exp(-lambda)` cho mọi game, đổi tên/định nghĩa thành approximate count-rate score hoặc dùng công thức chính xác phù hợp target.
- Nếu output là `score`, schema và UI phải ghi score; chỉ gọi `probability` khi hiệu chuẩn bằng dữ liệu ngoài mẫu và đánh giá bằng Brier/log loss/reliability diagram.
- Không dùng historical frequency làm xác suất tương lai có lợi thế khi chưa vượt baseline out-of-sample.

Tests: expected values tính tay cho Mega, Power và XSMN; mỗi test kiểm tra cả tên field/semantics chứ không chỉ số nằm trong `[0,1]`.

### FIX10-08 — Monte Carlo: chỉ ghi nhận simulation hoàn chỉnh và tính đúng độ biến động (P1)

- Vietlott: mỗi replicate lấy đúng `K` số duy nhất từ `N` số.
- XSMN: nếu mô phỏng `r` đuôi giải thì lấy `r` mẫu từ 00–99 **có hoàn lại**, cho phép đuôi lặp lại trong cùng kỳ.
- Nếu replicate không hoàn tất đủ số sự kiện, đánh dấu simulation failed và không tăng `completedReplicates`.
- `completedReplicates` phải đúng bằng số replicate hợp lệ; yêu cầu zero incomplete simulation để model status `ok`.
- Thống kê từng candidate từ replicate: Vietlott dùng indicator mỗi replicate candidate được chọn; XSMN phải tách indicator “xuất hiện ít nhất một lần” và occurrence count.
- SD phải được tính trên metric per-replicate phù hợp, không tính SD của tổng tích lũy rồi coi là độ biến động giữa replicate.
- Seeded RNG phải truyền vào mọi nguồn ngẫu nhiên; không dùng `Math.random()` ẩn ở nhánh khác nếu test yêu cầu deterministic.

Tests: với seed cố định, cùng input cho output giống nhau; mọi replicate Vietlott có đúng 6 số duy nhất; XSMN đủ `r` đuôi và cho phép trùng; cố tình làm một replicate incomplete phải khiến model fail hoặc loại replicate theo policy đã công bố; không báo “95% confidence interval” nếu chưa tính interval hợp lệ.

### FIX10-09 — Markov: transition đúng chiều, làm rõ xác suất và smoothing (P1)

- Xác định event `X[t,n]` là presence/absence của candidate `n` trong kỳ `t`.
- Xây transition từ `t` sang `t+1` theo thứ tự oldest→newest; tuyệt đối không đảo chiều.
- Với trạng thái nhị phân, tính counts `N_ab` cho `X_t=a`, `X_(t+1)=b`; xác suất chuyển với smoothing Beta/Laplace phải ghi rõ tham số và công thức. Ví dụ `P(X_{t+1}=1|X_t=1) = (N_11 + alpha * p0) / (N_10 + N_11 + alpha)` với `p0` là prior đã định nghĩa.
- Với đa nhãn, nếu tính quan hệ số `i` ở kỳ `t` với số `j` ở kỳ `t+1`, định nghĩa rõ `coOccurrence(i_t,j_(t+1))`; không gọi score đa nhãn đó là xác suất thuần nếu chưa chuẩn hóa mẫu số.
- Minimum transitions phải là config cụ thể; mẫu quá ít → `insufficient-data`, không tạo xác suất giả.
- `order 2` chỉ được gọi bậc hai nếu thực sự dùng trạng thái hai kỳ quá khứ `(X_(t-1), X_t)` để dự đoán `X_(t+1)`; nếu không, rename đúng phương pháp.

Tests: fixture nhỏ tính tay đầy đủ `N00/N01/N10/N11`, expected transition probabilities; đảo thứ tự làm test thất bại hoặc được chuẩn hóa ở boundary; thêm draw tương lai vào dataset không được đổi dự đoán của fold quá khứ.

### FIX10-10 — “Clustering” chưa phải K-Means / Structure heuristic gây bias (P1)

Không giữ nhãn K-Means nếu code chỉ chấm chẵn/lẻ, cao/thấp, khoảng cách tới trung bình và tần suất.

Chọn đúng một phương án và thực hiện:

**Phương án A (khuyến nghị, rủi ro thấp):** đổi tên thành `Structure Heuristic`, bỏ khỏi Ensemble mặc định cho tới khi có bằng chứng out-of-sample; chỉ dùng để mô tả đặc trưng **của cả bộ số/ticket** (sum, parity count, range, dispersion), không ưu tiên từng candidate chỉ vì nó gần trung bình. Đặt `contributesToEnsemble: false` mặc định.

**Phương án B:** triển khai K-Means thực sự trên feature vector được xác định trước; chuẩn hóa features bằng tham số chỉ fit trên training fold; cố định seed/initialization; xác định `k`, khoảng cách, stop criteria và xử lý empty cluster. Không được diễn giải membership cluster thành xác suất trúng nếu chưa hiệu chuẩn.

Tests phải chứng minh implementation khớp fixture K-Means tính tay nếu chọn B; nếu chọn A phải test rằng model không tham gia Ensemble mặc định và UI/contract đổi tên nhất quán.

### FIX10-11 — Ensemble và leaderboard (P1)

- Tách `rawScore`, `normalizedScore`, `rank`, `modelAgreement`, `calibratedProbability` (field cuối chỉ có khi đã calibrate). Không ghi tất cả vào một `confidence` chung.
- Ensemble chỉ dùng model score đầy đủ cho toàn bộ universe, hoặc loại toàn model trong fold. Không gán điểm 0 giả cho candidate missing.
- Candidate score normalization phải dùng toàn bộ universe và được tính trong training fold; không phụ thuộc `topN`.
- Trọng số: chỉ fit từ inner validation / OOF của training data; không sử dụng outer test target. Nếu không đủ lịch sử để fit weights, dùng equal weights và ghi rõ.
- Leaderboard phải xếp theo metric công bố (ví dụ mean hit rate), cùng folds, cùng target count và cùng game/đài; không dùng compositeScore tùy ý. Nêu `sampleSize`, khoảng bất định và baseline.
- Khi các model tương đồng hiệu suất trong sai số thống kê, không phóng đại ý nghĩa của Top 1; UI nên ghi “đứng đầu theo metric ở phạm vi kiểm định này”.

Tests: model thiếu score bị loại; trọng số được renormalize đúng; `topN` không đổi scores; không dùng target fold để chọn weight; leaderboard order khớp phép sort independent; mọi dòng có sample size/method.

### FIX10-12 — XSMN: tách event presence khỏi occurrence count

Đối với mỗi đài và mỗi ngày quay:

- Lưu giải gốc và số lượng phần tử theo schema nguồn.
- Sinh các chuỗi đuôi hai chữ số từ từng kết quả giải bằng một hàm duy nhất có test.
- Giữ cả `lottoPairsWithMultiplicity` (mảng có trùng, giữ số lần xuất hiện) và `lottoPairsUnique`/`eventSet` (tập số khác nhau), hoặc dùng schema tương đương được tài liệu hóa.
- Mọi thuật toán phải khai báo nó dùng event presence hay count. Không chuyển `Set` rồi vẫn báo metric occurrence count.
- Không gộp các đài trong lịch sử khi tính transition/frequency nếu model được huấn luyện cho một đài cụ thể.

Tests: fixture có đuôi lặp 2–3 lần trong 18 giải; unique event count và raw occurrence count phải khác nhau đúng như expected value; test không được “dedupe” mất dữ liệu gốc.

---

## 2. Input/output contract chung bắt buộc

Mọi model phải dùng một contract chung. Tên trường có thể được ánh xạ theo code hiện tại nhưng semantics không được đổi ngầm.

```ts
export type ModelStatus =
  | 'ok'
  | 'insufficient-data'
  | 'invalid-input'
  | 'unavailable';

export interface CandidateScore {
  number: number | string; // canonical candidate ID
  rawScore: number;
  normalizedScore: number;
  rank: number;
}

export interface ModelResult {
  modelId: string;
  status: ModelStatus;
  predictions: CandidateScore[];
  diagnostics: {
    sampleSize?: number;
    targetDrawDate?: string;
    trainingStart?: string;
    trainingEnd?: string;
    excludedReason?: string;
    scoreSemantics?: 'heuristic-score' | 'rate-estimate' | 'calibrated-probability';
  };
  errors: Array<{ code: string; field?: string; recordId?: string; message: string }>;
}
```

Quy tắc:

- `ok`: input hợp lệ, đã dùng đủ dữ liệu theo contract, score hữu hạn và coverage đầy đủ.
- `insufficient-data`: input schema hợp lệ nhưng số kỳ không đủ cho model.
- `invalid-input`: schema/giá trị sai; không âm thầm bỏ record lỗi.
- `unavailable`: model không thể tạo kết quả theo contract (ví dụ không đủ features/cấu hình).
- Không trả dự đoán trong trạng thái không phải `ok`.
- Score cần có semantics, không được mang tên xác suất nếu chưa calibrate.

---

## 3. Backtest walk-forward phải triển khai đúng

Đối với mỗi target draw `T`:

1. Chỉ lấy history có thời gian nhỏ hơn `T.date`.
2. Kiểm tra `drawId`/date trùng; sort canonical oldest→newest.
3. Fit mọi tham số cần học (normalization, weights, feature scaler) chỉ bằng training history/inner validation trước `T`.
4. Chạy tất cả model trên cùng fold và cùng candidate count.
5. Tính hit metric từ prediction và outcome của `T` sau khi prediction đã được tạo/freeze.
6. Chạy baseline random nhiều replicate trên cùng target fold, cùng số ứng viên và cùng luật game.
7. Ghi per-fold rows, không chỉ tổng số cuối.
8. Báo cáo sample size, mean, median (nếu hữu ích), dispersion, khoảng tin cậy và baseline. Dùng paired bootstrap/permutation trên chênh lệch per-fold nếu muốn kết luận lợi thế; ghi rõ phương pháp và seed.
9. Không dùng cùng test folds để tune model rồi báo thành tích trên chính folds đó.

Pseudocode:

```js
for (const targetDraw of chronologicalDraws.slice(minTrainSize)) {
  const train = chronologicalDraws.filter(d => d.date < targetDraw.date);
  assert(train.every(d => d.date < targetDraw.date));

  const modelConfigs = fitInsideTrainingOnly(train);
  const predictionSnapshot = runModels(train, targetDraw.date, modelConfigs);
  freezePredictionSnapshot(predictionSnapshot);

  const outcome = getOutcomeFromVerifiedHistory(targetDraw);
  const scored = scorePrediction(predictionSnapshot, outcome);
  const randomReplicates = runSeededRandomBaseline({
    train, targetDraw, candidateCount: predictionSnapshot.candidateCount,
    replicates: configuredReplicates,
  });
  saveFold({ targetDrawId: targetDraw.drawId, trainCount: train.length, scored, randomReplicates });
}
```

`getOutcomeFromVerifiedHistory(targetDraw)` chỉ được dùng để chấm sau khi prediction đã freeze; outcome không được truyền vào `runModels()` hoặc quá trình chọn tham số.

---

## 4. Expected-value test bắt buộc cho từng model

Mỗi model phải có ít nhất:

1. **Happy-path fixture** nhỏ, viết tường minh và không được sinh bằng chính function đang test.
2. **Expected score tính tay** cho tối thiểu 3 candidates.
3. **Input invalid**: schema sai, số lẻ, chuỗi số có ký tự, bóng trùng, ngày không tồn tại.
4. **Insufficient history**: model không được tạo output giả.
5. **Chronology test**: hướng transition từ quá khứ tới tương lai.
6. **No-lookahead test**: thêm sentinel ở kỳ tương lai không làm thay đổi prediction cho target trước sentinel.
7. **Determinism test**: cùng config/seed → cùng output.
8. **Property tests**: output scores finite, candidate coverage đúng, ranking tie-break deterministic.
9. **Regression test** cho từng bug đã phát hiện ở FIX-10-01 đến FIX-10-12.

Không đủ điều kiện đóng model nếu chỉ có test “returned 6 numbers”, “score is between 0 and 1” hoặc “does not throw”.

---

## 5. Gate Runner phải thật sự fail-closed

Runner chỉ được đánh dấu gate PASS nếu đồng thời:

- process đã thực thi thật;
- exit code bằng 0;
- kết quả JSON được parse và `success === true`;
- `failed === 0`, `skipped === 0` đối với các test bắt buộc;
- artifact mong đợi vừa được tạo trong run hiện tại, không dùng lại artifact cũ;
- hash được tính sau khi file đã đóng và không append về sau;
- lỗi/timeout/spawn error đều làm run thất bại.

Mẫu helper tham khảo:

```js
function assertSubtestSuccess(name, result) {
  if (!result || result.success !== true) {
    throw new Error(`${name}: child suite did not report success`);
  }
  if ((result.failed ?? 0) !== 0) {
    throw new Error(`${name}: ${result.failed} failed test(s)`);
  }
  if ((result.skipped ?? 0) !== 0) {
    throw new Error(`${name}: required tests were skipped`);
  }
  if (result.exitCode !== undefined && result.exitCode !== 0) {
    throw new Error(`${name}: exitCode=${result.exitCode}`);
  }
}
```

Runner test bắt buộc: ép mỗi child gate lần lượt trả `success:false`, thiếu object, throw exception, non-zero exit, timeout và skipped > 0; trong mọi trường hợp pipeline phải dừng tại gate đó, các gate sau là `NOT_RUN`, overall status không phải PASS.

---

## 6. Commands phải chạy sau mỗi nhóm sửa

Đầu tiên kiểm tra scripts thật trong `package.json`, không tự đoán tên command. Nếu các script tồn tại, chạy theo thứ tự phù hợp:

```bash
node test/test-input-normalizer.js
node test/test-algorithm-reference.js
node test/test-gate-runner.js
npm test
npm run test:all
npm run audit:history:strict
npm run verify:artifacts
npm run verify:strict
```

Nếu tên script khác, ghi đúng command tương ứng vào report. Không được ghi PASS nếu command không được thực thi. Lưu log và exit code riêng. Sau khi đã sửa code cuối cùng, chạy toàn bộ `verify:strict` ba lượt độc lập. Một lượt FAIL hoặc BLOCKED thì không công nhận hoàn thành ba lượt.

---

## 7. Issue ledger bắt buộc

Tạo `reports/fix10/issue-ledger.md` với mỗi issue có:

- ID, priority, file/function;
- mô tả nguyên nhân gốc;
- test tái hiện trước sửa + log RED;
- file/commit đã sửa;
- test GREEN + regression test + mutation test;
- command đầy đủ, exit code, runId;
- artifact và SHA-256;
- trạng thái `OPEN`, `FIXED_VERIFIED`, `BLOCKED`.

Không dùng trạng thái `FIXED_VERIFIED` nếu thiếu bất kỳ bằng chứng bắt buộc nào.

Tạo thêm:

- `reports/fix10/verification-report.md`
- `reports/fix10/algorithm-metrics.csv` (per-fold, không chỉ summary)
- `reports/fix10/baseline-comparison.csv`
- `reports/fix10/test-run-manifest.json`

Reports phải được sinh từ dữ liệu/log thực tế; không hard-code counts hoặc trạng thái.

---

## 8. Tiêu chí chấp nhận cuối

- [ ] Strict parser từ chối input bẩn; test `12abc`, `1.5`, `7x` không thể bị biến thành số hợp lệ.
- [ ] History validator chặn record thiếu trường bắt buộc; không còn fallback `[]` khi `winningNumbers` thiếu.
- [ ] `topN` không ảnh hưởng raw/normalized score của EMA hoặc model khác.
- [ ] Frequency Gap không gán chu kỳ trung bình giả cho số xuất hiện dưới hai lần.
- [ ] Markov và Association Rules được kiểm tra bằng fixture có transition tính tay đúng chiều.
- [ ] Poisson output phân biệt score, rate và probability; baseline đúng với target/game.
- [ ] Monte Carlo không ghi nhận replicate thiếu event; SD/interval có định nghĩa đúng.
- [ ] Structure model không được gọi K-Means nếu không triển khai K-Means thực tế; không vào Ensemble mặc định nếu score không có cơ sở candidate-level.
- [ ] Ensemble từ chối model score thiếu/không finite/ID trùng; không điền điểm 0 giả.
- [ ] Backtest walk-forward không leakage; mọi model/baseline dùng cùng folds, cùng số candidates.
- [ ] Leaderboard chỉ xếp theo metric đã công bố, kèm sample size và baseline.
- [ ] `npm run verify:strict` hoàn tất 3 lần độc lập với exit code 0, không skip gate.
- [ ] Không còn issue P0/P1 mở. Thiếu dữ liệu chuẩn hoặc nguồn xác minh thì phải báo `BLOCKED`, không giả vờ PASS.

**Nhắc cuối cho coding agent:** Mục tiêu là code tuân thủ đúng hợp đồng toán học và được đánh giá trung thực, không phải tạo ra dàn số trúng. Không thuật toán nào được quảng cáo là có khả năng dự đoán xổ số chính xác 100% chỉ từ việc vượt unit test hoặc backtest nội bộ.
