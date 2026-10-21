# FIX-6 — Data Truth, Algorithm Verification, Artifact Isolation & Strict Release Gates

> **Loại tài liệu:** Chỉ thị triển khai bắt buộc cho coding agent (Codex/agent làm việc trực tiếp trong repository LOTTO-QUANT LAB).  
> **Mục tiêu:** Khắc phục các lỗi còn mở sau FIX-1 → FIX-5. Không chỉ lập kế hoạch; phải sửa source, thêm test hồi quy, chạy kiểm định và cung cấp bằng chứng tái lập.  
> **Nguyên tắc cốt lõi:** `REPRODUCE → FIX ROOT CAUSE → VERIFY INDEPENDENTLY → REGRESSION → GATE PASS`. Không có bằng chứng thì không được đánh dấu PASS.

---

## 0. Quy tắc không được vi phạm

1. **Không tuyên bố hoàn thành chỉ vì unit test/integration test PASS.** Mỗi yêu cầu phải có test cụ thể kiểm tra đúng hành vi đó.
2. **Không bỏ qua gate.** Không được chuyển sang gate tiếp theo nếu gate hiện tại `FAIL`, `BLOCKED`, bị skip, bị timeout hoặc không thực sự chạy.
3. **Không biến lỗi môi trường thành PASS.** Không tìm thấy browser, server không khởi động, nguồn dữ liệu không truy cập được, ảnh không được tạo mới hoặc test không chạy được đều phải là `FAIL` hoặc `BLOCKED`, không được in PASS.
4. **Không xác minh bằng sự hiện diện của dữ liệu.** Trường khác rỗng, URL tồn tại, `verificationStatus: "verified"`, có SHA-256 của file hoặc có screenshot cũ không chứng minh giá trị lịch sử là đúng.
5. **Không bịa dữ liệu.** Không tự gán ngày quay, mã kỳ, số trúng, số đặc biệt, Jackpot, tên đài, timestamp truy xuất hay URL xác minh. Không dùng giá trị mặc định để thay dữ liệu nguồn bị thiếu.
6. **Không xóa/loại kỳ sai để làm đẹp kết quả.** Phải giữ bản ghi gốc và đưa sai lệch vào repair queue; truy tìm nguồn, sửa có audit trail, xác minh lại. Nếu không thể xác minh sau khi đã thử các nguồn hợp lý, chuyển trạng thái `BLOCKED` với lý do và bằng chứng.
7. **Không sửa seed/manifest/report chính thức bằng fixture.** Test chỉ dùng thư mục tạm và dữ liệu tổng hợp; không sửa file trong `data/` hay báo cáo release chính thức.
8. **Không tự sửa kết quả kỳ vọng để test xanh.** Expected fixture phải được xây dựng độc lập, có nguồn/bằng chứng và review. Không lấy chính output của code cần kiểm tra làm expected value.
9. **Không khẳng định xác suất trúng xổ số tương lai 100%.** Yêu cầu 100% chỉ áp dụng cho độ khớp dữ liệu lịch sử trong phạm vi đã định và được xác minh bằng chứng; không áp dụng cho hiệu quả dự đoán.
10. Mọi thao tác thay đổi dữ liệu phải có backup/rollback. Không thực hiện ghi đè seed chính thức trong quá trình kiểm thử.

### Quy trình bắt buộc cho từng lỗi

Với **mỗi** lỗi còn mở trong tài liệu này, agent phải thực hiện đủ các bước:

1. Xác định file/hàm và nguyên nhân gốc trong source hiện tại.
2. Viết một test tái hiện lỗi trên dữ liệu tạm; chạy test và lưu bằng chứng test thất bại trước sửa (RED).
3. Sửa nguyên nhân gốc, không chỉ giấu thông báo, đổi CSS hoặc nới lỏng test.
4. Chạy đúng test đó và chứng minh nó qua (GREEN).
5. Chạy regression test liên quan và toàn bộ test suite cần thiết.
6. Thử nghiệm âm tính/đảo ngược: cố tình tạo dữ liệu sai hoặc làm dịch vụ phụ thuộc thất bại; hệ thống phải phát hiện và dừng.
7. Ghi file, lệnh, exit code, kết quả mong đợi/thực tế và artifact bằng chứng vào báo cáo.
8. Chỉ đóng lỗi khi tất cả bước trên đạt. Nếu bất kỳ bước nào không thực thi được, trạng thái là `BLOCKED`, không phải PASS.

---

## 1. P0 — Sửa audit để đối chiếu giá trị thật, không đếm trường có dữ liệu

### Vấn đề đã biết

