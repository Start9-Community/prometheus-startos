# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- Alertmanager's host id, port and dependent username come from the `alertmanager-startos` npm dependency; never hardcode them.
- Remount Alertmanager's `public` volume only when its bridge address changes (`mountedFor` in `startos/utils.ts`). A mount taken before an Alertmanager reinstall keeps showing the deleted volume's stale key, and remounting on every run pulls the file out from under the key's `.const()` watcher.
