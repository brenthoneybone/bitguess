import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-svelte'
import Resolving from '$components/game/Resolving.svelte'
import { GuessStatusOption } from '@bitguess/api-types'

const { mockResolveCurrentGuess, mockFetchPlayer, mockGameStateSetter } = vi.hoisted(() => ({
  mockResolveCurrentGuess: vi.fn(),
  mockFetchPlayer: vi.fn(),
  mockGameStateSetter: vi.fn(),
}))

vi.mock('$services/usePlayerService.svelte', () => ({
  usePlayerService: () => ({
    fetchPlayer: mockFetchPlayer,
  }),
}))

vi.mock('$services/useGameService.svelte', () => ({
  useGameService: () => ({
    resolveCurrentGuess: mockResolveCurrentGuess,
    GameState: {
      RESULT: 'result',
      VOID_RESULT: 'void result',
      ERROR: 'error',
      RESOLVING: 'resolving',
    },
    set gameState(val: string) {
      mockGameStateSetter(val)
    },
    get gameState() {
      return 'resolving'
    },
  }),
}))

describe('Resolving Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Verifies that the component transitions to the RESULT screen when the guess is successfully resolved.
  it('transitions to RESULT when guess is resolved', async () => {
    mockResolveCurrentGuess.mockResolvedValue({ status: GuessStatusOption.RESOLVED })

    render(Resolving)

    // Wait for async onMount execution
    await vi.waitUntil(() => mockGameStateSetter.mock.calls.length > 0)

    expect(mockFetchPlayer).toHaveBeenCalled()
    expect(mockGameStateSetter).toHaveBeenCalledWith('result')
  })

  // Verifies that the component transitions to the VOID result screen if the guess remains unresolved (e.g. flat price).
  it('transitions to VOID_RESULT when guess is not resolved', async () => {
    mockResolveCurrentGuess.mockResolvedValue({ status: GuessStatusOption.PENDING }) // Or any other state

    render(Resolving)

    await vi.waitUntil(() => mockGameStateSetter.mock.calls.length > 0)

    expect(mockGameStateSetter).toHaveBeenCalledWith('void result')
  })

  // Verifies that the component shows the error screen if the resolution API call fails.
  it('transitions to ERROR when resolution throws', async () => {
    mockResolveCurrentGuess.mockRejectedValue(new Error('Resolution failed'))

    render(Resolving)

    await vi.waitUntil(() => mockGameStateSetter.mock.calls.length > 0)

    expect(mockGameStateSetter).toHaveBeenCalledWith('error')
  })
})
