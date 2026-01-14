import type { ValueOf } from 'type-fest'
import { useBitGuessApiService } from '$services/useBitGuessApiService'
import { GuessStatusOption, type Guess, type Direction } from '@bitguess/api-types'

const bitGuessApiService = useBitGuessApiService()

const GameState = {
  LOADING: 'loading',
  PENDING_GUESS: 'pending guess',
  RUNNING: 'running',
  RESOLVING: 'resolving',
  RESULT: 'result',
  VOID_RESULT: 'void result',
  ERROR: 'error',
} as const

const RESOLVE_GUESS_TIMEOUT = 30 //seconds

let gameState: ValueOf<typeof GameState> = $state(GameState.LOADING)
let currentGuess: Guess | undefined = $state()

const makeGuess = async (playerToken: string, direction: Direction) => {
  try {
    const result = await bitGuessApiService.createGuess(playerToken, direction)

    return result
  } catch (error) {
    console.error('Error making guess:', error)
  }
}

const getGuess = async (playerToken: string, guessId: string) => {
  return await bitGuessApiService.getGuess(playerToken, guessId)
}

const resolveGuess = async (playerToken: string, guessId: string) => {
  let result: undefined | Guess
  const timeoutAt = Date.now() + RESOLVE_GUESS_TIMEOUT * 1000

  while (!result && Date.now() < timeoutAt) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const guess = await getGuess(playerToken, guessId)

    if (guess.status === GuessStatusOption.RESOLVED || guess.status === GuessStatusOption.VOID) {
      result = guess
      break
    }
  }

  if (!result) {
    gameState = GameState.ERROR
    throw new Error('Timed out waiting for guess resolution')
  }

  currentGuess = result

  return result
}

const resolveCurrentGuess = async () => {
  if (!currentGuess) throw new Error('No current guess to resolve')

  return resolveGuess(currentGuess.playerId, currentGuess.id)
}

const startNewRound = () => {
  currentGuess = undefined
  gameState = GameState.PENDING_GUESS
}

const resumeGame = (guess: Guess) => {
  currentGuess = guess

  if (guess.status === GuessStatusOption.RESOLVED) {
    gameState = GameState.RESULT
  } else if (guess.status === GuessStatusOption.VOID) {
    gameState = GameState.VOID_RESULT
  } else {
    gameState = GameState.RUNNING
  }
}

export const useGameService = () => ({
  get gameState() {
    return gameState
  },
  set gameState(newState: ValueOf<typeof GameState>) {
    gameState = newState
  },
  get currentGuess() {
    return currentGuess
  },
  set currentGuess(guess: Guess | undefined) {
    currentGuess = guess
  },
  GameState,
  makeGuess,
  resolveGuess,
  resolveCurrentGuess,
  startNewRound,
  getGuess,
  resumeGame,
})
