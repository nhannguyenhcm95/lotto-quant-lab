# FIX-2 — Hardening dữ liệu, thuật toán, Backtest, Top 1 Leaderboard và kiểm thử lặp toàn hệ thống

> **Mục tiêu:** tiếp tục sửa trên codebase hiện có sau FIX-1; đạt **100% đối chiếu nguồn cho toàn bộ phạm vi lịch sử đã xác định**, sửa và khôi phục bản ghi sai/thiếu thay vì âm thầm loại bỏ, loại bỏ đầu ra giả khi thiếu dữ liệu, chuẩn hóa cách chấm/xếp hạng thuật toán và tạo vòng test hồi quy cho dữ liệu, thuật toán, backtest và giao diện trên trình duyệt thực. Yêu cầu 100% áp dụng cho **độ đầy đủ và độ chính xác của dữ liệu lịch sử thuộc phạm vi đã công bố**, không phải cam kết dự đoán xổ số tương lai đúng 100%.
>
> **Đối tượng thực thi:** Codex / coding agent làm việc trực tiếp trong repository `xo-so`.
>
> **Yêu cầu bắt buộc:** không chỉ viết kế hoạch. Phải đọc code hiện tại, sửa trực tiếp, tạo test hồi quy, chạy test, khắc phục lỗi và báo cáo bằng chứng. Không tự tạo dữ liệu xổ số, không tự đặt KPI, không mô tả điểm thuật toán là xác suất trúng. **Không được xử lý lỗi dữ liệu bằng cách chỉ xóa/bỏ qua bản ghi**: phải truy tìm nguồn đáng tin cậy, đối chiếu và khôi phục giá trị chính xác. Bản ghi nghi vấn chỉ được cách ly tạm thời trong repair queue; không được coi là đã xử lý cho tới khi được sửa và xác minh hoặc báo rõ bị BLOCKED.

---

## 0. Baseline đã kiểm tra trên bản được bàn giao

Trên source trong archive gần nhất, lệnh `npm test` hiện cho kết quả **75 PASS / 0 FAIL**. Đây là baseline để tiếp tục, không phải bằng chứng rằng hệ thống đã đúng toàn bộ: phần lớn test hiện kiểm tra output có tồn tại/đủ số lượng, một số test kiểm tra lại chính điều kiện được dùng để tạo dữ liệu test, và test UI dùng DOM giả thay vì trình duyệt thật.

Kiểm tra cấu trúc tĩnh của `data/historical-seed.json` cho thấy:

- Mega 6/45: 1.576 bản ghi, ngày và mã kỳ không trùng trong file, sáu số chính đúng miền và không trùng trong từng kỳ.
- Power 6/55: 1.411 bản ghi, ngày và mã kỳ không trùng trong file, sáu số chính đúng miền và không trùng trong từng kỳ.
- XSMN: 352 bản ghi, 21 đài; phần lớn đài có 16 kỳ, TP.HCM có 32 kỳ, dữ liệu đang bao phủ khoảng 27/06/2026–16/10/2026.
- Các kiểm tra cấu trúc kể trên **không đồng nghĩa** với việc đã đối chiếu độc lập từng kết quả với nguồn gốc. Đặc biệt, 16 kỳ mỗi đài không được quảng bá là toàn bộ lịch sử XSMN.

### Các lỗi còn lại đã tái hiện trực tiếp

1. `scripts/build-real-seed.js`, `scripts/extract-minhngoc-vietlott.js`, `scripts/extract-minhngoc-xsmn.js` và `netlify/functions/crawl-vietlott.js` vẫn có ngày mặc định `2026-10-14`; một số parser vẫn tạo mã kỳ và Jackpot mặc định khi không tìm thấy trường nguồn.
2. `DataService.validateMegaDraw()` chấp nhận ngày không tồn tại như `2026-99-99`. `validatePowerDraw()` chấp nhận số đặc biệt trùng với số chính hoặc là số thập phân. `validateXSMNDraw()` chấp nhận 18 chuỗi lô tô không hợp lệ như `XX`.
3. Một số hàm `getDefaultPrediction()` vẫn sinh dự đoán bằng `Math.random()` khi thiếu lịch sử. Đã tái hiện việc gọi Poisson/Markov/Ensemble với lịch sử rỗng vẫn trả ra dàn số trông như dự đoán thật. Ensemble vẫn trả ra sáu ứng viên khi không có dữ liệu.
4. `js/algorithms/ensemble.js` đang gọi phép chia tổng điểm cho tổng trọng số là “Normalized Soft Voting”, nhưng không chuẩn hóa thang điểm **bên trong từng model**. Score của các model có ý nghĩa khác nhau. Điểm thiếu hoặc không hợp lệ còn bị thay bằng `50`, và trọng số sai bị thay bằng `0.1`, có thể che khuất lỗi model.
5. `js/backtest-engine.js` đang dùng `13.3%` / `18.0%` làm baseline mặc định khi không có fold nào thành công. Bảng xếp hạng dùng `avgHitRate * 0.7 + bestHitRate * 0.2 + specialMatches * 5`, làm cho một kết quả hiếm hoặc một kỳ cực đại có thể quyết định Top 1. Đây chưa phải tiêu chí xếp hạng có căn cứ thống kê.
6. Test chống leakage hiện tự tạo `trainSubset = history.filter(date < targetDate)` rồi kiểm tra chính tập đó; test chưa quan sát dữ liệu thực tế mà `BacktestEngine` truyền vào thuật toán. Đây là test mang tính tautology, không bắt được mọi lỗi rò rỉ trong pipeline.
7. Test giao diện đang mock `document` và xác nhận hàm render không crash; nó chưa mở website bằng browser để phát hiện lỗi console, lỗi sự kiện, responsive, bảng xếp hạng sai thứ tự hoặc nội dung bị che/tràn. Ảnh chụp trong thư mục `test/` có dấu hiệu cũ (ví dụ còn KPI 91.2% và 66.7%) và không thể dùng làm bằng chứng cho source hiện tại.
8. Một số mô tả cũ vẫn gọi `Clustering` là K-Means/phân cụm và Association Rules là Apriori, dù code hiện nghiêng về heuristic scoring và cặp kết hợp/chuyển tiếp. Tên trên UI, tài liệu và cách tính phải thống nhất.


## 🔒 CHỈ THỊ BẮT BUỘC — ĐỘ CHÍNH XÁC 100% CỦA DỮ LIỆU LỊCH SỬ

Phần này **ưu tiên cao hơn mọi câu chỉ dẫn bên dưới** nếu có cách hiểu mâu thuẫn. Không được làm cho test xanh bằng cách giảm số bản ghi, bỏ qua kỳ lỗi, nới lỏng validator hoặc thay dữ liệu thật bằng giá trị mặc định.

### A. Định nghĩa mục tiêu và phạm vi trước khi sửa

- [ ] Lập `data/history-scope.json` hoặc manifest tương đương, mô tả rõ từng bộ dữ liệu: game/đài, ngày bắt đầu, ngày kết thúc, lịch quay dự kiến, nguồn ưu tiên và những trường bắt buộc.
- [ ] Với Vietlott, xác định danh sách kỳ cần có từ mã kỳ đầu tiên trong phạm vi dự án đến kỳ mới nhất đã công bố, dựa vào lịch và kho kết quả nguồn. Không suy ra độ đầy đủ chỉ từ việc mã kỳ trong file đang liên tiếp.
- [ ] Với XSMN, lập lịch ngày quay theo **từng đài riêng biệt** trong toàn bộ khoảng thời gian được công bố. Mỗi ngày/đài dự kiến có kết quả là một bản ghi kỳ cần đối chiếu; không gộp các đài thành một chuỗi lịch sử duy nhất.
- [ ] Nếu repository đang tuyên bố “toàn bộ lịch sử”, xác định mốc bắt đầu thực tế mà nguồn đáng tin cậy có thể kiểm chứng rồi xây manifest cho toàn bộ giai đoạn đó. Không được thu hẹp ngày bắt đầu chỉ để làm cho tỷ lệ bao phủ thành 100%.
- [ ] Hiển thị rõ phạm vi nào đã được xác minh. Không dùng một tuyên bố chung “100% lịch sử” khi mới xác minh một phần file, một số kỳ mới nhất hoặc chỉ cấu trúc dữ liệu.

