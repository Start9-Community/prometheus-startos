import { FileHelper } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

/** The user's alerting and recording rules, kept verbatim with their comments. */
export const rulesYml = FileHelper.string({
  base: sdk.volumes.main,
  subpath: 'rules/rules.yml',
})
