import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'prometheus',
  title: 'Prometheus',
  license: 'Apache-2.0',
  packageRepo: 'https://github.com/Start9-Community/prometheus-startos',
  upstreamRepo: 'https://github.com/prometheus/prometheus',
  marketingUrl: 'https://prometheus.io/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main', 'dependencies'],
  images: {
    prometheus: {
      source: { dockerTag: 'prom/prometheus:v3.16.0' },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
