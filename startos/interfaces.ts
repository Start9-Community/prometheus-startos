import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { primaryUrl } from './primaryUrl'
import { sdk } from './sdk'
import { adminUsername, proxyRealm, uiHostId, uiPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const adminPassword = await storeJson
    .read((s) => s.adminPassword)
    .const(effects)

  const uiMulti = sdk.MultiHost.of(effects, uiHostId)
  const uiOrigin = await uiMulti.bindPort(uiPort, {
    protocol: 'http',
    proxy: {
      auth: {
        type: 'basic',
        credentials: adminPassword
          ? [{ username: adminUsername, password: adminPassword }]
          : [],
        realm: proxyRealm,
      },
    },
  })

  const preferredLauncherAddress = await primaryUrl.bestUsable(effects).const()

  const ui = sdk.createInterface(effects, {
    name: i18n('Web UI'),
    id: 'ui',
    description: i18n(
      'Query and graph metrics, and see targets and alerts. Also the HTTP API, remote-write and OTLP endpoint.',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
    preferredLauncherAddress,
  })

  return [await uiOrigin.export([ui])]
})
