import { camelCasePath, deepCamelCaseKeys, type CaseShiftOptions } from './transforms'

interface PageResponse {
  component?: string
  props?: Record<string, unknown>
  flash?: Record<string, unknown>
  deferredProps?: Record<string, string[]>
  mergeProps?: string[]
  prependProps?: string[]
  deepMergeProps?: string[]
  matchPropsOn?: string[]
  scrollProps?: Record<string, unknown>
  onceProps?: Record<string, { prop?: string; expiresAt?: number }>
  sharedProps?: string[]
  rescuedProps?: string[]
  [key: string]: unknown
}

/**
 * Transform an Inertia page response in-place:
 * - Props: deep camelCase all keys (except _-prefixed internal keys)
 * - Flash: deep camelCase all keys
 * - Metadata path strings: camelCase each dot-separated segment
 */
export function transformPageResponse(data: PageResponse, options?: CaseShiftOptions): void {
  const camelPath = (path: string) => camelCasePath(path, options)

  if (data.props) {
    data.props = deepCamelCaseKeys(data.props, options) as Record<string, unknown>
  }

  if (data.flash) {
    data.flash = deepCamelCaseKeys(data.flash, options) as Record<string, unknown>
  }

  if (data.deferredProps) {
    for (const group of Object.keys(data.deferredProps)) {
      data.deferredProps[group] = data.deferredProps[group].map(camelPath)
    }
  }

  if (data.mergeProps) {
    data.mergeProps = data.mergeProps.map(camelPath)
  }

  if (data.prependProps) {
    data.prependProps = data.prependProps.map(camelPath)
  }

  if (data.deepMergeProps) {
    data.deepMergeProps = data.deepMergeProps.map(camelPath)
  }

  if (data.matchPropsOn) {
    data.matchPropsOn = data.matchPropsOn.map(camelPath)
  }

  if (data.scrollProps) {
    data.scrollProps = Object.fromEntries(
      Object.entries(data.scrollProps).map(([k, v]) => [camelPath(k), v]),
    )
  }

  if (data.onceProps) {
    data.onceProps = Object.fromEntries(
      Object.entries(data.onceProps).map(([k, v]) => [
        camelPath(k),
        v.prop ? { ...v, prop: camelPath(v.prop) } : v,
      ]),
    )
  }

  if (data.sharedProps) {
    data.sharedProps = data.sharedProps.map(camelPath)
  }

  if (data.rescuedProps) {
    data.rescuedProps = data.rescuedProps.map(camelPath)
  }
}
