import { rulesYml } from '../fileModels/rules.yml'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  rules: Value.textarea({
    name: i18n('Rules'),
    description: i18n(
      'Alerting and recording rule groups, in Prometheus YAML.',
    ),
    required: true,
    default: null,
    minRows: 12,
    maxRows: 30,
  }),
})

export const editRules = sdk.Action.withInput(
  // id
  'edit-rules',

  // metadata
  async ({ effects }) => ({
    name: i18n('Edit Rules'),
    description: i18n(
      'Edit the alerting and recording rules Prometheus evaluates. Checked with promtool before they are saved.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  // form input specification
  inputSpec,

  // optionally pre-fill the input form
  async ({ effects }) => ({
    rules: (await rulesYml.read().once()) ?? undefined,
  }),

  // the execution function
  async ({ effects, input }) => {
    const check = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'prometheus' },
      null,
      'check-rules',
      async (sub) => {
        await sub.writeFile('/tmp/rules.yml', input.rules)
        return sub.exec(['promtool', 'check', 'rules', '/tmp/rules.yml'])
      },
    )
    if (check.exitCode !== 0) {
      throw new Error(
        i18n('promtool rejected the rules: ${error}', {
          error: (String(check.stdout) + String(check.stderr)).trim(),
        }),
      )
    }
    await rulesYml.write(effects, input.rules)
  },
)
