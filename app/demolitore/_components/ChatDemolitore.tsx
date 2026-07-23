'use client'

/**
 * CHAT COL CLIENTE — area demolitore (23/07/2026).
 * Componente pronto, messo da parte durante la ricostruzione guidata
 * da Davide: lo stile si adegua quando decide dove e come mostrarlo.
 * Passa dall'endpoint /api/demolitore-chat; messaggi in automatico
 * (ritorno in pagina + controllo ogni 15s), senza salti di scroll.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { chiamataDemolitore } from '../_lib/api'
import { useAggiornaLive } from '@/lib/aggiornaLive'

interface MessaggioChat { id: string; mittente_tipo: string; testo: string; creato_il: string }

export default function ChatDemolitore({ praticaId, bloccata }: { praticaId: string; bloccata: boolean }) {
  const [messaggi, setMessaggi] = useState<MessaggioChat[]>([])
  const [testo, setTesto] = useState('')
  const [inviando, setInviando] = useState(false)
  const [erroreChat, setErroreChat] = useState('')
  const riquadroRef = useRef<HTMLDivElement>(null)
  const messaggiJson = useRef('')

  const carica = useCallback(async () => {
    try {
      const json = await chiamataDemolitore<{ messaggi: MessaggioChat[] }>('/api/demolitore-chat', { pratica_id: praticaId })
      const nuovo = JSON.stringify(json.messaggi || [])
      if (nuovo !== messaggiJson.current) {
        messaggiJson.current = nuovo
        setMessaggi(json.messaggi || [])
      }
    } catch { /* silenzioso */ }
  }, [praticaId])

  useEffect(() => { carica() }, [carica])

  useAggiornaLive({
    canale: `demolitore-chat-${praticaId}`,
    onCambio: carica,
    pollingMs: 15000,
  })

  useEffect(() => {
    if (riquadroRef.current) riquadroRef.current.scrollTop = riquadroRef.current.scrollHeight
  }, [messaggi])

  async function invia() {
    const t = testo.trim()
    if (!t || inviando) return
    setInviando(true)
    setErroreChat('')
    try {
      const json = await chiamataDemolitore<{ messaggi: MessaggioChat[] }>('/api/demolitore-chat', { pratica_id: praticaId, testo: t })
      setTesto('')
      messaggiJson.current = JSON.stringify(json.messaggi || [])
      setMessaggi(json.messaggi || [])
    } catch (e) {
      setErroreChat(e instanceof Error ? e.message : 'Errore nell\'invio')
    }
    setInviando(false)
  }

  return (
    <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #E5E7EB' }}>
      <p className="text-[10px] font-bold uppercase m-0 mb-2.5" style={{ color: '#8A94A1', letterSpacing: 0.7 }}>Chat col cliente</p>
      <div ref={riquadroRef} className="rounded-[10px] p-2.5 flex flex-col gap-1.5 overflow-y-auto" style={{ background: '#F9FAFB', border: '1px solid #EFF1F4', height: 200 }}>
        {messaggi.length === 0 ? (
          <p className="text-[11.5px] m-auto text-center" style={{ color: '#9AA3AF' }}>Nessun messaggio. Scrivi tu al cliente<br />per accordarti sul ritiro.</p>
        ) : messaggi.map(m => (
          <div key={m.id} className="max-w-[82%] rounded-[10px] px-2.5 py-1.5 text-[12px]" style={m.mittente_tipo === 'demolitore'
            ? { background: '#2563eb', color: '#fff', alignSelf: 'flex-end', lineHeight: 1.45 }
            : { background: '#fff', border: '1px solid #E9ECF0', color: '#374151', alignSelf: 'flex-start', lineHeight: 1.45 }}>
            {m.testo}
            <div className="text-[9px] mt-0.5" style={{ color: m.mittente_tipo === 'demolitore' ? '#BFDBFE' : '#9AA3AF' }}>
              {new Date(m.creato_il).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
      {erroreChat && <p className="text-[11px] mt-2 m-0" style={{ color: '#9B1C1C' }}>{erroreChat}</p>}
      {bloccata ? (
        <p className="text-[11px] mt-2 m-0 text-center" style={{ color: '#9AA3AF' }}>La chat è chiusa per questa pratica.</p>
      ) : (
        <div className="flex gap-2 mt-2.5">
          <input
            value={testo}
            onChange={e => setTesto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') invia() }}
            placeholder="Scrivi un messaggio…"
            className="flex-1 min-w-0 border rounded-[9px] px-3 py-2 text-base outline-none focus:border-blue-500"
            style={{ borderColor: '#DDE1E8', background: '#fff', color: '#111827' }}
          />
          <button onClick={invia} disabled={inviando || !testo.trim()}
            className="rounded-[9px] px-3.5 text-[11.5px] font-semibold text-white disabled:opacity-40 flex-shrink-0" style={{ background: '#2563eb' }}>
            Invia
          </button>
        </div>
      )}
    </div>
  )
}
