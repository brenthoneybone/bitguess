import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { handler } from './getPlayerById'

// Hoisted mocks
const { mockPlayerService } = vi.hoisted(() => ({
  mockPlayerService: {
    getOrCreatePlayer: vi.fn(),
  },
}))

// Mock dependencies
vi.mock('$services/usePlayerService', () => ({
  usePlayerService: () => mockPlayerService,
}))

describe('getPlayerById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Verifies that the route correctly integrates with the PlayerService
  // to return the standard player profile JSON structure.
  it('should return 200 with player data', async () => {
    const playerId = 'p1'
    const playerMock = { id: playerId, score: 100, pendingGuessId: null }
    mockPlayerService.getOrCreatePlayer.mockResolvedValue(playerMock)

    const params = { playerId }
    const result = (await handler(
      {} as unknown as APIGatewayProxyEventV2,
      params,
    )) as APIGatewayProxyStructuredResultV2

    expect(mockPlayerService.getOrCreatePlayer).toHaveBeenCalledWith(playerId)
    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body as string)).toEqual(playerMock)
  })
})
