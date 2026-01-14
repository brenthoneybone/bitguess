import { vi, beforeEach, afterEach } from 'vitest'

vi.mock('binance', () => {
  return {
    WebsocketClient: class {
      on = vi.fn()
      subscribe = vi.fn()
      closeAll = vi.fn()
    },
    WS_KEY_MAP: { main: 'main' },
  }
})

const originalError = console.error
const originalWarn = console.warn

// Suppress expected console errors and warnings during tests that lead to a noisey output.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = args.map((a) => (a instanceof Error ? a.message : a?.toString() || '')).join(' ')
    if (
      msg.includes('Connection Failed') ||
      msg.includes('Player fetch failed') ||
      msg.includes('Guess fetch failed') ||
      msg.includes('Test Error')
    ) {
      return
    }
    originalError.call(console, ...args)
  })

  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    const msg = args.map((a) => a?.toString() || '').join(' ')
    if (msg.includes('[ECharts]')) {
      return
    }
    originalWarn.call(console, ...args)
  })
})

afterEach(() => {
  vi.mocked(console.error).mockRestore()
  vi.mocked(console.warn).mockRestore()
})
