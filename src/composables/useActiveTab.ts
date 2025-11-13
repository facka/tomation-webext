import browser from 'webextension-polyfill'

export function useActiveTab() {
  async function getActiveTab(): Promise<{ tab: any, destination: string }> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    return {
      tab,
      destination: `content-script@${tab?.id}`,
    }
  }

  return { getActiveTab }
}
