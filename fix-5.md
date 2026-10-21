# FIX-5 — Quy trình sửa lỗi có cổng kiểm định bắt buộc (Fail-Closed)

> **Mục đích:** Buộc coding agent làm theo vòng khép kín **TÁI HIỆN → SỬA → KIỂM TRA ĐỘC LẬP → ĐẠT MỚI ĐƯỢC TIẾP TỤC**. Không được chỉ chỉnh code rồi tự tuyên bố xong. Không được bỏ qua lỗi, nới tiêu chí, giả lập kết quả hoặc dùng báo cáo PASS không có bằng chứng.
>
> **Phạm vi:** Dự án LOTTO-QUANT LAB. Phải kế thừa mọi yêu cầu còn hiệu lực từ `fix-1.md`, `fix-2.md`, `fix-3.md`, `fix-4.md` và các lỗi đã ghi nhận trong báo cáo kiểm tra. `fix-5.md` bổ sung quy trình thực thi và nghiệm thu, không xóa hay làm yếu bất kỳ yêu cầu chất lượng nào trước đó.

---

## 0. Quy tắc tối cao — không có PASS bằng lời nói

1. Đọc source code, cấu hình, test, báo cáo và các file FIX trước khi sửa. Xác định chính xác lỗi còn tồn tại trong source hiện tại; không giả định rằng một việc đã được sửa chỉ vì có trong báo cáo.
2. Với mỗi lỗi, phải có đủ bốn artefact: **(a)** test tái hiện lỗi trước sửa; **(b)** thay đổi code nhỏ nhất giải quyết nguyên nhân gốc; **(c)** test hồi quy chứng minh lỗi đã hết; **(d)** log/kết quả sau sửa. Thiếu một trong bốn thì lỗi chưa đóng.
3. Không được sửa test để làm cho code sai trở thành PASS. Không xóa test, không bỏ assertion, không giảm phạm vi dữ liệu, không đánh dấu test `skip/todo`, không bắt lỗi rồi nuốt lỗi, không biến thất bại thành cảnh báo.
4. Cấm hard-code các kết quả audit, số lượng PASS, phần trăm khớp nguồn, metric, ngày/mã kỳ/Jackpot/số trúng, screenshot, hoặc kết quả thuật toán để vượt test.
5. Test không thực sự chạy, nguồn không truy cập được, browser không có sẵn, thiếu fixture hoặc kết quả không thể tái lập phải được ghi là **BLOCKED/FAIL**, không phải PASS.
6. Không được tuyên bố “100% dữ liệu đã xác minh” chỉ vì trường không rỗng, URL tồn tại, `verificationStatus='verified'`, hoặc mã kỳ liên tục. Muốn ghi VERIFIED phải so sánh giá trị thật của trường với nguồn hoặc snapshot nguồn đã lưu có hash và provenance.
7. Không được loại bỏ bản ghi để làm đẹp báo cáo. Bản ghi chưa khớp phải giữ nguyên trong vùng cách ly/repair queue, được truy tìm và sửa từ nguồn. Chỉ đưa vào dữ liệu canonical khi đạt validation; mọi quyết định phải có audit trail.
8. Không được cam kết dự đoán xổ số tương lai chính xác 100%. Mức 100% chỉ được yêu cầu cho các kiểm tra xác định được — ví dụ đối chiếu dữ liệu lịch sử trong phạm vi được xác minh, tính toán đúng theo công thức và bất biến phần mềm.
9. Nếu một cổng thất bại, **DỪNG phase hiện tại**. Sửa nguyên nhân, chạy lại toàn bộ test liên quan và cả regression suite. Lặp lại cho đến khi đạt hoặc bị BLOCKED do một phụ thuộc khách quan không thể giải quyết. Không được sang phase kế tiếp khi cổng hiện tại chưa đạt.
10. Nếu đạt giới hạn lặp nội bộ hoặc gặp blocker, không được giả vờ PASS. Dừng an toàn, ghi blocker cùng bằng chứng, lệnh đã chạy, log, lỗi cụ thể và việc còn thiếu. Không sửa tiêu chí để qua cổng.

