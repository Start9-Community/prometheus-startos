<p align="center">
  <img src="icon.svg" alt="Prometheus Logo" width="21%">
</p>

# Prometheus on StartOS

> Everything not listed in this document should behave the same as upstream
> Prometheus. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Prometheus](https://github.com/prometheus/prometheus) collects metrics by scraping targets, stores them as time series, evaluates alerting and recording rules, and serves PromQL queries. This package runs it behind a StartOS-enforced login, generates its configuration from actions, accepts pushed metrics, and sends alerts to the Alertmanager package when it is installed.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package runs the upstream image unmodified, with the package supplying the command line.

| Property      | Value                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| Image         | `prom/prometheus`, upstream, unmodified                                     |
| Architectures | x86_64, aarch64                                                             |
| Entrypoint    | `prometheus` with package-set flags; runs as `nobody`                       |
| Subcontainer  | `prometheus-sub` — runs the `chown` oneshot, then the `prometheus` daemon   |

The command line fixes the config path (`/etc/prometheus/prometheus.yml`), the TSDB path (`/prometheus`), the listen address (`:9090`), the retention flags from **Retention** and `--web.external-url` from **Set Primary URL**, and enables the remote-write receiver (`--web.enable-remote-write-receiver`) and the OTLP receiver (`--web.enable-otlp-receiver`). `SSL_CERT_FILE` points at a bundle of the image's CA certificates plus this server's root CA, so HTTPS scrape targets on this server's addresses verify.

Inspect the running instance with `start-cli package attach prometheus -n prometheus-sub -- <cmd>`; `promtool` is available inside.

## Volume and Data Layout

The `main` volume holds the database and rules, the `startos` volume the package's own settings; the `dependencies` volume only hosts a read-only view of Alertmanager's published key.

| Volume         | Path on volume          | Mounted at                         | Contents                                                     |
| -------------- | ----------------------- | ---------------------------------- | ------------------------------------------------------------ |
| `main`         | `tsdb/`                 | `/prometheus`                      | The time-series database and its WAL                         |
| `main`         | `rules/rules.yml`       | `/etc/prometheus/rules` (read-only) | Alerting and recording rules, as written by Edit Rules       |
| `startos`      | `store.json`            | not mounted                        | Admin password, scrape targets, retention, primary URL       |
| `dependencies` | `alertmanager-public/`  | not mounted                        | Alertmanager's `public` volume, mounted read-only by the package |

The `chown` oneshot gives `tsdb/` to `nobody` on every start, since StartOS mounts volumes root-owned. The database grows with the number of series scraped and the retention period.

## File Models

The package owns the configuration Prometheus reads and regenerates it on every start; the rules file belongs to the user.

- **`startos/store.json`** (JSON). `adminPassword` (written by **Set Admin Password**), `scrapeTargets` (written by **Scrape Targets**), `retentionDays` and `retentionSizeGb` (written by **Retention**, defaulting to 15 days and no size limit), and `primaryUrl` (written by **Set Primary URL**; unset means the preferred address).
- **`main/rules/rules.yml`** (YAML, kept verbatim with comments). Seeded at install with an empty group list. Written only by **Edit Rules**, which validates first; a hand edit survives but is not validated until Prometheus loads it.
- **`/etc/prometheus/prometheus.yml`** in the subcontainer (no model). Regenerated on every start from `store.json` and the Alertmanager connection. It always contains a `prometheus` job scraping `localhost:9090`, an `alertmanager` job and an `alerting` block when Alertmanager is connected, one job per scrape target, and `rule_files` pointing at the rules directory. Never edit this copy; it does not survive a restart.

A change to the scrape targets, retention, rules or primary URL restarts Prometheus. Changing the admin password does not.

## Dependencies

Alertmanager is an optional dependency.

- **Alertmanager** — optional; becomes a current dependency once it is installed, requiring it to be running with its `alertmanager` health check passing. Prometheus resolves Alertmanager's bridge address, mounts its `public` volume read-only to read `credentials.json`, and authenticates as `service` with that key. Installing, reinstalling or removing Alertmanager restarts Prometheus once onto the new state. Without it, rules still evaluate and alerts show on the **Alerts** page, but nothing is notified.

## Network Access and Interfaces

One HTTP interface serves the web UI, the HTTP API and the push receivers, behind a StartOS proxy that requires HTTP Basic authentication (`admin` and the password from **Set Admin Password**) on every address.

| Interface | ID   | Type | Port | Purpose                                                                 |
| --------- | ---- | ---- | ---- | ----------------------------------------------------------------------- |
| Web UI    | `ui` | ui   | 9090 | Query, graph, targets and alerts pages; `/api/v1` for the HTTP API      |

The same address accepts pushed metrics at `/api/v1/write` (Prometheus remote write) and `/api/v1/otlp/v1/metrics` (OTLP over HTTP). Pushing clients must send the admin credentials.

## Installation and First-Run Flow

The admin password must be created before the service can start; everything else has working defaults.

1. Install seeds an empty rules file and raises the critical **Set Admin Password** task.
2. Until the task is done, the service cannot start and the proxy admits no login.
3. Once started, Prometheus scrapes itself, and Alertmanager when it is installed. Other targets are added with **Scrape Targets**.

## Actions

Five actions cover the login, what is scraped, the rules, how long data is kept, and the address Prometheus links to.

- **Set Admin Password** — run at install (task) and whenever the password should change. Generates a 32-character password, stores it in `store.json`, and returns it. The proxy picks it up without restarting Prometheus; the old password stops working, including for pushing clients. Safe to repeat; each run replaces the password.
- **Scrape Targets** — run to add, change or remove what Prometheus collects. Each entry becomes one scrape job: job name, `host:port` targets, scheme, metrics path, optional interval (default 15s), optional basic or bearer authentication, and an option to skip TLS verification. Job names must be unique and may not be `prometheus` or `alertmanager`. Promtool validates the generated configuration before saving; rejection leaves the stored targets and running service unchanged. Saving restarts Prometheus, which replays its WAL (seconds for a small database). Safe to repeat.
- **Edit Rules** — run to add alerting or recording rules. Runs `promtool check rules` in a temporary container and saves only if it passes; the rejection message is promtool's. Saving restarts Prometheus. Safe to repeat.
- **Retention** — run when the database uses too much disk or history is too short. Sets the retention time in days and an optional size limit in GB (at most 8,589,934,591, the largest whole-GB value Prometheus can represent); both are enforced, whichever is reached first. Saving restarts Prometheus; data beyond a reduced limit is deleted at Prometheus's next compaction.
- **Set Primary URL** — run when the source link on alerts (their `generatorURL`, shown in Alertmanager and its notifications) should open a particular address, such as a public domain. The SDK's standard primary-URL action: it offers the Web UI's addresses, and while none is chosen, or the chosen one is gone, Prometheus uses the preferred address (a public domain, else `.local`). Passed as `--web.external-url`; saving restarts Prometheus. Safe to repeat.

## Tasks

One task protects the login.

- **Set Admin Password** — `critical`. Raised whenever `store.json` has no `adminPassword`, which is the case after install. Cleared by running the action. Returns only if the password is removed from `store.json`.

## Health Checks

One check reports whether Prometheus is listening.

- **Web Interface** (`prometheus`) — ready once a process listens on port 9090. Prometheus binds the port before replaying its WAL, so a large database can be "ready" while queries still wait. A failure after a change almost always means Prometheus rejected the generated configuration or a rules file edited by hand: read the service logs for the error. A failure that persists after a crash can be WAL corruption, reported in the logs at startup.

Scrape failures are not a health check: they show on the **Targets** page of the Web UI with the last error.

## Backups and Restore

The `main` and `startos` volumes are copied wholesale (`ofVolumes`) with the service stopped, which captures the database, the rules and `store.json`.

The `dependencies` volume is not backed up; it only holds a mount of Alertmanager's volume, which Alertmanager backs up itself. A restored Prometheus reconnects to Alertmanager on its first start. Nothing needs to be re-entered.

## Limitations and Differences

1. **No configuration file to edit.** `prometheus.yml` is generated; only static scrape targets are supported, with no service discovery, relabelling or remote write to other systems.
2. **Reserved job names.** `prometheus` and `alertmanager` are used by the package's own jobs.
3. **The login is enforced by StartOS, not Prometheus.** Prometheus's own `--web.config.file` authentication is not used, and the admin API, lifecycle endpoints and agent mode are not enabled.

---

## Quick Reference for AI Consumers

```yaml
package_id: prometheus
image: prom/prometheus
architectures: [x86_64, aarch64]
subcontainers: [prometheus-sub]
volumes:
  main: /prometheus (subpath tsdb), /etc/prometheus/rules (subpath rules, read-only)
  startos: not mounted
  dependencies: not mounted
file_models:
  - startos/store.json
  - main/rules/rules.yml
startos_managed_env_vars:
  - SSL_CERT_FILE
dependencies: [alertmanager (optional)]
interfaces:
  ui: { type: ui, port: 9090 }
actions:
  - set-admin-password
  - scrape-targets
  - edit-rules
  - retention
  - set-primary-url
tasks:
  - { action: set-admin-password, severity: critical }
health_checks:
  - prometheus
```