`scripts/audit-history.js` từng coi trường khác `null`/`undefined`/chuỗi rỗng là “khớp”, nên thay số trúng hợp lệ từ `09` thành `01` trên bản sao vẫn có thể được báo khớp 100%. Việc tồn tại `sourceUrl` hoặc `verificationStatus: "verified"` cũng chưa chứng minh nội dung bản ghi đã được xác minh.

### Yêu cầu sửa bắt buộc

1. Đọc và kiểm tra toàn bộ luồng `scripts/audit-history.js`, `scripts/reconcile-and-enrich-seed.js`, `scripts/build-real-seed.js`, `scripts/crawl-all-history.js`, `scripts/generate-seed.js`, các validator trong `js/` và mọi nơi có thể thay đổi `historical-seed.json`.
2. Xây dựng **canonical reference dataset** độc lập với seed đang audit. Reference phải được tạo từ nguồn gốc có thể kiểm tra hoặc snapshot được xác minh trước đó; ghi nhận URL/nhà cung cấp, thời điểm lấy dữ liệu thật, thời điểm quay, mã kỳ, game/đài và hash nội dung nguồn. Không tự sinh `retrievedAt` hay nguồn.
3. Với từng kỳ trong phạm vi kiểm toán, so sánh **giá trị chuẩn hóa thực tế** của các trường bắt buộc, tối thiểu:
   - Game/đài và loại kỳ.
   - Mã kỳ chính thức khi nguồn cung cấp.
   - Ngày quay theo timezone/quy tắc ngày đã thống nhất.
   - Tập số chính (đúng số lượng; đúng giá trị; xử lý thứ tự nhất quán).
   - Số đặc biệt/bonus cho Power 6/55.
   - Các giải và các cặp lô tô có thể suy ra từ kết quả giải XSMN.
   - Jackpot và đơn vị tiền tệ khi trường này thuộc phạm vi bắt buộc và nguồn công bố giá trị đó.
4. Jackpot không có/không xác minh được phải biểu diễn thành trạng thái rõ ràng như `unavailable_at_source` hoặc `unverified`; **không** tự gán số tiền. Nếu trường đó được đặt là bắt buộc trong acceptance scope, bản ghi phải ở trạng thái chưa đạt cho tới khi tìm được và xác minh.
5. Tránh so sánh chuỗi thô không chuẩn hóa. Chuẩn hóa ngày, leading zero, đơn vị tiền và thứ tự tập số bằng hàm thuần, có unit tests riêng. Không được chuẩn hóa theo cách làm mất khác biệt thực tế giữa hai kết quả.
6. `verificationStatus: "verified"` chỉ được sinh sau khi phép so sánh từng trường hoàn tất và không có mismatch. Lưu trạng thái, timestamp thực, nguồn cụ thể, hash snapshot và kết quả đối chiếu. Không dùng metadata để tự xác nhận chính metadata đó.
7. Báo cáo phải tách biệt:
   - `recordsCompared` — số bản ghi đã thực sự so sánh với nguồn chuẩn.
   - `fieldsCompared` — số trường thực sự so sánh.
   - `matchedFields` / `mismatchedFields`.
   - `unverifiedRecords` / `missingReferenceRecords` / `unresolvedRequiredFields`.
   - `coverageExpectedDraws` và danh sách kỳ dự kiến bị thiếu.
   - `sourceEvidenceCoverage` — tỷ lệ bản ghi có bằng chứng nguồn có thể kiểm tra.
8. Không dùng một trường `requiredFieldSourceMatch: 100` cố định. Mọi tỷ lệ phải được tính từ số đếm thực tế; `100%` chỉ được báo khi mẫu số khác 0 và không có mismatch/chưa xác minh trong phạm vi được tuyên bố.
9. `npm run audit:strict` phải có exit code khác 0 nếu có bất kỳ kỳ sai, kỳ thiếu, trường bắt buộc chưa xác minh, reference chưa có, nguồn xung đột chưa giải quyết hoặc báo cáo không nhất quán.
10. Nếu nguồn gốc thay đổi hoặc không thể truy cập, dùng snapshot đã lưu và có hash chỉ khi snapshot đó đã được xác minh độc lập. Không coi một bản sao của seed đang kiểm toán là reference chuẩn.

### Test bắt buộc cho audit (mutation/negative tests)

Tạo fixture trong temp directory và xác minh mỗi trường hợp dưới đây làm audit `FAIL`:

