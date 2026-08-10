'use client'

/**
 * SCHEDA PRATICA — AREA DEMOLITORE, TELA BIANCA (23/07/2026).
 * Davide guida la ricostruzione un pezzo alla volta: qui restano SOLO la
 * barra laterale, le briciole e la targa. Ogni elemento (azione, dati,
 * chat, note...) si aggiunge su sua indicazione, uno per volta.
 * I componenti pronti aspettano in _components/ (ChatDemolitore,
 * NoteDemolitore); gli endpoint e la logica delle azioni sono intatti.
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import { useRouter, useParams } from 'next/navigation'
import { chiamataDemolitore, nomeVeicolo } from '../../_lib/api'
import SidebarDemolitore from '../../_components/SidebarDemolitore'
import TendaAzienda from '../../_components/TendaAzienda'
import ChatDemolitore from '../../_components/ChatDemolitore'

interface PraticaDettaglio {
  id: string
  stato: string
  targa: string | null
  tipo_mezzo: string | null
  tipo_mezzo_altro: string | null
  marca: string | null
  modello: string | null
  anno: number | null
  comune_ritiro: string | null
  provincia_ritiro: string | null
}

export default function SchedaPraticaDemolitore() {
  const router = useRouter()
  const params = useParams()
  const praticaId = params.id as string

  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [pratica, setPratica] = useState<PraticaDettaglio | null>(null)
  const [aziendaAperta, setAziendaAperta] = useState(false)
  const [menuMobile, setMenuMobile] = useState(false)

  const carica = useCallback(async () => {
    try {
      const json = await chiamataDemolitore<{ pratica: PraticaDettaglio }>('/api/demolitore-pratiche', { pratica_id: praticaId })
      setPratica(json.pratica)
      setErrore('')
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore nel caricamento')
    }
    setLoading(false)
  }, [praticaId])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      carica()
    }
    init()
  }, [carica, router])

  useAggiornaLive({
    canale: `demolitore-pratica-${praticaId}`,
    onCambio: carica,
    pollingMs: 20000,
  })

  async function esci() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#ECEEF2' }}>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  if (!pratica) return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6" style={{ background: '#ECEEF2' }}>
      <p className="text-sm" style={{ color: '#374151' }}>{errore || 'Pratica non trovata'}</p>
      <button onClick={() => router.push('/demolitore')} className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>← Torna alle pratiche</button>
    </main>
  )

  const p = pratica

  return (
    // ⭐ 05/08: AD ALTEZZA SCHERMO come il CRM admin — la finestra non
    // scorre mai, scorre solo la colonna dei contenuti
    <main className="flex" style={{ background: '#ECEEF2', height: '100vh', overflow: 'hidden' }}>

      <SidebarDemolitore
        attiva={aziendaAperta ? 'azienda' : 'pratiche'}
        apertaMobile={menuMobile}
        onChiudiMobile={() => setMenuMobile(false)}
        onPratiche={() => router.push('/demolitore')}
        onRitiri={() => router.push('/demolitore/ritiri')}
        onAzienda={() => setAziendaAperta(x => !x)}
        onEsci={esci}
      />

      <div className="flex-1 min-w-0 overflow-y-auto">

        {/* barra mobile col menu ☰ — bianca come le barre in alto (23/07) */}
        <div className="lg:hidden bg-white flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <button onClick={() => setMenuMobile(true)} aria-label="Menu" className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ border: '1px solid #E5E7EB' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <button onClick={() => router.push('/demolitore')} className="text-[12px] font-semibold" style={{ color: '#6B7280' }}>← Pratiche</button>
        </div>

        <div className="px-5 py-5">
          {/* briciole + targa: il punto di partenza, il resto lo decide Davide */}
          <div className="text-[11.5px] mb-2" style={{ color: '#8A94A1' }}>
            <button onClick={() => router.push('/demolitore')} className="hover:underline">Pratiche</button>
            {' / '}<b style={{ color: '#374151' }}>{p.targa || 'Senza targa'}</b>
          </div>
          <div className="text-[21px] font-extrabold" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', letterSpacing: 2, color: '#111827' }}>
            {p.targa || 'SENZA TARGA'}
          </div>
          <div className="text-[12px] mt-1" style={{ color: '#8A94A1' }}>
            {nomeVeicolo(p)}{p.anno ? ` ${p.anno}` : ''} · {[p.comune_ritiro, p.provincia_ritiro ? `(${p.provincia_ritiro})` : ''].filter(Boolean).join(' ')}
          </div>

          {/* ⭐ 26/07 (dettato da Davide): CHAT con Cliente e con NoiDemoliamo */}
          <div className="mt-5" style={{ maxWidth: 520 }}>
            <ChatDemolitore praticaId={p.id} bloccata={p.stato === 'annullata' || p.stato === 'completata'} />
          </div>
        </div>
      </div>

      <TendaAzienda aperta={aziendaAperta} onChiudi={() => setAziendaAperta(false)} />
    </main>
  )
}
