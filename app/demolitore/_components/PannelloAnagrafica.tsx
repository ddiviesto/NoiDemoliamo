'use client'

/**
 * PANNELLO LATERALE A TENDA — AREA DEMOLITORE (23/07/2026).
 * Scivola da destra (stesso pattern del pannello impostazioni del cliente):
 * dentro l'ANAGRAFICA del demolitore in sola lettura (la gestisce solo
 * NoiDemoliamo) e in fondo l'Esci. Qui in futuro si aggiungeranno altre
 * cose (fatturazione, preferenze, ...).
 */

import { useEffect, useState } from 'react'
import { chiamataDemolitore } from '../_lib/api'

interface Profilo {
  ragione_sociale: string | null
  piva: string | null
  codice_sdi: string | null
  pec: string | null
  indirizzo: string | null
  citta: string | null
  provincia: string | null
  cap: string | null
  telefono_fisso: string | null
  titolare_nome: string | null
  titolare_cellulare: string | null
  referente_nome: string | null
  referente_cellulare: string | null
  email_aziendale: string | null
  email_assegnazione: string | null
}

export default function PannelloAnagrafica({ aperto, onChiudi, onEsci }: {
  aperto: boolean
  onChiudi: () => void
  onEsci: () => void
}) {
  const [profilo, setProfilo] = useState<Profilo | null>(null)
  const [caricato, setCaricato] = useState(false)

  useEffect(() => {
    if (!aperto || caricato) return
    chiamataDemolitore<{ profilo: Profilo }>('/api/demolitore-profilo')
      .then(json => { setProfilo(json.profilo); setCaricato(true) })
      .catch(() => { /* silenzioso: il pannello mostra i trattini */ })
  }, [aperto, caricato])

  const sede = profilo ? [
    profilo.indirizzo,
    [profilo.cap, profilo.citta].filter(Boolean).join(' '),
    profilo.provincia ? `(${profilo.provincia})` : '',
  ].filter(Boolean).join(', ') : null

  return (
    <>
      {/* velo scuro */}
      <div
        onClick={onChiudi}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: 'rgba(15,23,42,0.45)', opacity: aperto ? 1 : 0, pointerEvents: aperto ? 'auto' : 'none' }}
      />
      {/* tenda da destra */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[400px] bg-white flex flex-col transition-transform duration-300 shadow-2xl"
        style={{ transform: aperto ? 'translateX(0)' : 'translateX(105%)' }}
      >
        {/* testata blu */}
        <div className="px-5 py-4 text-white flex items-center gap-3 flex-shrink-0" style={{ background: 'linear-gradient(120deg, #1E3A8A, #1d4ed8 55%, #2563eb)' }}>
          <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.16)' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></svg>
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[1.5px] text-blue-200">La tua azienda</div>
            <div className="text-[15px] font-extrabold leading-tight truncate">{profilo?.ragione_sociale || '—'}</div>
          </div>
          <button onClick={onChiudi} aria-label="Chiudi" className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors" style={{ background: 'rgba(255,255,255,0.16)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* contenuto scorrevole */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          <SezioneA titolo="Azienda">
            <DatoA label="Ragione sociale" value={profilo?.ragione_sociale} />
            <DatoA label="Partita IVA" value={profilo?.piva} />
            <DatoA label="Codice SDI" value={profilo?.codice_sdi} />
            <DatoA label="PEC" value={profilo?.pec} />
          </SezioneA>

          <SezioneA titolo="Sede">
            <DatoA label="Indirizzo" value={sede} />
          </SezioneA>

          <SezioneA titolo="Contatti">
            <DatoA label="Telefono fisso" value={profilo?.telefono_fisso} />
            <DatoA label="Titolare" value={[profilo?.titolare_nome, profilo?.titolare_cellulare].filter(Boolean).join(' · ') || null} />
            <DatoA label="Referente" value={[profilo?.referente_nome, profilo?.referente_cellulare].filter(Boolean).join(' · ') || null} />
            <DatoA label="Email aziendale" value={profilo?.email_aziendale} />
            <DatoA label="Email per le assegnazioni" value={profilo?.email_assegnazione} />
          </SezioneA>

          <p className="text-[11.5px] m-0 rounded-xl px-3 py-2.5" style={{ background: '#EFF6FF', color: '#1E4E8C', lineHeight: 1.5 }}>
            Questi dati li gestisce NoiDemoliamo: se qualcosa è cambiato (telefono, referente, PEC…) scrivici in chat o chiamaci e li aggiorniamo noi.
          </p>
        </div>

        {/* esci in fondo */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1.5px solid #EEF1F5' }}>
          <button onClick={onEsci} className="w-full py-3 rounded-xl text-[13.5px] font-bold transition-colors flex items-center justify-center gap-2" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1.5px solid #FECACA' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Esci dall&apos;area demolitore
          </button>
        </div>
      </div>
    </>
  )
}

function SezioneA({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase m-0 mb-2" style={{ color: '#8A97A8', letterSpacing: 0.8 }}>{titolo}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function DatoA({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-[10px] px-3 py-2" style={{ background: '#F6F8FB', border: '1px solid #E5E9F0' }}>
      <div className="text-[9.5px] font-bold uppercase" style={{ color: '#5B6779', letterSpacing: 0.4 }}>{label}</div>
      <div className="text-[13px] font-semibold mt-0.5 break-words" style={{ color: '#3E4C63' }}>{value || '—'}</div>
    </div>
  )
}
