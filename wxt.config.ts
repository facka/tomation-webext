import UnoCSS from 'unocss/vite'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: [
      'tabs',
      'storage',
      'scripting',
      'activeTab',
      'sidePanel',
    ],
    content_scripts: [
      {
        matches: [
          '<all_urls>',
        ],
        js: [
          './content-scripts/content.js',
        ],
      },
    ],
  },
  imports: {
    eslintrc: {
      enabled: 9,
    },
  },
  modules: [
    '@wxt-dev/module-vue',
    '@wxt-dev/auto-icons',
  ],
  modulesDir: 'wxt-modules', // default: "modules"

  // Relative to project root
  srcDir: 'src', // default: "."

  vite: () => ({
    plugins: [

      // https://github.com/antfu/unplugin-icons
      Icons(),

      // https://github.com/unocss/unocss
      UnoCSS(),
    ],
    define: {
      // Feature flag for messaging system transition
      // Set to true to enable new typed messaging system; defaults to false (webext-bridge)
      'import.meta.env.VITE_USE_NEW_MESSAGING': process.env.VITE_USE_NEW_MESSAGING === 'true' ? 'true' : 'false',
    },
  }),
})
