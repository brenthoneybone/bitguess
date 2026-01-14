<script lang="ts">
  import { useBinanceUtil } from '$utils/useBinanceUtil.svelte'
  import NumberFlow from '@number-flow/svelte'
  import { fly } from 'svelte/transition'

  const binanceUtil = useBinanceUtil()

  binanceUtil.connect()
  const { btcPrice } = $derived(binanceUtil)
</script>

<div class="relative w-full text-center">
  <div in:fly={{ y: -10 }} out:fly={{ y: 10 }}>
    <span class="font-light opacity-50">USD</span>
    <NumberFlow
      class="font-mono font-black tracking-tight"
      value={btcPrice?.toFixed(2) ?? 'Loading'}
      locales="en-US"
      format={{ style: 'currency', currency: 'USD' }}
    />
  </div>
</div>