### B. Quy tắc tuyệt đối về sửa dữ liệu — không vứt bỏ để che lỗi

1. **Không được bỏ bản ghi khỏi phạm vi mục tiêu chỉ vì parser/validator đang báo lỗi.** Validator phát hiện sai thì phải tạo issue trong `repair queue`, giữ lại raw record/source snapshot, mã lỗi, khóa kỳ dự kiến và trạng thái sửa.
2. Truy tìm bản ghi gốc từ nguồn chính thức trước. Với Vietlott, ưu tiên nguồn công bố kết quả chính thức; với XSMN, ưu tiên công ty xổ số/nguồn công bố chính thức của đài tương ứng. Nếu nguồn chính thức thiếu archive hoặc khó truy xuất, dùng nguồn lưu trữ có uy tín để tìm lại, đồng thời ghi rõ source tier và đối chiếu thêm nguồn thứ hai nếu có.
3. Đối chiếu từng trường bắt buộc: game/đài, ngày quay, mã kỳ (nếu áp dụng), toàn bộ số trúng, số đặc biệt của Power 6/55, từng giải XSMN và các trường thưởng/Jackpot nếu sản phẩm yêu cầu lưu trường đó. Không chỉ đối chiếu các số chính rồi kết luận cả record đúng.
4. Nếu dữ liệu hiện có sai, **sửa nó theo nguồn**, ghi `before → after`, lý do, URL nguồn, thời điểm truy xuất, người/agent sửa, hash raw snapshot và phiên bản parser. Giữ audit log; không ghi đè không dấu vết.
5. Nếu thiếu một kỳ trong lịch dự kiến, phải tìm và bổ sung kỳ đó. Nếu có hai bản ghi xung đột, phải phân xử bằng nguồn gốc và metadata kỳ; không tự chọn bản đầu tiên, không chọn theo thứ tự crawl và không “dedupe” bằng cách xóa một bản ghi trước khi xác định bản đúng.
6. Nếu parser không nhận được ngày/mã kỳ/Jackpot, **không điền giá trị giả và cũng không coi việc bỏ trường/bỏ record là hoàn tất**. Chuyển sang sửa parser hoặc truy tìm nguồn khác. Với trường thực sự không được nguồn lịch sử công bố, ghi rõ `not-published-by-source` chỉ khi có bằng chứng; nếu trường được yêu cầu cho báo cáo mà chưa xác minh được thì trạng thái bộ dữ liệu là `BLOCKED`, không được công bố là hoàn chỉnh.
7. Khi nguồn thứ nhất và thứ hai mâu thuẫn, không dùng “đa số” máy móc. Ưu tiên nguồn chính thức và danh tính kỳ; nếu vẫn không thể giải quyết, đánh dấu `CONFLICT_UNRESOLVED`, ghi toàn bộ bằng chứng và chặn nghiệm thu dữ liệu cho đến khi có kết luận có căn cứ.
8. Bản ghi chỉ được trở lại canonical dataset khi tất cả quy tắc schema qua và trường bắt buộc đã được xác minh. **Quarantine là trạng thái trung gian để sửa, không phải giải pháp cuối để giảm mẫu số.**
9. Không sửa dữ liệu lịch sử thủ công mà không để lại nguồn và audit log. Không tạo số, ngày, mã kỳ, tên đài, giải thưởng hoặc Jackpot từ suy đoán, nội suy, `Math.random()`, pattern kỳ trước hoặc giá trị mặc định.

### C. Provenance bắt buộc cho từng bản ghi

Mỗi record lịch sử canonical phải có metadata audit ở record hoặc trong sidecar manifest, tối thiểu:

- `sourceName`, `sourceUrl` (hoặc source ID nếu URL không có), `retrievedAt`;
- `sourceDrawDate`, `sourceDrawId` nếu nguồn cung cấp;
- `rawSnapshotPath` và `rawSnapshotSha256` (hoặc checksum tương đương);
- `parserVersion`, `validationVersion`, `verifiedAt`;
- `verificationStatus`: `verified-primary`, `verified-cross-source`, `repaired-and-verified`, `conflict-unresolved`, `missing-source`;
- trường đã đối chiếu, những điểm khác biệt ban đầu và lịch sử hiệu chỉnh.

Không sửa trực tiếp cấu trúc dữ liệu runtime nếu ảnh hưởng tương thích; có thể lưu provenance trong sidecar file/SQLite/JSON audit index. Nhưng không được bỏ qua khả năng truy ngược từ một kết quả hiển thị về source evidence của nó.

### D. Cổng chất lượng dữ liệu — mọi điều kiện phải đạt 100%

Tạo script tái lập, ví dụ `npm run audit:history -- --strict`, xuất cả JSON và báo cáo đọc được. Với phạm vi đã khai báo, tiêu chí release dữ liệu phải là:

- `expected_draw_coverage = 100%`;
- `required_field_source_match = 100%`;
- `unresolved_missing_draws = 0`;
- `unresolved_required_fields = 0`;
- `unresolved_source_conflicts = 0`;
- `invalid_canonical_records = 0`;
- `duplicate_unresolved_keys = 0`;
- `invented_or_defaulted_historical_values = 0`;
- mọi record canonical truy ngược được tới bằng chứng nguồn.

Phải tính các phần trăm trên **manifest kỳ dự kiến**, không lấy số record đang có làm mẫu số. Không được loại một ngày/đài/kỳ khỏi manifest để nâng tỷ lệ hoàn thành. Nếu có ngày không quay theo lịch chính thức, ghi lý do `no-draw-confirmed` cùng evidence thay vì giả định có một kỳ.

### E. Điều kiện khi không thể đạt 100%

- Không che giấu giới hạn nguồn, không điền giả để pass, không giảm phạm vi âm thầm và không tuyên bố `Completed`.
- Tiếp tục tìm nguồn, sửa parser, xây adapter theo nguồn thay thế, khôi phục bản ghi, đối chiếu chéo và chạy audit lặp cho tới khi hoàn tất.
- Nếu sau các phương án nguồn hợp lý vẫn không thể xác minh một kỳ/trường bắt buộc, phải kết thúc trạng thái `BLOCKED` với danh sách chính xác các kỳ/trường, nguồn đã thử và lý do. Đây là cách duy nhất trung thực; không được tự tuyên bố 100% khi bằng chứng không tồn tại.
- Phân biệt **“100% các bản ghi trong file đã qua validation nội bộ”** với **“100% các kỳ và trường bắt buộc trong phạm vi đã đối chiếu với nguồn”**. Chỉ điều thứ hai mới đáp ứng chỉ thị này.

> **Lưu ý phạm vi:** yêu cầu 100% ở đây là khớp dữ liệu lịch sử đã công bố và được đưa vào phạm vi kiểm định. Nó không thể bảo đảm thuật toán dự đoán kết quả tương lai đúng 100%; không được chuyển yêu cầu dữ liệu chính xác thành lời quảng cáo về xác suất trúng.


---

# 1. P0 — Không bao giờ phát sinh “dự đoán thật” từ dữ liệu rỗng/không đủ

## Files cần kiểm tra

- `js/algorithms/poisson.js`
- `js/algorithms/markov.js`
- `js/algorithms/monte-carlo.js`
- `js/algorithms/frequency-gap.js`
- `js/algorithms/moving-average.js`
- `js/algorithms/clustering.js`
- `js/algorithms/association-rules.js`
- `js/algorithms/ensemble.js`
- `js/app.js`
- `js/ui-controller.js`

## Việc phải làm

