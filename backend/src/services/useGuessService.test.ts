import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGuessService } from './useGuessService'
import { DirectionOption, GuessStatusOption } from '@bitguess/api-types'

// Mocks using vi.hoisted to avoid reference errors
const { mockDynamoClient, mockSqsClient, mockBitcoinService } = vi.hoisted(() => {
  return {
    mockDynamoClient: { send: vi.fn() },
    mockSqsClient: { send: vi.fn() },
    mockBitcoinService: { getCurrentPrice: vi.fn() },
  }
})

// Mock the dependencies
vi.mock('$utils/useDynamoUtil', () => ({
  useDynamoUtil: () => ({
    getClient: () => mockDynamoClient,
  }),
}))

vi.mock('$utils/useSqsUtil', () => ({
  useSqsUtil: () => ({
    getClient: () => mockSqsClient,
  }),
}))

vi.mock('./useBitcoinService', () => ({
  useBitcoinService: () => mockBitcoinService,
}))

describe('useGuessService', () => {
  const service = useGuessService()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})

    process.env.GUESSES_TABLE = 'Guesses'
    process.env.QUEUE_URL = 'http://localhost/queue'
  })

  describe('createPendingGuess', () => {
    // Tests that a new guess is correctly initialized with the current Bitcoin price
    // and stored in DynamoDB with a PENDING status.
    it('should create a pending guess with current bitcoin price', async () => {
      mockBitcoinService.getCurrentPrice.mockResolvedValue(50000)

      const mockedGuess = {
        playerId: 'player-123',
        direction: DirectionOption.UP,
        startValue: 50000,
        status: GuessStatusOption.PENDING,
        delta: null,
      }

      mockDynamoClient.send
        .mockResolvedValueOnce({}) // PutCommand
        .mockResolvedValueOnce({ Item: mockedGuess }) // GetCommand

      const guess = await service.createPendingGuess('player-123', DirectionOption.UP)

      expect(mockBitcoinService.getCurrentPrice).toHaveBeenCalled()

      // Verify DynamoDB PutCommand
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'Guesses',
            Item: expect.objectContaining({
              playerId: 'player-123',
              direction: DirectionOption.UP,
              startValue: 50000,
              status: GuessStatusOption.PENDING,
              delta: null,
            }),
            ConditionExpression: 'attribute_not_exists(id)',
          }),
        }),
      )

      expect(guess).toMatchObject({
        playerId: 'player-123',
        direction: DirectionOption.UP,
        startValue: 50000,
        status: GuessStatusOption.PENDING,
      })
    })
  })

  describe('resolveGuess', () => {
    // Tests the core business logic: If the direction is UP and the price increases,
    // the player should be awarded a win (delta: 1).
    it('should resolve as WIN (1) when UP and price increases', async () => {
      // Mock getGuess
      mockDynamoClient.send
        .mockResolvedValueOnce({
          // For getGuess (initial)
          Item: {
            id: 'guess-1',
            playerId: 'p1',
            startValue: 50000,
            direction: DirectionOption.UP,
            status: GuessStatusOption.PENDING,
            resolveAfter: Date.now() - 1000,
          },
        })
        .mockResolvedValueOnce({}) // For resolve update
        .mockResolvedValueOnce({
          // For getGuess (final)
          Item: {
            id: 'guess-1',
            playerId: 'p1',
            startValue: 50000,
            direction: DirectionOption.UP,
            status: GuessStatusOption.RESOLVED,
            delta: 1,
            endValue: 55000,
          },
        })

      mockBitcoinService.getCurrentPrice.mockResolvedValue(55000)

      const result = await service.resolveGuess('guess-1')

      expect(result.delta).toBe(1)

      // Verify UpdateCommand
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(3)
      const updateCall = mockDynamoClient.send.mock.calls[1][0]
      expect(updateCall.input.UpdateExpression).toContain('SET #s = :resolved')
      expect(updateCall.input.ExpressionAttributeValues[':delta']).toBe(1)
      expect(updateCall.input.ExpressionAttributeValues[':end']).toBe(55000)
    })

    // Tests that if the direction is UP but price decreases, it is a loss (delta: -1).
    it('should resolve as LOSS (-1) when UP and price decreases', async () => {
      mockDynamoClient.send
        .mockResolvedValueOnce({
          Item: {
            id: 'guess-2',
            playerId: 'p1',
            startValue: 50000,
            direction: DirectionOption.UP,
            status: GuessStatusOption.PENDING,
            resolveAfter: Date.now() - 1000,
          },
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          Item: {
            id: 'guess-2',
            delta: -1,
            status: GuessStatusOption.RESOLVED,
          },
        })

      mockBitcoinService.getCurrentPrice.mockResolvedValue(45000)

      const result = await service.resolveGuess('guess-2')

      expect(result.delta).toBe(-1)
    })

    // Tests that if the direction is DOWN and price decreases (shorting), it is a win (delta: 1).
    it('should resolve as WIN (1) when DOWN and price decreases', async () => {
      mockDynamoClient.send
        .mockResolvedValueOnce({
          Item: {
            id: 'guess-3',
            playerId: 'p1',
            startValue: 50000,
            direction: DirectionOption.DOWN,
            status: GuessStatusOption.PENDING,
            resolveAfter: Date.now() - 1000,
          },
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          Item: {
            id: 'guess-3',
            delta: 1,
            status: GuessStatusOption.RESOLVED,
          },
        })

      mockBitcoinService.getCurrentPrice.mockResolvedValue(45000)

      const result = await service.resolveGuess('guess-3')

      expect(result.delta).toBe(1)
    })

    // Tests the "House Edge" or Void logic: If price is exactly the same,
    // it results in a VOID outcome (delta: 0, no score change).
    it('should resolve as VOID (0) when price is unchanged', async () => {
      mockDynamoClient.send
        .mockResolvedValueOnce({
          Item: {
            id: 'guess-4',
            playerId: 'p1',
            startValue: 50000,
            direction: DirectionOption.UP,
            status: GuessStatusOption.PENDING,
            resolveAfter: Date.now() - 1000,
          },
        })
        .mockResolvedValueOnce({}) // For void update
        .mockResolvedValueOnce({
          Item: {
            id: 'guess-4',
            delta: 0,
            status: GuessStatusOption.RESOLVED,
          },
        })

      mockBitcoinService.getCurrentPrice.mockResolvedValue(50000)

      const result = await service.resolveGuess('guess-4')

      expect(result.delta).toBe(0)
    })

    it('should be idempotent: should return immediately if guess is already RESOLVED', async () => {
      // Setup: Return a guess that is already resolved
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: {
          id: 'guess-resolved',
          playerId: 'p1',
          startValue: 50000,
          direction: DirectionOption.UP,
          status: GuessStatusOption.RESOLVED,
          resolveAfter: Date.now() - 1000,
          endValue: 55000,
          delta: 1,
        },
      })

      const result = await service.resolveGuess('guess-resolved')

      // Should return the guess as is
      expect(result.status).toBe(GuessStatusOption.RESOLVED)
      expect(result.delta).toBe(1)

      // Should NOT fetch price again
      expect(mockBitcoinService.getCurrentPrice).not.toHaveBeenCalled()

      // Should NOT call UpdateCommand (only GetCommand was called)
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1)
    })

    it('should use conditional updates to handle race conditions', async () => {
      // Setup: Return a pending guess
      mockDynamoClient.send
        .mockResolvedValueOnce({
          Item: {
            id: 'guess-race',
            playerId: 'p1',
            startValue: 50000,
            direction: DirectionOption.UP,
            status: GuessStatusOption.PENDING,
            resolveAfter: Date.now() - 1000,
          },
        }) // GetCommand
        .mockResolvedValueOnce({}) // UpdateCommand
        .mockResolvedValueOnce({ Item: { id: 'guess-race' } }) // Final GetCommand

      mockBitcoinService.getCurrentPrice.mockResolvedValue(55000)

      await service.resolveGuess('guess-race')

      // Find the update call
      const updateCall = mockDynamoClient.send.mock.calls.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (call: any) => call[0].input.UpdateExpression,
      )

      expect(updateCall).toBeDefined()
      // Verify it enforces status = PENDING
      expect(updateCall![0].input.ConditionExpression).toBe('#s = :pending')
    })
  })
})
