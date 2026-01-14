<script lang="ts">
  import Icon from '$components/ui/Icon.svelte'

  let { text, icon, ...props }: { text: string; icon?: string; onclick?: () => void } = $props()
</script>

<button
  class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-[var(--text-color)] px-4 py-3 font-main font-bold text-[var(--color-1)] uppercase opacity-90 transition-opacity hover:opacity-80"
  {...props}
>
  {#if icon}
    <Icon symbol={icon} weight={700} grade={200} />
  {/if}
  <span>{text}</span>
</button>
