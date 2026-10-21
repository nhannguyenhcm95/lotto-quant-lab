# FIX-4 — Đồng bộ giao diện, sửa lỗi dữ liệu hiển thị và nghiệm thu lại toàn bộ thuật toán

> **Mục tiêu:** thực thi trực tiếp trên source code LOTTO-QUANT LAB để xử lý lỗi nhìn thấy trong giao diện bản `xo-so(5).rar`, đồng thời đóng các lỗi về nguồn dữ liệu, backtest và thuật toán còn tồn tại từ `fix-1.md`, `fix-2.md`, `fix-3.md`. Đây là yêu cầu triển khai và kiểm định, không phải yêu cầu viết thêm báo cáo đơn thuần.
>
> **Quy tắc hoàn thành:** chỉ báo `PASS` khi có test tái hiện lỗi trước sửa, test sau sửa, log và bằng chứng kết quả. Không đạt bất kỳ cổng P0 nào thì phải tiếp tục sửa; nếu thiếu nguồn không thể xác minh sau khi đã thử các nguồn hợp lý, báo `BLOCKED` kèm bằng chứng, không bịa dữ liệu và không tuyên bố hoàn thành 100%.

---

## 0. Bắt buộc đọc, sao lưu và xác nhận hiện trạng

1. Đọc `fix-1.md`, `fix-2.md`, `fix-3.md`, `README.md`, `package.json`, toàn bộ báo cáo kiểm định, `data/history-scope.json`, `data/historical-seed.json`, audit report, scripts crawler/parser, các module `js/algorithms/*`, `js/backtest-engine.js`, `js/data-service.js`, `js/ui-controller.js`, `js/app.js`, stylesheet, HTML và toàn bộ test hiện có.
2. Không giả định đường dẫn/contract vẫn y nguyên: tìm nơi định nghĩa thật của dữ liệu dự đoán, KPI, cặp số, leaderboard và chart trong source hiện tại trước khi sửa.
3. Ghi lại trạng thái đầu vào: `git status` nếu có Git, hash seed, số bản ghi theo loại xổ số, output từng lệnh test hiện hữu, lỗi console/network và screenshot 5 khu vực: kết quả, dự đoán, dashboard, backtest, leaderboard.
4. Sao lưu seed và báo cáo audit hiện có trước khi chạy script có thể ghi file. Fixture test phải dùng thư mục tạm và tuyệt đối không ghi đè seed/báo cáo chính thức.
5. Đọc và xử lý các blocker còn mở từ FIX-1 đến FIX-3; không được chỉ làm các lỗi mới trên ảnh rồi bỏ lại lỗi audit/nguồn/E2E đã biết.
6. Không thay đổi dữ liệu lịch sử để làm test xanh, không giảm phạm vi kiểm định, không xóa test thất bại, không chuyển assertion thành warning, không dùng `|| true`, không nuốt exception rồi trả exit code 0.
7. Không tuyên bố khả năng dự đoán xổ số tương lai đúng 100%. Mục tiêu 100% áp dụng cho dữ liệu lịch sử **trong phạm vi đã công bố và được đối chiếu nguồn**; kết quả mô hình tương lai phải được mô tả như ước lượng thống kê, không phải bảo đảm trúng.

# 1. P0 — Một nguồn dữ liệu dự đoán duy nhất cho các vùng UI

## Lỗi nhìn thấy

Trong cùng một màn hình Mega 6/45 ngày `2026-10-18`, thẻ đề xuất phía trên hiển thị `27, 15, 16, 20, 06, 36`, nhưng thẻ Ensemble phía dưới hiển thị `27, 15, 16, 20, 12, 36`. Hai khu vực cùng được trình bày như đề xuất tối ưu của cùng kỳ nhưng khác số `06`/`12`.

## Bắt buộc sửa

