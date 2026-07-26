'use client'

/**
 * CHAT AREA DEMOLITORE — DUE CANALI (23/07, canali 26/07).
 *   · Cliente      → demolitore ↔ cliente (per accordarsi sul ritiro)
 *   · NoiDemoliamo → demolitore ↔ admin (assistenza sulla pratica)
 * Passa dall'endpoint /api/demolitore-chat (param `canale`); messaggi in
 * automatico (ritorno in pagina + controllo ogni 15s), senza salti di scroll.
 * Stile compatto gemello della chat admin (pilloline, campo a pillola).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { chiamataDemolitore } from '../_lib/api'
import { useAggiornaLive } from '@/lib/aggiornaLive'

interface MessaggioChat { id: string; mittente_tipo: string; testo: string; creato_il: string }

export default function ChatDemolitore({ praticaId, bloccata }: { praticaId: string; bloccata: boolean }) {
  const [tab, setTab] = useState<'cliente' | 'noidemoliamo'>('cliente')
  const [messaggi, setMessaggi] = useState<MessaggioChat[]>([])
  const [testo, setTesto] = useState('')
  const [inviando, setInviando] = useState(false)
  const [erroreChat, setErroreChat] = useState('')
  const riquadroRef = useRef<HTMLDivElement>(null)
  const messaggiJson = useRef('')

  const carica = useCallback(async (canale: 'cliente' | 'noidemoliamo') => {
    try {
      const json = await chiamataDemolitore<{ messaggi: MessaggioChat[] }>('/api/demolitore-chat', { pratica_id: praticaId, canale })
      const nuovo = JSON.stringify(json.messaggi || [])
      if (nuovo !== messaggiJson.current) {
        messaggiJson.current = nuovo
        setMessaggi(json.messaggi || [])
      }
    } catch { /* silenzioso */ }
  }, [praticaId])

  useEffect(() => {
    messaggiJson.current = ''
    setMessaggi([])
    carica(tab)
  }, [carica, tab])

  useAggiornaLive({
    canale: `demolitore-chat-${praticaId}`,
    onCambio: () => carica(tab),
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
      const json = await chiamataDemolitore<{ messaggi: MessaggioChat[] }>('/api/demolitore-chat', { pratica_id: praticaId, canale: tab, testo: t })
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
      <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
        <p className="text-[10px] font-bold uppercase m-0" style={{ color: '#8A94A1', letterSpacing: 0.7 }}>Chat</p>
        {/* Pilloline dei due canali (gemelle della chat admin) */}
        <div className="flex gap-1.5">
          {([['cliente', 'Cliente'], ['noidemoliamo', 'NoiDemoliamo']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="transition-all"
              style={{ border: `1.5px solid ${tab === id ? '#2563EB' : '#E5E7EB'}`, background: tab === id ? '#EFF6FF' : '#fff', color: tab === id ? '#1D4ED8' : '#4B5563', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '3px 11px', cursor: 'pointer' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div ref={riquadroRef} className="rounded-[10px] p-2.5 flex flex-col gap-1.5 overflow-y-auto" style={{ background: '#F9FAFB', border: '1px solid #EFF1F4', height: 200 }}>
        {messaggi.length === 0 ? (
          <p className="text-[11.5px] m-auto text-center" style={{ color: '#9AA3AF' }}>
            {tab === 'cliente'
              ? <>Nessun messaggio. Scrivi tu al cliente<br />per accordarti sul ritiro.</>
              : <>Nessun messaggio. Scrivi a NoiDemoliamo<br />per qualsiasi cosa su questa pratica.</>}
          </p>
        ) : messaggi.map(m => (
          <div key={m.id} className="max-w-[82%] rounded-[10px] px-2.5 py-1.5 text-[12px]" style={m.mittente_tipo === 'demolitore'
            ? { background: '#2563eb', color: '#fff', alignSelf: 'flex-end', lineHeight: 1.45 }
            : { background: '#fff', border: '1px solid #E9ECF0', color: '#374151', alignSelf: 'flex-start', lineHeight: 1.45 }}>
            {m.testo}
            <div className="text-[9px] mt-0.5" style={{ color: m.mittente_tipo === 'demolitore' ? '#BFDBFE' : '#9AA3AF' }}>
              {m.mittente_tipo === 'cliente' ? 'Cliente · ' : m.mittente_tipo === 'admin' ? 'NoiDemoliamo · ' : ''}
              {new Date(m.creato_il).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
      {erroreChat && <p className="text-[11px] mt-2 m-0" style={{ color: '#9B1C1C' }}>{erroreChat}</p>}
      {bloccata ? (
        <p className="text-[11px] mt-2 m-0 text-center" style={{ color: '#9AA3AF' }}>La chat è chiusa per questa pratica.</p>
      ) : (
        <div className="flex gap-1.5 mt-2.5 items-center">
          <input
            value={testo}
            onChange={e => setTesto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') invia() }}
            placeholder={tab === 'cliente' ? 'Scrivi al cliente…' : 'Scrivi a NoiDemoliamo…'}
            className="flex-1 min-w-0 border px-3.5 py-2 text-base outline-none focus:border-blue-500"
            style={{ borderColor: '#DDE1E8', background: '#fff', color: '#111827', borderRadius: 999 }}
          />
          <button
            onClick={invia}
            disabled={inviando || !testo.trim()}
            aria-label="Invia"
            className="flex-shrink-0 flex items-center justify-center disabled:opacity-40"
            style={{ background: '#2563eb', width: 36, height: 36, borderRadius: 999, border: 'none', cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}
