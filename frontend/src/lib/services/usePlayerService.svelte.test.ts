import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePlayerService } from '$services/usePlayerService.svelte'

// Hoist mocks
const { mockGetPlayer, mockCreatePlayer } = vi.hoisted(() => ({
  mockGetPlayer: vi.fn(),
  mockCreatePlayer: vi.fn(),
}))

vi.mock('$services/useBitGuessApiService', () => ({
  useBitGuessApiService: () => ({
    getPlayer: mockGetPlayer,
    createPlayer: mockCreatePlayer,
  }),
}))

describe('usePlayerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('ensurePlayer creates player and stores token when missing', async () => {
    const service = usePlayerService()
    expect(localStorage.getItem('playerToken')).toBeNull()

    const newPlayer = { id: 'api-player', score: 0, pendingGuessId: null }
    mockCreatePlayer.mockResolvedValue(newPlayer)

    const player = await service.ensurePlayer()

    expect(mockCreatePlayer).toHaveBeenCalled()
    expect(player).toEqual(newPlayer)
    expect(service.player).toEqual(newPlayer)
    expect(localStorage.getItem('playerToken')).toBe('api-player')
  })

  it('ensurePlayer uses existing token and fetches player', async () => {
    const existingToken = 'existing-token-123'
    localStorage.setItem('playerToken', existingToken)

    const existingPlayer = { id: existingToken, score: 50, pendingGuessId: null }
    mockGetPlayer.mockResolvedValue(existingPlayer)

    const service = usePlayerService()
    const player = await service.ensurePlayer()

    expect(mockCreatePlayer).not.toHaveBeenCalled()
    expect(mockGetPlayer).toHaveBeenCalledWith(existingToken)
    expect(player).toEqual(existingPlayer)
    expect(service.player).toEqual(existingPlayer)
  })

  it('should throw if getting token when none exists', () => {
    const service = usePlayerService()
    expect(() => service.getPlayerToken()).toThrow('No player token found in storage')
  })

  it('should fetch player data using stored token', async () => {
    const token = 'test-token'
    localStorage.setItem('playerToken', token)

    const mockPlayer = { id: token, score: 50, pendingGuessId: null }
    mockGetPlayer.mockResolvedValue(mockPlayer)

    const service = usePlayerService()
    const player = await service.fetchPlayer()

    expect(mockGetPlayer).toHaveBeenCalledWith(token)
    expect(player).toEqual(mockPlayer)
    expect(service.player).toEqual(mockPlayer)
  })
})
