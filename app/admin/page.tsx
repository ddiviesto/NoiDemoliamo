'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

// Oltre questi minuti in uno stato che richiede un'azione dell'admin → "Attesa" in rosso
const SOGLIA_ROSSO_MIN = 30

// ============================================================
// TIPI
// ============================================================

interface Pratica {
  id: string
  targa: string | null
  tipo_mezzo: string | null
  marca: string | null
  modello: string | null
  casistica: string | null
  nome_richiedente: string | null
  telefono: string | null
  comune_ritiro: string | null
  provincia_ritiro: string | null
  libretto: string | null
  certificato_proprieta: string | null
  demolitore_id: string | null
  stato: string
  creato_il: string
  aggiornato_il: string | null
}

// ============================================================
// METADATI STATO (etichetta + colori pillola + barra colorata)
// ============================================================

const STATO_META: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  in_attesa_documenti: { label: 'Attesa documenti', bg: '#FAEEDA', text: '#854F0B', bar: '#EAB308' },
  in_attesa_approvazione_admin: { label: 'Documenti da approvare', bg: '#E0EDFB', text: '#1E4E8C', bar: '#378ADD' },
  documenti_parzialmente_approvati: { label: 'Documenti da rifare', bg: '#FBE2E2', text: '#9B1C1C', bar: '#E24B4A' },
  da_assegnare: { label: 'Da assegnare', bg: '#FDEBD9', text: '#92500E', bar: '#EF9F27' },
  in_attesa_assegnazione: { label: 'In assegnazione', bg: '#FDEBD9', text: '#92500E', bar: '#EF9F27' },
  in_assegnazione_manuale: { label: 'Assegnazione manuale', bg: '#FBE2E2', text: '#9B1C1C', bar: '#E24B4A' },
  assegnata: { label: 'Assegnata', bg: '#E0EDFB', text: '#1E4E8C', bar: '#378ADD' },
  in_attesa_conferma_cliente: { label: 'Attesa conferma cliente', bg: '#E0EDFB', text: '#1E4E8C', bar: '#378ADD' },
  ritiro_confermato: { label: 'Ritiro confermato', bg: '#E4E4FB', text: '#4338CA', bar: '#6366F1' },
  ritirata: { label: 'Veicolo ritirato', bg: '#EDE4FB', text: '#6B21A8', bar: '#9333EA' },
  in_attesa_recensione_cliente: { label: 'Attesa recensione', bg: '#EDE4FB', text: '#6B21A8', bar: '#9333EA' },
  in_attesa_cert_rottamazione: { label: 'Attesa cert. rottamazione', bg: '#DDF2F0', text: '#0F766E', bar: '#14B8A6' },
  in_attesa_cert_radiazione_pra: { label: 'Attesa cert. PRA', bg: '#DDF2F0', text: '#0F766E', bar: '#14B8A6' },
  completata: { label: 'Completata', bg: '#DCF3E4', text: '#1F7A43', bar: '#97C459' },
  annullata: { label: 'Annullata', bg: '#E7EAEE', text: '#4B5563', bar: '#C0C7D1' },
}

function metaStato(stato: string) {
  return STATO_META[stato] || { label: stato, bg: '#E7EAEE', text: '#4B5563', bar: '#C0C7D1' }
}

const NOMI_CASISTICHE: Record<string, string> = {
  persona_fisica: 'Persona fisica',
  eredi_accettato: 'Eredi (accettata)',
  eredi_rinuncia: 'Eredi (con rinuncia)',
  societa: 'Società',
  societa_fallita: 'Società fallita',
  associazione: 'Associazione',
  non_intestatario: 'Non intestatario',
  targhe_straniere: 'Targhe straniere',
}

// ============================================================
// HELPER PRIORITÀ / TEMPO
// ============================================================

function isAttiva(stato: string): boolean {
  return stato !== 'completata' && stato !== 'annullata'
}

function daContattare(p: Pratica): boolean {
  return isAttiva(p.stato) && (p.libretto === 'no' || p.certificato_proprieta === 'nessuno')
}

