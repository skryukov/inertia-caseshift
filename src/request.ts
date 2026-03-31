import { deepSnakeCaseKeys, snakeCase, snakeCasePath, type CaseShiftOptions } from './transforms'

const PARTIAL_HEADERS = [
  'X-Inertia-Partial-Data',
  'X-Inertia-Partial-Except',
  'X-Inertia-Reset',
  'X-Inertia-Except-Once-Props',
] as const

/**
 * Transform request body keys from camelCase to snake_case.
 * Handles plain objects and FormData field names.
 */
export function transformRequestData(data: unknown, options?: CaseShiftOptions): unknown {
  if (data instanceof FormData) {
    return transformFormData(data, options)
  }

  if (data && typeof data === 'object') {
    return deepSnakeCaseKeys(data, options)
  }

  return data
}

/**
 * Transform FormData field names from camelCase to snake_case.
 * Handles bracket notation: user[firstName] -> user[first_name]
 */
function transformFormData(formData: FormData, options?: CaseShiftOptions): FormData {
  const transformed = new FormData()

  for (const [key, value] of formData.entries()) {
    transformed.append(transformFieldName(key, options), value)
  }

  return transformed
}

/** Extract the top-level key from a field name (before any bracket notation). */
function topLevelKey(name: string): string {
  const bracketIndex = name.indexOf('[')
  return bracketIndex === -1 ? name : name.slice(0, bracketIndex)
}

/**
 * Transform a form field name, handling bracket notation.
 *
 *   transformFieldName("firstName")              => "first_name"
 *   transformFieldName("user[firstName]")         => "user[first_name]"
 *   transformFieldName("user[address][zipCode]")  => "user[address][zip_code]"
 */
export function transformFieldName(name: string, options?: CaseShiftOptions): string {
  const top = topLevelKey(name)
  if (options?.skipKeys?.includes(top)) return name
  if (options?.rawKeys?.includes(top)) {
    // Transform the top-level key but preserve nested bracket segments
    const bracketIndex = name.indexOf('[')
    if (bracketIndex === -1) return snakeCase(name)
    return snakeCase(name.slice(0, bracketIndex)) + name.slice(bracketIndex)
  }
  return name.replace(/[^[\]]+/g, (segment) => snakeCase(segment))
}

/**
 * Transform Inertia partial reload header values from camelCase paths to snake_case.
 * Paths whose top-level segment is in `skipKeys` are preserved as-is.
 */
export function transformRequestHeaders(headers: Record<string, string>, options?: CaseShiftOptions): void {
  for (const header of PARTIAL_HEADERS) {
    const value = headers[header]
    if (value) {
      headers[header] = value
        .split(',')
        .map((path) => {
          const topSegment = path.split('.')[0]
          if (options?.skipKeys?.includes(topSegment)) return path
          return snakeCasePath(path)
        })
        .join(',')
    }
  }

  const errorBag = headers['X-Inertia-Error-Bag']
  if (errorBag) {
    if (!options?.skipKeys?.includes(errorBag)) {
      headers['X-Inertia-Error-Bag'] = snakeCase(errorBag)
    }
  }
}

/**
 * Transform query parameter keys in a URL from camelCase to snake_case.
 * Inertia merges GET data into the URL before the request interceptor fires,
 * so we need to parse and rewrite.
 *
 * Uses string-based replacement to preserve bracket encoding and array formats
 * exactly as Inertia serialized them (avoiding URLSearchParams which encodes
 * brackets as %5B/%5D).
 */
export function transformRequestUrl(url: string, options?: CaseShiftOptions): string {
  const qIndex = url.indexOf('?')
  if (qIndex === -1) return url

  const base = url.slice(0, qIndex)
  const rest = url.slice(qIndex + 1)

  const hashIndex = rest.indexOf('#')
  const query = hashIndex === -1 ? rest : rest.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : rest.slice(hashIndex)

  if (!query) return base + hash

  const transformed = query.replace(/[^&=]+/g, (token, offset: number) => {
    // Only transform keys (tokens that appear before '=' or have no '=')
    const before = query.slice(0, offset)
    const isKey = !before.includes('=') || before.lastIndexOf('&') > before.lastIndexOf('=')
    if (!isKey) return token

    return transformFieldName(decodeURIComponent(token), options)
  })

  return base + '?' + transformed + hash
}
