import { navBar, NAV_CSS } from "./nav.js";

/** Points at Circle's real testnet faucet — captcha-gated, so this app can only link out to it, never claim on your behalf. */
export function faucetPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Faucet — Arc Pay</title>
<style>
  :root { --bg:#0b0e14; --card:#141922; --border:#232a37; --text:#e6e9ef; --text-dim:#8b93a1; --accent:#6fb0ff; --pos:#22d3a5; --neg:#f87171; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .wrap { max-width:480px; margin:0 auto; padding:32px 20px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:var(--text-dim); font-size:13px; margin-bottom:24px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:20px; margin-bottom:16px; }
  button, .btn { background:var(--accent); color:#0b0e14; border:none; border-radius:6px; padding:12px 16px; font-weight:600; font-size:15px; cursor:pointer; text-decoration:none; display:inline-block; }
  button:hover, .btn:hover { opacity:0.9; }
  input { background:#0e131b; border:1px solid var(--border); border-radius:6px; padding:8px; color:var(--text); font:inherit; width:100%; margin-bottom:10px; }
  .muted { color:var(--text-dim); font-size:13px; }
  .step { display:flex; gap:10px; margin-bottom:14px; align-items:flex-start; }
  .step .n { background:#26303f; color:var(--text); border-radius:50%; width:22px; height:22px; flex:none; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; }
  code { background:#0e131b; padding:2px 6px; border-radius:4px; font-size:13px; }
  ${NAV_CSS}
</style>
</head>
<body>
<div class="wrap">
  <h1>🚰 Faucet</h1>
  <div class="sub">Claim free testnet USDC/EURC to try the rest of Arc Pay.</div>
  ${navBar("faucet")}

  <div class="card">
    <div class="step"><div class="n">1</div><div>Copy the address you want funded (your own wallet, or the agent wallet from <code>.env</code>).</div></div>
    <input id="addr" placeholder="0x… (optional — just to copy/reference)"/>
    <div class="step"><div class="n">2</div><div>Open Circle's faucet and paste it in. It's captcha-gated, so this app can only link you there — it can't claim on your behalf.</div></div>
    <div class="step"><div class="n">3</div><div>Come back and check your balance on the <a href="/">Dashboard</a> or <a href="/transactions">Transactions</a> page.</div></div>
    <a class="btn" href="https://faucet.circle.com" target="_blank" rel="noopener">Open faucet.circle.com →</a>
    <div class="muted" style="margin-top:12px">Dispenses testnet USDC, EURC, and cirBTC. Select "Arc" as the network on their form.</div>
  </div>
</div>
</body>
</html>`;
}
