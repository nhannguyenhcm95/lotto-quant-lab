# FIX-8 — ĐẶC TẢ SỬA LỖI NGUỒN LỊCH SỬ, VALUE-LEVEL AUDIT, ALGORITHM CONTRACTS VÀ FAIL-CLOSED GATES

**Dự án:** LOTTO-QUANT LAB  
**Loại tài liệu:** Lệnh triển khai bắt buộc cho coding agent (Codex)  
**Mức ưu tiên:** P0/P1 — không được phát hành trước khi các gate bắt buộc đạt  
**Phạm vi code chính:** `scripts/build-source-evidence.js`, `scripts/build-reference-dataset.js`, `scripts/audit-history.js`, `scripts/gate-runner.js`, `scripts/verify-artifacts.js`, các parser trong `scripts/`, và các test liên quan.

---

## 0. LỆNH TỔNG QUÁT — KHÔNG ĐƯỢC CHỈ VIẾT BÁO CÁO

Đọc `fix-1.md` đến `fix-8.md`, kiểm tra source code hiện tại và thực thi FIX-8 trực tiếp trong dự án. Không chỉ tạo kế hoạch, không chỉ sửa báo cáo, không chỉ đổi nhãn PASS/FAIL. Phải sửa nguyên nhân trong source code, tạo test có khả năng tái hiện lỗi, chạy test trước sửa để chứng minh test bắt được lỗi, sửa code, chạy lại test, rồi chạy regression test và `npm run verify:strict`.

**Trình tự bắt buộc với mọi issue:**

1. Ghi issue vào `reports/fix8/issue-ledger.md` với ID, file/dòng, mức độ, cách tái hiện, expected result, actual result.
2. Tạo test hồi quy thất bại trên code hiện tại. Lưu log trước sửa.
3. Sửa nguyên nhân gốc, không chỉ ẩn lỗi hoặc chỉnh báo cáo.
4. Chạy test hồi quy; phải PASS vì đã sửa đúng nguyên nhân.
5. Chạy toàn bộ test liên quan và các test trước đó.
6. Chạy mutation test để chứng minh lỗi tương tự không thể quay lại.
7. Chỉ đóng issue khi có bằng chứng log, exit code và đường dẫn artifact.
8. Nếu không thể xác minh nguồn hoặc không thể chạy một gate, ghi `BLOCKED` hoặc `FAIL`, không được ghi PASS và không được chuyển sang release.

**Không được:**

- Tạo `rawPayload` bằng cách ghép các trường từ `historical-seed.json` rồi gọi nó là nội dung nguồn.
- Tự gán `httpStatus: 200`, `verificationStatus: 'verified'`, `retrievedAt` cố định, ngày quay, mã kỳ, số trúng hoặc Jackpot mặc định.
- Xem URL, `sourceName`, SHA-256 tự tính từ dữ liệu hiện có hoặc trường `verified` là bằng chứng đủ để khẳng định dữ liệu đúng.
- Cho test fixture ghi vào `data/historical-seed.json`, `data/canonical-reference.json`, `data/history-scope.json` hay `data/audit-report.json` chính thức.
- Gọi `assert(true, ...)` sau một test suite mà không kiểm tra kết quả trả về của suite.
- Chuyển sang gate kế tiếp sau FAIL, lỗi exception, timeout, browser thiếu, screenshot không được tạo mới hoặc kết quả test bị bỏ qua.
- Tuyên bố độ chính xác dự đoán xổ số tương lai 100%. Mục tiêu 100% trong FIX-8 chỉ áp dụng cho sự khớp dữ liệu lịch sử đã được xác minh trong phạm vi công bố.

---

## 1. P0-01 — XÓA NGUỒN BẰNG CHỨNG GIẢ TRONG `scripts/build-source-evidence.js`

### 1.1. Lỗi đã xác định

File hiện tại đọc `data/historical-seed.json`, sau đó tạo `rawPayload` bằng chuỗi tự ghép như:

```js
const rawPayload = `XSMN|STATION:${station}|DATE:${r.date}|SPECIAL:${r.specialPrize}|PAIRS:${(r.lottoPairs || []).join(',')}|SRC:${r.sourceUrl}`;
const payloadSha256 = computeSha256(rawPayload);
```

Cùng script này còn có các nhánh gán sẵn:

```js
retrievedAt: r.retrievedAt || '2026-10-17T11:00:00.000Z',
httpStatus: 200,
verificationStatus: 'verified'
```

Vì vậy dữ liệu seed có thể sai nhưng script vẫn tạo ra một bằng chứng có hash hợp lệ, status 200 và trạng thái verified. Hash chỉ chứng minh chuỗi tự ghép không thay đổi so với hash được tính từ chính chuỗi đó; nó không chứng minh số trúng khớp nguồn công bố.

### 1.2. Cách sửa bắt buộc

1. Xóa đường chạy production mặc định đọc seed để tạo Source Evidence. `buildSourceEvidence()` không được biến seed thành bằng chứng độc lập.
2. Tạo pipeline ingest lấy **HTTP response thực tế** từ các URL đã được cấu hình, hoặc nhập snapshot raw do quy trình tải dữ liệu có log nguồn đã xác thực tạo ra.
3. Lưu body gốc nguyên trạng dưới dạng byte, ví dụ:
   - `data/source-evidence/raw/<sha256>.html`
   - `data/source-evidence/raw/<sha256>.json`
4. Hash phải được tính trên byte body thực nhận, không phải chuỗi dữ liệu đã chuẩn hóa, không phải nội dung ghép thủ công.
5. Lưu metadata thực tế của lần tải: `requestedUrl`, `finalUrl`, `httpStatus` lấy từ response, `contentType`, `retrievedAt` lấy tại thời điểm tải thành công, `rawBodyPath`, `rawBodySha256`, `parserName`, `parserVersion`, các selector/JSON path đã dùng và trạng thái parse.
6. Với một trang XSMN chứa nhiều đài/giải, có thể một raw response đại diện cho nhiều bản ghi; mỗi record phải tham chiếu đến đúng `evidenceId` và vị trí/selector được parse. Không cần nhân bản body nhưng không được mất liên kết từ bản ghi về raw source.
7. Khi không tải được nguồn, status không phải 200, nội dung không parse được hoặc trường cần thiết không có trong nguồn: ghi `unverified`/`BLOCKED`; không tự điền giá trị.
8. Chạy parser từ raw response để tạo record đã parse. Không lấy giá trị trong seed rồi chép vào evidence.
9. Ghi source evidence vào thư mục tạm; validate toàn bộ batch; chỉ sau khi gate xác nhận mới promote bằng atomic rename. Không ghi đè seed canonical trong bước tải bằng chứng.

### 1.3. Schema evidence tối thiểu

Áp dụng schema tương đương sau; có thể thêm trường nhưng không được bỏ bằng chứng gốc:

