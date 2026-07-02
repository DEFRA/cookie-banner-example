// Global template context — variables available in every template.
//
// This function is called by @hapi/vision for every view response.
// It merges global variables with route-specific context.
//
// KEY VARIABLES:
//
// - serviceName: shown in the cookie banner heading and page titles
// - getAssetPath(): resolves logical asset names to their cache-busted
//   filenames. Vite outputs files like javascripts/application.a1b2c3d.min.js
//   and records them in .public/assets-manifest.json. The manifest entry for
//   the client entrypoint carries the JS filename (`file`) and its bundled
//   stylesheet(s) (`css`), so templates don't need to know the hashes.
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

// The Vite entrypoint, keyed by its path relative to the Vite `root` (src/client).
const entryKey = 'javascripts/application.js'

let viteManifest

function loadManifest () {
  if (!viteManifest) {
    try {
      viteManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      // Manifest may not exist during tests or before the first build
      viteManifest = {}
    }
  }
  return viteManifest
}

export function context (request) {
  const ctx = request.response.source?.context || {}

  const manifest = loadManifest()
  const entry = manifest[entryKey]

  // Map the logical names used in templates to the hashed Vite outputs.
  const assets = {
    'application.js': entry?.file,
    'stylesheets/application.scss': entry?.css?.[0]
  }

  return {
    ...ctx,
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    cookieName: config.get('cookie.name'),
    getAssetPath (asset) {
      const resolved = assets[asset] ?? manifest[asset]?.file ?? asset
      return `${assetPath}/${resolved}`
    },
    googleTagManagerKey: config.get('googleAnalytics.googleTagManagerKey')
  }
}