1. Truy tìm nguồn tạo dữ liệu cho hero suggestion, Ensemble card, chart phân phối và từng thẻ thuật toán. Xác định khác biệt do tính toán hai lần, state bị cũ, nhầm game/ngày, thứ tự cập nhật bất đồng bộ hay chủ đích hiển thị hai loại kết quả.
2. Tạo một **canonical prediction result** cho mỗi bộ khóa tối thiểu: `gameType`, `targetDrawDate`, `trainedThroughDate`, `modelVersion`/`configHash`, `predictionRunId`. Tất cả thành phần hiển thị cùng loại đề xuất phải render từ đúng object này, không tự gọi thuật toán riêng.
3. Hero và Ensemble card phải khớp chính xác danh sách số, ngày kỳ quay, game, trạng thái dữ liệu và model/run ID. Không hard-code một danh sách số ở UI.
4. Nếu hero cố ý là “khuyến nghị tổng hợp” còn thẻ Ensemble là một model riêng với kết quả khác, phải đổi nhãn rõ ràng (ví dụ “Khuyến nghị tổng hợp” và “Kết quả riêng của Ensemble”), giải thích tiêu chí chọn và không trình bày như cùng một dàn số. Mặc định, nếu cả hai cùng diễn giải là kết quả tối ưu của Ensemble thì bắt buộc phải giống nhau.
5. Chuẩn hóa số theo contract của game: Vietlott phải đúng số lượng số chính và không trùng; giữ nguyên danh sách `numbers` đã canonical hóa, không tạo danh sách độc lập ở từng component. Nếu sắp xếp số tăng dần là quy tắc hiển thị, áp dụng một lần ở lớp kết quả, không sắp xếp khác nhau ở component.
6. Khi người dùng đổi Mega/Power/XSMN, đổi ngày, cập nhật dữ liệu hoặc chạy lại dự đoán, xóa/invalid cache của các phần liên quan theo cùng một key. Không cho kết quả cũ xuất hiện tạm thời như kết quả mới; trong lúc chạy hiển thị loading/skeleton và giữ metadata đúng.
7. Hiển thị riêng `trainedThroughDate` và `targetDrawDate`. Không dùng ngày hệ thống hiện tại để giả làm ngày đã được mô hình học đến.

## Test bắt buộc

- Tạo test regression từ chính ca lỗi trên: hero `06` nhưng Ensemble `12` phải FAIL trước sửa; sau sửa tất cả vùng được quy định là cùng dự đoán phải cùng mảng số.
- Chạy test với Mega, Power và XSMN; đổi game liên tục 20 lần bằng event/UI và đảm bảo không lẫn state.
- Chạy `refresh`, thay dataset, thay ngày mục tiêu và chạy lại prediction; không hiển thị prediction run cũ.
- Assert ngày/game/run ID khớp giữa hero, Ensemble card, chart và JSON kết quả.
- Cấm test chỉ so sánh số lượng phần tử hoặc kiểm tra element tồn tại; phải so sánh **giá trị thực của từng số và metadata**.

# 2. P0 — Loại bỏ `undefined`, `NaN`, điểm/phần trăm giả và dữ liệu presentation sai

## Lỗi nhìn thấy

Trong Dashboard mục “Cặp Đôi Bạc Nhớ Hay Đi Kèm Nhau” xuất hiện chuỗi `undefined lần về cùng nhau`. Đây là lỗi binding/schema; không được che bằng CSS hoặc thay chuỗi sau khi render.

## Bắt buộc sửa

1. Tìm toàn repository các trường hợp đọc property không tồn tại và mẫu hiển thị động như `undefined`, `null`, `NaN`, `Infinity`, `[object Object]`; chú ý dữ liệu pair/co-occurrence, KPI, leaderboard, chart tooltip, backtest và các phần mô tả thuật toán.
2. Chốt schema thống nhất cho cặp số. Phân biệt ít nhất:
   - `pair`: hai số/cặp;
   - `coOccurrenceCount`: số kỳ mà cặp cùng xuất hiện theo đúng định nghĩa;
   - `totalEligibleDraws`: tổng kỳ hợp lệ đã kiểm tra;
   - `support`, `confidence`, `lift` nếu có, mỗi chỉ số phải có công thức và mẫu số;
   - `sourceWindow`/khoảng ngày, `gameType`, trạng thái dữ liệu.
3. Sửa producer tính dữ liệu và consumer hiển thị để sử dụng đúng tên field, không dùng field fallback giả kiểu `count || 999` hoặc `undefined` bị thay bằng số 0 không có căn cứ.
4. Nếu không đủ dữ liệu để tính, hiển thị “Chưa đủ dữ liệu”/“Không có kết quả trong phạm vi này”; không dùng con số bịa để lấp chỗ trống. Nếu giá trị 0 là số liệu thật, phân biệt rõ `0` với `missing`.
5. Không khẳng định một cặp “gắn kết 5.37x” hoặc xác suất tăng nếu chưa tính đúng định nghĩa Lift so với baseline cùng phân phối. Công bố công thức, mẫu số và số kỳ kiểm định; nếu mẫu quá nhỏ hoặc không thể ước lượng thì ẩn kết luận hoặc ghi “chưa đủ mẫu”.
6. Thêm guard ở lớp schema/API và kiểm tra cuối trước render. Guard phải báo lỗi test nếu trường bắt buộc thiếu; không âm thầm stringify giá trị không hợp lệ.

## Test bắt buộc

