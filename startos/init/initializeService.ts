import { setAdminPassword } from '../actions/setAdminPassword'
import { rulesYml } from '../fileModels/rules.yml'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { defaultRules } from '../utils'

export const initializeService = sdk.setupOnInit(async (effects) => {
  if ((await rulesYml.read().once()) === null) {
    await rulesYml.write(effects, defaultRules)
  }

  if (!(await storeJson.read().once())) {
    await storeJson.merge(effects, {})
  }

  const adminPassword = await storeJson
    .read((s) => s.adminPassword)
    .const(effects)
  if (!adminPassword) {
    await sdk.action.createOwnTask(effects, setAdminPassword, 'critical', {
      reason: i18n(
        'Create a password to log in to the Prometheus web interface',
      ),
    })
  }
})
