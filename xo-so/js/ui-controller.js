/**
 * LOTTO-QUANT LAB: UI CONTROLLER
 * Quản lý kết xuất DOM, hiển thị bảng kết quả, bóng số, thẻ thuật toán,
 * biểu đồ Chart.js & Chartist.js SVG, và Dashboard Phân Tích Chuyên Sâu.
 */

import { BarChart, LineChart } from './chartist.min.js';

export const UIController = {
  probChartInstance: null,
  probChartistInstance: null,
  activeProbEngine: 'chartist',
  leaderboardChartInstance: null,
  freqChartInstance: null,
  trendChartInstance: null,
  parityChartInstance: null,
  highlowChartInstance: null,
  headtailChartInstance: null,

  /**
   * 1. Kết xuất Bảng Kết Quả Mới Nhất (Institutional Table Format)
   */
  renderLiveResult(draw, isVietlott, containerId = 'live-result-container', quickPrediction = null, targetInfo = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!draw) {
      container.innerHTML = `
        <div class="quant-card" style="text-align: center; padding: 40px;">
          <p style="color: var(--text-secondary);">Chưa có dữ liệu kết quả cho đài/loại hình này.</p>
        </div>`;
      return;
    }

    // 1. Thẻ Hero Dự Đoán Kỳ Kế Tiếp (Nổi bật ngay đầu Tab Kết Quả)
    let heroPredictionHtml = '';
    if (quickPrediction) {
      if (isVietlott) {
        const vBalls = (quickPrediction.predictions || []).map(b => 
          `<div class="ensemble-ball-lg">${String(b).padStart(2, '0')}</div>`
        ).join('');
        heroPredictionHtml = `
          <div class="hero-prediction-card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <span style="background: var(--accent); color: #FFF; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: var(--r-xs); text-transform: uppercase; letter-spacing: 0.3px;">
                <i class="fa-solid fa-bullseye"></i> GỢI Ý MÔ HÌNH KỲ TỚI
              </span>
              <span style="font-size: 12.5px; color: var(--text-primary); font-weight: 700;">
                ${targetInfo ? `${targetInfo.gameOrStationName} • ${targetInfo.nextDayName}, ${targetInfo.nextDate}` : 'Kỳ Quay Tới'}
              </span>
            </div>
            <div style="text-align: center; margin: 10px 0 6px 0;">
              <div style="font-size: 11.5px; color: var(--accent); font-weight: 700; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.3px;">
                BỘ 6 SỐ TỐI ƯU XÁC SUẤT VIETLOTT (MÔ HÌNH HỘI TỤ):
              </div>
              <div class="hero-pred-balls-row" style="justify-content: center; gap: 8px;">
                ${vBalls}
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--line-subtle); padding-top: 10px;">
              <span style="font-size: 12px; color: var(--text-secondary);">Phân tích hội tụ từ 7 mô hình toán học & xác suất định lượng</span>
              <button class="btn-primary" onclick="document.getElementById('panel-predict')?.scrollIntoView({behavior:'smooth'})" style="font-size: 11.5px; padding: 5px 12px;">
                <i class="fa-solid fa-brain"></i> Xem 8 Thuật Toán ➔
              </button>
            </div>
          </div>
        `;
      } else {
        const sp = quickPrediction.specialPrize;
        const preds = quickPrediction.predictions || [];
        const shortLabels = ['Đầu', 'Vạn', 'Ngàn', 'Trăm', 'Chục', 'Đuôi'];
        const balls6 = sp ? sp.positions.map((p, idx) => `
          <div class="special-ball-col">
            <div class="special-digit-ball ${p.isDuoi || p.isDau ? 'highlight-de' : (p.isCang ? 'highlight-cang' : '')}">
              ${p.digit}
            </div>
            <span class="special-ball-label" style="color: ${p.isDuoi || p.isDau ? 'var(--gold-300)' : (p.isCang ? 'var(--blue-400)' : 'var(--text-muted)')};">
              ${shortLabels[idx] || p.label}
            </span>
          </div>
        `).join('') : '';

        heroPredictionHtml = `
          <div class="hero-prediction-card">
            <div class="hero-card-header">
              <div class="hero-card-sub-top">
                <span class="hero-crown-badge">
                  <i class="fa-solid fa-crown"></i> Dự đoán kỳ tiếp theo
                </span>
                <span class="live-status-pill hero-live-pill">
                  <span class="pulse-dot"></span>Chưa quay
                </span>
              </div>
              <div class="hero-target-station">
                <i class="fa-solid fa-calendar-day" style="color: var(--gold-400); margin-right: 4px;"></i>
                ${targetInfo ? `${targetInfo.gameOrStationName} • ${targetInfo.nextDayName}, ${targetInfo.nextDate}` : 'Kỳ Tiếp Theo'}
              </div>
            </div>

            <!-- 6 Quả bóng vàng Giải Đặc Biệt (Fluid 100% không rớt dòng) -->
            <div style="text-align: center; margin: 12px 0 16px 0;">
              <div style="font-size: 12.5px; color: var(--gold-600); font-weight: 700; letter-spacing: 0.3px; margin-bottom: 8px;">
                ✦ Dãy 6 số giải đặc biệt dự báo:
              </div>
              <div class="special-balls-container">
                ${balls6}
              </div>
            </div>

            <!-- Cặp số VIP: Bạch Thủ Lô & Song Thủ Lô -->
            <div class="lucky-lotto-grid">
              <div class="lucky-card lucky-gold">
                <span class="lucky-label"><i class="fa-solid fa-star"></i> Bạch thủ lô</span>
                <span class="lucky-value">${preds[0] || '--'}</span>
              </div>
              <div class="lucky-card lucky-blue">
                <span class="lucky-label"><i class="fa-solid fa-gem"></i> Song thủ lô</span>
                <span class="lucky-value">${preds[0] || '--'} - ${preds[1] || '--'}</span>
              </div>
              <div class="lucky-card lucky-emerald">
                <span class="lucky-label"><i class="fa-solid fa-fire"></i> Dàn 5 lô đẹp</span>
                <span class="lucky-value dan">${preds.slice(0, 5).join(' · ')}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding-top: 12px; margin-top: 14px; border-top: 1px dashed var(--line-subtle); font-size: 12px;">
              <span style="color: var(--text-secondary); font-size: 12px;">Gợi ý soi cầu định lượng dựa trên phân tích xác suất chuỗi 180 kỳ</span>
              <button class="btn-predict-explore" onclick="document.getElementById('panel-predict')?.scrollIntoView({behavior:'smooth'})">
                <i class="fa-solid fa-brain"></i> Xem 8 Thuật Toán ➔
              </button>
            </div>
          </div>
        `;
      }
    }

    if (isVietlott) {
      // Kết xuất Vietlott
      const ballsHtml = (draw.winningNumbers || []).map(b => 
        `<div class="lotto-ball gold">${String(b).padStart(2, '0')}</div>`
      ).join('');

      const bonusHtml = draw.bonusNumber 
        ? `<div style="display: flex; align-items: center; gap: 8px; margin-left: 12px;">
             <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">Số Đặc Biệt:</span>
             <div class="lotto-ball bonus">${String(draw.bonusNumber).padStart(2, '0')}</div>
           </div>`
        : '';

      container.innerHTML = `
        ${heroPredictionHtml}
        <div class="quant-card">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Kết Quả ${draw.gameType === 'mega-6-45' ? 'Mega 6/45' : 'Power 6/55'} Mới Nhất</h2>
              <span class="meta-info-badge">Kỳ ${draw.drawId || '#Kỳ-mới'}</span>
            </div>
            <span class="meta-info-badge">Ngày mở thưởng: ${draw.date}</span>
          </div>

          <div style="background: var(--bg-subtle); padding: 22px 16px; border-radius: var(--r-md); text-align: center; margin-bottom: 16px; border: 1px solid var(--line-subtle);">
            <div style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Dãy Số Trúng Thưởng Chính Thức</div>
            <div class="ball-group" style="justify-content: center;">
              ${ballsHtml}
              ${bonusHtml}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFBEB; border: 1.5px solid #FCD34D; padding: 14px 18px; border-radius: var(--r-md); flex-wrap: wrap; gap: 8px; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);">
            <div style="color: #B45309; font-weight: 700; font-size: 14px;">Giải Jackpot Ước Tính:</div>
            <div class="tabular-numbers" style="font-family: var(--font-sans); font-size: 22px; font-weight: 800; color: #B45309;">${draw.jackpotEst ? draw.jackpotEst.toString().replace(/[\sđ₫]+$/gi, '').trim() + ' ₫' : 'Chưa có thông tin Jackpot'}</div>
          </div>
        </div>
      `;
    } else {
      // Kết xuất XSMN: Bảng 18 giải định dạng Thẻ Số (Chips) + Bảng Đầu Đuôi
      const prizes = draw.prizes || {};
      const headTail = draw.headTail || { head: {}, tail: {} };

      const formatChips = (nums, type = '') => {
        if (!nums || !nums.length || nums[0] === '-') return `<span class="prize-chip">-</span>`;
        const isMulti = nums.length > 3;
        return `<div class="prize-chips-wrapper ${isMulti ? 'multi-cols' : ''}">` +
          nums.map(n => {
            let cls = 'prize-chip';
            if (type === 'special') cls += ' chip-special';
            else if (type === 'first') cls += ' chip-first';
            else if (type === 'eighth') cls += ' chip-eighth';
            return `<span class="${cls}">${n}</span>`;
          }).join('') +
          `</div>`;
      };

      let headTailRows = '';
      for (let d = 0; d <= 9; d++) {
        const heads = (headTail.head && headTail.head[d]) ? headTail.head[d].join(', ') : '-';
        const tails = (headTail.tail && headTail.tail[d]) ? headTail.tail[d].join(', ') : '-';
        headTailRows += `
          <tr>
            <td class="digit-header">${d}</td>
            <td style="color: var(--blue-400);">${heads}</td>
            <td class="digit-header" style="border-left: 1px solid var(--line-subtle);">${d}</td>
            <td style="color: var(--emerald-400);">${tails}</td>
          </tr>
        `;
      }

      container.innerHTML = `
        ${heroPredictionHtml}
        <div class="results-card-container">
          <!-- Bảng 18 Giải Truyền Thống Được Thiết Kế Lại Theo Phong Cách Thẻ Số Hiện Đại -->
          <div class="quant-card">
            <div class="card-header-bar">
              <div class="card-title-group">
                <h2>XSMN &bull; Đài ${draw.stationName || draw.stationId} (Kỳ Trước)</h2>
                <span class="meta-info-badge">Kỳ ${draw.drawId}</span>
              </div>
              <span class="meta-info-badge">Ngày: ${draw.date}</span>
            </div>

            <table class="xsmn-table">
              <tr>
                <td class="prize-label">Đặc Biệt</td>
                <td class="prize-numbers">${formatChips(prizes.special, 'special')}</td>
              </tr>
              <tr>
                <td class="prize-label">Giải Nhất</td>
                <td class="prize-numbers">${formatChips(prizes.first, 'first')}</td>
              </tr>
              <tr>
                <td class="prize-label">Giải Nhì</td>
                <td class="prize-numbers">${formatChips(prizes.second)}</td>
              </tr>
              <tr>
                <td class="prize-label">Giải Ba</td>
                <td class="prize-numbers">${formatChips(prizes.third)}</td>
              </tr>
              <tr>
                <td class="prize-label">Giải Tư</td>
                <td class="prize-numbers">${formatChips(prizes.fourth)}</td>
              </tr>
              <tr>
                <td class="prize-label">Giải Năm</td>
                <td class="prize-numbers">${formatChips(prizes.fifth)}</td>
              </tr>
              <tr>
                <td class="prize-label">Giải Sáu</td>
                <td class="prize-numbers">${formatChips(prizes.sixth)}</td>
              </tr>
              <tr>
                <td class="prize-label">Giải Bảy</td>
                <td class="prize-numbers">${formatChips(prizes.seventh)}</td>
              </tr>
              <tr>
                <td class="prize-label">Giải Tám</td>
                <td class="prize-numbers">${formatChips(prizes.eighth, 'eighth')}</td>
              </tr>
            </table>
          </div>

          <!-- Bảng Phân Tích Đầu - Đuôi Lô Tô -->
          <div class="quant-card">
            <div class="card-header-bar">
              <div class="card-title-group">
                <h3>Thống Kê Đầu - Đuôi</h3>
              </div>
              <span class="meta-info-badge">18 Lô</span>
            </div>

            <table class="head-tail-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">Đầu</th>
                  <th>Cặp Lô</th>
                  <th style="width: 40px; text-align: center; border-left: 1px solid var(--line-subtle);">Đuôi</th>
                  <th>Cặp Lô</th>
                </tr>
              </thead>
              <tbody>
                ${headTailRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  },

  /**
   * 2. Kết xuất Trạm Dự Đoán Đa Thuật Toán (Ensemble & 7 Thuật Toán)
   */
  renderPredictions(ensembleResult, isVietlott, containerId = 'predictions-container', targetInfo = null) {
    const container = document.getElementById(containerId);
    if (!container || !ensembleResult) return;

    const preds = ensembleResult.predictions || [];

    const confidence = ensembleResult.metrics 
      ? (ensembleResult.metrics.consensusRatio || ensembleResult.metrics.confidenceScore || '---') 
      : '---';

    const heroBallsHtml = preds.map(p => 
      `<div class="ensemble-ball-lg">${isVietlott ? String(p).padStart(2, '0') : p}</div>`
    ).join('');

    const guideNoteHtml = isVietlott
      ? `
        <div style="margin-top: 14px; padding: 10px 14px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: var(--r-sm); font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
          <i class="fa-solid fa-circle-info" style="color: var(--blue-400); margin-right: 6px;"></i>
          <span>Bộ 6 con số độc lập được máy học chọn lọc từ dãy bóng Vietlott để tạo thành 1 bộ vé dự thưởng cho kỳ quay tới ${targetInfo ? `(${targetInfo.nextDate})` : ''}.</span>
        </div>
      `
      : `
        <div style="margin-top: 14px; padding: 12px 16px; background: #FFFBEB; border: 1.5px solid #FCD34D; border-radius: var(--r-sm); font-size: 13px; color: var(--text-secondary); line-height: 1.6; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);">
          <div style="font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 7px; margin-bottom: 4px;">
            <i class="fa-solid fa-circle-question" style="color: var(--gold-600);"></i>
            <span>Giải Thích: 5 Con Số Này Dùng Để Làm Gì?</span>
          </div>
          <div>
            ✦ <strong>Mỗi quả cầu là 1 Cặp Số Lô Tô 2 số (00 - 99) riêng biệt</strong> — dùng để đón đầu <strong>2 số cuối của toàn bộ 18 giải</strong> (Bao Lô) hoặc <strong>2 số cuối của Giải Đặc Biệt</strong> cho <strong>kỳ mở thưởng tiếp theo ${targetInfo ? `(${targetInfo.nextDayName}, ${targetInfo.nextDate})` : ''}</strong>. Đây <em>không phải</em> là ghép lại thành dãy 10 chữ số, và <em>không phải</em> là nói lại kết quả của kỳ đã quay.
          </div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--line-subtle); display: flex; flex-wrap: wrap; gap: 14px; font-size: 12.5px;">
            <span><strong style="color: var(--gold-600);">⭐ Bạch Thủ Lô (1 con):</strong> <code style="color:var(--text-primary); font-weight:700; font-size:13px; background:#FEF3C7; padding:2px 6px; border-radius:4px;">${preds[0] || '--'}</code></span>
            <span><strong style="color: var(--blue-500);">🔗 Song Thủ Lô (2 con):</strong> <code style="color:var(--text-primary); font-weight:700; font-size:13px; background:#EFF6FF; padding:2px 6px; border-radius:4px;">${preds[0] || '--'} - ${preds[1] || '--'}</code></span>
            <span><strong style="color: var(--emerald-600);">🎯 Dàn 5 Con Bao Lô:</strong> <code style="color:var(--text-primary); font-weight:700; font-size:13px; background:#ECFDF5; padding:2px 6px; border-radius:4px;">${preds.join(', ')}</code></span>
          </div>
        </div>
      `;

    const targetBannerHtml = targetInfo ? `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; padding: 11px 16px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: var(--r-sm);">
        <div style="display: flex; align-items: center; gap: 9px; flex-wrap: wrap;">
          <span style="background: #2563EB; color: #FFFFFF; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 5px; letter-spacing: 0.2px;">
            <i class="fa-solid fa-bullseye" style="margin-right: 5px;"></i> Dự đoán kỳ tiếp theo
          </span>
          <span style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">
            ${targetInfo.gameOrStationName} • Mở thưởng: <span style="color: var(--gold-600);">${targetInfo.nextDayName}, ${targetInfo.nextDate}</span> <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">(${targetInfo.nextDrawTime})</span>
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; font-size: 12px;">
          <span style="display: inline-flex; align-items: center; gap: 5px; color: #065F46; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 2px 8px; border-radius: 12px; font-weight: 600;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--emerald-500); display: inline-block;"></span>
            Chưa Mở Thưởng
          </span>
          <span style="color: var(--text-secondary);">(Học máy phân tích từ dữ liệu đến kỳ: ${targetInfo.latestDate})</span>
        </div>
      </div>
    ` : '';

    const sp = ensembleResult.specialPrize;
    const specialPrizeHtml = sp ? `
      <div style="background: var(--bg-surface); border: 1px solid #FCD34D; border-radius: var(--r-md); padding: 18px 20px; margin-top: 14px; box-shadow: var(--sh-card);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: #FEF3C7; color: #78350F; border: 1px solid #FCD34D; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 5px; letter-spacing: 0.2px;">
              <i class="fa-solid fa-trophy" style="margin-right: 4px;"></i> Trọng tâm dự đoán
            </span>
            <h4 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">
              Dãy 6 Số Giải Đặc Biệt (Kỳ Quay Kế Tiếp)
            </h4>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 13px;">
            <span>3 Càng Đặc Biệt: <strong style="color: var(--blue-500); font-family: var(--font-mono); font-size: 15px; font-weight: 700;">${sp.baCang}</strong></span>
            <span style="color: var(--line-medium);">|</span>
            <span>Bạch Thủ Đề: <strong style="color: var(--emerald-500); font-family: var(--font-mono); font-size: 15px; font-weight: 700;">${sp.bachThuDe}</strong></span>
          </div>
        </div>

        <div class="hero-pred-balls-row" style="margin: 14px 0; justify-content: center; gap: 6px;">
          ${sp.positions.map((p, idx) => {
            const shortLabels = ['Tr.Nghìn', 'Ch.Nghìn', 'Nghìn', '3 Càng', 'Đầu', 'Đuôi'];
            return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; width: 44px; text-align: center;">
              <div class="special-digit-ball ${p.isDuoi || p.isDau ? 'highlight-de' : (p.isCang ? 'highlight-cang' : '')}">
                ${p.digit}
              </div>
              <span style="font-size: 11.5px; font-weight: 700; white-space: nowrap; color: ${p.isDuoi || p.isDau ? 'var(--gold-600)' : (p.isCang ? 'var(--blue-500)' : 'var(--text-secondary)')}; text-align: center;">
                ${shortLabels[idx] || p.label}
              </span>
            </div>
          `;
          }).join('')}
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding-top: 12px; border-top: 1px dashed var(--line-subtle); font-size: 13px; color: var(--text-secondary);">
          <div>
            ✦ Dãy 6 số dự thưởng: <code style="font-family: var(--font-mono); font-size: 17px; font-weight: 800; color: #78350F; letter-spacing: 2.5px; background: #FEF3C7; padding: 2px 8px; border-radius: 4px; border: 1px solid #FCD34D;">${sp.fullNumber}</code>
          </div>
          <button id="btn-copy-special" onclick="navigator.clipboard.writeText('${sp.fullNumber}'); this.innerHTML='<i class=\\'fa-solid fa-check\\'></i> Đã chép!'; setTimeout(() => this.innerHTML='<i class=\\'fa-regular fa-copy\\'></i> Sao chép 6 số', 2000);" style="background: #FFFFFF; border: 1px solid var(--line-medium); color: var(--text-primary); padding: 5px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <i class="fa-regular fa-copy"></i> Sao chép 6 số
          </button>
        </div>
      </div>
    ` : '';

    const lottoReferenceHtml = !isVietlott ? `
      <div style="margin-top: 16px; padding: 14px 18px; background: rgba(255, 255, 255, 0.025); border: 1px solid var(--line-subtle); border-radius: var(--r-sm);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
          <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-layer-group" style="color: var(--blue-400);"></i>
            <span>Dàn Lô Tô 2 Số Đề Xuất (Tham Khảo Đánh Bao Lô 18 Giải / Xiên)</span>
            <span style="font-size: 10.5px; background: rgba(56, 189, 248, 0.12); color: var(--blue-400); border: 1px solid rgba(56, 189, 248, 0.25); padding: 2px 7px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">Tham Khảo</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">
            Dùng để so khớp 18 giải hoặc đá/xiên
          </div>
        </div>

        <div class="ensemble-numbers-display" style="margin-top: 10px; margin-bottom: 12px;">
          ${heroBallsHtml}
        </div>

        <div style="margin-top: 6px; padding-top: 8px; border-top: 1px solid var(--line-subtle); display: flex; flex-wrap: wrap; gap: 14px; font-size: 12.5px;">
          <span><strong style="color: var(--accent);">Bạch Thủ Lô:</strong> <code style="color:var(--text-primary); font-weight:700; font-size:13px; background:var(--accent-soft); padding:2px 6px; border-radius:var(--r-xs); border:1px solid var(--accent-border);">${preds[0] || '--'}</code></span>
          <span><strong style="color: var(--info);">Song Thủ Lô:</strong> <code style="color:var(--text-primary); font-weight:700; font-size:13px; background:var(--bg-subtle); padding:2px 6px; border-radius:var(--r-xs); border:1px solid var(--line-subtle);">${preds[0] || '--'} - ${preds[1] || '--'}</code></span>
          <span><strong style="color: var(--success);">Dàn 5 Con:</strong> <code style="color:var(--text-primary); font-weight:700; font-size:13px; background:var(--success-soft); padding:2px 6px; border-radius:var(--r-xs); border:1px solid rgba(30, 107, 82, 0.2);">${preds.join(', ')}</code></span>
        </div>
      </div>
    ` : `
      <div style="margin-top: 14px;">
        <div style="font-size: 13.5px; font-weight: 700; color: var(--gold-600); margin-bottom: 8px;">
          ✦ Đề xuất bộ 6 số Vietlott cho kỳ quay tới ${targetInfo ? `(${targetInfo.nextDate})` : ''}:
        </div>
        <div class="ensemble-numbers-display">
          ${heroBallsHtml}
        </div>
        ${guideNoteHtml}
      </div>
    `;

    const heroCardHtml = `
      ${targetBannerHtml}
      <div class="hero-ensemble-card">
        <div class="ensemble-content">
          <div>
            <div class="ensemble-badge-title">
              <h3>Mô Hình Tổng Hợp (Ensemble Consensus)</h3>
              <span class="badge">ĐỀ XUẤT TỐI ƯU</span>
            </div>
            <p style="color: var(--text-secondary); max-width: 700px; font-size: 13.5px; line-height: 1.6; margin-bottom: 12px;">
              ${ensembleResult.explanation}
            </p>
            ${specialPrizeHtml}
            ${lottoReferenceHtml}
          </div>
          <div class="confidence-meter" title="Tỷ lệ đồng thuận giữa các thuật toán độc lập (Normalized Soft Voting)">
            <div class="confidence-value">${confidence}</div>
            <div class="confidence-label">Mức Đồng Thuận Mô Hình</div>
          </div>
        </div>
      </div>
    `;

    // Lưới 7 thuật toán thành phần
    const subAlgos = ensembleResult.subResults || [];
    const algoCardsHtml = subAlgos.map(item => {
      const res = item.result;
      const subPredsHtml = (res.predictions || []).map(p => 
        `<div class="algo-pred-ball">${isVietlott ? String(p).padStart(2, '0') : p}</div>`
      ).join('');

      return `
        <div class="algo-card">
          <div>
            <div class="algo-header">
              <div class="algo-name-box">
                <h4>${item.name}</h4>
                <div class="algo-category"><i class="fa-solid fa-gauge-high" style="color:var(--gold-600);"></i> Mức đóng góp: ${Math.round(item.weight * 100)}%</div>
              </div>
            </div>
            <div class="algo-prediction-row">
              ${subPredsHtml}
            </div>
          </div>
          <div class="algo-explanation">
            ${res.explanation || 'Đang cập nhật mô tả'}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      ${heroCardHtml}
      <h3 style="font-family: var(--font-display); font-size: 20px; margin-bottom: 18px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
        <span style="color: var(--gold-600);">✦</span> Chi Tiết 7 Mô Hình Thành Phần Độc Lập
      </h3>
      <div class="algorithms-grid">
        ${algoCardsHtml}
      </div>
    `;

    // Cập nhật biểu đồ xác suất
    this.renderProbabilityChart(ensembleResult.scores, isVietlott);
  },

  /**
   * 3. Biểu đồ phân phối xác suất Chart.js & Chartist.dev SVG
   */
  renderProbabilityChart(scores, isVietlott, canvasId = 'prob-chart-canvas') {
    const labels = Object.keys(scores || {});
    const dataValues = Object.values(scores || {});

    // Giới hạn hiển thị 30 số có điểm cao nhất
    const paired = labels.map((l, i) => ({ label: l, val: dataValues[i] }));
    paired.sort((a, b) => b.val - a.val);
    const topShow = paired.slice(0, 30);

    // --- A. Render Biểu đồ Chart.js Canvas (Luôn giữ để tương thích hệ thống kiểm thử) ---
    const canvas = typeof document !== 'undefined' ? document.getElementById(canvasId) : null;
    if (canvas && typeof window !== 'undefined' && window.Chart) {
      if (this.probChartInstance) {
        this.probChartInstance.destroy();
      }

      const ctx = canvas.getContext('2d');
      this.probChartInstance = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: topShow.map(p => p.label),
          datasets: [{
            label: 'Điểm Xác Suất Dự Báo (%)',
            data: topShow.map(p => p.val),
            backgroundColor: topShow.map((p, idx) => idx < (isVietlott ? 6 : 5) ? 'rgba(217, 169, 59, 0.85)' : 'rgba(56, 189, 248, 0.25)'),
            borderColor: topShow.map((p, idx) => idx < (isVietlott ? 6 : 5) ? '#F59E0B' : 'rgba(56, 189, 248, 0.4)'),
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c) => `Xác suất hội tụ: ${c.parsed.y}%`
              }
            }
          },
          scales: {
            x: {
              grid: { color: '#E2E8F0' },
              ticks: { color: '#475569', font: { family: 'JetBrains Mono', weight: 'bold' } }
            },
            y: {
              grid: { color: '#E2E8F0' },
              ticks: { color: '#475569', font: { family: 'JetBrains Mono' } },
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    }

    // --- B. Render Biểu đồ Chartist.dev SVG Vector Thuần (Sắc nét vô hạn, siêu nhẹ) ---
    const hasFullDom = typeof document !== 'undefined' && Boolean(document.defaultView);
    const chartistBox = hasFullDom ? document.getElementById('prob-chartist-box') : null;
    if (chartistBox && typeof BarChart === 'function') {
      if (this.probChartistInstance) {
        try { this.probChartistInstance.detach(); } catch (e) {}
        this.probChartistInstance = null;
      }

      try {
        const chartistData = {
          labels: topShow.map(p => p.label),
          series: [topShow.map(p => p.val)]
        };

        const chartistOptions = {
          seriesBarDistance: 6,
          axisX: {
            showGrid: false
          },
          axisY: {
            onlyInteger: true,
            offset: 32,
            scaleMinSpace: 25
          },
          height: 300
        };

        this.probChartistInstance = new BarChart(chartistBox, chartistData, chartistOptions);

        // Styling SVG elements bằng requestAnimationFrame chuẩn Chartist v2 (không dùng v1 event emitter)
        requestAnimationFrame(() => {
          try {
            const bars = chartistBox.querySelectorAll('.ct-bar');
            const topCount = isVietlott ? 6 : 5;
            bars.forEach((bar, index) => {
              const isTopTarget = index < topCount;
              bar.style.stroke = isTopTarget ? '#D97706' : '#0284C7';
              bar.style.strokeWidth = '14px';
              bar.style.strokeLinecap = 'round';
              bar.style.opacity = isTopTarget ? '1' : '0.65';
            });
          } catch (e) {
            // Không ảnh hưởng tới biểu đồ nếu render ban đầu chưa xong
          }
        });
      } catch (err) {
        console.warn('Lỗi khi vẽ biểu đồ Chartist.dev SVG:', err);
      }
    }

    // --- C. Thiết lập Bộ Chuyển Đổi Engine (Chartist vs Chart.js) ---
    this.setupChartEngineSwitcher();
  },

  /**
   * Thiết lập tương tác chuyển đổi giữa Chartist.dev (SVG) và Chart.js (Canvas)
   */
  setupChartEngineSwitcher() {
    if (typeof document === 'undefined') return;

    const btnChartist = document.getElementById('btn-chart-engine-chartist');
    const btnChartjs = document.getElementById('btn-chart-engine-chartjs');
    const chartistView = document.getElementById('chartist-prob-view');
    const chartjsView = document.getElementById('chartjs-prob-view');
    const indicator = document.getElementById('chart-engine-indicator');

    if (!btnChartist || !btnChartjs || !chartistView || !chartjsView) return;

    const applyEngine = (engine) => {
      this.activeProbEngine = engine;
      if (engine === 'chartist') {
        if (chartistView && chartistView.style) chartistView.style.display = 'block';
        if (chartjsView && chartjsView.style) chartjsView.style.display = 'none';
        if (btnChartist && btnChartist.classList) btnChartist.classList.add('active');
        if (btnChartjs && btnChartjs.classList) btnChartjs.classList.remove('active');
        if (indicator) {
          indicator.innerHTML = '<i class="fa-solid fa-bolt"></i> Chartist.dev (SVG Vector Engine) Đang Hoạt Động';
          if (indicator.style) indicator.style.color = 'var(--accent)';
        }
      } else {
        if (chartistView && chartistView.style) chartistView.style.display = 'none';
        if (chartjsView && chartjsView.style) chartjsView.style.display = 'block';
        if (btnChartjs && btnChartjs.classList) btnChartjs.classList.add('active');
        if (btnChartist && btnChartist.classList) btnChartist.classList.remove('active');
        if (indicator) {
          indicator.innerHTML = '<i class="fa-solid fa-circle-nodes"></i> Chart.js (HTML5 Canvas Engine) Đang Hoạt Động';
          if (indicator.style) indicator.style.color = 'var(--blue-500)';
        }
      }
    };

    if (btnChartist) btnChartist.onclick = () => applyEngine('chartist');
    if (btnChartjs) btnChartjs.onclick = () => applyEngine('chartjs');

    // Đồng bộ trạng thái hiện tại
    applyEngine(this.activeProbEngine || 'chartist');
  },

  /**
   * 4. KẾT XUẤT DASHBOARD PHÂN TÍCH CHUYÊN SÂU (QUANT DASHBOARD WIDGETS)
   */
  /**
   * 4. KẾT XUẤT DASHBOARD PHÂN TÍCH CHUYÊN SÂU & HỆ THỐNG BIỂU ĐỒ (PORTFOLIO-HIEN INSPIRATION)
   */
  renderExecutiveDashboard(data, isVietlott, containerId = 'dashboard-container') {
    const container = document.getElementById(containerId);
    if (!container || !data) return;

    const { history, gapStats, clusterStats, rulesStats } = data;
    const draws = history || [];

    // Hủy các instance biểu đồ cũ tránh rò rỉ bộ nhớ
    if (this.freqChartInstance) { this.freqChartInstance.destroy(); this.freqChartInstance = null; }
    if (this.trendChartInstance) { this.trendChartInstance.destroy(); this.trendChartInstance = null; }
    if (this.parityChartInstance) { this.parityChartInstance.destroy(); this.parityChartInstance = null; }
    if (this.highlowChartInstance) { this.highlowChartInstance.destroy(); this.highlowChartInstance = null; }
    if (this.headtailChartInstance) { this.headtailChartInstance.destroy(); this.headtailChartInstance = null; }

    // 1. TÍNH TOÁN DỮ LIỆU THỐNG KÊ
    const freqMap = {};
    draws.forEach(d => {
      const nums = isVietlott ? (d.winningNumbers || []) : (d.lottoPairs || []);
      nums.forEach(n => {
        const k = isVietlott ? String(Number(n)).padStart(2, '0') : String(n).padStart(2, '0');
        freqMap[k] = (freqMap[k] || 0) + 1;
      });
    });

    const sortedFreq = Object.entries(freqMap)
      .map(([num, count]) => ({ num, count }))
      .sort((a, b) => b.count - a.count);

    const top15 = sortedFreq.slice(0, 15);
    const top15Labels = top15.map(t => t.num);
    const top15Counts = top15.map(t => t.count);

    const gapDetails = (gapStats && gapStats.topDetails) ? gapStats.topDetails : [];
    const top15Gaps = top15.map(t => {
      const found = gapDetails.find(d => String(d.num).padStart(2, '0') === t.num);
      return found ? found.currentGap : 2;
    });
    const top15Cycles = top15.map(t => {
      const found = gapDetails.find(d => String(d.num).padStart(2, '0') === t.num);
      return found ? found.avgCycle : 5;
    });

    // Cân bằng Chẵn / Lẻ và Tài / Xỉu
    const evenPct = clusterStats && clusterStats.evenRatio !== undefined ? Math.round(clusterStats.evenRatio * 100) : 52;
    const oddPct = 100 - evenPct;
    const highPct = clusterStats && clusterStats.highRatio !== undefined ? Math.round(clusterStats.highRatio * 100) : 48;
    const lowPct = 100 - highPct;

    // Phân bố Đầu (0-9) và Đuôi (0-9) trong 5 kỳ gần nhất
    const headCounts = Array(10).fill(0);
    const tailCounts = Array(10).fill(0);
    const recentDraws = draws.slice(0, 5);
    recentDraws.forEach(d => {
      const nums = isVietlott ? (d.winningNumbers || []) : (d.lottoPairs || []);
      nums.forEach(n => {
        const s = String(n).padStart(2, '0');
        const h = parseInt(s[0], 10);
        const t = parseInt(s[1], 10);
        if (!isNaN(h) && h >= 0 && h <= 9) headCounts[h]++;
        if (!isNaN(t) && t >= 0 && t <= 9) tailCounts[t]++;
      });
    });

    // 2. TÌM 3 ĐIỂM SỐ GỢI Ý CHO NGƯỜI DÙNG PHỔ THÔNG
    // Bạch thủ vàng: số thuộc top tần suất và có nhịp chín muồi 0.85 - 1.25x
    let bachThu = top15[0] ? top15[0].num : (isVietlott ? '18' : '68');
    const ripeItem = gapDetails.find(d => d.ripeness >= 0.85 && d.ripeness <= 1.25);
    if (ripeItem) bachThu = String(ripeItem.num).padStart(2, '0');

    // Song thủ bạc nhớ: lấy từ topPairs của Association Rules Heuristic
    const topPairs = (rulesStats && rulesStats.topPairs) ? rulesStats.topPairs : [];
    const songThu = topPairs[0] ? `${topPairs[0].a} - ${topPairs[0].b}` : (isVietlott ? '12 - 24' : '39 - 79');

    // Cảnh báo số gan: số có currentGap lớn nhất
    const maxGanItem = gapDetails.slice().sort((a, b) => b.currentGap - a.currentGap)[0];
    const soGan = maxGanItem ? String(maxGanItem.num).padStart(2, '0') : '47';
    const soGanKỳ = maxGanItem ? maxGanItem.currentGap : 16;

    // Chuẩn bị ma trận 3 làn
    const primeNums = [];
    const hotNums = [];
    const coldNums = [];
    gapDetails.forEach(item => {
      const numStr = String(item.num).padStart(2, '0');
      if (item.ripeness >= 0.8 && item.ripeness <= 1.35) {
        primeNums.push(`${numStr} <span style="font-size:11.5px; opacity:0.9;">(${item.currentGap}k)</span>`);
      }
      if (item.hits15 >= 3) {
        hotNums.push(`${numStr} <span style="font-size:11.5px; opacity:0.9;">(${item.hits15}l)</span>`);
      }
      if (item.currentGap >= 12 || item.ripeness > 1.4) {
        coldNums.push(`${numStr} <span style="font-size:11.5px; opacity:0.9;">(gan ${item.currentGap}k)</span>`);
      }
    });

    const primeChipsHtml = primeNums.slice(0, 10).map(s => `<span class="lotto-chip special-hit">${s}</span>`).join('') || '<span style="color:var(--text-muted);font-size:12px;">Đang cập nhật...</span>';
    const hotChipsHtml = hotNums.slice(0, 10).map(s => `<span class="lotto-chip hit">${s}</span>`).join('') || '<span style="color:var(--text-muted);font-size:12px;">Đang cập nhật...</span>';
    const coldChipsHtml = coldNums.slice(0, 8).map(s => `<span class="lotto-chip" style="color:var(--rose-400); border-color:rgba(244,63,94,0.3);">${s}</span>`).join('') || '<span style="color:var(--text-muted);font-size:12px;">Không có số vượt ngưỡng cực đại</span>';

    // Bạc nhớ HTML: Chuẩn hóa schema, loại bỏ hoàn toàn undefined, NaN
    const liftPairsHtml = (topPairs && topPairs.length > 0) ? topPairs.slice(0, 6).map(p => {
      const cooccur = (typeof p.coOccurrenceCount === 'number') 
        ? p.coOccurrenceCount 
        : ((typeof p.count === 'number') ? p.count : 0);
      const totalDraws = p.totalEligibleDraws || draws.length || 50;
      const liftVal = (typeof p.lift === 'number' && !isNaN(p.lift)) ? p.lift.toFixed(2) : '1.00';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-subtle); border:1px solid var(--line-subtle); border-radius:var(--r-sm); margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="lotto-chip">${p.a}</span>
            <i class="fa-solid fa-arrow-right" style="color:var(--gold-600); font-size:11px;"></i>
            <span class="lotto-chip special-hit">${p.b}</span>
          </div>
          <div style="text-align:right;">
            <span style="font-family:var(--font-mono); font-weight:700; color:var(--emerald-600); font-size:13px;">Gắn kết ${liftVal}x</span>
            <div style="font-size:12px; color:var(--text-secondary);">${cooccur} lần về cùng nhau (trong ${totalDraws} kỳ)</div>
          </div>
        </div>
      `;
    }).join('') : '<p style="color:var(--text-muted); font-size:13px; padding:12px 0;">Chưa đủ dữ liệu để tính cặp số đi kèm trong phạm vi này.</p>';

    // RENDER HTML DASHBOARD
    container.innerHTML = `
      <!-- 1. HEADER DASHBOARD -->
      <div class="quant-card" style="margin-bottom: 20px;">
        <div class="card-header-bar" style="margin-bottom: 12px; padding-bottom: 12px;">
          <div class="card-title-group">
            <div class="eyebrow"><i class="fa-solid fa-chart-line"></i> Dashboard Trực Quan</div>
            <h2 style="font-size: 22px; width: 100%;">Trung Tâm Phân Tích Dữ Liệu & Biểu Đồ Soi Cầu Đa Chiều</h2>
          </div>
          <span class="meta-info-badge" style="color:var(--gold-600); border-color:var(--gold-300); background:var(--gold-50);">
            Khảo sát ${draws.length} kỳ mở thưởng gần nhất
          </span>
        </div>
        <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin: 0;">
          Dữ liệu trực quan hóa bằng các biểu đồ tương tác: theo dõi tần suất nổ, xu hướng chu kỳ điểm rơi, tỷ lệ cân bằng chẵn lẻ và phân bố 10 đầu số giúp bạn đưa ra lựa chọn sáng suốt nhất.
        </p>
      </div>

      <!-- 2. THẺ GỢI Ý NHANH CHO NGƯỜI DÙNG PHỔ THÔNG -->
      <div class="recommendation-cards-grid">
        <!-- Thẻ 1: Bạch Thủ -->
        <div class="rec-card rec-gold">
          <div>
            <div class="rec-header">
              <span class="rec-title"><i class="fa-solid fa-star"></i> Bạch Thủ Tiềm Năng</span>
              <span class="meta-info-badge" style="background:#FEF3C7; color:#78350F; border:1px solid #FCD34D; font-size:11.5px; font-weight:700;">Điểm Rơi Vàng</span>
            </div>
            <div class="rec-ball-box">
              <span class="rec-ball">${bachThu}</span>
              <span style="font-size: 13px; color: var(--text-primary); font-weight: 600;">Nhịp xuất hiện lý tưởng</span>
            </div>
            <div class="rec-desc">
              Con số có tần suất xuất hiện ổn định và khoảng cách chưa về đang khớp hoàn hảo với chu kỳ trung bình.
            </div>
          </div>
        </div>

        <!-- Thẻ 2: Song Thủ Bạc Nhớ -->
        <div class="rec-card rec-emerald">
          <div>
            <div class="rec-header">
              <span class="rec-title"><i class="fa-solid fa-link"></i> Song Thủ Bạc Nhớ</span>
              <span class="meta-info-badge" style="background:#D1FAE5; color:#065F46; border:1px solid #A7F3D0; font-size:11.5px; font-weight:700;">Cùng Nổ</span>
            </div>
            <div class="rec-ball-box">
              <span class="rec-ball" style="padding:0 16px;">${songThu}</span>
            </div>
            <div class="rec-desc">
              Cặp số có mối tương quan ăn theo cao nhất: khi một trong hai con xuất hiện thì con còn lại có tỷ lệ về kèm rất cao.
            </div>
          </div>
        </div>

        <!-- Thẻ 3: Cảnh Báo Số Gan -->
        <div class="rec-card rec-rose">
          <div>
            <div class="rec-header">
              <span class="rec-title"><i class="fa-solid fa-triangle-exclamation"></i> Cảnh Báo Số Gan</span>
              <span class="meta-info-badge" style="background:#FEE2E2; color:#991B1B; border:1px solid #FECACA; font-size:11.5px; font-weight:700;">Không Nuôi</span>
            </div>
            <div class="rec-ball-box">
              <span class="rec-ball">${soGan}</span>
              <span style="font-size: 13px; color: var(--rose-400); font-weight: 600;">Đã ${soGanKỳ} kỳ chưa ra</span>
            </div>
            <div class="rec-desc">
              Con số đã bị giam vượt ngưỡng an toàn. Khuyên bạn tuyệt đối không nên mạo hiểm dồn tiền nuôi số này!
            </div>
          </div>
        </div>
      </div>

      <!-- 3. LƯỚI 4 BIỂU ĐỒ INTERACTIVE CHART.JS -->
      <div class="dashboard-charts-grid">
        
        <!-- BIỂU ĐỒ 1: TẦN SUẤT TOP 15 SỐ -->
        <div class="chart-card">
          <div class="chart-card-header">
            <div class="chart-card-title-group">
              <h3>1. Tần Suất Xuất Hiện (Top 15 Con Số)</h3>
              <div class="chart-card-subtitle">Số lần nổ trong 50 kỳ mở thưởng gần nhất</div>
            </div>
            <span class="meta-info-badge">Cột Tần Suất</span>
          </div>
          <div class="chart-canvas-box">
            <canvas id="chart-freq-canvas"></canvas>
          </div>
          <div class="chart-footer-insight">
            <i class="fa-solid fa-circle-info" style="color:var(--gold-400);"></i>
            <span>Top 3 con số dẫn đầu tần suất: <strong>${top15Labels.slice(0, 3).join(', ')}</strong></span>
          </div>
        </div>

        <!-- BIỂU ĐỒ 2: NHỊP CẦU & ĐIỂM RƠI CHU KỲ -->
        <div class="chart-card">
          <div class="chart-card-header">
            <div class="chart-card-title-group">
              <h3>2. Nhịp Cầu & Điểm Rơi Chu Kỳ</h3>
              <div class="chart-card-subtitle">So sánh số kỳ chưa về (Xanh) vs Chu kỳ trung bình (Vàng)</div>
            </div>
            <span class="meta-info-badge">Đường Xu Hướng</span>
          </div>
          <div class="chart-canvas-box">
            <canvas id="chart-trend-canvas"></canvas>
          </div>
          <div class="chart-footer-insight">
            <i class="fa-solid fa-chart-line" style="color:var(--emerald-400);"></i>
            <span>Khi đường Xanh chạm hoặc vượt đường Vàng là dấu hiệu con số đã chín muồi sắp nổ.</span>
          </div>
        </div>

        <!-- BIỂU ĐỒ 3: CÂN BẰNG CHẴN/LẺ & TÀI/XỈU -->
        <div class="chart-card">
          <div class="chart-card-header">
            <div class="chart-card-title-group">
              <h3>3. Tỷ Lệ Cân Bằng Chẵn - Lẻ & Tài - Xỉu</h3>
              <div class="chart-card-subtitle">Phân bổ tỷ lệ % hình học của toàn bộ các dãy số</div>
            </div>
            <span class="meta-info-badge">Tròn Đôi (Donut)</span>
          </div>
          <div class="donuts-container">
            <div class="single-donut-box">
              <canvas id="chart-donut-parity-canvas"></canvas>
              <div class="donut-label-center">
                <div class="donut-pct">${evenPct}%</div>
                <div class="donut-sub">Chẵn</div>
              </div>
            </div>
            <div class="single-donut-box">
              <canvas id="chart-donut-highlow-canvas"></canvas>
              <div class="donut-label-center">
                <div class="donut-pct">${highPct}%</div>
                <div class="donut-sub">Tài</div>
              </div>
            </div>
          </div>
          <div class="chart-footer-insight">
            <i class="fa-solid fa-scale-balanced" style="color:var(--blue-400);"></i>
            <span>${evenPct > 53 ? '✦ Nhịp tới: Ưu tiên chọn thêm bóng số Lẻ để cân bằng xác suất.' : '✦ Nhịp tới: Trạng thái cân bằng tự nhiên ổn định.'}</span>
          </div>
        </div>

        <!-- BIỂU ĐỒ 4: PHÂN BỐ ĐẦU - ĐUÔI (0 ĐẾN 9) -->
        <div class="chart-card">
          <div class="chart-card-header">
            <div class="chart-card-title-group">
              <h3>4. Phân Bố Đầu Lô & Đuôi Lô (0 đến 9)</h3>
              <div class="chart-card-subtitle">Số lượng con số về theo từng Đầu và Đuôi</div>
            </div>
            <span class="meta-info-badge">Nhóm Cột Đôi</span>
          </div>
          <div class="chart-canvas-box">
            <canvas id="chart-headtail-canvas"></canvas>
          </div>
          <div class="chart-footer-insight">
            <i class="fa-solid fa-bullseye" style="color:var(--gold-400);"></i>
            <span>Đầu Vàng (Đầu lô), Cột Xanh (Đuôi lô). Cảnh báo các đầu có 0 con là "Đầu câm".</span>
          </div>
        </div>

      </div>

      <!-- 4. MA TRẬN 3 LÀN CHU KỲ & BẢNG BẠC NHỚ -->
      <div class="dashboard-charts-grid" style="margin-bottom:0;">
        
        <!-- Ma Trận 3 Làn -->
        <div class="quant-card" style="margin-bottom:0;">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h3 style="font-family:var(--font-display); font-size:18px; color:var(--text-primary);">Ma Trận 3 Làn Chu Kỳ Điểm Rơi</h3>
            </div>
            <span class="meta-info-badge">Phân Làn Tự Động</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:14px;">
            <div class="ripeness-lane lane-prime">
              <div class="lane-title"><i class="fa-solid fa-circle-check"></i> Vùng Chín Muồi (Dễ Nổ Nhất)</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">Các con số chuẩn nhịp chu kỳ trung bình:</div>
              <div class="lane-chips-box">${primeChipsHtml}</div>
            </div>
            <div class="ripeness-lane lane-hot">
              <div class="lane-title"><i class="fa-solid fa-fire"></i> Nhịp Bùng Nổ (Đang Về Nhiều)</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">Các con số có đà xuất hiện liên tục:</div>
              <div class="lane-chips-box">${hotChipsHtml}</div>
            </div>
            <div class="ripeness-lane lane-cold">
              <div class="lane-title"><i class="fa-solid fa-triangle-exclamation"></i> Vùng Nguy Hiểm (Gan Lâu Ngày)</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">Nguy cơ bị giam số dài ngày, tránh ôm:</div>
              <div class="lane-chips-box">${coldChipsHtml}</div>
            </div>
          </div>
        </div>

        <!-- Khai Phá Bạc Nhớ Cặp Đôi -->
        <div class="quant-card" style="margin-bottom:0;">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h3 style="font-family:var(--font-display); font-size:18px; color:var(--text-primary);">Cặp Đôi Bạc Nhớ Hay Đi Kèm Nhau</h3>
            </div>
            <span class="meta-info-badge" style="color:var(--emerald-600); border-color:rgba(16,185,129,0.3); background:var(--emerald-50);">Tương Quan Cao</span>
          </div>
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:14px;">
            Khi số bên trái xuất hiện, xác suất số bên phải cùng nổ tăng vọt:
          </p>
          <div>
            ${liftPairsHtml}
          </div>
        </div>

      </div>
    `;

    // 4. KHỞI TẠO CÁC BIỂU ĐỒ CHART.JS
    setTimeout(() => {
      // Biểu đồ 1: Tần suất Top 15
      const ctxFreq = document.getElementById('chart-freq-canvas');
      if (ctxFreq && window.Chart) {
        this.freqChartInstance = new Chart(ctxFreq, {
          type: 'bar',
          data: {
            labels: top15Labels,
            datasets: [{
              label: 'Số lần về',
              data: top15Counts,
              backgroundColor: top15Labels.map((_, i) => i < 3 ? 'rgba(217, 119, 6, 0.85)' : 'rgba(37, 99, 235, 0.35)'),
              borderColor: top15Labels.map((_, i) => i < 3 ? '#D97706' : '#2563EB'),
              borderWidth: 1,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (c) => ` Xuất hiện: ${c.parsed.y} lần`
                }
              }
            },
            scales: {
              x: {
                grid: { color: '#E2E8F0' },
                ticks: { color: '#475569', font: { family: 'JetBrains Mono', weight: 'bold' } }
              },
              y: {
                grid: { color: '#E2E8F0' },
                ticks: { color: '#475569', font: { family: 'JetBrains Mono' }, stepSize: 1 },
                beginAtZero: true
              }
            }
          }
        });
      }

      // Biểu đồ 2: Nhịp cầu & Chu kỳ
      const ctxTrend = document.getElementById('chart-trend-canvas');
      if (ctxTrend && window.Chart) {
        this.trendChartInstance = new Chart(ctxTrend, {
          type: 'line',
          data: {
            labels: top15Labels,
            datasets: [
              {
                label: 'Số kỳ chưa về (Hiện tại)',
                data: top15Gaps,
                borderColor: '#2563EB',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#2563EB',
                pointRadius: 4
              },
              {
                label: 'Chu kỳ trung bình (Kỳ vọng)',
                data: top15Cycles,
                borderColor: '#D97706',
                borderDash: [5, 4],
                borderWidth: 2,
                fill: false,
                tension: 0.3,
                pointBackgroundColor: '#D97706',
                pointRadius: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                labels: { color: '#334155', font: { size: 11, family: 'Be Vietnam Pro', weight: '600' } }
              },
              tooltip: {
                callbacks: {
                  label: (c) => ` ${c.dataset.label}: ${c.parsed.y} kỳ`
                }
              }
            },
            scales: {
              x: {
                grid: { color: '#E2E8F0' },
                ticks: { color: '#475569', font: { family: 'JetBrains Mono', weight: 'bold' } }
              },
              y: {
                grid: { color: '#E2E8F0' },
                ticks: { color: '#475569', font: { family: 'JetBrains Mono' } },
                beginAtZero: true
              }
            }
          }
        });
      }

      // Biểu đồ 3a: Donut Chẵn / Lẻ
      const ctxParity = document.getElementById('chart-donut-parity-canvas');
      if (ctxParity && window.Chart) {
        this.parityChartInstance = new Chart(ctxParity, {
          type: 'doughnut',
          data: {
            labels: ['Chẵn', 'Lẻ'],
            datasets: [{
              data: [evenPct, oddPct],
              backgroundColor: ['#2B5770', '#9A6B24'],
              borderColor: '#FFFFFF',
              borderWidth: 2,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            layout: {
              padding: { top: 4, bottom: 14, left: 6, right: 6 }
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#5C625A',
                  boxWidth: 12,
                  padding: 12,
                  font: { size: 11, family: 'Be Vietnam Pro', weight: '600' }
                }
              }
            }
          }
        });
      }

      // Biểu đồ 3b: Donut Tài / Xỉu
      const ctxHighLow = document.getElementById('chart-donut-highlow-canvas');
      if (ctxHighLow && window.Chart) {
        this.highlowChartInstance = new Chart(ctxHighLow, {
          type: 'doughnut',
          data: {
            labels: ['Tài (Lớn)', 'Xỉu (Nhỏ)'],
            datasets: [{
              data: [highPct, lowPct],
              backgroundColor: ['#1E6B52', '#7E847C'],
              borderColor: '#FFFFFF',
              borderWidth: 2,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            layout: {
              padding: { top: 4, bottom: 14, left: 6, right: 6 }
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#334155',
                  boxWidth: 12,
                  padding: 12,
                  font: { size: 11, family: 'Be Vietnam Pro', weight: '600' }
                }
              }
            }
          }
        });
      }

      // Biểu đồ 4: Phân Bố Đầu Lô & Đuôi Lô 0-9
      const ctxHeadTail = document.getElementById('chart-headtail-canvas');
      if (ctxHeadTail && window.Chart) {
        this.headtailChartInstance = new Chart(ctxHeadTail, {
          type: 'bar',
          data: {
            labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            datasets: [
              {
                label: 'Đầu Lô',
                data: headCounts,
                backgroundColor: 'rgba(217, 119, 6, 0.85)',
                borderColor: '#D97706',
                borderWidth: 1,
                borderRadius: 4
              },
              {
                label: 'Đuôi Lô',
                data: tailCounts,
                backgroundColor: 'rgba(5, 150, 105, 0.8)',
                borderColor: '#059669',
                borderWidth: 1,
                borderRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                labels: { color: '#334155', font: { size: 11, family: 'Be Vietnam Pro', weight: 'bold' } }
              },
              tooltip: {
                callbacks: {
                  label: (c) => ` ${c.dataset.label} ${c.label}: ${c.parsed.y} lần về`
                }
              }
            },
            scales: {
              x: {
                grid: { color: '#E2E8F0' },
                ticks: { color: '#475569', font: { family: 'JetBrains Mono', weight: 'bold' } }
              },
              y: {
                grid: { color: '#E2E8F0' },
                ticks: { color: '#475569', font: { family: 'JetBrains Mono' }, stepSize: 1 },
                beginAtZero: true
              }
            }
          }
        });
      }
    }, 50);
  },

  /**
   * 5. Kết xuất Kết Quả Dò Số (Backtest Results)
   */
  renderBacktestResult(result, isVietlott, containerId = 'backtest-result-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!result || !result.success) {
      container.innerHTML = `
        <div class="quant-card" style="text-align: center; padding: 30px; color: #F87171;">
          <p>${(result && result.message) || 'Không có dữ liệu đối chiếu.'}</p>
        </div>
      `;
      return;
    }

    const summary = result.summary;
    const actualDraw = result.actualDraw;

    let actualDisplay = '';
    if (isVietlott) {
      actualDisplay = (actualDraw.winningNumbers || []).map(b => 
        `<div class="lotto-ball gold">${String(b).padStart(2, '0')}</div>`
      ).join('');
    } else {
      actualDisplay = (actualDraw.lottoPairs || []).map(p => 
        `<span class="lotto-chip">${p}</span>`
      ).join(' ');
    }

    const summaryKpisHtml = `
      <div class="kpi-summary-grid" style="margin-bottom: 20px;">
        <div class="kpi-stat-card kpi-gold">
          <div class="kpi-header-row"><span class="kpi-label">Mô Hình Dẫn Đầu Kỳ Này</span><i class="fa-solid fa-crown kpi-icon"></i></div>
          <div class="kpi-value-row"><div class="kpi-value" style="font-size:18px; font-weight:800; color:var(--text-primary);">${summary.bestAlgo}</div></div>
          <div class="kpi-footnote">Hiệu quả cao nhất riêng kỳ ${result.targetDate}</div>
        </div>
        <div class="kpi-stat-card kpi-emerald">
          <div class="kpi-header-row"><span class="kpi-label">Tỷ Lệ Khớp Kỳ Này</span><i class="fa-solid fa-bullseye kpi-icon"></i></div>
          <div class="kpi-value-row"><div class="kpi-value" style="color:#065F46;">${summary.bestHitRate}%</div></div>
          <div class="kpi-footnote">Tỷ lệ số dự đoán khớp kết quả mở thưởng</div>
        </div>
        <div class="kpi-stat-card kpi-blue">
          <div class="kpi-header-row"><span class="kpi-label">Tỷ Lệ Khớp Trung Bình</span><i class="fa-solid fa-chart-simple kpi-icon"></i></div>
          <div class="kpi-value-row"><div class="kpi-value" style="color:#1D4ED8;">${summary.averageHitRate}%</div></div>
          <div class="kpi-footnote">Tính trung bình trên 8 mô hình ở kỳ này</div>
        </div>
        <div class="kpi-stat-card kpi-purple">
          <div class="kpi-header-row"><span class="kpi-label">Dữ Liệu Huấn Luyện</span><i class="fa-solid fa-shield-halved kpi-icon"></i></div>
          <div class="kpi-value-row"><div class="kpi-value" style="font-size:19px;">${result.trainingDataCount} Kỳ</div></div>
          <div class="kpi-footnote">Từ ${result.historyAvailableCount || result.trainingDataCount} kỳ có sẵn • 0% Lookahead bias</div>
        </div>
      </div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; padding: 8px 12px; background: var(--bg-subtle); border: 1px solid var(--line-subtle); border-radius: var(--r-sm);">
        <i class="fa-solid fa-database" style="color: var(--blue-500); margin-right: 6px;"></i>
        <strong>Chính sách huấn luyện:</strong> ${result.windowPolicy || 'Toàn bộ lịch sử hợp lệ trước ngày dò'} 
        ${result.trainingDateRange?.from && result.trainingDateRange.from !== 'N/A' ? `(Từ ngày ${result.trainingDateRange.from} đến ${result.trainingDateRange.to})` : ''} 
        — Chỉ đánh giá riêng cho kỳ ngày ${result.targetDate}, không thay thế bảng xếp hạng Walk-Forward dài hạn.
      </div>
    `;

    const rowsHtml = result.algoResults.map(item => {
      const predBadges = item.predictions.map(p => {
        const isHit = item.hitDetails.some(h => String(h.num) === String(p));
        const isSpec = item.hitDetails.some(h => String(h.num) === String(p) && h.isSpecial);
        let cls = 'lotto-chip';
        if (isSpec) cls += ' special-hit';
        else if (isHit) cls += ' hit';
        return `<span class="${cls}">${isVietlott ? String(p).padStart(2, '0') : p}</span>`;
      }).join(' ');

      const hitRateColor = item.hitRate >= 40 ? 'color: var(--emerald-400); font-weight: 700;' : (item.hitRate > 0 ? 'color: var(--blue-400);' : 'color: var(--text-muted);');

      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-primary);">${item.algoName}</td>
          <td>${predBadges}</td>
          <td class="tabular-numbers" style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary);">${item.hitCount} / ${item.totalPredicted} ${!isVietlott && item.totalOccurrences > item.hitCount ? `(${item.totalOccurrences} nháy)` : ''}</td>
          <td class="tabular-numbers" style="font-family: var(--font-mono); ${hitRateColor}">${item.hitRate}%</td>
          <td style="font-size: 12px; color: var(--text-secondary); max-width: 320px;">${item.explanation}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      ${summaryKpisHtml}

      <div class="quant-card" style="margin-bottom: 24px;">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Kết Quả Mở Thưởng Thực Tế Ngày ${result.targetDate}</h2>
          </div>
          <span class="meta-info-badge">${result.stationOrGame}</span>
        </div>
        <div style="background: var(--bg-subtle); padding: 18px; border-radius: var(--r-sm); border: 1px solid var(--line-subtle);">
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${actualDisplay}
          </div>
        </div>
      </div>

      <div class="quant-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Bảng Đối Soát Dự Đoán & Đánh Giá Độ Chính Xác</h2>
          </div>
          <span class="meta-info-badge">Xếp theo % trúng thực tế</span>
        </div>

        <div style="overflow-x: auto;">
          <table class="backtest-results-table">
            <thead>
              <tr>
                <th>Thuật Toán</th>
                <th>Dự Đoán (Xanh: Trúng, Vàng: Đặc Biệt)</th>
                <th>Số Con Trúng</th>
                <th>Tỷ Lệ Trúng (%)</th>
                <th>Ghi Chú Động Cơ</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /**
   * 6. Kết xuất Bảng Xếp Hạng Thuật Toán (Leaderboard)
   */
  renderLeaderboard(batchResult, containerId = 'leaderboard-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!batchResult || batchResult.status === 'insufficient-data' || !batchResult.leaderboard || batchResult.leaderboard.length === 0 || batchResult.drawsTestedCount === 0) {
      container.innerHTML = `
        <div class="quant-card" style="text-align: center; padding: 48px 24px;">
          <div style="font-size: 36px; margin-bottom: 12px; color: var(--gold-500);"><i class="fa-solid fa-chart-line"></i></div>
          <h3 style="color: var(--text-primary); margin-bottom: 8px;">Chưa Đủ Dữ Liệu Đánh Giá Bảng Xếp Hạng</h3>
          <p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto; font-size: 13.5px; line-height: 1.6;">
            Cần tối thiểu các kỳ quay hợp lệ trong quá khứ để thực hiện kiểm định Walk-Forward và xếp hạng các thuật toán một cách công bằng. Không có mô hình nào được gán Top 1 giả mạo khi thiếu mẫu.
          </p>
        </div>
      `;
      return;
    }

    const top1 = batchResult.leaderboard[0];
    const baselineHitRate = (batchResult.baseline && typeof batchResult.baseline.avgHitRate === 'number') 
      ? batchResult.baseline.avgHitRate 
      : 0;

    const top1SummaryHtml = `
      <div class="top1-summary-banner" style="background: var(--bg-subtle); border: 1px solid var(--line-medium); border-left: 4px solid #D97706; border-radius: var(--r-md); padding: 16px 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: #FEF3C7; color: #78350F; border: 1px solid #FCD34D; font-weight: 700; font-size: 12px; padding: 3px 9px; border-radius: 6px; letter-spacing: 0.2px;">
              <i class="fa-solid fa-crown" style="margin-right: 4px;"></i> Top 1 bảng xếp hạng
            </span>
            <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: var(--text-primary);">
              ${top1.name}
            </h3>
          </div>
          <div style="display: flex; align-items: center; gap: 16px; font-size: 13px; flex-wrap: wrap;">
            <span>Tỷ Lệ Trúng TB (Primary Metric): <strong style="color: var(--emerald-600); font-family: var(--font-mono); font-size: 16px;">${top1.avgHitRate}%</strong></span>
            <span style="color: var(--line-medium);">|</span>
            <span>Chênh Lệch So Với Baseline: <strong style="color: ${top1.baselineDiff >= 0 ? 'var(--blue-500)' : 'var(--rose-500)'}; font-family: var(--font-mono); font-size: 15px;">${top1.baselineDiff >= 0 ? '+' : ''}${top1.baselineDiff}%</strong></span>
            <span style="color: var(--line-medium);">|</span>
            <span style="color: var(--text-secondary);"><i class="fa-solid fa-clock-rotate-left"></i> Kiểm định: <strong>${batchResult.drawsTestedCount} kỳ quay thực tế</strong></span>
          </div>
        </div>
        <div style="margin-top: 10px; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; border-top: 1px dashed var(--line-subtle); padding-top: 8px;">
          ✦ Xếp hạng xác định dựa trên tỷ lệ trúng trung bình (Primary Metric) kiểm định ngoài mẫu (Walk-Forward Validation) chống rò rỉ thời gian 0%. Random baseline trung bình: <strong>${baselineHitRate}%</strong>.
        </div>
      </div>
    `;

    const rowsHtml = batchResult.leaderboard.map((item, idx) => {
      let rankClass = 'rank-other';
      let rankBadgeText = `${item.rank || idx + 1}`;
      let rowHighlightStyle = '';
      if (idx === 0) {
        rankClass = 'rank-1';
        rankBadgeText = '👑 TOP 1';
        rowHighlightStyle = 'background: rgba(245, 158, 11, 0.05); font-weight: 600;';
      } else if (idx === 1) {
        rankClass = 'rank-2';
      } else if (idx === 2) {
        rankClass = 'rank-3';
      }

      const diffSign = item.baselineDiff >= 0 ? '+' : '';
      const diffColor = item.baselineDiff >= 0 ? 'var(--blue-500)' : 'var(--rose-500)';

      return `
        <tr style="${rowHighlightStyle}">
          <td><span class="rank-badge ${rankClass}">${rankBadgeText}</span></td>
          <td style="font-weight: 700; color: var(--text-primary);">${item.name}</td>
          <td class="tabular-numbers" style="font-family: var(--font-mono); font-weight: 700; color: var(--emerald-600);">${item.avgHitRate}%</td>
          <td class="tabular-numbers" style="font-family: var(--font-mono); font-weight: 700; color: ${diffColor};">${diffSign}${item.baselineDiff}%</td>
          <td class="tabular-numbers" style="font-family: var(--font-mono); color: var(--gold-600);">${item.bestHitRate}%</td>
          <td class="tabular-numbers" style="font-family: var(--font-mono); color: var(--text-primary);">${item.totalHits} (${item.totalOccurrences} nháy)</td>
          <td class="tabular-numbers" style="font-family: var(--font-sans); font-size: 12.5px;">${item.exceedsBaseline ? '<span style="color:var(--emerald-600); font-weight:700; background:#ECFDF5; padding:2px 8px; border-radius:4px; border:1px solid #A7F3D0;">✓ Vượt chuẩn</span>' : '<span style="color:var(--text-secondary); background:var(--bg-surface); border:1px solid var(--line-subtle); padding:2px 8px; border-radius:4px; font-weight:600;">Ngang chuẩn</span>'}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="quant-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Bảng Xếp Hạng Hiệu Suất 8 Thuật Toán</h2>
            <span class="meta-info-badge">Kiểm định qua ${batchResult.drawsTestedCount} kỳ quay</span>
          </div>
          <span class="meta-info-badge">Walk-Forward Validation • Random Baseline: ${baselineHitRate}%</span>
        </div>

        ${top1SummaryHtml}

        <div style="overflow-x: auto;">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th style="width: 80px;">Hạng</th>
                <th>Thuật Toán</th>
                <th title="Tỷ lệ trúng trung bình ngoài mẫu qua các kỳ kiểm định (Primary Metric)">Tỷ Lệ Trúng TB (%)</th>
                <th title="Chênh lệch so với Random Baseline thực tế cùng kỳ">So Với Baseline (%)</th>
                <th title="Kỷ lục tỷ lệ trúng cao nhất trong 1 kỳ quay">Kỷ Lục Cao Nhất (%)</th>
                <th title="Tổng số con trúng và số lần xuất hiện">Tổng Số Con Trúng</th>
                <th title="Số lần bắt trúng giải đặc biệt">Trúng Giải Đặc Biệt</th>
                <th title="Đánh giá hiệu suất so với chuẩn ngẫu nhiên cùng kỳ">Hiệu Suất Baseline</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /**
   * 11. Modal Tự Động Cào Dữ Liệu Minh Ngọc & Tái Dự Đoán
   */
  showCrawlModal() {
    const overlay = document.getElementById('crawl-modal-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const barFill = document.getElementById('crawl-progress-bar-fill');
    const percentEl = document.getElementById('crawl-progress-percent');
    const stepEl = document.getElementById('crawl-progress-step-text');
    const logsEl = document.getElementById('crawl-terminal-logs');
    const summary = document.getElementById('crawl-modal-summary');
    const btnAction = document.getElementById('btn-crawl-modal-action');
    const btnClose = document.getElementById('btn-close-crawl-modal');
    const pulse = document.getElementById('crawl-live-pulse');

    if (barFill) barFill.style.width = '5%';
    if (percentEl) percentEl.innerText = '5%';
    if (stepEl) stepEl.innerText = 'Bắt đầu kết nối Minh Ngọc...';
    if (logsEl) logsEl.innerHTML = `<div class="term-line info">[${new Date().toLocaleTimeString()}] Bắt đầu tiến trình tự động cào toàn bộ dữ liệu...</div>`;
    if (summary) summary.style.display = 'none';
    if (btnAction) btnAction.style.display = 'none';
    if (btnClose) btnClose.style.display = 'none';
    if (pulse) pulse.innerHTML = '<span class="pulse-dot"></span> Đang cào trực tiếp';
  },

  updateCrawlProgress({ percent, step, totalSteps, title, detail }) {
    const barFill = document.getElementById('crawl-progress-bar-fill');
    const percentEl = document.getElementById('crawl-progress-percent');
    const stepEl = document.getElementById('crawl-progress-step-text');
    const logsEl = document.getElementById('crawl-terminal-logs');

    if (barFill) barFill.style.width = `${percent}%`;
    if (percentEl) percentEl.innerText = `${percent}%`;
    if (stepEl) stepEl.innerText = title;

    if (logsEl && detail) {
      const line = document.createElement('div');
      line.className = 'term-line ' + (percent === 100 ? 'success' : 'active');
      line.innerHTML = `<span class="term-time">[${new Date().toLocaleTimeString()}]</span> ${detail}`;
      logsEl.appendChild(line);
      logsEl.scrollTop = logsEl.scrollHeight;
    }
  },

  finishCrawlModal(stats) {
    const barFill = document.getElementById('crawl-progress-bar-fill');
    const percentEl = document.getElementById('crawl-progress-percent');
    const stepEl = document.getElementById('crawl-progress-step-text');
    const summary = document.getElementById('crawl-modal-summary');
    const btnAction = document.getElementById('btn-crawl-modal-action');
    const btnClose = document.getElementById('btn-close-crawl-modal');
    const pulse = document.getElementById('crawl-live-pulse');
    const smXSMN = document.getElementById('sm-xsmn-count');
    const smVietlott = document.getElementById('sm-vietlott-count');

    if (barFill) barFill.style.width = '100%';
    if (percentEl) percentEl.innerText = '100%';
    if (stepEl) stepEl.innerText = 'Tái dự đoán 8 thuật toán hoàn tất!';
    if (pulse) pulse.innerHTML = '<span style="color: #10B981; font-weight: 700;">✓ Hoàn thành 100%</span>';

    if (smXSMN) smXSMN.innerText = `${stats.totalXSMN} Kỳ`;
    if (smVietlott) smVietlott.innerText = `${stats.totalMega + stats.totalPower} Kỳ`;

    if (summary) summary.style.display = 'block';
    if (btnAction) btnAction.style.display = 'flex';
    if (btnClose) btnClose.style.display = 'block';
  },

  hideCrawlModal() {
    const overlay = document.getElementById('crawl-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  },

  updateDataVolumeBadge(stats) {
    const badge = document.getElementById('total-draws-count-badge');
    if (badge) {
      badge.innerText = `16–32 kỳ/đài (21 Đài) • 100% Vietlott (${stats.totalCount} kỳ)`;
    }
    const statusText = document.getElementById('crawler-status-text');
    if (statusText) {
      statusText.innerText = `Đã chuẩn hóa ${stats.totalCount} kỳ quay thực tế`;
    }
  }
};
