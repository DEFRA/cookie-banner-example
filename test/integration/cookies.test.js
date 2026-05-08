import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { createServer } from '../../src/server.js'
import { config } from '../../src/config/config.js'

describe('Cookies route', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET /cookies returns 200', async () => {
    const response = await server.inject({ method: 'GET', url: '/cookies' })

    expect(response.statusCode).toBe(200)
  })

  test('GET /cookies renders cookie policy page', async () => {
    const response = await server.inject({ method: 'GET', url: '/cookies' })

    expect(response.request.response.source.template).toBe('cookies/policy')
  })

  test('GET /cookies has correct page title', async () => {
    const response = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(response.payload)

    expect($('title').text()).toContain('Cookies')
    expect($('title').text()).toContain(config.get('serviceName'))
  })

  test('GET /cookies shows analytics radio buttons', async () => {
    const response = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(response.payload)

    expect($('input[name="analytics"]').length).toBe(2)
  })

  test('GET /cookies has cookie tables', async () => {
    const response = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(response.payload)

    expect($('.govuk-table').length).toBe(2)
    expect(response.payload).toContain(config.get('cookie.name'))
    expect(response.payload).toContain('_ga')
  })

  test('POST /cookies returns 200 if async', async () => {
    const getResponse = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(getResponse.payload)
    const cookies = getResponse.headers['set-cookie']
    const crumb = $('input[name="crumb"]').val()

    const result = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        cookie: cookies ? cookies.join(';') : ''
      },
      payload: {
        analytics: true,
        async: true,
        crumb
      }
    })

    expect(result.statusCode).toBe(200)
  })

  test('POST /cookies returns success JSON if async', async () => {
    const getResponse = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(getResponse.payload)
    const cookies = getResponse.headers['set-cookie']
    const crumb = $('input[name="crumb"]').val()

    const result = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        cookie: cookies ? cookies.join(';') : ''
      },
      payload: {
        analytics: true,
        async: true,
        crumb
      }
    })

    expect(JSON.parse(result.payload)).toStrictEqual({ message: 'success' })
  })

  test('POST /cookies invalid payload returns 400', async () => {
    const getResponse = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(getResponse.payload)
    const cookies = getResponse.headers['set-cookie']
    const crumb = $('input[name="crumb"]').val()

    const result = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        cookie: cookies ? cookies.join(';') : ''
      },
      payload: {
        invalid: 'aaaaaa',
        crumb
      }
    })

    expect(result.statusCode).toBe(400)
  })

  test('POST /cookies with valid returnUrl redirects', async () => {
    const getResponse = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(getResponse.payload)
    const cookies = getResponse.headers['set-cookie']
    const crumb = $('input[name="crumb"]').val()

    const result = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        cookie: cookies ? cookies.join(';') : ''
      },
      payload: {
        analytics: true,
        async: false,
        returnUrl: '/',
        crumb
      }
    })

    expect(result.statusCode).toBe(302)
    expect(result.headers.location).toBe('/')
  })

  test('POST /cookies with external returnUrl falls through to policy view', async () => {
    const getResponse = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(getResponse.payload)
    const cookies = getResponse.headers['set-cookie']
    const crumb = $('input[name="crumb"]').val()

    const result = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        cookie: cookies ? cookies.join(';') : ''
      },
      payload: {
        analytics: true,
        async: false,
        returnUrl: 'https://evil.example.com',
        crumb
      }
    })

    expect(result.statusCode).toBe(200)
    expect(result.request.response.source.template).toBe('cookies/policy')
  })

  test('POST /cookies with protocol-relative returnUrl falls through to policy view', async () => {
    const getResponse = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(getResponse.payload)
    const cookies = getResponse.headers['set-cookie']
    const crumb = $('input[name="crumb"]').val()

    const result = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        cookie: cookies ? cookies.join(';') : ''
      },
      payload: {
        analytics: false,
        async: false,
        returnUrl: '//evil.example.com',
        crumb
      }
    })

    expect(result.statusCode).toBe(200)
    expect(result.request.response.source.template).toBe('cookies/policy')
  })

  test('POST /cookies with returnUrl exceeding 2000 chars returns 400', async () => {
    const getResponse = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(getResponse.payload)
    const cookies = getResponse.headers['set-cookie']
    const crumb = $('input[name="crumb"]').val()

    const result = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        cookie: cookies ? cookies.join(';') : ''
      },
      payload: {
        analytics: true,
        async: false,
        returnUrl: '/' + 'a'.repeat(2001),
        crumb
      }
    })

    expect(result.statusCode).toBe(400)
  })

  test('POST /cookies sync without returnUrl renders policy with success banner', async () => {
    const getResponse = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(getResponse.payload)
    const cookies = getResponse.headers['set-cookie']
    const crumb = $('input[name="crumb"]').val()

    const result = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        cookie: cookies ? cookies.join(';') : ''
      },
      payload: {
        analytics: true,
        async: false,
        crumb
      }
    })

    expect(result.statusCode).toBe(200)
    const $result = cheerio.load(result.payload)
    expect($result('.govuk-notification-banner--success').length).toBe(1)
  })

  test('Cookie banner appears on cookie page when no cookie set', async () => {
    const response = await server.inject({ method: 'GET', url: '/cookies' })
    const $ = cheerio.load(response.payload)

    expect($('.govuk-cookie-banner').length).toBe(1)
    expect($('.js-cookies-button-accept').text()).toContain('Accept analytics cookies')
    expect($('.js-cookies-button-reject').text()).toContain('Reject analytics cookies')
  })
})