## 1. Thực thi theo cổng tuần tự — tuyệt đối không bỏ qua

Mỗi phase phải dùng đúng chu kỳ:

`INSPECT → REPRODUCE → PATCH → VERIFY → REGRESSION → EVIDENCE → GATE DECISION`

- `PASS`: mọi assertion bắt buộc đều thực sự chạy và đạt; có log bằng chứng; không còn lỗi cùng nhóm; mới được phép đi tiếp.
- `FAIL`: có bất kỳ assertion nào sai, test chưa chạy, output sai, log thiếu hoặc phát hiện lỗi mới. Quay lại `PATCH`; không đi tiếp.
- `BLOCKED`: phụ thuộc ngoài quyền kiểm soát không khả dụng. Không được ghi PASS. Phải hoàn thành các phần không phụ thuộc và nêu chính xác blocker; không được phát hành/release.

Không chấp nhận “PASS một phần” cho cổng bắt buộc. Có thể lưu tiến độ, nhưng phase chưa đóng.

### Gate 0 — Baseline và an toàn dữ liệu

1. Ghi commit/hash hiện tại nếu có; tạo bản sao/backup an toàn cho `data/historical-seed.json`, manifest, audit report và các artefact cần bảo toàn.
2. Xác định package manager, các lệnh test thực tế trong `package.json`, cấu hình test, cổng server, đường dẫn browser hiện có và các dependencies. Không giả định lệnh hoặc đường dẫn.
3. Chạy toàn bộ test hiện tại trước khi sửa; lưu stdout/stderr, exit code, thời gian và danh sách test thực sự chạy.
4. Lưu hash dữ liệu gốc và xác nhận test không được phép ghi đè seed hoặc report chính thức khi dùng fixture.
5. **Gate 0 PASS khi** baseline ghi lại đủ; backup kiểm chứng đọc được; phát hiện được chính xác những test bị skip/blocked; không có dữ liệu gốc nào bị sửa bởi baseline.

### Gate 1 — Data provenance và xác minh lịch sử thật

1. Rà mọi đường nhập dữ liệu: parser, crawler, seed builder, reconcile/enrich, merge, API, fallback, cache và UI. Tìm mọi chỗ gán mặc định cho ngày quay, draw ID, đài, số trúng, số đặc biệt, jackpot, giải thưởng hoặc trạng thái `verified`.
2. Xóa hành vi tự bịa trong luồng dữ liệu canonical. Nếu parser không đọc được trường bắt buộc thì trả lỗi có cấu trúc và đưa bản ghi vào repair queue; không tạo mã/ngày/số thay thế. Jackpot chỉ được đánh dấu thiếu/chưa xác minh, không gán mặc định.
3. Tạo/duy trì snapshot nguồn đáng tin cậy cho mỗi bản ghi đã xác minh. Lưu tối thiểu: nguồn/URL thật, thời điểm lấy thật, hash nội dung nguồn hoặc snapshot, mã trò chơi/đài, ngày quay, mã kỳ nếu nguồn có, kết quả từng trường cần xác minh và trạng thái đối chiếu. Không dựng metadata sau đó để giả làm bằng chứng lịch sử.
4. Đối chiếu **giá trị từng trường** của từng kỳ trong phạm vi được công bố với snapshot/nguồn. Đối với trang HTML động hoặc thay đổi, lưu snapshot/response gốc để tái kiểm tra. Nguồn không truy cập được phải báo chưa xác minh; không tự đánh dấu VERIFIED.
5. Kiểm tra độc lập: ngày hợp lệ theo lịch; draw ID ↔ ngày; lịch quay của game/đài; số bóng đúng số lượng và phạm vi; bóng chính không trùng; bonus đúng luật; giải thưởng/jackpot đúng trường và đơn vị; kết quả XSMN đủ đúng cấu trúc giải gốc, sau đó mới suy ra lô tô. Các kết quả XSMN lặp cặp hai chữ số được phép khi luật nguồn cho phép.
6. Đối chiếu manifest với canonical data: min/max date, first/last draw ID, số kỳ mong đợi, kỳ thiếu, kỳ trùng, ngày quay trùng bất thường, và mọi chênh lệch. Không chỉ so tổng số dòng.
7. Nếu dữ liệu sai: tìm nguồn, sửa bằng chứng, lưu giá trị cũ/mới và lý do trong audit trail, rồi chạy lại tất cả kiểm tra. Không xóa bản ghi để làm mẫu số giảm.
8. Viết mutation test: sửa một số trúng; sửa ngày; đổi mã kỳ; đổi bonus; thay jackpot; xóa nguồn; đặt ngày `2026-99-99`; chèn duplicate; làm thiếu giải XSMN. Audit phải FAIL đúng loại lỗi trong từng trường hợp.
9. Chạy audit trên fixture vào thư mục tạm; cấm ghi vào `data/audit-report.json`. Chỉ audit canonical mới được cập nhật report chính thức, dùng ghi file nguyên tử và chỉ khi audit thành công.
10. **Gate 1 PASS khi:** mọi bản ghi trong phạm vi được công bố có trạng thái đối chiếu rõ ràng; 100% trường được tuyên bố verified thực sự khớp snapshot/nguồn; kỳ thiếu/chưa xác minh/xung đột chưa xử lý bằng 0 nếu muốn tuyên bố phạm vi đó hoàn toàn verified; không có giá trị được tự chế; manifest khớp nguồn và dữ liệu. Nếu nguồn không thể truy cập hoặc bằng chứng lịch sử chưa đủ, gate là BLOCKED, không phải PASS.

