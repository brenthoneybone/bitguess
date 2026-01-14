import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './guess-resolver'
import { SQSEvent } from 'aws-lambda'
import { GuessStatusOption } from '@bitguess/api-types'

// Hoisted Mocks
const { mockGuessService, mockPlayerService } = vi.hoisted(() => ({
  mockGuessService: {
    resolveGuess: vi.fn(),
    getGuess: vi.fn(),
    voidGuess: vi.fn(),
  },
  mockPlayerService: {
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

describe('guess-resolver lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {}) // Silence logs
    vi.spyOn(console, 'warn').mockImplementation(() => {}) // Silence warnings
    vi.spyOn(console, 'error').mockImplementation(() => {}) // Silence errors
  })

  // Simulates an SQS batch processing event.
  // The handler is expected to iterate through records and call the resolve service for each valid ID.
  it('should process SQS records efficiently', async () => {
    // Setup
    const guessId1 = 'g1'
    const guessId2 = 'g2'
    const resolveResult1 = { playerId: 'p1', delta: 1, id: guessId1 }
    const resolveResult2 = { playerId: 'p2', delta: -1, id: guessId2 }

    mockGuessService.resolveGuess
      .mockResolvedValueOnce(resolveResult1)
      .mockResolvedValueOnce(resolveResult2)

    const event = {
      Records: [
        { body: JSON.stringify({ guessId: guessId1 }) },
        { body: JSON.stringify({ guessId: guessId2 }) },
      ],
    } as unknown as SQSEvent

    // Execute
    await handler(event)

    // Verify
    expect(mockGuessService.resolveGuess).toHaveBeenCalledTimes(2)
    expect(mockGuessService.resolveGuess).toHaveBeenCalledWith(guessId1)
    expect(mockGuessService.resolveGuess).toHaveBeenCalledWith(guessId2)

    expect(mockPlayerService.updatePlayerResolvedGuess).toHaveBeenCalledTimes(2)
    expect(mockPlayerService.updatePlayerResolvedGuess).toHaveBeenCalledWith('p1', guessId1, 1)
    expect(mockPlayerService.updatePlayerResolvedGuess).toHaveBeenCalledWith('p2', guessId2, -1)
  })

  // Ensures that one bad record (invalid JSON) does not crash the lambda,
  // allowing other valid records in the batch to process.
  it('should handle invalid JSON gracefully', async () => {
    const event = {
      Records: [{ body: 'invalid-json' }],
    } as unknown as SQSEvent

    await handler(event)

    expect(mockGuessService.resolveGuess).not.toHaveBeenCalled()
  })

  // Ensures that a record missing the required ID is skipped without error.
  it('should handle missing guessId gracefully', async () => {
    const event = {
      Records: [{ body: JSON.stringify({}) }],
    } as unknown as SQSEvent

    await handler(event)

    expect(mockGuessService.resolveGuess).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully and continue processing', async () => {
    const guessId1 = 'g1'
    const guessId2 = 'g2'
    const resolveResult2 = { playerId: 'p2', delta: -1, id: guessId2 }

    mockGuessService.resolveGuess
      .mockRejectedValueOnce(new Error('Resolution failed'))
      .mockResolvedValueOnce(resolveResult2)

    const event = {
      Records: [
        { body: JSON.stringify({ guessId: guessId1 }) },
        { body: JSON.stringify({ guessId: guessId2 }) },
      ],
    } as unknown as SQSEvent

    await handler(event)

    expect(mockGuessService.resolveGuess).toHaveBeenCalledWith(guessId1)
    expect(mockGuessService.resolveGuess).toHaveBeenCalledWith(guessId2)
    // Only the second one updates the player
    expect(mockPlayerService.updatePlayerResolvedGuess).toHaveBeenCalledTimes(1)
    expect(mockPlayerService.updatePlayerResolvedGuess).toHaveBeenCalledWith('p2', guessId2, -1)
  })

  it('should void guess and unblock player when resolution fails', async () => {
    const guessId = 'g-fail'
    const playerId = 'p-fail'

    // Simulate resolution failure
    mockGuessService.resolveGuess.mockRejectedValueOnce(new Error('Random failure'))

    // Simulate retrieval for fallback
    mockGuessService.getGuess.mockResolvedValueOnce({
      id: guessId,
      playerId,
      status: GuessStatusOption.PENDING,
      delta: null,
    })

    const event = {
      Records: [{ body: JSON.stringify({ guessId }) }],
    } as unknown as SQSEvent

    await handler(event)

    // Verify fallback flow
    expect(mockGuessService.resolveGuess).toHaveBeenCalledWith(guessId)
    // Should void the pending guess
    expect(mockGuessService.voidGuess).toHaveBeenCalledWith(guessId)
    // Should unblock player with delta 0
    expect(mockPlayerService.updatePlayerResolvedGuess).toHaveBeenCalledWith(playerId, guessId, 0)
  })
})
