# FIX-3 — Bắt buộc sửa hết lỗi còn tồn tại, xác minh dữ liệu lịch sử và nghiệm thu toàn hệ thống

> **Mục tiêu:** tiếp tục từ `fix-2.md` và sửa trực tiếp dự án LOTTO-QUANT LAB. Không chỉ viết báo cáo, không chỉ thêm test cho có, không hạ tiêu chuẩn để làm test xanh. Mọi mục đang FAIL hoặc chưa được chứng minh phải được sửa và kiểm tra lại. Chỉ kết thúc ở `PASS` khi có bằng chứng tái lập; nếu bị chặn bởi nguồn dữ liệu không thể truy cập, phải tiếp tục thử các nguồn hợp lý và tuyệt đối không tuyên bố hoàn thành 100% khi chưa đạt.

## 0. Quy tắc bắt buộc — không được bỏ qua

1. Đọc toàn bộ `fix-1.md`, `fix-2.md`, `README.md`, `package.json`, `data/history-scope.json`, `data/historical-seed.json`, `data/audit-report.json`, các module `js/algorithms/*`, `js/backtest-engine.js`, `js/data-service.js`, `js/ui-controller.js`, `js/app.js`, tất cả script trong `scripts/` và test trong `test/` trước khi sửa.
2. Chụp trạng thái ban đầu: lưu output của `git status` (nếu có Git), kích thước/hash của seed, số bản ghi theo game, test baseline, log lỗi trình duyệt và screenshot các màn hình chính. Không ghi đè dữ liệu nguồn trước khi sao lưu.
3. Không xóa, bỏ qua, lọc mất hoặc thu hẹp phạm vi bản ghi lịch sử chỉ để làm audit/test đạt. Bản ghi sai hoặc thiếu trường phải được **truy tìm nguồn và sửa thành dữ liệu đúng**. Giữ lại bản gốc và nhật ký thay đổi. Chỉ đánh dấu `BLOCKED` sau khi đã thử các nguồn thay thế có căn cứ và ghi rõ bằng chứng; không biến `BLOCKED` thành `PASS`.
4. Tuyệt đối không tự chế kết quả, ngày quay, mã kỳ, số trúng, Jackpot, số đặc biệt, tên đài, giải XSMN, hit rate, confidence, baseline hoặc thứ hạng. Không dùng fallback giả, dữ liệu demo hoặc `Math.random()` làm kết quả chính thức.
5. Không cho một test tự khẳng định điều mà test không đo. Cấm hard-code `100%`, `0 lỗi`, số kỳ đã xác minh, độ chính xác, tên Top 1 hoặc trạng thái thành công trong báo cáo kiểm toán. Mọi số liệu báo cáo phải được tính từ dữ liệu và bằng chứng kiểm tra trong lần chạy đó.
6. Không làm test xanh bằng cách nới lỏng assertion, bỏ test, bỏ qua lỗi, sửa expected output để hợp với kết quả sai, dùng `|| true`, catch lỗi rồi vẫn trả exit code 0, hoặc chỉ kiểm tra số lượng bản ghi.
7. Mỗi sửa đổi phải có test tái hiện lỗi trước khi sửa và test xác nhận lỗi đã hết sau khi sửa. Chạy lại regression suite sau từng nhóm thay đổi.
8. Giữ nguyên stack hiện có nếu không có lý do kỹ thuật. Kiểm tra dependency trước khi thêm thư viện. Nếu cần browser automation, ưu tiên framework đã có; nếu bổ sung Playwright thì thêm vào devDependencies và ghi rõ cách cài browser/command chạy.
9. Không cam kết dự đoán xổ số tương lai đúng 100%. Yêu cầu 100% áp dụng cho **độ khớp dữ liệu lịch sử đã được xác minh trong phạm vi công bố**, tính đúng của các quy tắc và tính trung thực của báo cáo.

## 1. Các blocker đã phát hiện ở bản trước — phải đóng từng mục

### 1.1 `scripts/audit-history.js` đang báo cáo cứng

Ở bản trước, `requiredFieldSourceMatch: 100` và `inventedOrDefaultedValues: 0` được gán sẵn thay vì tính từ việc đối chiếu nguồn.

