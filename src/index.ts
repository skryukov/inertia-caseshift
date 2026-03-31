export type { CaseShiftOptions } from './transforms'
export { transformPageResponse } from './response'
import { transformPageResponse } from './response'
import { transformRequestData, transformRequestHeaders, transformRequestUrl } from './request'
import type { CaseShiftOptions } from './transforms'

/**
 * Transform an Inertia page object in-place from snake_case to camelCase.
 *
 * The initial page data (from `<script data-page>` on the client, or the
 * backend POST in SSR) bypasses the HTTP layer entirely, so
 * `setupCaseShift(http)` cannot intercept it. Call this in the `setup`
 * callback of `createInertiaApp` to cover both CSR and SSR.
 *
 * @example
 *   import { setupCaseShift, transformInitialPage } from 'inertia-caseshift'
 *
 *   setupCaseShift(http)
 *
 *   createInertiaApp({
 *     setup({ el, App, props }) {
 *       transformInitialPage(props.initialPage)
 *       // render App...
 *     },
 *   })
 *
 * @returns The same page object (mutated in-place) for convenience.
 */
export function transformInitialPage<T extends Record<string, unknown>>(page: T, options?: CaseShiftOptions): T {
  if (page && typeof page === 'object' && 'component' in page) {
    transformPageResponse(page, options)
  }
  return page
}

export type HttpInterface = {
  onRequest: (handler: (config: any) => any) => () => void
  onResponse: (handler: (response: any) => any) => () => void
  onError?: (handler: (error: any) => void) => () => void
}

/**
 * Set up automatic snake_case <-> camelCase conversion for Inertia.js.
 *
 * Transforms:
 * - Response props keys: snake_case -> camelCase
 * - Response metadata paths (deferredProps, mergeProps, etc.): snake_case -> camelCase
 * - Response flash keys: snake_case -> camelCase
 * - Request body keys: camelCase -> snake_case
 * - Request FormData field names: camelCase -> snake_case
 * - Partial reload header paths: camelCase -> snake_case
 *
 * @example
 *   import { http } from '@inertiajs/core'
 *   import { setupCaseShift } from 'inertia-caseshift'
 *
 *   setupCaseShift(http)
 *
 * @returns Cleanup function that removes the interceptors
 */
function transformResponseData(response: any, options?: CaseShiftOptions): void {
  if (typeof response.data === 'string') {
    try {
      response.data = JSON.parse(response.data)
    } catch {
      return
    }
  }

  const data = response.data
  if (data && typeof data === 'object' && 'component' in data) {
    transformPageResponse(data, options)
  }
}

export function setupCaseShift(http: HttpInterface, options?: CaseShiftOptions): () => void {
  const removeResponseHandler = http.onResponse((response: any) => {
    transformResponseData(response, options)
    return response
  })

  const removeErrorHandler = http.onError?.((error: any) => {
    if (error.response) {
      transformResponseData(error.response, options)
    }
  })

  const removeRequestHandler = http.onRequest((config: any) => {
    if (config.data !== undefined && config.data !== null) {
      config.data = transformRequestData(config.data, options)
    }

    if (config.url) {
      config.url = transformRequestUrl(config.url, options)
    }

    if (config.headers) {
      transformRequestHeaders(config.headers, options)
    }

    return config
  })

  return () => {
    removeResponseHandler()
    removeErrorHandler?.()
    removeRequestHandler()
  }
}