- [ ] Loại bỏ việc tự sinh số ngẫu nhiên trong `getDefaultPrediction()` khi không đủ dữ liệu.
- [ ] Chuẩn hóa hợp đồng trả về của thuật toán, ví dụ: `status: 'ok' | 'insufficient-data' | 'error'`, `predictions: []`, `scores: {}`, `metrics` và `reason`/`message` khi không thể dự đoán.
- [ ] Xác định số kỳ tối thiểu riêng cho từng thuật toán, dựa vào yêu cầu thực sự của phép tính; không dùng một ngưỡng chung thiếu cơ sở.
- [ ] Nếu thiếu dữ liệu, UI phải hiện “Chưa đủ dữ liệu để tính”, không hiện dàn số ngẫu nhiên, Top 1 giả, score `50` hoặc “giải đặc biệt dự đoán” dựng từ fallback.
- [ ] `EnsembleAlgorithm` phải kiểm tra số model thành công và điều kiện đủ dữ liệu. Không tạo ứng viên bằng cách sắp xếp mọi score bằng nhau, không tự coi score thiếu là `50` nếu không có căn cứ, không coi model trả `null`/lỗi/rỗng như một model hợp lệ.
- [ ] Nếu không đủ model hợp lệ để tổng hợp, trả trạng thái `insufficient-data`/`partial` có lý do và không hiển thị dự đoán như kết quả thật.
- [ ] Nếu một model lỗi, ghi rõ model lỗi trong `subResults`/diagnostics nhưng không làm hỏng toàn bộ app; không tính model đó vào mẫu số consensus hoặc trọng số đang hoạt động.
- [ ] Xóa `confidenceScore` alias khỏi API mới. Không giữ tên trường “confidence” chỉ để cho test cũ pass. Đổi test thành kiểm tra `consensusLevel`/`consensusRatio` nếu đúng ngữ nghĩa.
- [ ] Rà soát fallback tương tự trong `LOTTO_CONFIG.getNextDrawDate()`; ngày không hợp lệ hoặc lịch không xác định phải trả lỗi/trạng thái không khả dụng, không mặc định âm thầm sang một ngày hard-code.

## Acceptance criteria

- [ ] Mỗi thuật toán với `historyData = []` trả `predictions: []`, status rõ ràng và không gọi `Math.random()` để lấp đầu ra.
- [ ] Với lịch sử chưa đủ tối thiểu, không có số giả trên UI, dashboard, bảng xếp hạng hay file export.
- [ ] Ensemble khi một model lỗi chỉ tổng hợp từ model đã xác thực; khi không còn model hợp lệ thì trả trạng thái không đủ dữ liệu.
- [ ] Không còn trường hoặc copy nào mô tả consensus là xác suất trúng.
- [ ] Có test hồi quy trực tiếp cho từng trường hợp này.

---

# 2. P0 — Siết chặt parser và validator; không cho phép bản ghi sai đi vào kho dữ liệu

## Files cần kiểm tra

- `scripts/build-real-seed.js`
- `scripts/extract-minhngoc-vietlott.js`
- `scripts/extract-minhngoc-xsmn.js`
- `scripts/crawl-all-vietlott.js`
- `scripts/crawl-all-history.js`
- `netlify/functions/crawl-vietlott.js`
- `netlify/functions/crawl-xsmn.js`
- `js/data-service.js`
- `js/config.js`

## 2.1 Loại bỏ fallback giả khỏi parser — đồng thời phải sửa/khôi phục bản ghi nguồn

**Không được chỉ xóa bản ghi lỗi để làm validator pass.** Mỗi lỗi parse/validation của lịch sử phải được ghi vào repair queue, giữ raw evidence, truy tìm đúng kỳ và sửa parser hoặc khôi phục trường từ nguồn tin cậy. Chỉ khi đã khớp nguồn mới đưa bản ghi trở lại canonical dataset. Nếu chưa khớp, audit tổng thể phải fail/blocked.

- [ ] Không khởi tạo ngày quay bằng `2026-10-14` khi không parse được ngày.
- [ ] Không tạo `drawId` giả dạng `#0150${i}`, `#0100${i}`, `#0157${i}` hoặc mã tương tự để bản ghi thiếu nguồn trông hợp lệ.
- [ ] Không gán giá trị Jackpot mặc định khi HTML/API không có Jackpot. Dùng `null`/missing kèm trạng thái “không lấy được dữ liệu”.
- [ ] Không gán tên đài mặc định như `Đài XSMN` rồi coi là đài đã xác định; không có station ID phải quarantine/từ chối bản ghi.
- [ ] Parser phải trả cấu trúc có thể kiểm tra được, ví dụ `{ records, repairQueue, warnings }`, hoặc phát lỗi có ngữ cảnh; không âm thầm sửa giá trị nguồn. Có thể tạm không đưa raw record không hợp lệ vào canonical output, nhưng bắt buộc phải giữ nó trong repair queue và tiếp tục khôi phục/đối chiếu; không được tính là xử lý xong bằng cách bỏ qua.
- [ ] Phân biệt rõ `no-data`, `network-error`, `parser-changed`, `validation-failed`; UI không được báo “đồng bộ thành công” khi chỉ sử dụng cache hoặc không lấy được dữ liệu mới.
- [ ] Ghi rõ nguồn URL, thời điểm scrape, ngày quay trong nguồn và mã kỳ nguồn nếu lấy được. Không tự suy ra metadata không tồn tại.

## 2.2 Hoàn thiện validation theo game

### Ngày và mã kỳ dùng chung

- [ ] Kiểm tra không chỉ regex `YYYY-MM-DD` mà cả tính hợp lệ của ngày lịch thực tế; từ chối `2026-99-99`, `2026-02-30`.
- [ ] Xác thực `drawId`/mã kỳ khi nguồn game yêu cầu; không merge bản ghi không xác định được danh tính.
- [ ] Không merge bản ghi vào ngày/mã kỳ khác chỉ vì một trong hai trường tình cờ khớp. Phát hiện xung đột ngày ↔ mã kỳ và đưa vào quarantine để đối chiếu.
- [ ] Trường số phải là số nguyên trong miền hợp lệ; cấm `NaN`, `Infinity`, chuỗi sai định dạng và số thập phân.

### Mega 6/45

- [ ] Đúng 6 số chính nguyên, duy nhất, trong khoảng 1–45.
- [ ] Ngày phải hợp lệ; `drawId` nếu có phải theo cấu trúc kỳ nguồn.
- [ ] Không cho hai bản ghi cùng ngày với kết quả khác nhau âm thầm ghi đè nhau.

### Power 6/55

- [ ] Đúng 6 số chính nguyên, duy nhất, trong khoảng 1–55.
- [ ] Số đặc biệt phải là số nguyên trong 1–55 và tuân thủ đúng quy tắc game; không chấp nhận trùng với sáu số chính nếu luật nguồn quy định số đặc biệt là bóng còn lại.
- [ ] Bắt buộc xác định rõ `bonusNumber` có được phép `null` trong dữ liệu lịch sử/response cụ thể hay không; nếu không có thì đánh dấu bản ghi chưa hoàn chỉnh thay vì im lặng nhận.

### XSMN

- [ ] Xác thực `stationId`, ngày, giải đặc biệt, cấu trúc giải thưởng và các chuỗi số giải.
- [ ] Không chỉ kiểm tra `lottoPairs.length >= 18`; xác minh các đuôi lô tô đúng định dạng hai chữ số `00`–`99`, số lượng phù hợp với dữ liệu nguồn và được tạo nhất quán từ `prizes`.
- [ ] Không loại bỏ cặp lô trùng nhau giữa các giải; trùng lặp trong kết quả XSMN là dữ kiện hợp lệ.
- [ ] Nếu dữ liệu nguồn thiếu một giải hoặc parser tạo ra ít kết quả hơn kỳ vọng, phải ghi rõ trạng thái partial/quarantine; không coi là kỳ hợp lệ đầy đủ.

## Acceptance criteria

- [ ] Các case lỗi được phát hiện và đưa vào repair queue với lý do cụ thể; không thể vào canonical dataset trước khi sửa.
- [ ] Khi parser không tìm thấy ngày/mã kỳ/Jackpot, không còn dữ liệu mặc định được chèn vào bản ghi; pipeline phải truy nguồn để hoàn thiện giá trị nếu trường đó được yêu cầu.
- [ ] Merge có khóa nghiệp vụ rõ ràng; dữ liệu lỗi không ghi đè dữ liệu tốt. Bản ghi mục tiêu không bị âm thầm loại bỏ: phải được sửa/khôi phục từ nguồn, hoặc làm audit/release ở trạng thái BLOCKED.
- [ ] `npm run audit:history -- --strict` đạt 100% coverage và source match trên manifest đã duyệt; unresolved = 0.
- [ ] Có fixture HTML đại diện cho parser thành công, trang trống, thiếu ngày, thiếu mã kỳ, sai format, thay đổi markup và dữ liệu duplicate.
- [ ] Test không yêu cầu internet để chạy. Kiểm tra live-source/network là suite riêng, opt-in, có timeout và log.

