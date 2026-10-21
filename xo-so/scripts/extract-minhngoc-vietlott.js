import fs from 'fs';

const htmlMega = fs.readFileSync('temp_vietlott.html', 'utf-8');
const htmlPower = fs.readFileSync('temp_power.html', 'utf-8');

function extractVietlott(html, gameType) {
  const blocks = html.split('class="box-result-detail"');
  const results = [];

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    
    // Lấy kỳ vé
    const drawIdMatch = block.match(/Kỳ vé:[^#]*?(#\d+)/i) || 
                        block.match(/id="DT6X[45]5_KY_VE">([^<]+)<\/span>/i) ||
                        block.match(/(#\d{5})/);
    const drawId = drawIdMatch ? (drawIdMatch[1].startsWith('#') ? drawIdMatch[1] : '#' + drawIdMatch[1]) : null;

    // Lấy ngày quay
    const dateMatch = block.match(/quay thưởng\s*(\d{2}\/\d{2}\/\d{4})/i) || block.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) continue; // Bỏ qua khối không trích xuất được ngày thay vì gán ngày giả
    const dateRaw = dateMatch[1];
    const parts = dateMatch[1].split('/');
    const dateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;

    // Lấy các quả bóng: div class="finnish... bool">06</div>
    const ballMatches = [...block.matchAll(/class="[^"]*bool">(\d+)<\/div>/g)].map(m => parseInt(m[1], 10));

    // Lấy giá trị Jackpot 1
    const jackpotMatch = block.match(/id="DT6X[45]5_G_JACKPOT">([^<]+)/i) || 
                         block.match(/class="giai_thuong_gia_tri"[^>]*><b>([^<]+)/i);
    let jackpotEst = jackpotMatch ? jackpotMatch[1].trim() + ' đ' : null;

    if (ballMatches.length >= 6) {
      const winningNumbers = ballMatches.slice(0, 6).sort((a, b) => a - b);
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

  return results;
}

const megaList = extractVietlott(htmlMega, 'mega-6-45');
const powerList = extractVietlott(htmlPower, 'power-6-55');

console.log(`Mega 6/45: trích xuất được ${megaList.length} kỳ quay thực tế.`);
console.log('Kỳ mới nhất Mega:', megaList[0]);

console.log(`\nPower 6/55: trích xuất được ${powerList.length} kỳ quay thực tế.`);
console.log('Kỳ mới nhất Power:', powerList[0]);
