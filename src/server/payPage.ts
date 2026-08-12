import { ARC_EXPLORER_URL } from "../chain/constants.js";

/** The payer-facing standalone page for one invoice — no sidebar, just a pay flow. Reuses the same wallet-bundle.js as the dashboard. */
export function payPage(invoiceId: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Pay invoice — Arc Pay</title>
<style>
  :root { --bg:#0b0e14; --card:#141922; --border:#232a37; --text:#e6e9ef; --text-dim:#8b93a1; --accent:#6fb0ff; --pos:#22d3a5; --neg:#f87171; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .wrap { max-width:480px; margin:0 auto; padding:32px 20px; }
  h1 { font-size:20px; margin:0 0 20px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:24px; }
  .amount { font-size:36px; font-weight:700; font-family:ui-monospace,monospace; margin:8px 0; }
  .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #1c2330; font-size:13px; }
  .row .k { color:var(--text-dim); }
  .addr { font-family:ui-monospace,monospace; }
  button { width:100%; background:var(--accent); color:#0b0e14; border:none; border-radius:6px; padding:12px; font-weight:600; font-size:15px; cursor:pointer; margin-top:16px; }
  button:hover { opacity:0.9; } button:disabled { opacity:0.5; cursor:default; }
  .muted { color:var(--text-dim); font-size:13px; margin-top:10px; }
  .err { color:var(--neg); }
  .pos { color:var(--pos); }
  .spin { color:var(--text-dim); }
  a { color:var(--accent); }
</style>
</head>
<body>
<div class="wrap">
  <h1>⚡ Arc Pay</h1>
  <div class="card" id="card">
    <div class="muted">Loading invoice…</div>
  </div>
</div>

<script src="/static/wallet-bundle.js"></script>
<script>
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const money = n => '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6});
async function get(url){ const r = await fetch(url); const j = await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status)); return j; }
async function post(url,body){ const r = await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})}); const j = await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status)); return j; }

const invoiceId = ${JSON.stringify(invoiceId)};
let invoice = null;

function render(){
  const card = document.getElementById('card');
  if(invoice.status === 'paid'){
    card.innerHTML = '<div class="pos" style="font-size:18px;font-weight:700">✅ Paid</div>'
      + '<div class="amount">'+money(invoice.amountUsdc)+'</div>'
      + '<div class="row"><span class="k">To</span><span class="addr">'+esc(invoice.recipient)+'</span></div>'
      + (invoice.memo ? '<div class="row"><span class="k">Memo</span><span>'+esc(invoice.memo)+'</span></div>' : '')
      + '<div class="row"><span class="k">Paid by</span><span class="addr">'+esc(invoice.payerAddress)+'</span></div>'
      + '<div class="muted"><a href="${ARC_EXPLORER_URL}/tx/'+esc(invoice.txHash)+'" target="_blank" rel="noopener">View on Arcscan →</a></div>';
    return;
  }
  card.innerHTML = '<div class="muted">Payment request</div>'
    + '<div class="amount">'+money(invoice.amountUsdc)+'</div>'
    + '<div class="row"><span class="k">To</span><span class="addr">'+esc(invoice.recipient)+'</span></div>'
    + (invoice.memo ? '<div class="row"><span class="k">Memo</span><span>'+esc(invoice.memo)+'</span></div>' : '')
    + '<button id="pay-btn" onclick="pay()">Connect wallet &amp; pay</button>'
    + '<div class="muted">Opens your injected wallet (MetaMask, Rabby, …) — must be a real browser tab with Arc Testnet added.</div>'
    + '<div id="pay-out"></div>';
}

async function pay(){
  const btn = document.getElementById('pay-btn');
  const out = document.getElementById('pay-out');
  btn.disabled = true;
  out.innerHTML = '<div class="spin" style="margin-top:10px">Connecting wallet…</div>';
  try{
    await window.ArcPayWallet.connect();
    out.innerHTML = '<div class="spin" style="margin-top:10px">Sending — approve in your wallet…</div>';
    const txHash = await window.ArcPayWallet.send(invoice.recipient, String(invoice.amountUsdc));
    out.innerHTML = '<div class="spin" style="margin-top:10px">Payment sent — confirming on-chain…</div>';
    invoice = await post('/api/invoices/confirm', { id: invoiceId, txHash });
    render();
  }catch(e){
    out.innerHTML = '<div class="err" style="margin-top:10px">'+esc(e.message)+'</div>';
    btn.disabled = false;
  }
}

async function load(){
  try{
    invoice = await get('/api/invoices/get?id='+encodeURIComponent(invoiceId));
    render();
  }catch(e){
    document.getElementById('card').innerHTML = '<div class="err">'+esc(e.message)+'</div>';
  }
}
load();
</script>
</body>
</html>`;
}
