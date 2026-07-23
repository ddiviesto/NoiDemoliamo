'use client'

/**
 * LE NOTE DEL DEMOLITORE — "chiamato, non risponde" (23/07/2026).
 * Componente pronto, messo da parte durante la ricostruzione guidata
 * da Davide: lo stile si adegua quando decide dove e come mostrarlo.
 * Le note passano da /api/demolitore-note e finiscono nella cronologia
 * della pratica che l'admin vede (pillola "Demolitore").
 */

import { useCallback, useEffect, useState } from 'react'
import { chiamataDemolitore } from '../_lib/api'

interface NotaDemolitore { id: string; testo: string; creato_il: string }

export default function NoteDemolitore({ praticaId, bloccata }: { praticaId: string; bloccata: boolean }) {
  const [note, setNote] = useState<NotaDemolitore[]>([])
  const [testo, setTesto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroreNota, setErroreNota] = useState('')

  const carica = useCallback(async () => {
    try {
      const json = await chiamataDemolitore<{ note: NotaDemolitore[] }>('/api/demolitore-note', { pratica_id: praticaId })
      setNote(json.note || [])
    } catch { /* silenzioso */ }
  }, [praticaId])

  useEffect(() => { carica() }, [carica])

  async function aggiungi() {
    const t = testo.trim()
    if (!t || salvando) return
    setSalvando(true)
    setErroreNota('')
    try {
      const json = await chiamataDemolitore<{ note: NotaDemolitore[] }>('/api/demolitore-note', { pratica_id: praticaId, testo: t })
      setTesto('')
      setNote(json.note || [])
    } catch (e) {
      setErroreNota(e instanceof Error ? e.message : 'Errore nel salvataggio')
    }
    setSalvando(false)
  }

  return (
    <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #E5E7EB' }}>
      <p className="text-[10px] font-bold uppercase m-0" style={{ color: '#8A94A1', letterSpacing: 0.7 }}>Le tue note</p>
      <p className="text-[10.5px] m-0 mt-0.5 mb-2.5" style={{ color: '#9AA3AF' }}>Es. «chiamato, non risponde». Le vede anche NoiDemoliamo.</p>
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
      {note.length === 0 ? (
        <p className="text-[11.5px] m-0" style={{ color: '#9AA3AF' }}>Nessuna nota per ora.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {note.map(n => (
            <div key={n.id} className="rounded-[9px] px-2.5 py-2" style={{ background: '#F9FAFB', border: '1px solid #EFF1F4' }}>
              <div className="text-[12px]" style={{ color: '#374151', lineHeight: 1.45 }}>{n.testo}</div>
              <div className="text-[9.5px] mt-0.5" style={{ color: '#9AA3AF' }}>
                {new Date(n.creato_il).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
