import type { Guess, Player, PendingGuessConflict, Direction } from '@bitguess/api-types'
import createClient from 'openapi-fetch'
import type { paths } from '@bitguess/api-types/openapi'
import { PUBLIC_API_BASE_URL } from '$env/static/public'

const BASE_URL = PUBLIC_API_BASE_URL ?? 'http://localhost:3000'

const EndPoints = {
  CREATE_PLAYER: '/v1/players',
  GET_PLAYER: '/v1/players/{playerToken}',
  GET_GUESS: '/v1/players/{playerToken}/guesses/{guessId}',
  CREATE_GUESS: '/v1/players/{playerToken}/guesses',
} as const

export const useBitGuessApiService = (opts?: { fetch?: typeof fetch }) => {
  const api = createClient<paths>({
    baseUrl: BASE_URL,
    fetch: opts?.fetch ?? fetch,
  })

  const createPlayer = async () => {
    const { data, error, response } = await api.POST(EndPoints.CREATE_PLAYER, {})

    if (error || !response.ok) {
      throw new Error(`createPlayer failed (${response.status}): ${JSON.stringify(error)}`)
    }

    return data as Player
  }

  const getPlayer = async (playerToken: string) => {
    const { data, error, response } = await api.GET(EndPoints.GET_PLAYER, {
      params: { path: { playerToken } },
    })

    if (error || !response.ok) {
      throw new Error(`getPlayer failed (${response.status}): ${JSON.stringify(error)}`)
    }
    return data as Player
  }

  const getGuess = async (playerToken: string, guessId: string) => {
    const { data, error, response } = await api.GET(EndPoints.GET_GUESS, {
      params: { path: { playerToken, guessId } },
    })

    if (error) {
      throw new Error(`getGuess failed (${response.status}): ${JSON.stringify(error)}`)
    }
    return data as Guess
  }

  const createGuess = async (playerToken: string, direction: Direction) => {
    const { data, error, response } = await api.POST(EndPoints.CREATE_GUESS, {
      params: { path: { playerToken } },
      body: { direction },
    })

    if (response?.status === 409) return (error || data) as unknown as PendingGuessConflict
    if (error) {
      throw new Error(`createGuess failed (${response.status}): ${JSON.stringify(error)}`)
    }

    return data as Guess
  }

  return { getPlayer, getGuess, createGuess, createPlayer }
}