- Fixture có field đúng, field thiếu, field sai tên, giá trị 0, giá trị `null`, `NaN`, số âm và mẫu số bằng 0.
- Assert toàn bộ DOM của 5 màn hình không chứa literal `undefined`, `NaN`, `Infinity` hoặc `[object Object]` trong nội dung hiển thị.
- Với cặp số, tự tính lại `coOccurrenceCount` từ fixture lịch sử nhỏ có expected output biết trước và so sánh từng cặp.
- Khi dữ liệu thiếu, UI phải hiển thị trạng thái thiếu dữ liệu đúng; không được giả định số lần xuất hiện.

# 3. P1 — Sửa bố cục biểu đồ và tương thích responsive

## Lỗi nhìn thấy

Trong Dashboard, legend của biểu đồ vành khuyên bị sát/chồng lên thanh ghi chú dưới biểu đồ. Có nguy cơ chồng lấn hoặc khó đọc ở viewport thấp hơn.

## Bắt buộc sửa

1. Điều chỉnh bố cục chart, legend và note thành các vùng layout riêng; dùng grid/flex đúng với cấu trúc trang, không canh vị trí bằng offset cố định chỉ đúng trong một screenshot.
2. Bảo đảm vùng chart có chiều cao tối thiểu đủ để hiển thị ticks, legend và tooltip; nếu thư viện chart cần `ResizeObserver` hoặc reflow khi resize thì triển khai phù hợp với stack hiện tại.
3. Legend không được đè lên chart labels, tooltip hoặc phần ghi chú. Text dài phải wrap; các legend item có thể xuống hàng trên mobile.
4. Đừng giảm cỡ chữ quá nhỏ để ép mọi thứ vừa một hàng. Giữ độ tương phản, khoảng trống và khả năng đọc.
5. Kiểm tra toàn trang ở desktop `1440x900`, tablet `768x1024`, mobile `390x844` và `360x800`. Xử lý overflow ngang ngoài chủ đích, bảng có thể cuộn trong container nếu cần.
6. Tooltip phải ở trong viewport khi có thể, không che mất dữ liệu cần so sánh, đồng thời không phụ thuộc hover duy nhất nếu cần thao tác cảm ứng.

## Test bắt buộc

- Chạy browser thật ở tất cả viewport và chụp screenshot mới.
- Tự động kiểm tra các bounding box của chart, legend, note: không giao nhau ngoài vùng có chủ đích; các thành phần có chiều rộng/chiều cao lớn hơn 0 và nằm trong viewport/container mong đợi.
- Kiểm tra sau resize, sau đổi tab/game, sau khi dữ liệu tải xong và khi text dài.
- So sánh ảnh trước/sau và rà bằng mắt; screenshot mới phải là từ app đang chạy, không tái sử dụng ảnh cũ trong `test/`.

# 4. P1 — Phân biệt consensus, score, hit rate và xác suất

## Bắt buộc sửa

1. Toàn bộ nhãn `Mức đồng thuận mô hình 38.1%`/`47.6%` phải giải thích rằng đó là tỷ lệ đồng thuận hoặc normalized score giữa các mô hình theo công thức hiện hành; **không phải xác suất bộ số trúng giải**.
2. Kiểm tra đúng công thức tạo score. Nếu đây là tổng điểm đã chuẩn hóa, chọn nhãn “Điểm đồng thuận chuẩn hóa” thay vì “Xác suất hội tụ” hoặc “Xác suất trúng”. Nếu là tỷ lệ model bỏ phiếu thì tử số/mẫu số phải được xác định từ số model thực sự tham gia.
3. Không cộng điểm có thang đo không tương đương trước khi normalize. Mỗi thuật toán thành phần phải cung cấp `scoreDefinition`, `scoreRange`, `normalizationMethod`, số model hợp lệ và trạng thái thiếu dữ liệu.
4. Nếu một model trả `insufficient-data`, model đó không được tính vào mẫu số consensus như thể đã bỏ phiếu; UI phải hiện `modelsUsed/modelsExpected` hoặc tương tự.
5. Không hard-code phần trăm, không gắn “confidence 88.5%” dựa vào số thuật toán đồng ý. Mọi số phải được tính từ prediction result hiện hành.
6. Có tooltip/info text tiếng Việt ngắn: “Mức đồng thuận giữa các mô hình; không phải xác suất trúng xổ số.”
7. Chỉ được gọi là xác suất nếu có mô hình xác suất hợp lệ, được hiệu chuẩn và đánh giá reliability/calibration trên dữ liệu ngoài mẫu. Nếu chưa đáp ứng thì tuyệt đối không đặt tên là probability/confidence.

## Test bắt buộc

- Dùng fixture trong đó 7 model cho kết quả đã biết và một model `insufficient-data`; tính tay expected consensus rồi assert UI/API.
- Thay điểm đầu vào/thêm hoặc bỏ một model phải làm mẫu số và score thay đổi đúng công thức.
- Không được có KPI hoặc tooltip khiến consensus bị diễn giải như xác suất trúng.

