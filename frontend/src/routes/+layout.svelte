<script lang="ts">
  import '$routes/layout.css'
  import favicon from '$lib/assets/favicon.svg'
  import Logo from '$components/Logo.svelte'
  import { usePlayerService } from '$services/usePlayerService.svelte'
  import { useGameService } from '$services/useGameService.svelte'
  import { useThemeUtil } from '$utils/useThemeUtil'
  import { fly } from 'svelte/transition'
  import AngleOverlay from '$components/ui/AngleOverlay.svelte'
  import NumberFlow from '@number-flow/svelte'
  import BitcoinTicker from '$components/BitcoinTicker.svelte'

  const playerService = usePlayerService()
  const gameService = useGameService()
  const themeUtil = useThemeUtil()

  const playerScore = $derived(playerService.player?.score)

  let { children } = $props()

  $effect(() => {
    themeUtil.randomizeTheme()
  })
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>BitGuess</title>
</svelte:head>

<div
  class="pointer-events-none absolute top-0 left-0 grid h-full w-full items-start justify-items-center overflow-hidden"
>
  <AngleOverlay variant="square" class="h-full w-full -scale-100 opacity-20" />
</div>
{#if gameService.gameState !== gameService.GameState.LOADING}
  <div
    transition:fly={{ y: '-100%' }}
    class="absolute top-0 left-0 flex h-8 w-full items-center justify-between bg-white/20 px-[var(--page-padding)] py-1 font-body text-[var(--text-color)]"
  >
    <div>Your score: <span><NumberFlow class="font-mono" value={playerScore} /></span></div>
    <div class="flex items-center gap-2 text-nowrap">
      <span>BTC Price: </span>
      <BitcoinTicker />
    </div>
  </div>
{/if}
<div
  class="flex h-[100dvh] w-[100dvw] flex-col overflow-auto bg-linear-to-bl from-[var(--color-1)] to-[var(--color-2)] pt-8 pb-14 font-body text-[var(--text-color)] transition-colors"
>
  <main class="grow">
    {@render children()}
  </main>
</div>

<div class="absolute bottom-0 left-0 w-full overflow-hidden">
  {#if gameService.gameState !== gameService.GameState.LOADING}
    <footer
      transition:fly={{ y: '100%' }}
      class="flex h-14 justify-center bg-[var(--footer-color)] p-1 text-center text-xs text-zinc-500"
    >
      <Logo class="w-32" />
    </footer>
  {/if}
</div>