```json
{
  "schemaVersion": "2.0.0",
  "evidenceId": "<sha256-of-raw-body-or-stable-id>",
  "scope": "xsmn-21-stations",
  "source": {
    "requestedUrl": "https://example.invalid/real-page",
    "finalUrl": "https://example.invalid/real-page",
    "httpStatus": 200,
    "contentType": "text/html; charset=utf-8",
    "retrievedAt": "<actual ISO timestamp generated after successful response>",
    "rawBodyPath": "data/source-evidence/raw/<sha256>.html",
    "rawBodySha256": "<SHA-256 of exact bytes>"
  },
  "parser": {
    "name": "parse-minhngoc-xsmn",
    "version": "<real version/commit>",
    "status": "parsed"
  },
  "recordLocator": {
    "date": "YYYY-MM-DD",
    "stationId": "<station-code>",
    "domSelectorOrJsonPath": "<selector/path used to extract this record>"
  },
  "parsedRecord": {
    "date": "YYYY-MM-DD",
    "stationId": "<station-code>",
    "specialPrize": "<six digits>",
    "prizes": {},
    "lottoPairs": []
  },
  "verification": {
    "status": "pending",
    "verifiedAt": null,
    "method": null,
    "independentEvidenceIds": []
  }
}
```

`example.invalid` ở trên chỉ là placeholder minh họa schema; không được đưa URL này hoặc dữ liệu ví dụ vào seed hay báo cáo production. Agent phải thay bằng URL thực đã tải được và lưu body thực tế.

### 1.4. Điều kiện PASS

- `build-source-evidence.js` không đọc `historical-seed.json` trong production path.
- Không còn `httpStatus: 200` hard-code, `retrievedAt` cố định hoặc status verified tự động.
- Mỗi evidence record truy ngược được về raw body thật và hash được kiểm tra lại từ file trên đĩa.
- Test phải chứng minh nếu raw body thiếu hoặc bị sửa mà không còn khớp hash thì evidence không được verified.
- Test phải chứng minh dữ liệu seed bị sửa không tự biến thành source evidence mới.

---

## 2. P0-02 — SỬA `build-reference-dataset.js`: PARSE LẠI RAW SOURCE, KHÔNG CHỈ HASH CHUỖI

### 2.1. Lỗi đã xác định

`build-reference-dataset.js` hiện kiểm tra:

```js
const recomputedSha = computeSha256(ev.rawPayload);
const isValidSha = recomputedSha === ev.payloadSha256;
```

Nhưng các trường structured như `ev.prizes`, `ev.lottoPairs`, `ev.winningNumbers`, `ev.jackpotEst` vẫn được lấy trực tiếp từ JSON evidence. Nếu người nào đó sửa `ev.prizes` mà không sửa `rawPayload`, hash `rawPayload` vẫn đúng; trường `prizes` sai vẫn được đưa vào reference.

Ngoài ra, `computeRecordHash()` dùng `JSON.stringify(obj, Object.keys(obj).sort())`. Danh sách replacer key này không phải cách canonicalize đệ quy an toàn cho các object lồng nhau; trường con có thể bị loại khỏi nội dung được hash.

### 2.2. Cách sửa bắt buộc

1. Đọc evidence metadata và raw body thật.
2. Tính lại SHA-256 từ body bytes; so với `source.rawBodySha256`.
3. Kiểm tra `httpStatus` là status thực được lưu từ response, `finalUrl` thuộc domain được cho phép, `contentType` hợp lệ và parser version được đăng ký.
4. Parse raw body bằng parser theo game/nguồn ngay trong reference build hoặc gọi parser thuần đã được version hóa. Không tin `parsedRecord` trong evidence khi chưa tái parse.
5. Chuẩn hóa output từ raw body thành canonical record `parsedFromRaw`.
6. So sánh sâu `parsedFromRaw` với record structure trong evidence. Nếu khác dù chỉ một trường, từ chối build và báo trường sai.
7. Chỉ set `verification.status = 'verified'` khi raw body hash khớp, parser đọc lại được nội dung, các trường bắt buộc hoàn chỉnh, nguồn đáp ứng policy, không có xung đột chưa giải quyết và bằng chứng độc lập cần thiết đã có.
8. Reference build phải ghi ra `canonical-reference.tmp.json`, chạy validation đầy đủ rồi mới atomic rename thành `canonical-reference.json`. Không ghi một reference dở dang.
9. Không cho phép `build-reference-dataset.js` tự tạo missing field bằng `|| null`, `|| ''`, `'unknown'`, hay `[]` rồi đánh dấu verified. Missing required value phải là lỗi dữ liệu.

### 2.3. Canonical serializer đệ quy và record hash

Dùng canonicalizer xử lý nested object rõ ràng. Ví dụ:

```js
function canonicalize(value) {
  if (Array.isArray(value)) {
    // Giữ nguyên thứ tự mảng trừ field được schema quy định rõ là set không thứ tự.
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => key !== 'recordSha256')
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function hashRecord(record, sha256) {
  return sha256(canonicalJson(record));
}
```

Đây là mẫu kỹ thuật; agent phải tích hợp theo schema hiện tại, xác định chính xác trường nào là metadata và trường nào thuộc nội dung record. Mọi trường dữ liệu bắt buộc phải được bao phủ bởi hash; không được loại bỏ `prizes`, `jackpotEst`, `bonusNumber`, `date`, `drawId`, `stationId` hoặc `winningNumbers` khỏi payload hash.

### 2.4. Điều kiện PASS

- Sửa `ev.prizes` nhưng giữ `rawBodySha256` không thể tạo reference PASS.
- Sửa `ev.winningNumbers` hoặc `jackpotEst` nhưng giữ raw body không thể tạo reference PASS.
- Thay đổi nested property phải làm `recordSha256` đổi.
- Thiếu raw body hoặc parser không tái trích xuất được record thì trạng thái phải là `unverified` và strict gate phải FAIL/BLOCKED.

---

## 3. P0-03 — SỬA DEEP VALUE-LEVEL AUDIT TRONG `scripts/audit-history.js`

### 3.1. Lỗi đã xác định

Trong `compareField()` hiện có nhánh:

```js
} else if (fieldName === 'prizes') {
  isMatch = typeof seedVal === 'object' && seedVal !== null &&
            typeof refVal === 'object' && refVal !== null;
}
```

Logic này chỉ kiểm tra cả hai giá trị đều là object, không so sánh bất kỳ giải nào bên trong. Vì vậy `prizes.firstPrize = '23288'` và `prizes.firstPrize = '99999'` vẫn được coi là match nếu cả hai là object.

Các vấn đề khác:

- `sourceConflictCount = 0` đang gán cố định, không tính từ kết quả kiểm tra nguồn.
- `verificationStatus` match khi cả seed lẫn reference cùng ghi `'verified'`; đây là so sánh hai nhãn, không phải xác minh sự thật.
- `sourceUrl` giống nhau chỉ xác nhận hai file lưu cùng URL, không chứng minh response từ URL đó có đúng nội dung.
- `requiredFieldSourceMatch` làm tròn tới một chữ số thập phân; một mismatch trên hàng chục nghìn phép so sánh có thể vẫn hiện `100.0%`.

