'use client'

/**
 * TENDA "LA TUA AZIENDA" — AREA DEMOLITORE (mockup A del 05/08/2026).
 * Si apre DA SINISTRA, attaccata alla barra laterale, sopra la pagina
 * pratiche che resta visibile dietro il velo. Testata azzurra come le
 * barre del CRM, schede della famiglia in colonna unica (tutte
 * allineate), sola lettura. Si chiude con la ✕ o cliccando fuori.
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

export default function TendaAzienda({ aperta, onChiudi }: {
  aperta: boolean
  onChiudi: () => void
}) {
  const [profilo, setProfilo] = useState<Profilo | null>(null)

  // Dati freschi a OGNI apertura (regola "istantaneo su tutto"): se l'admin
  // modifica la scheda dal CRM, il demolitore la vede aggiornata al primo
  // clic. Ricarica silenziosa: i dati vecchi restano a video nell'attesa.
  useEffect(() => {
    if (!aperta) return
    chiamataDemolitore<{ profilo: Profilo }>('/api/demolitore-profilo')
      .then(json => setProfilo(json.profilo))
      .catch(() => { /* silenzioso: la tenda mostra i trattini */ })
  }, [aperta])

  // L'indirizzo di Google contiene già CAP e città: si aggiungono solo se mancano
  const sede = (() => {
    if (!profilo) return null
    const ind = profilo.indirizzo || ''
    const cittaGiaDentro = !!profilo.citta && ind.toLowerCase().includes(profilo.citta.toLowerCase())
    return [
      ind,
      ...(cittaGiaDentro ? [] : [
        [profilo.cap, profilo.citta].filter(Boolean).join(' '),
        profilo.provincia ? `(${profilo.provincia})` : '',
      ]),
    ].filter(Boolean).join(', ') || null
  })()

  return (
    <>
      {/* velo scuro SOLO sulla pagina (la barra fissa resta libera e
          luminosa): cliccarlo chiude */}
      <div
        onClick={onChiudi}
        className="fixed inset-0 lg:left-[210px] z-40 transition-opacity duration-300"
        style={{ background: 'rgba(15,23,42,0.38)', opacity: aperta ? 1 : 0, pointerEvents: aperta ? 'auto' : 'none' }}
      />
      {/* la tenda scivola da sinistra a destra, dal bordo della barra
          fissa (su telefono dal bordo dello schermo) */}
      <div
        className="fixed top-0 bottom-0 left-0 lg:left-[210px] z-[45] w-full max-w-[340px] flex flex-col transition-transform duration-300 shadow-2xl overflow-hidden"
        style={{ transform: aperta ? 'translateX(0)' : 'translateX(-160%)', background: '#F6F8FB', borderRadius: '0 16px 16px 0' }}
      >
        {/* TESTATA AZZURRA come le barre del CRM */}
        <div className="flex items-center gap-3 flex-shrink-0" style={{ background: '#EFF6FF', borderBottom: '1px solid #DBEAFE', padding: '13px 14px' }}>
          <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0" style={{ background: '#DBEAFE' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            {/* La voce è appena stata cliccata: "La tua azienda" fa da
                scrittina, il protagonista è il NOME del demolitore */}
            <div className="text-[9.5px] font-bold uppercase" style={{ letterSpacing: '0.1em', color: '#5B6779' }}>La tua azienda</div>
            <div className="text-[15px] font-semibold leading-tight truncate" style={{ color: '#3E4C63', marginTop: 1 }}>{profilo?.ragione_sociale || '…'}</div>
          </div>
          <button onClick={onChiudi} aria-label="Chiudi" className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 transition-colors hover:bg-blue-50" style={{ border: '1.5px solid #DBEAFE' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* le schede, in colonna unica */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">

          <Scheda
            titolo="Azienda"
            icona={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          >
            <RigaDato k="Ragione sociale" v={profilo?.ragione_sociale} />
            <RigaDato k="Partita IVA" v={profilo?.piva} />
            <RigaDato k="Codice SDI" v={profilo?.codice_sdi} />
            <RigaDato k="PEC" v={profilo?.pec} />
          </Scheda>

          <Scheda
            titolo="Sede"
            icona={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>}
          >
            <RigaDato k="Indirizzo" v={sede} />
          </Scheda>

          <Scheda
            titolo="Contatti"
            icona={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
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
      <div className="flex items-center gap-2.5" style={{ padding: '10px 13px 8px' }}>
        <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: '#DBEAFE' }}>{icona}</div>
        <span className="text-[13px] font-bold" style={{ color: '#111827' }}>{titolo}</span>
      </div>
      <div style={{ padding: '0 13px 9px' }}>{children}</div>
    </div>
  )
}

// Riga dato in famiglia: etichetta scura a sinistra, valore grigio a destra
function RigaDato({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12px]" style={{ padding: '6.5px 0', borderBottom: '1px solid #F5F7FA' }}>
      <span className="font-semibold flex-shrink-0" style={{ color: '#1E293B' }}>{k}</span>
      <span className="text-right break-words min-w-0" style={{ color: '#6B7280' }}>{v || '—'}</span>
    </div>
  )
}