### Gate 2 — Canonical prediction và đồng nhất UI

1. Một kỳ mục tiêu/game/đài phải có một canonical prediction object duy nhất được tạo từ cùng input, config và algorithm version. Hero, Ensemble card, bảng chi tiết, charts và KPI phải đọc từ object đó; không tính lại độc lập trong các UI component.
2. Cache key phải bao gồm game/đài, kỳ mục tiêu, hash nội dung lịch sử đã dùng, thuật toán/version, cấu hình/weights và seed nếu có. Sửa một bản ghi lịch sử phải làm cache mất hiệu lực.
3. Validate output trước khi render: đúng số lượng, đúng miền số, không trùng với game không cho phép trùng, thứ tự hiển thị theo quy định, metadata ngày mục tiêu đúng lịch quay. Không hiển thị kết quả cũ như kết quả hiện tại nếu tính toán thất bại.
4. Thêm test đối chiếu bằng strict equality toàn bộ mảng và metadata giữa mọi component. Test phải bắt được lỗi một component hiển thị `06` trong khi component khác hiển thị `12`.
5. Nếu canonical prediction chưa có/không đủ dữ liệu, hiển thị trạng thái `Chưa đủ dữ liệu` hoặc lỗi rõ ràng; không tự sinh bộ số ngẫu nhiên và không giữ lặng lẽ kết quả cache cũ.
6. **Gate 2 PASS khi:** các component cùng một prediction có output và metadata giống hệt; cache invalidation được chứng minh; không có fixture thiếu dữ liệu nào bị render như dự đoán hợp lệ.

### Gate 3 — Công thức và tám thuật toán

