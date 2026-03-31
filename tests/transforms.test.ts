import { describe, it, expect } from 'vitest'
import {
  camelCase,
  snakeCase,
  camelCasePath,
  snakeCasePath,
  deepCamelCaseKeys,
  deepSnakeCaseKeys,
} from '../src/transforms'

describe('camelCase', () => {
  it('converts simple snake_case', () => {
    expect(camelCase('user_name')).toBe('userName')
  })

  it('converts multiple underscores', () => {
    expect(camelCase('monthly_active_users')).toBe('monthlyActiveUsers')
  })

  it('leaves already camelCase unchanged', () => {
    expect(camelCase('userName')).toBe('userName')
  })

  it('leaves single word unchanged', () => {
    expect(camelCase('name')).toBe('name')
  })

  it('handles empty string', () => {
    expect(camelCase('')).toBe('')
  })

  it('preserves leading underscores', () => {
    expect(camelCase('_private_field')).toBe('_privateField')
  })

  it('preserves double leading underscores', () => {
    expect(camelCase('__proto__')).toBe('__proto__')
  })

  it('preserves trailing underscores', () => {
    expect(camelCase('field_')).toBe('field_')
  })

  it('handles numbers in segments', () => {
    expect(camelCase('level_2_data')).toBe('level2Data')
  })

  it('handles consecutive underscores in body', () => {
    expect(camelCase('a__b')).toBe('a_B')
  })

  it('handles uppercase after underscore', () => {
    expect(camelCase('http_URL')).toBe('httpURL')
  })
})

describe('snakeCase', () => {
  it('converts simple camelCase', () => {
    expect(snakeCase('userName')).toBe('user_name')
  })

  it('converts multiple humps', () => {
    expect(snakeCase('monthlyActiveUsers')).toBe('monthly_active_users')
  })

  it('leaves already snake_case unchanged', () => {
    expect(snakeCase('user_name')).toBe('user_name')
  })

  it('leaves single word unchanged', () => {
    expect(snakeCase('name')).toBe('name')
  })

  it('handles empty string', () => {
    expect(snakeCase('')).toBe('')
  })

  it('preserves leading underscores', () => {
    expect(snakeCase('_privateField')).toBe('_private_field')
  })

  it('preserves double leading underscores', () => {
    expect(snakeCase('__proto__')).toBe('__proto__')
  })

  it('handles consecutive uppercase (acronyms)', () => {
    expect(snakeCase('HTMLParser')).toBe('html_parser')
  })

  it('handles acronym in the middle', () => {
    expect(snakeCase('getHTTPSUrl')).toBe('get_https_url')
  })

  it('handles numbers', () => {
    expect(snakeCase('level2Data')).toBe('level2_data')
  })

  it('handles single uppercase letter at end', () => {
    expect(snakeCase('itemA')).toBe('item_a')
  })
})

describe('camelCase <-> snakeCase roundtrip', () => {
  const cases = [
    'user_name',
    'monthly_active_users',
    'id',
    'first_name',
    'created_at',
    'feed_items',
    'user_id',
  ]

  for (const input of cases) {
    it(`roundtrips: ${input}`, () => {
      expect(snakeCase(camelCase(input))).toBe(input)
    })
  }
})

describe('camelCasePath', () => {
  it('transforms dot-separated path', () => {
    expect(camelCasePath('user_stats.monthly_total')).toBe('userStats.monthlyTotal')
  })

  it('preserves numeric segments (array indices)', () => {
    expect(camelCasePath('items.0.user_id')).toBe('items.0.userId')
  })

  it('handles single segment', () => {
    expect(camelCasePath('user_name')).toBe('userName')
  })

  it('handles deeply nested path', () => {
    expect(camelCasePath('feed.posts.0.author_name.first_part')).toBe(
      'feed.posts.0.authorName.firstPart',
    )
  })

  it('handles path with no underscores', () => {
    expect(camelCasePath('items.0.id')).toBe('items.0.id')
  })
})

describe('snakeCasePath', () => {
  it('transforms dot-separated path', () => {
    expect(snakeCasePath('userStats.monthlyTotal')).toBe('user_stats.monthly_total')
  })

  it('preserves numeric segments', () => {
    expect(snakeCasePath('items.0.userId')).toBe('items.0.user_id')
  })

  it('handles single segment', () => {
    expect(snakeCasePath('userName')).toBe('user_name')
  })
})

