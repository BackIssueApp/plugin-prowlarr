// Prowlarr client + the indexer provider BackIssue's core registers. Prowlarr
// manages many indexers (usenet + torrent) and exposes each as a Newznab/Torznab
// feed at {base}/{id}/api, authenticated with the Prowlarr API key. We fetch its
// indexer list and hand those feeds to the built-in Usenet (Newznab) and Torrent
// (Torznab) sources via registerIndexerProvider. Prowlarr only FINDS releases;
// the actual download still goes through SABnzbd/NZBGet or qBittorrent.
//
// Which indexers are used is the user's choice: prowlarrExcludeIds is a CSV of
// Prowlarr indexer ids to skip (blank = use all). It's applied per call, so
// changing the selection takes effect without waiting out the cache.
const UA = 'comic-metadata-client/1.0';

export function prowlarrConfigured(config) {
  return !!(config?.prowlarrEnabled && config?.prowlarrUrl && config?.prowlarrApiKey);
}

function base(config) {
  return String(config?.prowlarrUrl || '').replace(/\/+$/, '');
}

function excludeSet(config) {
  return new Set(String(config?.prowlarrExcludeIds || '').split(',').map((s) => s.trim()).filter(Boolean));
}

// Newznab/Torznab category filter applied to every Prowlarr indexer search.
// Prowlarr fronts general-purpose indexers, so unscoped queries drown comic
// results in movies/TV that happen to match a series title. Default: 7000
// (Books parent) + 7030 (Comics). Blank = uncategorised (old behaviour).
export function categoryFilter(config) {
  const raw = config?.prowlarrCategories;
  if (raw === undefined || raw === null) return '7000,7030';
  return String(raw).split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s)).join(',');
}

// Cache the RAW indexer list briefly so a burst of per-issue searches doesn't hit
// Prowlarr on every call. Keyed by url+key. Exclusion filtering happens after the
// cache so toggling indexers is instant.
let cache = { key: '', at: 0, list: null };
const TTL_MS = 5 * 60 * 1000;

async function fetchRawIndexers(config, fetchImpl) {
  const key = `${base(config)}|${config.prowlarrApiKey || ''}`;
  if (cache.key === key && cache.list && Date.now() - cache.at < TTL_MS) return cache.list;
  let list;
  try {
    const res = await fetchImpl(`${base(config)}/api/v1/indexer`, { headers: { 'X-Api-Key': config.prowlarrApiKey || '', 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    list = await res.json();
  } catch (e) {
    console.warn('prowlarr: indexer list failed —', e?.message || e);
    return cache.key === key && cache.list ? cache.list : [];
  }
  const clean = (Array.isArray(list) ? list : []).filter((ix) => ix && ix.enable !== false);
  cache = { key, at: Date.now(), list: clean };
  return clean;
}

// The indexers to search for a protocol ('newznab' = usenet, 'torznab' =
// torrent), as { name, url, apiKey } descriptors, after dropping excluded ids.
async function indexersFor(config, protocol, fetchImpl) {
  const want = protocol === 'torznab' ? 'torrent' : 'usenet';
  const excluded = excludeSet(config);
  const out = [];
  const cat = categoryFilter(config);
  for (const ix of await fetchRawIndexers(config, fetchImpl)) {
    if (ix.protocol !== want || excluded.has(String(ix.id))) continue;
    out.push({ name: `Prowlarr: ${ix.name || ix.id}`, url: `${base(config)}/${ix.id}/api`, apiKey: config.prowlarrApiKey, cat });
  }
  return out;
}

// The provider object core registers. When Prowlarr is configured it is
// exclusive — the manually-entered indexers are dropped in its favour.
export const prowlarrProvider = {
  id: 'prowlarr',
  isActive: prowlarrConfigured,
  async indexers(config, protocol, { fetchImpl = fetch } = {}) {
    if (!prowlarrConfigured(config)) return { indexers: [], exclusive: false };
    return { indexers: await indexersFor(config, protocol, fetchImpl), exclusive: true };
  },
};

// The full enabled indexer list for the settings picker: { id, name, protocol }.
export async function prowlarrIndexerList(config, { fetchImpl = fetch } = {}) {
  if (!config?.prowlarrUrl) return [];
  const list = await fetchRawIndexers(config, fetchImpl);
  return list.map((ix) => ({ id: ix.id, name: ix.name || String(ix.id), protocol: ix.protocol || 'unknown' }));
}

// Connection test for the settings Test button.
export async function testProwlarr(config, { fetchImpl = fetch } = {}) {
  if (!config?.prowlarrUrl) return { ok: false, message: 'A Prowlarr URL is required.' };
  let res;
  try { res = await fetchImpl(`${base(config)}/api/v1/indexer`, { headers: { 'X-Api-Key': config.prowlarrApiKey || '', 'User-Agent': UA } }); }
  catch (e) { return { ok: false, message: `Connection failed: ${e.message}` }; }
  if (res.status === 401) return { ok: false, message: 'Unauthorized — check the API key.' };
  if (!res.ok) return { ok: false, message: `HTTP ${res.status} — check the URL.` };
  let list;
  try { list = await res.json(); }
  catch { return { ok: false, message: 'Response was not JSON — is this the Prowlarr base URL?' }; }
  if (!Array.isArray(list)) return { ok: false, message: 'Unexpected response — is this a Prowlarr server?' };
  const enabled = list.filter((i) => i && i.enable !== false);
  const usenet = enabled.filter((i) => i.protocol === 'usenet').length;
  const torrent = enabled.filter((i) => i.protocol === 'torrent').length;
  return {
    ok: true, usenet, torrent,
    message: enabled.length
      ? `Connected — ${enabled.length} indexer${enabled.length === 1 ? '' : 's'} (${usenet} usenet, ${torrent} torrent).`
      : 'Connected, but Prowlarr has no enabled indexers yet.',
  };
}