---

# 3. P1 — Chuẩn hóa score giữa các thuật toán trước khi làm Ensemble

## Vấn đề

Score của các module không cùng một ý nghĩa: Poisson/Markov tạo giá trị dựa trên công thức xác suất ước tính; Monte Carlo đếm tỷ lệ xuất hiện mô phỏng; Frequency-Gap/Moving Average/Clustering/Association Rules tạo heuristic score. Việc cộng các score 0–100 trực tiếp không khiến chúng có thể so sánh công bằng. Phép chia cho tổng trọng số hiện tại chỉ chuẩn hóa trọng số tổng, không chuẩn hóa từng model.

## Việc phải làm

- [ ] Chọn rõ một cơ chế tổng hợp:
  - **Weighted rank aggregation** (khuyến nghị khi score các model không cùng ý nghĩa): mỗi model xếp thứ hạng ứng viên, chuyển sang percentile/rank score thống nhất rồi cộng trọng số; hoặc
  - **Weighted normalized score**: chỉ khi định nghĩa cách chuẩn hóa cho từng model và chứng minh không có model nào chi phối do thang đo.
- [ ] Ghi rõ công thức, miền score, chiều tốt/xấu, quy tắc khi đồng hạng, quy tắc khi model không có đủ score.
- [ ] Kiểm tra `weights` hữu hạn, dương hoặc bằng 0 theo chính sách; tổng trọng số hoạt động phải lớn hơn 0. Trọng số cấu hình lỗi phải phát lỗi rõ ràng hoặc bị loại theo quy tắc có log, không âm thầm thay bằng `0.1`.
- [ ] Không dùng giá trị thay thế cố định `50` khi score thiếu/không hợp lệ. Loại model khỏi lần tổng hợp hoặc chuyển trạng thái `partial`, đồng thời ghi diagnostics.
- [ ] Chuẩn hóa việc đọc khóa score, đặc biệt giữa `7` và `'07'` cho XSMN; bảo đảm score lookup không bị hụt do định dạng key.
- [ ] Giữ thông tin `subResults` gồm status, weight thực sự dùng, số ứng viên có score hợp lệ, lỗi và tên phương pháp tổng hợp.
- [ ] Thay các cụm từ “xác suất” bằng “score xếp hạng” nếu chưa có calibration thực sự. Không hiển thị score 0–100 như xác suất trúng.

## Acceptance criteria

- [ ] Có fixture giả lập mà model A trả score 0–1, model B trả 0–100 và model C trả rank; kết quả tổng hợp không phụ thuộc tùy tiện vào đơn vị score.
- [ ] Kết quả xếp hạng có thể được tính lại độc lập trong test và khớp hoàn toàn với output của Ensemble.
- [ ] Thêm test với score thiếu, score toàn `NaN`, model throw error, model trả rỗng, trọng số âm/NaN/tất cả bằng 0.
- [ ] Với cùng input và cấu hình, kết quả Ensemble luôn tái lập được.

---

# 4. P1 — Sửa tiêu chí Backtest, baseline và xác minh không rò rỉ dữ liệu thật

## Files

- `js/backtest-engine.js`
- `js/algorithms/ensemble.js`
- `js/app.js`
- `js/ui-controller.js`
- `test/run-tests.js`

## 4.1 Loại baseline mặc định và thống kê giả

- [ ] Xóa fallback `13.3` và `18.0` trong `runBatchBacktest()` khi không có fold baseline thành công.
- [ ] Nếu `successfulFolds === 0`, trả `status: 'insufficient-data'`, `baseline: null` hoặc trạng thái tương đương; không tạo `baselineDiff`, `exceedsBaseline` hay Top 1.
- [ ] Không tính `exceedsBaseline` là `true` khi bằng đúng baseline; trường này chỉ `true` nếu metric vượt baseline theo phép so sánh được định nghĩa.
- [ ] Trả `drawsRequested`, `drawsEligible`, `drawsTested`, `drawsFailed` và danh sách lý do bỏ fold. `drawsTestedCount` phải là số fold thực sự thành công, không phải độ dài mảng yêu cầu ban đầu.
- [ ] Các thuật toán phải được so sánh trên **chính xác cùng một tập kỳ test**. Nếu một model lỗi ở một kỳ, đánh dấu fold/model không đầy đủ và không so sánh trung bình từ các mẫu khác nhau mà không công khai.

## 4.2 Kiểm tra anti-leakage bằng cách quan sát thật input của model

Test hiện tại tự tạo một mảng đã lọc rồi kiểm tra nó, nên không xác minh `BacktestEngine` thật sự truyền đúng train set.

- [ ] Tách một hàm chuẩn như `buildTrainingSet(history, targetDate)` để kiểm tra và dùng lại trong production; hoặc instrument/spy các hàm `predict()` trong test để ghi lại mọi ngày được truyền vào.
- [ ] Trên mỗi fold thật, assert rằng mọi training row có `date < targetDate`; không bản ghi mục tiêu, bản ghi tương lai hoặc bản ghi cùng ngày khác bị lẫn vào train set.
- [ ] Trước khi lọc, validate ngày và chuẩn hóa thứ tự; không sử dụng so sánh ngày dạng chuỗi với dữ liệu không chuẩn ISO.
- [ ] Kiểm tra việc tạo feature/chuẩn hóa/tuning tham số không fit trên toàn bộ lịch sử trước khi chia fold.
- [ ] Thêm canary/leakage test: cố tình chèn một bản ghi có ngày mục tiêu và một bản ghi tương lai có giá trị nổi bật; kết quả phải chứng minh cả hai không vào `predict()` cho fold mục tiêu.
- [ ] Kiểm tra lịch sử được đưa vào thuật toán vẫn theo đúng quy ước `historyData[0]` là mới nhất; nếu đầu vào không đúng thứ tự thì chuẩn hóa ở tầng điều phối hoặc từ chối với lỗi rõ ràng.

## 4.3 Baseline ngẫu nhiên phải có phân phối, không chỉ một lần bốc thăm

- [ ] Dùng nhiều lần baseline ngẫu nhiên có seed xác định cho mỗi fold; cấu hình được số lần lặp, chẳng hạn 100 replicate/fold trong báo cáo đầy đủ và 10–20 trong test nhanh.
- [ ] Seed phải gắn với game, đài, kỳ test, replicate index và cấu hình, không chỉ riêng ngày; cùng cấu hình chạy lại phải cho cùng kết quả.
- [ ] Baseline phải sử dụng cùng số ứng viên, cùng miền số và đúng luật của loại xổ số đang đánh giá.
- [ ] Tính metric baseline trên cùng folds với thuật toán; báo cáo trung bình/phân phối và chênh lệch theo từng fold (paired comparison), không dùng một dàn random duy nhất như bằng chứng mạnh.
- [ ] Không tự điền hit rate baseline khi không có kết quả thực.

## 4.4 Định nghĩa metric nhất quán

- [ ] Giữ tách biệt: `meanHitsPerDraw`, `meanHitRate`, `drawsWithAtLeastOneHit`, `totalOccurrences`, `specialMatches`, `baselineDiff`.
- [ ] Ghi công thức từng metric và denominator cho mỗi game.
- [ ] Với Vietlott, số hit là giao của sáu số dự đoán với sáu số chính; quy tắc số đặc biệt phải được công bố riêng nếu có tính.
- [ ] Với XSMN, phân biệt **số dự đoán có xuất hiện ít nhất một lần** với **tổng số nháy/occurrences**. Không trộn hai metric vào một nhãn “tỷ lệ trúng”.
- [ ] Nếu tính khoảng bất định, resample theo kỳ quay/fold (paired by draw), ghi phương pháp và số mẫu; không gọi standard deviation của Monte Carlo là confidence interval.

## Acceptance criteria

- [ ] Test chống leakage gọi code production thực tế và thất bại khi can thiệp làm lộ kỳ mục tiêu/tương lai.
- [ ] Không có baseline/hit rate giả khi không có fold hợp lệ.
- [ ] Tất cả model được xếp hạng từ cùng các fold thành công hoặc hiển thị rõ trạng thái chưa đủ dữ liệu để so sánh.
- [ ] Có một fixture nhỏ có thể tính tay để xác minh hit count, hit rate, occurrences và baseline difference.

---

