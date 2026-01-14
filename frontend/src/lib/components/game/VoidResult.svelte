<script lang="ts">
  import Button from '$components/ui/Button.svelte'
  import { useGameService } from '$services/useGameService.svelte'

  const gameService = useGameService()

  const playAgain = () => {
    gameService.startNewRound()
  }
</script>

<div class="flex h-full w-full max-w-xl flex-col items-center justify-center gap-6 text-center">
  <h1 class="font-main text-xl font-black uppercase md:text-2xl xl:text-5xl">Void Result</h1>

  <p>Unfortunately, your guess could not be resolved. Please try again in the next round.</p>

  <Button icon="autoplay" text="Play again?" onclick={() => playAgain()} />
</div>