- Thay một số trúng hợp lệ bằng một số khác vẫn trong miền hợp lệ (ví dụ `09` → `01`).
- Thay số đặc biệt bằng số khác hợp lệ.
- Đổi ngày sang một ngày hợp lệ nhưng không đúng kỳ.
- Đổi mã kỳ nhưng vẫn giữ định dạng hợp lệ.
- Thay Jackpot bằng một số tiền khác hợp lệ.
- Xóa/đổi reference snapshot hoặc thay hash reference.
- Thêm kỳ duplicate, thiếu kỳ giữa chuỗi hoặc đưa một kỳ ngoài phạm vi vào dữ liệu.
- Đánh dấu `verified` nhưng không có đối chiếu nguồn.
- Giữ nguyên dữ liệu seed nhưng làm nguồn/reference trả về kết quả xung đột.

Cũng phải có positive tests để chứng minh bản ghi đúng khớp qua sau chuẩn hóa hợp lệ. Test không được đọc expected value từ chính bản ghi đang kiểm tra.

**Gate 1 chỉ PASS khi tất cả negative tests chứng minh audit phát hiện lỗi, positive tests qua, báo cáo được tính từ dữ liệu thực và không còn tuyên bố xác minh thiếu bằng chứng.**

---

## 2. P0 — Làm sạch toàn bộ đường nạp dữ liệu, bỏ fallback giả

### Phạm vi tối thiểu phải rà

- `scripts/reconcile-and-enrich-seed.js`
- `scripts/build-real-seed.js`
- `scripts/crawl-all-history.js`
- `scripts/generate-seed.js`
- `js/data-service.js`
- `js/ui-controller.js`
- Các `netlify/functions/*` có thể thu thập/chuẩn hóa dữ liệu
- Bất kỳ script nào ghi vào `data/historical-seed.json`, `data/history-scope.json`, `data/audit-report.json` hoặc canonical cache.

### Yêu cầu sửa

1. Tìm tất cả fallback tự gán ngày, mã kỳ, đài, Jackpot hoặc số trúng; phân loại rõ fallback UI an toàn với fallback dữ liệu nghiệp vụ nguy hiểm.
2. Cấm các fallback dữ liệu nghiệp vụ giả trong pipeline dữ liệu chính thức. Khi parser không lấy được trường, trả lỗi có cấu trúc và tạo repair item; không tự tạo một giá trị có vẻ hợp lệ.
3. `generate-seed.js` chỉ được tạo **synthetic fixture** trong `test/fixtures/` hoặc temp directory, mặc định không có quyền ghi seed chính thức. Nếu giữ chức năng seed giả, tên file/output và nội dung phải gắn cờ synthetic rõ ràng; không bao giờ được nhập vào canonical history.
4. Parser phải kiểm tra cấu trúc, nguồn, mã kỳ, ngày và dữ liệu trò chơi. Không coi HTTP 200 là bằng chứng parser đã lấy đúng nội dung.
5. Kiểm tra phạm vi manifest so với dữ liệu thực: kỳ đầu/cuối, lịch mở thưởng, các kỳ bị thiếu, duplicate, kỳ tương lai không hợp lệ và phạm vi được khai báo. Mọi lệch nhau phải giải trình và sửa bằng nguồn.
6. Với XSMN, kiểm tra cấu trúc đầy đủ từng giải từ nguồn gốc; không chỉ kiểm tra đủ 18 cặp hai chữ số nếu số giải nguồn bị thiếu. Các cặp lô tô lặp nhau là có thể hợp lệ nếu kết quả giải tạo ra như vậy.
7. Không xóa các bản ghi không hợp lệ hoặc kỳ thiếu để làm các con số audit đẹp hơn. Giữ lại bản ghi gốc, tạo repair queue và ghi mọi thay đổi trong change log.
8. Giao diện không được thay Jackpot thiếu bằng một giá trị cố định. Hiển thị trạng thái “Chưa xác minh/Chưa có dữ liệu” cho trường hợp chưa có giá trị đã xác minh; không trình bày số ước lượng là giá trị chính thức.
9. Thêm lệnh/guard chống ghi đè canonical seed từ test, fixture và synthetic generator. Các thao tác chủ đích cập nhật seed phải có chế độ explicit, backup, diff, audit trước/sau và rollback.

### Gate 2

Chỉ PASS khi grep/static scan các đường ghi dữ liệu không còn fallback giả chưa được giải trình, test trên parser lỗi chứng minh không có bản ghi fabricated đi vào seed, seed canonical không bị thay đổi bởi unit/integration suite và repair queue liệt kê đủ sai lệch chưa xử lý. Nếu có bản ghi chưa xác minh, không được báo lịch sử “100% verified”; tùy acceptance scope, phải `FAIL` hoặc `BLOCKED`.

---

## 3. P0 — Cô lập tuyệt đối test fixtures và artifact chính thức

### Yêu cầu

