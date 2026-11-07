'use client'

// ============================================================
// ⭐ 07/11 (Davide): "Hai una richiesta a metà". Sulla porta della home,
// se nel browser c'è la bozza di un modulo lasciato a metà (vive finché la
// scheda è aperta), compare una riga che dice da che passo si riprende.
// Legge la stessa bozza dei flussi (sessionStorage); non la tocca mai.
// ============================================================

import { useSyncExternalStore } from 'react'

const CHIAVI = { demolizione: 'noidemoliamo-bozza-inizia', valutazione: 'noidemoliamo-bozza-valutazione' } as const

function iscriviti(avvisa: () => void) {
  window.addEventListener('storage', avvisa)
  window.addEventListener('focus', avvisa)
  window.addEventListener('pageshow', avvisa)
  return () => { window.removeEventListener('storage', avvisa); window.removeEventListener('focus', avvisa); window.removeEventListener('pageshow', avvisa) }
}

function leggiPasso(chiave: string): string {
  try {
    const raw = sessionStorage.getItem(chiave)
    if (!raw) return ''
    const b = JSON.parse(raw)
    const i = typeof b?.curIdx === 'number' ? b.curIdx : typeof b?.idx === 'number' ? b.idx : -1
    return i >= 0 ? String(i + 1) : ''
  } catch {
    return ''
  }
}

export default function RipresaBozza({ modulo, chiaro = false }: { modulo: keyof typeof CHIAVI; chiaro?: boolean }) {
  const passo = useSyncExternalStore(iscriviti, () => leggiPasso(CHIAVI[modulo]), () => '')
  if (!passo) return null
  return (
    <span className="flex items-center gap-2" style={{ fontSize: 12.5, fontWeight: 600, color: chiaro ? '#fff' : '#1D4ED8', marginTop: 0, marginBottom: 14 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
      Hai una richiesta a metà: riprendi dal passo {passo}
    </span>
  )
}
