<script lang="ts">
  import { fly } from 'svelte/transition'

  import PendingGuess from '$components/game/PendingGuess.svelte'
  import Result from '$components/game/Result.svelte'
  import Running from '$components/game/Running.svelte'
  import { useGameService } from '$services/useGameService.svelte'
  import Resolving from '$components/game/Resolving.svelte'
  import VoidResult from '$components/game/VoidResult.svelte'
  import Error from '$components/game/Error.svelte'
  import { useBinanceUtil } from '$utils/useBinanceUtil.svelte'
  import Loading from '$components/game/Loading.svelte'

  const gameService = useGameService()
  const binanceUtil = useBinanceUtil()

  binanceUtil.connect((error) => {
    console.error('Binance connection error:', error)
    gameService.gameState = gameService.GameState.ERROR
  })

  const { gameState } = $derived(gameService)
  const { GameState } = gameService

  const GameStateComponentMap = {
    [GameState.LOADING]: Loading,
    [GameState.PENDING_GUESS]: PendingGuess,
    [GameState.RUNNING]: Running,
    [GameState.RESOLVING]: Resolving,
    [GameState.RESULT]: Result,
    [GameState.VOID_RESULT]: VoidResult,
    [GameState.ERROR]: Error,
  } as const

  const GameStateComponent = $derived(GameStateComponentMap[gameState])
</script>

<div
  class="xl:txt-xl relative grid h-full w-full grid-cols-1 grid-rows-1 overflow-hidden text-base md:text-lg"
>
  {#key gameState}
    <div
      in:fly={{ x: 20 }}
      out:fly={{ x: -20 }}
      class="col-span-full row-span-full h-full w-full place-items-center"
    >
      <GameStateComponent />
    </div>
  {/key}
</div>
