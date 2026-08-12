import { ARC_EXPLORER_URL } from "../chain/constants.js";

/** USDC ↔ EURC swap demo — powered by App Kit's own kit.swap()/estimateSwap(), verified live on Arc Testnet. Reuses the same wallet-bundle.js as the dashboard and pay page. */
export function swapPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Swap — Arc Pay</title>
<style>
  :root { --bg:#0b0e14; --card:#141922; --border:#232a37; --text:#e6e9ef; --text-dim:#8b93a1; --accent:#6fb0ff; --pos:#22d3a5; --neg:#f87171; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .wrap { max-width:480px; margin:0 auto; padding:32px 20px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:var(--text-dim); font-size:13px; margin-bottom:24px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:20px; margin-bottom:16px; }
  button { background:var(--accent); color:#0b0e14; border:none; border-radius:6px; padding:9px 16px; font-weight:600; font-size:14px; cursor:pointer; }
  button:hover { opacity:0.9; } button:disabled { opacity:0.5; cursor:default; }
  .btn-ghost { background:#26303f; color:var(--text); }
  .muted { color:var(--text-dim); font-size:13px; }
  .err { color:var(--neg); }
  .pos { color:var(--pos); }
  input, select { background:#0e131b; border:1px solid var(--border); border-radius:6px; padding:8px; color:var(--text); font:inherit; }
  .row { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
  .swap-flip { display:flex; justify-content:center; margin:2px 0 10px; }
  .swap-flip button { padding:4px 10px; font-size:16px; }
  .quote { padding:10px 12px; border-radius:6px; font-size:13px; margin-top:12px; background:#0e131b; border:1px solid var(--border); }
  .quote .out { font-size:20px; font-weight:700; font-family:ui-monospace,monospace; margin:4px 0; }
  .addr { font-family:ui-monospace,monospace; font-size:13px; word-break:break-all; }
  a { color:var(--accent); }
  .spin { color:var(--text-dim); }
</style>
</head>
<body>
<div class="wrap">
  <h1>🔄 Swap</h1>
  <div class="sub">USDC ↔ EURC on Arc Testnet — quoted and executed via Circle App Kit's own <code>kit.swap()</code>, not a hand-rolled contract call. <a href="/">← Dashboard</a></div>

  <div class="card">
    <button id="connect-btn" onclick="connect()">Connect wallet</button>
    <div class="muted" style="margin-top:10px">Requires a real browser tab with an injected wallet and Arc Testnet added.</div>
    <div id="connect-out"></div>
  </div>

  <div id="swap-card" class="card" style="display:none">
    <div class="row">
      <input id="amount-in" type="number" step="0.0001" value="1" style="flex:1"/>
      <select id="token-in">
        <option value="USDC">USDC</option>
        <option value="EURC">EURC</option>
      </select>
    </div>
    <div class="swap-flip"><button class="btn-ghost" onclick="flip()" title="Flip direction">⇅</button></div>
    <div class="row">
      <input id="token-out-display" disabled style="flex:1;opacity:.6"/>
      <select id="token-out">
        <option value="EURC">EURC</option>
        <option value="USDC">USDC</option>
      </select>
    </div>
    <button id="quote-btn" onclick="getQuote()" class="btn-ghost">Get quote</button>
    <div id="quote-out"></div>
    <button id="swap-btn" onclick="doSwap()" style="margin-top:10px;width:100%;display:none">Swap</button>
    <div id="swap-out"></div>
  </div>
</div>

<script src="/static/wallet-bundle.js"></script>
<script>
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

async function connect(){
  const btn = document.getElementById('connect-btn');
  const out = document.getElementById('connect-out');
  btn.disabled = true;
  out.innerHTML = '<div class="spin" style="margin-top:8px">Connecting…</div>';
  try{
    await window.ArcPayWallet.connect();
    out.innerHTML = '';
    btn.textContent = 'Connected';
    document.getElementById('swap-card').style.display = '';
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
  document.getElementById('quote-out').innerHTML = '';
  document.getElementById('swap-btn').style.display = 'none';
}

let lastQuoteAmount = null;

async function getQuote(){
  const tokenIn = document.getElementById('token-in').value;
  const tokenOut = document.getElementById('token-out').value;
  const amountIn = document.getElementById('amount-in').value;
  const out = document.getElementById('quote-out');
  document.getElementById('swap-btn').style.display = 'none';
  if(tokenIn === tokenOut){ out.innerHTML = '<div class="err" style="margin-top:10px">Pick two different tokens.</div>'; return; }
  out.innerHTML = '<div class="spin" style="margin-top:10px">Quoting…</div>';
  try{
    const est = await window.ArcPayWallet.estimateSwap(tokenIn, tokenOut, amountIn);
    lastQuoteAmount = amountIn;
    const feesTotal = (est.fees||[]).reduce((s,f)=>s+Number(f.amount),0);
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
  out.innerHTML = '<div class="spin" style="margin-top:10px">Swapping — approve in your wallet (may be two prompts: approve + swap)…</div>';
  try{
    const txHash = await window.ArcPayWallet.swap(tokenIn, tokenOut, amountIn);
    out.innerHTML = '<div class="pos" style="margin-top:10px">✅ Swapped. <a href="${ARC_EXPLORER_URL}/tx/'+esc(txHash)+'" target="_blank" rel="noopener">View on Arcscan →</a></div>';
  }catch(e){
    out.innerHTML = '<div class="err" style="margin-top:10px">'+esc(e.message)+'</div>';
  }
  btn.disabled = false;
}
</script>
</body>
</html>`;
}
