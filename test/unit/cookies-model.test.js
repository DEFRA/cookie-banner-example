import { describe, test, expect } from 'vitest'
import { cookiesModel } from '../../src/routes/models/cookies.js'

describe('cookiesModel', () => {
  test('returns analytics radios with no checked when no policy', () => {
    const result = cookiesModel(false, '')

    expect(result.analytics.items[0].checked).toBe(undefined)
    expect(result.analytics.items[1].checked).toBe(true)
    expect(result.updated).toBe(false)
  })

  test('returns analytics radios with Yes checked when analytics accepted', () => {
    const result = cookiesModel(false, '', { analytics: true })

    expect(result.analytics.items[0].checked).toBe(true)
    expect(result.analytics.items[1].checked).toBe(false)
  })

  test('returns analytics radios with No checked when analytics rejected', () => {
    const result = cookiesModel(false, '', { analytics: false })

    expect(result.analytics.items[0].checked).toBe(false)
    expect(result.analytics.items[1].checked).toBe(true)
  })

  test('sets updated to true when preferences saved', () => {
    const result = cookiesModel(true, '/previous')

    expect(result.updated).toBe(true)
    expect(result.referer).toBe('/previous')
  })
})
