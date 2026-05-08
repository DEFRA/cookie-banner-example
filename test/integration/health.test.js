import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import { createServer } from '../../src/server.js'

describe('Health route', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET /health returns 200', async () => {
    const response = await server.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
  })

  test('GET /health returns success message', async () => {
    const response = await server.inject({ method: 'GET', url: '/health' })

    expect(JSON.parse(response.payload)).toStrictEqual({ message: 'success' })
  })
})
