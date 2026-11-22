import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const authShape = z.discriminatedUnion('selection', [
  z.looseObject({
    selection: z.literal('none'),
    value: z.looseObject({}).catch({}),
  }),
  z.looseObject({
    selection: z.literal('basic'),
    value: z.looseObject({ username: z.string(), password: z.string() }),
  }),
  z.looseObject({
    selection: z.literal('bearer'),
    value: z.looseObject({ token: z.string() }),
  }),
])

export const scrapeTargetShape = z.looseObject({
  jobName: z.string(),
  targets: z.array(z.string()),
  scheme: z.enum(['http', 'https']),
  metricsPath: z.string(),
  scrapeInterval: z.string().nullable(),
  auth: authShape,
  insecureSkipVerify: z.boolean(),
})

export type ScrapeTarget = z.infer<typeof scrapeTargetShape>

export const defaultRetentionDays = 15

const shape = z.looseObject({
  adminPassword: z.string().optional().catch(undefined),
  scrapeTargets: z.array(scrapeTargetShape).catch([]),
  retentionDays: z.number().catch(defaultRetentionDays),
  retentionSizeGb: z.number().nullable().catch(null),
  primaryUrl: z.string().nullable().catch(null),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  shape,
)