**Bắt buộc:**
- Xóa tất cả giá trị audit được hard-code hoặc suy ra từ giả định.
- Mỗi chỉ số phải có hàm tính thực tế, đơn vị, mẫu số và danh sách bản ghi liên quan.
- `--strict` phải trả exit code khác 0 nếu có bất kỳ blocker nào; không được chỉ in cảnh báo rồi thoát thành công.
- Audit phải kiểm tra nội dung và phạm vi, không chỉ đếm số bản ghi.
- Tạo test fixture cố tình sai một trường; audit bắt buộc phát hiện và fail. Sửa fixture thì audit mới pass.

### 1.2 `data/history-scope.json` chưa đồng bộ dữ liệu thực

Bản trước: manifest khai báo Mega dừng ở `#01575` ngày `2026-10-14` và Power dừng ở `#01410`, trong khi seed có Mega `#01576` ngày `2026-10-16` và Power `#01411` ngày `2026-10-15`.

**Bắt buộc:**
- Kiểm tra manifest so với lịch quay và nguồn gốc từng kỳ; cập nhật manifest theo phạm vi thực tế được xác minh, không chỉ sao chép giá trị cuối từ seed.
- Xác định rõ `scopeStart`, `scopeEnd`, `expectedDrawIds`/quy tắc lịch và ngoại lệ đã chứng minh cho từng game/đài.
- Báo riêng: số kỳ kỳ vọng, số kỳ có trong seed, số kỳ đã đối chiếu nguồn, ID thiếu, ID trùng, ngày sai, ngày có bản ghi nhưng không nằm trong lịch, ID cuối thực tế và ID cuối được xác minh.
- Đảm bảo một kỳ mới có trong seed không bị xem là đã audit chỉ vì manifest cũng được đổi theo. Manifest và seed không được là cùng một nguồn chân lý duy nhất.

### 1.3 Thiếu Jackpot hoặc metadata nguồn

Bản trước có 36 kỳ Mega và 1 kỳ Power thiếu Jackpot. Tất cả 3.339 bản ghi chưa có `source`/`sourceUrl` ở cấp bản ghi.

**Bắt buộc:**
- Truy tìm và khôi phục Jackpot còn thiếu từ nguồn có thể kiểm tra. Xác minh đúng trường Jackpot, đúng loại Jackpot (ví dụ Power Jackpot 1/Jackpot 2), đơn vị tiền và trạng thái tích lũy/trúng thưởng.
- Không đặt `0`, số cố định, số từ kỳ trước hoặc giá trị ước đoán thay cho Jackpot.
- Nếu Jackpot không áp dụng cho một loại bản ghi, đánh dấu `not_applicable` bằng schema rõ ràng; nếu có áp dụng nhưng chưa xác minh được, ghi `unverified` và khiến strict audit fail — không ngụy trang là đã xác minh.
- Gắn provenance cho từng bản ghi: `sourceName`, `sourceUrl` hoặc mã tham chiếu URL, `retrievedAt`, `verificationStatus`; lưu hash/snapshot nguồn hoặc dữ liệu bằng chứng phù hợp để có thể kiểm tra lại. Nếu nhiều bản ghi lấy từ cùng một trang nguồn, vẫn phải chỉ rõ URL/trang/phạm vi tương ứng từng bản ghi.
- Việc có `sourceUrl` không tự động chứng minh bản ghi khớp; audit phải so sánh giá trị thực với nội dung nguồn.

### 1.4 Các nhánh còn tạo dữ liệu mặc định/giả

Bản trước còn dấu hiệu ở các file:
- `scripts/crawl-all-history.js`: fallback Jackpot khi không đọc được giá trị thật.
- `scripts/generate-seed.js`: tạo kết quả ngẫu nhiên/Jackpot giả và có khả năng ghi đè `data/historical-seed.json`.
- `js/data-service.js`: fallback tự gán đài hoặc mã kỳ khi parse thiếu thông tin.
- `js/ui-controller.js`: Jackpot mặc định `30.000.000.000 ₫` khi bản ghi không có dữ liệu.

**Bắt buộc:** quét toàn repository các cụm từ và mẫu như `Math.random`, `Date.now`, `new Date()` fallback, số Jackpot cố định, `|| 0`, `?? default`, mã kỳ sinh tự động, ngày hard-code, đài mặc định, placeholder, `sample/demo/mock/seed` và các `catch` làm nuốt lỗi. Xem ngữ cảnh từng kết quả tìm kiếm; không chỉ sửa bốn file kể trên.

