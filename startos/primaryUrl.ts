import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { uiHostId } from './utils'

export const primaryUrl = sdk.setupPrimaryUrl({
  id: 'set-primary-url',
  hostId: uiHostId,
  interfaceId: 'ui',
  metadata: {
    name: i18n('Set Primary URL'),
    description: i18n(
      'Choose the address Prometheus puts in the links it generates, such as the source link on every alert. Prometheus restarts to apply the change.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },
  field: {
    name: i18n('Primary URL'),
    description: i18n(
      'Used for links in alerts. Every address of the Web UI works in the browser regardless of this setting.',
    ),
  },
  get: storeJson.read((s) => s.primaryUrl),
  set: (effects, url) => storeJson.merge(effects, { primaryUrl: url }),
})