### 3.2. Cách sửa deep compare

Tạo helper canonicalize theo schema và dùng cho trường nested. Ví dụ tối thiểu:

```js
function deepCanonicalEqual(a, b) {
  return canonicalJson(a) === canonicalJson(b);
}

// Trong compareField:
if (fieldName === 'prizes') {
  isMatch = isValidPrizeSchema(seedVal) &&
            isValidPrizeSchema(refVal) &&
            deepCanonicalEqual(seedVal, refVal);
}
```

Không dùng JSON stringify thô nếu thứ tự key/định dạng khác nhau nhưng dữ liệu thực chất tương đương; phải dùng canonicalizer đã được kiểm thử. Ngược lại, không sort các mảng có ý nghĩa thứ tự, không bỏ các trường con không quen biết một cách âm thầm.

### 3.3. Audit XSMN bắt buộc kiểm tra toàn bộ giải

1. Xác định schema thống nhất cho các giải XSMN: giải đặc biệt, giải nhất, giải nhì... đến giải tám theo nguồn được parse. Dùng tên trường thực tế đang có trong seed và tài liệu schema; không tự đổi tên làm mất dữ liệu.
2. Validate từng giá trị là chuỗi số đúng độ dài theo giải. Giữ leading zero nếu nghiệp vụ yêu cầu chuỗi; không chuyển mọi mã giải thành Number khiến mất số 0 đầu.
3. So sánh sâu tất cả trường con `prizes` giữa seed, record được tái parse từ raw source và canonical reference.
4. Xác minh `lottoPairs` được suy ra độc lập từ đầy đủ kết quả giải bằng quy tắc hai chữ số cuối; so sánh kết quả suy ra với `lottoPairs` trong seed/reference. Không để `prizes` và `lottoPairs` cùng sai một cách đồng bộ rồi tự xác nhận lẫn nhau.
5. Kiểm tra số lượng kết quả theo cấu trúc giải của đài/ngày; không chỉ kiểm tra `prizes` là object.
6. Nếu parser/source không cung cấp một giải cần thiết, ghi trường đó là `unverified`, chặn 100% cho bản ghi đó và yêu cầu truy tìm nguồn bổ sung.

### 3.4. Phân biệt dữ liệu với metadata provenance

Không đưa các trường `sourceUrl` và `verificationStatus` vào cùng phép so sánh với kết quả trúng rồi xem chúng là bằng chứng giá trị trúng. Tách rõ:

- **Draw values:** ngày, mã kỳ, số chính, số đặc biệt, Jackpot, toàn bộ prize values, lotto pairs.
- **Provenance:** raw source body, URL thực, HTTP status thực, thời điểm truy xuất, parser/version, evidence ID/hash.
- **Audit state:** derived từ validation/field comparisons; tuyệt đối không chấp nhận chính chuỗi `verified` làm bằng chứng.

### 3.5. Số liệu audit phải chính xác tuyệt đối

- Tính `matchedComparisons`, `mismatchedComparisons`, `unverifiedComparisons`, `missingEvidenceCount`, `sourceConflictCount` từ các record thực tế; không hard-code số 0.
- Tỷ lệ hiển thị được tính từ số nguyên. Nếu mismatch > 0 thì không được hiển thị 100%, kể cả sau làm tròn.
- `success` chỉ được true nếu toàn bộ điều kiện strict đạt chính xác:

```js
const strictPass =
  totalRequiredComparisons > 0 &&
  matchedComparisons === totalRequiredComparisons &&
  mismatchedComparisons === 0 &&
  unverifiedComparisons === 0 &&
  missingEvidenceCount === 0 &&
  sourceConflictCount === 0 &&
  missingExpectedDraws === 0 &&
  invalidCanonicalRecords === 0 &&
  duplicateUnresolvedKeys === 0 &&
  inventedOrDefaultedValues === 0;
```

Đây chỉ là mẫu điều kiện. Agent phải bảo đảm mọi trường bắt buộc và mọi nguồn evidence đều được tính vào các biến trên; không được bỏ qua fields hoặc scope để đạt PASS.

### 3.6. Mutation tests bắt buộc

Mỗi test dùng thư mục tạm và không đụng vào data production. Tối thiểu các mutation sau phải làm audit trả `success: false` và process CLI exit code khác 0:

1. Mega: thay một bóng hợp lệ (ví dụ `09` thành `01`), vẫn đủ 6 số, không trùng, vẫn trong 1–45.
2. Power: thay một bóng chính bằng một bóng khác hợp lệ.
3. Power: đổi `bonusNumber` sang số khác hợp lệ nhưng không trùng bóng chính.
4. Mega/Power: đổi ngày thành một ngày hợp lệ về lịch nhưng sai ngày của mã kỳ.
5. Mega/Power: đổi `drawId` sang mã có định dạng đúng nhưng gắn nhầm kỳ.
6. Jackpot: đổi giá trị tiền thành số hợp lệ nhưng sai so với source/reference.
7. XSMN: đổi giải nhất `23288` thành `99999`, giữ `prizes` là object hợp lệ.
8. XSMN: đổi một giá trị nested trong `prizes` và giữ nguyên tất cả trường khác.
9. XSMN: đổi một phần tử `lottoPairs` thành cặp hợp lệ nhưng sai nguồn.
10. Evidence: thay `parsedRecord.prizes` nhưng không đổi raw response và hash.
11. Evidence: thay raw response bytes nhưng giữ hash cũ.
12. Evidence: đổi giá trị + tự tính lại hash cục bộ, nhưng không có chứng cứ nguồn độc lập tương ứng; hệ thống phải không cho rằng chỉ đổi hash là đủ để xác minh.
13. Xóa một evidence record hoặc raw body nhưng giữ reference record.
14. Gắn `verificationStatus: 'verified'` cho record không có raw body.
15. Đổi URL nguồn sang domain không nằm trong allowlist hoặc metadata `httpStatus` không được lấy từ response thật.
16. Thay đổi một trường lồng trong record sau khi `recordSha256` đã tính.
17. Đổi `scope.expectedDraws`/manifest để bỏ kỳ sai khỏi mẫu số: audit phải so manifest scope với nguồn/lịch sử chuẩn độc lập, không chấp nhận giảm mẫu số tùy ý.

**Tất cả test phải có expected failure rõ ràng.** Không chỉ kiểm tra log có từ “FAIL”; kiểm tra object result, exit code, mismatch count, field path và không thay đổi file production.

---

## 4. P0-04 — SOURCE CONFLICT, SCOPE VÀ COVERAGE KHÔNG ĐƯỢC GÁN GIẢ

### 4.1. Lỗi

Trong `scripts/audit-history.js`, hiện có:

```js
report.summary.sourceConflictCount = 0; // Không có xung đột nguồn chưa xử lý
```

Dòng này phải bị loại bỏ. Không có code nào kiểm tra nguồn mà tự gán “0 xung đột” là sai về mặt kiểm toán.

### 4.2. Cách sửa

