import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (user) {
    navigate(user.ruolo === 'MASTER' ? '/master/dashboard' : '/user/activities')
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di accesso')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
            K
          </div>
          <h1 className="text-2xl font-bold text-gray-100">KPI Formazione ERP</h1>
          <p className="text-gray-500 text-sm mt-1">Accedi per continuare</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@azienda.it"
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          {error && (
            <div className="bg-red-900/40 border border-red-700/50 text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <Button type="submit" isLoading={isLoading} size="lg" className="mt-1">
            Accedi
          </Button>
        </form>

        <div className="mt-4 bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-medium text-gray-400 mb-1">Credenziali di esempio</p>
          <p>Master: <span className="text-gray-300">master@kpi.test</span> / <span className="text-gray-300">master123</span></p>
          <p>Utente: <span className="text-gray-300">alice@kpi.test</span> / <span className="text-gray-300">user123</span></p>
        </div>
      </div>
    </div>
  )
}
