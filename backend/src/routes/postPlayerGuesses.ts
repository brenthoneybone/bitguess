import { useGuessService } from '$services/useGuessService'
import { Handler } from '.'
import { useJsonUtil } from '$utils/useJsonUtil'
import { usePlayerService } from '$services/usePlayerService'

const jsonUtil = useJsonUtil()
const guessService = useGuessService()
const playerService = usePlayerService()

const parseBody = (body: string | undefined) => {
  try {
    return body ? JSON.parse(body) : {}
  } catch {
    return null
  }
}

const cleanupFailedGuess = async (playerId: string, guessId: string) => {
  try {
    await guessService.voidGuess(guessId)
    await playerService.updatePlayerResolvedGuess(playerId, guessId, 0)
  } catch (cleanupError) {
    console.error('Cleanup failed', cleanupError)
  }
}

const finalizeGuess = async (playerId: string, guessId: string) => {
  try {
    await Promise.all([
      playerService.setPlayerPendingGuess(playerId, guessId),
      guessService.queueGuessForResolution(guessId),
    ])
    return true
  } catch (error) {
    console.error('Failed to finalize guess, performing cleanup', error)
    await cleanupFailedGuess(playerId, guessId)
    return false
  }
}

export const handler: Handler = async (event, params) => {
  const body = parseBody(event.body)
  if (!body) {
    return jsonUtil.json(400, { error: 'Invalid JSON body' })
  }

  try {
    const player = await playerService.getOrCreatePlayer(params.playerId)

    if (player.pendingGuessId) {
      return jsonUtil.json(409, {
        statusCode: 409,
        message: 'Player already has a pending guess',
        pendingGuessId: player.pendingGuessId,
      })
    }

    const guess = await guessService.createPendingGuess(params.playerId, body.direction)
    const success = await finalizeGuess(params.playerId, guess.id)

    if (!success) {
      return jsonUtil.json(500, { error: 'Failed to process guess' })
    }

    return jsonUtil.json(201, guess)
  } catch (error) {
    console.error('Error creating guess:', error)
    return jsonUtil.json(500, { error: 'Internal Server Error' })
  }
}
