import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-svelte'
import Running from '$components/game/Running.svelte'
import { useGameService } from '$services/useGameService.svelte'
import { useBinanceUtil } from '$utils/useBinanceUtil.svelte'

// Mocks
vi.mock('@bitguess/config', () => ({
  CONFIG: {
    game: {
      time: 10,
    },
  },
}))

vi.mock('$services/useGameService.svelte', () => ({
  useGameService: vi.fn(),
}))

vi.mock('$utils/useBinanceUtil.svelte', () => ({
  useBinanceUtil: vi.fn(),
}))

vi.mock('$utils/useArcUtil', () => ({
  useArcUtil: () => ({
    generateArc: () => 'M 0 0',
  }),
}))

vi.mock('@number-flow/svelte', async () => {
  return await import('./../test/MockNumberflow.svelte')
})

describe('Running Component Time Logic', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockGameService: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockBinanceUtil: any

  beforeEach(() => {
    mockGameService = {
      gameState: 'running',
      currentGuess: null,
      GameState: {
        PENDING_GUESS: 'pending guess',
        RUNNING: 'running',
        RESOLVING: 'resolving',
      },
    }
    vi.mocked(useGameService).mockReturnValue(mockGameService)

    mockBinanceUtil = {
      btcPrice: 50000,
      btcHistory: [],
      connect: vi.fn(),
    }
    vi.mocked(useBinanceUtil).mockReturnValue(mockBinanceUtil)
  })

  // Verifies that the timer handles clock skew by clamping the remaining time to the configured guess time.
  it('clamps countdown time to CONFIG.game.time even if clock drift implies >10s remaining', async () => {
    // Current time
    const now = 100000
    vi.setSystemTime(now)

    const startedAt = 100000
    const resolveAfter = startedAt + 10 * 1000

    mockGameService.currentGuess = {
      createdAt: startedAt,
      resolveAfter: resolveAfter,
      startValue: 50000,
      direction: 'UP',
    }

    // Simulate clock skew: system time is 100ms BEFORE the guess supposedly started
    vi.setSystemTime(startedAt - 100)

    render(Running)

    // Expect to find "10" on the screen.
    const container = document.querySelector('.text-7xl')
    const valueEl = container?.querySelector('[data-testid="number-flow-value"]')

    expect(valueEl?.textContent).toBe('10')
  })

  // Verifies that the timer displays the correct remaining time when system clocks are synchronized.
  it('shows correct time when no skew', async () => {
    const startedAt = 100000
    const resolveAfter = startedAt + 10 * 1000 // 110000

    mockGameService.currentGuess = {
      createdAt: startedAt,
      resolveAfter: resolveAfter,
      startValue: 50000,
      direction: 'UP',
    }

    // 5 seconds in
    vi.setSystemTime(startedAt + 5000)

    render(Running)

    // remaining = 5000 -> 5s
    const container = document.querySelector('.text-7xl')
    const valueEl = container?.querySelector('[data-testid="number-flow-value"]')

    expect(valueEl?.textContent).toBe('5')
  })
})