# 5. P1 — Bảng xếp hạng rõ Top 1, công bằng và đồng nhất trên UI

## Yêu cầu sản phẩm

Người xem phải nhìn thấy ngay thuật toán đang đứng **Top 1**, vì sao đứng đầu và đã được kiểm định trên bao nhiêu kỳ. Top 1 phải lấy từ kết quả Backtest hợp lệ, không lấy từ một kỳ vừa dò và không dùng score tùy ý để tô vương miện.

## 5.1 Quy tắc xếp hạng

- [ ] Dùng một metric chính đã công bố, ví dụ `meanHitRate` hoặc `meanHitsPerDraw`, tùy game; chọn một metric primary ổn định và dùng đúng nó để sắp xếp leaderboard.
- [ ] Không dùng `bestHitRate` hoặc `specialMatches * 5` làm phần thưởng lớn trong composite score; các metric này hiển thị ở cột riêng nếu hữu ích nhưng không được âm thầm quyết định Top 1.
- [ ] Nếu cần tie-break, ghi rõ thứ tự, ví dụ: metric primary giảm dần → paired `baselineDiff` giảm dần → độ ổn định qua các fold → `id` theo thứ tự ổn định. Không dùng random tie-break.
- [ ] Nếu chưa có số fold tối thiểu hoặc mẫu quá nhỏ, hiển thị “Xếp hạng tạm thời — chưa đủ mẫu”, không tuyên bố Top 1 có lợi thế dự đoán chắc chắn.
- [ ] Chỉ so sánh model trong cùng loại game/đài/cùng kỳ test/cùng số lượng dự đoán. Không gộp XSMN với Vietlott vào cùng bảng.
- [ ] Thêm trường `rank` vào kết quả backend một cách xác định và kiểm tra `rank === index + 1`.

## 5.2 Hiển thị trong giao diện

- [ ] `UIController.renderLeaderboard()` hiển thị thứ tự từ Top 1 xuống; hàng đầu làm nổi bật vừa phải và có badge “TOP 1” + primary metric + baseline difference + số kỳ đánh giá.
- [ ] Thêm vùng tóm tắt Top 1 ở đầu bảng xếp hạng: tên model, điểm metric chính, baseline chênh lệch, số fold thành công và thời điểm/backtest configuration. Nếu không đủ dữ liệu, thay vùng này bằng trạng thái giải thích.
- [ ] KPI `kpi-top-algo-name` và `kpi-top-hitrate` phải lấy cùng một đối tượng Top 1 trong leaderboard; không tự tính/xếp hạng riêng ở một nơi khác.
- [ ] Trong tab “Dự đoán đa thuật toán”, nếu muốn xếp các card theo thành tích lịch sử thì sắp theo **leaderboard của đúng game/đài đã chọn** và hiển thị rank badge. Không sắp theo hit của kỳ vừa mở hoặc score chưa kiểm định. Model chưa có rank phải hiện “Chưa xếp hạng”.
- [ ] Khi chuyển XSMN ↔ Vietlott, đổi đài, đổi Mega ↔ Power, đổi khoảng backtest, phải tính lại Top 1 theo dữ liệu và config tương ứng; không giữ kết quả cũ từ filter khác.
- [ ] Khi dữ liệu backtest thay đổi hoặc không tải được, không giữ Top 1 cũ như thể vẫn thuộc cấu hình mới. Hiện loading/error/stale-state rõ ràng.
- [ ] Bảng phải hiển thị metric và định nghĩa tooltip đơn giản; tránh nhãn mơ hồ “Điểm khoa học” nếu điểm không có định nghĩa cụ thể.
- [ ] Bảo đảm responsive: trên mobile cho phép cuộn bên trong bảng, không làm trang tràn ngang; rank, tên model và metric primary vẫn dễ đọc.

## Acceptance criteria

- [ ] Bộ test tự tính metric và xác nhận thuật toán được xếp đầu chính là hàng Top 1, KPI Top 1 và badge ở tab dự đoán.
- [ ] Thay input metric trong fixture làm thứ tự thay đổi đúng; thay điểm `bestHitRate` hoặc `specialMatches` không thể lật Top 1 nếu metric primary không đổi.
- [ ] Tie có quy tắc ổn định, kết quả thứ tự lặp lại giống nhau.
- [ ] Với 0 fold, không có badge/copy Top 1 giả.
- [ ] Khi đổi game/đài, kết quả không bị trộn lẫn.

---

# 6. P1 — Đồng bộ tên thuật toán, mô tả, metric và nội dung khoa học

## Files cần rà soát

- `js/algorithms/clustering.js`
- `js/algorithms/association-rules.js`
- `js/algorithms/ensemble.js`
- `js/ui-controller.js`
- `index.html`
- `README.md`
- `docs/scientific-report.md`

## Việc phải làm

- [ ] `ClusteringAlgorithm` hiện chấm điểm heuristic theo parity/low-high/mean distance/frequency; nếu chưa triển khai K-Means thực sự, bỏ nhãn “K-Means”, “phân cụm K-Means” và các câu khẳng định đang dùng thuật toán K-Means.
- [ ] `AssociationRulesAlgorithm` hiện kết hợp đồng xuất hiện và chuyển tiếp thời gian bằng score tùy chỉnh; kiểm tra có đủ candidate generation/support/confidence/lift theo Apriori thật không. Nếu không, đặt tên trung thực như “Association heuristic / pair transition scoring”, và sửa README, report, UI, chart badge.
- [ ] Với `Markov`, ghi đúng bậc đang dùng; bảo đảm trạng thái XSMN được tính theo sự kiện xuất hiện trong kỳ, không vô tình đếm một số lặp lại nhiều lần trong cùng kỳ thành nhiều trạng thái độc lập nếu mô hình định nghĩa trạng thái là “có xuất hiện trong kỳ”.
- [ ] Xóa copy nói “học máy” nếu module chỉ là heuristic rule-based; có thể mô tả là “mô hình định lượng/heuristic” một cách chính xác.
- [ ] Đồng bộ tiêu đề thuật toán, id, tooltip, tên trên bảng, giải thích kết quả và tài liệu khoa học.
- [ ] Không viết lại phương pháp phức tạp chỉ để giữ tên tiếp thị. Ưu tiên đổi tên/copy cho đúng trước; nếu thực sự muốn triển khai thuật toán chuẩn, thêm đặc tả và test riêng.

## Acceptance criteria

- [ ] Search toàn repository không còn nhãn sai đã xác định nếu chưa được triển khai đúng.
- [ ] Công thức trong `scientific-report.md` tương ứng với code có test.
- [ ] Mỗi algorithm có test toán học/logic riêng, không chỉ xác nhận `predictions.length`.

---

# 7. P0 — Đối soát 100% dữ liệu lịch sử theo nguồn, không giảm mẫu số

Đây là cổng nghiệm thu bắt buộc của project. Không chỉ audit định dạng; phải xác minh giá trị lịch sử thực tế với bằng chứng nguồn, và phải sửa các giá trị sai/thiếu. Không được pass bằng cách loại bỏ record lỗi. Thực thi đầy đủ mục **“CHỈ THỊ BẮT BUỘC — ĐỘ CHÍNH XÁC 100% CỦA DỮ LIỆU LỊCH SỬ”** ở đầu file.

## Việc phải làm