1. Mọi test có thể chạy audit, reconcile, crawl, backtest hoặc tạo report phải dùng workspace tạm riêng.
2. Không test nào được ghi đè trực tiếp các file chính thức, tối thiểu:
   - `data/historical-seed.json`
   - `data/history-scope.json`
   - `data/audit-report.json`
   - release reports/screenshots chính thức
3. Nếu script được gọi với fixture, bắt buộc truyền output path thuộc temp directory. Nếu không, script phải dừng trước khi ghi file.
4. Thêm integration test lưu SHA-256 của canonical seed, manifest và audit report trước khi chạy test suite, rồi tính lại sau khi suite kết thúc. Hash thay đổi phải làm pipeline FAIL, trừ khi một bước cập nhật dữ liệu chính thức được phê duyệt rõ ràng và có quy trình migration/approval riêng.
5. Không để test phụ thuộc thứ tự thực thi hoặc state từ lần trước. Xóa temp directory lúc bắt đầu; không dùng report/screenshot cũ làm bằng chứng lần hiện tại.
6. Báo cáo test chính thức và báo cáo chạy fixture phải ở đường dẫn khác nhau, có metadata phân biệt `runId`, `createdAt`, `inputHash`, `fixtureMode`.

### Gate 3

Chạy unit, integration và negative tests với fixture cố tình lỗi; xác minh hash của các file chính thức không thay đổi. Thử ép ghi vào file chính thức trong fixture mode và xác minh script từ chối với exit code khác 0. Bất kỳ thay đổi không được phép nào đều FAIL gate.

---

## 4. P1 — Chứng minh công thức từng thuật toán bằng expected values độc lập

Không chỉ kiểm tra thuật toán trả đúng sáu số hoặc không crash. Với mỗi mô hình, phải có bộ test chuẩn nhỏ đủ để tính kết quả độc lập và đối chiếu score/ranking.

### Các thuật toán bắt buộc rà soát

- Markov
- Poisson
- Monte Carlo
- Tần suất/chu kỳ lô gan
- EMA & lịch quay/weekday seasonality
- Khai phá luật bạc nhớ / association rules
- Cấu trúc & tổng / mean-reversion
- Ensemble / normalized soft voting
- Random baseline và mọi thành phần phụ được dùng trong leaderboard

### Yêu cầu chung

1. Với từng thuật toán, ghi rõ input schema, phương pháp toán học, giả định, phạm vi áp dụng, output schema và cách tính score. Tên hiển thị phải đúng với phương pháp thật trong code.
2. Viết fixture nhỏ, cố định và có thể kiểm tra bằng phép tính tay; expected outputs được tạo độc lập và review, không lấy từ output hiện tại của model.
3. Test các điều kiện biên: history rỗng, một kỳ, dữ liệu trùng/thiếu, sai ngày, số ngoài miền, lịch quay không phải ngày kế tiếp, lịch sử đủ/không đủ độ dài, tie scores và phân phối có zero count.
4. Monte Carlo phải có seed để tái lập trong test; đồng thời có test xác minh các lần chạy với seed khác không được trình bày nhầm là kết quả xác định. Phân phối mô phỏng XSMN phải cho phép cặp lô tô lặp theo dữ liệu giải; cơ chế lấy mẫu Vietlott phải tuân theo số bóng không trùng.
5. EMA/weekday phải nhận ngày quay mục tiêu đúng từ lịch của game/đài. Không dùng `lastDate + 1 calendar day` nếu lịch mở thưởng không diễn ra mỗi ngày.
6. Markov bậc 2 chỉ được mô tả là bậc 2 nếu code thực sự sử dụng trạng thái của hai bước quá khứ. Nếu không, đổi tên/giải trình phương pháp hoặc triển khai đúng, kèm test.
7. K-Means/clustering chỉ được đặt tên như vậy khi có bước gán cụm, cập nhật centroid và tiêu chí dừng phù hợp; nếu code chỉ tính heuristic score, đổi tên và tài liệu.
8. Association rules phải tính Support/Confidence/Lift theo định nghĩa đã công bố, với trường hợp zero denominator được xử lý rõ. Không dùng cặp đồng xuất hiện mà không được dùng trong scoring nhưng vẫn tuyên bố nó tác động lên dự đoán.
9. Ensemble phải kiểm tra mọi đầu vào trên thang điểm có ý nghĩa tương thích; công thức normalized soft voting phải đúng với tên gọi. Đặt test cho ranking tie, missing model output và trọng số không hợp lệ.
10. Khi thiếu dữ liệu, mô hình phải trả `insufficient-data` hoặc trạng thái rõ; không sinh dự đoán ngẫu nhiên trừ khi đó là RandomBaseline được gọi có chủ đích.

### Gate 4

