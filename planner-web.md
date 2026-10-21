# PLANNER WEB — Redesign thực tế cho LOTTO-QUANT LAB

> **Mục tiêu:** nâng cấp giao diện hiện tại thành một sản phẩm web phân tích xổ số có bản sắc, chuyên nghiệp, dễ đọc và dùng tốt trên desktop lẫn mobile; không chỉ thay màu hoặc thêm hiệu ứng. Đây là kế hoạch thực thi dành cho coding agent (Codex/Cursor/Claude Code).
>
> **Phạm vi:** ưu tiên giao diện và trải nghiệm. Không viết lại thuật toán, không thay nguồn dữ liệu, không sửa công thức thống kê và không hứa hẹn khả năng dự đoán xổ số.
>
> **Tham chiếu thiết kế:** [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), đặc biệt tư duy redesign existing project: scan → diagnose → targeted fixes → kiểm tra trình duyệt thực tế. Chỉ vận dụng nguyên tắc thiết kế; không sao chép giao diện của website khác.

---

## 0. Quy tắc vận hành bắt buộc cho agent

1. **Đọc dự án trước khi sửa.** Đọc `README.md`, `package.json`, `index.html`, toàn bộ `css/main.css`, `css/components.css`, `js/ui-controller.js`, `js/app.js` và các file test liên quan. Xác minh cấu trúc đang chạy thực tế; không dựa riêng vào README nếu mâu thuẫn với code.
2. **Bảo toàn stack hiện có.** Đây là ứng dụng HTML/CSS/JavaScript thuần, `type: module`, Chart.js nạp qua CDN và Netlify Functions. Không chuyển framework, không thêm thư viện chỉ vì sở thích. Trước khi thêm dependency phải chứng minh lý do và kiểm tra compatibility.
3. **Bảo toàn hành vi.** Không đổi/xóa ID, class, `data-*`, global function, event handler, cấu trúc DOM được JavaScript sử dụng hoặc selector mà `ui-controller.js` phụ thuộc nếu chưa truy vết đầy đủ. Ưu tiên thay CSS và markup ít rủi ro.
4. **Không sửa logic nghiệp vụ để làm đẹp.** Không sửa thuật toán, dữ liệu seed, scraping/crawler, backtest, nguồn dữ liệu hay công thức KPI trong đợt redesign này, trừ khi có bug giao diện gây ra lỗi và được ghi rõ.
5. **Không làm đại tu một lần.** Thực hiện theo milestone, mỗi milestone phải chạy được, kiểm tra, chụp ảnh và ghi lại file thay đổi.
6. **Không bịa dữ liệu.** Không biến chỉ số demo hoặc nội dung tĩnh thành tuyên bố dữ liệu thật. Tránh các cụm “độ chính xác cao”, “dự đoán chắc chắn” nếu không được kiểm định. Giao diện cần phân biệt kết quả lịch sử, thống kê mô tả, ước lượng của mô hình và kết quả backtest.
7. **Không tự ý ghi đè hoặc xóa dữ liệu.** Trước khi thay đổi, xem trạng thái Git. Không reset, force checkout hay xóa thay đổi người dùng. Nếu repo chưa dùng Git, đề xuất backup trước.
8. **Kết thúc bằng bằng chứng.** Chạy kiểm thử sẵn có; chụp trang ở kích thước desktop, tablet và mobile; báo cáo lỗi còn lại. Không tuyên bố đã kiểm tra browser nếu thực tế chưa chạy browser.

---

## 1. Hiện trạng đã xác minh từ source và ảnh chụp

### 1.1 Công nghệ và cấu trúc liên quan

- `index.html`: trang chính, các vùng giao diện và sáu phần nội dung.
- `css/main.css`: biến màu, font, header, bộ chọn game/đài, KPI, section header, responsive và một số quy tắc layout.
- `css/components.css`: card, bóng số, chip, kết quả xổ số, thẻ thuật toán, thành phần dashboard/backtest.
- `js/ui-controller.js`: controller UI/render DOM lớn; cần xem selector và render target trước khi đổi markup.
- `js/app.js`, `js/data-service.js`, `js/config.js`, `js/backtest-engine.js`: luồng ứng dụng, nạp dữ liệu, cấu hình và kiểm định cần giữ nguyên.
- `test/run-tests.js`: bộ kiểm thử Node hiện có.
- `test/capture_screens.ps1`: script chụp màn hình Chromium/Edge trên Windows.
- `test/screenshot_*.png`: ảnh tham chiếu giao diện đã lưu.

### 1.2 Các khu vực chính

1. Kết quả mới nhất (`panel-live`).
2. Dự đoán đa thuật toán (`panel-predict`).
3. Dashboard thống kê (`panel-dashboard`).
4. Backtest (`panel-backtest`).
5. Bảng xếp hạng thuật toán (`panel-leaderboard`).
6. Tài liệu/cẩm nang (`panel-docs`).

