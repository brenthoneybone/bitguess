import { useGuessService } from '$services/useGuessService'
import { Handler } from '.'
import { useJsonUtil } from '$utils/useJsonUtil'

const { json } = useJsonUtil()
const guessService = useGuessService()

export const handler: Handler = async (_event, params) => {
  const guess = await guessService.getGuess(params.guessId)

  if (!guess) {
    return json(404, { error: 'Guess not found' })
  }

  return json(200, guess)
}
