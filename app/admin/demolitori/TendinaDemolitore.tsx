'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MappaComuni, { CoperturaRecord } from './[id]/MappaComuni'
import { REGIONI, PROVINCE, PROVINCIA_A_REGIONE } from '../_data/zone'
import AutocompleteIndirizzo from '../../inizia/steps/AutocompleteIndirizzo'

// ============================================================
// ⭐ TENDINA DEMOLITORE (28/07/2026, mockup approvato): la scheda
// del demolitore vive QUI, sotto la sua riga, gemella della tendina
// delle pratiche — la pagina di dettaglio non esiste più. Regola di
// Davide: TUTTO quello che c'era nel dettaglio è rimasto, è cambiato
// solo l'aspetto. Testata azzurra con statistiche a boxini e pillole
// azioni (Accesso area, Stato, Copertura, Tariffe, cestino), sotto le
// schede con la matita: Cronologia e Note · Azienda · Contatti ·
// Persone · Contribuzione. Copertura (mappa) e pratiche annullate si
// aprono come PANNELLI DA DESTRA, gemelli del visore documenti.
// ============================================================

type TipoZona = 'regione' | 'provincia' | 'comune'
interface Tariffa { id: string; tipo: TipoZona; nome: string; fee: number }
const TIPO_ZONA_LABEL: Record<TipoZona, string> = { regione: 'Regione', provincia: 'Provincia', comune: 'Comune' }

interface Nota { id: string; testo: string; creato_il: string }

interface DemolitoreFull {
  id: string
  ragione_sociale: string
  piva: string | null
  codice_sdi: string | null
  indirizzo: string | null
  citta: string | null
  provincia: string | null
  cap: string | null
  lat: number | null
  lng: number | null
  telefono_fisso: string | null
  email_aziendale: string | null
  pec: string | null
  email_assegnazione: string | null
  titolare_nome: string | null
  titolare_cellulare: string | null
  referente_nome: string | null
  referente_cellulare: string | null
  stato: string
  fee_per_pratica: number
  velocita_media_giorni: number
  invito_inviato_il: string | null
}

interface PraticaAnnullata { id: string; targa: string | null; marca: string | null; modello: string | null; nome_richiedente: string | null; motivo_annullamento: string | null; aggiornato_il: string | null }

type SezioneEdit = 'azienda' | 'contatti' | 'persone' | null
type NuvolaAperta = 'accesso' | 'stato' | 'elimina' | null
type DrawerAperto = 'copertura' | 'annullate' | null

function iniziali(nome: string): string {
  const parti = nome.trim().split(/\s+/).filter(Boolean)
  if (parti.length === 0) return '—'
  if (parti.length === 1) return parti[0].slice(0, 2).toUpperCase()
  return (parti[0][0] + parti[1][0]).toUpperCase()
}

