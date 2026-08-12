export type NavId = "dashboard" | "swap" | "mint" | "sign" | "agent" | "faucet" | "transactions";

export const navItems: { id: NavId; href: string; label: string; icon: string }[] = [
  { id: "dashboard", href: "/", label: "Dashboard", icon: "◈" },
  { id: "swap", href: "/swap", label: "Swap", icon: "⇄" },
  { id: "mint", href: "/mint", label: "Mint NFT", icon: "◆" },
  { id: "sign", href: "/sign", label: "Sign", icon: "✎" },
  { id: "agent", href: "/agent", label: "Agent", icon: "◉" },
  { id: "faucet", href: "/faucet", label: "Faucet", icon: "◐" },
  { id: "transactions", href: "/transactions", label: "Transactions", icon: "≡" },
];
