# Hubra plugins

[![Publish the Marketplace](https://github.com/hubra-app/hubra-plugins/actions/workflows/publish.yml/badge.svg?branch=main)](https://github.com/hubra-app/hubra-plugins/actions/workflows/publish.yml?query=branch%3Amain)

The official Marketplace of [Hubra](https://hubra.club): a signed `index.json`
at **https://plugins.hubra.club/index.json**, which every Hubra trusts out of
the box (signed with the Hubra project key, `Hubra.pub`).

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

| Plugin | Repository |
| --- | --- |
| Bank file import | [hubra-plugin-bank-import](https://github.com/hubra-app/hubra-plugin-bank-import) |
| Budgets | [hubra-plugin-budgets](https://github.com/hubra-app/hubra-plugin-budgets) |
| Discord | [hubra-plugin-discord](https://github.com/hubra-app/hubra-plugin-discord) |
| Guides | [hubra-plugin-guides](https://github.com/hubra-app/hubra-plugin-guides) |
| Shared inbox (IMAP) | [hubra-plugin-imap-inbox](https://github.com/hubra-app/hubra-plugin-imap-inbox) |
| Keys | [hubra-plugin-keys](https://github.com/hubra-app/hubra-plugin-keys) |

## A new plugin

From the Hubra repository: `python3 tools/plugin_repo/make_plugin_repo.py
plugins/<id> ../hubra-plugin-<id>`, push it to `hubra-app/hubra-plugin-<id>`
(public), and publish its first release.
