export type NavId = "dashboard" | "swap" | "agent" | "faucet" | "transactions";

export const navItems: { id: NavId; href: string; label: string; icon: string }[] = [
  { id: "dashboard", href: "/", label: "Dashboard", icon: "◈" },
  { id: "swap", href: "/swap", label: "Swap", icon: "⇄" },
  { id: "agent", href: "/agent", label: "Agent", icon: "◉" },
  { id: "faucet", href: "/faucet", label: "Faucet", icon: "◐" },
  { id: "transactions", href: "/transactions", label: "Transactions", icon: "≡" },
];
