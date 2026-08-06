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

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import { useRouter } from 'next/navigation'
import { chiamataDemolitore, PraticaDemolitore, GruppoPratica, gruppoDi, countdownScadenza } from './_lib/api'
import SidebarDemolitore from './_components/SidebarDemolitore'
import TendaAzienda from './_components/TendaAzienda'
import IconaVeicolo from '../components/IconaVeicolo'

type Filtro = 'tutte' | GruppoPratica

// L'ordine della fila (e della lista): prima le cose da fare
const ORDINE_GRUPPO: Record<GruppoPratica, number> = { arrivo: 0, fissato: 1, rottamazione: 2, targhe: 3, completate: 4, annullate: 5 }

export default function HomeDemolitore() {
  const router = useRouter()
  const [pratiche, setPratiche] = useState<PraticaDemolitore[]>([])
  const [filtro, setFiltro] = useState<Filtro>('tutte')
  const [ricerca, setRicerca] = useState('')
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [aziendaAperta, setAziendaAperta] = useState(false)
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
      const { data: u } = await supabase.from('utenti').select('tipo').eq('id', session.user.id).single()
      if (u?.tipo !== 'demolitore') {
        router.push(u?.tipo === 'admin' ? '/admin' : '/dashboard')
        return
      }
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

  const conta = useMemo(() => {
    const c: Record<GruppoPratica, number> = { arrivo: 0, fissato: 0, rottamazione: 0, targhe: 0, completate: 0, annullate: 0 }
    for (const p of pratiche) c[gruppoDi(p)]++
    return c
  }, [pratiche])

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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#ECEEF2' }}>
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    // ⭐ 05/08: AD ALTEZZA SCHERMO come il CRM admin — la finestra non
    // scorre mai, scorre solo la colonna dei contenuti (niente binario
    // di scorrimento della pagina né strisce sul bordo)
    <main className="flex" style={{ background: '#ECEEF2', height: '100vh', overflow: 'hidden' }}>

      <SidebarDemolitore
        attiva="pratiche"
        apertaMobile={menuMobile}
        onChiudiMobile={() => setMenuMobile(false)}
        onPratiche={() => setFiltro('tutte')}
        onAzienda={() => setAziendaAperta(true)}
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
            <p className="text-xs text-gray-500 mt-1">{pratiche.length} totali</p>
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
              <PillolaFase nome="In arrivo · fissa il ritiro" valore={conta.arrivo} attivo={filtro === 'arrivo'} onClick={() => setFiltro(filtro === 'arrivo' ? 'tutte' : 'arrivo')} />
              <FrecciaFase />
              <PillolaFase nome="Ritiro fissato" valore={conta.fissato} attivo={filtro === 'fissato'} onClick={() => setFiltro(filtro === 'fissato' ? 'tutte' : 'fissato')} />
              <FrecciaFase />
              <PillolaFase nome="Certificato rottamazione" valore={conta.rottamazione} attivo={filtro === 'rottamazione'} onClick={() => setFiltro(filtro === 'rottamazione' ? 'tutte' : 'rottamazione')} />
              <FrecciaFase />
              <PillolaFase nome="Cancellazione targhe" valore={conta.targhe} attivo={filtro === 'targhe'} onClick={() => setFiltro(filtro === 'targhe' ? 'tutte' : 'targhe')} />
              <FrecciaFase />
              <PillolaFase nome="Completate" valore={conta.completate} attivo={filtro === 'completate'} onClick={() => setFiltro(filtro === 'completate' ? 'tutte' : 'completate')} />
              <div style={{ width: 14, flexShrink: 0 }} />
              <PillolaFase nome="Non a buon fine" valore={conta.annullate} rossa={conta.annullate > 0} attivo={filtro === 'annullate'} onClick={() => setFiltro(filtro === 'annullate' ? 'tutte' : 'annullate')}
                title={conta.annullate > 0 ? 'Pratiche annullate dopo l\'assegnazione, col motivo' : 'Nessuna pratica annullata'} />
            </div>
          </div>

          {/* LISTA RIGHE (famiglia card del CRM) */}
          {ordinate.length === 0 ? (
            <div className="bg-white px-4 py-10 text-center text-sm text-gray-500" style={{ border: '1.5px solid #E5E7EB', borderRadius: 14 }}>Nessuna pratica in questa vista.</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {ordinate.map(p => <RigaPratica key={p.id} p={p} onOpen={() => router.push(`/demolitore/pratiche/${p.id}`)} />)}
            </div>
          )}
        </div>
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

// Riga pratica (mockup approvato): icona veicolo, targa e via, colonna
// cliente, pillola di stato, riquadro metrica a destra
function RigaPratica({ p, onOpen }: { p: PraticaDemolitore; onOpen: () => void }) {
  const gruppo = gruppoDi(p)
  const chiusa = gruppo === 'completate' || gruppo === 'annullate'
  const pillola = pillolaStato(p, gruppo)

  const via = [
    p.indirizzo_ritiro,
    p.comune_ritiro && !(p.indirizzo_ritiro || '').toLowerCase().includes((p.comune_ritiro || '').toLowerCase()) ? p.comune_ritiro : null,
    p.provincia_ritiro ? `(${p.provincia_ritiro})` : null,
  ].filter(Boolean).join(' · ')

  // Sottotitolo della colonna cliente, per fase
  const subCliente =
    gruppo === 'completate' ? `Completata${p.data_certificato_pra ? ` il ${fmtGiorno(p.data_certificato_pra)}` : ''}` :
    gruppo === 'annullate' ? `Annullata${p.aggiornato_il ? ` il ${fmtGiorno(p.aggiornato_il)}` : ''}` :
    (gruppo === 'rottamazione' || gruppo === 'targhe') ? `Ritirata${p.data_ritiro_effettuato ? ` il ${fmtGiorno(p.data_ritiro_effettuato)}` : ''}` :
    p.delegato_nome ? `Delegato: ${p.delegato_nome}` : 'Consegna in prima persona'

  return (
    <div
      onClick={onOpen}
      className="group bg-white cursor-pointer transition-all hover:shadow-md hover:-translate-y-[1px]"
      style={{ border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.07)', opacity: chiusa ? 0.82 : 1 }}
    >
      {/* Icona veicolo nel quadratino azzurro (componente condiviso) */}
      <div className="flex items-center justify-center flex-shrink-0" style={{ width: 46, height: 46, borderRadius: 12, background: '#DBEAFE' }}>
        <IconaVeicolo tipo={p.tipo_mezzo} />
      </div>

      {/* Targa · marca modello · anno + la via */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-[15px] font-bold text-gray-900 truncate">
          {p.targa || 'Targa mancante'}{p.marca && ` · ${p.marca} ${p.modello || ''}`}{p.anno ? ` · ${p.anno}` : ''}
        </div>
        <div className="text-[12px] truncate" style={{ color: '#4B5563', marginTop: 2 }} title={gruppo === 'annullate' && p.motivo_annullamento ? p.motivo_annullamento : undefined}>
          {via || '—'}{gruppo === 'annullate' && p.motivo_annullamento ? ` · ${p.motivo_annullamento}` : ''}
        </div>
      </div>

      {/* Colonna cliente (su telefono si nasconde) */}
      <div className="hidden md:block flex-shrink-0" style={{ width: 1, alignSelf: 'stretch', background: '#EEF1F5' }} />
      <div className="hidden md:block flex-shrink-0" style={{ width: 180 }}>
        <div className="text-[13px] font-bold text-gray-900 truncate">{p.nome_richiedente || '—'}</div>
        <div className="text-[11.5px] truncate" style={{ color: '#4B5563', marginTop: 1 }}>{subCliente}</div>
      </div>

      {/* Pillola di stato (palette unica) */}
      <span className="hidden sm:inline-block text-[11px] font-bold rounded-full flex-shrink-0" style={{ background: pillola.bg, color: pillola.color, padding: '4px 12px', whiteSpace: 'nowrap' }}>
        {pillola.label}
      </span>

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
