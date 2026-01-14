import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePlayerService } from './usePlayerService'

const { mockDynamoClient } = vi.hoisted(() => {
  return {
    mockDynamoClient: { send: vi.fn() },
  }
})

vi.mock('$utils/useDynamoUtil', () => ({
  useDynamoUtil: () => ({
    getClient: () => mockDynamoClient,
  }),
}))

describe('usePlayerService', () => {
  const service = usePlayerService()

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PLAYERS_TABLE = 'Players'
  })

  describe('getOrCreatePlayer', () => {
    // Verifies that if a player already exists in the database,
    // the existing record is returned without creating a new one.
    it('should return existing player if found', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { id: 'p1', score: 10, pendingGuessId: null },
      })

      const player = await service.getOrCreatePlayer('p1')

      expect(player).toEqual({ id: 'p1', score: 10, pendingGuessId: null })
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1)
    })

    // Verifies that if a player does not exist, a new player record
    // is initialized with 0 score and returned.
    it('should create and return new player if not found', async () => {
      mockDynamoClient.send
        .mockResolvedValueOnce({}) // getPlayer (not found)
        .mockResolvedValueOnce({}) // createIfMissing (success)
        .mockResolvedValueOnce({
          Item: { id: 'p1', score: 0, pendingGuessId: null },
        }) // getPlayer (found)

      const player = await service.getOrCreatePlayer('p1')

      expect(player).toEqual({ id: 'p1', score: 0, pendingGuessId: null })

      // Verify PutCommand
      const putCall = mockDynamoClient.send.mock.calls[1][0]
      expect(putCall.input).toMatchObject({
        TableName: 'Players',
        Item: { id: 'p1', score: 0, pendingGuessId: null },
        ConditionExpression: 'attribute_not_exists(id)',
      })
    })

    // Simulates a race condition where two requests try to create the same player.
    // If the creation fails due to 'ConditionalCheckFailedException',
    // it implies another process succeeded, so that result is fetched and returned.
    it('should handle race condition where player is created by another process', async () => {
      mockDynamoClient.send
        .mockResolvedValueOnce({}) // getPlayer (not found)
        .mockRejectedValueOnce({ name: 'ConditionalCheckFailedException' }) // createIfMissing (race fail)
        .mockResolvedValueOnce({
          Item: { id: 'p1', score: 5, pendingGuessId: null },
        }) // getPlayer (found)

      const player = await service.getOrCreatePlayer('p1')

      expect(player).toEqual({ id: 'p1', score: 5, pendingGuessId: null })
    })
  })

  describe('setPlayerPendingGuess', () => {
    // Tests the atomic update of the player's state to link a guess.
    // Uses a condition to ensure an existing active guess is not overwritten.
    it('should set pending guess if allowed', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({})

      await service.setPlayerPendingGuess('p1', 'g1')

      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'Players',
            Key: { id: 'p1' },
            UpdateExpression: 'SET pendingGuessId = :gid',
            ConditionExpression: expect.stringContaining('attribute_not_exists(pendingGuessId)'),
            ExpressionAttributeValues: expect.objectContaining({
              ':gid': 'g1',
            }),
          }),
        }),
      )
    })
  })

  describe('updatePlayerResolvedGuess', () => {
    // Verifies that resolving a guess updates the player's score and clears the pending guess lock.
    it('should update score and clear pending guess', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({})

      await service.updatePlayerResolvedGuess('p1', 'g1', 1)

      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'Players',
            Key: { id: 'p1' },
            UpdateExpression:
              'SET score = if_not_exists(score, :zero) + :delta, pendingGuessId = :null',
            ConditionExpression: 'pendingGuessId = :gid',
            ExpressionAttributeValues: expect.objectContaining({
              ':gid': 'g1',
              ':delta': 1,
              ':null': null,
            }),
          }),
        }),
      )
    })

    // Ensures that if the guess is already resolved or the state is invalid
    // (ConditionCheckFailed), the robust error handling prevents a crash.
    it('should suppress errors if condition fails (race condition/idempotency)', async () => {
      mockDynamoClient.send.mockRejectedValueOnce(new Error('ConditionalCheckFailedException'))

      // Should not throw
      await service.updatePlayerResolvedGuess('p1', 'g1', 1)

      expect(mockDynamoClient.send).toHaveBeenCalled()
    })
  })
})
