# FIX-7 — Independent History Verification, Audit Integrity & Strict Release Gates

> **Mục tiêu:** xử lý triệt để các lỗi còn mở được ghi nhận khi kiểm tra `xo-so(9).rar`: reference dữ liệu được tạo bằng cách sao chép seed rồi tự gắn `verified`; audit có thể báo 100% dù giá trị hợp lệ nhưng sai nguồn; hash log bị tính trước khi log hoàn tất; một số công thức thuật toán chưa có expected-value tests độc lập; và E2E chưa kiểm chứng đầy đủ tương tác thực tế.
>
> **Đây là lệnh thực thi, không phải tài liệu tư vấn.** Phải sửa trực tiếp source code, tạo test tái hiện lỗi, chạy test sau sửa, kiểm tra ngược và chỉ chuyển phase khi gate đạt. Không được chỉ sửa báo cáo, đổi nhãn, giảm phạm vi kiểm tra hoặc tuyên bố PASS bằng lời.

---

## 0. Quy tắc không thể bỏ qua

1. Đọc `fix-1.md` đến `fix-7.md`, source code hiện tại, `package.json`, tất cả script audit/ingest/backtest/gate-runner và báo cáo của lần chạy gần nhất. Không mặc định source hiện tại giống phiên bản trong báo cáo cũ.
2. Trước khi sửa, tạo bản sao an toàn hoặc nhánh Git và ghi lại `git diff`/hash đầu vào. Không thay thế hay làm sạch `historical-seed.json` theo cách phá hủy. Không chạy các script tạo dữ liệu giả lên file seed chính thức.
3. Với **mỗi lỗi**, phải làm theo trình tự bắt buộc:
   - ghi mã lỗi và nguyên nhân giả định;
   - tạo test tái hiện lỗi trên fixture riêng;
   - chạy test trước sửa và chứng minh test thất bại đúng vì lỗi cần xử lý;
   - sửa nguyên nhân gốc;
   - chạy lại test tái hiện và xác nhận PASS;
   - chạy toàn bộ regression suite liên quan;
   - thực hiện negative/mutation test để chứng minh lỗi tương tự không lọt qua;
   - lưu log, diff, exit code và bằng chứng vào thư mục run mới.
4. **Không được sang gate tiếp theo nếu gate hiện tại là FAIL, ERROR, SKIPPED hoặc thiếu evidence.** `BLOCKED` không phải PASS. Nếu một điều kiện bên ngoài ngăn xác minh (nguồn không truy cập được, không có browser, nguồn mâu thuẫn), phải dừng và báo chính xác phần bị chặn; không làm giả evidence.
5. Cấm các cách “làm cho test xanh” sau đây: sửa expected value để khớp code sai; giảm mẫu số; bỏ bản ghi; bỏ qua test; bắt lỗi rồi vẫn trả exit code 0; dùng fixture lỗi làm báo cáo chính thức; dùng screenshot cũ; tự gán `verified`; tự bịa kết quả; đổi tiêu chí sau khi thấy kết quả.
6. Mọi thay đổi phải giữ nguyên nguồn dữ liệu gốc. Bản sửa dữ liệu phải có before/after diff, nguồn chứng minh, người/tiến trình sửa, thời điểm thực tế, lý do và kết quả xác minh.
7. Tách biệt 3 kết luận:
   - **Structurally valid:** dữ liệu đúng schema/range.
   - **Source-verified:** giá trị đã đối chiếu bằng chứng độc lập.
   - **Model validated:** thuật toán đã được kiểm tra logic và hiệu năng theo protocol công bố.
   Không được suy ra một loại xác nhận từ loại khác.

## 1. P0 — Reference lịch sử phải độc lập với seed

### Vấn đề cần loại bỏ

Không được tạo `canonical-reference.json` bằng cách sao chép `historical-seed.json` rồi thêm `verificationStatus: "verified"`. Cách đó chỉ kiểm tra seed có bị thay đổi so với bản copy hay không; nó không chứng minh bản copy đúng với kết quả công bố.

