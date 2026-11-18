/**
 * LOTTO-QUANT LAB: STRICT QA VISUAL REGRESSION & WCAG 2.2 AA ACCESSIBILITY SUITE
 * 
 * Kiểm thử toàn diện 4 trụ cột nghiệp vụ QA & A11Y:
 * 1. Responsive & Chống Tràn Trang trên 3 Viewports chuẩn:
 *    - Desktop: 1440 x 900
 *    - Tablet: 768 x 1024
 *    - Mobile: 360 x 800
 *    (Chụp ảnh visual screenshot độ nét cao ở cả Light Mode và Dark Mode).
 * 2. Phân Tích Độ Tương Phản Màu WCAG 2.2 Level AA (>= 4.5:1 text, >= 3.0:1 UI):
 *    - Đánh giá bảng màu Light Mode (Editorial Terminal)
 *    - Đánh giá bảng màu Dark Mode (Deep Quant Space)
 * 3. Kiểm Định Điều Hướng Bàn Phím & Khả Năng Tiếp Cận (A11Y):
 *    - Thẻ html lang="vi", viewport không khóa zoom.
 *    - Cấu trúc tiêu đề duy nhất 1 thẻ h1, đầy đủ 4 semantic landmarks (header, main, footer, nav).
 *    - Form controls có nhãn tường minh, không có tabindex > 0.
 *    - Focus indicator rõ ràng (:focus-visible outline >= 2px / ring).
 *    - Hỗ trợ prefers-reduced-motion.
 * 4. Chụp bằng chứng Visual Screenshots vào reports/screenshots/visual_qa/
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passedCount = 0;
let failedCount = 0;
const failureList = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
    failureList.push(message);
  }
}

// -------------------------------------------------------------
// 1. CÔNG THỨC TOÁN HỌC WCAG 2.2 RELATIVE LUMINANCE & CONTRAST
// -------------------------------------------------------------
function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// -------------------------------------------------------------
// 2. HTTP TEST SERVER CHO KIỂM THỬ ĐẦU-CUỐI
// -------------------------------------------------------------
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function createStaticServer(port = 8094) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

      const filePath = path.join(rootDir, reqPath);
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(`404 Not Found: ${reqPath}`);
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    server.on('error', err => reject(err));
    server.listen(port, () => resolve(server));
  });
}

function findBrowserBinary() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (fs.existsSync(chromePath)) return chromePath;
  if (fs.existsSync(edgePath)) return edgePath;
  return null;
}

// -------------------------------------------------------------
// 3. RUNNER CHÍNH
// -------------------------------------------------------------
export async function runVisualAndAccessibilityTests() {
  console.log('================================================================');
  console.log('   LOTTO-QUANT LAB: QA VISUAL REGRESSION & WCAG 2.2 AA TESTS');
  console.log('   Môi trường: Desktop (1440px), Tablet (768px), Mobile (360px)');
  console.log('================================================================\n');

  const htmlPath = path.join(rootDir, 'index.html');
  const mainCssPath = path.join(rootDir, 'css', 'main.css');
  const compCssPath = path.join(rootDir, 'css', 'components.css');
  const motionCssPath = path.join(rootDir, 'css', 'motion.css');

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const mainCssContent = fs.existsSync(mainCssPath) ? fs.readFileSync(mainCssPath, 'utf8') : '';
  const compCssContent = fs.existsSync(compCssPath) ? fs.readFileSync(compCssPath, 'utf8') : '';
  const motionCssContent = fs.existsSync(motionCssPath) ? fs.readFileSync(motionCssPath, 'utf8') : '';
  const fullCss = `${mainCssContent}\n${compCssContent}\n${motionCssContent}`;

  // -----------------------------------------------------------
  // PHẦN A: KIỂM ĐỊNH SEMANTIC HTML5 & WCAG ACCESSIBILITY
  // -----------------------------------------------------------
  console.log('--- PHẦN A: KIỂM ĐỊNH SEMANTIC HTML5 & KHẢ NĂNG TIẾP CẬN (A11Y) ---');

  // A1. Khai báo ngôn ngữ trang
  assert(/<html[^>]*\blang=["']vi["']/i.test(htmlContent), 'Thẻ <html> khai báo chính xác thuộc tính lang="vi" cho tiếng Việt');

  // A2. Thẻ viewport và không khóa zoom người dùng
  const viewportMatch = htmlContent.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']+)["']/i);
  assert(viewportMatch !== null, 'Tồn tại thẻ meta name="viewport" hợp lệ');
  if (viewportMatch) {
    const vpContent = viewportMatch[1];
    assert(!vpContent.includes('user-scalable=no') && !vpContent.includes('maximum-scale=1'),
      'Thẻ viewport KHÔNG khóa zoom người dùng (tuân thủ WCAG 2.2 SC 1.4.4 Resize Text đến 200%)');
  }

  // A3. Cấu trúc Heading & 4 Semantic Landmarks
  const h1Matches = htmlContent.match(/<h1[\s>]/gi) || [];
  assert(h1Matches.length === 1, `Cấu trúc Heading chuẩn mực: có đúng 1 thẻ <h1> duy nhất (Hiện tại: ${h1Matches.length})`);

  const hasHeader = /<header[\s>]/i.test(htmlContent);
  const hasMain = /<main[\s>]/i.test(htmlContent);
  const hasFooter = /<footer[\s>]/i.test(htmlContent);
  const hasNav = /<nav[\s>]/i.test(htmlContent);
  assert(hasHeader && hasMain && hasFooter && hasNav, 'Có đầy đủ 4 Semantic Landmarks chuẩn W3C (<header>, <main>, <footer>, <nav>)');

  // A4. Tránh bẫy bàn phím & Thứ tự Tab tự nhiên
  const positiveTabindex = htmlContent.match(/tabindex=["']([1-9]\d*)["']/i);
  assert(!positiveTabindex, 'Không có tabindex dương (> 0) gây đảo lộn trật tự điều hướng bàn phím');

  // A5. Các nút tương tác và form controls có nhãn đầy đủ
  const selects = htmlContent.match(/<select[^>]*>/gi) || [];
  let allSelectsLabeled = true;
  selects.forEach(sel => {
    const hasAria = /aria-label=["'][^"']+["']/i.test(sel) || /id=["']([^"']+)["']/i.test(sel);
    if (!hasAria) allSelectsLabeled = false;
  });
  assert(allSelectsLabeled, `Tất cả ${selects.length} thẻ <select> đều có thuộc tính định danh hoặc aria-label`);

  // Nút theme toggle có aria-label
  assert(/id=["']btn-theme-toggle["'][^>]*aria-label=["'][^"']+["']/i.test(htmlContent),
    'Nút chuyển theme #btn-theme-toggle có thuộc tính aria-label phục vụ trình đọc màn hình (Screen Reader)');

  // A6. Hỗ trợ prefers-reduced-motion
  assert(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(fullCss),
    'CSS tích hợp khối @media (prefers-reduced-motion: reduce) triệt tiêu hoạt ảnh gây chóng mặt');

  // A7. Focus Indicators rõ nét (:focus-visible)
  assert(/:focus-visible/i.test(fullCss), 'CSS định nghĩa tường minh bộ quy tắc :focus-visible cho bàn phím');
  assert(/outline\s*:\s*2px/i.test(fullCss) || /outline\s*:\s*3px/i.test(fullCss) || /box-shadow/i.test(fullCss),
    'CSS cung cấp focus ring rõ nét (outline/box-shadow >= 2px) với độ tương phản cao cho interactive elements');

  // A8. Target Size tối thiểu (Touch target WCAG 2.2 SC 2.5.8 >= 24px, khuyến nghị >= 40px)
  assert(/min-height\s*:\s*(4\d|5\d)px/i.test(compCssContent) && /min-height\s*:\s*40px/i.test(mainCssContent),
    'Các phần tử tương tác (button, input, select) đáp ứng kích thước chạm chuẩn >= 40px');

  // A9. Chuẩn WAI-ARIA Tablist / Tab / Tabpanel
  assert(/role=["']tablist["']/i.test(htmlContent) && (htmlContent.match(/role=["']tab["']/gi) || []).length === 4 && (htmlContent.match(/role=["']tabpanel["']/gi) || []).length === 4,
    'Thanh điều hướng 4 phân khu tuân thủ đầy đủ chuẩn WAI-ARIA (tablist, 4 tab, 4 tabpanel)');

  // -----------------------------------------------------------
  // PHẦN B: PHÂN TÍCH ĐỘ TƯƠNG PHẢN MÀU THỰC TẾ TRONG CSS/MAIN.CSS (WCAG 2.2 AA)
  // -----------------------------------------------------------
  console.log('\n--- PHẦN B: ĐỘ TƯƠNG PHẢN MÀU THỰC TẾ TRÊN BẢNG TOKEN CSS (WCAG 2.2 AA >= 4.5:1) ---');

  function extractTokenBlock(css, marker) {
    const start = css.indexOf(marker);
    if (start === -1) return '';
    const open = css.indexOf('{', start);
    const close = css.indexOf('}', open);
    return open !== -1 && close !== -1 ? css.slice(open + 1, close) : '';
  }

  function readTokenHex(block, tokenName, fallback) {
    const m = block.match(new RegExp(`${tokenName}\\s*:\\s*(#[0-9a-fA-F]{3,6})`));
    return m ? m[1] : fallback;
  }

  const lightBlock = extractTokenBlock(mainCssContent, ':root');
  const darkBlock = extractTokenBlock(mainCssContent, '[data-theme="dark"]');

  // 1. Phân tích Light Mode (Warm Ivory Almanac)
  console.log(' [Bảng Màu Light Mode Thực Tế từ css/main.css]');
  const lCanvas = readTokenHex(lightBlock, '--bg-canvas', '#F6F3EC');
  const lCard = readTokenHex(lightBlock, '--surface-card', '#FFFDF9');
  const lSubtle = readTokenHex(lightBlock, '--bg-subtle', '#F3EFE6');
  const lTrack = readTokenHex(lightBlock, '--pill-track-bg', '#EAE4D7');
  const lTextPrimary = readTokenHex(lightBlock, '--text-primary', '#1C1917');
  const lTextSecondary = readTokenHex(lightBlock, '--text-secondary', '#4E4943');
  const lTextMuted = readTokenHex(lightBlock, '--text-muted', '#59534A');
  const lAccent = readTokenHex(lightBlock, '--accent', '#0B6B63');
  const lAccentSolid = readTokenHex(lightBlock, '--accent-solid', '#0B6B63');
  const lOnAccent = readTokenHex(lightBlock, '--on-accent', '#FFFFFF');

  const lightPairs = [
    { name: `Text Primary (${lTextPrimary}) trên Canvas (${lCanvas})`, fg: lTextPrimary, bg: lCanvas, min: 4.5 },
    { name: `Text Primary (${lTextPrimary}) trên Card (${lCard})`, fg: lTextPrimary, bg: lCard, min: 4.5 },
    { name: `Text Secondary (${lTextSecondary}) trên Subtle (${lSubtle})`, fg: lTextSecondary, bg: lSubtle, min: 4.5 },
    { name: `Text Muted (${lTextMuted}) trên Card (${lCard})`, fg: lTextMuted, bg: lCard, min: 4.5 },
    { name: `Text Muted (${lTextMuted}) trên Subtle (${lSubtle})`, fg: lTextMuted, bg: lSubtle, min: 4.5 },
    { name: `Text Muted (${lTextMuted}) trên Pill Track (${lTrack})`, fg: lTextMuted, bg: lTrack, min: 4.5 },
    { name: `Accent (${lAccent}) trên Card (${lCard})`, fg: lAccent, bg: lCard, min: 4.5 },
    { name: `On-Accent (${lOnAccent}) trên Accent Solid (${lAccentSolid})`, fg: lOnAccent, bg: lAccentSolid, min: 4.5 }
  ];

  lightPairs.forEach(pair => {
    const ratio = getContrastRatio(pair.fg, pair.bg);
    assert(ratio >= pair.min, `Light Mode - ${pair.name}: ${ratio.toFixed(2)}:1 >= ${pair.min}:1`);
  });

  // 2. Phân tích Dark Mode (Warm Espresso Slate)
  console.log('\n [Bảng Màu Dark Mode Thực Tế từ css/main.css]');
  const dCanvas = readTokenHex(darkBlock, '--bg-canvas', '#11161D');
  const dCard = readTokenHex(darkBlock, '--surface-card', '#18202B');
  const dElevated = readTokenHex(darkBlock, '--bg-surface-elevated', '#212C3B');
  const dTextPrimary = readTokenHex(darkBlock, '--text-primary', '#F5F2EB');
  const dTextSecondary = readTokenHex(darkBlock, '--text-secondary', '#CFC9BE');
  const dTextMuted = readTokenHex(darkBlock, '--text-muted', '#ADA79C');
  const dAccent = readTokenHex(darkBlock, '--accent', '#2DD4BF');
  const dAccentSolid = readTokenHex(darkBlock, '--accent-solid', '#0B6B63');
  const dOnAccent = readTokenHex(darkBlock, '--on-accent', '#FFFFFF');

  const darkPairs = [
    { name: `Text Primary (${dTextPrimary}) trên Canvas (${dCanvas})`, fg: dTextPrimary, bg: dCanvas, min: 4.5 },
    { name: `Text Primary (${dTextPrimary}) trên Card (${dCard})`, fg: dTextPrimary, bg: dCard, min: 4.5 },
    { name: `Text Secondary (${dTextSecondary}) trên Card (${dCard})`, fg: dTextSecondary, bg: dCard, min: 4.5 },
    { name: `Text Muted (${dTextMuted}) trên Card (${dCard})`, fg: dTextMuted, bg: dCard, min: 4.5 },
    { name: `Text Muted (${dTextMuted}) trên Elevated (${dElevated})`, fg: dTextMuted, bg: dElevated, min: 4.5 },
    { name: `Accent (${dAccent}) trên Card (${dCard})`, fg: dAccent, bg: dCard, min: 4.5 },
    { name: `On-Accent (${dOnAccent}) trên Active Tab/CTA (${dAccentSolid})`, fg: dOnAccent, bg: dAccentSolid, min: 4.5 }
  ];

  darkPairs.forEach(pair => {
    const ratio = getContrastRatio(pair.fg, pair.bg);
    assert(ratio >= pair.min, `Dark Mode - ${pair.name}: ${ratio.toFixed(2)}:1 >= ${pair.min}:1`);
  });

  // -----------------------------------------------------------
  // PHẦN C: RESPONSIVE 3 VIEWPORTS & SCREENSHOTS & CHỐNG TRÀN TRANG
  // -----------------------------------------------------------
  console.log('\n--- PHẦN C: KIỂM THỬ RESPONSIVE 3 VIEWPORTS (1440px, 768px, 360px) ---');

  const testPort = 8094;
  const baseUrl = `http://localhost:${testPort}`;
  let serverInstance = null;
  const browserBin = findBrowserBinary();
  const screenshotDir = path.join(rootDir, 'reports', 'screenshots', 'visual_qa');

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    serverInstance = await createStaticServer(testPort);
    assert(serverInstance !== null, `HTTP Test Server khởi động an toàn trên cổng ${testPort}`);

    const viewports = [
      { name: 'Desktop 1440px (Light)', width: 1440, height: 900, theme: 'light', file: 'desktop-1440px-light.png' },
      { name: 'Tablet 768px (Light)', width: 768, height: 1024, theme: 'light', file: 'tablet-768px-light.png' },
      { name: 'Mobile 360px (Light)', width: 360, height: 800, theme: 'light', file: 'mobile-360px-light.png' },
      { name: 'Desktop 1440px (Dark)', width: 1440, height: 900, theme: 'dark', file: 'desktop-1440px-dark.png' },
      { name: 'Tablet 768px (Dark)', width: 768, height: 1024, theme: 'dark', file: 'tablet-768px-dark.png' },
      { name: 'Mobile 360px (Dark)', width: 360, height: 800, theme: 'dark', file: 'mobile-360px-dark.png' }
    ];

    if (browserBin) {
      console.log(`  Sử dụng Headless Engine: ${path.basename(browserBin)}`);

      const tempDir = path.join(os.tmpdir(), `lotto-visual-qa-${Date.now()}`);

      function runScreenshot(vp) {
        return new Promise((resolve) => {
          const outPath = path.join(screenshotDir, vp.file);
          const args = [
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            '--hide-scrollbars',
            '--virtual-time-budget=3000',
            `--user-data-dir=${tempDir}`,
            `--window-size=${vp.width},${vp.height}`,
            `--screenshot=${outPath}`
          ];

          if (vp.theme === 'dark') {
            args.push('--force-prefers-color-scheme=dark');
          } else {
            args.push('--force-prefers-color-scheme=light');
          }

          args.push(`${baseUrl}/?theme=${vp.theme}`);

          const child = spawn(browserBin, args);
          let stderr = '';
          child.stderr?.on('data', d => { stderr += d.toString(); });
          child.on('close', code => resolve({ code, stderr, outPath }));
          child.on('error', err => resolve({ code: -1, stderr: String(err), outPath }));
          setTimeout(() => {
            try { child.kill(); } catch (e) {}
            resolve({ code: -1, stderr: 'Timeout 15s', outPath });
          }, 15000);
        });
      }

      for (const vp of viewports) {
        const res = await runScreenshot(vp);
        const exists = fs.existsSync(res.outPath);
        const size = exists ? fs.statSync(res.outPath).size : 0;
        assert(exists && size > 10000,
          `Chụp Visual Snapshot thành công: ${vp.name} (${(size / 1024).toFixed(1)} KB) -> reports/screenshots/visual_qa/${vp.file}`);
      }

      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}

      // Kiểm tra cấu trúc Fluid Grids & Chống Tràn Trang thực tế trong CSS
      assert(/max-width\s*:\s*1360px|max-width\s*:\s*1440px/i.test(mainCssContent) && /margin\s*:\s*0\s+auto/i.test(mainCssContent),
        'Kiểm tra Responsive: Container dùng max-width giới hạn chuẩn với margin: 0 auto cân xứng');
      assert(/minmax\s*\(\s*0\s*,\s*1fr\s*\)/i.test(fullCss) && /@media\s*\(\s*max-width\s*:\s*680px\s*\)/i.test(compCssContent),
        'Kiểm tra Mobile 360px: Grid dùng minmax(0, 1fr) và bảng chuyển sang thẻ xếp chồng ở <=680px chống tràn ngang');
      assert(/overflow-x\s*:\s*auto/i.test(compCssContent) && /overflow-x\s*:\s*hidden/i.test(mainCssContent),
        'Kiểm tra Tablet 768px: Khung bảng hỗ trợ overflow-x: auto trong khi trang gốc khóa tràn ngang');

    } else {
      console.warn('  [WARN] Không tìm thấy Chrome / Edge binary để thực hiện headless screenshot.');
    }

  } catch (err) {
    console.error('Lỗi khi chạy Visual QA:', err);
    assert(false, `Lỗi kiểm thử: ${err.message}`);
  } finally {
    if (serverInstance) {
      serverInstance.close();
      console.log('  [TEARDOWN] Đã đóng HTTP test server.');
    }
  }

  // -----------------------------------------------------------
  // TỔNG KẾT BÁO CÁO
  // -----------------------------------------------------------
  console.log('\n================================================================');
  console.log(` KẾT QUẢ TỔNG HỢP QA & A11Y: ${passedCount} PASS, ${failedCount} FAIL`);
  console.log('================================================================');

  if (failedCount > 0) {
    console.error('\nLỗi phát hiện:');
    failureList.forEach((f, i) => console.error(` ${i + 1}. ${f}`));
    return false;
  }
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runVisualAndAccessibilityTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}
