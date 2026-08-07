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

// Frasi RAPIDE del demolitore verso il cliente (un tocco = frase nel campo)
const RAPIDI_CLIENTE = [
  'Buongiorno! La chiamo a breve per accordarci sul ritiro.',
  'Posso passare domani mattina: le va bene?',
  'Sono in arrivo.',
  'Sono arrivato: la aspetto al veicolo.',
]

export default function ChatDemolitore({ praticaId, bloccata, finestra, titolo, onChiudi }: {
  praticaId: string
  bloccata: boolean
  /** ⭐ 07/08: modalità FINESTRELLA come la chat del CRM admin — fissa in
      basso a destra, testata blu col titolo, ingrandisci e ✕ */
  finestra?: boolean
  titolo?: string
  onChiudi?: () => void
}) {
  const [tab, setTab] = useState<'cliente' | 'noidemoliamo'>('cliente')
  const [messaggi, setMessaggi] = useState<MessaggioChat[]>([])
  const [testo, setTesto] = useState('')
  const [inviando, setInviando] = useState(false)
  const [erroreChat, setErroreChat] = useState('')
  const [espansa, setEspansa] = useState(false)
  const [chiudendo, setChiudendo] = useState(false)
  const riquadroRef = useRef<HTMLDivElement>(null)
  const messaggiJson = useRef('')

  // Chiusura CON animazione (scivola via verso destra), poi si smonta
  function chiudi() {
    if (chiudendo) return
    setChiudendo(true)
    setTimeout(() => onChiudi?.(), 240)
  }

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

  // ⭐ 07/08: CLONE VISIVO della chat del CRM admin — stesse pilloline dei
  // canali, stesso palco grigio coi messaggi a bolle (le tue blu a destra
  // con l'angolo "parlato", le altre bianche bordate a sinistra), stessa
  // firma sotto la bolla e stesso campo + tondo blu d'invio.
  // Il CORPO è unico: cambia solo il guscio (card o finestrella).
  const corpo = (
    <>
      {/* Pilloline dei due canali (gemelle della chat admin) */}
      <div className="flex gap-1.5 flex-wrap" style={{ marginTop: finestra ? 8 : 0 }}>
        {([['cliente', 'Cliente'], ['noidemoliamo', 'NoiDemoliamo']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="transition-all"
            style={{ border: `1.5px solid ${tab === id ? '#2563EB' : '#E5E7EB'}`, background: tab === id ? '#EFF6FF' : '#fff', color: tab === id ? '#1D4ED8' : '#4B5563', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', cursor: 'pointer' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Messaggi sul palco grigio, come nel CRM: nella finestrella riempie
          lo spazio, nella card ha l'altezza sua */}
      <div ref={riquadroRef} className="overflow-y-auto" style={{ background: '#F8FAFC', borderRadius: 10, padding: 9, margin: '8px 0 0', overscrollBehavior: 'contain', ...(finestra ? { flex: 1, minHeight: 0 } : { height: 220 }) }}>
        {/* ⭐ 07/08 (richiesta Davide): a chat vuota il palco resta pulito,
            niente inviti a scrivere */}
        {messaggi.length === 0 ? null : messaggi.map(m => {
          const mio = m.mittente_tipo === 'demolitore'
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mio ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
              <div style={{
                maxWidth: '75%', borderRadius: 11, padding: '6px 10px', fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                ...(mio ? { background: '#2563eb', color: '#fff', borderBottomRightRadius: 4 }
                  : { background: '#fff', border: '1px solid #E5E7EB', color: '#111827', borderBottomLeftRadius: 4 }),
              }}>
                {m.testo}
              </div>
              <div style={{ fontSize: 9, color: '#9AA7B5', marginTop: 2 }}>
                {mio ? 'Tu' : m.mittente_tipo === 'cliente' ? 'Cliente' : 'NoiDemoliamo'} · {new Date(m.creato_il).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
      </div>

      {erroreChat && <p className="text-[11px] mt-2 m-0" style={{ color: '#9B1C1C' }}>{erroreChat}</p>}
      {/* ⭐ 07/08 (richiesta Davide): RAPIDI a chips sul canale Cliente,
          come nella chat del CRM admin — un tocco e la frase è nel campo */}
      {!bloccata && tab === 'cliente' && (
        <div className="flex items-center gap-1.5 flex-wrap" style={{ padding: '7px 0 0' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.6 }}>RAPIDI</span>
          {RAPIDI_CLIENTE.map(frase => (
            <button
              key={frase}
              onClick={() => setTesto(frase)}
              title={frase}
              className="transition-colors hover:border-blue-200 hover:text-blue-700 hover:bg-blue-50"
              style={{ background: '#F3F5F9', border: '1px solid #E5E7EB', color: '#374151', fontSize: 10.5, fontWeight: 600, borderRadius: 999, padding: '3px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
            >
              {frase}
            </button>
          ))}
        </div>
      )}
      {bloccata ? (
        <p className="text-[11px] mt-2 m-0 text-center" style={{ color: '#9AA7B5' }}>La chat è chiusa per questa pratica.</p>
      ) : (
        <div className="flex gap-1.5 mt-2 items-end">
          <textarea
            value={testo}
            onChange={e => setTesto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia() } }}
            rows={testo.includes('\n') || testo.length > 60 ? 3 : 1}
            placeholder={tab === 'cliente' ? 'Scrivi un messaggio al cliente…' : 'Scrivi a NoiDemoliamo…'}
            className="flex-1 min-w-0 border-[1.5px] border-gray-200 px-3.5 py-[7px] text-base sm:text-[12px] text-gray-900 bg-white outline-none focus:border-blue-400 transition-all placeholder:text-gray-400 resize-none"
            style={{ borderRadius: 17 }}
          />
          <button
            onClick={invia}
            disabled={inviando || !testo.trim()}
            aria-label="Invia"
            className="flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-40 hover:bg-blue-700"
            style={{ background: '#2563eb', width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      )}
    </>
  )

  // ---- FINESTRELLA fissa in basso a destra (clone della chat del CRM):
  // dimensioni fisse, testata blu col titolo, ingrandisci e ✕, scivola
  // da destra all'apertura e via verso destra alla chiusura ----
  if (finestra) {
    return (
      <div style={{ position: 'relative', flexShrink: 0, width: espansa ? 470 : 340, height: espansa ? 'min(600px, calc(100vh - 32px))' : 430, maxWidth: 'calc(100vw - 32px)', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, boxShadow: '0 16px 44px rgba(15,23,42,0.28)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'width .2s ease, height .2s ease, transform .26s ease', animation: 'chat-scivola .28s ease', transform: chiudendo ? 'translateX(130%)' : undefined }}>
        <style>{'@keyframes chat-scivola{from{transform:translateX(130%)}to{transform:none}}'}</style>
        <div style={{ background: 'linear-gradient(90deg,#1D4ED8,#2563EB)', color: '#fff', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="text-[12.5px] font-bold truncate">{titolo || 'Chat'}</div>
            <div className="text-[10px]" style={{ color: '#BFDBFE' }}>chat della pratica</div>
          </div>
          <button onClick={() => setEspansa(e => !e)} aria-label={espansa ? 'Rimpicciolisci' : 'Ingrandisci'} title={espansa ? 'Rimpicciolisci' : 'Ingrandisci'} className="flex-shrink-0 flex items-center justify-center transition-colors hover:bg-white/30" style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer' }}>
            {espansa ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /></svg>
            )}
          </button>
          <button onClick={chiudi} aria-label="Chiudi" className="flex-shrink-0 flex items-center justify-center transition-colors hover:bg-white/30" style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 10px 10px' }}>
          {corpo}
        </div>
      </div>
    )
  }

  // ---- CARD simple (scheda pratica vecchia e usi in linea) ----
  return (
    <div className="bg-white rounded-xl p-3" style={{ border: '1.5px solid #E5E7EB' }}>{corpo}</div>
  )
}
