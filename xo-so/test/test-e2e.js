/**
 * BỘ KIỂM THỬ ĐẦU-CUỐI & GIAO DIỆN (E2E & UI TEST SUITE) - FIX-4
 * Chuẩn P0 theo Mục 9 và Mục 10 của fix-4.md:
 * 1. Tự khởi động HTTP server nội bộ (port độc lập), tự kiểm tra health check.
 * 2. Tự teardown đóng server sạch sẽ sau khi kiểm thử.
 * 3. Kiểm thử SEO, DOM IDs, static assets và historical seed qua mạng.
 * 4. Chạy headless browser trên 4 viewports (Desktop, Tablet, Mobile 1, Mobile 2)
 *    và lưu bằng chứng screenshot vào reports/screenshots/fix4/.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawnSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failedCount++;
  }
}

// MIME types đơn giản cho static server nội bộ
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function createStaticServer(port = 8089) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

      const filePath = path.join(rootDir, reqPath);
      // Ngăn chặn directory traversal
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

function fetchUrl(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const parsed = new URL(url);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        return resolve(fetchUrl(redirectUrl, maxRedirects - 1));
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    }).on('error', err => reject(err));
  });
}

import os from 'os';

function findBrowserBinary() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (fs.existsSync(chromePath)) return chromePath;
  if (fs.existsSync(edgePath)) return edgePath;
  return null;
}

async function runE2ETests() {
  console.log('========================================================');
  console.log('   LOTTO-QUANT LAB: E2E & UI TEST SUITE (TẦNG ĐẦU-CUỐI)');
  console.log('========================================================\n');

  const testPort = 8089;
  const baseUrl = `http://localhost:${testPort}`;
  let serverInstance = null;

  try {
    // 1. TỰ ĐỘNG KHỞI ĐỘNG HTTP TEST SERVER (YÊU CẦU MỤC 9)
    console.log(`1. Khởi Động HTTP Test Server Độc Lập Trên Cổng ${testPort}:`);
    serverInstance = await createStaticServer(testPort);
    assert(serverInstance !== null, `HTTP Server tự động khởi động và lắng nghe thành công trên cổng ${testPort}`);

    // Health check
    const rootRes = await fetchUrl(`${baseUrl}/`);
    assert(rootRes.statusCode === 200, `Health check: Trang chủ phản hồi HTTP 200 (Thực tế: ${rootRes.statusCode})`);
    const html = rootRes.body;

    // 2. Kiểm tra SEO & Tiêu chuẩn giao diện
    console.log('\n2. Kiểm tra Thẻ SEO & Cấu trúc Tiêu Đề:');
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const titleText = titleMatch ? titleMatch[1].trim() : '';
    assert(titleText.includes('LOTTO-QUANT LAB'), `Thẻ <title> hợp lệ: "${titleText}"`);

    const hasMetaDesc = /<meta\s+name=["']description["']/i.test(html);
    assert(hasMetaDesc, 'Có thẻ meta name="description"');

    const h1Matches = html.match(/<h1[\s>]/gi) || [];
    assert(h1Matches.length === 1, `Có đúng 1 thẻ <h1> duy nhất theo chuẩn SEO (Số lượng: ${h1Matches.length})`);

    // 3. Kiểm tra Các Phần Tử Tương Tác Cốt Lõi (DOM IDs)
    console.log('\n3. Kiểm tra Các Container & Thành Phần Giao Diện Cốt Lõi:');
    const requiredIds = [
      'mode-btn-xsmn',
      'mode-btn-vietlott',
      'station-select',
      'btn-crawl-full',
      'btn-sync-live',
      'live-result-container',
      'predictions-container',
      'prob-chart-canvas',
      'panel-dashboard',
      'dashboard-container',
      'btn-run-backtest',
      'backtest-date-select',
      'backtest-custom-date',
      'backtest-result-container',
      'btn-run-leaderboard',
      'leaderboard-container',
      'panel-docs'
    ];

    requiredIds.forEach(id => {
      const idPattern = new RegExp(`id=["']${id}["']`, 'i');
      assert(idPattern.test(html), `DOM chứa phần tử tương tác ID: #${id}`);
    });

    // 4. Kiểm tra Tải Static Assets
    console.log('\n4. Kiểm tra Tải Các Static Assets Cốt Lõi:');
    const assetUrls = [
      '/css/main.css',
      '/css/components.css',
      '/js/config.js',
      '/js/data-service.js',
      '/js/backtest-engine.js',
      '/js/ui-controller.js',
      '/js/app.js',
      '/data/history-scope.json'
    ];

    for (const asset of assetUrls) {
      const res = await fetchUrl(`${baseUrl}${asset}`);
      assert(res.statusCode === 200, `Tải thành công asset: ${asset} (HTTP 200)`);
    }

    // 5. Kiểm tra Tải Seed Dữ Liệu Qua Mạng HTTP
    console.log('\n5. Kiểm tra Dữ Liệu Lịch Sử Phục Vụ Qua Mạng:');
    const seedRes = await fetchUrl(`${baseUrl}/data/historical-seed.json`);
    assert(seedRes.statusCode === 200, 'Tải thành công /data/historical-seed.json qua HTTP');
    const seedJson = JSON.parse(seedRes.body);
    const totalDraws = (seedJson.vietlott?.['mega-6-45']?.length || 0) +
                       (seedJson.vietlott?.['power-6-55']?.length || 0) +
                       (seedJson.xsmn?.length || 0);
    assert(totalDraws === 3339, `Dữ liệu seed phục vụ đủ 3.339 bản ghi qua HTTP (Thực tế: ${totalDraws})`);

    // 6. KIỂM THỬ TRÊN 4 VIEWPORTS & CHỤP SCREENSHOT THẬT (MỤC 10)
    console.log('\n6. Kiểm thử Tương Thích Responsive & Chụp Screenshot 4 Viewports:');
    const browserBin = findBrowserBinary();
    const screenshotDir = path.join(rootDir, 'reports', 'screenshots', 'fix4');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    if (browserBin) {
      console.log(`  Sử dụng trình duyệt hệ thống: ${path.basename(browserBin)}`);

      const viewports = [
        { name: 'Desktop (1440x900)', width: 1440, height: 900, file: 'desktop-1440x900.png' },
        { name: 'Tablet (768x1024)', width: 768, height: 1024, file: 'tablet-768x1024.png' },
        { name: 'Mobile 1 (390x844)', width: 390, height: 844, file: 'mobile-390x844.png' },
        { name: 'Mobile 2 (360x800)', width: 360, height: 800, file: 'mobile-360x800.png' }
      ];

      const tempProfileDir = path.join(os.tmpdir(), `lotto-quant-e2e-${Date.now()}`);

      function captureScreenshot(args) {
        return new Promise((resolve) => {
          const child = spawn(browserBin, args);
          let stderr = '';
          child.stderr?.on('data', d => { stderr += d.toString(); });
          child.on('close', code => resolve({ code, stderr }));
          child.on('error', err => resolve({ code: -1, stderr: String(err) }));
          setTimeout(() => {
            try { child.kill(); } catch (e) {}
            resolve({ code: -1, stderr: 'Timeout 15s' });
          }, 15000);
        });
      }

      for (const vp of viewports) {
        const outPath = path.join(screenshotDir, vp.file);
        // Headless screenshot lệnh Chrome / Edge với profile tạm độc lập (chạy non-blocking)
        const res = await captureScreenshot([
          '--headless=new',
          '--disable-gpu',
          '--no-sandbox',
          '--hide-scrollbars',
          '--virtual-time-budget=3000',
          `--user-data-dir=${tempProfileDir}`,
          `--window-size=${vp.width},${vp.height}`,
          `--screenshot=${outPath}`,
          `${baseUrl}/`
        ]);

        const exists = fs.existsSync(outPath);
        const fileSize = exists ? fs.statSync(outPath).size : 0;
        if (!exists || fileSize < 15000) {
          console.error(`  [DEBUG-SCREENSHOT] res: ${JSON.stringify(res)}, stderr: ${res.stderr?.slice(0, 300)}`);
        }
        assert(exists && fileSize > 15000, `Viewport ${vp.name}: Chụp screenshot thành công (${(fileSize / 1024).toFixed(1)} KB) -> reports/screenshots/fix4/${vp.file}`);
      }

      try { fs.rmSync(tempProfileDir, { recursive: true, force: true }); } catch (e) {}
    } else {
      console.warn('  [WARN] Không tìm thấy msedge.exe hoặc chrome.exe để chụp screenshot tự động.');
    }

  } catch (err) {
    console.error('Lỗi khi chạy E2E Tests:', err);
    failedCount++;
  } finally {
    // 7. TỰ ĐỘNG DỌN DẸP / TEARDOWN SERVER SẠCH SẼ
    if (serverInstance) {
      serverInstance.close();
      console.log('\n[TEARDOWN] Đã đóng HTTP test server sạch sẽ.');
    }
  }

  console.log('\n========================================================');
  console.log(` KẾT QUẢ E2E TEST: ${passedCount} PASS, ${failedCount} FAIL`);
  console.log('========================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runE2ETests();

