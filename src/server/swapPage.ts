import { ARC_EXPLORER_URL } from "../chain/constants.js";
import { pageShell } from "./theme.js";

const EXTRA_CSS = `
<style>
  .swapbox { position: relative; }
  .tokrow { background: #0a0c0f; border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; }
  .tokrow .amt { display: flex; align-items: center; gap: 10px; }
  .tokrow input { background: transparent; border: none; padding: 0; font-family: var(--font-mono); font-size: 26px; font-weight: 600; width: 100%; }
  .tokrow input:focus { outline: none; }
  .tokrow .lbl { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-faint); margin-bottom: 6px; }
  .tokpill { display: flex; align-items: center; gap: 7px; background: var(--panel-2); border: 1px solid var(--border-strong); border-radius: 999px; padding: 7px 12px 7px 8px; font-weight: 700; font-size: 13.5px; flex: none; }
  .tokpill .coin { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #04181c; }
  .tokpill select { background: transparent; border: none; color: var(--text); font: inherit; font-weight: 700; padding: 0; }
  .tokpill select:focus { outline: none; }
  .coin-usdc { background: linear-gradient(155deg, #37e9ff, #0a8fa8); }
  .coin-eurc { background: linear-gradient(155deg, #f5b942, #b9791a); }
  .flip-wrap { display: flex; justify-content: center; margin: -10px 0; position: relative; z-index: 1; }
  .flip-btn { width: 34px; height: 34px; border-radius: 10px; background: var(--panel); border: 1px solid var(--border-strong); color: var(--cyan); font-size: 15px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease, border-color 0.15s ease; }
  .flip-btn:hover { transform: rotate(180deg); border-color: var(--cyan); }
  .quote { padding: 14px 16px; border-radius: 12px; font-size: 13px; margin-top: 14px; background: var(--cyan-dim); border: 1px solid rgba(55,233,255,0.25); }
  .quote .out { font-size: 24px; font-weight: 700; font-family: var(--font-mono); margin: 4px 0 8px; }
  .lblrow { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .max-btn { background: var(--cyan-dim); color: var(--cyan); border: none; border-radius: 5px; padding: 1px 7px; font-size: 10.5px; font-weight: 700; cursor: pointer; margin-left: 6px; }
  .max-btn:hover { background: rgba(55,233,255,0.2); }
</style>`;

