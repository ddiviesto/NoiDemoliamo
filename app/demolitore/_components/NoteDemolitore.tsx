'use client'

/**
 * CRONOLOGIA E NOTE — lato demolitore. ⭐ 07/08: CLONE VISIVO della
 * CronologiaNote del CRM admin (stessa colonna del quando, stesse
 * pilloline degli eventi col dettaglio sotto, stesso campo a pillola
 * col tondo blu della matita). Mostra il CANALE CONDIVISO: gli eventi
 * che riguardano il demolitore e le note a due voci (le sue e quelle
 * di NoiDemoliamo, firmate). Le note private dell'admin non passano
 * mai di qui (filtra il server, /api/demolitore-note).
 * Va montato DENTRO una scheda della tendina: qui c'è solo il corpo.
 */

import { useCallback, useEffect, useState } from 'react'
import { chiamataDemolitore } from '../_lib/api'

interface VoceCronologia { id: string; testo: string; creato_il: string; autore?: string; evento?: string | null; nuova?: boolean }

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

function fmtGiorno(x: string) {
  return new Date(x).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }).toUpperCase()
}
function fmtOra(x: string) {
  return new Date(x).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

// ⭐ 07/08 (sobbalzo segnalato da Davide): stessa CACHE + PRECARICO dei
// dettagli della tendina — le voci della cronologia si scaricano già
// all'hover sulla riga, così la scheda si apre piena dal primo fotogramma
const cacheNote = new Map<string, VoceCronologia[]>()
const prefetchNoteInCorso = new Set<string>()

export async function prefetchNote(praticaId: string) {
  if (cacheNote.has(praticaId) || prefetchNoteInCorso.has(praticaId)) return
  prefetchNoteInCorso.add(praticaId)
  try {
    const json = await chiamataDemolitore<{ note: VoceCronologia[] }>('/api/demolitore-note', { pratica_id: praticaId })
    cacheNote.set(praticaId, json.note || [])
  } catch { /* silenzioso */ }
  prefetchNoteInCorso.delete(praticaId)
}

export default function NoteDemolitore({ praticaId, bloccata }: { praticaId: string; bloccata: boolean }) {
  // Parte dalla cache quando c'è (precaricata all'hover): zero sobbalzi
  const [voci, setVoci] = useState<VoceCronologia[]>(() => cacheNote.get(praticaId) || [])
  // Finché non so ancora niente non mostro nulla (nemmeno "Nessuna voce")
  const [caricate, setCaricate] = useState(() => cacheNote.has(praticaId))
  const [testo, setTesto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroreNota, setErroreNota] = useState('')

  const carica = useCallback(async () => {
    try {
      // ⭐ 12/08 (spia note): la cronologia è APERTA davvero → le note di
      // NoiDemoliamo si segnano lette (tornano marcate `nuova` una volta,
      // per l'evidenziazione). Il precarico all'hover NON manda il flag
      const json = await chiamataDemolitore<{ note: VoceCronologia[] }>('/api/demolitore-note', { pratica_id: praticaId, segna_lette: true })
      cacheNote.set(praticaId, json.note || [])
      setVoci(json.note || [])
      setCaricate(true)
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
      cacheNote.set(praticaId, json.note || [])
      setVoci(json.note || [])
    } catch (e) {
      setErroreNota(e instanceof Error ? e.message : 'Errore nel salvataggio')
    }
    setSalvando(false)
  }

  return (
    // Riempie la scheda in altezza: la lista scorre DENTRO e il campo
    // della nota resta INCHIODATO IN FONDO (come nel CRM)
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="overflow-y-auto" style={{ flex: 1, minHeight: 60, maxHeight: 280, overscrollBehavior: 'contain' }}>
        {caricate && voci.length === 0 && (
          <p style={{ fontSize: 11.5, color: '#9AA7B5', padding: '10px 0' }}>Nessuna voce per ora.</p>
        )}
        {voci.map(n => {
          const meta = n.evento ? (EVENTI_META[n.evento] || { label: n.evento, bg: '#F1F4F8', col: '#64748B' }) : null
          // Nota a due voci: pillola "Nota" + firma di chi l'ha scritta
          const firma = n.evento ? null : (n.autore === 'demolitore' ? 'Tu' : 'NoiDemoliamo')
          // Il dettaglio va SOTTO la pillola (regola 07/08); per l'assegnazione
          // solo il nome (via le code storiche tipo "(dalla classifica)")
          const dettaglio = n.evento === 'assegnata' || n.evento === 'riassegnata'
            ? n.testo.replace(/\s*\((dalla classifica|scelto a mano)\)\s*$/, '')
            : n.testo
          return (
            // ⭐ 12/08: la nota di NoiDemoliamo appena arrivata resta
            // evidenziata durante la visita (spia già azzerata dal server)
            <div key={n.id} style={n.nuova
              ? { display: 'flex', gap: 10, padding: '9px 10px', background: '#F7FAFF', border: '1px solid #DBEAFE', borderRadius: 10, marginBottom: 4 }
              : { display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid #F1F4F8' }}>
              <div style={{ flexShrink: 0, width: 66, fontSize: 10, fontWeight: 700, color: '#94A3B8', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {fmtGiorno(n.creato_il)}<br />{fmtOra(n.creato_il)}
              </div>
              <div style={{ flex: 1, fontSize: 12.5, color: '#3E4C63', lineHeight: 1.5, minWidth: 0 }}>
                {meta ? (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', background: meta.bg, color: meta.col, fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '2px 9px', verticalAlign: 'middle' }}>
                      {meta.label}
                    </span>
                    {dettaglio && <span style={{ display: 'block', marginTop: 4 }}>{dettaglio}</span>}
                  </>
                ) : (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#DBEAFE', color: '#1D4ED8', fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '2px 9px', verticalAlign: 'middle' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                      Nota
                    </span>
                    {n.nuova && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 999, background: '#DC2626', marginLeft: 6, verticalAlign: 'middle' }} />}
                    {/* ⭐ 07/08: il testo va SOTTO la pillola, allineato */}
                    <span style={{ display: 'block', marginTop: 4 }}>
                      {firma && <span style={{ fontWeight: 700, color: '#1D4ED8' }}>{firma}: </span>}
                      {n.testo}
                    </span>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {erroreNota && <p style={{ fontSize: 11, color: '#9B1C1C', margin: '6px 0 0' }}>{erroreNota}</p>}

      {/* Aggiungi nota: campo a pillola + tondo blu con la matita (clone
          CRM), sempre in fondo alla scheda */}
      {!bloccata && (
        <div className="flex gap-1.5 mt-2 items-center" style={{ marginTop: 'auto', paddingTop: 8 }}>
          <input
            value={testo}
            onChange={e => setTesto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') aggiungi() }}
            placeholder="Scrivi una nota a NoiDemoliamo…"
            className="flex-1 min-w-0 border-[1.5px] border-gray-200 rounded-full px-3.5 py-[7px] text-base sm:text-[12.5px] text-gray-900 bg-white outline-none focus:border-blue-400 transition-all placeholder:text-gray-400"
          />
          <button
            onClick={aggiungi}
            disabled={salvando || !testo.trim()}
            className="flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-40 hover:bg-blue-700"
            style={{ background: '#2563eb', width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer' }}
            aria-label="Aggiungi nota"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}
