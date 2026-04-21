import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { getWeightLogs, upsertWeightLog, deleteWeightLog } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { WeightLog } from '../types'

type Range = '7' | '30' | '90'

function toLocalISODate(d: Date) {
  return d.toLocaleDateString('sv-SE') // YYYY-MM-DD in local timezone
}

export default function WeightPage() {
  const { user } = useAuth()
  const { profile } = useData()

  const [logs, setLogs] = useState<WeightLog[]>([])
  const [range, setRange] = useState<Range>('30')
  const [loading, setLoading] = useState(true)

  const [date, setDate] = useState(toLocalISODate(new Date()))
  const [weightInput, setWeightInput] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - parseInt(range))
    try {
      const data = await getWeightLogs(toLocalISODate(from), toLocalISODate(to))
      setLogs(data)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function handleSave() {
    if (!user || !weightInput) return
    const kg = parseFloat(weightInput)
    if (isNaN(kg) || kg <= 0) return
    setSaving(true)
    try {
      const saved = await upsertWeightLog({ user_id: user.id, date, weight_kg: kg, notes: null })
      setLogs(prev => {
        const filtered = prev.filter(l => l.date !== saved.date)
        return [...filtered, saved].sort((a, b) => a.date.localeCompare(b.date))
      })
      setWeightInput('')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, logDate: string) {
    await deleteWeightLog(id)
    setLogs(prev => prev.filter(l => l.id !== id || l.date !== logDate))
  }

  const latest = logs.at(-1)
  const target = profile?.target_weight_kg

  const chartData = logs.map(l => ({
    date: new Date(l.date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
    kg: l.weight_kg,
  }))

  const allWeights = logs.map(l => l.weight_kg)
  const yMin = allWeights.length ? Math.floor(Math.min(...allWeights, target ?? Infinity) - 1) : 'auto'
  const yMax = allWeights.length ? Math.ceil(Math.max(...allWeights, target ?? -Infinity) + 1) : 'auto'

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-white">Peso corporeo</h1>

      {/* Summary card */}
      {latest && (
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Peso attuale</p>
            <p className="text-3xl font-bold text-white">{latest.weight_kg} <span className="text-lg text-gray-400">kg</span></p>
            <p className="text-xs text-gray-500 mt-1">{new Date(latest.date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          {target && (
            <div className="text-right">
              <p className="text-sm text-gray-400">Obiettivo</p>
              <p className="text-2xl font-semibold text-primary-400">{target} <span className="text-base text-gray-400">kg</span></p>
              <p className={`text-xs mt-1 font-medium ${latest.weight_kg > target ? 'text-orange-400' : 'text-green-400'}`}>
                {latest.weight_kg > target
                  ? `${(latest.weight_kg - target).toFixed(1)} kg da perdere`
                  : `${(target - latest.weight_kg).toFixed(1)} kg da guadagnare`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-300">Andamento</span>
          <div className="flex gap-1">
            {(['7', '30', '90'] as Range[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  range === r ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}
              >
                {r}g
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-48 bg-gray-700 rounded-lg animate-pulse" />
        ) : logs.length < 2 ? (
          <p className="text-sm text-gray-600 text-center py-8">Inserisci almeno 2 misurazioni per vedere il grafico</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis domain={[yMin, yMax]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                labelStyle={{ color: '#e5e7eb', fontSize: 12 }}
                formatter={(v: unknown) => [`${v} kg`, 'Peso']}
              />
              {target && (
                <ReferenceLine y={target} stroke="#10b981" strokeDasharray="4 4" label={{ value: `obiettivo ${target}kg`, fill: '#10b981', fontSize: 10 }} />
              )}
              <Line
                type="monotone"
                dataKey="kg"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Add entry */}
      <div className="card space-y-3">
        <span className="text-sm font-semibold text-gray-300">Registra peso</span>
        <div className="flex gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-primary-500 text-sm"
          />
          <div className="flex items-center gap-1 flex-1 px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 focus-within:border-primary-500">
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              placeholder="es. 75.5"
              className="flex-1 bg-transparent outline-none text-sm"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <span className="text-gray-500 text-sm">kg</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !weightInput}
          className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 rounded-xl font-semibold transition-colors"
        >
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>

      {/* History list */}
      {logs.length > 0 && (
        <div className="card space-y-1">
          <span className="text-sm font-semibold text-gray-300 block mb-2">Storico</span>
          {[...logs].reverse().map(l => (
            <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <span className="text-sm text-gray-400">
                {new Date(l.date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold">{l.weight_kg} kg</span>
                <button
                  type="button"
                  onClick={() => handleDelete(l.id, l.date)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