function fmtDataOra(x: string): string {
  return new Date(x).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Campo slim per la modifica sul posto (filo blu, altezza fissa: niente sobbalzi)
const CAMPO = 'w-full h-[22px] bg-transparent border-0 border-b-2 border-blue-300 rounded-none px-0.5 text-[11.5px] text-right text-gray-900 outline-none focus:border-blue-600 transition-colors'

// Badge colorato per il tipo di zona di una tariffa (come nel vecchio dettaglio)
function BadgeZona({ tipo }: { tipo: TipoZona }) {
  const stile = tipo === 'regione'
    ? { background: '#EDE4FB', color: '#6B21A8' }
    : tipo === 'provincia'
      ? { background: '#E0EDFB', color: '#1E4E8C' }
      : { background: '#DCF3E4', color: '#1F7A43' }
  return <span style={{ ...stile, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', borderRadius: 999, padding: '1.5px 7px', letterSpacing: 0.3, flexShrink: 0 }}>{TIPO_ZONA_LABEL[tipo]}</span>
}

// Nuvoletta ancorata (becco, clic fuori chiude, niente sfondo scuro)
function Nuvola({ onChiudi, larghezza = 270, children }: { onChiudi: () => void; larghezza?: number; children: React.ReactNode }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={e => { e.stopPropagation(); onChiudi() }} />
      <div style={{ position: 'absolute', top: 'calc(100% + 9px)', left: 0, zIndex: 50, width: larghezza, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, boxShadow: '0 14px 34px rgba(15,23,42,0.18)', padding: 12, cursor: 'default', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
        <span style={{ position: 'absolute', top: -6.5, left: 20, width: 11, height: 11, background: '#fff', borderLeft: '1.5px solid #E5E7EB', borderTop: '1.5px solid #E5E7EB', transform: 'rotate(45deg)' }} />
        {children}
      </div>
    </>
  )
}

export default function TendinaDemolitore({ demolitoreId, base, onChiudi, onDatiCambiati }: {
  demolitoreId: string
  // I dati della riga: la testata si disegna SUBITO, senza aspettare il
  // caricamento, ed è IDENTICA alla card chiusa (niente sobbalzo)
  base: { ragione_sociale: string; citta: string | null; provincia: string | null; stato: string; fee_per_pratica: number; cop: string | null; nAperte: number }
  onChiudi: () => void
  // La lista si ricarica quando cambiano nome, stato, fee o il demolitore sparisce
  onDatiCambiati: () => void
}) {
  const router = useRouter()
  const [dem, setDem] = useState<DemolitoreFull | null>(null)
  // Apertura morbida (srotolamento come la tendina delle pratiche)
  const [aperto, setAperto] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setAperto(true))
    return () => cancelAnimationFrame(t)
  }, [])
  // ⭐ Chiusura MORBIDA (28/07, "a scatto" bocciato da Davide): la tendina
  // si riavvolge con la stessa animazione e SOLO DOPO si smonta
  const [chiudendo, setChiudendo] = useState(false)
  function chiudi() {
    if (chiudendo) return
    setChiudendo(true)
    setNuvola(null)
    setAperto(false)
    setTimeout(onChiudi, 300)
  }
  const [copertura, setCopertura] = useState<CoperturaRecord[]>([])
  const [stats, setStats] = useState({ aperte: 0, completate: 0, annullate: 0 })
  const [annullate, setAnnullate] = useState<PraticaAnnullata[]>([])
  const [tariffe, setTariffe] = useState<Tariffa[]>([])
  const [note, setNote] = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)

  // Modifica sul posto per scheda
  const [sezEdit, setSezEdit] = useState<SezioneEdit>(null)
  const [bozza, setBozza] = useState<Record<string, string | number | null>>({})
  const [salvandoSez, setSalvandoSez] = useState(false)

  // Tariffa (base + tariffe di zona)
  const [contribEdit, setContribEdit] = useState(false)
  // Sotto-area "+ Aggiungi zona" (variante A su mockup: si apre morbida)
  const [aggiungiAperta, setAggiungiAperta] = useState(false)
  const [nuovaTipo, setNuovaTipo] = useState<TipoZona>('regione')
  const [nuovoNome, setNuovoNome] = useState('')
  const [nuovaFee, setNuovaFee] = useState('')
  const [erroreTariffa, setErroreTariffa] = useState<string | null>(null)
  const [infoTariffa, setInfoTariffa] = useState<string | null>(null)

  // Note
  const [nuovaNota, setNuovaNota] = useState('')
  const [salvandoNota, setSalvandoNota] = useState(false)

  // Nuvolette e pannelli
  const [nuvola, setNuvola] = useState<NuvolaAperta>(null)
  const [drawer, setDrawer] = useState<DrawerAperto>(null)
  const [drawerChiudendo, setDrawerChiudendo] = useState(false)

  // Accesso area / invito
  const [accesso, setAccesso] = useState<boolean | null>(null)
  const [invitando, setInvitando] = useState(false)
  const [messaggioInvito, setMessaggioInvito] = useState<{ ok: boolean; testo: string } | null>(null)
  const [linkInvito, setLinkInvito] = useState<string | null>(null)
  const [revocaConferma, setRevocaConferma] = useState(false)
  const [revocando, setRevocando] = useState(false)
  const [erroreRevoca, setErroreRevoca] = useState('')

  // Eliminazione definitiva (conferma col nome, come nel vecchio dettaglio)
  const [confermaNome, setConfermaNome] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [erroreElimina, setErroreElimina] = useState('')

  // Copertura
  const [messaggioCop, setMessaggioCop] = useState<{ ok: boolean; testo: string } | null>(null)
  const [salvandoCop, setSalvandoCop] = useState(false)

  useEffect(() => {
    async function carica() {
      // ⭐ 28/07 (lag segnalato da Davide): le cinque letture partono TUTTE
      // INSIEME, non una dietro l'altra — l'apertura è immediata
      const [dRes, covRes, pratRes, tarRes, ntRes] = await Promise.all([
        supabase.from('demolitori').select('*').eq('id', demolitoreId).single(),
        supabase.from('demolitori_comuni').select('*').eq('demolitore_id', demolitoreId),
        supabase.from('pratiche').select('id, targa, marca, modello, nome_richiedente, stato, motivo_annullamento, aggiornato_il').eq('demolitore_id', demolitoreId),
        supabase.from('demolitori_tariffe').select('*').eq('demolitore_id', demolitoreId).order('tipo'),
        supabase.from('demolitori_note').select('*').eq('demolitore_id', demolitoreId).order('creato_il', { ascending: false }),
      ])
      if (dRes.data) setDem(dRes.data as DemolitoreFull)
      setCopertura((covRes.data as CoperturaRecord[]) || [])
      const prat = pratRes.data || []
      const listaAnnullate = prat.filter(p => p.stato === 'annullata')
      setStats({
        aperte: prat.filter(p => p.stato !== 'completata' && p.stato !== 'annullata').length,
        completate: prat.filter(p => p.stato === 'completata').length,
        annullate: listaAnnullate.length,
      })
      setAnnullate(listaAnnullate)
      setTariffe((tarRes.data as Tariffa[]) || [])
      setNote((ntRes.data as Nota[]) || [])
      setLoading(false)
    }
    carica()
  }, [demolitoreId])

  // LED accesso: chiede al server se esiste un account di login collegato
  useEffect(() => {
    async function caricaAccesso() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/accesso-demolitore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ demolitore_id: demolitoreId, azione: 'stato' }),
        })
        const json = await res.json()
        if (res.ok) setAccesso(!!json.accesso)
      } catch { /* LED nascosto se non determinabile */ }
    }
    caricaAccesso()
  }, [demolitoreId])

  // Esc: chiude prima il pannello, poi la tendina
  useEffect(() => {
    const suTasto = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (drawer) chiudiDrawer()
      else if (nuvola) setNuvola(null)
      else chiudi()
    }
    window.addEventListener('keydown', suTasto)
    return () => window.removeEventListener('keydown', suTasto)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawer, nuvola])

  // Col pannello aperto la pagina dietro non scorre
  useEffect(() => {
    if (!drawer) return
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prima }
  }, [drawer])

  function apriDrawer(quale: Exclude<DrawerAperto, null>) {
    setNuvola(null)
    setDrawer(prev => {
      if (prev === quale) { chiudiDrawer(); return prev }
      return quale
    })
  }

  function chiudiDrawer() {
    if (drawerChiudendo) return
    setDrawerChiudendo(true)
    setTimeout(() => { setDrawer(null); setDrawerChiudendo(false) }, 240)
  }

  // ---- Modifica sul posto delle schede ----
  function apriSez(quale: Exclude<SezioneEdit, null>) {
    if (!dem) return
    setSezEdit(quale)
    setBozza({
      ragione_sociale: dem.ragione_sociale || '', piva: dem.piva || '', codice_sdi: dem.codice_sdi || '',
      indirizzo: dem.indirizzo || '', citta: dem.citta || '', provincia: dem.provincia || '', cap: dem.cap || '',
      lat: dem.lat, lng: dem.lng,
      telefono_fisso: dem.telefono_fisso || '', email_aziendale: dem.email_aziendale || '', pec: dem.pec || '', email_assegnazione: dem.email_assegnazione || '',
      titolare_nome: dem.titolare_nome || '', titolare_cellulare: dem.titolare_cellulare || '',
      referente_nome: dem.referente_nome || '', referente_cellulare: dem.referente_cellulare || '',
    })
  }

  const sb = (k: string) => String(bozza[k] ?? '')
  const setB = (k: string, v: string | number | null) => setBozza(b => ({ ...b, [k]: v }))

  async function salvaSez() {
    if (!dem || !sezEdit) return
    if (sezEdit === 'azienda' && !sb('ragione_sociale').trim()) return
    setSalvandoSez(true)
    const dati: Record<string, unknown> =
      sezEdit === 'azienda' ? {
        ragione_sociale: sb('ragione_sociale'), piva: sb('piva') || null, codice_sdi: sb('codice_sdi') || null,
        indirizzo: sb('indirizzo') || null, citta: sb('citta') || null, provincia: sb('provincia') || null, cap: sb('cap') || null,
        lat: bozza.lat as number | null, lng: bozza.lng as number | null,
      } : sezEdit === 'contatti' ? {
        telefono_fisso: sb('telefono_fisso') || null, email_aziendale: sb('email_aziendale') || null,
        pec: sb('pec') || null, email_assegnazione: sb('email_assegnazione') || null,
      } : {
        titolare_nome: sb('titolare_nome') || null, titolare_cellulare: sb('titolare_cellulare') || null,
        referente_nome: sb('referente_nome') || null, referente_cellulare: sb('referente_cellulare') || null,
      }
    const { error } = await supabase.from('demolitori').update(dati).eq('id', demolitoreId)
    if (!error) {
      setDem(prev => prev ? { ...prev, ...dati } as DemolitoreFull : prev)
      setSezEdit(null)
      onDatiCambiati()
    } else {
      alert('Errore nel salvataggio. Riprova.')
    }
    setSalvandoSez(false)
  }

  // ---- Stato attivo / non attivo ----
  async function aggiornaStato(stato: string) {
    await supabase.from('demolitori').update({ stato }).eq('id', demolitoreId)
    setDem(prev => prev ? { ...prev, stato } : prev)
    setNuvola(null)
    onDatiCambiati()
  }

  // ---- Contribuzione ----
  async function aggiornaFeeBase(fee: number) {
    await supabase.from('demolitori').update({ fee_per_pratica: fee }).eq('id', demolitoreId)
    setDem(prev => prev ? { ...prev, fee_per_pratica: fee } : prev)
    onDatiCambiati()
  }

  // La zona di una tariffa è dentro l'area di copertura? (informativo, non
  // bloccante: una tariffa fuori zona vale per i ritiri assegnati a mano)
  function zonaCoperta(tipo: TipoZona, nome: string): boolean {
    const norm = (s: string) => s.toLowerCase().split('/')[0].trim()
    const regioniCop = copertura.filter(r => r.tipo === 'regione').map(r => norm(r.comune))
    if (tipo === 'regione') return regioniCop.includes(norm(nome))
    if (tipo === 'provincia') {
      const provCop = copertura.filter(r => r.tipo === 'provincia').map(r => norm(r.comune))
      if (provCop.includes(norm(nome))) return true
      const reg = PROVINCIA_A_REGIONE[nome]
      return reg ? regioniCop.includes(norm(reg)) : false
    }
    return true
  }

  async function aggiungiTariffa() {
    const nome = nuovoNome.trim()
    const fee = parseFloat(nuovaFee)
    setErroreTariffa(null)
    setInfoTariffa(null)
    if (!nome) { setErroreTariffa('Scrivi la zona'); return }
    if (isNaN(fee)) { setErroreTariffa('Scrivi un importo'); return }
    const { data, error } = await supabase.from('demolitori_tariffe')
      .insert({ demolitore_id: demolitoreId, tipo: nuovaTipo, nome, fee })
      .select().single()
    if (error) {
      setErroreTariffa(error.code === '23505' ? 'Questa zona ha già una tariffa' : 'Errore nel salvataggio')
      return
    }
    setTariffe(prev => [...prev, data as Tariffa])
    setNuovoNome(''); setNuovaFee('')
    if (!zonaCoperta(nuovaTipo, nome)) {
      setInfoTariffa('Zona fuori copertura: varrà per i ritiri fuori zona assegnati a mano.')
      setTimeout(() => setInfoTariffa(null), 6000)
    }
  }

  async function aggiornaFeeTariffa(tid: string, feeStr: string) {
    const fee = parseFloat(feeStr)
    if (isNaN(fee)) return
    await supabase.from('demolitori_tariffe').update({ fee }).eq('id', tid)
    setTariffe(prev => prev.map(t => t.id === tid ? { ...t, fee } : t))
  }

  async function eliminaTariffa(tid: string) {
    await supabase.from('demolitori_tariffe').delete().eq('id', tid)
    setTariffe(prev => prev.filter(t => t.id !== tid))
  }

  // ---- Note ----
  async function aggiungiNota() {
    const testo = nuovaNota.trim()
    if (!testo || salvandoNota) return
    setSalvandoNota(true)
    const { data, error } = await supabase.from('demolitori_note').insert({ demolitore_id: demolitoreId, testo }).select().single()
    if (!error && data) {
      setNote(prev => [data as Nota, ...prev])
      setNuovaNota('')
    }
    setSalvandoNota(false)
  }

  async function eliminaNota(nid: string) {
    await supabase.from('demolitori_note').delete().eq('id', nid)
    setNote(prev => prev.filter(n => n.id !== nid))
  }

  // ---- Invito / accesso area ----
  async function invitaDemolitore() {
    if (!dem || invitando) return
    setInvitando(true)
    setMessaggioInvito(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/invita-demolitore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ demolitore_id: demolitoreId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore durante l'invito")
      setDem(prev => prev ? { ...prev, invito_inviato_il: new Date().toISOString() } : prev)
      setAccesso(true)
      if (json.email_inviata) {
        setMessaggioInvito({ ok: true, testo: `Invito inviato a ${json.email}` })
      } else {
        setLinkInvito(json.link || null)
        setMessaggioInvito({ ok: true, testo: 'Invito creato: invia il link a mano' })
      }
    } catch (err) {
      setMessaggioInvito({ ok: false, testo: err instanceof Error ? err.message : "Errore durante l'invito" })
    } finally {
      setInvitando(false)
    }
  }

  // Revoca SOLO il login: scheda, note e pratiche storiche restano intatte
  async function revocaAccesso() {
    if (revocando) return
    setRevocando(true)
    setErroreRevoca('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/accesso-demolitore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ demolitore_id: demolitoreId, azione: 'revoca' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Errore durante la revoca')
      setAccesso(false)
      setDem(prev => prev ? { ...prev, invito_inviato_il: null } : prev)
      setRevocaConferma(false)
      setMessaggioInvito({ ok: true, testo: 'Accesso revocato' })
    } catch (err) {
      setErroreRevoca(err instanceof Error ? err.message : 'Errore durante la revoca')
    } finally {
      setRevocando(false)
    }
  }

  // ---- Eliminazione definitiva (server: blocca se ha pratiche aperte) ----
  async function eliminaDemolitore() {
    if (!dem || eliminando) return
    setEliminando(true)
    setErroreElimina('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/elimina-demolitore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ demolitore_id: demolitoreId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore durante l'eliminazione")
      onDatiCambiati()
      onChiudi()
    } catch (err) {
      setErroreElimina(err instanceof Error ? err.message : "Errore durante l'eliminazione")
      setEliminando(false)
    }
  }

  // ---- Copertura ----
  async function salvaCopertura(records: CoperturaRecord[]) {
    setSalvandoCop(true)
    setMessaggioCop(null)
    try {
      const { error: errDel } = await supabase.from('demolitori_comuni').delete().eq('demolitore_id', demolitoreId)
      if (errDel) throw errDel
      if (records.length > 0) {
        const righe = records.map(r => ({ demolitore_id: demolitoreId, comune: r.comune, provincia: r.provincia, tipo: r.tipo, distanza_km: r.distanza_km ?? null }))
        const { error: errIns } = await supabase.from('demolitori_comuni').insert(righe)
        if (errIns) throw errIns
      }
      const { data } = await supabase.from('demolitori_comuni').select('*').eq('demolitore_id', demolitoreId)
      if (data) setCopertura(data as CoperturaRecord[])
      setMessaggioCop({ ok: true, testo: 'Copertura salvata' })
      onDatiCambiati()
      setTimeout(() => setMessaggioCop(null), 3000)
    } catch (err) {
      console.error('Errore salvataggio copertura:', err)
      setMessaggioCop({ ok: false, testo: 'Errore durante il salvataggio' })
      setTimeout(() => setMessaggioCop(null), 4000)
    } finally {
      setSalvandoCop(false)
    }
  }

  // Zone coperte con l'eventuale "parziale" (esclusioni interne salvate nel DB)
  const normalizzaZona = (s: string) => s.toLowerCase().replace(/[^a-zà-ù]+/g, '')
  const provinceEscluseDb = copertura.filter(r => r.tipo === 'provincia_esclusa')
  const comuniEsclusiDb = copertura.filter(r => r.tipo === 'comune_escluso')
  const provinciaParziale = (nomeProv: string) => comuniEsclusiDb.some(r => r.provincia === nomeProv)
  const regioneParziale = (nomeReg: string) => {
    const inRegione = (prov: string) => {
      const reg = PROVINCIA_A_REGIONE[prov]
      return !!reg && normalizzaZona(nomeReg).startsWith(normalizzaZona(reg))
    }
    return provinceEscluseDb.some(r => inRegione(r.comune)) || comuniEsclusiDb.some(r => inRegione(r.provincia))
  }
  const zoneCoperte = [
    ...copertura.filter(r => r.tipo === 'regione').map(r => ({ nome: r.comune, tipo: 'Regione', parziale: regioneParziale(r.comune) })),
    ...copertura.filter(r => r.tipo === 'provincia').map(r => ({ nome: r.comune, tipo: 'Provincia', parziale: provinciaParziale(r.comune) })),
    ...copertura.filter(r => r.tipo === 'comune_incluso').map(r => ({ nome: r.comune, tipo: 'Comune', parziale: false })),
  ]

  // ---- Pezzi di interfaccia ----

  function RigaSc({ k, vista, campo }: { k: string; vista: string; campo?: React.ReactNode }) {
    const inEdit = !!campo
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 27, borderBottom: '1px solid #F5F7FA', fontSize: 11.5 }}>
        <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', flexShrink: 0 }}>{k}</span>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          {inEdit ? campo : <span title={vista} style={{ color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{vista || '—'}</span>}
        </span>
      </div>
    )
  }

  function TestataScheda({ titolo, sezione }: { titolo: string; sezione?: Exclude<SezioneEdit, null> }) {
    const inEdit = sezione != null && sezEdit === sezione
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F1B33', flex: 1, minWidth: 0 }}>{titolo}</span>
        {sezione && !inEdit && (
          <button onClick={() => apriSez(sezione)} aria-label={`Modifica ${titolo}`} className="flex items-center justify-center transition-colors hover:bg-blue-50 hover:border-blue-200" style={{ width: 22, height: 22, borderRadius: 7, border: '1.5px solid #E5E7EB', background: '#fff', color: '#1D4ED8', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
          </button>
        )}
        {sezione && inEdit && (
          <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => setSezEdit(null)} disabled={salvandoSez} className="disabled:opacity-50" style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#4B5563', fontSize: 10, fontWeight: 700, borderRadius: 7, padding: '3px 7px', cursor: 'pointer' }}>Annulla</button>
            <button onClick={salvaSez} disabled={salvandoSez} className="transition-colors hover:bg-blue-700 disabled:opacity-50" style={{ background: '#2563EB', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 7, padding: '3px 8px', cursor: 'pointer' }}>{salvandoSez ? '…' : 'Salva'}</button>
          </span>
        )}
      </div>
    )
  }

  const stileScheda: React.CSSProperties = { flex: 1, minWidth: 215, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '11px 13px' }
  const stilePillola: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 11.5, fontWeight: 600, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap', cursor: 'pointer' }

  // La testata usa i dati della riga finché il carico completo non arriva
  const nomeVivo = dem?.ragione_sociale ?? base.ragione_sociale
  const cittaViva = dem?.citta ?? base.citta
  const provViva = dem?.provincia ?? base.provincia
  const attivo = (dem?.stato ?? base.stato) === 'attivo'
  const feeViva = dem?.fee_per_pratica ?? base.fee_per_pratica
  const aperteVive = loading ? base.nAperte : stats.aperte
  const barColor = attivo ? '#97C459' : '#C0C7D1'

  return (
    <div style={{ border: `2px solid ${chiudendo ? '#E5E7EB' : '#2563EB'}`, borderRadius: 16, background: '#FAFBFD', boxShadow: chiudendo ? '0 1px 3px rgba(16,24,40,0.07)' : '0 10px 30px rgba(15,23,42,0.10)', overflow: 'visible', transition: 'border-color .3s ease, box-shadow .3s ease' }}>

      {/* ===== TESTATA-RIGA: IDENTICA alla card chiusa (stesse misure e
          colonne: NIENTE sobbalzo all'apertura) ma tinta d'azzurro, col nome
          in blu — clic = richiudi, come le pratiche ===== */}
      <div onClick={chiudi} style={{ background: chiudendo ? '#fff' : '#EFF6FF', borderLeft: `4px solid ${barColor}`, borderRadius: '14px 14px 0 0', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'background .3s ease' }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: '#DBEAFE', color: '#1E4E8C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
          {iniziali(nomeVivo)}
        </div>
        <div style={{ flex: 1.6, minWidth: 0 }}>
          <div className="text-[15px] font-bold truncate" style={{ color: chiudendo ? '#111827' : '#1D4ED8', transition: 'color .3s ease' }}>{nomeVivo}</div>
          <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>{cittaViva ? `${cittaViva}${provViva ? ` (${provViva})` : ''}` : 'Sede non impostata'}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid #DBEAFE', paddingLeft: 14 }}>
          <span className="inline-block text-[11.5px] font-bold rounded-full" style={{ background: attivo ? '#DCF3E4' : '#E7EAEE', color: attivo ? '#1F7A43' : '#4B5563', padding: '4px 12px' }}>{attivo ? 'Attivo' : 'Non attivo'}</span>
        </div>
        <div style={{ flex: 1.4, minWidth: 0, borderLeft: '1px solid #DBEAFE', paddingLeft: 14 }}>
          <div className="text-[10.5px] font-bold uppercase" style={{ color: '#7C96C4', letterSpacing: 0.4 }}>Copertura</div>
          {base.cop
            ? <div className="text-[13px] font-semibold truncate" style={{ color: '#111827', marginTop: 2 }}>{base.cop}</div>
            : <div className="text-[13px] truncate" style={{ color: '#94A3B8', marginTop: 2 }}>Da impostare</div>}
        </div>
        <div style={{ flexShrink: 0, minWidth: 70, borderLeft: '1px solid #DBEAFE', paddingLeft: 14 }}>
          <div className="text-[10.5px] font-bold uppercase" style={{ color: '#7C96C4', letterSpacing: 0.4 }}>Fee</div>
          <div className="text-[13.5px] font-bold" style={{ color: '#111827', marginTop: 2 }}>{feeViva ? `${feeViva} €` : '—'}</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'center', background: aperteVive > 0 ? '#E0EDFB' : '#fff', borderRadius: 10, padding: '6px 14px', minWidth: 70, border: '1px solid #DBEAFE' }}>
          <div className="text-[15px] font-bold" style={{ color: aperteVive > 0 ? '#1E4E8C' : '#6B7280' }}>{aperteVive}</div>
          <div className="text-[10px] font-semibold uppercase" style={{ color: aperteVive > 0 ? '#1E4E8C' : '#6B7280' }}>aperte</div>
        </div>
      </div>

      {/* Tutto il resto SI SROTOLA morbido sotto la riga (azioni + schede) */}
      <div style={{ display: 'grid', gridTemplateRows: aperto ? '1fr' : '0fr', transition: 'grid-template-rows .28s ease' }}>
      <div style={{ overflow: 'hidden' }}>

        {/* FILA AZIONI nella testata azzurra */}
        <div style={{ background: '#EFF6FF', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '0 16px 12px' }}>

          {/* ACCESSO AREA: LED + invito/reinvito, revoca, link di riserva */}
          <span style={{ position: 'relative' }}>
            <button onClick={() => { setNuvola(n => n === 'accesso' ? null : 'accesso'); setRevocaConferma(false); setErroreRevoca(''); setMessaggioInvito(null) }} className="transition-all hover:bg-blue-100" style={stilePillola}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: accesso == null ? '#C0C7D1' : accesso ? '#22C55E' : '#F87171', flexShrink: 0 }} />
              Accesso area
            </button>
            {nuvola === 'accesso' && (
              <Nuvola onChiudi={() => setNuvola(null)} larghezza={300}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#111827' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: accesso == null ? '#C0C7D1' : accesso ? '#22C55E' : '#F87171' }} />
                  {accesso == null ? 'Stato accesso in verifica…' : accesso ? 'Può accedere alla sua area' : 'Login disattivato'}
                </div>
                {dem?.invito_inviato_il && (
                  <div style={{ fontSize: 10.5, color: '#8B95A5', marginTop: 3 }}>Invito del {fmtDataOra(dem.invito_inviato_il)}</div>
                )}
                {/* ⭐ 28/07 (richiesta Davide): bottone piccolo a pillolina, non a tutta larghezza */}
                <button onClick={invitaDemolitore} disabled={invitando} className="transition-colors hover:bg-blue-700 disabled:opacity-60" style={{ marginTop: 9, background: '#2563EB', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '5px 13px', cursor: 'pointer' }}>
                  {invitando ? 'Invio…' : dem?.invito_inviato_il ? "Reinvita all'area" : "Invita all'area"}
                </button>
                {messaggioInvito && (
                  <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 6, color: messaggioInvito.ok ? '#1F7A43' : '#A94444' }}>{messaggioInvito.testo}</div>
                )}
                {/* Link di riserva quando l'email non è configurata */}
                {linkInvito && (
                  <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                    <input readOnly value={linkInvito} onFocus={e => e.target.select()} style={{ flex: 1, minWidth: 0, border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '5px 8px', fontSize: 10, color: '#4B5563', outline: 'none', background: '#F8FAFC' }} />
                    <button onClick={() => navigator.clipboard.writeText(linkInvito)} style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 10.5, fontWeight: 700, borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>Copia</button>
                  </div>
                )}
                {accesso && !revocaConferma && (
                  <button onClick={() => setRevocaConferma(true)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#A94444', fontSize: 10.5, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Revoca accesso</button>
                )}
                {revocaConferma && (
                  <div style={{ marginTop: 8, background: '#FBF3F3', border: '1px solid #F3D9D9', borderRadius: 9, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10.5, color: '#7A3B3B', lineHeight: 1.5 }}>Non potrà più entrare nella sua area. Scheda, note e pratiche storiche restano intatte; potrai reinvitarlo quando vuoi.</div>
                    {erroreRevoca && <div style={{ fontSize: 10.5, color: '#A94444', fontWeight: 600, marginTop: 4 }}>{erroreRevoca}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 7 }}>
                      <button onClick={() => setRevocaConferma(false)} disabled={revocando} style={{ background: 'none', border: 'none', color: '#5B6779', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>Annulla</button>
                      <button onClick={revocaAccesso} disabled={revocando} className="transition-colors hover:!bg-[#D25151] disabled:opacity-50" style={{ background: '#E15E5E', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', cursor: 'pointer' }}>{revocando ? 'Revoco…' : 'Sì, revoca'}</button>
                    </div>
                  </div>
                )}
              </Nuvola>
            )}
          </span>

          {/* STATO: Attivo / Non attivo con le pillole vere */}
          <span style={{ position: 'relative' }}>
            <button onClick={() => setNuvola(n => n === 'stato' ? null : 'stato')} className="transition-all hover:bg-blue-100" style={{ ...stilePillola, background: nuvola === 'stato' ? '#DBEAFE' : '#fff' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Stato
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: nuvola === 'stato' ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {nuvola === 'stato' && (
              <Nuvola onChiudi={() => setNuvola(null)} larghezza={210}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9AA7B5', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 7 }}>Stato del demolitore</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button onClick={() => aggiornaStato('attivo')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, borderRadius: 999, padding: '3.5px 11px', background: '#DCF3E4', color: '#1F7A43', boxShadow: attivo ? '0 0 0 2px #2563EB' : 'none' }}>Attivo</span>
                    <span style={{ fontSize: 10, color: '#8B95A5' }}>riceve nuove pratiche</span>
                  </button>
                  <button onClick={() => aggiornaStato('sospeso')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, borderRadius: 999, padding: '3.5px 11px', background: '#E7EAEE', color: '#4B5563', boxShadow: !attivo ? '0 0 0 2px #2563EB' : 'none' }}>Non attivo</span>
                    <span style={{ fontSize: 10, color: '#8B95A5' }}>niente nuove pratiche</span>
                  </button>
                </div>
              </Nuvola>
            )}
          </span>

          {/* COPERTURA: pannello da destra con la mappa */}
          <button onClick={() => apriDrawer('copertura')} className="transition-all hover:bg-blue-100" style={{ ...stilePillola, background: drawer === 'copertura' ? '#DBEAFE' : '#fff' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            Copertura
            <span style={{ background: '#EFF6FF', borderRadius: 999, fontSize: 10, padding: '1px 7px' }}>{zoneCoperte.length}</span>
          </button>

          {/* (28/07: la pillola "€ Tariffe" è stata tolta, richiesta Davide:
              la scheda Tariffa con la matita c'è già nella tendina) */}

          <span style={{ flex: 1 }} />
          {/* Statistiche restanti come CHIPS in linea (Aperte e Fee vivono già nella riga) */}
          <ChipStat l="Completate" n={String(stats.completate)} />
          <ChipStat l="Annullate" n={String(stats.annullate)} allerta={stats.annullate > 0} onClick={stats.annullate > 0 ? () => apriDrawer('annullate') : undefined} />
          <ChipStat l="Velocità" n={dem && dem.velocita_media_giorni > 0 ? `${dem.velocita_media_giorni}g` : '—'} />
          <span style={{ position: 'relative' }}>
            <button onClick={() => { setNuvola(n => n === 'elimina' ? null : 'elimina'); setConfermaNome(''); setErroreElimina('') }} aria-label="Elimina demolitore" className="transition-colors hover:bg-red-50" style={{ width: 30, height: 30, borderRadius: 999, background: '#fff', border: '1.5px solid #F3C8C8', color: '#C0392B', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
            {nuvola === 'elimina' && dem && (
              <Nuvola onChiudi={() => setNuvola(null)} larghezza={290}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>Eliminare {dem.ragione_sociale}?</div>
                <div style={{ fontSize: 10.5, color: '#6B7280', lineHeight: 1.5, marginTop: 4 }}>
                  Azione <b>irreversibile</b>: spariscono anagrafica, copertura, tariffe, note e accesso. Le pratiche storiche restano ma perdono il riferimento. Non è possibile se ha pratiche aperte.
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#374151', marginTop: 8 }}>Per conferma scrivi: <span style={{ color: '#A94444' }}>{dem.ragione_sociale}</span></div>
                <input value={confermaNome} onChange={e => { setConfermaNome(e.target.value); setErroreElimina('') }} placeholder={dem.ragione_sociale} style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '6px 9px', fontSize: 11.5, color: '#111827', outline: 'none', marginTop: 4, background: '#F8FAFC' }} />
                {erroreElimina && <div style={{ fontSize: 10.5, color: '#A94444', fontWeight: 600, marginTop: 5, lineHeight: 1.45 }}>{erroreElimina}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 9 }}>
                  <button onClick={() => setNuvola(null)} disabled={eliminando} style={{ background: 'none', border: 'none', color: '#5B6779', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>Annulla</button>
                  <button onClick={eliminaDemolitore} disabled={eliminando || confermaNome.trim() !== dem.ragione_sociale} className="transition-colors hover:!bg-[#D25151] disabled:opacity-40" style={{ background: '#E15E5E', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '5px 12px', cursor: 'pointer' }}>{eliminando ? 'Elimino…' : 'Elimina per sempre'}</button>
                </div>
              </Nuvola>
            )}
          </span>
        </div>

      {/* ===== FASCIA SCHEDE ===== */}
      {loading || !dem ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '26px 0' }}>
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, padding: '12px 14px 14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* CRONOLOGIA E NOTE */}
          <div style={{ ...stileScheda, minWidth: 240 }}>
            <TestataScheda titolo="Cronologia e Note" />
            {note.length === 0 ? (
              <p style={{ fontSize: 10.5, color: '#9AA7B5', padding: '4px 0' }}>Nessuna nota. La cronologia del demolitore apparirà qui.</p>
            ) : (
              <div style={{ maxHeight: 150, overflowY: 'auto', overscrollBehavior: 'contain' }}>
                {note.map(n => (
                  <div key={n.id} className="group" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0' }}>
                    <span style={{ fontSize: 8.5, color: '#9AA7B5', textTransform: 'uppercase', fontWeight: 700, flexShrink: 0, paddingTop: 2, width: 62, lineHeight: 1.35 }}>{fmtDataOra(n.creato_il)}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: '#4B5563', lineHeight: 1.45 }}>{n.testo}</span>
                    <button onClick={() => eliminaNota(n.id)} aria-label="Elimina nota" className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'none', border: 'none', color: '#C0C7D1', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input value={nuovaNota} onChange={e => setNuovaNota(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') aggiungiNota() }} placeholder="Scrivi una nota…" style={{ flex: 1, minWidth: 0, border: '1.5px solid #E5E7EB', borderRadius: 999, padding: '5px 11px', fontSize: 11, color: '#111827', outline: 'none' }} />
              <button onClick={aggiungiNota} disabled={salvandoNota || !nuovaNota.trim()} aria-label="Aggiungi nota" className="transition-colors hover:bg-blue-700 disabled:opacity-40" style={{ width: 28, height: 28, borderRadius: 999, background: '#2563EB', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
              </button>
            </div>
          </div>

          {/* AZIENDA */}
          <div style={{ ...stileScheda, borderColor: sezEdit === 'azienda' ? '#93C5FD' : '#E5E7EB' }}>
            <TestataScheda titolo="Azienda" sezione="azienda" />
            <RigaSc k="Ragione sociale" vista={dem.ragione_sociale} campo={sezEdit === 'azienda' ? <input className={CAMPO} value={sb('ragione_sociale')} onChange={e => setB('ragione_sociale', e.target.value)} /> : undefined} />
            <RigaSc k="P.IVA" vista={dem.piva || ''} campo={sezEdit === 'azienda' ? <input className={CAMPO} value={sb('piva')} onChange={e => setB('piva', e.target.value)} /> : undefined} />
            <RigaSc k="Codice SDI" vista={dem.codice_sdi || ''} campo={sezEdit === 'azienda' ? <input className={CAMPO} maxLength={7} value={sb('codice_sdi')} onChange={e => setB('codice_sdi', e.target.value.toUpperCase())} /> : undefined} />
            {sezEdit !== 'azienda' && (
              <RigaSc k="Indirizzo" vista={dem.indirizzo ? `${dem.indirizzo}${dem.citta ? ` · ${dem.citta}` : ''}${dem.provincia ? ` (${dem.provincia})` : ''}` : ''} />
            )}
            {sezEdit === 'azienda' && (
              <div style={{ paddingTop: 7 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9AA7B5', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>Indirizzo sede</div>
                <AutocompleteIndirizzo compatto valoreIniziale={sb('indirizzo')} placeholder="Cerca l'indirizzo…" onSelezione={d => setBozza(b => ({ ...b, indirizzo: d.indirizzo, citta: d.comune || '', provincia: d.provincia || '', cap: d.cap || '', lat: d.lat ?? null, lng: d.lng ?? null }))} />
                {sb('indirizzo') && <p style={{ fontSize: 10.5, color: '#6B7280', marginTop: 5 }}>{sb('indirizzo')}{sb('citta') ? ` · ${sb('citta')}` : ''}{sb('provincia') ? ` (${sb('provincia')})` : ''}{sb('cap') ? ` · ${sb('cap')}` : ''}</p>}
              </div>
            )}
          </div>

          {/* CONTATTI */}
          <div style={{ ...stileScheda, borderColor: sezEdit === 'contatti' ? '#93C5FD' : '#E5E7EB' }}>
            <TestataScheda titolo="Contatti" sezione="contatti" />
            <RigaSc k="Email assegnazione" vista={dem.email_assegnazione || ''} campo={sezEdit === 'contatti' ? <input className={CAMPO} value={sb('email_assegnazione')} onChange={e => setB('email_assegnazione', e.target.value)} /> : undefined} />
            <RigaSc k="Email aziendale" vista={dem.email_aziendale || ''} campo={sezEdit === 'contatti' ? <input className={CAMPO} value={sb('email_aziendale')} onChange={e => setB('email_aziendale', e.target.value)} /> : undefined} />
            <RigaSc k="PEC" vista={dem.pec || ''} campo={sezEdit === 'contatti' ? <input className={CAMPO} value={sb('pec')} onChange={e => setB('pec', e.target.value)} /> : undefined} />
            <RigaSc k="Telefono fisso" vista={dem.telefono_fisso || ''} campo={sezEdit === 'contatti' ? <input className={CAMPO} inputMode="tel" value={sb('telefono_fisso')} onChange={e => setB('telefono_fisso', e.target.value)} /> : undefined} />
          </div>

          {/* PERSONE */}
          <div style={{ ...stileScheda, borderColor: sezEdit === 'persone' ? '#93C5FD' : '#E5E7EB' }}>
            <TestataScheda titolo="Persone" sezione="persone" />
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9AA7B5', letterSpacing: 0.4, textTransform: 'uppercase', margin: '2px 0 1px' }}>Titolare</div>
            <RigaSc k="Nome" vista={dem.titolare_nome || ''} campo={sezEdit === 'persone' ? <input className={CAMPO} value={sb('titolare_nome')} onChange={e => setB('titolare_nome', e.target.value)} /> : undefined} />
            <RigaSc k="Cellulare" vista={dem.titolare_cellulare || ''} campo={sezEdit === 'persone' ? <input className={CAMPO} inputMode="tel" value={sb('titolare_cellulare')} onChange={e => setB('titolare_cellulare', e.target.value)} /> : undefined} />
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9AA7B5', letterSpacing: 0.4, textTransform: 'uppercase', margin: '8px 0 1px' }}>Referente pratiche</div>
            <RigaSc k="Nome" vista={dem.referente_nome || ''} campo={sezEdit === 'persone' ? <input className={CAMPO} value={sb('referente_nome')} onChange={e => setB('referente_nome', e.target.value)} /> : undefined} />
            <RigaSc k="Cellulare" vista={dem.referente_cellulare || ''} campo={sezEdit === 'persone' ? <input className={CAMPO} inputMode="tel" value={sb('referente_cellulare')} onChange={e => setB('referente_cellulare', e.target.value)} /> : undefined} />
          </div>

          {/* TARIFFA (rinominata da Contribuzione, richiesta Davide 28/07) */}
          <div style={{ ...stileScheda, minWidth: 235, borderColor: contribEdit ? '#93C5FD' : '#E5E7EB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
              <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0F1B33', flex: 1, minWidth: 0 }}>Tariffa</span>
              {!contribEdit ? (
                <button onClick={() => setContribEdit(true)} aria-label="Modifica Tariffa" className="flex items-center justify-center transition-colors hover:bg-blue-50 hover:border-blue-200" style={{ width: 22, height: 22, borderRadius: 7, border: '1.5px solid #E5E7EB', background: '#fff', color: '#1D4ED8', cursor: 'pointer', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                </button>
              ) : (
                <button onClick={() => { setContribEdit(false); setAggiungiAperta(false); setNuovoNome(''); setNuovaFee(''); setErroreTariffa(null); setInfoTariffa(null) }} className="transition-colors hover:bg-blue-700" style={{ background: '#2563EB', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 7, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}>Fatto</button>
              )}
            </div>

            {/* Tariffa base */}
            <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 10, padding: '8px 11px', marginBottom: 7 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#1D4ED8', letterSpacing: 0.4, textTransform: 'uppercase' }}>Tariffa base</div>
              {!contribEdit ? (
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F1B33', marginTop: 1 }}>{dem.fee_per_pratica || 0} € <span style={{ fontSize: 10.5, fontWeight: 400, color: '#4B5563' }}>/ pratica</span></div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
                  {/* Campo col FILO BLU (variante A su mockup): niente cornici */}
                  <input type="number" defaultValue={dem.fee_per_pratica || ''} onBlur={e => aggiornaFeeBase(parseFloat(e.target.value) || 0)} placeholder="0" style={{ width: 56, border: 0, borderBottom: '2px solid #93C5FD', borderRadius: 0, padding: '1px 2px', fontSize: 14, fontWeight: 700, color: '#0F1B33', outline: 'none', background: 'transparent' }} />
                  <span style={{ fontSize: 10.5, color: '#4B5563' }}>€ / pratica</span>
                </div>
              )}
            </div>

            {/* Tariffe speciali */}
            {tariffe.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tariffe.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #F5F7FA', fontSize: 11.5 }}>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>{t.nome}</span>
                      <BadgeZona tipo={t.tipo} />
                      {!zonaCoperta(t.tipo, t.nome) && (
                        <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', borderRadius: 999, padding: '1.5px 6px', background: '#EEF1F7', color: '#64748b', letterSpacing: 0.3 }}>Fuori copertura</span>
                      )}
                    </span>
                    {!contribEdit ? (
                      <span style={{ fontWeight: 700, color: '#0F1B33', flexShrink: 0 }}>{t.fee} €</span>
                    ) : (
                      <>
                        <input type="number" defaultValue={t.fee} onBlur={e => aggiornaFeeTariffa(t.id, e.target.value)} style={{ width: 44, border: 0, borderBottom: '2px solid #93C5FD', borderRadius: 0, padding: '1px 2px', fontSize: 11.5, fontWeight: 700, textAlign: 'right', color: '#1E293B', outline: 'none', background: 'transparent' }} />
                        <button onClick={() => eliminaTariffa(t.id)} aria-label="Elimina tariffa" style={{ background: 'none', border: 'none', color: '#C0C7D1', cursor: 'pointer', padding: 0, flexShrink: 0 }} className="hover:!text-[#C0392B]">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ⭐ "+ Aggiungi zona" (variante A su mockup): via il riquadro
                tratteggiato — la riga apre MORBIDA la sotto-area celeste con
                pilloline, campo coi suggerimenti e tondo blu */}
            {contribEdit && (
              <>
                <button onClick={() => setAggiungiAperta(a => !a)} style={{ display: 'block', background: 'none', border: 'none', color: '#1D4ED8', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '7px 0 2px', textAlign: 'left' }}>
                  + Aggiungi zona
                </button>
                <div style={{ display: 'grid', gridTemplateRows: aggiungiAperta ? '1fr' : '0fr', transition: 'grid-template-rows .24s ease' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 10, padding: '9px 10px', marginTop: 4 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                        {(['regione', 'provincia', 'comune'] as TipoZona[]).map(tp => (
                          <button key={tp} onClick={() => { setNuovaTipo(tp); setNuovoNome(''); setErroreTariffa(null) }} style={nuovaTipo === tp ? { background: '#DBEAFE', color: '#1D4ED8', border: '1.5px solid #BFDBFE', fontSize: 9.5, fontWeight: 600, borderRadius: 999, padding: '3px 10px', cursor: 'pointer' } : { background: '#fff', color: '#5F6C7E', border: '1.5px solid #E5E7EB', fontSize: 9.5, fontWeight: 600, borderRadius: 999, padding: '3px 10px', cursor: 'pointer' }}>
                            {TIPO_ZONA_LABEL[tp]}
                          </button>
                        ))}
                      </div>
                      <input list={`zone-sugg-${demolitoreId}`} value={nuovoNome} onChange={e => { setNuovoNome(e.target.value); setErroreTariffa(null) }} placeholder={nuovaTipo === 'comune' ? 'Scrivi il comune…' : nuovaTipo === 'regione' ? 'Scrivi la regione…' : 'Scrivi la provincia…'} style={{ width: '100%', border: 0, borderBottom: '2px solid #93C5FD', borderRadius: 0, padding: '2px 2px 3px', fontSize: 11.5, color: '#111827', outline: 'none', background: 'transparent' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
                        <span style={{ fontSize: 10.5, color: '#4B5563' }}>Importo</span>
                        <input type="number" value={nuovaFee} onChange={e => { setNuovaFee(e.target.value); setErroreTariffa(null) }} placeholder="0" style={{ width: 52, border: 0, borderBottom: '2px solid #93C5FD', borderRadius: 0, padding: '2px 2px 3px', fontSize: 11.5, fontWeight: 700, textAlign: 'right', color: '#111827', outline: 'none', background: 'transparent' }} />
                        <span style={{ fontSize: 10.5, color: '#4B5563' }}>€</span>
                        <span style={{ flex: 1 }} />
                        <button onClick={aggiungiTariffa} aria-label="Aggiungi tariffa" className="transition-colors hover:bg-blue-700" style={{ width: 26, height: 26, borderRadius: 999, background: '#2563EB', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                      </div>
                      <datalist id={`zone-sugg-${demolitoreId}`}>
                        {(nuovaTipo === 'regione' ? REGIONI : nuovaTipo === 'provincia' ? PROVINCE : []).map(z => <option key={z} value={z} />)}
                      </datalist>
                      {erroreTariffa && <p style={{ fontSize: 10, color: '#A94444', fontWeight: 600, marginTop: 6 }}>{erroreTariffa}</p>}
                      {infoTariffa && <p style={{ fontSize: 10, color: '#1E4E8C', fontWeight: 600, marginTop: 6, lineHeight: 1.4 }}>{infoTariffa}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* (28/07: la frase della regola è stata tolta, richiesta Davide) */}
          </div>
        </div>
      )}
      </div>
      </div>

      {/* ===== PANNELLO DA DESTRA: COPERTURA (mappa) o PRATICHE ANNULLATE ===== */}
      {drawer && dem && (
        <div className="fixed inset-0 z-50" onClick={chiudiDrawer} style={{ cursor: 'default' }}>
          <style>{'@keyframes dem-drawer{from{transform:translateX(105%)}to{transform:none}}'}</style>
          <div
            className="absolute top-0 right-0 bottom-0 bg-white flex flex-col overflow-hidden"
            style={{ width: drawer === 'copertura' ? 'min(820px, calc(100vw - 230px))' : 'min(470px, calc(100vw - 230px))', borderLeft: '1.5px solid #E5E7EB', boxShadow: '-18px 0 44px rgba(15,23,42,0.22)', animation: 'dem-drawer .24s ease', transition: 'transform .24s ease', transform: drawerChiudendo ? 'translateX(105%)' : undefined }}
            onClick={e => e.stopPropagation()}
          >
            {/* Testata azzurra gemella del visore */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #DBEAFE', background: '#EFF6FF', flexShrink: 0 }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#2563EB', fontSize: 12, fontWeight: 700 }}>
                {iniziali(dem.ragione_sociale)}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1D4ED8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {drawer === 'copertura' ? 'Copertura' : 'Pratiche annullate'} · {dem.ragione_sociale}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: '#4B5563', marginTop: 1 }}>
                  {drawer === 'copertura'
                    ? (zoneCoperte.length === 0 ? 'Nessuna zona coperta: impostala sulla mappa' : `${zoneCoperte.length} ${zoneCoperte.length === 1 ? 'zona coperta' : 'zone coperte'}`)
                    : `${annullate.length} ${annullate.length === 1 ? 'pratica col suo motivo' : 'pratiche coi loro motivi'}`}
                </span>
              </span>
              <span style={{ flex: 1 }} />
              {drawer === 'copertura' && messaggioCop && (
                <span style={{ fontSize: 11, fontWeight: 700, color: messaggioCop.ok ? '#1F7A43' : '#A94444', flexShrink: 0 }}>{messaggioCop.testo}</span>
              )}
              {drawer === 'copertura' && salvandoCop && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" style={{ flexShrink: 0 }} />
              )}
              <button onClick={chiudiDrawer} aria-label="Chiudi" className="text-gray-400 hover:text-gray-700" style={{ fontSize: 21, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: 14 }}>
              {drawer === 'copertura' ? (
                <>
                  {/* Zone coperte a colpo d'occhio (con l'eventuale "parziale") */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {zoneCoperte.length === 0 ? (
                      <span style={{ fontSize: 12, color: '#9AA7B5' }}>Nessuna zona coperta. Selezionala sulla mappa qui sotto e premi Salva.</span>
                    ) : zoneCoperte.map(z => (
                      <span key={`${z.tipo}:${z.nome}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '4px 11px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #DBEAFE' }}>
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: '#2563eb' }} />
                        {z.nome} <span style={{ fontWeight: 400, color: '#5B87BE' }}>· {z.tipo}</span>
                        {z.parziale && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: '#FEF3C7', color: '#854F0B' }}>parziale</span>}
                      </span>
                    ))}
                  </div>
                  {/* La mappa VERA di sempre, con le sue regole */}
                  <MappaComuni coperturaIniziale={copertura} onSalva={salvaCopertura} />
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {annullate.map(p => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/admin?apri=${p.id}`)}
                      className="text-left transition-all hover:shadow-md"
                      style={{ border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '10px 12px', background: '#fff', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.targa || 'Targa mancante'}{p.marca ? ` · ${p.marca} ${p.modello || ''}` : ''}</span>
                        {p.aggiornato_il && <span style={{ fontSize: 9.5, fontWeight: 600, color: '#9AA7B5', textTransform: 'uppercase', flexShrink: 0 }}>{fmtDataOra(p.aggiornato_il)}</span>}
                      </div>
                      {p.nome_richiedente && <div style={{ fontSize: 11, color: '#4B5563', marginTop: 1 }}>{p.nome_richiedente}</div>}
                      <div style={{ fontSize: 11, background: '#F3D9D9', color: '#7A3B3B', borderRadius: 8, padding: '6px 9px', marginTop: 6, lineHeight: 1.45 }}>
                        {p.motivo_annullamento || 'Motivo non registrato.'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Chip statistica in linea con le pillole (28/07: i boxini impilati
// "scombussolavano" la fila, bocciati da Davide)
function ChipStat({ l, n, allerta = false, onClick }: { l: string; n: string; allerta?: boolean; onClick?: () => void }) {
  const stile: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: allerta ? '#FBDADA' : '#fff',
    border: `1.5px solid ${allerta ? '#F3C8C8' : '#DBEAFE'}`,
    borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0,
    cursor: onClick ? 'pointer' : 'default',
  }
  const contenuto = (
    <>
      <span style={{ fontSize: 11, fontWeight: 600, color: allerta ? '#9B1C1C' : '#5B6779' }}>{l}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: allerta ? '#9B1C1C' : '#111827' }}>{n}</span>
    </>
  )
  if (onClick) return <button onClick={onClick} className="transition-all hover:shadow-sm" style={stile}>{contenuto}</button>
  return <span style={stile}>{contenuto}</span>
}
