<script lang="ts">
  import Loader from '$components/ui/Loader.svelte'
  import Logo from '$components/Logo.svelte'
  import { useGameService } from '$services/useGameService.svelte'
  import { usePlayerService } from '$services/usePlayerService.svelte'
  import { useBinanceUtil } from '$utils/useBinanceUtil.svelte'
  import { onDestroy, onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  const playerService = usePlayerService()
  const binanceUtil = useBinanceUtil()
  const gameService = useGameService()

  const btcPrice = $derived(binanceUtil.btcPrice)

  const canContinueToPendingGuess = $derived(
    btcPrice !== null && playerService.player && !gameService.currentGuess,
  )
  const canContinueToRunning = $derived(
    btcPrice !== null && playerService.player && gameService.currentGuess,
  )
  let canShow: boolean = $state(false)
  let timeout: ReturnType<typeof setTimeout>

  onMount(async () => {
    try {
      // prevent flicker for fast connections
      timeout = setTimeout(() => {
        canShow = true
      }, 250)

      // handle binance connection errors
      binanceUtil.connect((error) => {
        console.error('Binance connection error:', error)
        gameService.gameState = gameService.GameState.ERROR
      })

      // fetch player
      await playerService.ensurePlayer()

      // handle pending guess if applicable
      if (playerService.player?.pendingGuessId) {
        const guess = await gameService.getGuess(
          playerService.player.id,
          playerService.player.pendingGuessId,
        )

        gameService.currentGuess = guess
      }
    } catch (error) {
      console.error('Error during initialization:', error)
      gameService.gameState = gameService.GameState.ERROR
    }
  })

  onDestroy(() => {
    clearTimeout(timeout)
  })

  $effect(() => {
    if (canContinueToPendingGuess) {
      gameService.gameState = gameService.GameState.PENDING_GUESS
    }
  })

  $effect(() => {
    if (canContinueToRunning) {
      gameService.resumeGame(gameService.currentGuess!)
    }
  })
</script>

{#if canShow}
  <div transition:fade class="flex h-full flex-col items-center justify-center gap-3 pt-14">
    <Logo class="w-48" />
    <div class="flex items-center gap-2">
      <Loader size={12} />
      <p class="animate-pulse pb-0.5">loading. please wait</p>
    </div>
  </div>
{/if}
