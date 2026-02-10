(function () {
  const TIMEOUT = 3000
  const start = Date.now()

  function check() {
    const app = document.getElementById('app')

    if (app && app.children.length > 0) {
      window.__VUE_APP_HEALTH__ = 'loaded'
      console.log('✅ Vue app loaded')
      return
    }

    if (Date.now() - start > TIMEOUT) {
      window.__VUE_APP_HEALTH__ = 'down'
      console.error('❌ Vue app did not load')
      document.getElementById('app').innerHTML = '<p style="color: red;">Failed to load the side panel. Please start the dev server.</p>'
      return
    }

    requestAnimationFrame(check)
  }

  check()
})()
