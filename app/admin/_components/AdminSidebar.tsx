'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Marchio from '../../components/Marchio'
import { supabase } from '@/lib/supabase'

// ============================================================
// SIDEBAR CONDIVISA AREA ADMIN
// ⭐ 23/07 (variante A scelta da Davide su mockup): BLU NoiDemoliamo
// (gradiente del logo), testo e icone bianche, voce attiva "in vetro".
// ⭐ 27/07: la voce IMPOSTAZIONI fa il FLIP — clic e la barra ruota
// mostrando la faccia delle impostazioni (voci di servizio, pronte a
// crescere); la freccetta in alto riporta alla navigazione. Via la
// vecchia tendina che si alzava.
// `extra` = slot opzionale per azioni specifiche della pagina.
// ============================================================

type Sezione = 'pratiche' | 'demolitori'

export default function AdminSidebar({ attivo, extra }: { attivo: Sezione; extra?: React.ReactNode }) {
  const router = useRouter()
  // false = faccia NAVIGAZIONE, true = faccia IMPOSTAZIONI (flip)
  const [impostazioni, setImpostazioni] = useState(false)

  // ⭐ 05/08 (segnalazione Davide): lo spazio riservato alla barra di
  // scorrimento mostra lo sfondo lavanda del sito cliente, che nel CRM
  // grigio si vede come una barretta blu sul bordo destro. Qui lo sfondo
  // dietro la pagina diventa grigio come la pagina: striscia mimetizzata.
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

  // Pulizia account senza pratiche (endpoint /api/pulisci-utenti)
  const [pulisciOpen, setPulisciOpen] = useState(false)
  const [candidatiPulizia, setCandidatiPulizia] = useState<{ id: string; nome: string | null; tipo: string | null }[] | null>(null)
  const [pulendo, setPulendo] = useState(false)
  const [risultatoPulizia, setRisultatoPulizia] = useState<number | null>(null)

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function apriPulizia() {
    setPulisciOpen(true)
    setCandidatiPulizia(null)
    setRisultatoPulizia(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pulisci-utenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ dry_run: true }),
      })
      const data = await res.json()
      setCandidatiPulizia(data.candidati || [])
    } catch {
      setCandidatiPulizia([])
    }
  }

  async function eseguiPulizia() {
    setPulendo(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pulisci-utenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      setRisultatoPulizia(data.eliminati ?? 0)
      setCandidatiPulizia([])
    } catch {
      setRisultatoPulizia(null)
    }
    setPulendo(false)
  }

  // Blocco "Esci" in fondo, uguale su entrambe le facce
  const boxEsci = (
    <div className="p-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.25)' }}>
      <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-white/15" style={{ color: '#F0F5FF' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Esci
      </button>
    </div>
  )

  // ⭐ 23/07 (dosaggio 3 su mockup): blu pieno fino a 3/4, poi la
  // dissolvenza si apre verso un azzurro più chiaro SOLO in fondo
  return (
    <aside className="flex flex-col flex-shrink-0 text-white" style={{ width: 210, background: 'linear-gradient(180deg, #2563eb 0%, #2563eb 65%, #7CA4F2 100%)' }}>
      <div className="px-4 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
        {/* Il logo VERO in alto a sinistra (23/07, come nell'area cliente) */}
        
        <div>
          <div className="leading-none"><Marchio misura={17} chiaro /></div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: '#BFDBFE' }}>Admin</div>
        </div>
      </div>

      {/* Le due FACCE che ruotano (flip 3D): navigazione ↔ impostazioni.
          ⭐ 27/07: overflow hidden — durante la rotazione la faccia "sporge"
          in 3D e senza il contenimento faceva comparire la barra di
          scorrimento della pagina (sobbalzo).
          ⭐ 27/07 sera (richiesta Davide): il blocco ESCI sta FUORI dal flip
          (resta fermo mentre la barra gira); via la freccetta da
          "Impostazioni"; il bottone in testa alla faccia impostazioni dice
          "Menu Admin" (è dove torni). */}
      <div style={{ flex: 1, position: 'relative', perspective: 1400, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transition: 'transform .55s cubic-bezier(.35,.1,.25,1)', transform: impostazioni ? 'rotateY(180deg)' : 'none' }}>

          {/* FACCIA NAVIGAZIONE */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <nav className="flex flex-col gap-1 p-2.5 flex-1">
              <NavItem attivo={attivo === 'pratiche'} label="Pratiche" onClick={() => router.push('/admin')} icon={<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h6m-6 4h4" />} />
              <NavItem attivo={attivo === 'demolitori'} label="Demolitori" onClick={() => router.push('/admin/demolitori')} icon={<><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></>} />
            </nav>
            {extra}
            <div className="mx-2.5 mb-1">
              <button onClick={() => setImpostazioni(true)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-white/15" style={{ color: '#F0F5FF' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                Impostazioni
              </button>
            </div>
          </div>

          {/* FACCIA IMPOSTAZIONI */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column' }}>
            <div className="p-2.5">
              <button onClick={() => setImpostazioni(false)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors hover:bg-white/15" style={{ color: '#fff' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                Menu Admin
              </button>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.3)', margin: '4px 8px 8px' }} />
              <button onClick={apriPulizia} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/15 text-left" style={{ color: '#F0F5FF' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="17" y1="8" x2="22" y2="13" /><line x1="22" y1="8" x2="17" y2="13" /></svg>
                <span className="leading-tight">Pulisci account senza pratiche</span>
              </button>
              {/* Le prossime voci di servizio si aggiungono qui */}
            </div>
            <div style={{ flex: 1 }} />
          </div>

        </div>
      </div>

      {/* ESCI: fuori dal flip, sempre fermo in fondo */}
      {boxEsci}

      {/* MODALE PULIZIA ACCOUNT SENZA PRATICHE */}
      {pulisciOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" style={{ color: '#111827' }}>
            <p className="font-semibold text-gray-900">Pulisci account senza pratiche</p>
            <p className="text-sm text-gray-500 mt-1">Verranno cancellati (account + login) solo i <b>clienti senza nessuna pratica</b>. Admin e operatori (demolitori, commercianti) non vengono mai toccati.</p>

            {risultatoPulizia != null ? (
              <div className="mt-4 rounded-xl p-4 text-center" style={{ background: '#DCF3E4' }}>
                <p className="text-sm font-semibold" style={{ color: '#1F7A43' }}>{risultatoPulizia} {risultatoPulizia === 1 ? 'account eliminato' : 'account eliminati'}</p>
              </div>
            ) : candidatiPulizia == null ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Controllo in corso…</div>
            ) : candidatiPulizia.length === 0 ? (
              <div className="mt-4 text-sm text-gray-400 text-center py-3">Nessun account da pulire. È già tutto in ordine.</div>
            ) : (
              <div className="mt-3 max-h-52 overflow-auto border border-gray-100 rounded-xl divide-y divide-gray-100">
                {candidatiPulizia.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-gray-800">{u.nome || 'Senza nome'}</span>
                    <span className="text-[11px] text-gray-400">{u.tipo || 'cliente'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={() => setPulisciOpen(false)} disabled={pulendo} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-50">
                {risultatoPulizia != null ? 'Chiudi' : 'Annulla'}
              </button>
              {risultatoPulizia == null && candidatiPulizia && candidatiPulizia.length > 0 && (
                <button onClick={eseguiPulizia} disabled={pulendo} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#E15E5E] hover:bg-[#D25151] rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {pulendo ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Pulisco…</> : `Elimina ${candidatiPulizia.length}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function NavItem({ label, icon, attivo, onClick }: { label: string; icon: React.ReactNode; attivo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
      style={attivo ? { background: 'rgba(255,255,255,0.22)', color: '#fff', fontWeight: 600 } : { color: '#F0F5FF' }}
      onMouseEnter={e => { if (!attivo) e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={e => { if (!attivo) e.currentTarget.style.background = 'transparent' }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      {label}
    </button>
  )
}