### Việc phải triển khai

1. Audit và sửa `scripts/build-reference-dataset.js`, `scripts/reconcile-and-enrich-seed.js` cùng mọi helper liên quan.
2. Tách rõ các đối tượng:
   - `historical-seed.json`: dữ liệu ứng dụng đang dùng;
   - `source-evidence/`: payload/raw snapshot hoặc bằng chứng bất biến thu được từ nguồn;
   - `canonical-reference.json`: record chuẩn được tạo **từ evidence đã xác thực**, không được tạo từ seed;
   - `audit-report.json`: kết quả so sánh seed với reference, không phải nguồn chuẩn.
3. Với từng kỳ và từng trường bắt buộc, evidence tối thiểu phải lưu:
   - loại trò chơi/đài;
   - ngày quay và mã kỳ nếu nguồn có mã kỳ;
   - số trúng chính theo thứ tự chuẩn hóa đã được quy định;
   - số đặc biệt/bonus nếu áp dụng;
   - toàn bộ giải thưởng hoặc trường Jackpot cần quản lý;
   - URL nguồn chính xác;
   - tên nguồn/đơn vị công bố;
   - thời điểm truy xuất **thực tế**, không có timestamp mặc định;
   - HTTP/status hoặc trạng thái lấy dữ liệu;
   - raw payload hoặc snapshot đã lưu bất biến;
   - SHA-256 của raw payload;
   - phiên bản parser và phiên bản schema;
   - trường nào được nguồn đó chứng minh;
   - trạng thái `verified`, `mismatch`, `unavailable`, `source-conflict` hoặc `needs-review`.
4. Chỉ được đặt `verified` khi nguồn evidence đã được lấy thành công, parse hợp lệ và các trường cần xác minh đã so sánh bằng giá trị thực. URL có mặt, HTTP 200 đơn thuần hoặc giá trị không rỗng **không đủ** để đánh dấu `verified`.
5. Với nguồn không còn truy cập được, dùng snapshot/raw record có nguồn gốc đã lưu và hash được xác minh; nếu không có evidence độc lập đáng tin cậy thì trạng thái phải là `BLOCKED`/`unverified`, không tự dựng reference từ seed.
6. Nếu hai nguồn mâu thuẫn, ghi lại cả hai bằng chứng và không tự lựa chọn theo suy đoán. Đánh dấu `source-conflict`, tìm nguồn công bố gốc hoặc báo `BLOCKED` cho kỳ/trường đó.
7. Không được bỏ record có vấn đề để đạt 100%. Giữ nguyên record, đính kèm trạng thái và repair ticket; sau khi truy tìm được bằng chứng thì sửa bằng một thao tác có audit trail.
8. Với trường Jackpot hoặc giải thưởng không có trong nguồn đang dùng, không tự điền số 0, số tròn, giá trị trước đó hay giá trị mặc định. Dùng trạng thái thiếu/chưa xác minh theo schema; chỉ đánh dấu hoàn tất khi có bằng chứng thích hợp.

### Gate A — kiểm tra độc lập của reference

Tạo test chứng minh tất cả điều kiện sau:

- Xóa/đổi `historical-seed.json` không được làm thay đổi giá trị trong canonical reference đã có evidence.
- Build reference không đọc seed làm nguồn sự thật; chỉ đọc source evidence đã xác minh.
- Thiếu source payload, payload hash sai, URL không lấy được, parse không thành công hoặc trường bắt buộc không khớp → gate thất bại hoặc record có trạng thái chưa xác minh; tuyệt đối không `verified`.
- Thay đổi đúng một số trúng từ giá trị hợp lệ này sang giá trị hợp lệ khác phải được phát hiện khi seed được so sánh với reference độc lập.
- Thay đổi ngày quay, mã kỳ, bonus number, Jackpot và từng trường giải XSMN đều có mutation test riêng.
- Kiểm tra tính đầy đủ theo lịch quay và phạm vi manifest; không chỉ so sánh số lượng record.