- [ ] Tạo một báo cáo kiểm tra dữ liệu máy đọc được, bao gồm: số bản ghi, ngày đầu/cuối, số kỳ dự kiến theo manifest, số kỳ đã đối chiếu, ngày/mã kỳ thiếu hoặc trùng, xung đột nguồn, số nằm ngoài miền, số phần tử mỗi kỳ, trường bắt buộc chưa khớp, repair queue, raw snapshot và trạng thái của từng bản ghi. Báo cáo phải chứng minh từng kỳ trong manifest đã được xác minh, không chỉ thống kê các dòng đang có.
- [ ] Kiểm tra tính liên tục mã kỳ Vietlott theo quy tắc nguồn; báo riêng mã kỳ thiếu/trùng, không chỉ kiểm tra mã kỳ đầu tiên là `#00001`.
- [ ] Với XSMN, lập thống kê số kỳ theo từng đài và ngày đầu/cuối. Hiện dữ liệu chỉ có khoảng 16 kỳ/đài (TP.HCM khoảng 32 kỳ), nên UI và test không được tuyên bố “toàn bộ lịch sử XSMN” khi chưa crawl/đối chiếu toàn bộ thời gian mục tiêu.
- [ ] Đổi mô tả metadata chung “dữ liệu thực tế đầy đủ” thành mô tả có phạm vi và timestamp chính xác. Không đánh đồng “đã scrape từ nguồn” với “đã xác minh độc lập”.
- [ ] `js/data-service.js` không hiển thị ngày mặc định `15/10/2026` khi không có kỳ Power; hiển thị “Chưa có dữ liệu mới” hoặc “Không xác định được kỳ mới nhất”.
- [ ] Hiển thị last successful sync riêng với thời gian lần thử gần nhất. Nếu crawler thất bại và dùng cache, phải ghi “Đang dùng dữ liệu lưu sẵn — lần đồng bộ mới thất bại”, không gắn trạng thái xanh như live-synced.
- [ ] Không mặc định cho rằng lấy dữ liệu từ một aggregator tức mọi trường đã chính xác. Ưu tiên nguồn chính thức; đối chiếu **toàn bộ các trường bắt buộc trên toàn bộ phạm vi mục tiêu**, không chỉ spot-check. Nếu dùng nguồn thứ hai để thay thế archive chính thức bị thiếu, lưu source tier và bằng chứng cho từng record.

## Acceptance criteria

- [ ] Báo cáo dữ liệu tái lập được qua một lệnh script.
- [ ] Tất cả ngày/kỳ dự kiến và trường bắt buộc trong phạm vi đã khai báo được đối chiếu nguồn đạt 100%; không có kỳ/trường chưa xác minh.
- [ ] Khi chưa đạt 100%, phải hiển thị `BLOCKED` và liệt kê missing/conflict/repair queue; không được xóa các kỳ khỏi manifest, không giảm thời gian lịch sử và không ghi `Completed`.
- [ ] Không có câu quảng bá toàn bộ lịch sử XSMN nếu tập dữ liệu chỉ bao phủ một phần thời gian.
- [ ] Lỗi cập nhật và dữ liệu cache được phản ánh trung thực trong UI.

---

# 8. P0/P1 — Xây test loops đủ mạnh cho thuật toán và backtest

Không chấp nhận chỉ thêm các assert kiểm tra “có mảng”, “đủ số”, hoặc “không crash”. Test cần kiểm tra tính chất của output, metric chính xác, các biên, và hành vi của pipeline thực.

## 8.1 Unit/property tests theo ma trận thuật toán × game × dữ liệu

Tạo fixtures tổng hợp nhỏ có thể tính tay và fixtures từ file lịch sử. Duyệt vòng lặp qua toàn bộ 8 thuật toán và các mode phù hợp:

- Mega 6/45.
- Power 6/55.
- XSMN từng đài cụ thể; không chỉ truyền trộn 352 bản ghi của 21 đài như thể là một chuỗi kết quả của cùng một đài.

Mỗi thuật toán được kiểm tra với các ca:

1. Lịch sử rỗng.
2. Một kỳ duy nhất.
3. Số kỳ đúng bằng ngưỡng tối thiểu.
4. Lịch sử dài hơn ngưỡng.
5. Bản ghi lô tô có đuôi trùng trong XSMN.
6. Input thiếu trường, trường null, sai kiểu hoặc sai miền.
7. Lịch sử theo thứ tự mới → cũ và lịch sử bị đảo cũ → mới.
8. Ngày trùng, ngày lỗi định dạng hoặc hai bản ghi cùng ngày nhưng khác đài.
9. Điểm có `NaN`, `Infinity`, score rỗng hoặc dự đoán rỗng.
10. Seed cố định và seed khác đối với thuật toán ngẫu nhiên có chủ đích.

Kiểm tra tối thiểu trên mỗi output hợp lệ:

- [ ] Status đúng với mức dữ liệu.
- [ ] `predictions.length` đúng với `topN` khi status `ok`, hoặc là `[]` khi `insufficient-data`.
- [ ] Không trùng ứng viên trong dàn Vietlott; các số trong miền; đúng kiểu dữ liệu/format.
- [ ] Dàn XSMN đúng định dạng hai chữ số; không cấm lặp trong **kết quả thực tế** nhưng dàn dự đoán ứng viên phải theo chính sách rõ ràng (thường duy nhất).
- [ ] Tất cả score hữu hạn; không có `NaN`, `Infinity`, `undefined` hoặc key không hợp lệ.
- [ ] Score/metric khớp ví dụ tính tay cho fixture tối thiểu.
- [ ] Cùng input, cùng options và cùng seed cho kết quả tái lập nếu model được thiết kế deterministic.
- [ ] Không có model nào âm thầm tạo dàn số khi thiếu dữ liệu.

## 8.2 Vòng lặp kiểm tra Monte Carlo

- [ ] Chạy vòng seed xác định, ví dụ `[1, 7, 21, 45, 55, 99, 123456789, 987654321]` với `simulations` nhỏ trong unit test và nhiều hơn trong integration test.
- [ ] Với từng seed và game, xác minh miền số, số lượng bóng, tính duy nhất Vietlott và cho phép trùng XSMN theo luật mô phỏng.
- [ ] Đếm và expose `incompleteSimulations`; với Vietlott, mỗi lần mô phỏng phải tạo đúng số bóng yêu cầu. Nếu sampling không đạt, phải sửa cách lấy mẫu hoặc fail rõ ràng, không âm thầm tính thiếu số.
- [ ] Xác nhận cùng seed/input/options cho cùng kết quả score, thứ hạng và metrics; không chỉ kiểm tra mỗi `predictions`.
- [ ] Kiểm tra hội tụ phân phối bằng tolerance thống kê hợp lý trên một fixture xác suất đã biết; tolerance phải được mô tả, tránh test mong một dãy số cụ thể được xem là “trúng”.
- [ ] Test tốc độ: đặt timeout tối đa hợp lý và báo thời gian chạy. Không để vòng `while` lấy số duy nhất có thể lặp vô hạn.

## 8.3 Vòng lặp walk-forward thật qua nhiều fold

- [ ] Dùng `BacktestEngine` thật, không tự viết lại filter dữ liệu ở test rồi kết luận production không leakage.
- [ ] Chạy từng game Vietlott trên tất cả fold hợp lệ trong test mode; chạy từng đài XSMN trên các kỳ hợp lệ của riêng đài đó. Kỳ đầu không đủ lịch sử phải được đếm là không đủ điều kiện, không là fail dự đoán.
- [ ] Ở mỗi fold, spy input đi vào tất cả `predict()` và assert `max(trainingDate) < targetDate`; kiểm tra không có target/future record trong training set và dữ liệu đầu vào sắp xếp theo cùng contract.
- [ ] Chạy smoke test tối thiểu 20 kỳ gần nhất khi có đủ dữ liệu; full regression test dùng toàn bộ fold khả thi theo giới hạn runtime được công bố.
- [ ] Có `simulations` override trong test để Monte Carlo không chạy 10.000 vòng ở mỗi fold unit; dùng số nhỏ cho smoke, số trung bình cho integration, 10.000 hoặc cấu hình chuẩn ở benchmark riêng.
- [ ] Lưu test artifact gồm game/đài, ngày target, số dòng train, model status, metric, baseline seed và thời gian chạy.
- [ ] Nếu model lỗi ở một fold, báo `failedFoldCount`, không loại im lặng khỏi trung bình.

## 8.4 Tính đúng metric bằng fixture tính tay

Tạo fixture tối giản, ví dụ một kỳ Vietlott có sáu số chính cố định và một kỳ XSMN với một cặp số xuất hiện nhiều lần. Xác minh:

- [ ] `hitCount` theo số dự đoán khớp.
- [ ] `totalOccurrences` tính đúng tổng số nháy XSMN.
- [ ] `hitRate` dùng đúng denominator.
- [ ] `specialMatches` được định nghĩa riêng và tính đúng.
- [ ] Baseline difference bằng metric model trừ metric baseline trên cùng tập folds.
- [ ] Model không thể được lợi khi chỉ có ít fold thành công hơn model khác.

## 8.5 Kiểm tra dữ liệu và parser dạng lặp

