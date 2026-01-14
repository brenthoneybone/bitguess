import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { Context } from 'openapi-backend'

import { handler as getPlayerById } from './getPlayerById'
import { handler as getPlayerGuessById } from './getPlayerGuessById'
import { handler as postPlayerGuesses } from './postPlayerGuesses'
import { handler as postPlayers } from './postPlayers'
import { useJsonUtil } from '$utils/useJsonUtil'

const jsonUtil = useJsonUtil()

export type Handler = (
  event: APIGatewayProxyEventV2,
  params: Record<string, string>,
) => Promise<APIGatewayProxyResultV2>

export const ROUTES = {
  createPlayer: async (_c: Context, event: APIGatewayProxyEventV2) => {
    return postPlayers(event, {})
  },
  getPlayer: async (c: Context, event: APIGatewayProxyEventV2) => {
    return getPlayerById(event, { playerId: c.request.params.playerToken as string })
  },
  getGuess: async (c: Context, event: APIGatewayProxyEventV2) => {
    return getPlayerGuessById(event, {
      playerId: c.request.params.playerToken as string,
      guessId: c.request.params.guessId as string,
    })
  },
  createGuess: async (c: Context, event: APIGatewayProxyEventV2) => {
    return postPlayerGuesses(event, { playerId: c.request.params.playerToken as string })
  },
  validationFail: async (c: Context) => {
    return jsonUtil.json(400, { error: c.validation.errors })
  },
  notFound: async () => {
    return jsonUtil.json(404, { error: 'Not Found' })
  },
} as const
