import fs from 'fs';

const html = fs.readFileSync('temp_xsmn.html', 'utf-8');
const p = html.indexOf('class="bkqmiennam"');
console.log('Pos:', p);
if (p !== -1) {
  console.log(html.slice(p, p + 3500));
} else {
  const p2 = html.indexOf('bkqmiennam');
  console.log('Pos without quotes:', p2);
  if (p2 !== -1) {
    console.log(html.slice(p2, p2 + 2000));
  }
}