Mỗi thuật toán phải có bộ reference tests thực tế và test biên; mọi expected value được giải thích hoặc truy nguồn. Không được dùng test “có output và output đủ sáu số” làm bằng chứng duy nhất. Bất kỳ thuật toán nào không đủ fixture độc lập phải được đánh dấu `BLOCKED`, không được công bố rằng công thức đã được xác minh hoàn toàn.

---

## 5. P1 — Backtest walk-forward, chống leakage và baseline công bằng

1. Kiểm tra trực tiếp danh sách từng bản ghi được truyền cho model ở mỗi fold; bắt buộc `drawDate < targetDate` cho mọi bản ghi huấn luyện.
2. Bài test chống leakage phải tiêm một kỳ tương lai có số cực đoan vào dữ liệu; dự đoán cho target cũ phải không thay đổi. Kiểm tra trực tiếp input của model, không chỉ đếm số bản ghi.
3. Định nghĩa công khai cửa sổ huấn luyện. Nếu leaderboard giới hạn 100 kỳ còn backtest đơn dùng toàn lịch sử, phải ghi đúng phạm vi trên UI và report; không so sánh các metric như thể cùng điều kiện.
4. Baseline ngẫu nhiên phải chạy nhiều replicate có seed, dùng cùng target dates và cùng số lượng số dự đoán như thuật toán đang so sánh. Báo cáo phân phối baseline, trung bình, độ lệch/quantiles và khoảng bất định phù hợp; không chỉ một lượt random.
5. Tất cả mô hình phải được đánh giá trên cùng các fold. Ghi rõ quy tắc xử lý lỗi model, missing prediction, tie và kỳ không có kết quả thật.
6. Không dùng một tỷ lệ trúng cao nhất trong một kỳ làm metric chính thay cho hiệu suất trung bình. Primary metric và tie-breakers phải được công bố, xác định trước khi chạy.
7. Kiểm tra metric đúng cho từng trò chơi: Vietlott khớp số bóng chính và bonus riêng; XSMN phân tích các giải/cặp lô tô theo định nghĩa rõ ràng. Không gộp những metric không tương đương vào một tỷ lệ duy nhất mà không giải thích.
8. Không tuyên bố một mô hình có lợi thế thống kê chỉ vì mean cao hơn một baseline sample đơn lẻ. Nếu chưa có đủ mẫu/kiểm định, UI phải dùng nhãn “chưa đủ bằng chứng”.

### Gate 5

Pass khi test leakage âm tính phát hiện được vi phạm, các mô hình và baseline dùng cùng folds, replicate baseline được dùng thật trong report, metric tái lập theo seed, và phạm vi huấn luyện được hiển thị đúng. Báo cáo phải kèm input hash, target dates và sample size.

---

## 6. P1 — Cache canonical prediction phải phụ thuộc nội dung lịch sử

### Yêu cầu

1. Rà `getOrComputeCanonicalPrediction()` và toàn bộ đường tạo/đọc cache.
2. Cache key phải gồm tối thiểu game/mode, đài nếu có, target draw/date, phiên bản thuật toán/cấu hình liên quan và hash ổn định của dataset lịch sử thực sự dùng để dự đoán.
3. Dùng canonical serialization trước khi tạo SHA-256 để hash không đổi chỉ vì thứ tự key JSON, nhưng phải đổi khi giá trị lịch sử thay đổi.
4. Khi lịch sử/source/config đổi, cache cũ không được tái sử dụng. Có version namespace hoặc invalidate rõ ràng.
5. Kết quả được dùng ở hero, ensemble, cards, charts và leaderboard phải có metadata fingerprint giống nhau nếu cùng đầu vào; UI không được tự gọi model lần nữa để tạo một bộ số khác cho cùng target.

### Test bắt buộc

- Cùng input + cùng version → cache hit và cùng output.
- Đổi một số lịch sử nhưng giữ nguyên kỳ mới nhất → cache miss và recompute.
- Đổi cấu hình/phiên bản model → cache miss.
- Đổi target draw → cache miss.
- Không có history → không cache một dự đoán giả.

### Gate 6

Chỉ PASS khi tất cả cache mutation tests đạt và log/report cho phép truy nguyên fingerprint đầu vào của mỗi canonical prediction.

---

## 7. P1 — Leaderboard và UI dùng một định nghĩa xếp hạng nhất quán