Ngoài ra có brand/header, trạng thái đồng bộ, bộ chọn XSMN/Vietlott, bộ lọc đài/game, KPI và biểu đồ Chart.js.

### 1.3 Vấn đề thiết kế nhìn thấy từ ảnh chụp

Các điểm sau là **nhận định thị giác cần xác minh trong browser**, không phải kết luận về chất lượng code:

- Mật độ card và đường viền cao; nhiều khối dùng cùng một kiểu nền/viền/bo góc nên phân cấp thông tin còn yếu.
- Nhiều màu nhấn cùng xuất hiện (vàng, xanh dương, xanh lá, tím) ở header, KPI, tiêu đề section, badge và thuật toán; màu vừa biểu đạt ý nghĩa vừa dùng trang trí nên dễ nhiễu.
- Font display serif trên nhiều tiêu đề thẻ, kết hợp với sans-serif và mono, tạo cảm giác không đồng nhất ở các khu vực dữ liệu dày.
- Header và bộ điều khiển có nhiều thành phần ngang; cần kiểm tra cách xuống dòng và điểm gãy layout ở màn hình hẹp.
- Dữ liệu số cần dễ quét, so sánh và phân biệt trạng thái; các công thức/metadata không nên cạnh tranh với kết quả chính.
- Các nhãn và nội dung hiện tại đôi lúc khẳng định độ tin cậy/hiệu suất bằng ngôn ngữ mạnh. Cần chỉnh cách trình bày để có tính nghiên cứu, minh bạch, không gợi ý rằng xổ số có thể dự đoán chắc chắn.
- Ảnh chụp được cung cấp không đủ chứng minh tất cả trạng thái tương tác và responsive; agent phải tự chạy browser để xác minh trước khi kết luận.

### 1.4 Điểm kỹ thuật cần cẩn trọng

- CSS đang mô tả trải nghiệm single-page liền mạch: `.main-nav-tabs { display: none !important; }`, `.tab-view-panel { display: block !important; }`. Không được vô tình khôi phục tab-navigation hoặc ẩn các panel nếu chưa thống nhất thay đổi product behavior.
- `index.html` dùng nhiều ID và có một số inline style. Đánh giá ảnh hưởng trước khi đưa style về CSS token/class.
- Có quy tắc responsive rải ở cả hai stylesheet; tránh thêm override trùng lặp cuối file mà không hiểu cascade.
- Một số màu/cấu hình cũ còn alias để tương thích như `--ink-*`, `--on-ink`, `--blue-400`. Không xóa token nếu chưa search toàn bộ repository.
- Không chuyển sang tab interface chỉ để “trông hiện đại”; sản phẩm hiện hướng đến trang dài theo chiều cuộn.

---

## 2. Hướng nghệ thuật đề xuất

### Tên hướng: **Quant Editorial — một phòng nghiên cứu dữ liệu, không phải bảng điều khiển casino**

Giao diện nên trông như công cụ phân tích định lượng/ấn phẩm dữ liệu chuyên nghiệp: rõ ràng, tiết chế, có điểm nhấn và số liệu là nhân vật chính.

Nguyên tắc:

- **Ít màu nhưng có kỷ luật:** nền trung tính, văn bản tương phản, một màu nhấn thương hiệu chủ đạo; màu trạng thái chỉ dùng khi mang thông tin.
- **Typographic hierarchy rõ:** tiêu đề, mô tả, label, con số và chú thích có cấp bậc riêng; không dùng serif trang trí ở tất cả card.
- **Độ sâu qua bố cục, không qua viền mọi nơi:** dùng khoảng trắng, đường phân cách mảnh, nền theo tầng và chỉ tạo card khi thực sự cần nhóm thông tin.
- **Bất đối xứng có kiểm soát:** khu vực đầu trang có thể chia tỷ lệ linh hoạt; không bắt mọi khối thành ba hoặc bốn card bằng nhau.
- **Số liệu ưu tiên khả năng quét:** tabular numbers, căn lề số nhất quán, đơn vị rõ, tên thước đo và kỳ dữ liệu luôn hiện diện.
- **Chuyển động tinh tế:** hover/active/focus rõ và nhanh; không dùng parallax, scroll hijacking, animation dày hoặc hiệu ứng gây mất tập trung.
- **Tiếng Việt tự nhiên:** heading theo sentence case, tên chỉ số thống nhất, giải thích thuật ngữ ở nơi cần.
- **Trung thực khoa học:** xác suất/lịch sử/backtest là thông tin tham khảo; không tô màu hoặc gắn badge khiến mô hình có vẻ chắc chắn hơn bằng chứng.

### 2.1 Bảng màu nền tảng cần thử nghiệm

