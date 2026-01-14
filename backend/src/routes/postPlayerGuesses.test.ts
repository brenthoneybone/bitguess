import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './postPlayerGuesses'
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { DirectionOption, GuessStatusOption } from '@bitguess/api-types'

// Hoisted mocks
const { mockGuessService, mockPlayerService } = vi.hoisted(() => ({
  mockGuessService: {
    createPendingGuess: vi.fn(),
    queueGuessForResolution: vi.fn(),
    voidGuess: vi.fn(),
  },
  mockPlayerService: {
    setPlayerPendingGuess: vi.fn(),
    getOrCreatePlayer: vi.fn(),
    updatePlayerResolvedGuess: vi.fn(),
  },
}))

// Mock dependencies
vi.mock('$services/useGuessService', () => ({
  useGuessService: () => mockGuessService,
}))
vi.mock('$services/usePlayerService', () => ({
  usePlayerService: () => mockPlayerService,
}))

describe('postPlayerGuesses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  // This is the main "Make a Move" test.
  // It verifies the orchestration: create guess -> update player -> queue job.
  it('should create a guess, link it to player, queue it, and return 201', async () => {
    // Setup
    const playerId = 'p1'
    const direction = DirectionOption.UP
    const guessMock = { id: 'g1', playerId, direction, status: GuessStatusOption.PENDING }

    mockPlayerService.getOrCreatePlayer.mockResolvedValue({
      id: playerId,
      score: 0,
      pendingGuessId: null,
    })
    mockGuessService.createPendingGuess.mockResolvedValue(guessMock)
    mockPlayerService.setPlayerPendingGuess.mockResolvedValue(undefined)
    mockGuessService.queueGuessForResolution.mockResolvedValue(undefined)

    const event = {
      body: JSON.stringify({ direction }),
    } as unknown as APIGatewayProxyEventV2

    const params = { playerId }

    // Execute
    const result = (await handler(event, params)) as APIGatewayProxyStructuredResultV2

    // Verify interactions
    expect(mockPlayerService.getOrCreatePlayer).toHaveBeenCalledWith(playerId)
    expect(mockGuessService.createPendingGuess).toHaveBeenCalledWith(playerId, direction)
    expect(mockPlayerService.setPlayerPendingGuess).toHaveBeenCalledWith(playerId, 'g1')
    expect(mockGuessService.queueGuessForResolution).toHaveBeenCalledWith('g1')

    // Verify response
    const parsedBody = JSON.parse(result.body as string)
    expect(result.statusCode).toBe(201)
    expect(parsedBody).toEqual(guessMock)
  })

  it('should return 409 if player already has a pending guess', async () => {
    // Setup
    const playerId = 'p1'
    const direction = DirectionOption.UP

    mockPlayerService.getOrCreatePlayer.mockResolvedValue({
      id: playerId,
      score: 0,
      pendingGuessId: 'existing-g1',
    })

    const event = {
      body: JSON.stringify({ direction }),
    } as unknown as APIGatewayProxyEventV2

    const params = { playerId }

    // Execute
    const result = (await handler(event, params)) as APIGatewayProxyStructuredResultV2

    // Verify interactions
    expect(mockPlayerService.getOrCreatePlayer).toHaveBeenCalledWith(playerId)
    expect(mockGuessService.createPendingGuess).not.toHaveBeenCalled()
    expect(mockPlayerService.setPlayerPendingGuess).not.toHaveBeenCalled()
    expect(mockGuessService.queueGuessForResolution).not.toHaveBeenCalled()

    // Verify response
    const parsedBody = JSON.parse(result.body as string)
    expect(result.statusCode).toBe(409)
    expect(parsedBody).toEqual({
      statusCode: 409,
      message: 'Player already has a pending guess',
      pendingGuessId: 'existing-g1',
    })
  })

  // Ensures robustness against malformed or missing body payloads.
  it('should handle optional body parsing safely', async () => {
    // Setup
    // If event.body is null
    const playerId = 'p1'
    const guessMock = {
      id: 'g1',
      playerId,
      direction: undefined,
      status: GuessStatusOption.PENDING,
    }

    mockPlayerService.getOrCreatePlayer.mockResolvedValue({
      id: playerId,
      score: 0,
      pendingGuessId: null,
    })
    mockGuessService.createPendingGuess.mockResolvedValue(guessMock)
    mockPlayerService.setPlayerPendingGuess.mockResolvedValue(undefined)
    mockGuessService.queueGuessForResolution.mockResolvedValue(undefined)

    const event = {
      body: null,
    } as unknown as APIGatewayProxyEventV2

    const params = { playerId }

    // Execute
    await handler(event, params)

    // Verify it still calls createPendingGuess with undefined direction
    expect(mockGuessService.createPendingGuess).toHaveBeenCalledWith(playerId, undefined)
  })

  it('should return 400 if JSON body is malformed', async () => {
    const playerId = 'p1'
    const event = {
      body: '{invalid-json',
    } as unknown as APIGatewayProxyEventV2

    const result = (await handler(event, { playerId })) as APIGatewayProxyStructuredResultV2

    expect(result.statusCode).toBe(400)
    const body = JSON.parse(result.body as string)
    expect(body.error).toBe('Invalid JSON body')
  })

  it('should return 500 if initial guess creation fails', async () => {
    const playerId = 'p1'
    const direction = DirectionOption.UP

    mockPlayerService.getOrCreatePlayer.mockResolvedValue({
      id: playerId,
      score: 0,
      pendingGuessId: null,
    })
    mockGuessService.createPendingGuess.mockRejectedValue(new Error('DynamoDB Error'))

    const event = {
      body: JSON.stringify({ direction }),
    } as unknown as APIGatewayProxyEventV2

    const result = (await handler(event, { playerId })) as APIGatewayProxyStructuredResultV2

    expect(result.statusCode).toBe(500)
    const body = JSON.parse(result.body as string)
    expect(body.error).toBe('Internal Server Error')
  })

  it('should return 500 and cleanup if finalization fails', async () => {
    // Setup: Guess creation succeeds, but queueing fails
    const playerId = 'p1'
    const direction = DirectionOption.UP
    const guessMock = { id: 'g1', playerId, direction, status: GuessStatusOption.PENDING }

    mockPlayerService.getOrCreatePlayer.mockResolvedValue({
      id: playerId,
      score: 0,
      pendingGuessId: null,
    })
    mockGuessService.createPendingGuess.mockResolvedValue(guessMock)

    // Fail one of the promises in Promise.all
    mockPlayerService.setPlayerPendingGuess.mockResolvedValue(undefined)
    mockGuessService.queueGuessForResolution.mockRejectedValue(new Error('SQS Error'))

    const event = {
      body: JSON.stringify({ direction }),
    } as unknown as APIGatewayProxyEventV2

    const result = (await handler(event, { playerId })) as APIGatewayProxyStructuredResultV2

    expect(result.statusCode).toBe(500)
    const body = JSON.parse(result.body as string)
    expect(body.error).toBe('Failed to process guess')

    // Verify cleanup
    expect(mockGuessService.voidGuess).toHaveBeenCalledWith('g1')
    expect(mockPlayerService.updatePlayerResolvedGuess).toHaveBeenCalledWith(playerId, 'g1', 0)
  })

  it('should handle cleanup failure gracefully', async () => {
    // Setup: Finalization fails AND cleanup fails
    const playerId = 'p1'
    const direction = DirectionOption.UP
    const guessMock = { id: 'g1', playerId, direction, status: GuessStatusOption.PENDING }

    mockPlayerService.getOrCreatePlayer.mockResolvedValue({
      id: playerId,
      score: 0,
      pendingGuessId: null,
    })
    mockGuessService.createPendingGuess.mockResolvedValue(guessMock)

    // Trigger failure
    mockGuessService.queueGuessForResolution.mockRejectedValue(new Error('SQS Error'))

    // Trigger cleanup failure
    mockGuessService.voidGuess.mockRejectedValue(new Error('Cleanup Error'))

    // Spy on console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const event = {
      body: JSON.stringify({ direction }),
    } as unknown as APIGatewayProxyEventV2

    const result = (await handler(event, { playerId })) as APIGatewayProxyStructuredResultV2

    expect(result.statusCode).toBe(500)
    expect(consoleSpy).toHaveBeenCalledWith('Cleanup failed', expect.any(Error))
  })
})
