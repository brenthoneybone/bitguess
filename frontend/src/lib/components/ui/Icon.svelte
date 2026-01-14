<script lang="ts">
  import { useClassMergeUtil } from '$utils/useClassMergeUtil'

  const { merge } = useClassMergeUtil()

  let {
    class: klass,
    style,
    symbol,
    fill = false,
    weight = 400,
    grade = 0,
    opticalSize = 24,
  }: {
    class?: string
    style?: string
    symbol: string
    fill?: boolean
    weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
    grade?: -25 | 0 | 200
    opticalSize?: 20 | 24 | 40 | 48
  } = $props()
</script>

<span
  style={`font-variation-settings: "FILL" ${
    fill ? 1 : 0
  }, "wght" ${weight}, "GRAD" ${grade}, "opsz" ${opticalSize}; ${style || ''}`}
  class={merge('icon', 'block', 'font-icon', 'font-normal', 'lowercase', 'leading-none', klass)}
  >{symbol.replaceAll('-', '_')}</span
>
