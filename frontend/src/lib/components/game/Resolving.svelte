<script lang="ts">
  import Heading from '$components/ui/Heading.svelte'
  import Loader from '$components/ui/Loader.svelte'
  import { useGameService } from '$services/useGameService.svelte'
  import { usePlayerService } from '$services/usePlayerService.svelte'
  import { GuessStatusOption } from '@bitguess/api-types'
  import { onMount } from 'svelte'

  const gameService = useGameService()
  const playerService = usePlayerService()

  onMount(async () => {
    try {
      const result = await gameService.resolveCurrentGuess()

      // update the player score/active guess info
      await playerService.fetchPlayer()

      if (result?.status === GuessStatusOption.RESOLVED) {
        gameService.gameState = gameService.GameState.RESULT
      } else {
        gameService.gameState = gameService.GameState.VOID_RESULT
      }
    } catch {
      gameService.gameState = gameService.GameState.ERROR
    }
  })
</script>

<div class="flex h-full flex-col items-center justify-center gap-6">
  <Loader size={24} />
  <div class="flex flex-col items-center">
    <Heading text="Resolving" />
    <p>please wait while your guess is resolved</p>
  </div>
</div>
