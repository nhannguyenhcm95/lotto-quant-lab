# FIX-1 — Sửa tính đúng đắn của dữ liệu, thuật toán và đánh giá mô hình

> **Mục tiêu:** sửa các vấn đề có thể làm cho LOTTO-QUANT LAB hiển thị chỉ số gây hiểu nhầm, sử dụng sai lịch quay, mô phỏng không đúng đặc điểm của từng loại xổ số hoặc đánh giá thuật toán thiếu chặt chẽ.
>
> **Đối tượng thực thi:** Codex / coding agent làm việc trực tiếp trong repository hiện có.
>
> **Nguyên tắc:** kiểm tra source code hiện tại trước khi sửa. Các tên file và dòng được nêu trong báo cáo trước chỉ là điểm bắt đầu để tìm kiếm; không giả định cấu trúc code vẫn y nguyên. Không viết lại toàn bộ dự án, không thay framework, không làm thay đổi giao diện hoặc API ngoài phạm vi cần thiết.

---

## 0. Quy tắc bắt buộc trước khi chỉnh sửa

- [ ] Xác nhận thư mục gốc dự án, framework, các script trong `package.json` và cách chạy test.
- [ ] Kiểm tra `git status` trước khi thay đổi. Không ghi đè hoặc xóa các thay đổi chưa commit của người dùng.
- [ ] Đọc những module hiện thực sự dùng cho dữ liệu, thuật toán, ensemble, backtest, KPI và crawl/merge lịch sử.
- [ ] Chạy test hiện có và lưu kết quả baseline. Nếu test thất bại trước khi sửa, ghi lại rõ các lỗi có sẵn.
- [ ] Xác định đường đi dữ liệu thực tế: nguồn → parser/crawler → validator → historical store → algorithm → ensemble → backtest → UI.
- [ ] Tạo hoặc cập nhật regression test trước khi thay đổi logic có rủi ro.
- [ ] Giữ tương thích với cấu trúc dữ liệu/API đang dùng; nếu bắt buộc đổi schema, phải thêm migration hoặc adapter tương thích và giải thích trong báo cáo.
- [ ] Không dùng kết quả xổ số tương lai, dữ liệu kỳ mục tiêu hoặc thống kê toàn bộ lịch sử để tạo feature cho một dự đoán trong quá khứ.
- [ ] Không tự tạo kết quả, ngày quay, mã kỳ, hit rate, confidence hoặc dữ liệu giả để làm cho test/UI trông đẹp hơn.

**Lưu ý:** nếu không tái hiện được một vấn đề được liệt kê dưới đây, hãy xác minh bằng code và test trước khi kết luận. Không tạo thay đổi chỉ vì tên hàm hoặc tên thuật toán nghe có vẻ chưa chuẩn.

---

## 1. P0 — Loại bỏ KPI và confidence không dựa trên dữ liệu thực

### Vấn đề cần xử lý

Kiểm tra các KPI trên dashboard và module ensemble xem có giá trị được gán trực tiếp, chẳng hạn confidence/hit rate cố định, tên thuật toán dẫn đầu đặt sẵn hoặc phần trăm không lấy từ kết quả đánh giá thực tế hay không.

Kiểm tra cả công thức confidence dựa trên đồng thuận mô hình, ví dụ dạng `65 + consensusRatio * 28`. **Đồng thuận giữa các thuật toán không đồng nghĩa với xác suất dự đoán đúng.** Không được trình bày giá trị kiểu này là xác suất trúng hoặc confidence thống kê đã được hiệu chuẩn.

### Việc cần làm

