// Cookie routes — GET and POST handlers for /cookies.
//
// These routes handle both the cookie preferences page and the cookie
// consent submissions from the banner.
//
// GET /cookies:
//   Renders the cookie preferences page showing the user's current choice.
//
// POST /cookies:
//   Handles cookie consent submissions. This endpoint supports TWO modes:
//
//   1. SYNCHRONOUS (async: false) — used when JavaScript is disabled.
//      The form POSTs normally, the server updates the cookie, and either:
//      - Redirects to returnUrl (from the banner — takes user back to
//        the page they were on)
//      - Re-renders the cookie page with a success banner (from the
//        preferences page)
//
//   2. ASYNCHRONOUS (async: true) — used when JavaScript is enabled.
//      The client-side script sends an XHR POST with JSON body. The
//      server updates the cookie and returns { message: 'success' }.
//      The client handles UI updates (showing confirmation banner,
//      loading/removing GTM).
//
// VALIDATION:
//   Joi validates the payload to prevent injection:
//   - analytics: must be a boolean
//   - async: must be a boolean
//   - returnUrl: max 2000 chars (prevents oversized redirect URLs)
//
// OPEN REDIRECT PROTECTION:
//   returnUrl is validated with isSafeRedirect() to ensure it only
//   redirects to paths on the same origin (starts with "/" but not "//").

import Joi from 'joi'
import { config } from '../config/config.js'
import { cookiesModel } from './models/cookies.js'
import { updatePolicy } from '../cookies.js'
import { isSafeRedirect } from '../common/utils/is-safe-redirect.js'

export const cookies = [
  {
    method: 'GET',
    path: '/cookies',
    handler: function (request, h) {
      return h.view(
        'cookies/policy',
        {
          pageTitle: 'Cookies',
          ...cookiesModel(
            false,
            request.state[config.get('cookie.name')]
          )
        }
      )
    }
  },
  {
    method: 'POST',
    path: '/cookies',
    options: {
      validate: {
        payload: {
          analytics: Joi.boolean().required(),
          async: Joi.boolean().default(false),
          returnUrl: Joi.string().allow('').max(2000).optional()
        }
      }
    },
    handler: function (request, h) {
      const payload = request.payload

      updatePolicy(request, h, payload.analytics)

      // Async mode — return JSON for the XHR request from client-side JS
      if (payload.async) {
        return h.response({ message: 'success' })
      }

      // Synchronous mode from banner — redirect back to the original page
      if (isSafeRedirect(payload.returnUrl)) {
        return h.redirect(payload.returnUrl)
      }

      // Synchronous mode from preferences page — re-render with success banner
      return h.view(
        'cookies/policy',
        {
          pageTitle: 'Cookies',
          ...cookiesModel(
            true,
            request.state[config.get('cookie.name')]
          )
        }
      )
    }
  }
]