Đây là **đề xuất ban đầu**, không được áp đặt trước khi chụp baseline và kiểm thử tương phản:

| Token | Giá trị tham khảo | Vai trò |
|---|---|---|
| `--bg-canvas` | `#F5F3EE` | nền giấy ấm rất nhạt |
| `--bg-surface` | `#FFFFFF` | bề mặt nội dung chính |
| `--bg-surface-muted` | `#ECEAE4` | nền bảng/phần phụ |
| `--text-primary` | `#20231F` | văn bản chính |
| `--text-secondary` | `#656A63` | mô tả |
| `--text-muted` | `#777D75` | metadata không thiết yếu nhưng vẫn đọc được |
| `--border-subtle` | `#DCDDD5` | đường phân cách |
| `--accent` | `#9A6B24` | vàng đồng trầm cho điểm nhấn thương hiệu |
| `--accent-soft` | `#F1E7D4` | nền nhấn nhẹ |
| `--success` | `#24735B` | trạng thái thành công |
| `--warning` | `#9B5B17` | cảnh báo |
| `--danger` | `#A3423C` | lỗi/trạng thái rủi ro |
| `--info` | `#365D73` | thông tin phụ khi cần |

Quy tắc màu:

- Không dùng vàng/xanh/tím/đỏ đồng thời như bốn màu trang trí cho các card ngang hàng.
- Màu `success/warning/danger` phải gắn với trạng thái có ý nghĩa, không gắn nhãn “tốt/xấu” cho một thuật toán nếu metric chưa giải thích.
- Đảm bảo contrast cho chữ thường theo WCAG AA làm mục tiêu (4.5:1); chữ lớn ít nhất 3:1. Kiểm tra bằng công cụ, không ước lượng bằng mắt.
- Nếu sản phẩm cần dark mode, lập riêng một phase sau; không tạo section nền tối lẻ loi trong một trang sáng.

### 2.2 Typography

- Giữ bộ font có dấu tiếng Việt tốt và tải tin cậy. Có thể thử `Be Vietnam Pro`/`Geist` cho UI, `JetBrains Mono` cho số/kết quả; không thêm font thứ tư nếu không có lợi ích cụ thể.
- Xóa khai báo Google Fonts bị lặp giữa HTML và CSS sau khi đã xác minh tải font thực tế; chỉ giữ một nguồn nạp.
- Sử dụng tối thiểu các cấp: `12–13px` metadata, `14–16px` body/control, `18–20px` card/section title, `28–40px` heading chính tùy viewport, số KPI theo mức quan trọng.
- Body line-height khoảng `1.5–1.7`; đoạn dài không vượt bề rộng đọc dễ chịu.
- Dùng `font-variant-numeric: tabular-nums` cho số, phần trăm, đơn vị tiền, ngày và bảng kết quả.
- Không dùng Playfair Display cho mọi tiêu đề; chỉ dùng nếu nó thật sự hỗ trợ hướng editorial và vẫn giữ rõ ràng ở kích thước nhỏ.
- Thiết lập `text-wrap: balance` cho heading phù hợp; tránh ép xuống dòng bằng `<br>` ở mọi breakpoint.

### 2.3 Layout & spacing

- Container desktop có max-width phù hợp nội dung, căn giữa; tránh kéo chữ/ bảng quá rộng.
- Xây thang spacing từ token (ví dụ 4/8/12/16/24/32/48/64px); giảm giá trị tùy ngữ cảnh thay vì dùng padding tự phát.
- Dùng CSS Grid cho bố cục card/KPI/phân tích nhiều cột; breakpoints theo nội dung chứ không theo số đẹp.
- Không ép chiều cao bằng nhau nếu làm méo nội dung. Các nhóm so sánh có thể căn theo tiêu đề, giá trị chính và action.
- Dùng một kiểu radius chính cho surface, một radius nhỏ hơn cho control; không bo tròn pill toàn bộ mọi thành phần.
- Đường viền chỉ phân tách vùng; không cần border + shadow + background cho tất cả card.
- Trên mobile, ưu tiên một cột hoặc cuộn ngang có chủ đích cho dãy số/nhóm filter. Không để toàn bộ trang tràn ngang.

### 2.4 Motion & interaction

- Hover/focus/active dùng trạng thái có ý nghĩa với transition khoảng 160–240ms.
- Chỉ animate `transform` và `opacity` khi có ích; tôn trọng `prefers-reduced-motion: reduce`.
- Nút/điều khiển có `:focus-visible` rõ. Mục tiêu vùng bấm ≥44×44px trên mobile.
- Không thêm animation cho số kết quả khiến người dùng đọc sai; không dùng pulse liên tục trừ khi thể hiện trạng thái live thực sự.
- Trạng thái loading nên giống hình dạng nội dung; lỗi hiển thị gần khu vực liên quan; empty state chỉ dẫn hành động kế tiếp.