- [ ] Tìm và loại bỏ mọi KPI hard-code dành cho dữ liệu chạy thật.
- [ ] Tính tên thuật toán dẫn đầu từ kết quả backtest hợp lệ trong phạm vi bộ dữ liệu, loại xổ số, metric và khoảng thời gian đang chọn.
- [ ] Nếu không có kết quả backtest, mẫu chưa đủ, hoặc kết quả lỗi, hiển thị trạng thái như **“Chưa đủ dữ liệu đánh giá”** thay vì số giả.
- [ ] Nếu vẫn cần hiển thị mức đồng thuận, đổi nhãn thành **“Mức đồng thuận giữa mô hình”**, mô tả công thức và không gọi là xác suất trúng.
- [ ] Chỉ hiển thị xác suất dự đoán đã hiệu chuẩn khi có phương pháp calibration được mô tả và đánh giá trên dữ liệu ngoài mẫu. Nếu chưa có, không hiển thị xác suất.
- [ ] Mỗi KPI phải có định nghĩa, tử số, mẫu số, phạm vi game, khoảng thời gian và timestamp cập nhật.
- [ ] Không để UI tự bịa dữ liệu dự phòng khi API/service trả về `null`, danh sách rỗng hoặc lỗi.

### Acceptance criteria

- [ ] Không còn confidence/hit rate/tên model thắng được gán cố định trên đường đi của dữ liệu thật.
- [ ] Thay đổi dữ liệu backtest làm KPI thay đổi tương ứng.
- [ ] Trường hợp thiếu dữ liệu, API lỗi hoặc không đủ mẫu hiển thị trạng thái đúng, không hiển thị số liệu giả.
- [ ] Tên gọi và tooltip phân biệt rõ “đồng thuận mô hình”, “hit rate kiểm định” và “xác suất đã hiệu chuẩn”.
- [ ] Có test tự động ngăn việc vô tình đưa lại các KPI hard-code.

---

## 2. P1 — Sửa lịch quay và tính năng mùa vụ trong EMA / Moving Average

### Vấn đề cần xác minh

Kiểm tra xem thuật toán có giả định ngày quay tiếp theo là `ngày kỳ gần nhất + 1 ngày` hay không. Với xổ số có lịch quay theo thứ trong tuần, cách tính này có thể chọn sai ngày mục tiêu và làm sai feature mùa vụ.

### Việc cần làm

- [ ] Xác định lịch quay chính thức đang được dự án sử dụng cho từng game/đài; dùng một nguồn cấu hình thống nhất, không rải logic lịch ở nhiều module.
- [ ] Truyền `targetDrawDate` hoặc lịch quay mục tiêu vào thuật toán từ tầng điều phối. Không tự suy ra ngày bằng cách cộng một ngày lịch.
- [ ] Tách rõ timezone và cách parse ngày. Ngày chỉ có dạng `YYYY-MM-DD` không được vô tình dịch sang ngày trước/sau vì chuyển UTC/local time.
- [ ] Nếu không xác định được ngày quay tiếp theo hợp lệ, trả về trạng thái không đủ dữ liệu thay vì sử dụng ngày mặc định.
- [ ] Kiểm tra tính toán ngày trong tuần và thống kê mùa vụ. Nếu một nhóm có ít mẫu, cần shrinkage/smoothing hoặc bỏ feature mùa vụ thay vì tạo cảm giác chính xác giả.
- [ ] Nếu `dayHits` hoặc feature mùa vụ bằng nhau cho tất cả ứng viên, ghi rõ feature không phân biệt được ứng viên; không cộng trọng số lớn như thể feature đã có tác dụng.

### Acceptance criteria

- [ ] Có test với kỳ mục tiêu sau một ngày không quay và sau nhiều ngày nghỉ quay.
- [ ] Test lịch quay qua cuối tuần và cuối tháng, đồng thời kiểm tra timezone.
- [ ] Ngày mục tiêu được kiểm tra là ngày hợp lệ cho đúng game/đài.
- [ ] Không dùng kết quả của ngày mục tiêu hoặc tương lai để tính feature.
- [ ] Nếu không có dữ liệu đủ để ước lượng mùa vụ, hệ thống báo rõ hoặc giảm/bỏ trọng số feature.

