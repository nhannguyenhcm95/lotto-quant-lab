import fs from 'fs';

const html = fs.readFileSync('temp_xsmn.html', 'utf-8');

// Cấu trúc bảng XSMN Minh Ngọc:
// Mỗi kỳ quay một ngày có bảng: <table class="bkqmiennam" ...>
// Bên trong có:
// <td class="ngay"> ... 14/10/2026 ...
// Các đài nằm trong: <table cellpadding="0" cellspacing="0" class="rightcl" ...>
// <td class="tinh"><a ...>Đồng Nai</a></td>
// <td class="matinh">XSDN - 10K2</td>
// <td class="giai8"><div>56</div></td>
// ...
// <td class="giaidb"><div>953606</div></td>

const stationCodeMap = {
  'TP. HCM': 'tphcm',
  'TP.HCM': 'tphcm',
  'Hồ Chí Minh': 'tphcm',
  'Đồng Nai': 'dong-nai',
  'Cần Thơ': 'can-tho',
  'Sóc Trăng': 'soc-trang',
  'Tây Ninh': 'tay-ninh',
  'An Giang': 'an-giang',
  'Bình Thuận': 'binh-thuan',
  'Vĩnh Long': 'vinh-long',
  'Bình Dương': 'binh-duong',
  'Trà Vinh': 'tra-vinh',
  'Long An': 'long-an',
  'Bình Phước': 'binh-phuoc',
  'Hậu Giang': 'hau-giang',
  'Tiền Giang': 'tien-giang',
  'Kiên Giang': 'kien-giang',
  'Đà Lạt': 'da-lat',
  'Lâm Đồng': 'da-lat',
  'Đồng Tháp': 'dong-thap',
  'Cà Mau': 'ca-mau',
  'Bến Tre': 'ben-tre',
  'Vũng Tàu': 'vung-tau',
  'Bạc Liêu': 'bac-lieu'
};

function parseXSMNPage(htmlContent) {
  const tableBlocks = htmlContent.split('class="bkqmiennam"');
  const allDraws = [];

  for (let b = 1; b < tableBlocks.length; b++) {
    const tableBlock = tableBlocks[b];

    // Lấy ngày quay
    const dateMatch = tableBlock.match(/class="ngay"[^>]*>[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
    if (!dateMatch) continue;
    const dateRaw = dateMatch[1];
    const p = dateRaw.split('/');
    const dateStr = `${p[2]}-${p[1]}-${p[0]}`;

    // Tách các đài (mỗi đài có class="rightcl")
    const stationBlocks = tableBlock.split('class="rightcl"');
    for (let s = 1; s < stationBlocks.length; s++) {
      const stBlock = stationBlocks[s];

      // Tên tỉnh
      const tinhMatch = stBlock.match(/class="tinh"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
      if (!tinhMatch) continue;
      const stationName = tinhMatch[1].trim();
      const stationId = stationCodeMap[stationName] || stationName.toLowerCase().replace(/[^a-z0-9]/g, '-');

      // Mã tỉnh
      const matinhMatch = stBlock.match(/class="matinh"[^>]*>\s*([^<\r\n]+)/i);
      const drawId = matinhMatch ? matinhMatch[1].trim() : `K${dateStr.replace(/-/g, '').slice(2)}`;

      // Bóc tách các giải: giai8, giai7, giai6, giai5, giai4, giai3, giai2, giai1, giaidb
      const extractNumbers = (className) => {
        const regex = new RegExp(`class="${className}"[^>]*>([\\s\\S]*?)<\\/td>`, 'i');
        const match = stBlock.match(regex);
        if (!match) return [];
        const divMatches = [...match[1].matchAll(/<div>([^<]+)<\/div>/g)].map(m => m[1].trim());
        return divMatches.length > 0 ? divMatches : [match[1].replace(/<[^>]+>/g, '').trim()].filter(Boolean);
      };

      const prizes = {
        special: extractNumbers('giaidb'),
        first: extractNumbers('giai1'),
        second: extractNumbers('giai2'),
        third: extractNumbers('giai3'),
        fourth: extractNumbers('giai4'),
        fifth: extractNumbers('giai5'),
        sixth: extractNumbers('giai6'),
        seventh: extractNumbers('giai7'),
        eighth: extractNumbers('giai8')
      };

      // 18 con lô 2 số cuối
      const lottoPairs = [];
      Object.values(prizes).forEach(arr => {
        arr.forEach(val => {
          if (val.length >= 2) lottoPairs.push(val.slice(-2));
        });
      });

      // Bảng đầu đuôi
      const head = {};
      const tail = {};
      for (let d = 0; d <= 9; d++) { head[d] = []; tail[d] = []; }
      lottoPairs.forEach(num => {
        head[num[0]].push(num[1]);
        tail[num[1]].push(num[0]);
      });
      for (let d = 0; d <= 9; d++) { head[d].sort(); tail[d].sort(); }

      if (lottoPairs.length > 0) {
        allDraws.push({
          date: dateStr,
          drawDateRaw: dateRaw,
          stationId,
          stationName,
          drawId,
          prizes,
          lottoPairs,
          headTail: { head, tail }
        });
      }
    }
  }

  return allDraws;
}

const xsmnList = parseXSMNPage(html);
console.log(`XSMN: trích xuất được ${xsmnList.length} lượt quay đài.`);
if (xsmnList.length > 0) {
  console.log('Đài đầu tiên:', xsmnList[0].stationName, 'Ngày:', xsmnList[0].date, 'Lô pairs:', xsmnList[0].lottoPairs);
  console.log('Đặc biệt:', xsmnList[0].prizes.special);
}
