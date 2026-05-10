# GOV.UK Cookie Banner Demo

A minimal Hapi.js demo service showing how to correctly implement the [GOV.UK Design System cookie banner](https://design-system.service.gov.uk/components/cookie-banner/) with Google Tag Manager (GTM).

This demo solves the common pain points teams encounter:

- **Immediately setting GA cookies on acceptance** — GTM loads client-side the moment the user accepts, no page reload required for GA to start collecting
- **Removing all GA cookies when the user rejects** — from both the banner and the cookie preferences page
- **Working without JavaScript** — progressive enhancement via form submission
- **Working with Content Security Policy (CSP)** — nonces and domain whitelisting
- **CSRF protection** — on all cookie consent forms

## Quick start

```bash
docker compose up
```

Visit [http://localhost:3000](http://localhost:3000)

### Run tests

```bash
npm run docker:test
```

## Demo GTM tag

This demo uses the Google Tag Manager container `GTM-KFK7NV5W`. You can see analytics working in your browser's Network tab when you accept cookies.

To use your own tag, set the environment variable:

```bash
GOOGLE_TAG_MANAGER_KEY=GTM-YOURTAG docker compose up
```

## How it works

### Architecture overview

```
src/
  index.js                          # Entry point — starts the Hapi server
  server.js                         # Server config, plugin registration
  cookies.js                        # Cookie consent state management
  config/
    config.js                       # Convict configuration schema
    nunjucks/
      nunjucks.js                   # Nunjucks template engine setup
      context.js                    # Global template variables
      globals.js                    # Nunjucks globals (govukRebrand)
  plugins/
    router.js                       # Route registration
    cookies.js                      # Injects cookie state into templates
    crumb.js                        # CSRF protection
    content-security-policy.js      # CSP headers via Blankie
  routes/
    home.js                         # GET / — demo page
    cookies.js                      # GET & POST /cookies — preferences
    health.js                       # GET /health — container health check
    models/
      cookies.js                    # Cookie page radio button model
  views/
    layout.njk                      # Base template with banner/GTM logic
    home.njk                        # Demo page content
    cookies/
      banner.njk                    # Cookie consent banner
      policy.njk                    # Cookie preferences page
    google-tag-manager/
      head-content.njk              # GTM script (with CSP nonce)
      body-content.njk              # GTM noscript fallback
  client/
    javascripts/
      application.js                # Client-side entry point
      cookies.js                    # Enhanced cookie banner behaviour
    stylesheets/
      application.scss              # GOV.UK Frontend styles
  common/
    utils/
      is-safe-redirect.js           # Open redirect prevention
    helpers/
      serve-static-files.js         # Static file serving
```

### The cookie consent flow

#### With JavaScript (enhanced experience)

1. User visits a page → banner appears (the consent cookie hasn't been set yet)
2. User clicks **"Accept analytics cookies"**
3. Client-side JS (`cookies.js`) intercepts the click and:
   - Shows the "accepted" confirmation banner
   - **Immediately** creates a `<script>` element loading GTM → GA cookies start being set
   - Sends an async XHR POST to `/cookies` with the CSRF token to persist the choice
   - On XHR failure (network error or stale CSRF token), falls back to a native form POST
4. The user stays on the same page with the confirmation banner visible — no reload
5. On the next natural page navigation: no banner shown, GTM scripts rendered server-side in the HTML

> **Why no redirect after the XHR?** Loading GTM client-side immediately and then reloading the page would fire two GTM initialisations on the same logical page view, risking a double-counted GA session. Staying on the page avoids this.

#### Without JavaScript (progressive enhancement)

1. User visits a page → banner appears inside a `<form>` that POSTs to `/cookies`
2. User clicks **"Accept analytics cookies"** (a `<button type="submit">`)
3. Browser submits the form with `analytics=true`, `async=false`, CSRF token, and `returnUrl`
4. Server updates the consent cookie and redirects back to the original page
5. On next page load: no banner shown, GTM scripts rendered server-side

This dual approach ensures the service works for all users regardless of JavaScript availability, as required by [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and the [GOV.UK Service Standard](https://www.gov.uk/service-manual/technology/using-progressive-enhancement).

### How GA cookies are removed on rejection

When a user rejects analytics (or changes from accept to reject):

**Client-side** (`src/client/javascripts/cookies.js`):
- Iterates all browser cookies and finds those matching GA prefixes (`_ga`, `_gid`, `_gat`, `_dc_gtm_`)
- Deletes each one across all possible domain variants (e.g. `.example.com`, `.service.example.com`)
- This is necessary because GA sets cookies on parent domains, and you must delete on the exact domain they were set on

**Server-side** (`src/cookies.js`):
- `removeAnalytics()` uses `h.unstate()` to send `Set-Cookie` headers that expire GA cookies
- This catches the case where a user has JavaScript disabled
- The cookies plugin (`src/plugins/cookies.js`) calls this on every page load when the user has **explicitly confirmed** their preference and analytics is rejected (`confirmed: true && analytics: false`)
- On first visit (before the user has made any choice), no cookies are deleted — only loading GTM is suppressed

### Shared domains and cookies from other services

Services hosted on a shared domain (e.g. `payments.defra.gov.uk` and `grants.defra.gov.uk`) will encounter each other's Google Analytics cookies. There are several things to understand.

**GA cookies from other services will be visible to your service**

GTM sets `_ga` cookies on the broadest useful domain — typically `.defra.gov.uk` rather than `payments.defra.gov.uk` — so the same user is recognised across all services on that domain. This means when a user visits your service, cookies set by a completely different service will appear in `document.cookie` (client-side) and `request.state` (server-side). This is normal and expected; do not treat it as a bug or attempt to filter by service.

**You cannot tell whose cookie it is**

`document.cookie` and `request.state` provide `name=value` pairs with no domain metadata. There is no way to distinguish "my service's `_ga`" from another service's `_ga`. They are identical. This is why the deletion logic sweeps all cookies matching GA prefixes — there is no more targeted approach available.

**Rejecting analytics on your service will delete GA cookies for sibling services**

When `deleteGoogleAnalyticsCookies()` deletes `_ga` on `.defra.gov.uk`, those cookies are gone for every `*.defra.gov.uk` service. If the user then visits another service on the same domain, that service's GA will treat them as a new user and begin a new session. This is the correct GDPR behaviour — the user expressed a preference and it was fully honoured — but teams should be aware of it rather than surprised.

**Server-side removal has a limitation on shared domains**

The client-side `deleteGoogleAnalyticsCookies()` iterates all domain variants and successfully removes cookies wherever they were set. The server-side `h.unstate()` in `removeAnalytics()` only issues `Set-Cookie` expiry headers for the domain of the current request — it cannot reach parent domains. This means for users **without JavaScript**, if GTM set a cookie on `.defra.gov.uk` but the user's request came from `payments.defra.gov.uk`, the server-side unstate will not remove it. The cookie will remain in the browser until the user revisits with JavaScript enabled, or it naturally expires. This is a browser security constraint, not a bug in the implementation.

### How CSP works with GTM

Content Security Policy is configured in `src/plugins/content-security-policy.js` using [Blankie](https://github.com/nlf/blankie):

| Directive | Values | Why |
|-----------|--------|-----|
| `scriptSrc` | `'self'`, nonce, sha256 hash, `*.googletagmanager.com`, `*.google-analytics.com` | Allow our scripts, GTM, and GA |
| `connectSrc` | `'self'`, `*.google-analytics.com`, `*.analytics.google.com`, `*.googletagmanager.com` | GA sends data via XHR/fetch |
| `imgSrc` | `'self'`, `*.googletagmanager.com`, `*.google-analytics.com` | GA tracking pixels |
| `frameSrc` | `*.googletagmanager.com` | GTM noscript iframe |
| `generateNonces` | `true` | Fresh nonce per response |

**Key details:**

- **Nonces**: Blankie generates a unique nonce for each HTTP response. This nonce is added to the CSP header and available in templates as `{{ nonce }}`. Only `<script>` tags with a matching `nonce` attribute will execute. This is more secure than `'unsafe-inline'`.

- **SHA-256 hash**: GOV.UK Frontend includes a small inline script for progressive enhancement. The hash `sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=` allows this specific script to run. See [GOV.UK Frontend docs](https://frontend.design-system.service.gov.uk/import-javascript/#if-our-inline-javascript-snippet-is-blocked-by-a-content-security-policy).

- **Why `'unsafe-inline'` is NOT used**: Using `'unsafe-inline'` would allow any inline script to execute, defeating the purpose of CSP. Nonces provide granular control.

### How CSRF protection works

[`@hapi/crumb`](https://github.com/hapijs/crumb) provides CSRF protection:

1. On every response, Crumb sets an httpOnly cookie containing a token
2. The token is available in templates as `{{ crumb }}`
3. Forms include it as `<input type="hidden" name="crumb" value="{{ crumb }}">`
4. The cookie banner also stores it as `data-crumb` for the JavaScript XHR flow
5. On POST, Crumb validates the submitted token matches the cookie
6. Mismatches result in 403 Forbidden

### Open redirect protection

The `returnUrl` parameter (used to redirect back after banner submission) is validated by `isSafeRedirect()` to ensure it:
- Starts with `/` (same origin)
- Does NOT start with `//` (protocol-relative URLs redirect externally)
- Is limited to 2000 characters (Joi validation)

## Adapting for your own service

### 1. Change the cookie name

In `src/config/config.js`, change the `cookie.name` default:

```javascript
cookie: {
  name: {
    default: 'your_service_cookie_policy'
  }
}
```

The cookie preferences page (`src/views/cookies/policy.njk`) renders the cookie name dynamically from config — no template edit required.

### 2. Set your GTM container ID

Either set the environment variable:

```bash
GOOGLE_TAG_MANAGER_KEY=GTM-YOURTAG
```

Or change the default in `src/config/config.js`.

### 3. Update the service name

Set the `SERVICE_NAME` environment variable or change the default in config.

### 4. Add production features

This demo omits several features you'll want in production:

- **Structured logging**: Add [`hapi-pino`](https://github.com/hapijs/hapi-pino) with [`@elastic/ecs-pino-format`](https://github.com/elastic/ecs-logging-js/tree/main/loggers/pino)
- **Request tracing**: Add [`@defra/hapi-tracing`](https://github.com/DEFRA/hapi-tracing) for correlation IDs
- **Graceful shutdown**: Add [`hapi-pulse`](https://github.com/nickolasgr/hapi-pulse)
- **TLS context**: Add secure context for outbound HTTPS calls
- **Security headers**: Add `X-Robots-Tag`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-*` headers
- **Error pages**: Add 404/500 templates and a `catchAll` error handler

See [fcp-mpdp-frontend](https://github.com/DEFRA/fcp-mpdp-frontend) for a production implementation with all of these.

## Troubleshooting

### "I accepted cookies but GA isn't firing"

1. Check the browser Network tab for a request to `googletagmanager.com/gtm.js`. If it's absent, the GTM key may be missing — verify `GOOGLE_TAG_MANAGER_KEY` is set and matches the pattern `GTM-XXXXXXXX`.
2. If the request is present but GA events aren't recorded, check the GTM container configuration — the GA4 tag may not be published or may have a misconfigured trigger.
3. Check the browser console for CSP errors. The `Content-Security-Policy` header must include `*.googletagmanager.com` and `*.google-analytics.com` in `script-src` and `connect-src`.

### "The user changed their preference but old GA cookies are still there"

1. **With JavaScript**: rejection deletes GA cookies immediately client-side via `deleteGoogleAnalyticsCookies()`, which sweeps all domain variants. Check the browser console for errors in that function.
2. **Without JavaScript**: rejection triggers server-side `h.unstate()` which sets expiry headers for cookies found in `request.state` on the current request's domain only. If GA set cookies on a parent domain (e.g. `.defra.gov.uk`) but the request is from a subdomain, those parent-domain cookies won't be cleared until the user revisits with JavaScript enabled. This is a browser security constraint — see the Shared domains section above.
3. If `_dc_gtm_*` cookies persist, they typically expire within 1 minute naturally.

### "The banner reappears after the user already made a choice"

The consent cookie (`cookie_banner_demo_policy` by default) has a 1-year TTL. If it's reappearing:

1. The consent cookie may have been cleared (browser settings, dev tools, or `clearInvalid: true` rejecting a corrupt value).
2. The CSRF token may have been stale when the async XHR was sent, causing the server to reject it with 403. The fallback native form POST should have caught this — check server logs for 403s on `POST /cookies`.
3. The `confirmed` field in the cookie may be `false` — this means `updatePolicy()` was never called successfully. Check that the POST payload includes `analytics: true` or `analytics: false` (not omitted).

### "It works with JavaScript but the no-JS form submission doesn't redirect correctly"

The no-JS path POSTs to `/cookies` with a `returnUrl` field containing the current path. Check:

1. The `returnUrl` hidden input is present in the rendered HTML (`<input type="hidden" name="returnUrl" value="...">`).
2. The value starts with `/` and does not start with `//` — `isSafeRedirect()` will reject anything else and fall through to re-rendering the cookies page instead of redirecting.
3. The `crumb` hidden input is present and matches the Crumb cookie — a mismatch causes a 403.

### "CSP is blocking GTM or GA"

Check the browser console for CSP violation reports. Common causes:

- GTM loading a third-party script not in the allowlist — update `connectSrc` and `scriptSrc` in `src/plugins/content-security-policy.js`
- The nonce not propagating correctly — ensure `{{ nonce }}` renders a non-empty value in the GTM script tag
- A browser extension injecting scripts that trigger violation reports — test in a clean profile

## Technology stack

| Technology | Purpose |
|-----------|---------|
| [Node.js 22+](https://nodejs.org/) | Runtime with ES module support |
| [Hapi.js 21](https://hapi.dev/) | HTTP server framework |
| [Nunjucks](https://mozilla.github.io/nunjucks/) | Server-side template engine |
| [GOV.UK Frontend 6.x](https://frontend.design-system.service.gov.uk/) | Design System components and styles |
| [Webpack](https://webpack.js.org/) | Client-side asset bundling |
| [@hapi/crumb](https://github.com/hapijs/crumb) | CSRF protection |
| [Blankie](https://github.com/nlf/blankie) | Content Security Policy |
| [Convict](https://github.com/mozilla/node-convict) | Configuration management |
| [Vitest](https://vitest.dev/) | Testing framework |
| [neostandard](https://github.com/neostandard/neostandard) | Linting (ESLint config) |

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

[http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3](http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3)
