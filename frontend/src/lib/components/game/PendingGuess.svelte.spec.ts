import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-svelte'
import PendingGuess from '$components/game/PendingGuess.svelte'
import { DirectionOption, GuessStatusOption, type Player } from '@bitguess/api-types'

// Hoisted mocks
const {
  mockMakeGuess,
  mockGetGuess,
  mockResumeGame,
  mockGetPlayerToken,
  mockUseBinanceUtil,
  mockFetchPlayer,
} = vi.hoisted(() => ({
  mockMakeGuess: vi.fn(),
  mockGetGuess: vi.fn(),
  mockResumeGame: vi.fn(),
  mockGetPlayerToken: vi.fn().mockReturnValue('p-token'),
  mockUseBinanceUtil: {
    btcHistory: Array(60).fill({ time: 1000, value: 50000 }),
    btcPrice: 50000,
    connect: vi.fn(),
  },
  mockFetchPlayer: vi.fn(),
}))

let mockPlayerState: Partial<Player> = { id: 'p1', pendingGuessId: null }

vi.mock('$services/useGameService.svelte', () => ({
  useGameService: () => ({
    makeGuess: mockMakeGuess,
    getGuess: mockGetGuess,
    resumeGame: mockResumeGame,
    GameState: {
      PENDING_GUESS: 'pending guess',
      RUNNING: 'running',
    },
    set gameState(val: string) {},
  }),
}))

vi.mock('$services/usePlayerService.svelte', () => ({
  usePlayerService: () => ({
    getPlayerToken: mockGetPlayerToken,
    fetchPlayer: mockFetchPlayer,
    get player() {
      return mockPlayerState
    },
  }),
}))

vi.mock('$utils/useBinanceUtil.svelte', () => ({
  useBinanceUtil: () => mockUseBinanceUtil,
}))

// Mock Chart to avoid ECharts issues
vi.mock('$components/ui/Chart.svelte', () => ({
  default: () => null, // Simple null component
}))

describe('PendingGuess Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  // Verifies that clicking an option (UP) calls the API and transitions to the running state.
  it('should handle successful guess creation', async () => {
    const guess = { id: 'g1', status: GuessStatusOption.PENDING }
    mockMakeGuess.mockResolvedValue(guess)

    const { getByRole } = render(PendingGuess)

    const upButton = getByRole('button', { name: /Up/i })
    await upButton.click()

    expect(mockMakeGuess).toHaveBeenCalledWith('p-token', DirectionOption.UP)
    expect(mockResumeGame).toHaveBeenCalledWith(guess)
  })

  // Verifies that the component handles 409 Conflicts by fetching the existing guess and resuming the game.
  it('should handle 409 Conflict (Already Pending Guess)', async () => {
    const conflict = {
      statusCode: 409,
      pendingGuessId: 'g-pending',
      message: 'Conflict',
    }
    const pendingGuess = { id: 'g-pending', status: GuessStatusOption.PENDING, playerId: 'p1' }
    mockPlayerState = { id: 'p1', pendingGuessId: 'g-pending' } // Simulate updated player state

    mockMakeGuess.mockResolvedValue(conflict)
    mockGetGuess.mockResolvedValue(pendingGuess)

    const { getByRole } = render(PendingGuess)

    const upButton = getByRole('button', { name: /Up/i })
    await upButton.click()

    expect(mockMakeGuess).toHaveBeenCalled()
    expect(mockFetchPlayer).toHaveBeenCalled()
    expect(mockGetGuess).toHaveBeenCalledWith('p-token', 'g-pending')
    expect(mockResumeGame).toHaveBeenCalledWith(pendingGuess)
  })
})
