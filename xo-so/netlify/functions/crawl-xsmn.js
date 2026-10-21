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

const stationUrlSlugMap = {
  'tphcm': 'tp-hcm',
  'dong-nai': 'dong-nai',
  'can-tho': 'can-tho',
  'soc-trang': 'soc-trang',
  'tay-ninh': 'tay-ninh',
  'an-giang': 'an-giang',
  'binh-thuan': 'binh-thuan',
  'vinh-long': 'vinh-long',
  'binh-duong': 'binh-duong',
  'tra-vinh': 'tra-vinh',
  'long-an': 'long-an',
  'binh-phuoc': 'binh-phuoc',
  'hau-giang': 'hau-giang',
  'tien-giang': 'tien-giang',
  'kien-giang': 'kien-giang',
  'da-lat': 'da-lat',
  'dong-thap': 'dong-thap',
  'ca-mau': 'ca-mau',
  'ben-tre': 'ben-tre',
  'vung-tau': 'vung-tau',
  'bac-lieu': 'bac-lieu'
};

function parseUniversalXSMN(htmlContent, fallbackStation = 'tphcm') {
  if (!htmlContent || typeof htmlContent !== 'string') return [];
  const allDraws = [];

  // Cách 1: Bảng tổng hợp nhiều đài (bkqmiennam)
  if (htmlContent.includes('class="bkqmiennam"')) {
    const tableBlocks = htmlContent.split('class="bkqmiennam"');
    for (let b = 1; b < tableBlocks.length; b++) {
      const tb = tableBlocks[b];
      const dateMatch = tb.match(/class="ngay"[^>]*>[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
      let dateStr = '', dateRaw = '';
      if (dateMatch) {
        dateRaw = dateMatch[1];
        const p = dateRaw.split('/');
        dateStr = `${p[2]}-${p[1]}-${p[0]}`;
      }
      if (!dateStr) continue;

      const stationBlocks = tb.split('class="rightcl"');
      for (let s = 1; s < stationBlocks.length; s++) {
        const stBlock = stationBlocks[s];
        const tinhMatch = stBlock.match(/class="tinh"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
        const stationName = tinhMatch ? tinhMatch[1].trim() : 'Đài XSMN';
        const stationId = stationCodeMap[stationName] || stationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const matinhMatch = stBlock.match(/class="matinh"[^>]*>\s*([^<\r\n]+)/i);
        const drawId = matinhMatch ? matinhMatch[1].trim() : `K${dateStr.replace(/-/g, '').slice(2)}`;

        const extractNums = (cls) => {
          const match = stBlock.match(new RegExp(`class="${cls}"[^>]*>([\\s\\S]*?)<\\/td>`, 'i'));
          if (!match) return [];
          const divMatches = [...match[1].matchAll(/<div>([^<]+)<\/div>/g)].map(m => m[1].trim());
          return divMatches.length > 0 ? divMatches : [match[1].replace(/<[^>]+>/g, '').trim()].filter(Boolean);
        };

        const special = extractNums('giaidb');
        if (special.length === 0) continue;

        const prizes = {
          special,
          first: extractNums('giai1'),
          second: extractNums('giai2'),
          third: extractNums('giai3'),
          fourth: extractNums('giai4'),
          fifth: extractNums('giai5'),
          sixth: extractNums('giai6'),
          seventh: extractNums('giai7'),
          eighth: extractNums('giai8')
        };

        const lottoPairs = [];
        Object.values(prizes).forEach(arr => {
          arr.forEach(val => { if (val.length >= 2) lottoPairs.push(val.slice(-2)); });
        });

        const head = {}, tail = {};
        for (let d = 0; d <= 9; d++) { head[d] = []; tail[d] = []; }
        lottoPairs.forEach(num => { head[num[0]].push(num[1]); tail[num[1]].push(num[0]); });
        for (let d = 0; d <= 9; d++) { head[d].sort(); tail[d].sort(); }

        allDraws.push({
          date: dateStr,
          drawDateRaw: dateRaw,
          stationId,
          stationName,
          drawId,
          specialPrize: special[0],
          prizes,
          lottoPairs,
          headTail: { head, tail }
        });
      }
    }
  }

  // Cách 2: Bảng chi tiết từng đài qua các năm (box_kqxs)
  if (allDraws.length === 0 && htmlContent.includes('box_kqxs')) {
    const boxes = htmlContent.split('class="box_kqxs"');
    for (let i = 1; i < boxes.length; i++) {
      const box = boxes[i];
      const dateMatch = box.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
      if (!dateMatch) continue;
      const dateRaw = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
      const dateStr = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;

      const tinhMatch = box.match(/class="tinh"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) ||
                        box.match(/<a[^>]*class="title"[^>]*>([^<]+)<\/a>/i);
      const stationName = tinhMatch ? tinhMatch[1].trim() : (fallbackStation === 'tphcm' ? 'TP. HCM' : fallbackStation);
      const stationId = stationCodeMap[stationName] || fallbackStation;

      const matinhMatch = box.match(/class="matinh"[^>]*>\s*([^<\r\n]+)/i);
      const drawId = matinhMatch ? matinhMatch[1].trim() : `K${dateStr.replace(/-/g, '').slice(2)}`;

      const extractNums = (cls) => {
        const match = box.match(new RegExp(`class="${cls}"[^>]*>([\\s\\S]*?)<\\/td>`, 'i'));
        if (!match) return [];
        const divMatches = [...match[1].matchAll(/<div>([^<]+)<\/div>/g)].map(m => m[1].trim());
        return divMatches.length > 0 ? divMatches : [match[1].replace(/<[^>]+>/g, '').trim()].filter(Boolean);
      };

      const special = extractNums('giaidb');
      if (special.length === 0) continue;

      const prizes = {
        special,
        first: extractNums('giai1'),
        second: extractNums('giai2'),
        third: extractNums('giai3'),
        fourth: extractNums('giai4'),
        fifth: extractNums('giai5'),
        sixth: extractNums('giai6'),
        seventh: extractNums('giai7'),
        eighth: extractNums('giai8')
      };

      const lottoPairs = [];
      Object.values(prizes).forEach(arr => {
        arr.forEach(val => { if (val.length >= 2) lottoPairs.push(val.slice(-2)); });
      });

      const head = {}, tail = {};
      for (let d = 0; d <= 9; d++) { head[d] = []; tail[d] = []; }
      lottoPairs.forEach(num => { head[num[0]].push(num[1]); tail[num[1]].push(num[0]); });
      for (let d = 0; d <= 9; d++) { head[d].sort(); tail[d].sort(); }

      allDraws.push({
        date: dateStr,
        drawDateRaw: dateRaw,
        stationId,
        stationName,
        drawId,
        specialPrize: special[0],
        prizes,
        lottoPairs,
        headTail: { head, tail }
      });
    }
  }

  return allDraws;
}

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  let targetUrl = 'https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam.html';
  let fallbackStation = params.station || 'tphcm';

  if (params.date && params.station) {
    const slug = stationUrlSlugMap[params.station] || params.station;
    let dFormatted = params.date;
    if (dFormatted.includes('-') && dFormatted.split('-')[0].length === 4) {
      const [y, m, d] = dFormatted.split('-');
      dFormatted = `${d}-${m}-${y}`;
    }
    targetUrl = `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${slug}/${dFormatted}.html`;
  } else if (params.date) {
    let dFormatted = params.date;
    if (dFormatted.includes('-') && dFormatted.split('-')[0].length === 4) {
      const [y, m, d] = dFormatted.split('-');
      dFormatted = `${d}-${m}-${y}`;
    }
    targetUrl = `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${dFormatted}.html`;
  } else if (params.station) {
    const slug = stationUrlSlugMap[params.station] || params.station;
    targetUrl = `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${slug}.html`;
  }

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const text = await res.text();
    const draws = parseUniversalXSMN(text, fallbackStation);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        source: targetUrl,
        scrapedAt: new Date().toISOString(),
        data: draws
      })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: err.message,
        fallbackRequired: true
      })
    };
  }
};
