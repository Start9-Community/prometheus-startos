export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Prometheus!': 0,
  'Web Interface': 1,
  'The web interface is ready': 2,
  'The web interface is not ready': 3,
  // interfaces.ts
  'Web UI': 4,
  'Query and graph metrics, and see targets and alerts. Also the HTTP API, remote-write and OTLP endpoint.': 5,
  // dependencies.ts
  'Receives the alerts your rules fire and sends notifications': 6,
  // init/initializeService.ts
  'Create a password to log in to the Prometheus web interface': 7,
  // actions/setAdminPassword.ts
  'Set Admin Password': 8,
  'Generate a new random password for the Prometheus web interface. The username is always "admin".': 9,
  'Replaces the current admin password.': 10,
  'Admin Credentials': 11,
  'Use these credentials to log in to the Prometheus web interface.': 12,
  Username: 13,
  Password: 14,
  // actions/scrapeTargets.ts
  'Job Name': 15,
  'Added to every series from these targets as the "job" label.': 16,
  'Letters, digits, "_" and "-", not starting with a digit': 17,
  Targets: 18,
  'Each target as host:port, such as 192.168.1.10:9100.': 19,
  'A host or IP address, optionally followed by :port': 20,
  Scheme: 21,
  'Metrics Path': 22,
  'Must start with "/"': 23,
  'Scrape Interval': 24,
  'How often to collect, such as 30s or 1m. Empty uses 15s.': 25,
  'A number followed by ms, s, m or h': 26,
  Authentication: 27,
  None: 28,
  'Username and password': 29,
  'Bearer token': 30,
  Token: 31,
  'Skip TLS Verification': 32,
  'Accept any certificate from HTTPS targets. Certificates from this server are already trusted.': 33,
  'Scrape Targets': 34,
  'Choose the hosts and services Prometheus collects metrics from. Prometheus and Alertmanager are collected automatically.': 35,
  'The job name "${name}" is reserved. Choose another.': 36,
  // actions/editRules.ts
  Rules: 37,
  'Alerting and recording rule groups, in Prometheus YAML.': 38,
  'Edit Rules': 39,
  'Edit the alerting and recording rules Prometheus evaluates. Checked with promtool before they are saved.': 40,
  'promtool rejected the rules: ${error}': 41,
  // actions/retention.ts
  'Retention (days)': 42,
  'Metrics older than this are deleted.': 43,
  days: 44,
  'Size Limit (GB)': 45,
  'The oldest metrics are deleted once stored data exceeds this size. Empty sets no limit.': 46,
  Retention: 47,
  'Choose how long Prometheus keeps metrics and how much disk they may use.': 48,
  'promtool rejected the scrape configuration: ${error}': 49,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
