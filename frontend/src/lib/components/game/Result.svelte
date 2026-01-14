<script lang="ts">
  import Button from '$components/ui/Button.svelte'
  import Heading from '$components/ui/Heading.svelte'
  import { useGameService } from '$services/useGameService.svelte'
  import { usePlayerService } from '$services/usePlayerService.svelte'
  import NumberFlow from '@number-flow/svelte'

  const gameService = useGameService()
  const playerService = usePlayerService()

  const guess = $derived(gameService.currentGuess)
  const playerScore = $derived(playerService.player?.score ?? 0)
  let timer: ReturnType<typeof setTimeout>
  let displayedScore = $state(
    (playerService.player?.score ?? 0) - (gameService.currentGuess?.delta ?? 0),
  )

  const resultText = $derived.by(() => {
    if (!guess) {
      return 'No Guess Found'
    }

    if ((guess?.delta ?? 0) > 0) {
      return 'Correct!'
    } else if ((guess?.delta ?? 0) < 0) {
      return 'Oh no!'
    } else {
      return 'Tie!'
    }
  })

  const playAgain = () => {
    gameService.startNewRound()
  }

  $effect(() => {
    if (guess) {
      timer = setTimeout(() => {
        displayedScore = playerScore
      }, 1000)
    }

    return () => {
      clearTimeout(timer)
    }
  })
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
  <div
    class="flex w-full grow flex-col items-center justify-center gap-4 py-[var(--page-padding)] text-center"
  >
    <h1
      class="font-main text-6xl leading-6 font-black uppercase md:text-7xl md:leading-7 xl:text-8xl xl:leading-10"
    >
      {resultText}
    </h1>
    <p>
      BTC went from <span class="opacity-50">USD</span><span class="font-mono font-bold"
        ><NumberFlow
          value={guess?.startValue}
          locales="en-US"
          format={{ style: 'currency', currency: 'USD' }}
        /></span
      >
      to <span class="opacity-50">USD</span><span class="font-mono font-bold"
        ><NumberFlow
          value={guess?.endValue}
          locales="en-US"
          format={{ style: 'currency', currency: 'USD' }}
        /></span
      >
    </p>
  </div>
  <div class="flex w-full flex-col items-center gap-6 p-[var(--page-padding)] pt-0">
    <div class="flex w-full max-w-lg flex-col gap-4 rounded-lg bg-white/10 p-4 pt-6 text-center">
      <div>
        <Heading text="Your Score" />
        <div class="flex justify-center font-mono text-8xl font-black tracking-tighter">
          <NumberFlow value={displayedScore} />
        </div>
      </div>
      <div class="flex justify-stretch gap-2">
        <Button icon="autoplay" text="Play again?" onclick={() => playAgain()} />
      </div>
    </div>
  </div>
</div>
