# vize-void-island-attrs-repro

Minimal reproduction: with [vize](https://github.com/ubugeeei-prod/vize)'s Vite plugin in a [Void](https://void.cloud) app, no island is ever hydrated. The `with { island: "load" }` import attribute that marks an island is gone by the time Void's island transform reads the page, so the island renders as static HTML only.

## Steps

```sh
pnpm install
pnpm check
```

`pnpm check` builds the same app twice and checks `dist/client/index.html` after each: once with `@vitejs/plugin-vue` alone ([`vite.vue.config.js`](./vite.vue.config.js)), then with `vize()` added ([`vite.config.js`](./vite.config.js)), as [vize's Void guide](https://github.com/ubugeeei-prod/vize/blob/v0.777.0/docs/content/integrations/void.md) and its Void fixture do. [`void.config.ts`](./void.config.ts) prerenders the page (`output: "static"`).

[`pages/index.island.vue`](./pages/index.island.vue):

```vue
<script setup>
import Counter from "../components/Counter.vue" with { island: "load" };
</script>

<template>
  <Counter />
</template>
```

[`components/Counter.vue`](./components/Counter.vue) is a button that counts its clicks.

## Expected

The counter is wrapped in an island and hydrated, as with `@vitejs/plugin-vue`:

```
[void] prerender index.html
island: <div data-island="components/Counter"
```

## Actual

With `vize()`, the page has no island; the button is static HTML and does nothing. `pnpm check` exits 1:

```
[void] prerender index.html
island: none (Counter.vue is static HTML, never hydrated)
```

## Notes

* Void finds islands in its `void-vue:islands` plugin (`enforce: "pre"`, a `transform` on `*.island.vue`), which reads the SFC source for `import … with { island }` (`findIslandImports` in `void/dist/pages/islands-plugin.mjs`) and wraps each such component in `<div data-island>`.
* vize compiles SFCs in [`load`](https://github.com/ubugeeei-prod/vize/blob/v0.777.0/npm/builder/vite/src/plugin/load.ts), so that transform receives compiled code, and the compiled code has lost the attribute. `@vizejs/native`'s `compileSfc` on `pages/index.island.vue`:

  ```js
  import { openBlock as _openBlock, createBlock as _createBlock } from "vue"
  import Counter from '../components/Counter.vue'
  ```

* Keeping the attribute alone would likely not be enough: the transform (`islandsPlugin` in `@void/vue/dist/plugin.mjs`) splices its wrapper into the `<script setup>` block, and throws `islands: Expected a <script setup> block` where there is none.
* The same happens with `defineConfig(...).withVue({})` from `@vizejs/vite-plugin/vite-plus` and `vite-plus` 1.7.0.

## Environment

vize 0.777.0, void / @void/vue 1.10.0, Vite 8.3.8, Vue 3.5.45, Node v26.13.1, pnpm 12.9.0, macOS (arm64)