// Rango di priorità: 0 = massima urgenza (in cima)
function rango(p: Pratica): number {
  if (daContattare(p)) return 0
  if (p.stato === 'in_attesa_approvazione_admin') return 1
  if (p.stato === 'da_assegnare') return 2
  if (!isAttiva(p.stato)) return 5
  return 3
}

function minutiAttesa(p: Pratica): number {
  const d = new Date(p.aggiornato_il || p.creato_il).getTime()
  return (Date.now() - d) / 60000
}

function formatAttesa(min: number): string {
  if (min < 60) return `${Math.round(min)} min`
  const h = min / 60
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}g`
}

// ============================================================
// COMPONENTE
// ============================================================

type Filtro = 'tutte' | 'contattare' | 'approvare' | 'assegnare' | 'in_corso' | 'completate'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pratiche, setPratiche] = useState<Pratica[]>([])
  const [demolitori, setDemolitori] = useState<Record<string, string>>({})
  const [filtro, setFiltro] = useState<Filtro>('tutte')
  const [ricerca, setRicerca] = useState('')
  const [confermaElimina, setConfermaElimina] = useState<Pratica | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [erroreElimina, setErroreElimina] = useState<string | null>(null)

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      if (session.user.email !== ADMIN_EMAIL) { router.push('/dashboard'); return }

      const { data: praticheData } = await supabase
        .from('pratiche')
        .select('id, targa, tipo_mezzo, marca, modello, casistica, nome_richiedente, telefono, comune_ritiro, provincia_ritiro, libretto, certificato_proprieta, demolitore_id, stato, creato_il, aggiornato_il')
        .order('creato_il', { ascending: false })

      const { data: demoData } = await supabase.from('demolitori').select('id, ragione_sociale')
      const mappaDemo: Record<string, string> = {}
      for (const d of demoData || []) mappaDemo[d.id] = d.ragione_sociale

      if (praticheData) setPratiche(praticheData as Pratica[])
      setDemolitori(mappaDemo)
      setLoading(false)
    }
    carica()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function eliminaPratica() {
    if (!confermaElimina) return
    setEliminando(true)
    setErroreElimina(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/elimina-pratica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: confermaElimina.id }),
      })
      const data = await res.json()
      if (!res.ok) { setErroreElimina(data?.error || 'Errore durante l\'eliminazione'); setEliminando(false); return }
      setPratiche(prev => prev.filter(p => p.id !== confermaElimina.id))
      setConfermaElimina(null)
    } catch {
      setErroreElimina('Errore di rete durante l\'eliminazione.')
    }
    setEliminando(false)
  }

  // Conteggi per i riquadri "Da fare ora"
  const nContattare = pratiche.filter(daContattare).length
  const nApprovare = pratiche.filter(p => p.stato === 'in_attesa_approvazione_admin').length
  const nAssegnare = pratiche.filter(p => p.stato === 'da_assegnare').length
  const nInCorso = pratiche.filter(p => isAttiva(p.stato) && !daContattare(p) && p.stato !== 'in_attesa_approvazione_admin' && p.stato !== 'da_assegnare').length

  // Filtro + ricerca
  const q = ricerca.trim().toLowerCase()
  const filtrate = pratiche.filter(p => {
    if (filtro === 'contattare' && !daContattare(p)) return false
    if (filtro === 'approvare' && p.stato !== 'in_attesa_approvazione_admin') return false
    if (filtro === 'assegnare' && p.stato !== 'da_assegnare') return false
    if (filtro === 'in_corso' && !(isAttiva(p.stato) && !daContattare(p) && p.stato !== 'in_attesa_approvazione_admin' && p.stato !== 'da_assegnare')) return false
    if (filtro === 'completate' && isAttiva(p.stato)) return false
    if (q) {
      const blob = [p.targa, p.nome_richiedente, p.telefono, p.marca, p.modello, p.comune_ritiro].filter(Boolean).join(' ').toLowerCase()
      if (!blob.includes(q)) return false
    }
    return true
  })

  // Ordinamento: prima chi richiede la tua azione, poi chi aspetta da più tempo
  const ordinate = [...filtrate].sort((a, b) => {
    const r = rango(a) - rango(b)
    if (r !== 0) return r
    return minutiAttesa(b) - minutiAttesa(a)
  })

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#F4F5FB' }}>
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex" style={{ background: '#F4F5FB' }}>

      {/* SIDEBAR */}
      <aside className="flex flex-col flex-shrink-0 bg-white border-r border-gray-200" style={{ width: 210 }}>
        <div className="px-4 py-4 flex items-center gap-2.5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>N</div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-none">NoiDemoliamo</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 mt-1">Admin</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-2.5 flex-1">
          <NavItem attivo label="Pratiche" onClick={() => {}} icon={<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h6m-6 4h4" />} />
          <NavItem label="Demolitori" onClick={() => router.push('/admin/demolitori')} icon={<><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></>} />
          <NavItem label="Copertura" onClick={() => router.push('/admin/copertura')} icon={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>} />
        </nav>
        <button onClick={handleLogout} className="m-2.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg text-left transition-colors">
          Esci
        </button>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* TOP BAR con ricerca */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Pratiche</h1>
            <p className="text-xs text-gray-400 mt-1">{pratiche.length} totali</p>
          </div>
          <div className="flex-1 max-w-md ml-auto">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA7B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input value={ricerca} onChange={e => setRicerca(e.target.value)} placeholder="Cerca targa, cliente, telefono…" className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400" />
              {ricerca && <button onClick={() => setRicerca('')} className="text-gray-400 hover:text-gray-600 text-sm">×</button>}
            </div>
          </div>
        </div>

        <div className="p-6 overflow-auto">

          {/* DA FARE ORA */}
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Da fare ora</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <CardBucket attivo={filtro === 'contattare'} onClick={() => setFiltro(filtro === 'contattare' ? 'tutte' : 'contattare')} valore={nContattare} label="Da contattare" bordo="#F0DFB8" colore="#92500E" alert />
            <CardBucket attivo={filtro === 'approvare'} onClick={() => setFiltro(filtro === 'approvare' ? 'tutte' : 'approvare')} valore={nApprovare} label="Documenti da approvare" bordo="#B5D4F4" colore="#1E4E8C" />
            <CardBucket attivo={filtro === 'assegnare'} onClick={() => setFiltro(filtro === 'assegnare' ? 'tutte' : 'assegnare')} valore={nAssegnare} label="Da assegnare" bordo="#F6D2A8" colore="#92500E" />
            <CardBucket attivo={filtro === 'in_corso'} onClick={() => setFiltro(filtro === 'in_corso' ? 'tutte' : 'in_corso')} valore={nInCorso} label="In corso" bordo="#E5E7EB" colore="#374151" />
          </div>

          {/* FILTRI RAPIDI */}
          <div className="flex gap-1.5 mb-3 flex-wrap text-xs">
            <ChipFiltro attivo={filtro === 'tutte'} onClick={() => setFiltro('tutte')}>Tutte {pratiche.length}</ChipFiltro>
            <ChipFiltro attivo={filtro === 'completate'} onClick={() => setFiltro('completate')}>Completate/annullate</ChipFiltro>
          </div>

          {/* TABELLA */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#F7F9FC] text-[10.5px] font-bold text-gray-400 uppercase tracking-wide">
              <div style={{ width: 4 }} />
              <div style={{ flex: 2.4 }}>Veicolo</div>
              <div style={{ flex: 2 }}>Cliente</div>
              <div style={{ flex: 2 }}>Stato</div>
              <div style={{ flex: 1, textAlign: 'right' }}>Attesa</div>
              <div style={{ width: 28 }} />
            </div>

            {ordinate.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">Nessuna pratica in questa vista.</div>
            ) : (
              ordinate.map(p => {
                const m = metaStato(p.stato)
                const contatta = daContattare(p)
                const min = minutiAttesa(p)
                const rosso = rango(p) <= 2 && min > SOGLIA_ROSSO_MIN
                const barColor = contatta ? '#E24B4A' : m.bar
                return (
                  <div key={p.id} onClick={() => router.push(`/admin/pratiche/${p.id}`)} className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 cursor-pointer hover:bg-blue-50/40 transition-colors">
                    <div style={{ width: 4, height: 36, background: barColor, borderRadius: 4, flexShrink: 0 }} />
                    <div style={{ flex: 2.4, minWidth: 0 }}>
                      <div className="text-[13px] font-semibold text-gray-900 truncate">{p.targa || 'Targa mancante'}{p.marca && ` · ${p.marca} ${p.modello || ''}`}</div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {p.casistica ? (NOMI_CASISTICHE[p.casistica] || p.casistica) : (p.tipo_mezzo || '—')}
                        {p.comune_ritiro && ` · ${p.comune_ritiro}`}
                      </div>
                    </div>
                    <div style={{ flex: 2, minWidth: 0 }}>
                      <div className="text-[12.5px] text-gray-700 truncate">{p.nome_richiedente || '—'}</div>
                      <div className="text-[11px] text-gray-400 truncate">{p.telefono || ''}</div>
                    </div>
                    <div style={{ flex: 2, minWidth: 0 }}>
                      <span className="inline-block text-[10.5px] font-semibold rounded-full" style={{ background: contatta ? '#FDF7EA' : m.bg, color: contatta ? '#854F0B' : m.text, padding: '3px 9px' }}>
                        {contatta ? 'Da contattare' : m.label}
                      </span>
                      {p.demolitore_id && demolitori[p.demolitore_id] && (
                        <div className="text-[11px] text-gray-500 truncate mt-1">→ {demolitori[p.demolitore_id]}</div>
                      )}
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      {isAttiva(p.stato)
                        ? <span className="text-[11.5px] font-semibold" style={{ color: rosso ? '#C0392B' : '#6b7280' }}>{formatAttesa(min)}</span>
                        : <span className="text-[11.5px] text-gray-300">—</span>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setErroreElimina(null); setConfermaElimina(p) }}
                      aria-label="Elimina pratica"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </button>
                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>

      {/* MODALE ELIMINAZIONE DEFINITIVA */}
      {confermaElimina && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
            </div>
            <p className="text-center font-semibold text-gray-900">Eliminare definitivamente?</p>
            <p className="text-center text-sm text-gray-500 mt-1">
              La pratica <b>{confermaElimina.targa || 'senza targa'}</b>, con documenti, foto e file, sarà cancellata per sempre dal database e dai server. Non si può annullare.
            </p>
            {erroreElimina && <p className="text-center text-xs text-red-600 mt-2">{erroreElimina}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfermaElimina(null)} disabled={eliminando} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-50">Annulla</button>
              <button onClick={eliminaPratica} disabled={eliminando} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {eliminando ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Elimino…</> : 'Sì, elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ============================================================
// SOTTOCOMPONENTI
// ============================================================

function NavItem({ label, icon, attivo = false, onClick }: { label: string; icon: React.ReactNode; attivo?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${attivo ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      {label}
    </button>
  )
}

function CardBucket({ valore, label, bordo, colore, alert = false, attivo = false, onClick }: { valore: number; label: string; bordo: string; colore: string; alert?: boolean; attivo?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white rounded-xl p-3.5 text-left transition-all hover:shadow-sm" style={{ border: `1.5px solid ${attivo ? '#2563eb' : bordo}` }}>
      <div className="flex items-center gap-1.5" style={{ fontSize: 22, fontWeight: 700, color: colore }}>
        {valore}
        {alert && valore > 0 && (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
        )}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </button>
  )
}

function ChipFiltro({ attivo, onClick, children }: { attivo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full font-medium transition-all ${attivo ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
      {children}
    </button>
  )
}
