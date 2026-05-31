import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { reportsApi } from '../../api'
import { Assignment } from '../../types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { ScoreSlider } from '../../components/ui/ScoreSlider'
import { useGlobalToast } from '../../components/layout/Layout'

interface Props {
  assignment: Assignment
  onClose: () => void
  onSuccess: () => void
}

// ── Formazione form state ─────────────────────────────────────────────────
interface FormazioneState {
  obiettivo: number
  complessita: number
  confrontoVecchioERP: number
  miglioramentoEfficienza: number
  haProblemi: boolean
  descrizioneProblema: string
  richiedeNuovaFormazione: boolean
  giudizioApprendimento: number
}

// ── Test form state ───────────────────────────────────────────────────────
interface TestState {
  obiettivo: number
  complessita: number
  confrontoVecchioERP: number
  miglioramentoEfficienza: number
  haProblemi: boolean
  descrizioneProblema: string
  superato: boolean        // true → richiedeNuovaFormazione=false, giudizio=punteggio
  punteggio: number        // 0-100, solo se superato
}

// ── Shared toggle ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, color = 'blue' }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; color?: 'blue' | 'red' | 'amber'
}) {
  const bg = { blue: 'bg-blue-500', red: 'bg-red-500', amber: 'bg-amber-500' }
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${checked ? bg[color] : 'bg-gray-700'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
      <span className="text-sm font-medium text-gray-300">{label}</span>
    </label>
  )
}

