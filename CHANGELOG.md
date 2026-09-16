# Changelog

Notable, user-facing changes per release. Format follows [Keep a Changelog](https://keepachangelog.com);
versions follow the tags in this repository (`vX.Y.Z` → the release bundle BackIssue's plugin catalog installs).

Contributors: please **don't** edit this file in pull requests — entries are added
by the maintainers when changes merge, so concurrent PRs don't conflict here.

## [Unreleased]

### Fixed

- **The Categories field now sticks.** It was rendered on the card and honoured
  by searches, but never registered as a setting — so the app dropped the value
  on save and every search fell back to the `7000,7030` default. Whatever you
  type, including a blank field for no category filter, is now kept.

## [1.1.0] — 2026-07-21

### Added
- **Category filter**: searches through Prowlarr indexers are now limited to
  configurable Newznab/Torznab categories (default `7000,7030` — Books and
  Comics), so general-purpose indexers stop returning movie/TV noise. A new
  "Categories" field in the Prowlarr settings customises the list; leaving it
  blank searches without a category filter (the old behaviour).

## [1.0.0] — 2026-07-18

Initial release: point BackIssue at your Prowlarr instance and its indexers feed
the built-in Usenet and Torrent sources. A per-indexer picker chooses which are
searched; while enabled, the manually entered indexers are ignored. Requires
BackIssue with `registerIndexerProvider` support.
