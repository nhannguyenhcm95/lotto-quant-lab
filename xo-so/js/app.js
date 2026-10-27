/**
 * LOTTO-QUANT LAB: MAIN APPLICATION
 * Khởi tạo ứng dụng, lắng nghe sự kiện người dùng và điều phối luồng dữ liệu
 */

import { LOTTO_CONFIG } from './config.js';
import { DataService } from './data-service.js';
import { EnsembleAlgorithm } from './algorithms/ensemble.js';
import { FrequencyGapAlgorithm } from './algorithms/frequency-gap.js';
import { ClusteringAlgorithm } from './algorithms/clustering.js';
import { AssociationRulesAlgorithm } from './algorithms/association-rules.js';
import { BacktestEngine } from './backtest-engine.js';
import { UIController } from './ui-controller.js?v=6.1';

class LottoQuantApp {
  constructor() {
    this.currentMode = 'xsmn'; // 'xsmn' | 'vietlott'
    this.currentStation = 'tphcm';
    this.currentVietlottGame = 'mega-6-45';
    this.activeTab = 'live'; // 'live' | 'predict' | 'backtest' | 'leaderboard' | 'docs'

    // Hỗ trợ tham số URL: ?station=an-giang hoặc ?mode=vietlott
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('station')) this.currentStation = urlParams.get('station');
      if (urlParams.get('mode')) this.currentMode = urlParams.get('mode');
      if (urlParams.get('game')) this.currentVietlottGame = urlParams.get('game');
    } catch (e) {}
  }

  async init() {
    console.log(`[${LOTTO_CONFIG.APP_NAME}] Đang khởi động hệ thống v${LOTTO_CONFIG.VERSION}...`);

    // 1. Nạp dữ liệu cơ sở & đối soát tệp hạt giống mới nhất
    await DataService.init();

    // 2. TỰ ĐỘNG ĐỒNG BỘ REAL-TIME TỪ MINH NGỌC NGAY KHI MỞ TRANG (Người dùng không cần bấm gì)
    try {
      await DataService.syncLiveMinhNgoc();
    } catch (e) {
      console.warn('Đồng bộ ban đầu tiếp tục với cache tươi:', e);
    }
    this.updateStatusIndicator();
    UIController.updateDataVolumeBadge(DataService.getTotalStats());

    // 3. Khởi tạo dropdowns và cấu hình
    this.populateStationDropdown();
    this.setupEventListeners();

    // 4. Hiển thị dữ liệu mặc định mới nhất
    this.refreshCurrentView();

    // 5. Nạp sẵn danh sách ngày cho bộ chọn dò số
    this.populateBacktestDates();

    // 6. Kiểm tra hash điều hướng trực tiếp
    this.checkInitialHash();

    // 7. Kích hoạt chu kỳ tự động cập nhật ngầm liên tục mỗi 30 giây (hoàn toàn tự động)
    this.startRealtimeSync();
  }

  startRealtimeSync() {
    if (this._syncInterval) clearInterval(this._syncInterval);
    this._syncInterval = setInterval(async () => {
      try {
        const res = await DataService.syncLiveMinhNgoc();
        this.updateStatusIndicator();
        if (res && res.updatedCount > 0) {
          this.populateBacktestDates();
          this.refreshCurrentView();
        }
      } catch (err) {
        console.warn('Lỗi định kỳ auto sync:', err);
      }
    }, 30000);
  }

  checkInitialHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['live', 'predict', 'dashboard', 'backtest', 'leaderboard', 'docs'].includes(hash)) {
      const tabBtn = document.querySelector(`.nav-tab-btn[data-tab="${hash}"]`);
      if (tabBtn) {
        document.querySelectorAll('.nav-tab-btn').forEach(t => t.classList.remove('active'));
        tabBtn.classList.add('active');
        this.switchTab(hash);
      }
    }
  }

  updateStatusIndicator() {
    const statusText = document.getElementById('crawler-status-text');
    if (statusText) {
      statusText.innerText = DataService.syncStatus || 'Đã đồng bộ kết quả Minh Ngọc';
    }
  }

  populateStationDropdown() {
    const select = document.getElementById('station-select');
    const pillsContainer = document.getElementById('stations-pills-container');
    const todayHighlight = document.getElementById('today-station-text');

    if (select) {
      select.innerHTML = '';
      LOTTO_CONFIG.ALL_STATIONS.forEach(st => {
        const opt = document.createElement('option');
        opt.value = st.id;
        opt.textContent = st.name;
        if (st.id === this.currentStation) opt.selected = true;
        select.appendChild(opt);
      });
    }

    const todayDay = new Date().getDay(); // 0: CN, 1: T2, ..., 5: T6, 6: T7
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const todayStations = LOTTO_CONFIG.XSMN_SCHEDULE[todayDay] || [];
    const todayStationIds = todayStations.map(s => s.id);

    // Nạp đài hôm nay vào cụm nút 1 chạm trên thanh điều khiển
    const todayFastPills = document.getElementById('today-fast-pills');
    if (todayFastPills) {
      todayFastPills.innerHTML = '';
      todayStations.forEach(st => {
        const btn = document.createElement('button');
        const isActive = st.id === this.currentStation;
        btn.type = 'button';
        btn.className = `today-fast-pill-btn ${isActive ? 'active' : ''}`;
        btn.innerHTML = `<span class="station-today-dot"></span> <span>${st.name}</span>`;
        btn.addEventListener('click', () => {
          this.currentStation = st.id;
          if (select) select.value = st.id;
          document.querySelectorAll('.today-fast-pill-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.querySelectorAll('.station-pill-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.stationId === st.id);
          });
          this.populateBacktestDates();
          this.refreshCurrentView();
        });
        todayFastPills.appendChild(btn);
      });
    }

    if (todayHighlight) {
      todayHighlight.innerHTML = `Hôm Nay (${dayNames[todayDay]}):`;
    }

    if (pillsContainer) {
      pillsContainer.innerHTML = '';
      LOTTO_CONFIG.ALL_STATIONS.forEach(st => {
        const btn = document.createElement('button');
        const isToday = todayStationIds.includes(st.id);
        const isActive = st.id === this.currentStation;
        btn.className = `station-pill-btn ${isActive ? 'active' : ''} ${isToday ? 'today-live' : ''}`;
        btn.dataset.stationId = st.id;
        btn.innerHTML = `
          ${isToday ? '<span class="station-today-dot"></span>' : ''}
          <span>${st.name}</span>
          ${isToday ? '<span style="font-size: 11.5px; background: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; padding: 1px 6px; border-radius: 4px; font-weight: 700;">Hôm nay</span>' : ''}
        `;

        btn.addEventListener('click', () => {
          this.currentStation = st.id;
          if (select) select.value = st.id;
          document.querySelectorAll('.station-pill-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.querySelectorAll('.today-fast-pill-btn').forEach(b => {
            b.classList.toggle('active', b.textContent.includes(st.name));
          });
          this.populateBacktestDates();
          this.refreshCurrentView();
        });

        pillsContainer.appendChild(btn);
      });
    }
  }

  setupEventListeners() {
    // 1. Chuyển đổi XSMN vs Vietlott
    const btnXsmn = document.getElementById('mode-btn-xsmn');
    const btnVietlott = document.getElementById('mode-btn-vietlott');
    const stationFilterWrapper = document.getElementById('station-filter-wrapper');
    const vietlottFilterWrapper = document.getElementById('vietlott-filter-wrapper');
    const xsmnStationsBar = document.getElementById('xsmn-stations-bar');

    if (btnXsmn && btnVietlott) {
      if (this.currentMode === 'vietlott') {
        btnVietlott.classList.add('active');
        btnXsmn.classList.remove('active');
        if (stationFilterWrapper) stationFilterWrapper.style.display = 'none';
        if (xsmnStationsBar) xsmnStationsBar.style.display = 'none';
        if (vietlottFilterWrapper) vietlottFilterWrapper.style.display = 'flex';
        const vietlottSelect = document.getElementById('vietlott-select');
        if (vietlottSelect) vietlottSelect.value = this.currentVietlottGame;
      } else {
        btnXsmn.classList.add('active');
        btnVietlott.classList.remove('active');
        if (stationFilterWrapper) stationFilterWrapper.style.display = 'flex';
        if (xsmnStationsBar) xsmnStationsBar.style.display = 'none';
        if (vietlottFilterWrapper) vietlottFilterWrapper.style.display = 'none';
      }

      btnXsmn.addEventListener('click', () => {
        this.currentMode = 'xsmn';
        btnXsmn.classList.add('active');
        btnVietlott.classList.remove('active');
        if (stationFilterWrapper) stationFilterWrapper.style.display = 'flex';
        if (xsmnStationsBar) xsmnStationsBar.style.display = 'none';
        if (vietlottFilterWrapper) vietlottFilterWrapper.style.display = 'none';
        this.populateBacktestDates();
        this.refreshCurrentView();
      });

      btnVietlott.addEventListener('click', () => {
        this.currentMode = 'vietlott';
        btnVietlott.classList.add('active');
        btnXsmn.classList.remove('active');
        if (stationFilterWrapper) stationFilterWrapper.style.display = 'none';
        if (xsmnStationsBar) xsmnStationsBar.style.display = 'none';
        if (vietlottFilterWrapper) vietlottFilterWrapper.style.display = 'flex';
        const vietlottSelect = document.getElementById('vietlott-select');
        if (vietlottSelect) vietlottSelect.value = this.currentVietlottGame;
        this.populateBacktestDates();
        this.refreshCurrentView();
      });
    }

    // 2. Thay đổi đài XSMN
    const stationSelect = document.getElementById('station-select');
    if (stationSelect) {
      stationSelect.addEventListener('change', (e) => {
        this.currentStation = e.target.value;
        document.querySelectorAll('.station-pill-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.stationId === this.currentStation);
        });
        this.populateBacktestDates();
        this.refreshCurrentView();
      });
    }

    // 3. Thay đổi loại vé Vietlott (Hỗ trợ nút bấm 1 chạm & select)
    const vietlottSelect = document.getElementById('vietlott-select');
    const quickMega = document.getElementById('quick-btn-mega');
    const quickPower = document.getElementById('quick-btn-power');

    const setVietlottGame = (game) => {
      this.currentVietlottGame = game;
      if (vietlottSelect) vietlottSelect.value = game;
      if (quickMega && quickPower) {
        quickMega.classList.toggle('active', game === 'mega-6-45');
        quickPower.classList.toggle('active', game === 'power-6-55');
      }
      this.populateBacktestDates();
      this.refreshCurrentView();
    };

    if (quickMega) {
      quickMega.addEventListener('click', () => setVietlottGame('mega-6-45'));
    }
    if (quickPower) {
      quickPower.addEventListener('click', () => setVietlottGame('power-6-55'));
    }

    if (vietlottSelect) {
      vietlottSelect.addEventListener('change', (e) => setVietlottGame(e.target.value));
    }

    // 4. Chuyển đổi các Tab chính (Navigation Tabs)
    const navTabs = document.querySelectorAll('.nav-tab-btn');
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        navTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetPanel = tab.getAttribute('data-tab');
        window.location.hash = targetPanel;
        this.switchTab(targetPanel);
      });
    });

    // 5. Nút Đồng bộ dữ liệu trực tiếp nhanh từ Minh Ngọc
    const btnSync = document.getElementById('btn-sync-live');
    if (btnSync) {
      btnSync.addEventListener('click', async () => {
        btnSync.disabled = true;
        btnSync.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang cào...';
        await DataService.syncLiveMinhNgoc();
        this.updateStatusIndicator();
        UIController.updateDataVolumeBadge(DataService.getTotalStats());
        this.populateBacktestDates();
        this.refreshCurrentView();
        btnSync.disabled = false;
        btnSync.innerHTML = '<i class="fa fa-arrows-rotate"></i> Cập nhật';
      });
    }

    // 5.1. Nút TỰ ĐỘNG CÀO TOÀN BỘ DỮ LIỆU MINH NGỌC & TÁI DỰ ĐOÁN
    const btnCrawlFull = document.getElementById('btn-crawl-full');
    if (btnCrawlFull) {
      btnCrawlFull.addEventListener('click', async () => {
        await this.triggerFullCrawlAndRepredict();
      });
    }

    const btnCloseModal = document.getElementById('btn-close-crawl-modal');
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => {
        UIController.hideCrawlModal();
      });
    }

    const btnModalAction = document.getElementById('btn-crawl-modal-action');
    if (btnModalAction) {
      btnModalAction.addEventListener('click', () => {
        UIController.hideCrawlModal();
        const target = document.getElementById('panel-live') || document.querySelector('.hero-prediction-card');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // 6. Nút Thực thi Dò Số Lịch Sử (Run Backtest)
    const btnRunBacktest = document.getElementById('btn-run-backtest');
    if (btnRunBacktest) {
      btnRunBacktest.addEventListener('click', () => {
        this.executeBacktest();
      });
    }

    const backtestDateSelect = document.getElementById('backtest-date-select');
    if (backtestDateSelect) {
      backtestDateSelect.addEventListener('change', () => {
        const customDate = document.getElementById('backtest-custom-date');
        if (customDate) customDate.value = '';
        this.executeBacktest();
      });
    }

    const backtestCustomDate = document.getElementById('backtest-custom-date');
    if (backtestCustomDate) {
      backtestCustomDate.addEventListener('change', () => {
        this.executeBacktest();
      });
    }

    // 7. Nút Chạy Bảng Xếp Hạng Hàng Loạt
    const btnRunLeaderboard = document.getElementById('btn-run-leaderboard');
    if (btnRunLeaderboard) {
      btnRunLeaderboard.addEventListener('click', () => {
        this.executeLeaderboard();
      });
    }

    window.lottoApp = this;
  }

  // Tự động cào toàn bộ dữ liệu từ Minh Ngọc và tái huấn luyện 8 mô hình dự đoán AI
  async triggerFullCrawlAndRepredict() {
    UIController.showCrawlModal();
    try {
      const stats = await DataService.crawlFullHistory((progress) => {
        UIController.updateCrawlProgress(progress);
      });

      // Cập nhật lại toàn bộ chỉ số và thông tin
      this.updateStatusIndicator();
      UIController.updateDataVolumeBadge(DataService.getTotalStats());
      this.populateBacktestDates();

      // DÙNG CÁC THUẬT TOÁN ĐỂ DỰ ĐOÁN LẠI TRÊN DỮ LIỆU MỚI NHẤT
      this.refreshCurrentView();

      UIController.finishCrawlModal(stats);
    } catch (err) {
      console.error('Lỗi khi cào dữ liệu toàn bộ:', err);
      UIController.updateCrawlProgress({
        percent: 100,
        title: 'Hoàn tất với dữ liệu hiện có',
        detail: 'Đã hoàn tất đồng bộ cơ sở dữ liệu: ' + (err.message || err)
      });
      this.refreshCurrentView();
      UIController.finishCrawlModal(DataService.getTotalStats());
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.tab-view-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    // Đồng bộ trạng thái active trên thanh navigation tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    try { window.location.hash = tabId; } catch (e) {}

    if (tabId === 'predict') {
      this.runAndRenderPredictions();
    } else if (tabId === 'dashboard') {
      this.renderDashboard();
    } else if (tabId === 'leaderboard') {
      this.executeLeaderboard();
    }
  }

  // Sinh và quản lý Canonical Prediction Result thống nhất tuyệt đối giữa Hero Card, Ensemble Card và Chart
  getOrComputeCanonicalPrediction(forceNew = false) {
    const isVietlott = this.currentMode === 'vietlott';
    const gameOrStation = isVietlott ? this.currentVietlottGame : this.currentStation;
    
    // Đọc lịch sử với số kỳ chuẩn hóa đồng bộ 50 kỳ
    const history = isVietlott 
      ? DataService.getVietlottDraws(this.currentVietlottGame, 50)
      : DataService.getXSMNDraws(this.currentStation, 50);

    if (!history || !Array.isArray(history) || history.length === 0) {
      return {
        status: 'insufficient-data',
        key: 'insufficient-data',
        predictionRunId: 'insufficient_data',
        fingerprint: 'empty',
        gameType: gameOrStation,
        isVietlott,
        predictions: [],
        rawResult: {
          status: 'insufficient-data',
          predictions: [],
          scores: {}
        }
      };
    }

    const latestDraw = history[0];
    const targetInfo = this.calculateNextDrawInfo(this.currentMode, gameOrStation, latestDraw);

    // Tính mã vân tay ổn định (Fingerprint) của toàn bộ tập dữ liệu lịch sử được dùng
    const summaryStr = history.map(d => `${d.date}_${d.drawId || ''}_${Array.isArray(d.winningNumbers) ? d.winningNumbers.join('-') : (d.specialPrize || '')}`).join('|');
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < summaryStr.length; i++) {
      const ch = summaryStr.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const historyFingerprint = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);

    const algoVersion = LOTTO_CONFIG.VERSION || '6.0.0';
    const cacheKey = `${this.currentMode}_${gameOrStation}_${latestDraw?.date}_${targetInfo.nextDate}_v${algoVersion}_${historyFingerprint}`;

    if (!forceNew && this.canonicalPredictionCache && this.canonicalPredictionCache.key === cacheKey) {
      return this.canonicalPredictionCache;
    }

    const totalBalls = isVietlott 
      ? LOTTO_CONFIG.VIETLOTT_GAMES[this.currentVietlottGame].totalBalls 
      : 99;
    const topN = isVietlott ? 6 : 5;

    // Seed xác định theo key để đảm bảo 100% tái lập
    let seed = 123456789;
    if (latestDraw && latestDraw.date) {
      const s = `${latestDraw.date}_${latestDraw.drawId || ''}_${gameOrStation}_${historyFingerprint}`;
      let h = 0;
      for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
      seed = Math.abs(h) || 123456789;
    }

    const rawResult = EnsembleAlgorithm.predict(history, {
      isVietlott,
      totalBalls,
      topN,
      seed,
      stationOrGame: gameOrStation,
      targetDrawDate: targetInfo.nextDate
    });

    // Chuẩn hóa và sort tăng dần một lần duy nhất ở canonical layer
    let canonicalPredictions = rawResult.predictions || [];
    if (isVietlott) {
      canonicalPredictions = canonicalPredictions
        .map(n => Number(n))
        .filter(n => !isNaN(n) && Number.isInteger(n) && n >= 1 && n <= totalBalls);
      canonicalPredictions = Array.from(new Set(canonicalPredictions)).sort((a, b) => a - b);
    } else {
      canonicalPredictions = canonicalPredictions.map(n => String(n).padStart(2, '0'));
    }

    const canonicalResult = {
      key: cacheKey,
      fingerprint: historyFingerprint,
      algoVersion,
      predictionRunId: `pred_${Date.now()}_${seed % 100000}`,
      gameType: gameOrStation,
      isVietlott,
      trainedThroughDate: latestDraw ? latestDraw.date : null,
      targetDrawDate: targetInfo.nextDate,
      targetDayOfWeek: targetInfo.nextDayName,
      targetInfo,
      predictions: canonicalPredictions,
      rawResult: {
        ...rawResult,
        predictions: canonicalPredictions
      }
    };

    this.canonicalPredictionCache = canonicalResult;
    return canonicalResult;
  }

  refreshCurrentView() {
    this.canonicalPredictionCache = null; // Invalidate cache khi refresh
    const isVietlott = this.currentMode === 'vietlott';
    const history = isVietlott 
      ? DataService.getVietlottDraws(this.currentVietlottGame, 50)
      : DataService.getXSMNDraws(this.currentStation, 50);

    const latestDraw = history[0];
    const canonical = this.getOrComputeCanonicalPrediction();
    const targetInfo = canonical.targetInfo;

    // Hero Prediction Card nhận chung kết quả từ canonical
    UIController.renderLiveResult(latestDraw, isVietlott, 'live-result-container', canonical.rawResult, targetInfo);
    this.updateKPISummary(history, latestDraw, isVietlott);

    // Hiển thị liền mạch toàn bộ các section trên 1 trang cuộn (Single-Page All-in-One)
    this.runAndRenderPredictions();
    this.renderDashboard();

    // Tự động nạp bảng xếp hạng và chuẩn bị dò số kỳ gần nhất
    setTimeout(() => {
      this.executeLeaderboard();
      const backtestSelect = document.getElementById('backtest-date-select');
      if (backtestSelect && backtestSelect.value) {
        this.executeBacktest();
      }
    }, 60);
  }

  updateKPISummary(history, latestDraw, isVietlott) {
    const kpiDrawsCount = document.getElementById('kpi-draws-count');
    const kpiConfidenceVal = document.getElementById('kpi-confidence-val');
    const kpiTopHitrate = document.getElementById('kpi-top-hitrate');
    const kpiTopAlgoName = document.getElementById('kpi-top-algo-name');
    const kpiJackpotLabel = document.getElementById('kpi-jackpot-label');
    const kpiJackpotVal = document.getElementById('kpi-jackpot-val');
    const kpiJackpotSub = document.getElementById('kpi-jackpot-sub');

    if (kpiDrawsCount) {
      kpiDrawsCount.innerText = `${history.length || 0} Kỳ`;
    }

    // Mức đồng thuận mô hình: lấy từ kết quả Ensemble thật, không gán số giả
    const kpiConsensusSub = document.getElementById('kpi-consensus-sub');
    if (kpiConfidenceVal) {
      if (this.lastEnsembleResult && this.lastEnsembleResult.metrics) {
        kpiConfidenceVal.innerText = this.lastEnsembleResult.metrics.consensusRatio || '---';
        if (kpiConsensusSub) {
          const used = this.lastEnsembleResult.metrics.totalAlgorithmsUsed || this.lastEnsembleResult.metrics.totalAlgorithmsCombined || 7;
          const expected = this.lastEnsembleResult.metrics.totalAlgorithmsExpected || 7;
          kpiConsensusSub.innerText = `${used}/${expected} mô hình tham gia • Không phải xác suất trúng`;
        }
      } else {
        kpiConfidenceVal.innerText = 'Đang tính...';
      }
    }

    // Thuật toán dẫn đầu & Tỷ lệ trúng: lấy từ Bảng xếp hạng kiểm định 20 kỳ thật
    if (kpiTopHitrate && kpiTopAlgoName) {
      if (this.lastLeaderboardResult && this.lastLeaderboardResult.leaderboard && this.lastLeaderboardResult.leaderboard.length) {
        const top = this.lastLeaderboardResult.leaderboard[0];
        kpiTopHitrate.innerText = `${top.avgHitRate}%`;
        kpiTopAlgoName.innerText = top.name;
      } else {
        kpiTopHitrate.innerText = '---';
        kpiTopAlgoName.innerText = 'Đang kiểm định 20 kỳ...';
      }
    }

    if (latestDraw) {
      if (isVietlott) {
        const isMega = this.currentVietlottGame === 'mega-6-45';
        if (kpiJackpotLabel) kpiJackpotLabel.innerText = isMega ? 'Ước Tính Giải Jackpot' : 'Ước Tính Jackpot 1';
        if (kpiJackpotVal) {
          let jVal = latestDraw.jackpotEst || latestDraw.estimatedJackpot || null;
          if (jVal) {
            jVal = String(jVal).replace(/[đ₫\s]+$/gi, '').trim() + ' ₫';
            kpiJackpotVal.innerText = jVal;
            kpiJackpotVal.style.color = 'var(--accent)';
          } else {
            kpiJackpotVal.innerText = 'Đang cập nhật';
            kpiJackpotVal.style.color = 'var(--text-muted)';
          }
        }
        if (kpiJackpotSub) {
          const gName = LOTTO_CONFIG.VIETLOTT_GAMES[this.currentVietlottGame]?.name || 'Vietlott';
          const cleanId = latestDraw.drawId ? (latestDraw.drawId.startsWith('#') ? latestDraw.drawId : '#' + latestDraw.drawId) : '---';
          kpiJackpotSub.innerText = `${gName} ${cleanId} • ${latestDraw.date || ''}`;
        }
      } else {
        if (kpiJackpotLabel) kpiJackpotLabel.innerText = 'Giải Đặc Biệt Gần Nhất';
        if (kpiJackpotVal) {
          const sp = latestDraw.specialPrize || (latestDraw.prizes && latestDraw.prizes.special ? latestDraw.prizes.special[0] : null);
          if (sp) {
            kpiJackpotVal.innerText = sp;
            kpiJackpotVal.style.color = 'var(--accent)';
          } else {
            kpiJackpotVal.innerText = 'Đang cập nhật';
            kpiJackpotVal.style.color = 'var(--text-muted)';
          }
        }
        if (kpiJackpotSub) {
          const stObj = LOTTO_CONFIG.ALL_STATIONS.find(s => s.id === this.currentStation);
          const stName = stObj ? stObj.name : this.currentStation;
          kpiJackpotSub.innerText = `Đài ${stName} • ${latestDraw.date || ''}`;
        }
      }

      // Cập nhật giá trị hiển thị trên 2 nút Vietlott nhanh
      const formatShortJackpot = (val) => {
        if (!val) return '';
        const num = parseInt(String(val).replace(/[^\d]/g, ''), 10);
        if (!isNaN(num) && num >= 1e9) {
          return `~${(num / 1e9).toFixed(1)} Tỷ ₫`;
        }
        return val;
      };

      const vMegaJp = document.getElementById('v-quick-mega-jackpot');
      const vPowerJp = document.getElementById('v-quick-power-jackpot');
      if (vMegaJp) {
        const megaDraw = DataService.getVietlottDraws('mega-6-45', 1)[0];
        if (megaDraw && megaDraw.jackpotEst) {
          vMegaJp.innerText = 'Jackpot ' + formatShortJackpot(megaDraw.jackpotEst);
        }
      }
      if (vPowerJp) {
        const powerDraw = DataService.getVietlottDraws('power-6-55', 1)[0];
        if (powerDraw && powerDraw.jackpotEst) {
          vPowerJp.innerText = 'Jackpot 1 ' + formatShortJackpot(powerDraw.jackpotEst);
        }
      }
    }
  }

  renderDashboard() {
    const isVietlott = this.currentMode === 'vietlott';
    const history = isVietlott 
      ? DataService.getVietlottDraws(this.currentVietlottGame, 50)
      : DataService.getXSMNDraws(this.currentStation, 50);

    const totalBalls = isVietlott 
      ? LOTTO_CONFIG.VIETLOTT_GAMES[this.currentVietlottGame].totalBalls 
      : 99;

    const freqRes = FrequencyGapAlgorithm.predict(history, { isVietlott, totalBalls, topN: 10 });
    const clusterRes = ClusteringAlgorithm.predict(history, { isVietlott, totalBalls, topN: 6 });
    const assocRes = AssociationRulesAlgorithm.predict(history, { isVietlott, totalBalls, topN: 8 });

    UIController.renderExecutiveDashboard({
      history,
      gapStats: freqRes.metrics || {},
      clusterStats: clusterRes.metrics || {},
      rulesStats: assocRes.metrics || {}
    }, isVietlott, 'dashboard-container');
  }

  calculateNextDrawInfo(mode, stationOrGame, latestDraw) {
    if (!latestDraw) return null;
    const latestDate = new Date(latestDraw.date);
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    if (mode === 'vietlott') {
      const config = LOTTO_CONFIG.VIETLOTT_GAMES[stationOrGame] || {};
      const drawDays = config.drawDays || [2, 4, 6];
      let nextDate = new Date(latestDate);
      for (let i = 1; i <= 7; i++) {
        const testDate = new Date(latestDate);
        testDate.setDate(latestDate.getDate() + i);
        if (drawDays.includes(testDate.getDay())) {
          nextDate = testDate;
          break;
        }
      }
      const yyyy = nextDate.getFullYear();
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dd = String(nextDate.getDate()).padStart(2, '0');
      return {
        gameOrStationName: config.name || 'Vietlott',
        latestDate: latestDraw.date,
        nextDate: `${yyyy}-${mm}-${dd}`,
        nextDayName: dayNames[nextDate.getDay()],
        nextDrawTime: '18h15'
      };
    } else {
      const station = LOTTO_CONFIG.ALL_STATIONS.find(s => s.id === stationOrGame);
      const stationName = station ? station.name : stationOrGame;
      const drawDays = [];
      Object.keys(LOTTO_CONFIG.XSMN_SCHEDULE).forEach(day => {
        const stations = LOTTO_CONFIG.XSMN_SCHEDULE[day];
        if (stations.some(s => s.id === stationOrGame)) {
          drawDays.push(parseInt(day));
        }
      });
      let nextDate = new Date(latestDate);
      for (let i = 1; i <= 7; i++) {
        const testDate = new Date(latestDate);
        testDate.setDate(latestDate.getDate() + i);
        if (drawDays.length === 0 || drawDays.includes(testDate.getDay())) {
          nextDate = testDate;
          break;
        }
      }
      const yyyy = nextDate.getFullYear();
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dd = String(nextDate.getDate()).padStart(2, '0');
      return {
        gameOrStationName: `Đài ${stationName}`,
        latestDate: latestDraw.date,
        nextDate: `${yyyy}-${mm}-${dd}`,
        nextDayName: dayNames[nextDate.getDay()],
        nextDrawTime: '16h15'
      };
    }
  }

  runAndRenderPredictions() {
    const isVietlott = this.currentMode === 'vietlott';
    const canonical = this.getOrComputeCanonicalPrediction();
    const result = canonical.rawResult;

    this.lastEnsembleResult = result;
    const kpiConfidenceVal = document.getElementById('kpi-confidence-val');
    const kpiConsensusSub = document.getElementById('kpi-consensus-sub');
    if (kpiConfidenceVal) {
      kpiConfidenceVal.innerText = (result && result.metrics && result.metrics.consensusRatio) 
        ? result.metrics.consensusRatio 
        : '---';
    }
    if (kpiConsensusSub && result && result.metrics) {
      const used = result.metrics.totalAlgorithmsUsed || result.metrics.totalAlgorithmsCombined || 7;
      const expected = result.metrics.totalAlgorithmsExpected || 7;
      kpiConsensusSub.innerText = `${used}/${expected} mô hình tham gia • Không phải xác suất trúng`;
    }

    UIController.renderPredictions(result, isVietlott, 'predictions-container', canonical.targetInfo);
    UIController.renderProbabilityChart(result.scores, isVietlott, 'prob-chart-canvas');
  }

  populateBacktestDates() {
    const dateSelect = document.getElementById('backtest-date-select');
    if (!dateSelect) return;

    dateSelect.innerHTML = '';
    const isVietlott = this.currentMode === 'vietlott';
    const dates = isVietlott 
      ? DataService.getAvailableDates('vietlott', this.currentVietlottGame)
      : DataService.getAvailableDates('xsmn', this.currentStation);

    const fullHistory = isVietlott 
      ? DataService.getVietlottDraws(this.currentVietlottGame, 100)
      : DataService.getXSMNDraws(this.currentStation, 100);

    // Lọc các ngày trong quá khứ có ít nhất 1 kỳ quay trước đó để huấn luyện mô hình
    const testableDates = dates.filter(d => {
      const priorCount = fullHistory.filter(h => new Date(h.date) < new Date(d)).length;
      return priorCount >= 1;
    });

    if (testableDates.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Chưa có đủ kỳ quá khứ để dò số';
      dateSelect.appendChild(opt);
      return;
    }

    testableDates.forEach((d, idx) => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = `${d} ${idx === 0 ? '(Kỳ vừa mở gần nhất - Kiểm chứng thực tế)' : ''}`;
      dateSelect.appendChild(opt);
    });

    // Tự động chạy dò số cho ngày đầu tiên trong danh sách
    setTimeout(() => this.executeBacktest(), 100);
  }

  async executeBacktest() {
    const customDateInput = document.getElementById('backtest-custom-date');
    const dateSelect = document.getElementById('backtest-date-select');
    const resultContainer = document.getElementById('backtest-result-container');

    let targetDate = (customDateInput && customDateInput.value) 
      ? customDateInput.value 
      : (dateSelect ? dateSelect.value : '');

    if (!targetDate) return;

    const isVietlott = this.currentMode === 'vietlott';
    const stationOrGame = isVietlott ? this.currentVietlottGame : this.currentStation;

    // 1. Kiểm tra xem ngày này đã có trong bộ nhớ chưa
    let existingDraw = DataService.getDrawByDate(this.currentMode, stationOrGame, targetDate);

    // 2. Nếu chưa có, tự động cào từ kho Minh Ngọc theo ngày đó
    if (!existingDraw) {
      if (resultContainer) {
        resultContainer.innerHTML = `
          <div class="quant-card" style="text-align: center; padding: 36px;">
            <i class="fa fa-spinner fa-spin" style="font-size: 28px; color: var(--blue-500); margin-bottom: 12px;"></i>
            <div style="font-weight: 700; color: var(--text-primary); font-size: 16px;">Đang cào dữ liệu ngày ${targetDate} từ kho lưu trữ Minh Ngọc...</div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 6px;">Hệ thống đang kết nối cơ sở dữ liệu mở thưởng lịch sử để đối chiếu kết quả cho bạn.</div>
          </div>
        `;
      }
      existingDraw = await DataService.getDrawByDateWithFallback(this.currentMode, stationOrGame, targetDate);
    }

    // Lấy toàn bộ lịch sử có sẵn (0 = all) để huấn luyện minh bạch
    const fullHistory = isVietlott 
      ? DataService.getVietlottDraws(this.currentVietlottGame, 0)
      : DataService.getXSMNDraws(this.currentStation, 0);

    const totalBalls = isVietlott 
      ? LOTTO_CONFIG.VIETLOTT_GAMES[this.currentVietlottGame].totalBalls 
      : 99;

    const result = BacktestEngine.runSingleDateBacktest(fullHistory, targetDate, {
      isVietlott,
      stationOrGame: isVietlott ? this.currentVietlottGame : this.currentStation,
      totalBalls,
      topN: isVietlott ? 6 : 5
    });

    UIController.renderBacktestResult(result, isVietlott, 'backtest-result-container');
  }

  executeLeaderboard() {
    const isVietlott = this.currentMode === 'vietlott';
    const fullHistory = isVietlott 
      ? DataService.getVietlottDraws(this.currentVietlottGame, 100)
      : DataService.getXSMNDraws(this.currentStation, 100);

    const totalBalls = isVietlott 
      ? LOTTO_CONFIG.VIETLOTT_GAMES[this.currentVietlottGame].totalBalls 
      : 99;

    const batchResult = BacktestEngine.runBatchBacktest(fullHistory, {
      isVietlott,
      stationOrGame: isVietlott ? this.currentVietlottGame : this.currentStation,
      totalBalls,
      topN: isVietlott ? 6 : 5
    }, 20);

    this.lastLeaderboardResult = batchResult;

    // Cập nhật thẻ KPI Top 1 thuật toán dẫn đầu từ kết quả thực tế
    const kpiTopHitrate = document.getElementById('kpi-top-hitrate');
    const kpiTopAlgoName = document.getElementById('kpi-top-algo-name');
    if (batchResult && batchResult.leaderboard && batchResult.leaderboard.length > 0) {
      const topAlgo = batchResult.leaderboard[0];
      if (kpiTopHitrate) kpiTopHitrate.innerText = `${topAlgo.avgHitRate}%`;
      if (kpiTopAlgoName) kpiTopAlgoName.innerText = topAlgo.name;
    } else {
      if (kpiTopHitrate) kpiTopHitrate.innerText = '---';
      if (kpiTopAlgoName) kpiTopAlgoName.innerText = 'Chưa đủ dữ liệu đánh giá';
    }

    UIController.renderLeaderboard(batchResult, 'leaderboard-container');
  }
}

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  const app = new LottoQuantApp();
  app.init();
  window.__lottoApp = app;
});
