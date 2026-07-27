'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import AdminSidebar from './_components/AdminSidebar'
// Card vere del dettaglio, aperte IN LINEA dentro la tendina (26/07)
import DocumentiApprovazione from './pratiche/[id]/DocumentiApprovazione'
import ChatAdmin from './pratiche/[id]/ChatAdmin'
import CronologiaNote from './pratiche/[id]/CronologiaNote'

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
  // ⭐ Campi per la TENDINA sotto la riga (26/07): Cliente · Casistiche ·
  // Veicolo · Ritiro
  user_id: string | null
  codice_fiscale: string | null
  anno: string | number | null
  km: string | number | null
  tipo_cambio: string | null
  incidentato: boolean | null
  marciante: boolean | null
  va_in_moto: boolean | null
  parti_mancanti: boolean | null
  fermo_amministrativo: string | null
  targhe_presenti: boolean | null
  indirizzo_ritiro: string | null
  cap_ritiro: string | null
  spazio_carro_attrezzi: string | null
  delegato_nome: string | null
  delegato_telefono: string | null
  // ⭐ Assegnazione e importo nella tendina (27/07)
  fee_concordata: number | null
  data_assegnazione: string | null
  // ⭐ Date del demolitore in riga (27/07, mockup approvato)
  data_ritiro_prevista: string | null
  data_ritiro_effettuato: string | null
  // ⭐ Il PERCHÉ dell'annullo in riga (27/07 sera, come il motivo dell'attesa)
  motivo_annullamento: string | null
}

// Candidato del pannello assegnazione (27/07): la classifica del dry-run
// arricchita dal server con fee applicabile, zona della tariffa e carico
interface CandidatoTendina {
  id: string
  ragione_sociale: string
  citta?: string | null
  distanza_km?: number
  durata_minuti?: number
  velocita_media_giorni?: number
  fee_applicabile?: number | null
  zona_fee?: string | null
  da_ritirare?: number
}

// Etichette leggibili per la tendina
const LIBRETTO_LABEL: Record<string, string> = { si: "Ha l'originale", denuncia: 'Denuncia di smarrimento', no: 'Non ce l\'ha' }
const CDC_LABEL: Record<string, string> = { digitale: 'Digitale', cartaceo: 'Cartaceo', documento_unico: 'Documento unico', smarrito: 'Smarrito', nessuno: 'Da chiarire' }
const FERMO_LABEL: Record<string, string> = { si: 'Sì', no: 'No', non_so: 'Da verificare' }
const SPAZIO_LABEL: Record<string, string> = { libero: 'Accesso libero', stretto: 'Spazio stretto', no: 'Non passa' }

// Le quattro sezioni della tendina (modifica sul posto, 27/07)
type SezioneTendina = 'cliente' | 'casistiche' | 'veicolo' | 'ritiro'

// Campo "slim" della modifica sul posto: stessa taglia del valore in
// lettura, solo il FILO BLU sotto (pattern delle impostazioni cliente)
const CAMPO_TENDINA = 'w-full h-[22px] bg-transparent border-0 border-b-2 border-blue-300 focus:border-blue-600 rounded-none outline-none text-[11.5px] text-right text-gray-900 px-0.5 transition-colors placeholder:text-gray-400'

// Un'unica lista di campi per il caricamento e le ricariche (stessa forma)
const CAMPI_LISTA = 'id, targa, tipo_mezzo, marca, modello, casistica, nome_richiedente, telefono, comune_ritiro, provincia_ritiro, libretto, certificato_proprieta, demolitore_id, stato, creato_il, aggiornato_il, in_attesa, attesa_motivo, scadenza_proposta_ritiro, user_id, codice_fiscale, anno, km, tipo_cambio, incidentato, marciante, va_in_moto, parti_mancanti, fermo_amministrativo, targhe_presenti, indirizzo_ritiro, cap_ritiro, spazio_carro_attrezzi, delegato_nome, delegato_telefono, fee_concordata, data_assegnazione, data_ritiro_prevista, data_ritiro_effettuato, motivo_annullamento'

// ============================================================
// METADATI STATO (etichetta + colori pillola + barra colorata)
// ============================================================

// ⭐ PALETTE A (26/07, mockup approvato): il FLUSSO è tutto AZZURRO (parla
// il testo della pillola), le eccezioni vere sono le uniche colorate:
// verde = completata, ROSSO TENUE = annullata e anomalie, rosso medio
// pieno = "Da contattare". Via il giallo senape e l'arcobaleno.
const PILL_FLUSSO = { bg: '#EFF6FF', text: '#1D4ED8' }
const PILL_ROSSO_TENUE = { bg: '#F3D9D9', text: '#A94444' }
const STATO_META: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  // Fase 1 — In attesa documenti
  in_attesa_documenti: { label: 'In attesa documenti', ...PILL_FLUSSO, bar: '#EF9F27' },
  documenti_parzialmente_approvati: { label: 'In attesa documenti · da rifare', ...PILL_ROSSO_TENUE, bar: '#E24B4A' },
  // Fase 2 — Documenti da verificare
  in_attesa_approvazione_admin: { label: 'Documenti da verificare', ...PILL_FLUSSO, bar: '#378ADD' },
  // Fase 3 — Da assegnare
  da_assegnare: { label: 'Da assegnare', ...PILL_FLUSSO, bar: '#D85A30' },
  in_attesa_assegnazione: { label: 'Da assegnare · in corso', ...PILL_FLUSSO, bar: '#D85A30' },
  in_assegnazione_manuale: { label: 'Da assegnare · a mano', ...PILL_ROSSO_TENUE, bar: '#E24B4A' },
  // Fase 4 — Assegnata
  assegnata: { label: 'Assegnata', ...PILL_FLUSSO, bar: '#7F77DD' },
  in_attesa_conferma_cliente: { label: 'Assegnata · attesa cliente', ...PILL_FLUSSO, bar: '#7F77DD' },
  // ⭐ 27/07 (rinomine di Davide): "Ritiro Programmato" secco; la famiglia
  // del ritiro resta "Ritirata" (il "Mezzo Ritirato" è stato ripensato)
  ritiro_confermato: { label: 'Ritiro Programmato', ...PILL_FLUSSO, bar: '#7F77DD' },
  // Fase 5 — Ritirata
  ritirata: { label: 'Ritirata · Attesa Certificati', ...PILL_FLUSSO, bar: '#1D9E75' },
  in_attesa_recensione_cliente: { label: 'Ritirata · attesa recensione', ...PILL_FLUSSO, bar: '#1D9E75' },
  in_attesa_cert_rottamazione: { label: 'Ritirata · Attesa Certificati', ...PILL_FLUSSO, bar: '#1D9E75' },
  in_attesa_cert_radiazione_pra: { label: 'Ritirata · Attesa PRA', ...PILL_FLUSSO, bar: '#1D9E75' },
  // Fase 6 — Completata (verde, l'unico traguardo)
  completata: { label: 'Completata', bg: '#DCF3E4', text: '#1F7A43', bar: '#639922' },
  annullata: { label: 'Annullata', ...PILL_ROSSO_TENUE, bar: '#C0C7D1' },
}

function metaStato(stato: string) {
  return STATO_META[stato] || { label: stato, bg: '#EDF0F5', text: '#64748B', bar: '#C0C7D1' }
}

