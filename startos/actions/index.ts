import { sdk } from '../sdk'
import { editRules } from './editRules'
import { retention } from './retention'
import { scrapeTargets } from './scrapeTargets'
import { setAdminPassword } from './setAdminPassword'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(scrapeTargets)
  .addAction(editRules)
  .addAction(retention)
