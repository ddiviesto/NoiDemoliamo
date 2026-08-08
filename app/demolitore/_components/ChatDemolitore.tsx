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

// ⭐ 07/08 (richiesta Davide): le frasi RAPIDE verso il cliente sono DEL
// demolitore e le gestisce lui ("Gestisci" come nella chat admin). Vivono
// sul server (/api/demolitore-rapidi); le 4 di partenza le semina l'endpoint
interface FraseRapida { id: string; testo: string; ordine: number }

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
  // RAPIDI: null = in caricamento (non si mostra nulla, niente lampi)
  const [rapidi, setRapidi] = useState<FraseRapida[] | null>(null)
  const [rapidiGestibili, setRapidiGestibili] = useState(false)
  const [gestisci, setGestisci] = useState(false)
  const riquadroRef = useRef<HTMLDivElement>(null)
  const messaggiJson = useRef('')

  const caricaRapidi = useCallback(async () => {
    try {
      const json = await chiamataDemolitore<{ frasi: FraseRapida[]; gestibili: boolean }>('/api/demolitore-rapidi', { azione: 'lista' })
      setRapidi(json.frasi || [])
      setRapidiGestibili(!!json.gestibili)
    } catch { setRapidi([]) }
  }, [])
  useEffect(() => { caricaRapidi() }, [caricaRapidi])

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
  // "Gestisci" NON apre finestre: il corpo si trasforma nella gestione
  // delle frasi rapide, con la freccetta per tornare ai messaggi (come admin)
  const corpo = gestisci ? (
    <GestisciRapidi
      frasi={rapidi || []}
      compatta={!!finestra}
      onChiudi={() => setGestisci(false)}
      onAggiornate={(frasi) => setRapidi(frasi)}
    />
  ) : (
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
          come nella chat del CRM admin — un tocco e la frase è nel campo,
          "Gestisci" per modificarle (sono le SUE frasi, salvate sul server) */}
      {!bloccata && tab === 'cliente' && rapidi && (rapidi.length > 0 || rapidiGestibili) && (
        <div className="flex items-center gap-1.5 flex-wrap" style={{ padding: '7px 0 0' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.6 }}>RAPIDI</span>
          {rapidi.map(f => (
            <button
              key={f.id}
              onClick={() => setTesto(f.testo)}
              title={f.testo}
              className="transition-colors hover:border-blue-200 hover:text-blue-700 hover:bg-blue-50"
              style={{ background: '#F3F5F9', border: '1px solid #E5E7EB', color: '#374151', fontSize: 10.5, fontWeight: 600, borderRadius: 999, padding: '3px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
            >
              {f.testo}
            </button>
          ))}
          {rapidiGestibili && (
            <button onClick={() => setGestisci(true)} style={{ background: 'none', border: 'none', color: '#1D4ED8', fontSize: 10.5, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}>Gestisci</button>
          )}
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

// ============================================================
// GESTIONE FRASI RAPIDE — IN LINEA dentro la chat (07/08): CLONE del
// GestisciPreimpostati della chat admin, ma sul server del demolitore
// (/api/demolitore-rapidi): niente accesso diretto al DB. Il corpo
// della chat si trasforma e la freccetta riporta ai messaggi.
// ============================================================

function GestisciRapidi({ frasi, compatta, onChiudi, onAggiornate }: {
  frasi: FraseRapida[]
  compatta?: boolean
  onChiudi: () => void
  onAggiornate: (frasi: FraseRapida[]) => void
}) {
  const [bozze, setBozze] = useState<Record<string, string>>({})
  const [nuovo, setNuovo] = useState('')
  const [occupato, setOccupato] = useState(false)
  const [erroreGestione, setErroreGestione] = useState('')

  async function esegui(payload: Record<string, unknown>) {
    setOccupato(true)
    setErroreGestione('')
    try {
      const json = await chiamataDemolitore<{ frasi: FraseRapida[] }>('/api/demolitore-rapidi', payload)
      onAggiornate(json.frasi || [])
      setOccupato(false)
      return true
    } catch (e) {
      setErroreGestione(e instanceof Error ? e.message : 'Errore, riprova')
      setOccupato(false)
      return false
    }
  }

  async function salvaModifica(f: FraseRapida) {
    const t = (bozze[f.id] ?? f.testo).trim()
    if (!t || t === f.testo) { setBozze(b => { const n = { ...b }; delete n[f.id]; return n }); return }
    if (await esegui({ azione: 'modifica', id: f.id, testo: t })) {
      setBozze(b => { const n = { ...b }; delete n[f.id]; return n })
    }
  }

  async function elimina(f: FraseRapida) {
    await esegui({ azione: 'elimina', id: f.id })
  }

  async function aggiungi() {
    const t = nuovo.trim()
    if (!t) return
    if (await esegui({ azione: 'aggiungi', testo: t })) setNuovo('')
  }

  return (
    <div style={{ padding: compatta ? '8px 0 0' : '8px 0 0', ...(compatta ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}) }}>
      {/* Testata: freccetta indietro + titolo con la barretta blu */}
      <div className="flex items-center gap-2">
        <button onClick={onChiudi} aria-label="Torna alla chat" className="flex items-center justify-center transition-colors hover:bg-blue-50" style={{ width: 24, height: 24, borderRadius: 8, background: 'none', border: '1.5px solid #E5E7EB', color: '#1D4ED8', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, color: '#0F1B33' }}>
          <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
          Messaggi rapidi
        </span>
      </div>
      <p style={{ fontSize: 10.5, color: '#8B95A5', lineHeight: 1.45, margin: '5px 0 8px' }}>Un tocco in chat le mette nella casella (le puoi ritoccare prima di inviare).</p>

      {/* Elenco frasi: campo slim + Salva quando cambia + cestino discreto */}
      <div className="overflow-y-auto flex flex-col gap-1.5" style={compatta ? { flex: 1, minHeight: 0 } : { maxHeight: 260 }}>
        {frasi.length === 0 && (
          <p style={{ fontSize: 11, color: '#9AA7B5', padding: '6px 0' }}>Nessuna frase salvata: scrivi la prima qui sotto.</p>
        )}
        {frasi.map(f => {
          const bozza = bozze[f.id] ?? f.testo
          const modificata = bozza.trim() !== f.testo
          return (
            <div key={f.id} className="flex gap-1.5 items-center">
              <textarea
                value={bozza}
                onChange={e => setBozze(b => ({ ...b, [f.id]: e.target.value }))}
                rows={1}
                className="flex-1 min-w-0 border-[1.5px] border-gray-200 px-3 py-[6px] text-base sm:text-[11.5px] text-gray-900 bg-white outline-none focus:border-blue-400 transition-all resize-none"
                style={{ borderRadius: 15 }}
              />
              {modificata && (
                <button onClick={() => salvaModifica(f)} disabled={occupato} className="flex-shrink-0 transition-colors hover:bg-blue-700 disabled:opacity-40" style={{ background: '#2563eb', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', border: 'none', cursor: 'pointer' }}>
                  Salva
                </button>
              )}
              <button onClick={() => elimina(f)} disabled={occupato} aria-label="Elimina frase" className="flex-shrink-0 flex items-center justify-center transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-40" style={{ width: 24, height: 24, borderRadius: 8, background: 'none', border: 'none', color: '#A65D5D', cursor: 'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
              </button>
            </div>
          )
        })}
      </div>

      {erroreGestione && <p style={{ fontSize: 10.5, color: '#9B1C1C', margin: '6px 0 0' }}>{erroreGestione}</p>}

      {/* Nuova frase: campo a pillola + Aggiungi blu, come la chat */}
      <div className="flex gap-1.5 items-center" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F1F4F8' }}>
        <textarea
          value={nuovo}
          onChange={e => setNuovo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aggiungi() } }}
          rows={1}
          placeholder="Nuova frase rapida…"
          className="flex-1 min-w-0 border-[1.5px] border-gray-200 px-3 py-[6px] text-base sm:text-[11.5px] text-gray-900 bg-white outline-none focus:border-blue-400 transition-all placeholder:text-gray-400 resize-none"
          style={{ borderRadius: 15 }}
        />
        <button
          onClick={aggiungi}
          disabled={occupato || !nuovo.trim()}
          className="flex-shrink-0 transition-colors hover:bg-blue-700 disabled:opacity-40"
          style={{ background: '#2563eb', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '5px 12px', border: 'none', cursor: 'pointer' }}
        >
          Aggiungi
        </button>
      </div>
    </div>
  )
}
