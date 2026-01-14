import type { SQSEvent, SQSRecord } from 'aws-lambda'
import { useGuessService } from '$services/useGuessService'
import { usePlayerService } from '$services/usePlayerService'
import { GuessStatusOption } from '@bitguess/api-types'

const guessService = useGuessService()
const playerService = usePlayerService()

type GuessResolutionPayload = {
  guessId: string
}

const parsePayload = (record: SQSRecord): GuessResolutionPayload | null => {
  try {
    return JSON.parse(record.body ?? '{}') as GuessResolutionPayload
  } catch {
    console.warn('Invalid JSON in SQS message:', record.body)
    return null
  }
}

const handleCleanup = async (guessId: string) => {
  try {
    const guess = await guessService.getGuess(guessId)
    if (guess) {
      let delta = guess.delta ?? 0

      if (guess.status === GuessStatusOption.PENDING) {
        await guessService.voidGuess(guessId)
        delta = 0
        console.log(`Voided pending guess ${guessId}`)
      }

      await playerService.updatePlayerResolvedGuess(guess.playerId, guessId, delta)
      console.log(`Unblocked player ${guess.playerId}`)
    }
  } catch (cleanupError) {
    console.error(`Cleanup failed for ${guessId}:`, cleanupError)
  }
}

const processGuess = async (guessId: string) => {
  console.log('Resolving guess with ID:', guessId)
  try {
    const resolvedGuess = await guessService.resolveGuess(guessId)

    console.log('Updating player with resolved guess delta:', resolvedGuess.delta)

    await playerService.updatePlayerResolvedGuess(
      resolvedGuess.playerId,
      guessId,
      resolvedGuess.delta,
    )

    console.log('Guess resolved:', guessId)
  } catch (error) {
    console.error(`Error processing guess ${guessId}:`, error)
    await handleCleanup(guessId)
  }
}

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const payload = parsePayload(record)
    if (!payload?.guessId) {
      if (payload) console.warn('SQS message missing guessId:', payload)
      continue
    }

    await processGuess(payload.guessId)
  }
}