# 5. P1 — Tách rõ kiểm định một kỳ và bảng xếp hạng nhiều kỳ

## Vấn đề

Trong màn hình, bảng đối soát một kỳ có thể có Markov hoặc một model khác đứng đầu, trong khi bảng xếp hạng 20 kỳ lại có model khác ở Top 1. Điều này không tự động là lỗi, vì hai metric và phạm vi có thể khác nhau, nhưng UI hiện có nguy cơ làm người dùng hiểu chúng là cùng một kết luận.

## Bắt buộc sửa

1. Phân tách và đặt tên đúng cho 2 kết quả:
   - **Đối soát một kỳ:** kết quả mô hình so với kết quả thực tế của đúng một kỳ đã quay; không được dùng dữ liệu kỳ đó khi sinh dự đoán cho chính kỳ đó.
   - **Leaderboard ngoài mẫu:** thống kê walk-forward trên một dải kỳ, cùng metric, cùng số lượng số dự đoán và cùng danh sách target draws giữa tất cả model.
2. Không dùng “Top 1” không có phạm vi. Ghi “Top 1 trong backtest N kỳ theo [metric]” cùng khoảng ngày, game, số model được đánh giá, số fold hợp lệ và baseline.
3. Một kết quả một kỳ không được ghi đè/đổi tên Top 1 của leaderboard. Thẻ Dashboard, bảng xếp hạng và export phải nhận đúng `rankingRunId`/scope metadata.
4. Không so trực tiếp tỷ lệ của XSMN với Vietlott hoặc so hit rate của số chính với lô tô hai chữ số trong cùng bảng xếp hạng.
5. Nếu model hòa metric, dùng tie-breaker cố định đã công bố (ví dụ số mẫu hợp lệ trước, rồi tên model theo thứ tự ổn định) và thể hiện đồng hạng nếu phù hợp; không tạo chênh lệch giả để ép một Top 1 duy nhất.
6. Nếu sample size chưa đạt ngưỡng tối thiểu được cấu hình, hiển thị “Chưa đủ dữ liệu để xếp hạng” hoặc “Xếp hạng mô tả — mẫu nhỏ”, không đưa ra khẳng định lợi thế thống kê.
7. Hiệu suất “33.3%” của một kỳ/ngày phải có định nghĩa mẫu số cụ thể. Nếu 2/6 số chính khớp thì đó là 2/6 số được dự đoán, không được gắn nhãn gây hiểu lầm là xác suất trúng giải.

## Test bắt buộc

- Fixture có hai mô hình: Model A tốt nhất ở một kỳ, Model B tốt nhất ở trung bình 20 kỳ. Assert cả hai khu vực hiển thị đúng scope và không ghi đè lẫn nhau.
- Assert từng row leaderboard được sắp giảm dần theo `primaryMetric` thực tế; Top 1 phải chính là row đầu sau sort.
- Assert metadata phạm vi, sample size, date range, game, metric và baseline đồng nhất giữa summary và bảng.
- Thử đổi game, số kỳ kiểm định, filter và chạy lại; ranking phải được tính mới, không giữ badge/kết quả cũ.

# 6. P1 — Kiểm tra con số “299 kỳ huấn luyện” và minh bạch cửa sổ lịch sử

## Vấn đề

Ảnh Backtest ghi 299 kỳ huấn luyện trong khi seed Mega có 1.576 kỳ. Đây có thể là giới hạn warm-up/window hợp lệ nhưng phải chứng minh bằng cấu hình và source code, không được đoán.

## Bắt buộc sửa

1. Truy tìm chính xác nơi tính `trainingDataCount`, window size, minimum-history và cách lọc `targetDate`. Báo cáo vì sao ra 299; xác định đây là giới hạn chủ đích hay bug do chỉ dùng một phần dữ liệu.
2. Nếu model chủ đích dùng rolling window 299 kỳ, hiển thị rõ “299 kỳ gần nhất theo cấu hình rolling window” và cấu hình `windowSize=299`; không mô tả là toàn bộ lịch sử.
3. Nếu mục tiêu là toàn bộ lịch sử trước ngày mục tiêu, điều chỉnh engine dùng tất cả bản ghi verified hợp lệ trước target date, trừ minimum warm-up có lý do rõ ràng.
4. Với mỗi fold, ghi `historyAvailableCount`, `verifiedTrainingCount`, `excludedCountByReason`, `windowPolicy`, ngày đầu/cuối train và ngày target. Không được loại bản ghi một cách âm thầm.
5. Đảm bảo model chỉ fit từ `verified` records. Nếu cần dùng dữ liệu chưa xác minh cho exploratory analysis thì phải tách riêng, gắn nhãn và không trộn vào số liệu chính thức.

## Test bắt buộc

