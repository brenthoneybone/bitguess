<script lang="ts">
  let {
    invert,
    variant = 'landscape',
    class: klass,
  }: {
    invert?: boolean
    variant?: 'landscape' | 'square'
    class?: string
  } = $props()

  let color = $derived(invert ? 'fill-[rgb(0,0,0,0.4)]' : 'fill-[rgb(255,255,255,0.2)]')
  let variantViewBox = $derived(variant === 'landscape' ? '0 0 100 40' : '0 0 40 40')
</script>

<div
  class="angle-overlay pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden {klass ||
    ''}"
>
  <svg class="absolute h-full w-full" viewBox={variantViewBox} preserveAspectRatio="none">
    {#if variant == 'landscape'}
      <polygon points="0,0 30,40 0,40" class={color} />
      <polygon points="0,45 80,0 0,0" class={color} />
    {/if}
    {#if variant == 'square'}
      <polygon points="-5,5 25,40 -5,60" class={color} />
      <polygon points="-20,40 40,20 40,40" class={color} />
    {/if}
  </svg>
</div>
