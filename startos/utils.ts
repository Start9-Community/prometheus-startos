import { FileHelper, T, utils, YAML, z } from '@start9labs/start-sdk'
import {
  serviceUsername,
  uiHostId as alertmanagerHostId,
  uiPort as alertmanagerPort,
} from 'alertmanager-startos/startos/utils'
import { mkdir } from 'node:fs/promises'
import type { ScrapeTarget } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'

export const uiPort = 9090

export const uiHostId = 'ui'

export const adminUsername = 'admin'

export const proxyRealm = 'Prometheus'

export const configPath = '/etc/prometheus/prometheus.yml'

export const rulesDir = '/etc/prometheus/rules'

export const caBundlePath = '/etc/prometheus/ca-bundle.crt'

export const reservedJobNames = ['prometheus', 'alertmanager']

export const defaultRules = `# Alerting and recording rules.
# Reference: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
groups: []
`

export const generatePassword = () =>
  utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 32 })

export type AlertmanagerTarget = {
  address: string
  username: string
  password: string
}

function scrapeConfig(target: ScrapeTarget) {
  return {
    job_name: target.jobName,
    scheme: target.scheme,
    metrics_path: target.metricsPath,
    ...(target.scrapeInterval
      ? { scrape_interval: target.scrapeInterval }
      : {}),
    ...(target.auth.selection === 'basic'
      ? { basic_auth: target.auth.value }
      : {}),
    ...(target.auth.selection === 'bearer'
      ? { authorization: { credentials: target.auth.value.token } }
      : {}),
    ...(target.insecureSkipVerify
      ? { tls_config: { insecure_skip_verify: true } }
      : {}),
    static_configs: [{ targets: target.targets }],
  }
}

export function prometheusConfig(
  targets: ScrapeTarget[],
  alertmanager: AlertmanagerTarget | null,
): string {
  const alertmanagerClient = alertmanager && {
    scheme: 'http',
    basic_auth: {
      username: alertmanager.username,
      password: alertmanager.password,
    },
    static_configs: [{ targets: [alertmanager.address] }],
  }

  return YAML.stringify({
    global: { scrape_interval: '15s', evaluation_interval: '15s' },
    rule_files: [`${rulesDir}/*.yml`],
    ...(alertmanagerClient
      ? { alerting: { alertmanagers: [alertmanagerClient] } }
      : {}),
    scrape_configs: [
      {
        job_name: 'prometheus',
        static_configs: [{ targets: [`localhost:${uiPort}`] }],
      },
      ...(alertmanagerClient
        ? [{ job_name: 'alertmanager', ...alertmanagerClient }]
        : []),
      ...targets.map(scrapeConfig),
    ],
  })
}

/** Invalid scrape settings must not replace the last working configuration. */
export async function checkScrapeTargets(
  effects: T.Effects,
  targets: ScrapeTarget[],
): Promise<void> {
  const check = await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'prometheus' },
    null,
    'check-scrape-targets',
    async (sub) => {
      await sub.writeFile(configPath, prometheusConfig(targets, null))
      return sub.exec([
        'promtool',
        'check',
        'config',
        '--syntax-only',
        configPath,
      ])
    },
  )
  if (check.exitCode !== 0) {
    throw new Error(
      i18n('promtool rejected the scrape configuration: ${error}', {
        error: (String(check.stdout) + String(check.stderr)).trim(),
      }),
    )
  }
}

const alertmanagerPublic = sdk.volumes.dependencies.subpath(
  'alertmanager-public',
)

const alertmanagerCredentials = FileHelper.json(
  `${alertmanagerPublic}/credentials.json`,
  z.looseObject({ apiKey: z.string().optional().catch(undefined) }),
)

/**
 * The address the dependency volume was last mounted for. A reinstall replaces
 * the volume, which a mount from before it keeps showing.
 */
let mountedFor: string | null = null

async function alertmanagerKey(
  effects: T.Effects,
  address: string,
): Promise<string | null> {
  try {
    if (mountedFor !== address) {
      await mkdir(alertmanagerPublic, { recursive: true })
      await sdk.mount(effects, {
        location: alertmanagerPublic,
        target: {
          packageId: 'alertmanager',
          volumeId: 'public',
          subpath: null,
          readonly: true,
          idmap: [],
        },
      })
      mountedFor = address
    }
    return (
      (await alertmanagerCredentials.read((c) => c.apiKey).const(effects)) ??
      null
    )
  } catch {
    return null
  }
}

export function alertmanagerAddress(effects: T.Effects) {
  return sdk.host.getBridgeAddress(effects, {
    packageId: 'alertmanager',
    hostId: alertmanagerHostId,
    internalPort: alertmanagerPort,
    ssl: false,
  })
}

/** Null until Alertmanager is installed and has published its key. */
export async function alertmanagerTarget(
  effects: T.Effects,
): Promise<AlertmanagerTarget | null> {
  const address = await alertmanagerAddress(effects).const()
  if (!address) {
    mountedFor = null
    return null
  }
  const password = await alertmanagerKey(effects, address)
  if (!password) return null
  return { address, username: serviceUsername, password }
}
