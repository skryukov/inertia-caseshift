import { describe, it, expect, vi, afterEach } from 'vitest'
import { setupCaseShift, toCamelCase, toSnakeCase, toCamelCasePath } from '../src/index'

const http = { onRequest: vi.fn(() => () => {}), onResponse: vi.fn(() => () => {}), onError: vi.fn(() => () => {}) }

describe('case helpers', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
  })

  it('convert data and paths without setup', () => {
    expect(toCamelCase({ user_name: 'a', editor_config: { font_size: 1 } })).toEqual({
      userName: 'a',
      editorConfig: { fontSize: 1 },
    })
    expect(toSnakeCase({ userName: 'a' })).toEqual({ user_name: 'a' })
    expect(toCamelCasePath('user_stats.monthly_total')).toBe('userStats.monthlyTotal')
  })

  it('default to the options passed to setupCaseShift', () => {
    cleanup = setupCaseShift(http, { skipKeys: ['editorConfig'] })

    expect(toCamelCase({ user_name: 'a', editor_config: { font_size: 1 } })).toEqual({
      userName: 'a',
      editor_config: { font_size: 1 },
    })
    expect(toSnakeCase({ editorConfig: { fontSize: 1 } })).toEqual({ editorConfig: { fontSize: 1 } })
    expect(toCamelCasePath('editor_config.font_size')).toBe('editor_config.font_size')
  })

  it('prefer explicitly passed options', () => {
    cleanup = setupCaseShift(http, { skipKeys: ['editorConfig'] })

    expect(toCamelCase({ editor_config: { font_size: 1 } }, {})).toEqual({ editorConfig: { fontSize: 1 } })
  })

  it('forget setup options after cleanup', () => {
    setupCaseShift(http, { skipKeys: ['editorConfig'] })()

    expect(toCamelCase({ editor_config: 1 })).toEqual({ editorConfig: 1 })
  })
})