---

## 3. P1 — Làm cho Monte Carlo đúng với cơ chế từng loại xổ số

### Vấn đề cần xác minh

Không dùng chung một quy tắc lấy mẫu cho Vietlott và XSMN nếu đặc điểm dữ liệu khác nhau. Vietlott lấy các bóng chính không trùng trong một lượt; dữ liệu lô tô XSMN được chuyển thành hai chữ số cuối từ các giải thưởng và các cặp đó có thể trùng nhau trong cùng kỳ.

Ngoài ra, `Math.random()` trực tiếp khiến kết quả mô phỏng khó tái lập trong test. Điều này không tự động làm thuật toán sai, nhưng gây khó khăn khi kiểm định hoặc điều tra thay đổi.

### Việc cần làm

- [ ] Tách strategy lấy mẫu theo loại game và mô tả quy tắc của từng strategy.
- [ ] Với Mega 6/45: sinh đúng 6 số chính duy nhất trong miền 1–45.
- [ ] Với Power 6/55: sinh đúng 6 số chính duy nhất trong miền 1–55; xử lý số đặc biệt theo đúng quy tắc nguồn dữ liệu và quy tắc game. Không gộp số đặc biệt vào sáu số chính nếu schema tách riêng.
- [ ] Với XSMN: giữ nguyên khả năng hai chữ số cuối trùng nhau giữa các giải; không ép các kết quả lô tô thành tập hợp duy nhất khi mô phỏng 18 kết quả.
- [ ] Tiêm một random generator vào module thay vì gọi `Math.random()` rải rác. Cung cấp seed cố định trong test/repro mode.
- [ ] Với cùng input và seed, kết quả chạy phải tái lập được.
- [ ] Bổ sung kiểm tra phân phối mô phỏng, miền giá trị, số phần tử và tính duy nhất chỉ ở nơi luật game yêu cầu.
- [ ] Rà soát tên “confidence interval”. Nếu code chưa thực sự tính khoảng bất định bằng phương pháp được mô tả, hãy bỏ nhãn này hoặc thay bằng nhãn trung thực như **“Độ biến động qua các lần mô phỏng”**. Không gọi percentile hoặc độ lệch đơn giản là khoảng tin cậy thống kê nếu chưa có cơ sở.
- [ ] Ghi số vòng mô phỏng, seed/mode, cách tính score và giới hạn của mô phỏng trong phần chi tiết hoặc log.

### Acceptance criteria

- [ ] Test xác nhận Mega luôn có đúng 6 số chính hợp lệ và không trùng.
- [ ] Test xác nhận Power có đúng 6 số chính hợp lệ, không trùng, và xử lý số đặc biệt riêng.
- [ ] Test xác nhận XSMN có thể sinh các đuôi trùng lặp và vẫn giữ đúng số lượng kết quả mô phỏng.
- [ ] Cùng seed/input cho kết quả giống nhau; seed khác có thể tạo kết quả khác.
- [ ] Kết quả mô phỏng không được mô tả là dự đoán chắc chắn hoặc bằng chứng tự thân về khả năng trúng cao hơn.

---

## 4. P1 — Sửa logic xếp hạng Ensemble

### Vấn đề cần xác minh

Kiểm tra xem Ensemble có cộng trọng số nhưng lại xếp ứng viên chủ yếu theo số phiếu đồng thuận trước, chỉ dùng tổng điểm để phá hòa hay không. Nếu vậy, thuật toán không thực sự xếp hạng theo weighted score như mô tả.

Các module cũng có thể tạo ra điểm theo thang đo khác nhau; cộng trực tiếp những thang điểm không tương thích có thể làm kết quả bị chi phối bởi module có thang lớn hơn.

### Quyết định triển khai

Chọn **một** cơ chế và dùng nhất quán:

