import { describe, it, expect, vi } from 'vitest'
import { parse } from 'acorn'
import caseShift from '../src/vite'

function transform(code: string, options?: { id?: string, rawKeys?: string[], skipKeys?: string[] }): string | null {
  const plugin = caseShift(options)
  const ctx = { parse: (c: string) => parse(c, { ecmaVersion: 'latest', sourceType: 'module' }) }
  const result = (plugin as any).transform.call(ctx, code, 'app.tsx')
  if (result === null) return null
  return typeof result === 'string' ? result : result.code
}

describe('caseShift vite plugin', () => {
  it('has correct plugin metadata', () => {
    const plugin = caseShift()
    expect(plugin.name).toBe('inertia-caseshift')
    expect(plugin.enforce).toBe('post')
  })

  it('skips files without createInertiaApp', () => {
    expect(transform('console.log("hello")')).toBeNull()
  })

  it('skips files that already import inertia-caseshift', () => {
    const code = `import { setupCaseShift } from 'inertia-caseshift'\ncreateInertiaApp({ resolve: fn })`
    expect(transform(code)).toBeNull()
  })

  it('silently returns null when createInertiaApp is referenced but not called at top level', () => {
    // e.g. @inertiajs/react/dist/index.js, which declares and re-exports
    // createInertiaApp but never calls it.
    const code = [
      `async function createInertiaApp(options) { return options }`,
      `export { createInertiaApp }`,
    ].join('\n')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(transform(code)).toBeNull()
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  describe('CSR transform', () => {
    const csrInput = [
      `import { createInertiaApp } from '@inertiajs/react'`,
      ``,
      `createInertiaApp({ resolve: async (name) => name })`,
    ].join('\n')

    it('adds imports', () => {
      const result = transform(csrInput)!
      expect(result).toContain(`import * as __cs from 'inertia-caseshift'`)
      expect(result).toContain(`import * as __csCore from '@inertiajs/core'`)
    })

    it('injects setupCaseShift', () => {
      const result = transform(csrInput)!
      expect(result).toContain('__cs.setupCaseShift(__csCore.http)')
    })

    it('injects page option with getInitialPageFromDOM', () => {
      const result = transform(csrInput)!
      expect(result).toContain(`__csCore.getInitialPageFromDOM('app')`)
      expect(result).toContain('__cs.transformInitialPage(p)')
      expect(result).toContain('createInertiaApp({ page: __csPage,')
    })

    it('handles await createInertiaApp', () => {
      const code = `import { createInertiaApp } from '@inertiajs/react'\n\nawait createInertiaApp({ resolve: fn })`
      const result = transform(code)!
      expect(result).toContain('__cs.setupCaseShift(__csCore.http)')
      expect(result).toContain('await createInertiaApp({ page: __csPage,')
    })

    it('skips injection when page option already exists', () => {
      const code = `import { createInertiaApp } from '@inertiajs/react'\n\ncreateInertiaApp({ page: myPage, resolve: fn })`
      const result = transform(code)
      expect(result).toBeNull()
    })

    it('respects custom id option', () => {
      const result = transform(csrInput, { id: 'my-app' })!
      expect(result).toContain(`__csCore.getInitialPageFromDOM('my-app')`)
    })

    it('passes rawKeys and skipKeys options', () => {
      const result = transform(csrInput, { rawKeys: ['editorConfig'], skipKeys: ['meta'] })!
      expect(result).toContain(`__cs.setupCaseShift(__csCore.http, { rawKeys: ["editorConfig"], skipKeys: ["meta"] })`)
      expect(result).toContain(`__cs.transformInitialPage(p, { rawKeys: ["editorConfig"], skipKeys: ["meta"] })`)
    })
  })

  describe('SSR transform', () => {
    const ssrInput = [
      `import { createInertiaApp } from '@inertiajs/react'`,
      `import createServer from '@inertiajs/react/server'`,
      `import { renderToString } from 'react-dom/server'`,
      ``,
      `const render = await createInertiaApp({ resolve: async (name) => name })`,
      ``,
      `const renderPage = (page) => render(page, renderToString)`,
      ``,
      `if (import.meta.env.PROD) {`,
      `  createServer(renderPage)`,
      `}`,
      ``,
      `export default renderPage`,
    ].join('\n')

    it('adds imports', () => {
      const result = transform(ssrInput)!
      expect(result).toContain(`import * as __cs from 'inertia-caseshift'`)
      expect(result).toContain(`import * as __csCore from '@inertiajs/core'`)
    })

    it('injects setupCaseShift before render assignment', () => {
      const result = transform(ssrInput)!
      const setupIdx = result.indexOf('__cs.setupCaseShift(__csCore.http)')
      const renderIdx = result.indexOf('const render = await createInertiaApp')
      expect(setupIdx).toBeGreaterThan(-1)
      expect(setupIdx).toBeLessThan(renderIdx)
    })

    it('wraps renderPage with transformInitialPage', () => {
      const result = transform(ssrInput)!
      expect(result).toContain(
        'const renderPage = (page) => { __cs.transformInitialPage(page); return render(page, renderToString) }',
      )
    })

    it('passes rawKeys and skipKeys options', () => {
      const result = transform(ssrInput, { rawKeys: ['editorConfig'] })!
      expect(result).toContain(`__cs.setupCaseShift(__csCore.http, { rawKeys: ["editorConfig"] })`)
      expect(result).toContain(`__cs.transformInitialPage(page, { rawKeys: ["editorConfig"] })`)
    })

    it('works with Svelte SSR template', () => {
      const svelteSSR = [
        `import { createInertiaApp } from '@inertiajs/svelte'`,
        `import createServer from '@inertiajs/svelte/server'`,
        `import { render } from 'svelte/server'`,
        ``,
        `const ssr = await createInertiaApp({ resolve: async (name) => name })`,
        ``,
        `const renderPage = (page) => ssr(page, render)`,
        ``,
        `if (import.meta.env.PROD) {`,
        `  createServer(renderPage)`,
        `}`,
        ``,
        `export default renderPage`,
      ].join('\n')

      const result = transform(svelteSSR)!
      expect(result).toContain(
        'const renderPage = (page) => { __cs.transformInitialPage(page); return ssr(page, render) }',
      )
    })

    it('works with Vue SSR template', () => {
      const vueSSR = [
        `import { createInertiaApp } from '@inertiajs/vue3'`,
        `import createServer from '@inertiajs/vue3/server'`,
        `import { renderToString } from 'vue/server-renderer'`,
        ``,
        `const render = await createInertiaApp({ resolve: async (name) => name })`,
        ``,
        `const renderPage = (page) => render(page, renderToString)`,
        ``,
        `if (import.meta.env.PROD) {`,
        `  createServer(renderPage)`,
        `}`,
        ``,
        `export default renderPage`,
      ].join('\n')

      const result = transform(vueSSR)!
      expect(result).toContain('__cs.transformInitialPage(page)')
      expect(result).toContain('__cs.setupCaseShift(__csCore.http)')
    })
  })
})