Không dùng cùng một hàm parser/chuẩn hóa để vừa tạo reference vừa xác minh reference mà không có kiểm tra độc lập, vì cùng một bug có thể xuất hiện ở cả hai phía.

## 2. P0 — Audit phải so sánh từng giá trị, không chỉ kiểm tra có dữ liệu

### Bắt buộc sửa

1. Sửa `scripts/audit-history.js` và các schema/validator được gọi để so sánh thực tế:
   - key định danh kỳ;
   - ngày quay và ngày mục tiêu;
   - từng số trúng chính;
   - bonus/số đặc biệt;
   - từng giải/Jackpot theo định nghĩa trò chơi;
   - tên đài và thứ tự/nhóm giải XSMN;
   - các metadata nguồn và hash evidence.
2. Báo cáo phải có số đếm nguyên, không dựa vào phần trăm làm tròn để quyết định đạt:
   - `totalRequiredComparisons`;
   - `matchedComparisons`;
   - `mismatchedComparisons`;
   - `unverifiedComparisons`;
   - `missingEvidenceCount`;
   - `sourceConflictCount`;
   - `missingExpectedDraws`;
   - `unexpectedDraws`.
3. Nếu `mismatchedComparisons > 0`, `unverifiedComparisons > 0`, có thiếu kỳ dự kiến hoặc xung đột chưa xử lý, audit không được báo “verified 100%”. Trong strict mode, phải trả non-zero exit code.
4. Chỉ được báo `100%` nếu số so sánh bắt buộc đã hoàn tất và `matchedComparisons === totalRequiredComparisons`, đồng thời tất cả số liệu về missing/unverified/conflicts đều bằng 0. Không làm tròn 99.996% thành 100%.
5. Không gán sẵn `requiredFieldSourceMatch`, `inventedOrDefaultedValues`, `verificationStatus`, `retrievedAt` hay kết quả PASS. Mọi field trong report phải truy ngược được đến kết quả thực tính ra.
6. Không kiểm tra `sourceUrl` bằng cách chỉ tìm chuỗi tên miền. Phải liên kết URL với evidence cụ thể, hash snapshot và những trường nó chứng minh.
7. Các test phải chạy audit trên thư mục fixture riêng; tuyệt đối không ghi đè `data/audit-report.json` chính thức.

### Gate B — mutation test audit

Bắt buộc thực hiện các lỗi sau, mỗi lỗi riêng biệt, trên temporary copy:

- thay số trúng bằng một số khác vẫn nằm trong miền hợp lệ;
- thay thứ tự số khi thứ tự có ý nghĩa hoặc chuẩn hóa sai theo quy tắc của game;
- thay ngày bằng một ngày lịch hợp lệ nhưng không đúng kỳ;
- thay mã kỳ bằng mã hợp lệ nhưng thuộc kỳ khác;
- thay số đặc biệt/bonus bằng số hợp lệ nhưng sai;
- thay Jackpot bằng giá trị dương hợp lệ nhưng sai;
- thay ít nhất một trường giải thưởng của XSMN;
- thay `sourceUrl` sang URL khác cùng domain nhưng không phải trang của kỳ đó;
- sửa raw payload mà giữ nguyên hash khai báo;
- giữ nguyên seed nhưng xóa source evidence;
- đưa kỳ trùng, kỳ thiếu hoặc kỳ ngoài phạm vi manifest.

**Kỳ vọng:** mọi mutation làm thay đổi một trường bắt buộc phải khiến audit báo mismatch/unverified và strict exit code khác 0. Sau test, hash và nội dung của seed, manifest, reference, audit report chính thức phải còn nguyên.

## 3. P0 — Sửa quy trình ingestion/reconciliation không được tự gán trạng thái xác minh

