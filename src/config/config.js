// Convict configuration schema.
//
// Convict validates environment variables against a schema at startup,
// catching misconfiguration early rather than at runtime.
//
// Key configuration:
//
// - cookie.name: The name of the cookie that stores the user's consent
//   preference. Each service should use a unique name to avoid collisions
//   when multiple services run on the same domain.
//
// - cookie.policy: Hapi cookie options. base64json encoding lets Hapi
//   automatically serialise/deserialise the consent object ({ confirmed,
//   essential, analytics }) to/from the cookie value.
//
// - cookie.config.ttl: How long the consent cookie lasts. One year is the
//   ICO recommended maximum for a consent cookie.
//
// - googleAnalytics.googleTagManagerKey: The GTM container ID. When
//   present, the cookie banner and templates will offer analytics cookies.
//   The demo default is GTM-KFK7NV5W — replace with your own tag.

import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const isProduction = process.env.NODE_ENV === 'production'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const config = convict({
  host: {
    doc: 'The host to bind to',
    format: String,
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind to',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Name of the service shown in the header and cookie banner',
    format: String,
    default: 'Cookie Banner Demo',
    env: 'SERVICE_NAME'
  },
  root: {
    doc: 'Project root directory',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  assetPath: {
    doc: 'URL prefix for static assets served by Hapi/Inert',
    format: String,
    default: '/public'
  },
  isProduction: {
    doc: 'Whether running in production mode',
    format: Boolean,
    default: isProduction
  },
  staticCacheTimeout: {
    doc: 'Cache timeout for static assets (ms)',
    format: 'nat',
    default: 15 * 60 * 1000
  },
  nunjucks: {
    watch: {
      doc: 'Reload templates when they change (development only)',
      format: Boolean,
      default: !isProduction
    },
    noCache: {
      doc: 'Disable template caching (development only)',
      format: Boolean,
      default: !isProduction
    }
  },
  cookie: {
    name: {
      doc: 'Name of cookie that stores the user consent preference',
      format: String,
      default: 'cookie_banner_demo_policy'
    },
    policy: {
      clearInvalid: {
        doc: 'Clear the cookie if it fails validation (e.g. bad JSON)',
        format: Boolean,
        default: true
      },
      encoding: {
        doc: 'Hapi cookie encoding — base64json automatically serialises objects',
        format: String,
        default: 'base64json'
      },
      isSameSite: {
        doc: 'SameSite attribute — Lax allows the cookie on top-level navigations',
        format: String,
        default: 'Lax'
      },
      isSecure: {
        doc: 'Secure flag — only send cookie over HTTPS in production',
        format: Boolean,
        default: isProduction
      }
    },
    config: {
      ttl: {
        doc: 'Cookie time-to-live in milliseconds (1 year)',
        format: 'nat',
        default: 1000 * 60 * 60 * 24 * 365
      }
    }
  },
  googleAnalytics: {
    googleTagManagerKey: {
      doc: 'Google Tag Manager container ID (e.g. GTM-XXXXXXXX)',
      format: String,
      default: '',
      env: 'GOOGLE_TAG_MANAGER_KEY'
    }
  }
})

config.validate({ allowed: 'warn' })

export { config }
