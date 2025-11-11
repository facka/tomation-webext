# Tomation Web Extension

Tomation WebExtension lets you run Tomation tests directly in the browser, with a lightweight UI to execute tests and view logs in real time.

## Features

- ⚡️ **Instant HMR** - use **Vite** on dev (no more refresh!)
- 🥝 Vue 3 - Composition API, [`<script setup>` syntax](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0040-script-setup.md) and more!
- 💬 Effortless communications - powered by [`webext-bridge`](https://github.com/antfu/webext-bridge) and [VueUse](https://github.com/antfu/vueuse) storage
- 🌈 [UnoCSS](https://github.com/unocss/unocss) - The instant on-demand Atomic CSS engine.
- 🦾 [TypeScript](https://www.typescriptlang.org/) - type safe
- 📦 [Components auto importing](./src/components)
- 🌟 [Icons](./src/components) - Access to icons from any iconset directly
- 🖥 Content Script - Use Vue even in content script
- 🌍 WebExtension - isomorphic extension for Chrome, Firefox, and others
- 📃 Dynamic `manifest.json` with full type support

## Pre-packed

### Coding Style

- Use Composition API with [`<script setup>` SFC syntax](https://github.com/vuejs/rfcs/pull/227)
- [ESLint](https://eslint.org/) with [@antfu/eslint-config](https://github.com/antfu/eslint-config), single quotes, no semi

### Dev tools

- [TypeScript](https://www.typescriptlang.org/)
- [pnpm](https://pnpm.js.org/) - fast, disk space efficient package manager
- [esno](https://github.com/antfu/esno) - TypeScript / ESNext node runtime powered by esbuild
- [npm-run-all](https://github.com/mysticatea/npm-run-all) - Run multiple npm-scripts in parallel or sequential
- [web-ext](https://github.com/mozilla/web-ext) - Streamlined experience for developing web extensions

## Usage

### Folders

- `src` - main source.
  - `contentScript` - scripts and components to be injected as `content_script`
  - `background` - scripts for background.
  - `components` - auto-imported Vue components that are shared in popup and options page.
  - `styles` - styles shared in popup and options page
  - `assets` - assets used in Vue components
  - `manifest.ts` - manifest for the extension.
- `extension` - extension package root.
  - `assets` - static assets (mainly for `manifest.json`).
  - `dist` - built files, also serve stub entry for Vite on development.
- `scripts` - development and bundling helper scripts.

### Development

```bash
pnpm dev
```

Then **load extension in browser with the `extension/` folder**.

For Firefox developers, you can run the following command instead:

```bash
pnpm dev-firefox
```

`web-ext` auto reload the extension when `extension/` files changed.

> While Vite handles HMR automatically in the most of the case, [Extensions Reloader](https://chrome.google.com/webstore/detail/fimgfedafeadlieiabdeeaodndnlbhid) is still recommended for cleaner hard reloading.

### Build

To build the extension, run

```bash
pnpm build
```

And then pack files under `extension`, you can upload `extension.crx` or `extension.xpi` to appropriate extension store.