- Fixture lịch sử có 1.000 record hợp lệ trước target: assert số record train đúng theo policy (1.000 với expanding window, hoặc đúng window size được cấu hình).
- Tạo record bị loại vì sai/thiếu/unverified và assert report đếm chính xác theo lý do.
- Kiểm tra `max(trainingDate) < targetDate` bằng dữ liệu được truyền thực sự cho model; không chỉ so sánh tổng số dòng.
- Kiểm tra target draw và mọi record tương lai đều không xuất hiện trong features, normalization, model fitting, weight tuning hay baseline calibration.

# 7. P0 — Dữ liệu lịch sử, audit và parser: kế thừa tất cả blocker FIX-1..FIX-3

Không được xem các mục dưới đây đã hoàn thành nếu chưa có artifact test và đối chiếu nguồn trong lần chạy này.

## 7.1 Audit phải tính thật, không hard-code

- Xóa giá trị kiểm toán gán cứng như `requiredFieldSourceMatch: 100`, `inventedOrDefaultedValues: 0`, số kỳ verified, tỷ lệ bao phủ hoặc trạng thái pass.
- `audit-history.js --strict` phải trả exit code khác 0 khi có kỳ/trường bắt buộc thiếu, mismatch hoặc chưa xác minh.
- Metadata/URL có tồn tại không đồng nghĩa với verified. Mỗi trường chỉ đạt verified khi giá trị thực được so với nội dung nguồn/snapshot cụ thể.
- Không dùng cùng seed làm cả input lẫn “nguồn độc lập” để xác nhận nó đúng.

## 7.2 Không tự gán dữ liệu và không ghi đè dữ liệu thật

- Quét tất cả crawler/parser/generator/UI tìm ngày, mã kỳ, Jackpot, tên đài, số bóng và KPI mặc định/hard-code, gồm `Math.random`, seed giả, `|| default`, `?? default` và catch nuốt lỗi.
- Khi thiếu dữ liệu bắt buộc, giữ raw response và tạo repair issue; truy tìm nguồn rồi sửa bằng bằng chứng. Không tự gán ngày/mã kỳ/Jackpot/đài/số trúng.
- Công cụ tạo fixture/mock chỉ hoạt động trong test sandbox, không được ghi vào seed production. Seed production chỉ cập nhật khi backup, diff và strict audit đều pass; cập nhật bằng atomic write.
- Nếu nguồn không thể xác minh sau khi thử nguồn thay thế hợp lý, ghi `BLOCKED` theo record/field, tuyệt đối không báo verified.

## 7.3 Đóng cổng chất lượng lịch sử

PASS chỉ khi trong phạm vi công bố:
- 100% kỳ dự kiến được đối chiếu nguồn hoặc đã có ngoại lệ được giải quyết bằng bằng chứng;
- 100% trường bắt buộc khớp nguồn;
- 0 kỳ thiếu/chồng lấn/xung đột chưa giải quyết;
- 0 field bắt buộc chưa xác minh;
- 0 bản ghi production bị tự chế hoặc tự gán default;
- 100% record verified có provenance và bằng chứng truy ngược.

Không được giảm scope, xóa record hoặc đổi mẫu số để đạt mục tiêu. Nếu không thể đạt do nguồn ngoài kiểm soát, toàn bộ cổng lịch sử phải là `BLOCKED`, không phải PASS.

# 8. P1 — Kiểm định lại cả 8 thuật toán và Ensemble

Kiểm tra source code thực tế của các module, không mặc định tên hàm đồng nghĩa với mô hình đã triển khai. Các module từng xuất hiện gồm `association-rules`, `clustering`/`structure`, `ensemble`, `frequency-gap`, `markov`, `monte-carlo`, `moving-average`/EMA và `poisson`; xác nhận tên chính xác trong repository hiện tại.

## 8.1 Bảng hợp đồng bắt buộc cho từng thuật toán

Tạo `reports/algorithm-contracts.md` hoặc tài liệu tương đương. Với từng model, ghi:
- Công thức/thuật toán thật sự triển khai, inputs, outputs và score range.
- Số kỳ tối thiểu, cách xử lý record invalid/unverified, game áp dụng.
- Có randomness hay không; seed/RNG được inject thế nào và cách tái lập.
- Feature nào được tính, cửa sổ thời gian và quy tắc loại trừ target/future draws.
- Điều kiện trả `insufficient-data`.
- Tests xác minh công thức bằng fixture tính tay được.
- Các khác biệt giữa tên UI, tên trong code và thuật toán thực tế; đổi tên UI hoặc sửa implementation để chính xác, không quảng cáo một thuật toán chưa có.

## 8.2 Những kiểm tra thuật toán cụ thể

