/**
 * Shared design system + page shell for PraneethArc. One place for fonts,
 * design tokens, base component styles, and the sidebar layout — every
 * page (except the standalone payer view) renders through `pageShell()`
 * instead of hand-rolling its own <html> boilerplate.
 *
 * Aesthetic direction: a precision "instrument panel" — grounded in Arc's
 * own real brand (deep navy/charcoal, electric cyan accent, institutional
 * fintech tone — confirmed by reading arc.io directly), pushed into a
 * proper trading-terminal-style dark UI: monospace figures for every
 * number/address, a glowing cyan accent for live/interactive state, amber
 * for value, a subtle schematic grid texture, and a left sidebar instead
 * of a cramped centered form column.
 */
import { navItems, type NavId } from "./nav.js";

export const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">`;

export const BASE_CSS = `
  :root {
    --bg: #07080a;
    --bg-glow: radial-gradient(1100px 560px at 14% -6%, rgba(43,232,255,0.10), transparent 60%),
                radial-gradient(900px 480px at 88% 8%, rgba(245,185,66,0.06), transparent 55%);
    --grid: repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 88px),
             repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 88px);
    --panel: #0d0f13;
    --panel-2: #12151a;
    --panel-hover: #171b21;
    --border: #1e222a;
    --border-strong: #2a2f39;
    --text: #edf1f5;
    --text-dim: #8c95a3;
    --text-faint: #565d68;
    --cyan: #37e9ff;
    --cyan-dim: rgba(55,233,255,0.10);
    --cyan-glow: rgba(55,233,255,0.35);
    --amber: #f5b942;
    --green: #3ddc97;
    --red: #ff5f74;
    --radius: 16px;
    --radius-sm: 10px;
    --font-display: 'Instrument Serif', Georgia, serif;
    --font-body: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
  }
  * { box-sizing: border-box; }
  html { color-scheme: dark; }
  body {
    margin: 0;
    background: var(--bg);
    background-image: var(--bg-glow), var(--grid);
    background-attachment: fixed;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 15px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--cyan); text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { font-family: var(--font-mono); background: var(--panel-2); padding: 2px 6px; border-radius: 5px; font-size: 0.9em; border: 1px solid var(--border); }

  .shell { display: flex; min-height: 100vh; }

  .sidebar {
    width: 232px; flex: none; padding: 24px 16px;
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 4px;
    position: sticky; top: 0; height: 100vh;
  }
  .brand { display: flex; align-items: center; gap: 10px; padding: 4px 10px 22px; }
  .brand .mark {
    width: 34px; height: 34px; border-radius: 9px; flex: none;
    background: linear-gradient(155deg, var(--cyan), #0a8fa8);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; box-shadow: 0 0 24px var(--cyan-glow);
  }
  .brand .word { font-family: var(--font-display); font-size: 21px; letter-spacing: 0.2px; }
  .brand .word i { font-style: italic; color: var(--cyan); }

  .navlink {
    display: flex; align-items: center; gap: 11px;
    padding: 10px 12px; border-radius: var(--radius-sm);
    color: var(--text-dim); font-size: 13.5px; font-weight: 600;
    border-left: 2px solid transparent; position: relative;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .navlink:hover { background: var(--panel-2); color: var(--text); text-decoration: none; }
  .navlink .ic { font-size: 15px; width: 18px; text-align: center; }
  .navlink.active {
    background: var(--cyan-dim); color: var(--text);
    border-left: 2px solid var(--cyan);
  }
  .navlink.active .ic { filter: drop-shadow(0 0 6px var(--cyan-glow)); }

  .sidebar-foot { margin-top: auto; padding: 12px 10px 4px; }
  .netstat {
    display: flex; align-items: center; gap: 8px;
    font-size: 11.5px; color: var(--text-dim); font-family: var(--font-mono);
    padding: 9px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm);
    background: var(--panel);
  }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); flex: none;
    box-shadow: 0 0 0 0 rgba(61,220,151,0.6); animation: pulse 2s infinite; }
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(61,220,151,0.55); }
    70% { box-shadow: 0 0 0 7px rgba(61,220,151,0); }
    100% { box-shadow: 0 0 0 0 rgba(61,220,151,0); }
  }

  .main { flex: 1; min-width: 0; padding: 40px 44px 60px; max-width: 900px; }
  .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--text-faint); margin-bottom: 8px; }
  h1.title { font-family: var(--font-display); font-size: 36px; font-weight: 400; margin: 0 0 8px; letter-spacing: 0.1px; }
  .subtitle { color: var(--text-dim); font-size: 14px; max-width: 62ch; margin-bottom: 30px; }

  .card {
    background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 22px; margin-bottom: 18px;
    opacity: 0; animation: rise 0.5s ease forwards;
  }
  .card + .card { animation-delay: 0.06s; }
  .card + .card + .card { animation-delay: 0.12s; }
  @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  .card-label { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-faint); margin-bottom: 12px; }

  button, .btn {
    background: var(--cyan); color: #04181c; border: none; border-radius: var(--radius-sm);
    padding: 11px 18px; font-weight: 700; font-size: 13.5px; font-family: var(--font-body);
    cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
    transition: transform 0.12s ease, box-shadow 0.15s ease;
    box-shadow: 0 0 0 rgba(55,233,255,0);
  }
  button:hover, .btn:hover { box-shadow: 0 0 22px var(--cyan-glow); transform: translateY(-1px); text-decoration: none; }
  button:active, .btn:active { transform: translateY(0); }
  button:disabled { opacity: 0.45; cursor: default; box-shadow: none; transform: none; }
  .btn-ghost { background: var(--panel-2); color: var(--text); border: 1px solid var(--border-strong); }
  .btn-ghost:hover { box-shadow: none; border-color: var(--cyan); }
  .btn-block { width: 100%; justify-content: center; }

  input, select {
    background: #0a0c0f; border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
    padding: 10px 12px; color: var(--text); font: inherit; font-family: var(--font-body);
    transition: border-color 0.15s ease;
  }
  input:focus, select:focus { outline: none; border-color: var(--cyan); }
  input::placeholder { color: var(--text-faint); }

  .num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .addr { font-family: var(--font-mono); font-size: 13px; word-break: break-all; color: var(--text-dim); }
  .muted { color: var(--text-dim); font-size: 13px; }
  .faint { color: var(--text-faint); font-size: 12px; }
  .pos { color: var(--green); }
  .neg { color: var(--red); }
  .err { color: var(--red); }
  .amber { color: var(--amber); }
  .err-box { color: var(--red); background: rgba(255,95,116,0.08); border: 1px solid rgba(255,95,116,0.25); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 13px; }
  .ok-box { color: var(--green); background: rgba(61,220,151,0.08); border: 1px solid rgba(61,220,151,0.25); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 13px; }
  .spin { color: var(--text-dim); display: flex; align-items: center; gap: 8px; }
  .spin::before { content: ''; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--border-strong); border-top-color: var(--cyan); animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .stat .k { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-faint); margin-bottom: 4px; }
  .stat .v { font-family: var(--font-mono); font-size: 24px; font-weight: 600; }

  .gauge { height: 6px; background: var(--panel-2); border-radius: 999px; overflow: hidden; margin-top: 12px; }
  .gauge-fill { height: 100%; background: linear-gradient(90deg, var(--cyan), var(--amber)); border-radius: 999px; transition: width 0.4s ease; box-shadow: 0 0 10px var(--cyan-glow); }
  .banner { padding: 12px 14px; border-radius: var(--radius-sm); font-size: 13px; border: 1px solid var(--border); background: var(--panel-2); }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: var(--text-faint); font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.6px; padding: 8px 10px; border-bottom: 1px solid var(--border); }
  td { padding: 10px; border-bottom: 1px solid var(--border); font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--panel-2); }

  @media (max-width: 760px) {
    .shell { flex-direction: column; }
    .sidebar { width: 100%; height: auto; position: static; flex-direction: row; align-items: center; padding: 14px 16px; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--border); }
    .brand { padding: 0 12px 0 0; }
    .sidebar-foot { margin-top: 0; margin-left: auto; padding: 0; }
    .navlink { border-left: none; border-bottom: 2px solid transparent; white-space: nowrap; }
    .navlink.active { border-left: none; border-bottom: 2px solid var(--cyan); }
    .main { padding: 26px 18px 40px; max-width: 100%; }
    .grid2 { grid-template-columns: 1fr; }
  }
`;