1. **Weighted score / soft voting:** chuẩn hóa điểm mỗi model cho cùng thang đo, sau đó tính tổng có trọng số; hoặc
2. **Weighted rank aggregation:** chuyển kết quả thành thứ hạng, sau đó tổng hợp thứ hạng có trọng số.

Không âm thầm kết hợp một cơ chế để tính điểm và cơ chế khác để xếp hạng.

### Việc cần làm

- [ ] Chọn và ghi rõ cơ chế Ensemble trong tài liệu/code comment.
- [ ] Chuẩn hóa output của từng thuật toán; xác định cách xử lý output thiếu, `NaN`, vô cực hoặc model lỗi.
- [ ] Kiểm tra trọng số đều hữu hạn, không âm, tổng trọng số lớn hơn 0; xử lý cấu hình không hợp lệ bằng lỗi rõ ràng.
- [ ] Đảm bảo xếp hạng cuối cùng thực sự theo score được công bố.
- [ ] Không huấn luyện/trọn trọng số bằng các kỳ được dùng để báo cáo hiệu suất cuối. Nếu có tối ưu trọng số, phải có giai đoạn validation riêng.
- [ ] Ghi rõ model nào đã tham gia vào ensemble; không tính sự đồng thuận của model bị lỗi hoặc không trả kết quả.
- [ ] Không quy đổi tổng điểm hoặc số phiếu thành phần trăm xác suất trúng nếu chưa hiệu chuẩn.

### Acceptance criteria

- [ ] Có test đầu vào giả lập mà weighted score và consensus cho thứ tự khác nhau; kết quả xếp hạng tuân theo cơ chế đã chọn.
- [ ] Có test kiểm tra trọng số bằng 0, âm, thiếu hoặc `NaN`.
- [ ] Có test cho model trả kết quả rỗng/lỗi mà không làm hỏng toàn bộ ứng dụng hoặc âm thầm tạo điểm sai.
- [ ] Tài liệu mô tả đúng thuật toán đang chạy.

---

## 5. P1 — Đảm bảo tên thuật toán tương ứng với phương pháp thực sự

Không bắt buộc phải viết lại toàn bộ các mô hình trong sprint này. Trước tiên, đối chiếu tên, mô tả và code; sau đó chọn một trong hai hướng: triển khai đúng phương pháp hoặc đổi tên để mô tả trung thực phương pháp hiện tại.

### 5.1 Markov

- [ ] Kiểm tra trạng thái và bậc của chuỗi Markov thực tế.
- [ ] Nếu ghi “Bậc 1 & 2”, phải dùng đúng lịch sử trạng thái cho bậc 1 và bậc 2, có xử lý xác suất bằng 0/smoothing và test cho các trường hợp ít dữ liệu.
- [ ] Nếu code chỉ dùng một bước chuyển, đổi tên/mô tả thành mô hình chuyển trạng thái bậc 1.

### 5.2 Clustering / K-Means

- [ ] Nếu giao diện gọi là K-Means, phải có biểu diễn feature, khởi tạo tâm cụm, bước gán cụm, cập nhật tâm, điều kiện dừng và xử lý cụm rỗng.
- [ ] Nếu code thực chất là heuristic chấm điểm theo chẵn/lẻ, cao/thấp, khoảng cách trung bình hoặc tần suất, đổi nhãn thành heuristic scoring/đặc trưng cấu trúc; không khẳng định đang chạy K-Means.
- [ ] Không thêm phụ thuộc mới nếu chưa cần; nếu bổ sung thư viện, kiểm tra dependency trước và giải thích lý do.

### 5.3 Association Rules

- [ ] Xác định chính xác mỗi transaction: một kỳ quay, một tập số, hoặc một chuỗi kỳ.
- [ ] Nếu là luật đồng xuất hiện trong một kỳ, tính support, confidence và lift từ các transaction được định nghĩa rõ.
- [ ] Nếu là luật từ kỳ hiện tại sang kỳ tiếp theo, đổi tên/mô tả để chỉ rõ đây là luật chuyển tiếp theo thời gian.
- [ ] Mọi feature được tính phải thực sự tham gia vào kết quả; nếu `pairCooccurrence` chỉ được tạo mà không được sử dụng, hoặc nối vào scoring có test hoặc bỏ code không cần thiết.

