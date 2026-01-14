import { Handler } from '.'
import { usePlayerService } from '$services/usePlayerService'
import { useJsonUtil } from '$utils/useJsonUtil'

const { json } = useJsonUtil()
const playerService = usePlayerService()

export const handler: Handler = async (_event, params) => {
  const player = await playerService.getOrCreatePlayer(params.playerId)

  return json(200, player)
}
