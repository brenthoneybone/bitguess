import { Handler } from '.'
import { useJsonUtil } from '$utils/useJsonUtil'

const jsonUtil = useJsonUtil()

export const handler: Handler = async (_event, params) => {
  return jsonUtil.json(200, { playerId: params.playerId })
}