1. Rà toàn bộ `scripts/*seed*`, `scripts/*history*`, `scripts/*crawl*`, `scripts/reconcile-and-enrich-seed.js`, `js/data-service.js` và mọi lệnh ghi vào seed.
2. Không được tự sinh mã kỳ từ ngày, gán ngày mặc định, gán Jackpot mặc định, tự tạo số trúng hay gán `verificationStatus: "verified"` khi nguồn chưa được kiểm tra.
3. Nếu parser không lấy đủ trường: giữ raw evidence, ghi lỗi parser có cấu trúc và đưa record vào repair queue. Không âm thầm bỏ record hoặc viết giá trị phỏng đoán vào seed.
4. Các script tạo dữ liệu demo/test phải dùng file fixture tách biệt, tên rõ `synthetic`/`fixture`, và bị chặn không cho ghi vào đường dẫn seed production.
5. Trước khi ghi file chính thức, tạo backup, so sánh diff và xác minh không có record bị xóa ngoài chủ đích. Ghi file theo kiểu atomic write; nếu xác minh sau ghi thất bại thì restore backup và trả exit code khác 0.
6. Thêm test ngăn script dữ liệu giả ghi đè seed production; test phải chứng minh hash seed không đổi.

### Gate C — ingestion và repair

- Mất kết nối nguồn: không có record giả, không tự đánh `verified`, exit code phải thể hiện partial/blocked.
- HTML/API đổi cấu trúc: parser fail rõ ràng, raw payload được giữ; không dùng fallback đoán giá trị.
- Có record sai nhưng tìm được nguồn: sửa đúng trường có bằng chứng và lưu before/after audit trail.
- Có record chưa tìm được nguồn: giữ nguyên record để điều tra, trạng thái chưa xác minh, không tuyên bố hoàn tất.

## 4. P0 — Sửa tính toàn vẹn SHA-256 của log và artifact

### Lỗi phải loại bỏ

Không được tính hash `run-1.log` rồi tiếp tục append Gate K/L vào chính file đó, vì hash không còn khớp file cuối cùng.

### Bắt buộc thiết kế lại

1. Mỗi lần chạy tạo thư mục riêng, ví dụ:
   `reports/fix7/runs/<run-id>/`
2. Log gốc của từng gate phải bất biến sau khi gate kết thúc. Nếu cần ghi summary, ghi vào `summary.json`/`summary.log` riêng; không append vào log đã hash.
3. Trình tự mỗi run:
   - tạo `run-id` mới;
   - ghi `run-status.json` là `RUNNING` với timestamp thật;
   - ghi log và artifact riêng cho từng gate;
   - kết thúc từng gate, đóng file log và tính SHA-256 từ chính file cuối;
   - tạo manifest artifact chứa đường dẫn tương đối, kích thước, hash, exit code và trạng thái;
   - xác minh lại toàn bộ hash từ manifest;
   - chỉ sau đó mới ghi `run-status.json` cuối cùng là `PASS`, `FAIL` hoặc `BLOCKED`.
4. Không dùng lại `gate-results.json` hoặc screenshot của lần chạy trước. Mỗi run phải có run ID; nếu run hiện tại lỗi giữa chừng, trạng thái vẫn phải được ghi rõ và không được trỏ sang artifact cũ.
5. Nếu tiến trình bị kill/timeout, `run-status.json` phải còn ở trạng thái `RUNNING` hoặc được chuyển thành `FAIL/INTERRUPTED` bởi xử lý dọn dẹp; không được hiểu là PASS. Khi bắt đầu run mới, phát hiện và đánh dấu run trước không hoàn tất.
6. Hash phải tính sau khi file được đóng và mọi nội dung đã ghi xong. Không chỉnh sửa log sau khi hash trừ khi tính lại manifest hoàn chỉnh.
7. Các báo cáo tổng hợp phải dẫn đến đúng run ID, đúng log và đúng hash; report không được lấy dữ liệu từ lần chạy trước.

### Gate D — mutation test hash/artifact