- Với mỗi record, tạo danh sách field values từ từng evidence độc lập.
- Nếu primary và secondary sources khác nhau ở field bắt buộc, tăng `sourceConflictCount`, ghi từng nguồn, URL, field, parsed values và evidence hashes vào diagnostics.
- Không chọn một trong hai nguồn im lặng. Dùng source policy được ghi rõ theo game/field; field tranh chấp phải ở trạng thái `unresolved` đến khi con người/nguồn authoritative xác minh.
- `expectedDraws` và ngày bắt đầu/kết thúc phải được đối chiếu với lịch quay và mã kỳ nguồn độc lập; không chỉ so seed với manifest do cùng pipeline tạo ra.
- Nếu thiếu kỳ trong phạm vi công bố, phải phục hồi kỳ từ nguồn; không được xóa record hoặc giảm expected count để làm tỷ lệ đủ 100%.
- Nếu không thể tìm hoặc xác minh một kỳ/field, trạng thái tổng thể là `BLOCKED`; công bố coverage thật và danh sách còn thiếu.

### 4.3. Kết quả báo cáo bắt buộc

`data-reconciliation.csv` ít nhất phải có:

- scope/gameType, drawId, date, stationId nếu có;
- seed value canonical;
- value parse trực tiếp từ raw source;
- value từ independent reference/source thứ hai (nếu policy yêu cầu);
- field status (`MATCH`, `MISMATCH`, `UNVERIFIED`, `MISSING`, `CONFLICT`);
- source URL/final URL, retrieved timestamp, raw body SHA-256, parser version;
- quyết định xử lý và issue ID nếu đã sửa.

Không ghi một dòng `verified` cho toàn record nếu có bất kỳ trường bắt buộc nào còn `UNVERIFIED`, `MISMATCH`, `MISSING` hoặc `CONFLICT`.

---

## 5. P0-05 — `gate-runner.js` PHẢI TÔN TRỌNG KẾT QUẢ THỰC CỦA TEST CON

### 5.1. Lỗi đã xác định

Trong `scripts/gate-runner.js`:

```js
runGateAReferenceTests();
this.assert(true, 'Bộ kiểm thử độc lập Gate A ... đạt 100%', gateResult);
```

Các suite như Gate A/C/D có thể trả về `{ passed, failed, success }`, nhưng runner bỏ qua return value và gọi `assert(true, ...)`. Nếu suite ghi `[FAIL]` nhưng không throw exception, gate cha vẫn có thể ghi PASS.

Cùng pattern này đang xuất hiện trong các gate gọi `runAuditMutationTests()`, `runGateCIngestionTests()` và `runArtifactMutationTests()`.

### 5.2. Cách sửa bắt buộc

Tạo helper dùng chung và thay thế mọi call pattern tương tự:

```js
function assertSubtestSuccess(subtestName, result, gateResult) {
  const hasStructuredResult = result && typeof result === 'object';
  const success = hasStructuredResult && result.success === true;
  const failed = hasStructuredResult ? Number(result.failed ?? 0) : Infinity;
  const validCounts = Number.isFinite(failed) && failed === 0;

  if (!success || !validCounts) {
    const detail = hasStructuredResult
      ? JSON.stringify({ success: result.success, passed: result.passed, failed: result.failed })
      : 'Test không trả về object kết quả hợp lệ';
    throw new Error(`[SUBTEST FAIL] ${subtestName}: ${detail}`);
  }

  gateResult.assertions.push({
    name: `${subtestName}: success=true và failed=0`,
    pass: true
  });
}

// Ví dụ dùng trong runGateA:
const result = runGateAReferenceTests();
assertSubtestSuccess('Gate A reference independence', result, gateResult);
```

Nếu một test trả số lượng assertions thay vì `{ success, failed }`, phải thống nhất contract trước, không chuyển kết quả thiếu thông tin thành PASS. Tốt nhất mọi suite export cùng schema:

```js
return { success: failed === 0, passed, failed, assertions };
```

### 5.3. Điều kiện dừng

- Khi `result.success !== true`, `failed > 0`, thiếu result, throw exception hoặc timeout: gate phải FAIL.
- Gate sau phải được đánh `NOT_RUN`; không được chạy test còn lại chỉ để hoàn thiện báo cáo đẹp.
- Exit code của `npm run verify:strict` phải khác 0.
- Không tạo `RELEASE_READY` khi bất kỳ gate nào FAIL/NOT_RUN/BLOCKED.
- Test Gate I phải tiêm lỗi vào một subtest giả trả `{ success: false, failed: 1 }` nhưng không throw; runner bắt buộc vẫn dừng. Phải có thêm ca test subtest không trả gì và subtest throw exception.

---

## 6. P0-06 — SỬA GATE A: CHỨNG MINH ĐỘC LẬP SOURCE-EVIDENCE, KHÔNG CHỈ ĐỘC LẬP SEED

### 6.1. Lỗi

`test/test-gate-a-reference.js` hiện tạo `fake-seed.json`, nhưng không truyền seed đó vào `buildSourceEvidence()` và không thử thay đổi seed trước rồi tái tạo evidence. Test chỉ gọi `buildCanonicalReference()` hai lần từ cùng thư mục evidence và so sánh hai output. Điều đó chỉ chứng minh reference builder không đọc trực tiếp seed; không chứng minh evidence itself độc lập với seed.

### 6.2. Bộ Gate A phải có đủ các test

1. `buildSourceEvidence()` không có production option đọc seed, hoặc nếu còn legacy import thì phải cấm đường chạy này bằng test.
2. Tạo evidence từ HTTP fixture nguyên bản (raw HTML/JSON đóng băng trong test fixture, có hash được chốt độc lập trong source control). Không dùng fixture được tạo từ seed tại thời điểm test.
3. Sửa seed tùy ý rồi build reference từ evidence cố định: reference phải không thay đổi.
4. Sửa seed rồi chạy audit: audit phải phát hiện mismatch so với reference độc lập.
5. Sửa parsed fields trong evidence nhưng giữ raw body: reference builder phải từ chối.
6. Sửa raw body nhưng giữ raw body hash: reference builder phải từ chối.
7. Sửa raw body và tự tính lại hash local nhưng không có nguồn gốc/tín hiệu trust được policy chấp nhận: không được tự động thành verified.
8. Làm giả `httpStatus=200`, `retrievedAt` hoặc `verificationStatus`: không thể tạo ra record verified nếu thiếu log HTTP/ raw bytes thật.
9. Raw body fixture phải parse được bằng parser thực tế đang dùng; expected normalized result phải được ghi cố định độc lập và code review được.

**Không dùng `sourceUrl` như một chuỗi tự khai để thay thế raw evidence.**

---

## 7. P1-01 — SOURCE POLICY VÀ QUY TRÌNH KHÔI PHỤC DỮ LIỆU

### 7.1. Không phá seed chính thức

