export function coinGeckoUrl(id: string): string {
  return `https://www.coingecko.com/en/coins/${encodeURIComponent(id)}`;
}

// A page slug can differ from the API ID (e.g. firo -> zcoin).
// Only parse the URL; never fetch a user-supplied host.
export function coinSlugFromUrl(query: string): string | null {
  const value = query.trim();
  if (!/^(?:[a-z][a-z\d+.-]*:\/\/|\/\/|(?:www\.)?coingecko\.com(?:\/|$))/i.test(value)) return null;
  const invalid = () => new Error("Paste a CoinGecko token link, such as https://www.coingecko.com/en/coins/bitcoin.");
  let url: URL;
  try { url = new URL(value.startsWith("//") ? `https:${value}` : /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`); }
  catch { throw invalid(); }
  if (!["https:", "http:"].includes(url.protocol) || !["coingecko.com", "www.coingecko.com"].includes(url.hostname) || url.username || url.password || url.port) throw invalid();
  let pathname: string;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { throw invalid(); }
  const match = pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?coins\/([a-z0-9_-]{1,200})(?:\/(?:historical_data|markets))?\/?$/i);
  if (!match) throw invalid();
  return match[1].toLowerCase();
}
