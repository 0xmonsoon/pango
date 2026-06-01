// Pure display helpers — no server-only imports, so Client Components can use them.

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function shortenAddress(addr: string): string {
  return addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}

// What to call a wallet in the UI: its label, or a shortened address as fallback.
export function walletName(label: string | null, address: string): string {
  const trimmed = label?.trim();
  return trimmed ? trimmed : shortenAddress(address);
}