---

## 3. Nguyên tắc sản phẩm cho từng vùng

### 3.1 Header & trạng thái dữ liệu

Mục tiêu: cho biết rõ **đây là công cụ gì, dữ liệu nào đang được dùng, cập nhật lúc nào và đang ở trạng thái nào**.

- Hạ độ cao header; logo/brand không nên chiếm cạnh tranh với nội dung.
- Gom trạng thái nguồn dữ liệu và thời điểm cập nhật thành một cụm gọn; phân biệt `Đang tải`, `Đã cập nhật`, `Dùng dữ liệu lưu sẵn`, `Không thể kết nối`.
- Nút “Cập nhật” có trạng thái disabled/loading và phản hồi kết quả thực tế.
- Không ghi “live”/“100% dữ liệu thật” nếu service không xác minh được điều đó tại runtime.
- Nếu có dữ liệu fallback, trình bày minh bạch thay vì che giấu.

### 3.2 Switcher XSMN/Vietlott và bộ lọc

- Phân biệt rõ lựa chọn game với bộ lọc đài; không làm tất cả thành pill giống nhau.
- Giữ nhanh thao tác chọn XSMN/Vietlott, game Mega/Power và đài quay.
- Trên mobile, cho phép cuộn ngang dãy đài nhưng có dấu hiệu còn nội dung; không để select hoặc nhãn tràn viewport.
- Giữ đúng ID và logic hiện tại (`mode-btn-xsmn`, `mode-btn-vietlott`, `station-select`, `vietlott-select`, các nút quick game/pill).

### 3.3 Kết quả xổ số — `panel-live`

- Kết quả mới nhất phải là điểm nhìn chính của section: tên loại hình/đài, ngày quay/kỳ quay, dãy số và thông tin giải thưởng được sắp thứ tự rõ ràng.
- Bóng số/chip số được thiết kế dễ đọc, đường viền và hiệu ứng 3D tiết chế; ưu tiên phân biệt số đặc biệt bằng nhãn/legend chứ không chỉ bằng màu.
- Bảng giải XSMN cần hierarchy ổn định: tên giải, dãy số, căn lề nhất quán, dễ scan dọc trên mobile.
- Nếu chưa có kết quả, lỗi fetch hoặc đang dùng dữ liệu cũ, phải trình bày trạng thái riêng.
- Không bịa kết quả mẫu trên màn hình production. Nếu dùng fixture cho thiết kế/test phải gắn rõ demo/test.

### 3.4 Dự đoán đa thuật toán — `panel-predict`

- Xếp hạng mức độ quan trọng: kết quả tổng hợp → phạm vi dữ liệu/phương pháp → so sánh từng thuật toán → giải thích/đồ thị chi tiết.
- Tách “dãy số do mô hình đề xuất” khỏi “kết quả thật” bằng nhãn trực tiếp.
- Hiển thị metadata tối thiểu: loại hình, ngày/phạm vi huấn luyện, nguồn dữ liệu, số kỳ sử dụng nếu có sẵn từ logic.
- Không biến `confidence` thành xác suất trúng giải khi định nghĩa/hiệu chuẩn không chứng minh điều đó. Tooltip/mô tả phải dùng đúng thuật ngữ đang tính trong code.
- 8 mô hình có thể dùng danh sách/bảng so sánh thay vì 8 card giống hệt nhau nếu giảm diện tích và tăng khả năng so sánh.
- Công thức dài phải wrap/scroll trong vùng riêng, không gây tràn trang.

### 3.5 Dashboard định lượng — `panel-dashboard`

- KPI ở hàng đầu phải ít, rõ và có định nghĩa. KPI không được lặp lại cùng một ý nghĩa bằng nhãn khác nhau.
- Chọn một chỉ số chính làm điểm nhấn; các KPI phụ dùng màu trung tính. Màu không nên trở thành bảng cầu vồng.
- Biểu đồ có title, đơn vị, trục, legend, tooltip và trạng thái no-data. Trên màn hình nhỏ, giữ nhãn có thể đọc được và không để legend đè dữ liệu.
- Giải thích metric bằng tooltip/footnote ngắn, ví dụ cửa sổ dữ liệu, cách tính, mẫu số.
- Tránh trình bày tương quan/tần suất như quan hệ nhân quả hoặc bằng chứng dự báo có ý nghĩa thống kê khi chưa kiểm định.

### 3.6 Backtest — `panel-backtest`

- Luồng người dùng rõ: chọn game/đài/ngày/phạm vi → chạy → xem kết quả.
- Nút chạy thể hiện trạng thái processing; tránh gửi thao tác lặp gây render chồng.
- Kết quả phải phân biệt dữ liệu huấn luyện, kết quả dự đoán, kết quả thật và metric đánh giá.
- Nếu chạy lỗi/không có dữ liệu, nêu bước khắc phục; không sử dụng `window.alert()` như UX mặc định.
- Giữ nguyên cơ chế loại trừ lookahead bias theo logic hiện tại; các tuyên bố hiển thị về điều này phải tương ứng với implementation/test.