### Acceptance criteria

- [ ] Tên thuật toán trong UI, tài liệu và code thống nhất với hành vi thực tế.
- [ ] Mỗi mô hình có ít nhất một test xác minh logic đặc trưng của nó, không chỉ test rằng hàm trả ra một mảng số.
- [ ] Không mô tả heuristic là K-Means/Markov bậc 2/association-rule chuẩn nếu chưa thực hiện tương ứng.

---

## 6. P1 — Làm nghiêm quy trình ingest, validate và merge dữ liệu

### Rủi ro cần xử lý

Parser/crawler không được tự điền ngày, mã kỳ hoặc Jackpot giả khi không tìm thấy trường nguồn. Bản ghi không xác thực được phải bị từ chối hoặc đưa vào quarantine, không âm thầm được coi là dữ liệu thật.

### Việc cần làm

- [ ] Tìm mọi giá trị fallback mặc định cho `date`, `drawId`, `drawNumber`, Jackpot và số trúng thưởng.
- [ ] Bỏ fallback có thể làm dữ liệu sai trông hợp lệ. Dùng lỗi validation rõ ràng, log nguồn/URL và lý do từ chối.
- [ ] Tạo validator riêng cho từng loại game.
- [ ] Mega 6/45: xác nhận đúng 6 số chính duy nhất, nằm trong 1–45, ngày/mã kỳ hợp lệ.
- [ ] Power 6/55: xác nhận đúng 6 số chính duy nhất nằm trong 1–55; số đặc biệt hợp lệ và được lưu đúng trường theo schema.
- [ ] XSMN: giữ đủ các giải theo schema nguồn; khi chuyển thành hai chữ số cuối, cho phép đuôi trùng nhau. Không áp dụng quy tắc “tất cả số phải duy nhất” như Vietlott.
- [ ] Xác thực ngày theo lịch quay và đối chiếu chéo giữa ngày, mã kỳ và nguồn khi dữ liệu nguồn cung cấp các trường này.
- [ ] Chống trùng bằng khóa đúng nghiệp vụ, ví dụ game + kỳ/đài + ngày. Không deduplicate chỉ theo giá trị số trúng.
- [ ] Lưu metadata tối thiểu cho dữ liệu ingest: nguồn, thời điểm lấy dữ liệu, thời điểm quay, mã kỳ/đài, trạng thái xác minh hoặc lý do quarantine.
- [ ] Kiểm tra dữ liệu mới trước khi merge vào dữ liệu chuẩn; lỗi một bản ghi không được làm mất toàn bộ lịch sử đã hợp lệ.
- [ ] Kiểm tra script crawl theo ngày bước nhảy/weekday để xác định có bỏ sót kỳ không. Không tuyên bố đã tải đủ lịch sử nếu script chỉ thăm dò một số ngày cố định.
- [ ] Tách trạng thái “không tìm thấy dữ liệu”, “lỗi nguồn”, “parser không tương thích” và “dữ liệu không hợp lệ”.

### Acceptance criteria

- [ ] Parser không còn im lặng gán ngày/mã kỳ giả nếu không đọc được dữ liệu nguồn.
- [ ] Các bản ghi sai schema, sai miền số, sai số lượng bóng hoặc thiếu trường bắt buộc bị từ chối có log giải thích.
- [ ] Có test dữ liệu hợp lệ, lỗi, thiếu trường, duplicate, ngày sai, và trang nguồn thay đổi định dạng.
- [ ] Merge không ghi đè bản ghi tốt bằng bản ghi lỗi.
- [ ] Báo cáo crawler nêu số bản ghi đọc được, chấp nhận, từ chối, trùng và thiếu; không chỉ báo “success”.