1. Với từng thuật toán, ghi rõ: tên/phương pháp thật, input schema, điều kiện dữ liệu tối thiểu, công thức score, chuẩn hóa score, quy tắc tie-break, output schema, random seed và các giới hạn đã biết.
2. Viết kiểm thử tham chiếu độc lập bằng dữ liệu nhỏ có thể tính tay. Không chỉ test rằng hàm trả ra sáu số. Assert kết quả score/probability/rank chính xác theo công thức, xử lý biên và tính bảo toàn các bất biến.
3. Markov: kiểm tra xây dựng trạng thái, chuyển trạng thái, smoothing và chuẩn hóa xác suất; tên bậc của model phải khớp code thực tế.
4. Poisson: kiểm tra ước lượng lambda, miền giá trị và cách chuyển expected count thành ranking; không gọi output là xác suất trúng jackpot nếu không có phép tính xác suất tương ứng.
5. Monte Carlo: seed cố định phải tái lập; seed khác có thể khác; lấy mẫu phải đúng cơ chế game; không ép các lô XSMN khác nhau khi luật cho phép lặp; báo độ ổn định và số lượt mô phỏng thực sự chạy.
6. EMA/seasonality: dùng ngày quay mục tiêu thực theo lịch game/đài, không dùng ngày kế tiếp theo lịch một cách mù quáng. Thêm unit tests cho từng thứ trong tuần và ngày nghỉ/đổi lịch nếu có dữ liệu.
7. Entropy/frequency/cycle/structure/association rules: xác minh công thức bằng fixture; xử lý mẫu rỗng, mẫu nhỏ, tần suất 0 và cặp hiếm; không hiển thị `undefined`, `NaN`, Infinity hoặc phần trăm bịa.
8. Ensemble: chuẩn hóa điểm đầu vào trước khi gộp; công thức và trọng số phải được công bố, được test bằng fixture có kết quả dự kiến; xếp hạng cuối cùng phải thật sự theo score đã công bố, không dùng đồng thuận làm thứ tự khi UI nói weighted voting.
9. Không có dữ liệu hoặc dữ liệu dưới minimum sample: trả `insufficient-data`; không tự fallback sang số ngẫu nhiên, giá trị mock hoặc hard-coded probability.
10. **Gate 3 PASS khi:** mỗi thuật toán có fixture công thức độc lập, negative tests, boundary tests, determinism tests phù hợp; output được validate; không còn tên mô hình mô tả khác phương pháp thực tế; mọi lỗi được sửa và chạy lại test liên quan cùng regression suite.

### Gate 4 — Backtest, chống leakage và baseline

1. Chỉ dùng dữ liệu trước ngày mục tiêu trong từng fold; test phải kiểm tra input thật truyền vào model, không chỉ kiểm tra số lượng dòng. Đưa một bản ghi tương lai cực đoan vào fixture và chứng minh dự đoán của fold quá khứ không đổi.
2. Backtest một kỳ, leaderboard nhiều kỳ và dashboard phải nêu rõ phạm vi, số fold, cửa sổ train/test, game/đài và metric.
3. Baseline random phải chạy nhiều replicate với seed lưu được. Tính phân phối hit rate và khoảng bất định từ các replicate; không chỉ chấm một bộ ngẫu nhiên trên mỗi kỳ rồi gọi đó là baseline ổn định.
4. Dùng cùng kỳ mục tiêu, cùng số lượng số dự đoán, cùng luật tính hit và cùng phạm vi train/test cho mọi thuật toán và baseline.
5. Không dùng dữ liệu kỳ mục tiêu để chọn hyperparameter, weight, top-k hoặc thuật toán thắng trong cùng fold. Mọi tuning phải nằm trong training/validation trước test fold.
6. Hit rate, best hit, Jackpot hit, consensus và confidence là metric khác nhau. Không gộp thành chỉ số duy nhất bằng trọng số tùy ý mà không công bố/kiểm chứng. Consensus không được đặt nhãn xác suất trúng.
7. **Gate 4 PASS khi:** fold boundaries có test; leakage test thực sự tác động vào input; baseline replicate chạy thật và lưu kết quả; tất cả mô hình được so sánh trên cùng folds; metric tái tính lại độc lập từ predictions và truth; không hard-code baseline hoặc KPI.

### Gate 5 — Leaderboard và Top 1

1. Khai báo rõ một primary metric (mặc định hit rate trung bình ngoài mẫu) và tie-break deterministic. Công bố sample size, thời gian, game, cách dự đoán và baseline.
2. Sort thật bằng primary metric giảm dần; nếu bằng nhau dùng tie-break được công bố. Top 1 banner phải lấy đúng dòng đầu sau sort, không dùng tên hoặc số liệu hard-code.
3. Không khẳng định thuật toán Top 1 “tốt nhất” nếu khác biệt chưa được kiểm định đủ; nhãn cần ghi “Top 1 trong mẫu kiểm định X”. Nếu không có đủ mẫu, hiển thị `Chưa đủ dữ liệu xếp hạng`.
4. Kiểm tra tất cả trường hiển thị bằng schema: không `undefined`, `NaN`, `null` không được xử lý, hoặc % vượt miền hợp lệ. UI không được dùng `compositeScore` nếu kết quả không có field này.
5. Thêm test khi đổi thứ tự input, có tie, thiếu một thuật toán, metric undefined, zero folds, các thuật toán có sample count khác nhau và khi cache/backtest được refresh.
6. **Gate 5 PASS khi:** thứ tự bảng đúng tính toán; banner Top 1 khớp dòng hạng 1; tất cả giá trị đều được suy ra từ cùng report; phạm vi/metric/sample size hiện rõ.