- [ ] Duyệt qua mọi bản ghi lịch sử để xác minh schema, ngày, số, drawId, duplicate và thứ tự.
- [ ] Chạy parser trên fixtures HTML offline nhiều lần; kết quả parse phải deterministic.
- [ ] Với input lỗi, số record bị từ chối và lý do phải được báo ra; parser không được âm thầm rơi về ngày mặc định.
- [ ] Test merge lặp cùng một tập dữ liệu hai lần phải không tăng bản ghi duplicate; merge bản ghi lỗi không được sửa/hỏng bản ghi đúng.
- [ ] Có test cập nhật một bản ghi cùng key: trường được cập nhật phải tuân theo chính sách, còn metadata provenance phải được giữ.

---

# 9. P0/P1 — Kiểm thử giao diện bằng trình duyệt thật (không chỉ mock DOM)

## 9.1 Thiết lập E2E

- [ ] Kiểm tra dependency/test tooling hiện có. Nếu chưa có browser automation, cài và cấu hình Playwright làm `devDependency` sau khi kiểm tra khả năng tương thích; không thêm thư viện UI hoặc đổi framework chỉ để chạy test.
- [ ] Tạo script rõ ràng, ví dụ:
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run test:e2e`
  - `npm run test:all`
- [ ] Dựng website bằng local server trong test. Mock/freeze các call crawl/live để E2E không phụ thuộc website bên ngoài hoặc bị rate-limit; dùng seed đã khóa phiên bản làm dữ liệu chuẩn.
- [ ] E2E phải chạy browser thật (Chromium tối thiểu); không dùng object `document` tự chế làm bằng chứng UI hoạt động.
- [ ] Bắt `console.error`, `pageerror`, unhandled rejection và request lỗi ngoài danh sách được cho phép; test fail khi có lỗi mới.

## 9.2 Viewport và luồng cần test

Chạy các luồng tối thiểu trên viewport:

- Desktop: `1920×1080` và `1365×900`.
- Tablet: `768×1024`.
- Mobile: `390×844` và `375×812`.

Mỗi viewport test:

- [ ] Trang khởi động với cache/seed ổn định, không hiển thị số liệu giả trong lúc loading.
- [ ] Chuyển qua 6 khu vực: Kết quả mới nhất, Dự đoán đa thuật toán, Dashboard, Dò số/Backtest, Bảng xếp hạng, Tài liệu.
- [ ] Chuyển XSMN ↔ Vietlott; đổi từng đài XSMN; đổi Mega ↔ Power; xác nhận dữ liệu, metric, số bóng và Top 1 thuộc đúng bộ lọc.
- [ ] Chạy backtest một ngày và batch leaderboard; kiểm tra trạng thái loading/success/empty/error.
- [ ] Kiểm tra Top 1 card, bảng xếp hạng, badge thứ hạng và KPI tổng hợp cùng tham chiếu một kết quả.
- [ ] Kiểm tra chart render với dữ liệu thực, dữ liệu rỗng và dữ liệu lỗi.
- [ ] Kiểm tra tất cả nút, dropdown, tab, modal, đóng/mở modal và chức năng quay lại; không được có nút giả hoặc click không phản hồi.
- [ ] Kiểm tra focus bàn phím, outline/focus-visible, accessible name quan trọng và target thao tác trên mobile.
- [ ] Đo `document.documentElement.scrollWidth` với `window.innerWidth`; trang không tràn ngang ngoài vùng bảng chủ động cuộn.
- [ ] Kiểm tra text không bị cắt, nội dung số liệu không bị chồng lấp và bảng vẫn xem được trên màn hình nhỏ.
- [ ] Kiểm tra thời gian render/prediction dưới ngưỡng mục tiêu đã ghi; nếu có chart/polling, xác nhận không tạo nhiều timer/listener sau khi đổi tab.

## 9.3 Chụp ảnh và kiểm tra giao diện

- [ ] Tạo screenshot từ **source hiện tại vừa chạy trong browser**, không dùng screenshot commit cũ làm bằng chứng.
- [ ] Chụp các trạng thái: Live XSMN, Live Vietlott, Dự đoán, Dashboard, Backtest có kết quả, Leaderboard có Top 1, Leaderboard không đủ dữ liệu, trạng thái crawl lỗi.
- [ ] Lưu screenshot/artifact theo timestamp hoặc run ID trong thư mục test artifact; không ghi đè ảnh baseline một cách tự động nếu test bị lỗi.
- [ ] Chỉ dùng visual regression/pixel diff khi có baseline được duyệt; có thể dùng tolerance cho font anti-aliasing và chart. Không tăng tolerance để che lệch layout.
- [ ] Nếu screenshot mới không còn tương ứng với source (ví dụ screenshot vẫn hiện KPI cũ), đánh dấu test/documentation stale và cập nhật.

---

# 10. Lặp kiểm thử tự động nhiều vòng và báo cáo fail-fast

Cần phân tầng thời gian để không làm test quá nặng nhưng vẫn bắt được lỗi khó tái hiện.

### Mỗi vòng sửa code

1. Chạy unit tests tương ứng với file vừa sửa.
2. Chạy toàn bộ `npm run test:unit`.
3. Chạy `npm run test:integration` cho data validation + backtest + ensemble.
4. Chạy `npm run test:e2e` trên Chromium với các viewport đã quy định.
5. Kiểm tra báo cáo, sửa mọi lỗi; lặp lại từ bước 1 đến khi sạch.

### Trước khi báo hoàn thành

- [ ] Trước cả vòng lặp test cuối, chạy `npm run audit:history -- --strict` trên toàn bộ manifest. Nếu coverage/source-match thấp hơn 100% hoặc unresolved lớn hơn 0, không được tuyên bố hoàn thành; phải quay lại repair queue để khôi phục dữ liệu và chạy audit lại. Không được đổi manifest để làm audit pass.
- [ ] Chạy `npm run test:all` **3 lần liên tiếp** trong cùng commit, với seeds/config cố định. Cả ba lần phải pass và số kết quả phải tái lập ở các suite deterministic.
- [ ] Chạy một vòng với seed test khác để phát hiện phụ thuộc vô tình vào một seed; không đòi hỏi dự đoán phải trúng, chỉ đòi hỏi invariants đúng.
- [ ] Chạy full walk-forward regression trên các fold lịch sử hợp lệ theo giới hạn runtime đã ghi.
- [ ] Kiểm tra lại `git diff`, `git status`, không có dữ liệu lịch sử bị thay đổi trái phép, không để log/debug hoặc file screenshot cũ được xem là test mới.
- [ ] Tất cả suite phải trả exit code non-zero khi có fail; không được chỉ `console.log('[FAIL]')` rồi kết thúc tiến trình với code 0.
- [ ] Ghi duration, seed, số test, số pass/fail, số fold valid/failed và tên artifact.

Ví dụ quy trình shell (chỉnh theo scripts thực tế sau khi đã thêm):

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
for run in 1 2 3; do
  echo "FULL TEST ROUND ${run}/3"
  npm run test:all || exit 1
done
```

Không tuyên bố “đã kiểm tra tất cả” nếu chỉ chạy một unit test hay chỉ mock DOM.

---

# 11. Các điều kiện bổ sung cần test trực tiếp

- [ ] `DataService.validateMegaDraw({ date: '2026-99-99', winningNumbers: [1,2,3,4,5,6] })` phải bị từ chối.
- [ ] Power có `bonusNumber` bằng một số chính hoặc là `7.5` phải bị từ chối theo schema chuẩn.
- [ ] XSMN có `lottoPairs: Array(18).fill('XX')` phải bị từ chối.
- [ ] Mọi model với `[]` không trả dàn số ngẫu nhiên; Ensemble với `[]` không trả sáu số đầu làm dự đoán.
- [ ] `runBatchBacktest([], options, 20)` không được trả baseline `13.3`/`18.0`, `baselineDiff` giả hoặc bảng xếp hạng như đã kiểm định.
- [ ] Xếp hạng Top 1 phải thay đổi khi và chỉ khi metric đã chọn thay đổi theo dữ liệu hoặc có tie-break hợp lệ; không bị `specialMatches * 5` hoặc một `bestHitRate` đơn lẻ điều khiển ngầm.
- [ ] Không có confidence/hit rate hard-code trong controller/HTML; không có `confidenceScore` được dùng như tỷ lệ xác suất.
- [ ] Search toàn dự án các fallback date/Jackpot/Draw ID mặc định; mọi fallback có rủi ro làm dữ liệu sai trông hợp lệ phải được loại bỏ.
- [ ] Không còn giao diện/tài liệu gọi mô hình heuristic là K-Means hoặc Apriori chuẩn nếu chưa triển khai đúng.
- [ ] UI không hiện “100% toàn bộ lịch sử XSMN” trong khi dữ liệu chỉ gồm 16 kỳ/đài.