---

## 7. P1 — Nâng cấp kiểm định cuốn chiếu (walk-forward backtesting)

### Mục tiêu

Kiểm tra thuật toán bằng mô phỏng quá khứ nhưng đảm bảo mỗi lần dự đoán chỉ nhìn thấy dữ liệu đã có tại thời điểm đó. So sánh với baseline ngẫu nhiên sử dụng cùng luật chọn số và cùng số lượng số dự đoán.

### Việc cần làm

- [ ] Xác thực mọi bản ghi trong tập train có thời điểm nhỏ hơn kỳ mục tiêu. Ưu tiên so sánh timestamp chuẩn hóa hoặc ngày theo timezone đã xác định.
- [ ] Viết test chống leakage kiểm tra mọi fold; test phải thất bại nếu vô tình đưa kỳ mục tiêu vào train.
- [ ] Dùng walk-forward: dự đoán kỳ kế tiếp, ghi kết quả, mở rộng lịch sử train, rồi tiếp tục. Không shuffle dữ liệu theo cách làm rò rỉ thời gian.
- [ ] Mỗi loại xổ số có evaluator riêng, vì kích thước miền số, số bóng, giải đặc biệt và định nghĩa “hit” khác nhau.
- [ ] Định nghĩa rõ metric: số lượng số khớp trung bình mỗi kỳ; tỷ lệ kỳ có ít nhất một số khớp; phân phối số hit; hit rate theo định nghĩa cụ thể; và các giải nếu được hỗ trợ. Không dùng chung một nhãn cho các metric khác nhau.
- [ ] Tạo baseline ngẫu nhiên cùng luật và cùng số lượng số được dự đoán. Chạy đủ lần để ước lượng phân phối baseline; ghi lại seed và phương pháp.
- [ ] Báo cáo khoảng thời gian, số kỳ đánh giá, số dự đoán mỗi kỳ, metric, baseline, chênh lệch và khoảng bất định nếu đã tính bằng phương pháp đúng.
- [ ] Không dùng 20 kỳ cuối như bằng chứng duy nhất về hiệu quả dài hạn. Có thể giữ 20 kỳ làm smoke test, nhưng đánh giá hiệu suất cần nhiều fold hơn khi dữ liệu cho phép.
- [ ] Nếu tối ưu tham số/weights, dùng train/validation/test theo thời gian hoặc nested walk-forward; không chọn tham số bằng chính khoảng dữ liệu đang dùng để báo cáo kết quả cuối cùng.
- [ ] Báo rõ giới hạn kích thước mẫu. Nếu số kỳ quá ít, trả về “Chưa đủ bằng chứng” thay vì kết luận model tốt hơn ngẫu nhiên.

### Acceptance criteria

- [ ] Có test đảm bảo ngày của mọi training row nhỏ hơn ngày mục tiêu.
- [ ] Backtest có baseline ngẫu nhiên theo cùng luật game.
- [ ] Kết quả báo cáo tách riêng Mega 6/45, Power 6/55 và từng đài/ngày của XSMN; không trộn số liệu không tương thích.
- [ ] Có test kiểm tra metric bằng một tập dữ liệu nhỏ mà kết quả tính tay được.
- [ ] Báo cáo không khẳng định lợi thế dự đoán nếu chưa có kiểm định đủ mẫu và chưa tính bất định.

---

## 8. P2 — Đồng bộ UI với trạng thái thực của dữ liệu và thuật toán

Không thực hiện redesign lớn trong FIX-1. Chỉ sửa các phần giao diện cần thiết để hiển thị đúng dữ liệu và không gây hiểu nhầm.