- Trước thao tác sửa data, tạo backup bằng byte-copy và lưu SHA-256 trước/sau.
- Tất cả scraping, parsing, data repair và audit mutation test chạy trên staging/tmp.
- Chỉ promote bằng command có write guard (`--allow-canonical-write`) sau khi reconciliation đạt.
- Nếu promotion thất bại giữa chừng, khôi phục từ backup và xác minh hash. Không để một phần dữ liệu mới trộn với dữ liệu cũ.

### 7.2. Quy trình sửa bản ghi sai

Với mỗi lỗi:

1. Lấy raw source response hiện hành hoặc nguồn lưu trữ lịch sử đáng tin cậy.
2. Lưu body raw trước khi parse; tính hash trên body bytes.
3. Parse bằng parser version được ghi nhận.
4. So sánh các giá trị bắt buộc với seed và với nguồn độc lập theo policy.
5. Ghi discrepancy vào `data-reconciliation.csv` và `reports/fix8/issue-ledger.md`.
6. Sửa bản ghi trên staging từ kết quả parse nguồn, không sửa thủ công dựa trên phỏng đoán.
7. Chạy validation, deep audit, mutation tests và regression tests.
8. Chỉ sau khi tất cả đạt mới promotion; cập nhật manifest/scope theo quy trình được review, không tự giảm phạm vi.

Nếu nguồn chính/nguồn thứ hai không truy cập được hoặc thiếu một giải/Jackpot bắt buộc, không chế giá trị. Đánh `BLOCKED` cho field/record đó, mô tả nguồn đã thử và bằng chứng hiện có.

### 7.3. Phân biệt “không có dữ liệu” và “không áp dụng”

Dùng trạng thái schema tường minh như `value`, `not_applicable`, `unknown`, `unverified`; không dùng `null`, `''`, `0` hoặc giá trị mặc định với nhiều ý nghĩa. Field bắt buộc trong acceptance scope phải có value được xác minh; trường không áp dụng chỉ được miễn nếu policy cho phép và có lý do/nguồn chứng minh.

---

## 8. P1-02 — KIỂM ĐỊNH ĐỘ CHÍNH XÁC CÔNG THỨC 8 THUẬT TOÁN

**Mục tiêu:** kiểm tra thuật toán thực hiện đúng công thức đã công bố, không chỉ kiểm tra đầu ra có sáu số hợp lệ. Mỗi thuật toán phải có contract ghi rõ input, preprocessing, công thức, tham số, output, cách xử lý ties và trạng thái insufficient data. Nếu code thực tế không phải phương pháp được ghi trong tên/nhãn, sửa implementation hoặc đổi tên mô tả; không được tuyên bố một phương pháp chưa triển khai.

### 8.1. `frequency-gap.js` — Tần suất và độ gan

Test trên fixture nhỏ do người viết test tính tay độc lập:

- Đếm số kỳ được dùng chính xác; kiểm tra chỉ lấy cửa sổ N kỳ mà algorithm contract chỉ định.
- Tần suất của mỗi số = số kỳ có xuất hiện theo đúng định nghĩa, không cộng lặp cùng một số trong một kỳ Vietlott.
- XSMN: xác định rõ metric là số lần cặp 2 chữ số xuất hiện trong các giải hay số kỳ có xuất hiện; không trộn hai định nghĩa.
- Khoảng gan tính từ lần xuất hiện gần nhất theo thứ tự thời gian đã chuẩn hóa. Không tính ngày hiện tại/future target vào lịch sử.
- Test số chưa từng xuất hiện, xuất hiện ở kỳ mới nhất, xuất hiện ở kỳ cũ và tie-break.

### 8.2. `moving-average.js` — EMA và ngày quay mục tiêu

- Kiểm tra đúng công thức `EMA_t = alpha * x_t + (1-alpha) * EMA_(t-1)` và thứ tự xử lý từ cũ tới mới.
- Fixture tối thiểu 3 kỳ có expected EMA tính bằng tay; so sánh sai số số thực trong tolerance quy định.
- `targetDrawDate` phải được lấy từ lịch quay đã cấu hình, không suy đoán kỳ tiếp theo bằng `date + 1`.
- Test quanh ngày cuối tuần, giao tháng/năm, timezone và ngày không hợp lệ.
- Kiểm tra seasonality chỉ sử dụng các kỳ cùng thứ được quan sát trước target date; `dayHits/dayTotal` phải khớp số đếm độc lập.
- Nếu lịch game/đài không rõ thì trả trạng thái `insufficient-data` hoặc `schedule-unverified`, không tự gán thứ Hai/ngày mặc định.

### 8.3. `markov.js` — Ma trận chuyển trạng thái

- Mô tả rõ state definition và time direction trong `reports/algorithm-contracts.md`.
- Test trực tiếp transition counts bằng fixture nhỏ; kiểm tra tổng xác suất từng hàng là 1 nếu hàng có transition và 0/trạng thái unavailable nếu không có.
- Xác nhận không có transition từ kỳ tương lai về kỳ quá khứ do mảng dữ liệu mới nhất đứng trước/cũ hơn đứng sau.
- Nếu tên hiển thị “Bậc 2” nhưng code chỉ sử dụng state gần nhất, phải triển khai bậc 2 thật với hai state trước hoặc sửa nhãn thành bậc 1; test contract phải phân biệt hai trường hợp.

### 8.4. `poisson.js` — Phân phối Poisson

- Kiểm tra λ được tính từ đúng số sự kiện và số kỳ exposure trong cửa sổ train.
- Kiểm tra `P(X=k)=exp(-λ) * λ^k / k!` và `P(X>=1)=1-exp(-λ)` trên λ nhỏ, λ=0 và λ dương bằng expected value độc lập.
- Không dùng score phần trăm giả như “xác suất số trúng” nếu đó chỉ là biến đổi từ tần suất thực nghiệm. UI/explanation phải mô tả chính xác đại lượng đang tính.
- Ghi rõ Poisson là mô hình/approximation thống kê cho tần suất, không phải chứng minh kết quả quay độc lập có thể dự đoán.

### 8.5. `monte-carlo.js` — Monte Carlo

- Cùng seed + cùng input + cùng cấu hình phải cho kết quả, ranking và diagnostics giống nhau.
- Seed đổi thì có thể đổi output; test không được yêu cầu mọi seed cho cùng dàn số.
- Vietlott: 6 bóng chính lấy không hoàn lại trong đúng miền số; Power có bóng đặc biệt tách riêng và tuân theo rule game.
- XSMN: các cặp hai chữ số cuối được ghi nhận theo kết quả giải; trùng cặp giữa các giải có thể xảy ra. Simulation phải match semantics thực tế, không dùng `Set` khử trùng nếu đang mô phỏng 18 kết quả giải độc lập.
- Test empirical distribution bằng tolerance thống kê qua số lượng simulation đủ lớn; ghi seed, số simulation, confidence interval và random generator version.
- Không gắn “Confidence Interval” nếu chưa thực sự tính interval; không gọi `frequencyInSim` là xác suất jackpot.

### 8.6. `clustering.js` — Cấu trúc/heuristic hay K-Means

