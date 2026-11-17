# vize-void-island-page-id-repro

Minimal reproduction: with [vize](https://github.com/ubugeeei-prod/vize)'s Vite plugin in a [Void](https://void.cloud) app, no island is ever hydrated. vize gives each `.vue` module the id `<file>.vue?vue&vize`, and `@void/vue` looks for island pages with a filter that ends in `\.island\.vue$`, so it never sees one.

## Steps

```sh
pnpm install
pnpm check
```

`pnpm check` builds the same app twice and checks `dist/client/index.html` after each:

* [`vite.vue.config.js`](./vite.vue.config.js): `[voidPlugin(), voidVue()]`, where `voidVue()` brings `@vitejs/plugin-vue`
* [`vite.config.js`](./vite.config.js): `[voidPlugin(), vize(), voidVue()]`, as in vize's [Void compatibility fixture](https://github.com/ubugeeei-prod/vize/blob/v0.777.0/tools/support/compat/void/fixtures/void-vue/vite.config.ts)

[`void.config.ts`](./void.config.ts) prerenders the page (`output: "static"`).

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

The counter is wrapped in an island and hydrated, as in the build without vize:

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

The same happens with the setup in [vize's Void guide](https://github.com/ubugeeei-prod/vize/blob/v0.777.0/docs/content/integrations/void.md#L22-L29), `defineConfig({ plugins: [voidPlugin(), voidVue()] }).withVue({})` from `@vizejs/vite-plugin/vite-plus` (vite-plus 1.7.0), and with vize 0.778.0.

## Notes

* `@void/vue` finds islands in its `void-vue:islands` plugin ([`enforce: "pre"`](https://github.com/voidzero-dev/void/blob/v1.10.0/packages/vue/src/plugin-islands.ts#L66-L67)), whose `transform` has [`filter: { id: /\.island\.vue$/ }`](https://github.com/voidzero-dev/void/blob/v1.10.0/packages/vue/src/plugin-islands.ts#L154). It reads the SFC source for `import … with { island }` and wraps each such component in `<div data-island>`.
* With vize, that transform is asked about `/…/pages/index.island.vue?vue&vize` (vize's [`toPluginVisibleVirtualId`](https://github.com/ubugeeei-prod/vize/blob/v0.777.0/npm/builder/vite/src/virtual.ts#L46-L55)), so the filter does not match. The code it would get is still the SFC source; a `transform` plugin placed just before `vize()` logs:

  ```
  ages/index.island.vue?vue&vize "<script setup>\nimport Counter from \"../components/Counter.vu"
  ```

* Matching the query makes it work. Wrapping the plugin so that it accepts `?vue&vize` and is given the id without the query, with vize still compiling every SFC, gives `island: <div data-island="components/Counter"`:

  ```js
  const plugins = voidVue().map((p) =>
    p.name !== "void-vue:islands"
      ? p
      : {
          ...p,
          transform: {
            filter: { id: /\.island\.vue(\?.*)?$/ },
            handler(code, id, opts) {
              return p.transform.handler.call(this, code, id.split("?")[0], opts);
            },
          },
        },
  );
  ```

* The guide says Void "keeps its routing, loaders, islands and bindings", and the fixture has an island page ([`pages/stats/index.island.vue`](https://github.com/ubugeeei-prod/vize/blob/v0.777.0/tools/support/compat/void/fixtures/void-vue/pages/stats/index.island.vue)), but that page imports no component `with { island }`, so nothing checks that an island is hydrated.
* Separately, vize's compiled output drops import attributes: `compileSfc` on `pages/index.island.vue` emits `import Counter from '../components/Counter.vue'`, where `@vue/compiler-sfc` 3.5.45 keeps `with { island: "load" }`. It does not cause this failure, since Void rewrites the import before compiling.
* `virtual.ts` and `@void/vue`'s `plugin-islands.ts` are unchanged on `main` (vize b3858ac9, Void f2c40b57). Whether an earlier vize version behaves differently was not checked.

## Environment

vize 0.777.0 (also 0.778.0), void / @void/vue 1.10.0, Vite 8.3.8, Vue 3.5.45, Node v26.13.1, pnpm 12.9.0, macOS (arm64). `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` only lets these fresh releases through a pnpm `minimumReleaseAge` policy.
