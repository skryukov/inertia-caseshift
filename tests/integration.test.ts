import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupCaseShift, transformInitialPage } from '../src/index'

function createMockHttp() {
  const requestHandlers: Array<(config: any) => any> = []
  const responseHandlers: Array<(response: any) => any> = []
  const errorHandlers: Array<(error: any) => void> = []

  return {
    onRequest: vi.fn((handler: (config: any) => any) => {
      requestHandlers.push(handler)
      return () => {
        const idx = requestHandlers.indexOf(handler)
        if (idx >= 0) requestHandlers.splice(idx, 1)
      }
    }),
    onResponse: vi.fn((handler: (response: any) => any) => {
      responseHandlers.push(handler)
      return () => {
        const idx = responseHandlers.indexOf(handler)
        if (idx >= 0) responseHandlers.splice(idx, 1)
      }
    }),
    onError: vi.fn((handler: (error: any) => void) => {
      errorHandlers.push(handler)
      return () => {
        const idx = errorHandlers.indexOf(handler)
        if (idx >= 0) errorHandlers.splice(idx, 1)
      }
    }),
    async simulateResponse(data: any) {
      const response = { status: 200, data: JSON.stringify(data), headers: {} }
      let result = response as any
      for (const handler of responseHandlers) {
        result = await handler(result)
      }
      return result
    },
    async simulateRequest(config: any) {
      let result = config
      for (const handler of requestHandlers) {
        result = await handler(result)
      }
      return result
    },
    async simulateError(status: number, data: any) {
      const error = {
        response: { status, data: JSON.stringify(data), headers: {} },
      }
      for (const handler of errorHandlers) {
        await handler(error)
      }
      return error
    },
    requestHandlerCount: () => requestHandlers.length,
    responseHandlerCount: () => responseHandlers.length,
    errorHandlerCount: () => errorHandlers.length,
  }
}

