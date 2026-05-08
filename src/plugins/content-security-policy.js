// Content Security Policy (CSP) using Blankie.
//
// CSP is a browser security mechanism that restricts which resources
// (scripts, styles, images, etc.) the page can load. Without a properly
// configured CSP, Google Tag Manager scripts would be blocked.
//
// KEY CONFIGURATION:
//
// generateNonces: true
//   Blankie generates a unique nonce (random value) for every response.
//   This nonce is automatically added to the CSP header and made available
//   in templates as {{ nonce }}. Only <script> tags with a matching nonce
//   attribute will execute. This is more secure than 'unsafe-inline'
//   because an attacker can't predict the nonce.
//
// scriptSrc:
//   - 'self': scripts from the same origin (our bundled application.js)
//   - sha256 hash: required for the inline script that GOV.UK Frontend
//     injects via Nunjucks macros for progressive enhancement.
//     See: https://frontend.design-system.service.gov.uk/import-javascript/
//   - *.googletagmanager.com: GTM's main script
//   - *.google-analytics.com: GA scripts loaded by GTM
//
// connectSrc: XHR/fetch destinations that GTM/GA send data to
// imgSrc: tracking pixels used by GA
// frameSrc: GTM's noscript iframe fallback
// frameAncestors: 'self' prevents the page being embedded in iframes
//   on other domains (clickjacking protection)
// formAction: 'self' ensures forms can only submit to our own origin

import Blankie from 'blankie'

export const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    fontSrc: ['self'],
    imgSrc: ['self', 'https://*.googletagmanager.com', 'https://*.google-analytics.com'],
    scriptSrc: [
      'self',
      // Hash for GOV.UK Frontend inline progressive enhancement script.
      // This is a known hash published by the Design System team.
      "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='",
      'https://*.googletagmanager.com',
      'https://*.google-analytics.com'
    ],
    styleSrc: ['self'],
    connectSrc: [
      'self',
      'https://www.google.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://*.googletagmanager.com'
    ],
    frameSrc: ['https://www.googletagmanager.com'],
    frameAncestors: ['self'],
    formAction: ['self'],
    manifestSrc: ['self'],
    generateNonces: true
  }
}