// Data corta con l'anno per i boxini di riga (gg/mm/aa)
function fmtDataBox(x: string) {
  return new Date(x).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
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

// ⭐ 27/07: anche il FERMO "non lo sa" fa scattare il Da contattare
// (decisione Davide): tutte e tre le risposte critiche del modulo si
// chiariscono al telefono prima di procedere
function daContattare(p: Pratica): boolean {
  return isAttiva(p.stato) && (p.libretto === 'no' || p.certificato_proprieta === 'nessuno' || p.fermo_amministrativo === 'non_so')
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

type Filtro = 'tutte' | 'moduli' | 'contattare' | 'attesa' | 'approvare' | 'assegnare' | 'assegnate' | 'programmato' | 'ritirate' | 'certificati' | 'pra' | 'completate' | 'annullate' | 'allerta8h'

// ============================================================
// PIPELINE: ogni pratica appartiene a UN solo riquadro del flusso.
// 1 Moduli inseriti → 2 Da contattare → 3 Documenti da approvare →
// 4 Da assegnare → 5 Assegnate → 6 Ritiro Programmato → 7 Ritirate
// (Attesa Certificati / Attesa PRA, fatturazione) → 8 Completate.
// ⭐ 27/07 (variante B su mockup): "Ritirata" nella fila è la SOMMA di
// Attesa Certificati + Attesa PRA (colonnina come Assegnata/Allerta).
// La pratica è COMPLETATA solo col certificato di cancellazione targhe PRA.
// ============================================================

function bucketDi(p: Pratica): Filtro {
  if (p.stato === 'annullata') return 'annullate'
  if (p.stato === 'completata') return 'completate'
  // In attesa (pausa dell'admin): fuori dal flusso finché non riprende
  if (p.in_attesa) return 'attesa'
  if (p.stato === 'in_attesa_cert_radiazione_pra') return 'pra'
  if (['ritirata', 'in_attesa_recensione_cliente', 'in_attesa_cert_rottamazione'].includes(p.stato)) return 'certificati'
  if (p.stato === 'ritiro_confermato') return 'programmato'
  if (['assegnata', 'in_attesa_conferma_cliente'].includes(p.stato)) return 'assegnate'
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

  // ⭐ TENDINA SOTTO LA RIGA (26/07, scelta di Davide): clic su una pratica
  // = sotto si apre un pannello con transizione morbida (grid 0fr→1fr),
  // ritocco = si richiude. I dati dentro li detta Davide, un pezzo alla volta.
  const [selId, setSelId] = useState<string | null>(null)
  // Email dell'account (da `utenti`): caricata al primo giro di apertura
  const [emailAccounts, setEmailAccounts] = useState<Record<string, string>>({})
  // ⭐ BOTTONI AZIONE nella tendina (26/07): Documenti e Chat si aprono
  // IN LINEA dentro il blocco (niente finestre sopra la pagina); il menu
  // Stato pratica è una nuvoletta attaccata al bottone, col motivo scritto
  // lì dentro per attesa e annullo.
  // ⭐ 27/07 sera (mockup approvato): la CRONOLOGIA è la prima SCHEDA della
  // fila (via pillola e finestrella); la pillola Documenti apre DIRETTAMENTE
  // il visore (niente riquadro che arriva in ritardo e fa scattare la fila):
  // incrementa il trigger e il visore si apre sul primo da verificare
  const [docTrigger, setDocTrigger] = useState<Record<string, number>>({})
  const [selChatAperta, setSelChatAperta] = useState(false)
  const [menuStato, setMenuStato] = useState<null | 'menu' | 'attesa' | 'annulla'>(null)
  const [motivoStato, setMotivoStato] = useState('')
  const [statoBusy, setStatoBusy] = useState(false)
  const [statoErr, setStatoErr] = useState<string | null>(null)
  // ⭐ ASSEGNAZIONE, IMPORTO ed ELIMINAZIONE nella tendina (27/07, mockup
  // definitivo): pannello assegnazione a DESTRA delle schede, importo a
  // nuvoletta sulla pillola, cestino tondo con nuvoletta a due scelte
  const [selAssegnaAperta, setSelAssegnaAperta] = useState(false)
  const [nuvolaImporto, setNuvolaImporto] = useState(false)
  const [importoVal, setImportoVal] = useState('')
  const [importoBusy, setImportoBusy] = useState(false)
  const [importoErr, setImportoErr] = useState<string | null>(null)
  const [nuvolaElimina, setNuvolaElimina] = useState(false)
  const [eliminando, setEliminando] = useState<null | 'pratica' | 'account'>(null)
  const [eliminaErr, setEliminaErr] = useState<string | null>(null)
  // Contatori per i bottoni (caricati all'apertura della tendina)
  const [docStats, setDocStats] = useState<Record<string, { totale: number; approvati: number; daVerificare: number }>>({})
  const [nonLetti, setNonLetti] = useState<Record<string, number>>({})

  // ⭐ 27/07 sera (richiesta Davide): spostarsi sul flusso CHIUDE la pratica
  // aperta (tendina, chat e nuvolette) — niente tendine rimaste appese
  function cambiaFiltro(f: Filtro) {
    setSelId(null)
    setSelChatAperta(false)
    setSelAssegnaAperta(false)
    setMenuStato(null)
    setNuvolaImporto(false)
    setNuvolaElimina(false)
    setFiltro(f)
  }

  function apriPratica(p: Pratica) {
    setSelChatAperta(false)
    setMenuStato(null)
    setMotivoStato('')
    setStatoErr(null)
    setSezEdit(null)
    setSelAssegnaAperta(false)
    setNuvolaImporto(false)
    setImportoVal('')
    setImportoErr(null)
    setNuvolaElimina(false)
    setEliminaErr(null)
    // ⭐ 27/07 sera (richiesta Davide): se stavi CERCANDO, cliccare la pratica
    // vuol dire "trovata" — il testo del cerca si cancella e il flusso si
    // sposta NELLA SUA CASELLA (così sei dove la pratica vive davvero)
    if (ricerca.trim() && selId !== p.id) {
      setRicerca('')
      setFiltro(bucketDi(p))
    }
    setSelId(prev => (prev === p.id ? null : p.id))
    if (p.user_id && emailAccounts[p.id] === undefined) {
      supabase.from('utenti').select('email').eq('id', p.user_id).single()
        .then(({ data }) => setEmailAccounts(prev => ({ ...prev, [p.id]: data?.email || '' })))
    }
    aggiornaContatori(p.id)
  }

  // Contatori dei bottoni: documenti (approvati/totale + da verificare) e
  // messaggi del cliente non letti
  async function aggiornaContatori(praticaId: string) {
    const { data } = await supabase
      .from('pratica_documenti_checklist')
      .select('stato, casistiche_documenti(richiede_upload)')
      .eq('pratica_id', praticaId)
    const righe = ((data || []) as { stato: string; casistiche_documenti: { richiede_upload?: boolean } | null }[])
      .filter(r => r.casistiche_documenti?.richiede_upload)
    setDocStats(prev => ({ ...prev, [praticaId]: {
      totale: righe.length,
      approvati: righe.filter(r => r.stato === 'approvato').length,
      daVerificare: righe.filter(r => r.stato === 'caricato').length,
    } }))
    // Non letti DIRETTI A TE: dal cliente (canale cliente↔NoiDemoliamo,
    // vecchi inclusi) e dal demolitore (canale demolitore↔NoiDemoliamo)
    const { data: nonLettiRighe } = await supabase
      .from('messaggi_chat')
      .select('mittente_tipo, conversazione')
      .eq('pratica_id', praticaId)
      .eq('letto', false)
      .in('mittente_tipo', ['cliente', 'demolitore'])
    const n = ((nonLettiRighe || []) as { mittente_tipo: string; conversazione: string | null }[]).filter(r =>
      r.mittente_tipo === 'cliente'
        ? (r.conversazione == null || r.conversazione === 'cliente_noidemoliamo')
        : r.conversazione === 'demolitore_noidemoliamo'
    ).length
    setNonLetti(prev => ({ ...prev, [praticaId]: n }))
  }

  // ⭐ IMPORTO una tantum dalla nuvoletta (27/07): stesso server del
  // dettaglio (/api/pratica-fee); vuoto o rimosso = tariffa di zona
  async function salvaImporto(p: Pratica, fee: number | null) {
    setImportoBusy(true)
    setImportoErr(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pratica-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: p.id, fee }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setImportoErr(data?.error || 'Errore nel salvataggio'); setImportoBusy(false); return }
      setNuvolaImporto(false)
      setImportoVal('')
      await ricaricaPratiche()
    } catch {
      setImportoErr('Errore di rete.')
    }
    setImportoBusy(false)
  }

  // ⭐ ELIMINAZIONE dalla tendina (27/07): nuvoletta a due scelte sul
  // cestino della fila azioni, stesso endpoint del dettaglio
  async function eliminaDallaTendina(p: Pratica, eliminaAccount: boolean) {
    setEliminando(eliminaAccount ? 'account' : 'pratica')
    setEliminaErr(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/elimina-pratica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: p.id, elimina_account: eliminaAccount }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setEliminaErr(data?.error || 'Errore durante l\'eliminazione'); setEliminando(null); return }
      if (eliminaAccount && data?.account_non_eliminato_motivo) alert(data.account_non_eliminato_motivo)
      setNuvolaElimina(false)
      setSelId(null)
      await ricaricaPratiche()
    } catch {
      setEliminaErr('Errore di rete.')
    }
    setEliminando(null)
  }

  // ⭐ MODIFICA SUL POSTO nelle sezioni della tendina (27/07, variante 1 su
  // mockup): matita per sezione, righe ad altezza fissa, campi col filo blu
  // in dissolvenza, zero sobbalzi. Salvataggio via server: /api/pratica-dati
  // (whitelist + sincronizzazione checklist per libretto/fermo/targhe), il
  // certificato di proprietà passa da /api/pratica-cdc.
  const [sezEdit, setSezEdit] = useState<SezioneTendina | null>(null)
  const [bozza, setBozza] = useState<Record<string, unknown>>({})
  const [salvandoSez, setSalvandoSez] = useState(false)
  const [erroreSez, setErroreSez] = useState<string | null>(null)
  const setB = (campo: string, valore: unknown) => setBozza(prev => ({ ...prev, [campo]: valore }))
  const sb = (campo: string) => (bozza[campo] as string) ?? ''

  function apriSez(p: Pratica, quale: SezioneTendina) {
    setErroreSez(null)
    setSezEdit(quale)
    setBozza({
      nome_richiedente: p.nome_richiedente || '', telefono: p.telefono || '', codice_fiscale: p.codice_fiscale || '',
      // Dichiarazioni: nei campi finiscono SOLO gli esiti ammessi (17/07),
      // gli altri valori restano come "Scegli…" disabilitato
      libretto: p.libretto === 'si' || p.libretto === 'denuncia' ? p.libretto : '',
      certificato_proprieta: ['digitale', 'cartaceo', 'smarrito'].includes(p.certificato_proprieta || '') ? p.certificato_proprieta : '',
      fermo_amministrativo: p.fermo_amministrativo === 'si' || p.fermo_amministrativo === 'no' ? p.fermo_amministrativo : '',
      targhe_presenti: p.targhe_presenti == null ? '' : p.targhe_presenti ? 'presenti' : 'assenti',
      targa: p.targa || '', marca: p.marca || '', modello: p.modello || '',
      anno: p.anno != null ? String(p.anno) : '', km: p.km != null ? String(p.km) : '',
      tipo_cambio: p.tipo_cambio === 'manuale' || p.tipo_cambio === 'automatico' ? p.tipo_cambio : '',
      incidentato: p.incidentato, marciante: p.marciante, va_in_moto: p.va_in_moto, parti_mancanti: p.parti_mancanti,
      indirizzo_ritiro: p.indirizzo_ritiro || '', spazio_carro_attrezzi: p.spazio_carro_attrezzi || '',
      delegato_nome: p.delegato_nome || '', delegato_telefono: p.delegato_telefono || '',
    })
  }

  async function salvaSez(p: Pratica) {
    if (!sezEdit) return
    setSalvandoSez(true)
    setErroreSez(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }
      const dati: Record<string, unknown> = {}
      if (sezEdit === 'cliente') {
        dati.nome_richiedente = sb('nome_richiedente')
        dati.telefono = sb('telefono')
        dati.codice_fiscale = sb('codice_fiscale')
      } else if (sezEdit === 'casistiche') {
        if (sb('libretto')) dati.libretto = sb('libretto')
        if (sb('fermo_amministrativo')) dati.fermo_amministrativo = sb('fermo_amministrativo')
        if (sb('targhe_presenti')) dati.targhe_presenti = sb('targhe_presenti') === 'presenti'
        // Il CDC passa dal SUO endpoint: sincronizza la checklist del cliente
        const cdc = sb('certificato_proprieta')
        if (cdc && cdc !== (p.certificato_proprieta || '')) {
          const resCdc = await fetch('/api/pratica-cdc', { method: 'POST', headers, body: JSON.stringify({ pratica_id: p.id, cdc }) })
          const jCdc = await resCdc.json().catch(() => null)
          if (!resCdc.ok) throw new Error(jCdc?.error || 'Errore nel salvataggio del certificato')
        }
      } else if (sezEdit === 'veicolo') {
        dati.targa = sb('targa')
        dati.marca = sb('marca')
        dati.modello = sb('modello')
        dati.anno = sb('anno')
        dati.km = sb('km')
        if (sb('tipo_cambio')) dati.tipo_cambio = sb('tipo_cambio')
        for (const c of ['incidentato', 'marciante', 'va_in_moto', 'parti_mancanti']) {
          if (typeof bozza[c] === 'boolean') dati[c] = bozza[c]
        }
      } else {
        dati.indirizzo_ritiro = sb('indirizzo_ritiro')
        if (sb('spazio_carro_attrezzi')) dati.spazio_carro_attrezzi = sb('spazio_carro_attrezzi')
        if (!(p.casistica === 'non_intestatario' || p.casistica === 'targhe_straniere')) {
          dati.delegato_nome = sb('delegato_nome')
          dati.delegato_telefono = sb('delegato_telefono')
        }
      }
      if (Object.keys(dati).length > 0) {
        const res = await fetch('/api/pratica-dati', { method: 'POST', headers, body: JSON.stringify({ pratica_id: p.id, dati }) })
        const j = await res.json().catch(() => null)
        if (!res.ok) throw new Error(j?.error || 'Errore nel salvataggio')
      }
      await ricaricaPratiche()
      aggiornaContatori(p.id)
      setSezEdit(null)
    } catch (e) {
      setErroreSez(e instanceof Error && e.message ? e.message : 'Errore nel salvataggio. Riprova.')
    }
    setSalvandoSez(false)
  }

  // ---- Cambi di stato dal menu (stessa logica del dettaglio: tutto via server) ----
  async function notaAutomatica(praticaId: string, testo: string) {
    try { await supabase.from('pratiche_note').insert({ pratica_id: praticaId, testo }) } catch { /* tabella assente */ }
  }

  async function azioneStato(p: Pratica, azione: 'attiva' | 'attesa' | 'annulla') {
    setStatoBusy(true)
    setStatoErr(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }
      if (azione === 'attiva') {
        if (p.stato === 'annullata') {
          const res = await fetch('/api/pratica-annulla', { method: 'POST', headers, body: JSON.stringify({ pratica_id: p.id, riattiva: true }) })
          if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error || 'Errore') }
          await notaAutomatica(p.id, 'Pratica riattivata')
        } else if (p.in_attesa) {
          const res = await fetch('/api/pratica-dati', { method: 'POST', headers, body: JSON.stringify({ pratica_id: p.id, dati: { in_attesa: false, attesa_motivo: null, attesa_dal: null } }) })
          if (!res.ok) throw new Error('Errore')
          await notaAutomatica(p.id, 'Pratica ripresa')
        }
      } else if (azione === 'attesa') {
        const motivo = motivoStato.trim()
        if (!motivo) { setStatoErr('Scrivi il motivo: resterà nella cronologia.'); setStatoBusy(false); return }
        const res = await fetch('/api/pratica-dati', { method: 'POST', headers, body: JSON.stringify({ pratica_id: p.id, dati: { in_attesa: true, attesa_motivo: motivo, attesa_dal: new Date().toISOString() } }) })
        if (!res.ok) throw new Error('Errore')
        await notaAutomatica(p.id, `Messa in attesa: ${motivo}`)
      } else {
        const motivo = motivoStato.trim()
        if (!motivo) { setStatoErr('Scrivi il motivo dell\'annullamento: resterà nella cronologia.'); setStatoBusy(false); return }
        const res = await fetch('/api/pratica-annulla', { method: 'POST', headers, body: JSON.stringify({ pratica_id: p.id, motivo }) })
        if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error || 'Errore') }
        await notaAutomatica(p.id, `Pratica annullata: ${motivo}`)
      }
      const fresche = await ricaricaPratiche()
      setMenuStato(null)
      setMotivoStato('')
      // ⭐ 27/07 sera (variante A su mockup): alla RIATTIVAZIONE il flusso ti
      // PORTA nella casella di destinazione (pillola azzurra accesa) e la
      // pratica resta aperta — mai più "riattivo e non so dove va"
      if (azione === 'attiva' && fresche) {
        const nuova = fresche.find(x => x.id === p.id)
        if (nuova) setFiltro(bucketDi(nuova))
      }
    } catch (e) {
      setStatoErr(e instanceof Error && e.message !== 'Errore' ? e.message : 'Errore nel salvataggio. Riprova.')
    }
    setStatoBusy(false)
  }

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      if (session.user.email !== ADMIN_EMAIL) { router.push('/dashboard'); return }

      const { data: praticheData } = await supabase
        .from('pratiche')
        .select(CAMPI_LISTA)
        .order('creato_il', { ascending: false })

      const { data: demoData } = await supabase.from('demolitori').select('id, ragione_sociale')
      const mappaDemo: Record<string, string> = {}
      for (const d of demoData || []) mappaDemo[d.id] = d.ragione_sociale

      if (praticheData) setPratiche(praticheData as Pratica[])
      setDemolitori(mappaDemo)
      setLoading(false)

      // ⭐ 27/07: /admin?apri=<id> apre subito la TENDINA di quella pratica
      // (ci arriva la scheda demolitore, ora che la pagina intera non c'è più)
      const apriId = new URLSearchParams(window.location.search).get('apri')
      if (apriId && praticheData) {
        const daAprire = (praticheData as Pratica[]).find(x => x.id === apriId)
        if (daAprire) apriPratica(daAprire)
        window.history.replaceState(null, '', '/admin')
      }
    }
    carica()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Aggiornamento automatico (22/07): il CRM si aggiorna da solo quando i
  // clienti caricano/inviano documenti o le pratiche cambiano stato
  const ricaricaPratiche = async () => {
    const { data: praticheData } = await supabase
      .from('pratiche')
      .select(CAMPI_LISTA)
      .order('creato_il', { ascending: false })
    if (praticheData) setPratiche(praticheData as Pratica[])
    // La lista fresca serve a chi deve guardare la pratica APPENA aggiornata
    // (es. la riattivazione, che segue la pratica nella sua casella)
    return (praticheData as Pratica[] | null) || null
  }
  useAggiornaLive({
    canale: 'admin-crm',
    tabelle: [{ tabella: 'pratiche' }],
    onCambio: ricaricaPratiche,
  })

  // Conteggi per riquadro della pipeline
  const conta = (b: Filtro) => pratiche.filter(p => bucketDi(p) === b).length

  // Filtro + ricerca ("Tutte" = tutto il flusso, escluse le annullate)
  // ⭐ 27/07 sera (richiesta Davide): la RICERCA vale DAPPERTUTTO — appena
  // scrivi, il filtro attivo si ignora e si cerca su TUTTE le pratiche
  // (annullate comprese), da qualsiasi casella del flusso tu stia guardando
  const q = ricerca.trim().toLowerCase()
  const nAllerta8h = pratiche.filter(allerta8h).length
  const filtrate = pratiche.filter(p => {
    if (q) {
      const blob = [p.targa, p.nome_richiedente, p.telefono, p.marca, p.modello, p.comune_ritiro].filter(Boolean).join(' ').toLowerCase()
      return blob.includes(q)
    }
    const b = bucketDi(p)
    if (filtro === 'tutte') { if (b === 'annullate') return false }
    else if (filtro === 'allerta8h') { if (!allerta8h(p)) return false }
    // "Ritirata" è il macro-filtro della colonnina: somma certificati + PRA
    else if (filtro === 'ritirate') { if (b !== 'certificati' && b !== 'pra') return false }
    else if (b !== filtro) return false
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
      <main className="h-screen overflow-hidden flex" style={{ background: '#ECEEF2' }}>
        <AdminSidebar attivo="pratiche" />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  // ⭐ 23/07 (variante A su mockup): via il lilla — sfondo GRIGIO chiaro,
  // barre (laterale + "Pratiche") nel blu NoiDemoliamo
  // ⭐ 27/07: pagina ad ALTEZZA SCHERMO — barra laterale, testata, flusso e
  // filtri restano fermi; scorre SOLO la lista delle pratiche
  return (
    <main className="h-screen overflow-hidden flex" style={{ background: '#ECEEF2' }}>

      {/* SIDEBAR (condivisa: Impostazioni e pulizia account vivono lì) */}
      <AdminSidebar attivo="pratiche" />

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* TOP BAR con ricerca — ⭐ 27/07 (mockup approvato): AZZURRA come
            la testata della pratica aperta (#EFF6FF), un solo colore per
            barra, hover delle righe e apertura */}
        <div className="border-b px-6 py-3 flex items-center gap-4" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Pratiche</h1>
            <p className="text-xs text-gray-500 mt-1">{pratiche.length} totali</p>
          </div>
          {/* Ricerca a PILLOLA (26/07, variante A su mockup): corta a riposo,
              si allarga dolcemente e si accende di blu quando ci scrivi */}
          <div className="ml-auto">
            {/* Sulla barra azzurra la pillola è BIANCA col bordo celeste */}
            <div className="flex items-center gap-2 rounded-full border px-3.5 py-2 w-[210px] focus-within:w-[300px] bg-white border-[#DBEAFE] focus-within:border-blue-300 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.10)] transition-all duration-300">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input value={ricerca} onChange={e => setRicerca(e.target.value)} placeholder="Cerca…" className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400" />
              {ricerca && <button onClick={() => setRicerca('')} className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0">×</button>}
            </div>
          </div>
        </div>

        <div className="px-6 pt-6 flex-1 min-h-0 flex flex-col">

          {/* PIPELINE DEL FLUSSO PRATICHE — pillole tonde in una riga
              (variante B scelta da Davide su mockup 23/07). Sotto "Assegnata"
              vive l'ALLERTA 8 ORE: pillola IDENTICA alla fase (simmetrica),
              sempre visibile — bianca a zero, rossa quando c'è un ritardo. */}
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Flusso pratiche</div>
          <div className="mb-3 overflow-x-auto">
            <div className="flex items-start">
              {/* ⭐ 27/07 (mockup approvato): "Da contattare" è una pillola
                  gemella delle fasi, PRIMA di "In attesa documenti" — bianca
                  a zero, rossa coi casi. Non è una fase: niente freccia,
                  solo uno stacco. Via il vecchio riquadro rosso. */}
              <PillolaFase nome="Da contattare" valore={conta('contattare')} rossa={conta('contattare') > 0} attivo={filtro === 'contattare'} onClick={() => cambiaFiltro(filtro === 'contattare' ? 'tutte' : 'contattare')}
                title={conta('contattare') > 0 ? 'Da chiamare: libretto, certificato o fermo da chiarire' : 'Nessun cliente da chiamare per i documenti'} />
              <div style={{ width: 14, flexShrink: 0 }} />
              <PillolaFase nome="In attesa documenti" valore={conta('moduli')} attivo={filtro === 'moduli'} onClick={() => cambiaFiltro(filtro === 'moduli' ? 'tutte' : 'moduli')} />
              {/* ⭐ 27/07 sera (richiesta Davide): le pratiche IN PAUSA hanno la
                  loro pillola QUI (via il riquadro giallo) — quieta, azzurro
                  spento, non è una fase del flusso: niente freccia, solo uno
                  stacco */}
              <div style={{ width: 14, flexShrink: 0 }} />
              <PillolaFase nome="In attesa" valore={conta('attesa')} quieta attivo={filtro === 'attesa'} onClick={() => cambiaFiltro(filtro === 'attesa' ? 'tutte' : 'attesa')}
                title={conta('attesa') > 0 ? 'In pausa, fuori dal flusso finché non riprendono' : 'Nessuna pratica in pausa'} />
              <FrecciaFase />
              <PillolaFase nome="Documenti da verificare" valore={conta('approvare')} attivo={filtro === 'approvare'} onClick={() => cambiaFiltro(filtro === 'approvare' ? 'tutte' : 'approvare')} />
              <FrecciaFase />
              <PillolaFase nome="Da assegnare" valore={conta('assegnare')} attivo={filtro === 'assegnare'} onClick={() => cambiaFiltro(filtro === 'assegnare' ? 'tutte' : 'assegnare')} />
              <FrecciaFase />
              <div className="flex flex-col items-stretch gap-1.5">
                <PillolaFase nome="Assegnata" valore={conta('assegnate')} attivo={filtro === 'assegnate'} onClick={() => cambiaFiltro(filtro === 'assegnate' ? 'tutte' : 'assegnate')} />
                <PillolaFase nome="Allerta 8 ore" valore={nAllerta8h} rossa={nAllerta8h > 0} attivo={filtro === 'allerta8h'} onClick={() => cambiaFiltro(filtro === 'allerta8h' ? 'tutte' : 'allerta8h')}
                  title={nAllerta8h > 0 ? 'Il demolitore non ha fissato il ritiro nei tempi' : 'Demolitori nei tempi: nessun ritiro in ritardo'} />
              </div>
              <FrecciaFase />
              {/* ⭐ 27/07 (variante B su mockup): Ritiro Programmato in fila e
                  colonnina "Ritirata" = somma di Attesa Certificati + Attesa PRA */}
              <PillolaFase nome="Ritiro Programmato" valore={conta('programmato')} attivo={filtro === 'programmato'} onClick={() => cambiaFiltro(filtro === 'programmato' ? 'tutte' : 'programmato')} />
              <FrecciaFase />
              <div className="flex flex-col items-stretch gap-1.5">
                <PillolaFase nome="Ritirata" valore={conta('certificati') + conta('pra')} attivo={filtro === 'ritirate'} onClick={() => cambiaFiltro(filtro === 'ritirate' ? 'tutte' : 'ritirate')} />
                <PillolaFase nome="Attesa Certificati" valore={conta('certificati')} attivo={filtro === 'certificati'} onClick={() => cambiaFiltro(filtro === 'certificati' ? 'tutte' : 'certificati')} />
                <PillolaFase nome="Attesa PRA" valore={conta('pra')} attivo={filtro === 'pra'} onClick={() => cambiaFiltro(filtro === 'pra' ? 'tutte' : 'pra')} />
              </div>
              <FrecciaFase />
              <PillolaFase nome="Completata" valore={conta('completate')} attivo={filtro === 'completate'} onClick={() => cambiaFiltro(filtro === 'completate' ? 'tutte' : 'completate')} />
            </div>
          </div>

          {/* Nota 27/07 sera: il riquadro giallo "In attesa" è stato TOLTO —
              le pratiche in pausa hanno la pillola quieta nella fila del
              flusso, dopo "In attesa documenti". */}

          {/* FILTRI RAPIDI */}
          <div className="flex gap-1.5 mb-3 flex-wrap text-xs">
            <ChipFiltro attivo={filtro === 'tutte'} onClick={() => cambiaFiltro('tutte')}>Tutte {pratiche.filter(p => bucketDi(p) !== 'annullate').length}</ChipFiltro>
            <ChipFiltro attivo={filtro === 'annullate'} onClick={() => cambiaFiltro(filtro === 'annullate' ? 'tutte' : 'annullate')}>Annullate {conta('annullate')}</ChipFiltro>
          </div>

          {/* LISTA PRATICHE A CARD — ⭐ TENDINA SOTTO LA RIGA (26/07):
              clic sulla pratica = sotto si srotola il pannello coi dati
              principali (transizione morbida), ritocco = si richiude.
              Il contenuto del pannello lo detta Davide un pezzo alla volta.
              ⭐ 27/07: la lista è l'UNICA zona che scorre della pagina. */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-6 px-1 -mx-1">
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
                const aperta = p.id === selId
                // BLOCCO UNICO (26/07, variante 3 su mockup): da aperta la
                // cornice blu ingloba riga e tendina; la riga si tinge
                // d'azzurro e fa da testata
                return (
                  <div
                    key={p.id}
                    style={{ border: `2px solid ${aperta ? '#2563EB' : 'transparent'}`, borderRadius: 16, background: aperta ? '#F7F8FB' : 'transparent', boxShadow: aperta ? '0 4px 16px rgba(37,99,235,0.16)' : 'none', transition: 'all .28s ease' }}
                  >
                  {/* ⭐ 27/07 (mockup approvato): al passaggio del mouse la riga
                      si tinge dell'azzurro dell'apertura (#EFF6FF) */}
                  <div
                    onClick={() => apriPratica(p)}
                    className={`group cursor-pointer transition-all ${aperta ? '' : 'hover:!bg-[#EFF6FF] hover:!border-[#BFDBFE] hover:shadow-[0_2px_8px_rgba(37,99,235,0.10)] hover:-translate-y-[1px]'}`}
                    style={{ background: aperta ? '#EFF6FF' : '#fff', border: `1.5px solid ${aperta ? 'transparent' : '#E5E7EB'}`, borderRadius: aperta ? '13px 13px 0 0' : 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: aperta ? 'none' : '0 1px 3px rgba(16,24,40,0.07)', opacity: chiusa && !aperta ? 0.82 : 1 }}
                  >
                    {/* Quadratino icona veicolo (o spunta se chiusa) */}
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: p.stato === 'completata' ? '#DCF3E4' : '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {p.stato === 'completata'
                        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        : <IconaVeicolo tipo={p.tipo_mezzo} />}
                    </div>

                    {/* Veicolo — ⭐ 27/07 (variante B su mockup): anno di
                        immatricolazione dopo il modello, sotto solo il comune */}
                    <div style={{ flex: 1.6, minWidth: 0 }}>
                      <div className="text-[15px] font-bold truncate" style={{ color: aperta ? '#1D4ED8' : '#111827' }}>{p.targa || 'Targa mancante'}{p.marca && ` · ${p.marca} ${p.modello || ''}`}{p.anno ? ` · ${p.anno}` : ''}</div>
                      <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>
                        {p.comune_ritiro ? `${p.comune_ritiro}${p.provincia_ritiro ? ` (${p.provincia_ritiro})` : ''}` : (p.tipo_mezzo || '—')}
                      </div>
                    </div>

                    {/* Cliente — ⭐ 27/07: via il telefono (vive nella tendina,
                        dove si copia); sotto il nome la casistica e l'eventuale
                        DELEGATO alla consegna */}
                    <div style={{ flex: 1.3, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
                      <div className="text-[13.5px] font-semibold text-gray-900 truncate">{p.nome_richiedente || '—'}</div>
                      <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>
                        {p.casistica ? (NOMI_CASISTICHE[p.casistica] || p.casistica) : (p.tipo_mezzo || '—')}
                        {p.delegato_nome && <> · delega a <b style={{ color: '#374151', fontWeight: 600 }}>{p.delegato_nome}</b></>}
                      </div>
                    </div>

                    {/* Stato + demolitore */}
                    <div style={{ flex: 1.4, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
                      {/* ⭐ 27/07: rosso TENUE anche qui — gli stessi colori
                          della pillola "Da contattare" accesa nel flusso */}
                      <span className="inline-block text-[11.5px] font-bold rounded-full" style={{ background: (p.in_attesa && !chiusa) ? '#E8ECF3' : contatta ? '#FBDADA' : m.bg, color: (p.in_attesa && !chiusa) ? '#5B6779' : contatta ? '#9B1C1C' : m.text, padding: '4px 12px' }}>
                        {(p.in_attesa && !chiusa) ? 'In attesa' : contatta ? 'Da contattare' : m.label}
                      </span>
                      {/* Il PERCHÉ dell'attesa, sempre sott'occhio in lista —
                          ⭐ 27/07 sera: allineato al TESTO della pillola */}
                      {p.in_attesa && !chiusa && p.attesa_motivo && (
                        <div className="text-[11px] mt-1 truncate" style={{ color: '#5B6779', paddingLeft: 12 }} title={p.attesa_motivo}>
                          {p.attesa_motivo}
                        </div>
                      )}
                      {/* ⭐ 27/07 sera: anche il PERCHÉ dell'annullo si legge in
                          riga, senza aprire la cronologia */}
                      {p.stato === 'annullata' && p.motivo_annullamento && (
                        <div className="text-[11px] mt-1 truncate" style={{ color: '#5B6779', paddingLeft: 12 }} title={p.motivo_annullamento}>
                          {p.motivo_annullamento}
                        </div>
                      )}
                      {p.demolitore_id && demolitori[p.demolitore_id] && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.9" style={{ flexShrink: 0 }}><path d="M3 21h18M6 21V7l6-4 6 4v14" /></svg>
                          <span className="text-[12.5px] font-semibold truncate" style={{ color: '#374151' }}>{demolitori[p.demolitore_id]}</span>
                        </div>
                      )}
                    </div>

                    {/* ⭐ DATE DI RITIRO in riga (27/07, mockup approvato):
                        quando il demolitore le mette si vedono anche qui —
                        "Ritiro Programmato" quieto e "Ritiro Effettivo"
                        azzurro, affiancati (con l'anno). Senza date resta
                        il countdown di sempre. */}
                    {(p.data_ritiro_prevista || p.data_ritiro_effettuato) && p.stato !== 'annullata' ? (
                      <>
                        {p.data_ritiro_prevista && (
                          <div style={{ flexShrink: 0, textAlign: 'center', background: '#E8ECF3', borderRadius: 10, padding: '6px 11px', minWidth: 96 }}>
                            <div className="text-[13px] font-extrabold" style={{ color: '#5B6779' }}>{fmtDataBox(p.data_ritiro_prevista)}</div>
                            <div className="text-[8px] font-bold uppercase" style={{ color: '#5B6779', letterSpacing: 0.4 }}>Ritiro Programmato</div>
                          </div>
                        )}
                        {p.data_ritiro_effettuato && (
                          <div style={{ flexShrink: 0, textAlign: 'center', background: '#EFF6FF', borderRadius: 10, padding: '6px 11px', minWidth: 96 }}>
                            <div className="text-[13px] font-extrabold" style={{ color: '#1D4ED8' }}>{fmtDataBox(p.data_ritiro_effettuato)}</div>
                            <div className="text-[8px] font-bold uppercase" style={{ color: '#1D4ED8', letterSpacing: 0.4 }}>Ritiro Effettivo</div>
                          </div>
                        )}
                      </>
                    ) : !chiusa ? (
                      <div style={{ flexShrink: 0, textAlign: 'center', background: rosso ? '#FCEBEB' : '#F3F5F9', borderRadius: 10, padding: '6px 12px', minWidth: 74 }}>
                        <div className="text-[14px] font-bold" style={{ color: rosso ? '#A32D2D' : '#374151' }}>{formatAttesa(min)}</div>
                        <div className="text-[10px] font-semibold uppercase" style={{ color: rosso ? '#A32D2D' : '#6B7280' }}>{azioneRichiesta ? 'in attesa' : 'in corso'}</div>
                      </div>
                    ) : (
                      <div style={{ flexShrink: 0, minWidth: 74 }} />
                    )}

                  </div>

                  {/* TENDINA SOTTO LA RIGA (26/07, ordine 2 su mockup):
                      Cliente · Casistiche · Veicolo · Ritiro, si srotola
                      morbida (grid 0fr→1fr) */}
                  <div style={{ display: 'grid', gridTemplateRows: aperta ? '1fr' : '0fr', transition: 'grid-template-rows .28s ease' }}>
                    <div style={{ overflow: 'hidden' }}>

                      {/* FILA AZIONI (26/07, layout B su mockup): seconda riga
                          della testata azzurra. Documenti e Chat aprono IN
                          LINEA qui sotto; Stato è una nuvoletta ancorata. */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: '#EFF6FF', padding: '0 16px 12px' }}>
                        {/* ⭐ 27/07 sera (mockup approvato): la pillola Documenti
                            TORNA e apre DIRETTAMENTE il visore sul primo da
                            verificare (le miniature si caricano lì dentro, la
                            tendina non balla). Ordine: Documenti · Chat ·
                            Stato pratica · Trattativa Extra · Assegnazione. */}
                        <button
                          onClick={() => { setMenuStato(null); setNuvolaImporto(false); setNuvolaElimina(false); setDocTrigger(prev => ({ ...prev, [p.id]: (prev[p.id] ?? 0) + 1 })) }}
                          className="flex items-center gap-1.5 transition-all hover:bg-blue-100"
                          style={{ position: 'relative', background: '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          Documenti
                          <span style={{ background: '#EFF6FF', borderRadius: 999, fontSize: 10, padding: '1px 7px' }}>{docStats[p.id] ? `${docStats[p.id].approvati}/${docStats[p.id].totale}` : '…'}</span>
                          {(docStats[p.id]?.daVerificare ?? 0) > 0 && <span style={{ position: 'absolute', top: -3, right: -1, width: 10, height: 10, borderRadius: 999, background: '#DC2626', border: '2px solid #EFF6FF' }} />}
                        </button>
                        <button
                          onClick={() => { setMenuStato(null); setSelChatAperta(a => !a); if (selChatAperta) aggiornaContatori(p.id) }}
                          className="flex items-center gap-1.5 transition-all hover:bg-blue-100"
                          style={{ position: 'relative', background: selChatAperta ? '#DBEAFE' : '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" /></svg>
                          Chat
                          {(nonLetti[p.id] ?? 0) > 0 && <span style={{ position: 'absolute', top: -3, right: -1, width: 10, height: 10, borderRadius: 999, background: '#DC2626', border: '2px solid #EFF6FF' }} />}
                        </button>
                        <span style={{ position: 'relative' }}>
                          <button
                            onClick={() => { setMenuStato(m => (m ? null : 'menu')); setMotivoStato(''); setStatoErr(null) }}
                            className="flex items-center gap-1.5 transition-all hover:bg-blue-100"
                            style={{ background: menuStato ? '#DBEAFE' : '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            Stato pratica
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: menuStato ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9" /></svg>
                          </button>
                          {menuStato && (
                            <>
                              <div style={{ position: 'fixed', inset: 0, zIndex: 5 }} onClick={() => { if (!statoBusy) setMenuStato(null) }} />
                              {/* ⭐ 27/07 (mockup approvato): la nuvoletta parla la
                                  lingua del CRM — dentro ci sono LE PILLOLE DI
                                  STATO VERE della lista (azzurro flusso, azzurro
                                  spento con l'orologio, rosso tenue), quella
                                  corrente ha l'anello blu; il motivo si apre
                                  sotto quando scegli attesa o annullo. */}
                              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 280, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 13, boxShadow: '0 10px 28px rgba(15,23,42,0.18)', padding: '11px 12px', zIndex: 6 }}>
                                {(() => {
                                  const statoCorrente = p.stato === 'annullata' ? 'annullata' : p.in_attesa ? 'attesa' : 'attiva'
                                  const evidenziata = menuStato === 'attesa' || menuStato === 'annulla' ? menuStato === 'annulla' ? 'annullata' : 'attesa' : statoCorrente
                                  const anello = (attiva: boolean): React.CSSProperties => attiva ? { border: '1.5px solid #2563EB', boxShadow: '0 0 0 3px rgba(37,99,235,0.10)' } : { border: '1.5px solid transparent' }
                                  return (
                                    <>
                                      <div style={{ fontSize: 10, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.6, marginBottom: 8 }}>STATO DELLA PRATICA</div>
                                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        <button
                                          onClick={() => azioneStato(p, 'attiva')}
                                          disabled={statoBusy || statoCorrente === 'attiva'}
                                          className="transition-all"
                                          style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '4px 12px', cursor: statoCorrente === 'attiva' ? 'default' : 'pointer', opacity: statoBusy ? 0.5 : 1, ...anello(evidenziata === 'attiva') }}
                                        >
                                          Attiva
                                        </button>
                                        <button
                                          onClick={() => { setMenuStato('attesa'); setStatoErr(null) }}
                                          disabled={statoBusy || p.stato === 'annullata' || !!p.in_attesa}
                                          className="transition-all disabled:opacity-45"
                                          style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#E8ECF3', color: '#5B6779', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '4px 12px', cursor: 'pointer', ...anello(evidenziata === 'attesa') }}
                                        >
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                          In attesa
                                        </button>
                                        <button
                                          onClick={() => { setMenuStato('annulla'); setStatoErr(null) }}
                                          disabled={statoBusy || p.stato === 'annullata'}
                                          className="transition-all disabled:opacity-45"
                                          style={{ background: '#F3D9D9', color: '#A94444', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '4px 12px', cursor: 'pointer', ...anello(evidenziata === 'annullata') }}
                                        >
                                          Annullata
                                        </button>
                                      </div>
                                      {(menuStato === 'attesa' || menuStato === 'annulla') && (
                                        <div style={{ marginTop: 9 }}>
                                          <textarea
                                            value={motivoStato}
                                            onChange={e => setMotivoStato(e.target.value)}
                                            placeholder="Motivo (resta nella cronologia)…"
                                            rows={2}
                                            autoFocus
                                            className="w-full rounded-lg px-2.5 py-2 text-[12px] outline-none resize-none focus:border-blue-300"
                                            style={{ border: '1.5px solid #E5E7EB', color: '#111827' }}
                                          />
                                          {statoErr && <div className="text-[10.5px] text-red-600 mt-1">{statoErr}</div>}
                                          <div className="flex gap-2 items-center justify-end mt-1.5">
                                            <button onClick={() => { setMenuStato('menu'); setStatoErr(null); setMotivoStato('') }} disabled={statoBusy} className="disabled:opacity-50" style={{ background: 'none', border: 'none', color: '#5B6779', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Annulla</button>
                                            <button onClick={() => azioneStato(p, menuStato as 'attesa' | 'annulla')} disabled={statoBusy} className="transition-colors hover:bg-blue-700 disabled:opacity-50" style={{ background: '#2563EB', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '5px 13px', cursor: 'pointer' }}>{statoBusy ? 'Salvo…' : 'Conferma'}</button>
                                          </div>
                                        </div>
                                      )}
                                      {menuStato === 'menu' && statoErr && <div className="text-[10.5px] text-red-600 mt-2">{statoErr}</div>}
                                    </>
                                  )
                                })()}
                              </div>
                            </>
                          )}
                        </span>
                        {/* ⭐ TRATTATIVA EXTRA (ex Importo, rinominata da Davide
                            27/07): importo una tantum, nuvoletta sulla pillola */}
                        <span style={{ position: 'relative' }}>
                          <button
                            onClick={() => { setMenuStato(null); setNuvolaElimina(false); setNuvolaImporto(v => { const nv = !v; if (nv) { setImportoVal(p.fee_concordata != null ? String(p.fee_concordata) : ''); setImportoErr(null) } return nv }) }}
                            className="flex items-center gap-1.5 transition-all hover:bg-blue-100"
                            style={{ background: nuvolaImporto ? '#DBEAFE' : '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}
                          >
                            {/* Simbolo dell'EURO (via il dollaro, 27/07) */}
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12" /><path d="M4 14h9" /><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2" /></svg>
                            Trattativa Extra
                            {p.fee_concordata != null && <span style={{ background: '#EFF6FF', borderRadius: 999, fontSize: 10, padding: '1px 7px' }}>{p.fee_concordata}€</span>}
                          </button>
                          {nuvolaImporto && (
                            <>
                              <div style={{ position: 'fixed', inset: 0, zIndex: 5 }} onClick={() => { if (!importoBusy) setNuvolaImporto(false) }} />
                              {/* ⭐ 27/07 (mockup approvato): nuvoletta SEMPLICE —
                                  titolo, una frase che spiega il bypass (solo per
                                  questa pratica, va in prefattura così), campo con
                                  etichetta, Salva; "Rimuovi" quando è attiva */}
                              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 295, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 13, boxShadow: '0 10px 28px rgba(15,23,42,0.18)', padding: '13px 14px', zIndex: 6 }}>
                                <div className="text-[12px] font-bold" style={{ color: '#0F1B33' }}>Trattativa Extra</div>
                                <div className="text-[11px] mt-1" style={{ color: '#5B6779', lineHeight: 1.55 }}>
                                  Importo concordato con il demolitore <b>solo per questa pratica</b>: sostituisce la sua tariffa e a fine mese entra così in proforma fattura.
                                </div>
                                <div className="flex items-center gap-2 mt-2.5">
                                  <label className="text-[11.5px] font-semibold whitespace-nowrap" style={{ color: '#1E293B' }}>Importo concordato</label>
                                  <input
                                    value={importoVal}
                                    onChange={e => { setImportoVal(e.target.value); setImportoErr(null) }}
                                    inputMode="numeric"
                                    placeholder="0"
                                    className="flex-1 min-w-0 rounded-[9px] px-2.5 py-1.5 text-[12px] text-right outline-none focus:border-blue-300"
                                    style={{ border: '1.5px solid #E5E7EB', color: '#111827' }}
                                  />
                                  <span className="text-[12px] font-bold" style={{ color: '#4B5563' }}>€</span>
                                </div>
                                {importoErr && <div className="text-[10.5px] text-red-600 mt-1">{importoErr}</div>}
                                <div className="flex items-center justify-end gap-3 mt-2.5">
                                  {p.fee_concordata != null && (
                                    <button onClick={() => salvaImporto(p, null)} disabled={importoBusy} className="mr-auto disabled:opacity-50" style={{ background: 'none', border: 'none', color: '#A94444', fontSize: 11, fontWeight: 500, textDecoration: 'underline', cursor: 'pointer' }}>Rimuovi</button>
                                  )}
                                  <button
                                    onClick={() => { const n = parseFloat(importoVal.replace(',', '.')); if (isNaN(n) || n <= 0) { setImportoErr('Scrivi un importo valido.'); return } salvaImporto(p, n) }}
                                    disabled={importoBusy}
                                    className="transition-colors hover:bg-blue-700 disabled:opacity-50"
                                    style={{ background: '#2563EB', border: 'none', color: '#fff', fontSize: 11.5, fontWeight: 700, borderRadius: 8, padding: '6px 15px', cursor: 'pointer' }}
                                  >
                                    {importoBusy ? 'Salvo…' : 'Salva'}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </span>
                        {/* ⭐ ASSEGNAZIONE (27/07, mockup definitivo): apre il
                            pannello a DESTRA delle schede nella tendina */}
                        <button
                          onClick={() => { setMenuStato(null); setNuvolaImporto(false); setNuvolaElimina(false); setSelAssegnaAperta(a => !a) }}
                          className="flex items-center gap-1.5 transition-all hover:bg-blue-100"
                          style={{ background: selAssegnaAperta ? '#DBEAFE' : '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></svg>
                          Assegnazione
                          {p.demolitore_id && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </button>
                        <span style={{ flex: 1 }} />
                        {/* ⭐ CESTINO (27/07): nuvoletta a due scelte, come nel dettaglio */}
                        <span style={{ position: 'relative' }}>
                          <button
                            onClick={() => { setMenuStato(null); setNuvolaImporto(false); setNuvolaElimina(v => !v); setEliminaErr(null) }}
                            aria-label="Elimina definitivamente"
                            title="Elimina definitivamente"
                            className="transition-colors hover:bg-red-50"
                            style={{ width: 29, height: 29, borderRadius: 999, background: '#fff', border: '1.5px solid #F3C8C8', color: '#C0392B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                          {nuvolaElimina && (
                            <>
                              <div style={{ position: 'fixed', inset: 0, zIndex: 5 }} onClick={() => { if (!eliminando) setNuvolaElimina(false) }} />
                              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 260, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 13, boxShadow: '0 10px 28px rgba(15,23,42,0.18)', padding: 8, zIndex: 6 }}>
                                <button onClick={() => eliminaDallaTendina(p, false)} disabled={!!eliminando} className="w-full text-left flex items-start gap-2 rounded-[9px] px-3 py-2 transition-colors hover:bg-red-50 disabled:opacity-40" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                  <span>
                                    <span className="block text-[12px] font-bold" style={{ color: '#A94444' }}>{eliminando === 'pratica' ? 'Elimino…' : 'Elimina solo la pratica'}</span>
                                    <span className="block text-[10px] mt-0.5" style={{ color: '#8B95A5' }}>documenti e foto compresi · l&apos;account resta</span>
                                  </span>
                                </button>
                                <button onClick={() => eliminaDallaTendina(p, true)} disabled={!!eliminando} className="w-full text-left flex items-start gap-2 rounded-[9px] px-3 py-2 transition-colors hover:bg-red-50 disabled:opacity-40" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                  <span>
                                    <span className="block text-[12px] font-bold" style={{ color: '#A94444' }}>{eliminando === 'account' ? 'Elimino…' : 'Elimina pratica e account'}</span>
                                    <span className="block text-[10px] mt-0.5" style={{ color: '#8B95A5' }}>solo se il cliente non ha altre pratiche</span>
                                  </span>
                                </button>
                                {eliminaErr && <div className="text-[10.5px] text-red-600 px-3 pb-1.5">{eliminaErr}</div>}
                              </div>
                            </>
                          )}
                        </span>
                        {/* ⭐ 27/07: "Apri la pratica intera" ELIMINATO — il CRM
                            è tutto in una pagina, la tendina copre tutto */}
                      </div>

                      {/* ⭐ 27/07 (mockup definitivo): col pannello assegnazione
                          aperto le 4 schede vanno a SINISTRA (su due file) e il
                          pannello occupa la colonna DESTRA */}
                      <div style={{ padding: '12px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1.55, minWidth: 0, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {/* ⭐ 27/07 sera (mockup approvato): la CRONOLOGIA è la
                            PRIMA scheda della fila (al posto del riquadro
                            documenti che caricava in ritardo) */}
                        {aperta && (
                          <CronologiaNote
                            praticaId={p.id}
                            praticaCreataIl={p.creato_il}
                            refreshKey={0}
                            aperta
                            onToggle={() => {}}
                            scheda
                          />
                        )}
                        <SezTendinaMod
                          titolo="Cliente"
                          inEdit={sezEdit === 'cliente'}
                          salvando={salvandoSez}
                          errore={erroreSez}
                          onMatita={() => apriSez(p, 'cliente')}
                          onAnnulla={() => { setSezEdit(null); setErroreSez(null) }}
                          onSalva={() => salvaSez(p)}
                          righe={[
                            { k: 'Nome', vista: p.nome_richiedente || '—', campo: <input className={CAMPO_TENDINA} value={sb('nome_richiedente')} onChange={e => setB('nome_richiedente', e.target.value)} /> },
                            { k: 'Telefono', vista: p.telefono || '—', campo: <input className={CAMPO_TENDINA} inputMode="tel" value={sb('telefono')} onChange={e => setB('telefono', e.target.value)} /> },
                            { k: p.casistica === 'societa' || p.casistica === 'societa_fallita' ? 'P.IVA' : 'CF', vista: p.codice_fiscale || '—', campo: <input className={CAMPO_TENDINA} value={sb('codice_fiscale')} onChange={e => setB('codice_fiscale', e.target.value)} /> },
                            { k: 'Email', vista: emailAccounts[p.id] === undefined ? '…' : (emailAccounts[p.id] || '—') },
                          ]}
                        />
                        <SezTendinaMod
                          titolo="Casistiche"
                          inEdit={sezEdit === 'casistiche'}
                          salvando={salvandoSez}
                          errore={erroreSez}
                          onMatita={() => apriSez(p, 'casistiche')}
                          onAnnulla={() => { setSezEdit(null); setErroreSez(null) }}
                          onSalva={() => salvaSez(p)}
                          avviso={(p.libretto === 'no' || p.certificato_proprieta === 'nessuno' || p.fermo_amministrativo === 'non_so') ? (
                            // ⭐ Avviso "Dal modulo" (27/07, variante B su mockup):
                            // pillola blu tenue con le sole risposte critiche del
                            // cliente; sparisce da sola quando l'admin le corregge
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, background: '#EFF6FF', borderRadius: 10, padding: '5px 11px', marginBottom: 8, fontSize: 10.5, color: '#1E4E8C', minWidth: 0 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                              <span style={{ lineHeight: 1.5 }}>
                                <b style={{ color: '#1D4ED8', fontWeight: 700 }}>Dal modulo:</b>{' '}
                                {[p.libretto === 'no' && 'niente libretto', p.certificato_proprieta === 'nessuno' && 'CDC da chiarire', p.fermo_amministrativo === 'non_so' && 'fermo da verificare'].filter(Boolean).join(' · ')}
                              </span>
                            </div>
                          ) : undefined}
                          righe={[
                            { k: 'Casistica', vista: p.casistica ? (NOMI_CASISTICHE[p.casistica] || p.casistica) : '—' },
                            { k: 'Libretto', vista: p.libretto ? (LIBRETTO_LABEL[p.libretto] || p.libretto) : '—', campo: (
                              <select className={`${CAMPO_TENDINA} cursor-pointer`} value={sb('libretto')} onChange={e => setB('libretto', e.target.value)}>
                                <option value="" disabled>Scegli…</option>
                                <option value="si">Ha l&apos;originale</option>
                                <option value="denuncia">Denuncia di smarrimento</option>
                              </select>
                            ) },
                            { k: 'Cert. proprietà', vista: p.certificato_proprieta ? (CDC_LABEL[p.certificato_proprieta] || p.certificato_proprieta) : '—', campo: (
                              <select className={`${CAMPO_TENDINA} cursor-pointer`} value={sb('certificato_proprieta')} onChange={e => setB('certificato_proprieta', e.target.value)}>
                                <option value="" disabled>Scegli…</option>
                                <option value="digitale">Digitale</option>
                                <option value="cartaceo">Cartaceo</option>
                                <option value="smarrito">Smarrito</option>
                              </select>
                            ) },
                            { k: 'Fermo Amministrativo', vista: p.fermo_amministrativo ? (FERMO_LABEL[p.fermo_amministrativo] || p.fermo_amministrativo) : '—', campo: (
                              <select className={`${CAMPO_TENDINA} cursor-pointer`} value={sb('fermo_amministrativo')} onChange={e => setB('fermo_amministrativo', e.target.value)}>
                                <option value="" disabled>Scegli…</option>
                                <option value="no">No</option>
                                <option value="si">Sì</option>
                              </select>
                            ) },
                            { k: 'Targhe', vista: p.targhe_presenti == null ? '—' : p.targhe_presenti ? 'Presenti sul mezzo' : 'Smarrite o rubate', campo: (
                              <select className={`${CAMPO_TENDINA} cursor-pointer`} value={sb('targhe_presenti')} onChange={e => setB('targhe_presenti', e.target.value)}>
                                <option value="" disabled>Scegli…</option>
                                <option value="presenti">Presenti sul mezzo</option>
                                <option value="assenti">Smarrite o rubate</option>
                              </select>
                            ) },
                          ]}
                        />
                        <SezTendinaMod
                          titolo="Veicolo"
                          inEdit={sezEdit === 'veicolo'}
                          salvando={salvandoSez}
                          errore={erroreSez}
                          onMatita={() => apriSez(p, 'veicolo')}
                          onAnnulla={() => { setSezEdit(null); setErroreSez(null) }}
                          onSalva={() => salvaSez(p)}
                          righe={[
                            { k: 'Targa', vista: p.targa || '—', campo: <input className={CAMPO_TENDINA} value={sb('targa')} onChange={e => setB('targa', e.target.value)} /> },
                            { k: 'Marca', vista: p.marca || '—', campo: <input className={CAMPO_TENDINA} value={sb('marca')} onChange={e => setB('marca', e.target.value)} /> },
                            { k: 'Modello', vista: p.modello || '—', campo: <input className={CAMPO_TENDINA} value={sb('modello')} onChange={e => setB('modello', e.target.value)} /> },
                            { k: 'Anno', vista: p.anno ? String(p.anno) : '—', campo: <input className={CAMPO_TENDINA} inputMode="numeric" value={sb('anno')} onChange={e => setB('anno', e.target.value)} /> },
                            { k: 'Km', vista: p.km ? Number(p.km).toLocaleString('it-IT') : '—', campo: <input className={CAMPO_TENDINA} inputMode="numeric" value={sb('km')} onChange={e => setB('km', e.target.value)} /> },
                            { k: 'Cambio', vista: p.tipo_cambio === 'manuale' ? 'Manuale' : p.tipo_cambio === 'automatico' ? 'Automatico' : p.tipo_cambio === 'non_so' ? 'Non lo sa' : '—', campo: (
                              <select className={`${CAMPO_TENDINA} cursor-pointer`} value={sb('tipo_cambio')} onChange={e => setB('tipo_cambio', e.target.value)}>
                                <option value="" disabled>Scegli…</option>
                                <option value="manuale">Manuale</option>
                                <option value="automatico">Automatico</option>
                              </select>
                            ) },
                          ]}
                          extra={
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, paddingTop: 5 }}>
                              {sezEdit === 'veicolo' ? (
                                <>
                                  <PillBool valore={bozza.incidentato as boolean | null} labelSi="Incidentata" labelNo="Non incidentata" buonoSeNo onClick={() => setB('incidentato', bozza.incidentato == null ? true : !bozza.incidentato)} />
                                  <PillBool valore={bozza.va_in_moto as boolean | null} labelSi="Si avvia" labelNo="Non si avvia" onClick={() => setB('va_in_moto', bozza.va_in_moto == null ? true : !bozza.va_in_moto)} />
                                  <PillBool valore={bozza.marciante as boolean | null} labelSi="Cammina" labelNo="Non cammina" onClick={() => setB('marciante', bozza.marciante == null ? true : !bozza.marciante)} />
                                  <PillBool valore={bozza.parti_mancanti as boolean | null} labelSi="Parti mancanti" labelNo="Completo" buonoSeNo onClick={() => setB('parti_mancanti', bozza.parti_mancanti == null ? true : !bozza.parti_mancanti)} />
                                </>
                              ) : (
                                <>
                                  {p.incidentato != null && <PillCond buono={!p.incidentato}>{p.incidentato ? 'Incidentata' : 'Non incidentata'}</PillCond>}
                                  {p.va_in_moto != null && <PillCond buono={p.va_in_moto}>{p.va_in_moto ? 'Si avvia' : 'Non si avvia'}</PillCond>}
                                  {p.marciante != null && <PillCond buono={p.marciante}>{p.marciante ? 'Cammina' : 'Non cammina'}</PillCond>}
                                  {p.parti_mancanti != null && <PillCond buono={!p.parti_mancanti}>{p.parti_mancanti ? 'Parti mancanti' : 'Completo'}</PillCond>}
                                </>
                              )}
                            </div>
                          }
                        />
                        <SezTendinaMod
                          titolo="Ritiro"
                          inEdit={sezEdit === 'ritiro'}
                          salvando={salvandoSez}
                          errore={erroreSez}
                          onMatita={() => apriSez(p, 'ritiro')}
                          onAnnulla={() => { setSezEdit(null); setErroreSez(null) }}
                          onSalva={() => salvaSez(p)}
                          righe={[
                            { k: 'Indirizzo', vista: p.indirizzo_ritiro || '—', campo: <input className={CAMPO_TENDINA} value={sb('indirizzo_ritiro')} onChange={e => setB('indirizzo_ritiro', e.target.value)} /> },
                            { k: 'Comune', vista: p.comune_ritiro ? `${p.comune_ritiro}${p.provincia_ritiro ? ` (${p.provincia_ritiro})` : ''}${p.cap_ritiro ? ` · ${p.cap_ritiro}` : ''}` : '—' },
                            { k: 'Spazio carro', vista: p.spazio_carro_attrezzi ? (SPAZIO_LABEL[p.spazio_carro_attrezzi] || p.spazio_carro_attrezzi) : '—', campo: (
                              <select className={`${CAMPO_TENDINA} cursor-pointer`} value={sb('spazio_carro_attrezzi')} onChange={e => setB('spazio_carro_attrezzi', e.target.value)}>
                                <option value="" disabled>Scegli…</option>
                                <option value="libero">Accesso libero</option>
                                <option value="stretto">Spazio stretto</option>
                                <option value="no">Non passa</option>
                              </select>
                            ) },
                            ...(p.casistica === 'non_intestatario' || p.casistica === 'targhe_straniere' ? [
                              { k: 'Delegato', vista: 'Delega non ammessa' },
                            ] : [
                              { k: 'Delegato', vista: p.delegato_nome || 'Consegna in prima persona', campo: <input className={CAMPO_TENDINA} placeholder="Vuoto = in prima persona" value={sb('delegato_nome')} onChange={e => setB('delegato_nome', e.target.value)} /> },
                              { k: 'Tel. delegato', vista: p.delegato_telefono || '—', campo: <input className={CAMPO_TENDINA} inputMode="tel" value={sb('delegato_telefono')} onChange={e => setB('delegato_telefono', e.target.value)} /> },
                            ]),
                          ]}
                        />
                      </div>
                      {/* ⭐ DOCUMENTI SOLO-VISORE (27/07 sera): in pagina non
                          disegna nulla — la pillola Documenti apre il visore
                          via `apriTrigger`, le miniature si caricano lì */}
                      {aperta && (
                        <DocumentiApprovazione
                          praticaId={p.id}
                          statoPratica={p.stato}
                          aperta
                          soloVisore
                          apriTrigger={docTrigger[p.id] ?? 0}
                          targa={p.targa}
                          veicolo={[[p.marca, p.modello].filter(Boolean).join(' '), p.anno].filter(Boolean).join(' · ') || null}
                          cliente={p.nome_richiedente}
                          onToggle={() => {}}
                          onStatoCambiato={(tutti, totale, approvati) => setDocStats(prev => ({ ...prev, [p.id]: { totale, approvati, daVerificare: prev[p.id]?.daVerificare ?? 0 } }))}
                          onRicaricaPratica={() => { ricaricaPratiche(); aggiornaContatori(p.id) }}
                        />
                      )}
                      {aperta && selAssegnaAperta && (
                        <PannelloAssegnazioneTendina
                          pratica={p}
                          demolitoreNome={p.demolitore_id ? demolitori[p.demolitore_id] || null : null}
                          onFatto={ricaricaPratiche}
                        />
                      )}
                      </div>

                      {/* CHAT A FINESTRELLA (26/07, variante A su mockup):
                          fissa in basso a destra, la pagina resta usabile.
                          27/07 sera: la cronologia non è più finestrella,
                          vive come prima scheda della fila. */}
                      {aperta && selChatAperta && (
                        <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'flex', alignItems: 'flex-end', zIndex: 50 }}>
                          <ChatAdmin
                            praticaId={p.id}
                            demolitoreNome={p.demolitore_id ? demolitori[p.demolitore_id] || null : null}
                            aperta
                            onToggle={() => { setSelChatAperta(false); aggiornaContatori(p.id) }}
                            finestra
                            titolo={`${p.nome_richiedente || 'Cliente'} · ${p.targa || 'senza targa'}`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                )
              })}
            </div>
          )}
          </div>

        </div>
      </div>

    </main>
  )
}

// ============================================================
// SOTTOCOMPONENTI
// ============================================================

// Sezione della TENDINA con MODIFICA SUL POSTO (27/07, variante 1 su
// mockup): righe ad ALTEZZA FISSA, in modifica il valore diventa un campo
// slim col filo blu (dissolvenza incrociata), la matita diventa
// Annulla · Salva in uno spazio già riservato. Zero sobbalzi.
function SezTendinaMod({ titolo, inEdit, salvando, errore, onMatita, onAnnulla, onSalva, righe, extra, avviso }: {
  titolo: string
  inEdit: boolean
  salvando: boolean
  errore?: string | null
  onMatita: () => void
  onAnnulla: () => void
  onSalva: () => void
  righe: { k: string; vista: string; campo?: React.ReactNode }[]
  extra?: React.ReactNode
  // ⭐ 27/07 (variante B su mockup): avviso blu tenue sotto la testata
  // (es. le risposte "critiche" del modulo nella scheda Casistiche)
  avviso?: React.ReactNode
}) {
  const fade = (visibile: boolean): React.CSSProperties => ({
    opacity: visibile ? 1 : 0,
    pointerEvents: visibile ? 'auto' : 'none',
    transition: 'opacity .18s ease',
  })
  return (
    <div style={{ flex: 1, minWidth: 215, background: '#fff', border: `1.5px solid ${inEdit ? '#93C5FD' : '#E5E7EB'}`, borderRadius: 12, padding: '11px 13px', transition: 'border-color .2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#0F1B33', flex: 1, minWidth: 0 }}>
          <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
          {titolo}
        </span>
        {/* Matita ↔ Annulla · Salva: larghezza riservata, dissolvenza */}
        <span style={{ position: 'relative', width: 98, height: 22, flexShrink: 0 }}>
          <span style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'flex-end', ...fade(!inEdit) }}>
            <button onClick={onMatita} aria-label={`Modifica ${titolo}`} className="flex items-center justify-center transition-colors hover:bg-blue-50 hover:border-blue-200" style={{ width: 22, height: 22, borderRadius: 7, border: '1.5px solid #E5E7EB', background: '#fff', color: '#1D4ED8', cursor: 'pointer' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
            </button>
          </span>
          <span style={{ position: 'absolute', inset: 0, display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center', ...fade(inEdit) }}>
            <button onClick={onAnnulla} disabled={salvando} className="disabled:opacity-50" style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#4B5563', fontSize: 10, fontWeight: 700, borderRadius: 7, padding: '3px 7px', cursor: 'pointer' }}>Annulla</button>
            <button onClick={onSalva} disabled={salvando} className="transition-colors hover:bg-blue-700 disabled:opacity-50" style={{ background: '#2563EB', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 7, padding: '3px 8px', cursor: 'pointer' }}>{salvando ? '…' : 'Salva'}</button>
          </span>
        </span>
      </div>
      {avviso}
      {righe.map((r, i) => (
        <div key={r.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 27, borderBottom: i === righe.length - 1 && !extra ? 'none' : '1px solid #F5F7FA', fontSize: 11.5 }}>
          <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.k}</span>
          <span style={{ position: 'relative', flex: 1, minWidth: 0, height: 22 }}>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...fade(!inEdit || !r.campo) }} title={r.vista}>{r.vista}</span>
            {r.campo && (
              <span style={{ position: 'absolute', inset: 0, ...fade(inEdit) }}>{r.campo}</span>
            )}
          </span>
        </div>
      ))}
      {inEdit && errore && <div style={{ fontSize: 10.5, color: '#DC2626', marginTop: 6 }}>{errore}</div>}
      {extra}
    </div>
  )
}

// Interruttore a pillolina per le condizioni del veicolo (in modifica):
// un tocco gira sì/no, grigio finché non è mai stato risposto
function PillBool({ valore, labelSi, labelNo, buonoSeNo, onClick }: {
  valore: boolean | null
  labelSi: string
  labelNo: string
  buonoSeNo?: boolean
  onClick: () => void
}) {
  const testo = valore == null ? `${labelSi}?` : valore ? labelSi : labelNo
  const buono = valore == null ? null : (buonoSeNo ? !valore : valore)
  return (
    <button
      onClick={onClick}
      className="transition-all hover:opacity-100"
      style={{
        background: buono == null ? '#F3F5F9' : buono ? '#EAF3DE' : '#FBE2E2',
        color: buono == null ? '#6B7280' : buono ? '#27500A' : '#9B1C1C',
        border: `1px solid ${buono == null ? '#D8DDE5' : 'currentColor'}`,
        fontSize: 9.5, fontWeight: 600, borderRadius: 20, padding: '2px 8px', cursor: 'pointer', opacity: 0.92,
      }}
    >
      {testo}
    </button>
  )
}

function PillCond({ buono, children }: { buono: boolean; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-block', background: buono ? '#EAF3DE' : '#FBE2E2', color: buono ? '#27500A' : '#9B1C1C', fontSize: 9.5, fontWeight: 600, borderRadius: 20, padding: '2px 8px', margin: '3px 3px 0 0' }}>{children}</span>
  )
}

// ⭐ 27/07: ICONE IDENTICHE al passo "Che veicolo è?" di /inizia — stesso
// disegno per ogni tipo di mezzo, così cliente e CRM parlano la stessa lingua.
function IconaVeicolo({ tipo }: { tipo: string | null }) {
  const t = (tipo || '').toLowerCase()
  const colore: React.CSSProperties = { color: '#2563eb' }

  if (t === 'motoveicolo') {
    return (
      <svg width="26" height="21" viewBox="0 0 640 512" style={colore}>
        <path fill="currentColor" d="M280 32c-13.3 0-24 10.7-24 24s10.7 24 24 24h57.7l16.4 30.3L256 192l-45.3-45.3c-12-12-28.3-18.7-45.3-18.7H64c-17.7 0-32 14.3-32 32v32h96c88.4 0 160 71.6 160 160c0 11-1.1 21.7-3.2 32h70.4c-2.1-10.3-3.2-21-3.2-32c0-52.2 25-98.6 63.7-127.8l15.4 28.6C402.4 276.3 384 312 384 352c0 70.7 57.3 128 128 128s128-57.3 128-128s-57.3-128-128-128c-13.5 0-26.5 2.1-38.7 6l-55.1-102H480c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32h-20.4c-7.5 0-14.7 2.6-20.5 7.4l-47.4 39.5l-14-26c-7-12.9-20.5-21-35.2-21zm182.7 279.2l28.2 52.2c6.3 11.7 20.9 16 32.5 9.7s16-20.9 9.7-32.5l-28.2-52.2c2.3-.3 4.7-.4 7.1-.4c35.3 0 64 28.7 64 64s-28.7 64-64 64s-64-28.7-64-64c0-15.5 5.5-29.7 14.7-40.8M187.3 376c-9.5 23.5-32.5 40-59.3 40c-35.3 0-64-28.7-64-64s28.7-64 64-64c26.9 0 49.9 16.5 59.3 40h66.4c-11.2-59.2-63.2-104-125.7-104C57.3 224 0 281.3 0 352s57.3 128 128 128c62.5 0 114.5-44.8 125.8-104h-66.4zm-59.3 8a32 32 0 1 0 0-64a32 32 0 1 0 0 64" />
      </svg>
    )
  }
  if (t === 'ciclomotore') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" style={colore}>
        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5a3 3 0 1 0-6 0m6 0h3m-3 0c0 .903-.399 1.713-1.03 2.263M9 5H6m3 0c0 .903.399 1.713 1.03 2.263M14 20h2a2 2 0 0 0 2-2v-5c0-1.692-.859-4.816-4.03-5.737M14 20a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2v0m4 0v-5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5m0 0H8a2 2 0 0 1-2-2v-5c0-1.692.859-4.816 4.03-5.737m3.94 0A3 3 0 0 1 12 8a3 3 0 0 1-1.97-.737" />
      </svg>
    )
  }
  if (t === 'minicar') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" style={colore}>
        <path fill="currentColor" d="M18.5 11H17v-1c0-3.31-2.69-6-6-6s-6 2.69-6 6v1.05c-.75.11-1.44.43-1.98.97A3.52 3.52 0 0 0 2 14.5c0 1.42.83 2.63 2.04 3.18c-.01.11-.04.21-.04.32c0 1.65 1.35 3 3 3s3-1.35 3-3h4c0 1.65 1.35 3 3 3s3-1.35 3-3c0-.11-.03-.21-.04-.32c.38-.17.72-.41 1.02-.71A3.52 3.52 0 0 0 22 14.49c0-1.93-1.57-3.5-3.5-3.5ZM12 6.14c1.72.45 3 2 3 3.86v1h-3zM7 10c0-1.86 1.28-3.41 3-3.86V11H7zm0 9c-.55 0-1-.45-1-1c0-.15.04-.31.11-.45c.01-.02.02-.03.03-.05c.28-.47.91-.59 1.35-.35c.15.08.28.2.37.36c.09.15.13.32.13.49c0 .55-.45 1-1 1Zm10 0a1.003 1.003 0 0 1-.87-1.5c.36-.63 1.35-.64 1.73 0c.01.02.02.04.03.05c.07.14.11.29.11.45c0 .55-.45 1-1 1m2.56-3.44c-.13.13-.29.24-.45.31l-.03-.03c-.04-.04-.08-.06-.12-.1c-.14-.12-.28-.23-.43-.32c-.06-.04-.13-.07-.19-.1q-.225-.105-.45-.18l-.2-.06c-.22-.05-.45-.09-.69-.09s-.49.04-.72.09c-.07.02-.14.05-.21.07c-.16.05-.31.11-.45.19c-.07.04-.15.08-.22.13c-.14.09-.26.18-.38.29c-.06.05-.12.1-.18.16c-.02.03-.05.04-.08.07H9.23s-.05-.05-.08-.07c-.05-.06-.11-.1-.17-.16q-.18-.165-.39-.3c-.07-.04-.14-.09-.21-.12c-.15-.08-.3-.14-.46-.19c-.07-.02-.14-.05-.21-.07q-.345-.09-.72-.09c-.375 0-.47.04-.69.09l-.2.06q-.24.075-.45.18c-.07.03-.13.07-.19.1c-.15.09-.3.2-.43.32c-.04.03-.08.06-.11.09l-.03.03c-.53-.23-.89-.76-.89-1.37c0-.4.16-.79.44-1.06c.28-.28.67-.44 1.06-.44h13c.83 0 1.5.67 1.5 1.5c0 .4-.16.79-.44 1.06Z" />
      </svg>
    )
  }
  if (t === 'furgone') {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" style={colore}>
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <path d="M13 6v5a1 1 0 0 0 1 1h6.102a1 1 0 0 1 .712.298l.898.91a1 1 0 0 1 .288.702V17a1 1 0 0 1-1 1h-3" />
          <path d="M5 18H3a1 1 0 0 1-1-1V8a2 2 0 0 1 2-2h12c1.1 0 2.1.8 2.4 1.8l1.176 4.2M9 18h5" />
          <circle cx="16" cy="18" r="2" />
          <circle cx="7" cy="18" r="2" />
        </g>
      </svg>
    )
  }
  if (t === 'pullman') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" style={colore}>
        <path fill="currentColor" fillRule="evenodd" d="M12 2C8.229 2 6.343 2 5.172 3.172C4.108 4.235 4.01 5.886 4 9H3a1 1 0 0 0-1 1v1a1 1 0 0 0 .4.8L4 13c.01 3.114.108 4.765 1.172 5.828c.242.243.514.435.828.587V21a1 1 0 0 0 1 1h1.5a1 1 0 0 0 1-1v-1.018C10.227 20 11.054 20 12 20s1.773 0 2.5-.018V21a1 1 0 0 0 1 1H17a1 1 0 0 0 1-1v-1.585a3 3 0 0 0 .828-.587C19.892 17.765 19.991 16.114 20 13l1.6-1.2a1 1 0 0 0 .4-.8v-1a1 1 0 0 0-1-1h-1c-.01-3.114-.108-4.765-1.172-5.828C17.657 2 15.771 2 12 2M5.5 9.5c0 1.414 0 2.121.44 2.56c.439.44 1.146.44 2.56.44h7c1.414 0 2.121 0 2.56-.44c.44-.439.44-1.146.44-2.56V7c0-1.414 0-2.121-.44-2.56C17.622 4 16.915 4 15.5 4h-7c-1.414 0-2.121 0-2.56.44C5.5 4.878 5.5 5.585 5.5 7zm.75 6.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H7a.75.75 0 0 1-.75-.75m11.5 0a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 .75-.75" clipRule="evenodd" />
      </svg>
    )
  }
  if (t === 'camion') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" style={colore}>
        <path fill="currentColor" d="M1 12.5v5a1 1 0 0 0 1 1h1a3 3 0 0 0 6 0h6a3 3 0 0 0 6 0h1a1 1 0 0 0 1-1v-12a3 3 0 0 0-3-3h-9a3 3 0 0 0-3 3v2H6a3 3 0 0 0-2.4 1.2l-2.4 3.2a.6.6 0 0 0-.07.14l-.06.11a1 1 0 0 0-.07.35m16 6a1 1 0 1 1 1 1a1 1 0 0 1-1-1m-7-13a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v11h-.78a3 3 0 0 0-4.44 0H10Zm-2 6H4l1.2-1.6a1 1 0 0 1 .8-.4h2Zm-3 7a1 1 0 1 1 1 1a1 1 0 0 1-1-1m-2-5h5v2.78a3 3 0 0 0-4.22.22H3Z" />
      </svg>
    )
  }
  if (t === 'imbarcazione') {
    return (
      <svg width="22" height="22" viewBox="0 0 36 36" style={colore}>
        <path fill="currentColor" d="M29.1 27.1c-1.1-.1-2.2.3-3.1 1.1c-1.1 1.1-2.9 1.1-4.1 0c-1-.7-2.1-1.1-3.3-1.1c-1.2-.1-2.4.3-3.3 1.1c-.6.5-1.3.8-2.1.8s-1.5-.3-2.1-.8c-1-.8-2.2-1.2-3.4-1.2s-2.4.4-3.4 1.2c-.6.5-1.5.8-2.3.8v2c1.3.1 2.6-.3 3.6-1.2c.6-.5 1.5-.8 2.3-.8c.7 0 1.5.3 2.1.8c1.8 1.6 4.6 1.6 6.5 0c.6-.5 1.3-.8 2.1-.8c.7 0 1.4.3 2 .8c1.9 1.6 4.6 1.6 6.5 0c.5-.5 1.3-.8 2-.8s1.4.3 1.9.8q1.35 1.05 3 1.2v-2c-1 0-1.2-.4-1.7-.8c-.9-.7-2-1.1-3.2-1.1" />
        <path fill="currentColor" d="M6 23c0-.6.5-1 1.1-1H32l-3.5 3.1h.2c.8 0 1.6.2 2.2.5l2.5-2.2l.2-.2c.7-.8.6-2.1-.2-2.8c-.4-.2-.8-.4-1.3-.4h-25c-1.7 0-3 1.3-3 3v3.2c.5-.5 1.2-.8 1.9-1.1z" />
        <path fill="currentColor" d="M8.9 19H15v-7.8c0-.6-.3-1.2-.8-1.6c-.9-.7-2.2-.5-2.8.4l-4.1 5.9c-.4.6-.4 1.4-.1 2.1c.3.6 1 1 1.7 1m4.2-7.8L13 17H8.9z" />
        <path fill="currentColor" d="M26 18c.4-.6.4-1.4 0-2L19.7 5.6c-.4-.6-1-1-1.7-1c-1.1 0-2 .9-2 2V19h8.3c.7 0 1.4-.4 1.7-1M17.9 6.6l6.4 10.5h-6.4z" />
      </svg>
    )
  }
  if (t === 'velivolo') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" style={colore}>
        <g fill="none">
          <path fill="currentColor" fillOpacity=".16" d="M10.292 7.043c0-3.478.424-5.043 1.698-5.043c1.273 0 1.708 1.565 1.708 5.043V8.74l6.238 3.957c.425.304.57.804.552 1.304v2l-6.532-2.62a.4.4 0 0 0-.548.345l-.304 4.753l2.376 1.348c.212.13.34.391.34.652L15.507 22l-3.517-1.174L8.483 22l-.313-1.522c0-.26.127-.522.34-.652l2.376-1.348l-.304-4.753a.4.4 0 0 0-.548-.345L3.502 16v-2c-.019-.5.127-1 .551-1.304l6.239-3.957z" />
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" d="M10.292 7.043c0-3.478.424-5.043 1.698-5.043c1.273 0 1.708 1.565 1.708 5.043V8.74l6.238 3.957c.425.304.57.804.552 1.304v2l-6.532-2.62a.4.4 0 0 0-.548.345l-.304 4.753l2.376 1.348c.212.13.34.391.34.652L15.507 22l-3.517-1.174L8.483 22l-.313-1.522c0-.26.127-.522.34-.652l2.376-1.348l-.304-4.753a.4.4 0 0 0-.548-.345L3.502 16v-2c-.019-.5.127-1 .551-1.304l6.239-3.957z" />
        </g>
      </svg>
    )
  }
  // Autovettura (e "altro"): la stessa auto del flusso
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={colore}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
        <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9m-6-6h15m-6 0V6" />
      </g>
    </svg>
  )
}

