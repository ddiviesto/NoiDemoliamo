'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import { metaStato } from '@/lib/statiCrm'

// ============================================================
// CRONOLOGIA E NOTE DELLA PRATICA — SOLO ADMIN (17/07/2026)
// Timeline di note con data e ora esatte (tabella pratiche_note,
// RLS solo admin). Le note della messa in attesa / ripresa vengono
// inserite in automatico dalla pagina e riconosciute dal prefisso.
//
// ⭐ 28/07 sera (mockup approvato): REGISTRO COMPLETO a due canali.
// Il canale NoiDemoliamo mostra TUTTO (eventi automatici + note private
// + note scambiate col demolitore, firmate); la pillolina "Demolitore"
// è solo il FILTRO che mostra la vista di lui, e da lì gli si scrive.
// Gli eventi automatici hanno pilloline PARLANTI (il cambio stato usa
// le pillole vere di lib/statiCliente).
// ============================================================

interface Nota {
  id: string
  testo: string
  creato_il: string
  // 'admin' (default) o 'demolitore' — le note del demolitore ("chiamato,
  // non risponde") arrivano dalla sua area e hanno la pillola dedicata (23/07)
  autore?: string
  // ⭐ 28/07 sera: eventi automatici e canale condiviso
  evento?: string | null
  visibile_demolitore?: boolean
  demolitore_id?: string | null
  // ⭐ 12/08: il DESTINATARIO l'ha vista? (spia delle note non lette;
  // finché la colonna non esiste resta undefined e la spia tace)
  letta?: boolean
}