- Dữ liệu giả chỉ được phép ở fixture/test riêng, phải có tên file và cờ `TEST_ONLY`, không được import vào luồng production hoặc ghi đè seed lịch sử.
- Script tạo dữ liệu phải mặc định không ghi đè dữ liệu thật. Muốn thay đổi seed cần lệnh rõ ràng, backup, báo diff và kiểm tra nguồn trước khi atomic write.
- Nếu parser không đọc được ngày/mã kỳ/Jackpot/số trúng: trả lỗi parse có cấu trúc, lưu raw response/log để sửa parser; không tự suy ra giá trị.
- UI với trường chưa có dữ liệu phải hiển thị “Chưa xác minh/Chưa có dữ liệu”, không điền giá trị có vẻ thật.

### 1.5 Validator còn chấp nhận bản ghi chưa hợp lệ

Bản trước còn các điểm: `validateMegaDraw()` chưa bắt buộc `drawId`/nguồn; `validatePowerDraw()` có thể chấp nhận thiếu `bonusNumber`; `validateXSMNDraw()` chưa kiểm tra đầy đủ cấu trúc giải.

**Bắt buộc:** tạo schema rõ ràng theo loại dữ liệu, có validate cú pháp, ngữ nghĩa, lịch, quan hệ trường và provenance. Ít nhất phải có các rule:

**Mega 6/45**
- Có ID kỳ, ngày hợp lệ thực sự (`YYYY-MM-DD` và round-trip calendar hợp lệ), 6 số chính nguyên, duy nhất, nằm trong [1,45], ngày khớp lịch quay và ID không xung đột.
- Jackpot và thông tin giải theo schema được nguồn hỗ trợ; không coi thiếu dữ liệu là số 0.

**Power 6/55**
- Có ID kỳ, ngày hợp lệ, đúng 6 số chính duy nhất trong [1,55], có số đặc biệt hợp lệ trong [1,55] và tuân thủ quy tắc quan hệ với số chính do game quy định.
- Jackpot 1/2 phải tách trường, có trạng thái nguồn rõ ràng và không bị hoán đổi.

**XSMN**
- Có ngày, đài, loại giải, đủ cấu trúc kết quả của từng đài/ngày theo quy tắc nguồn, chuỗi kết quả đúng độ dài và chỉ gồm chữ số hợp lệ.
- Không lấy một mảng 18 cặp lô tô lặp lại làm bằng chứng rằng bảng kết quả giải thưởng đầy đủ. Các cặp lô tô có thể lặp là dữ liệu dẫn xuất, cần được tạo từ danh sách kết quả giải gốc và kiểm tra chéo.
- Tên đài phải đúng lịch mở thưởng và không tự điền TP.HCM hoặc đài mặc định.

**Tất cả loại:**
- Reject ngày giả như `2026-99-99`, ngày không tồn tại, ID trùng, ngày/ID không nhất quán, trường bắt buộc thiếu, kiểu dữ liệu sai, số ngoài phạm vi, dữ liệu placeholder `XX`, sai định dạng hoặc provenance bị mất.
- Không tự loại bản ghi lỗi khỏi lịch sử. Gửi bản ghi vào `repair queue` có mã lỗi và bằng chứng; sau khi sửa từ nguồn, bản ghi phải qua validator rồi mới được mark verified.
- Test từng rule với cả fixture hợp lệ và fixture sai tương ứng. Thêm test cho từng lỗi đã từng phát hiện.

## 2. Sửa nguồn dữ liệu — yêu cầu đạt độ khớp lịch sử 100%

### 2.1 Quy trình repair bắt buộc

Với **mọi kỳ dự kiến trong phạm vi công bố**, thực thi chu trình:

1. Liệt kê kỳ cần có dựa trên lịch mở thưởng và phạm vi đã thống nhất.
2. Thu thập nguồn gốc/nguồn đáng tin cậy và lưu bằng chứng có thể kiểm tra.
3. Parse trường dữ liệu và giữ lại raw response.
4. Đối chiếu từng trường bắt buộc, không chỉ đối chiếu vài số bóng.
5. Nếu mismatch: phân loại lỗi, tìm trang nguồn thứ hai hoặc truy xuất lại trang gốc, sửa parser hoặc dữ liệu từ bằng chứng.
6. Re-parse, re-validate, re-compare; ghi lịch sử sửa đổi.
7. Chỉ chuyển thành `verified` khi tất cả trường bắt buộc khớp. Kiểm tra độc lập ngẫu nhiên không thay thế đối chiếu toàn bộ bản ghi.

