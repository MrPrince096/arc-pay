/** Agent-pays demo — an autonomous, server-side "agent" that pays a tiny gated USDC amount per action, subject to a visible spend cap. No wallet-connect needed here — the agent signs itself, via Circle's developer-controlled wallet adapter. */
export function agentPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Agent demo — Arc Pay</title>
<style>
  :root { --bg:#0b0e14; --card:#141922; --border:#232a37; --text:#e6e9ef; --text-dim:#8b93a1; --accent:#6fb0ff; --pos:#22d3a5; --neg:#f87171; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .wrap { max-width:640px; margin:0 auto; padding:32px 20px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:var(--text-dim); font-size:13px; margin-bottom:24px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:20px; margin-bottom:16px; }
  input { background:#0e131b; border:1px solid var(--border); border-radius:6px; padding:8px; color:var(--text); font:inherit; }
  button { background:var(--accent); color:#0b0e14; border:none; border-radius:6px; padding:9px 16px; font-weight:600; font-size:14px; cursor:pointer; }
  button:hover { opacity:0.9; } button:disabled { opacity:0.5; cursor:default; }
  .muted { color:var(--text-dim); font-size:13px; }
  .err { color:var(--neg); }
  .pos { color:var(--pos); }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
  .stat .k { color:var(--text-dim); font-size:11px; text-transform:uppercase; letter-spacing:.5px; }
  .stat .v { font-size:20px; font-weight:700; font-family:ui-monospace,monospace; margin-top:2px; }
  table { width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; }
  th { text-align:left; color:var(--text-dim); font-weight:600; font-size:11px; text-transform:uppercase; padding:6px 8px; border-bottom:1px solid var(--border); }
  td { padding:8px; border-bottom:1px solid #1c2330; font-variant-numeric:tabular-nums; }
  a { color:var(--accent); }
  .spin { color:var(--text-dim); }
  .banner { padding:10px 12px; border-radius:6px; font-size:13px; margin-top:10px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>🤖 Agent-pays demo</h1>
  <div class="sub">A server-side agent autonomously pays a tiny USDC amount per action — Circle's "agentic economy" pitch for Arc, live. No wallet popup: the agent signs itself, via a developer-controlled wallet.</div>

  <div class="card">
    <div class="muted" style="margin-bottom:8px">Spend cap (this session)</div>
    <div class="grid">
      <div class="stat"><div class="k">Spent today</div><div class="v" id="spent-today">—</div></div>
      <div class="stat"><div class="k">Daily cap</div><div class="v" id="daily-cap">—</div></div>
    </div>
  </div>

  <div class="card">
    <div class="muted" style="margin-bottom:8px">Trigger a gated action</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <input id="ag-to" placeholder="Recipient address (0x…)" style="flex:2;min-width:220px"/>
      <input id="ag-amount" type="number" step="0.001" value="0.01" placeholder="Amount USDC" style="flex:1;min-width:100px"/>
    </div>
    <input id="ag-action" placeholder="Action label (e.g. unlock-article)" value="unlock-content" style="width:100%;margin-bottom:8px"/>
    <button onclick="trigger()">Trigger agent payment</button>
    <div id="trigger-out"></div>
  </div>

  <div class="card">
    <div class="muted" style="margin-bottom:8px">Spend log</div>
    <div id="log-out"><div class="muted">Loading…</div></div>
  </div>
</div>

<script>
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const money = n => '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6});
async function get(url){ const r = await fetch(url); const j = await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status)); return j; }
async function post(url,body){ const r = await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})}); const j = await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status)); return j; }
function trunc(a){ return a && a.length>10 ? a.slice(0,6)+'…'+a.slice(-4) : (a||''); }

async function trigger(){
  const to = document.getElementById('ag-to').value.trim();
  const amountUsdc = Number(document.getElementById('ag-amount').value);
  const action = document.getElementById('ag-action').value.trim();
  const out = document.getElementById('trigger-out');
  out.innerHTML = '<div class="spin" style="margin-top:8px">Running…</div>';
  try{
    const result = await post('/api/agent/action', { to, amountUsdc, action });
    const cls = result.sent ? 'pos' : (result.willSend ? 'err' : 'muted');
    out.innerHTML = '<div class="banner '+cls+'" style="background:#0e131b;border:1px solid var(--border)">'+esc(result.description)+'</div>';
    loadStatus();
  }catch(e){
    out.innerHTML = '<div class="err" style="margin-top:8px">'+esc(e.message)+'</div>';
  }
}

async function loadStatus(){
  try{
    const r = await get('/api/agent/spend-log');
    document.getElementById('spent-today').textContent = money(r.todaysTotalUsdc);
    document.getElementById('daily-cap').textContent = money(r.caps.dailyCapUsdc);
    const out = document.getElementById('log-out');
    if(!r.entries.length){ out.innerHTML = '<div class="muted">No agent payments yet — trigger one above.</div>'; return; }
    let h = '<table><thead><tr><th>Action</th><th>Amount</th><th>Tx</th><th>When</th></tr></thead><tbody>';
    for(const e of r.entries){
      h += '<tr><td>'+esc(e.action)+'</td><td>'+money(e.amountUsdc)+'</td>'
        + '<td><a href="https://testnet.arcscan.app/tx/'+esc(e.txHash)+'" target="_blank" rel="noopener">'+trunc(e.txHash)+'</a></td>'
        + '<td class="muted">'+new Date(e.timestamp).toLocaleString()+'</td></tr>';
    }
    out.innerHTML = h + '</tbody></table>';
  }catch(e){
    document.getElementById('log-out').innerHTML = '<div class="err">'+esc(e.message)+'</div>';
  }
}
loadStatus();
</script>
</body>
</html>`;
}
