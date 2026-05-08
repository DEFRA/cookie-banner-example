// Router plugin — registers all routes and static file serving.
//
// In Hapi, routes are typically registered inside plugins so the server
// setup stays clean. This plugin:
// 1. Registers @hapi/inert for static file serving
// 2. Registers all route handlers (home, cookies, health)
// 3. Registers the static file serving plugin

import Inert from '@hapi/inert'
import { home } from '../routes/home.js'
import { cookies } from '../routes/cookies.js'
import { health } from '../routes/health.js'
import { serveStaticFiles } from '../common/helpers/serve-static-files.js'

export const router = {
  plugin: {
    name: 'router',
    async register (server) {
      await server.register([Inert])
      await server.route(home)
      await server.route(cookies)
      await server.route(health)
      await server.register([serveStaticFiles])
    }
  }
}