### 2.2 Cổng kiểm định dữ liệu bắt buộc

Các điều kiện PASS:
- Tỷ lệ kỳ trong phạm vi đã xác minh đầy đủ = **100%**.
- Tỷ lệ trường bắt buộc khớp nguồn = **100%**.
- Kỳ thiếu chưa giải quyết = **0**.
- ID/ngày trùng hoặc mâu thuẫn chưa giải quyết = **0**.
- Trường bắt buộc chưa xác minh = **0**.
- Mismatch nguồn chưa giải quyết = **0**.
- Giá trị bị tự gán/fabricated/defaulted trong lịch sử production = **0**.
- Mọi bản ghi verified truy ngược được tới bằng chứng nguồn.

Không được đổi phạm vi, giảm số kỳ kỳ vọng, bỏ trường bắt buộc hoặc xóa bản ghi để làm các tỷ lệ trên đạt 100%. Nếu tìm thấy bất kỳ kỳ/field nào còn thiếu, tiếp tục repair. Nếu sau khi thử các nguồn hợp lý vẫn không lấy được bằng chứng, kết quả cuối là `BLOCKED` kèm danh sách cụ thể; không tuyên bố PASS hoặc 100%.

### 2.3 Nguồn và xung đột

- Ưu tiên nguồn phát hành chính thức của đơn vị xổ số khi truy cập được; nguồn công bố kết quả có uy tín có thể dùng làm nguồn đối chiếu bổ sung.
- Khi hai nguồn mâu thuẫn, không tự chọn một giá trị theo phỏng đoán. Ghi lại cả hai bằng chứng, truy tìm nguồn có thẩm quyền hơn và xử lý cho đến khi xác định được giá trị chính xác.
- Lưu `sourcePriority`/quy tắc xử lý xung đột trong tài liệu; không giấu mismatch bằng cách sửa raw source.
- Cung cấp báo cáo repair: `recordId`, `date`, `field`, `oldValue`, `newValue`, `evidence`, `source`, `reason`, `verifiedByRule`, `timestamp`.

## 3. Bảo vệ seed và script đồng bộ

- Tạo backup bất biến trước bất kỳ sửa dữ liệu nào; lưu hash trước/sau và diff JSON theo record/field.
- `scripts/generate-seed.js` tuyệt đối không được dùng để tạo lịch sử production ngẫu nhiên. Tách hẳn thành generator fixture trong `test/fixtures/` hoặc đổi tên/cờ rõ ràng; thêm guard để nó không thể ghi vào `data/historical-seed.json`.
- `scripts/build-real-seed.js`, `scripts/crawl-all-history.js`, `scripts/crawl-all-vietlott.js`, mọi parser/extractor và Netlify Function phải có validation trước khi ghi.
- Ghi file mới vào temporary path, chạy strict audit, rồi atomic rename khi pass; nếu fail thì seed chính thức không đổi.
- Thêm test xác nhận crawler/parser khi gặp HTML rỗng, thay đổi cấu trúc, timeout, thiếu Jackpot hoặc sai ngày phải fail có thông báo và không ghi đè seed.
- Chạy lại toàn bộ pipeline không được làm thay đổi giá trị đã xác minh nếu nguồn đầu vào không đổi. Có thể thay đổi `retrievedAt`, nhưng kết quả lịch sử chính phải ổn định.

## 4. Backtest và tính toán thuật toán phải đúng, tái lập được

### 4.1 Xử lý thiếu lịch sử

- Cả 8 thuật toán và Ensemble khi nhận lịch sử rỗng/không đạt minimum window phải trả `insufficient-data` với metadata rõ ràng; không sinh số, không dùng fallback ngẫu nhiên và không trả confidence/score giả.
- Nếu dữ liệu có bản ghi chưa verified hoặc thiếu trường bắt buộc, mặc định không dùng trong đánh giá chính thức; report số bản ghi bị chặn và lý do. Không lén bỏ qua mà vẫn báo mẫu số cũ.
- Với Monte Carlo, chỉ sử dụng RNG có seed được inject trong kiểm thử/tái lập. Khi chạy production có thể lấy seed thực, nhưng phải ghi seed và tham số khi người dùng cần tái lập. Seed không làm mô hình trở nên chính xác hơn về dự báo.

