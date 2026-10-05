import { describe, it, expect, afterEach } from 'vitest'
import { http } from '@inertiajs/core'
import { setupCaseShift } from '../src/index'

// Runs through the real @inertiajs/core handler registry that both router
// visits and useHttp requests go through.
describe('setupCaseShift with @inertiajs/core http', () => {
  let cleanup: () => void

  afterEach(() => cleanup?.())

  it('snake_cases a useHttp JSON body', async () => {
    cleanup = setupCaseShift(http)

    const config = await http.processRequest({
      method: 'post',
      url: '/users?pageSize=10',
      data: JSON.stringify({ firstName: 'John' }),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    })

    expect(config.data).toBe('{"first_name":"John"}')
    expect(config.url).toBe('/users?page_size=10')
  })

  it('camelCases a useHttp JSON response', async () => {
    cleanup = setupCaseShift(http)

    const response = await http.processResponse({
      status: 200,
      data: JSON.stringify({ userName: 'x', created_at: '2026-01-01' }),
      headers: {},
    })

    expect(JSON.parse(response.data)).toEqual({ userName: 'x', createdAt: '2026-01-01' })
  })
})
