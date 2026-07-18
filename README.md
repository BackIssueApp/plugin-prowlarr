# Prowlarr Source

Feed BackIssue's built-in **Usenet** and **Torrent** sources with the indexers
your [Prowlarr](https://prowlarr.com) instance manages — configure Prowlarr once
instead of listing each indexer by hand. Prowlarr's usenet indexers feed the
Usenet source; its torrent indexers feed Torrents.

## Install

One click from **Sidebar → Plugins** in BackIssue, or drop this folder into the
app's `plugins/` directory and restart.

## Setup

Enable it in **Settings → Sources → Prowlarr**:

- **Prowlarr URL** — e.g. `http://prowlarr:9696`.
- **API key** — in Prowlarr under **Settings → General → Security**.
- **Indexers** — press **Load** to list your Prowlarr indexers, then tick the
  ones BackIssue should search. All are used until you deselect some, and any
  indexer you later add in Prowlarr is used automatically.

Use **Test connection** to confirm reachability and see how many usenet/torrent
indexers are enabled.

While Prowlarr is enabled, the manually entered Newznab/Torznab indexers on the
Usenet and Torrent panels are ignored (they're shown as managed).

## How it works

The plugin registers an **indexer provider** (`registerIndexerProvider`): it
fetches Prowlarr's indexer list and exposes each indexer's Newznab/Torznab feed
to the matching built-in source. Searching, grabbing and importing all reuse the
built-in paths — Prowlarr only **finds** releases, so a download client
(SABnzbd/NZBGet and/or qBittorrent) is still required and does the actual
download.
