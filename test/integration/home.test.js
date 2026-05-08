import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { createServer } from '../../src/server.js'
import { config } from '../../src/config/config.js'

describe('Home route', () => {
  let server
  let response
  let $

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()

    response = await server.inject({ method: 'GET', url: '/' })
    $ = cheerio.load(response.payload)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('returns 200', () => {
    expect(response.statusCode).toBe(200)
  })

  test('has correct page title', () => {
    expect($('title').text()).toContain('Cookie Banner Demo')
    expect($('title').text()).toContain(config.get('serviceName'))
  })

  test('shows cookie banner when no cookie set', () => {
    expect($('.govuk-cookie-banner').length).toBe(1)
    expect($('.js-cookies-button-accept').text()).toContain('Accept analytics cookies')
    expect($('.js-cookies-button-reject').text()).toContain('Reject analytics cookies')
  })

  test('has CSRF token in cookie banner form', () => {
    const crumbInput = $('input[name="crumb"]')
    expect(crumbInput.length).toBeGreaterThan(0)
    expect(crumbInput.val()).toBeTruthy()
  })

  test('has return URL in cookie banner form', () => {
    const returnUrlInput = $('input[name="returnUrl"]')
    expect(returnUrlInput.length).toBeGreaterThan(0)
  })

  test('has data attributes for JS enhancement', () => {
    const container = $('.js-cookies-container')
    expect(container.data('crumb')).toBeTruthy()
    expect(container.data('return-url')).toBeDefined()
  })

  test('does not include GTM scripts when analytics not accepted', () => {
    expect(response.payload).not.toContain('googletagmanager.com/gtm.js')
  })

  test('has CSP headers with nonce', () => {
    const csp = response.headers['content-security-policy']
    expect(csp).toBeDefined()
    expect(csp).toContain('nonce-')
    expect(csp).toContain('googletagmanager.com')
  })

  test('has footer with cookies link', () => {
    const footerLinks = []
    $('.govuk-footer__link').each((_i, el) => {
      footerLinks.push($(el).attr('href'))
    })
    expect(footerLinks).toContain('/cookies')
  })
})
