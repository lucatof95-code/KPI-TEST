import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../../api'
import { AppSettings } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useGlobalToast } from '../../components/layout/Layout'

function EmailPreview({ form }: { form: AppSettings }) {
  const subtitle = form.email_header_subtitle || 'KPI FORMAZIONE ERP'
  const title = form.email_header_title || 'Nuove attività assegnate'
  const outro = form.email_body_outro || 'Accedi alla piattaforma per visualizzare i dettagli e completarle entro le scadenze previste.'
  const cta = form.email_cta_text || 'Vai alle attività →'
  const pmName = form.smtp_from_name || 'Il tuo PM'
  const disclaimer = form.email_footer_disclaimer || 'Questa email è stata inviata automaticamente dal sistema KPI Formazione ERP.'

  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-4 mt-4">
      <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Anteprima email</p>
      <div className="bg-gray-100 rounded-lg overflow-hidden max-w-md mx-auto text-sm shadow-lg">
        {/* Header */}
        <div className="bg-blue-700 px-6 py-5">
          <p className="text-blue-200 text-xs tracking-widest uppercase mb-1">{subtitle}</p>
          <p className="text-white font-bold text-lg">{title}</p>
        </div>
        {/* Body */}
        <div className="px-6 py-5 bg-white">
          <p className="text-gray-800 mb-3">Ciao <strong>Mario Rossi</strong>,</p>
          <p className="text-gray-600 mb-4 leading-relaxed">
            hai <strong>2 nuove attività assegnate</strong> sul nuovo gestionale ERP: 1 di <strong>formazione</strong> e 1 di <strong>test</strong>.
          </p>
          <p className="text-gray-600 mb-5 leading-relaxed">{outro}</p>
          <div className="text-center">
            <span className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm">
              {cta}
            </span>
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          <p className="text-gray-500 text-xs">{pmName}</p>
          <p className="text-gray-400 text-xs mt-1">{disclaimer}</p>
        </div>
      </div>
    </div>
  )
}

function Textarea({ label, hint, value, onChange }: {
  label: string
  hint?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        rows={2}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

export default function Settings() {
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })

  const [form, setForm] = useState<AppSettings>({
    smtp_host: '', smtp_port: '587', smtp_secure: 'false',
    smtp_user: '', smtp_pass: '', smtp_from_name: '', smtp_from_email: '', app_url: '',
    email_header_subtitle: 'KPI FORMAZIONE ERP',
    email_header_title: 'Nuove attività assegnate',
    email_body_outro: 'Accedi alla piattaforma per visualizzare i dettagli e completarle entro le scadenze previste.',
    email_cta_text: 'Vai alle attività →',
    email_footer_disclaimer: 'Questa email è stata inviata automaticamente dal sistema KPI Formazione ERP.',
  })
  const [showPass, setShowPass] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testLoading, setTestLoading] = useState(false)

  useEffect(() => {
    if (data) setForm((prev) => ({ ...prev, ...data }))
  }, [data])

  const f = (key: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const ft = (key: keyof AppSettings) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
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
                value={form.smtp_pass === '__SET__' ? '' : form.smtp_pass}
                onChange={(e) => setForm((prev) => ({ ...prev, smtp_pass: e.target.value }))}
                placeholder={form.smtp_pass === '__SET__' ? '••••••• (già impostata — lascia vuoto per non modificare)' : '••••••••••••'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-20 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
              >
                {showPass ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
            {form.smtp_pass === '__SET__' && (
              <p className="text-xs text-emerald-500">Password impostata. Lascia il campo vuoto per mantenerla invariata.</p>
            )}
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

      {/* Template email */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Template email notifica</h2>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showPreview ? 'Nascondi anteprima' : 'Mostra anteprima'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Sottotitolo intestazione"
            placeholder="KPI FORMAZIONE ERP"
            value={form.email_header_subtitle}
            onChange={f('email_header_subtitle')}
            hint="Testo piccolo in cima all'email (sfondo blu)"
            className="col-span-2"
          />
          <Input
            label="Titolo intestazione"
            placeholder="Nuove attività assegnate"
            value={form.email_header_title}
            onChange={f('email_header_title')}
            hint="Titolo principale dell'email (sfondo blu)"
            className="col-span-2"
          />
          <div className="col-span-2">
            <Textarea
              label="Testo prima del pulsante"
              hint="Istruzioni mostrate all'utente prima del link di accesso"
              value={form.email_body_outro}
              onChange={ft('email_body_outro')}
            />
          </div>
          <Input
            label="Testo pulsante"
            placeholder="Vai alle attività →"
            value={form.email_cta_text}
            onChange={f('email_cta_text')}
            hint="Etichetta del pulsante di accesso"
            className="col-span-2"
          />
          <div className="col-span-2">
            <Textarea
              label="Nota a piè di pagina"
              hint="Testo disclaimer in fondo all'email"
              value={form.email_footer_disclaimer}
              onChange={ft('email_footer_disclaimer')}
            />
          </div>
        </div>
        {showPreview && <EmailPreview form={form} />}
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
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
