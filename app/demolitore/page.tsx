'use client'

/**
 * HOME AREA DEMOLITORE — stesso LAYOUT del CRM admin (23/07/2026,
 * richiesta Davide: "uguale alla mia, solo a livello di layout, e la
 * costruiamo piano piano"). Barra bianca in alto con titolo e ricerca,
 * sfondo lavanda, fila "FLUSSO PRATICHE" con le caselle-fase, lista a
 * card stile admin. Per ora nella fila c'è SOLO la fase 1 (Assegnata ·
 * da fissare il ritiro entro 8 ore lavorative): le altre si aggiungono
 * una alla volta su indicazione di Davide.
 */

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import { useRouter } from 'next/navigation'
import { chiamataDemolitore, PraticaDemolitore, gruppoDi, countdownScadenza } from './_lib/api'
import SidebarDemolitore from './_components/SidebarDemolitore'
import PannelloAnagrafica from './_components/PannelloAnagrafica'

// Pillole di stato per la lista (stessa lingua delle pillole admin)
const PILLOLA_FASE: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  arrivo: { label: 'Da fissare il ritiro', bg: '#FBE2E2', text: '#9B1C1C', bar: '#E24B4A' },
  fissato: { label: 'Ritiro fissato', bg: '#E4E4FB', text: '#4338CA', bar: '#7F77DD' },
  rottamazione: { label: 'Ritirata · cert. rottamazione', bg: '#EDE4FB', text: '#6B21A8', bar: '#A78BFA' },
  targhe: { label: 'Attesa cancellazione targhe', bg: '#DDF2F0', text: '#0F766E', bar: '#1D9E75' },
  completate: { label: 'Completata', bg: '#DCF3E4', text: '#1F7A43', bar: '#639922' },
  annullate: { label: 'Non a buon fine', bg: '#E7EAEE', text: '#4B5563', bar: '#E24B4A' },
}

type Filtro = 'tutte' | 'arrivo'

