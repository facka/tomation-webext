/* eslint-disable no-console */
import { onMessage } from 'webext-bridge/content-script'

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
  console.info('[tomation-webext] Hello world from content script')

  // communication example: send previous tab title from background page
  onMessage('tab-prev', ({ data }) => {
    console.log(`[tomation-webext] Navigate from page "${data.title}"`)
  })
})()
