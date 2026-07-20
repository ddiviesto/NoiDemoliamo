'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminSidebar from './_components/AdminSidebar'

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
  // Pausa sopra lo stato (17/07): la pratica esce dal flusso finché non riprende
  in_attesa: boolean | null
  attesa_motivo: string | null
}

// ============================================================
// METADATI STATO (etichetta + colori pillola + barra colorata)
// ============================================================

// Etichette ALLINEATE alle 6 fasi del flusso (16/07): la pillola inizia
// sempre col nome della fase (stesso colore della casella in cima) e dopo
// il "·" tiene il dettaglio. Rosso solo per le anomalie (da rifare, a mano).
const STATO_META: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  // Fase 1 — In attesa documenti (ambra)
  in_attesa_documenti: { label: 'In attesa documenti', bg: '#FAEEDA', text: '#854F0B', bar: '#EF9F27' },
  documenti_parzialmente_approvati: { label: 'In attesa documenti · da rifare', bg: '#FBE2E2', text: '#9B1C1C', bar: '#E24B4A' },
  // Fase 2 — Documenti da verificare (blu)
  in_attesa_approvazione_admin: { label: 'Documenti da verificare', bg: '#E0EDFB', text: '#1E4E8C', bar: '#378ADD' },
  // Fase 3 — Da assegnare (corallo)
  da_assegnare: { label: 'Da assegnare', bg: '#FAECE7', text: '#92500E', bar: '#D85A30' },
  in_attesa_assegnazione: { label: 'Da assegnare · in corso', bg: '#FAECE7', text: '#92500E', bar: '#D85A30' },
  in_assegnazione_manuale: { label: 'Da assegnare · a mano', bg: '#FBE2E2', text: '#9B1C1C', bar: '#E24B4A' },
  // Fase 4 — Assegnata (viola)
  assegnata: { label: 'Assegnata', bg: '#E4E4FB', text: '#4338CA', bar: '#7F77DD' },
  in_attesa_conferma_cliente: { label: 'Assegnata · attesa cliente', bg: '#E4E4FB', text: '#4338CA', bar: '#7F77DD' },
  ritiro_confermato: { label: 'Assegnata · ritiro fissato', bg: '#E4E4FB', text: '#4338CA', bar: '#7F77DD' },
  // Fase 5 — Ritirata (teal)
  ritirata: { label: 'Ritirata', bg: '#DDF2F0', text: '#0F766E', bar: '#1D9E75' },
  in_attesa_recensione_cliente: { label: 'Ritirata · attesa recensione', bg: '#DDF2F0', text: '#0F766E', bar: '#1D9E75' },
  in_attesa_cert_rottamazione: { label: 'Ritirata · attesa rottamazione', bg: '#DDF2F0', text: '#0F766E', bar: '#1D9E75' },
  in_attesa_cert_radiazione_pra: { label: 'Ritirata · attesa PRA', bg: '#DDF2F0', text: '#0F766E', bar: '#1D9E75' },
  // Fase 6 — Completata (verde)
  completata: { label: 'Completata', bg: '#DCF3E4', text: '#1F7A43', bar: '#639922' },
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
  if (p.in_attesa && isAttiva(p.stato)) return 4 // in pausa: sotto le attive, sopra le chiuse
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

type Filtro = 'tutte' | 'moduli' | 'contattare' | 'attesa' | 'approvare' | 'assegnare' | 'assegnate' | 'ritirate' | 'completate' | 'annullate'

// ============================================================
// PIPELINE: ogni pratica appartiene a UN solo riquadro del flusso.
// 1 Moduli inseriti → 2 Da contattare → 3 Documenti da approvare →
// 4 Da assegnare → 5 Assegnate → 6 Ritirate (fatturazione) → 7 Completate
// La pratica è COMPLETATA solo col certificato di cancellazione targhe PRA.
// ============================================================