function sidebar(active: NavId): string {
  const links = navItems
    .map(
      (l) =>
        `<a href="${l.href}" class="navlink${l.id === active ? " active" : ""}"><span class="ic">${l.icon}</span>${l.label}</a>`,
    )
    .join("");
  return `<div class="sidebar">
    <div class="brand"><div class="mark">⚡</div><div class="word">Praneeth<i>Arc</i></div></div>
    ${links}
    <div class="sidebar-foot"><div class="netstat"><span class="dot"></span>Arc Testnet · live</div></div>
  </div>`;
}

/** Full-page wrapper: fonts, base CSS, sidebar, and the main content column. Used by every page except the standalone payer view. */
export function pageShell(opts: {
  active: NavId;
  title: string;
  pageTitle: string;
  eyebrow?: string;
  subtitle: string;
  body: string;
  extraHead?: string;
  extraScripts?: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${opts.title}</title>
${FONTS}
<style>${BASE_CSS}</style>
${opts.extraHead ?? ""}
</head>
<body>
<div class="shell">
  ${sidebar(opts.active)}
  <div class="main">
    ${opts.eyebrow ? `<div class="eyebrow">${opts.eyebrow}</div>` : ""}
    <h1 class="title">${opts.pageTitle}</h1>
    <div class="subtitle">${opts.subtitle}</div>
    ${opts.body}
  </div>
</div>
${opts.extraScripts ?? ""}
</body>
</html>`;
}