---

# 12. Trình tự triển khai

## Phase A — Ghi baseline và tái hiện

- [ ] Chạy test hiện có, lưu log 75 PASS / 0 FAIL (hoặc kết quả baseline thực tế nếu khác).
- [ ] Thêm regression test trước khi sửa cho các lỗi đã tái hiện ở mục 0 và mục 11.
- [ ] Xác định các thành phần nào đang sử dụng `confidenceScore`, fallback prediction, baseline mặc định và `compositeScore`.

## Phase B — Dữ liệu lịch sử phải khớp nguồn 100% và trạng thái thiếu mẫu

- [ ] Xác định manifest coverage, lịch quay dự kiến và nguồn chuẩn; không thu hẹp phạm vi hiện có để làm đẹp tỷ lệ.
- [ ] Gỡ ngày/mã kỳ/Jackpot fallback trong tất cả parser.
- [ ] Tạo repair queue và quy trình backfill/reconciliation; sửa và khôi phục mọi record sai/thiếu thay vì bỏ record.
- [ ] Chạy audit 100% qua từng kỳ/trường bắt buộc, giải quyết toàn bộ conflict, xác nhận unresolved = 0. Nếu nguồn không cho phép xác minh, dừng ở `BLOCKED` và báo các dòng còn lại.
- [ ] Hoàn thiện validation và merge.
- [ ] Đổi toàn bộ default random prediction sang status `insufficient-data`.

## Phase C — Ensemble và logic backtest

- [ ] Chọn chuẩn score aggregation và thêm test độc lập.
- [ ] Gỡ baseline hard-code và sửa anti-leakage test để quan sát input production.
- [ ] Xây baseline nhiều replicate, metric thống nhất và tập fold so sánh công bằng.

## Phase D — Leaderboard Top 1

- [ ] Thay composite score tùy ý bằng primary metric có định nghĩa.
- [ ] Đồng bộ hàng Top 1, KPI và thứ tự card model theo đúng game/đài.
- [ ] Bổ sung trạng thái insufficient-data/provisional và baseline difference.

## Phase E — Test loops và browser E2E

- [ ] Bổ sung unit/property tests theo ma trận.
- [ ] Bổ sung repeated walk-forward, data ingest loops và seed loops.
- [ ] Cấu hình Playwright/browser test, responsive, console checks, screenshots hiện hành.

## Phase F — Tài liệu và báo cáo

- [ ] Sửa tên gọi algorithm, mô tả dữ liệu/phạm vi lịch sử và nội dung báo cáo khoa học.
- [ ] Chạy test ba vòng và lưu artifacts.
- [ ] Chỉ kết thúc khi tất cả acceptance criteria thiết yếu đạt; nếu có phần blocked phải nêu rõ, không đánh dấu hoàn thành giả.

---

# 13. Điều kiện nghiệm thu cuối cùng

Không được đánh dấu `Completed` trừ khi:

- [ ] Parser không tạo ngày/mã kỳ/Jackpot giả khi thiếu nguồn. Mọi lỗi dữ liệu lịch sử đã được khôi phục/đối chiếu từ nguồn, không đơn thuần bỏ đi.
- [ ] Validator phát hiện ngày lịch không hợp lệ và dữ liệu sai theo schema của từng game; các record đó có repair ticket/source evidence, sau sửa phải tái kiểm tra.
- [ ] Audit 100% nguồn trên manifest đạt: coverage 100%, required-field match 100%, unresolved missing draw/field/conflict = 0, invalid canonical records = 0, invented/defaulted historical values = 0. Nếu không đạt, trạng thái cuối bắt buộc là `BLOCKED`, không được `Completed`.
- [ ] Model không có đầu ra giả ngẫu nhiên khi thiếu lịch sử.
- [ ] Ensemble tổng hợp score đúng cơ chế đã tài liệu hóa, xử lý model lỗi, không gọi consensus là confidence.
- [ ] Backtest có kiểm tra anti-leakage từ pipeline thật, metric tính đúng, baseline không hard-code và các model so sánh trên cùng folds.
- [ ] Leaderboard xếp hạng Top 1 theo metric primary minh bạch; dashboard/KPI/tab dự đoán dùng cùng thứ tự và cùng phạm vi dữ liệu.
- [ ] Tên mô hình trên UI, code và tài liệu mô tả đúng cách triển khai.
- [ ] Unit/integration/E2E tests đều có thực thi thật; không chỉ mock DOM.
- [ ] `npm run test:all` pass 3 lần liên tiếp; test fail khiến lệnh trả mã lỗi.
- [ ] Screenshot mới được tạo từ trình duyệt với source hiện tại và được rà soát.
- [ ] Kết quả dữ liệu có phạm vi thời gian minh bạch; không tuyên bố đã xác minh toàn bộ lịch sử nếu mới xác minh cấu trúc hoặc chỉ có một phần lịch sử. Không được pass dữ liệu bằng cách xóa bản ghi lỗi, loại ngày khỏi manifest hoặc hạ phạm vi mục tiêu.
- [ ] Không tuyên bố mô hình tốt hơn ngẫu nhiên nếu chưa có đủ fold, baseline nhiều lần, phép đo bất định và kết quả ngoài mẫu hỗ trợ.

---

# 14. Báo cáo bắt buộc khi kết thúc

```text
FIX-2 IMPLEMENTATION REPORT

1. Baseline
- Commit/source version:
- Existing test result before edits:
- Confirmed defects reproduced:

2. Data validation/parser and 100% historical source reconciliation
- Files changed:
- Fallbacks removed:
- Schema checks added:
- Declared scope/manifest and expected draw count:
- Expected draws / verified draws / coverage %:
- Required fields matched to source / total required fields / match %:
- Unresolved missing draws / unresolved fields / source conflicts:
- Repair queue opened / repaired / still blocked:
- Data records corrected (before → after) with source evidence:
- Raw snapshot/checksum and audit report paths:
- Final strict audit status (must be 100% or BLOCKED):

3. Insufficient-data behavior
- Algorithms updated:
- Empty/short history behavior:
- UI state verified:

4. Ensemble
- Aggregation method and exact formula:
- Score normalization method:
- Failed-model handling:
- Tests proving ranking correctness:

5. Backtest/baseline
- Fold count requested / eligible / tested / failed:
- Anti-leakage instrumentation result:
- Baseline replicate count and seed strategy:
- Metric definitions:

6. Top 1 leaderboard
- Primary metric:
- Tie-break rule:
- Top 1 model for each tested configuration (game/station/window):
- Baseline difference and sample size:
- Empty/insufficient-data behavior:

7. Algorithm and documentation names
- Renamed labels or implemented methods:
- Files updated:

8. Automated test loops
- Unit tests:
- Integration/walk-forward tests:
- Browser/E2E tests:
- Viewports tested:
- 3 consecutive full-suite run results:
- Runtime and test artifacts:

9. Remaining risks
- Items unfinished/blocked:
- Parts not independently verified:
- Data scope limitations:

10. Final status
- Completed / Partially completed / Blocked
- Explicitly state that no prediction superiority is claimed unless supported by out-of-sample evidence.
```

**Nguyên tắc cuối:** mỗi kỳ lịch sử trong phạm vi phải được khớp với bằng chứng nguồn; phát hiện lỗi là nhiệm vụ mở đầu của vòng sửa, không phải lý do để xóa bản ghi. Dữ liệu sai/thiếu phải được khôi phục từ nguồn và lưu audit trail; nếu không xác minh được thì phải `BLOCKED`, tuyệt đối không chế giá trị hoặc tuyên bố hoàn thành. Thuật toán phải dùng dữ liệu đã xác minh, metric phải tính từ fold thực, Top 1 phải do tiêu chí công bố quyết định, và mọi tuyên bố “đã đúng/đã test” phải đi kèm bằng chứng chạy được.
