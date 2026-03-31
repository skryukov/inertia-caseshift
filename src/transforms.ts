/**
 * Convert a snake_case string to camelCase.
 *
 *   camelCase("user_name")       => "userName"
 *   camelCase("__proto__")       => "__proto__"
 *   camelCase("already_camel")   => "alreadyCamel"
 *   camelCase("")                => ""
 */
export function camelCase(str: string): string {
  if (str.length === 0) return str

  // Preserve leading/trailing underscores (e.g. __proto__, _private)
  const leading = str.match(/^_+/)?.[0] ?? ''
  const trailing = str.match(/_+$/)?.[0] ?? ''
  const end = trailing.length > 0 ? str.length - trailing.length : str.length
  const body = str.slice(leading.length, end)

  if (body.length === 0) return str

  const transformed = body.replace(/_([a-z0-9])/gi, (_, c: string) => c.toUpperCase())

  return leading + transformed + trailing
}

/**
 * Convert a camelCase string to snake_case.
 *
 *   snakeCase("userName")        => "user_name"
 *   snakeCase("HTMLParser")      => "html_parser"
 *   snakeCase("getHTTPSUrl")     => "get_https_url"
 *   snakeCase("__proto__")       => "__proto__"
 *   snakeCase("")                => ""
 */
export function snakeCase(str: string): string {
  if (str.length === 0) return str

  // Preserve leading/trailing underscores
  const leading = str.match(/^_+/)?.[0] ?? ''
  const trailing = str.match(/_+$/)?.[0] ?? ''
  const end = trailing.length > 0 ? str.length - trailing.length : str.length
  const body = str.slice(leading.length, end)

  if (body.length === 0) return str

  const transformed = body
    // Insert underscore between lowercase/digit and uppercase: userId -> user_Id
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    // Insert underscore between consecutive uppercase and lowercase: HTMLParser -> HTML_Parser
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()

  return leading + transformed + trailing
}

/**
 * Transform each segment of a dot-notation path independently.
 * Numeric segments (array indices) are preserved as-is.
 *
 *   camelCasePath("user_stats.monthly_total") => "userStats.monthlyTotal"
 *   camelCasePath("items.0.user_id")          => "items.0.userId"
 */
export function camelCasePath(path: string): string {
  return path
    .split('.')
    .map((segment) => (/^\d+$/.test(segment) ? segment : camelCase(segment)))
    .join('.')
}

/**
 * Transform each segment of a dot-notation path to snake_case.
 *
 *   snakeCasePath("userStats.monthlyTotal") => "user_stats.monthly_total"
 *   snakeCasePath("items.0.userId")         => "items.0.user_id"
 */
export function snakeCasePath(path: string): string {
  return path
    .split('.')
    .map((segment) => (/^\d+$/.test(segment) ? segment : snakeCase(segment)))
    .join('.')
}

export interface CaseShiftOptions {
  /** Transform the key, but skip recursing into the value. */
  rawKeys?: string[]
  /** Skip both key transformation and value recursion. */
  skipKeys?: string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return (proto === Object.prototype || proto === null) && !Array.isArray(value)
}

/**
 * Recursively transform all keys of a nested object/array to camelCase.
 *
 * Keys matching `rawKeys` are transformed but their values are not recursed into.
 * Keys matching `skipKeys` are left as-is entirely (key and value).
 * Keys are matched in camelCase form (e.g., specify "editorConfig" to match "editor_config").
 */
export function deepCamelCaseKeys(obj: unknown, options?: CaseShiftOptions): unknown {
  if (Array.isArray(obj)) return obj.map((item) => deepCamelCaseKeys(item, options))
  if (!isPlainObject(obj)) return obj

  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      const newKey = camelCase(k)
      if (options?.skipKeys?.includes(newKey)) return [k, v]
      if (options?.rawKeys?.includes(newKey)) return [newKey, v]
      return [newKey, deepCamelCaseKeys(v, options)]
    }),
  )
}

/**
 * Recursively transform all keys of a nested object/array to snake_case.
 *
 * Keys matching `rawKeys` are transformed but their values are not recursed into.
 * Keys matching `skipKeys` are left as-is entirely (key and value).
 * Keys are matched in camelCase form (e.g., specify "editorConfig").
 */
export function deepSnakeCaseKeys(obj: unknown, options?: CaseShiftOptions): unknown {
  if (Array.isArray(obj)) return obj.map((item) => deepSnakeCaseKeys(item, options))
  if (!isPlainObject(obj)) return obj

  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (options?.skipKeys?.includes(k)) return [k, v]
      if (options?.rawKeys?.includes(k)) return [snakeCase(k), v]
      return [snakeCase(k), deepSnakeCaseKeys(v, options)]
    }),
  )
}