### 3.7 Leaderboard — `panel-leaderboard`

- Dùng bảng/list so sánh metric, không dựa chỉ vào huy hiệu màu hoặc card.
- Hiển thị rõ cửa sổ kiểm thử, sample size và định nghĩa metric nếu dữ liệu đã có. Nếu chưa có field này, ghi thành mục đề xuất riêng; không tự tính sai hoặc bịa.
- Không chỉ tô đậm “người thắng” mà không cho thấy metric và độ bất định. Với mẫu nhỏ, thêm lời chú giải về giới hạn đánh giá.
- Bảng cần responsive; trên mobile có thể dùng row card ngắn hoặc cho phép cuộn ngang có kiểm soát.

### 3.8 Cẩm nang/tài liệu — `panel-docs`

- Tách nội dung thành nhóm chủ đề có tiêu đề, đoạn ngắn, danh sách rõ.
- Hạn chế nhiều card con lặp cùng template; có thể dùng editorial column hoặc nhóm nội dung theo chủ đề.
- Phần hướng dẫn quản lý vốn/chơi có trách nhiệm cần ngôn ngữ trung tính; tránh hứa hẹn lợi nhuận hoặc khuyến khích tăng tiền cược để gỡ lỗ.
- Giữ nội dung khoa học và tài liệu hiện có, chỉ thay layout/copy khi được xác nhận.

---

## 4. Các Phase triển khai và deliverables

### Phase 0 — Baseline & dependency map

**Nhiệm vụ**

- [ ] Kiểm tra `git status`, branch và thay đổi chưa commit.
- [ ] Chạy `npm test` theo `package.json`; ghi lại pass/fail trước khi sửa.
- [ ] Chạy local web server đúng cách trong README; nếu test/CLI không chạy, ghi lỗi và môi trường.
- [ ] Chụp baseline ở 1440×900, 1024×768 và 390×844 (hoặc thiết bị gần tương đương).
- [ ] Lập bản đồ selector/ID của `index.html` được tham chiếu trong `js/ui-controller.js` và `js/app.js`.
- [ ] Đánh dấu inline style, duplicate `@import`, token CSS cũ và media query trùng lặp.
- [ ] Xác minh layout thực: hiện đang là single-page long-scroll, không phải tab ẩn/hiện như tên class gợi ý.

**Deliverable:** `docs/ui-audit.md` hoặc phần audit trong báo cáo PR, gồm ảnh baseline, rủi ro và danh sách file cần sửa.

**Gate:** không được bắt đầu đổi layout khi chưa biết JS đang phụ thuộc vào những selector nào.

### Phase 1 — Design direction & tokens

**Nhiệm vụ**

- [ ] Chốt hướng Quant Editorial dựa trên giao diện thực tế.
- [ ] Thử palette neutral + một accent; kiểm tra WCAG contrast.
- [ ] Chốt font role, type scale, spacing scale, radius, border, shadow và transition tokens.
- [ ] Loại khai báo font bị trùng sau khi xác nhận không gây FOUT hoặc font fallback.
- [ ] Giữ alias token cũ cho đến khi toàn bộ CSS đã migrate.
- [ ] Tạo một trang/nhánh preview hoặc thay đổi nhỏ để so sánh trước/sau.

**Deliverable:** bản token CSS nhất quán, có comment và tương thích toàn bộ component hiện có.

**Gate:** nội dung vẫn đọc được, số liệu dễ phân biệt, không mất trạng thái semantic.

### Phase 2 — Global shell, header & controls

**Nhiệm vụ**

- [ ] Điều chỉnh max-width/padding và vertical rhythm của `.app-container`.
- [ ] Tinh gọn `.header-wrapper`, brand, status và button sync.
- [ ] Chuẩn hóa `.game-switcher-bar`, mode tabs, quick station pills và các select.
- [ ] Xây trạng thái hover/focus/active/disabled/loading thống nhất.
- [ ] Cải thiện responsive của control bar cho 1024px, 768px, 390px và 320px.
- [ ] Giữ ID và event handler, kiểm tra thao tác thực tế sau từng nhóm sửa.

**Deliverable:** shell và vùng điều khiển ổn định trước khi chỉnh từng section.

### Phase 3 — Information hierarchy & component system

**Nhiệm vụ**

