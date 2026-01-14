<script lang="ts">
  import { useGameService } from '$services/useGameService.svelte'
  import { CONFIG } from '@bitguess/config'
  import { useBinanceUtil } from '$utils/useBinanceUtil.svelte'
  import NumberFlow from '@number-flow/svelte'
  import clsx from 'clsx'
  import { useArcUtil } from '$utils/useArcUtil'
  import Chart from '$components/ui/Chart.svelte'
  import { Tween } from 'svelte/motion'
  import { cubicOut } from 'svelte/easing'
  import BitcoinTicker from '$components/BitcoinTicker.svelte'
  import { DirectionOption } from '@bitguess/api-types'

  const gameService = useGameService()
  const binanceUtil = useBinanceUtil()
  const arcUtil = useArcUtil()

  const ARC_SIZE = 240
  const ARC_STROKE_WIDTH = 16
  const StatusColors = {
    [DirectionOption.UP]: 'text-emerald-500',
    [DirectionOption.DOWN]: 'text-red-500',
    NEUTRAL: 'text-orange-500',
  } as const

  let now = $state(Date.now())

  const startedAt = $derived.by(() => gameService.currentGuess?.createdAt ?? Date.now())
  const resolveAfterMs = $derived(
    (gameService.currentGuess?.resolveAfter ?? startedAt + CONFIG.game.time * 1000) as number,
  )
  const totalDurationMs = $derived(Math.max(resolveAfterMs - startedAt, 1_000))
  const remainingMs = $derived(Math.max(resolveAfterMs - now, 0))
  const countDownTime = $derived(
    Math.min(Math.ceil(remainingMs / 1000), Math.ceil(totalDurationMs / 1000)),
  )
  const currentGuessDelta = $derived.by(() => {
    if (binanceUtil.btcPrice === null || !gameService.currentGuess) return 0
    return binanceUtil.btcPrice - gameService.currentGuess.startValue
  })
  const currentGuessValue = $derived(gameService.currentGuess?.startValue)
  const currentGuessDirection = $derived(gameService.currentGuess?.direction)

  const currentGuessColor = $derived.by(() => {
    if (currentGuessDelta === 0) {
      return StatusColors.NEUTRAL
    }

    if (
      (currentGuessDelta > 0 && currentGuessDirection === DirectionOption.UP) ||
      (currentGuessDelta < 0 && currentGuessDirection === DirectionOption.DOWN)
    ) {
      return StatusColors[DirectionOption.UP]
    }

    return StatusColors[DirectionOption.DOWN]
  })

  type ProgressArcConfig = {
    size: number
    strokeWidth: number
    trackClasses: string[]
    trackStyle: string
    barClasses: string[]
    barStyle: string
    caps: 'round' | 'inherit' | 'butt' | 'square'
  }

  const defaultArcConfig: ProgressArcConfig = {
    size: ARC_SIZE,
    strokeWidth: ARC_STROKE_WIDTH,
    trackClasses: ['stroke-white/20'],
    trackStyle: '',
    barClasses: ['stroke-white'],
    barStyle: '',
    caps: 'round',
  }

  const progressValue = $derived.by(() => {
    const percentage = Math.min(1 - remainingMs / totalDurationMs, 1)
    return 0 + percentage * 359
  })

  const tweenedProgressValue = new Tween(0, {
    duration: 300,
    easing: cubicOut,
  })

  $effect(() => {
    if (!gameService.currentGuess) {
      gameService.gameState = gameService.GameState.PENDING_GUESS
    }
  })

  $effect(() => {
    const interval = setInterval(() => {
      now = Date.now()
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  })

  $effect(() => {
    if (remainingMs <= 0) {
      gameService.gameState = gameService.GameState.RESOLVING
    }
  })

  $effect(() => {
    tweenedProgressValue.target = progressValue
  })
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
  <div
    class="flex w-full grow flex-col items-center justify-center gap-4 py-[var(--page-padding)] text-center"
  >
    <div class="relative h-48 w-48">
      <div class="absolute inset-0 flex items-center justify-center font-mono text-7xl font-black">
        <NumberFlow value={countDownTime} />
      </div>
      <svg
        viewBox="0 0 240 {defaultArcConfig.size + defaultArcConfig.strokeWidth / 2}"
        width="100%"
      >
        <path
          fill="none"
          class={defaultArcConfig.trackClasses.join(' ')}
          style={defaultArcConfig.trackStyle}
          stroke-width={defaultArcConfig.strokeWidth}
          stroke-linecap={defaultArcConfig.caps}
          shape-rendering="auto"
          d={arcUtil.generateArc(
            defaultArcConfig.size / 2,
            defaultArcConfig.size / 2,
            defaultArcConfig.size / 2 - defaultArcConfig.strokeWidth / 2,
            0,
            359,
          )}
        />
        <path
          fill="none"
          class={defaultArcConfig.barClasses.join(' ')}
          style={defaultArcConfig.barStyle}
          stroke-width={defaultArcConfig.strokeWidth}
          stroke-linecap={defaultArcConfig.caps}
          shape-rendering="auto"
          d={arcUtil.generateArc(
            defaultArcConfig.size / 2,
            defaultArcConfig.size / 2,
            defaultArcConfig.size / 2 - defaultArcConfig.strokeWidth / 2,
            0,
            tweenedProgressValue.current,
          )}
        />
      </svg>
    </div>
    <div class="inline-block rounded-full bg-white px-8 pt-0.5 pb-1">
      <NumberFlow
        value={currentGuessDelta}
        locales="en-US"
        format={{
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 2,
          signDisplay: 'always',
        }}
        class={clsx(
          'font-mono text-lg font-bold tracking-tighter transition-colors duration-300',
          currentGuessColor,
        )}
      />
    </div>
  </div>
  <div class="flex w-full flex-col items-center gap-6 text-center">
    <div class="h-40 w-full">
      <Chart guess={currentGuessValue} data={binanceUtil.btcHistory.slice(-20)} />
    </div>
    <div class=" p-[var(--page-padding)] pt-0">
      <div class="flex flex-col items-center">
        <div class="text-3xl"><BitcoinTicker /></div>
        <div>
          your guess was BTC would go <span class="font-bold">{currentGuessDirection}</span> from
          <span class="opacity-50">USD</span><span class="font-mono font-bold"
            ><NumberFlow
              value={currentGuessValue}
              locales="en-US"
              format={{ style: 'currency', currency: 'USD' }}
            /></span
          >
        </div>
      </div>
    </div>
  </div>
</div>
