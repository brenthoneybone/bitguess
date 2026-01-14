import { useDynamoUtil } from '$utils/useDynamoUtil'
import { Direction, Guess, DirectionOption, GuessStatusOption } from '@bitguess/api-types'
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { useBitcoinService } from './useBitcoinService'
import { CONFIG } from '@bitguess/config'
import { useSqsUtil } from '$utils/useSqsUtil'
import { SendMessageCommand } from '@aws-sdk/client-sqs'

const dynamo = useDynamoUtil().getClient()
const sqs = useSqsUtil().getClient()
const bitcoinService = useBitcoinService()

const tableName = process.env.GUESSES_TABLE ?? 'Guesses'
const queueUrl = process.env.QUEUE_URL!

const createGuess = async (guess: Guess) => {
  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: guess,
      ConditionExpression: 'attribute_not_exists(id)',
    }),
  )
}

const makeGuessVoid = async (guessId: string, resolvedAt: number) => {
  await dynamo
    .send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: guessId },
        UpdateExpression: 'SET #s = :void, resolvedAt = :ts, delta = :d',
        ConditionExpression: '#s = :pending',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':pending': GuessStatusOption.PENDING,
          ':void': GuessStatusOption.VOID,
          ':ts': resolvedAt,
          ':d': 0,
        },
      }),
    )
    .catch(() => {})
}

const makeGuessResolved = async (
  guessId: string,
  endValue: number,
  delta: number,
  resolvedAt: number,
) => {
  await dynamo
    .send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: guessId },
        UpdateExpression: 'SET #s = :resolved, endValue = :end, delta = :delta, resolvedAt = :ts',
        ConditionExpression: '#s = :pending',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':pending': GuessStatusOption.PENDING,
          ':resolved': GuessStatusOption.RESOLVED,
          ':end': endValue,
          ':delta': delta,
          ':ts': resolvedAt,
        },
      }),
    )
    .catch(() => {
      // already resolved/voided; ignore
    })
}

const computeDelta = (direction: Direction, start: number, end: number): -1 | 0 | 1 => {
  if (end === start) return 0
  const up = end > start
  const won =
    (direction === DirectionOption.UP && up) || (direction === DirectionOption.DOWN && !up)
  return won ? 1 : -1
}

const createPendingGuess = async (playerId: string, direction: Direction) => {
  const startValue = await bitcoinService.getCurrentPrice()
  const id = crypto.randomUUID()
  const now = Date.now()

  const guess: Guess = {
    id,
    playerId,
    startValue,
    direction,
    createdAt: now,
    resolveAfter: now + CONFIG.game.time * 1000,
    resolvedAt: null,
    status: GuessStatusOption.PENDING,
    endValue: null,
    delta: null,
  }

  await createGuess(guess)

  return getGuess(id)
}

const getGuess = async (guessId: string) => {
  const res = await dynamo.send(new GetCommand({ TableName: tableName, Key: { id: guessId } }))
  return (res.Item as Guess) ?? null
}

const queueGuessForResolution = async (guessId: string) => {
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      DelaySeconds: CONFIG.game.time,
      MessageBody: JSON.stringify({ guessId }),
    }),
  )
}

const resolveGuess = async (guessId: string) => {
  const guess = await getGuess(guessId)
  if (!guess) {
    throw new Error(`Guess ${guessId} not found`)
  }

  if (guess.status !== GuessStatusOption.PENDING) {
    console.log(`Guess ${guessId} already resolved`)
    return guess
  }

  if (Date.now() < guess.resolveAfter) {
    throw new Error(
      `Guess ${guessId} cannot be resolved before ${new Date(guess.resolveAfter).toISOString()}`,
    )
  }

  let endValue: number

  try {
    endValue = await bitcoinService.getCurrentPrice()
  } catch {
    await makeGuessVoid(guessId, Date.now())
    return getGuess(guessId)
  }

  const delta = computeDelta(guess.direction, guess.startValue, endValue)
  const resolvedAt = Date.now()

  await makeGuessResolved(guessId, endValue, delta, resolvedAt)

  return getGuess(guessId)
}

const voidGuess = async (guessId: string) => {
  await makeGuessVoid(guessId, Date.now())
  return getGuess(guessId)
}

export const useGuessService = () => ({
  createPendingGuess,
  getGuess,
  queueGuessForResolution,
  resolveGuess,
  voidGuess,
})
