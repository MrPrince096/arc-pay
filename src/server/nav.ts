/** Shared top nav for the standalone pages (dashboard, swap, agent, faucet, transactions). The pay page intentionally omits this — it's a minimal external payer view, not part of the app's own navigation. */
export function navBar(active: "dashboard" | "swap" | "agent" | "faucet" | "transactions"): string {
  const links: { id: typeof active; href: string; label: string }[] = [
    { id: "dashboard", href: "/", label: "💳 Dashboard" },
    { id: "swap", href: "/swap", label: "🔄 Swap" },
    { id: "agent", href: "/agent", label: "🤖 Agent" },
    { id: "faucet", href: "/faucet", label: "🚰 Faucet" },
    { id: "transactions", href: "/transactions", label: "📜 Transactions" },
  ];
  const items = links
    .map((l) => `<a href="${l.href}" class="${l.id === active ? "active" : ""}">${l.label}</a>`)
    .join("");
  return `<nav class="topnav">${items}</nav>`;
}

/** Shared CSS for the nav — appended into each page's existing <style> block. */
export const NAV_CSS = `
  .topnav { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:12px; }
  .topnav a { color:var(--text-dim); text-decoration:none; font-size:13px; padding:6px 10px; border-radius:6px; }
  .topnav a:hover { background:#1a2028; color:var(--text); }
  .topnav a.active { background:var(--accent); color:#0b0e14; font-weight:600; }
`;
