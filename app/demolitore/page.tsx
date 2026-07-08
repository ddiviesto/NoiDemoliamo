'use client'

/**
 * AREA DEMOLITORE — dashboard (fase 2).
 * Un solo layout responsive: denso da PC (segretarie), app-like dal telefono
 * (chi va a ritirare). Liste per fase della pipeline + contatori.
 * Le annullate restano SEMPRE visibili (con i motivi): strumento di
 * monitoraggio voluto da NoiDemoliamo.
 */

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  chiamataDemolitore, PraticaDemolitore, GruppoPratica, GRUPPO_LABEL,
  gruppoDi, nomeVeicolo, fmtData, fmtDataOra, eOggi, countdownScadenza,
} from './_lib/api'

const ORDINE_TAB: GruppoPratica[] = ['da_evadere', 'ritiri', 'da_certificare', 'completate', 'annullate']

export default function DashboardDemolitore() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [nome, setNome] = useState('')
  const [pratiche, setPratiche] = useState<PraticaDemolitore[]>([])
  const [tab, setTab] = useState<GruppoPratica>('da_evadere')
  // Tick al minuto per tenere vivi i countdown delle 8 ore
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: u } = await supabase.from('utenti').select('nome, tipo').eq('id', session.user.id).single()
      if (u?.tipo !== 'demolitore') {
        router.push(u?.tipo === 'admin' ? '/admin' : '/dashboard')
        return
      }
      setNome(u?.nome || '')
      try {
        const json = await chiamataDemolitore<{ pratiche: PraticaDemolitore[] }>('/api/demolitore-pratiche')
        setPratiche(json.pratiche || [])
      } catch (e) {
        setErrore(e instanceof Error ? e.message : 'Errore nel caricamento')
      }
      setLoading(false)
    }
    carica()
  }, [router])

  async function esci() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const gruppi = useMemo(() => {
    const g: Record<GruppoPratica, PraticaDemolitore[]> = { da_evadere: [], ritiri: [], da_certificare: [], completate: [], annullate: [] }
    for (const p of pratiche) g[gruppoDi(p)].push(p)
    // Da evadere: prima le più vicine alla scadenza; ritiri: prima i più imminenti
    g.da_evadere.sort((a, b) => (a.scadenza_proposta_ritiro || '').localeCompare(b.scadenza_proposta_ritiro || ''))
    g.ritiri.sort((a, b) => (a.data_ritiro_prevista || '').localeCompare(b.data_ritiro_prevista || ''))
    return g
  }, [pratiche])

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>

      {/* HEADER */}
      <div className="px-4 py-3 text-white" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">Area demolitore</div>
            <div className="text-sm font-semibold leading-tight truncate">{nome || 'Le tue pratiche'}</div>
          </div>
          <button onClick={esci} className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex-shrink-0 transition-colors">
            Esci
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-4">

        {errore && (
          <div className="rounded-xl p-3 text-sm" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>{errore}</div>
        )}

        {/* CONTATORI */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {ORDINE_TAB.map(g => {
            const n = gruppi[g].length
            const attivo = tab === g
            const critico = g === 'da_evadere' && n > 0
            return (
              <button
                key={g}
                onClick={() => setTab(g)}
                className="rounded-2xl p-2.5 text-left transition-all active:scale-[0.98]"
                style={{
                  background: attivo ? '#fff' : 'rgba(255,255,255,0.55)',
                  border: attivo ? '2px solid #2563eb' : '2px solid transparent',
                  boxShadow: attivo ? '0 4px 12px rgba(37,99,235,0.15)' : 'none',
                }}
              >
                <div className="text-[17px] font-extrabold leading-none" style={{ color: critico ? '#DC2626' : g === 'annullate' && n > 0 ? '#B91C1C' : '#1D4ED8' }}>{n}</div>
                <div className="text-[10px] font-semibold mt-1 leading-tight" style={{ color: '#4B5563' }}>{GRUPPO_LABEL[g]}</div>
              </button>
            )
          })}
        </div>

        {/* LISTA */}
        <div className="flex flex-col gap-2.5">
          {gruppi[tab].length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center" style={{ border: '1.5px solid #E5E7EB' }}>
              <p className="text-sm font-semibold text-gray-700 m-0">
                {tab === 'da_evadere' ? 'Nessuna pratica da evadere' : `Nessuna pratica in "${GRUPPO_LABEL[tab]}"`}
              </p>
              <p className="text-xs mt-1 m-0" style={{ color: '#94A3B8' }}>
                {tab === 'da_evadere' ? 'Quando NoiDemoliamo ti assegna una pratica la trovi qui.' : ''}
              </p>
            </div>
          ) : (
            gruppi[tab].map(p => <CardPratica key={p.id} p={p} onOpen={() => router.push(`/demolitore/pratiche/${p.id}`)} />)
          )}
        </div>

        {tab === 'annullate' && gruppi.annullate.length > 0 && (
          <p className="text-[11px] text-center m-0" style={{ color: '#6B7280' }}>
            Le pratiche annullate dopo l&apos;assegnazione restano qui con il motivo: NoiDemoliamo le monitora.
          </p>
        )}
      </div>
    </main>
  )
}

