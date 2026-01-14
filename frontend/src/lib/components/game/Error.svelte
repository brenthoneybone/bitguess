<script lang="ts">
  import Heading from '$components/ui/Heading.svelte'
  import Button from '$components/ui/Button.svelte'

  const reload = () => {
    window.location.reload()
  }
</script>

<div class="flex h-full flex-col items-center justify-center gap-6 p-4 text-center">
  <div>
    <Heading text="Oh no..." />
    <p>Something went wrong. Please try reloading the page or try again later.</p>
  </div>
  <div class="w-full max-w-xs">
    <Button text="Reload" onclick={reload} />
  </div>
</div>