- Thêm một byte vào log sau khi manifest tạo → verify-artifacts phải FAIL.
- Thay screenshot cũ bằng screenshot từ run trước → phải FAIL.
- Xóa log hoặc screenshot được khai báo → phải FAIL.
- Khai báo hash sai → phải FAIL.
- Dừng runner giữa gate → run không được ghi PASS.
- Chạy fixture → không được thay đổi hash file chính thức.

## 5. P1 — Expected-value tests độc lập cho từng thuật toán

Đừng chỉ test “có đúng 6 số”, “score là số” hoặc “không crash”. Mỗi thuật toán phải có fixture nhỏ, kết quả kỳ vọng được tính độc lập bằng tay hoặc script tham chiếu riêng, và test kiểm tra đúng thứ tự/score/kết quả theo định nghĩa đã công bố.

Bắt buộc tạo expected-value tests cho:

1. **Tần suất/chu kỳ:** đếm chính xác cửa sổ, mẫu số, tần suất và cách xử lý số chưa từng xuất hiện.
2. **Markov:** transition counts/probabilities từ fixture nhỏ có thể kiểm tra bằng tay; xác minh đúng bậc được công bố.
3. **Poisson:** lambda, xác suất và score theo công thức được chọn; xác minh cách xử lý dữ liệu đếm và giới hạn mô hình.
4. **Monte Carlo:** sample space phù hợp từng game, seed tái lập, thống kê mô phỏng có expected range theo fixture; không áp quy tắc không trùng cho 18 cặp lô XSMN nếu cơ chế dữ liệu cho phép lặp.
5. **EMA/moving average:** tính tay các giá trị trong chuỗi ngắn, kiểm tra alpha/window và ngày quay mục tiêu theo lịch thực.
6. **Association Rules/Bạc Nhớ:** support, confidence, lift từ bảng nhỏ đã biết chính xác; mẫu số phải nhất quán và không dùng dữ liệu tương lai cho dự đoán quá khứ.
7. **Clustering/structural features:** nếu tên là K-Means thì test bước gán cụm, centroid update và điều kiện dừng; nếu code chỉ là heuristic, đổi tên mô hình và tài liệu cho đúng cách triển khai.
8. **Ensemble:** kiểm tra chuẩn hóa score, weight, tie-break, consensus và kết quả cuối; thêm test cho model thiếu đầu ra, score NaN, thang điểm không đồng nhất và tie.

Bổ sung các test chung:

- dữ liệu rỗng/thiếu/malformed → `insufficient-data` hoặc lỗi rõ ràng, không sinh dự đoán ngẫu nhiên giả;
- hoán đổi thứ tự record đầu vào không làm đổi kết quả nếu thuật toán được thiết kế order-invariant;
- thay đổi dữ liệu sau ngày mục tiêu không được làm thay đổi dự đoán quá khứ;
- cùng input/config/seed cho kết quả giống nhau;
- không `NaN`, `Infinity`, `undefined` hoặc xác suất ngoài miền;
- mỗi loại trò chơi có schema và sample space riêng;
- test chống lookahead phải kiểm tra trực tiếp dữ liệu đầu vào của model ở từng fold.

### Gate E — thuật toán

Không cho Gate E PASS nếu bất kỳ thuật toán nào chỉ được kiểm tra bằng hình dạng output mà thiếu ít nhất một expected-value test có khả năng phân biệt kết quả đúng và sai. Tài liệu phải nêu công thức thực thi, đầu vào, đầu ra, giả định và giới hạn. Không được quảng bá metric là xác suất trúng nếu chưa có hiệu chuẩn xác suất hợp lệ.

## 6. P1 — Backtest và random baseline phải công bằng, tái lập được

