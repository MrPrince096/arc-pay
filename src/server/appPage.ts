import { ARC_EXPLORER_URL } from "../chain/constants.js";
import { pageShell } from "./theme.js";

/** The dashboard SPA. Vanilla JS, no framework — the only bundled piece is the wallet-connect script tag below. */
export function appPage(): string {
  const body = `
  <div class="card">
    <div class="card-label">Wallet</div>
    <button id="connect-btn" onclick="connect()">Connect wallet</button>
    <div class="faint" style="margin-top:10px">Requires a real browser tab with an injected wallet (MetaMask, Rabby, …) with Arc Testnet added. Won't work inside an embedded/isolated webview.</div>
    <div id="connect-out"></div>
  </div>

  <div id="dashboard" style="display:none">
    <div class="card">
      <div class="card-label">Connected address</div>
      <div class="addr" id="addr-out"></div>
      <div class="grid2" style="margin-top:14px">
        <div class="stat"><div class="k">Native balance</div><div class="v num" id="native-bal">—</div></div>
        <div class="stat"><div class="k">ERC-20 view</div><div class="v num" id="erc20-bal">—</div></div>
      </div>
      <button class="btn-ghost" style="margin-top:14px" onclick="refresh()">↻ Refresh</button>
    </div>

    <div class="card">
      <div class="card-label">Recent USDC transfers</div>
      <div id="txs-out"><div class="spin">Loading</div></div>
    </div>
  </div>

  <div class="card">
    <div class="card-label">Create a payment request</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <input id="inv-recipient" placeholder="Recipient address (0x…)" style="flex:2;min-width:220px"/>
      <input id="inv-amount" type="number" step="0.01" placeholder="Amount USDC" style="flex:1;min-width:100px"/>
    </div>
    <input id="inv-memo" placeholder="Memo (optional)" style="width:100%;margin-bottom:12px"/>
    <button onclick="createInvoice()">Create invoice</button>
    <div id="create-out"></div>
  </div>

  <div class="card">
    <div class="card-label">Your invoices</div>
    <div id="invoices-out"><div class="spin">Loading</div></div>
  </div>`;

  const scripts = `
<script src="/static/wallet-bundle.js"></script>
<script>
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const money = n => '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6});
async function get(url){ const r = await fetch(url); const j = await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status)); return j; }
async function post(url,body){ const r = await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})}); const j = await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status)); return j; }
function trunc(a){ return a.length>10 ? a.slice(0,6)+'…'+a.slice(-4) : a; }

let currentAddress = null;

async function connect(){
  const btn = document.getElementById('connect-btn');
  const out = document.getElementById('connect-out');
  btn.disabled = true;
  out.innerHTML = '<div class="spin" style="margin-top:8px">Connecting</div>';
  try{
    currentAddress = await window.ArcPayWallet.connect();
    out.innerHTML = '';
    document.getElementById('dashboard').style.display = '';
    document.getElementById('addr-out').innerHTML = '<a href="${ARC_EXPLORER_URL}/address/'+esc(currentAddress)+'" target="_blank" rel="noopener">'+esc(currentAddress)+'</a>';
    btn.textContent = 'Connected';
    await refresh();
  }catch(e){
    out.innerHTML = '<div class="err" style="margin-top:8px">'+esc(e.message)+'</div>';
    btn.disabled = false;
  }
}

async function refresh(){
  if(!currentAddress) return;
  try{
    const bal = await get('/api/balance?address='+encodeURIComponent(currentAddress));
    document.getElementById('native-bal').textContent = money(bal.nativeUsdc);
    document.getElementById('erc20-bal').textContent = money(bal.erc20Usdc);
  }catch(e){
    document.getElementById('native-bal').textContent = 'error';
    document.getElementById('erc20-bal').textContent = 'error';
  }
  const txsOut = document.getElementById('txs-out');
  txsOut.innerHTML = '<div class="spin">Loading</div>';
  try{
    const txs = await get('/api/txs?address='+encodeURIComponent(currentAddress));
    if(!txs.length){ txsOut.innerHTML = '<div class="muted">No transfers found in the recent block range.</div>'; return; }
    let h = '<table><thead><tr><th>Tx</th><th>Direction</th><th>Amount</th><th>Block</th></tr></thead><tbody>';
    for(const t of txs){
      const out = t.from.toLowerCase() === currentAddress.toLowerCase();
      h += '<tr><td><a href="${ARC_EXPLORER_URL}/tx/'+esc(t.hash)+'" target="_blank" rel="noopener">'+trunc(t.hash)+'</a></td>'
        + '<td class="'+(out?'err':'pos')+'">'+(out?'Sent':'Received')+'</td>'
        + '<td>'+money(t.amountUsdc)+'</td>'
        + '<td class="muted">'+t.blockNumber+'</td></tr>';
    }
    txsOut.innerHTML = h + '</tbody></table>';
  }catch(e){
    txsOut.innerHTML = '<div class="err">'+esc(e.message)+'</div>';
  }
}

async function createInvoice(){
  const recipient = document.getElementById('inv-recipient').value.trim();
  const amountUsdc = Number(document.getElementById('inv-amount').value);
  const memo = document.getElementById('inv-memo').value.trim();
  const out = document.getElementById('create-out');
  out.innerHTML = '<div class="spin" style="margin-top:8px">Creating</div>';
  try{
    await post('/api/invoices/create', { recipient, amountUsdc, memo });
    document.getElementById('inv-recipient').value = '';
    document.getElementById('inv-amount').value = '';
    document.getElementById('inv-memo').value = '';
    out.innerHTML = '';
    loadInvoices();
  }catch(e){
    out.innerHTML = '<div class="err" style="margin-top:8px">'+esc(e.message)+'</div>';
  }
}

async function loadInvoices(){
  const out = document.getElementById('invoices-out');
  try{
    const invoices = await get('/api/invoices');
    if(!invoices.length){ out.innerHTML = '<div class="muted">No invoices yet.</div>'; return; }
    let h = '<table><thead><tr><th>Amount</th><th>Recipient</th><th>Status</th><th>Link</th></tr></thead><tbody>';
    for(const inv of invoices){
      const payUrl = location.origin + '/pay/' + inv.id;
      h += '<tr><td>'+money(inv.amountUsdc)+'</td><td class="addr">'+trunc(inv.recipient)+'</td>'
        + '<td class="'+(inv.status==='paid'?'pos':'muted')+'">'+esc(inv.status)+'</td>'
        + '<td>'+(inv.status==='paid'
            ? '<a href="${ARC_EXPLORER_URL}/tx/'+esc(inv.txHash||'')+'" target="_blank" rel="noopener">tx →</a>'
            : '<a href="'+esc(payUrl)+'" target="_blank" rel="noopener">pay link →</a>')
        + '</td></tr>';
    }
    out.innerHTML = h + '</tbody></table>';
  }catch(e){
    out.innerHTML = '<div class="err">'+esc(e.message)+'</div>';
  }
}
loadInvoices();
setInterval(loadInvoices, 3000);
</script>`;

  return pageShell({
    active: "dashboard",
    title: "Arc Pay",
    eyebrow: "Wallet",
    pageTitle: "Dashboard",
    subtitle: "Live USDC balance and transfer history on Arc Testnet, plus shareable payment requests.",
    body,
    extraScripts: scripts,
  });
}
