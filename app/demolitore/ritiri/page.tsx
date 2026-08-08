'use client'

/**
 * PAGINA "RITIRI" — AREA DEMOLITORE (07-08/08, mockup Variante 1 + barra
 * B + versione TIMELINE approvati da Davide): l'agenda dei ritiri
 * pianificati, la settimana a colonne.
 * - BARRA azzurra pulita: titolo col contatore sotto e il bottone
 *   "Aggiungi impegno" (icona calendario, NIENTE segno più) a destra.
 * - Navigazione SUL calendario, in parole e senza trattini: il mese fa
 *   da contesto a sinistra, "Questa settimana" con "dal 3 all'8 agosto"
 *   nel mezzo, "Torna a oggi" solo quando ti sei spostato.
 * - Colonne con la TESTATA (giorno + conteggio a pillolina, oggi con
 *   l'anello celeste) e dentro IL FILO DELLA GIORNATA: card agganciate
 *   alla timeline coi pallini (blu = da fare, verde = ritirato, grigio
 *   = personale) e la PILLOLA DI STATO della palette unica.
 * - Card blu = pratiche NoiDemoliamo (clic → la pratica); card grigie
 *   PERSONALE = impegni suoi (eliminabili con conferma sulla card).
 * - Regge 10-20 ritiri al giorno: la pagina non scorre mai, scorrono le
 *   colonne al loro interno. La storia resta navigando indietro.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import { chiamataDemolitore, PraticaDemolitore, nomeVeicolo, gruppoDi, GruppoPratica } from '../_lib/api'
import SidebarDemolitore from '../_components/SidebarDemolitore'
import TendaAzienda from '../_components/TendaAzienda'
import { PickerRitiro, VoceAgendaRitiro } from '../_components/TendinaPratica'

const GIORNI_BREVI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

interface Impegno { id: string; quando: string; titolo: string; luogo: string | null }

// ⭐ 08/08 ("si disconnette" segnalato da Davide): CACHE DI SESSIONE —
// navigando tra Pratiche e Ritiri la pagina riparte dai dati già visti
// (aggiornati poi in silenzio), niente rotellina nuda a schermo intero
let cacheRitiri: { pratiche: PraticaDemolitore[]; impegni: Impegno[]; pronti: boolean } | null = null

// Una voce della colonna: ritiro di una pratica O impegno personale
type VoceColonna =
  | { tipo: 'pratica'; quando: string; p: PraticaDemolitore }
  | { tipo: 'impegno'; quando: string; i: Impegno }

function chiaveGiorno(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }
function lunediDi(d: Date) { const l = new Date(d); l.setDate(d.getDate() - ((d.getDay() + 6) % 7)); l.setHours(0, 0, 0, 0); return l }
function oraDi(iso: string) { return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }

// Le date IN PAROLE, senza trattini (regola 11): "dal 3 all'8 agosto",
// "dall'11 al 16 agosto", "dal 31 agosto al 5 settembre"
function conArticolo(n: number, prep: 'dal' | 'al') {
  const vocale = n === 8 || n === 11 // otto e undici vogliono l'apostrofo
  if (prep === 'dal') return vocale ? `dall'${n}` : `dal ${n}`
  return vocale ? `all'${n}` : `al ${n}`
}
function dalAl(inizio: Date, fine: Date) {
  if (inizio.getMonth() === fine.getMonth()) {
    return `${conArticolo(inizio.getDate(), 'dal')} ${conArticolo(fine.getDate(), 'al')} ${MESI_LUNGHI[fine.getMonth()]}`
  }
  return `${conArticolo(inizio.getDate(), 'dal')} ${MESI_LUNGHI[inizio.getMonth()]} ${conArticolo(fine.getDate(), 'al')} ${MESI_LUNGHI[fine.getMonth()]}`
}

// Il ritiro è già avvenuto? (pallino e spunta verdi sulla card)
function eFatta(p: PraticaDemolitore): boolean {
  return !!p.data_ritiro_effettuato || ['ritirata', 'in_attesa_recensione_cliente', 'in_attesa_cert_rottamazione', 'in_attesa_cert_radiazione_pra', 'completata'].includes(p.stato)
}

// La pillola di stato sulla card (palette unica 6.4: azzurra per il
// flusso, verde solo Completata; qui niente rosse: le annullate non
// entrano in agenda). Nomi corti, figli delle caselle del flusso.
function pillolaCard(gruppo: GruppoPratica): { label: string; bg: string; color: string } | null {
  const FLUSSO = { bg: '#EFF6FF', color: '#1D4ED8' }
  switch (gruppo) {
    case 'fissato': return { label: 'Ritiro fissato', ...FLUSSO }
    case 'rottamazione': return { label: 'Attesa Cert. di Rottamazione', ...FLUSSO }
    case 'targhe': return { label: 'Attesa Cert. cancellazione targhe', ...FLUSSO }
    case 'completate': return { label: 'Completata', bg: '#DCF3E4', color: '#1F7A43' }
    default: return null
  }
}

export default function RitiriDemolitore() {
  const router = useRouter()
  const [pratiche, setPratiche] = useState<PraticaDemolitore[]>(() => cacheRitiri?.pratiche || [])
  const [impegni, setImpegni] = useState<Impegno[]>(() => cacheRitiri?.impegni || [])
  // La tabella degli impegni esiste? (finché manca, niente bottone)
  const [impegniPronti, setImpegniPronti] = useState(() => cacheRitiri?.pronti || false)
  // Rotellina solo al PRIMO ingresso in assoluto: con la cache si riparte pieni
  const [loading, setLoading] = useState(() => !cacheRitiri)
  const [errore, setErrore] = useState('')
  const [menuMobile, setMenuMobile] = useState(false)
  const [aziendaAperta, setAziendaAperta] = useState(false)
  // Di quante settimane ci si è spostati da quella corrente
  const [salto, setSalto] = useState(0)
  // Nuvoletta "Aggiungi impegno" (ancorata al bottone della barra)
  const [nuvolaAperta, setNuvolaAperta] = useState(false)
  const [quandoImpegno, setQuandoImpegno] = useState('')
  const [titoloImpegno, setTitoloImpegno] = useState('')
  const [luogoImpegno, setLuogoImpegno] = useState('')
  const [busyImpegno, setBusyImpegno] = useState(false)
  const [erroreImpegno, setErroreImpegno] = useState('')
  // Conferma di eliminazione in linea sulla card (regola 19)
  const [eliminaId, setEliminaId] = useState<string | null>(null)

  const ricarica = useCallback(async () => {
    try {
      const json = await chiamataDemolitore<{ pratiche: PraticaDemolitore[] }>('/api/demolitore-pratiche')
      setPratiche(json.pratiche || [])
      cacheRitiri = { pratiche: json.pratiche || [], impegni: cacheRitiri?.impegni || [], pronti: cacheRitiri?.pronti || false }
    } catch { /* silenzioso */ }
    try {
      const json = await chiamataDemolitore<{ impegni: Impegno[]; pronta: boolean }>('/api/demolitore-impegni', { azione: 'lista' })
      setImpegni(json.impegni || [])
      setImpegniPronti(!!json.pronta)
      cacheRitiri = { pratiche: cacheRitiri?.pratiche || [], impegni: json.impegni || [], pronti: !!json.pronta }
    } catch { /* silenzioso */ }
  }, [])

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: u } = await supabase.from('utenti').select('tipo').eq('id', session.user.id).single()
      if (u?.tipo !== 'demolitore') {
        router.push(u?.tipo === 'admin' ? '/admin' : '/dashboard')
        return
      }
      try {
        const json = await chiamataDemolitore<{ pratiche: PraticaDemolitore[] }>('/api/demolitore-pratiche')
        setPratiche(json.pratiche || [])
        cacheRitiri = { pratiche: json.pratiche || [], impegni: cacheRitiri?.impegni || [], pronti: cacheRitiri?.pronti || false }
      } catch (e) {
        setErrore(e instanceof Error ? e.message : 'Errore nel caricamento')
      }
      try {
        const json = await chiamataDemolitore<{ impegni: Impegno[]; pronta: boolean }>('/api/demolitore-impegni', { azione: 'lista' })
        setImpegni(json.impegni || [])
        setImpegniPronti(!!json.pronta)
        cacheRitiri = { pratiche: cacheRitiri?.pratiche || [], impegni: json.impegni || [], pronti: !!json.pronta }
      } catch { /* silenzioso */ }
      setLoading(false)
    }
    carica()
  }, [router])

  // Il fascicolo della home si prepara in anticipo: il ritorno è istantaneo
  useEffect(() => { router.prefetch('/demolitore') }, [router])

  useAggiornaLive({
    canale: 'demolitore-ritiri',
    onCambio: ricarica,
    pollingMs: 20000,
    attivo: !nuvolaAperta,
  })

  async function esci() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Le voci in agenda: pratiche con data fissata (annullate escluse:
  // quel ritiro non c'è mai stato) + impegni personali
  const voci = useMemo<VoceColonna[]>(() => [
    ...pratiche
      .filter(p => p.data_ritiro_prevista && p.stato !== 'annullata')
      .map(p => ({ tipo: 'pratica' as const, quando: p.data_ritiro_prevista!, p })),
    ...impegni.map(i => ({ tipo: 'impegno' as const, quando: i.quando, i })),
  ], [pratiche, impegni])

  const vociDel = useCallback((d: Date) =>
    voci
      .filter(v => chiaveGiorno(new Date(v.quando)) === chiaveGiorno(d))
      .sort((a, b) => a.quando.localeCompare(b.quando)),
  [voci])

  // L'agenda per la nuvoletta (ore già prese nella scelta dell'impegno)
  const agendaPicker = useMemo<VoceAgendaRitiro[]>(() => [
    ...pratiche
      .filter(p => p.data_ritiro_prevista && p.stato !== 'annullata')
      .map(p => ({ id: p.id, quando: p.data_ritiro_prevista!, targa: p.targa, veicolo: nomeVeicolo(p), comune: p.comune_ritiro, nome: p.nome_richiedente })),
    ...impegni.map(i => ({ id: `impegno-${i.id}`, quando: i.quando, targa: null, veicolo: i.titolo, comune: i.luogo, nome: null, personale: true })),
  ], [pratiche, impegni])

  const oggi = new Date()
  const lunedi = useMemo(() => { const l = lunediDi(new Date()); l.setDate(l.getDate() + salto * 7); return l }, [salto])

  // Colonne lun-sab; la domenica compare solo se quella settimana ha voci
  const giorniColonna = useMemo(() => {
    const giorni = Array.from({ length: 6 }, (_, i) => { const d = new Date(lunedi); d.setDate(lunedi.getDate() + i); return d })
    const domenica = new Date(lunedi); domenica.setDate(lunedi.getDate() + 6)
    if (vociDel(domenica).length > 0) giorni.push(domenica)
    return giorni
  }, [lunedi, vociDel])

  const contaSettimana = giorniColonna.reduce((n, d) => n + vociDel(d).length, 0)

  // "Questa settimana", "dal 3 all'8 agosto"… (parole naturali, mai trattini)
  const fine = giorniColonna[giorniColonna.length - 1]
  const dateParole = dalAl(lunedi, fine)
  const titoloSettimana = salto === 0 ? 'Questa settimana'
    : salto === 1 ? 'Settimana prossima'
    : salto === -1 ? 'Settimana scorsa'
    : `${dateParole.charAt(0).toUpperCase()}${dateParole.slice(1)} ${fine.getFullYear()}`
  const sottotitoloVisibile = salto === 0 || salto === 1 || salto === -1

  async function salvaImpegno() {
    if (busyImpegno) return
    setBusyImpegno(true)
    setErroreImpegno('')
    try {
      const json = await chiamataDemolitore<{ impegni: Impegno[] }>('/api/demolitore-impegni', {
        azione: 'aggiungi', quando: quandoImpegno, titolo: titoloImpegno, luogo: luogoImpegno,
      })
      setImpegni(json.impegni || [])
      cacheRitiri = { pratiche: cacheRitiri?.pratiche || [], impegni: json.impegni || [], pronti: true }
      setNuvolaAperta(false)
      setQuandoImpegno('')
      setTitoloImpegno('')
      setLuogoImpegno('')
    } catch (e) {
      setErroreImpegno(e instanceof Error ? e.message : 'Errore nel salvataggio')
    }
    setBusyImpegno(false)
  }

  async function eliminaImpegno(id: string) {
    try {
      const json = await chiamataDemolitore<{ impegni: Impegno[] }>('/api/demolitore-impegni', { azione: 'elimina', id })
      setImpegni(json.impegni || [])
      cacheRitiri = { pratiche: cacheRitiri?.pratiche || [], impegni: json.impegni || [], pronti: true }
    } catch { /* silenzioso */ }
    setEliminaId(null)
  }

  // ⭐ 08/08: NIENTE rotellina nuda a schermo intero — la struttura resta
  // in piedi e la rotellina vive nell'area contenuti (navigando tra le
  // pagine sembrava una disconnessione)
  return (
    // AD ALTEZZA SCHERMO (schema area-lavoro): la finestra non scorre mai,
    // scorrono solo le colonne dei giorni al loro interno
    <main className="flex" style={{ background: '#ECEEF2', height: '100vh', overflow: 'hidden' }}>

      <SidebarDemolitore
        attiva="ritiri"
        apertaMobile={menuMobile}
        onChiudiMobile={() => setMenuMobile(false)}
        onPratiche={() => router.push('/demolitore')}
        // ⭐ 08/08 (segnalato da Davide): riclic su "Ritiri" con la tenda
        // aperta = la tenda si richiude
        onRitiri={() => setAziendaAperta(false)}
        onAzienda={() => setAziendaAperta(true)}
        onEsci={esci}
      />

      <div className="flex-1 min-w-0 flex flex-col">

        {/* BARRA AZZURRA PULITA (barra B approvata): titolo col contatore
            sotto e "Aggiungi impegno" con l'icona calendario a destra */}
        <div className="border-b px-4 lg:px-6 py-3 flex items-center gap-3" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
          <button onClick={() => setMenuMobile(true)} aria-label="Menu" className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white" style={{ border: '1px solid #DBEAFE' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Ritiri</h1>
            <p className="text-xs text-gray-500 mt-1">{loading ? '…' : contaSettimana === 1 ? '1 impegno questa settimana' : `${contaSettimana} impegni questa settimana`}</p>
          </div>
          {impegniPronti && (
            <div className="ml-auto relative">
              <button
                onClick={() => { setNuvolaAperta(x => !x); setQuandoImpegno(''); setTitoloImpegno(''); setLuogoImpegno(''); setErroreImpegno('') }}
                className="flex items-center gap-2 transition-all hover:brightness-105"
                style={{ background: 'linear-gradient(90deg,#1d4ed8,#2563eb)', border: 'none', color: '#fff', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '8px 16px', cursor: 'pointer', boxShadow: '0 3px 9px rgba(37,99,235,0.3)' }}
              >
                {/* ⭐ 08/08 (richiesta Davide): icona calendario, via il "+" */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                Aggiungi impegno
              </button>

              {/* NUVOLETTA "Aggiungi impegno" (regola 20): stesso picker del
                  ritiro senza la colonna giornata, più COSA e DOVE */}
              {nuvolaAperta && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => { if (!busyImpegno) setNuvolaAperta(false) }} />
                  <div className="bg-white" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 420, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 90px)', overflowY: 'auto', overscrollBehavior: 'contain', border: '1.5px solid #DBEAFE', borderRadius: 14, boxShadow: '0 14px 34px rgba(15,23,42,0.18)', padding: 14, zIndex: 41 }}>
                    <div className="text-[13px] font-bold text-gray-900 mb-2">Aggiungi un impegno personale</div>
                    <PickerRitiro
                      agenda={agendaPicker}
                      senzaGiornata
                      onScelta={iso => setQuandoImpegno(iso || '')}
                    />
                    <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, color: '#9AA7B5', textTransform: 'uppercase', margin: '10px 0 6px' }}>Cosa devi fare?</div>
                    <input
                      value={titoloImpegno}
                      onChange={e => setTitoloImpegno(e.target.value)}
                      placeholder="Es. Ritiro furgone da officina Bianchi"
                      className="w-full text-base sm:text-[12.5px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-300 transition-colors"
                      style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 10px' }}
                    />
                    <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, color: '#9AA7B5', textTransform: 'uppercase', margin: '10px 0 6px' }}>Dove (facoltativo)</div>
                    <input
                      value={luogoImpegno}
                      onChange={e => setLuogoImpegno(e.target.value)}
                      placeholder="Comune o indirizzo…"
                      className="w-full text-base sm:text-[12.5px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-300 transition-colors"
                      style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 10px' }}
                    />
                    {erroreImpegno && <div className="text-[11.5px] font-semibold mt-2" style={{ color: '#9B1C1C' }}>{erroreImpegno}</div>}
                    <p className="text-[11px] mt-2" style={{ color: '#8B95A5', lineHeight: 1.45 }}>Lo vedi solo tu: NoiDemoliamo non tocca i tuoi impegni. Ti serve per incastrare bene i ritiri.</p>
                    <div className="flex gap-2 justify-end mt-3">
                      <button onClick={() => setNuvolaAperta(false)} disabled={busyImpegno} className="transition-colors hover:bg-gray-50" style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#4B5563', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 13px', cursor: 'pointer' }}>Annulla</button>
                      <button
                        onClick={salvaImpegno}
                        disabled={busyImpegno || !quandoImpegno || !titoloImpegno.trim()}
                        className="transition-all hover:brightness-105 disabled:opacity-60"
                        style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', border: 'none', color: '#fff', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 15px', cursor: 'pointer', boxShadow: '0 3px 9px rgba(37,99,235,0.3)' }}
                      >
                        {busyImpegno ? 'Un attimo…' : 'Salva impegno'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {errore && (
          <div className="px-4 lg:px-6 pt-4">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold bg-white" style={{ border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>{errore}</span>
          </div>
        )}

        {loading ? (
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <div className="flex-1 min-h-0 p-4 lg:p-5 flex flex-col">

          {/* NAVIGAZIONE SUL CALENDARIO: il mese fa da contesto a sinistra,
              le parole nel mezzo, "Torna a oggi" solo se spostati */}
          <div className="flex items-center flex-shrink-0" style={{ gap: 12, marginBottom: 12 }}>
            <span className="hidden sm:block" style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#9AA7B5', textTransform: 'uppercase', minWidth: 110 }}>
              {MESI_LUNGHI[fine.getMonth()]} {fine.getFullYear()}
            </span>
            <button onClick={() => setSalto(s => s - 1)} aria-label="Settimana precedente" className="flex items-center justify-center bg-white transition-colors hover:bg-blue-50" style={{ width: 30, height: 30, borderRadius: 999, border: '1.5px solid #DBEAFE', color: '#1D4ED8', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div className="flex-1 text-center min-w-0">
              <b className="block text-[14px] font-bold leading-tight" style={{ color: '#0F1B33' }}>{titoloSettimana}</b>
              {sottotitoloVisibile && <span className="block text-[11px] font-semibold" style={{ color: '#8A94A3', marginTop: 1 }}>{dateParole}</span>}
            </div>
            <button onClick={() => setSalto(s => s + 1)} aria-label="Settimana successiva" className="flex items-center justify-center bg-white transition-colors hover:bg-blue-50" style={{ width: 30, height: 30, borderRadius: 999, border: '1.5px solid #DBEAFE', color: '#1D4ED8', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            {/* Slot fisso a destra: bilancia il mese e non fa slittare nulla */}
            <span className="hidden sm:flex justify-end" style={{ minWidth: 110 }}>
              {salto !== 0 && (
                <button onClick={() => setSalto(0)} className="transition-colors hover:bg-blue-200" style={{ border: 'none', background: '#DBEAFE', color: '#1D4ED8', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '5px 12px', cursor: 'pointer' }}>Torna a oggi</button>
              )}
            </span>
          </div>

          {/* LA SETTIMANA A COLONNE: testata col conteggio, dentro il FILO
              della giornata; le colonne scorrono al loro interno */}
          <div className="flex-1 min-h-0 overflow-x-auto">
            <div className="flex gap-2.5 h-full" style={{ minWidth: giorniColonna.length * 150 }}>
              {giorniColonna.map(d => {
                const eOggi = chiaveGiorno(d) === chiaveGiorno(oggi)
                const lista = vociDel(d)
                return (
                  <div
                    key={chiaveGiorno(d)}
                    className="flex-1 min-w-0 flex flex-col"
                    style={{
                      background: eOggi ? '#EFF6FF' : '#F6F8FB',
                      border: `1.5px solid ${eOggi ? '#93B8F5' : '#E5E9F0'}`,
                      boxShadow: eOggi ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
                      borderRadius: 14, overflow: 'hidden',
                    }}
                  >
                    {/* Testata della colonna: giorno + conteggio a pillolina */}
                    <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '9px 11px 7px', borderBottom: `1px solid ${eOggi ? '#DBEAFE' : '#ECF0F5'}` }}>
                      <span className="flex items-baseline" style={{ gap: 5 }}>
                        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, color: eOggi ? '#1D4ED8' : '#9AA7B5', textTransform: 'uppercase' }}>{GIORNI_BREVI[d.getDay()]}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: eOggi ? '#1D4ED8' : '#1E293B' }}>{d.getDate()}</span>
                      </span>
                      <span className="flex items-center" style={{ gap: 5 }}>
                        {eOggi && <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 0.5, background: '#2563eb', color: '#fff', borderRadius: 999, padding: '1.5px 7px' }}>OGGI</span>}
                        <span style={{ fontSize: 9.5, fontWeight: 800, background: eOggi ? '#2563eb' : '#E8ECF3', color: eOggi ? '#fff' : '#5B6779', borderRadius: 999, padding: '2px 8px', opacity: lista.length === 0 && !eOggi ? 0.45 : 1 }}>{lista.length}</span>
                      </span>
                    </div>

                    {/* Corpo: il filo della giornata coi pallini */}
                    <div className="flex-1 min-h-0 overflow-y-auto" style={{ overscrollBehavior: 'contain', padding: lista.length > 0 ? '8px 8px 8px 22px' : 8, position: 'relative' }}>
                      {lista.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center" style={{ gap: 6, color: '#C0C8D4', paddingBottom: 20 }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                          <span style={{ fontSize: 10.5, fontWeight: 600 }}>Libero</span>
                        </div>
                      ) : (
                        // Involucro relativo ALTO QUANTO IL CONTENUTO: così il
                        // filo copre tutta la giornata anche quando le card
                        // sono tante e la colonna scorre
                        <div style={{ position: 'relative', minHeight: '100%' }}>
                          <div style={{ position: 'absolute', left: -10, top: 4, bottom: 4, width: 2, background: eOggi ? '#BFDBFE' : '#DCE4EF', borderRadius: 2 }} />
                          {lista.map(v => v.tipo === 'pratica' ? (
                            <VoceTimeline key={v.p.id} colore={eFatta(v.p) ? '#1F7A43' : '#2563eb'} anello={eFatta(v.p) ? '#C8E6D5' : '#BFDBFE'}>
                              <CardPratica p={v.p} onApri={() => router.push(`/demolitore?apri=${v.p.id}`)} />
                            </VoceTimeline>
                          ) : (
                            <VoceTimeline key={v.i.id} colore="#8A94A3" anello="#DDE2EA">
                              <CardImpegno
                                i={v.i}
                                confermaAperta={eliminaId === v.i.id}
                                onChiediElimina={() => setEliminaId(v.i.id)}
                                onAnnulla={() => setEliminaId(null)}
                                onElimina={() => eliminaImpegno(v.i.id)}
                              />
                            </VoceTimeline>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        )}
      </div>

      <TendaAzienda aperta={aziendaAperta} onChiudi={() => setAziendaAperta(false)} />
    </main>
  )
}

// Una voce agganciata al filo della giornata: pallino colorato + card
function VoceTimeline({ colore, anello, children }: { colore: string; anello: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', marginBottom: 7 }}>
      <span style={{ position: 'absolute', left: -14, top: 11, width: 8, height: 8, borderRadius: 999, background: colore, border: '2px solid #fff', boxShadow: `0 0 0 1.5px ${anello}`, zIndex: 1 }} />
      {children}
    </div>
  )
}

// Card blu di una pratica NoiDemoliamo: ora, targa · modello, comune e la
// PILLOLA DI STATO; spunta verde se il ritiro è già avvenuto. Clic → pratica.
function CardPratica({ p, onApri }: { p: PraticaDemolitore; onApri: () => void }) {
  const fatta = eFatta(p)
  const pillola = pillolaCard(gruppoDi(p))
  return (
    <button
      onClick={onApri}
      title={`${p.targa || 'Senza targa'} · ${nomeVeicolo(p)}${fatta ? ' · ritirato' : ''}`}
      className="w-full text-left transition-all hover:!border-blue-200 hover:shadow-[0_2px_8px_rgba(37,99,235,0.12)]"
      style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderLeft: `3px solid ${fatta ? '#1F7A43' : '#2563eb'}`, borderRadius: 10, padding: '7px 9px', cursor: 'pointer', display: 'block' }}
    >
      <span className="flex items-center gap-1.5">
        <span style={{ fontSize: 12, fontWeight: 800, color: fatta ? '#1F7A43' : '#1D4ED8' }}>{oraDi(p.data_ritiro_prevista!)}</span>
        {fatta && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
        )}
      </span>
      <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#111827', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {[p.targa, nomeVeicolo(p)].filter(Boolean).join(' · ')}
      </span>
      <span style={{ display: 'block', fontSize: 10.5, color: '#6B7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {p.comune_ritiro ? `${p.comune_ritiro}${p.provincia_ritiro ? ` (${p.provincia_ritiro})` : ''}` : ''}
      </span>
      {pillola && (
        <span style={{ display: 'inline-block', maxWidth: '100%', fontSize: 9, fontWeight: 700, background: pillola.bg, color: pillola.color, borderRadius: 999, padding: '2px 8px', marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pillola.label}
        </span>
      )}
    </button>
  )
}

// Card grigia di un impegno PERSONALE: eliminabile col cestino (compare
// al passaggio del mouse) e la conferma IN LINEA sulla card (regola 19)
function CardImpegno({ i, confermaAperta, onChiediElimina, onAnnulla, onElimina }: {
  i: Impegno
  confermaAperta: boolean
  onChiediElimina: () => void
  onAnnulla: () => void
  onElimina: () => void
}) {
  if (confermaAperta) {
    return (
      <div style={{ background: '#fff', border: '1.5px solid #F3C8C8', borderLeft: '3px solid #E15E5E', borderRadius: 10, padding: '7px 9px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', lineHeight: 1.4 }}>Eliminare questo impegno?</div>
        <div className="flex gap-1.5" style={{ marginTop: 6 }}>
          <button onClick={onAnnulla} style={{ flex: 1, background: '#fff', border: '1.5px solid #E5E7EB', color: '#4B5563', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 0', cursor: 'pointer' }}>No</button>
          <button onClick={onElimina} className="transition-colors hover:!bg-[#D25151]" style={{ flex: 1, background: '#E15E5E', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 0', cursor: 'pointer' }}>Sì, elimina</button>
        </div>
      </div>
    )
  }
  return (
    <div
      className="group relative"
      style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderLeft: '3px solid #8A94A3', borderRadius: 10, padding: '7px 9px' }}
    >
      <span style={{ position: 'absolute', top: 7, right: 7, fontSize: 7.5, fontWeight: 800, letterSpacing: 0.5, background: '#E8ECF3', color: '#5B6779', borderRadius: 999, padding: '2px 7px' }}>PERSONALE</span>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#5B6779' }}>{oraDi(i.quando)}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#111827', marginTop: 1, paddingRight: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{i.titolo}</div>
      {i.luogo && <div style={{ fontSize: 10.5, color: '#6B7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.luogo}</div>}
      <button
        onClick={onChiediElimina}
        aria-label="Elimina impegno"
        title="Elimina impegno"
        className="hidden group-hover:flex items-center justify-center transition-colors hover:bg-red-50"
        style={{ position: 'absolute', bottom: 6, right: 6, width: 20, height: 20, borderRadius: 7, border: 'none', background: 'none', color: '#A65D5D', cursor: 'pointer' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
      </button>
    </div>
  )
}
