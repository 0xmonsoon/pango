// Supported chains and lightweight address validation.
// These regexes are input sanity checks, not full checksum validation — the
// chain adapters (phase 3) perform real lookups and will reject bad addresses.

export const CHAIN_KINDS = ["evm", "solana", "bitcoin", "zcash"] as const;
export type ChainKind = (typeof CHAIN_KINDS)[number];

export interface ChainMeta {
  kind: ChainKind;
  label: string;
  placeholder: string;
  hint: string;
}

export const CHAINS: ChainMeta[] = [
  {
    kind: "evm",
    label: "EVM",
    placeholder: "0x…",
    hint: "Ethereum, Arbitrum, Base, Polygon, etc. (one address covers all EVM chains)",
  },
  {
    kind: "solana",
    label: "Solana",
    placeholder: "Base58 address",
    hint: "Your Solana wallet address",
  },
  {
    kind: "bitcoin",
    label: "Bitcoin",
    placeholder: "bc1… / 1… / 3…",
    hint: "Legacy, P2SH, or native SegWit (bech32) address",
  },
  {
    kind: "zcash",
    label: "Zcash (transparent)",
    placeholder: "t1… / t3…",
    hint: "Transparent addresses only — shielded (z) addresses can't be tracked",
  },
];

export function chainLabel(kind: ChainKind): string {
  return CHAINS.find((c) => c.kind === kind)?.label ?? kind;
}

// Compact label for badges (drops qualifiers like "(transparent)" so it stays
// narrow on mobile). The full label still appears in the chain picker.
export function chainShortLabel(kind: ChainKind): string {
  return kind === "zcash" ? "Zcash" : chainLabel(kind);
}

export function isChainKind(value: string): value is ChainKind {
  return (CHAIN_KINDS as readonly string[]).includes(value);
}

const VALIDATORS: Record<ChainKind, RegExp[]> = {
  evm: [/^0x[a-fA-F0-9]{40}$/],
  // base58, no 0/O/I/l
  solana: [/^[1-9A-HJ-NP-Za-km-z]{32,44}$/],
  bitcoin: [
    /^[13][a-km-zA-HJ-NP-Z1-9]{25,39}$/, // legacy / P2SH
    /^bc1[a-z0-9]{11,71}$/i, // bech32 / bech32m
  ],
  // transparent t-addrs: t1 (P2PKH) or t3 (P2SH), base58check, 35 chars total
  zcash: [/^t[13][a-km-zA-HJ-NP-Z1-9]{33}$/],
};

export function isValidAddress(chain: ChainKind, address: string): boolean {
  const patterns = VALIDATORS[chain];
  if (!patterns) return false;
  return patterns.some((re) => re.test(address));
}
