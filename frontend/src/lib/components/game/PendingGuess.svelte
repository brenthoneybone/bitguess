<script lang="ts">
  import { DirectionOption, type Direction } from '@bitguess/api-types'
  import BitcoinTicker from '$components/BitcoinTicker.svelte'
  import { useGameService } from '$services/useGameService.svelte'
  import type { ValueOf } from 'type-fest'
  import { usePlayerService } from '$services/usePlayerService.svelte'
  import { CONFIG } from '@bitguess/config'
  import Heading from '$components/ui/Heading.svelte'
  import Button from '$components/ui/Button.svelte'
  import Chart from '$components/ui/Chart.svelte'
  import { useBinanceUtil } from '$utils/useBinanceUtil.svelte'
  import { fade } from 'svelte/transition'

  const gameService = useGameService()
  const playerService = usePlayerService()
  const binanceUtil = useBinanceUtil()

  const stepStates = {
    PENDING_GUESS: 'pending guess',
    REGISTERING_GUESS: 'registering guess',
  } as const

  let stepState: ValueOf<typeof stepStates> = $state('pending guess')

  let makeGuessElement = $state<HTMLDivElement>()
  let containerHeight = $state(0)

  const handleExistingGuess = async () => {
    // make sure player isn't stale
    await playerService.fetchPlayer()

    // load the pending guess and try resume the game, otherwise, let the player make a new guess
    // @todo should probably add a toast or some UI to inform the player why they transitioned to
    // pending guess in this edgecase
    if (playerService.player?.pendingGuessId) {
      const guess = await gameService.getGuess(
        playerService.getPlayerToken(),
        playerService.player.pendingGuessId,
      )
      gameService.resumeGame(guess)
    } else {
      stepState = stepStates.PENDING_GUESS
    }
  }

  const makeGuess = async (direction: Direction) => {
    if (makeGuessElement) {
      containerHeight = makeGuessElement.offsetHeight
    }

    stepState = stepStates.REGISTERING_GUESS

    const result = await gameService.makeGuess(playerService.getPlayerToken(), direction)

    if (result && 'id' in result) {
      gameService.resumeGame(result)
      return
    }

    if (result && 'pendingGuessId' in result) {
      await handleExistingGuess()
      return
    }

    stepState = stepStates.PENDING_GUESS
  }
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
  <div class="flex w-full grow flex-col items-center justify-center text-center">
    <div class="h-56 w-full md:h-60 xl:h-72">
      <Chart data={binanceUtil.btcHistory.slice(-60)} />
    </div>
    <div class="px-[var(--page-padding)] pt-6">
      <p class="-mb-3">current Bitcoin price</p>
      <div class="text-4xl md:text-7xl xl:text-8xl">
        <BitcoinTicker />
      </div>
    </div>
  </div>
  <div class="grid w-full place-items-center items-center gap-6 p-[var(--page-padding)]">
    {#if stepState === stepStates.PENDING_GUESS}
      <div
        bind:this={makeGuessElement}
        class="col-span-full row-span-full flex w-full max-w-lg flex-col gap-4 rounded-lg bg-white/10 p-4 pt-6 text-center"
        transition:fade
      >
        <div>
          <Heading text="Make Your Guess" />
          <p>in <span class="font-bold">{CONFIG.game.time}</span> seconds the BTC price will go:</p>
        </div>
        <div class="flex justify-stretch gap-2">
          <Button
            text="Down"
            icon="trending-down"
            onclick={() => makeGuess(DirectionOption.DOWN)}
          />
          <Button text="Up" icon="trending-up" onclick={() => makeGuess(DirectionOption.UP)} />
        </div>
      </div>
    {:else}
      <div
        class="col-span-full row-span-full flex w-full max-w-lg flex-col items-center justify-center gap-4 rounded-lg bg-white/10 p-4 pt-6 text-center"
        style="height: {containerHeight}px"
        transition:fade
      >
        <div>
          <Heading text="Get ready..." />
          <p>guess is being registered</p>
        </div>
      </div>
    {/if}
  </div>
</div>