- [ ] Chuẩn hóa section header, title, subtitle, eyebrow và metadata.
- [ ] Rà soát `.quant-card`, KPI card, algorithm card, badge, table, chip số, bóng số.
- [ ] Xác định nơi cần card, nơi chỉ cần section/row/separator.
- [ ] Giảm border/shadow lặp, radius quá đồng nhất và accent màu trang trí.
- [ ] Chuẩn hóa spacing nội bộ, alignment, hover và focus.
- [ ] Thêm trạng thái empty/loading/error nếu thiếu; chỉ thay đổi logic tối thiểu và có test.
- [ ] Không tạo lại tất cả component nếu CSS hiện tại có thể được tái sử dụng.

**Deliverable:** component styles có thể dùng chung mà không áp đặt cùng một layout cho mọi loại nội dung.

### Phase 4 — Redesign theo section

Thực hiện lần lượt:

1. [ ] Header + bộ lọc.
2. [ ] Kết quả mới nhất / bảng giải.
3. [ ] Ensemble summary + mô hình thành phần.
4. [ ] Dashboard/KPI/chart.
5. [ ] Backtest.
6. [ ] Leaderboard.
7. [ ] Tài liệu/cẩm nang.
8. [ ] Footer, liên kết, trạng thái phụ và 404 (nếu nằm trong phạm vi routing thực tế).

Mỗi section phải có: mục tiêu nội dung, thứ tự đọc, layout desktop/mobile, trạng thái loading/empty/error (nếu áp dụng), selector không được đổi, checklist test và ảnh sau khi chỉnh.

**Deliverable:** từng section được cải thiện theo ưu tiên, không làm hỏng các section trước.

### Phase 5 — Responsive & accessibility pass

- [ ] Kiểm tra 1440px, 1280px, 1024px, 768px, 390px và 320px.
- [ ] Không có horizontal overflow ngoài vùng scroll ngang chủ đích.
- [ ] Kiểm tra focus bằng keyboard, thứ tự tab và focus-visible.
- [ ] Tên accessible cho icon-only controls; icon trang trí `aria-hidden="true"` khi phù hợp.
- [ ] Kiểm tra contrast và kích thước vùng bấm.
- [ ] Có skip-to-content link nếu phù hợp với DOM/layout.
- [ ] Hỗ trợ `prefers-reduced-motion`.
- [ ] Kiểm tra zoom 200% và tiếng Việt wrap không vỡ layout.
- [ ] Bảo đảm chart có mô tả/summary thay thế khi biểu đồ khó đọc bằng công nghệ hỗ trợ.

**Deliverable:** checklist responsive/accessibility có kết quả PASS/FAIL.

### Phase 6 — Visual QA & regression

- [ ] Chạy `npm test` và ghi số PASS/FAIL.
- [ ] Kiểm tra console errors, missing asset/font, lỗi Chart.js và network fail không liên quan.
- [ ] Kiểm tra nút sync dữ liệu, chọn XSMN/Vietlott, chọn đài/game, các liên kết scroll, chart, backtest và leaderboard.
- [ ] Chụp screenshot cho desktop/tablet/mobile; so sánh với baseline.
- [ ] Xem lại screenshot như một reviewer thiết kế: xác định 3 vấn đề lớn nhất còn lại, sửa và chụp lại tối đa 3 vòng.
- [ ] Không đánh giá “đẹp hơn” chỉ bằng cảm giác; giải thích thay đổi nào cải thiện hierarchy, scanability, consistency hoặc responsive.
- [ ] Ghi bug chưa xử lý và không che giấu regression.

**Deliverable:** báo cáo QA kèm ảnh, test results, lỗi còn lại và danh sách file thay đổi.

### Phase 7 — Release readiness

- [ ] Xem diff; loại bỏ debug, CSS override thừa và code chết do chính đợt sửa tạo ra.
- [ ] Xác nhận không sửa dữ liệu/thuật toán ngoài phạm vi.
- [ ] Kiểm tra SEO/metadata cơ bản, title, description, favicon và Open Graph nếu nằm trong phạm vi.
- [ ] Xác nhận deployment config Netlify không bị ảnh hưởng.
- [ ] Tổng hợp hướng dẫn rollback và commit đề xuất.

**Deliverable:** sẵn sàng merge/deploy; agent không tự deploy production nếu người dùng chưa yêu cầu.

---

## 5. Ưu tiên thực hiện

Ưu tiên đánh giá dựa trên **tác động thị giác × mức sử dụng × rủi ro**, không phải mức độ hào nhoáng.

| Priority | Hạng mục | Tác động | Rủi ro | Điều kiện hoàn tất |
|---|---|---:|---:|---|
| P0 | Baseline, selector map, test trước sửa | Rất cao | Thấp | Có ảnh và test baseline |
| P1 | Design tokens, palette, type scale | Cao | Trung bình | Đồng nhất, tương phản đạt |
| P1 | Header/switcher/filter responsive | Cao | Trung bình | Không tràn, thao tác đúng |
| P1 | Hierarchy section và KPI | Cao | Trung bình | Số liệu chính nổi bật, ít nhiễu |
| P1 | Kết quả mới nhất và dãy số | Cao | Trung bình | Dễ scan, không lẫn demo/actual |
| P2 | Dashboard chart, card algorithm | Cao | Trung bình | Label/legend/empty states rõ |
| P2 | Backtest/leaderboard | Cao | Trung bình | So sánh metric công bằng và rõ |
| P2 | Tài liệu/footer/metadata | Trung bình | Thấp | Dễ đọc, nội dung gọn |
| P3 | Animation/texture/chi tiết trang trí | Thấp–trung bình | Thấp–trung bình | Có tác dụng rõ, tôn trọng reduced motion |

