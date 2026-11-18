/**
 * LOTTO-QUANT LAB: UI CONTROLLER (v8.0 — Warm Editorial Almanac & Tactile Craft)
 * Quản lý kết xuất DOM, bóng số gốm sứ, thẻ vé dự đoán, bảng 18 giải,
 * bảng Đầu - Đuôi, biểu đồ Chartist SVG & Chart.js thích ứng Sáng/Tối.
 */

import { BarChart } from './chartist.min.js';
import { LOTTO_CONFIG } from './config.js';

export const UIController = {
  probChartInstance: null,
  probChartistInstance: null,
  activeProbEngine: 'chartist',
  lastProbScores: null,
  lastProbIsVietlott: false,
  leaderboardChartInstance: null,
  freqChartInstance: null,
  trendChartInstance: null,
  parityChartInstance: null,
  highlowChartInstance: null,
  headtailChartInstance: null,

  isDarkTheme() {
    if (typeof document !== 'undefined' && document.documentElement && typeof document.documentElement.getAttribute === 'function') {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  },

  destroyCanvasChart(canvas) {
    if (!canvas || typeof window === 'undefined' || !window.Chart) return;
    if (typeof window.Chart.getChart === 'function') {
      const existing = window.Chart.getChart(canvas);
      if (existing) {
        try { existing.destroy(); } catch (e) {}
      }
    }
  },

  getChartTheme() {
    const dark = this.isDarkTheme();
    return {
      dark,
      amber: dark ? '#F59E0B' : '#D97706',
      amberSoft: dark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(217, 119, 6, 0.16)',
      jade: dark ? '#2DD4BF' : '#0B6B63',
      jadeSoft: dark ? 'rgba(45, 212, 191, 0.24)' : 'rgba(11, 107, 99, 0.20)',
      indigo: dark ? '#60A5FA' : '#1E3A5F',
      indigoSoft: dark ? 'rgba(96, 165, 250, 0.14)' : 'rgba(30, 58, 95, 0.10)',
      neutralSlice: dark ? '#2D3A4B' : '#E5DFD2',
      cardBg: dark ? '#18202B' : '#FFFDF9',
      grid: dark ? 'rgba(245, 242, 235, 0.08)' : 'rgba(28, 25, 23, 0.08)',
      tick: dark ? '#ADA79C' : '#59534A',
      legend: dark ? '#CFC9BE' : '#4E4943'
    };
  },

  formatStationOrGame(idOrSlug) {
    if (!idOrSlug) return 'Đài mở thưởng';
    const clean = String(idOrSlug).trim();
    if (LOTTO_CONFIG && LOTTO_CONFIG.VIETLOTT_GAMES && LOTTO_CONFIG.VIETLOTT_GAMES[clean]) {
      return `Vietlott ${LOTTO_CONFIG.VIETLOTT_GAMES[clean].name}`;
    }
    if (LOTTO_CONFIG && Array.isArray(LOTTO_CONFIG.ALL_STATIONS)) {
      const st = LOTTO_CONFIG.ALL_STATIONS.find(s => s.id === clean);
      if (st) return `Đài ${st.name}`;
    }
    return clean;
  },

  getScheduleDescription(idOrSlug, isVietlott) {
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    if (isVietlott && LOTTO_CONFIG && LOTTO_CONFIG.VIETLOTT_GAMES && LOTTO_CONFIG.VIETLOTT_GAMES[idOrSlug]) {
      const days = LOTTO_CONFIG.VIETLOTT_GAMES[idOrSlug].drawDays || [];
      return days.map(d => dayNames[d]).join(', ');
    }
    if (!isVietlott && LOTTO_CONFIG && LOTTO_CONFIG.XSMN_SCHEDULE) {
      const days = [];
      Object.keys(LOTTO_CONFIG.XSMN_SCHEDULE).forEach(dayKey => {
        const list = LOTTO_CONFIG.XSMN_SCHEDULE[dayKey] || [];
        if (list.some(s => s.id === idOrSlug)) {
          days.push(dayNames[Number(dayKey)]);
        }
      });
      if (days.length > 0) return days.join(', ');
    }
    return '';
  },

  getWatermarkSvg() {
    return `
      <svg class="hero-watermark-svg" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="100" cy="100" r="88" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 4"/>
        <circle cx="100" cy="100" r="68" stroke="currentColor" stroke-width="1"/>
        <circle cx="100" cy="100" r="46" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 3"/>
        <path d="M100 6V194M6 100H194M33 33L167 167M167 33L33 167" stroke="currentColor" stroke-width="0.8"/>
      </svg>
    `;
  },

  /**
   * 1. Kết xuất Tấm Vé Dự Đoán Trọng Tâm & Bảng Kết Quả Kỳ Trước
   */
  renderLiveResult(draw, isVietlott, containerId = 'live-result-container', quickPrediction = null, targetInfo = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!draw) {
      container.innerHTML = `
        <div class="quant-card" style="text-align: center; padding: 36px 24px;">
          <p style="color: var(--text-secondary);">Chưa có dữ liệu kết quả cho đài hoặc loại hình này.</p>
        </div>`;
      return;
    }

    let heroPredictionHtml = '';
    if (quickPrediction) {
      const consensusText = quickPrediction.metrics && quickPrediction.metrics.consensusRatio
        ? `Độ đồng thuận mô hình: <strong>${quickPrediction.metrics.consensusRatio}</strong>`
        : 'Tổng hợp từ 7 mô hình xác suất độc lập';

      if (isVietlott) {
        const vBalls = (quickPrediction.predictions || []).map(b =>
          `<div class="ensemble-ball-lg">${String(b).padStart(2, '0')}</div>`
        ).join('');
        heroPredictionHtml = `
          <div class="hero-prediction-card">
            ${this.getWatermarkSvg()}
            <div class="hero-card-header">
              <div class="hero-card-sub-top">
                <span class="hero-crown-badge">
                  <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Vé Gợi Ý Kỳ Tiếp Theo
                </span>
                <span class="live-status-pill hero-live-pill">
                  <span class="pulse-dot"></span> Chưa mở thưởng
                </span>
              </div>
              <div class="hero-target-station">
                <i class="fa-regular fa-calendar-check" aria-hidden="true"></i>
                <span>${targetInfo ? `${targetInfo.gameOrStationName} • ${targetInfo.nextDayName}, ${targetInfo.nextDate}` : 'Kỳ Quay Tới'}</span>
              </div>
            </div>

            <div class="hero-special-stage vietlott-stage">
              <div class="stage-caption">
                <i class="fa-solid fa-clover" aria-hidden="true"></i>
                <span>Bộ 6 số hội tụ Vietlott có điểm xếp hạng cao nhất</span>
              </div>
              <div class="hero-pred-balls-row" style="justify-content: center; margin: 10px 0 4px;">
                ${vBalls}
              </div>
            </div>

            <div class="hero-card-footer">
              <span>${consensusText} &bull; Huấn luyện từ dữ liệu thực tế đến kỳ ${targetInfo ? targetInfo.latestDate : draw.date}</span>
              <button type="button" class="btn-predict-explore" onclick="document.getElementById('predictions-container')?.scrollIntoView({behavior:'smooth'})">
                <i class="fa-solid fa-layer-group" aria-hidden="true"></i> Xem chi tiết 8 mô hình ➔
              </button>
            </div>
          </div>
        `;
      } else {
        const sp = quickPrediction.specialPrize;
        const preds = quickPrediction.predictions || [];
        const shortLabels = ['Đầu', 'Vạn', 'Ngàn', 'Trăm', 'Chục', 'Đuôi'];
        const balls6 = sp && Array.isArray(sp.positions) ? sp.positions.map((p, idx) => `
          <div class="special-ball-col">
            <div class="special-digit-ball ${p.isDuoi || p.isDau ? 'highlight-de' : (p.isCang ? 'highlight-cang' : '')}">
              ${p.digit}
            </div>
            <span class="special-ball-label">${shortLabels[idx] || p.label}</span>
          </div>
        `).join('') : '';

        const copyBtnHtml = sp && sp.fullNumber ? `
          <div class="special-ticket-strip">
            <span>Vé 6 số: <code class="special-code-pill">${sp.fullNumber}</code></span>
            <button id="btn-copy-special" type="button" class="btn-copy-ticket" onclick="navigator.clipboard?.writeText('${sp.fullNumber}'); this.innerHTML='<i class=\\'fa-solid fa-check\\'></i> Đã chép'; setTimeout(() => this.innerHTML='<i class=\\'fa-regular fa-copy\\'></i> Chép 6 số', 1800);">
              <i class="fa-regular fa-copy" aria-hidden="true"></i> Chép 6 số
            </button>
          </div>
        ` : '';

        heroPredictionHtml = `
          <div class="hero-prediction-card">
            ${this.getWatermarkSvg()}
            <div class="hero-card-header">
              <div class="hero-card-sub-top">
                <span class="hero-crown-badge">
                  <i class="fa-solid fa-crown" aria-hidden="true"></i> Phiếu Dự Báo Kỳ Tiếp Theo
                </span>
                <span class="live-status-pill hero-live-pill">
                  <span class="pulse-dot"></span> Chưa quay
                </span>
              </div>
              <div class="hero-target-station">
                <i class="fa-regular fa-calendar-check" aria-hidden="true"></i>
                <span>${targetInfo ? `${targetInfo.gameOrStationName} • ${targetInfo.nextDayName}, ${targetInfo.nextDate} (${targetInfo.nextDrawTime})` : 'Kỳ Tiếp Theo'}</span>
              </div>
            </div>

            <div class="hero-ticket-body">
              <!-- Cột Trái: 6 chữ số Giải Đặc Biệt -->
              <div class="hero-special-stage">
                <div class="stage-caption">
                  <i class="fa-solid fa-award" aria-hidden="true"></i>
                  <span>Dãy 6 số Giải Đặc Biệt dự báo</span>
                </div>
                <div class="special-balls-container">
                  ${balls6}
                </div>
                ${copyBtnHtml}
              </div>

              <!-- Cột Phải: 3 ô số gợi ý trọng tâm -->
              <div class="hero-signals-stage">
                <div class="lucky-lotto-grid">
                  <div class="lucky-card lucky-gold">
                    <span class="lucky-label"><i class="fa-solid fa-star" aria-hidden="true"></i> Bạch Thủ Lô (1 số)</span>
                    <span class="lucky-value">${preds[0] || '--'}</span>
                  </div>
                  <div class="lucky-card lucky-blue">
                    <span class="lucky-label"><i class="fa-solid fa-gem" aria-hidden="true"></i> Song Thủ Lô (Cặp)</span>
                    <span class="lucky-value">${preds[0] || '--'} – ${preds[1] || '--'}</span>
                  </div>
                  <div class="lucky-card lucky-emerald">
                    <span class="lucky-label"><i class="fa-solid fa-compass" aria-hidden="true"></i> Dàn 5 Số Đẹp (Bao Lô)</span>
                    <span class="lucky-value dan">${preds.slice(0, 5).join(' · ')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="hero-card-footer">
              <span>${consensusText} &bull; Phân tích chuỗi mở thưởng đến ngày ${targetInfo ? targetInfo.latestDate : draw.date}</span>
              <button type="button" class="btn-predict-explore" onclick="document.getElementById('predictions-container')?.scrollIntoView({behavior:'smooth'})">
                <i class="fa-solid fa-layer-group" aria-hidden="true"></i> Xem 8 mô hình chi tiết ➔
              </button>
            </div>
          </div>
        `;
      }
    }

    if (isVietlott) {
      const ballsHtml = (draw.winningNumbers || []).map(b =>
        `<div class="lotto-ball gold">${String(b).padStart(2, '0')}</div>`
      ).join('');

      const bonusHtml = draw.bonusNumber
        ? `<div class="vietlott-bonus-group">
             <span class="vietlott-bonus-label">Số đặc biệt:</span>
             <div class="lotto-ball bonus">${String(draw.bonusNumber).padStart(2, '0')}</div>
           </div>`
        : '';

      const gameLabel = draw.gameType === 'power-6-55' ? 'Power 6/55' : 'Mega 6/45';
      const formattedJackpot = draw.jackpotEst
        ? draw.jackpotEst.toString().replace(/[\sđ₫]+$/gi, '').trim() + ' ₫'
        : 'Đang cập nhật giá trị Jackpot';

      container.innerHTML = `
        ${heroPredictionHtml}
        <div class="quant-card">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Kết Quả Mở Thưởng ${gameLabel} Kỳ Gần Nhất</h2>
              <span class="meta-info-badge">Kỳ ${draw.drawId || '#Mới'}</span>
            </div>
            <span class="meta-info-badge"><i class="fa-regular fa-calendar" aria-hidden="true"></i> Ngày: ${draw.date}</span>
          </div>

          <div style="background: var(--bg-subtle); padding: 22px 18px; border-radius: var(--r-lg); text-align: center; margin-bottom: 16px; border: 1px solid var(--line-subtle);">
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; font-weight: 600;">Bộ số trúng thưởng chính thức đã xác thực</div>
            <div class="ball-group" style="justify-content: center;">
              ${ballsHtml}
              ${bonusHtml}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; flex-wrap: wrap; gap: 8px;">
            <span style="color: var(--text-secondary); font-weight: 600; font-size: 13px;">Giá trị quỹ thưởng Jackpot ghi nhận:</span>
            <span class="tabular-numbers" style="font-size: 21px; font-weight: 800; color: var(--accent-amber);">${formattedJackpot}</span>
          </div>
        </div>
      `;
    } else {
      const prizes = draw.prizes || {};
      let headTail = draw.headTail;
      if (!headTail || !headTail.head || !headTail.tail) {
        const head = {}, tail = {};
        for (let d = 0; d <= 9; d++) { head[d] = []; tail[d] = []; }
        (draw.lottoPairs || []).forEach(num => {
          if (typeof num === 'string' && num.length >= 2) {
            head[num[0]].push(num[1]);
            tail[num[1]].push(num[0]);
          }
        });
        for (let d = 0; d <= 9; d++) { head[d].sort(); tail[d].sort(); }
        headTail = { head, tail };
      }

      const formatChips = (nums, type = '') => {
        if (!nums || !nums.length || nums[0] === '-') return `<span class="prize-chip">-</span>`;
        return `<div class="prize-chips-wrapper">` +
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
        const heads = (headTail.head && headTail.head[d] && headTail.head[d].length > 0) ? headTail.head[d].join(', ') : '—';
        const tails = (headTail.tail && headTail.tail[d] && headTail.tail[d].length > 0) ? headTail.tail[d].join(', ') : '—';
        const hasHeads = heads !== '—';
        const hasTails = tails !== '—';
        headTailRows += `
          <tr>
            <td class="digit-header"><span class="digit-badge">${d}</span></td>
            <td class="pairs-cell ${hasHeads ? 'has-pairs' : 'empty-pairs'}">${heads}</td>
            <td class="digit-header divider-left"><span class="digit-badge">${d}</span></td>
            <td class="pairs-cell ${hasTails ? 'has-pairs' : 'empty-pairs'}">${tails}</td>
          </tr>
        `;
      }

      const stationTitle = draw.stationName
        ? `Đài ${draw.stationName}`
        : this.formatStationOrGame(draw.stationId);

      container.innerHTML = `
        ${heroPredictionHtml}
        <div class="results-card-container">
          <!-- Bảng 18 Giải Mở Thưởng Kỳ Trước -->
          <div class="quant-card">
            <div class="card-header-bar">
              <div class="card-title-group">
                <h2>Kết Quả ${stationTitle} (Kỳ Vừa Mở)</h2>
                ${draw.drawId ? `<span class="meta-info-badge">Mã ${draw.drawId}</span>` : ''}
              </div>
              <span class="meta-info-badge"><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${draw.date}</span>
            </div>

            <table class="xsmn-table">
              <tbody>
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
              </tbody>
            </table>
          </div>

          <!-- Bảng Phân Tích Đầu - Đuôi 18 Lô -->
          <div class="quant-card head-tail-card">
            <div class="head-tail-header-box">
              <h3 class="head-tail-main-title">Thống Kê Đầu – Đuôi</h3>
              <span class="head-tail-sub-title">18 Lô</span>
            </div>

            <div class="head-tail-table-wrapper">
              <table class="head-tail-table">
                <thead>
                  <tr>
                    <th class="th-digit">Đầu</th>
                    <th class="th-pairs">Cặp Lô</th>
                    <th class="th-digit divider-left">Đuôi</th>
                    <th class="th-pairs">Cặp Lô</th>
                  </tr>
                </thead>
                <tbody>
                  ${headTailRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }
  },

  /**
   * 2. Kết xuất Khối Đồng Thuận Ensemble & Lưới 7 Mô Hình Độc Lập
   */
  renderPredictions(ensembleResult, isVietlott, containerId = 'predictions-container', targetInfo = null) {
    const container = document.getElementById(containerId);
    if (!container || !ensembleResult) return;

    const preds = ensembleResult.predictions || [];
    const normalizedPredSet = new Set(preds.map(p => String(p).padStart(2, '0')));

    const confidence = ensembleResult.metrics
      ? (ensembleResult.metrics.consensusRatio || ensembleResult.metrics.confidenceScore || '---')
      : '---';

    const heroBallsHtml = preds.map(p =>
      `<div class="ensemble-ball-lg">${isVietlott ? String(p).padStart(2, '0') : p}</div>`
    ).join('');

    const sp = ensembleResult.specialPrize;
    const usageGuideHtml = !isVietlott ? `
      <div class="ensemble-usage-pills">
        <span class="usage-pill-item"><strong>Bạch Thủ Lô:</strong> <code>${preds[0] || '--'}</code></span>
        <span class="usage-pill-item"><strong>Song Thủ Lô:</strong> <code>${preds[0] || '--'} – ${preds[1] || '--'}</code></span>
        <span class="usage-pill-item"><strong>Bao Lô 5 số:</strong> <code>${preds.join(', ')}</code></span>
        ${sp ? `<span class="usage-pill-item"><strong>3 Càng / Đề ĐB:</strong> <code>${sp.baCang}</code> / <code>${sp.bachThuDe}</code></span>` : ''}
      </div>
    ` : `
      <div class="ensemble-usage-pills">
        <span class="usage-pill-item"><i class="fa-solid fa-circle-info" style="color: var(--accent);"></i> Bộ 6 số độc lập chọn từ tập ứng viên Vietlott cho kỳ mở thưởng ${targetInfo ? targetInfo.nextDate : 'tiếp theo'}.</span>
      </div>
    `;

    const heroCardHtml = `
      <div class="hero-ensemble-card">
        <div class="ensemble-content">
          <div>
            <div class="ensemble-badge-title">
              <h3>Mô Hình Tổng Hợp Đồng Thuận (Ensemble Consensus)</h3>
              <span class="badge">Xếp hạng bách phân vị</span>
            </div>
            <p style="color: var(--text-secondary); font-size: 13.5px; line-height: 1.6; margin: 0 0 8px 0;">
              ${ensembleResult.explanation || 'Kết hợp trọng số từ 7 mô hình thống kê độc lập để chọn ra các con số có sự đồng thuận cao nhất.'}
            </p>
            <div class="ensemble-numbers-display">
              ${heroBallsHtml}
            </div>
            ${usageGuideHtml}
          </div>
          <div class="confidence-meter" title="Mức đồng thuận giữa các mô hình độc lập; không phải xác suất trúng xổ số">
            <div class="confidence-value tabular-numbers">${confidence}</div>
            <div class="confidence-label">Độ đồng thuận mô hình</div>
          </div>
        </div>
      </div>
    `;

    const subAlgos = ensembleResult.subResults || [];
    const activeWeightSum = subAlgos
      .filter(s => s && s.status === 'ok' && (s.weight || 0) > 0)
      .reduce((acc, s) => acc + (s.weight || 0), 0);

    const algoCardsHtml = subAlgos.map(item => {
      const res = item.result || {};
      const isModelActive = item.status === 'ok' && (item.weight || 0) > 0;
      const weightPct = isModelActive
        ? (activeWeightSum > 0 ? Math.round(((item.weight || 0) / activeWeightSum) * 100) : Math.round((item.weight || 0) * 100))
        : 0;
      const barWidth = isModelActive ? Math.min(100, Math.max(12, weightPct * 4)) : 0;
      const subPredsHtml = isModelActive
        ? (res.predictions || []).map(p => {
            const label = isVietlott ? String(p).padStart(2, '0') : String(p);
            const padded = String(p).padStart(2, '0');
            const isHitConsensus = normalizedPredSet.has(padded);
            return `<div class="algo-pred-ball ${isHitConsensus ? 'is-consensus' : ''}" title="${isHitConsensus ? 'Nằm trong nhóm số đồng thuận cao' : 'Ứng viên riêng của mô hình'}">${label}</div>`;
          }).join('')
        : `<span class="meta-info-badge">Chưa đủ kỳ lịch sử</span>`;

      return `
        <article class="algo-card">
          <div>
            <div class="algo-header">
              <div class="algo-name-box">
                <h4>${item.name}</h4>
                <div class="algo-category">
                  <i class="fa-solid fa-scale-balanced" aria-hidden="true"></i>
                  <span>${isModelActive ? `Trọng số đóng góp: ${weightPct}%` : 'Trọng số đóng góp: 0% (tạm nghỉ)'}</span>
                </div>
              </div>
            </div>
            <div class="algo-weight-bar" aria-hidden="true">
              <div class="algo-weight-fill" style="width: ${barWidth}%;"></div>
            </div>
            <div class="algo-prediction-row">
              ${subPredsHtml}
            </div>
          </div>
          <div class="algo-explanation">
            ${res.explanation || item.reason || 'Đang cập nhật thuyết minh mô hình.'}
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = `
      ${heroCardHtml}
      <div class="algorithms-section-header">
        <h3 class="algorithms-section-title">Chi Tiết 7 Mô Hình Toán Học Thành Phần</h3>
        <span style="font-size: 12px; color: var(--text-muted);">Bóng vàng cam biểu thị con số hội tụ cùng kết quả Ensemble</span>
      </div>
      <div class="algorithms-grid">
        ${algoCardsHtml}
      </div>
    `;

    this.renderProbabilityChart(ensembleResult.scores, isVietlott);
  },

  /**
   * 3. Biểu đồ phân phối điểm hội tụ Top 30 (Chartist SVG & Chart.js Canvas)
   */
  renderProbabilityChart(scores, isVietlott, canvasId = 'prob-chart-canvas') {
    this.lastProbScores = scores;
    this.lastProbIsVietlott = isVietlott;

    const labels = Object.keys(scores || {});
    const dataValues = Object.values(scores || {});
    const paired = labels.map((l, i) => ({ label: String(l).padStart(2, '0'), val: dataValues[i] }));
    paired.sort((a, b) => b.val - a.val);
    const topShow = paired.slice(0, 30);
    const topCount = isVietlott ? 6 : 5;
    const theme = this.getChartTheme();

    // A. Chart.js Canvas
    const canvas = typeof document !== 'undefined' ? document.getElementById(canvasId) : null;
    if (canvas && typeof window !== 'undefined' && window.Chart) {
      if (this.probChartInstance) {
        try { this.probChartInstance.destroy(); } catch (e) {}
      }
      this.destroyCanvasChart(canvas);

      const ctx = canvas.getContext('2d');
      this.probChartInstance = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: topShow.map(p => p.label),
          datasets: [{
            label: 'Điểm hội tụ chuẩn hóa',
            data: topShow.map(p => p.val),
            backgroundColor: topShow.map((_, idx) => idx < topCount ? theme.amber : theme.jade),
            borderColor: topShow.map((_, idx) => idx < topCount ? theme.amber : theme.jade),
            borderWidth: 0,
            borderRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 260 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c) => ` Điểm hội tụ: ${c.parsed.y}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: theme.tick, font: { family: 'JetBrains Mono', weight: 'bold', size: 11 } }
            },
            y: {
              grid: { color: theme.grid },
              ticks: { color: theme.tick, font: { family: 'JetBrains Mono', size: 11 } },
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    }

    // B. Chartist SVG Vector (Chỉ vẽ trực tiếp khi container đang hiển thị để tránh width=0)
    const hasFullDom = typeof document !== 'undefined' && Boolean(document.defaultView);
    const chartistBox = hasFullDom ? document.getElementById('prob-chartist-box') : null;
    if (chartistBox && typeof BarChart === 'function') {
      if (chartistBox.classList) {
        chartistBox.classList.toggle('is-vietlott', Boolean(isVietlott));
      }
      if (this.probChartistInstance) {
        try { this.probChartistInstance.detach(); } catch (e) {}
        this.probChartistInstance = null;
      }

      const isBoxVisible = chartistBox.offsetParent !== null && chartistBox.clientWidth > 0;
      if (isBoxVisible) {
        this._probChartistNeedsRender = false;
        try {
          const chartistData = {
            labels: topShow.map(p => p.label),
            series: [topShow.map(p => p.val)]
          };

          const chartistOptions = {
            seriesBarDistance: 6,
            axisX: { showGrid: false },
            axisY: { onlyInteger: true, offset: 34, scaleMinSpace: 26 },
            height: 290
          };

          this.probChartistInstance = new BarChart(chartistBox, chartistData, chartistOptions);

          requestAnimationFrame(() => {
            try {
              const bars = chartistBox.querySelectorAll('.ct-bar');
              bars.forEach((bar, index) => {
                const isTopTarget = index < topCount;
                bar.style.stroke = isTopTarget ? theme.amber : theme.jade;
                bar.style.strokeLinecap = 'round';
                bar.style.opacity = isTopTarget ? '1' : '0.75';
              });
            } catch (e) {}
          });
        } catch (err) {
          console.warn('Lỗi khi vẽ biểu đồ Chartist SVG:', err);
        }
      } else {
        this._probChartistNeedsRender = true;
      }
    }

    this.setupChartEngineSwitcher();
  },

  setupChartEngineSwitcher() {
    if (typeof document === 'undefined') return;

    const btnChartist = document.getElementById('btn-chart-engine-chartist');
    const btnChartjs = document.getElementById('btn-chart-engine-chartjs');
    const chartistView = document.getElementById('chartist-prob-view');
    const chartjsView = document.getElementById('chartjs-prob-view');
    const indicator = document.getElementById('chart-engine-indicator');

    if (!btnChartist || !btnChartjs || !chartistView || !chartjsView) return;

    const applyEngine = (engine, fromUserClick = false) => {
      this.activeProbEngine = engine;
      if (engine === 'chartist') {
        if (chartistView.style) chartistView.style.display = 'block';
        if (chartjsView.style) chartjsView.style.display = 'none';
        if (btnChartist.classList) btnChartist.classList.add('active');
        if (btnChartjs.classList) btnChartjs.classList.remove('active');
        if (btnChartist.setAttribute) btnChartist.setAttribute('aria-pressed', 'true');
        if (btnChartjs.setAttribute) btnChartjs.setAttribute('aria-pressed', 'false');
        if (indicator) indicator.textContent = 'Đang hiển thị: Biểu đồ Vector SVG';
        if (fromUserClick && (this._probChartistNeedsRender || !this.probChartistInstance) && this.lastProbScores) {
          requestAnimationFrame(() => {
            this.renderProbabilityChart(this.lastProbScores, this.lastProbIsVietlott);
          });
        } else if (fromUserClick && this.probChartistInstance && typeof this.probChartistInstance.update === 'function') {
          requestAnimationFrame(() => {
            try { this.probChartistInstance.update(); } catch (e) {}
          });
        }
      } else {
        if (chartistView.style) chartistView.style.display = 'none';
        if (chartjsView.style) chartjsView.style.display = 'block';
        if (btnChartjs.classList) btnChartjs.classList.add('active');
        if (btnChartist.classList) btnChartist.classList.remove('active');
        if (btnChartjs.setAttribute) btnChartjs.setAttribute('aria-pressed', 'true');
        if (btnChartist.setAttribute) btnChartist.setAttribute('aria-pressed', 'false');
        if (indicator) indicator.textContent = 'Đang hiển thị: Biểu đồ Canvas HD';
        if (fromUserClick && this.probChartInstance && typeof this.probChartInstance.resize === 'function') {
          requestAnimationFrame(() => {
            try { this.probChartInstance.resize(); } catch (e) {}
          });
        }
      }
    };

    btnChartist.onclick = () => applyEngine('chartist', true);
    btnChartjs.onclick = () => applyEngine('chartjs', true);
    applyEngine(this.activeProbEngine || 'chartist', false);
  },

  /**
   * 4. Kết xuất Dashboard Thống Kê Đa Chiều & Lưới 4 Biểu Đồ 2x2 Đối Xứng
   */
  renderExecutiveDashboard(data, isVietlott, containerId = 'dashboard-container') {
    const container = document.getElementById(containerId);
    if (!container || !data) return;

    const { history, gapStats, clusterStats, rulesStats } = data;
    const draws = history || [];
    const theme = this.getChartTheme();

    if (this.freqChartInstance) { this.freqChartInstance.destroy(); this.freqChartInstance = null; }
    if (this.trendChartInstance) { this.trendChartInstance.destroy(); this.trendChartInstance = null; }
    if (this.parityChartInstance) { this.parityChartInstance.destroy(); this.parityChartInstance = null; }
    if (this.highlowChartInstance) { this.highlowChartInstance.destroy(); this.highlowChartInstance = null; }
    if (this.headtailChartInstance) { this.headtailChartInstance.destroy(); this.headtailChartInstance = null; }

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

    const gapDetails = (gapStats && Array.isArray(gapStats.topDetails)) ? gapStats.topDetails : [];
    const getRipeness = (item) => {
      if (!item) return null;
      if (typeof item.ripeness === 'number') return item.ripeness;
      if (typeof item.ripenessIndex === 'number') return item.ripenessIndex;
      return null;
    };

    const top15Gaps = top15.map(t => {
      const found = gapDetails.find(d => String(d.num).padStart(2, '0') === t.num);
      return found && typeof found.currentGap === 'number' ? found.currentGap : 2;
    });
    const top15Cycles = top15.map(t => {
      const found = gapDetails.find(d => String(d.num).padStart(2, '0') === t.num);
      return found && typeof found.avgCycle === 'number' ? found.avgCycle : 5;
    });

    const evenPct = clusterStats && typeof clusterStats.evenRatio === 'number' ? Math.round(clusterStats.evenRatio * 100) : 50;
    const oddPct = 100 - evenPct;
    const rawHighRatio = clusterStats && (typeof clusterStats.highRatio === 'number' ? clusterStats.highRatio : clusterStats.observedHighRatio);
    const highPct = typeof rawHighRatio === 'number' ? Math.round(rawHighRatio * 100) : 50;
    const lowPct = 100 - highPct;

    const headCounts = Array(10).fill(0);
    const tailCounts = Array(10).fill(0);
    draws.slice(0, 5).forEach(d => {
      const nums = isVietlott ? (d.winningNumbers || []) : (d.lottoPairs || []);
      nums.forEach(n => {
        const s = String(n).padStart(2, '0');
        const h = parseInt(s[0], 10);
        const t = parseInt(s[1], 10);
        if (!isNaN(h) && h >= 0 && h <= 9) headCounts[h]++;
        if (!isNaN(t) && t >= 0 && t <= 9) tailCounts[t]++;
      });
    });

    // Hỗ trợ đồng thời cả schema ripenessIndex (FrequencyGapAlgorithm) và ripeness (Integration test)
    let bachThu = top15[0] ? top15[0].num : (isVietlott ? '18' : '68');
    const ripeItem = gapDetails.find(d => {
      const r = getRipeness(d);
      return r !== null && r >= 0.85 && r <= 1.25;
    });
    if (ripeItem) bachThu = String(ripeItem.num).padStart(2, '0');

    // Hỗ trợ đồng thời cả schema frequentPairs (AssociationRulesAlgorithm) và topPairs (Integration test)
    const rawPairs = (rulesStats && (rulesStats.topPairs || rulesStats.frequentPairs)) || [];
    const topPairs = Array.isArray(rawPairs) ? rawPairs : [];
    const songThu = topPairs[0] ? `${topPairs[0].a} – ${topPairs[0].b}` : (top15.length >= 2 ? `${top15[0].num} – ${top15[1].num}` : '12 – 24');

    const maxGanItem = gapDetails.slice().sort((a, b) => (b.currentGap || 0) - (a.currentGap || 0))[0];
    const soGan = maxGanItem ? String(maxGanItem.num).padStart(2, '0') : '47';
    const soGanKy = maxGanItem && typeof maxGanItem.currentGap === 'number' ? maxGanItem.currentGap : 16;

    const primeItems = [];
    const hotItems = [];
    const coldItems = [];
    gapDetails.forEach(item => {
      const numStr = String(item.num).padStart(2, '0');
      const r = getRipeness(item);
      const curGap = typeof item.currentGap === 'number' ? item.currentGap : 0;
      const recentHits = typeof item.hitsInRecentWindow === 'number' ? item.hitsInRecentWindow : (item.hits15 || 0);
      if (r !== null && r >= 0.8 && r <= 1.35) {
        primeItems.push({ numStr, curGap, dist: Math.abs(r - 1.0) });
      }
      if (recentHits >= 3) {
        hotItems.push({ numStr, recentHits });
      }
      if (curGap >= 12) {
        coldItems.push({ numStr, curGap });
      }
    });

    primeItems.sort((a, b) => a.dist - b.dist);
    hotItems.sort((a, b) => b.recentHits - a.recentHits);
    coldItems.sort((a, b) => b.curGap - a.curGap);

    const primeChipsHtml = primeItems.slice(0, 10)
      .map(x => `<span class="lotto-chip special-hit">${x.numStr} <small style="opacity:0.8; margin-left:3px;">(${x.curGap}k)</small></span>`)
      .join('') || '<span style="color:var(--text-muted);font-size:12.5px;">Chưa có số rơi đúng dải chu kỳ 0.8x–1.35x ở mẫu hiện tại</span>';
    const hotChipsHtml = hotItems.slice(0, 10)
      .map(x => `<span class="lotto-chip hit">${x.numStr} <small style="opacity:0.8; margin-left:3px;">(${x.recentHits}l)</small></span>`)
      .join('') || '<span style="color:var(--text-muted);font-size:12.5px;">Tần suất đang phân bổ đồng đều giữa các con số</span>';
    const coldChipsHtml = coldItems.slice(0, 10)
      .map(x => `<span class="lotto-chip" style="color: var(--danger); border-color: var(--callout-rose-border); background: var(--callout-rose-bg);">${x.numStr} <small style="opacity:0.85; margin-left:3px;">(${x.curGap}k)</small></span>`)
      .join('') || '<span style="color:var(--text-muted);font-size:12.5px;">Không có số nào vượt ngưỡng gan 12 kỳ trong mẫu hiện tại</span>';

    const liftPairsHtml = topPairs.length > 0 ? topPairs.slice(0, 5).map(p => {
      const cooccur = (typeof p.coOccurrenceCount === 'number')
        ? p.coOccurrenceCount
        : ((typeof p.count === 'number') ? p.count : 0);
      const totalDraws = p.totalEligibleDraws || draws.length || 50;
      const liftVal = (typeof p.lift === 'number' && !isNaN(p.lift)) ? p.lift.toFixed(2) : '1.00';
      return `
        <div class="bac-nho-pair-row">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="lotto-chip" style="margin:0;">${p.a}</span>
            <i class="fa-solid fa-arrows-left-right" style="color:var(--accent-amber); font-size:11px;"></i>
            <span class="lotto-chip special-hit" style="margin:0;">${p.b}</span>
          </div>
          <div style="text-align:right;">
            <span class="tabular-numbers" style="font-weight:700; color:var(--accent-emerald); font-size:13px;">Gắn kết ${liftVal}x</span>
            <div style="font-size:11px; color:var(--text-muted);">${cooccur} lần về cùng nhau (trong ${totalDraws} kỳ)</div>
          </div>
        </div>
      `;
    }).join('') : '<p style="color:var(--text-muted); font-size:13px; padding:8px 0;">Chưa đủ mẫu cặp đồng xuất hiện trong phạm vi này.</p>';

    container.innerHTML = `
      <!-- 1. 3 Thẻ Tóm Tắt Điểm Nhấn Dễ Dùng -->
      <div class="recommendation-cards-grid">
        <div class="rec-card rec-gold">
          <div>
            <div class="rec-header">
              <span class="rec-title"><i class="fa-solid fa-star" aria-hidden="true"></i> Ứng Viên Điểm Rơi Chu Kỳ</span>
              <span class="meta-info-badge">Nhịp cân bằng</span>
            </div>
            <div class="rec-ball-box">
              <span class="rec-ball">${bachThu}</span>
              <span style="font-size: 13px; color: var(--text-primary); font-weight: 600;">Khớp chu kỳ lịch sử</span>
            </div>
            <div class="rec-desc">
              Con số có khoảng nghỉ hiện tại tiệm cận chu kỳ xuất hiện trung bình trong ${draws.length} kỳ khảo sát.
            </div>
          </div>
        </div>

        <div class="rec-card rec-emerald">
          <div>
            <div class="rec-header">
              <span class="rec-title"><i class="fa-solid fa-link" aria-hidden="true"></i> Cặp Đôi Đồng Xuất Hiện</span>
              <span class="meta-info-badge">Đi kèm cao</span>
            </div>
            <div class="rec-ball-box">
              <span class="rec-ball">${songThu}</span>
            </div>
            <div class="rec-desc">
              Cặp số có tần suất xuất hiện cùng kỳ nổi bật nhất trong tập mẫu lịch sử của đài/sản phẩm này.
            </div>
          </div>
        </div>

        <div class="rec-card rec-rose">
          <div>
            <div class="rec-header">
              <span class="rec-title"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Cảnh Báo Số Vắng Mặt Lâu</span>
              <span class="meta-info-badge">Tránh gấp thếp</span>
            </div>
            <div class="rec-ball-box">
              <span class="rec-ball">${soGan}</span>
              <span style="font-size: 13px; color: var(--danger); font-weight: 700;">Vắng ${soGanKy} kỳ liên tiếp</span>
            </div>
            <div class="rec-desc">
              Đang trong chuỗi gan dài ngày. Không nên dồn ngân sách nuôi gấp thếp cho tới khi số này về lại.
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Lưới 2x2 Bốn Biểu Đồ Phân Tích Tương Tác Cân Đối -->
      <div class="dashboard-charts-grid">
        <div class="chart-card">
          <div class="chart-card-header">
            <div class="chart-card-title-group">
              <h3>1. Tần Suất Xuất Hiện (Top 15 Số)</h3>
              <div class="chart-card-subtitle">Tổng số lần xuất hiện trong ${draws.length} kỳ gần nhất</div>
            </div>
            <span class="meta-info-badge">Cột tần suất</span>
          </div>
          <div class="chart-canvas-box">
            <canvas id="chart-freq-canvas"></canvas>
          </div>
          <div class="chart-footer-insight">
            <i class="fa-solid fa-circle-info" style="color:var(--gold-400);"></i>
            <span>Nhóm về đều nhất: <strong>${top15Labels.slice(0, 3).join(', ') || '--'}</strong></span>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <div class="chart-card-title-group">
              <h3>2. Khoảng Nghỉ Hiện Tại &amp; Chu Kỳ Trung Bình</h3>
              <div class="chart-card-subtitle">Đường liền: Số kỳ chưa về &bull; Đường đứt: Chu kỳ TB</div>
            </div>
            <span class="meta-info-badge">So sánh chu kỳ</span>
          </div>
          <div class="chart-canvas-box">
            <canvas id="chart-trend-canvas"></canvas>
          </div>
          <div class="chart-footer-insight">
            <i class="fa-solid fa-wave-square" style="color:var(--accent);"></i>
            <span>Điểm giao cắt cho biết con số vừa chạm chu kỳ lặp lại trung bình trong mẫu.</span>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <div class="chart-card-title-group">
              <h3>3. Tỷ Lệ Chẵn – Lẻ &amp; Tài – Xỉu</h3>
              <div class="chart-card-subtitle">Cấu trúc phân bổ chẵn/lẻ và lớn/nhỏ toàn tập mẫu</div>
            </div>
            <span class="meta-info-badge">Tỷ trọng %</span>
          </div>
          <div class="donuts-container">
            <div class="single-donut-box">
              <div class="donut-ring-wrap">
                <canvas id="chart-donut-parity-canvas"></canvas>
                <div class="donut-label-center">
                  <div class="donut-pct">${evenPct}%</div>
                  <div class="donut-sub">Số chẵn</div>
                </div>
              </div>
              <div class="donut-custom-legend" aria-hidden="true">
                <span class="donut-legend-pill"><i class="donut-swatch" style="background: ${theme.indigo};"></i>Chẵn</span>
                <span class="donut-legend-pill"><i class="donut-swatch" style="background: ${theme.neutralSlice};"></i>Lẻ</span>
              </div>
            </div>
            <div class="single-donut-box">
              <div class="donut-ring-wrap">
                <canvas id="chart-donut-highlow-canvas"></canvas>
                <div class="donut-label-center">
                  <div class="donut-pct">${highPct}%</div>
                  <div class="donut-sub">Nhóm lớn</div>
                </div>
              </div>
              <div class="donut-custom-legend" aria-hidden="true">
                <span class="donut-legend-pill"><i class="donut-swatch" style="background: ${theme.jade};"></i>Tài</span>
                <span class="donut-legend-pill"><i class="donut-swatch" style="background: ${theme.neutralSlice};"></i>Xỉu</span>
              </div>
            </div>
          </div>
          <div class="chart-footer-insight">
            <i class="fa-solid fa-scale-balanced" style="color:var(--brand-primary);"></i>
            <span>Lẻ: <strong>${oddPct}%</strong> &bull; Nhóm nhỏ: <strong>${lowPct}%</strong> (Giúp phối bộ số hài hòa)</span>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <div class="chart-card-title-group">
              <h3>4. Mật Độ Đầu Số &amp; Đuôi Số (5 Kỳ Gần Nhất)</h3>
              <div class="chart-card-subtitle">Theo dõi sự phân bổ từ chữ số 0 đến 9</div>
            </div>
            <span class="meta-info-badge">Đầu – Đuôi</span>
          </div>
          <div class="chart-canvas-box">
            <canvas id="chart-headtail-canvas"></canvas>
          </div>
          <div class="chart-footer-insight">
            <i class="fa-solid fa-grip-vertical" style="color:var(--gold-400);"></i>
            <span>Cột Vàng cam: Đầu số &bull; Cột Ngọc bích: Đuôi số</span>
          </div>
        </div>
      </div>

      <!-- 3. Phân Làn Chu Kỳ & Bảng Cặp Đôi Bạc Nhớ -->
      <div class="dashboard-charts-grid">
        <div class="quant-card">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h3>Phân Làn Nhịp Độ Xuất Hiện</h3>
            </div>
            <span class="meta-info-badge">3 nhóm trạng thái</span>
          </div>
          <div class="ripeness-lanes-stack">
            <div class="ripeness-lane lane-prime">
              <div class="lane-title"><i class="fa-solid fa-seedling" aria-hidden="true"></i> Vùng Chín Muồi (Quanh chu kỳ TB)</div>
              <div class="lane-sub">Khoảng nghỉ hiện tại đạt 0.8x – 1.35x chu kỳ lịch sử:</div>
              <div class="lane-chips-box">${primeChipsHtml}</div>
            </div>
            <div class="ripeness-lane lane-hot">
              <div class="lane-title"><i class="fa-solid fa-bolt" aria-hidden="true"></i> Nhịp Về Đều (Đà tần suất cao)</div>
              <div class="lane-sub">Các con số xuất hiện từ 3 lần trở lên trong cửa sổ gần đây:</div>
              <div class="lane-chips-box">${hotChipsHtml}</div>
            </div>
            <div class="ripeness-lane lane-cold">
              <div class="lane-title"><i class="fa-solid fa-snowflake" aria-hidden="true"></i> Nhóm Gan Lâu Ngày (Cần thận trọng)</div>
              <div class="lane-sub">Đang vắng mặt dài kỳ (từ 12 kỳ trở lên):</div>
              <div class="lane-chips-box">${coldChipsHtml}</div>
            </div>
          </div>
        </div>

        <div class="quant-card">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h3>Cặp Đôi Bạc Nhớ Hay Đi Kèm Nhau</h3>
            </div>
            <span class="meta-info-badge">Đồng xuất hiện</span>
          </div>
          <p style="font-size:13px; color:var(--text-secondary); margin: 0 0 12px 0;">
            Các cặp số có tần suất về cùng nhau cao nhất trong lịch sử mở thưởng của đài:
          </p>
          <div class="bac-nho-list">
            ${liftPairsHtml}
          </div>
        </div>
      </div>
    `;

    // Vẽ 4 biểu đồ Chart.js với màu sắc đồng bộ Sáng / Tối (Chỉ vẽ khi container đang hiển thị thật)
    if (this._dashChartTimer) {
      clearTimeout(this._dashChartTimer);
      this._dashChartTimer = null;
    }

    const isHiddenInBrowser = typeof document !== 'undefined' && Boolean(document.defaultView) && container.offsetParent === null;
    if (isHiddenInBrowser) {
      this._dashChartsDeferred = { data, isVietlott, containerId };
      return;
    }
    this._dashChartsDeferred = null;

    this._dashChartTimer = setTimeout(() => {
      const t = this.getChartTheme();

      const ctxFreq = typeof document !== 'undefined' ? document.getElementById('chart-freq-canvas') : null;
      if (ctxFreq && typeof window !== 'undefined' && window.Chart) {
        this.destroyCanvasChart(ctxFreq);
        this.freqChartInstance = new window.Chart(ctxFreq, {
          type: 'bar',
          data: {
            labels: top15Labels,
            datasets: [{
              label: 'Số lần về',
              data: top15Counts,
              backgroundColor: top15Labels.map((_, i) => i < 3 ? t.amber : t.jade),
              borderRadius: 5,
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 260 },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (c) => ` Xuất hiện: ${c.parsed.y} lần` } }
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: t.tick, font: { family: 'JetBrains Mono', weight: 'bold', size: 11 } } },
              y: { grid: { color: t.grid }, ticks: { color: t.tick, font: { family: 'JetBrains Mono', size: 11 }, stepSize: 1 }, beginAtZero: true }
            }
          }
        });
      }

      const ctxTrend = typeof document !== 'undefined' ? document.getElementById('chart-trend-canvas') : null;
      if (ctxTrend && typeof window !== 'undefined' && window.Chart) {
        this.destroyCanvasChart(ctxTrend);
        this.trendChartInstance = new window.Chart(ctxTrend, {
          type: 'line',
          data: {
            labels: top15Labels,
            datasets: [
              {
                label: 'Kỳ chưa về hiện tại',
                data: top15Gaps,
                borderColor: t.jade,
                backgroundColor: t.jadeSoft,
                borderWidth: 2.2,
                fill: true,
                tension: 0.32,
                pointBackgroundColor: t.jade,
                pointRadius: 3.5
              },
              {
                label: 'Chu kỳ trung bình',
                data: top15Cycles,
                borderColor: t.amber,
                borderDash: [5, 4],
                borderWidth: 2,
                fill: false,
                tension: 0.3,
                pointBackgroundColor: t.amber,
                pointRadius: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 260 },
            plugins: {
              legend: {
                display: true,
                labels: { color: t.legend, boxWidth: 12, font: { size: 11, family: 'Be Vietnam Pro', weight: '600' } }
              },
              tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y} kỳ` } }
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: t.tick, font: { family: 'JetBrains Mono', weight: 'bold', size: 11 } } },
              y: { grid: { color: t.grid }, ticks: { color: t.tick, font: { family: 'JetBrains Mono', size: 11 } }, beginAtZero: true }
            }
          }
        });
      }

      const ctxParity = typeof document !== 'undefined' ? document.getElementById('chart-donut-parity-canvas') : null;
      if (ctxParity && typeof window !== 'undefined' && window.Chart) {
        this.destroyCanvasChart(ctxParity);
        this.parityChartInstance = new window.Chart(ctxParity, {
          type: 'doughnut',
          data: {
            labels: ['Số chẵn', 'Số lẻ'],
            datasets: [{
              data: [evenPct, oddPct],
              backgroundColor: [t.indigo, t.neutralSlice],
              borderColor: t.cardBg,
              borderWidth: 3,
              hoverOffset: 3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1,
            animation: { duration: 260 },
            cutout: '70%',
            layout: { padding: 2 },
            plugins: {
              legend: { display: false }
            }
          }
        });
      }

      const ctxHighLow = typeof document !== 'undefined' ? document.getElementById('chart-donut-highlow-canvas') : null;
      if (ctxHighLow && typeof window !== 'undefined' && window.Chart) {
        this.destroyCanvasChart(ctxHighLow);
        this.highlowChartInstance = new window.Chart(ctxHighLow, {
          type: 'doughnut',
          data: {
            labels: ['Tài (Lớn)', 'Xỉu (Nhỏ)'],
            datasets: [{
              data: [highPct, lowPct],
              backgroundColor: [t.jade, t.neutralSlice],
              borderColor: t.cardBg,
              borderWidth: 3,
              hoverOffset: 3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1,
            animation: { duration: 260 },
            cutout: '70%',
            layout: { padding: 2 },
            plugins: {
              legend: { display: false }
            }
          }
        });
      }

      const ctxHeadTail = typeof document !== 'undefined' ? document.getElementById('chart-headtail-canvas') : null;
      if (ctxHeadTail && typeof window !== 'undefined' && window.Chart) {
        this.destroyCanvasChart(ctxHeadTail);
        this.headtailChartInstance = new window.Chart(ctxHeadTail, {
          type: 'bar',
          data: {
            labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            datasets: [
              {
                label: 'Đầu lô',
                data: headCounts,
                backgroundColor: t.amber,
                borderRadius: 4,
                borderWidth: 0
              },
              {
                label: 'Đuôi lô',
                data: tailCounts,
                backgroundColor: t.jade,
                borderRadius: 4,
                borderWidth: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 260 },
            plugins: {
              legend: {
                display: true,
                labels: { color: t.legend, boxWidth: 12, font: { size: 11, family: 'Be Vietnam Pro', weight: '600' } }
              },
              tooltip: { callbacks: { label: (c) => ` ${c.dataset.label} ${c.label}: ${c.parsed.y} lần` } }
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: t.tick, font: { family: 'JetBrains Mono', weight: 'bold', size: 11 } } },
              y: { grid: { color: t.grid }, ticks: { color: t.tick, font: { family: 'JetBrains Mono', size: 11 }, stepSize: 1 }, beginAtZero: true }
            }
          }
        });
      }
    }, 40);
  },

  /**
   * 5. Kết xuất Kết Quả Dò Số & Đối Soát 1 Kỳ (Backtest Results)
   */
  renderBacktestResult(result, isVietlott, containerId = 'backtest-result-container', contextInfo = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!result || !result.success) {
      const targetDate = (contextInfo && contextInfo.targetDate) || (result && result.targetDate) || '';
      const stationSlug = (contextInfo && contextInfo.stationOrGame) || (result && result.stationOrGame) || '';
      const readableName = stationSlug ? this.formatStationOrGame(stationSlug) : 'đài mở thưởng này';
      const scheduleText = stationSlug ? this.getScheduleDescription(stationSlug, isVietlott) : '';

      let dayLabel = '';
      if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        const [yy, mm, dd] = targetDate.split('-').map(Number);
        const dt = new Date(yy, mm - 1, dd);
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        if (!isNaN(dt.getTime())) {
          dayLabel = ` (${dayNames[dt.getDay()]}, ${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yy})`;
        }
      }

      const rangeHint = (contextInfo && contextInfo.oldestDate && contextInfo.latestDate)
        ? `Kho dữ liệu xác thực trên máy của <strong>${readableName}</strong> hiện lưu trữ từ ngày <strong>${contextInfo.oldestDate}</strong> đến <strong>${contextInfo.latestDate}</strong>.`
        : 'Bạn có thể chọn nhanh một kỳ mở thưởng hợp lệ có sẵn trong danh sách bên trên để đối soát tức thì.';

      const isInsufficientPrior = result && typeof result.message === 'string' && result.message.toLowerCase().includes('huấn luyện');
      const titleText = isInsufficientPrior
        ? `Kỳ Mở Thưởng Sớm Nhất Của ${readableName}`
        : `Chưa Có Bảng Mở Thưởng${dayLabel || (targetDate ? ` Ngày ${targetDate}` : '')}`;

      const bodyText = isInsufficientPrior
        ? `Ngày <strong>${targetDate}</strong> là kỳ đầu tiên trong kho lưu trữ nên không có kỳ quá khứ trước đó để huấn luyện mô hình (đảm bảo nguyên tắc 0% Lookahead Bias). ${rangeHint}`
        : `Không tìm thấy bảng kết quả của <strong>${readableName}</strong> vào ngày đã chọn. Ngày này có thể rơi vào thứ đài không mở thưởng hoặc nằm ngoài phạm vi lưu trữ hiện tại. ${rangeHint}`;

      container.innerHTML = `
        <div class="quant-card empty-state-editorial">
          <div class="empty-state-icon-ring" aria-hidden="true">
            <i class="fa-regular fa-calendar-xmark"></i>
          </div>
          <h3>${titleText}</h3>
          ${scheduleText ? `<div class="empty-state-schedule-pill"><i class="fa-regular fa-clock" style="color: var(--accent);" aria-hidden="true"></i> <span>Lịch mở thưởng định kỳ của <strong>${readableName}</strong>: <strong>${scheduleText}</strong></span></div>` : ''}
          <p>${bodyText}</p>
          <button type="button" class="btn-primary" onclick="const c=document.getElementById('backtest-custom-date');if(c)c.value='';const s=document.getElementById('backtest-date-select');if(s&&s.options.length>0){s.selectedIndex=0;s.dispatchEvent(new Event('change'));}">
            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
            <span>Dò ngay kỳ mở thưởng gần nhất</span>
          </button>
        </div>
      `;
      return;
    }

    const summary = result.summary;
    const actualDraw = result.actualDraw;
    const readableStation = this.formatStationOrGame(result.stationOrGame);

    let actualDisplay = '';
    if (isVietlott) {
      actualDisplay = (actualDraw.winningNumbers || []).map(b =>
        `<div class="lotto-ball gold">${String(b).padStart(2, '0')}</div>`
      ).join('');
    } else {
      const spFull = actualDraw.specialPrize || (actualDraw.prizes && actualDraw.prizes.special ? actualDraw.prizes.special[0] : '');
      const spTail = spFull && String(spFull).length >= 2 ? String(spFull).slice(-2) : '';
      actualDisplay = (actualDraw.lottoPairs || []).map((p, idx) => {
        const isSpecChip = idx === (actualDraw.lottoPairs.length - 1) && p === spTail;
        return `<span class="actual-round-chip ${isSpecChip ? 'is-special' : ''}" title="${isSpecChip ? '2 số cuối Giải Đặc Biệt' : '2 số cuối Lô tô'}">${p}</span>`;
      }).join('');
    }

    const trainStart = result.trainingDateRange && (result.trainingDateRange.from || result.trainingDateRange.start);
    const trainEnd = result.trainingDateRange && (result.trainingDateRange.to || result.trainingDateRange.end);
    const rangeLabel = (trainStart && trainStart !== 'N/A' && trainEnd && trainEnd !== 'N/A')
      ? ` &bull; Giai đoạn từ ${trainStart} đến ${trainEnd}`
      : '';

    const totalAlgoCount = Array.isArray(result.algoResults) ? result.algoResults.length : 8;
    const validAlgoCount = Array.isArray(result.algoResults) ? result.algoResults.filter(r => r.status === 'ok').length : totalAlgoCount;
    const avgFootnote = validAlgoCount === totalAlgoCount
      ? `Trung bình cộng trên cả ${totalAlgoCount} mô hình`
      : `Trung bình trên ${validAlgoCount}/${totalAlgoCount} mô hình hợp lệ`;

    const summaryKpisHtml = `
      <div class="kpi-summary-grid-3">
        <div class="kpi-stat-card kpi-gold">
          <div class="kpi-header-row"><span class="kpi-label">Mô hình dẫn đầu kỳ này</span><i class="fa-solid fa-crown kpi-icon"></i></div>
          <div class="kpi-value-row"><div class="kpi-value" style="font-size:18.5px; font-family:var(--font-sans); font-weight:700;">${summary.bestAlgo}</div></div>
          <div class="kpi-footnote">Đạt độ khớp cao nhất riêng kỳ ${result.targetDate}</div>
        </div>
        <div class="kpi-stat-card kpi-emerald">
          <div class="kpi-header-row"><span class="kpi-label">Tỷ lệ khớp cao nhất</span><i class="fa-solid fa-bullseye kpi-icon"></i></div>
          <div class="kpi-value-row"><div class="kpi-value kpi-val-emerald" style="font-size:28px;">${summary.bestHitRate}%</div></div>
          <div class="kpi-footnote">Tỷ lệ số dự báo trùng kết quả thực tế</div>
        </div>
        <div class="kpi-stat-card kpi-teal">
          <div class="kpi-header-row"><span class="kpi-label">Tỷ lệ khớp trung bình</span><i class="fa-solid fa-chart-simple kpi-icon"></i></div>
          <div class="kpi-value-row"><div class="kpi-value" style="font-size:28px; color:var(--accent);">${summary.averageHitRate}%</div></div>
          <div class="kpi-footnote">${avgFootnote}</div>
        </div>
      </div>

      <div class="backtest-meta-banner">
        <div>
          <i class="fa-solid fa-database" style="color: var(--accent); margin-right: 6px;"></i>
          <strong>Tập mẫu huấn luyện trước giờ quay:</strong> ${result.trainingDataCount} kỳ hợp lệ${rangeLabel}
        </div>
        <div class="tabular-numbers" style="font-size: 12px; color: var(--text-muted);">
          Kỳ đối chiếu: <strong>${result.targetDate}</strong> &bull; 0% Lookahead Bias
        </div>
      </div>
    `;

    const rowsHtml = result.algoResults.map(item => {
      if (item.status && item.status !== 'ok') {
        return `
          <tr>
            <td class="algo-name-cell" data-label="Mô hình định lượng">${item.algoName}</td>
            <td class="pred-chips-cell" data-label="Bộ số dự báo"><span class="meta-info-badge">Chưa đủ kỳ huấn luyện</span></td>
            <td class="tabular-numbers hit-count-cell" data-label="Số con trúng" style="text-align: center; color: var(--text-muted);"><span>—</span></td>
            <td class="tabular-numbers hit-rate-cell" data-label="Tỷ lệ khớp" style="text-align: center; color: var(--text-muted);"><span>—</span></td>
          </tr>
        `;
      }
      const predBadges = item.predictions.map(p => {
        const isHit = item.hitDetails.some(h => String(h.num) === String(p));
        const isSpec = item.hitDetails.some(h => String(h.num) === String(p) && h.isSpecial);
        let cls = 'lotto-chip';
        if (isSpec) cls += ' special-hit';
        else if (isHit) cls += ' hit';
        else cls += ' miss';
        return `<span class="${cls}">${isVietlott ? String(p).padStart(2, '0') : p}</span>`;
      }).join('');

      const hitRateStyle = item.hitRate >= 40
        ? 'color: var(--status-success-text);'
        : (item.hitRate > 0 ? 'color: var(--accent);' : 'color: var(--text-muted);');
      const barPct = Math.min(100, Math.max(0, Number(item.hitRate) || 0));

      return `
        <tr>
          <td class="algo-name-cell" data-label="Mô hình định lượng">${item.algoName}</td>
          <td class="pred-chips-cell" data-label="Bộ số dự báo">${predBadges}</td>
          <td class="tabular-numbers hit-count-cell" data-label="Số con trúng" style="text-align: center;">
            <span>${item.hitCount} / ${item.totalPredicted}${!isVietlott && item.totalOccurrences > item.hitCount ? `<span class="hit-extra">(${item.totalOccurrences} nháy)</span>` : ''}</span>
          </td>
          <td class="tabular-numbers hit-rate-cell" data-label="Tỷ lệ khớp" style="text-align: center; ${hitRateStyle}">
            <div class="hit-rate-cell-wrap">
              <span>${item.hitRate}%</span>
              <div class="hit-rate-bar-track" aria-hidden="true"><div class="hit-rate-bar-fill" style="width:${barPct}%;"></div></div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      ${summaryKpisHtml}

      <div class="quant-card" style="margin-bottom: 20px;">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Kết Quả Mở Thưởng Thực Tế Ngày ${result.targetDate}</h2>
          </div>
          <span class="meta-info-badge">${readableStation}</span>
        </div>
        <div class="actual-results-box">
          <div class="actual-chips-grid">
            ${actualDisplay}
          </div>
        </div>
      </div>

      <div class="quant-card">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Bảng Đối Soát Độ Chính Xác Từng Mô Hình</h2>
          </div>
          <span class="meta-info-badge">Xanh: Trúng lô &bull; Vàng: Trúng ĐB</span>
        </div>

        <div style="overflow-x: auto;">
          <table class="backtest-results-table">
            <thead>
              <tr>
                <th style="width: 30%;">Mô hình định lượng</th>
                <th style="width: 42%;">Bộ số dự báo trước giờ quay</th>
                <th style="width: 14%; text-align: center;">Số con trúng</th>
                <th style="width: 14%; text-align: center;">Tỷ lệ khớp</th>
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
   * 6. Kết xuất Bảng Xếp Hạng Hiệu Suất 8 Thuật Toán (Không trùng tiêu đề kép)
   */
  renderLeaderboard(batchResult, containerId = 'leaderboard-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!batchResult || batchResult.status === 'insufficient-data' || !batchResult.leaderboard || batchResult.leaderboard.length === 0 || batchResult.drawsTestedCount === 0) {
      container.innerHTML = `
        <div class="quant-card" style="text-align: center; padding: 40px 24px;">
          <div style="font-size: 30px; margin-bottom: 10px; color: var(--accent-amber);"><i class="fa-solid fa-chart-line"></i></div>
          <h3 style="margin-bottom: 6px;">Chưa Đủ Dữ Liệu Đánh Giá Xếp Hạng Nhiều Kỳ</h3>
          <p style="color: var(--text-secondary); max-width: 560px; margin: 0 auto; font-size: 13.5px;">
            Cần tối thiểu các kỳ mở thưởng quá khứ hợp lệ để chạy kiểm định Walk-Forward công bằng. Hệ thống không gán hạng giả khi thiếu dữ liệu.
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
      <div class="top1-summary-banner">
        <div class="top1-banner-top">
          <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 10px;">
            <span class="top1-crown-pill" data-rank-badge="TOP 1 LEADERBOARD"><i class="fa-solid fa-crown" aria-hidden="true"></i> Quán quân ${batchResult.drawsTestedCount} kỳ</span>
            <h3 class="top1-algo-title">${top1.name}</h3>
          </div>
          <div class="top1-metrics-inline">
            <span>Trúng TB: <strong style="color: var(--accent-emerald); font-size: 15px;">${top1.avgHitRate}%</strong></span>
            <span class="metric-sep" aria-hidden="true">&bull;</span>
            <span>So với ngẫu nhiên: <strong style="color: ${top1.baselineDiff >= 0 ? 'var(--accent)' : 'var(--danger)'};">${top1.baselineDiff >= 0 ? '+' : ''}${top1.baselineDiff}%</strong></span>
            <span class="metric-sep" aria-hidden="true">&bull;</span>
            <span>Chuẩn ngẫu nhiên: <strong>${baselineHitRate}%</strong> (${batchResult.drawsTestedCount} kỳ)</span>
          </div>
        </div>
        <div class="top1-banner-note">
          Đánh giá ngoài mẫu liên tiếp (Walk-Forward Validation) trên ${batchResult.drawsTestedCount} kỳ mở thưởng gần nhất, đối chiếu trực tiếp với kỳ vọng ngẫu nhiên (Random Baseline).
        </div>
      </div>
    `;

    const maxAvgRate = Math.max(25, ...batchResult.leaderboard.map(x => Number(x.avgHitRate) || 0));
    const rowsHtml = batchResult.leaderboard.map((item, idx) => {
      const rankNum = item.rank || (idx + 1);
      const hasFolds = item.foldsSucceeded === undefined || item.foldsSucceeded > 0;
      let rankBadgeHtml = `<span class="rank-badge">#${rankNum}</span>`;
      let rowCls = '';
      if (idx === 0 && hasFolds) {
        rankBadgeHtml = `<span class="rank-badge rank-1">🥇 Hạng 1</span>`;
        rowCls = 'row-rank-1';
      } else if (idx === 1 && hasFolds) {
        rankBadgeHtml = `<span class="rank-badge">🥈 Hạng 2</span>`;
      } else if (idx === 2 && hasFolds) {
        rankBadgeHtml = `<span class="rank-badge">🥉 Hạng 3</span>`;
      }

      if (!hasFolds) {
        return `
          <tr>
            <td class="lb-rank-cell" data-label="Xếp hạng">${rankBadgeHtml}</td>
            <td class="lb-name-cell" data-label="Mô hình thuật toán" style="font-weight: 700;">${item.name}</td>
            <td class="tabular-numbers lb-avg-cell" data-label="Tỷ lệ trúng TB" style="color: var(--text-muted);"><span>—</span></td>
            <td class="tabular-numbers lb-diff-cell" data-label="So với chuẩn" style="color: var(--text-muted);"><span>—</span></td>
            <td class="tabular-numbers lb-best-cell" data-label="Kỷ lục 1 kỳ" style="color: var(--text-muted);"><span>—</span></td>
            <td class="tabular-numbers lb-hits-cell" data-label="Tổng con trúng" style="color: var(--text-muted);"><span>0 (chưa đủ kỳ)</span></td>
            <td class="tabular-numbers lb-spec-cell" data-label="Trúng ĐB" style="color: var(--text-muted);"><span>0 lần</span></td>
            <td class="lb-status-cell" data-label="Đánh giá"><span class="status-badge badge-neutral">Chưa đủ mẫu</span></td>
          </tr>
        `;
      }

      const diffSign = item.baselineDiff >= 0 ? '+' : '';
      const diffColor = item.baselineDiff >= 0 ? 'var(--accent-emerald)' : 'var(--danger)';
      const avgBarWidth = Math.min(100, Math.round(((Number(item.avgHitRate) || 0) / maxAvgRate) * 100));

      return `
        <tr class="${rowCls}">
          <td class="lb-rank-cell" data-label="Xếp hạng">${rankBadgeHtml}</td>
          <td class="lb-name-cell" data-label="Mô hình thuật toán" style="font-weight: 700;">${item.name}</td>
          <td class="tabular-numbers lb-avg-cell" data-label="Tỷ lệ trúng TB" style="font-weight: 700; color: var(--accent-emerald);">
            <div class="hit-rate-cell-wrap" style="align-items: flex-start;">
              <span>${item.avgHitRate}%</span>
              <div class="hit-rate-bar-track" aria-hidden="true"><div class="hit-rate-bar-fill" style="width:${avgBarWidth}%;"></div></div>
            </div>
          </td>
          <td class="tabular-numbers lb-diff-cell" data-label="So với chuẩn" style="font-weight: 700; color: ${diffColor};"><span>${diffSign}${item.baselineDiff}%</span></td>
          <td class="tabular-numbers lb-best-cell" data-label="Kỷ lục 1 kỳ" style="color: var(--accent-amber); font-weight: 700;"><span>${item.bestHitRate}%</span></td>
          <td class="tabular-numbers lb-hits-cell" data-label="Tổng con trúng"><span>${item.totalHits} (${item.totalOccurrences} nháy)</span></td>
          <td class="tabular-numbers lb-spec-cell" data-label="Trúng ĐB"><span>${item.specialMatches || 0} lần</span></td>
          <td class="lb-status-cell" data-label="Đánh giá">${item.exceedsBaseline
            ? '<span class="status-badge badge-success">✓ Vượt trội</span>'
            : '<span class="status-badge badge-neutral">Dưới chuẩn</span>'}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="quant-card">
        ${top1SummaryHtml}
        <div style="overflow-x: auto;">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th style="width: 96px;">Xếp hạng</th>
                <th>Mô hình thuật toán</th>
                <th>Tỷ lệ trúng TB</th>
                <th>So với chuẩn</th>
                <th>Kỷ lục 1 kỳ</th>
                <th>Tổng con trúng</th>
                <th>Trúng ĐB</th>
                <th>Đánh giá</th>
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
   * 7. Modal Đồng Bộ Dữ Liệu (Hỗ trợ đóng bằng Escape / Backdrop & trả Focus)
   */
  _crawlCloseable: false,

  showCrawlModal() {
    const overlay = document.getElementById('crawl-modal-overlay');
    if (!overlay) return;
    this._crawlCloseable = false;
    overlay.style.display = 'flex';
    if (document.body && document.body.style) document.body.style.overflow = 'hidden';

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
    if (stepEl) stepEl.innerText = 'Đang kết nối nguồn dữ liệu...';
    if (logsEl) logsEl.innerHTML = `<div class="term-line info"><span class="term-time">[${new Date().toLocaleTimeString()}]</span> Khởi động tiến trình đồng bộ kho lịch sử...</div>`;
    if (summary) summary.style.display = 'none';
    if (btnAction) btnAction.style.display = 'none';
    if (btnClose) btnClose.style.display = 'inline-flex';
    if (pulse) pulse.innerHTML = '<span class="pulse-dot"></span> Đang xử lý';
    this._crawlCloseable = true;
    if (btnClose && typeof btnClose.focus === 'function') {
      setTimeout(() => { try { btnClose.focus(); } catch (e) {} }, 30);
    }
  },

  updateCrawlProgress({ percent, title, detail }) {
    const barFill = document.getElementById('crawl-progress-bar-fill');
    const percentEl = document.getElementById('crawl-progress-percent');
    const stepEl = document.getElementById('crawl-progress-step-text');
    const logsEl = document.getElementById('crawl-terminal-logs');

    if (barFill) barFill.style.width = `${percent}%`;
    if (percentEl) percentEl.innerText = `${percent}%`;
    if (stepEl && title) stepEl.innerText = title;

    if (logsEl && detail) {
      const line = document.createElement('div');
      line.className = 'term-line ' + (percent === 100 ? 'success' : 'active');
      line.innerHTML = `<span class="term-time">[${new Date().toLocaleTimeString()}]</span> ${detail}`;
      logsEl.appendChild(line);
      logsEl.scrollTop = logsEl.scrollHeight;
    }
  },

  finishCrawlModal(stats) {
    this._crawlCloseable = true;
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
    if (stepEl) stepEl.innerText = 'Hoàn tất đồng bộ và cập nhật 8 mô hình!';
    if (pulse) pulse.innerHTML = '<span style="color: #34D399; font-weight: 700;">✓ Đã hoàn thành</span>';

    if (smXSMN && stats) smXSMN.innerText = `${stats.totalXSMN} Kỳ`;
    if (smVietlott && stats) smVietlott.innerText = `${stats.totalMega + stats.totalPower} Kỳ`;

    if (summary) summary.style.display = 'block';
    if (btnAction) {
      btnAction.style.display = 'inline-flex';
      if (typeof btnAction.focus === 'function') {
        setTimeout(() => { try { btnAction.focus(); } catch (e) {} }, 30);
      }
    }
    if (btnClose) btnClose.style.display = 'inline-flex';
  },

  hideCrawlModal() {
    const overlay = document.getElementById('crawl-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    if (document.body && document.body.style) document.body.style.overflow = '';
    const triggerBtn = document.getElementById('btn-crawl-full');
    if (triggerBtn && typeof triggerBtn.focus === 'function') {
      try { triggerBtn.focus(); } catch (e) {}
    }
  },

  updateDataVolumeBadge(stats) {
    if (!stats) return;
    const badge = document.getElementById('total-draws-count-badge');
    if (badge) {
      badge.innerText = `21 Đài XSMN • Vietlott (${stats.totalCount} kỳ xác thực)`;
    }
    const statusText = document.getElementById('crawler-status-text');
    if (statusText) {
      statusText.innerText = `Đã chuẩn hóa ${stats.totalCount} kỳ mở thưởng`;
    }
  }
};
