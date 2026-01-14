import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBinanceUtil } from '$utils/useBinanceUtil.svelte'

const mocks = vi.hoisted(() => ({
  on: vi.fn(),
  subscribe: vi.fn(),
  closeAll: vi.fn(),
}))

// Mock the binance library
vi.mock('binance', () => {
  return {
    WebsocketClient: class {
      constructor() {
        return mocks
      }
    },
    WS_KEY_MAP: { main: 'mock' },
  }
})

describe('useBinanceUtil', () => {
  let binanceUtil = useBinanceUtil()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset state/instance if possible, otherwise rely on disconnect
    binanceUtil.disconnect()
    // Re-get the util to ensure fresh state references if needed,
    // though it's a singleton pattern via module state.
    binanceUtil = useBinanceUtil()
  })

  afterEach(() => {
    binanceUtil.disconnect()
  })

  it('calls onError callback when exception event is received', () => {
    const onError = vi.fn()
    binanceUtil.connect(onError)

    // find the 'exception' handler
    const exceptionHandler = mocks.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'exception',
    )?.[1]

    expect(exceptionHandler).toBeDefined()

    // Trigger the exception
    const mockError = new Error('Test Error')
    exceptionHandler({ error: mockError })

    expect(onError).toHaveBeenCalledWith(mockError)
    expect(binanceUtil.btcWsState).toBe('disconnected')
  })

  it('connects and subscribes correctly', () => {
    binanceUtil.connect()
    expect(mocks.subscribe).toHaveBeenCalledWith('btcusdt@miniTicker', 'mock')
  })
})
