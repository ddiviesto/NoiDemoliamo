'use client'

/**
 * HOME AREA DEMOLITORE — gemella del CRM admin (mockup approvato da
 * Davide, agosto 2026): barra azzurra con la ricerca a pillola, fila
 * completa delle caselle del flusso cliccabili come filtro ("Non a
 * buon fine" fuori fila come le anomalie del CRM), righe della
 * famiglia card con icona veicolo, colonna cliente, pillola di stato
 * nella palette unica e riquadro metrica a destra.
 * Tutto in SOLA LETTURA: le azioni del demolitore vivono nella scheda.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import { useRouter } from 'next/navigation'
import { chiamataDemolitore, PraticaDemolitore, GruppoPratica, gruppoDi, countdownScadenza, CASISTICA_LABEL, nomeVeicolo } from './_lib/api'
import SidebarDemolitore from './_components/SidebarDemolitore'
import TendaAzienda from './_components/TendaAzienda'
import TendinaPratica, { prefetchPratica } from './_components/TendinaPratica'
import IconaVeicolo from '../components/IconaVeicolo'

type Filtro = 'tutte' | GruppoPratica

// L'ordine della fila (e della lista): prima le cose da fare
const ORDINE_GRUPPO: Record<GruppoPratica, number> = { arrivo: 0, fissato: 1, rottamazione: 2, targhe: 3, completate: 4, annullate: 5 }

// ⭐ 08/08 ("si disconnette" segnalato da Davide): CACHE DI SESSIONE —
// navigando tra Pratiche e Ritiri la pagina riparte dai dati già visti
// (aggiornati poi in silenzio), niente rotellina nuda a schermo intero
type ImpegnoPersonale = { id: string; quando: string; titolo: string; luogo: string | null }
let cacheHome: { pratiche: PraticaDemolitore[]; impegni: ImpegnoPersonale[] } | null = null

export default function HomeDemolitore() {
  const router = useRouter()
  const [pratiche, setPratiche] = useState<PraticaDemolitore[]>(() => cacheHome?.pratiche || [])
  // Gli impegni PERSONALI del demolitore (pagina Ritiri): contano nella
  // scena globale della nuvoletta "Fissa il ritiro"
  const [impegni, setImpegni] = useState<ImpegnoPersonale[]>(() => cacheHome?.impegni || [])
  const [filtro, setFiltro] = useState<Filtro>('tutte')
  const [ricerca, setRicerca] = useState('')
  // Rotellina solo al PRIMO ingresso in assoluto: con la cache si riparte pieni
  const [loading, setLoading] = useState(() => !cacheHome)
  const [errore, setErrore] = useState('')
  const [aziendaAperta, setAziendaAperta] = useState(false)
  const [menuMobile, setMenuMobile] = useState(false)
  // ⭐ 06/08 (mockup A): la pratica aperta a TENDINA sotto la riga
  const [apertaId, setApertaId] = useState<string | null>(null)
  // Montata = aperta O in chiusura animata (il contenuto resta nel DOM
  // finché la tendina non ha finito di riavvolgersi, come nel CRM)
  const [renderId, setRenderId] = useState<string | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (apertaId) { setRenderId(apertaId); return }
    const t = setTimeout(() => setRenderId(null), 300)
    return () => clearTimeout(t)
  }, [apertaId])

  // I countdown delle 8 ore si aggiornano da soli ogni minuto
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000)
    return () => clearInterval(t)
  }, [])

  // Esc chiude la tendina (come nel CRM admin)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setApertaId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Ricarica silenziosa della lista (usata anche dalla tendina dopo le azioni)
  const ricaricaLista = useCallback(async () => {
    try {
      const json = await chiamataDemolitore<{ pratiche: PraticaDemolitore[] }>('/api/demolitore-pratiche')
      setPratiche(json.pratiche || [])
      cacheHome = { pratiche: json.pratiche || [], impegni: cacheHome?.impegni || [] }
    } catch { /* silenzioso */ }
    try {
      const json = await chiamataDemolitore<{ impegni: ImpegnoPersonale[] }>('/api/demolitore-impegni', { azione: 'lista' })
      setImpegni(json.impegni || [])
      cacheHome = { pratiche: cacheHome?.pratiche || [], impegni: json.impegni || [] }
    } catch { /* silenzioso */ }
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
      try {
        const json = await chiamataDemolitore<{ pratiche: PraticaDemolitore[] }>('/api/demolitore-pratiche')
        setPratiche(json.pratiche || [])
        cacheHome = { pratiche: json.pratiche || [], impegni: cacheHome?.impegni || [] }
        // ⭐ 07/08: /demolitore?apri=<id> apre subito la TENDINA di quella
        // pratica (ci arrivano le card della pagina Ritiri)
        const apriId = new URLSearchParams(window.location.search).get('apri')
        if (apriId && (json.pratiche || []).some(x => x.id === apriId)) {
          setFiltro('tutte')
          setApertaId(apriId)
          prefetchPratica(apriId)
          window.history.replaceState(null, '', '/demolitore')
        }
      } catch (e) {
        setErrore(e instanceof Error ? e.message : 'Errore nel caricamento')
      }
      try {
        const json = await chiamataDemolitore<{ impegni: ImpegnoPersonale[] }>('/api/demolitore-impegni', { azione: 'lista' })
        setImpegni(json.impegni || [])
        cacheHome = { pratiche: cacheHome?.pratiche || [], impegni: json.impegni || [] }
      } catch { /* silenzioso */ }
      setLoading(false)
    }
    carica()
  }, [router])

  // Il fascicolo della pagina Ritiri si prepara in anticipo: il passaggio
  // di pagina è istantaneo (⭐ 08/08)
  useEffect(() => { router.prefetch('/demolitore/ritiri') }, [router])

  useAggiornaLive({
    canale: 'demolitore-lista',
    onCambio: ricaricaLista,
    pollingMs: 20000,
  })

  async function esci() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Cambiare filtro chiude la tendina aperta (come nel CRM admin)
  function cambiaFiltro(f: Filtro) {
    setFiltro(f)
    setApertaId(null)
  }

  const conta = useMemo(() => {
    const c: Record<GruppoPratica, number> = { arrivo: 0, fissato: 0, rottamazione: 0, targhe: 0, completate: 0, annullate: 0 }
    for (const p of pratiche) c[gruppoDi(p)]++
    return c
  }, [pratiche])

  // ⭐ 07/08 (scena globale, mockup approvato): l'agenda dei ritiri già
  // fissati + gli IMPEGNI PERSONALI, passata alla tendina — la nuvoletta
  // "Fissa il ritiro" mostra la giornata e spegne le ore già prese
  const agendaRitiri = useMemo(() => [
    ...pratiche
      .filter(x => x.data_ritiro_prevista && x.stato !== 'annullata')
      .map(x => ({ id: x.id, quando: x.data_ritiro_prevista!, targa: x.targa, veicolo: nomeVeicolo(x), comune: x.comune_ritiro, nome: x.nome_richiedente })),
    ...impegni.map(i => ({ id: `impegno-${i.id}`, quando: i.quando, targa: null, veicolo: i.titolo, comune: i.luogo, nome: null, personale: true })),
  ], [pratiche, impegni])

  // Filtro + ricerca (come nel CRM admin)
  const q = ricerca.trim().toLowerCase()
  const filtrate = pratiche.filter(p => {
    if (filtro !== 'tutte' && gruppoDi(p) !== filtro) return false
    if (q) {
      const blob = [p.targa, p.nome_richiedente, p.telefono, p.marca, p.modello, p.comune_ritiro].filter(Boolean).join(' ').toLowerCase()
      if (!blob.includes(q)) return false
    }
    return true
  })

  // Prima le da fissare (per scadenza), poi il resto del flusso
  const ordinate = [...filtrate].sort((a, b) => {
    const r = ORDINE_GRUPPO[gruppoDi(a)] - ORDINE_GRUPPO[gruppoDi(b)]
    if (r !== 0) return r
    return (a.scadenza_proposta_ritiro || a.aggiornato_il || '').localeCompare(b.scadenza_proposta_ritiro || b.aggiornato_il || '')
  })

  // ⭐ 08/08: NIENTE più rotellina nuda a schermo intero — la struttura
  // (barra e sidebar) resta in piedi e la rotellina vive nell'area
  // contenuti; navigando tra le pagine sembrava una disconnessione
  return (
    // ⭐ 05/08: AD ALTEZZA SCHERMO come il CRM admin — la finestra non
    // scorre mai, scorre solo la colonna dei contenuti (niente binario
    // di scorrimento della pagina né strisce sul bordo)
    <main className="flex" style={{ background: '#ECEEF2', height: '100vh', overflow: 'hidden' }}>

      <SidebarDemolitore
        // ⭐ 08/08 (richiesta Davide): con la tenda aperta l'evidenziazione
        // della barra passa su "La tua azienda"
        attiva={aziendaAperta ? 'azienda' : 'pratiche'}
        apertaMobile={menuMobile}
        onChiudiMobile={() => setMenuMobile(false)}
        onPratiche={() => { setAziendaAperta(false); cambiaFiltro('tutte') }}
        onRitiri={() => router.push('/demolitore/ritiri')}
        // ⭐ 08/08 (richiesta Davide): la voce fa da interruttore — riclic
        // con la tenda aperta = si richiude
        onAzienda={() => setAziendaAperta(x => !x)}
        onEsci={esci}
      />

      {/* MAIN (stesso scheletro del CRM admin) */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* TOP BAR AZZURRA con la ricerca a pillola, gemella dell'admin */}
        <div className="border-b px-4 lg:px-6 py-3 flex items-center gap-4" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
          {/* menu ☰ solo su telefono */}
          <button onClick={() => setMenuMobile(true)} aria-label="Menu" className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white" style={{ border: '1px solid #DBEAFE' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Pratiche</h1>
            <p className="text-xs text-gray-500 mt-1">{loading ? '…' : `${pratiche.length} totali`}</p>
          </div>
          <div className="ml-auto">
            {/* Sulla barra azzurra la pillola è BIANCA col bordo celeste */}
            <div className="flex items-center gap-2 rounded-full border px-3.5 py-2 w-[170px] sm:w-[210px] focus-within:w-[230px] sm:focus-within:w-[300px] bg-white border-[#DBEAFE] focus-within:border-blue-300 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.10)] transition-all duration-300">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input value={ricerca} onChange={e => setRicerca(e.target.value)} placeholder="Cerca…" className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400" />
              {ricerca && <button onClick={() => setRicerca('')} className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0">×</button>}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <div className="p-4 lg:p-6 overflow-auto flex-1 min-h-0">

          {errore && (
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold mb-4 bg-white" style={{ border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {errore}
            </div>
          )}

          {/* FLUSSO PRATICHE — fila completa delle fasi del demolitore,
              "Non a buon fine" fuori fila con lo stacco (come le anomalie
              del CRM: bianca a zero, rossa coi casi) */}
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Flusso pratiche</div>
          <div className="mb-4 overflow-x-auto">
            <div className="flex items-start">
              <PillolaFase nome="In arrivo · fissa il ritiro" valore={conta.arrivo} attivo={filtro === 'arrivo'} onClick={() => cambiaFiltro(filtro === 'arrivo' ? 'tutte' : 'arrivo')} />
              <FrecciaFase />
              <PillolaFase nome="Ritiro fissato" valore={conta.fissato} attivo={filtro === 'fissato'} onClick={() => cambiaFiltro(filtro === 'fissato' ? 'tutte' : 'fissato')} />
              <FrecciaFase />
              {/* ⭐ 08/08 (richiesta Davide): le caselle dei certificati dicono
                  chiaramente che si sta ASPETTANDO il caricamento */}
              <PillolaFase nome="Attesa Certificato di Rottamazione" valore={conta.rottamazione} attivo={filtro === 'rottamazione'} onClick={() => cambiaFiltro(filtro === 'rottamazione' ? 'tutte' : 'rottamazione')} />
              <FrecciaFase />
              <PillolaFase nome="Attesa Certificato cancellazione targhe" valore={conta.targhe} attivo={filtro === 'targhe'} onClick={() => cambiaFiltro(filtro === 'targhe' ? 'tutte' : 'targhe')} />
              <FrecciaFase />
              <PillolaFase nome="Completate" valore={conta.completate} attivo={filtro === 'completate'} onClick={() => cambiaFiltro(filtro === 'completate' ? 'tutte' : 'completate')} />
              <div style={{ width: 14, flexShrink: 0 }} />
              <PillolaFase nome="Non a buon fine" valore={conta.annullate} rossa={conta.annullate > 0} attivo={filtro === 'annullate'} onClick={() => cambiaFiltro(filtro === 'annullate' ? 'tutte' : 'annullate')}
                title={conta.annullate > 0 ? 'Pratiche annullate dopo l\'assegnazione, col motivo' : 'Nessuna pratica annullata'} />
            </div>
          </div>

          {/* LISTA RIGHE: clic sulla riga → la TENDINA si srotola sotto
              (blocco unico con la cornice blu, IDENTICO al CRM admin);
              riclic o Esc chiude, cambiare casella chiude */}
          {ordinate.length === 0 ? (
            <div className="bg-white px-4 py-10 text-center text-sm text-gray-500" style={{ border: '1.5px solid #E5E7EB', borderRadius: 14 }}>Nessuna pratica in questa vista.</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {ordinate.map(p => {
                const aperta = p.id === apertaId
                const montata = aperta || p.id === renderId
                return (
                  <div
                    key={p.id}
                    style={{ border: `2px solid ${aperta ? '#2563EB' : 'transparent'}`, borderRadius: 16, background: aperta ? '#F7F8FB' : 'transparent', boxShadow: aperta ? '0 4px 16px rgba(37,99,235,0.16)' : 'none', transition: 'all .28s ease' }}
                  >
                    <RigaPratica p={p} aperta={aperta} onOpen={() => setApertaId(aperta ? null : p.id)} />
                    <div style={{ display: 'grid', gridTemplateRows: aperta ? '1fr' : '0fr', transition: 'grid-template-rows .28s ease' }}>
                      <div style={{ overflow: 'hidden' }}>
                        {montata && <TendinaPratica p={p} agenda={agendaRitiri} onCambiata={ricaricaLista} />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )}
      </div>

      <TendaAzienda aperta={aziendaAperta} onChiudi={() => setAziendaAperta(false)} />
    </main>
  )
}

// ============================================================
// SOTTOCOMPONENTI (gemelli visivi del CRM admin)
// ============================================================

// Fase del flusso come PILLOLA TONDA: numero nel tondino, nome accanto.
// Gemella di PillolaFase in app/admin/page.tsx.
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
        background: rossa ? '#FEF6F6' : attivo ? '#EFF6FF' : '#fff',
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

// ---- formattazioni delle date della riga ----

function fmtGiorno(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

function fmtGiornoBreve(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })
}

function fmtOra(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

/** Tempo che resta verso una scadenza (certificati e PRA). */
function restanti(scadenza: Date | null): { big: string; ritardo: boolean } | null {
  if (!scadenza) return null
  const diffMs = scadenza.getTime() - Date.now()
  const ritardo = diffMs < 0
  const abs = Math.abs(diffMs)
  const giorni = Math.floor(abs / 86400000)
  const ore = Math.floor((abs % 86400000) / 3600000)
  return { big: giorni > 0 ? `${giorni}g` : `${ore}h`, ritardo }
}

// Le scadenze dei certificati non stanno nel DB: si calcolano dal giorno
// del ritiro con le regole del progetto (1.3) — certificato di rottamazione
// entro 24 ORE, radiazione PRA entro 15 GIORNI LAVORATIVI (sab/dom esclusi)
function scadenzaCertRottamazione(p: PraticaDemolitore): Date | null {
  if (!p.data_ritiro_effettuato) return null
  return new Date(new Date(p.data_ritiro_effettuato).getTime() + 24 * 3600000)
}

function scadenzaCertPra(p: PraticaDemolitore): Date | null {
  if (!p.data_ritiro_effettuato) return null
  const d = new Date(p.data_ritiro_effettuato)
  let lavorativi = 0
  while (lavorativi < 15) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) lavorativi++
  }
  return d
}

// La pillola di stato nella PALETTE UNICA (6.4): azzurra per tutto il
// flusso in corso, verde solo Completata, rosso tenue Non a buon fine.
function pillolaStato(p: PraticaDemolitore, gruppo: GruppoPratica): { label: string; bg: string; color: string } {
  const FLUSSO = { bg: '#EFF6FF', color: '#1D4ED8' }
  switch (gruppo) {
    case 'arrivo': return { label: 'In arrivo · fissa il ritiro', ...FLUSSO }
    case 'fissato': return { label: `Ritiro fissato${p.data_ritiro_prevista ? ` · ${new Date(p.data_ritiro_prevista).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}` : ''}`, ...FLUSSO }
    case 'rottamazione': return { label: 'Ritirata · cert. rottamazione', ...FLUSSO }
    case 'targhe': return { label: 'Cancellazione targhe (PRA)', ...FLUSSO }
    case 'completate': return { label: 'Completata', bg: '#DCF3E4', color: '#1F7A43' }
    case 'annullate': return { label: 'Non a buon fine', bg: '#F3D9D9', color: '#A94444' }
  }
}

// Riga pratica: GEMELLA ESATTA della riga del CRM admin (07/08, richiesta
// Davide) — stesse colonne (veicolo 1.6, cliente 1.3 e stato 1.4 coi
// divisori), hover che tinge di celeste, icona verde con la spunta per le
// completate, casistica sotto il nome del cliente. Sotto la pillola di
// stato NIENTE ragione sociale (07/08: era il nome del demolitore stesso)
function RigaPratica({ p, aperta, onOpen }: { p: PraticaDemolitore; aperta: boolean; onOpen: () => void }) {
  const gruppo = gruppoDi(p)
  const chiusa = gruppo === 'completate' || gruppo === 'annullate'
  const pillola = pillolaStato(p, gruppo)
  const [hover, setHover] = useState(false)

  // Sulla riga azzurra (aperta o hover) la pillola diventa BIANCA col
  // bordino del suo colore — le rosse restano rosse (regole del CRM)
  const rossa = pillola.bg === '#F3D9D9'
  const evidenzia = (aperta || hover) && !rossa

  return (
    <div
      onClick={onOpen}
      // ⭐ 07/08: al passaggio del mouse si PRECARICANO i dettagli — al clic
      // la tendina si apre già piena, senza dati che compaiono dopo
      onMouseEnter={() => { setHover(true); prefetchPratica(p.id) }}
      onMouseLeave={() => setHover(false)}
      className={`group cursor-pointer transition-all ${aperta ? '' : 'hover:!bg-[#EFF6FF] hover:!border-[#BFDBFE] hover:shadow-[0_2px_8px_rgba(37,99,235,0.10)] hover:-translate-y-[1px]'}`}
      style={{ background: aperta ? '#EFF6FF' : '#fff', border: `1.5px solid ${aperta ? 'transparent' : '#E5E7EB'}`, borderRadius: aperta ? '13px 13px 0 0' : 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: aperta ? 'none' : '0 1px 3px rgba(16,24,40,0.07)', opacity: chiusa && !aperta ? 0.82 : 1 }}
    >
      {/* Quadratino icona veicolo (o spunta verde se completata), come il CRM */}
      <div className="flex items-center justify-center flex-shrink-0" style={{ width: 46, height: 46, borderRadius: 12, background: gruppo === 'completate' ? '#DCF3E4' : '#DBEAFE' }}>
        {gruppo === 'completate'
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          : <IconaVeicolo tipo={p.tipo_mezzo} />}
      </div>

      {/* Veicolo: targa · marca modello · anno · km, sotto il COMUNE
          (la via intera vive nella tendina, come nel CRM) */}
      <div style={{ flex: 1.6, minWidth: 0 }}>
        {/* ⭐ 07/08 (richiesta Davide): il titolo resta NERO anche da aperta,
            come il nome del cliente — il blu stonava */}
        <div className="text-[15px] font-bold truncate" style={{ color: '#111827' }}>
          {p.targa || 'Targa mancante'}{p.marca && ` · ${p.marca} ${p.modello || ''}`}{p.anno ? ` · ${p.anno}` : ''}{p.km != null ? ` · ${p.km.toLocaleString('it-IT')} km` : ''}
        </div>
        <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }} title={gruppo === 'annullate' && p.motivo_annullamento ? p.motivo_annullamento : undefined}>
          {p.comune_ritiro ? `${p.comune_ritiro}${p.provincia_ritiro ? ` (${p.provincia_ritiro})` : ''}` : (p.tipo_mezzo || '—')}
          {gruppo === 'annullate' && p.motivo_annullamento ? ` · ${p.motivo_annullamento}` : ''}
        </div>
      </div>

      {/* Cliente: nome, sotto la casistica e l'eventuale delegato (come il CRM) */}
      <div className="hidden md:block" style={{ flex: 1.3, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
        <div className="text-[13.5px] font-semibold text-gray-900 truncate">{p.nome_richiedente || '—'}</div>
        <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>
          {p.casistica ? (CASISTICA_LABEL[p.casistica] || p.casistica) : (p.tipo_mezzo || '—')}
          {p.delegato_nome && <> · delega a <b style={{ color: '#374151', fontWeight: 600 }}>{p.delegato_nome}</b></>}
        </div>
      </div>

      {/* Stato: solo la pillola — ⭐ 07/08 (richiesta Davide): via la
          ragione sociale sotto (era il nome del demolitore stesso, inutile
          nella SUA area; nel CRM invece resta, lì dice chi è assegnato) */}
      <div className="hidden sm:block" style={{ flex: 1.4, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
        <span className="inline-block text-[11.5px] font-bold rounded-full transition-colors" style={{ background: evidenzia ? '#fff' : pillola.bg, color: pillola.color, border: `1px solid ${evidenzia ? `${pillola.color}55` : 'transparent'}`, padding: '3px 11px', whiteSpace: 'nowrap' }}>
          {pillola.label}
        </span>
      </div>

      {/* Riquadro metrica a destra */}
      <Metrica p={p} gruppo={gruppo} />
    </div>
  )
}

// Il riquadro metrica: countdown 8 ore (rosso quando stringe), data del
// ritiro fissato, giorni alla scadenza dei certificati, chiusure
function Metrica({ p, gruppo }: { p: PraticaDemolitore; gruppo: GruppoPratica }) {
  let big: React.ReactNode = '—'
  let cap = ''
  let urgente = false

  if (gruppo === 'arrivo') {
    const cd = countdownScadenza(p.scadenza_proposta_ritiro)
    if (cd) {
      const minuti = Math.round((new Date(p.scadenza_proposta_ritiro!).getTime() - Date.now()) / 60000)
      urgente = cd.inRitardo || minuti <= 240
      big = cd.inRitardo ? 'In ritardo' : cd.testo.replace(' per fissare', '')
      cap = cd.inRitardo ? cd.testo.replace('In ritardo ', '') : 'per fissare'
    } else {
      cap = 'per fissare'
    }
  } else if (gruppo === 'fissato') {
    if (p.data_ritiro_prevista) {
      big = fmtGiornoBreve(p.data_ritiro_prevista)
      cap = `ore ${fmtOra(p.data_ritiro_prevista)}`
    } else {
      cap = 'ritiro'
    }
  } else if (gruppo === 'rottamazione') {
    const r = restanti(scadenzaCertRottamazione(p))
    if (r) { big = r.big; cap = r.ritardo ? 'in ritardo' : 'al certificato'; urgente = r.ritardo }
    else cap = 'al certificato'
  } else if (gruppo === 'targhe') {
    const r = restanti(scadenzaCertPra(p))
    if (r) { big = r.big; cap = r.ritardo ? 'in ritardo' : 'alla scadenza'; urgente = r.ritardo }
    else cap = 'alla scadenza'
  } else if (gruppo === 'completate') {
    big = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3E4C63" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline' }}><polyline points="20 6 9 17 4 12" /></svg>
    )
    cap = 'chiusa'
  } else {
    big = (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3E4C63" strokeWidth="2.6" strokeLinecap="round" style={{ display: 'inline' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    )
    cap = 'annullata'
  }

  return (
    <div className="flex-shrink-0 text-center" style={{
      width: 92, borderRadius: 10, padding: '7px 4px',
      background: urgente ? '#FCEBEB' : '#F6F8FB',
      border: `1px solid ${urgente ? '#F3C8C8' : '#E5E9F0'}`,
    }}>
      <div className="text-[14px] font-extrabold leading-tight" style={{ color: urgente ? '#A32D2D' : '#3E4C63' }}>{big}</div>
      <div className="text-[8.5px] font-bold uppercase" style={{ letterSpacing: 0.5, color: urgente ? '#C05E5E' : '#8B95A5', marginTop: 1 }}>{cap}</div>
    </div>
  )
}
