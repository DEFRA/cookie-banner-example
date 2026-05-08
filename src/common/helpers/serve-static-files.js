// Static file serving plugin.
//
// @hapi/inert adds file and directory handlers to Hapi. This plugin
// registers two routes:
//
// 1. /favicon.ico — returns a 204 No Content response. Without this,
//    every browser request would generate a 404 for the favicon.
//
// 2. /public/{param*} — serves files from the .public/ directory, which
//    is where Webpack outputs the bundled CSS, JS, fonts and images.
//    The Cache-Control header is set to keep assets cached for the
//    configured timeout.

import { config } from '../../config/config.js'

export const serveStaticFiles = {
  plugin: {
    name: 'staticFiles',
    register (server) {
      server.route([
        {
          options: {
            auth: false,
            cache: {
              expiresIn: config.get('staticCacheTimeout'),
              privacy: 'private'
            }
          },
          method: 'GET',
          path: '/favicon.ico',
          handler (_request, h) {
            return h.response().code(204).type('image/x-icon')
          }
        },
        {
          options: {
            auth: false,
            cache: {
              expiresIn: config.get('staticCacheTimeout'),
              privacy: 'private'
            }
          },
          method: 'GET',
          path: `${config.get('assetPath')}/{param*}`,
          handler: {
            directory: {
              path: '.',
              redirectToSlash: true
            }
          }
        }
      ])
    }
  }
}
