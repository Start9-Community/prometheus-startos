import { readFile } from 'node:fs/promises'
import { rulesYml } from './fileModels/rules.yml'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  alertmanagerTarget,
  caBundlePath,
  configPath,
  prometheusConfig,
  rulesDir,
  uiPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Prometheus!'))

  const store = await storeJson
    .read((s) => ({
      scrapeTargets: s.scrapeTargets,
      retentionDays: s.retentionDays,
      retentionSizeGb: s.retentionSizeGb,
    }))
    .const(effects)
  if (!store) throw new Error('No store.json')
  await rulesYml.read().const(effects)
  const alertmanager = await alertmanagerTarget(effects)

  const subcontainer = sdk.SubContainer.of(
    effects,
    { imageId: 'prometheus' },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: 'tsdb',
        mountpoint: '/prometheus',
        readonly: false,
      })
      .mountVolume({
        volumeId: 'main',
        subpath: 'rules',
        mountpoint: rulesDir,
        readonly: true,
      }),
    'prometheus-sub',
  )
  const rootfs = await subcontainer.rootfs

  await subcontainer.writeFile(
    configPath,
    prometheusConfig(store.scrapeTargets, alertmanager),
  )
  const systemBundle = await readFile(
    `${rootfs}/etc/ssl/certs/ca-certificates.crt`,
    'utf8',
  )
  await subcontainer.writeFile(
    caBundlePath,
    `${systemBundle}\n${await sdk.getRootCa(effects)}`,
  )

  return sdk.Daemons.of(effects)
    .addOneshot('chown', {
      subcontainer,
      exec: {
        command: ['chown', '-R', 'nobody:nobody', '/prometheus'],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('prometheus', {
      subcontainer,
      exec: {
        command: [
          'prometheus',
          `--config.file=${configPath}`,
          '--storage.tsdb.path=/prometheus',
          `--storage.tsdb.retention.time=${store.retentionDays}d`,
          ...(store.retentionSizeGb
            ? [`--storage.tsdb.retention.size=${store.retentionSizeGb}GB`]
            : []),
          `--web.listen-address=:${uiPort}`,
          '--web.enable-remote-write-receiver',
          '--web.enable-otlp-receiver',
        ],
        env: { SSL_CERT_FILE: caBundlePath },
      },
      ready: {
        display: i18n('Web Interface'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, uiPort, {
            successMessage: i18n('The web interface is ready'),
            errorMessage: i18n('The web interface is not ready'),
          }),
      },
      requires: ['chown'],
    })
})
