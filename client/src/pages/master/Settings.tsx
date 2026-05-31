import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../../api'
import { AppSettings } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useGlobalToast } from '../../components/layout/Layout'

export default function Settings() {
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })

  const [form, setForm] = useState<AppSettings>({
    smtp_host: '', smtp_port: '587', smtp_secure: 'false',
    smtp_user: '', smtp_pass: '', smtp_from_name: '', smtp_from_email: '', app_url: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testLoading, setTestLoading] = useState(false)

  useEffect(() => {
    if (data) setForm({ ...form, ...data })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const f = (key: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const save = useMutation({
    mutationFn: () => settingsApi.update(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); addToast('Impostazioni salvate') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const handleTest = async () => {
    if (!testEmail) { addToast('Inserisci un\'email per il test', 'error'); return }
    setTestLoading(true)
    try {
      const res = await settingsApi.testConnection(testEmail)
      addToast(res.message || 'Email inviata', res.ok ? 'success' : 'error')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Errore', 'error')
    } finally {
      setTestLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-100">Impostazioni</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Configura l'email del Project Manager usata per inviare le notifiche agli utenti.
        </p>
      </div>

      {/* Mittente */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Mittente</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nome visualizzato"
            placeholder="Mario Rossi"
            value={form.smtp_from_name}
            onChange={f('smtp_from_name')}
            hint="Apparirà come mittente nell'email ricevuta dall'utente"
            className="col-span-2"
          />
          <Input
            label="Email mittente"
            type="email"
            placeholder="mario.rossi@azienda.it"
            value={form.smtp_from_email}
            onChange={f('smtp_from_email')}
            hint="Indirizzo email da cui partono le notifiche"
            className="col-span-2"
          />
        </div>
      </section>

      {/* SMTP */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Server SMTP</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Host SMTP"
            placeholder="smtp.gmail.com"
            value={form.smtp_host}
            onChange={f('smtp_host')}
            hint="Es: smtp.gmail.com · smtp.office365.com · smtp.resend.com"
            className="col-span-2"
          />
          <Input
            label="Porta"
            type="number"
            placeholder="587"
            value={form.smtp_port}
            onChange={f('smtp_port')}
            hint="587 (TLS) · 465 (SSL) · 25"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Sicurezza</label>
            <div className="flex gap-3 mt-1">
              {[
                { value: 'false', label: 'STARTTLS (porta 587)' },
                { value: 'true', label: 'SSL (porta 465)' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-400">
                  <input
                    type="radio"
                    name="smtp_secure"
                    value={opt.value}
                    checked={form.smtp_secure === opt.value}
                    onChange={f('smtp_secure')}
                    className="accent-blue-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <Input
            label="Utente SMTP"
            placeholder="mario.rossi@azienda.it"
            value={form.smtp_user}
            onChange={f('smtp_user')}
            hint="Di solito coincide con l'email mittente"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Password SMTP</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.smtp_pass}
                onChange={f('smtp_pass')}
                placeholder="••••••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
              >
                {showPass ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
            <p className="text-xs text-gray-500">Per Gmail usa una App Password (non la password principale)</p>
          </div>
        </div>
      </section>

      {/* App URL */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Applicazione</h2>
        <Input
          label="URL dell'app"
          placeholder="https://kpi.azienda.it"
          value={form.app_url}
          onChange={f('app_url')}
          hint="Link inserito nel pulsante 'Vai alle attività' nelle email"
        />
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Test connection */}
        <div className="flex items-center gap-2 flex-1">
          <Input
            placeholder="email-test@azienda.it"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            hint=""
          />
          <Button variant="secondary" onClick={handleTest} isLoading={testLoading} className="flex-shrink-0">
            Testa invio
          </Button>
        </div>
        <Button isLoading={save.isPending} onClick={() => save.mutate()}>
          Salva impostazioni
        </Button>
      </div>
      <p className="text-xs text-gray-600 mt-3">
        Se SMTP non è configurato, le email vengono stampate nella console del server (modalità sviluppo).
      </p>
    </div>
  )
}
