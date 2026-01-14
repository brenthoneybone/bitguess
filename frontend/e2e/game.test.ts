import { expect, test } from '@playwright/test'

// These tests stub backend calls so the UI can mount without hitting real services.
const stubPlayer = {
  id: 'player-e2e',
  score: 0,
  pendingGuessId: null,
}

// Helper to stub the backend API that the app calls.
const setupApiStubs = async (page: Parameters<typeof test.beforeEach>[0]['page']) => {
  // Player creation
  await page.route('**/v1/players', async (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(stubPlayer),
      })
    }
    return route.fallback()
  })

  // Player fetch/create
  await page.route('**/v1/players/**', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubPlayer),
      })
    }

    // Fallback for POSTs (create guess, etc.)
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  // Avoid fetching the OpenAPI spec during preview
  await page.route('**/openapi.yaml', (route) =>
    route.fulfill({ status: 200, contentType: 'text/yaml', body: '' }),
  )
}

// Basic smoke: page renders and player creation is attempted when no token exists.
test('renders loading state and creates player profile', async ({ page }) => {
  const playerRequests: { url: string; method: string }[] = []

  await setupApiStubs(page)

  page.on('request', (req) => {
    if (req.url().includes('/v1/players')) {
      playerRequests.push({ url: req.url(), method: req.method() })
    }
  })

  await page.goto('/')

  await expect(page.getByText('Loading')).toBeVisible()
  await expect(page.getByText('please wait')).toBeVisible()
  const hasPost = playerRequests.some((r) => r.method === 'POST')
  const hasGet = playerRequests.some((r) => r.method === 'GET')
  expect(hasPost).toBe(true)
  expect(hasGet).toBe(false)
})

// Ensures the app stays stable (no page errors) when backend calls are mocked.
test('does not crash with mocked backend', async ({ page }) => {
  const errors: Error[] = []

  await setupApiStubs(page)

  page.on('pageerror', (err) => errors.push(err))

  await page.goto('/')

  await expect(page.getByText('Loading')).toBeVisible()
  expect(errors).toHaveLength(0)
})

// Full game flow: mocks WebSocket price feed + backend to drive the UI through a round.
test('user can make a guess and see the round resolve', async ({ page }) => {
  const playerId = 'player-e2e'
  const guessId = 'guess-123'

  // Stub the Binance util chunk so price/history are available immediately (no real websockets).
  await page.route('**/*useBinanceUtil.svelte*.js', (route) => {
    const body = `
      // Stubbed Binance util for E2E
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

  // Mock player/profile requests (score bumps after resolution)
  let guessPollCount = 0
  await page.route('**/v1/players/**', async (route) => {
    const isGet = route.request().method() === 'GET'
    const isResolved = guessPollCount >= 3
    if (isGet) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: playerId,
          score: isResolved ? 11 : 10,
          pendingGuessId: null,
        }),
      })
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  // Mock create guess
  await page.route(`**/v1/players/${playerId}/guesses`, async (route) => {
    const body = route.request().postDataJSON()
    expect(body.direction).toBe('UP')
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: guessId,
        playerId,
        direction: 'UP',
        startValue: 50000,
        status: 'PENDING',
        resolveAfter: Date.now() + 1000,
      }),
    })
  })

  // Mock get guess (pending then resolved)
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
        endValue: resolved ? 51000 : null,
        delta: resolved ? 1 : null,
        status: resolved ? 'RESOLVED' : 'PENDING',
        resolveAfter: Date.now() - 1000,
      }),
    })
  })

  // Avoid fetching the OpenAPI spec during preview
  await page.route('**/openapi.yaml', (route) =>
    route.fulfill({ status: 200, contentType: 'text/yaml', body: '' }),
  )

  // Speed up the in-game timer (default 60s) so the flow finishes quickly
  await page.route('**/*config*.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'export const CONFIG = { game: { time: 1 } };',
    }),
  )

  // Seed player token so the app uses our mocked player ID
  await page.addInitScript((id) => localStorage.setItem('playerToken', id), playerId)

  await page.goto('/')

  await expect(page.getByText('Make Your Guess')).toBeVisible({ timeout: 5000 })

  const upButton = page.getByRole('button', { name: /up/i })
  await upButton.click()

  // After click, we either see registering state or running state
  await expect(page.getByText(/guess is being registered/i)).toBeVisible()

  // When the round starts, the running view shows the user's guess summary
  await expect(page.getByText(/your guess was btc would go/i)).toBeVisible({ timeout: 10000 })
  await expect(page.getByText(/UP/)).toBeVisible()

  // Wait for countdown to finish and resolution state
  await expect(page.getByText(/Resolving/)).toBeVisible({ timeout: 10000 })

  // Wait for result state
  await expect(page.getByText(/Correct!/i)).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('heading', { name: 'Your Score' })).toBeVisible()

  // Verify we can restart
  const tryAgainButton = page.getByRole('button', { name: /play again/i })
  await expect(tryAgainButton).toBeVisible()
  await tryAgainButton.click()

  await expect(page.getByText('Make Your Guess')).toBeVisible()
})
