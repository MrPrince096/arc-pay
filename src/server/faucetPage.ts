import { pageShell } from "./theme.js";

const EXTRA_CSS = `
<style>
  .steps { display: flex; flex-direction: column; gap: 16px; margin-bottom: 18px; }
  .step { display: flex; gap: 14px; align-items: flex-start; }
  .step .n { background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(55,233,255,0.3); border-radius: 50%; width: 26px; height: 26px; flex: none; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; font-family: var(--font-mono); }
</style>`;

/** Points at Circle's real testnet faucet — captcha-gated, so this app can only link out to it, never claim on your behalf. */
export function faucetPage(): string {
  const body = `
  <div class="card">
    <div class="steps">
      <div class="step"><div class="n">1</div><div>Copy the address you want funded — your own wallet, or the agent wallet from <code>.env</code>.</div></div>
    </div>
    <input id="addr" placeholder="0x… (optional — just to copy/reference)" style="width:100%;margin-bottom:18px"/>
    <div class="steps">
      <div class="step"><div class="n">2</div><div>Open Circle's faucet and paste it in. It's captcha-gated, so this app can only link you there — it can't claim on your behalf.</div></div>
      <div class="step"><div class="n">3</div><div>Come back and check your balance on the <a href="/">Dashboard</a> or <a href="/transactions">Transactions</a> page.</div></div>
    </div>
    <a class="btn" href="https://faucet.circle.com" target="_blank" rel="noopener">Open faucet.circle.com →</a>
    <div class="faint" style="margin-top:14px">Dispenses testnet USDC, EURC, and cirBTC. Select "Arc" as the network on their form.</div>
  </div>`;

  return pageShell({
    active: "faucet",
    title: "Faucet — Arc Pay",
    eyebrow: "Testnet funds",
    pageTitle: "Faucet",
    subtitle: "Claim free testnet USDC/EURC to try the rest of Arc Pay.",
    body,
    extraHead: EXTRA_CSS,
  });
}