1. Mọi thuật toán phải được đánh giá trên cùng tập target draws trong mỗi fold, với cùng định nghĩa prediction budget.
2. Baseline ngẫu nhiên phải chạy nhiều replicate có seed được ghi lại. Tính mean, median, độ lệch chuẩn và interval/quantile đã định nghĩa; không dùng một mẫu ngẫu nhiên duy nhất để đại diện cho baseline.
3. Baseline phải dùng cùng luật trò chơi, số lượng số dự đoán, kỳ kiểm định và cách tính hit rate với thuật toán được đánh giá.
4. Phân biệt rõ training window, số kỳ train thực, ngày đầu/cuối train, target date, test window và số fold hợp lệ. Nếu giới hạn 100 kỳ hoặc một cửa sổ khác, phải khai báo rõ và không mô tả là toàn bộ lịch sử.
5. Xếp hạng Top 1 theo metric chính đã công bố trước khi chạy. Chỉ dùng tie-break đã ghi trong cấu hình; không điều chỉnh trọng số sau khi thấy kết quả.
6. Báo cáo confidence interval hoặc kiểm định thống kê thích hợp khi so sánh với baseline; nếu mẫu nhỏ, ghi rõ “chưa đủ bằng chứng” thay vì tuyên bố mô hình tốt hơn ngẫu nhiên.
7. Không coi kết quả backtest quá khứ là bảo đảm dự đoán tương lai. Không hứa độ chính xác 100% cho kết quả xổ số tương lai.

### Gate F — backtest

- Cùng một cấu hình/seed → cùng kết quả.
- Không có target/future record trong input từng fold.
- Không bỏ fold thất bại âm thầm; phải báo số kỳ kỳ vọng, kỳ thực tế, kỳ bị loại và lý do.
- Mutation chèn một kỳ tương lai với giá trị cực đoan không được ảnh hưởng dự đoán của fold quá khứ.
- Leaderboard phải có sample size và metric đi cùng rank; không đủ mẫu thì không dựng Top 1 giả.

## 7. P1 — Cache phải phụ thuộc vào nội dung input

1. Thêm content hash của dataset/record set vào cache key canonical prediction, cùng với game/đài, target date, model version, config/weights version, schema version và seed nếu có.
2. Nếu một record lịch sử cũ thay đổi nhưng latest date giữ nguyên, cache key phải thay đổi và dự đoán phải được tính lại.
3. Không dùng cached prediction nếu hash input hiện tại không trùng hash lúc tạo cache.
4. Ghi metadata nguồn của prediction: dataset hash, model version, config hash, target date và thời gian tạo.

### Gate G — cache

Test bắt buộc: tính dự đoán → thay một số trong record lịch sử cũ trên fixture → giữ nguyên ngày mới nhất → gọi lại → xác minh cache miss/recompute và hash mới. Kiểm tra thêm thay đổi config, algorithm version và target date.

## 8. P1 — E2E trình duyệt và giao diện phải kiểm thử thực

1. Browser phải được tìm theo `CHROME_BIN`/`CHROMIUM_BIN` và các đường dẫn phù hợp hệ điều hành. Không có browser thì `BLOCKED` hoặc FAIL, không được bỏ qua rồi in PASS.
2. Server phải được runner tự khởi động, health-check, và được dọn dẹp bằng `finally`/trap kể cả khi test fail/timeout.
3. Screenshot phải mới tạo trong run hiện tại, nằm trong thư mục run mới, có exit code của browser bằng 0 và kích thước hợp lệ. Không được dùng ảnh cũ làm bằng chứng.
4. Kiểm tra thật các luồng: chọn game/đài, chạy dự đoán, đồng bộ Hero và Ensemble, xem dashboard, chạy backtest, đổi metric/phạm vi và sort leaderboard.
5. Kiểm tra không có `undefined`, `NaN`, lỗi console, lỗi request quan trọng, số dự đoán không đồng nhất giữa các component cùng prediction ID, và tràn ngang viewport 360×800, 768×1024, 1440×900.
6. Kiểm tra Top 1 trong bảng và các KPI dùng cùng phạm vi/metric; thông tin đồng thuận phải được ghi rõ không phải xác suất trúng.
7. Tạo ảnh baseline/candidate và báo cáo sai khác. Nếu không có visual diff tooling thì ít nhất phải có screenshot mới + kiểm tra bounding boxes/scrollWidth/clientWidth + console/network assertion; nêu rõ giới hạn, không gọi là full visual regression nếu không so sánh ảnh.