### 4.2 Không rò rỉ dữ liệu tương lai

- Thêm dependency injection/hook để test trực tiếp dữ liệu được truyền cho model trong mỗi fold.
- Với target draw ở ngày `T`, tất cả dữ liệu dùng để tính feature, normalize, chọn tham số, fit trọng số hoặc đưa ra dự đoán phải nằm trước `T`.
- Không chỉ kiểm tra `trainingDataCount < history.length`: assert trực tiếp rằng `max(trainingDate) < targetDate`, không tồn tại `targetDrawId` trong mọi input, và mọi bước fit/normalization cũng chỉ nhìn thấy training fold.
- Thêm kiểm thử sentinel: chèn một giá trị cực đoan chỉ vào draw tương lai; dự đoán cho các target trước draw đó phải không đổi. Nếu kết quả thay đổi thì test phải fail.
- Cắt dữ liệu theo thời gian; tuyệt đối không shuffle lịch sử trước khi chia train/test.

### 4.3 Metric công bằng và thứ hạng thuật toán

- Xóa mọi metric hard-code/default khi chưa có fold. Không có backtest hợp lệ thì hiển thị “Chưa đủ dữ liệu”, không gán baseline 13,3%, 18% hoặc bất kỳ số nào khác như kết quả đo.
- Mỗi thuật toán phải được đánh giá trên cùng danh sách target draws, cùng số lượng số dự đoán, cùng dữ liệu được verify và cùng quy tắc tính hit. Ghi `evaluatedDrawIds`, `nDraws`, `selectionCount`, `metricDefinition` và `baselineMethod`.
- Không trộn Vietlott với XSMN; không trộn xác suất khớp số chính với hit lô tô 2 chữ số hoặc trúng Jackpot trong một metric tùy ý.
- Không dùng “kỷ lục cao nhất”, “số lần trúng Jackpot” hoặc một vài kỳ may mắn làm trọng số bí mật để chọn Top 1.
- Bỏ composite score có trọng số tùy ý, trừ khi công thức được định nghĩa trước, có lý do thống kê, được kiểm định riêng và hiển thị minh bạch. Mặc định xếp theo metric chính đã công bố: Vietlott dùng mean hits của số chính mỗi draw với cùng số lượng pick; XSMN dùng metric hit phù hợp rõ ràng với loại dự đoán; các metric giải thưởng được hiển thị riêng.
- Báo trung bình, độ lệch/độ bất định, sample size và baseline cùng loại. Nếu chưa đủ mẫu hoặc khác biệt không có bằng chứng vững chắc, vẫn có thể hiển thị thứ hạng mô tả theo metric nhưng phải gắn “chưa đủ bằng chứng về lợi thế”; không được diễn giải Top 1 thành chắc chắn thắng hay có xác suất trúng cao hơn.
- Tách model selection/backtest tuning khỏi final holdout. Không dùng cùng các kỳ holdout để chỉnh trọng số rồi lại báo hiệu suất trên chính holdout đó.

## 5. Sửa leaderboard — Top 1 rõ ràng, đúng số liệu

Bản trước `js/ui-controller.js` đọc `item.compositeScore`, trong khi dữ liệu từ `runBatchBacktest()` không tạo trường này; điều đó có thể làm cột điểm hiển thị `undefined`.