function bucketDi(p: Pratica): Filtro {
  if (p.stato === 'annullata') return 'annullate'
  if (p.stato === 'completata') return 'completate'
  // In attesa (pausa dell'admin): fuori dal flusso finché non riprende
  if (p.in_attesa) return 'attesa'
  if (['ritirata', 'in_attesa_recensione_cliente', 'in_attesa_cert_rottamazione', 'in_attesa_cert_radiazione_pra'].includes(p.stato)) return 'ritirate'
  if (['assegnata', 'in_attesa_conferma_cliente', 'ritiro_confermato'].includes(p.stato)) return 'assegnate'
  if (['da_assegnare', 'in_assegnazione_manuale', 'in_attesa_assegnazione'].includes(p.stato)) return 'assegnare'
  if (daContattare(p)) return 'contattare'
  if (p.stato === 'in_attesa_approvazione_admin') return 'approvare'
  return 'moduli' // in_attesa_documenti + documenti_parzialmente_approvati (in mano al cliente)
}

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
  const [pulisciOpen, setPulisciOpen] = useState(false)
  const [candidatiPulizia, setCandidatiPulizia] = useState<{ id: string; nome: string | null; tipo: string | null }[] | null>(null)
  const [pulendo, setPulendo] = useState(false)
  const [risultatoPulizia, setRisultatoPulizia] = useState<number | null>(null)

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      if (session.user.email !== ADMIN_EMAIL) { router.push('/dashboard'); return }

      const { data: praticheData } = await supabase
        .from('pratiche')
        .select('id, targa, tipo_mezzo, marca, modello, casistica, nome_richiedente, telefono, comune_ritiro, provincia_ritiro, libretto, certificato_proprieta, demolitore_id, stato, creato_il, aggiornato_il, in_attesa, attesa_motivo')
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

  async function apriPulizia() {
    setPulisciOpen(true)
    setCandidatiPulizia(null)
    setRisultatoPulizia(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pulisci-utenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ dry_run: true }),
      })
      const data = await res.json()
      setCandidatiPulizia(data.candidati || [])
    } catch {
      setCandidatiPulizia([])
    }
  }

  async function eseguiPulizia() {
    setPulendo(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pulisci-utenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      setRisultatoPulizia(data.eliminati ?? 0)
      setCandidatiPulizia([])
    } catch {
      setRisultatoPulizia(null)
    }
    setPulendo(false)
  }

  // Conteggi per riquadro della pipeline
  const conta = (b: Filtro) => pratiche.filter(p => bucketDi(p) === b).length
  const nDaRifare = pratiche.filter(p => p.stato === 'documenti_parzialmente_approvati').length

  // Filtro + ricerca ("Tutte" = tutto il flusso, escluse le annullate)
  const q = ricerca.trim().toLowerCase()
  const filtrate = pratiche.filter(p => {
    const b = bucketDi(p)
    if (filtro === 'tutte') { if (b === 'annullate') return false }
    else if (b !== filtro) return false
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
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>

      {/* SIDEBAR (condivisa) */}
      <AdminSidebar attivo="pratiche" extra={
        <button onClick={apriPulizia} className="mx-2.5 px-3 py-2 text-[11px] font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-left transition-colors">
          Pulisci account senza pratiche
        </button>
      } />

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* TOP BAR con ricerca */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Pratiche</h1>
            <p className="text-xs text-gray-500 mt-1">{pratiche.length} totali</p>
          </div>
          <div className="flex-1 max-w-md ml-auto">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input value={ricerca} onChange={e => setRicerca(e.target.value)} placeholder="Cerca targa, cliente, telefono…" className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400" />
              {ricerca && <button onClick={() => setRicerca('')} className="text-gray-400 hover:text-gray-600 text-sm">×</button>}
            </div>
          </div>
        </div>

        <div className="p-6 overflow-auto">

          {/* PIPELINE DEL FLUSSO PRATICHE — fila da sinistra a destra con le
              frecce, nomi allineati alla timeline del cliente (mockup 16/07).
              "Da contattare" è FUORI dalla fila: è un'anomalia, non una tappa. */}
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Flusso pratiche</div>
          <div className="mb-3 overflow-x-auto">
            <div className="flex items-stretch" style={{ minWidth: 960 }}>
              <FaseCard numero={1} nome="In attesa documenti" valore={conta('moduli')} sub={nDaRifare > 0 ? `di cui ${nDaRifare} da rifare` : undefined} subColore="#B45309" chi="cliente" vede="In attesa dei tuoi documenti" colTop="#EF9F27" colNum="#854F0B" attivo={filtro === 'moduli'} onClick={() => setFiltro(filtro === 'moduli' ? 'tutte' : 'moduli')} />
              <FrecciaFase />
              <FaseCard numero={2} nome="Documenti da verificare" valore={conta('approvare')} sub="tutto inviato, tocca a te" chi="tu" vede="Stiamo verificando i tuoi documenti" colTop="#378ADD" colNum="#1E4E8C" attivo={filtro === 'approvare'} onClick={() => setFiltro(filtro === 'approvare' ? 'tutte' : 'approvare')} />
              <FrecciaFase />
              <FaseCard numero={3} nome="Da assegnare" valore={conta('assegnare')} sub="scegli il demolitore" chi="tu" vede="Documenti verificati" colTop="#D85A30" colNum="#92500E" attivo={filtro === 'assegnare'} onClick={() => setFiltro(filtro === 'assegnare' ? 'tutte' : 'assegnare')} />
              <FrecciaFase />
              <FaseCard numero={4} nome="Assegnata" valore={conta('assegnate')} sub="ritiro da fissare o fissato" chi="demolitore" vede="Demolitore assegnato" colTop="#7F77DD" colNum="#4338CA" attivo={filtro === 'assegnate'} onClick={() => setFiltro(filtro === 'assegnate' ? 'tutte' : 'assegnate')} />
              <FrecciaFase />
              <FaseCard numero={5} nome="Ritirata" valore={conta('ritirate')} sub="certificati in arrivo · in fatturazione" chi="demolitore" vede="Veicolo ritirato" colTop="#1D9E75" colNum="#0F766E" attivo={filtro === 'ritirate'} onClick={() => setFiltro(filtro === 'ritirate' ? 'tutte' : 'ritirate')} />
              <FrecciaFase />
              <FaseCard numero={6} nome="Completata" valore={conta('completate')} sub="radiazione PRA emessa" chi="fine" vede="Pratica completata" colTop="#639922" colNum="#1F7A43" attivo={filtro === 'completate'} onClick={() => setFiltro(filtro === 'completate' ? 'tutte' : 'completate')} />
            </div>
          </div>

          {/* ALLERTE FUORI DAL FLUSSO: da contattare + in attesa (solo se >0) */}
          {(conta('contattare') > 0 || conta('attesa') > 0) && (
            <div className="flex flex-wrap gap-2.5 mb-3">
              {conta('contattare') > 0 && (
                <button
                  onClick={() => setFiltro(filtro === 'contattare' ? 'tutte' : 'contattare')}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left transition-all hover:shadow-md"
                  style={{ background: '#FEF6F6', border: `1.5px solid ${filtro === 'contattare' ? '#2563eb' : '#F3C8C8'}` }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  <span className="text-[12.5px] font-bold" style={{ color: '#9B1C1C' }}>Da contattare · {conta('contattare')}</span>
                  <span className="text-[11.5px]" style={{ color: '#B03A2E' }}>da chiamare per i documenti</span>
                </button>
              )}
              {conta('attesa') > 0 && (
                <button
                  onClick={() => setFiltro(filtro === 'attesa' ? 'tutte' : 'attesa')}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left transition-all hover:shadow-md"
                  style={{ background: '#FDF7EA', border: `1.5px solid ${filtro === 'attesa' ? '#2563eb' : '#F0DFB8'}` }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  <span className="text-[12.5px] font-bold" style={{ color: '#854F0B' }}>In attesa · {conta('attesa')}</span>
                  <span className="text-[11.5px]" style={{ color: '#B45309' }}>in pausa, fuori dal flusso finché non riprendono</span>
                </button>
              )}
            </div>
          )}

          {/* FILTRI RAPIDI */}
          <div className="flex gap-1.5 mb-3 flex-wrap text-xs">
            <ChipFiltro attivo={filtro === 'tutte'} onClick={() => setFiltro('tutte')}>Tutte {pratiche.filter(p => bucketDi(p) !== 'annullate').length}</ChipFiltro>
            <ChipFiltro attivo={filtro === 'annullate'} onClick={() => setFiltro(filtro === 'annullate' ? 'tutte' : 'annullate')}>Annullate {conta('annullate')}</ChipFiltro>
          </div>

          {/* LISTA PRATICHE A CARD */}
          {ordinate.length === 0 ? (
            <div className="card-admin px-4 py-10 text-center text-sm text-gray-500">Nessuna pratica in questa vista.</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {ordinate.map(p => {
                const m = metaStato(p.stato)
                const contatta = daContattare(p)
                const min = minutiAttesa(p)
                const rosso = rango(p) <= 2 && min > SOGLIA_ROSSO_MIN
                const chiusa = !isAttiva(p.stato)
                const barColor = contatta ? '#E24B4A' : m.bar
                const azioneRichiesta = rango(p) <= 2
                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/admin/pratiche/${p.id}`)}
                    className="group bg-white cursor-pointer transition-all hover:shadow-md hover:-translate-y-[1px]"
                    style={{ border: '1.5px solid #E5E7EB', borderLeft: `4px solid ${barColor}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.07)', opacity: chiusa ? 0.82 : 1 }}
                  >
                    {/* Quadratino icona veicolo (o spunta se chiusa) */}
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: p.stato === 'completata' ? '#DCF3E4' : '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {p.stato === 'completata'
                        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        : <IconaVeicolo tipo={p.tipo_mezzo} />}
                    </div>

                    {/* Veicolo */}
                    <div style={{ flex: 1.6, minWidth: 0 }}>
                      <div className="text-[15px] font-bold text-gray-900 truncate">{p.targa || 'Targa mancante'}{p.marca && ` · ${p.marca} ${p.modello || ''}`}</div>
                      <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>
                        {p.casistica ? (NOMI_CASISTICHE[p.casistica] || p.casistica) : (p.tipo_mezzo || '—')}
                        {p.comune_ritiro && ` · ${p.comune_ritiro}`}{p.provincia_ritiro && ` (${p.provincia_ritiro})`}
                      </div>
                    </div>

                    {/* Cliente */}
                    <div style={{ flex: 1.3, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
                      <div className="text-[13.5px] font-semibold text-gray-900 truncate">{p.nome_richiedente || '—'}</div>
                      <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>{p.telefono || ''}</div>
                    </div>

                    {/* Stato + demolitore */}
                    <div style={{ flex: 1.4, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
                      <span className="inline-block text-[11.5px] font-bold rounded-full" style={{ background: (p.in_attesa && !chiusa) ? '#FAEEDA' : contatta ? '#FDF7EA' : m.bg, color: (p.in_attesa && !chiusa) ? '#854F0B' : contatta ? '#854F0B' : m.text, padding: '4px 12px' }}>
                        {(p.in_attesa && !chiusa) ? 'In attesa' : contatta ? 'Da contattare' : m.label}
                      </span>
                      {/* Il PERCHÉ dell'attesa, sempre sott'occhio in lista */}
                      {p.in_attesa && !chiusa && p.attesa_motivo && (
                        <div className="text-[11px] mt-1 truncate" style={{ color: '#B45309' }} title={p.attesa_motivo}>
                          {p.attesa_motivo}
                        </div>
                      )}
                      {p.demolitore_id && demolitori[p.demolitore_id] && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.9" style={{ flexShrink: 0 }}><path d="M3 21h18M6 21V7l6-4 6 4v14" /></svg>
                          <span className="text-[12.5px] font-semibold truncate" style={{ color: '#374151' }}>{demolitori[p.demolitore_id]}</span>
                        </div>
                      )}
                    </div>

                    {/* Attesa */}
                    {!chiusa ? (
                      <div style={{ flexShrink: 0, textAlign: 'center', background: rosso ? '#FCEBEB' : '#F3F5F9', borderRadius: 10, padding: '6px 12px', minWidth: 74 }}>
                        <div className="text-[14px] font-bold" style={{ color: rosso ? '#A32D2D' : '#374151' }}>{formatAttesa(min)}</div>
                        <div className="text-[10px] font-semibold uppercase" style={{ color: rosso ? '#A32D2D' : '#6B7280' }}>{azioneRichiesta ? 'in attesa' : 'in corso'}</div>
                      </div>
                    ) : (
                      <div style={{ flexShrink: 0, minWidth: 74 }} />
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); setErroreElimina(null); setConfermaElimina(p) }}
                      aria-label="Elimina pratica"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}

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

      {/* MODALE PULIZIA ACCOUNT SENZA PRATICHE */}
      {pulisciOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <p className="font-semibold text-gray-900">Pulisci account senza pratiche</p>
            <p className="text-sm text-gray-500 mt-1">Verranno cancellati (account + login) solo i <b>clienti senza nessuna pratica</b>. Admin e operatori (demolitori, commercianti) non vengono mai toccati.</p>

            {risultatoPulizia != null ? (
              <div className="mt-4 rounded-xl p-4 text-center" style={{ background: '#DCF3E4' }}>
                <p className="text-sm font-semibold" style={{ color: '#1F7A43' }}>{risultatoPulizia} {risultatoPulizia === 1 ? 'account eliminato' : 'account eliminati'}</p>
              </div>
            ) : candidatiPulizia == null ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Controllo in corso…</div>
            ) : candidatiPulizia.length === 0 ? (
              <div className="mt-4 text-sm text-gray-400 text-center py-3">Nessun account da pulire. È già tutto in ordine.</div>
            ) : (
              <div className="mt-3 max-h-52 overflow-auto border border-gray-100 rounded-xl divide-y divide-gray-100">
                {candidatiPulizia.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-gray-800">{u.nome || 'Senza nome'}</span>
                    <span className="text-[11px] text-gray-400">{u.tipo || 'cliente'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={() => setPulisciOpen(false)} disabled={pulendo} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-50">
                {risultatoPulizia != null ? 'Chiudi' : 'Annulla'}
              </button>
              {risultatoPulizia == null && candidatiPulizia && candidatiPulizia.length > 0 && (
                <button onClick={eseguiPulizia} disabled={pulendo} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {pulendo ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Pulisco…</> : `Elimina ${candidatiPulizia.length}`}
                </button>
              )}
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

function IconaVeicolo({ tipo }: { tipo: string | null }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none' as const, stroke: '#2563eb', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const t = (tipo || '').toLowerCase()

  if (t === 'motoveicolo' || t === 'ciclomotore') {
    return (
      <svg {...common}>
        <circle cx="5.5" cy="17.5" r="2.5" />
        <circle cx="18.5" cy="17.5" r="2.5" />
        <path d="M15 6h2.5L20 10.5" />
        <path d="M5.5 17.5 9 11h5l4.5 6.5" />
        <path d="M9 11 7.5 8H5" />
      </svg>
    )
  }
  if (t === 'furgone' || t === 'camion') {
    return (
      <svg {...common}>
        <path d="M13 6v5a1 1 0 0 0 1 1h6.1a1 1 0 0 1 .7.3l.9.9a1 1 0 0 1 .3.7V17a1 1 0 0 1-1 1h-3" />
        <path d="M5 18H3a1 1 0 0 1-1-1V8a2 2 0 0 1 2-2h12c1.1 0 2.1.8 2.4 1.8l1.2 4.2M9 18h5" />
        <circle cx="16" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </svg>
    )
  }
  if (t === 'imbarcazione') {
    return (
      <svg {...common}>
        <path d="M12 3v14" />
        <path d="M12 4l7 9H5z" />
        <path d="M3 19c1.5 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3.5 1.5 5 0 2-1 3 0" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9m-6-6h15m-6 0V6" />
    </svg>
  )
}

// Casella di una fase del flusso (fila orizzontale con le frecce).
// "chi" dice chi deve agire in quella fase; "vede" è l'etichetta che il
// cliente legge nella SUA timeline nella stessa fase (nomenclatura allineata).
const CHI_FASE: Record<'cliente' | 'tu' | 'demolitore' | 'fine', { label: string; bg: string; color: string }> = {
  cliente: { label: 'AGISCE IL CLIENTE', bg: '#E0EDFB', color: '#1E4E8C' },
  tu: { label: 'TOCCA A TE', bg: '#2563eb', color: '#fff' },
  demolitore: { label: 'AGISCE IL DEMOLITORE', bg: '#E4E4FB', color: '#4338CA' },
  fine: { label: 'FINITA', bg: '#DCF3E4', color: '#1F7A43' },
}

function FaseCard({ numero, nome, valore, sub, subColore = '#8B95A5', chi, vede, colTop, colNum, attivo, onClick }: {
  numero: number
  nome: string
  valore: number
  sub?: string
  subColore?: string
  chi: 'cliente' | 'tu' | 'demolitore' | 'fine'
  vede: string
  colTop: string
  colNum: string
  attivo: boolean
  onClick: () => void
}) {
  const c = CHI_FASE[chi]
  return (
    <button
      onClick={onClick}
      className="bg-white text-left transition-all hover:shadow-md flex-1"
      style={{
        minWidth: 0, borderRadius: '0 0 12px 12px', padding: '11px 10px',
        border: `1.5px solid ${attivo ? '#2563eb' : '#E5E7EB'}`, borderTop: `3px solid ${colTop}`,
        boxShadow: '0 1px 3px rgba(16,24,40,0.07)',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: colNum, lineHeight: 1.1 }}>{valore}</div>
      <div className="text-[12px] font-bold leading-tight mt-1.5" style={{ color: '#0F1B33' }}>{numero} · {nome}</div>
      {sub && <div className="text-[10px] mt-0.5 leading-tight" style={{ color: subColore, fontWeight: subColore !== '#8B95A5' ? 600 : 400 }}>{sub}</div>}
      <span className="text-[9.5px] font-extrabold rounded-full mt-2" style={{ background: c.bg, color: c.color, letterSpacing: 0.5, padding: '2px 8px' }}>{c.label}</span>
      <div className="text-[10px] mt-2 pt-2 leading-snug" style={{ color: '#6B7280', borderTop: '1px dashed #E5E7EB', width: '100%' }}>
        Il cliente vede: <span style={{ color: '#374151', fontWeight: 600 }}>{vede}</span>
      </div>
    </button>
  )
}

function FrecciaFase() {
  return (
    <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B95A5', fontSize: 17, fontWeight: 700, flexShrink: 0 }}>›</div>
  )
}

function ChipFiltro({ attivo, onClick, children }: { attivo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full font-medium transition-all ${attivo ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
      {children}
    </button>
  )
}