1. Công bố `primaryMetric`, metric phụ, cửa sổ đánh giá, số folds, số kỳ, baseline protocol, seed và tie-break rule.
2. Bảng xếp hạng nhiều kỳ phải chỉ dùng metric đã định trước. Tách rõ “kết quả đối chiếu một kỳ” và “hiệu suất walk-forward nhiều kỳ”; không trộn hai danh hiệu Top 1.
3. Tất cả vùng UI dùng cùng một leaderboard payload/revision: thứ hạng, tên thuật toán, `avgHitRate`, `maxHit`, số kỳ và baseline không được tính riêng theo các công thức khác nhau.
4. Sửa mọi trường không tồn tại như `compositeScore` nếu code không tạo trường đó. Không render `undefined`, `NaN`, `Infinity` hoặc mặc định 0 để che dữ liệu hỏng.
5. Khi ít dữ liệu, lỗi tính toán hoặc số kỳ kiểm định không đủ, không tuyên bố Top 1 đạt lợi thế; hiển thị trạng thái rõ ràng.
6. Đảm bảo bộ số đề xuất ở Hero, Ensemble, thuật toán thành phần và bản ghi prediction có cùng `predictionId`/fingerprint nếu được mô tả là cùng một dự đoán. Nếu các card đại diện các mô hình riêng, phải gắn nhãn riêng và không gây nhầm chúng là cùng một bộ số.
7. Regression tests phải parse DOM sau render và kiểm tra số, ngày, mode, tên thuật toán, metric và sample size; không chỉ kiểm tra phần tử tồn tại.

### Gate 7

Test tất cả các vùng UI dùng chung kỳ mục tiêu; cố tình gây mismatch trong fixture phải làm test fail. Không có `undefined`/`NaN`; Top 1 và thứ hạng bảng phải thống nhất với payload, metric và scope được công bố.

---

## 8. P1 — Browser/E2E: PASS chỉ khi trình duyệt thật chạy xong

1. Browser path phải có thể cấu hình qua environment variable và tự dò các vị trí Windows/macOS/Linux hợp lý. Không thấy browser thì gate phải `BLOCKED`/FAIL theo chính sách CI; tuyệt đối không skip rồi báo PASS.
2. Server phải được start bởi test runner trên cổng khả dụng/được cấu hình; chờ readiness với timeout hữu hạn. Luôn teardown server/browser trong `finally`.
3. Mỗi lượt test xóa hoặc dùng thư mục artifact mới. Screenshot phải được tạo trong đúng `runId`, có thời gian mới hơn thời điểm start, kích thước hợp lệ và đường dẫn được ghi vào report. Screenshot cũ không được coi là bằng chứng mới.
4. Kiểm tra không chỉ HTTP 200 mà còn JavaScript console errors, failed network requests quan trọng, DOM state, tương tác navigation/tab, game switching, date input, backtest, leaderboard và responsive.
5. Desktop, tablet và mobile phải xác nhận không có horizontal overflow thực tế (`scrollWidth <= clientWidth` tại các container/viewport liên quan), các control còn nhìn thấy và thao tác được, không che nội dung.
6. Nếu chụp ảnh timeout, Chrome crash hoặc screenshot không được ghi thì Gate 7 FAIL; báo nguyên nhân và log browser. Không chuyển qua Gate 8.
7. Kiểm tra `undefined`, `NaN`, bộ số dự đoán lệch giữa các component, label nhầm đồng thuận với xác suất trúng, legend/notes overlap và dữ liệu stale.

### Gate 8

Chỉ PASS khi browser thực sự chạy được mọi kịch bản bắt buộc, tất cả screenshots của lượt hiện tại được tạo thành công, interaction assertions đạt, không có JS console error nghiêm trọng và responsive checks đạt. Không chấp nhận HTTP/HTML checks như thay thế cho browser E2E.

---

## 9. P0 — Nâng cấp `verify:strict` thành bộ điều phối có bằng chứng

1. Xem `scripts/gate-runner.js`, `package.json`, các test E2E và mọi script tạo báo cáo. Giữ thứ tự gate rõ ràng, chạy tuần tự.
2. Mỗi gate phải có trạng thái chính xác: `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`. `SKIPPED`, timeout, thiếu dependencies và lỗi môi trường không được biến thành PASS.
3. Nếu một gate không PASS, ghi trạng thái, exit code, stdout/stderr, thời gian, run ID; sau đó dừng ngay. Gate sau phải ở `NOT_RUN`.
4. Xóa output/report cũ hoặc khởi tạo report mới có `runId` trước khi bắt đầu. Nếu tiến trình bị timeout/crash, phải có báo cáo trạng thái không hoàn tất; không giữ report của lần trước như thể thuộc lần hiện tại.
5. Mỗi assertion phải thực sự gọi kiểm tra và nêu invariant. Không tăng số assertion theo số dòng log; không hard-code kết quả PASS.
6. Thêm self-tests của gate runner:
   - ép Gate 1 fail → Gate 2 trở đi không chạy;
   - ép browser không có → Gate 7 không PASS;
   - ép screenshot fail → Gate 7 không PASS và Gate 8 `NOT_RUN`;
   - ép timeout → exit code khác 0, report ghi `FAIL`/`BLOCKED`;
   - thay canonical data trong fixture → Artifact Safety phát hiện;
   - để lại screenshot/report cũ → runner không coi đó là artifact mới.