### Gate H — E2E/UI

Gate không được PASS nếu browser không thực sự khởi chạy, bất kỳ tương tác bắt buộc nào không được thực hiện, screenshot không thuộc run hiện tại, hoặc kiểm tra overflow/console chưa chạy. Timeout phải hủy tiến trình và ghi trạng thái FAIL với nguyên nhân.

## 9. P0 — Runner, artifact và báo cáo phải fail-closed

1. `npm run verify:strict` phải khởi tạo run ID mới cho mỗi lần gọi; không được đọc nhầm `gate-results.json` của lần trước.
2. Ghi trạng thái `RUNNING` ngay từ đầu. Mỗi gate có `startedAt`, `finishedAt`, `status`, `exitCode`, `command`, `logPath`, `logSha256`, `artifactPaths`, `artifactHashes` và `evidenceSummary`.
3. Gate tiếp theo chỉ được bắt đầu khi gate trước đã đạt và evidence đã được xác minh. `SKIPPED`, `NOT_RUN`, timeout, missing artifact hoặc parse error đều không tương đương PASS.
4. Khi log đã đóng, mới tính hash. Không append bất cứ thứ gì vào log đã hash; summary/hash manifest đặt ở file riêng.
5. Thực hiện verify-artifacts sau khi tạo xong mọi file. Tự đối chiếu hash từ disk, không chỉ so sánh metadata trong bộ nhớ.
6. Exit code cuối cùng khác 0 khi có gate FAIL/ERROR/BLOCKED, hash mismatch, thiếu evidence, test bị skip ngoài allowlist hoặc report không nhất quán. Nếu có trạng thái BLOCKED vì nguồn/môi trường, pipeline không được công nhận release PASS.
7. Gate runner phải có self-tests: buộc một gate thất bại; bắt browser timeout; xóa screenshot; sửa một byte log; dùng report cũ; thiếu gate result; sửa exit code. Trong mọi trường hợp, runner phải dừng hoặc trả non-zero và không thể phát ra release PASS.
8. Mỗi lần chạy ba lần liên tiếp phải dùng ba run ID, ba bộ log/artifact riêng. Nếu một lần thất bại, sửa nguyên nhân rồi chạy lại chuỗi đủ ba lần; không được gộp hai PASS và một FAIL để tuyên bố đạt.

## 10. Lệnh/đầu ra bắt buộc

