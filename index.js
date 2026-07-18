// Prowlarr plugin for BackIssue.
//
// Registers an indexer provider that feeds the built-in Usenet (Newznab) and
// Torrent (Torznab) sources with the indexers your Prowlarr instance manages —
// so you configure Prowlarr once instead of listing each indexer by hand. A
// per-indexer picker chooses which are used. Prowlarr only finds releases, so a
// download client (SABnzbd/NZBGet and/or qBittorrent) is still required.
import { prowlarrProvider, testProwlarr, prowlarrIndexerList } from './provider.js';

export default function register(api) {
  api.registerIndexerProvider(prowlarrProvider);

  api.registerSettings({
    prowlarrEnabled: { type: 'bool' },
    prowlarrUrl: { type: 'string', allowEmpty: true },       // e.g. http://prowlarr:9696
    prowlarrApiKey: { type: 'string', allowEmpty: true },
    prowlarrExcludeIds: { type: 'string', allowEmpty: true }, // CSV of ids to skip (blank = all)
  });

  api.registerClientAsset({ js: 'client/ui.js', css: 'client/ui.css' });

  // Probe Prowlarr without saving (the settings Test button target).
  api.registerRoute('post', '/api/prowlarr/test', async (req, res) => {
    const { url, apiKey } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, message: 'A Prowlarr URL is required.' });
    try {
      res.json(await testProwlarr({ prowlarrUrl: String(url).replace(/\/+$/, ''), prowlarrApiKey: apiKey || '' }));
    } catch (e) {
      res.json({ ok: false, message: String(e?.message || e) });
    }
  });

  // List Prowlarr's enabled indexers for the picker (id/name/protocol). Takes
  // url/key from the body so it works before the settings are saved.
  api.registerRoute('post', '/api/prowlarr/indexers', async (req, res) => {
    const { url, apiKey } = req.body || {};
    if (!url) return res.status(400).json({ error: 'A Prowlarr URL is required.' });
    try {
      const indexers = await prowlarrIndexerList({ prowlarrUrl: String(url).replace(/\/+$/, ''), prowlarrApiKey: apiKey || '' });
      res.json({ indexers });
    } catch (e) {
      res.status(502).json({ error: String(e?.message || e) });
    }
  });
}
