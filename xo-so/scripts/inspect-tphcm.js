import fs from 'fs';

async function inspectTphcm() {
  const res = await fetch('https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/tp-hcm.html', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  
  // Look for links related to dates or older draws
  const links = [...html.matchAll(/href="([^"]*tp-hcm[^"]*)"/gi)].map(m => m[1]);
  console.log('TPHCM links count:', links.length);
  console.log('Sample TPHCM links:', Array.from(new Set(links)).slice(0, 20));

  // Look for date matches
  const dateMatches = [...html.matchAll(/(\d{2}[-/]\d{2}[-/]\d{4})/g)].map(m => m[1]);
  console.log('Sample dates found in page:', Array.from(new Set(dateMatches)).slice(0, 20));

  // Check how many tables or results are in this single page
  const bkq = html.split('class="bkqmiennam"');
  const rightcl = html.split('class="rightcl"');
  const boxKq = html.split('class="box_kqxs"');
  console.log(`bkqmiennam count: ${bkq.length - 1}, rightcl count: ${rightcl.length - 1}, box_kqxs count: ${boxKq.length - 1}`);

  // Check if there is an archive search form (tìm kiếm kết quả)
  const formMatches = [...html.matchAll(/<form[^>]*action="([^"]*)"[^>]*>([\s\S]*?)<\/form>/gi)];
  formMatches.forEach((f, idx) => {
    console.log(`Form ${idx} action: ${f[1]}`);
    const inputs = [...f[2].matchAll(/name="([^"]*)"/gi)].map(m => m[1]);
    console.log(`Form ${idx} inputs:`, inputs);
  });
}

inspectTphcm();