- [ ] KPI lấy từ service/backtest result, không hard-code trong controller.
- [ ] Thêm trạng thái `loading`, `ready`, `insufficient-data`, `error` phù hợp với cấu trúc ứng dụng hiện có.
- [ ] Hiển thị thời điểm dữ liệu được cập nhật gần nhất, nguồn dữ liệu và tình trạng xác minh khi có thông tin.
- [ ] Với mô hình chưa được kiểm định, dùng nhãn trung tính như “Điểm xếp hạng” hoặc “Mức đồng thuận”; không hiển thị “xác suất trúng”.
- [ ] Không hiển thị `NaN`, `Infinity`, `undefined`, phần trăm âm hoặc dữ liệu placeholder giả.
- [ ] Giữ nguyên navigation, filter, event listener, chart, API và các DOM ID/data attributes đang được JavaScript sử dụng, trừ khi đã cập nhật toàn bộ nơi tham chiếu và có regression test.

---

## 9. Trình tự triển khai bắt buộc

### Phase A — Baseline và map dependencies

- [ ] Chạy test hiện có.
- [ ] Liệt kê script crawl, service dữ liệu, module thuật toán, ensemble, backtest và nơi render KPI.
- [ ] Ghi các lỗi đã tái hiện và các giả thuyết chưa tái hiện riêng biệt.

### Phase B — Sửa số liệu công bố

- [ ] Gỡ KPI hard-code và confidence không có cơ sở.
- [ ] Bổ sung trạng thái thiếu dữ liệu.
- [ ] Test KPI với response thành công, rỗng và lỗi.

### Phase C — Sửa tính đúng đắn của thuật toán

- [ ] Sửa lịch mục tiêu EMA.
- [ ] Tách strategy Monte Carlo theo loại game và thêm seeded RNG.
- [ ] Chuẩn hóa logic xếp hạng Ensemble.
- [ ] Sửa tên/mô tả các mô hình hoặc hoàn thiện đúng phương pháp đã cam kết.

### Phase D — Sửa dữ liệu đầu vào

- [ ] Gỡ fallback giả cho trường bắt buộc.
- [ ] Tăng validation và logging.
- [ ] Thêm test parser, merge, duplicate và schema theo game.

### Phase E — Backtest và xác nhận toàn hệ thống

- [ ] Bổ sung test chống leakage.
- [ ] So sánh với baseline ngẫu nhiên.
- [ ] Chạy lại tất cả test, lint/build nếu dự án có cấu hình.
- [ ] Kiểm thử các luồng UI bị ảnh hưởng.
- [ ] Kiểm tra `git diff` để bảo đảm không có thay đổi ngoài phạm vi.

Nếu một phase thất bại, sửa lỗi trước khi chuyển phase tiếp theo. Không được bỏ qua kiểm tra chỉ để đánh dấu hoàn tất.

---

## 10. Bộ test tối thiểu cần có sau khi sửa

### Data validation

- [ ] Mega: 6 số hợp lệ, không trùng, đúng miền.
- [ ] Mega: 5 số, 7 số, số 0, số vượt 45 hoặc có số trùng đều bị từ chối.
- [ ] Power: kiểm tra riêng 6 số chính và số đặc biệt.
- [ ] XSMN: đuôi trùng được giữ lại; sai số lượng giải hoặc dữ liệu rỗng được báo lỗi.
- [ ] Parser không đọc được ngày/mã kỳ thì không tự gán giá trị mặc định.
- [ ] Merge không tạo bản ghi duplicate hoặc ghi đè dữ liệu tốt bằng bản ghi không hợp lệ.

### Algorithm correctness

- [ ] EMA xác định đúng ngày quay mục tiêu theo lịch.
- [ ] Seeded Monte Carlo tái lập được.
- [ ] Monte Carlo tuân thủ đúng quy tắc lấy mẫu của từng game.
- [ ] Ensemble xếp hạng theo đúng cơ chế đã tài liệu hóa.
- [ ] Model output lỗi/rỗng/không hữu hạn được xử lý an toàn.
- [ ] Mỗi module Markov, clustering và association rule có test logic cụ thể.