export default function HomeDemolitore() {
  const router = useRouter()
  const [azienda, setAzienda] = useState('')
  const [pratiche, setPratiche] = useState<PraticaDemolitore[]>([])
  const [filtro, setFiltro] = useState<Filtro>('tutte')
  const [ricerca, setRicerca] = useState('')
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [anagrafica, setAnagrafica] = useState(false)
  const [menuMobile, setMenuMobile] = useState(false)
  const [, setTick] = useState(0)

  // I countdown delle 8 ore si aggiornano da soli ogni minuto
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
      setAzienda(u?.nome || '')
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

  useAggiornaLive({
    canale: 'demolitore-lista',
    onCambio: async () => {
      try {
        const json = await chiamataDemolitore<{ pratiche: PraticaDemolitore[] }>('/api/demolitore-pratiche')
        setPratiche(json.pratiche || [])
      } catch { /* silenzioso */ }
    },
    pollingMs: 20000,
  })

  async function esci() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const nArrivo = useMemo(() => pratiche.filter(p => gruppoDi(p) === 'arrivo').length, [pratiche])

  // Filtro + ricerca (come nel CRM admin)
  const q = ricerca.trim().toLowerCase()
  const filtrate = pratiche.filter(p => {
    if (filtro === 'arrivo' && gruppoDi(p) !== 'arrivo') return false
    if (q) {
      const blob = [p.targa, p.nome_richiedente, p.telefono, p.marca, p.modello, p.comune_ritiro].filter(Boolean).join(' ').toLowerCase()
      if (!blob.includes(q)) return false
    }
    return true
  })

  // Prima le da fissare (per scadenza), poi il resto del flusso
  const ORDINE_GRUPPO: Record<string, number> = { arrivo: 0, fissato: 1, rottamazione: 2, targhe: 3, completate: 4, annullate: 5 }
  const ordinate = [...filtrate].sort((a, b) => {
    const r = (ORDINE_GRUPPO[gruppoDi(a)] ?? 9) - (ORDINE_GRUPPO[gruppoDi(b)] ?? 9)
    if (r !== 0) return r
    return (a.scadenza_proposta_ritiro || a.aggiornato_il || '').localeCompare(b.scadenza_proposta_ritiro || b.aggiornato_il || '')
  })

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#ECEEF2' }}>
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex" style={{ background: '#ECEEF2' }}>

      <SidebarDemolitore
        attiva="pratiche"
        apertaMobile={menuMobile}
        onChiudiMobile={() => setMenuMobile(false)}
        onPratiche={() => setFiltro('tutte')}
        onAzienda={() => setAnagrafica(true)}
        onEsci={esci}
      />

      {/* MAIN (stesso scheletro del CRM admin) */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* TOP BAR con ricerca — bianca come nell'admin (23/07: il blu resta
            solo sulla barra laterale) */}
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4">
          {/* menu ☰ solo su telefono */}
          <button onClick={() => setMenuMobile(true)} aria-label="Menu" className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ border: '1px solid #E5E7EB' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Pratiche</h1>
            <p className="text-xs text-gray-500 mt-1">{pratiche.length} totali · {azienda}</p>
          </div>
          <div className="flex-1 max-w-md ml-auto">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input value={ricerca} onChange={e => setRicerca(e.target.value)} placeholder="Cerca targa, cliente, telefono…" className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400" />
              {ricerca && <button onClick={() => setRicerca('')} className="text-gray-400 hover:text-gray-600 text-sm">×</button>}
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6 overflow-auto">

          {errore && (
            <div className="rounded-xl p-3 text-sm mb-4 bg-white" style={{ border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>{errore}</div>
          )}

          {/* FLUSSO PRATICHE — per ora c'è solo la fase 1: le altre caselle
              si aggiungono una alla volta, su indicazione di Davide */}
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Flusso pratiche</div>
          <div className="mb-3 overflow-x-auto">
            <div className="flex items-start">
              <PillolaFase
                nome="Pratiche assegnate"
                valore={nArrivo}
                attivo={filtro === 'arrivo'}
                onClick={() => setFiltro(filtro === 'arrivo' ? 'tutte' : 'arrivo')}
              />
            </div>
          </div>

          {/* PILLOLA "TUTTE" sotto il box (come i filtri rapidi del CRM admin) */}
          <div className="flex gap-1.5 mb-3 flex-wrap text-xs">
            <button
              onClick={() => setFiltro('tutte')}
              className={`px-3 py-1.5 rounded-full font-medium transition-all ${filtro === 'tutte' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
            >
              Tutte {pratiche.length}
            </button>
          </div>

          {/* LISTA PRATICHE A CARD (stile admin) */}
          {ordinate.length === 0 ? (
            <div className="bg-white px-4 py-10 text-center text-sm text-gray-500" style={{ border: '1.5px solid #E5E7EB', borderRadius: 14 }}>Nessuna pratica in questa vista.</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {ordinate.map(p => <CardPratica key={p.id} p={p} onOpen={() => router.push(`/demolitore/pratiche/${p.id}`)} />)}
            </div>
          )}
        </div>
      </div>

      <PannelloAnagrafica aperto={anagrafica} onChiudi={() => setAnagrafica(false)} onEsci={esci} />
    </main>
  )
}

// ============================================================
// SOTTOCOMPONENTI (stessi input visivi del CRM admin)
// ============================================================

// Fase del flusso come PILLOLA TONDA — stessa forma del CRM admin
// (variante B scelta da Davide su mockup 23/07): numero nel tondino,
// nome accanto. Gemella di PillolaFase in app/admin/page.tsx.
function PillolaFase({ nome, valore, attivo, rossa, title, onClick }: {
  nome: string
  valore: number
  attivo: boolean
  rossa?: boolean
  title?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-2 transition-all hover:shadow-md flex-shrink-0"
      style={{
        background: rossa ? '#FEF6F6' : '#fff',
        border: `1.5px solid ${attivo ? '#2563eb' : rossa ? '#F3C8C8' : '#E5E7EB'}`,
        borderRadius: 999, padding: '8px 14px 8px 9px', whiteSpace: 'nowrap',
        boxShadow: attivo ? '0 0 0 3px rgba(37,99,235,0.12)' : '0 1px 3px rgba(16,24,40,0.07)',
      }}
    >
      <span className="flex items-center justify-center rounded-full" style={{ minWidth: 26, height: 26, padding: '0 6px', background: rossa ? '#FBDADA' : '#EFF4FF', color: rossa ? '#C0392B' : '#1D4ED8', fontSize: 13, fontWeight: 800 }}>{valore}</span>
      <span className="text-[12px] font-bold" style={{ color: rossa ? '#9B1C1C' : '#374151' }}>{nome}</span>
    </button>
  )
}

// Card pratica (23/07, dettata da Davide): PILLOLA per prima a sinistra
// (si capisce subito cosa fare), poi targa + modello e anno, la via di
// dove si trova, e a destra il timing. Due colori e basta: restano
// colorate SOLO la pillola e il countdown.
function CardPratica({ p, onOpen }: { p: PraticaDemolitore; onOpen: () => void }) {
  const gruppo = gruppoDi(p)
  const meta = PILLOLA_FASE[gruppo]
  const chiusa = gruppo === 'completate' || gruppo === 'annullate'
  const cd = gruppo === 'arrivo' ? countdownScadenza(p.scadenza_proposta_ritiro) : null

  const via = [
    p.indirizzo_ritiro,
    p.comune_ritiro && !(p.indirizzo_ritiro || '').toLowerCase().includes((p.comune_ritiro || '').toLowerCase()) ? p.comune_ritiro : null,
    p.provincia_ritiro ? `(${p.provincia_ritiro})` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div
      onClick={onOpen}
      className="group bg-white cursor-pointer transition-all hover:shadow-md hover:-translate-y-[1px]"
      style={{ border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.07)', opacity: chiusa ? 0.82 : 1 }}
    >
      {/* LA PILLOLA PER PRIMA: cosa c'è da fare, a colpo d'occhio */}
      <span className="inline-block text-[11.5px] font-bold rounded-full text-center flex-shrink-0" style={{ background: meta.bg, color: meta.text, padding: '5px 12px', minWidth: 132 }}>
        {meta.label}
      </span>

      {/* Targa · modello e anno + la via */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-[15px] font-bold text-gray-900 truncate">
          {p.targa || 'Targa mancante'}{p.marca && ` · ${p.marca} ${p.modello || ''}`}{p.anno ? ` ${p.anno}` : ''}
        </div>
        <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>
          {via || '—'}
        </div>
        {gruppo === 'annullate' && p.motivo_annullamento && (
          <div className="text-[11px] mt-1 truncate" style={{ color: '#4B5563' }} title={p.motivo_annullamento}>
            Motivo: {p.motivo_annullamento}
          </div>
        )}
      </div>

      {/* Il timing: countdown 8 ore per le da fissare */}
      {cd ? (
        <div style={{ flexShrink: 0, textAlign: 'center', background: '#FCEBEB', borderRadius: 10, padding: '6px 12px', minWidth: 84 }}>
          <div className="text-[14px] font-bold" style={{ color: '#A32D2D' }}>{cd.inRitardo ? 'In ritardo' : cd.testo.replace(' per fissare', '')}</div>
          <div className="text-[10px] font-semibold uppercase" style={{ color: '#A32D2D' }}>{cd.inRitardo ? cd.testo.replace('In ritardo di ', 'di ') : 'per fissare'}</div>
        </div>
      ) : (
        <div style={{ flexShrink: 0, minWidth: 84 }} />
      )}
    </div>
  )
}