1. **Markov:** xác minh order thật sự theo cách code dùng trạng thái. Nếu chỉ chuyển trạng thái dựa trên một kỳ trước thì không gọi “Bậc 2”. Xây fixture chuyển trạng thái nhỏ với xác suất kỳ vọng tính tay được.
2. **Poisson:** kiểm tra parameter estimation, miền giá trị, probability mass/normalization và giả định phân phối. Không dùng kỳ vọng liên tục `lambda` như thể đó là xác suất trực tiếp nếu chưa chuyển đổi đúng mô hình.
3. **Monte Carlo:** injection RNG và seed; kiểm tra cùng seed + cùng input + config phải tái lập; sampling Vietlott không lặp số chính, còn mô phỏng cặp lô tô XSMN phải cho phép lặp khi mô hình hóa kết quả hai chữ số cuối. Không tự ghi nhãn `(10k)` nếu số simulation thực tế không phải 10.000.
4. **EMA/Moving Average:** target day phải là lịch quay tiếp theo thực tế của game/đài, không phải ngày lịch kế tiếp. Test Chủ Nhật/thứ Tư/thứ Sáu và các tình huống qua tuần/tháng/năm.
5. **Frequency & Gap:** tính lại frequency/gap bằng fixture nhỏ; không diễn giải “lâu chưa xuất hiện” thành xác suất kỳ tiếp theo cao hơn nếu chưa có bằng chứng thống kê.
6. **Association Rules/Bạc Nhớ:** phân biệt co-occurrence cùng kỳ với chuyển tiếp giữa kỳ; công thức support/confidence/lift phải dùng đúng mẫu số và so với baseline tương ứng. Pair co-occurrence được tạo nhưng không dùng thì không được tuyên bố đã đóng góp vào model.
7. **Clustering/Structure:** nếu hiển thị K-Means thì phải có bước gán cluster, cập nhật centroid và stopping condition thực sự; nếu code chỉ chấm điểm cấu trúc/chẵn-lẻ/cao-thấp thì đổi nhãn cho đúng. Không dùng tên thuật toán để gây hiểu lầm.
8. **Ensemble:** thống nhất semantic của weighted/soft voting. Score từ model khác thang phải được normalize theo cách khai báo và chỉ fit normalization/weights trên training fold. Xác định chính xác model nào tham gia, không tính model thiếu data như phiếu hợp lệ.
9. **Tất cả model:** output không được chứa số ngoài miền, số trùng ở Vietlott, sai độ dài, `NaN`, `Infinity`, `undefined`, score âm/không hữu hạn ngoài contract hoặc confidence được bịa. Lịch sử rỗng/không đủ phải trả `insufficient-data`, không fallback sang random pick.
10. **XSMN và Vietlott:** tách bộ rule validation, sampling, hit calculation và metric; không áp constraint không trùng số của Vietlott vào lô tô XSMN.

## 8.3 Vòng kiểm thử lặp có khả năng phát hiện hồi quy

Tạo một lệnh automation có thể chạy từ thư mục gốc, ví dụ `npm run verify:fix4`, bao gồm:
1. `lint`/syntax/static checks;
2. strict data audit;
3. parser/validator tests;
4. unit tests từng thuật toán;
5. integration/backtest/leakage tests;
6. leaderboard/data-consistency tests;
7. browser E2E;
8. screenshot artifact và final report.

Chạy toàn pipeline tối thiểu **3 lượt liên tiếp** cùng seed, cùng dữ liệu và config. Với kết quả deterministic, hash output phải bằng nhau giữa 3 lượt. Với kết quả Monte Carlo dùng seed rõ ràng, output dự đoán phải tái lập. Không yêu cầu các lần production random seed khác nhau cho ra cùng kết quả; thay vào đó cần đo tính ổn định và ghi seed/variance theo contract.

Trong mỗi lượt test, lưu:
- command, exit code, thời gian chạy, environment/browser version;
- hash dữ liệu và `configHash`;
- các target draw IDs và train/test date range;
- prediction theo từng model/kỳ, actual result, hit counts, metric và baseline;
- danh sách audit mismatch/repair issue;
- browser console/network errors và screenshots;
- lỗi nào được tái hiện, commit/diff sửa chữa tương ứng.

Không cho phép kết quả cũ được tái sử dụng thành kết quả lần chạy mới. Mỗi lượt phải tạo report độc lập, không ghi đè input seed bằng fixture.

# 9. P0 — E2E phải tự khởi động đúng website

Ở bản trước, E2E gọi `localhost:8080` trong khi project chạy ở port khác/không tự khởi động server; do đó `npm run test:all` fail dù unit/integration pass.

