import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await (isLogin ? signIn : signUp)(email, password)
    setError(error)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-primary-800 to-gray-900 px-4 pt-20">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">fitTrackr</h1>
          <p className="text-primary-300 text-sm">Tieni traccia di pasti e allenamenti</p>
        </div>

        <div className="card">
          {/* Toggle */}
          <div className="flex mb-6 bg-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(null) }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors text-sm ${
                isLogin ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400'
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(null) }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors text-sm ${
                !isLogin ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400'
              }`}
            >
              Registrati
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                id="email"
                type="email"
                placeholder="la@tua.email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-field"
              />
            </div>
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '...' : isLogin ? 'Accedi' : 'Registrati'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
