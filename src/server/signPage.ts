import { pageShell } from "./theme.js";

const EXTRA_CSS = `
<style>
  .sig { font-family: var(--font-mono); font-size: 12px; word-break: break-all; color: var(--text-dim); background: #0a0c0f; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; margin-top: 10px; }
  textarea { background: #0a0c0f; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); padding: 10px 12px; color: var(--text); font: inherit; width: 100%; resize: vertical; min-height: 70px; }
  textarea:focus { outline: none; border-color: var(--cyan); }
</style>`;

/** Off-chain signing demos — personal_sign and EIP-712 typed data, both signed via plain viem against the connected wallet (App Kit doesn't expose generic signing). Each signature is independently re-verified server-side via ecrecover, matching the app's "never just trust the client" posture. */
export function signPage(): string {
  const body = `
  <div class="card">
    <button id="connect-btn" onclick="connect()">Connect wallet</button>
    <div class="faint" style="margin-top:10px">Requires a real browser tab with an injected wallet and Arc Testnet added.</div>
    <div id="connect-out"></div>
  </div>

  <div id="sign-cards" style="display:none">
    <div class="card">
      <div class="card-label">Sign a message (personal_sign)</div>
      <textarea id="msg-input">gm from PraneethArc 👋</textarea>
      <button style="margin-top:10px" onclick="doSignMessage()">Sign message</button>
      <div id="msg-out"></div>
    </div>

    <div class="card">
      <div class="card-label">Sign typed data (EIP-712)</div>
      <div class="muted">Signs a fixed <code>Greeting</code> struct — the same mechanism behind permit signatures, just not tied to a token. Domain: <code>PraneethArc</code>, chain 5042002.</div>
      <button style="margin-top:12px" onclick="doSignTyped()">Sign typed data</button>
      <div id="typed-out"></div>
    </div>
  </div>`;

  const scripts = `
<script src="/static/wallet-bundle.js"></script>
<script>
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function post(url,body){ const r = await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})}); const j = await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status)); return j; }

let myAddress = null;

async function connect(){
  const btn = document.getElementById('connect-btn');
  const out = document.getElementById('connect-out');
  btn.disabled = true;
  out.innerHTML = '<div class="spin" style="margin-top:8px">Connecting</div>';
  try{
    myAddress = await window.ArcPayWallet.connect();
    out.innerHTML = '';
    btn.textContent = 'Connected';
    document.getElementById('sign-cards').style.display = '';
  }catch(e){
    out.innerHTML = '<div class="err" style="margin-top:8px">'+esc(e.message)+'</div>';
    btn.disabled = false;
  }
}

async function doSignMessage(){
  const message = document.getElementById('msg-input').value;
  const out = document.getElementById('msg-out');
  out.innerHTML = '<div class="spin" style="margin-top:10px">Signing — approve in your wallet</div>';
  try{
    const signature = await window.ArcPayWallet.signMessage(message);
    out.innerHTML = '<div class="sig">'+esc(signature)+'</div><div class="spin" style="margin-top:8px">Verifying server-side</div>';
    const v = await post('/api/sign/verify', { message, signature, address: myAddress });
    out.innerHTML = out.innerHTML.replace('<div class="spin" style="margin-top:8px">Verifying server-side</div>', '')
      + (v.valid ? '<div class="ok-box" style="margin-top:8px">✅ Verified server-side (ecrecover) — signed by '+esc(myAddress)+'</div>'
                 : '<div class="err-box" style="margin-top:8px">❌ Verification failed</div>');
  }catch(e){
    out.innerHTML = '<div class="err-box" style="margin-top:10px">'+esc(e.message)+'</div>';
  }
}

async function doSignTyped(){
  const out = document.getElementById('typed-out');
  out.innerHTML = '<div class="spin" style="margin-top:10px">Signing — approve in your wallet</div>';
  try{
    const { signature, message, timestamp } = await window.ArcPayWallet.signTypedDataDemo();
    out.innerHTML = '<div class="sig">'+esc(signature)+'</div><div class="spin" style="margin-top:8px">Verifying server-side</div>';
    const v = await post('/api/sign/verify-typed', { signature, address: myAddress, message, timestamp });
    out.innerHTML = out.innerHTML.replace('<div class="spin" style="margin-top:8px">Verifying server-side</div>', '')
      + (v.valid ? '<div class="ok-box" style="margin-top:8px">✅ Verified server-side — signed by '+esc(myAddress)+'</div>'
                 : '<div class="err-box" style="margin-top:8px">❌ Verification failed</div>');
  }catch(e){
    out.innerHTML = '<div class="err-box" style="margin-top:10px">'+esc(e.message)+'</div>';
  }
}
</script>`;

  return pageShell({
    active: "sign",
    title: "Sign — PraneethArc",
    eyebrow: "Off-chain",
    pageTitle: "Sign",
    subtitle: "Message and typed-data signing — no gas, no transaction. Each signature is independently re-verified server-side via ecrecover, never just trusted.",
    body,
    extraHead: EXTRA_CSS,
    extraScripts: scripts,
  });
}
