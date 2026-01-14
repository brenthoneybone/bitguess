import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { handler } from './postPlayers'

const { mockPlayerService } = vi.hoisted(() => ({
  mockPlayerService: {
    createPlayer: vi.fn(),
  },
}))

vi.mock('$services/usePlayerService', () => ({
  usePlayerService: () => mockPlayerService,
}))

describe('postPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Verifies the ability to register a new player via a POST request.
  // This is the entry point for new users starting the game.
  it('creates and returns a player with 201', async () => {
    const player = { id: 'new-player', score: 0, pendingGuessId: null }
    mockPlayerService.createPlayer.mockResolvedValue(player)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await handler({} as any, {})) as APIGatewayProxyStructuredResultV2

    expect(mockPlayerService.createPlayer).toHaveBeenCalled()
    expect(res.statusCode).toBe(201)
    expect(JSON.parse(res.body as string)).toEqual(player)
  })
})
