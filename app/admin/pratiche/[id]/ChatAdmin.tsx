'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'

// ============================================================
// CHAT ADMIN (17/07/2026) — dentro il dettaglio pratica.
// Due conversazioni:
//   · Tu ↔ Cliente        → l'admin scrive (mittente_tipo 'admin')
//   · Demolitore ↔ Cliente → SOLA LETTURA (controllo qualità)
// Messaggi rapidi: frasi salvate in `messaggi_preimpostati` (solo admin),
// un tocco le mette nella casella (si possono ritoccare prima di inviare);
// "Gestisci" apre la finestrella per aggiungerle/modificarle/eliminarle.
// Niente real-time: bottone di aggiornamento discreto (come nel resto dell'app).
// ============================================================

interface Messaggio {
  id: string
  mittente_tipo: 'cliente' | 'admin' | 'demolitore' | 'commerciante'
  testo: string
  creato_il: string
  // ⭐ 26/07: canale del messaggio (SQL 2026-07-26-chat-conversazioni.sql).
  // NULL = messaggio vecchio: si mostra col criterio dei mittenti.
  conversazione: 'cliente_noidemoliamo' | 'cliente_demolitore' | 'demolitore_noidemoliamo' | null
}

interface Preimpostato {
  id: string
  testo: string
  ordine: number
}

