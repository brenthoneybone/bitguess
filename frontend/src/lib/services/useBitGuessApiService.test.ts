import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBitGuessApiService } from '$services/useBitGuessApiService'
import { DirectionOption } from '@bitguess/api-types'

// Mock generic fetch
const mockFetch = vi.fn()

describe('useBitGuessApiService', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('createPlayer should return new player on success', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'p-new', score: 0, pendingGuessId: null }), {
        status: 201,
      }),
    )

    const service = useBitGuessApiService({ fetch: mockFetch })
    const player = await service.createPlayer()

    expect(player.id).toBe('p-new')
    expect(mockFetch).toHaveBeenCalled()
    const request = mockFetch.mock.calls[0][0] as Request
    expect(request.url).toContain('/v1/players')
    expect(request.method).toBe('POST')
  })

  // getPlayer tests
  // Verifies that getPlayer uses the correct endpoint and returns formatted data on 200 OK.
  it('getPlayer should return player data on success', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'p1', score: 10 }), { status: 200 }),
    )

    const service = useBitGuessApiService({ fetch: mockFetch })
    const player = await service.getPlayer('p1')

    expect(player).toEqual({ id: 'p1', score: 10 })

    expect(mockFetch).toHaveBeenCalled()
    const request = mockFetch.mock.calls[0][0] as Request
    expect(request.url).toContain('/v1/players/p1')
  })

  // Verifies that getPlayer throws an error with status details when the API returns 404.
  it('getPlayer should throw on error', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }),
    )

    const service = useBitGuessApiService({ fetch: mockFetch })

    await expect(service.getPlayer('p1')).rejects.toThrow('getPlayer failed')
  })

  // getGuess tests
  // Verifies that getGuess uses the correct endpoint and returns formatted data on 200 OK.
  it('getGuess should return guess data on success', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'g1', direction: DirectionOption.UP }), { status: 200 }),
    )

    const service = useBitGuessApiService({ fetch: mockFetch })
    const guess = await service.getGuess('p1', 'g1')

    expect(guess).toEqual({ id: 'g1', direction: DirectionOption.UP })
  })

  // Verifies that getGuess throws an error with details when the API returns 500.
  it('getGuess should throw on error', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 }),
    )

    const service = useBitGuessApiService({ fetch: mockFetch })

    await expect(service.getGuess('p1', 'g1')).rejects.toThrow('getGuess failed')
  })

  // createGuess tests
  // Verifies that createGuess POSTs to the correct endpoint and returns data on 201 Created.
  it('createGuess should return guess data on success', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'g2', direction: DirectionOption.DOWN }), { status: 201 }),
    )

    const service = useBitGuessApiService({ fetch: mockFetch })
    const guess = await service.createGuess('p1', DirectionOption.DOWN)

    expect(guess).toEqual({ id: 'g2', direction: DirectionOption.DOWN })

    expect(mockFetch).toHaveBeenCalled()
    const request = mockFetch.mock.calls[0][0] as Request
    expect(request.url).toContain('/v1/players/p1/guesses')
    expect(request.method).toBe('POST')
  })

  // Verifies that createGuess returns the conflict payload (checking both data and error) when 409 Conflict occurred.
  it('createGuess should return conflict data on 409', async () => {
    const conflictData = { message: 'Guess pending', guess: { id: 'pending-g' } }
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(conflictData), { status: 409 }))

    const service = useBitGuessApiService({ fetch: mockFetch })
    const result = await service.createGuess('p1', DirectionOption.UP)

    expect(result).toEqual(conflictData)
  })

  // Verifies that createGuess throws an error for non-409 error statuses.
  it('createGuess should throw on other errors', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Bad Request' }), { status: 400 }),
    )

    const service = useBitGuessApiService({ fetch: mockFetch })

    await expect(service.createGuess('p1', 'UP')).rejects.toThrow('createGuess failed')
  })
})
