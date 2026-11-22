import { defaultRetentionDays, storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  retentionDays: Value.number({
    name: i18n('Retention (days)'),
    description: i18n('Metrics older than this are deleted.'),
    required: true,
    default: defaultRetentionDays,
    integer: true,
    min: 1,
    max: 3650,
    units: i18n('days'),
  }),
  retentionSizeGb: Value.number({
    name: i18n('Size Limit (GB)'),
    description: i18n(
      'The oldest metrics are deleted once stored data exceeds this size. Empty sets no limit.',
    ),
    required: false,
    default: null,
    integer: true,
    min: 1,
    // Prometheus stores base-2 sizes as signed 64-bit byte counts.
    max: 2 ** 33 - 1,
    units: 'GB',
  }),
})

export const retention = sdk.Action.withInput(
  // id
  'retention',

  // metadata
  async ({ effects }) => ({
    name: i18n('Retention'),
    description: i18n(
      'Choose how long Prometheus keeps metrics and how much disk they may use.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  // form input specification
  inputSpec,

  // optionally pre-fill the input form
  async ({ effects }) => {
    const store = await storeJson.read().once()
    return {
      retentionDays: store?.retentionDays,
      retentionSizeGb: store?.retentionSizeGb,
    }
  },

  // the execution function
  async ({ effects, input }) => {
    await storeJson.merge(effects, {
      retentionDays: input.retentionDays,
      retentionSizeGb: input.retentionSizeGb,
    })
  },
)
