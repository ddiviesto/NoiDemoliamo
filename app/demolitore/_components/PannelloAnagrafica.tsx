'use client'

/**
 * PANNELLO "LA TUA AZIENDA" — AREA DEMOLITORE (mockup A approvato da
 * Davide, agosto 2026). Scivola da destra: testata blu in stile profilo
 * (quadratino bianco + nome grande, ✕ a tondo traslucido) e i dati in
 * sola lettura raggruppati in 3 schede della famiglia (Azienda, Sede,
 * Contatti), etichetta a sinistra e valore a destra.
 * Si chiude SOLO con la ✕ (niente chiusura al clic fuori) e non c'è
 * più l'Esci in fondo: Esci vive nella barra laterale.
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

export default function PannelloAnagrafica({ aperto, onChiudi }: {
  aperto: boolean
  onChiudi: () => void
  /** non più usato: Esci vive solo nella barra laterale */
  onEsci?: () => void
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
      {/* velo scuro (solo visivo: si chiude con la ✕) */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: 'rgba(15,23,42,0.45)', opacity: aperto ? 1 : 0, pointerEvents: 'none' }}
      />
      {/* tenda da destra */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[400px] flex flex-col transition-transform duration-300 shadow-2xl"
        style={{ transform: aperto ? 'translateX(0)' : 'translateX(105%)', background: '#F6F8FB' }}
      >
        {/* testata profilo */}
        <div className="px-4 pt-3.5 pb-4 text-white flex-shrink-0" style={{ background: 'linear-gradient(120deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%)' }}>
          <div className="flex justify-end">
            <button onClick={onChiudi} aria-label="Chiudi" className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/30" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-3.5 mt-0.5">
            <div className="w-[52px] h-[52px] bg-white rounded-[14px] flex items-center justify-center flex-shrink-0">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9.5px] font-bold uppercase" style={{ letterSpacing: '0.12em', color: '#BFDBFE' }}>La tua azienda</div>
              <div className="text-[18px] font-bold leading-tight truncate mt-0.5">{profilo?.ragione_sociale || '—'}</div>
            </div>
          </div>
        </div>

        {/* le tre schede */}
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">

          <Scheda
            titolo="Azienda"
            icona={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          >
            <RigaDato k="Ragione sociale" v={profilo?.ragione_sociale} />
            <RigaDato k="Partita IVA" v={profilo?.piva} />
            <RigaDato k="Codice SDI" v={profilo?.codice_sdi} />
            <RigaDato k="PEC" v={profilo?.pec} />
          </Scheda>

          <Scheda
            titolo="Sede"
            icona={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>}
          >
            <RigaDato k="Indirizzo" v={sede} />
          </Scheda>

          <Scheda
            titolo="Contatti"
            icona={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
          >
            <RigaDato k="Telefono fisso" v={profilo?.telefono_fisso} />
            <RigaDato k="Titolare" v={[profilo?.titolare_nome, profilo?.titolare_cellulare].filter(Boolean).join(' · ') || null} />
            <RigaDato k="Referente" v={[profilo?.referente_nome, profilo?.referente_cellulare].filter(Boolean).join(' · ') || null} />
            <RigaDato k="Email aziendale" v={profilo?.email_aziendale} />
            <RigaDato k="Email assegnazioni pratiche" v={profilo?.email_assegnazione} />
          </Scheda>

        </div>
      </div>
    </>
  )
}

// Scheda della famiglia card: quadratino azzurro + titolo, righe sotto
function Scheda({ titolo, icona, children }: { titolo: string; icona: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white overflow-hidden" style={{ border: '1.5px solid #E5E7EB', borderRadius: 14 }}>
      <div className="flex items-center gap-2.5" style={{ padding: '11px 13px' }}>
        <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: '#DBEAFE' }}>{icona}</div>
        <span className="text-[13.5px] font-bold" style={{ color: '#111827' }}>{titolo}</span>
      </div>
      <div style={{ padding: '2px 13px 10px' }}>{children}</div>
    </div>
  )
}

// Riga dato in famiglia: etichetta scura a sinistra, valore grigio a destra
function RigaDato({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12.5px]" style={{ padding: '7px 0', borderBottom: '1px solid #F5F7FA' }}>
      <span className="font-semibold flex-shrink-0" style={{ color: '#1E293B' }}>{k}</span>
      <span className="text-right break-words min-w-0" style={{ color: '#6B7280' }}>{v || '—'}</span>
    </div>
  )
}
