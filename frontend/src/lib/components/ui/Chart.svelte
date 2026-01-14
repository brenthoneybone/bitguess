<script lang="ts">
  import * as echarts from 'echarts'

  type EChartsOption = echarts.EChartsOption

  let props: {
    data: [Date, number][]
    guess?: number
  } = $props()
  let myChart: echarts.ECharts | undefined
  let id = crypto.randomUUID()

  const PRICE_LINE_COLOR = 'rgba(255, 255, 255, 0.6)'
  const PRICE_LINE_WIDTH = 3

  const options: EChartsOption = {
    animation: false,
    animationDuration: 300,
    animationEasing: 'linear',
    animationDurationUpdate: 300,
    animationEasingUpdate: 'linear',
    grid: {
      left: 0,
      right: 0,
      top: 5,
      bottom: 5,
    },
    xAxis: {
      show: false,
      type: 'time',

      splitLine: {
        show: false,
      },
    },
    yAxis: {
      show: false,
      type: 'value',
      scale: true,
      splitLine: {
        show: false,
      },
      min: (value) => {
        let min = value.min
        let max = value.max
        if (props.guess != null) {
          min = Math.min(min, props.guess)
          max = Math.max(max, props.guess)
        }
        const range = max - min || min * 0.001
        return min - range * 0.1
      },
      max: (value) => {
        let min = value.min
        let max = value.max
        if (props.guess != null) {
          min = Math.min(min, props.guess)
          max = Math.max(max, props.guess)
        }
        const range = max - min || max * 0.001
        return max + range * 0.1
      },
    },
    series: [
      {
        name: 'BTC Price',
        type: 'line',
        showSymbol: false,
        smooth: true,
        itemStyle: {
          color: PRICE_LINE_COLOR,
        },
        lineStyle: {
          width: PRICE_LINE_WIDTH,
        },
        data: [],
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed' },
          data: [],
        },
      },
    ],
  }

  const onWindowResize = () => {
    myChart?.resize()
  }

  $effect(() => {
    let chartDom = document.getElementById(id)!
    myChart = echarts.init(chartDom)
    myChart.setOption(options)

    window.addEventListener('resize', onWindowResize)

    return () => {
      myChart?.dispose()
      window.removeEventListener('resize', onWindowResize)
    }
  })

  $effect(() => {
    if (!myChart) return

    const priceSeriesData = props.data.map((d: [Date, number]) => [+d[0], d[1]])

    myChart.setOption(
      {
        series: [
          {
            data: priceSeriesData,
            markLine:
              props.guess != null
                ? {
                    silent: true,
                    symbol: 'none',
                    lineStyle: { type: 'dashed' },
                    data: [{ yAxis: props.guess }],
                  }
                : { data: [] },
          },
        ],
      },
      { notMerge: false },
    )
  })
</script>

<div {id} class="h-full w-full"></div>
