// Cookies plugin — injects consent state into every template response.
//
// This plugin does two critical things on every view response:
//
// 1. Adds `cookiesPolicy` to the template context so templates can
//    conditionally show/hide the banner and GTM scripts.
//
// 2. Adds `currentPath` so the cookie banner form knows where to
//    redirect back to after the user makes a choice.
//
// 3. If the user has NOT accepted analytics, calls removeAnalytics()
//    to server-side delete any GA cookies. This catches the case where
//    a user previously accepted, GA set cookies, and they later rejected
//    via the cookie preferences page WITHOUT JavaScript enabled.
//
// WHY onPreResponse?
// This extension point runs after the route handler has built the response
// but before it's sent to the client. By this point response.source.context
// exists (for view responses), so we can safely inject template variables.

import http2 from 'node:http2'
import { config } from '../config/config.js'
import { getCurrentPolicy, removeAnalytics } from '../cookies.js'

const { constants: httpConstants } = http2

const cookieNamePolicy = config.get('cookie.name')
const cookiePolicy = config.get('cookie.policy')

export const cookies = {
  plugin: {
    name: 'cookies',
    register: (server, _) => {
      // Register the consent cookie with Hapi so it knows how to
      // encode/decode it automatically.
      server.state(cookieNamePolicy, cookiePolicy)

      server.ext('onPreResponse', (request, h) => {
        const statusCode = request.response.statusCode

        if (
          request.response.variety === 'view' &&
          statusCode !== httpConstants.HTTP_STATUS_FORBIDDEN &&
          request.response.source.context
        ) {
          const cookiesPolicy = getCurrentPolicy(request, h)

          // Make consent state available in all templates
          request.response.source.context.cookiesPolicy = cookiesPolicy

          // Pass the current URL so the banner form can redirect back
          request.response.source.context.currentPath = `${request.path}${request.url.search ?? ''}`

          // Server-side removal of GA cookies when analytics is rejected.
          // This is essential for users without JavaScript.
          if ((!cookiesPolicy.analytics)) {
            removeAnalytics(request, h)
          }
        }

        return h.continue
      })
    }
  }
}
