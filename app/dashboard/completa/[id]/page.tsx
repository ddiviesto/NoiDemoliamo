'use client'

// ============================================================
// "COMPLETA LA PRATICA" — le quattro domande che mancano dopo che il
// cliente ha accettato la proposta (spazio per il carro attrezzi, chi
// consegna, libretto, certificato di proprietà) e la nascita della
// pratica di demolizione.
// ⚠️ 03/10: PASSAGGIO ANCORA DA COSTRUIRE (è il pezzo 3 del flusso D in
// ARCHITETTURA 8.2). Per ora la pagina dice solo che arriva a breve,
// così il bottone della card non porta a un errore.
// ============================================================

import { useRouter } from 'next/navigation'

export default function CompletaPratica() {
  const router = useRouter()
  return (
    <main className="min-h-screen flex justify-center sm:p-4 sm:pt-6 bg-white sm:bg-[linear-gradient(135deg,#e0e7ff_0%,#ddd6fe_100%)]">
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl sm:shadow-lg overflow-hidden min-h-screen sm:min-h-0" style={{ alignSelf: 'flex-start' }}>
        <div className="px-4 py-3 flex items-center gap-3 text-white" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
          <button onClick={() => router.push('/dashboard')} aria-label="Torna indietro" className="bg-white/85 hover:bg-white text-blue-700 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <div className="text-sm font-semibold leading-tight">Completa la pratica</div>
        </div>
        <div className="p-5">
          <p className="text-[14px] text-gray-700 leading-relaxed">Questo passaggio arriva a breve: ti chiederemo quattro cose (spazio per il carro attrezzi, chi consegna, libretto, certificato di proprietà) e la tua richiesta diventerà una pratica di demolizione.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-pagina mt-5">Torna alla tua area</button>
        </div>
      </div>
    </main>
  )
}
