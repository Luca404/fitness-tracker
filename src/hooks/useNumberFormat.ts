import { useMemo, useSyncExternalStore } from 'react'
import { formatDecimal as format } from '../utils/decimal'
import { getDecimalSeparator, setDecimalSeparator, subscribeNumberPreferences } from '../utils/numberPreferences'

export function useNumberFormat() {
  const decimalSeparator = useSyncExternalStore(subscribeNumberPreferences, getDecimalSeparator, () => '.' as const)
  return useMemo(() => ({
    decimalSeparator,
    setDecimalSeparator,
    formatDecimal: (value: number, places = 1) => format(value, places, decimalSeparator),
    formatNumericText: (text: string) => text.replace(/(\d)\.(?=\d)/g, `$1${decimalSeparator}`),
  }), [decimalSeparator])
}
