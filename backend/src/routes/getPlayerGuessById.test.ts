import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { handler } from './getPlayerGuessById'
import { DirectionOption } from '@bitguess/api-types'

// Hoisted mocks
const { mockGuessService } = vi.hoisted(() => ({
  mockGuessService: {
    getGuess: vi.fn(),
  },
}))

// Mock dependencies
vi.mock('$services/useGuessService', () => ({
  useGuessService: () => mockGuessService,
}))

describe('getPlayerGuessById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Verifies fetching a specific guess record by ID.
  it('should return 200 with guess data', async () => {
    const guessId = 'g1'
    const guessMock = { id: guessId, playerId: 'p1', direction: DirectionOption.UP }
    mockGuessService.getGuess.mockResolvedValue(guessMock)

    const params = { guessId }
    const result = (await handler(
      {} as unknown as APIGatewayProxyEventV2,
      params,
    )) as APIGatewayProxyStructuredResultV2

    expect(mockGuessService.getGuess).toHaveBeenCalledWith(guessId)
    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body as string)).toEqual(guessMock)
  })

  // Verifies the current behavior for non-existent guesses is returning 404.
  it('should return 404 if guess not found', async () => {
    const guessId = 'g99'
    mockGuessService.getGuess.mockResolvedValue(null)

    const params = { guessId }
    const result = (await handler(
      {} as unknown as APIGatewayProxyEventV2,
      params,
    )) as APIGatewayProxyStructuredResultV2

    expect(mockGuessService.getGuess).toHaveBeenCalledWith(guessId)
    expect(result.statusCode).toBe(404)
    expect(JSON.parse(result.body as string)).toEqual({
      error: 'Guess not found',
    })
  })
})
