async function testFirstDraw() {
  const url = 'https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/power-6x55/01-08-2017.html';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const box = html.split('class="box-result-detail"')[1];
  const balls = [...box.matchAll(/class="[^"]*bool">(\d+)<\/div>/g)].map(m => m[1]);
  console.log('Power 01/08/2017 Balls:', balls);
}
testFirstDraw();
