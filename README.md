# inertia-caseshift

Automatic `snake_case` <-> `camelCase` conversion for [Inertia.js](https://inertiajs.com/) v3.

Use `camelCase` in your JavaScript components while your backend stays `snake_case`. Works with Rails, Laravel, Phoenix, or any backend framework.

## The Problem

Backend frameworks use `snake_case`. JavaScript uses `camelCase`. Inertia sits in between, passing data as-is. This means your React/Vue/Svelte components end up with `props.user_name` instead of `props.userName`.

Solving this is harder than just transforming keys — Inertia's protocol has metadata (deferred props, merge props, scroll props, etc.) containing path strings that must stay in sync with prop keys. A naive `deep_transform_keys` breaks partial reloads, merge operations, and infinite scroll.

`inertia-caseshift` handles the full protocol — props, metadata paths, errors, flash, form data, and partial reload headers — so the round-trip works correctly.

## Install

```bash
npm install inertia-caseshift
```

## Setup

### With Vite (recommended)

Add the plugin to your Vite config:

```js
// vite.config.ts
import inertia from '@inertiajs/vite'
import caseShift from 'inertia-caseshift/vite'

export default defineConfig({
  plugins: [
    inertia(),
    caseShift(),
  ],
})
```

That's it. No changes to your app code. Works with React, Vue, Svelte, CSR and SSR.

### Without Vite

Call `setupCaseShift` in your app entry point and `transformInitialPage` in the `setup` callback:

```js
import { http } from '@inertiajs/core'
import { setupCaseShift, transformInitialPage } from 'inertia-caseshift'

setupCaseShift(http)

createInertiaApp({
  // ...
  setup({ el, App, props }) {
    transformInitialPage(props.initialPage)
    // render your app...
  },
})
```

`setupCaseShift(http)` intercepts XHR navigation. `transformInitialPage` handles the initial page data which bypasses the HTTP layer (embedded in the HTML on first load, or received via POST in SSR).

No backend changes needed in either case.

## What It Transforms

### Response (Backend -> Frontend)

| Data | Before | After |
|---|---|---|
| Props keys | `{ user_name: "John" }` | `{ userName: "John" }` |
| Nested props | `{ home_address: { zip_code: "..." } }` | `{ homeAddress: { zipCode: "..." } }` |
| Errors | `{ first_name: "can't be blank" }` | `{ firstName: "can't be blank" }` |
| Flash | `{ success_message: "Done" }` | `{ successMessage: "Done" }` |
| `deferredProps` paths | `["user_stats"]` | `["userStats"]` |
| `mergeProps` paths | `["feed_items"]` | `["feedItems"]` |
| `prependProps` paths | `["new_items"]` | `["newItems"]` |
| `deepMergeProps` paths | `["user_settings"]` | `["userSettings"]` |
| `matchPropsOn` paths | `["items.user_id"]` | `["items.userId"]` |
| `scrollProps` keys | `{ feed_items: {...} }` | `{ feedItems: {...} }` |
| `onceProps` keys | `{ cached_data: {...} }` | `{ cachedData: {...} }` |
| `sharedProps` | `["current_user"]` | `["currentUser"]` |

### Request (Frontend -> Backend)

| Data | Before | After |
|---|---|---|
| Form body (JSON) | `{ firstName: "John" }` | `{ first_name: "John" }` |
| Form body (FormData) | `firstName=John` | `first_name=John` |
| Bracket notation | `user[firstName]` | `user[first_name]` |
| Query params | `?sortField=name` | `?sort_field=name` |
| `X-Inertia-Partial-Data` | `userStats,recentPosts` | `user_stats,recent_posts` |
| `X-Inertia-Partial-Except` | `heavyData` | `heavy_data` |
| `X-Inertia-Reset` | `feedItems` | `feed_items` |
| `X-Inertia-Except-Once-Props` | `cachedStats` | `cached_stats` |
| `X-Inertia-Error-Bag` | `createUser` | `create_user` |

Error responses (4xx/5xx) containing Inertia page objects are also transformed.

Query params are transformed in the outgoing request, so `router.get('/users', { sortField: 'name' })` sends `?sort_field=name` to the server. The browser URL will show the snake_case form too — this is correct, since the URL matches what the server expects and page reloads work as expected. Array formats (`items[]=1`, `items[0]=1`) and bracket nesting are preserved as-is.

## Options

Pass options to the Vite plugin or to `setupCaseShift` directly:

```js
// Vite
caseShift({ rawKeys: ['editorConfig'] })

// Manual
setupCaseShift(http, { rawKeys: ['editorConfig'] })
```

When using the manual setup, pass the same options to `transformInitialPage`:

```js
const options = { rawKeys: ['editorConfig'] }
setupCaseShift(http, options)

createInertiaApp({
  setup({ el, App, props }) {
    transformInitialPage(props.initialPage, options)
    // ...
  },
})
```

### `rawKeys`

If your props contain user-supplied JSON (e.g., a JSON editor field), the deep transform will convert those keys too. Use `rawKeys` to transform the key itself but preserve the value as-is:

| Format | Before | After |
|---|---|---|
| JSON body | `{ editorConfig: { backgroundColor: "red" } }` | `{ editor_config: { backgroundColor: "red" } }` |
| FormData | `editorConfig[backgroundColor]=red` | `editor_config[backgroundColor]=red` |
| Query params | `?editorConfig[bg]=red` | `?editor_config[bg]=red` |
| Response props | `{ editor_config: { bg: "red" } }` | `{ editorConfig: { bg: "red" } }` |

Keys are matched by their camelCase name. For JSON, matching works at any nesting depth. For FormData and query params, matching is on the top-level key (before any brackets).

### `skipKeys`

To skip both key transformation and value recursion entirely:

```js
setupCaseShift(http, { skipKeys: ['editorConfig'] })
```

| Format | Before | After |
|---|---|---|
| JSON body | `{ editorConfig: { bg: "red" } }` | `{ editorConfig: { bg: "red" } }` |
| FormData | `editorConfig[bg]=red` | `editorConfig[bg]=red` |
| Query params | `?editorConfig[bg]=red` | `?editorConfig[bg]=red` |
| Response props | `{ editor_config: { bg: "red" } }` | `{ editor_config: { bg: "red" } }` |

## Caveats

Case conversion is lossy for acronym-style keys like `getHTTPSUrl` — the roundtrip produces `getHttpsUrl`. This only affects keys that mix uppercase acronyms with camelCase, which don't appear in the normal `snake_case` → `camelCase` flow.

Both `rawKeys` and `skipKeys` are matched by their camelCase form (e.g., specify `"editorConfig"` to match `editor_config` in responses).

## License

MIT