// Fase del flusso come PILLOLA TONDA (variante B scelta da Davide su
// mockup 23/07): numero nel tondino, nome accanto, tutto in una riga
// bassa. `rossa` = versione allerta (stessa forma, colorata di rosso).
// ============================================================
// ⭐ PANNELLO ASSEGNAZIONE nella tendina (27/07, mockup definitivo):
// colonna DESTRA accanto alle schede. All'apertura carica da solo la
// classifica (dry-run arricchito dal server: km, giorni, carico "da
// ritirare", fee applicabile); "Scegli tu" mostra tutti i demolitori
// attivi nello stesso riquadro. L'elenco scorre DENTRO il riquadro.
// ============================================================

function PannelloAssegnazioneTendina({ pratica, demolitoreNome, onFatto }: {
  pratica: Pratica
  demolitoreNome: string | null
  onFatto: () => void
}) {
  const assegnata = !!pratica.demolitore_id
  const puoAssegnare = ['da_assegnare', 'in_assegnazione_manuale', 'in_attesa_assegnazione'].includes(pratica.stato)
  const [vista, setVista] = useState<'ferma' | 'classifica' | 'tutti'>('ferma')
  const [caricando, setCaricando] = useState(false)
  const [candidati, setCandidati] = useState<CandidatoTendina[]>([])
  const [vincitoreId, setVincitoreId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [tutti, setTutti] = useState<CandidatoTendina[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [confermaRimuovi, setConfermaRimuovi] = useState(false)
  const [rimuovendo, setRimuovendo] = useState(false)

  async function caricaClassifica() {
    setVista('classifica')
    setCaricando(true)
    setErrore(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/assegna-pratica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: pratica.id, dry_run: true }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setErrore(data?.error || 'Errore nel calcolo'); setCandidati([]) }
      else {
        setCandidati(data.candidati || [])
        setVincitoreId(data.vincitore?.id ?? null)
        setMotivo(data.motivo ?? null)
      }
    } catch {
      setErrore('Errore di rete durante il calcolo.')
    }
    setCaricando(false)
  }

  // All'apertura del pannello la classifica si carica da sola
  useEffect(() => {
    if (!assegnata && puoAssegnare) caricaClassifica()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function caricaTutti() {
    setVista('tutti')
    setCaricando(true)
    setErrore(null)
    const { data } = await supabase.from('demolitori').select('id, ragione_sociale, citta').eq('stato', 'attivo').order('ragione_sociale')
    setTutti((data as CandidatoTendina[]) || [])
    setCaricando(false)
  }

  async function assegna(demolitoreId: string, manuale: boolean) {
    setBusyId(demolitoreId)
    setErrore(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/assegna-pratica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: pratica.id, demolitore_id: demolitoreId, manuale }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setErrore(data?.error || 'Errore assegnazione'); setBusyId(null); return }
      setVista('ferma')
      onFatto()
    } catch {
      setErrore('Errore di rete durante l\'assegnazione.')
    }
    setBusyId(null)
  }

  async function rimuovi() {
    setRimuovendo(true)
    setErrore(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/assegna-pratica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: pratica.id, disassegna: true }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setErrore(data?.error || 'Errore durante la rimozione'); setRimuovendo(false); return }
      setConfermaRimuovi(false)
      onFatto()
      caricaClassifica()
    } catch {
      setErrore('Errore di rete.')
    }
    setRimuovendo(false)
  }

  const chipCarico = (n: number | undefined) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: (n ?? 0) >= 10 ? '#FDF7EA' : '#F1F5F9', color: (n ?? 0) >= 10 ? '#854F0B' : '#475569', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="2" y="9" width="12" height="6" rx="1" /><path d="M14 10h4l3 3v2h-2" /><circle cx="6" cy="17" r="1.6" /><circle cx="17" cy="17" r="1.6" /></svg>
      {n ?? 0} da ritirare
    </span>
  )
  const ZONA_LABEL: Record<string, string> = { concordato: 'Importo concordato per questa pratica', comune: 'Tariffa del comune', provincia: 'Tariffa della provincia', regione: 'Tariffa della regione', base: 'Fee base' }

  const rigaCandidato = (c: CandidatoTendina, i: number, daClassifica: boolean) => {
    const top = daClassifica && vincitoreId === c.id
    const vel = c.velocita_media_giorni != null && c.velocita_media_giorni < 999 ? `${c.velocita_media_giorni.toFixed(1)} gg` : 'nuovo'
    return (
      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px', borderBottom: '1px solid #F5F7FA', fontSize: 12, background: top ? '#F8FAFF' : 'transparent' }}>
        {daClassifica && <span style={{ width: 19, height: 19, borderRadius: 999, background: '#EFF4FF', color: '#1D4ED8', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 700, color: '#111827', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ragione_sociale}</span>
          <span style={{ display: 'block', color: '#6B7280', fontSize: 10.5, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.citta || ''}
            {c.distanza_km != null && <> · <b style={{ color: '#374151' }}>{Math.round(c.distanza_km)} km</b></>}
            {daClassifica && <> · {vel}</>}
          </span>
        </span>
        {daClassifica && chipCarico(c.da_ritirare)}
        {daClassifica && c.fee_applicabile != null && (
          <span title={c.zona_fee ? ZONA_LABEL[c.zona_fee] : undefined} style={{ fontWeight: 800, color: '#111827', fontSize: 12, flexShrink: 0 }}>{c.fee_applicabile}€</span>
        )}
        <button
          onClick={() => assegna(c.id, daClassifica ? c.id !== vincitoreId : true)}
          disabled={busyId != null}
          className="transition-colors disabled:opacity-50"
          style={top ? { background: '#2563EB', border: '1.5px solid #2563EB', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 10px', flexShrink: 0, cursor: 'pointer' } : { background: '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 10px', flexShrink: 0, cursor: 'pointer' }}
        >
          {busyId === c.id ? 'Assegno…' : 'Assegna'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1.3, minWidth: 440, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F1B33' }}>
          Assegnazione
          {vista === 'classifica' && !caricando && candidati.length > 0 && <span style={{ fontWeight: 400, fontSize: 10.5, color: '#64748B' }}> · {candidati.length} {candidati.length === 1 ? 'demolitore copre' : 'demolitori coprono'} la zona</span>}
        </span>
        <span style={{ flex: 1 }} />
        {assegnata ? (
          !confermaRimuovi && (
            <>
              <button onClick={caricaClassifica} disabled={rimuovendo} className="transition-colors hover:bg-blue-50 disabled:opacity-50" style={{ background: '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', whiteSpace: 'nowrap', cursor: 'pointer' }}>Riassegna</button>
              <button onClick={() => setConfermaRimuovi(true)} disabled={rimuovendo} className="transition-colors hover:bg-red-50 disabled:opacity-50" style={{ background: '#fff', border: '1.5px solid #F3C8C8', color: '#C0392B', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', whiteSpace: 'nowrap', cursor: 'pointer' }}>Rimuovi</button>
            </>
          )
        ) : puoAssegnare ? (
          <>
            <button onClick={() => vincitoreId && assegna(vincitoreId, false)} disabled={busyId != null || caricando || !vincitoreId} className="transition-colors hover:bg-blue-700 disabled:opacity-50" style={{ background: '#2563EB', border: '1.5px solid #2563EB', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', whiteSpace: 'nowrap', cursor: 'pointer' }}>Assegna in automatico</button>
            <button onClick={caricaTutti} disabled={busyId != null} className="transition-colors hover:bg-blue-50 disabled:opacity-50" style={{ background: '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', whiteSpace: 'nowrap', cursor: 'pointer' }}>Scegli tu</button>
          </>
        ) : null}
      </div>

      {/* Già assegnata: demolitore in vista + rimozione con conferma in linea */}
      {assegnata && (
        <div style={{ borderRadius: 10, padding: '9px 11px', background: '#E6F1FB', border: '1px solid #B5D4F4', marginBottom: vista === 'classifica' ? 8 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E4E8C" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></svg>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0C447C' }}>{demolitoreNome || 'Demolitore'}</span>
            {pratica.data_assegnazione && (
              <span style={{ fontSize: 10.5, color: '#1E4E8C' }}>· assegnata il {new Date(pratica.data_assegnazione).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
            )}
          </div>
          {confermaRimuovi && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10.5, color: '#1E4E8C', flex: 1, minWidth: 160 }}>La pratica torna da assegnare e il cliente vedrà &quot;stiamo scegliendo un nuovo demolitore&quot;.</span>
              <button onClick={() => setConfermaRimuovi(false)} disabled={rimuovendo} style={{ background: 'none', border: 'none', color: '#5B6779', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>Annulla</button>
              <button onClick={rimuovi} disabled={rimuovendo} className="transition-colors hover:!bg-[#D25151] disabled:opacity-50" style={{ background: '#E15E5E', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', cursor: 'pointer' }}>{rimuovendo ? 'Rimuovo…' : 'Sì, rimuovi'}</button>
            </div>
          )}
        </div>
      )}

      {/* Non ancora assegnabile: i documenti prima di tutto */}
      {!assegnata && !puoAssegnare && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#9AA7B5', padding: '6px 2px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          Prima approva tutti i documenti
        </div>
      )}

      {errore && <div style={{ fontSize: 10.5, color: '#C0392B', fontWeight: 600, marginBottom: 6 }}>{errore}</div>}

      {/* ELENCO con scroll DENTRO il riquadro (mockup: rotella sull'elenco,
          la pagina non si muove) */}
      {(vista === 'classifica' || vista === 'tutti') && (!assegnata || vista === 'classifica') && (
        caricando ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '14px 0', fontSize: 11.5, color: '#6B7280' }}>
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Calcolo in corso…
          </div>
        ) : vista === 'tutti' ? (
          tutti.length === 0 ? (
            <p style={{ fontSize: 11.5, color: '#9AA7B5', padding: '4px 2px' }}>Nessun demolitore attivo nel sistema.</p>
          ) : (
            <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', border: '1px solid #EEF1F5', borderRadius: 10, maxHeight: 150 }}>
              {tutti.map((c, i) => rigaCandidato(c, i, false))}
            </div>
          )
        ) : candidati.length === 0 ? (
          <div style={{ fontSize: 11.5, color: '#6B7280', padding: '4px 2px' }}>
            <p style={{ marginBottom: 6 }}>{motivo || 'Nessun demolitore copre questa zona.'}</p>
            <button onClick={caricaTutti} style={{ background: 'none', border: 'none', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Mostra tutti i demolitori attivi</button>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', border: '1px solid #EEF1F5', borderRadius: 10, maxHeight: 150 }}>
            {candidati.map((c, i) => rigaCandidato(c, i, true))}
          </div>
        )
      )}
    </div>
  )
}

function PillolaFase({ nome, valore, attivo, rossa, quieta, title, onClick }: {
  nome: string
  valore: number
  attivo: boolean
  rossa?: boolean
  // ⭐ 27/07 sera: variante QUIETA (azzurro spento della pausa) per "In attesa"
  quieta?: boolean
  title?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-2 transition-all hover:shadow-md flex-shrink-0"
      style={{
        // ⭐ 27/07 sera (richiesta Davide): la pillola ATTIVA si tinge dello
        // stesso azzurro dell'apertura — si vede subito dove sei
        background: rossa ? '#FEF6F6' : attivo ? '#EFF6FF' : '#fff',
        border: `1.5px solid ${attivo ? '#2563eb' : rossa ? '#F3C8C8' : '#E5E7EB'}`,
        borderRadius: 999, padding: '8px 14px 8px 9px', whiteSpace: 'nowrap',
        boxShadow: attivo ? '0 0 0 3px rgba(37,99,235,0.12)' : '0 1px 3px rgba(16,24,40,0.07)',
      }}
    >
      {/* ⭐ 27/07 sera: il tondino resta AZZURRO come le sorelle anche nella
          variante quieta (il grigio spento sembrava scolorito) — la pausa
          la dice solo l'etichetta grigia */}
      <span className="flex items-center justify-center rounded-full" style={{ minWidth: 26, height: 26, padding: '0 6px', background: rossa ? '#FBDADA' : '#EFF4FF', color: rossa ? '#C0392B' : '#1D4ED8', fontSize: 13, fontWeight: 800 }}>{valore}</span>
      <span className="text-[12px] font-bold" style={{ color: rossa ? '#9B1C1C' : quieta ? '#5B6779' : '#374151' }}>{nome}</span>
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
