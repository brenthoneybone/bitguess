import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGameService } from '$services/useGameService.svelte'
import { GuessStatusOption, DirectionOption } from '@bitguess/api-types'

// Hoist mocks
const { mockCreateGuess, mockGetGuess } = vi.hoisted(() => ({
  mockCreateGuess: vi.fn(),
  mockGetGuess: vi.fn(),
}))

vi.mock('$services/useBitGuessApiService', () => ({
  useBitGuessApiService: () => ({
    createGuess: mockCreateGuess,
    getGuess: mockGetGuess,
  }),
}))

describe('useGameService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset service state. Since it's a module level global (singleton-ish),
    // resetting via setters is required.
    const service = useGameService()
    service.startNewRound()
    service.gameState = service.GameState.LOADING
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Verifies that the service starts in the LOADING state with no current guess.
  it('should initialize with loading state', () => {
    const service = useGameService()
    // The beforeEach block sets it to loading, matching the initial state.
    expect(service.gameState).toBe(service.GameState.LOADING)
    expect(service.currentGuess).toBeUndefined()
  })

  // Verifies that submitting a guess calls the create API and returns the guess object.
  it('should make a guess successfully', async () => {
    const service = useGameService()
    const mockGuess = { id: 'g1', status: GuessStatusOption.PENDING }
    mockCreateGuess.mockResolvedValue(mockGuess)

    const result = await service.makeGuess('token1', DirectionOption.UP)

    expect(mockCreateGuess).toHaveBeenCalledWith('token1', DirectionOption.UP)
    expect(result).toEqual(mockGuess)
  })

  // Verifies that API errors during guess creation are caught, logged, and return undefined.
  it('should handle make guess error', async () => {
    const service = useGameService()
    const error = new Error('API Error')
    mockCreateGuess.mockRejectedValue(error)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await service.makeGuess('token1', DirectionOption.DOWN)

    expect(mockCreateGuess).toHaveBeenCalledWith('token1', DirectionOption.DOWN)
    expect(result).toBeUndefined()
    expect(consoleSpy).toHaveBeenCalled()
  })

  // Verifies that the service polls the getGuess API until the status changes from PENDING to RESOLVED.
  it('should resolve guess loop', async () => {
    // Stub setTimeout to resolve immediately so we don't wait 1s per iteration
    vi.stubGlobal('setTimeout', (fn: () => void) => fn())

    const service = useGameService()
    // 1st call: pending, 2nd call: resolved
    mockGetGuess
      .mockResolvedValueOnce({ id: 'g1', status: GuessStatusOption.PENDING })
      .mockResolvedValueOnce({ id: 'g1', status: GuessStatusOption.RESOLVED })

    const result = await service.resolveGuess('token1', 'g1')

    expect(mockGetGuess).toHaveBeenCalledTimes(2)
    expect(result).toBeDefined()
    expect(result?.status).toBe(GuessStatusOption.RESOLVED)
    expect(service.currentGuess).toEqual(result)
  })

  // Verifies that polling stops and returns undefined if the guess takes too long to resolve (timeout).
  it('should timeout resolving guess', async () => {
    const service = useGameService()
    // Always pending
    mockGetGuess.mockResolvedValue({ id: 'g1', status: GuessStatusOption.PENDING })

    // Avoid waiting 30 seconds by mocking Date.now to increment rapidly.
    // The loop condition relies on Date.now().
    let time = 1000
    vi.spyOn(Date, 'now').mockImplementation(() => {
      time += 5000 // increment 5s each call
      return time
    })

    // Mock setTimeout to resolve immediately
    vi.stubGlobal('setTimeout', (fn: () => void) => fn())

    await expect(service.resolveGuess('token1', 'g1')).rejects.toThrow(
      'Timed out waiting for guess resolution',
    )

    expect(service.gameState).toBe(service.GameState.ERROR)
    expect(mockGetGuess).toBeCalled()
  })
})
