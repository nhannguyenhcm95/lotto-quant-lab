import { spawn } from 'child_process';
import http from 'http';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9222;

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  'http://localhost:8088/'
]);

async function run() {
  await new Promise(r => setTimeout(r, 1500));
  
  // Get webSocketDebuggerUrl
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
  const pageTarget = targets.find(t => t.type === 'page');
  console.log('Target found:', pageTarget.url);

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  
  ws.onopen = () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
    ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('[CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[UNCAUGHT EXCEPTION]', JSON.stringify(msg.params.exceptionDetails, null, 2));
    }
  };

  await new Promise(r => setTimeout(r, 5000));
  chrome.kill();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  chrome.kill();
  process.exit(1);
});
