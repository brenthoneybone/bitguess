import { Handler } from '.'
import { usePlayerService } from '$services/usePlayerService'
import { useJsonUtil } from '$utils/useJsonUtil'

const jsonUtil = useJsonUtil()
const playerService = usePlayerService()

export const handler: Handler = async () => {
  const player = await playerService.createPlayer()
  return jsonUtil.json(201, player)
}