describe('deepCamelCaseKeys', () => {
  it('transforms flat object keys', () => {
    expect(deepCamelCaseKeys({ first_name: 'John', last_name: 'Doe' })).toEqual({
      firstName: 'John',
      lastName: 'Doe',
    })
  })

  it('transforms nested object keys', () => {
    expect(
      deepCamelCaseKeys({
        user_profile: {
          first_name: 'John',
          home_address: { zip_code: '12345' },
        },
      }),
    ).toEqual({
      userProfile: {
        firstName: 'John',
        homeAddress: { zipCode: '12345' },
      },
    })
  })

  it('transforms keys in arrays', () => {
    expect(
      deepCamelCaseKeys({
        feed_items: [{ user_name: 'a' }, { user_name: 'b' }],
      }),
    ).toEqual({
      feedItems: [{ userName: 'a' }, { userName: 'b' }],
    })
  })

  it('transforms underscore-prefixed keys', () => {
    expect(
      deepCamelCaseKeys({
        _private_field: [{ head_key: 'title' }],
        user_name: 'John',
      }),
    ).toEqual({
      _privateField: [{ headKey: 'title' }],
      userName: 'John',
    })
  })

  it('handles null values', () => {
    expect(deepCamelCaseKeys({ first_name: null })).toEqual({ firstName: null })
  })

  it('handles empty object', () => {
    expect(deepCamelCaseKeys({})).toEqual({})
  })

  it('handles empty array', () => {
    expect(deepCamelCaseKeys([])).toEqual([])
  })

  it('preserves primitive values', () => {
    expect(deepCamelCaseKeys({ count_total: 42, is_active: true })).toEqual({
      countTotal: 42,
      isActive: true,
    })
  })

  it('preserves Date objects', () => {
    const date = new Date('2026-01-01')
    expect(deepCamelCaseKeys({ created_at: date })).toEqual({ createdAt: date })
  })

  it('returns non-objects as-is', () => {
    expect(deepCamelCaseKeys('hello')).toBe('hello')
    expect(deepCamelCaseKeys(42)).toBe(42)
    expect(deepCamelCaseKeys(null)).toBe(null)
    expect(deepCamelCaseKeys(undefined)).toBe(undefined)
  })

  it('handles mixed nesting: objects in arrays in objects', () => {
    expect(
      deepCamelCaseKeys({
        top_level: [{ nested_key: [{ deep_key: 'val' }] }],
      }),
    ).toEqual({
      topLevel: [{ nestedKey: [{ deepKey: 'val' }] }],
    })
  })
})

describe('deepSnakeCaseKeys', () => {
  it('transforms flat object keys', () => {
    expect(deepSnakeCaseKeys({ firstName: 'John', lastName: 'Doe' })).toEqual({
      first_name: 'John',
      last_name: 'Doe',
    })
  })

  it('transforms nested object keys', () => {
    expect(
      deepSnakeCaseKeys({
        userProfile: { firstName: 'John', homeAddress: { zipCode: '12345' } },
      }),
    ).toEqual({
      user_profile: { first_name: 'John', home_address: { zip_code: '12345' } },
    })
  })

  it('transforms keys in arrays', () => {
    expect(deepSnakeCaseKeys({ feedItems: [{ userName: 'a' }] })).toEqual({
      feed_items: [{ user_name: 'a' }],
    })
  })

  it('passes through FormData untouched', () => {
    const fd = new FormData()
    expect(deepSnakeCaseKeys(fd)).toBe(fd)
  })

  it('returns non-objects as-is', () => {
    expect(deepSnakeCaseKeys('hello')).toBe('hello')
    expect(deepSnakeCaseKeys(42)).toBe(42)
    expect(deepSnakeCaseKeys(null)).toBe(null)
  })

  describe('rawKeys', () => {
    it('transforms the key but preserves the value as-is', () => {
      expect(
        deepSnakeCaseKeys(
          { editorConfig: { backgroundColor: 'red', fontSize: 14 }, userName: 'John' },
          { rawKeys: ['editorConfig'] },
        ),
      ).toEqual({
        editor_config: { backgroundColor: 'red', fontSize: 14 },
        user_name: 'John',
      })
    })

    it('matches rawKeys at any nesting depth', () => {
      expect(
        deepSnakeCaseKeys(
          { userProfile: { editorConfig: { backgroundColor: 'red' } } },
          { rawKeys: ['editorConfig'] },
        ),
      ).toEqual({
        user_profile: { editor_config: { backgroundColor: 'red' } },
      })
    })

    it('preserves arrays inside raw values', () => {
      expect(
        deepSnakeCaseKeys(
          { jsonData: [{ someKey: 1 }, { anotherKey: 2 }] },
          { rawKeys: ['jsonData'] },
        ),
      ).toEqual({
        json_data: [{ someKey: 1 }, { anotherKey: 2 }],
      })
    })
  })

  describe('skipKeys', () => {
    it('preserves both key and value as-is', () => {
      expect(
        deepSnakeCaseKeys(
          { editorConfig: { backgroundColor: 'red' }, userName: 'John' },
          { skipKeys: ['editorConfig'] },
        ),
      ).toEqual({
        editorConfig: { backgroundColor: 'red' },
        user_name: 'John',
      })
    })

    it('matches skipKeys at any nesting depth', () => {
      expect(
        deepSnakeCaseKeys(
          { userProfile: { editorConfig: { backgroundColor: 'red' } } },
          { skipKeys: ['editorConfig'] },
        ),
      ).toEqual({
        user_profile: { editorConfig: { backgroundColor: 'red' } },
      })
    })
  })
})

describe('deepCamelCaseKeys with options', () => {
  describe('rawKeys', () => {
    it('transforms the key but preserves the value as-is', () => {
      expect(
        deepCamelCaseKeys(
          { editor_config: { background_color: 'red', font_size: 14 }, user_name: 'John' },
          { rawKeys: ['editorConfig'] },
        ),
      ).toEqual({
        editorConfig: { background_color: 'red', font_size: 14 },
        userName: 'John',
      })
    })

    it('matches rawKeys at any nesting depth', () => {
      expect(
        deepCamelCaseKeys(
          { user_profile: { editor_config: { background_color: 'red' } } },
          { rawKeys: ['editorConfig'] },
        ),
      ).toEqual({
        userProfile: { editorConfig: { background_color: 'red' } },
      })
    })
  })

  describe('skipKeys', () => {
    it('preserves both key and value as-is', () => {
      expect(
        deepCamelCaseKeys(
          { editor_config: { background_color: 'red' }, user_name: 'John' },
          { skipKeys: ['editorConfig'] },
        ),
      ).toEqual({
        editor_config: { background_color: 'red' },
        userName: 'John',
      })
    })
  })
})
