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

  function parseVietlott(html, gameType) {
    const blocks = html.split('class="box-result-detail"');
    const results = [];

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      
      const drawIdMatch = block.match(/Kỳ vé:[^#]*?(#\d+)/i) || 
                          block.match(/id="DT6X[45]5_KY_VE">([^<]+)<\/span>/i) ||
                          block.match(/(#\d{5})/);
      const drawId = drawIdMatch ? (drawIdMatch[1].startsWith('#') ? drawIdMatch[1] : '#' + drawIdMatch[1]) : null;

      const dateMatch = block.match(/quay thưởng\s*(\d{2}\/\d{2}\/\d{4})/i) || block.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (!dateMatch) continue;
      const dateRaw = dateMatch[1];
      const parts = dateMatch[1].split('/');
      const dateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;

      const ballMatches = [...block.matchAll(/class="[^"]*bool">(\d+)<\/div>/g)].map(m => parseInt(m[1], 10));

      const isMega = gameType === 'mega-6-45';
      const jackpotMatch = isMega 
        ? (block.match(/id="DT6X45_G_JACKPOT">([^<]+)/i) || block.match(/class="giai_thuong_gia_tri"[^>]*><b>([^<]+)/i))
        : (block.match(/id="DT6X55_G_JACKPOT">([^<]+)/i) || block.match(/class="giai_thuong_gia_tri"[^>]*><b>([^<]+)/i));
      let jackpotEst = jackpotMatch ? jackpotMatch[1].trim() + ' đ' : null;

      if (ballMatches.length >= 6) {
        const winningNumbers = ballMatches.slice(0, 6).sort((a, b) => a - b);
        
        // Kiểm tra an toàn: Mega 6/45 không được có bóng số > 45 và không thể là kỳ quay của Power (#014xx)
        if (isMega && (winningNumbers.some(n => n > 45) || drawId.startsWith('#014'))) {
          continue;
        }

        const bonusNumber = (gameType === 'power-6-55' && ballMatches.length > 6) ? ballMatches[6] : null;

        results.push({
          date: dateFormatted,
          drawDateRaw: dateRaw,
          gameType,
          drawId,
          winningNumbers,
          bonusNumber,
          jackpotEst
        });
      }
    }

    const unique = [];
    const seen = new Set();
    results.forEach(r => {
      const key = `${r.date}_${r.drawId}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(r);
      }
    });

    return unique.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  try {
    // 1. Tải trang chuyên biệt Mega 6/45
    const resMega = await fetch('https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/mega-6x45.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const textMega = await resMega.text();
    const megaResults = parseVietlott(textMega, 'mega-6-45');

    // 2. Tải trang chuyên biệt Power 6/55
    const resPower = await fetch('https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/power-6x55.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const textPower = await resPower.text();
    const powerResults = parseVietlott(textPower, 'power-6-55');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        source: 'minhngoc.net.vn',
        scrapedAt: new Date().toISOString(),
        data: {
          mega: megaResults,
          power: powerResults
        }
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
