'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'

// ============================================================
// CRONOLOGIA E NOTE DELLA PRATICA — SOLO ADMIN (17/07/2026)
// Timeline di note con data e ora esatte (tabella pratiche_note,
// RLS solo admin). Le note della messa in attesa / ripresa vengono
// inserite in automatico dalla pagina e riconosciute dal prefisso.
// ============================================================

interface Nota {
  id: string
  testo: string
  creato_il: string
  // 'admin' (default) o 'demolitore' — le note del demolitore ("chiamato,
  // non risponde") arrivano dalla sua area e hanno la pillola dedicata (23/07)
  autore?: string
}

const PREFISSO_ATTESA = 'Messa in attesa'
const PREFISSO_RIPRESA = 'Pratica ripresa'
const PREFISSO_ANNULLATA = 'Pratica annullata'
const PREFISSO_RIATTIVATA = 'Pratica riattivata'

function fmtGiorno(x: string) {
  return new Date(x).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }).toUpperCase().replace('.', '')
}
function fmtOra(x: string) {
  return new Date(x).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

// ⭐ 23/07: card A SCOMPARSA — chiusa all'apertura, la testata apre e chiude
// ⭐ 27/07: modalità `finestra` (scelta B su mockup): finestrella fissa in
// basso a destra come la Chat, con l'ingrandisci — usata dalla tendina CRM
export default function CronologiaNote({ praticaId, praticaCreataIl, refreshKey, aperta, onToggle, finestra, titolo, scheda }: {
  praticaId: string
  praticaCreataIl: string
  refreshKey: number
  aperta: boolean
  onToggle: () => void
  finestra?: boolean
  titolo?: string
  // ⭐ 27/07 sera (mockup approvato): modalità SCHEDA — prima card della
  // fila nella tendina del CRM (timeline con scroll interno, campo nota)
  scheda?: boolean
}) {
  const [note, setNote] = useState<Nota[]>([])
  const [tabellaAssente, setTabellaAssente] = useState(false)
  const [nuova, setNuova] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [espansa, setEspansa] = useState(false)

  async function carica() {
    const { data, error } = await supabase
      .from('pratiche_note')
      .select('*')
      .eq('pratica_id', praticaId)
      .order('creato_il', { ascending: false })
    if (error) { setTabellaAssente(true); return }
    setTabellaAssente(false)
    setNote((data as Nota[]) || [])
  }

  useEffect(() => {
    carica()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [praticaId, refreshKey])

  // Aggiornamento automatico (22/07): le note automatiche (attesa, annullo,
  // riattivo) compaiono da sole nella timeline
  useAggiornaLive({
    canale: `admin-note-${praticaId}`,
    tabelle: [{ tabella: 'pratiche_note', filtro: `pratica_id=eq.${praticaId}` }],
    onCambio: () => carica(),
  })

  async function aggiungi() {
    const testo = nuova.trim()
    if (!testo) return
    setSalvando(true)
    const { data, error } = await supabase
      .from('pratiche_note')
      .insert({ pratica_id: praticaId, testo })
      .select()
      .single()
    if (!error && data) {
      setNote(prev => [data as Nota, ...prev])
      setNuova('')
    } else {
      alert('Errore nel salvataggio della nota. Riprova.')
    }
    setSalvando(false)
  }

  // Corpo unico (timeline + campo nota): la CARD lo mostra sotto la testata,
  // la FINESTRELLA lo riempie in altezza (27/07)
  const corpo = tabellaAssente ? (
    <p className="text-xs mt-3" style={{ color: '#854F0B', background: '#FDF7EA', border: '1px solid #F0DFB8', borderRadius: 10, padding: '8px 12px', margin: finestra ? 12 : undefined }}>
      Per attivare le note esegui su Supabase l&apos;SQL <b>docs/sql/2026-07-17-attesa-note-preimpostati.sql</b>
    </p>
  ) : (
        <div className={finestra ? undefined : 'mt-2'} style={finestra ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px 12px 12px' } : undefined}>
          {/* Riquadro a altezza FISSA: si scorre dentro (mouse/dito), la
              pagina non si allunga (richiesta Davide 21/07) */}
          <div className="overflow-y-auto" style={finestra ? { flex: 1, minHeight: 0, overscrollBehavior: 'contain' } : scheda ? { maxHeight: 150, overscrollBehavior: 'contain' } : { maxHeight: 300 }}>
          {note.map(n => {
            // Pillola per le voci automatiche (attesa/ripresa/annullo/riattivo)
            // e per le note del DEMOLITORE (23/07: quadratino celeste come in chat)
            const tipo = n.autore === 'demolitore' ? 'demolitore'
              : n.testo.startsWith(PREFISSO_ATTESA) ? 'attesa'
              : n.testo.startsWith(PREFISSO_RIPRESA) ? 'ripresa'
              : n.testo.startsWith(PREFISSO_RIATTIVATA) ? 'riattivata'
              : n.testo.startsWith(PREFISSO_ANNULLATA) ? 'annullata'
              : null
            // Ogni riga ha la sua pillola (20/07): le note manuali hanno "Nota"
            const stilePillola = tipo === 'attesa' ? { bg: '#FAEEDA', col: '#854F0B', label: 'In attesa' }
              : tipo === 'ripresa' ? { bg: '#DCF3E4', col: '#1F7A43', label: 'Ripresa' }
              : tipo === 'riattivata' ? { bg: '#DCF3E4', col: '#1F7A43', label: 'Riattivata' }
              : tipo === 'annullata' ? { bg: '#FBE2E2', col: '#9B1C1C', label: 'Annullata' }
              : tipo === 'demolitore' ? { bg: '#DBEAFE', col: '#1D4ED8', label: 'Demolitore' }
              : { bg: '#E0EDFB', col: '#1E4E8C', label: 'Nota' }
            return (
              <div key={n.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid #F1F4F8' }}>
                <div style={{ flexShrink: 0, width: 66, fontSize: 10, fontWeight: 700, color: '#94A3B8', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {fmtGiorno(n.creato_il)}<br />{fmtOra(n.creato_il)}
                </div>
                <div style={{ flex: 1, fontSize: 12.5, color: '#3E4C63', lineHeight: 1.5, minWidth: 0 }}>
                  {stilePillola && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: stilePillola.bg, color: stilePillola.col, fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '2px 9px', marginRight: 6, verticalAlign: 'middle' }}>
                      {tipo === 'attesa' && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      )}
                      {tipo === 'ripresa' && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                      )}
                      {tipo === 'riattivata' && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                      {tipo === 'annullata' && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      )}
                      {tipo === 'demolitore' && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16.5V13a1 1 0 0 0-1-1H3v4.5" /><path d="M3 12V7a1 1 0 0 1 1-1h9l3 4h3a2 2 0 0 1 2 2v4.5" /><circle cx="6.5" cy="17.5" r="2" /><circle cx="17.5" cy="17.5" r="2" /></svg>
                      )}
                      {tipo === null && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                      )}
                      {stilePillola.label}
                    </span>
                  )}
                  {n.testo}
                </div>
              </div>
            )
          })}

          {/* Prima voce fissa: la nascita della pratica */}
          <div style={{ display: 'flex', gap: 10, padding: '9px 0' }}>
            <div style={{ flexShrink: 0, width: 66, fontSize: 10, fontWeight: 700, color: '#94A3B8', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              {fmtGiorno(praticaCreataIl)}<br />{fmtOra(praticaCreataIl)}
            </div>
            <div style={{ flex: 1, fontSize: 12.5, color: '#94A3B8', lineHeight: 1.5 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EEF2F7', color: '#475569', fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '2px 9px', marginRight: 6, verticalAlign: 'middle' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Creata
              </span>
              Pratica creata dal cliente
            </div>
          </div>
          </div>

          {/* Aggiungi nota */}
          <div className="flex gap-2 mt-2">
            <input
              value={nuova}
              onChange={e => setNuova(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') aggiungi() }}
              placeholder="Aggiungi una nota… (data e ora si salvano da sole)"
              className="flex-1 min-w-0 border-[1.5px] border-gray-200 rounded-[11px] px-3 py-2 text-[12.5px] text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400"
            />
            <button
              onClick={aggiungi}
              disabled={salvando || !nuova.trim()}
              className="flex-shrink-0 rounded-[10px] px-3.5 text-white font-bold text-lg transition-all disabled:opacity-40"
              style={{ background: '#2563eb' }}
              aria-label="Aggiungi nota"
            >
              +
            </button>
          </div>
        </div>
  )

  // ---- SCHEDA nella fila della tendina (27/07 sera, mockup approvato):
  // prima card, gemella delle sezioni, sempre aperta ----
  if (scheda) {
    return (
      <div style={{ flex: 1.25, minWidth: 250, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '11px 13px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F1B33' }}>Cronologia e note</span>
        </div>
        {corpo}
      </div>
    )
  }

  // ---- FINESTRELLA fissa in basso a destra (27/07, gemella della Chat):
  // misure fisse, bottone ingrandisci accanto alla ✕ ----
  // ⭐ 27/07: niente position fixed qui — le finestrelle (chat e cronologia)
  // vivono affiancate in un contenitore fisso unico nel CRM
  if (finestra) {
    if (!aperta) return null
    return (
      <div style={{ position: 'relative', flexShrink: 0, width: espansa ? 470 : 340, height: espansa ? 'min(600px, calc(100vh - 32px))' : 430, maxWidth: 'calc(100vw - 32px)', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, boxShadow: '0 16px 44px rgba(15,23,42,0.28)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'width .2s ease, height .2s ease' }}>
        <div style={{ background: 'linear-gradient(90deg,#1D4ED8,#2563EB)', color: '#fff', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="text-[12.5px] font-bold truncate">{titolo || 'Cronologia e note'}</div>
            <div className="text-[10px]" style={{ color: '#BFDBFE' }}>la vedi solo tu</div>
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

  // ---- CARD a scomparsa (26/07: da chiusa TUTTA cliccabile) ----
  return (
    <div
      className={`p-5 ${aperta ? '' : 'cursor-pointer transition-all hover:!border-blue-200 hover:!shadow-[0_2px_8px_rgba(37,99,235,0.10)]'}`}
      style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.07)' }}
      onClick={aperta ? undefined : onToggle}
    >
      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={e => { e.stopPropagation(); onToggle() }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: '#0F1B33', margin: 0, flex: 1, minWidth: 0 }}>
          <span style={{ width: 3, height: 15, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
          Cronologia e note
          <span className="truncate" style={{ fontWeight: 400, fontSize: 11, color: '#64748b' }}>
            {note.length > 0 ? `· ultima: ${fmtGiorno(note[0].creato_il)} ${fmtOra(note[0].creato_il)}` : '· le vedi solo tu'}
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
