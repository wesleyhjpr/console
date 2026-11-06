import { test, expect } from '@playwright/test'
import { setupDemoMode } from '../helpers/setup'

const BASE_URL = process.env.APP_VISUAL_BASE_URL || 'http://localhost:5174/'
const BASE_PATH = new URL(BASE_URL).pathname
const CONTENT_TIMEOUT_MS = 30_000
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

for (const viewport of VIEWPORTS) {
  test(`Console navigation stays under the base path on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await setupDemoMode(page, BASE_PATH)
    await page.route(`**${BASE_PATH}src/**`, route => route.continue())
    const escapedRequests: string[] = []
    const pageErrors: string[] = []
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('request', request => {
      const url = new URL(request.url())
      if (url.origin === new URL(BASE_URL).origin && !url.pathname.startsWith(BASE_PATH)) {
        escapedRequests.push(url.pathname)
      }
    })

    await page.goto(BASE_PATH)
    await expect(page.locator('#main-content')).toBeVisible({ timeout: CONTENT_TIMEOUT_MS })
    await expect(page.getByText('Page not found', { exact: true })).toHaveCount(0)
    await expect(page.locator(`a[href="${BASE_PATH}settings"]`).first()).toBeAttached()
    await expect(page).toHaveScreenshot(`base-path-home-${viewport.name}.png`)

    if (viewport.name === 'desktop') {
      await page.locator(`a[href="${BASE_PATH}settings"]`).first().click()
    } else {
      await page.goto(`${BASE_PATH}settings`)
    }
    await expect(page).toHaveURL(new URL(`${BASE_PATH}settings`, BASE_URL).href)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: CONTENT_TIMEOUT_MS })
    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toBeAttached()
    expect(await skipLink.evaluate(link => (link as HTMLAnchorElement).href)).toBe(`${page.url()}#main-content`)
    await expect(page).toHaveScreenshot(`base-path-settings-${viewport.name}.png`)
    expect(escapedRequests).toEqual([])
    expect(pageErrors).toEqual([])
  })
}