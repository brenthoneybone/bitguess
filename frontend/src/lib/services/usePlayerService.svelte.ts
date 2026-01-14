import type { Player } from '@bitguess/api-types'
import { useBitGuessApiService } from '$services/useBitGuessApiService'

let player: Player | undefined = $state()

const getTokenFromStorage = () => {
  const token = localStorage.getItem('playerToken')
  return token
}

const saveTokenToStorage = (token: string) => {
  localStorage.setItem('playerToken', token)
}

const getPlayerToken = () => {
  const token = getTokenFromStorage()

  if (!token) throw new Error('No player token found in storage')

  return token
}

export const usePlayerService = (opts?: { fetch?: typeof fetch }) => {
  const bitGuessApiService = useBitGuessApiService({ fetch: opts?.fetch ?? fetch })

  const createPlayer = async () => {
    const createdPlayer = await bitGuessApiService.createPlayer()
    saveTokenToStorage(createdPlayer.id)
    return createdPlayer
  }

  const ensurePlayer = async () => {
    const playerId = getTokenFromStorage()
    let p: Player | undefined

    if (!playerId) {
      p = await createPlayer()
    } else {
      p = await bitGuessApiService.getPlayer(playerId)
    }

    player = p

    return player
  }

  const fetchPlayer = async () => {
    player = await bitGuessApiService.getPlayer(getPlayerToken())

    return player
  }

  return {
    ensurePlayer,
    getPlayerToken,
    fetchPlayer,
    get player() {
      return player
    },
  }
}
