import MagicString from 'magic-string'
import type { Plugin } from 'vite'
import type { CaseShiftOptions } from './transforms'

export interface CaseShiftPluginOptions extends CaseShiftOptions {
  /** The DOM element id for getInitialPageFromDOM. Defaults to 'app'. */
  id?: string
}

export default function caseShift(options: CaseShiftPluginOptions = {}): Plugin {
  const appId = options.id ?? 'app'
  const opts = serializeOptions(options)
  const optsArg = opts ? `, ${opts}` : ''

  return {
    name: 'inertia-caseshift',
    enforce: 'post',
    transform: {
      filter: {
        id: { exclude: /\/node_modules\// },
        code: { include: /createInertiaApp/, exclude: /inertia-caseshift/ },
      },
      handler(code) {
        let ast: any
        try {
          ast = (this as any).parse(code)
        } catch {
          return null
        }

        const imports =
          `import * as __cs from 'inertia-caseshift'\n` +
          `import * as __csCore from '@inertiajs/core'\n`
        const setup = `__cs.setupCaseShift(__csCore.http${optsArg})`

        const renderPage = findRenderPage(ast)
        if (renderPage) {
          return transformSSR(code, imports, setup, renderPage, optsArg)
        }

        const inertiaCall = findInertiaCall(ast)
        if (inertiaCall) {
          return transformCSR(code, imports, setup, inertiaCall, appId, optsArg)
        }

        console.warn(
          '[inertia-caseshift] Found createInertiaApp but could not locate the call site to transform. ' +
          'The plugin expects a top-level createInertiaApp({ ... }) call with an object literal argument. ' +
          'If you are using a non-standard setup, use setupCaseShift(http) and transformInitialPage() manually.',
        )

        return null
      },
    },
  }
}

function serializeOptions({ rawKeys, skipKeys }: CaseShiftOptions): string | null {
  const entries: string[] = []
  if (rawKeys?.length) entries.push(`rawKeys: ${JSON.stringify(rawKeys)}`)
  if (skipKeys?.length) entries.push(`skipKeys: ${JSON.stringify(skipKeys)}`)
  return entries.length ? `{ ${entries.join(', ')} }` : null
}

interface InertiaCall {
  /** Start of the top-level statement containing the call. */
  statementStart: number
  /** Position right after the opening `{` of the options object. */
  optionsBodyStart: number
}

interface RenderPage {
  /** Start of the top-level statement containing the call. */
  statementStart: number
  /** The arrow function body expression (start and end). */
  body: { start: number; end: number }
}

/** Find the first top-level `createInertiaApp({ ... })` call with an object argument. */
function findInertiaCall(ast: any): InertiaCall | null {
  for (const node of ast.body) {
    if (node.type !== 'ExpressionStatement') continue
    const call = unwrapToCall(node.expression)
    if (!call) continue
    const arg = call.arguments[0]
    if (arg?.type !== 'ObjectExpression') continue
    const hasPage = arg.properties.some(
      (p: any) => p.type === 'Property' && p.key?.type === 'Identifier' && p.key.name === 'page',
    )
    if (hasPage) continue
    return {
      statementStart: node.start,
      optionsBodyStart: arg.start + 1,
    }
  }
  return null
}

/** Find `const renderPage = (page) => <expr>` with an expression body. */
function findRenderPage(ast: any): RenderPage | null {
  for (const node of ast.body) {
    if (node.type !== 'VariableDeclaration') continue
    for (const decl of node.declarations) {
      if (decl.id?.name !== 'renderPage') continue
      const init = decl.init
      if (init?.type !== 'ArrowFunctionExpression') continue
      if (init.body.type === 'BlockStatement') continue
      // Find the statement with createInertiaApp before this one
      const stmtIdx = ast.body.indexOf(node)
      let callStmtStart = node.start
      for (let i = stmtIdx - 1; i >= 0; i--) {
        const prev = ast.body[i]
        if (prev.type === 'VariableDeclaration' && unwrapToCall(prev.declarations[0]?.init)) {
          callStmtStart = prev.start
          break
        }
      }
      return {
        statementStart: callStmtStart,
        body: { start: init.body.start, end: init.body.end },
      }
    }
  }
  return null
}

/** Unwrap await / void / .then().catch() to find a `createInertiaApp()` call. */
function unwrapToCall(node: any): any | null {
  if (!node) return null
  if (node.type === 'CallExpression') {
    if (node.callee?.type === 'Identifier' && node.callee.name === 'createInertiaApp') return node
    // .then() / .catch() chains
    if (node.callee?.type === 'MemberExpression') return unwrapToCall(node.callee.object)
  }
  if (node.type === 'AwaitExpression') return unwrapToCall(node.argument)
  if (node.type === 'UnaryExpression' && node.operator === 'void') return unwrapToCall(node.argument)
  return null
}

function transformSSR(
  code: string, imports: string, setup: string,
  renderPage: RenderPage, optsArg: string,
): { code: string; map: ReturnType<MagicString['generateMap']> } {
  const s = new MagicString(code)
  const { statementStart, body } = renderPage

  s.appendLeft(statementStart, `${setup}\n\n`)
  s.appendLeft(body.start, `{ __cs.transformInitialPage(page${optsArg}); return `)
  s.appendRight(body.end, ` }`)
  s.prepend(imports)

  return { code: s.toString(), map: s.generateMap({ hires: true }) }
}

function transformCSR(
  code: string, imports: string, setup: string,
  call: InertiaCall, appId: string, optsArg: string,
): { code: string; map: ReturnType<MagicString['generateMap']> } {
  const s = new MagicString(code)

  const pageInit =
    `const __csPage = (() => { const p = __csCore.getInitialPageFromDOM('${appId}'); if (p) __cs.transformInitialPage(p${optsArg}); return p })()`

  s.appendLeft(call.optionsBodyStart, ` page: __csPage,`)
  s.appendLeft(call.statementStart, `${setup}\n${pageInit}\n`)
  s.prepend(imports)

  return { code: s.toString(), map: s.generateMap({ hires: true }) }
}
