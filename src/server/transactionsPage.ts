import { ARC_EXPLORER_URL } from "../chain/constants.js";
import { pageShell } from "./theme.js";

/** Standalone transaction-history page — connect a wallet, or paste any address, to see its recent USDC transfers. */
export function transactionsPage(): string {
  const body = `
  <div class="card">
    <div class="row" style="display:flex;gap:8px">
      <input id="addr-input" placeholder="0x… address" style="flex:1"/>
      <button onclick="loadFor(document.getElementById('addr-input').value.trim())">Look up</button>
    </div>
    <button class="btn-ghost" style="margin-top:10px" onclick="connectAndLoad()">Or connect wallet</button>
    <div id="addr-out" class="muted" style="margin-top:10px"></div>
  </div>

  <div class="card">
    <div id="txs-out"><div class="muted">Enter an address or connect a wallet above.</div></div>
  </div>`;

  const scripts = `
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
  out.innerHTML = '<div class="spin">Loading</div>';
  try{
    const txs = await get('/api/txs?address='+encodeURIComponent(address));
    if(!txs.length){ out.innerHTML = '<div class="muted">No transfers found in the recent block range.</div>'; return; }
    let h = '<table><thead><tr><th>Tx</th><th>Direction</th><th>Amount</th><th>Block</th></tr></thead><tbody>';
    for(const t of txs){
      const isOut = t.from.toLowerCase() === address.toLowerCase();
      h += '<tr><td><a href="${ARC_EXPLORER_URL}/tx/'+esc(t.hash)+'" target="_blank" rel="noopener">'+trunc(t.hash)+'</a></td>'
        + '<td class="'+(isOut?'err':'pos')+'">'+(isOut?'Sent':'Received')+'</td>'
        + '<td>'+money(t.amountUsdc)+'</td>'
        + '<td class="muted">'+t.blockNumber+'</td></tr>';
    }
    out.innerHTML = h + '</tbody></table>';
  }catch(e){
    out.innerHTML = '<div class="err">'+esc(e.message)+'</div>';
  }
}
</script>`;

  return pageShell({
    active: "transactions",
    title: "Transactions — Arc Pay",
    eyebrow: "Ledger",
    pageTitle: "Transactions",
    subtitle: "Recent USDC transfers for any address on Arc Testnet — reads live from the RPC, scanning the last 10,000 blocks.",
    body,
    extraScripts: scripts,
  });
}
