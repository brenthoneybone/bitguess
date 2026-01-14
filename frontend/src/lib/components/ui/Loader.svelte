<script lang="ts">
  const { size }: { size: number } = $props()
</script>

<span class="relative flex" style="width: {size}px; height: {size}px;">
  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75"
  ></span>
  <span
    class="relative inline-flex rounded-full bg-current"
    style="width: {size}px; height: {size}px;"
  ></span>
</span>