### Gate 6 — Audit script và tính an toàn của artefact

1. Tách report canonical, report fixture và test artifacts vào đường dẫn khác nhau. Test không được ghi đè seed, manifest, canonical audit, báo cáo release hoặc screenshot chính thức.
2. Dùng output path tường minh; kiểm tra path trước khi ghi; fixture dùng temp directory. Thêm test hash trước/sau để bảo đảm canonical artifacts không đổi khi chạy unit/integration tests.
3. Tạo report bằng kết quả thực thi, không gán các giá trị như `100`, `0`, `PASS` hoặc số test mong muốn trực tiếp trong report generator.
4. Report phải liệt kê số trường đối chiếu thực sự, số match/mismatch, số bản ghi verified/unverified, nguồn và hash. Mọi tỷ lệ phải có numerator/denominator có thể kiểm tra.
5. **Gate 6 PASS khi:** test fixture không làm thay đổi canonical artifacts; audit report có thể tái tạo từ input; cố tình sửa dữ liệu chắc chắn làm audit fail; khôi phục backup/hash được xác nhận.

### Gate 7 — Browser E2E và chất lượng giao diện

1. Phát hiện browser bằng config hoặc biến môi trường (`PLAYWRIGHT_BROWSERS_PATH`, `CHROME_BIN` hoặc config project); không hard-code đường dẫn Windows. Nếu browser không tồn tại, lệnh E2E phải exit non-zero/BLOCKED, tuyệt đối không PASS.
2. E2E phải tự khởi động server bằng script chính thức, chờ readiness URL, dùng port ngẫu nhiên/được cấu hình, dừng server trong `finally` và fail nếu readiness timeout. Không test nhầm dịch vụ của tiến trình khác.
3. Test browser thật trong viewport desktop 1440x900, tablet 768x1024 và mobile 360x800; console/page errors phải được thu thập. Chụp ảnh sau khi nội dung tải xong; screenshot bị thiếu phải làm gate fail.
4. Test tương tác thật: chọn game/đài, chuyển tab, load/update data, dự đoán, mở chi tiết 8 thuật toán, chạy Backtest, refresh leaderboard, empty/loading/error states và responsive navigation.
5. Kiểm tra `document.documentElement.scrollWidth <= window.innerWidth + tolerance`; kiểm tra nội dung bị cắt, horizontal overflow, text overlap, chart legend đè lên ghi chú, `undefined`, `NaN`, lỗi console và liên kết/nút không hoạt động.
6. Thêm kiểm tra DOM assertions cho hero-vs-Ensemble prediction equality, Top 1-vs-first-row equality, timestamp/target date, source-status label và từng metric. Không chỉ kiểm tra HTTP 200 hoặc chuỗi HTML có chứa ID.
7. **Gate 7 PASS khi:** browser thực sự chạy; toàn bộ kịch bản bắt buộc hoàn thành; có screenshot mới cho đủ 3 viewport; 0 uncaught console/page errors; 0 assertion fail; không có tràn ngang/overlap ở các vùng bắt buộc. Nếu không có browser thì BLOCKED, không được release.

### Gate 8 — Regression cuối và release gate