7. Báo cáo mỗi lượt tối thiểu: `runId`, commit/version nếu có, timestamp thực, environment, command, exit code, gate results, test counts, input hashes, artifact paths và unresolved issues.
8. Lệnh strict phải trả exit code `0` chỉ khi tất cả gate bắt buộc đều `PASS`; bất kỳ `FAIL`, `BLOCKED` hoặc `NOT_RUN` nào đều phải trả exit code khác 0.

---

## 10. Bắt buộc ba lượt strict liên tiếp, độc lập

Sau khi mọi gate đơn lẻ đã PASS:

1. Chạy `npm run verify:strict` ba lần liên tiếp bằng ba `runId` độc lập, log và thư mục artifact riêng.
2. Trước mỗi lần, xác nhận không tái sử dụng report/screenshot/cache tạm của lần trước; dữ liệu canonical không đổi ngoài các migration được phê duyệt.
3. Mỗi lần phải kết thúc exit code `0` và tất cả gate bắt buộc trạng thái `PASS`. Không dùng kết quả tổng hợp để che một lượt thất bại.
4. Nếu lần 1, 2 hoặc 3 thất bại, phải dừng nghiệm thu, điều tra nguyên nhân, sửa lỗi, chạy regression tests và bắt đầu lại **đủ ba lượt từ đầu**.
5. Báo cáo cuối ghi riêng trạng thái từng lượt và hash của log/report. Không được tự điền “3/3 PASS” nếu thiếu log tương ứng.
6. Nếu môi trường không hỗ trợ một phụ thuộc bắt buộc, ghi `BLOCKED`, hướng dẫn cách chạy đúng môi trường; không tuyên bố release-ready.

---

## 11. Thứ tự thực thi và dependency gates

Agent phải thực hiện đúng thứ tự; mỗi gate dưới đây phải chặn phase tiếp theo nếu không PASS:

1. **Gate A — Baseline & Backup:** lưu trạng thái Git/diff, hash các file canonical, chạy baseline test; không sửa khi chưa có bản backup hoặc rollback strategy.
2. **Gate B — Audit Reference Integrity:** tạo/kiểm tra reference độc lập; chạy mutation tests. Không PASS nếu source reference chưa đủ.
3. **Gate C — Ingestion & Repair:** loại fallback giả, repair records từ nguồn và đối chiếu manifest; unresolved required records phải BLOCK.
4. **Gate D — Artifact Isolation:** chứng minh test không thay đổi seed/manifest/report chính thức.
5. **Gate E — Algorithm Reference Tests:** từng thuật toán phải khớp expected values độc lập.
6. **Gate F — Walk-forward & Baseline:** không leakage, các model dùng cùng folds, baseline replicate thực sự được dùng.
7. **Gate G — Cache & Canonical Prediction:** input hash/cache invalidation và đồng bộ prediction.
8. **Gate H — Leaderboard/UI Contract:** metric, rank, sample size và DOM state nhất quán.
9. **Gate I — Browser E2E & Responsive:** browser thật, interaction, console, request và screenshot mới.
10. **Gate J — Strict Runner Self-Test:** chứng minh fail-closed với các lỗi được tiêm có kiểm soát.
11. **Gate K — Strict 3/3:** ba lượt độc lập `npm run verify:strict` đều PASS.
12. **Gate L — Final Release Report:** chỉ tạo khi tất cả gate A–K PASS. Nếu không, báo chưa hoàn tất và liệt kê blockers.

Không được gộp nhiều gate thành một thông báo tổng hợp mà che mất gate nào chưa thực sự chạy.

---

## 12. Acceptance criteria bắt buộc

### Data integrity

- 100% các kỳ **trong phạm vi lịch sử được tuyên bố** đã được so sánh với reference độc lập được xác minh.
- Mismatch số trúng/ngày/mã kỳ/bonus/Jackpot được phát hiện qua negative tests.
- Kỳ dự kiến bị thiếu: `0` hoặc phải báo `BLOCKED`; không thu hẹp phạm vi để làm đẹp tỷ lệ.
- Trường bắt buộc chưa xác minh: `0` trong phạm vi được tuyên bố “verified”.
- Giá trị tự gán/fabricated trong canonical history: `0`.
- Mọi record verified có evidence, hash/reference và trạng thái đối chiếu thực tế.