// ── FORMAZIONE form ───────────────────────────────────────────────────────
function FormazioneForm({
  assignment, onClose, onSuccess,
}: Props) {
  const { addToast } = useGlobalToast()
  const [form, setForm] = useState<FormazioneState>({
    obiettivo: 5, complessita: 5, confrontoVecchioERP: 5, miglioramentoEfficienza: 5,
    haProblemi: false, descrizioneProblema: '',
    richiedeNuovaFormazione: false, giudizioApprendimento: 70,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof FormazioneState>(k: K, v: FormazioneState[K]) => setForm((f) => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.haProblemi && !form.descrizioneProblema.trim()) e.descrizioneProblema = 'Descrizione obbligatoria'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = useMutation({
    mutationFn: () => reportsApi.create({
      assignmentId: assignment.id,
      obiettivo: form.obiettivo, complessita: form.complessita,
      confrontoVecchioERP: form.confrontoVecchioERP, miglioramentoEfficienza: form.miglioramentoEfficienza,
      haProblemi: form.haProblemi,
      descrizioneProblema: form.haProblemi ? form.descrizioneProblema : undefined,
      richiedeNuovaFormazione: form.richiedeNuovaFormazione,
      giudizioApprendimento: form.richiedeNuovaFormazione ? null : form.giudizioApprendimento,
    }),
    onSuccess: () => { addToast('Report inviato! Attività completata.'); onSuccess() },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-gray-800/40 rounded-lg p-4">
        <ScoreSlider label="Raggiungimento obiettivo"
          sublabel="Quanto è stato raggiunto l'obiettivo dell'attività?"
          value={form.obiettivo} onChange={(v) => set('obiettivo', v)}
          leftLabel="Non raggiunto" rightLabel="Pienamente" />
        <ScoreSlider label="Complessità percepita"
          sublabel="Quanto è stata complessa questa attività?"
          value={form.complessita} onChange={(v) => set('complessita', v)}
          leftLabel="Molto semplice" rightLabel="Molto complessa" />
        <ScoreSlider label="Confronto con vecchio ERP"
          sublabel="1 = molto più difficile del vecchio · 10 = molto più facile"
          value={form.confrontoVecchioERP} onChange={(v) => set('confrontoVecchioERP', v)}
          leftLabel="Molto peggio" rightLabel="Molto meglio" />
        <ScoreSlider label="Miglioramento efficienza"
          sublabel="Quanto il nuovo sistema migliora il tuo lavoro?"
          value={form.miglioramentoEfficienza} onChange={(v) => set('miglioramentoEfficienza', v)}
          leftLabel="Nessuno" rightLabel="Notevole" />
      </div>

      {/* Problemi */}
      <div className="space-y-3">
        <Toggle checked={form.haProblemi} onChange={(v) => set('haProblemi', v)} label="Ho riscontrato problemi" color="red" />
        {form.haProblemi && (
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Descrivi il problema</label>
            <textarea value={form.descrizioneProblema}
              onChange={(e) => set('descrizioneProblema', e.target.value)}
              rows={3} placeholder="Descrizione chiara e dettagliata…"
              className={`bg-gray-800 border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.descrizioneProblema ? 'border-red-500' : 'border-gray-700'}`} />
            {errors.descrizioneProblema && <p className="text-xs text-red-400">{errors.descrizioneProblema}</p>}
          </div>
        )}
      </div>

      {/* Apprendimento */}
      <div className="space-y-3">
        <Toggle checked={form.richiedeNuovaFormazione} onChange={(v) => set('richiedeNuovaFormazione', v)}
          label="Richiede nuova formazione" color="amber" />
        {!form.richiedeNuovaFormazione && (
          <ScoreSlider label="Giudizio sull'apprendimento personale"
            sublabel="Quanto hai appreso? (0 = niente · 100 = moltissimo)"
            value={form.giudizioApprendimento} min={0} max={100}
            onChange={(v) => set('giudizioApprendimento', v)}
            leftLabel="0 – Niente" rightLabel="100 – Moltissimo" />
        )}
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t border-gray-800">
        <Button variant="secondary" onClick={onClose}>Annulla</Button>
        <Button isLoading={submit.isPending} onClick={() => { if (validate()) submit.mutate() }}>Invia report</Button>
      </div>
    </div>
  )
}

// ── TEST form ─────────────────────────────────────────────────────────────
function TestForm({ assignment, onClose, onSuccess }: Props) {
  const { addToast } = useGlobalToast()
  const [form, setForm] = useState<TestState>({
    obiettivo: 5, complessita: 5, confrontoVecchioERP: 5, miglioramentoEfficienza: 5,
    haProblemi: false, descrizioneProblema: '',
    superato: true, punteggio: 75,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof TestState>(k: K, v: TestState[K]) => setForm((f) => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.haProblemi && !form.descrizioneProblema.trim()) e.descrizioneProblema = 'Descrizione obbligatoria'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = useMutation({
    mutationFn: () => reportsApi.create({
      assignmentId: assignment.id,
      obiettivo: form.obiettivo, complessita: form.complessita,
      confrontoVecchioERP: form.confrontoVecchioERP, miglioramentoEfficienza: form.miglioramentoEfficienza,
      haProblemi: form.haProblemi,
      descrizioneProblema: form.haProblemi ? form.descrizioneProblema : undefined,
      // superato → non richiede nuova formazione; punteggio → giudizio apprendimento
      richiedeNuovaFormazione: !form.superato,
      giudizioApprendimento: form.superato ? form.punteggio : null,
    }),
    onSuccess: () => { addToast('Report inviato! Test completato.'); onSuccess() },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Esito in evidenza */}
      <div className={`rounded-xl border-2 p-4 flex items-center justify-between transition-colors ${form.superato ? 'border-emerald-600 bg-emerald-950/30' : 'border-red-600 bg-red-950/30'}`}>
        <div>
          <p className="text-sm font-medium text-gray-300">Esito del test</p>
          <p className={`text-2xl font-bold mt-0.5 ${form.superato ? 'text-emerald-400' : 'text-red-400'}`}>
            {form.superato ? '✓ Superato' : '✗ Non superato'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => set('superato', true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${form.superato ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-emerald-700'}`}>
            Superato
          </button>
          <button type="button" onClick={() => set('superato', false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${!form.superato ? 'bg-red-600 text-white border-red-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-red-700'}`}>
            Non superato
          </button>
        </div>
      </div>

      {/* Punteggio solo se superato */}
      {form.superato && (
        <ScoreSlider label="Punteggio ottenuto"
          sublabel="Valutazione complessiva del test (0 = minimo · 100 = massimo)"
          value={form.punteggio} min={0} max={100}
          onChange={(v) => set('punteggio', v)}
          leftLabel="0" rightLabel="100" />
      )}

      {/* Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-gray-800/40 rounded-lg p-4">
        <ScoreSlider label="Completamento obiettivi"
          sublabel="Quanti obiettivi del test hai completato?"
          value={form.obiettivo} onChange={(v) => set('obiettivo', v)}
          leftLabel="Nessuno" rightLabel="Tutti" />
        <ScoreSlider label="Difficoltà del test"
          sublabel="Quanto è stato difficile il test?"
          value={form.complessita} onChange={(v) => set('complessita', v)}
          leftLabel="Molto facile" rightLabel="Molto difficile" />
        <ScoreSlider label="Confronto con test su vecchio ERP"
          sublabel="1 = molto più difficile del vecchio · 10 = molto più facile"
          value={form.confrontoVecchioERP} onChange={(v) => set('confrontoVecchioERP', v)}
          leftLabel="Molto peggio" rightLabel="Molto meglio" />
        <ScoreSlider label="Valore del processo testato"
          sublabel="Quanto questo processo aggiunge valore al tuo lavoro?"
          value={form.miglioramentoEfficienza} onChange={(v) => set('miglioramentoEfficienza', v)}
          leftLabel="Nessuno" rightLabel="Notevole" />
      </div>

      {/* Problemi */}
      <div className="space-y-3">
        <Toggle checked={form.haProblemi} onChange={(v) => set('haProblemi', v)} label="Ho riscontrato problemi" color="red" />
        {form.haProblemi && (
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Descrivi il problema</label>
            <textarea value={form.descrizioneProblema}
              onChange={(e) => set('descrizioneProblema', e.target.value)}
              rows={3} placeholder="Descrizione chiara e dettagliata…"
              className={`bg-gray-800 border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.descrizioneProblema ? 'border-red-500' : 'border-gray-700'}`} />
            {errors.descrizioneProblema && <p className="text-xs text-red-400">{errors.descrizioneProblema}</p>}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t border-gray-800">
        <Button variant="secondary" onClick={onClose}>Annulla</Button>
        <Button isLoading={submit.isPending} onClick={() => { if (validate()) submit.mutate() }}>Invia report</Button>
      </div>
    </div>
  )
}

// ── Root modal wrapper ────────────────────────────────────────────────────
export default function ReportFormModal({ assignment, onClose, onSuccess }: Props) {
  const isTest = assignment.activity.tipo === 'TEST'
  return (
    <Modal isOpen onClose={onClose} title={`${isTest ? '📝 Test' : '📚 Formazione'}: ${assignment.activity.nome}`} size="lg">
      {isTest
        ? <TestForm assignment={assignment} onClose={onClose} onSuccess={onSuccess} />
        : <FormazioneForm assignment={assignment} onClose={onClose} onSuccess={onSuccess} />}
    </Modal>
  )
}
