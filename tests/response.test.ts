import { describe, it, expect } from 'vitest'
import { transformPageResponse } from '../src/response'

describe('transformPageResponse', () => {
  describe('props', () => {
    it('camelCases all prop keys', () => {
      const data = {
        component: 'Users/Index',
        props: { first_name: 'John', last_name: 'Doe' },
      }
      transformPageResponse(data)
      expect(data.props).toEqual({ firstName: 'John', lastName: 'Doe' })
    })

    it('camelCases nested prop keys', () => {
      const data = {
        component: 'Users/Show',
        props: {
          user_profile: {
            first_name: 'John',
            home_address: { zip_code: '12345', street_name: 'Main St' },
          },
        },
      }
      transformPageResponse(data)
      expect(data.props).toEqual({
        userProfile: {
          firstName: 'John',
          homeAddress: { zipCode: '12345', streetName: 'Main St' },
        },
      })
    })

    it('transforms underscore-prefixed keys', () => {
      const data = {
        component: 'Page',
        props: {
          user_name: 'John',
          _private_field: 'secret',
        },
      }
      transformPageResponse(data)
      expect(data.props!._privateField).toBe('secret')
      expect(data.props!.userName).toBe('John')
    })
  })

  describe('errors prop', () => {
    it('camelCases validation error keys', () => {
      const data = {
        component: 'Users/Create',
        props: {
          errors: { first_name: "can't be blank", email_address: 'is invalid' },
        },
      }
      transformPageResponse(data)
      expect(data.props!.errors).toEqual({
        firstName: "can't be blank",
        emailAddress: 'is invalid',
      })
    })

    it('handles empty errors', () => {
      const data = {
        component: 'Users/Create',
        props: { errors: {} },
      }
      transformPageResponse(data)
      expect(data.props!.errors).toEqual({})
    })
  })

  describe('flash', () => {
    it('camelCases flash keys', () => {
      const data = {
        component: 'Page',
        props: {},
        flash: { success_message: 'Created!', error_detail: 'Failed' },
      }
      transformPageResponse(data)
      expect(data.flash).toEqual({ successMessage: 'Created!', errorDetail: 'Failed' })
    })

    it('handles standard flash keys (single words)', () => {
      const data = {
        component: 'Page',
        props: {},
        flash: { notice: 'Done', alert: 'Error' },
      }
      transformPageResponse(data)
      expect(data.flash).toEqual({ notice: 'Done', alert: 'Error' })
    })
  })

  describe('deferredProps', () => {
    it('camelCases deferred prop paths', () => {
      const data = {
        component: 'Page',
        props: {},
        deferredProps: {
          default: ['user_stats', 'recent_posts'],
          sidebar: ['related_items'],
        },
      }
      transformPageResponse(data)
      expect(data.deferredProps).toEqual({
        default: ['userStats', 'recentPosts'],
        sidebar: ['relatedItems'],
      })
    })

    it('handles nested deferred prop paths', () => {
      const data = {
        component: 'Page',
        props: {},
        deferredProps: { default: ['user_profile.recent_activity'] },
      }
      transformPageResponse(data)
      expect(data.deferredProps).toEqual({ default: ['userProfile.recentActivity'] })
    })
  })

  describe('mergeProps', () => {
    it('camelCases merge prop paths', () => {
      const data = {
        component: 'Page',
        props: {},
        mergeProps: ['feed_items', 'chat_messages'],
      }
      transformPageResponse(data)
      expect(data.mergeProps).toEqual(['feedItems', 'chatMessages'])
    })
  })

  describe('prependProps', () => {
    it('camelCases prepend prop paths', () => {
      const data = {
        component: 'Page',
        props: {},
        prependProps: ['new_items'],
      }
      transformPageResponse(data)
      expect(data.prependProps).toEqual(['newItems'])
    })
  })

  describe('deepMergeProps', () => {
    it('camelCases deep merge prop paths', () => {
      const data = {
        component: 'Page',
        props: {},
        deepMergeProps: ['user_settings'],
      }
      transformPageResponse(data)
      expect(data.deepMergeProps).toEqual(['userSettings'])
    })
  })

  describe('matchPropsOn', () => {
    it('camelCases match prop paths with single-word field', () => {
      const data = {
        component: 'Page',
        props: {},
        matchPropsOn: ['items.id'],
      }
      transformPageResponse(data)
      expect(data.matchPropsOn).toEqual(['items.id'])
    })

    it('camelCases match prop paths with multi-word field', () => {
      const data = {
        component: 'Page',
        props: {},
        matchPropsOn: ['feed_items.user_id', 'chat_messages.message_id'],
      }
      transformPageResponse(data)
      expect(data.matchPropsOn).toEqual(['feedItems.userId', 'chatMessages.messageId'])
    })

    it('handles nested match paths with array indices', () => {
      const data = {
        component: 'Page',
        props: {},
        matchPropsOn: ['nested_items.0.record_id'],
      }
      transformPageResponse(data)
      expect(data.matchPropsOn).toEqual(['nestedItems.0.recordId'])
    })
  })

  describe('scrollProps', () => {
    it('camelCases scroll prop path keys', () => {
      const data = {
        component: 'Page',
        props: {},
        scrollProps: {
          feed_items: { pageName: 'page', currentPage: 1, nextPage: 2, previousPage: null, reset: false },
        },
      }
      transformPageResponse(data)
      expect(data.scrollProps).toEqual({
        feedItems: { pageName: 'page', currentPage: 1, nextPage: 2, previousPage: null, reset: false },
      })
    })

    it('does not transform scroll metadata values', () => {
      const data = {
        component: 'Page',
        props: {},
        scrollProps: {
          items: { pageName: 'page_num', currentPage: 1, nextPage: 2, previousPage: null, reset: false },
        },
      }
      transformPageResponse(data)
      // pageName value "page_num" is a URL query param, not a prop key — must stay as-is
      expect((data.scrollProps!.items as any).pageName).toBe('page_num')
    })
  })

  describe('onceProps', () => {
    it('camelCases once prop keys and prop paths', () => {
      const data = {
        component: 'Page',
        props: {},
        onceProps: {
          cached_stats: { prop: 'cached_stats', expiresAt: 1234567890000 },
        },
      }
      transformPageResponse(data)
      expect(data.onceProps).toEqual({
        cachedStats: { prop: 'cachedStats', expiresAt: 1234567890000 },
      })
    })

    it('handles once prop without prop path', () => {
      const data = {
        component: 'Page',
        props: {},
        onceProps: {
          user_data: { expiresAt: 9999999999 },
        },
      }
      transformPageResponse(data)
      expect(data.onceProps).toEqual({
        userData: { expiresAt: 9999999999 },
      })
    })

    it('handles explicit once key different from path', () => {
      const data = {
        component: 'Page',
        props: {},
        onceProps: {
          my_custom_key: { prop: 'actual_prop_path', expiresAt: 1000 },
        },
      }
      transformPageResponse(data)
      expect(data.onceProps).toEqual({
        myCustomKey: { prop: 'actualPropPath', expiresAt: 1000 },
      })
    })
  })

  describe('sharedProps', () => {
    it('camelCases shared prop key names', () => {
      const data = {
        component: 'Page',
        props: {},
        sharedProps: ['current_user', 'flash_data', 'auth'],
      }
      transformPageResponse(data)
      expect(data.sharedProps).toEqual(['currentUser', 'flashData', 'auth'])
    })
  })

  describe('non-Inertia metadata is untouched', () => {
    it('does not transform component name', () => {
      const data = {
        component: 'Users/ShowProfile',
        props: { user_name: 'John' },
        url: '/users/1',
        version: 'abc123',
        encryptHistory: false,
        clearHistory: false,
      }
      transformPageResponse(data)
      expect(data.component).toBe('Users/ShowProfile')
      expect(data.url).toBe('/users/1')
      expect(data.version).toBe('abc123')
    })
  })

  describe('missing/empty metadata', () => {
    it('handles response with no metadata', () => {
      const data = {
        component: 'Page',
        props: { user_name: 'John' },
      }
      transformPageResponse(data)
      expect(data.props).toEqual({ userName: 'John' })
      expect(data.deferredProps).toBeUndefined()
      expect(data.mergeProps).toBeUndefined()
    })

    it('handles empty props', () => {
      const data = { component: 'Page', props: {} }
      transformPageResponse(data)
      expect(data.props).toEqual({})
    })
  })

  describe('full realistic page response', () => {
    it('transforms a complete Inertia response', () => {
      const data = {
        component: 'Courses/Index',
        props: {
          current_user: { first_name: 'John', last_name: 'Doe' },
          course_list: [
            { course_name: 'Ruby 101', instructor_name: 'Jane' },
            { course_name: 'Rails 201', instructor_name: 'Bob' },
          ],
          errors: { course_name: 'is required' },
        },
        flash: { notice: 'Welcome back!' },
        deferredProps: { default: ['user_stats'], analytics: ['page_views'] },
        mergeProps: ['course_list'],
        matchPropsOn: ['course_list.course_id'],
        scrollProps: {
          course_list: { pageName: 'page', currentPage: 1, nextPage: 2, previousPage: null, reset: false },
        },
        onceProps: {
          user_preferences: { prop: 'user_preferences', expiresAt: 9999999999 },
        },
        sharedProps: ['current_user'],
        url: '/courses',
        version: 'v1',
        encryptHistory: false,
        clearHistory: false,
      }

      transformPageResponse(data)

      expect(data.props).toEqual({
        currentUser: { firstName: 'John', lastName: 'Doe' },
        courseList: [
          { courseName: 'Ruby 101', instructorName: 'Jane' },
          { courseName: 'Rails 201', instructorName: 'Bob' },
        ],
        errors: { courseName: 'is required' },
      })
      expect(data.flash).toEqual({ notice: 'Welcome back!' })
      expect(data.deferredProps).toEqual({ default: ['userStats'], analytics: ['pageViews'] })
      expect(data.mergeProps).toEqual(['courseList'])
      expect(data.matchPropsOn).toEqual(['courseList.courseId'])
      expect(data.scrollProps).toEqual({
        courseList: { pageName: 'page', currentPage: 1, nextPage: 2, previousPage: null, reset: false },
      })
      expect(data.onceProps).toEqual({
        userPreferences: { prop: 'userPreferences', expiresAt: 9999999999 },
      })
      expect(data.sharedProps).toEqual(['currentUser'])
      // Untouched
      expect(data.component).toBe('Courses/Index')
      expect(data.url).toBe('/courses')
    })
  })
})
