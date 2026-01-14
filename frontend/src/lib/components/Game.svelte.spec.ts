import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-svelte'
import { page } from 'vitest/browser'
import Game from '$components/Game.svelte'
import { useGameService } from '$services/useGameService.svelte'
import { useBinanceUtil } from '$utils/useBinanceUtil.svelte'

// Mock dependencies if needed, but since module singletons are used, they can be controlled directly.
// Only side effects like network calls need mocking.

// Mock useBinanceUtil to capture the error handler
vi.mock('$utils/useBinanceUtil.svelte', () => {
  const callbacks: ((e: unknown) => void)[] = []
  return {
    useBinanceUtil: () => ({
      connect: (cb: (e: unknown) => void) => {
        if (cb) callbacks.push(cb)
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      triggerError: (err: any) => callbacks.forEach((cb) => cb(err)),
      btcHistory: [],
      btcPrice: 0,
    }),
  }
})

// Mock fetch for playerService.create()
const mockFetch = vi.spyOn(window, 'fetch')

describe('Game Component', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFetch.mockImplementation((req: any) => {
      const url = typeof req === 'string' ? req : req.url
      // POST /v1/players -> create player
      if (url.includes('/v1/players') && (req as Request).method === 'POST') {
        return Promise.resolve(
          new Response(JSON.stringify({ id: '123', score: 0, pendingGuessId: null }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }

      // GET player
      return Promise.resolve(
        new Response(JSON.stringify({ id: '123', score: 0, pendingGuessId: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })

    // Reset game state
    const gameService = useGameService()
    gameService.gameState = gameService.GameState.LOADING
  })

  // Verifies that the Game component renders the Loading screen initially (after a short delay to prevent flicker).
  it('renders Loading state initially', async () => {
    vi.useFakeTimers()
    render(Game)

    // Fast-forward time to bypass the 250ms delay in Loading.svelte
    await vi.advanceTimersByTimeAsync(300)

    await expect.element(page.getByText('Loading')).toBeInTheDocument()
    vi.useRealTimers()
  })

  // Verifies that the Game component transitions to the PendingGuess screen when the service state changes.
  it('renders PendingGuess when state is PENDING_GUESS', async () => {
    const gameService = useGameService()
    gameService.gameState = gameService.GameState.PENDING_GUESS

    render(Game)

    // PendingGuess has "Make Your Guess" heading
    await expect.element(page.getByText('Make Your Guess')).toBeInTheDocument()
  })

  // Verifies that the global error boundary (Error component) is triggered when the websocket connection reports a failure.
  it('renders Error when connection fails', async () => {
    // Render the game
    render(Game)

    // Trigger the error via mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(useBinanceUtil() as any).triggerError(new Error('Connection Failed'))

    // Expect Error component to be visible
    await expect.element(page.getByText('Something went wrong')).toBeInTheDocument()
  })
})