describe('setupCaseShift', () => {
  let http: ReturnType<typeof createMockHttp>

  beforeEach(() => {
    http = createMockHttp()
  })

  it('registers request, response, and error handlers', () => {
    setupCaseShift(http)
    expect(http.onRequest).toHaveBeenCalledOnce()
    expect(http.onResponse).toHaveBeenCalledOnce()
    expect(http.onError).toHaveBeenCalledOnce()
  })

  it('returns cleanup function that removes handlers', () => {
    const cleanup = setupCaseShift(http)
    expect(http.requestHandlerCount()).toBe(1)
    expect(http.responseHandlerCount()).toBe(1)
    expect(http.errorHandlerCount()).toBe(1)

    cleanup()
    expect(http.requestHandlerCount()).toBe(0)
    expect(http.responseHandlerCount()).toBe(0)
    expect(http.errorHandlerCount()).toBe(0)
  })

  describe('response transformation', () => {
    it('parses JSON string and transforms Inertia response', async () => {
      setupCaseShift(http)

      const result = await http.simulateResponse({
        component: 'Users/Index',
        props: { user_name: 'John', created_at: '2026-01-01' },
        url: '/users',
        version: 'v1',
      })

      expect(result.data.props).toEqual({
        userName: 'John',
        createdAt: '2026-01-01',
      })
    })

    it('leaves non-Inertia responses untouched', async () => {
      setupCaseShift(http)

      const response = { status: 200, data: JSON.stringify({ some_data: 'value' }), headers: {} }
      let result = response as any
      for (const handler of [http.onResponse.mock.calls[0][0]]) {
        result = await handler(result)
      }

      // No 'component' key, so data should be parsed but not transformed
      expect(result.data).toEqual({ some_data: 'value' })
    })

    it('handles non-JSON response data gracefully', async () => {
      setupCaseShift(http)

      const response = { status: 200, data: '<html>Not JSON</html>', headers: {} }
      let result = response as any
      for (const handler of [http.onResponse.mock.calls[0][0]]) {
        result = await handler(result)
      }

      expect(result.data).toBe('<html>Not JSON</html>')
    })

    it('handles already-parsed response data', async () => {
      setupCaseShift(http)

      const response = {
        status: 200,
        data: { component: 'Page', props: { user_name: 'John' } },
        headers: {},
      }
      let result = response as any
      for (const handler of [http.onResponse.mock.calls[0][0]]) {
        result = await handler(result)
      }

      expect(result.data.props).toEqual({ userName: 'John' })
    })
  })

  describe('request transformation', () => {
    it('transforms JSON body keys to snake_case', async () => {
      setupCaseShift(http)

      const result = await http.simulateRequest({
        method: 'post',
        url: '/users',
        data: { firstName: 'John', lastName: 'Doe' },
        headers: {},
      })

      expect(result.data).toEqual({ first_name: 'John', last_name: 'Doe' })
    })

    it('transforms partial reload headers to snake_case', async () => {
      setupCaseShift(http)

      const result = await http.simulateRequest({
        method: 'get',
        url: '/users',
        data: null,
        headers: {
          'X-Inertia': 'true',
          'X-Inertia-Partial-Data': 'userStats,recentPosts',
          'X-Inertia-Partial-Component': 'Users/Show',
        },
      })

      expect(result.headers['X-Inertia-Partial-Data']).toBe('user_stats,recent_posts')
      expect(result.headers['X-Inertia-Partial-Component']).toBe('Users/Show')
    })

    it('transforms reset headers to snake_case', async () => {
      setupCaseShift(http)

      const result = await http.simulateRequest({
        method: 'get',
        url: '/feed',
        data: null,
        headers: {
          'X-Inertia-Reset': 'feedItems',
        },
      })

      expect(result.headers['X-Inertia-Reset']).toBe('feed_items')
    })

    it('transforms once-props exclusion header', async () => {
      setupCaseShift(http)

      const result = await http.simulateRequest({
        method: 'get',
        url: '/dashboard',
        data: null,
        headers: {
          'X-Inertia-Except-Once-Props': 'cachedStats,userPreferences',
        },
      })

      expect(result.headers['X-Inertia-Except-Once-Props']).toBe('cached_stats,user_preferences')
    })

    it('transforms error bag header to snake_case', async () => {
      setupCaseShift(http)

      const result = await http.simulateRequest({
        method: 'post',
        url: '/users',
        data: { firstName: 'John' },
        headers: {
          'X-Inertia-Error-Bag': 'createUser',
        },
      })

      expect(result.headers['X-Inertia-Error-Bag']).toBe('create_user')
    })

    it('handles FormData in request body', async () => {
      setupCaseShift(http)

      const fd = new FormData()
      fd.append('firstName', 'John')
      fd.append('avatarImage', new File([''], 'photo.jpg'))

      const result = await http.simulateRequest({
        method: 'post',
        url: '/users',
        data: fd,
        headers: {},
      })

      expect(result.data).toBeInstanceOf(FormData)
      expect(result.data.get('first_name')).toBe('John')
      expect(result.data.get('avatar_image')).toBeInstanceOf(File)
    })

    it('transforms query param keys in URL to snake_case', async () => {
      setupCaseShift(http)

      const result = await http.simulateRequest({
        method: 'get',
        url: '/users?sortField=name&filterType=active',
        data: null,
        headers: {},
      })

      expect(result.url).toBe('/users?sort_field=name&filter_type=active')
    })

    it('handles null/undefined data', async () => {
      setupCaseShift(http)

      const result = await http.simulateRequest({
        method: 'get',
        url: '/users',
        data: null,
        headers: {},
      })

      expect(result.data).toBeNull()
    })
  })

  describe('error response transformation', () => {
    it('transforms Inertia page object in error responses', async () => {
      setupCaseShift(http)

      const error = await http.simulateError(422, {
        component: 'Users/Create',
        props: {
          errors: {
            first_name: "can't be blank",
            email_address: 'is invalid',
          },
        },
        url: '/users',
        version: 'v1',
      })

      expect(error.response.data.props.errors).toEqual({
        firstName: "can't be blank",
        emailAddress: 'is invalid',
      })
    })

    it('handles non-Inertia error responses gracefully', async () => {
      setupCaseShift(http)

      const error = await http.simulateError(500, { error: 'Internal Server Error' })

      expect(error.response.data).toEqual({ error: 'Internal Server Error' })
    })

    it('handles error without response property', async () => {
      setupCaseShift(http)

      const errorHandler = http.onError.mock.calls[0][0]
      const error = { message: 'Network error' }
      await errorHandler(error)

      expect(error).toEqual({ message: 'Network error' })
    })
  })

  describe('initial page transformation', () => {
    it('transforms initial page data from <script data-page> JSON', () => {
      const initialPage = {
        component: 'Users/Index',
        props: {
          user_name: 'John',
          created_at: '2026-01-01',
          nested_data: { first_name: 'John', last_name: 'Doe' },
        },
        flash: { success_message: 'Welcome!' },
        deferredProps: { default: ['user_stats', 'recent_activity'] },
        mergeProps: ['feed_items'],
        url: '/users',
        version: 'v1',
      }

      const result = transformInitialPage(initialPage)

      // Returns the same object for chaining
      expect(result).toBe(initialPage)

      // Props are camelCased
      expect(result.props).toEqual({
        userName: 'John',
        createdAt: '2026-01-01',
        nestedData: { firstName: 'John', lastName: 'Doe' },
      })

      // Flash is camelCased
      expect(result.flash).toEqual({ successMessage: 'Welcome!' })

      // Metadata paths are camelCased
      expect(result.deferredProps).toEqual({ default: ['userStats', 'recentActivity'] })
      expect(result.mergeProps).toEqual(['feedItems'])
    })

    it('respects options (rawKeys, skipKeys)', () => {
      const initialPage = {
        component: 'Settings',
        props: {
          user_name: 'John',
          editor_config: { background_color: 'red', font_size: 14 },
        },
        url: '/settings',
        version: 'v1',
      }

      transformInitialPage(initialPage, { rawKeys: ['editorConfig'] })

      expect(initialPage.props).toEqual({
        userName: 'John',
        editorConfig: { background_color: 'red', font_size: 14 },
      })
    })

    it('is a no-op for non-Inertia objects', () => {
      const data = { some_key: 'value' } as any
      const result = transformInitialPage(data)

      expect(result).toBe(data)
      expect(result.some_key).toBe('value')
    })
  })

  describe('full roundtrip', () => {
    it('response camelCase -> component uses camelCase -> request snakeCase', async () => {
      setupCaseShift(http)

      // 1. Backend sends snake_case response
      const response = await http.simulateResponse({
        component: 'Courses/Index',
        props: {
          course_list: [
            { course_name: 'Ruby', instructor_id: 1 },
            { course_name: 'Rails', instructor_id: 2 },
          ],
          current_user: { first_name: 'John' },
          errors: {},
        },
        mergeProps: ['course_list'],
        matchPropsOn: ['course_list.instructor_id'],
        deferredProps: { sidebar: ['related_courses'] },
        url: '/courses',
        version: 'v1',
      })

      // 2. Component sees camelCase
      expect(response.data.props.courseList).toBeDefined()
      expect(response.data.props.courseList[0].courseName).toBe('Ruby')
      expect(response.data.props.currentUser.firstName).toBe('John')
      expect(response.data.mergeProps).toEqual(['courseList'])
      expect(response.data.matchPropsOn).toEqual(['courseList.instructorId'])
      expect(response.data.deferredProps).toEqual({ sidebar: ['relatedCourses'] })

      // 3. Component submits form with camelCase
      const request = await http.simulateRequest({
        method: 'post',
        url: '/courses',
        data: { courseName: 'Python 101', instructorId: 3 },
        headers: {},
      })

      // 4. Backend receives snake_case
      expect(request.data).toEqual({ course_name: 'Python 101', instructor_id: 3 })

      // 5. Partial reload with camelCase path gets converted
      const partialRequest = await http.simulateRequest({
        method: 'get',
        url: '/courses',
        data: null,
        headers: {
          'X-Inertia': 'true',
          'X-Inertia-Partial-Data': 'courseList,currentUser',
          'X-Inertia-Partial-Component': 'Courses/Index',
        },
      })

      // 6. Backend receives snake_case paths
      expect(partialRequest.headers['X-Inertia-Partial-Data']).toBe('course_list,current_user')
    })

    it('deferred props roundtrip', async () => {
      setupCaseShift(http)

      // Initial load: backend defers user_stats
      const initial = await http.simulateResponse({
        component: 'Dashboard',
        props: { page_title: 'Home' },
        deferredProps: { default: ['user_stats', 'recent_activity'] },
        url: '/dashboard',
        version: 'v1',
      })

      expect(initial.data.deferredProps).toEqual({ default: ['userStats', 'recentActivity'] })

      // Client requests deferred props using camelCase paths
      const deferred = await http.simulateRequest({
        method: 'get',
        url: '/dashboard',
        data: null,
        headers: {
          'X-Inertia': 'true',
          'X-Inertia-Partial-Data': 'userStats,recentActivity',
          'X-Inertia-Partial-Component': 'Dashboard',
        },
      })

      // Backend receives snake_case
      expect(deferred.headers['X-Inertia-Partial-Data']).toBe('user_stats,recent_activity')
    })

    it('scroll props roundtrip with reset', async () => {
      setupCaseShift(http)

      // Backend sends scroll props
      const response = await http.simulateResponse({
        component: 'Feed',
        props: {
          feed_items: [{ post_title: 'Hello' }],
        },
        mergeProps: ['feed_items'],
        scrollProps: {
          feed_items: { pageName: 'page', currentPage: 1, nextPage: 2, previousPage: null, reset: false },
        },
        url: '/feed',
        version: 'v1',
      })

      expect(response.data.scrollProps).toEqual({
        feedItems: { pageName: 'page', currentPage: 1, nextPage: 2, previousPage: null, reset: false },
      })

      // Client resets scroll with camelCase
      const reset = await http.simulateRequest({
        method: 'get',
        url: '/feed',
        data: null,
        headers: {
          'X-Inertia': 'true',
          'X-Inertia-Reset': 'feedItems',
          'X-Inertia-Partial-Data': 'feedItems',
          'X-Inertia-Partial-Component': 'Feed',
        },
      })

      expect(reset.headers['X-Inertia-Reset']).toBe('feed_items')
      expect(reset.headers['X-Inertia-Partial-Data']).toBe('feed_items')
    })

    it('rawKeys roundtrip: user JSON blob preserved', async () => {
      setupCaseShift(http, { rawKeys: ['editorConfig'] })

      // Backend sends snake_case response with user-supplied JSON
      const response = await http.simulateResponse({
        component: 'Settings',
        props: {
          user_name: 'John',
          editor_config: { background_color: 'red', font_size: 14 },
        },
        url: '/settings',
        version: 'v1',
      })

      // Key is camelCased, but value is untouched
      expect(response.data.props.userName).toBe('John')
      expect(response.data.props.editorConfig).toEqual({
        background_color: 'red',
        font_size: 14,
      })

      // Client sends back with camelCase keys in the blob
      const request = await http.simulateRequest({
        method: 'post',
        url: '/settings',
        data: {
          userName: 'John',
          editorConfig: { backgroundColor: 'red', fontSize: 14 },
        },
        headers: {},
      })

      // Key is snake_cased, but value is untouched
      expect(request.data).toEqual({
        user_name: 'John',
        editor_config: { backgroundColor: 'red', fontSize: 14 },
      })
    })

    it('skipKeys roundtrip: key and value both preserved', async () => {
      setupCaseShift(http, { skipKeys: ['editorConfig'] })

      // Request: key stays camelCase, value untouched
      const request = await http.simulateRequest({
        method: 'post',
        url: '/settings',
        data: {
          userName: 'John',
          editorConfig: { backgroundColor: 'red' },
        },
        headers: {},
      })

      expect(request.data).toEqual({
        user_name: 'John',
        editorConfig: { backgroundColor: 'red' },
      })

      // Response: key stays snake_case, value untouched
      const response = await http.simulateResponse({
        component: 'Settings',
        props: {
          user_name: 'John',
          editor_config: { background_color: 'red' },
        },
        url: '/settings',
        version: 'v1',
      })

      expect(response.data.props.userName).toBe('John')
      expect(response.data.props.editor_config).toEqual({ background_color: 'red' })
    })

    it('errors roundtrip: validation fail -> re-display', async () => {
      setupCaseShift(http)

      // Backend redirects with errors after validation failure
      const response = await http.simulateResponse({
        component: 'Users/Create',
        props: {
          errors: {
            first_name: "can't be blank",
            email_address: 'is invalid',
          },
          old_input: { last_name: 'Doe' },
        },
        url: '/users/new',
        version: 'v1',
      })

      // Form sees camelCase errors matching camelCase field names
      expect(response.data.props.errors).toEqual({
        firstName: "can't be blank",
        emailAddress: 'is invalid',
      })
      expect(response.data.props.oldInput).toEqual({ lastName: 'Doe' })

      // User fixes and resubmits with camelCase
      const resubmit = await http.simulateRequest({
        method: 'post',
        url: '/users',
        data: { firstName: 'John', lastName: 'Doe', emailAddress: 'john@example.com' },
        headers: {},
      })

      // Backend receives snake_case
      expect(resubmit.data).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        email_address: 'john@example.com',
      })
    })

    it('once props roundtrip', async () => {
      setupCaseShift(http)

      // Initial load includes once props
      const initial = await http.simulateResponse({
        component: 'Settings',
        props: { user_preferences: { dark_mode: true } },
        onceProps: {
          user_preferences: { prop: 'user_preferences', expiresAt: 9999999999 },
        },
        url: '/settings',
        version: 'v1',
      })

      expect(initial.data.onceProps).toEqual({
        userPreferences: { prop: 'userPreferences', expiresAt: 9999999999 },
      })

      // Next visit excludes already-cached once props
      const nextVisit = await http.simulateRequest({
        method: 'get',
        url: '/settings',
        data: null,
        headers: {
          'X-Inertia': 'true',
          'X-Inertia-Except-Once-Props': 'userPreferences',
        },
      })

      expect(nextVisit.headers['X-Inertia-Except-Once-Props']).toBe('user_preferences')
    })
  })
})
