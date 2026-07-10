// Unit tests for the client-side cookie consent module.
//
// These tests run in Node (not jsdom) and stub the browser globals
// that the module references — globalThis.addEventListener, location,
// and document.cookie. They focus on the behaviour of setupBfcacheGuard(),
// which is the back-button defence added to address the bfcache edge case.

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import cookies from '../../src/client/javascripts/cookies.js'

// Minimal cookie string with a GA cookie to satisfy deleteGoogleAnalyticsCookies()
const MOCK_COOKIE_STRING = '_ga=GA1.1.123.456'

function setupBrowserGlobals () {
  const reloadSpy = vi.fn()
  const addEventListenerStub = vi.fn()

  // globalThis.addEventListener doesn't exist in Node — define it directly
  globalThis.addEventListener = addEventListenerStub

  Object.defineProperty(globalThis, 'location', {
    value: { hostname: 'localhost', reload: reloadSpy },
    writable: true,
    configurable: true
  })

  // Minimal document mock — cookie getter returns a GA cookie,
  // setter is a no-op (we only care that reload is called, not
  // that the delete mechanism writes the right expiry string).
  let cookieString = MOCK_COOKIE_STRING
  Object.defineProperty(globalThis, 'document', {
    value: {
      get cookie () { return cookieString },
      set cookie (_value) { cookieString = '' },
      querySelector: vi.fn().mockReturnValue(null),
      createElement: vi.fn().mockReturnValue({ async: false, src: '' }),
      head: { appendChild: vi.fn() }
    },
    writable: true,
    configurable: true
  })

  return { addEventListenerStub, reloadSpy }
}

describe('client cookies — setupBfcacheGuard', () => {
  let addEventListenerStub
  let reloadSpy

  beforeEach(() => {
    const mocks = setupBrowserGlobals()
    addEventListenerStub = mocks.addEventListenerStub
    reloadSpy = mocks.reloadSpy
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete globalThis.addEventListener
    delete globalThis.document
    delete globalThis.location
  })

  test('registers a pageshow listener on init', () => {
    cookies.setupBfcacheGuard()

    const registered = addEventListenerStub.mock.calls.some(([event]) => event === 'pageshow')
    expect(registered).toBe(true)
  })

  test('reloads the page when event.persisted is true (bfcache restore)', () => {
    cookies.setupBfcacheGuard()

    const [, listener] = addEventListenerStub.mock.calls.find(([event]) => event === 'pageshow')
    listener({ persisted: true })

    expect(reloadSpy).toHaveBeenCalledOnce()
  })

  test('does not reload when event.persisted is false (normal page load)', () => {
    cookies.setupBfcacheGuard()

    const [, listener] = addEventListenerStub.mock.calls.find(([event]) => event === 'pageshow')
    listener({ persisted: false })

    expect(reloadSpy).not.toHaveBeenCalled()
  })

  test('GA cookies are cleared before reload on bfcache restore', () => {
    cookies.setupBfcacheGuard()

    const [, listener] = addEventListenerStub.mock.calls.find(([event]) => event === 'pageshow')

    // Before restore, cookie string contains a GA cookie
    expect(globalThis.document.cookie).toContain('_ga')

    listener({ persisted: true })

    // After the handler runs, cookie string should be cleared
    expect(globalThis.document.cookie).toBe('')
  })
})
