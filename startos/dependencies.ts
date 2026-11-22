import { i18n } from './i18n'
import { sdk } from './sdk'
import { alertmanagerAddress } from './utils'

const alertmanager = sdk.Dependency.optional('alertmanager', {
  description: i18n(
    'Receives the alerts your rules fire and sends notifications',
  ),
  metadata: {
    title: 'Alertmanager',
    icon: 'https://raw.githubusercontent.com/prometheus/prometheus/v3.16.0/documentation/images/prometheus-logo.svg',
  },
  versionRange: '>=0.35.0:0',
  kind: 'running',
  healthChecks: ['alertmanager'],
  enabled: async ({ effects }) =>
    (await alertmanagerAddress(effects).const()) !== null,
})

export const dependencies = sdk.Dependencies.of().addDependency(alertmanager)
