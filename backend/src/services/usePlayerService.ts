import type { Player } from '@bitguess/api-types'
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { useDynamoUtil } from '$utils/useDynamoUtil'
import crypto from 'crypto'

const dynamoUtil = useDynamoUtil()
const dynamo = dynamoUtil.getClient()
const tableName = process.env.PLAYERS_TABLE ?? 'Players'

const getOrCreatePlayer = async (playerId: string): Promise<Player> => {
  const existing = await getPlayer(playerId)
  if (existing) return existing

  const player: Player = { id: playerId, score: 0, pendingGuessId: null }
  await createIfMissing(player)
  return (await getPlayer(playerId)) ?? player
}

const createPlayer = async (): Promise<Player> => {
  const id = crypto.randomUUID()
  const player: Player = { id, score: 0, pendingGuessId: null }

  await createIfMissing(player)
  return player
}

const getPlayer = async (id: string) => {
  const res = await dynamo.send(new GetCommand({ TableName: tableName, Key: { id } }))
  return (res.Item as Player) ?? null
}

const createIfMissing = async (player: Player) => {
  await dynamo
    .send(
      new PutCommand({
        TableName: tableName,
        Item: player,
        ConditionExpression: 'attribute_not_exists(id)',
      }),
    )
    .catch(() => {
      // ignore race
    })
}

const setPlayerPendingGuess = async (playerId: string, guessId: string) => {
  await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id: playerId },
      UpdateExpression: 'SET pendingGuessId = :gid',
      ConditionExpression:
        'attribute_not_exists(pendingGuessId) OR pendingGuessId = :null OR pendingGuessId = :gid',
      ExpressionAttributeValues: {
        ':gid': guessId,
        ':null': null,
      },
    }),
  )
}

const updatePlayerResolvedGuess = async (
  playerId: string,
  guessId: string,
  delta: null | -1 | 0 | 1,
) => {
  await dynamo
    .send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: playerId },
        UpdateExpression:
          'SET score = if_not_exists(score, :zero) + :delta, pendingGuessId = :null',
        ConditionExpression: 'pendingGuessId = :gid',
        ExpressionAttributeValues: {
          ':gid': guessId,
          ':delta': delta,
          ':zero': 0,
          ':null': null,
        },
      }),
    )
    .catch(() => {
      // pendingGuessId changed; ignore
    })
}

export const usePlayerService = () => ({
  getOrCreatePlayer,
  createPlayer,
  setPlayerPendingGuess,
  updatePlayerResolvedGuess,
})
