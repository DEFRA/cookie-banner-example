// Nunjucks template engine configuration.
//
// This registers @hapi/vision (Hapi's view engine interface) with Nunjucks
// as the rendering engine.
//
// TEMPLATE PATHS:
// The Nunjucks environment is configured to search for templates in:
// 1. node_modules/govuk-frontend/dist/ — so {% extends "govuk/template.njk" %}
//    and {% from "govuk/components/..." %} work without full paths
// 2. src/views/ — our application templates
// 3. src/views/partials — reusable template fragments
//
// CONTEXT FUNCTION:
// The `context` option is a function called for every view response.
// It returns variables available in ALL templates (serviceName, asset
// helpers, GTM key, etc.). Route-specific variables are merged on top.

import path from 'node:path'
import nunjucks from 'nunjucks'
import hapiVision from '@hapi/vision'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'
import { context } from './context.js'
import * as globals from './globals.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const nunjucksEnvironment = nunjucks.configure(
  [
    'node_modules/govuk-frontend/dist/',
    path.resolve(dirname, '../../views/'),
    path.resolve(dirname, '../../views/partials')
  ],
  {
    autoescape: true,
    throwOnUndefined: false,
    trimBlocks: true,
    lstripBlocks: true,
    watch: config.get('nunjucks.watch'),
    noCache: config.get('nunjucks.noCache')
  }
)

export const nunjucksConfig = {
  plugin: hapiVision,
  options: {
    engines: {
      njk: {
        compile (src, options) {
          const template = nunjucks.compile(src, options.environment)
          return (ctx) => template.render(ctx)
        }
      }
    },
    compileOptions: {
      environment: nunjucksEnvironment
    },
    relativeTo: path.resolve(dirname, '../..'),
    path: 'views',
    isCached: config.get('isProduction'),
    context
  }
}

// Register Nunjucks globals so they're available in all templates
Object.entries(globals).forEach(([name, global]) => {
  nunjucksEnvironment.addGlobal(name, global)
})
