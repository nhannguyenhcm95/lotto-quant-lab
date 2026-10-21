import fs from 'fs';

async function inspectVietlottPages() {
  const resMega = await fetch('https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/mega-6x45.html', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const htmlMega = await resMega.text();
  
  // Find links to pagination or other draws
  const megaLinks = [...htmlMega.matchAll(/href="([^"]*mega-6x45[^"]*)"/gi)].map(m => m[1]);
  console.log('Mega links count:', megaLinks.length);
  console.log('Sample Mega links:', Array.from(new Set(megaLinks)).slice(0, 20));

  // Count box-result-detail in Mega page
  const boxesMega = htmlMega.split('class="box-result-detail"');
  console.log('Mega draws in single page:', boxesMega.length - 1);

  // Check Power 6/55 page
  const resPower = await fetch('https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/power-6x55.html', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const htmlPower = await resPower.text();
  const powerLinks = [...htmlPower.matchAll(/href="([^"]*power-6x55[^"]*)"/gi)].map(m => m[1]);
  console.log('Power links count:', powerLinks.length);
  console.log('Sample Power links:', Array.from(new Set(powerLinks)).slice(0, 20));

  const boxesPower = htmlPower.split('class="box-result-detail"');
  console.log('Power draws in single page:', boxesPower.length - 1);
}

inspectVietlottPages();