Tạo hoặc cập nhật tối thiểu các script (dùng tên hiện có nếu dự án đã có chức năng tương đương):

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run audit:history:strict`
- `npm run verify:artifacts`
- `npm run verify:strict`

Không tạo script giả chỉ in `PASS`. Mỗi script phải gọi test thật và trả exit code tương ứng.

Mỗi run phải sinh tối thiểu:

- `reports/fix7/runs/<run-id>/run-status.json`
- `reports/fix7/runs/<run-id>/gate-results.json`
- log riêng cho mỗi gate;
- artifact/screenshot mới của chính run;
- manifest SHA-256 được tái xác minh;
- report mismatch/unverified/source conflicts;
- diff dữ liệu nếu có sửa record;
- report thuật toán/backtest và sample size.

Tạo `reports/fix7/verification-report.md` bằng dữ liệu đọc từ artifact đã kiểm chứng; không gõ tay kết quả PASS để thay thế log.

## 11. Chu trình thực thi bắt buộc — không dừng ở việc viết báo cáo

Thực thi theo thứ tự:

1. **Baseline:** ghi commit/diff hiện tại, backup/hash seed và manifest; chạy test để tái hiện các lỗi đã nêu.
2. **Phase A–C:** sửa reference, audit và ingestion; tạo mutation tests; chỉ tiếp tục nếu Gate A–C đạt.
3. **Phase D:** sửa immutable logs và artifact manifest; chạy mutation hash tests; chỉ tiếp tục nếu Gate D đạt.
4. **Phase E–G:** thêm expected-value tests thuật toán, backtest công bằng và cache content hash; chạy suite liên quan; chỉ tiếp tục nếu tất cả gate đạt.
5. **Phase H:** kiểm thử browser thực, tạo screenshots mới, kiểm tra UI/data consistency; nếu browser unavailable hoặc timeout, sửa nguyên nhân môi trường/runner rồi chạy lại; không bỏ qua.
6. **Phase I:** kiểm thử chính gate runner bằng các failure injection; chứng minh không phát release PASS giả.
7. **Full run:** chạy `npm run verify:strict` ba lần liên tiếp với run ID khác nhau, log riêng, artifact riêng và exit code 0 cho mọi lần.
8. **Independent review:** đọc lại log/artifact từ disk, tính lại SHA-256 độc lập bằng công cụ, xác minh số lượng gate và run ID, kiểm tra không có `SKIPPED/BLOCKED/NOT_RUN` trong run được gọi là PASS.
9. **Final report:** liệt kê mỗi lỗi ban đầu, file/dòng đã sửa, test trước sửa (FAIL), test sau sửa (PASS), mutation test, regression kết quả, run ID và artifact evidence. Ghi rõ các giới hạn còn lại.

Nếu một gate thất bại ở bất kỳ phase nào: dừng, tìm nguyên nhân gốc, sửa, chạy lại test tái hiện → regression → mutation rồi mới tiếp tục. Nếu đã thay đổi code sau một lần full run, ba full run trước đó hết hiệu lực; phải chạy lại cả chuỗi ba lần trên cùng trạng thái source cuối.

## 12. Điều kiện hoàn tất

Chỉ được ghi `RELEASE_READY` khi đồng thời:

- reference được xây từ evidence độc lập, không từ seed;
- tất cả trường bắt buộc trong phạm vi đã định đều được source-verified;
- mismatch, unresolved required fields, missing expected draws và unresolved source conflicts đều bằng 0;
- mutation thay một giá trị thành giá trị hợp lệ nhưng sai bị audit phát hiện;
- test không làm thay đổi seed/reference/manifest/report production;
- không tự gán verified, timestamp, kỳ quay, mã kỳ, Jackpot hoặc số trúng;
- expected-value tests của mọi thuật toán đều đạt;
- backtest không leakage và baseline được so sánh công bằng;
- cache thay đổi khi content hash thay đổi;
- browser E2E thực sự chạy, các screenshot mới và kiểm tra tương tác/overflow/console đạt;
- mọi hash của log/artifact khớp file cuối cùng trên disk;
- ba lần `npm run verify:strict` độc lập liên tiếp đều exit code 0 trên cùng trạng thái source cuối;
- không có gate `SKIPPED`, `NOT_RUN`, `BLOCKED` hoặc artifact thiếu trong các run được công nhận PASS.

Nếu bất kỳ điều kiện nào không đạt, trạng thái cuối cùng phải là `NOT_READY` hoặc `BLOCKED`, kèm danh sách lỗi cụ thể. Không tuyên bố dữ liệu lịch sử chính xác 100% nếu thiếu nguồn độc lập. “100%” chỉ áp dụng cho tập trường/phạm vi đã được xác minh đầy đủ, không phải dự đoán xổ số tương lai.

---

## Chỉ thị cuối cùng cho coding agent

**Bắt đầu làm ngay trên source hiện tại.** Không chỉ trả về kế hoạch. Không chỉ chỉnh `verification-report.md`. Sửa code thật, viết test để tái hiện các lỗi, xác nhận test thất bại trước sửa, sửa nguyên nhân, chạy lại sau sửa, kiểm tra ngược và regression test. Không bỏ qua bất kỳ lỗi nào trong phạm vi. Nếu nguồn độc lập hoặc browser không thể truy cập được, ghi `BLOCKED` và cung cấp bằng chứng — tuyệt đối không tạo dữ liệu, trạng thái hoặc log giả để vượt gate.
