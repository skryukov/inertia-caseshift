import { describe, it, expect } from 'vitest'
import { transformRequestData, transformRequestHeaders, transformFieldName, transformRequestUrl } from '../src/request'

describe('transformRequestData', () => {
  describe('JSON body', () => {
    it('snake_cases top-level keys', () => {
      expect(transformRequestData({ firstName: 'John', lastName: 'Doe' })).toEqual({
        first_name: 'John',
        last_name: 'Doe',
      })
    })

    it('snake_cases nested keys', () => {
      expect(
        transformRequestData({
          userProfile: { homeAddress: { zipCode: '12345' } },
        }),
      ).toEqual({
        user_profile: { home_address: { zip_code: '12345' } },
      })
    })

    it('snake_cases keys in arrays', () => {
      expect(transformRequestData({ feedItems: [{ userName: 'a' }] })).toEqual({
        feed_items: [{ user_name: 'a' }],
      })
    })

    it('returns null/undefined as-is', () => {
      expect(transformRequestData(null)).toBeNull()
      expect(transformRequestData(undefined)).toBeUndefined()
    })

    it('returns strings as-is', () => {
      expect(transformRequestData('hello')).toBe('hello')
    })
  })

  describe('FormData', () => {
    it('snake_cases FormData field names', () => {
      const fd = new FormData()
      fd.append('firstName', 'John')
      fd.append('lastName', 'Doe')

      const result = transformRequestData(fd) as FormData
      expect(result).toBeInstanceOf(FormData)
      expect(result.get('first_name')).toBe('John')
      expect(result.get('last_name')).toBe('Doe')
      expect(result.get('firstName')).toBeNull()
    })

    it('snake_cases bracket notation fields', () => {
      const fd = new FormData()
      fd.append('user[firstName]', 'John')
      fd.append('user[homeAddress][zipCode]', '12345')

      const result = transformRequestData(fd) as FormData
      expect(result.get('user[first_name]')).toBe('John')
      expect(result.get('user[home_address][zip_code]')).toBe('12345')
    })

    it('preserves file values', () => {
      const fd = new FormData()
      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      fd.append('avatarImage', file)

      const result = transformRequestData(fd) as FormData
      const resultFile = result.get('avatar_image')
      expect(resultFile).toBeInstanceOf(File)
      expect((resultFile as File).name).toBe('test.txt')
    })

    it('respects skipKeys for FormData fields', () => {
      const fd = new FormData()
      fd.append('firstName', 'John')
      fd.append('editorConfig', '{"backgroundColor":"red"}')

      const result = transformRequestData(fd, { skipKeys: ['editorConfig'] }) as FormData
      expect(result.get('first_name')).toBe('John')
      expect(result.get('editorConfig')).toBe('{"backgroundColor":"red"}')
      expect(result.get('editor_config')).toBeNull()
    })

    it('respects rawKeys for FormData fields with bracket notation', () => {
      const fd = new FormData()
      fd.append('firstName', 'John')
      fd.append('editorConfig[backgroundColor]', 'red')
      fd.append('editorConfig[fontSize]', '14')

      const result = transformRequestData(fd, { rawKeys: ['editorConfig'] }) as FormData
      expect(result.get('first_name')).toBe('John')
      expect(result.get('editor_config[backgroundColor]')).toBe('red')
      expect(result.get('editor_config[fontSize]')).toBe('14')
    })
  })
})

describe('transformFieldName', () => {
  it('transforms simple field name', () => {
    expect(transformFieldName('firstName')).toBe('first_name')
  })

  it('transforms bracket notation', () => {
    expect(transformFieldName('user[firstName]')).toBe('user[first_name]')
  })

  it('transforms nested bracket notation', () => {
    expect(transformFieldName('user[homeAddress][zipCode]')).toBe('user[home_address][zip_code]')
  })

  it('handles array indices in brackets', () => {
    expect(transformFieldName('items[0][productName]')).toBe('items[0][product_name]')
  })

  it('leaves already snake_case unchanged', () => {
    expect(transformFieldName('first_name')).toBe('first_name')
    expect(transformFieldName('user[first_name]')).toBe('user[first_name]')
  })

  it('skips field names matching skipKeys', () => {
    const opts = { skipKeys: ['editorConfig'] }
    expect(transformFieldName('editorConfig', opts)).toBe('editorConfig')
  })

  it('skips bracket notation fields matching skipKeys by top-level key', () => {
    const opts = { skipKeys: ['editorConfig'] }
    expect(transformFieldName('editorConfig[backgroundColor]', opts)).toBe('editorConfig[backgroundColor]')
  })

  it('still transforms non-matching fields with skipKeys', () => {
    const opts = { skipKeys: ['editorConfig'] }
    expect(transformFieldName('firstName', opts)).toBe('first_name')
    expect(transformFieldName('user[firstName]', opts)).toBe('user[first_name]')
  })

  it('rawKeys transforms top-level key but preserves nested segments', () => {
    const opts = { rawKeys: ['editorConfig'] }
    expect(transformFieldName('editorConfig[backgroundColor]', opts)).toBe('editor_config[backgroundColor]')
  })

  it('rawKeys transforms simple field name', () => {
    const opts = { rawKeys: ['editorConfig'] }
    expect(transformFieldName('editorConfig', opts)).toBe('editor_config')
  })

  it('rawKeys does not affect non-matching fields', () => {
    const opts = { rawKeys: ['editorConfig'] }
    expect(transformFieldName('firstName', opts)).toBe('first_name')
    expect(transformFieldName('user[firstName]', opts)).toBe('user[first_name]')
  })
})

