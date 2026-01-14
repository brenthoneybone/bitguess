import { WebsocketClient, WS_KEY_MAP } from 'binance'
import type { ValueOf } from 'type-fest'

const BinanceState = {
  DISCONNECTED: 'disconnected',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
} as const

let btcPrice: number | null = $state(null)
let btcHistory: [Date, number][] = $state([])
let btcWsState: ValueOf<typeof BinanceState> = $state(BinanceState.DISCONNECTED)
let wsClient: WebsocketClient | null = null

const HISTORY_LENGTH = 100
const WS_TOPIC = 'btcusdt@miniTicker'

const createClient = () => {
  return new WebsocketClient({ beautify: true })
}

const setBtcWsState = (newState: ValueOf<typeof BinanceState>) => {
  btcWsState = newState
}

const addListeners = (client: WebsocketClient, onError?: (error: unknown) => void) => {
  client.on('open', () => {
    setBtcWsState(BinanceState.CONNECTED)
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.on('formattedMessage', (data: any) => {
    const rawPrice = data.close
    const rawTime = data.eventTime

    if (rawPrice == null || rawTime == null) return

    const price = Number(rawPrice)
    const time = new Date(Number(rawTime))

    if (!Number.isFinite(price)) return

    btcPrice = price
    btcHistory = [...btcHistory.slice(-(HISTORY_LENGTH - 1)), [time, price]]
  })

  client.on('reconnecting', () => {
    setBtcWsState(BinanceState.RECONNECTING)
  })

  client.on('reconnected', () => {
    setBtcWsState(BinanceState.CONNECTED)
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.on('exception', (data: { wsKey?: string; error?: any }) => {
    console.error('ws error', data?.wsKey, data?.error)
    setBtcWsState(BinanceState.DISCONNECTED)
    onError?.(data?.error)
  })
}

const connect = (onError?: (error: unknown) => void) => {
  if (wsClient) return // prevent double-connect

  wsClient = createClient()
  addListeners(wsClient, onError)

  wsClient.subscribe(WS_TOPIC, WS_KEY_MAP.main)
}

const disconnect = () => {
  wsClient?.closeAll?.()
  wsClient = null
  setBtcWsState(BinanceState.DISCONNECTED)
}

export const useBinanceUtil = () => ({
  connect,
  disconnect,
  get btcPrice() {
    return btcPrice
  },
  get btcHistory() {
    return btcHistory
  },
  get btcWsState() {
    return btcWsState
  },
})
