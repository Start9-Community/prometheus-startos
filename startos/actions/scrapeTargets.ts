import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { reservedJobNames } from '../utils'

const { InputSpec, Value, Variants, List } = sdk

const targetSpec = InputSpec.of({
  jobName: Value.text({
    name: i18n('Job Name'),
    description: i18n(
      'Added to every series from these targets as the "job" label.',
    ),
    required: true,
    default: null,
    placeholder: 'node',
    patterns: [
      {
        regex: '^[a-zA-Z_][a-zA-Z0-9_-]*$',
        description: i18n(
          'Letters, digits, "_" and "-", not starting with a digit',
        ),
      },
    ],
  }),
  targets: Value.list(
    List.text(
      {
        name: i18n('Targets'),
        description: i18n(
          'Each target as host:port, such as 192.168.1.10:9100.',
        ),
        minLength: 1,
      },
      {
        placeholder: '192.168.1.10:9100',
        patterns: [
          {
            regex: '^[^\\s/:]+(:[0-9]+)?$|^\\[[0-9a-fA-F:.]+\\](:[0-9]+)?$',
            description: i18n(
              'A host or IP address, optionally followed by :port',
            ),
          },
        ],
      },
    ),
  ),
  scheme: Value.select({
    name: i18n('Scheme'),
    default: 'http',
    values: { http: 'HTTP', https: 'HTTPS' },
  }),
  metricsPath: Value.text({
    name: i18n('Metrics Path'),
    required: true,
    default: '/metrics',
    patterns: [{ regex: '/\\S*', description: i18n('Must start with "/"') }],
  }),
  scrapeInterval: Value.text({
    name: i18n('Scrape Interval'),
    description: i18n(
      'How often to collect, such as 30s or 1m. Empty uses 15s.',
    ),
    required: false,
    default: null,
    placeholder: '15s',
    patterns: [
      {
        regex: '^[0-9]+(ms|s|m|h)$',
        description: i18n('A number followed by ms, s, m or h'),
      },
    ],
  }),
  auth: Value.union({
    name: i18n('Authentication'),
    default: 'none',
    variants: Variants.of({
      none: { name: i18n('None'), spec: InputSpec.of({}) },
      basic: {
        name: i18n('Username and password'),
        spec: InputSpec.of({
          username: Value.text({
            name: i18n('Username'),
            required: true,
            default: null,
          }),
          password: Value.text({
            name: i18n('Password'),
            required: true,
            default: null,
            masked: true,
          }),
        }),
      },
      bearer: {
        name: i18n('Bearer token'),
        spec: InputSpec.of({
          token: Value.text({
            name: i18n('Token'),
            required: true,
            default: null,
            masked: true,
          }),
        }),
      },
    }),
  }),
  insecureSkipVerify: Value.toggle({
    name: i18n('Skip TLS Verification'),
    description: i18n(
      'Accept any certificate from HTTPS targets. Certificates from this server are already trusted.',
    ),
    default: false,
  }),
})

const inputSpec = InputSpec.of({
  scrapeTargets: Value.list(
    List.obj(
      { name: i18n('Scrape Targets') },
      { spec: targetSpec, displayAs: '{{jobName}}', uniqueBy: 'jobName' },
    ),
  ),
})

export const scrapeTargets = sdk.Action.withInput(
  // id
  'scrape-targets',

  // metadata
  async ({ effects }) => ({
    name: i18n('Scrape Targets'),
    description: i18n(
      'Choose the hosts and services Prometheus collects metrics from. Prometheus and Alertmanager are collected automatically.',
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
    scrapeTargets: (await storeJson.read((s) => s.scrapeTargets).once()) ?? [],
  }),

  // the execution function
  async ({ effects, input }) => {
    const reserved = input.scrapeTargets.find((t) =>
      reservedJobNames.includes(t.jobName),
    )
    if (reserved) {
      throw new Error(
        i18n('The job name "${name}" is reserved. Choose another.', {
          name: reserved.jobName,
        }),
      )
    }
    await storeJson.merge(effects, { scrapeTargets: input.scrapeTargets })
  },
)
