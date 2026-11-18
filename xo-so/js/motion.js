/**
 * LOTTO-QUANT LAB: MOTION LAYER
 * Điều phối chuyển động của trang bằng GSAP core + IntersectionObserver.
 *
 * Nguyên tắc vận hành:
 * - Không sở hữu nội dung: chỉ đọc DOM do UIController render ra.
 * - Chỉ cần "xuất hiện một lần khi vào khung nhìn" nên dùng IntersectionObserver
 *   thay cho ScrollTrigger: rẻ hơn nhiều và không giữ một vòng requestAnimationFrame
 *   thường trực, vốn làm treo các công cụ chụp ảnh headless.
 * - Nếu thiếu GSAP hoặc người dùng bật giảm chuyển động, gỡ class .mv-js
 *   để mọi khối hiện đầy đủ ngay lập tức.
 * - Nội dung được render lại mỗi 30 giây, nên phần tử mới được quét lại
 *   qua MutationObserver và chỉ animate một lần.
 */

(function () {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Thư viện vendor nạp bằng thẻ script defer, nên đọc lại từ window ở thời điểm
  // khởi động thay vì chốt giá trị ngay khi module được đánh giá.
  let gsap = window.gsap;

  const BLOCK_SELECTOR = [
    'main > .page-section-header',
    'main > .tab-view-panel.active > *:not(.kpi-summary-grid)',
    'footer'
  ].join(', ');

  /* ------------------------------------------------------------------
     Tiện ích: chạy callback đúng một lần khi phần tử vào khung nhìn
     ------------------------------------------------------------------ */
  function whenVisible(elements, callback) {
    const list = Array.prototype.slice.call(elements);
    if (!list.length) return;

    if (!('IntersectionObserver' in window)) {
      list.forEach(callback);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          callback(entry.target);
        });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.01 }
    );

    list.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------
     1. Hạ tầng cuộn: sợi tiến trình trên đỉnh + thước đo phần bên trái
     ------------------------------------------------------------------ */
  function initScrollChrome() {
    const bar = document.createElement('div');
    bar.className = 'mv-progress';
    bar.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('div');
    fill.className = 'mv-progress-fill';
    bar.appendChild(fill);
    document.body.appendChild(bar);

    const sections = Array.from(document.querySelectorAll('main > .page-section-header'));
    const ticks = [];

    if (sections.length >= 3) {
      const ruler = document.createElement('nav');
      ruler.className = 'mv-ruler';
      ruler.setAttribute('aria-label', 'Điều hướng nhanh giữa các phần');

      sections.forEach((section, index) => {
        const heading = section.querySelector('.section-heading');
        const title = heading ? heading.textContent.trim() : `Phần ${index + 1}`;

        const tick = document.createElement('button');
        tick.type = 'button';
        tick.className = 'mv-tick';
        tick.setAttribute('aria-label', title);

        const line = document.createElement('span');
        line.className = 'mv-tick-line';
        line.setAttribute('aria-hidden', 'true');

        const label = document.createElement('span');
        label.className = 'mv-tick-label';
        label.textContent = title;
        label.setAttribute('aria-hidden', 'true');

        tick.append(line, label);
        tick.addEventListener('click', () => {
          section.scrollIntoView({
            behavior: reduceMotion.matches ? 'auto' : 'smooth',
            block: 'start'
          });
        });

        ruler.appendChild(tick);
        ticks.push(tick);
      });

      document.body.appendChild(ruler);
    }

    let scheduled = false;

    const update = () => {
      scheduled = false;

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      fill.style.transform = `scaleX(${ratio})`;

      if (!ticks.length) return;

      const probe = window.scrollY + window.innerHeight * 0.32;
      let activeIndex = 0;

      sections.forEach((section, index) => {
        const top = section.getBoundingClientRect().top + window.scrollY;
        if (top <= probe) activeIndex = index;
      });

      ticks.forEach((tick, index) => {
        if (index === activeIndex) tick.setAttribute('aria-current', 'true');
        else tick.removeAttribute('aria-current');
      });
    };

    const requestUpdate = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });

    update();
    // Nội dung render bất đồng bộ nên đo lại sau khi trang ổn định
    setTimeout(update, 700);
    setTimeout(update, 2200);
  }

  /* ------------------------------------------------------------------
     2. Đưa từng khối vào khi cuộn tới
     ------------------------------------------------------------------ */
  function initReveals() {
    const blocks = Array.from(document.querySelectorAll(BLOCK_SELECTOR)).filter(
      (el) => !el.dataset.mvReveal
    );

    blocks.forEach((el) => {
      el.dataset.mvReveal = '1';
    });

    whenVisible(blocks, (el) => {
      const isKpiCard = el.classList.contains('kpi-stat-card');
      const staggerIndex = isKpiCard ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;

      gsap.fromTo(
        el,
        { opacity: 0, y: isKpiCard ? 12 : 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.62,
          ease: 'power3.out',
          delay: isKpiCard ? staggerIndex * 0.05 : 0,
          onStart: () => {
            if (el.classList.contains('page-section-header')) el.classList.add('mv-drawn');
          }
        }
      );
    });
  }

  /* ------------------------------------------------------------------
     3. Bóng số nảy nhẹ trong lần hiển thị đầu tiên
     Bản render lại mỗi 30 giây hiện ngay, không chạy lại hiệu ứng.
     ------------------------------------------------------------------ */
  let ballsPrimed = false;

  function initBalls() {
    // Hai dạng bóng khác nhau: bóng Vietlott (.lotto-ball) và sáu chữ số
    // giải đặc biệt XSMN (.special-digit-ball).
    const rows = document.querySelectorAll('.hero-pred-balls-row, .special-balls-container');
    let found = false;

    rows.forEach((row) => {
      const balls = row.querySelectorAll(
        '.lotto-ball:not([data-mv-ball]), .special-digit-ball:not([data-mv-ball]), .ensemble-ball-lg:not([data-mv-ball])'
      );
      if (!balls.length) return;

      found = true;
      balls.forEach((ball) => {
        ball.dataset.mvBall = '1';
      });

      if (ballsPrimed) return;

      gsap.fromTo(
        balls,
        { opacity: 0, scale: 0.82 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.055 }
      );
    });

    if (found && !ballsPrimed) {
      ballsPrimed = true;
      root.classList.add('mv-balls-ready');
    }
  }

  /* ------------------------------------------------------------------
     4. Số liệu KPI chạy từ 0 tới giá trị thật
     ------------------------------------------------------------------ */
  function countUp(el) {
    const raw = (el.textContent || '').trim();
    const match = raw.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
    if (!match) return;

    const numberText = match[1];
    const suffix = match[2];
    const parts = numberText.split(/[.,]/);

    // "3.339" là phân cách nghìn, không phải số thập phân: bỏ qua
    if (parts.length > 1 && parts[1].length > 2) return;

    const target = parseFloat(numberText.replace(',', '.'));
    if (!isFinite(target) || target <= 0) return;

    const decimals = parts.length > 1 ? parts[1].length : 0;
    const state = { value: 0 };

    const paint = (value) => {
      el.textContent = value.toFixed(decimals).replace('.', ',') + suffix;
    };

    paint(0);
    gsap.to(state, {
      value: target,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => paint(state.value),
      onComplete: () => {
        el.textContent = raw;
      }
    });
  }

  function initCounters() {
    const values = Array.from(
      document.querySelectorAll('.kpi-value, .summary-metric-card .sm-value')
    ).filter((el) => !el.dataset.mvCounted);

    values.forEach((el) => {
      el.dataset.mvCounted = '1';
    });

    whenVisible(values, (el) => {
      gsap.fromTo(el, { opacity: 0.4 }, { opacity: 1, duration: 0.3 });
      countUp(el);
    });
  }

  /* ------------------------------------------------------------------
     5. Quét lại khi ứng dụng render nội dung mới
     ------------------------------------------------------------------ */
  function watchDom() {
    let timer = null;

    const observer = new MutationObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        initBalls();
        initCounters();
      }, 320);
    });

    const scope = document.querySelector('main') || document.body;
    observer.observe(scope, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------
     6. Khởi động
     ------------------------------------------------------------------ */
  let staticReady = false;

  function bootStatic() {
    if (staticReady) return;
    staticReady = true;
    initScrollChrome();
  }

  function finishWithoutMotion() {
    root.classList.remove('mv-js');
    window.__mvReady = true;
  }

  function bootMotion() {
    gsap = window.gsap;

    if (!gsap || reduceMotion.matches) {
      finishWithoutMotion();
      return;
    }

    initReveals();
    initBalls();
    initCounters();
    watchDom();

    reduceMotion.addEventListener('change', (event) => {
      if (!event.matches) return;
      gsap.globalTimeline.clear();
      root.classList.remove('mv-js');
    });

    // Mở chốt ẩn nội dung: mọi khối do CSS giấu đều đã có observer lo.
    window.__mvReady = true;
  }

  function boot() {
    bootStatic();

    if (window.gsap) {
      bootMotion();
      return;
    }

    // Thư viện vendor có thể chưa kịp thực thi: chờ trang tải xong rồi thử lại một lần.
    window.addEventListener('load', () => {
      if (window.gsap) bootMotion();
      else finishWithoutMotion();
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
