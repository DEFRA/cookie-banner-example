// Global template context — variables available in every template.
//
// This function is called by @hapi/vision for every view response.
// It merges global variables with route-specific context.
//
// KEY VARIABLES:
//
// - serviceName: shown in the cookie banner heading and page titles
// - getAssetPath(): resolves Webpack asset names to their cache-busted
//   filenames. In production, Webpack outputs files like
//   application.a1b2c3d.min.js — the manifest maps the original name
//   to the hashed name so templates don't need to know the hash.
// - googleTagManagerKey: the GTM container ID, used by the cookie banner
//   template and the GTM script templates to conditionally render

import path from 'node:path'
import { readFileSync } from 'node:fs'
import { config } from '../config.js'

const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

let webpackManifest

export function context (request) {
  const ctx = request.response.source?.context || {}

  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      // Manifest may not exist during tests or before first build
    }
  }

  return {
    ...ctx,
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    getAssetPath (asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      return `${assetPath}/${webpackAssetPath ?? asset}`
    },
    googleTagManagerKey: config.get('googleAnalytics.googleTagManagerKey')
  }
}