**Bắt buộc:**
- Chọn một nguồn dữ liệu canonical cho leaderboard, với schema được định nghĩa và type-check rõ ràng. Không có field được dùng trong UI mà không được tạo bởi engine.
- Sửa mismatch trường; không dùng `|| 0` để che trường thiếu. Nếu field bắt buộc thiếu, log lỗi và test fail.
- Sort giảm dần theo metric chính; tie-breaker được công bố cố định và ổn định. Thêm test với dữ liệu đảo thứ tự, hòa điểm, dữ liệu thiếu metric và hai game khác nhau.
- Top 1 là hàng đứng đầu sau sort thực sự, không phải tên được hard-code. Top badge, tên, điểm, metric, số kỳ test, khoảng thời gian, baseline và trạng thái xác minh phải lấy từ cùng một object.
- Đồng bộ đúng thứ hạng giữa leaderboard, thẻ algorithm, dashboard và export. Không để KPI hiển thị model A trong khi bảng xếp model B ở Top 1.
- Thể hiện “Top 1 theo [metric]” cùng số kỳ đánh giá; không dùng một nhãn “Accuracy” mơ hồ.
- Nếu mọi thuật toán thiếu mẫu hợp lệ, hiển thị trạng thái chưa đủ dữ liệu và không tạo Top 1 giả.
- Kiểm tra cả desktop/mobile: không tràn cột, điểm số không thành `undefined`/`NaN`, nhãn không chồng lấn, sort vẫn đúng sau filter game.

## 6. Test suite bắt buộc cho dữ liệu, parser và validator

Bổ sung test tự động có expected output cụ thể, không chỉ kiểm tra `truthy`:

1. Ngày hợp lệ, ngày sai format, `2026-99-99`, ngày 29/02 năm nhuận và không nhuận.
2. Thiếu ID, ID trùng, ID đúng nhưng ngày sai, ngày đúng nhưng sai lịch quay, kỳ bị thiếu giữa hai ID.
3. Số bóng chính thiếu/thừa/trùng/ngoài phạm vi/không nguyên/string; số đặc biệt thiếu/trùng/ngoài phạm vi.
4. Jackpot thiếu/null/0/thông thường/đơn vị sai/đảo Jackpot 1 và Jackpot 2.
5. XSMN thiếu giải, thiếu đài, đài không có trong lịch, cặp chứa `XX`, chuỗi quá ngắn/quá dài, dữ liệu lô tô không khớp kết quả giải gốc.
6. HTML source rỗng, selector thay đổi, trang trả lỗi, timeout, encoding tiếng Việt, dữ liệu có nhiều kỳ trong trang, kỳ trùng giữa 2 nguồn và xung đột giữa 2 nguồn.
7. Reconciliation không được đánh `verified` nếu còn một mandatory field mismatch.
8. Crawler không được ghi đè seed khi audit fail.
9. Idempotency: chạy cùng input hai lần phải cho cùng historical records và thứ tự records.
10. Property-based/fuzz testing cho ngày, số bóng, giải thưởng và malformed HTML; nếu không có thư viện fuzz hiện hữu, viết vòng generate deterministic từ seed và ghi seed lỗi để tái lập.

Mỗi test lỗi cần có assertion rằng báo cáo nêu đúng record/field bị lỗi; không chỉ assert `result === false`.

## 7. Test suite thuật toán — bắt buộc chạy vòng lặp

Có 8 module thuật toán hiện có: `association-rules`, `clustering`, `ensemble`, `frequency-gap`, `markov`, `monte-carlo`, `moving-average`, `poisson`.

Với **mỗi thuật toán và Ensemble**, chạy matrix tối thiểu:
- Dữ liệu rỗng.
- Dữ liệu dưới minimum window.
- Lịch sử hợp lệ đủ mẫu.
- Lịch sử có record sai/unverified.
- Ngày thiếu hoặc kỳ bị ngắt.
- Một draw tương lai được cố ý chèn vào để test leakage.
- Input giống nhau chạy lặp lại với seed cố định.
- Ranh giới nhỏ nhất/lớn nhất của game.
- Bất kỳ số dự đoán nào cũng phải trong phạm vi hợp lệ và unique đối với Vietlott.
- Output có đúng số lượng picks theo contract, score hữu hạn, không có `NaN`, `Infinity`, `undefined`.
- Với XSMN, sampling/evaluation phải cho phép cặp lặp khi phương pháp mô phỏng đúng cơ chế lô tô; không áp quy tắc Vietlott một cách máy móc.
- Trọng số Ensemble phải có tổng và semantics đúng, normalization chỉ fit từ training fold, kết quả xếp hạng ổn định với input/seed cố định.
- So sánh từng thuật toán với baseline trên cùng exact folds, ghi raw outcome từng draw; không chỉ so sánh số trung bình cuối cùng.

