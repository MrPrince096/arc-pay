import { ARC_EXPLORER_URL, ARC_NFT_CONTRACT_ADDRESS } from "../chain/constants.js";
import { pageShell } from "./theme.js";

const EXTRA_CSS = `
<style>
  .nftgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 4px; }
  .nftstat { text-align: center; padding: 14px 8px; background: #0a0c0f; border: 1px solid var(--border); border-radius: 12px; }
  .nftstat .v { font-family: var(--font-mono); font-size: 22px; font-weight: 700; color: var(--cyan); }
  .nftstat .k { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-faint); margin-top: 4px; }
</style>`;

/** Free-mint demo — ArcPayDemoNFT (contracts/ArcPayDemoNFT.sol), a real ERC-721 this project deployed and verified live on Arc Testnet. */
export function mintPage(): string {
  const body = `
  <div class="card">
    <button id="connect-btn" onclick="connect()">Connect wallet</button>
    <div class="faint" style="margin-top:10px">Requires a real browser tab with an injected wallet and Arc Testnet added.</div>
    <div id="connect-out"></div>
  </div>

  <div class="card">
    <div class="card-label" id="coll-name">Arc Pay Demo (APDEMO)</div>
    <div class="nftgrid">
      <div class="nftstat"><div class="v num" id="total-supply">—</div><div class="k">Minted</div></div>
      <div class="nftstat"><div class="v num" id="max-supply">—</div><div class="k">Max supply</div></div>
      <div class="nftstat"><div class="v num" id="your-minted">—</div><div class="k">You've minted</div></div>
    </div>
    <button id="mint-btn" class="btn-block" style="margin-top:18px" onclick="doMint()" disabled>Connect a wallet to mint</button>
    <div id="mint-out"></div>
    <div class="faint" style="margin-top:12px">Free mint, up to 5 per wallet. <a href="${ARC_EXPLORER_URL}/address/${ARC_NFT_CONTRACT_ADDRESS}" target="_blank" rel="noopener">View contract on Arcscan →</a></div>
  </div>

  <div class="card">
    <div class="card-label">How this works</div>
    <div class="muted">A real ERC-721 contract, hand-written and deployed by this project (no imports, no framework) to Arc Testnet, funded from the agent wallet. Minting calls its public <code>mint()</code> function directly via your connected wallet — you pay your own gas, no server involved.</div>
  </div>`;

  const scripts = `
<script src="/static/wallet-bundle.js"></script>
<script>
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function get(url){ const r = await fetch(url); const j = await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status)); return j; }
const CONTRACT = ${JSON.stringify(ARC_NFT_CONTRACT_ADDRESS)};

let myAddress = null;

async function loadStats(){
  try{
    const url = '/api/nft/stats' + (myAddress ? '?address='+encodeURIComponent(myAddress) : '');
    const s = await get(url);
    document.getElementById('coll-name').textContent = s.name + ' (' + s.symbol + ')';
    document.getElementById('total-supply').textContent = s.totalSupply;
    document.getElementById('max-supply').textContent = s.maxSupply;
    document.getElementById('your-minted').textContent = s.mintedByYou !== undefined ? s.mintedByYou + ' / ' + s.maxPerWallet : '—';
  }catch(e){ /* stats are a nice-to-have; a failed fetch shouldn't block minting */ }
}

async function connect(){
  const btn = document.getElementById('connect-btn');
  const out = document.getElementById('connect-out');
  btn.disabled = true;
  out.innerHTML = '<div class="spin" style="margin-top:8px">Connecting</div>';
  try{
    myAddress = await window.ArcPayWallet.connect();
    out.innerHTML = '';
    btn.textContent = 'Connected';
    document.getElementById('mint-btn').disabled = false;
    document.getElementById('mint-btn').textContent = 'Mint';
    await loadStats();
  }catch(e){
    out.innerHTML = '<div class="err" style="margin-top:8px">'+esc(e.message)+'</div>';
    btn.disabled = false;
  }
}

async function doMint(){
  const btn = document.getElementById('mint-btn');
  const out = document.getElementById('mint-out');
  btn.disabled = true;
  out.innerHTML = '<div class="spin" style="margin-top:10px">Minting — approve in your wallet</div>';
  try{
    const txHash = await window.ArcPayWallet.mintNft(CONTRACT);
    out.innerHTML = '<div class="ok-box" style="margin-top:10px">✅ Minted. <a href="${ARC_EXPLORER_URL}/tx/'+esc(txHash)+'" target="_blank" rel="noopener">View on Arcscan →</a></div>';
    await loadStats();
  }catch(e){
    out.innerHTML = '<div class="err-box" style="margin-top:10px">'+esc(e.message)+'</div>';
  }
  btn.disabled = false;
}

loadStats();
</script>`;

  return pageShell({
    active: "mint",
    title: "Mint — PraneethArc",
    eyebrow: "NFT",
    pageTitle: "Mint",
    subtitle: "A free-mint ERC-721 this project deployed and verified live on Arc Testnet — real contract, real mint, your own gas.",
    body,
    extraHead: EXTRA_CSS,
    extraScripts: scripts,
  });
}