// ============================================================
// CARD PRATICA (badge e azione cambiano con la fase)
// ============================================================

function CardPratica({ p, onOpen }: { p: PraticaDemolitore; onOpen: () => void }) {
  const gruppo = gruppoDi(p)
  const annullata = gruppo === 'annullate'

  let badge: React.ReactNode = null
  let azione = 'Apri'
  if (gruppo === 'da_evadere') {
    const cd = countdownScadenza(p.scadenza_proposta_ritiro)
    badge = cd && (
      <span className="text-[11px] font-bold rounded-full px-2.5 py-1 flex-shrink-0" style={{ background: cd.inRitardo ? '#DC2626' : '#FEE2E2', color: cd.inRitardo ? '#fff' : '#B91C1C' }}>
        {cd.testo}
      </span>
    )
    azione = 'Fissa il ritiro'
  } else if (gruppo === 'ritiri' && p.data_ritiro_prevista) {
    const oggi = eOggi(p.data_ritiro_prevista)
    badge = (
      <span className="text-[11px] font-bold rounded-full px-2.5 py-1 flex-shrink-0" style={{ background: oggi ? '#2563EB' : '#DBEAFE', color: oggi ? '#fff' : '#1D4ED8' }}>
        {oggi ? `OGGI ${new Date(p.data_ritiro_prevista).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : `Ritiro ${fmtDataOra(p.data_ritiro_prevista)}`}
      </span>
    )
    azione = 'Apri'
  } else if (gruppo === 'da_certificare') {
    const mancaRott = !p.data_certificato_rottamazione
    badge = (
      <span className="text-[11px] font-bold rounded-full px-2.5 py-1 flex-shrink-0" style={{ background: '#FEF3C7', color: '#854F0B' }}>
        {mancaRott ? 'Manca cert. rottamazione' : 'Manca cert. PRA'}
      </span>
    )
    azione = 'Carica certificati'
  } else if (gruppo === 'completate') {
    badge = (
      <span className="text-[11px] font-bold rounded-full px-2.5 py-1 flex-shrink-0" style={{ background: '#DCF3E4', color: '#1F7A43' }}>
        Completata{p.data_certificato_pra ? ` il ${fmtData(p.data_certificato_pra)}` : ''}
      </span>
    )
  }

  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl p-3.5 transition-all hover:shadow-md active:scale-[0.995]"
      style={{ border: '1.5px solid #E5E7EB', borderLeft: annullata ? '4px solid #E24B4A' : '1.5px solid #E5E7EB' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-gray-900 truncate">
            {nomeVeicolo(p)}{p.targa ? ` · ${p.targa}` : ''}
          </div>
          <div className="text-[12px] mt-0.5 truncate" style={{ color: '#4B5563' }}>
            {[p.nome_richiedente, [p.comune_ritiro, p.provincia_ritiro ? `(${p.provincia_ritiro})` : ''].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
            {p.marciante === false && <span style={{ color: '#B91C1C', fontWeight: 600 }}> · non marciante</span>}
          </div>
        </div>
        {badge}
      </div>
      {annullata && p.motivo_annullamento && (
        <div className="text-[12px] rounded-[9px] px-2.5 py-2 mt-2" style={{ background: '#F9FAFB', color: '#4B5563', lineHeight: 1.45 }}>
          Motivo: {p.motivo_annullamento}
        </div>
      )}
      {!annullata && (
        <div className="text-[12px] font-bold mt-2" style={{ color: '#1D4ED8' }}>{azione} →</div>
      )}
    </button>
  )
}
