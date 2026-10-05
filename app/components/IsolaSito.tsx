'use client'

// ============================================================
// L'ISOLA GALLEGGIANTE dell'area del cliente su PC (⭐ 05/10, mockup A)
// La pillola di vetro in cima alla scena lilla, col marchio a sinistra
// e, a destra, quello che la pagina vuole (saluto, ingranaggio, Esci,
// oppure un rimando). Solo da PC: sul telefono c'è la testata blu.
// È la stessa isola dei flussi (GuscioFlusso) e della home.
// ============================================================

import Marchio from './Marchio'

export default function IsolaSito({ destra, className = '' }: { destra?: React.ReactNode; className?: string }) {
  return (
    <div
      className={`hidden sm:flex items-center justify-between gap-4 ${className}`}
      style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 10px 30px rgba(15,27,51,0.10)', borderRadius: 999, padding: '8px 8px 8px 20px' }}
    >
      <Marchio misura={20} />
      <span className="flex items-center gap-2.5">{destra}</span>
    </div>
  )
}

/** Il bottoncino a pillola azzurra dell'isola ("Esci", "Le tue pratiche"…) */
export function PillolaIsola({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="transition-colors hover:bg-blue-100" style={{ fontSize: 12.5, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}>
      {children}
    </button>
  )
}