### Backtest correctness

- [ ] Mọi fold chỉ train trên quá khứ.
- [ ] Kỳ mục tiêu không nằm trong training set hoặc trong bất kỳ feature đã tiền tính nào dùng để dự đoán kỳ đó.
- [ ] Metric được kiểm tra bằng ví dụ tính tay.
- [ ] Baseline dùng cùng luật, cùng số lượng dự đoán và cùng kỳ đánh giá.
- [ ] Thiếu dữ liệu trả trạng thái phù hợp, không trả KPI mặc định.

### Integration / UI

- [ ] Test dashboard với dữ liệu thật trong repository.
- [ ] Test dữ liệu rỗng, lỗi nguồn, backtest chưa chạy và backtest có kết quả.
- [ ] Không có lỗi console hoặc lỗi JavaScript mới trên luồng được sửa.
- [ ] Các thao tác và bộ lọc chính vẫn hoạt động.

---

## 11. Điều kiện hoàn thành FIX-1

Chỉ báo hoàn tất khi tất cả điều sau đáp ứng:

- [ ] Những KPI giả lập/confidence gây hiểu nhầm đã được gỡ hoặc đổi nhãn trung thực.
- [ ] Logic ngày quay mục tiêu và Monte Carlo được test theo từng loại game.
- [ ] Ensemble có quy tắc xếp hạng nhất quán và có test.
- [ ] Parser không còn tự biến dữ liệu thiếu thành dữ liệu lịch sử hợp lệ.
- [ ] Backtest xác minh được không leakage và có baseline ngẫu nhiên.
- [ ] Các mô hình có tên/mô tả đúng với code thực thi.
- [ ] Bộ test hiện có vẫn chạy; mọi test mới đều pass hoặc có lý do kỹ thuật cụ thể được ghi rõ.
- [ ] Không làm mất lịch sử hoặc sửa số liệu kết quả gốc nếu không có bằng chứng nguồn xác nhận.
- [ ] Không tuyên bố thuật toán dự đoán tốt hơn ngẫu nhiên chỉ dựa vào một lần chạy hoặc một tập kiểm định quá nhỏ.

Nếu không thể hoàn thành toàn bộ trong một lượt, ưu tiên theo thứ tự **P0 KPI/confidence → P1 EMA/Monte Carlo/Ensemble → validation ingest → walk-forward backtest**. Báo cáo rõ những phần đã sửa, phần còn lại và rủi ro; không tuyên bố hoàn tất toàn bộ.

---

## 12. Báo cáo bắt buộc khi kết thúc

Agent phải trả báo cáo theo mẫu sau:

```text
FIX-1 IMPLEMENTATION REPORT

1. Baseline
- Test command:
- Baseline result:
- Existing failures before edits:

2. Changes made
- [P0] KPI/confidence:
- [P1] EMA / draw calendar:
- [P1] Monte Carlo:
- [P1] Ensemble:
- [P1] Algorithm naming/implementation:
- [P1] Data ingest/validation:
- [P1] Walk-forward backtest:
- [P2] UI state/labels:

3. Files changed
- path — purpose

4. Validation
- Test command and result:
- Lint/build command and result:
- Manual/browser checks:
- Data integrity checks:

5. Evidence
- Before/after KPI examples:
- Example proving training data excludes target draw:
- Seeded Monte Carlo reproducibility result:
- Baseline comparison methodology and result:

6. Remaining issues
- Unfinished items:
- Risks/limitations:
- Items not verified:

7. Final status
- Completed / Partially completed / Blocked
- Do not claim statistical prediction superiority unless supported by the test design and results.
```

**Chỉ báo `Completed` khi đã có test và bằng chứng chạy thực tế.** Nếu mới sửa code nhưng chưa chạy được test hoặc chưa xác minh nguồn dữ liệu, hãy ghi `Partially completed` và chỉ rõ giới hạn.
