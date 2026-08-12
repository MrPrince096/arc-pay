import { pageShell } from "./theme.js";

/** Agent-pays demo — an autonomous, server-side "agent" that pays a tiny gated USDC amount per action, subject to a visible spend cap. No wallet-connect needed here — the agent signs itself, via Circle's developer-controlled wallet adapter. */
export function agentPage(): string {
  const body = `
  <div class="card">
    <div class="card-label">Spend cap · this session</div>
    <div class="grid2">
      <div class="stat"><div class="k">Spent today</div><div class="v num" id="spent-today">—</div></div>
      <div class="stat"><div class="k">Daily cap</div><div class="v num" id="daily-cap">—</div></div>
    </div>
    <div class="gauge"><div class="gauge-fill" id="cap-gauge" style="width:0%"></div></div>
  </div>

  <div class="card">
    <div class="card-label">Trigger a gated action</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <input id="ag-to" placeholder="Recipient address (0x…)" style="flex:2;min-width:220px"/>
      <input id="ag-amount" type="number" step="0.001" value="0.01" placeholder="Amount USDC" style="flex:1;min-width:100px"/>
    </div>
    <input id="ag-action" placeholder="Action label (e.g. unlock-article)" value="unlock-content" style="width:100%;margin-bottom:12px"/>
    <button onclick="trigger()">Trigger agent payment</button>
    <div id="trigger-out"></div>
  </div>

  <div class="card">
    <div class="card-label">Spend log</div>
    <div id="log-out"><div class="spin">Loading</div></div>
  </div>`;

  const scripts = `
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
  out.innerHTML = '<div class="spin" style="margin-top:8px">Running</div>';
  try{
    const result = await post('/api/agent/action', { to, amountUsdc, action });
    const cls = result.sent ? 'pos' : (result.willSend ? 'err' : 'muted');
    out.innerHTML = '<div class="banner '+cls+'" style="margin-top:10px">'+esc(result.description)+'</div>';
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
    const pct = r.caps.dailyCapUsdc > 0 ? Math.min(100, (r.todaysTotalUsdc / r.caps.dailyCapUsdc) * 100) : 0;
    document.getElementById('cap-gauge').style.width = pct + '%';
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
</script>`;

  return pageShell({
    active: "agent",
    title: "Agent demo — PraneethArc",
    eyebrow: "Agentic economy",
    pageTitle: "Agent-pays demo",
    subtitle: "A server-side agent autonomously pays a tiny USDC amount per action. No wallet popup — it signs itself via a Circle developer-controlled wallet, gated by a visible spend cap.",
    body,
    extraScripts: scripts,
  });
}
