'use client'

/**
 * Freccia "indietro" per le pagine informative (privacy, termini):
 * torna alla pagina da cui l'utente è arrivato (es. lo step account del
 * modulo /inizia, che si ripristina dalla bozza), con la home come
 * ripiego quando la pagina è stata aperta direttamente.
 */

import { useRouter } from 'next/navigation'

export default function TornaIndietro() {
  const router = useRouter()

  function indietro() {
    if (window.history.length > 1) router.back()
    else router.push('/')
  }

  return (
    <button
      onClick={indietro}
      className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
      aria-label="Torna indietro"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
      </svg>
    </button>
  )
}