function fmtOra(x: string) {
  return new Date(x).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ⭐ 23/07: card A SCOMPARSA — chiusa all'apertura, la testata apre e chiude
// ⭐ 26/07 (mockup approvato): chat COMPATTA (pilloline Cliente/Demolitore,
// chips rapidi sottili, campo a pillola col bottone tondo) + modalità
// `finestra`: finestrella fissa in basso a destra (stile messenger) usata
// dalla tendina del CRM — la pagina sotto resta tutta usabile.
export default function ChatAdmin({ praticaId, demolitoreNome, aperta, onToggle, finestra, titolo }: {
  praticaId: string
  demolitoreNome: string | null
  aperta: boolean
  onToggle: () => void
  finestra?: boolean
  titolo?: string
}) {
  // ⭐ 26/07: TRE canali — Cliente (tu↔cliente), Demolitore (tu↔demolitore,
  // NUOVO) e "Dem. e Cliente" (controllo qualità, sola lettura)
  const [tab, setTab] = useState<'cliente' | 'demolitore' | 'qualita'>('cliente')
  // null = primo caricamento in corso: l'area messaggi resta vuota, senza
  // "Nessun messaggio" che lampeggia all'apertura
  const [messaggi, setMessaggi] = useState<Messaggio[] | null>(null)
  const [testo, setTesto] = useState('')
  const [inviando, setInviando] = useState(false)
  const [preimpostati, setPreimpostati] = useState<Preimpostato[]>([])
  // null = non lo sappiamo ancora (in caricamento): non si mostra NULLA,
  // né chips né avviso — niente scritte che lampeggiano all'apertura
  const [preimpostatiOk, setPreimpostatiOk] = useState<boolean | null>(null)
  const [gestisci, setGestisci] = useState(false)
  // Finestrella: altezza SEMPRE uguale (linguette e Gestisci si adattano
  // dentro) + bottone per ingrandirla accanto alla ✕ (26/07)
  const [espansa, setEspansa] = useState(false)
  const listaRef = useRef<HTMLDivElement>(null)

  // Fotografia dell'ultimo elenco: si aggiorna SOLO se è cambiato qualcosa
  // (altrimenti lo scroll del riquadro salterebbe a ogni controllo)
  const messaggiJson = useRef('')

  useEffect(() => {
    caricaMessaggi()
    caricaPreimpostati()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [praticaId])

  // Aggiornamento automatico (22/07): i messaggi del cliente e del
  // demolitore appaiono da soli — il vecchio bottone "Aggiorna" è stato rimosso
  useAggiornaLive({
    canale: `admin-chat-${praticaId}`,
    tabelle: [{ tabella: 'messaggi_chat', filtro: `pratica_id=eq.${praticaId}` }],
    onCambio: () => caricaMessaggi(),
    pollingMs: 30000,
  })

  // Scorre in fondo SOLO dentro il riquadro messaggi: la pagina non si
  // muove mai (niente scrollIntoView: faceva "sobbalzare" tutto).
  useEffect(() => {
    if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight
  }, [messaggi, tab])

  // ⭐ 26/07: aprire una linguetta = leggere QUEL canale — i messaggi
  // diretti a te si segnano letti (il pallino rosso si azzera davvero).
  // La linguetta "Dem. e Cliente" non segna nulla: non è posta tua.
  useEffect(() => {
    if (!aperta || tab === 'qualita') return
    const q = supabase.from('messaggi_chat')
      .update({ letto: true })
      .eq('pratica_id', praticaId)
      .eq('letto', false)
    if (tab === 'cliente') {
      q.eq('mittente_tipo', 'cliente').or('conversazione.eq.cliente_noidemoliamo,conversazione.is.null').then(() => {})
    } else {
      q.eq('mittente_tipo', 'demolitore').eq('conversazione', 'demolitore_noidemoliamo').then(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperta, tab, messaggi?.length, praticaId])

  async function caricaMessaggi() {
    const { data } = await supabase
      .from('messaggi_chat')
      .select('id, mittente_tipo, testo, creato_il, conversazione')
      .eq('pratica_id', praticaId)
      .order('creato_il', { ascending: true })
    const json = JSON.stringify(data || [])
    if (json !== messaggiJson.current) {
      messaggiJson.current = json
      setMessaggi((data as Messaggio[]) || [])
    }
  }

  async function caricaPreimpostati() {
    // Solo le frasi della CHAT (27/07: la tabella ora ha una categoria,
    // 'rifiuto' appartiene alla nuvoletta del visore documenti)
    const { data, error } = await supabase
      .from('messaggi_preimpostati')
      .select('*')
      .or('categoria.eq.chat,categoria.is.null')
      .order('ordine', { ascending: true })
    if (error) { setPreimpostatiOk(false); return }
    setPreimpostatiOk(true)
    setPreimpostati((data as Preimpostato[]) || [])
  }

  async function invia() {
    const t = testo.trim()
    if (!t || inviando || tab === 'qualita') return
    setInviando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setInviando(false); return }
    const { error } = await supabase.from('messaggi_chat').insert({
      pratica_id: praticaId,
      mittente_id: session.user.id,
      mittente_tipo: 'admin',
      testo: t,
      letto: false,
      conversazione: tab === 'demolitore' ? 'demolitore_noidemoliamo' : 'cliente_noidemoliamo',
    })
    if (error) {
      alert('Errore nell\'invio del messaggio. Riprova.')
    } else {
      setTesto('')
      await caricaMessaggi()
    }
    setInviando(false)
  }

  // Filtro per canale; i messaggi VECCHI (conversazione NULL) si mostrano
  // col vecchio criterio dei mittenti
  const visibili = (messaggi || []).filter(m => {
    if (tab === 'cliente') return m.conversazione === 'cliente_noidemoliamo' || (m.conversazione == null && (m.mittente_tipo === 'admin' || m.mittente_tipo === 'cliente'))
    if (tab === 'demolitore') return m.conversazione === 'demolitore_noidemoliamo'
    return m.conversazione === 'cliente_demolitore' || (m.conversazione == null && (m.mittente_tipo === 'demolitore' || m.mittente_tipo === 'cliente'))
  })

  // ---- CORPO COMPATTO (26/07, identico in card e finestrella) ----
  // "Gestisci" NON apre finestre: il corpo della chat si trasforma nella
  // gestione delle frasi, con la freccetta per tornare ai messaggi.
  const corpo = gestisci ? (
    <GestisciPreimpostati
      preimpostati={preimpostati}
      compatta={!!finestra}
      onChiudi={() => setGestisci(false)}
      onCambiati={caricaPreimpostati}
    />
  ) : (
    <>
      {/* Pilloline dei TRE canali (26/07): Cliente e Demolitore scrivibili,
          "Dem. e Cliente" = controllo qualità in sola lettura */}
      <div className="flex gap-1.5 flex-wrap" style={{ marginTop: finestra ? 8 : 10, padding: finestra ? '0 10px' : 0 }}>
        {([['cliente', 'Cliente', null], ['demolitore', 'Demolitore', null], ['qualita', 'Dem. e Cliente', 'solo lettura']] as const).map(([id, label, occhio]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 transition-all"
            style={{ border: `1.5px solid ${tab === id ? '#2563EB' : '#E5E7EB'}`, background: tab === id ? '#EFF6FF' : '#fff', color: tab === id ? '#1D4ED8' : '#4B5563', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', cursor: 'pointer' }}
          >
            {label}
            {occhio && <span style={{ fontSize: 8.5, fontWeight: 700, background: '#EEF1F5', color: '#8B95A5', borderRadius: 999, padding: '1px 6px' }}>{occhio}</span>}
          </button>
        ))}
      </div>

      {/* MESSAGGI: nella finestrella riempie lo spazio (altezza totale
          fissa), nella card ha l'altezza sua */}
      <div ref={listaRef} className="overflow-y-auto" style={{ background: '#F8FAFC', borderRadius: 10, padding: 9, margin: finestra ? '8px 10px 0' : '8px 0 0', ...(finestra ? { flex: 1, minHeight: 0 } : { height: 220 }) }}>
        {messaggi === null ? null : visibili.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: '#9AA7B5' }}>
            {tab === 'cliente' ? 'Nessun messaggio: scrivi tu il primo.'
              : tab === 'demolitore' ? `Nessun messaggio con ${demolitoreNome || 'il demolitore'}: scrivi tu il primo.`
                : `Nessun messaggio tra ${demolitoreNome || 'il demolitore'} e il cliente.`}
          </p>
        ) : (
          visibili.map(msg => {
            const mio = msg.mittente_tipo === 'admin'
            const dem = msg.mittente_tipo === 'demolitore'
            // A destra: i tuoi; nel controllo qualità il demolitore fa da "mittente"
            const aDestra = mio || (dem && tab === 'qualita')
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: aDestra ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                <div style={{
                  maxWidth: '75%', borderRadius: 11, padding: '6px 10px', fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  ...(mio ? { background: '#2563eb', color: '#fff', borderBottomRightRadius: 4 }
                    : dem ? { background: '#E4E4FB', color: '#3730A3', ...(aDestra ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }) }
                      : { background: '#fff', border: '1px solid #E5E7EB', color: '#111827', borderBottomLeftRadius: 4 }),
                }}>
                  {msg.testo}
                </div>
                <div style={{ fontSize: 9, color: '#9AA7B5', marginTop: 2 }}>
                  {msg.mittente_tipo === 'cliente' ? 'Cliente' : dem ? (demolitoreNome || 'Demolitore') : 'Tu'} · {fmtOra(msg.creato_il)}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* RAPIDI a chips sottili (solo col cliente) + campo a pillola
          (nei due canali scrivibili; "Dem. e Cliente" è sola lettura) */}
      {tab !== 'qualita' && (
        <>
          {tab === 'cliente' && preimpostatiOk === true && (
            <div className="flex items-center gap-1.5 flex-wrap" style={{ padding: finestra ? '7px 10px 0' : '7px 0 0' }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.6 }}>RAPIDI</span>
              {preimpostati.map(p => (
                <button
                  key={p.id}
                  onClick={() => setTesto(p.testo)}
                  title={p.testo}
                  className="transition-colors hover:border-blue-200 hover:text-blue-700 hover:bg-blue-50"
                  style={{ background: '#F3F5F9', border: '1px solid #E5E7EB', color: '#374151', fontSize: 10.5, fontWeight: 600, borderRadius: 999, padding: '3px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                >
                  {p.testo}
                </button>
              ))}
              <button onClick={() => setGestisci(true)} style={{ background: 'none', border: 'none', color: '#1D4ED8', fontSize: 10.5, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}>Gestisci</button>
            </div>
          )}
          {tab === 'cliente' && preimpostatiOk === false && (
            <p style={{ fontSize: 10, color: '#9AA7B5', padding: finestra ? '6px 10px 0' : '6px 0 0' }}>
              Per i messaggi rapidi esegui su Supabase l&apos;SQL docs/sql/2026-07-17-attesa-note-preimpostati.sql
            </p>
          )}
          <div className="flex gap-1.5 items-end" style={{ padding: finestra ? '8px 10px 10px' : '8px 0 0' }}>
            <textarea
              value={testo}
              onChange={e => setTesto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia() } }}
              rows={testo.includes('\n') || testo.length > 60 ? 3 : 1}
              placeholder={tab === 'cliente' ? 'Scrivi un messaggio al cliente…' : `Scrivi a ${demolitoreNome || 'al demolitore'}…`}
              className="flex-1 min-w-0 border-[1.5px] border-gray-200 px-3.5 py-[7px] text-[12px] text-gray-900 bg-white outline-none focus:border-blue-400 transition-all placeholder:text-gray-400 resize-none"
              style={{ borderRadius: 17 }}
            />
            <button
              onClick={invia}
              disabled={inviando || !testo.trim()}
              className="flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-40 hover:bg-blue-700"
              style={{ background: '#2563eb', width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer' }}
              aria-label="Invia"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
        </>
      )}

    </>
  )

  // ---- FINESTRELLA fissa in basso a destra (tendina CRM) ----
  // Altezza e larghezza FISSE (non ballano cambiando linguetta o aprendo
  // Gestisci); il bottone accanto alla ✕ la ingrandisce/rimpicciolisce.
  if (finestra) {
    if (!aperta) return null
    return (
      <div style={{ position: 'fixed', right: 16, bottom: 16, width: espansa ? 470 : 340, height: espansa ? 'min(600px, calc(100vh - 32px))' : 430, maxWidth: 'calc(100vw - 32px)', zIndex: 50, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, boxShadow: '0 16px 44px rgba(15,23,42,0.28)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'width .2s ease, height .2s ease' }}>
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
          <button onClick={onToggle} aria-label="Chiudi" className="flex-shrink-0 flex items-center justify-center transition-colors hover:bg-white/30" style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {corpo}
        </div>
      </div>
    )
  }

  // ---- CARD a scomparsa (dettaglio pratica) ----
  return (
    // ⭐ 26/07: da chiusa TUTTA la card è cliccabile, con accensione al mouse
    <div
      className={`p-5 ${aperta ? '' : 'cursor-pointer transition-all hover:!border-blue-200 hover:!shadow-[0_2px_8px_rgba(37,99,235,0.10)]'}`}
      style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.07)' }}
      onClick={aperta ? undefined : onToggle}
    >
      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={e => { e.stopPropagation(); onToggle() }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: '#0F1B33', margin: 0, flex: 1, minWidth: 0 }}>
          <span style={{ width: 3, height: 15, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
          Chat
          <span style={{ fontWeight: 400, fontSize: 11, color: '#64748b' }}>
            {(messaggi?.length ?? 0) > 0 ? `· ${messaggi!.length} messaggi` : '· parla con il cliente'}
          </span>
        </p>
        <span className="transition-transform flex-shrink-0" style={{ color: '#9AA7B5', transform: aperta ? 'rotate(180deg)' : 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </div>
      {aperta && corpo}
    </div>
  )
}

// ============================================================
// GESTIONE FRASI RAPIDE — IN LINEA dentro la chat (26/07): niente
// finestre sopra la pagina, il corpo della chat si trasforma e la
// freccetta riporta ai messaggi. Stile NoiDemoliamo (barretta blu,
// bottoncini compatti, cestino discreto).
// ============================================================

function GestisciPreimpostati({ preimpostati, compatta, onChiudi, onCambiati }: {
  preimpostati: Preimpostato[]
  compatta?: boolean
  onChiudi: () => void
  onCambiati: () => Promise<void> | void
}) {
  const [bozze, setBozze] = useState<Record<string, string>>({})
  const [nuovo, setNuovo] = useState('')
  const [occupato, setOccupato] = useState(false)

  async function salvaModifica(p: Preimpostato) {
    const t = (bozze[p.id] ?? p.testo).trim()
    if (!t || t === p.testo) { setBozze(b => { const n = { ...b }; delete n[p.id]; return n }); return }
    setOccupato(true)
    const { error } = await supabase.from('messaggi_preimpostati').update({ testo: t }).eq('id', p.id)
    if (error) alert('Errore nel salvataggio. Riprova.')
    else { setBozze(b => { const n = { ...b }; delete n[p.id]; return n }); await onCambiati() }
    setOccupato(false)
  }

  async function elimina(p: Preimpostato) {
    setOccupato(true)
    const { error } = await supabase.from('messaggi_preimpostati').delete().eq('id', p.id)
    if (error) alert('Errore nell\'eliminazione. Riprova.')
    else await onCambiati()
    setOccupato(false)
  }

  async function aggiungi() {
    const t = nuovo.trim()
    if (!t) return
    setOccupato(true)
    const ordineMax = preimpostati.reduce((m, p) => Math.max(m, p.ordine), 0)
    const { error } = await supabase.from('messaggi_preimpostati').insert({ testo: t, ordine: ordineMax + 1 })
    if (error) alert('Errore nel salvataggio. Riprova.')
    else { setNuovo(''); await onCambiati() }
    setOccupato(false)
  }

  return (
    <div style={{ padding: compatta ? '8px 10px 10px' : '8px 0 0', ...(compatta ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}) }}>
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
        {preimpostati.length === 0 && (
          <p style={{ fontSize: 11, color: '#9AA7B5', padding: '6px 0' }}>Nessuna frase salvata: scrivi la prima qui sotto.</p>
        )}
        {preimpostati.map(p => {
          const bozza = bozze[p.id] ?? p.testo
          const modificata = bozza.trim() !== p.testo
          return (
            <div key={p.id} className="flex gap-1.5 items-center">
              <textarea
                value={bozza}
                onChange={e => setBozze(b => ({ ...b, [p.id]: e.target.value }))}
                rows={1}
                className="flex-1 min-w-0 border-[1.5px] border-gray-200 px-3 py-[6px] text-[11.5px] text-gray-900 bg-white outline-none focus:border-blue-400 transition-all resize-none"
                style={{ borderRadius: 15 }}
              />
              {modificata && (
                <button onClick={() => salvaModifica(p)} disabled={occupato} className="flex-shrink-0 transition-colors hover:bg-blue-700 disabled:opacity-40" style={{ background: '#2563eb', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', border: 'none', cursor: 'pointer' }}>
                  Salva
                </button>
              )}
              <button onClick={() => elimina(p)} disabled={occupato} aria-label="Elimina frase" className="flex-shrink-0 flex items-center justify-center transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-40" style={{ width: 24, height: 24, borderRadius: 8, background: 'none', border: 'none', color: '#A65D5D', cursor: 'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
              </button>
            </div>
          )
        })}
      </div>

      {/* Nuova frase: campo a pillola + Aggiungi blu, come la chat */}
      <div className="flex gap-1.5 items-center" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F1F4F8' }}>
        <textarea
          value={nuovo}
          onChange={e => setNuovo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aggiungi() } }}
          rows={1}
          placeholder="Nuova frase rapida…"
          className="flex-1 min-w-0 border-[1.5px] border-gray-200 px-3 py-[6px] text-[11.5px] text-gray-900 bg-white outline-none focus:border-blue-400 transition-all placeholder:text-gray-400 resize-none"
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
