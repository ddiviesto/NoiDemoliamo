'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ============================================================
// SIDEBAR CONDIVISA AREA ADMIN
// Nav coerente su tutte le pagine (Pratiche, Demolitori, Copertura).
// `extra` = slot opzionale per azioni specifiche della pagina (es. pulizia account).
// ============================================================

type Sezione = 'pratiche' | 'demolitori'

export default function AdminSidebar({ attivo, extra }: { attivo: Sezione; extra?: React.ReactNode }) {
  const router = useRouter()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="flex flex-col flex-shrink-0 bg-white border-r border-gray-200" style={{ width: 210 }}>
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>N</div>
        <div>
          <div className="text-sm font-bold text-gray-900 leading-none">NoiDemoliamo</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 mt-1">Admin</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-2.5 flex-1">
        <NavItem attivo={attivo === 'pratiche'} label="Pratiche" onClick={() => router.push('/admin')} icon={<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h6m-6 4h4" />} />
        <NavItem attivo={attivo === 'demolitori'} label="Demolitori" onClick={() => router.push('/admin/demolitori')} icon={<><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></>} />
      </nav>
      {extra}
      <button onClick={logout} className="m-2.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg text-left transition-colors">
        Esci
      </button>
    </aside>
  )
}

function NavItem({ label, icon, attivo, onClick }: { label: string; icon: React.ReactNode; attivo: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${attivo ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      {label}
    </button>
  )
}
