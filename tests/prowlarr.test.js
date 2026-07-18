// Network-free unit tests for the Prowlarr provider, with a mocked fetch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prowlarrConfigured, prowlarrProvider, prowlarrIndexerList, testProwlarr } from '../provider.js';

const ok = (data) => ({ ok: true, status: 200, json: async () => data });

const INDEXERS = [
  { id: 1, name: 'NZBgeek', protocol: 'usenet', enable: true },
  { id: 2, name: 'RARBG', protocol: 'torrent' },              // enable omitted → on
  { id: 3, name: 'Retired', protocol: 'usenet', enable: false }, // disabled → skipped
  { id: 4, name: 'AnimeBytes', protocol: 'torrent', enable: true },
];

const cfg = (extra) => ({ prowlarrEnabled: true, prowlarrUrl: 'http://p:9696/', prowlarrApiKey: 'KEY', ...extra });

test('prowlarrConfigured requires enabled + url + key', () => {
  assert.equal(prowlarrConfigured({ prowlarrEnabled: true, prowlarrUrl: 'http://p' }), false);
  assert.equal(prowlarrConfigured(cfg()), true);
});

test('provider is inactive (empty, not exclusive) when unconfigured', async () => {
  const r = await prowlarrProvider.indexers({ prowlarrEnabled: false }, 'newznab', { fetchImpl: async () => ok(INDEXERS) });
  assert.deepEqual(r, { indexers: [], exclusive: false });
});

test('provider returns per-protocol feeds and is exclusive when configured', async () => {
  const nz = await prowlarrProvider.indexers(cfg(), 'newznab', { fetchImpl: async () => ok(INDEXERS) });
  assert.equal(nz.exclusive, true);
  assert.deepEqual(nz.indexers, [{ name: 'Prowlarr: NZBgeek', url: 'http://p:9696/1/api', apiKey: 'KEY' }]);

  const tz = await prowlarrProvider.indexers(cfg({ prowlarrUrl: 'http://p:9696' }), 'torznab', { fetchImpl: async () => ok(INDEXERS) });
  assert.deepEqual(tz.indexers.map((i) => i.name), ['Prowlarr: RARBG', 'Prowlarr: AnimeBytes']);
});

test('excluded ids are skipped', async () => {
  const tz = await prowlarrProvider.indexers(cfg({ prowlarrExcludeIds: '4', prowlarrUrl: 'http://ex' }), 'torznab', { fetchImpl: async () => ok(INDEXERS) });
  assert.deepEqual(tz.indexers.map((i) => i.name), ['Prowlarr: RARBG']); // id 4 excluded
});

test('prowlarrIndexerList returns id/name/protocol for the picker', async () => {
  const list = await prowlarrIndexerList({ prowlarrUrl: 'http://list', prowlarrApiKey: 'k' }, { fetchImpl: async () => ok(INDEXERS) });
  assert.deepEqual(list, [
    { id: 1, name: 'NZBgeek', protocol: 'usenet' },
    { id: 2, name: 'RARBG', protocol: 'torrent' },
    { id: 4, name: 'AnimeBytes', protocol: 'torrent' },
  ]);
});

test('testProwlarr reports counts and failures', async () => {
  const good = await testProwlarr({ prowlarrUrl: 'http://t', prowlarrApiKey: 'k' }, { fetchImpl: async () => ok(INDEXERS) });
  assert.equal(good.ok, true);
  assert.equal(good.usenet, 1);
  assert.equal(good.torrent, 2);
  const unauth = await testProwlarr({ prowlarrUrl: 'http://t' }, { fetchImpl: async () => ({ ok: false, status: 401 }) });
  assert.equal(unauth.ok, false);
  assert.match(unauth.message, /Unauthorized/);
});
