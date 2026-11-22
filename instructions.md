# Prometheus

## Documentation

- [Prometheus configuration](https://github.com/prometheus/prometheus/tree/main/docs/configuration) — the upstream reference for scrape settings, alerting rules and recording rules.
- [Querying Prometheus](https://github.com/prometheus/prometheus/tree/main/docs/querying) — PromQL, its functions and operators, and the HTTP API.
- [Node exporter](https://github.com/prometheus/node_exporter/blob/master/README.md) — the exporter most people install on the machines they want to monitor.

## What you get on StartOS

- A **Web UI** interface for querying and graphing metrics, and for checking which targets are up and which alerts are firing. The same address serves the HTTP API and accepts metrics that devices push to it.
- A login in front of the interface, created by this service rather than by Prometheus.
- Collection settings managed through actions, with no configuration file to edit.
- Alerts delivered to the **Alertmanager** service when it is installed, with no setup.

## Getting set up

1. Run **Set Admin Password** when prompted. Save the username (`admin`) and the password it shows you; your browser asks for them when you open the Web UI.
2. Start the service. It begins collecting its own metrics straight away.
3. Run **Scrape Targets** and add the machines and services you want to monitor. Each one needs an exporter or a metrics endpoint that Prometheus can reach, such as Node exporter on port 9100.
4. Optional: install **Alertmanager** to be notified when an alert rule fires, then add rules with **Edit Rules**.

## Using Prometheus

### Web UI

Open the **Web UI** interface and log in. Type a query such as `up` to see every target and whether it answered its last collection. **Status → Target health** shows each target with the last error, which is the first place to look when data is missing.

### Actions

- **Set Admin Password** — creates a new password. Run it again any time you want to change it; the old password stops working right away, including for devices that push metrics.
- **Scrape Targets** — the list of things Prometheus collects from. For each entry, give a job name and one or more `host:port` addresses. The generated configuration is checked before saving; if it is rejected, collection continues with the previous settings. Addresses of services on this server work with HTTPS without any certificate setup.
- **Edit Rules** — your alerting and recording rules, in the upstream rules format. They are checked before they are saved, and you see the error if anything is wrong.
- **Retention** — how many days of data to keep, and optionally the most disk space it may use (up to 8,589,934,591 GB).

### Pushing metrics

Devices that can't be reached from this server can send metrics to it instead. Point them at the Web UI address, log in as `admin` with your password, and use the path `/api/v1/write` for Prometheus remote write, or `/api/v1/otlp/v1/metrics` for OpenTelemetry (OTLP over HTTP).
