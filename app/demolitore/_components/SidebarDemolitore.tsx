'use client'

/**
 * BARRA LATERALE — AREA DEMOLITORE. Dal 05/08/2026 è la GEMELLA di
 * quella dell'admin (richiesta Davide: "deve essere tutto uguale il
 * sistema"): fissa e sempre aperta su PC, stessa larghezza, niente
 * angoli smussati né apertura a scomparsa, testata con logo + nome
 * del demolitore + ruolo DEMOLITORE in maiuscoletto (come
 * NoiDemoliamo/ADMIN), voce attiva "in vetro", Esci in fondo oltre
 * la riga. Sul telefono: tenda da sinistra col bottone ☰.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type VoceSidebar = 'pratiche' | 'ritiri' | 'azienda'

// Voce di navigazione, stessa veste di NavItem dell'AdminSidebar
function Voce({ attiva, disabilitata, onClick, icona, label, extra }: {
  attiva?: boolean
  disabilitata?: boolean
  onClick?: () => void
  icona: React.ReactNode
  label: string
  extra?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabilitata}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left"
      style={attiva
        ? { background: 'rgba(255,255,255,0.22)', color: '#fff', fontWeight: 600 }
        : { color: disabilitata ? 'rgba(240,245,255,0.55)' : '#F0F5FF', cursor: disabilitata ? 'default' : 'pointer' }}
      onMouseEnter={e => { if (!attiva && !disabilitata) e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={e => { if (!attiva) e.currentTarget.style.background = 'transparent' }}
    >
      <span className="flex-shrink-0">{icona}</span>
      <span className="flex items-center gap-2 min-w-0">{label}{extra}</span>
    </button>
  )
}

function Contenuto({ attiva, nome, onPratiche, onRitiri, onAzienda, onEsci }: {
  attiva: VoceSidebar
  nome: string
  onPratiche: () => void
  onRitiri: () => void
  onAzienda: () => void
  onEsci: () => void
}) {
  return (
    <>
      {/* Testata come l'admin: logo vero, nome, ruolo in maiuscoletto */}
      <div className="px-4 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
        
        <div className="min-w-0">
          <div className="text-[13px] font-bold leading-tight">{nome || '…'}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: '#BFDBFE' }}>Demolitore</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-2.5 flex-1">
        {/* Portablocco: la stessa icona della voce Pratiche del CRM admin */}
        <Voce attiva={attiva === 'pratiche'} onClick={onPratiche} label="Pratiche"
          icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h6m-6 4h4" /></svg>} />
        {/* ⭐ 07/08 (mockup approvato): l'agenda dei ritiri pianificati */}
        <Voce attiva={attiva === 'ritiri'} onClick={onRitiri} label="Ritiri"
          icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>} />
        <Voce attiva={attiva === 'azienda'} onClick={onAzienda} label="La tua azienda"
          icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></svg>} />
        <Voce disabilitata label="Fatturazione"
          extra={<span style={{ fontSize: 8.5, fontWeight: 700, background: 'rgba(255,255,255,0.22)', color: '#fff', borderRadius: 999, padding: '1px 7px' }}>PRESTO</span>}
          icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>} />
      </nav>

      {/* Esci in fondo, oltre la riga (come l'admin) */}
      <div className="p-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.25)' }}>
        <button onClick={onEsci} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-white/15" style={{ color: '#F0F5FF' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Esci
        </button>
      </div>
    </>
  )
}

export default function SidebarDemolitore({ attiva, apertaMobile, onChiudiMobile, onPratiche, onRitiri, onAzienda, onEsci }: {
  attiva: VoceSidebar
  apertaMobile: boolean
  onChiudiMobile: () => void
  onPratiche: () => void
  onRitiri: () => void
  onAzienda: () => void
  onEsci: () => void
}) {
  const [nome, setNome] = useState('')

  // ⭐ 05/08 (segnalazione Davide): lo spazio riservato alla barra di
  // scorrimento mostra lo sfondo lavanda del sito cliente, che qui si
  // vede come una barretta blu sul bordo. Nell'area demolitore lo sfondo
  // dietro la pagina diventa grigio come la pagina: strisce mimetizzate.
  useEffect(() => {
    const html = document.documentElement
    const prevHtml = html.style.background
    const prevBody = document.body.style.background
    html.style.background = '#ECEEF2'
    document.body.style.background = '#ECEEF2'
    // ⭐ 05/08 (mockup A): accende le regole "area di lavoro" del CSS
    // globale — via lo spazio riservato alla barra della finestra,
    // barre di scorrimento interne sottili e stondate
    html.classList.add('area-lavoro')
    return () => {
      html.style.background = prevHtml
      document.body.style.background = prevBody
      html.classList.remove('area-lavoro')
      // ⭐ 17/08: il foglietto dell'area di lavoro NON si tocca più a mano —
      // ora è un <style> del layout e lo toglie React uscendo dall'area
    }
  }, [])

  // Il nome del demolitore in testa alla barra (si carica da solo)
  useEffect(() => {
    let vivo = true
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: u } = await supabase.from('utenti').select('nome').eq('id', session.user.id).single()
      if (vivo && u?.nome) setNome(u.nome)
    }
    carica()
    return () => { vivo = false }
  }, [])

  return (
    <>
      {/* ===== PC: barra FISSA, gemella dell'AdminSidebar ===== */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen text-white"
        style={{
          width: 210,
          background: 'linear-gradient(180deg, #2563eb 0%, #2563eb 65%, #7CA4F2 100%)',
          // Sopra la tenda "La tua azienda" (z-45): la tenda deve emergere
          // da DIETRO il bordo della barra, non passarle davanti
          zIndex: 50,
        }}
      >
        <Contenuto attiva={attiva} nome={nome} onPratiche={onPratiche} onRitiri={onRitiri} onAzienda={onAzienda} onEsci={onEsci} />
      </aside>

      {/* ===== TELEFONO: tenda da sinistra col bottone ☰ ===== */}
      <div
        onClick={onChiudiMobile}
        className="lg:hidden fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: 'rgba(17,24,39,0.45)', opacity: apertaMobile ? 1 : 0, pointerEvents: apertaMobile ? 'auto' : 'none' }}
      />
      <div
        className="lg:hidden fixed top-0 left-0 bottom-0 z-50 flex flex-col shadow-2xl transition-transform duration-300 text-white"
        style={{ width: 240, background: 'linear-gradient(180deg, #2563eb 0%, #2563eb 65%, #7CA4F2 100%)', transform: apertaMobile ? 'translateX(0)' : 'translateX(-105%)' }}
      >
        <Contenuto attiva={attiva} nome={nome} onPratiche={() => { onChiudiMobile(); onPratiche() }} onRitiri={() => { onChiudiMobile(); onRitiri() }} onAzienda={() => { onChiudiMobile(); onAzienda() }} onEsci={onEsci} />
      </div>
    </>
  )
}