describe('transformRequestHeaders', () => {
  it('transforms X-Inertia-Partial-Data paths', () => {
    const headers: Record<string, string> = {
      'X-Inertia-Partial-Data': 'userStats,recentPosts',
    }
    transformRequestHeaders(headers)
    expect(headers['X-Inertia-Partial-Data']).toBe('user_stats,recent_posts')
  })

  it('transforms X-Inertia-Partial-Except paths', () => {
    const headers: Record<string, string> = {
      'X-Inertia-Partial-Except': 'heavyData',
    }
    transformRequestHeaders(headers)
    expect(headers['X-Inertia-Partial-Except']).toBe('heavy_data')
  })

  it('transforms X-Inertia-Reset paths', () => {
    const headers: Record<string, string> = {
      'X-Inertia-Reset': 'feedItems,chatMessages',
    }
    transformRequestHeaders(headers)
    expect(headers['X-Inertia-Reset']).toBe('feed_items,chat_messages')
  })

  it('transforms X-Inertia-Except-Once-Props paths', () => {
    const headers: Record<string, string> = {
      'X-Inertia-Except-Once-Props': 'cachedStats,userPreferences',
    }
    transformRequestHeaders(headers)
    expect(headers['X-Inertia-Except-Once-Props']).toBe('cached_stats,user_preferences')
  })

  it('transforms nested dot-notation paths in headers', () => {
    const headers: Record<string, string> = {
      'X-Inertia-Partial-Data': 'userProfile.recentActivity,feedItems',
    }
    transformRequestHeaders(headers)
    expect(headers['X-Inertia-Partial-Data']).toBe('user_profile.recent_activity,feed_items')
  })

  it('leaves single-word paths unchanged', () => {
    const headers: Record<string, string> = {
      'X-Inertia-Partial-Data': 'users,posts,errors',
    }
    transformRequestHeaders(headers)
    expect(headers['X-Inertia-Partial-Data']).toBe('users,posts,errors')
  })

  it('ignores missing headers', () => {
    const headers: Record<string, string> = {
      'X-Inertia': 'true',
    }
    transformRequestHeaders(headers)
    expect(headers['X-Inertia']).toBe('true')
    expect(headers['X-Inertia-Partial-Data']).toBeUndefined()
  })

  it('transforms X-Inertia-Error-Bag to snake_case', () => {
    const headers: Record<string, string> = {
      'X-Inertia-Error-Bag': 'createUser',
    }
    transformRequestHeaders(headers)
    expect(headers['X-Inertia-Error-Bag']).toBe('create_user')
  })

  it('leaves single-word error bag unchanged', () => {
    const headers: Record<string, string> = {
      'X-Inertia-Error-Bag': 'login',
    }
    transformRequestHeaders(headers)
    expect(headers['X-Inertia-Error-Bag']).toBe('login')
  })

  it('does not touch non-Inertia headers', () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Inertia-Partial-Data': 'userName',
    }
    transformRequestHeaders(headers)
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['X-Inertia-Partial-Data']).toBe('user_name')
  })
})

describe('transformRequestUrl', () => {
  it('transforms camelCase query param keys to snake_case', () => {
    expect(transformRequestUrl('https://example.com/users?sortField=name&filterType=active')).toBe(
      'https://example.com/users?sort_field=name&filter_type=active',
    )
  })

  it('returns URL without query string unchanged', () => {
    expect(transformRequestUrl('https://example.com/users')).toBe('https://example.com/users')
  })

  it('preserves query param values', () => {
    expect(transformRequestUrl('/users?sortField=userName&page=1')).toBe(
      '/users?sort_field=userName&page=1',
    )
  })

  it('handles bracket notation in query params', () => {
    expect(transformRequestUrl('/users?filter[sortField]=name')).toBe(
      '/users?filter[sort_field]=name',
    )
  })

  it('preserves brackets array format', () => {
    expect(transformRequestUrl('/users?itemIds[]=1&itemIds[]=2')).toBe(
      '/users?item_ids[]=1&item_ids[]=2',
    )
  })

  it('preserves indices array format', () => {
    expect(transformRequestUrl('/users?itemIds[0]=1&itemIds[1]=2')).toBe(
      '/users?item_ids[0]=1&item_ids[1]=2',
    )
  })

  it('preserves hash fragment', () => {
    expect(transformRequestUrl('/users?sortField=name#top')).toBe('/users?sort_field=name#top')
  })

  it('leaves already snake_case params unchanged', () => {
    expect(transformRequestUrl('/users?sort_field=name&page=1')).toBe(
      '/users?sort_field=name&page=1',
    )
  })

  it('handles empty query string', () => {
    expect(transformRequestUrl('/users?')).toBe('/users')
  })

  it('respects skipKeys for query params', () => {
    expect(
      transformRequestUrl('/users?sortField=name&customParam=value', { skipKeys: ['customParam'] }),
    ).toBe('/users?sort_field=name&customParam=value')
  })

  it('respects rawKeys for bracket notation query params', () => {
    expect(
      transformRequestUrl('/users?editorConfig[backgroundColor]=red&sortField=name', {
        rawKeys: ['editorConfig'],
      }),
    ).toBe('/users?editor_config[backgroundColor]=red&sort_field=name')
  })

  it('respects skipKeys for bracket notation query params', () => {
    expect(
      transformRequestUrl('/users?editorConfig[backgroundColor]=red&sortField=name', {
        skipKeys: ['editorConfig'],
      }),
    ).toBe('/users?editorConfig[backgroundColor]=red&sort_field=name')
  })
})
