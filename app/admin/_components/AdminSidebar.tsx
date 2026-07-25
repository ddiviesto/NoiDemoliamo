'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

// ============================================================
// SIDEBAR CONDIVISA AREA ADMIN
// ⭐ 23/07 (variante A scelta da Davide su mockup): BLU NoiDemoliamo
// (gradiente del logo), testo e icone bianche, voce attiva "in vetro".
// `extra` = slot opzionale per azioni specifiche della pagina.
// ============================================================

type Sezione = 'pratiche' | 'demolitori'

export default function AdminSidebar({ attivo, extra }: { attivo: Sezione; extra?: React.ReactNode }) {
  const router = useRouter()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // ⭐ 23/07 (dosaggio 3 su mockup): blu pieno fino a 3/4, poi la
  // dissolvenza si apre verso un azzurro più chiaro SOLO in fondo
  return (
    <aside className="flex flex-col flex-shrink-0 text-white" style={{ width: 210, background: 'linear-gradient(180deg, #2563eb 0%, #2563eb 65%, #7CA4F2 100%)' }}>
      <div className="px-4 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
        {/* Il logo VERO in alto a sinistra (23/07, come nell'area cliente) */}
        <Image src="/NoiDemoliamoLogo.png" alt="NoiDemoliamo" width={36} height={36} className="rounded-xl flex-shrink-0" />
        <div>
          <div className="text-sm font-bold leading-none">NoiDemoliamo</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: '#BFDBFE' }}>Admin</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-2.5 flex-1">
        <NavItem attivo={attivo === 'pratiche'} label="Pratiche" onClick={() => router.push('/admin')} icon={<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h6m-6 4h4" />} />
        <NavItem attivo={attivo === 'demolitori'} label="Demolitori" onClick={() => router.push('/admin/demolitori')} icon={<><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></>} />
      </nav>
      {extra}
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
