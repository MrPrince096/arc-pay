import { ARC_EXPLORER_URL } from "../chain/constants.js";
import { BASE_CSS, FONTS } from "./theme.js";

/** The payer-facing standalone page for one invoice — no sidebar, just a checkout flow. Same design tokens as the rest of the app, different composition. Reuses the same wallet-bundle.js as the dashboard. */
export function payPage(invoiceId: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Pay invoice — PraneethArc</title>
${FONTS}
<style>
${BASE_CSS}
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
  .checkout { width: 100%; max-width: 400px; }
  .brandmini { display: flex; align-items: center; gap: 9px; justify-content: center; margin-bottom: 22px; }
  .brandmini .mark { width: 26px; height: 26px; border-radius: 7px; background: linear-gradient(155deg, var(--cyan), #0a8fa8); display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 0 18px var(--cyan-glow); }
  .brandmini .word { font-family: var(--font-display); font-size: 16px; color: var(--text-dim); }
  .paycard { background: var(--panel); border: 1px solid var(--border); border-radius: 20px; padding: 30px; text-align: center; }
  .amount { font-family: var(--font-mono); font-size: 44px; font-weight: 700; margin: 6px 0 20px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px; text-align: left; }
  .row:last-of-type { border-bottom: none; }
  .row .k { color: var(--text-faint); }
</style>
</head>
<body>
<div class="checkout">
  <div class="brandmini"><div class="mark">⚡</div><div class="word">PraneethArc</div></div>
  <div class="paycard" id="card">
    <div class="spin" style="justify-content:center">Loading invoice</div>
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
let inrRate = null;
fetch('/api/fx?symbols=INR').then(r=>r.json()).then(j=>{ inrRate = j.rates && j.rates.INR; if(invoice) render(); }).catch(()=>{});
const inrLine = () => (inrRate ? '<div class="faint" style="margin-top:-14px;margin-bottom:16px">≈ ₹'+Number(invoice.amountUsdc*inrRate).toLocaleString('en-IN',{maximumFractionDigits:0})+'</div>' : '');

function render(){
  const card = document.getElementById('card');
  if(invoice.status === 'paid'){
    card.innerHTML = '<div class="pos" style="font-size:15px;font-weight:700;letter-spacing:.3px">✅ PAID</div>'
      + '<div class="amount">'+money(invoice.amountUsdc)+'</div>'
      + inrLine()
      + '<div class="row"><span class="k">To</span><span class="addr">'+esc(invoice.recipient)+'</span></div>'
      + (invoice.memo ? '<div class="row"><span class="k">Memo</span><span>'+esc(invoice.memo)+'</span></div>' : '')
      + '<div class="row"><span class="k">Paid by</span><span class="addr">'+esc(invoice.payerAddress)+'</span></div>'
      + '<div class="muted" style="margin-top:14px"><a href="${ARC_EXPLORER_URL}/tx/'+esc(invoice.txHash)+'" target="_blank" rel="noopener">View on Arcscan →</a></div>';
    return;
  }
  card.innerHTML = '<div class="eyebrow">Payment request</div>'
    + '<div class="amount">'+money(invoice.amountUsdc)+'</div>'
    + inrLine()
    + '<div class="row"><span class="k">To</span><span class="addr">'+esc(invoice.recipient)+'</span></div>'
    + (invoice.memo ? '<div class="row"><span class="k">Memo</span><span>'+esc(invoice.memo)+'</span></div>' : '')
    + '<button id="pay-btn" class="btn-block" style="margin-top:20px" onclick="pay()">Connect wallet &amp; pay</button>'
    + '<div class="faint" style="margin-top:12px">Opens your injected wallet (MetaMask, Rabby, …) — must be a real browser tab with Arc Testnet added.</div>'
    + '<div id="pay-out"></div>';
}

async function pay(){
  const btn = document.getElementById('pay-btn');
  const out = document.getElementById('pay-out');
  btn.disabled = true;
  out.innerHTML = '<div class="spin" style="margin-top:10px;justify-content:center">Connecting wallet</div>';
  try{
    await window.ArcPayWallet.connect();
    out.innerHTML = '<div class="spin" style="margin-top:10px;justify-content:center">Sending — approve in your wallet</div>';
    const txHash = await window.ArcPayWallet.send(invoice.recipient, String(invoice.amountUsdc));
    out.innerHTML = '<div class="spin" style="margin-top:10px;justify-content:center">Confirming on-chain</div>';
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