**Vòng kiểm thử hồi quy:** chạy ít nhất 3 lượt liên tiếp toàn suite bằng cùng seed, cùng dữ liệu và cùng browser configuration. Kết quả deterministic phải bằng nhau giữa các lượt; phần ngẫu nhiên không deterministic phải được kiểm tra bằng quy luật phân phối/biên độ đã đặt trước, không đòi output trùng giả tạo.

Bắt buộc lưu artifact: log từng fold, prediction, actual result, hit count, metric, baseline, seed, config hash và thời gian chạy. Không ghi đè kết quả cũ; lưu theo timestamp/version để so sánh.

## 8. Kiểm thử giao diện trên browser thật

Các test DOM giả hiện tại không thay thế kiểm thử trình duyệt. Bắt buộc chạy website trên browser thật (Playwright hoặc công cụ tương đương). Nếu runner thiếu browser, cài đặt/cấu hình test phù hợp và ghi command trong README.

### Viewport tối thiểu
- Desktop: `1440x900`.
- Tablet: `768x1024`.
- Mobile: `390x844` và `360x800`.

### Luồng bắt buộc
1. Tải trang mới, không có lỗi console/error request quan trọng.
2. Khu vực kết quả: lọc game/ngày, mở chi tiết kỳ, dữ liệu hiển thị phải khớp seed đã xác minh.
3. Khu vực dự đoán: chọn game/thuật toán, thiếu lịch sử thì hiện trạng thái rõ ràng, không hiển thị số giả.
4. Dashboard: mọi KPI tính từ dữ liệu thực; không có số hard-code hoặc mặc định giả.
5. Backtest: chạy/đổi bộ lọc, xem số kỳ và metric; không hiển thị baseline giả khi chưa có fold.
6. Leaderboard: sort theo metric và đổi game; Top 1, badge, metric, sample size, thời gian đánh giá phải nhất quán; không có `undefined`, `NaN`.
7. Responsive: không có horizontal overflow ngoài thành phần có chủ ý; không cắt nút, tiêu đề, bảng hay tooltip quan trọng.
8. Navigation và thao tác dùng được bằng chuột và bàn phím; focus nhìn thấy; các nút có tên truy cập và không phải link `#` giả.
9. Chụp screenshot trước/sau cho 5 màn hình: results, predict, dashboard, backtest, leaderboard; lưu cùng artifacts test.
10. Console, network errors, unhandled rejection và JavaScript exception phải bằng 0 cho các luồng cốt lõi. Nếu lỗi bên ngoài không do app, cần chứng minh và ghi riêng, không bỏ qua âm thầm.

Browser test phải assert nội dung thực tế, không chỉ kiểm tra selector tồn tại. Ví dụ: so sánh sáu số hiển thị với fixture kết quả đã xác minh; kiểm tra dòng đầu tiên leaderboard thực sự có metric cao nhất.

## 9. Tổ chức lệnh test và cổng release

Cập nhật `package.json` để các script có ý nghĩa đúng; hiện `test:unit` và `test:integration` cùng gọi `test/run-tests.js`, vì vậy chưa được xem là hai lớp test độc lập nếu chưa tách rõ.

Tạo các lệnh tương ứng (đổi tên phù hợp với project nhưng phải chạy thực):
- `npm run test:unit` — unit tests parser, validator, algorithms, ranking.
- `npm run test:integration` — crawl/parse/merge/backtest integration với fixtures nguồn.
- `npm run audit:history -- --strict` — đối chiếu phạm vi đầy đủ và nguồn; fail-close.
- `npm run test:e2e` — browser tests thật cho UI.
- `npm run test:all` — chạy tất cả bước trên, dừng khi bất kỳ bước nào fail.

**Release gate bắt buộc:**
1. `npm run test:unit` PASS.
2. `npm run test:integration` PASS.
3. Strict history audit PASS với bằng chứng thật, không hard-code.
4. `npm run test:e2e` PASS trên toàn bộ viewport/flow yêu cầu.
5. Chạy test:all **3 lần liên tiếp**; không có test flake, regression, console exception hoặc thay đổi dữ liệu ngoài dự kiến.
6. Kiểm tra lại toàn bộ mục trong `fix-1.md`, `fix-2.md`, `fix-3.md` bằng checklist; mỗi mục phải dẫn đến test/log/artifact xác thực.
7. Test fail phải trả exit code khác 0; CI/local command không được swallow lỗi.
8. Nếu bất kỳ gate nào chưa đạt, phiên bản chưa PASS. Không thay đổi scope, giảm kỳ vọng hay tắt test để qua cổng.