Bắt buộc:
1. Xác định đúng lệnh chạy thực tế từ `package.json`/README và chỉ định **một cấu hình base URL** duy nhất cho E2E.
2. E2E phải tự khởi động server trong setup, đợi health check/HTTP 200 và đóng server ở teardown. Không phụ thuộc một server thủ công đang chạy hoặc port tình cờ trống.
3. Nếu port bị chiếm, dùng cổng test riêng hoặc báo lỗi rõ ràng; không truy cập nhầm ứng dụng khác và không xem HTTP 404 của server lạ là lỗi ứng dụng đang test.
4. Dùng browser automation thực sự (Playwright hoặc framework hiện hữu) cho thao tác click, select, resize, thay game, chạy backtest và cập nhật leaderboard. Kiểm tra console, unhandled rejection và failed request quan trọng.
5. E2E phải assert nội dung thực chứ không chỉ status code/selector tồn tại.
6. Các test E2E không được ghi đè `data/audit-report.json`, `data/historical-seed.json` hoặc báo cáo production. Tất cả dữ liệu test phải tách sandbox/temp directory.
7. `npm run test:all` phải chạy toàn bộ suite thật và trả exit code khác 0 nếu bất kỳ suite nào fail. Không được định nghĩa unit/integration scripts trùng nhau nhưng báo là hai lớp độc lập.

# 10. Ma trận E2E bắt buộc cho 5 vùng chính

Chạy ở desktop `1440x900`, tablet `768x1024`, mobile `390x844` và `360x800`.

### A. Results / Kết quả
- Game selector đổi Mega ↔ Power ↔ XSMN và dữ liệu chuyển đúng theo game.
- Kỳ cuối, ngày, mã kỳ, số trúng, bonus/Jackpot lấy từ verified record; thiếu trường thì thông báo thiếu, không tự điền.
- So khớp các số hiển thị với fixture/source record chính xác.

### B. Prediction / 8 thuật toán
- Hero prediction và Ensemble card khớp canonical result hoặc được phân nhãn rõ nếu là hai kết quả khác nhau.
- Ngày target/lịch quay là lịch thật của game/đài.
- Consensus label, số model tham gia và công thức nhất quán.
- Khi thiếu lịch sử, tất cả model hiển thị `insufficient-data`, không tạo số dự đoán.

### C. Dashboard
- Không có `undefined`, `NaN`, `Infinity`, `[object Object]` trong text, tooltip hoặc KPI.
- Pair counts/support/lift khớp fixture; trường thiếu hiển thị trạng thái phù hợp.
- Chart, legend, tooltip và note không overlap ở tất cả viewport; không bị cắt.

### D. Backtest
- Chọn kỳ mục tiêu; training set chỉ chứa record trước target theo policy.
- Số kỳ train, date range, exclusion count và window policy khớp với dữ liệu engine thực sự nhận.
- Chạy kiểm định một kỳ không ghi đè leaderboard nhiều kỳ.
- Không có baseline/hit rate mặc định khi chưa có fold hợp lệ.

### E. Leaderboard
- Sort giảm dần theo metric đã công bố; dòng đầu đúng là Top 1.
- Top banner, bảng và dashboard sử dụng cùng ranking result/scope ID.
- Tên metric, game, sample size, date range, baseline và trạng thái dữ liệu khớp.
- Không render `compositeScore`/field không có trong schema và không che lỗi bằng `|| 0`.
- Nếu hòa điểm phải áp dụng tie rule ổn định hoặc hiện đồng hạng đúng.

# 11. Kiểm tra giao diện/UX và chụp bằng chứng mới

1. Sửa các vấn đề thị giác nêu trên nhưng giữ phong cách hiện có: nền kem, accent vàng nâu, chữ rõ ràng và phân cấp nhất quán. Không redesign toàn bộ nếu sửa cục bộ là đủ.
2. Căn chỉnh khoảng cách giữa card, chart, legend, note và tooltip. Bảng leaderboard cần cột Top 1 đủ rộng; không để badge `TOP 1` vỡ dòng/chồng lên nội dung.
3. Các nút “Cập nhật”, “Cào toàn bộ dữ liệu”, “Chạy dò số” phải có loading/disabled state, thông báo kết quả thành công/thất bại thật, và không báo thành công nếu API/parser thất bại.
4. Khi dữ liệu đang cập nhật, hiển thị timestamp sync thật và nguồn thực tế; không dùng nhãn “Tự động đồng bộ thành công” nếu lần fetch gần nhất fail hoặc dữ liệu chưa kiểm tra.
5. Tạo screenshot mới từ chính bản đang chạy cho mỗi viewport và màn hình trọng yếu. Tên file phải có commit/version, viewport, timestamp và trạng thái test; không dùng screenshot fixture làm screenshot nghiệm thu production.
6. Lưu screenshot trước/sau để rà mắt. Dùng image diff nếu có; mọi diff lớn phải được kiểm tra, không tự động coi screenshot đã đổi là PASS.

# 12. Cổng nghiệm thu bắt buộc — không được tuyên bố hoàn thành nếu còn FAIL

