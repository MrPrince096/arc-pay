import { ARC_EXPLORER_URL } from "../chain/constants.js";
import { navBar, NAV_CSS } from "./nav.js";

/** Standalone transaction-history page — connect a wallet, or paste any address, to see its recent USDC transfers. */
export function transactionsPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Transactions — Arc Pay</title>
<style>
  :root { --bg:#0b0e14; --card:#141922; --border:#232a37; --text:#e6e9ef; --text-dim:#8b93a1; --accent:#6fb0ff; --pos:#22d3a5; --neg:#f87171; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .wrap { max-width:640px; margin:0 auto; padding:32px 20px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:var(--text-dim); font-size:13px; margin-bottom:24px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:20px; margin-bottom:16px; }
  button { background:var(--accent); color:#0b0e14; border:none; border-radius:6px; padding:9px 16px; font-weight:600; font-size:14px; cursor:pointer; }
  button:hover { opacity:0.9; } button:disabled { opacity:0.5; cursor:default; }
  .btn-ghost { background:#26303f; color:var(--text); }
  .muted { color:var(--text-dim); font-size:13px; }
  .err { color:var(--neg); }
  input { background:#0e131b; border:1px solid var(--border); border-radius:6px; padding:8px; color:var(--text); font:inherit; }
  .row { display:flex; gap:8px; margin-bottom:4px; }
  table { width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; }
  th { text-align:left; color:var(--text-dim); font-weight:600; font-size:11px; text-transform:uppercase; padding:6px 8px; border-bottom:1px solid var(--border); }
  td { padding:8px; border-bottom:1px solid #1c2330; font-variant-numeric:tabular-nums; }
  a { color:var(--accent); }
  .spin { color:var(--text-dim); }
  ${NAV_CSS}
</style>
</head>
<body>
<div class="wrap">
  <h1>📜 Transactions</h1>
  <div class="sub">Recent USDC transfers for any address on Arc Testnet — reads live from the RPC, scanning the last 10,000 blocks.</div>
  ${navBar("transactions")}

  <div class="card">
    <div class="row">
      <input id="addr-input" placeholder="0x… address" style="flex:1"/>
      <button onclick="loadFor(document.getElementById('addr-input').value.trim())">Look up</button>
    </div>
    <button class="btn-ghost" onclick="connectAndLoad()">Or connect wallet</button>
    <div id="addr-out" class="muted" style="margin-top:8px"></div>
  </div>

  <div class="card">
    <div id="txs-out"><div class="muted">Enter an address or connect a wallet above.</div></div>
  </div>
</div>

<script src="/static/wallet-bundle.js"></script>
<script>
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const money = n => '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6});
async function get(url){ const r = await fetch(url); const j = await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status)); return j; }
function trunc(a){ return a && a.length>10 ? a.slice(0,6)+'…'+a.slice(-4) : (a||''); }

let currentAddress = null;

async function connectAndLoad(){
  const out = document.getElementById('addr-out');
  out.innerHTML = 'Connecting…';
  try{
    const addr = await window.ArcPayWallet.connect();
    document.getElementById('addr-input').value = addr;
    await loadFor(addr);
  }catch(e){
    out.innerHTML = '<span class="err">'+esc(e.message)+'</span>';
  }
}

async function loadFor(address){
  if(!address){ document.getElementById('addr-out').innerHTML = '<span class="err">Enter an address first.</span>'; return; }
  currentAddress = address;
  document.getElementById('addr-out').innerHTML = 'Showing: <span class="addr">'+esc(address)+'</span>';
  const out = document.getElementById('txs-out');
  out.innerHTML = '<div class="spin">Loading…</div>';
  try{
    const txs = await get('/api/txs?address='+encodeURIComponent(address));
    if(!txs.length){ out.innerHTML = '<div class="muted">No transfers found in the recent block range.</div>'; return; }
    let h = '<table><thead><tr><th>Tx</th><th>Direction</th><th>Amount</th><th>Block</th></tr></thead><tbody>';
    for(const t of txs){
      const isOut = t.from.toLowerCase() === address.toLowerCase();
      h += '<tr><td><a href="${ARC_EXPLORER_URL}/tx/'+esc(t.hash)+'" target="_blank" rel="noopener">'+trunc(t.hash)+'</a></td>'
        + '<td class="'+(isOut?'err':'')+'">'+(isOut?'Sent':'Received')+'</td>'
        + '<td>'+money(t.amountUsdc)+'</td>'
        + '<td class="muted">'+t.blockNumber+'</td></tr>';
    }
    out.innerHTML = h + '</tbody></table>';
  }catch(e){
    out.innerHTML = '<div class="err">'+esc(e.message)+'</div>';
  }
}
</script>
</body>
</html>`;
}