## 10. Báo cáo cuối bắt buộc

Tạo `reports/fix-3-verification.md` và các artifacts cần thiết. Báo cáo phải chứa:
- Git diff/file thay đổi (nếu có Git), backup/hash seed trước-sau.
- Số kỳ kỳ vọng, số kỳ có, số kỳ verified, số kỳ đã sửa, số kỳ đang repair, số kỳ/field bị chặn; tách theo Mega/Power/từng đài XSMN.
- Coverage theo **manifest độc lập**, không dựa riêng vào seed.
- Kết quả so sánh từng trường và nguồn đối chiếu; các mismatch trước/sau.
- Liệt kê mọi default/fallback/mock còn lại và bằng chứng tại sao an toàn; không được chỉ báo “đã grep”.
- Kết quả test của 8 thuật toán, backtest leakage, baseline, deterministic repeats và browser test.
- Screenshot desktop/tablet/mobile.
- Bảng leaderboard được render thực tế với metric và sample size; kiểm tra xác nhận thứ tự đúng.
- Mỗi acceptance criterion: `PASS` kèm evidence path/test name, hoặc `FAIL/BLOCKED` kèm lý do và bản ghi cụ thể.
- Nêu rõ phần chưa làm, không giả vờ hoàn tất.

## 11. Checklist nghiệm thu bắt buộc

Chỉ công bố **PASS** khi TẤT CẢ điều kiện dưới đây đều đúng:

- [ ] Không còn audit metric hard-code hoặc report tự tuyên bố 100%.
- [ ] Manifest phản ánh phạm vi lịch sử đã kiểm chứng độc lập.
- [ ] Toàn bộ kỳ trong phạm vi có mặt; không còn kỳ hoặc trường bắt buộc chưa xác minh.
- [ ] Tất cả bản ghi lịch sử bắt buộc khớp nguồn 100%; repair xong, không bỏ record.
- [ ] Không còn giá trị lịch sử giả/default hoặc đường ghi seed bằng dữ liệu demo.
- [ ] Mỗi bản ghi truy nguyên được về bằng chứng nguồn.
- [ ] Validator xác nhận đúng semantics của từng game/đài/giải.
- [ ] Tất cả 8 thuật toán và Ensemble fail-safe khi thiếu dữ liệu; không phát ra dự đoán giả.
- [ ] Không phát hiện lookahead leakage bằng test trực tiếp và sentinel test.
- [ ] Metric/backtest/baseline được tính thật trên cùng folds, không hard-code.
- [ ] Leaderboard hiển thị Top 1 theo metric đã công bố, score có thật và đồng bộ mọi màn hình.
- [ ] Browser test thật đạt mọi flow và viewport; screenshot được lưu.
- [ ] Ba vòng chạy toàn suite liên tiếp đều pass.
- [ ] Báo cáo cuối có thể tái lập và tất cả kết luận có bằng chứng.

### Quy tắc trạng thái cuối

- Nếu tất cả checkbox trên đạt: `PASS — FIX-3 VERIFIED`.
- Nếu còn bất kỳ dữ liệu lịch sử cần thiết chưa được xác minh hoặc gate kỹ thuật/test còn fail: `BLOCKED — NOT VERIFIED`, liệt kê từng record/field/test còn lại và tiếp tục sửa; không được tuyên bố đã đáp ứng 100%.

## 12. Chỉ thị cho coding agent

Bắt đầu triển khai ngay trên source code, không dừng sau khi lập kế hoạch. Xử lý blocker P0 trước, sau đó lần lượt P1/P2. Khi phát hiện thêm lỗi mới, bổ sung vào checklist và xử lý luôn nếu thuộc phạm vi. Sau mỗi nhóm sửa: chạy test liên quan, xem diff, kiểm tra không làm mất dữ liệu, rồi chạy regression. Không dừng ở việc tạo tài liệu, mockup hay test giả. Mục tiêu cuối là dữ liệu lịch sử đúng, luồng thuật toán minh bạch, backtest không rò rỉ, leaderboard chính xác và giao diện được kiểm tra thật trên browser.