**Không bắt đầu với:** thay framework, viết lại toàn bộ HTML/JS, thêm animation lớn, thêm dark mode, đổi chart library hoặc cài nhiều UI dependencies.

---

## 6. Checklist nghiệm thu UI

### Design quality

- [ ] Có một hướng thiết kế nhất quán và nhận diện rõ đây là công cụ nghiên cứu định lượng.
- [ ] Có 1 accent chính; semantic colors chỉ xuất hiện ở trạng thái phù hợp.
- [ ] Typography có hierarchy rõ; body, label, metric và heading không tranh nhau.
- [ ] Không phải mọi section đều là hộp viền + bóng + nền giống nhau.
- [ ] Khoảng cách, alignment, radius và shadow nhất quán.
- [ ] Không còn gradient/decoration chỉ để lấp khoảng trống nếu không giúp hiểu nội dung.
- [ ] Dữ liệu quan trọng được ưu tiên hơn metadata và công thức chi tiết.

### Functional safety

- [ ] Chọn XSMN/Vietlott hoạt động.
- [ ] Chọn đài/game hoạt động.
- [ ] Nút cập nhật có phản hồi và không báo thành công giả.
- [ ] Sáu khu vực vẫn render đúng.
- [ ] Chart cập nhật và resize đúng.
- [ ] Backtest và leaderboard vẫn chạy như baseline.
- [ ] Không đổi output của thuật toán hoặc dữ liệu seed do thay đổi CSS/HTML.
- [ ] Không có ID trùng hoặc selector JS bị mất.

### Responsive/accessibility

- [ ] Không có tràn ngang không chủ đích ở 320–1440px.
- [ ] Văn bản tiếng Việt không cắt mất chữ hoặc chồng lên control.
- [ ] Nút chính thao tác được bằng keyboard và touch.
- [ ] Focus-visible rõ, contrast đạt, motion giảm khi người dùng yêu cầu.
- [ ] Nội dung và thông báo lỗi không phụ thuộc duy nhất vào màu sắc.

### Acceptance criteria release

Chỉ đánh dấu hoàn thành khi:

1. `npm test` không giảm so với baseline; nếu baseline đã fail, ghi rõ fail có sẵn và xác minh đợt UI không tạo lỗi mới.
2. Các luồng tương tác được kiểm thử trực tiếp trong browser.
3. Có ảnh desktop/tablet/mobile sau sửa.
4. Không có lỗi console mới nghiêm trọng.
5. Có tóm tắt trước/sau, file thay đổi, test đã chạy và phần còn lại.

---

## 7. Yêu cầu về kiểm thử thực tế

### Lệnh chuẩn

```bash
npm test
npm start
```

Dùng URL/cổng được server báo ra. Nếu môi trường hỗ trợ browser automation, kiểm tra trực tiếp page; nếu không hỗ trợ, không giả vờ đã chạy được browser.

Trên Windows có thể dùng script đã có:

```powershell
powershell -ExecutionPolicy Bypass -File .\test\capture_screens.ps1 -Url http://localhost:3000/ -Prefix after-redesign
```

Lưu ý: script hiện tại ghi ảnh vào một đường dẫn mặc định có thể chỉ tồn tại trên máy của tác giả. Trước khi chạy, sửa theo hướng dùng đường dẫn tương đối trong project hoặc thêm tham số `OutDir`; không ghi file vào thư mục cá nhân cố định.

### Bộ luồng browser cần kiểm

1. Load lần đầu khi có dữ liệu.
2. Load khi crawler/API không hoạt động hoặc dùng seed/fallback.
3. Click cập nhật và chờ trạng thái hoàn tất.
4. Chuyển XSMN ↔ Vietlott.
5. Chọn một đài XSMN khác và một game Vietlott.
6. Scroll từ live results đến docs; không có section chồng nhau.
7. Resize desktop → tablet → mobile; kiểm tra chart và bảng.
8. Chạy backtest với ngày hợp lệ và trường hợp không có dữ liệu (nếu UI hỗ trợ).
9. Chạy leaderboard.
10. Dùng keyboard: Tab, Shift+Tab, Enter, Space, Escape khi có menu/panel phù hợp.

---

## 8. Cách quản lý task của agent

