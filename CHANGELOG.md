# Changelog

Notable, user-facing changes per release. Format follows [Keep a Changelog](https://keepachangelog.com);
versions follow the tags in this repository (`vX.Y.Z` → the release bundle BackIssue's plugin catalog installs).

Contributors: please **don't** edit this file in pull requests — entries are added
by the maintainers when changes merge, so concurrent PRs don't conflict here.

## [Unreleased]

## [1.0.0] — 2026-07-18

Initial release: point BackIssue at your Prowlarr instance and its indexers feed
the built-in Usenet and Torrent sources. A per-indexer picker chooses which are
searched; while enabled, the manually entered indexers are ignored. Requires
BackIssue with `registerIndexerProvider` support.