1. Sau mỗi patch, chạy lại test của phase đó và các phase phụ thuộc. Sau khi tất cả phase đạt, chạy toàn bộ pipeline từ đầu.
2. Chạy full pipeline ít nhất 3 lần liên tiếp trong môi trường sạch. Mỗi lần phải khởi động server/test độc lập, không tái sử dụng trạng thái hoặc cache giúp che lỗi. Lưu log, exit code, git diff/status, hash seed, audit report, screenshot và runtime.
3. Nếu một trong ba lần thất bại: không lấy hai lần PASS để bù. Tìm nguyên nhân, sửa, chạy lại phase bị ảnh hưởng, rồi bắt đầu lại đủ 3 lần từ đầu.
4. Kiểm tra `git diff` để chắc không có dữ liệu lịch sử bị đổi ngoài những chỉnh sửa có bằng chứng; không xóa dữ liệu hoặc test để pass. Kiểm tra source không chứa các fallback, report constants hoặc test bypass vừa sửa.
5. Lệnh tổng phải fail nếu bất kỳ script con fail, bị skip, browser không sẵn sàng, có test required chưa thực thi, có screenshot thiếu, audit có unverified field trong phạm vi tuyên bố verified hoặc có artefact canonical bị thay đổi ngoài dự kiến.
6. **Release PASS chỉ khi** Gates 0–8 đều PASS bằng bằng chứng trong lần chạy cuối. Bất kỳ gate FAIL/BLOCKED nào đồng nghĩa **NO RELEASE**.

---

## 2. Bắt buộc tạo một Gate Runner có exit code đáng tin

Phải triển khai một lệnh duy nhất, ví dụ `npm run verify:strict`, có các đặc tính:

- Chạy kiểm tra theo đúng thứ tự Gate 0 → Gate 8.
- Không chạy phase sau nếu phase trước fail/blocked.
- Trả exit code khác 0 nếu bất kỳ test bắt buộc nào thất bại, bị skip, bị block hoặc thiếu bằng chứng.
- Thu thập log thành từng thư mục lần chạy; không ghi đè fixture vào artefact canonical.
- In rõ trạng thái mỗi gate, lệnh đã chạy, số test thực thi/thành công/thất bại/bị skip, file log và lý do.
- Không được implement bằng một report JSON tĩnh hoặc tổng hợp số PASS hard-code.
- Nếu dùng Playwright hoặc thư viện browser, kiểm tra dependencies đã có trước khi thêm; không migrate framework chỉ để phục vụ audit.
- Có test cho chính Gate Runner: cố tình làm một test fail và chứng minh runner dừng tại gate đó, exit code non-zero, không chạy gate sau.

## 3. Quy trình đóng từng lỗi (Issue Closure Protocol)

Với mỗi issue từ các FIX trước hoặc phát hiện mới, tạo một mục trong `reports/fix5/issue-ledger.md`:

- ID và mức độ: P0/P1/P2.
- File/dòng hoặc hàm liên quan.
- Tái hiện trước sửa: command, input và observed failure.
- Nguyên nhân gốc đã xác minh.
- Thay đổi code.
- Regression test mới và lệnh chạy.
- Kết quả sau sửa, exit code và đường dẫn log.
- Bằng chứng browser/source nếu liên quan.
- Trạng thái chỉ được là `OPEN`, `BLOCKED` hoặc `CLOSED_VERIFIED`.

Chỉ được đặt `CLOSED_VERIFIED` nếu test trước đó tái hiện được lỗi, test sau sửa chạy thực và pass, các test regression liên quan pass, và người kiểm tra đọc được bằng chứng. Nếu không thể tái hiện lỗi cũ, không tự đánh dấu đã sửa; tìm cách tạo fixture thích hợp hoặc ghi `BLOCKED` kèm lý do.

## 4. Các kiểm tra đột biến bắt buộc

Để chứng minh hệ thống phát hiện sai chứ không chỉ chạy qua trường hợp đẹp, tạo test đột biến có kiểm soát:

- Đổi một số trúng hợp lệ thành số khác nhưng giữ nguyên schema, URL, trạng thái verified và metadata — source reconciliation phải FAIL.
- Đổi ngày, draw ID, bonus number hoặc jackpot nhưng giữ các trường khác — audit phải nêu chính xác trường mismatch.
- Xóa source snapshot hoặc thay hash snapshot — trạng thái VERIFIED phải bị rút lại.
- Ghi bản ghi malformed vào fixture — canonical seed và canonical report phải giữ nguyên hash.
- Thay history một bản ghi nhưng giữ ngày kỳ mới nhất — canonical prediction cache phải invalidated.
- Đổi thứ tự predictions đầu vào — leaderboard vẫn phải sort đúng primary metric.
- Làm metric thiếu hoặc NaN — UI phải báo unavailable, không sinh điểm giả.
- Tắt browser hoặc chiếm cổng server — E2E phải fail/blocked, không PASS.
- Cố tình làm một assertion browser fail — `verify:strict` phải exit non-zero và không được báo release PASS.

Mỗi mutation test phải xác nhận **đúng thất bại mong đợi**; không chỉ xác nhận process kết thúc. Sau mutation test phải phục hồi fixture và xác minh hash canonical không đổi.

## 5. Giao thức sửa khi phát hiện lỗi — lặp lại bắt buộc

Thực hiện chính xác:

1. Chạy gate hiện tại.
2. Đọc output đầy đủ; phân loại từng lỗi. Không chỉ nhìn exit code tổng.
3. Tạo issue ledger entry và test tái hiện tối thiểu.
4. Sửa nguyên nhân gốc, không che biểu hiện bằng CSS, hard-code, fallback giả hoặc nới assertion.
5. Chạy test tái hiện: phải chứng minh **trước sửa FAIL**, **sau sửa PASS**.
6. Chạy toàn bộ test cùng module và mọi regression phụ thuộc.
7. Chạy mutation test tương ứng và xác nhận nó phát hiện thay đổi sai.
8. Kiểm tra diff để bảo đảm test không bị làm yếu hoặc artifact canonical không bị ghi đè.
9. Nếu có bất kỳ lỗi nào, quay về bước 2. Không đi tiếp.
10. Chỉ sau khi mọi assertion bắt buộc pass mới ký Gate decision và chuyển phase.

Không giới hạn số lần sửa để ép cho xong trong một lượt. Nếu blocker thực sự ngăn cản việc xác minh, ghi BLOCKED minh bạch và dừng release; không bịa dữ liệu hoặc nới cổng.

## 6. Đầu ra bắt buộc

Sau khi thực thi, phải có:

- `reports/fix5/issue-ledger.md` — danh sách tất cả issue và bằng chứng đóng/mở.
- `reports/fix5/gate-results.json` — kết quả do Gate Runner tạo ra trong lần chạy thực tế, không hard-code.
- `reports/fix5/run-1.log`, `run-2.log`, `run-3.log` — log full pipeline độc lập.
- `reports/fix5/data-reconciliation.csv` — trạng thái đối chiếu theo từng bản ghi/trường; không đưa bí mật hoặc token vào report.
- `reports/fix5/screenshots/` — screenshot browser mới ở desktop/tablet/mobile.
- Bản tóm tắt `PASS / FAIL / BLOCKED`, các lệnh đã chạy, test skipped (phải bằng 0 đối với test bắt buộc), số kỳ/field chưa xác minh và mọi giới hạn.

## 7. Chỉ thị cuối cùng cho coding agent

Bắt đầu bằng việc đọc source và tái kiểm tra tất cả issue còn lại từ `fix-1.md` đến `fix-4.md`. Sau đó thực thi theo các Gate trên. Không chỉ tạo kế hoạch, không chỉ sửa một vài file, không dừng ở unit tests, không bỏ qua browser test và không kết luận đúng dựa vào screenshot tĩnh.

**Cấm chuyển phase khi gate đang FAIL/BLOCKED. Cấm release nếu bất kỳ gate nào chưa PASS. Cấm tuyên bố dữ liệu 100% verified nếu đối chiếu từng giá trị chưa có bằng chứng. Cấm đánh dấu issue CLOSED nếu chưa có test tái hiện trước sửa và test xác nhận sau sửa.**

Nếu có sự mâu thuẫn giữa báo cáo agent tự tạo và log/artefact thật, ưu tiên log/artefact thật; báo cáo phải sửa theo bằng chứng, không sửa bằng chứng theo báo cáo.