- Code hiện đặt tên file `clustering.js`, nhưng comment và logic mô tả `Parity & Mean Reversion Heuristic`, không phải K-Means cổ điển.
- Chọn một trong hai hướng: (A) giữ heuristic thì đổi tên/description/UI cho đúng, test riêng tỷ lệ chẵn/lẻ, cao/thấp, mean deviation và score; hoặc (B) triển khai thuật toán clustering thực sự: đặc trưng đầu vào, chuẩn hóa, khởi tạo seed, gán cụm, cập nhật centroid, điều kiện hội tụ và cách biến cluster membership thành score phải mô tả trong contract và kiểm tra bằng fixture.
- Không được giữ tên “K-Means” nếu không thực hiện bước gán cụm và tối ưu centroid.

### 8.7. `association-rules.js` — Support, Confidence, Lift

- Định nghĩa transaction rõ ràng theo loại game: một kỳ quay là một transaction; với XSMN phải nói rõ dùng unique lottery pairs trong kỳ hay từng giải như transaction riêng.
- Tính theo công thức chuẩn, với cùng định nghĩa transaction:
  - `support(A) = count(A) / N`
  - `support(A,B) = count(A and B in same transaction) / N`
  - `confidence(A -> B) = support(A,B) / support(A)`
  - `lift(A -> B) = confidence(A -> B) / support(B)` khi mẫu số > 0.
- Nếu kết hợp sequential rule `A in draw_t -> B in draw_(t+1)` với in-draw co-occurrence, phải hiển thị đây là metric tùy biến `combinedLift`, không gọi nó đơn giản là Lift chuẩn. Cần test expected values riêng từng thành phần và trọng số 70/30.
- Hiện cần kiểm tra xem `coOccurrencePairs` và cột UI có dùng đúng `coOccurrenceCount`, `support`, `confidence`, `lift`; không dùng field missing tạo `undefined`.

### 8.8. `ensemble.js` — Tổng hợp các model

- Chuẩn hóa scores về cùng hướng và thang đo trước khi kết hợp; không cộng các giá trị khác ý nghĩa như thể chúng cùng là xác suất.
- Viết rõ công thức trong `reports/algorithm-contracts.md` và config có version. Nếu dùng trọng số, tổng trọng số, nguồn chọn trọng số và tác động của đổi trọng số cần test. Không dùng hidden/default arbitrary weights.
- Xếp hạng phải theo metric primary đã công bố. Nếu ensemble chọn candidates từ vote count, nói rõ vote-based ranking; nếu dùng weighted score, phải thực sự sort theo weighted score. Không mô tả một phương thức nhưng code áp dụng phương thức khác.
- Test fixture với scores/votes được tạo sẵn, expected ranking biết trước, ties, model lỗi, model `insufficient-data` và dữ liệu thiếu.
- Nếu một model trả lỗi/thiếu dữ liệu, không âm thầm coi đó là score 0 mà không ghi diagnostics. Thống kê số model tham gia phải hiện rõ.

### 8.9. Quy định chung cho mọi algorithm

- Input history phải được copy/normalize, sắp xếp theo ngày rõ ràng và chỉ gồm những kỳ trước target date.
- Không mutate input; có test deep-freeze hoặc so hash trước/sau.
- Empty, null, malformed records trả trạng thái lỗi/insufficient-data; không tự sinh bộ số thay thế.
- Test output: number domain, length, uniqueness theo đúng game semantics, score finite, no NaN/Infinity, deterministic khi cấu hình cần deterministic.
- Gắn metadata `trainingWindowStart`, `trainingWindowEnd`, `trainingDrawCount`, `targetDate`, `algorithmVersion`, `configHash` vào backtest output.
- Cấm khẳng định thuật toán có lợi thế dự đoán từ unit tests; phải dùng walk-forward test và baseline công bằng để đánh giá hiệu suất.

---

## 9. P1-03 — BACKTEST VÀ RANDOM BASELINE CÔNG BẰNG

1. Sắp lịch sử theo ngày quay thật. Với mỗi target date, `trainingData` chỉ gồm records có ngày **nhỏ hơn** target date. Target result chỉ dùng để score sau khi model đã tạo prediction.
2. Fit mọi tham số, weights, selection, normalization và hyperparameters chỉ từ các kỳ train. Không chọn tham số dựa trên fold test rồi báo đó là out-of-sample.
3. Các algorithm phải được so sánh trên cùng set target folds, cùng number of picks, cùng game/station, cùng quy tắc chấm hit.
4. Random baseline phải chọn đúng số candidate, đúng miền và đúng rule no-replacement/replacement như trò chơi; chạy tối thiểu 1.000 replicates hoặc số lớn hơn được quy định trong config, lưu seed và distribution.
5. Báo cáo mean, median, standard deviation và confidence interval của random baseline; tính chênh lệch model-baseline trên cùng folds. Không khẳng định vượt baseline nếu khoảng bất định chưa ủng hộ kết luận hoặc sample quá nhỏ.
6. Chọn primary metric trước khi chạy backtest (ví dụ average number hits per draw). Jackpot hits, max hits và best-ever results báo riêng, không cộng với metric chính bằng trọng số tùy ý.
7. Top 1 leaderboard phải hiển thị game/station, target range, number of folds, average hit, baseline mean/interval và metric sort. Nếu chưa đủ sample, ghi “Chưa đủ mẫu để xếp hạng đáng tin cậy”.
8. Không đặt ngưỡng baseline cứng như `[0.5, 1.1]` cho mọi sample nếu không có lý do theo thống kê và game. Dùng fixture deterministic để test công thức; dùng simulation distributions để test hiệu suất.

---

## 10. P1-04 — FIX CACHE INVALIDATION THEO NỘI DUNG DỮ LIỆU

### Quy tắc

- Canonical prediction cache key phải bao gồm: game/station, target draw date, `historyFingerprint`, algorithm version, model config hash, canonicalization/schema version.
- `historyFingerprint = SHA256(canonicalJson(normalized training records))`; không chỉ dùng ngày kỳ mới nhất hoặc record count.
- Khi sửa một bóng ở bất kỳ kỳ train cũ nào, fingerprint phải thay đổi và cache phải miss.
- Khi chỉ thay metadata không ảnh hưởng mô hình, quyết định có invalidate hay không phải được mô tả; tối thiểu toàn bộ trường có thể ảnh hưởng preprocessing/feature/algorithm phải có trong fingerprint.
- Tránh cache key dựa vào JSON.stringify có nested keys không ổn định; dùng canonical serializer đệ quy.

### Tests

1. Cùng data+config => cache hit và output y hệt.
2. Sửa một bóng ở kỳ cũ nhưng giữ nguyên kỳ cuối => fingerprint đổi và cache miss.
3. Sửa target date => cache miss.
4. Sửa weights/algorithm version => cache miss.
5. Thay đổi input object không làm mutation input; test hash history trước/sau.

---

## 11. P0-07 — RUNNER PHẢI CÓ CONTRACT GATES THẬT VÀ REPORT KHÔNG NÓI QUÁ

