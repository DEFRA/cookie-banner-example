// Hapi server setup.
//
// The server is created and configured here but NOT started — that happens
// in index.js. This separation lets tests call createServer() and use
// server.inject() without actually binding to a port.
//
// PLUGIN REGISTRATION ORDER MATTERS:
// 1. Scooter — user-agent parsing, required by Blankie (CSP)
// 2. CSP (Blankie) — generates nonces BEFORE routes render templates
// 3. Crumb — CSRF tokens, must be available when templates render forms
// 4. Router — registers routes including /cookies POST
// 5. Cookies — onPreResponse hook injects cookiesPolicy into template
//    context. Must run AFTER routes so response.source.context exists.
//
// Security headers are set via Hapi's built-in `routes.security` option:
// - HSTS: tells browsers to only use HTTPS
// - X-XSS-Protection: legacy XSS filter
// - X-Content-Type-Options: noSniff prevents MIME-type sniffing
// - X-Frame-Options: prevents clickjacking
//
// strictHeader: false is needed because Google Analytics sets cookies
// that don't strictly conform to RFC 6265. Without this, Hapi would
// reject requests that contain GA cookies.

import path from 'node:path'
import Hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'
import Joi from 'joi'
import { config } from './config/config.js'
import { nunjucksConfig } from './config/nunjucks/nunjucks.js'
import { contentSecurityPolicy } from './plugins/content-security-policy.js'
import { crumb } from './plugins/crumb.js'
import { router } from './plugins/router.js'
import { cookies } from './plugins/cookies.js'

export async function createServer () {
  const server = Hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    // GA cookies don't strictly conform to RFC 6265 — without this Hapi
    // would reject requests containing them.
    state: {
      strictHeader: false
    }
  })

  server.validator(Joi)

  await server.register([
    Scooter,
    nunjucksConfig,
    contentSecurityPolicy,
    crumb,
    router,
    cookies
  ])

  return server
}