### Algorithm correctness

- Mỗi thuật toán có expected-value tests độc lập và test biên.
- Không có dự đoán giả khi không đủ history.
- Monte Carlo tái lập theo seed; phân biệt rõ kết quả mô phỏng với xác suất thực.
- EMA dùng lịch mục tiêu thật.
- Ensemble formula/scoring/weights được test.
- Backtest không dùng dữ liệu tương lai, baseline được mô phỏng nhiều replicate và metric có phạm vi rõ.

### UI/Leaderboard

- Canonical prediction nhất quán ở mọi component cho cùng prediction ID.
- Không còn `undefined`, `NaN`, dữ liệu giả hoặc Jackpot giả.
- Top 1 phản ánh primary metric và cùng scope; metric/sample size/period được hiển thị.
- Browser E2E thực sự chạy và tạo screenshot mới cho desktop/tablet/mobile.
- Không lỗi JS nghiêm trọng, không tràn ngang ngoài chủ đích, controls hoạt động.

### Release gates

- Mọi gate đều đã chạy, không có `SKIPPED`, `BLOCKED`, `NOT_RUN` hoặc `FAIL`.
- Ba lượt `verify:strict` độc lập liên tiếp exit code `0`.
- Artifact/log được lưu và thuộc đúng run ID.
- Unit/integration/e2e fixtures không thay đổi các file dữ liệu/báo cáo chính thức.

**Nếu bất kỳ tiêu chí nào chưa đạt, trạng thái dự án phải là `NOT READY` hoặc `BLOCKED`; không được tạo thông điệp release PASS.**

---

## 13. Báo cáo bắt buộc sau khi triển khai

Tạo `reports/fix6/verification-report.md` và dữ liệu máy đọc được đi kèm. Báo cáo phải gồm:

- Tóm tắt các lỗi còn lại trước sửa và nguyên nhân gốc.
- Danh sách file đã sửa và bản chất thay đổi.
- Mỗi lỗi: test tái hiện trước sửa, test qua sau sửa, regression tests, negative/mutation test và kết quả.
- Danh sách các nguồn/reference được dùng và phạm vi kỳ đã đối chiếu; không chỉ ghi URL chung.
- Số kỳ/field thực sự so sánh, mismatch, unresolved, missing reference và coverage.
- Kết quả từng thuật toán và reference tests độc lập.
- Backtest protocol, folds, baseline replicate, seed, metric và giới hạn thống kê.
- Cache invalidation tests và UI consistency checks.
- Gate A–L: status, start/end time, command, exit code và artifact paths.
- Ba log `verify:strict` đầy đủ, ba report và hash tương ứng.
- Những phần còn `BLOCKED` hoặc không thể xác minh, cùng lý do chính xác.

Không được viết “đã hoàn tất 100%” nếu có blocker, reference chưa xác minh hoặc gate chưa chạy. Không được tự tạo số liệu cho báo cáo.

---

## 14. Chỉ thị thực thi cho coding agent

> Đọc toàn bộ `fix-1.md` đến `fix-6.md`, xem trạng thái source hiện tại và ưu tiên các lỗi còn mở. Thực thi FIX-6 trực tiếp trên dự án; không chỉ viết kế hoạch hoặc báo cáo.
>
> Với từng lỗi, trước hết tạo test tái hiện thất bại; sửa nguyên nhân gốc; chạy lại test; chạy regression; làm negative/mutation test để xác nhận hệ thống sẽ phát hiện khi lỗi quay lại. Mỗi gate chỉ được PASS bằng exit code và artifact thực tế. Không chuyển sang gate tiếp theo nếu gate trước FAIL/BLOCKED. Không bỏ qua test, không dùng output cũ, không dùng dữ liệu seed hiện tại làm nguồn chuẩn để tự xác minh chính nó.
>
> Bảo vệ seed/manifest/report chính thức; mọi fixture và mutation tests phải dùng temp directory. Không tự gán dữ liệu lịch sử hoặc trạng thái verified. Nếu không thể xác minh nguồn, báo BLOCKED. Sau khi tất cả gate đơn lẻ đã PASS, chạy `npm run verify:strict` ba lần độc lập liên tiếp. Nếu một lần thất bại, sửa lỗi và chạy lại cả ba lần từ đầu.
>
> Chỉ được kết thúc bằng `PASS` khi mọi Acceptance Criteria trong FIX-6 được chứng minh bằng log, exit code, nguồn/reference và artifacts. Nếu chưa đủ, kết thúc bằng `NOT READY`/`BLOCKED`, liệt kê cụ thể phần chưa đạt; tuyệt đối không tuyên bố hoàn thành giả.