### 11.1. Đăng ký gate inventory rõ ràng

`gate-runner.js` hiện định nghĩa 9 gate A–I trong mảng thực thi. Báo cáo và lệnh shell không được tuyên bố 12 gate A–L đã chạy nếu trong code chỉ có A–I. Tạo `required-gates.json` hoặc một cấu hình export làm source of truth: mỗi gate có ID, tên, fn, bắt buộc hay optional, loại artifact, timeout.

Trước khi run:
- Check gate ID duy nhất, danh sách required đầy đủ và đúng yêu cầu FIX-8.
- Nếu FIX-8 bắt buộc J–L, phải triển khai J–L với test thật và register vào runner. Không tạo báo cáo giả cho gate không có function.
- Report phải ghi `executedGates`, `notRunGates`, `failedGates` từ runtime, không hard-code.

### 11.2. Gọi subtest với structured results

Thay pattern:

```js
runGateAReferenceTests();
this.assert(true, 'Bộ kiểm thử Gate A đạt 100%', gateResult);
```

bằng:

```js
const result = runGateAReferenceTests();
assertSubtestSuccess('Gate A reference tests', result, gateResult);
```

`assertSubtestSuccess` phải throw nếu:
- không có object result;
- `success !== true`;
- `failed !== 0`;
- assertion count không đúng contract;
- test suite bị skip, timeout hoặc trả lỗi.

Áp dụng cho Gate A, B, C, D và mọi nơi gọi suite nội bộ. Gate method không được tự ghi PASS chỉ vì function không throw.

### 11.3. Trạng thái bắt buộc

- `PASS`: toàn bộ assertions thực tế chạy và pass.
- `FAIL`: có test/assertion thất bại hoặc phát hiện dữ liệu sai.
- `BLOCKED`: không thể xác minh do source/browser/dependency thiếu.
- `NOT_RUN`: gate chưa được thực thi vì gate trước thất bại.
- Không được ép `BLOCKED` hoặc `NOT_RUN` thành PASS.
- Exit code 0 chỉ khi mọi required gate trong inventory là PASS; mọi trạng thái còn lại phải exit non-zero.

---

## 12. P0-08 — LOG, HASH VÀ ARTIFACT MANIFEST

1. Mỗi lượt có `runId` mới và thư mục riêng `reports/fix8/runs/<run-id>/`.
2. Trạng thái `RUNNING` được ghi ngay khi bắt đầu; nếu process crash/timeout, run status còn cho thấy `RUNNING/INTERRUPTED`, không dùng kết quả cũ.
3. Mỗi gate ghi file log riêng. Sau khi gate kết thúc, close/flush file hoàn toàn rồi mới tính SHA-256. Không append bất kỳ byte nào vào file sau khi tính hash.
4. `gate-results.json` phải được finalize trước khi nằm trong manifest. Artifact manifest không được tự liệt kê/hash chính nó nếu tạo circular hash; dùng manifest-envelope hoặc hash manifest bên ngoài sau khi đóng file.
5. Trước mỗi run, không đọc trạng thái PASS cũ để kết luận run mới. Mỗi `runId` có artifact riêng; top-level report chỉ tổng hợp run IDs đã tồn tại và đã verify trong lần chạy đó.
6. `verify-artifacts.js` phải kiểm tra từng artifact path tồn tại, SHA-256 đúng, không có duplicate path, path không thoát ra ngoài run dir, không có required artifact bị thiếu.
7. Test mutation: sửa một byte log sau hash, thay một screenshot, xóa file, đổi path hoặc sửa manifest — verifier bắt buộc FAIL.
8. Gate K/manifest không được hash `run-1.log` rồi tiếp tục append thêm báo cáo vào cùng file. Log bất biến phải nằm riêng với master console log.

---

## 13. TEST FIXTURES VÀ BẢO VỆ DỮ LIỆU CHÍNH THỨC

Tất cả mutation tests phải sử dụng `fs.mkdtemp()` trong `os.tmpdir()` hoặc thư mục tạm unique nằm dưới run ID, không dùng chung `test/fixtures/gate-a-tmp` cố định nếu nhiều lượt có thể chạy song song.

- Chụp SHA-256 các file production trước test: seed, source evidence, canonical reference, history scope, audit report, baseline/config.
- Sau test, xác minh hash không đổi; nếu đổi, gate FAIL ngay.
- Không xóa `test/fixtures` toàn cục hoặc report production khi cleanup.
- Cleanup phải nằm trong `finally` để test fail vẫn xóa tệp tạm mà không xóa nhầm dữ liệu chính.
- Khi tạo/đổi reference chính thức, cần write guard rõ ràng, backup byte-level, validation staging, review reconciliation diff và atomic promotion.
- Chạy thử concurrency để đảm bảo 2 mutation suites không ghi vào cùng temp/report path.

---

## 14. CÁC LỆNH VÀ EXIT CODE CẦN CHUẨN HÓA

Bổ sung/đảm bảo các script sau có contract rõ trong `package.json`:

```json
{
  "scripts": {
    "test:unit": "node test/test-unit.js",
    "test:integration": "node test/test-integration.js",
    "test:audit-mutations": "node test/test-audit-mutations.js",
    "test:algorithm-reference": "node test/test-algorithm-reference.js",
    "test:artifacts": "node test/test-artifact-mutations.js",
    "verify:artifacts": "node scripts/verify-artifacts.js",
    "audit:history:strict": "node scripts/audit-history.js --strict",
    "verify:strict": "node scripts/gate-runner.js"
  }
}
```

Nếu script đã có tên tương đương, giữ tên hiện hành và không tạo script trùng. Đảm bảo mỗi test suite:
- trả structured result với `success`, `passed`, `failed`, `assertions`;
- chạy trực tiếp từ CLI có exit code 1 khi fail;
- khi import vào runner, runner kiểm tra return value;
- không tự ghi báo cáo chính thức nếu test đang dùng fixture.

Các lệnh PowerShell đề nghị sau khi sửa:

```powershell
npm run test:unit
npm run test:integration
npm run test:audit-mutations
npm run test:algorithm-reference
npm run test:artifacts
npm run audit:history:strict
npm run verify:artifacts
npm run verify:strict
```

Trên Linux/macOS dùng cùng lệnh npm. Browser phải được tìm qua cấu hình/env và detection theo OS; nếu không có browser hoặc launch timeout, E2E phải FAIL/BLOCKED với exit code khác 0, không được bỏ qua rồi ghi PASS.

---

## 15. TEST THỬ PHÁ HỦY BẮT BUỘC — CHỨNG MINH GATE KHÔNG THỂ PASS GIẢ

Gate Runner phải tự kiểm tra chính mình trong fixture độc lập:

