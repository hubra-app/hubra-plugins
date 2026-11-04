# Hubra plugins

[![Publish the Marketplace](https://github.com/hubra-app/hubra-plugins/actions/workflows/publish.yml/badge.svg?branch=main)](https://github.com/hubra-app/hubra-plugins/actions/workflows/publish.yml?query=branch%3Amain)

The official Marketplace of [Hubra](https://hubra.club): a signed `index.json`
at **https://plugins.hubra.club/index.json**, which every Hubra trusts out of
the box (plugins signed with the Hubra plugin key `Hubra.pub`, the index with the Hubra index key in `keys/official/index/`).

## How it works

- Every plugin lives in its own repository, `hubra-app/hubra-plugin-<id>`.
  Publishing a GitHub release there (tag `v<version>`) tests the plugin,
  builds its frontend, signs it and attaches `<id>-<version>.zip`.
- [`plugins.yaml`](plugins.yaml) finds those repositories: every public
  `hubra-plugin-*` repository of hubra-app is included by itself. The
  [publish workflow](.github/workflows/publish.yml) reads their releases every
  hour (and when this repository changes or a plugin is released), checks each
  archive's checksum and signature, publishes the signed index with GitHub
  Pages, and then downloads it again from plugins.hubra.club and verifies every
  archive the way a Hubra does.
- Every release is a version platform admins can install, update to or go
  back to, with its release notes. A version is withdrawn by adding
  `withdrawn: {"1.2.0": "why"}` to its entry: Hubra warns everyone who has it,
  and updates skip it.

| Plugin | Repository | Version |
| --- | --- | --- |
| Bank file import | [hubra-plugin-bank-import](https://github.com/hubra-app/hubra-plugin-bank-import) | [1.2.0](https://github.com/hubra-app/hubra-plugin-bank-import/releases/tag/v1.2.0) |
| Budgets | [hubra-plugin-budgets](https://github.com/hubra-app/hubra-plugin-budgets) | [1.1.0](https://github.com/hubra-app/hubra-plugin-budgets/releases/tag/v1.1.0) |
| Codes | [hubra-plugin-codes](https://github.com/hubra-app/hubra-plugin-codes) | [2.0.0](https://github.com/hubra-app/hubra-plugin-codes/releases/tag/v2.0.0) |
| Discord | [hubra-plugin-discord](https://github.com/hubra-app/hubra-plugin-discord) | [2.5.0](https://github.com/hubra-app/hubra-plugin-discord/releases/tag/v2.5.0) |
| Guides | [hubra-plugin-guides](https://github.com/hubra-app/hubra-plugin-guides) | [1.1.0](https://github.com/hubra-app/hubra-plugin-guides/releases/tag/v1.1.0) |
| Inventory | [hubra-plugin-inventory](https://github.com/hubra-app/hubra-plugin-inventory) | [2.1.0](https://github.com/hubra-app/hubra-plugin-inventory/releases/tag/v2.1.0) |
| Keys | [hubra-plugin-keys](https://github.com/hubra-app/hubra-plugin-keys) | [1.1.0](https://github.com/hubra-app/hubra-plugin-keys/releases/tag/v1.1.0) |
| Shared inbox (IMAP) | [hubra-plugin-imap-inbox](https://github.com/hubra-app/hubra-plugin-imap-inbox) | [1.1.0](https://github.com/hubra-app/hubra-plugin-imap-inbox/releases/tag/v1.1.0) |

The version is each plugin's latest GitHub release. After every plugin
release, or when a new plugin is added, update this table and the other
plugin lists with the checklist in
[hubra/docs/plugin-releases.md](https://github.com/hubra-app/hubra/blob/main/docs/plugin-releases.md).

## The web pages

Next to `index.json`, plugins.hubra.club serves a small site that hubra.club
links to: the Marketplace (`/`, `/en/`), which lists the plugins from
`index.json` in the browser, and the guide for plugin authors
(`/entwickeln/`, `/en/develop/`). The pages are written in `src/pages/` and
built into `public/` with `python3 tools/build.py` (standard library only;
`--check` fails when `public/` is out of date or a link is broken). `public/`
is committed, and the publish workflow copies it next to the index. The look
and `public/assets/site.css`, `theme.js` and the fonts are copied from
[hubra.club](https://github.com/hubra-app/hubra.club); `market.css` and
`market.js` are this site's own.

## A new plugin

From the Hubra repository: `python3 tools/plugin_repo/make_plugin_repo.py
plugins/<id> ../hubra-plugin-<id>`, push it to `hubra-app/hubra-plugin-<id>`
(public), and publish its first release.
