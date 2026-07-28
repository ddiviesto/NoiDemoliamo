'use client'

/**
 * CRONOLOGIA DELLA PRATICA — lato demolitore (23/07/2026).
 * Componente pronto, messo da parte durante la ricostruzione guidata
 * da Davide: lo stile si adegua quando decide dove e come mostrarlo.
 *
 * ⭐ 28/07 sera (canali): mostra il CANALE CONDIVISO — gli eventi che
 * riguardano il demolitore (assegnazione, ritiro, certificati) e le note
 * a due voci (le sue e quelle di NoiDemoliamo, firmate). Le note private
 * dell'admin e la fase documenti NON passano mai di qui (filtra il server,
 * /api/demolitore-note).
 */

import { useCallback, useEffect, useState } from 'react'
import { chiamataDemolitore } from '../_lib/api'

interface VoceCronologia { id: string; testo: string; creato_il: string; autore?: string; evento?: string | null }

// Pilloline parlanti degli eventi condivisi (stessa lingua del CRM)
const EVENTI_META: Record<string, { label: string; bg: string; col: string }> = {
  assegnata: { label: 'Pratica assegnata', bg: '#DBEAFE', col: '#1D4ED8' },
  riassegnata: { label: 'Pratica assegnata', bg: '#DBEAFE', col: '#1D4ED8' },
  ritiro_fissato: { label: 'Ritiro fissato', bg: '#DBEAFE', col: '#1D4ED8' },
  ritiro_spostato: { label: 'Ritiro spostato', bg: '#DBEAFE', col: '#1D4ED8' },
  ritirata: { label: 'Veicolo ritirato', bg: '#DBEAFE', col: '#1D4ED8' },
  cert_rottamazione: { label: 'Certificato rottamazione', bg: '#DBEAFE', col: '#1D4ED8' },
  cert_pra: { label: 'Radiazione PRA', bg: '#DBEAFE', col: '#1D4ED8' },
}

export default function NoteDemolitore({ praticaId, bloccata }: { praticaId: string; bloccata: boolean }) {
  const [voci, setVoci] = useState<VoceCronologia[]>([])
  const [testo, setTesto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroreNota, setErroreNota] = useState('')

  const carica = useCallback(async () => {
    try {
      const json = await chiamataDemolitore<{ note: VoceCronologia[] }>('/api/demolitore-note', { pratica_id: praticaId })
      setVoci(json.note || [])
    } catch { /* silenzioso */ }
  }, [praticaId])

  useEffect(() => { carica() }, [carica])

  async function aggiungi() {
    const t = testo.trim()
    if (!t || salvando) return
    setSalvando(true)
    setErroreNota('')
    try {
      const json = await chiamataDemolitore<{ note: VoceCronologia[] }>('/api/demolitore-note', { pratica_id: praticaId, testo: t })
      setTesto('')
      setVoci(json.note || [])
    } catch (e) {
      setErroreNota(e instanceof Error ? e.message : 'Errore nel salvataggio')
    }
    setSalvando(false)
  }

  return (
    <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #E5E7EB' }}>
      <p className="text-[10px] font-bold uppercase m-0" style={{ color: '#8A94A1', letterSpacing: 0.7 }}>Cronologia della pratica</p>
      <p className="text-[10.5px] m-0 mt-0.5 mb-2.5" style={{ color: '#9AA3AF' }}>Le note le vede anche NoiDemoliamo (es. «chiamato, non risponde»).</p>
      {!bloccata && (
        <div className="flex gap-2 mb-2.5">
          <input
            value={testo}
            onChange={e => setTesto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') aggiungi() }}
            placeholder="Scrivi una nota…"
            className="flex-1 min-w-0 border rounded-[9px] px-3 py-2 text-base outline-none focus:border-blue-500"
            style={{ borderColor: '#DDE1E8', background: '#fff', color: '#111827' }}
          />
          <button onClick={aggiungi} disabled={salvando || !testo.trim()}
            className="rounded-[9px] px-3.5 text-[11.5px] font-semibold text-white disabled:opacity-40 flex-shrink-0" style={{ background: '#2563eb' }}>
            {salvando ? '…' : 'Salva'}
          </button>
        </div>
      )}
      {erroreNota && <p className="text-[11px] mb-2 m-0" style={{ color: '#9B1C1C' }}>{erroreNota}</p>}
      {voci.length === 0 ? (
        <p className="text-[11.5px] m-0" style={{ color: '#9AA3AF' }}>Nessuna voce per ora.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {voci.map(n => {
            const meta = n.evento ? EVENTI_META[n.evento] : null
            const firma = n.evento ? null : (n.autore === 'demolitore' ? 'Tu' : 'NoiDemoliamo')
            return (
              <div key={n.id} className="rounded-[9px] px-2.5 py-2" style={{ background: '#F9FAFB', border: '1px solid #EFF1F4' }}>
                <div className="text-[12px]" style={{ color: '#374151', lineHeight: 1.45 }}>
                  {meta && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', background: meta.bg, color: meta.col, fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 8px', marginRight: 6, verticalAlign: 'middle' }}>{meta.label}</span>
                  )}
                  {firma && <span style={{ fontWeight: 700, color: '#1D4ED8' }}>{firma}: </span>}
                  {n.testo}
                </div>
                <div className="text-[9.5px] mt-0.5" style={{ color: '#9AA3AF' }}>
                  {new Date(n.creato_il).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