1. Subtest trả `{ success:false, passed:9, failed:1 }` nhưng không throw → gate cha FAIL, gates sau NOT_RUN.
2. Subtest trả `undefined` → FAIL.
3. Subtest throw exception → FAIL.
4. Subtest bị timeout → FAIL/BLOCKED, không PASS.
5. Một field XSMN nested bị đổi 23288 → 99999 → audit FAIL.
6. Một bóng Vietlott đổi 09 → 01 nhưng vẫn hợp lệ → audit FAIL.
7. `prizes` nested object thay đổi nhưng key cấp cao vẫn giữ nguyên → record hash/audit phát hiện.
8. Evidence metadata giả `httpStatus=200`, `verificationStatus=verified` nhưng thiếu raw bytes/log → reference build không thể xác nhận verified.
9. Build evidence trên seed đã sửa không tự thay raw evidence/expected reference.
10. Thiếu một kỳ bắt buộc → coverage < 100% và gate FAIL.
11. Có hai nguồn xung đột → `sourceConflictCount > 0`, trạng thái BLOCKED/FAIL.
12. Tỷ lệ match có một mismatch duy nhất → tỷ lệ không được hiển thị 100%, và strict audit FAIL.
13. Đổi một byte sau khi hash artifact → verify-artifacts FAIL.
14. Browser executable bị cố tình đặt sai path → Gate browser FAIL/BLOCKED và pipeline exit non-zero.
15. Gate J/K/L nếu được cấu hình bắt buộc mà chưa register/execute → inventory check FAIL; tuyệt đối không báo đã hoàn thành mọi gates.

Mỗi thử nghiệm phải assert cả kết quả chức năng, exit code, gate status và không thay đổi hash của production files.

---

## 16. RELEASE GATE — CỔNG NGHIỆM THU CUỐI

Chỉ được đặt `RELEASE_READY` khi tất cả điều kiện sau cùng đúng:

- [ ] Source evidence có raw body thật, parse lại được và hash khớp; không được tạo từ seed.
- [ ] Reference được rebuild từ raw evidence đã xác minh, không sao chép seed.
- [ ] Deep audit so sánh toàn bộ trường bắt buộc, bao gồm từng nested prize XSMN và Jackpot.
- [ ] `sourceConflictCount` được tính thực, không gán cứng.
- [ ] Tất cả missing/unverified/conflict/mismatch/invalid/duplicate/unsupported fields bằng 0 trong scope đã công bố.
- [ ] Mutation `09 -> 01` và `23288 -> 99999` đều khiến audit fail.
- [ ] Gate runner kiểm tra return result thực của mọi suite; không có `assert(true, ...)` để đại diện cho suite chạy thành công.
- [ ] Algorithm expected-value tests chạy độc lập và tất cả contract đã công bố có fixture kiểm chứng.
- [ ] Backtest walk-forward và random baseline dùng cùng folds/rules và công bố phạm vi.
- [ ] Cache invalidation phản ứng khi thay một kỳ lịch sử cũ.
- [ ] E2E thực sự chạy browser; không skip; screenshot được tạo mới và verify.
- [ ] Các log/artifact hash được tính sau khi file hoàn tất và verify từ file trên đĩa.
- [ ] Gate inventory trong report khớp chính xác các gate thực sự đã đăng ký và chạy.
- [ ] `npm run verify:strict` đạt 3 lượt độc lập liên tiếp trên cùng source commit cuối cùng; mỗi lượt có `runId`, log, gate results, artifact manifest và exit code riêng.
- [ ] Không có file production bị sửa bởi tests.
- [ ] `reports/fix8/verification-report.md`, `issue-ledger.md`, `data-reconciliation.csv` được tạo từ kết quả thực thi, không chứa giá trị hard-coded.

Nếu bất kỳ mục nào không đạt, ghi `NOT_RELEASE_READY`. Nếu thiếu nguồn đáng tin cậy, trạng thái là `BLOCKED`, kèm danh sách record/field cần khôi phục. Không được thu hẹp scope, xóa bản ghi hoặc thay đổi expected count để vượt gate.

---

## 17. FORMAT BÁO CÁO CUỐI BẮT BUỘC

Báo cáo `reports/fix8/verification-report.md` cần có:

1. Git commit/source fingerprint và thời điểm chạy.
2. Danh sách đúng những gate đã đăng ký, thứ tự thực thi và status từng gate.
3. Mỗi gate: command, exit code, passed/failed count, log path/hash, artifacts.
4. Data audit: số kỳ kỳ vọng/thực tế/verified/missing; tổng required comparisons, matched, mismatched, unverified; source conflicts; evidence coverage; không chỉ báo tỷ lệ làm tròn.
5. Danh sách mọi mutation đã chạy cùng expected/actual result.
6. Kết quả các algorithm reference tests và contract/version từng model.
7. Baseline/backtest: folds, training windows, seed/simulation count, metric, uncertainty interval và giới hạn diễn giải.
8. Browser: binary/version, URL, viewport, screenshot path/hash, console errors, failed requests, overflow checks.
9. Tình trạng source files trước/sau test và hash equality.
10. Kết luận duy nhất: `RELEASE_READY`, `NOT_RELEASE_READY` hoặc `BLOCKED`, tính toán từ gate results; không nhập thủ công.

### Cấm dùng các câu dưới đây nếu chưa có bằng chứng

- “Lịch sử chính xác 100%” khi source evidence không độc lập và không được so sánh từng trường.
- “Tất cả 12 gate PASS” khi runtime chỉ thực thi 9 gate.
- “Ba lượt hoàn tất” nếu chỉ ba file JSON có status PASS mà log/exit code/artifact manifest của từng run thiếu hoặc không khớp.
- “Thuật toán chính xác 100%” hoặc “dự đoán xổ số đúng 100%”. Chỉ được báo công thức đã khớp expected-value tests và hiệu suất thống kê trên các sample đã kiểm định.

---

## 18. CHỈ THỊ THỰC THI CHO CODEX

Thực hiện ngay trên source code, theo thứ tự P0-01 → P0-08 → P1. Với từng mục:

1. Mở file đúng và xác nhận lỗi đang tồn tại.
2. Tạo regression test trước khi sửa.
3. Chạy test để chứng minh lỗi được tái hiện.
4. Sửa implementation.
5. Chạy lại test và regression suite.
6. Chạy mutation ngược.
7. Ghi bằng chứng vào issue ledger.
8. Chỉ qua gate khi tất cả điều kiện của gate đó được pass thực tế.

Nếu sửa một gate làm gate trước đó hỏng, quay lại sửa và chạy lại từ gate đầu tiên bị ảnh hưởng. Không được chỉ rerun gate cuối cùng. Không được đánh dấu issue đã đóng chỉ vì đã sửa code; chỉ đóng khi test có thể tái hiện lỗi đã chuyển từ FAIL sang PASS và các gate liên quan vẫn PASS.

**Nhiệm vụ hoàn tất chỉ khi** code đã được sửa, `npm run verify:strict` có bằng chứng ba lượt hoàn tất độc lập, report được tạo từ runtime và mọi mục bắt buộc ở Mục 16 đều đạt. Nếu không đủ bằng chứng nguồn hoặc môi trường bị giới hạn, báo `BLOCKED` một cách trung thực, không giả lập kết quả.
