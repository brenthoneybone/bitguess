import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from 'vitest-browser-svelte'
import Loading from '$components/game/Loading.svelte'
import type { Player } from '@bitguess/api-types'

// Mutable state for mocks
let mockPlayerState: Partial<Player> = { id: 'p1', pendingGuessId: null }

const { mockEnsurePlayer, mockGetGuess, mockGameStateSetter, mockUseBinanceUtil } = vi.hoisted(
  () => ({
    mockEnsurePlayer: vi.fn(),
    mockGetGuess: vi.fn(),
    mockGameStateSetter: vi.fn(),
    mockUseBinanceUtil: {
      connect: vi.fn(),
      btcPrice: 50000,
    },
  }),
)

vi.mock('$services/usePlayerService.svelte', () => ({
  usePlayerService: () => ({
    ensurePlayer: mockEnsurePlayer,
    get player() {
      return mockPlayerState
    },
  }),
}))

vi.mock('$services/useGameService.svelte', () => ({
  useGameService: () => ({
    getGuess: mockGetGuess,
    GameState: {
      LOADING: 'loading',
      PENDING_GUESS: 'pending guess',
      RUNNING: 'running',
      ERROR: 'error',
    },
    set gameState(val: string) {
      mockGameStateSetter(val)
    },
    get gameState() {
      return 'loading'
    },
    currentGuess: undefined,
    resumeGame: vi.fn(),
  }),
}))

vi.mock('$utils/useBinanceUtil.svelte', () => ({
  useBinanceUtil: () => mockUseBinanceUtil,
}))

describe('Loading Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockPlayerState = { id: 'p1', pendingGuessId: null }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Verifies that the component enters the error state if the player profile cannot be loaded.
  it('transitions to ERROR when ensurePlayer fails', async () => {
    mockEnsurePlayer.mockRejectedValue(new Error('Player fetch failed'))

    render(Loading)

    await vi.advanceTimersByTimeAsync(300)
    // catch potential unhandled rejection in test runner if not handled in component
    await vi.waitUntil(() => mockGameStateSetter.mock.calls.length > 0).catch(() => {})

    expect(mockGameStateSetter).toHaveBeenCalledWith('error')
  })

  // Verifies that the component enters the error state if the active guess cannot be fetched.
  it('transitions to ERROR when getGuess fails', async () => {
    mockPlayerState = { id: 'p1', pendingGuessId: 'g1' }
    mockEnsurePlayer.mockResolvedValue(mockPlayerState)
    mockGetGuess.mockRejectedValue(new Error('Guess fetch failed'))

    render(Loading)

    await vi.advanceTimersByTimeAsync(300)
    await vi.waitUntil(() => mockGameStateSetter.mock.calls.length > 0).catch(() => {})

    expect(mockGameStateSetter).toHaveBeenCalledWith('error')
  })
})