Tất cả tiêu chí dưới đây là cổng AND; không dùng điểm trung bình để bù cho một lỗi P0.

## P0 — phải PASS
- [ ] Hero prediction và Ensemble card đồng nhất theo contract; regression case `06`/`12` đã PASS.
- [ ] Không xuất hiện `undefined`, `NaN`, `Infinity`, `[object Object]` trong UI chính.
- [ ] Không có ngày/mã kỳ/Jackpot/số trúng/đài/KPI lịch sử bị tự gán default hoặc fabricated trong production path.
- [ ] Audit độc lập tính thực từ source evidence; không hard-code tỷ lệ/verified status.
- [ ] Seed/manifest/scope/source evidence khớp; record chưa xác minh không bị gắn `verified`.
- [ ] E2E tự khởi động đúng server và chạy trong môi trường sạch.
- [ ] `npm run test:all` exit code 0; không skip/suppress test để đạt.

## P1 — phải PASS
- [ ] Pair statistics khớp fixture tính tay và không có mẫu số giả.
- [ ] Consensus được diễn đạt đúng, không gọi là xác suất trúng nếu chưa calibration.
- [ ] Current-draw validation và multi-draw leaderboard được tách scope.
- [ ] Training window/299 kỳ có giải thích từ config và trùng với số record thực sự truyền cho model.
- [ ] Cả 8 thuật toán và Ensemble có contract, unit tests, edge tests và leakage tests.
- [ ] Top 1 đúng theo metric/scope; mọi widget lấy cùng ranking object; không undefined score.
- [ ] 4 viewport E2E pass, chart/legend/note không overlap, screenshot mới được lưu.

## Đối chiếu dữ liệu
- [ ] Trong phạm vi lịch sử đã công bố, 100% kỳ/trường bắt buộc khớp bằng chứng nguồn; 0 mismatch chưa giải quyết.
- [ ] 0 kỳ thiếu/xung đột hoặc trường bắt buộc chưa xác minh mà bị tính là PASS.
- [ ] 0 fixture/mock được dùng như dữ liệu production hoặc ghi đè seed thật.

Nếu không thể xác minh nguồn cho một bản ghi sau khi đã thử nguồn dự phòng hợp lý, đánh dấu `BLOCKED` theo từng kỳ/trường. Không được tuyên bố data gate PASS; vẫn hoàn tất các sửa chữa không bị chặn và liệt kê rõ phạm vi còn blocked.

# 13. Báo cáo bàn giao cuối bắt buộc

Tạo `reports/fix-4-verification.md` và không ghi đè báo cáo cũ. Báo cáo phải chứa:

1. Commit/hash/version được kiểm tra và hash seed/config.
2. Danh sách từng lỗi đã tái hiện trước sửa; file/dòng hoặc component liên quan; nguyên nhân gốc; thay đổi cụ thể.
3. Lệnh chạy từng suite, exit code, tổng PASS/FAIL/SKIP; lý do cho mọi SKIP (mặc định không cho phép skip cổng bắt buộc).
4. Bảng đối chiếu UI hero ↔ Ensemble, consensus calculation, pair stats, leaderboard sort và training set với expected output.
5. Kết quả strict audit theo số kỳ dự kiến, số kỳ verified, số field matched, mismatch, unverified và nguồn bằng chứng. Không tự gán con số.
6. Kết quả 3 vòng `verify:fix4`, so sánh hash/output deterministic giữa các vòng và seed Monte Carlo được dùng.
7. Kết quả E2E trên bốn viewport, console/network errors, screenshot paths và những khác biệt cần rà mắt.
8. Danh sách PASS/FAIL/BLOCKED theo từng acceptance criterion; kết luận tổng thể chỉ là `PASS` nếu không còn bất kỳ blocker bắt buộc nào.

## Chỉ thị cuối cho coding agent

**Thực thi ngay trên source code; không dừng ở phân tích hoặc viết kế hoạch.** Làm theo thứ tự: (1) sao lưu và tái hiện lỗi; (2) sửa canonical prediction/UI binding; (3) sửa schema pair và lỗi undefined; (4) sửa chart layout; (5) thống nhất consensus, backtest scope và leaderboard; (6) đóng blocker audit/parser/data; (7) kiểm định 8 thuật toán; (8) ổn định E2E; (9) chạy 3 vòng toàn suite; (10) tạo báo cáo và screenshots mới.

Sau mỗi nhóm thay đổi phải chạy test liên quan. Nếu test fail, đọc nguyên nhân, sửa implementation rồi chạy lại; không sửa expected chỉ để hợp với output hiện có. Không được kết thúc ở trạng thái “đã sửa” nếu chưa chạy test browser thật và chưa có bằng chứng từ lần chạy cuối.