// Pilloline parlanti degli eventi automatici (il codice sta in `evento`;
// per evento='stato' il testo contiene il codice stato → pillola vera)
const EVENTI_META: Record<string, { label: string; bg: string; col: string }> = {
  doc_rifiutato: { label: 'Documento rifiutato', bg: '#FBE2E2', col: '#A94444' },
  doc_approvati: { label: 'Documenti approvati', bg: '#DCF3E4', col: '#1F7A43' },
  assegnata: { label: 'Demolitore assegnato', bg: '#DBEAFE', col: '#1D4ED8' },
  riassegnata: { label: 'Demolitore cambiato', bg: '#DBEAFE', col: '#1D4ED8' },
  ritiro_fissato: { label: 'Ritiro fissato', bg: '#DBEAFE', col: '#1D4ED8' },
  ritiro_spostato: { label: 'Ritiro spostato', bg: '#DBEAFE', col: '#1D4ED8' },
  ritirata: { label: 'Veicolo ritirato', bg: '#DBEAFE', col: '#1D4ED8' },
  cert_rottamazione: { label: 'Certificato rottamazione', bg: '#DBEAFE', col: '#1D4ED8' },
  cert_pra: { label: 'Radiazione PRA', bg: '#DBEAFE', col: '#1D4ED8' },
  trattativa: { label: 'Trattativa', bg: '#DBEAFE', col: '#1D4ED8' },
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

// ⭐ 07/08 (sobbalzo segnalato da Davide): CACHE delle note + PRECARICO
// al passaggio del mouse sulla riga del CRM — la scheda Cronologia della
// tendina si apre già piena, senza voci che sbucano dopo
const cacheNote = new Map<string, Nota[]>()
const prefetchNoteInCorso = new Set<string>()

export async function prefetchCronologia(praticaId: string) {
  if (cacheNote.has(praticaId) || prefetchNoteInCorso.has(praticaId)) return
  prefetchNoteInCorso.add(praticaId)
  const { data, error } = await supabase
    .from('pratiche_note')
    .select('*')
    .eq('pratica_id', praticaId)
    .order('creato_il', { ascending: false })
  if (!error) cacheNote.set(praticaId, (data as Nota[]) || [])
  prefetchNoteInCorso.delete(praticaId)
}

// ⭐ 23/07: card A SCOMPARSA — chiusa all'apertura, la testata apre e chiude
// ⭐ 27/07: modalità `finestra` (scelta B su mockup): finestrella fissa in
// basso a destra come la Chat, con l'ingrandisci — usata dalla tendina CRM
export default function CronologiaNote({ praticaId, praticaCreataIl, refreshKey, aperta, onToggle, finestra, titolo, scheda, demolitoreId, nomeDemolitore }: {
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
  // ⭐ 28/07 sera: demolitore assegnato alla pratica — abilita la pillolina
  // "Demolitore" (filtro + scrittura nel canale condiviso)
  demolitoreId?: string | null
  nomeDemolitore?: string | null
}) {
  // Parte dalla cache quando c'è (precaricata all'hover): zero sobbalzi
  const [note, setNote] = useState<Nota[]>(() => cacheNote.get(praticaId) || [])
  const [tabellaAssente, setTabellaAssente] = useState(false)
  const [nuova, setNuova] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [espansa, setEspansa] = useState(false)
  // Canale attivo: 'tutte' = registro completo · 'demolitore' = la vista di lui
  const [canale, setCanale] = useState<'tutte' | 'demolitore'>('tutte')

  async function carica() {
    const { data, error } = await supabase
      .from('pratiche_note')
      .select('*')
      .eq('pratica_id', praticaId)
      .order('creato_il', { ascending: false })
    if (error) { setTabellaAssente(true); return }
    setTabellaAssente(false)
    cacheNote.set(praticaId, (data as Nota[]) || [])
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
    // Sul canale Demolitore la nota è CONDIVISA: lui la vedrà nella sua area
    const condivisa = canale === 'demolitore' && !!demolitoreId
    const { data, error } = await supabase
      .from('pratiche_note')
      .insert(condivisa
        ? { pratica_id: praticaId, testo, visibile_demolitore: true, demolitore_id: demolitoreId }
        : { pratica_id: praticaId, testo })
      .select()
      .single()
    if (!error && data) {
      setNote(prev => {
        const nuove = [data as Nota, ...prev]
        cacheNote.set(praticaId, nuove)
        return nuove
      })
      setNuova('')
    } else {
      alert('Errore nel salvataggio della nota. Riprova.')
    }
    setSalvando(false)
  }

  // La vista del demolitore: solo le voci condivise DEL demolitore attuale
  // (le voci del demolitore precedente restano nel registro completo)
  const inCanaleDemolitore = (n: Nota) =>
    (n.visibile_demolitore || n.autore === 'demolitore') && (!n.demolitore_id || n.demolitore_id === demolitoreId)
  const noteMostrate = canale === 'demolitore' ? note.filter(inCanaleDemolitore) : note

  // ⭐ 12/08 (mockup approvato): SPIA ROSSA delle note non lette — conta
  // solo le NOTE SCRITTE dal demolitore (eventi esclusi). Aprire la
  // linguetta Demolitore le segna lette; `appenaLette` tiene ferma
  // l'evidenziazione durante la visita (la spia intanto si azzera)
  const [appenaLette, setAppenaLette] = useState<Set<string>>(new Set())
  const nuoveDalDemolitore = note.filter(n => !n.evento && n.autore === 'demolitore' && n.letta === false && inCanaleDemolitore(n))
  const spiaNote = nuoveDalDemolitore.filter(n => !appenaLette.has(n.id)).length
  useEffect(() => {
    if (canale !== 'demolitore') return
    const ids = nuoveDalDemolitore.filter(n => !appenaLette.has(n.id)).map(n => n.id)
    if (ids.length === 0) return
    setAppenaLette(prev => new Set([...prev, ...ids]))
    supabase.from('pratiche_note').update({ letta: true }).in('id', ids).then(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canale, note])

  // Corpo unico (timeline + campo nota): la CARD lo mostra sotto la testata,
  // la FINESTRELLA lo riempie in altezza (27/07)
  const corpo = tabellaAssente ? (
    <p className="text-xs mt-3" style={{ color: '#854F0B', background: '#FDF7EA', border: '1px solid #F0DFB8', borderRadius: 10, padding: '8px 12px', margin: finestra ? 12 : undefined }}>
      Per attivare le note esegui su Supabase l&apos;SQL <b>docs/sql/2026-07-17-attesa-note-preimpostati.sql</b>
    </p>
  ) : (
        <div className={finestra ? undefined : 'mt-2'} style={finestra ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px 12px 12px' } : undefined}>
          {/* ⭐ 28/07 sera: pilloline dei canali — compaiono solo con un
              demolitore assegnato. "NoiDemoliamo" = registro completo,
              "Demolitore" = il filtro con la vista di lui */}
          {demolitoreId && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexShrink: 0 }}>
              <button onClick={() => setCanale('tutte')} style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', cursor: 'pointer', border: `1.5px solid ${canale === 'tutte' ? '#BFDBFE' : '#E5E7EB'}`, background: canale === 'tutte' ? '#EFF6FF' : '#fff', color: canale === 'tutte' ? '#1D4ED8' : '#6B7280' }}>NoiDemoliamo</button>
              {/* ⭐ 12/08 (mockup approvato): la SPIA ROSSA conta le note del
                  demolitore non ancora lette; si azzera aprendo la linguetta */}
              <button onClick={() => setCanale('demolitore')} style={{ position: 'relative', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', cursor: 'pointer', border: `1.5px solid ${canale === 'demolitore' ? '#BFDBFE' : '#E5E7EB'}`, background: canale === 'demolitore' ? '#EFF6FF' : '#fff', color: canale === 'demolitore' ? '#1D4ED8' : '#6B7280' }}>
                Demolitore
                {spiaNote > 0 && (
                  <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, borderRadius: 999, background: '#DC2626', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', padding: '0 4px' }}>{spiaNote}</span>
                )}
              </button>
            </div>
          )}
          {/* Riquadro a altezza FISSA: si scorre dentro (mouse/dito), la
              pagina non si allunga (richiesta Davide 21/07) */}
          <div className="overflow-y-auto" style={finestra ? { flex: 1, minHeight: 0, overscrollBehavior: 'contain' } : scheda ? { maxHeight: 150, overscrollBehavior: 'contain' } : { maxHeight: 300 }}>
          {noteMostrate.map(n => {
            // ⭐ 28/07 sera: EVENTI AUTOMATICI — pillolina parlante; per il
            // cambio stato la pillola è quella VERA (lib/statiCliente, il
            // testo della riga contiene il codice stato)
            if (n.evento) {
              // ⭐ 28/07 sera (richiesta Davide): il cambio stato usa la pillola
              // ESATTA del CRM (lib/statiCrm), stessa lingua della riga in alto
              const meta = n.evento === 'stato'
                ? (() => { const s = metaStato(n.testo); return { label: s.label, bg: s.bg, col: s.text } })()
                : (EVENTI_META[n.evento] || { label: n.evento, bg: '#F1F4F8', col: '#64748B' })
              // ⭐ 28/07 sera (richiesta Davide): "Documento rifiutato" mostra
              // SOLO il nome del documento (senza il motivo), su UNA riga
              // ⭐ 07/08 (mockup approvato): per l'assegnazione SOLO il nome
              // del demolitore (via le code storiche "(dalla classifica)")
              const dettaglio = n.evento === 'stato' ? ''
                : n.evento === 'doc_rifiutato' ? n.testo.split(': "')[0]
                : n.evento === 'assegnata' || n.evento === 'riassegnata' ? n.testo.replace(/\s*\((dalla classifica|scelto a mano)\)\s*$/, '')
                : n.testo
              return (
                <div key={n.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid #F1F4F8' }}>
                  <div style={{ flexShrink: 0, width: 66, fontSize: 10, fontWeight: 700, color: '#94A3B8', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {fmtGiorno(n.creato_il)}<br />{fmtOra(n.creato_il)}
                  </div>
                  <div style={{ flex: 1, fontSize: 12.5, color: '#3E4C63', lineHeight: 1.5, minWidth: 0 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', background: meta.bg, color: meta.col, fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '2px 9px', verticalAlign: 'middle' }}>
                      {meta.label}
                    </span>
                    {/* ⭐ 07/08 (mockup approvato): il dettaglio va SEMPRE a capo,
                        allineato al bordo sinistro della pillola */}
                    {dettaglio && (
                      <span style={{ display: 'block', marginTop: 4, ...(n.evento === 'doc_rifiutato' ? { whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' } : {}) }}>{dettaglio}</span>
                    )}
                  </div>
                </div>
              )
            }

            // Pillola per le voci automatiche (attesa/ripresa/annullo/riattivo)
            // e per le note del canale DEMOLITORE (firmate, 28/07 sera)
            const condivisa = n.visibile_demolitore || n.autore === 'demolitore'
            const tipo = condivisa ? 'demolitore'
              : n.testo.startsWith(PREFISSO_ATTESA) ? 'attesa'
              : n.testo.startsWith(PREFISSO_RIPRESA) ? 'ripresa'
              : n.testo.startsWith(PREFISSO_RIATTIVATA) ? 'riattivata'
              : n.testo.startsWith(PREFISSO_ANNULLATA) ? 'annullata'
              : null
            // ⭐ 27/07 sera (richiesta Davide): la pillola dice già il TIPO,
            // quindi il testo NON lo ripete — via i prefissi automatici,
            // resta solo il motivo (se non c'è, parla la pillola da sola)
            const testoMostrato = tipo === 'attesa' ? n.testo.replace(/^Messa in attesa[.:]?\s*/, '')
              : tipo === 'ripresa' ? n.testo.replace(/^Pratica ripresa[.:]?\s*/, '')
              : tipo === 'riattivata' ? n.testo.replace(/^Pratica riattivata[.:]?\s*/, '')
              : tipo === 'annullata' ? n.testo.replace(/^Pratica annullata[.:]?\s*/, '')
              : n.testo
            // Firma delle note del canale condiviso: chi l'ha scritta
            const firma = tipo === 'demolitore'
              ? (n.autore === 'demolitore' ? (nomeDemolitore || 'Demolitore') : 'NoiDemoliamo')
              : null
            // ⭐ 28/07 sera: la voce "Ripresa" porta il CODICE dello stato in
            // cui riparte → accanto si disegna la pillola ESATTA del CRM
            const statoRipresa = tipo === 'ripresa' && /^[a-z_]+$/.test(testoMostrato)
              ? metaStato(testoMostrato)
              : null
            const stilePillola = tipo === 'attesa' ? { bg: '#E8ECF3', col: '#5B6779', label: 'In attesa' }
              : tipo === 'ripresa' ? { bg: '#DBEAFE', col: '#1D4ED8', label: 'Ripresa' }
              : tipo === 'riattivata' ? { bg: '#DBEAFE', col: '#1D4ED8', label: 'Riattivata' }
              : tipo === 'annullata' ? { bg: '#F3D9D9', col: '#A94444', label: 'Annullata' }
              : tipo === 'demolitore' ? { bg: '#DBEAFE', col: '#1D4ED8', label: 'Nota demolitore' }
              : { bg: '#EEF1F5', col: '#5B6779', label: 'Nota privata' }
            // ⭐ 12/08: la nota del demolitore ancora "fresca" resta
            // evidenziata durante la visita (la spia intanto si è azzerata)
            const nuova = n.autore === 'demolitore' && n.letta === false
            return (
              <div key={n.id} style={nuova
                ? { display: 'flex', gap: 10, padding: '9px 10px', background: '#F7FAFF', border: '1px solid #DBEAFE', borderRadius: 10, marginBottom: 4 }
                : { display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid #F1F4F8' }}>
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
                      {/* ⭐ 12/08 (richiesta Davide): niente iconcina sulla
                          pillola "Nota demolitore", parla il testo */}
                      {tipo === null && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                      )}
                      {stilePillola.label}
                    </span>
                  )}
                  {nuova && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 999, background: '#DC2626', marginLeft: 6, verticalAlign: 'middle' }} />}
                  {/* ⭐ 07/08 (richiesta Davide): anche per le NOTE il testo va
                      SOTTO la pillola, allineato — niente più a capo storti */}
                  {(firma || testoMostrato || statoRipresa) && (
                    <span style={{ display: 'block', marginTop: 4 }}>
                      {firma && <span style={{ fontWeight: 700, color: '#1D4ED8' }}>{firma}: </span>}
                      {statoRipresa ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', background: statoRipresa.bg, color: statoRipresa.text, fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '2px 9px', verticalAlign: 'middle' }}>{statoRipresa.label}</span>
                      ) : testoMostrato}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Prima voce fissa: la nascita della pratica (solo nel registro
              completo: il demolitore non vede la fase pre-assegnazione) */}
          {canale === 'tutte' && (
          <div style={{ display: 'flex', gap: 10, padding: '9px 0' }}>
            <div style={{ flexShrink: 0, width: 66, fontSize: 10, fontWeight: 700, color: '#94A3B8', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              {fmtGiorno(praticaCreataIl)}<br />{fmtOra(praticaCreataIl)}
            </div>
            <div style={{ flex: 1, fontSize: 12.5, color: '#94A3B8', lineHeight: 1.5 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EEF1F5', color: '#5B6779', fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '2px 9px', marginRight: 6, verticalAlign: 'middle' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Creata
              </span>
              Pratica creata dal cliente
            </div>
          </div>
          )}
          </div>

          {/* Aggiungi nota — ⭐ 27/07 sera (opzione B su mockup): placeholder
              corto sempre leggibile e bottone TONDO BLU PIENO con la matita
              (richiama la pillola "Nota"), gemello del tondo della chat.
              ⭐ 28/07 sera: sul canale Demolitore la nota è CONDIVISA e il
              placeholder lo dice chiaro */}
          <div className="flex gap-1.5 mt-2 items-center">
            <input
              value={nuova}
              onChange={e => setNuova(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') aggiungi() }}
              placeholder={canale === 'demolitore' ? 'Scrivi al demolitore…' : 'Scrivi una nota privata…'}
              className="flex-1 min-w-0 border-[1.5px] border-gray-200 rounded-full px-3.5 py-[7px] text-[12.5px] text-gray-900 bg-white outline-none focus:border-blue-400 transition-all placeholder:text-gray-400"
            />
            <button
              onClick={aggiungi}
              disabled={salvando || !nuova.trim()}
              className="flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-40 hover:bg-blue-700"
              style={{ background: '#2563eb', width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer' }}
              aria-label="Aggiungi nota"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
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
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F1B33' }}>Cronologia e Note</span>
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
