import { expect, test } from '@playwright/test'

const setupBaseMocks = async (
  page: Parameters<typeof test.beforeEach>[0]['page'],
  playerId = 'player-error',
) => {
  // Stub Binance util
  await page.route('**/*useBinanceUtil.svelte*.js', (route) => {
    const body = `
      const price = 50000;
      const history = [[new Date(), price]];
      export const useBinanceUtil = () => ({
        connect: () => {},
        disconnect: () => {},
        get btcPrice() { return price },
        get btcHistory() { return history },
        get btcWsState() { return 'connected' },
      });
    `
    return route.fulfill({ status: 200, contentType: 'application/javascript', body })
  })

  // Stub config to speed up game
  await page.route('**/*config*.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'export const CONFIG = { game: { time: 1 } };',
    }),
  )

  // Stub OpenAPI
  await page.route('**/openapi.yaml', (route) =>
    route.fulfill({ status: 200, contentType: 'text/yaml', body: '' }),
  )

  // Mock player
  await page.route('**/v1/players/**', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: playerId,
          score: 10,
          pendingGuessId: null,
        }),
      })
    }
    return route.fulfill({ status: 200, body: '{}' })
  })

  // Mock create guess
  await page.route(`**/v1/players/${playerId}/guesses`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'guess-error',
        playerId,
        direction: 'UP',
        startValue: 50000,
        status: 'PENDING',
        resolveAfter: Date.now() + 1000,
      }),
    })
  })

  // Seed player token
  await page.addInitScript((id) => localStorage.setItem('playerToken', id), playerId)
}

// Verifies that the UI correctly handles a VOID result state when the backend cannot determine a winner.
test('handles VOID game result', async ({ page }) => {
  const playerId = 'player-void'
  const guessId = 'guess-error'
  await setupBaseMocks(page, playerId)

  let guessPollCount = 0

  // Mock get guess returning VOID eventually
  await page.route(`**/v1/players/${playerId}/guesses/${guessId}`, async (route) => {
    guessPollCount += 1
    const resolved = guessPollCount >= 3

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: guessId,
        playerId,
        direction: 'UP',
        startValue: 50000,
        endValue: resolved ? 50000 : null,
        delta: resolved ? 0 : null,
        status: resolved ? 'VOID' : 'PENDING',
        resolveAfter: Date.now() - 1000,
      }),
    })
  })

  await page.goto('/')

  // Start game
  await expect(page.getByText('Make Your Guess')).toBeVisible()
  await page.getByRole('button', { name: /up/i }).click()

  // Wait for resolving
  await expect(page.getByText(/Resolving/)).toBeVisible({ timeout: 10000 })

  // Expect Void result
  await expect(page.getByRole('heading', { name: /void result/i })).toBeVisible({ timeout: 10000 })
  await expect(page.getByText(/could not be resolved/i)).toBeVisible()

  // Verify we can restart
  await expect(page.getByRole('button', { name: /play again/i })).toBeVisible()
})

// Verifies that the game gracefully handles timeout or server errors during the resolution phase.
test('handles resolution TIMEOUT/ERROR', async ({ page }) => {
  const playerId = 'player-timeout'
  const guessId = 'guess-error'
  await setupBaseMocks(page, playerId)

  // Mock get guess returning 500 error eventually to trigger catch block
  let pollCount = 0
  await page.route(`**/v1/players/${playerId}/guesses/${guessId}`, async (route) => {
    if (route.request().method() === 'GET') {
      pollCount++

      // Fail on the 3rd attempt
      if (pollCount > 2) {
        return route.fulfill({ status: 500 })
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: guessId,
          playerId,
          direction: 'UP',
          startValue: 50000,
          status: 'PENDING',
          resolveAfter: Date.now() - 1000,
        }),
      })
    }
    return route.fallback()
  })

  await page.goto('/')

  // Start game
  await expect(page.getByText('Make Your Guess')).toBeVisible()
  await page.getByRole('button', { name: /up/i }).click()

  // Wait for resolving
  await expect(page.getByText(/Resolving/)).toBeVisible({ timeout: 10000 })

  // Expect Error state
  await expect(page.getByRole('heading', { name: /oh no/i })).toBeVisible({ timeout: 10000 })
  await expect(page.getByText(/something went wrong/i)).toBeVisible()

  // Verify we can reload (button exists)
  await expect(page.getByRole('button', { name: /reload/i })).toBeVisible()
})