Mỗi task ghi rõ:

```md
### TASK-UI-XX — Tên task
- **Mục tiêu:** vấn đề cụ thể đang giải quyết.
- **Vùng ảnh hưởng:** file, component, selector.
- **Không được thay đổi:** hành vi/dữ liệu/ID phụ thuộc.
- **Thực hiện:** các thay đổi nhỏ, có thứ tự.
- **Acceptance criteria:** kết quả quan sát được.
- **Test:** lệnh và luồng browser phải kiểm.
- **Evidence:** screenshot/log/diff.
- **Status:** Todo | In progress | Blocked | Done.
```

Trình tự task gợi ý:

- `TASK-UI-00`: baseline + audit.
- `TASK-UI-01`: token/palette/typography.
- `TASK-UI-02`: header + controls.
- `TASK-UI-03`: section heading + surface components.
- `TASK-UI-04`: live results.
- `TASK-UI-05`: prediction/algorithm list.
- `TASK-UI-06`: dashboard + charts.
- `TASK-UI-07`: backtest + leaderboard.
- `TASK-UI-08`: docs/footer.
- `TASK-UI-09`: responsive + accessibility.
- `TASK-UI-10`: visual regression + release report.

Agent phải hoàn tất và xác nhận từng task theo thứ tự; có thể điều chỉnh nếu audit chứng minh dependency khác. Không đánh dấu Done nếu chưa đạt acceptance criteria.

---

## 9. Hướng dẫn làm việc với taste-skill

Tham chiếu: [taste-skill repository](https://github.com/Leonxlnx/taste-skill)

- Với **website hiện có**, ưu tiên skill `redesign-existing-projects` / `redesign-skill`: scan codebase, audit vấn đề, sửa có mục tiêu trên stack đang có và test từng thay đổi.
- Skill `design-taste-frontend` mặc định được mô tả phù hợp landing pages, marketing sites, portfolios và product pages; README nêu rõ không nhắm tới dashboard/product UI dày dữ liệu. Vì LOTTO-QUANT LAB là giao diện phân tích nhiều dữ liệu, không áp dụng máy móc mọi pattern của landing page.
- Có thể dùng taste-skill để tìm art direction, typography, spacing, restrained palette, motion và self-inspection; các bảng số, charts, KPI và backtest phải theo usability/data visualization.
- Không sao chép nguyên mẫu hoặc asset của bên khác. Mọi ảnh/texture mới phải có giấy phép phù hợp, attribution khi cần và không được làm giảm độ rõ dữ liệu.
- Nếu cài skill trong môi trường coding agent, kiểm tra `SKILL.md` được cài đúng phiên bản và tuân thủ quy tắc hiện hành của dự án. Việc cài skill không thay thế code audit hoặc test.

---

## 10. Mẫu báo cáo cuối của agent

```md
# UI Redesign Report

## Summary
- Mục tiêu đạt được:
- Hướng thiết kế đã chọn:

## Changed files
- `index.html` — ...
- `css/main.css` — ...
- `css/components.css` — ...
- ...

## Before / after evidence
- Desktop screenshot:
- Tablet screenshot:
- Mobile screenshot:

## Tests
- `npm test`: PASS/FAIL (xem log)
- Browser flows: PASS/FAIL/NOT RUN
- Console/network: ...
- Responsive: ...
- Accessibility checks: ...

## Preserved behavior
- Data and algorithms:
- Game/station controls:
- Charts/backtest/leaderboard:

## Known issues
- ...

## Rollback
- Commit/checkpoint:
- Cách khôi phục:
```

---

## 11. Chỉ thị cuối cho coding agent

Hãy thực thi planner này trên source hiện có. **Không chỉ trả lời bằng đề xuất, mockup hoặc danh sách việc phải làm**; hãy thực sự sửa code khi môi trường cho phép.

Bắt đầu bằng Phase 0, báo cáo audit ngắn và trạng thái test baseline, sau đó tiếp tục các phase theo thứ tự. Không dừng lại để hỏi những điều có thể xác minh từ repository. Nếu có một lựa chọn nghệ thuật chưa được quyết định, dựng một phương án nhất quán, kiểm tra bằng screenshot, rồi tự cải thiện. Chỉ hỏi người dùng khi có nguy cơ làm thay đổi hành vi sản phẩm, mất dữ liệu hoặc mở rộng đáng kể phạm vi.

Giữ nguyên logic, giữ thay đổi nhỏ và có thể review, chạy test sau mỗi milestone, đối chiếu ảnh thật ở ít nhất ba kích thước, rồi báo cáo đầy đủ bằng chứng. Đích đến không phải một website “lòe loẹt hơn”; đích đến là một sản phẩm **có gu, có thứ bậc thị giác, rõ dữ liệu, dùng thuận tay và đáng tin về cách nó trình bày bằng chứng**.
