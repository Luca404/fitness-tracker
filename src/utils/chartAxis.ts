export interface ChartAxisOptions {
  height?: number
  reservedHeight?: number
  minimumStep?: number
  includeZero?: boolean
}

/** Even, readable ticks fitted to the plot height, without cropping data. */
export function buildChartAxis(values: (number | null | undefined)[], {
  height = 200, reservedHeight = 40, minimumStep = 0.1, includeZero = false,
}: ChartAxisOptions = {}): { domain: [number, number]; ticks: number[] } {
  const finite = values.filter((value): value is number => value != null && Number.isFinite(value))
  const minimum = finite.length ? Math.min(...finite) : 0
  const maximum = finite.length ? Math.max(...finite) : minimumStep * 5
  const padding = Math.max((maximum - minimum) * 0.06, maximum === minimum ? Math.max(minimumStep * 2, Math.abs(maximum) * 0.02) : minimumStep)
  const lower = includeZero ? Math.min(0, minimum - padding) : minimum >= 0 ? Math.max(0, minimum - padding) : minimum - padding
  const upper = Math.max(lower + minimumStep, maximum + padding)
  const budget = Math.max(4, Math.min(14, Math.floor((height - reservedHeight) / 22) + 1))
  const exponent = Math.floor(Math.log10((upper - lower) / (budget - 1)))
  const steps = [-1, 0, 1, 2].flatMap(offset => [1, 2, 2.5, 4, 5, 10].map(factor => factor * 10 ** (exponent + offset)))
    .filter(step => step >= minimumStep && Math.abs(step / minimumStep - Math.round(step / minimumStep)) < 1e-7)
    .sort((a, b) => a - b)
  for (const step of steps) {
    const start = Math.floor(lower / step + 1e-9) * step
    const end = Math.ceil(upper / step - 1e-9) * step
    const count = Math.round((end - start) / step) + 1
    if (count > budget || count < 2) continue
    const ticks = Array.from({ length: count }, (_, index) => Number((start + index * step).toFixed(8)))
    return { domain: [ticks[0], ticks.at(-1)!], ticks }
  }
  return { domain: [lower, upper], ticks: [lower, upper] }
}

export const chartTooltipStyle = {
  backgroundColor: '#111827',
  color: '#e5e7eb',
  border: '1px solid #374151',
  borderRadius: 12,
  fontSize: 12,
}
