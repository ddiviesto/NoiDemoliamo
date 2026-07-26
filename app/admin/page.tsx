'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
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
  // Scadenza delle 8 ore lavorative per fissare il ritiro (allerta 23/07)
  scadenza_proposta_ritiro: string | null
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

// ALLERTA 8 ORE (23/07): pratiche assegnate il cui demolitore NON ha
// fissato il ritiro entro le 8 ore lavorative — appaiono tutte nel
// riquadro rosso dedicato (e in futuro faranno partire le notifiche)
function allerta8h(p: Pratica): boolean {
  return ['assegnata', 'in_attesa_conferma_cliente'].includes(p.stato)
    && !p.in_attesa
    && !!p.scadenza_proposta_ritiro
    && new Date(p.scadenza_proposta_ritiro).getTime() < Date.now()
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

type Filtro = 'tutte' | 'moduli' | 'contattare' | 'attesa' | 'approvare' | 'assegnare' | 'assegnate' | 'ritirate' | 'completate' | 'annullate' | 'allerta8h'

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
  // 26/07: eliminazione SOLO dal dettaglio pratica (icona cestino +
  // nuvoletta con le due opzioni) — dalla lista è stata tolta.
  // 26/07: Impostazioni (tendina + pulizia account) vive in AdminSidebar,
  // così è fissa su tutte le pagine admin

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      if (session.user.email !== ADMIN_EMAIL) { router.push('/dashboard'); return }

      const { data: praticheData } = await supabase
        .from('pratiche')
        .select('id, targa, tipo_mezzo, marca, modello, casistica, nome_richiedente, telefono, comune_ritiro, provincia_ritiro, libretto, certificato_proprieta, demolitore_id, stato, creato_il, aggiornato_il, in_attesa, attesa_motivo, scadenza_proposta_ritiro')
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

  // Aggiornamento automatico (22/07): il CRM si aggiorna da solo quando i
  // clienti caricano/inviano documenti o le pratiche cambiano stato
  const ricaricaPratiche = async () => {
    const { data: praticheData } = await supabase
      .from('pratiche')
      .select('id, targa, tipo_mezzo, marca, modello, casistica, nome_richiedente, telefono, comune_ritiro, provincia_ritiro, libretto, certificato_proprieta, demolitore_id, stato, creato_il, aggiornato_il, in_attesa, attesa_motivo')
      .order('creato_il', { ascending: false })
    if (praticheData) setPratiche(praticheData as Pratica[])
  }
  useAggiornaLive({
    canale: 'admin-crm',
    tabelle: [{ tabella: 'pratiche' }],
    onCambio: ricaricaPratiche,
  })

  // Conteggi per riquadro della pipeline
  const conta = (b: Filtro) => pratiche.filter(p => bucketDi(p) === b).length

  // Filtro + ricerca ("Tutte" = tutto il flusso, escluse le annullate)
  const q = ricerca.trim().toLowerCase()
  const nAllerta8h = pratiche.filter(allerta8h).length
  const filtrate = pratiche.filter(p => {
    const b = bucketDi(p)
    if (filtro === 'tutte') { if (b === 'annullate') return false }
    else if (filtro === 'allerta8h') { if (!allerta8h(p)) return false }
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

  // Durante il caricamento la STRUTTURA resta al suo posto (barra laterale
  // compresa): la rotellina gira solo nell'area contenuti — niente lampo
  // grigio passando da una pagina all'altra (26/07)
  if (loading) {
    return (
      <main className="min-h-screen flex" style={{ background: '#ECEEF2' }}>
        <AdminSidebar attivo="pratiche" />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  // ⭐ 23/07 (variante A su mockup): via il lilla — sfondo GRIGIO chiaro,
  // barre (laterale + "Pratiche") nel blu NoiDemoliamo
  return (
    <main className="min-h-screen flex" style={{ background: '#ECEEF2' }}>

      {/* SIDEBAR (condivisa: Impostazioni e pulizia account vivono lì) */}
      <AdminSidebar attivo="pratiche" />

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* TOP BAR con ricerca — bianca (23/07: Davide la vuole come nella
            pagina Demolitori; il blu resta solo sulla barra laterale) */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Pratiche</h1>
            <p className="text-xs text-gray-500 mt-1">{pratiche.length} totali</p>
          </div>
          {/* Ricerca a PILLOLA (26/07, variante A su mockup): corta a riposo,
              si allarga dolcemente e si accende di blu quando ci scrivi */}
          <div className="ml-auto">
            <div className="flex items-center gap-2 rounded-full border px-3.5 py-2 w-[210px] focus-within:w-[300px] bg-[#F3F5F9] border-transparent focus-within:bg-white focus-within:border-blue-300 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.10)] transition-all duration-300">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input value={ricerca} onChange={e => setRicerca(e.target.value)} placeholder="Cerca…" className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400" />
              {ricerca && <button onClick={() => setRicerca('')} className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0">×</button>}
            </div>
          </div>
        </div>

        <div className="p-6 overflow-auto">

          {/* PIPELINE DEL FLUSSO PRATICHE — pillole tonde in una riga
              (variante B scelta da Davide su mockup 23/07). Sotto "Assegnata"
              vive l'ALLERTA 8 ORE: pillola IDENTICA alla fase (simmetrica),
              sempre visibile — bianca a zero, rossa quando c'è un ritardo. */}
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Flusso pratiche</div>
          <div className="mb-3 overflow-x-auto">
            <div className="flex items-start">
              <PillolaFase nome="In attesa documenti" valore={conta('moduli')} attivo={filtro === 'moduli'} onClick={() => setFiltro(filtro === 'moduli' ? 'tutte' : 'moduli')} />
              <FrecciaFase />
              <PillolaFase nome="Documenti da verificare" valore={conta('approvare')} attivo={filtro === 'approvare'} onClick={() => setFiltro(filtro === 'approvare' ? 'tutte' : 'approvare')} />
              <FrecciaFase />
              <PillolaFase nome="Da assegnare" valore={conta('assegnare')} attivo={filtro === 'assegnare'} onClick={() => setFiltro(filtro === 'assegnare' ? 'tutte' : 'assegnare')} />
              <FrecciaFase />
              <div className="flex flex-col items-stretch gap-1.5">
                <PillolaFase nome="Assegnata" valore={conta('assegnate')} attivo={filtro === 'assegnate'} onClick={() => setFiltro(filtro === 'assegnate' ? 'tutte' : 'assegnate')} />
                <PillolaFase nome="Allerta 8 ore" valore={nAllerta8h} rossa={nAllerta8h > 0} attivo={filtro === 'allerta8h'} onClick={() => setFiltro(filtro === 'allerta8h' ? 'tutte' : 'allerta8h')}
                  title={nAllerta8h > 0 ? 'Il demolitore non ha fissato il ritiro nei tempi' : 'Demolitori nei tempi: nessun ritiro in ritardo'} />
              </div>
              <FrecciaFase />
              <PillolaFase nome="Ritirata" valore={conta('ritirate')} attivo={filtro === 'ritirate'} onClick={() => setFiltro(filtro === 'ritirate' ? 'tutte' : 'ritirate')} />
              <FrecciaFase />
              <PillolaFase nome="Completata" valore={conta('completate')} attivo={filtro === 'completate'} onClick={() => setFiltro(filtro === 'completate' ? 'tutte' : 'completate')} />
            </div>
          </div>

          {/* ALLERTE FUORI DAL FLUSSO (l'allerta 8 ore ora vive sotto la
              casella "Assegnata", dentro la fila) */}
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
                const azioneRichiesta = rango(p) <= 2
                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/admin/pratiche/${p.id}`)}
                    className="group bg-white cursor-pointer transition-all hover:shadow-md hover:-translate-y-[1px]"
                    style={{ border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.07)', opacity: chiusa ? 0.82 : 1 }}
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

                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

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

// Fase del flusso come PILLOLA TONDA (variante B scelta da Davide su
// mockup 23/07): numero nel tondino, nome accanto, tutto in una riga
// bassa. `rossa` = versione allerta (stessa forma, colorata di rosso).
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

function FrecciaFase() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 42, color: '#8B95A5', fontSize: 15, fontWeight: 700, flexShrink: 0, padding: '0 5px' }}>›</div>
  )
}

function ChipFiltro({ attivo, onClick, children }: { attivo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full font-medium transition-all ${attivo ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
      {children}
    </button>
  )
}
