import { useCallback, useState } from 'react'
import { buildChartAxis, type ChartAxisOptions } from '../utils/chartAxis'

export function useChartAxis(values: (number | null | undefined)[], options: ChartAxisOptions = {}) {
  const [height, setHeight] = useState(200)
  const onResize = useCallback((_width: number, nextHeight: number) => {
    if (nextHeight > 0) setHeight(nextHeight)
  }, [])
  return { axis: buildChartAxis(values, { ...options, height }), onResize }
}