/** USDC ↔ EURC swap demo — powered by App Kit's own kit.swap()/estimateSwap(), verified live on Arc Testnet. Reuses the same wallet-bundle.js as the dashboard and pay page. */
export function swapPage(): string {
  const body = `
  <div class="card">
    <button id="connect-btn" onclick="connect()">Connect wallet</button>
    <div class="faint" style="margin-top:10px">Requires a real browser tab with an injected wallet and Arc Testnet added.</div>
    <div id="connect-out"></div>
  </div>

  <div id="swap-card" class="card swapbox" style="display:none">
    <div class="tokrow">
      <div class="lblrow">
        <span class="lbl" style="margin:0">You pay</span>
        <span class="faint num">Balance: <span id="bal-in">—</span><button class="max-btn" onclick="setMax()">MAX</button></span>
      </div>
      <div class="amt">
        <input id="amount-in" type="number" step="0.0001" value="1" oninput="renderBalances()"/>
        <div class="tokpill"><span class="coin coin-usdc" id="coin-in">$</span><select id="token-in" onchange="onTokenChange()"><option value="USDC">USDC</option><option value="EURC">EURC</option></select></div>
      </div>
    </div>
    <div class="flip-wrap"><div class="flip-btn" onclick="flip()" title="Flip direction">⇅</div></div>
    <div class="tokrow">
      <div class="lblrow">
        <span class="lbl" style="margin:0">You receive</span>
        <span class="faint num">Balance: <span id="bal-out">—</span></span>
      </div>
      <div class="amt">
        <div class="muted num" style="flex:1;font-size:26px" id="amount-out-preview">—</div>
        <div class="tokpill"><span class="coin coin-eurc" id="coin-out">€</span><select id="token-out" onchange="onTokenChange()"><option value="EURC">EURC</option><option value="USDC">USDC</option></select></div>
      </div>
    </div>

    <button id="quote-btn" onclick="getQuote()" class="btn-ghost btn-block" style="margin-top:14px">Get quote</button>
    <div id="quote-out"></div>
    <button id="swap-btn" onclick="doSwap()" class="btn-block" style="margin-top:10px;display:none">Swap</button>
    <div id="swap-out"></div>
  </div>

  <div class="card">
    <div class="card-label">How this works</div>
    <div class="muted">Quoted and executed via Circle App Kit's own <code>kit.swap()</code> / <code>kit.estimateSwap()</code> — not a hand-rolled contract call. Under the hood this almost certainly routes through <b>Arc Swap</b>, a community-deployed Uniswap V2 fork on Arc Testnet.</div>
  </div>`;

  const scripts = `
<script src="/static/wallet-bundle.js"></script>
<script>
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function get(url){ const r = await fetch(url); const j = await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status)); return j; }

let walletBalance = { erc20Usdc: 0, eurc: 0 };

function syncCoin(){
  const map = { USDC: { cls: 'coin-usdc', glyph: '$' }, EURC: { cls: 'coin-eurc', glyph: '€' } };
  for (const [id, sel] of [['coin-in','token-in'],['coin-out','token-out']]){
    const el = document.getElementById(id);
    const tok = document.getElementById(sel).value;
    el.className = 'coin ' + map[tok].cls;
    el.textContent = map[tok].glyph;
  }
}

function balFor(tok){ return tok === 'USDC' ? walletBalance.erc20Usdc : walletBalance.eurc; }

function renderBalances(){
  const tokenIn = document.getElementById('token-in').value;
  const tokenOut = document.getElementById('token-out').value;
  document.getElementById('bal-in').textContent = balFor(tokenIn).toLocaleString('en-US',{maximumFractionDigits:6});
  document.getElementById('bal-out').textContent = balFor(tokenOut).toLocaleString('en-US',{maximumFractionDigits:6});
}

function setMax(){
  document.getElementById('amount-in').value = balFor(document.getElementById('token-in').value);
}

function onTokenChange(){ syncCoin(); renderBalances(); }

async function loadBalance(){
  const addr = window.ArcPayWallet.getAddress();
  if(!addr) return;
  try{
    walletBalance = await get('/api/balance?address='+encodeURIComponent(addr));
    renderBalances();
  }catch(e){ /* balance is a nice-to-have here; a failed fetch shouldn't block the swap UI */ }
}

async function connect(){
  const btn = document.getElementById('connect-btn');
  const out = document.getElementById('connect-out');
  btn.disabled = true;
  out.innerHTML = '<div class="spin" style="margin-top:8px">Connecting</div>';
  try{
    await window.ArcPayWallet.connect();
    out.innerHTML = '';
    btn.textContent = 'Connected';
    document.getElementById('swap-card').style.display = '';
    await loadBalance();
  }catch(e){
    out.innerHTML = '<div class="err" style="margin-top:8px">'+esc(e.message)+'</div>';
    btn.disabled = false;
  }
}

function flip(){
  const tokenIn = document.getElementById('token-in');
  const tokenOut = document.getElementById('token-out');
  const tmp = tokenIn.value;
  tokenIn.value = tokenOut.value;
  tokenOut.value = tmp;
  syncCoin();
  renderBalances();
  document.getElementById('amount-out-preview').textContent = '—';
  document.getElementById('quote-out').innerHTML = '';
  document.getElementById('swap-btn').style.display = 'none';
}

async function getQuote(){
  const tokenIn = document.getElementById('token-in').value;
  const tokenOut = document.getElementById('token-out').value;
  const amountIn = document.getElementById('amount-in').value;
  const out = document.getElementById('quote-out');
  document.getElementById('swap-btn').style.display = 'none';
  if(tokenIn === tokenOut){ out.innerHTML = '<div class="err" style="margin-top:10px">Pick two different tokens.</div>'; return; }
  out.innerHTML = '<div class="spin" style="margin-top:10px">Quoting</div>';
  try{
    const est = await window.ArcPayWallet.estimateSwap(tokenIn, tokenOut, amountIn);
    const feesTotal = (est.fees||[]).reduce((s,f)=>s+Number(f.amount),0);
    document.getElementById('amount-out-preview').textContent = est.estimatedOutput.amount;
    out.innerHTML = '<div class="quote">'
      + '<div class="muted">Estimated output</div>'
      + '<div class="out">'+est.estimatedOutput.amount+' '+esc(est.estimatedOutput.token)+'</div>'
      + '<div class="muted">Minimum (after slippage): '+est.stopLimit.amount+' '+esc(est.stopLimit.token)+'</div>'
      + '<div class="muted">Fees: ~'+feesTotal.toFixed(6)+' USDC (provider + gas)</div>'
      + '</div>';
    document.getElementById('swap-btn').style.display = '';
  }catch(e){
    out.innerHTML = '<div class="err" style="margin-top:10px">'+esc(e.message)+'</div>';
  }
}

async function doSwap(){
  const tokenIn = document.getElementById('token-in').value;
  const tokenOut = document.getElementById('token-out').value;
  const amountIn = document.getElementById('amount-in').value;
  const btn = document.getElementById('swap-btn');
  const out = document.getElementById('swap-out');
  btn.disabled = true;
  out.innerHTML = '<div class="spin" style="margin-top:10px">Swapping — approve in your wallet (may be two prompts: approve + swap)</div>';
  try{
    const txHash = await window.ArcPayWallet.swap(tokenIn, tokenOut, amountIn);
    out.innerHTML = '<div class="ok-box" style="margin-top:10px">✅ Swapped. <a href="${ARC_EXPLORER_URL}/tx/'+esc(txHash)+'" target="_blank" rel="noopener">View on Arcscan →</a></div>';
    await loadBalance();
  }catch(e){
    out.innerHTML = '<div class="err-box" style="margin-top:10px">'+esc(e.message)+'</div>';
  }
  btn.disabled = false;
}
</script>`;

  return pageShell({
    active: "swap",
    title: "Swap — Arc Pay",
    eyebrow: "Exchange",
    pageTitle: "Swap",
    subtitle: "USDC ↔ EURC on Arc Testnet, quoted and executed via Circle App Kit.",
    body,
    extraHead: EXTRA_CSS,
    extraScripts: scripts,
  });
}
