'use client'

import { useEffect, useState } from 'react'
import MappaComuni, { CoperturaRecord } from './MappaComuni'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { REGIONI, PROVINCE, PROVINCIA_A_REGIONE } from '../../_data/zone'
import AutocompleteIndirizzo from '../../../inizia/steps/AutocompleteIndirizzo'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

type TipoZona = 'regione' | 'provincia' | 'comune'
interface Tariffa { id: string; tipo: TipoZona; nome: string; fee: number }
const TIPO_ZONA_LABEL: Record<TipoZona, string> = { regione: 'Regione', provincia: 'Provincia', comune: 'Comune' }

interface Nota { id: string; testo: string; creato_il: string }

const FORM_VUOTO = {
  ragione_sociale: '', piva: '', codice_sdi: '',
  indirizzo: '', citta: '', provincia: '', cap: '', lat: null as number | null, lng: null as number | null,
  telefono_fisso: '', email_aziendale: '', pec: '', email_assegnazione: '',
  titolare_nome: '', titolare_cellulare: '',
  referente_nome: '', referente_cellulare: '',
}

interface Demolitore {
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

// Stile card condiviso (identico alle card della lista pratiche)
const STILE_CARD: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid #E5E7EB',
  borderRadius: 14,
  boxShadow: '0 1px 3px rgba(16,24,40,0.07)',
}

function TitoloCard({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: '#0F1B33', margin: 0 }}>
      <span style={{ width: 3, height: 15, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
      {children}
    </p>
  )
}

function iniziali(nome: string): string {
  const parti = nome.trim().split(/\s+/).filter(Boolean)
  if (parti.length === 0) return '—'
  if (parti.length === 1) return parti[0].slice(0, 2).toUpperCase()
  return (parti[0][0] + parti[1][0]).toUpperCase()
}

function fmtDataOra(x: string): string {
  return new Date(x).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DettaglioDemolitore() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [demolitore, setDemolitore] = useState<Demolitore | null>(null)
  const [copertura, setCopertura] = useState<CoperturaRecord[]>([])
  const [stats, setStats] = useState<{ aperte: number; completate: number; annullate: number }>({ aperte: 0, completate: 0, annullate: 0 })
  const [praticheAnnullate, setPraticheAnnullate] = useState<{ id: string; targa: string | null; marca: string | null; modello: string | null; nome_richiedente: string | null; motivo_annullamento: string | null; aggiornato_il: string | null }[]>([])
  const [annullateOpen, setAnnullateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null)
  const [coperturaAperta, setCoperturaAperta] = useState(false)
  const [modificaAnagrafica, setModificaAnagrafica] = useState(false)

  // Invito all'area demolitore
  const [invitando, setInvitando] = useState(false)
  const [messaggioInvito, setMessaggioInvito] = useState<{ ok: boolean; testo: string } | null>(null)
  const [linkInvito, setLinkInvito] = useState<string | null>(null)

  // Accesso all'area: LED verde (può entrare) / rosso (login inesistente)
  const [accesso, setAccesso] = useState<boolean | null>(null)
  const [revocaOpen, setRevocaOpen] = useState(false)
  const [revocando, setRevocando] = useState(false)
  const [erroreRevoca, setErroreRevoca] = useState('')

  // Eliminazione definitiva
  const [eliminaOpen, setEliminaOpen] = useState(false)
  const [confermaNome, setConfermaNome] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [erroreElimina, setErroreElimina] = useState('')

  // Form anagrafica (con snapshot originale per capire se ci sono modifiche)
  const [form, setForm] = useState({ ...FORM_VUOTO })
  const [originale, setOriginale] = useState({ ...FORM_VUOTO })
  const [salvataAnagrafica, setSalvataAnagrafica] = useState(false)
  const anagraficaModificata = JSON.stringify(form) !== JSON.stringify(originale)

  // Tariffe per zona
  const [tariffe, setTariffe] = useState<Tariffa[]>([])
  const [modificaTariffe, setModificaTariffe] = useState(false)
  const [nuovaTipo, setNuovaTipo] = useState<TipoZona>('regione')
  const [nuovoNome, setNuovoNome] = useState('')
  const [nuovaFee, setNuovaFee] = useState('')
  const [erroreTariffa, setErroreTariffa] = useState<string | null>(null)
  const [infoTariffa, setInfoTariffa] = useState<string | null>(null)

  // Note e cronologia
  const [note, setNote] = useState<Nota[]>([])
  const [nuovaNota, setNuovaNota] = useState('')
  const [salvandoNota, setSalvandoNota] = useState(false)

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) { router.push('/login'); return }

      const { data: dem } = await supabase.from('demolitori').select('*').eq('id', id).single()
      if (!dem) { router.push('/admin/demolitori'); return }
      setDemolitore(dem)
      const f = {
        ragione_sociale: dem.ragione_sociale || '', piva: dem.piva || '', codice_sdi: dem.codice_sdi || '',
        indirizzo: dem.indirizzo || '', citta: dem.citta || '', provincia: dem.provincia || '', cap: dem.cap || '', lat: dem.lat ?? null, lng: dem.lng ?? null,
        telefono_fisso: dem.telefono_fisso || '', email_aziendale: dem.email_aziendale || '', pec: dem.pec || '', email_assegnazione: dem.email_assegnazione || '',
        titolare_nome: dem.titolare_nome || '', titolare_cellulare: dem.titolare_cellulare || '',
        referente_nome: dem.referente_nome || '', referente_cellulare: dem.referente_cellulare || '',
      }
      setForm(f)
      setOriginale(f)

      const { data: cov } = await supabase.from('demolitori_comuni').select('*').eq('demolitore_id', id)
      if (cov) setCopertura(cov as CoperturaRecord[])

      const { data: prat } = await supabase.from('pratiche').select('id, targa, marca, modello, nome_richiedente, stato, motivo_annullamento, aggiornato_il').eq('demolitore_id', id)
      const aperte = (prat || []).filter(p => p.stato !== 'completata' && p.stato !== 'annullata').length
      const completate = (prat || []).filter(p => p.stato === 'completata').length
      const listaAnnullate = (prat || []).filter(p => p.stato === 'annullata')
      setStats({ aperte, completate, annullate: listaAnnullate.length })
      setPraticheAnnullate(listaAnnullate)

      const { data: tar } = await supabase.from('demolitori_tariffe').select('*').eq('demolitore_id', id).order('tipo')
      setTariffe((tar as Tariffa[]) || [])

      const { data: nt } = await supabase.from('demolitori_note').select('*').eq('demolitore_id', id).order('creato_il', { ascending: false })
      setNote((nt as Nota[]) || [])

      setLoading(false)
    }
    if (id) carica()
  }, [id, router])

  async function salvaAnagrafica() {
    if (!form.ragione_sociale.trim()) return
    setSalvando(true)
    await supabase.from('demolitori').update({
      ragione_sociale: form.ragione_sociale, piva: form.piva || null, codice_sdi: form.codice_sdi || null,
      indirizzo: form.indirizzo || null, citta: form.citta || null, provincia: form.provincia || null, cap: form.cap || null, lat: form.lat, lng: form.lng,
      telefono_fisso: form.telefono_fisso || null, email_aziendale: form.email_aziendale || null, pec: form.pec || null, email_assegnazione: form.email_assegnazione || null,
      titolare_nome: form.titolare_nome || null, titolare_cellulare: form.titolare_cellulare || null,
      referente_nome: form.referente_nome || null, referente_cellulare: form.referente_cellulare || null,
    }).eq('id', id)
    setDemolitore(prev => prev ? { ...prev, ...form } : null)
    setOriginale({ ...form })
    setSalvando(false)
    setSalvataAnagrafica(true)
    setTimeout(() => setSalvataAnagrafica(false), 2500)
  }

  async function aggiornaStato(stato: string) {
    setSalvando(true)
    await supabase.from('demolitori').update({ stato }).eq('id', id)
    setDemolitore(prev => prev ? { ...prev, stato } : null)
    setSalvando(false)
  }

  async function aggiornaFeeBase(fee: number) {
    await supabase.from('demolitori').update({ fee_per_pratica: fee }).eq('id', id)
    setDemolitore(prev => prev ? { ...prev, fee_per_pratica: fee } : null)
  }

  // La zona di una tariffa è dentro l'area di copertura del demolitore?
  // (informativo, non bloccante: una tariffa fuori zona vale per i ritiri
  //  fuori copertura assegnati manualmente). Per i comuni non giudichiamo.
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
      .insert({ demolitore_id: id, tipo: nuovaTipo, nome, fee })
      .select().single()
    if (error) {
      setErroreTariffa(error.code === '23505' ? 'Questa zona ha già una tariffa' : 'Errore nel salvataggio')
      return
    }
    setTariffe(prev => [...prev, data as Tariffa])
    setNuovoNome(''); setNuovaFee('')
    if (!zonaCoperta(nuovaTipo, nome)) {
      setInfoTariffa('Zona fuori copertura: questa tariffa varrà per i ritiri fuori zona assegnati manualmente.')
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

  async function aggiungiNota() {
    const testo = nuovaNota.trim()
    if (!testo) return
    setSalvandoNota(true)
    const { data, error } = await supabase.from('demolitori_note')
      .insert({ demolitore_id: id, testo })
      .select().single()
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

  // Invita il demolitore alla sua area riservata: il server genera il link
  // e manda l'email; se l'email non è configurata riceviamo il link da
  // inviare a mano (es. WhatsApp).
  async function invitaDemolitore() {
    if (!demolitore || invitando) return
    setInvitando(true)
    setMessaggioInvito(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/invita-demolitore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ demolitore_id: id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore durante l'invito")
      setDemolitore(prev => prev ? { ...prev, invito_inviato_il: new Date().toISOString() } : prev)
      setAccesso(true)
      if (json.email_inviata) {
        setMessaggioInvito({ ok: true, testo: `Invito inviato a ${json.email}` })
      } else {
        setLinkInvito(json.link || null)
        setMessaggioInvito({ ok: true, testo: 'Invito creato — invia il link a mano' })
      }
      setTimeout(() => setMessaggioInvito(null), 6000)
    } catch (err) {
      setMessaggioInvito({ ok: false, testo: err instanceof Error ? err.message : "Errore durante l'invito" })
      setTimeout(() => setMessaggioInvito(null), 8000)
    } finally {
      setInvitando(false)
    }
  }

  // LED accesso: chiede al server se esiste un account di login collegato
  // (il client admin non può leggere utenti per RLS)
  useEffect(() => {
    async function caricaAccesso() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/accesso-demolitore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ demolitore_id: id, azione: 'stato' }),
        })
        const json = await res.json()
        if (res.ok) setAccesso(!!json.accesso)
      } catch {
        // LED resta nascosto se lo stato non è determinabile
      }
    }
    caricaAccesso()
  }, [id])

  // Revoca SOLO il login: scheda, note e pratiche storiche restano intatte.
  async function revocaAccesso() {
    if (revocando) return
    setRevocando(true)
    setErroreRevoca('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/accesso-demolitore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ demolitore_id: id, azione: 'revoca' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Errore durante la revoca')
      setAccesso(false)
      setDemolitore(prev => prev ? { ...prev, invito_inviato_il: null } : prev)
      setRevocaOpen(false)
      setMessaggioInvito({ ok: true, testo: 'Accesso revocato' })
      setTimeout(() => setMessaggioInvito(null), 5000)
    } catch (err) {
      setErroreRevoca(err instanceof Error ? err.message : 'Errore durante la revoca')
    } finally {
      setRevocando(false)
    }
  }

  // Eliminazione DEFINITIVA del demolitore (server-side, service role).
  // Il server blocca se ci sono pratiche aperte assegnate a lui.
  async function eliminaDemolitore() {
    if (!demolitore || eliminando) return
    setEliminando(true)
    setErroreElimina('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/elimina-demolitore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ demolitore_id: id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore durante l'eliminazione")
      router.push('/admin/demolitori')
    } catch (err) {
      setErroreElimina(err instanceof Error ? err.message : "Errore durante l'eliminazione")
      setEliminando(false)
    }
  }

  // Salva la copertura (cancella i vecchi record e reinserisce i nuovi).
  async function salvaCopertura(records: CoperturaRecord[]) {
    setSalvando(true)
    setMessaggio(null)
    try {
      const { error: errDel } = await supabase.from('demolitori_comuni').delete().eq('demolitore_id', id)
      if (errDel) throw errDel
      if (records.length > 0) {
        const righe = records.map(r => ({ demolitore_id: id, comune: r.comune, provincia: r.provincia, tipo: r.tipo, distanza_km: r.distanza_km ?? null }))
        const { error: errIns } = await supabase.from('demolitori_comuni').insert(righe)
        if (errIns) throw errIns
      }
      const { data } = await supabase.from('demolitori_comuni').select('*').eq('demolitore_id', id)
      if (data) setCopertura(data as CoperturaRecord[])
      setMessaggio({ ok: true, testo: 'Copertura salvata' })
      setTimeout(() => setMessaggio(null), 3000)
    } catch (err) {
      console.error('Errore salvataggio copertura:', err)
      setMessaggio({ ok: false, testo: 'Errore durante il salvataggio' })
      setTimeout(() => setMessaggio(null), 4000)
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#ECEEF2' }}>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </main>
  )
  if (!demolitore) return null

  // Riassunto copertura per le pilloline nella card mappa.
  // "parziale" = la zona ha esclusioni interne salvate nel DB (comuni o
  // province escluse): il demolitore non la copre tutta. Solo visualizzazione.
  const normalizzaZona = (s: string) => s.toLowerCase().replace(/[^a-zà-ù]+/g, '')
  const provinceEscluseDb = copertura.filter(r => r.tipo === 'provincia_esclusa')
  const comuniEsclusiDb = copertura.filter(r => r.tipo === 'comune_escluso')
  const provinciaParziale = (nomeProv: string) => comuniEsclusiDb.some(r => r.provincia === nomeProv)
  const regioneParziale = (nomeReg: string) => {
    // I nomi regione del geojson possono differire leggermente da quelli di
    // PROVINCIA_A_REGIONE (es. "Valle d'Aosta/Vallée d'Aoste"): confronto normalizzato.
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

  return (
    <main className="min-h-screen" style={{ background: '#ECEEF2' }}>

      {/* TOP BAR minimale */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5">
        <button
          onClick={() => router.push('/admin/demolitori')}
          className="flex items-center gap-1.5 text-[12.5px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 rounded-xl px-3.5 py-2 transition-colors"
          style={{ border: '1.5px solid #E5E7EB' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Torna ai demolitori
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4">

        {/* ===== TESTATA PROFILO ===== */}
        <div style={{ background: 'linear-gradient(120deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)', borderRadius: 16, padding: '20px 22px', color: '#fff', boxShadow: '0 6px 18px rgba(37,99,235,0.28)' }}>
          <div className="flex items-center gap-4 flex-wrap">
            <div style={{ width: 58, height: 58, borderRadius: 16, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
              {iniziali(demolitore.ragione_sociale)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[20px] font-extrabold leading-tight truncate" style={{ letterSpacing: '-0.3px' }}>{demolitore.ragione_sociale}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {accesso !== null && (
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold rounded-full px-2.5 py-1" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: accesso ? '#4ADE80' : '#F87171', boxShadow: accesso ? '0 0 6px rgba(74,222,128,0.9)' : '0 0 6px rgba(248,113,113,0.9)', flexShrink: 0 }} />
                    {accesso ? 'Può accedere alla sua area' : 'Login disattivato'}
                  </span>
                )}
                {accesso && (
                  <button onClick={() => { setRevocaOpen(true); setErroreRevoca('') }} className="text-[10.5px] font-bold underline hover:opacity-100" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Revoca accesso
                  </button>
                )}
                {demolitore.invito_inviato_il && (
                  <span className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.75)' }}>Invito del {fmtDataOra(demolitore.invito_inviato_il)}</span>
                )}
              </div>
            </div>
            {/* Invito all'area riservata del demolitore */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <button
                onClick={invitaDemolitore}
                disabled={invitando}
                className="flex items-center gap-1.5 text-[12px] font-bold rounded-full transition-all disabled:opacity-60"
                style={{ padding: '7px 15px', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" /></svg>
                {invitando ? 'Invio…' : demolitore.invito_inviato_il ? "Reinvita all'area" : "Invita all'area"}
              </button>
              {messaggioInvito && (
                <span className="text-[10.5px] font-semibold" style={{ color: messaggioInvito.ok ? '#BBF7D0' : '#FECACA' }}>{messaggioInvito.testo}</span>
              )}
            </div>
            {/* Stato: Attivo / Non attivo, un clic per cambiare */}
            <div className="flex gap-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 999, padding: 4 }}>
              <button onClick={() => aggiornaStato('attivo')} disabled={salvando} className="text-[12px] font-bold rounded-full transition-all flex items-center gap-1.5" style={{ padding: '6px 15px', background: demolitore.stato === 'attivo' ? '#fff' : 'transparent', color: demolitore.stato === 'attivo' ? '#1F7A43' : 'rgba(255,255,255,0.85)' }}>
                {demolitore.stato === 'attivo' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1F7A43' }} />}
                Attivo
              </button>
              <button onClick={() => aggiornaStato('sospeso')} disabled={salvando} className="text-[12px] font-bold rounded-full transition-all" style={{ padding: '6px 15px', background: demolitore.stato !== 'attivo' ? '#fff' : 'transparent', color: demolitore.stato !== 'attivo' ? '#4B5563' : 'rgba(255,255,255,0.85)' }}>
                Non attivo
              </button>
            </div>
          </div>

          {/* Statistiche in vetro */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mt-4">
            <StatVetro valore={String(stats.aperte)} label="Pratiche aperte" />
            <StatVetro valore={String(stats.completate)} label="Completate" />
            <StatVetro valore={String(stats.annullate)} label="Annullate" allerta={stats.annullate > 0} onClick={stats.annullate > 0 ? () => setAnnullateOpen(true) : undefined} />
            <StatVetro valore={demolitore.velocita_media_giorni > 0 ? `${demolitore.velocita_media_giorni}g` : '—'} label="Velocità media" />
            <StatVetro valore={demolitore.fee_per_pratica ? `${demolitore.fee_per_pratica} €` : '—'} label="Fee base" />
          </div>
        </div>

        {/* ===== COLONNE ===== */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ANAGRAFICA (lettura di default, modifica col tasto) */}
          <div className="flex-1 min-w-0 w-full p-5" style={STILE_CARD}>
            <div className="flex items-center justify-between mb-4">
              <TitoloCard>Anagrafica</TitoloCard>
              <div className="flex items-center gap-3">
                {salvataAnagrafica && <span className="text-xs font-semibold text-green-600">Salvato</span>}
                {!modificaAnagrafica && (
                  <button
                    onClick={() => setModificaAnagrafica(true)}
                    className="flex items-center gap-1.5 text-xs font-bold rounded-xl px-4 py-2 transition-colors"
                    style={{ background: '#2563eb', color: '#fff' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                    Modifica
                  </button>
                )}
              </div>
            </div>

            {!modificaAnagrafica ? (
              /* ===== VISTA LETTURA: dati ben leggibili su riquadri grigi ===== */
              <div className="flex flex-col gap-4">
                <SezioneAna icona={<path d="M3 21h18M6 21V7l6-4 6 4v14M10 21v-6h4v6" />} titolo="Azienda">
                  <div className="grid grid-cols-2 gap-2.5">
                    <DatoRO cols={2} label="Ragione sociale" value={form.ragione_sociale} />
                    <DatoRO label="Partita IVA" value={form.piva} />
                    <DatoRO label="Codice SDI" value={form.codice_sdi} />
                  </div>
                </SezioneAna>

                <SezioneAna icona={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>} titolo="Indirizzo sede">
                  <DatoRO cols={2} label="Indirizzo" value={form.indirizzo ? `${form.indirizzo}${form.citta ? ` · ${form.citta}` : ''}${form.provincia ? ` (${form.provincia})` : ''}` : ''} />
                </SezioneAna>

                <SezioneAna icona={<><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" /></>} titolo="Contatti azienda">
                  <div className="grid grid-cols-2 gap-2.5">
                    <DatoRO label="Telefono fisso" value={form.telefono_fisso} />
                    <DatoRO label="Email aziendale" value={form.email_aziendale} />
                    <DatoRO label="PEC" value={form.pec} />
                    <DatoRO label="Email assegnazione pratiche" value={form.email_assegnazione} />
                  </div>
                </SezioneAna>

                <SezioneAna icona={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} titolo="Titolare">
                  <div className="grid grid-cols-2 gap-2.5">
                    <DatoRO label="Nome e cognome" value={form.titolare_nome} />
                    <DatoRO label="Cellulare" value={form.titolare_cellulare} />
                  </div>
                </SezioneAna>

                <SezioneAna icona={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>} titolo="Referente pratiche demolizione">
                  <div className="grid grid-cols-2 gap-2.5">
                    <DatoRO label="Nome e cognome" value={form.referente_nome} />
                    <DatoRO label="Cellulare" value={form.referente_cellulare} />
                  </div>
                </SezioneAna>
              </div>
            ) : (
              /* ===== VISTA MODIFICA: campi editabili ===== */
              <>
                <div className="flex flex-col gap-4">
                  <SezioneAna icona={<path d="M3 21h18M6 21V7l6-4 6 4v14M10 21v-6h4v6" />} titolo="Azienda">
                    <div className="grid grid-cols-2 gap-3">
                      <Campo cols={2} label="Ragione sociale" value={form.ragione_sociale} onChange={v => setForm(f => ({ ...f, ragione_sociale: v }))} />
                      <Campo label="Partita IVA" value={form.piva} onChange={v => setForm(f => ({ ...f, piva: v }))} />
                      <Campo label="Codice SDI" value={form.codice_sdi} onChange={v => setForm(f => ({ ...f, codice_sdi: v.toUpperCase() }))} maxLength={7} />
                    </div>
                  </SezioneAna>

                  <SezioneAna icona={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>} titolo="Indirizzo sede">
                    <AutocompleteIndirizzo compatto valoreIniziale={form.indirizzo} placeholder="Cerca l'indirizzo…" onSelezione={d => setForm(f => ({ ...f, indirizzo: d.indirizzo, citta: d.comune || '', provincia: d.provincia || '', cap: d.cap || '', lat: d.lat ?? null, lng: d.lng ?? null }))} />
                    {form.indirizzo && <p className="text-[11.5px] mt-1.5" style={{ color: '#64748b' }}>{form.indirizzo}{form.citta ? ` · ${form.citta}` : ''}{form.provincia ? ` (${form.provincia})` : ''}{form.cap ? ` · ${form.cap}` : ''}</p>}
                  </SezioneAna>

                  <SezioneAna icona={<><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" /></>} titolo="Contatti azienda">
                    <div className="grid grid-cols-2 gap-3">
                      <Campo label="Telefono fisso" value={form.telefono_fisso} onChange={v => setForm(f => ({ ...f, telefono_fisso: v }))} />
                      <Campo label="Email aziendale" value={form.email_aziendale} onChange={v => setForm(f => ({ ...f, email_aziendale: v }))} />
                      <Campo label="PEC" value={form.pec} onChange={v => setForm(f => ({ ...f, pec: v }))} />
                      <Campo label="Email assegnazione pratiche" value={form.email_assegnazione} onChange={v => setForm(f => ({ ...f, email_assegnazione: v }))} />
                    </div>
                  </SezioneAna>

                  <SezioneAna icona={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} titolo="Titolare">
                    <div className="grid grid-cols-2 gap-3">
                      <Campo label="Nome e cognome" value={form.titolare_nome} onChange={v => setForm(f => ({ ...f, titolare_nome: v }))} />
                      <Campo label="Cellulare" value={form.titolare_cellulare} onChange={v => setForm(f => ({ ...f, titolare_cellulare: v }))} />
                    </div>
                  </SezioneAna>

                  <SezioneAna icona={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>} titolo="Referente pratiche demolizione">
                    <div className="grid grid-cols-2 gap-3">
                      <Campo label="Nome e cognome" value={form.referente_nome} onChange={v => setForm(f => ({ ...f, referente_nome: v }))} />
                      <Campo label="Cellulare" value={form.referente_cellulare} onChange={v => setForm(f => ({ ...f, referente_cellulare: v }))} />
                    </div>
                  </SezioneAna>
                </div>

                {/* Barra azioni modifica */}
                <div className="flex items-center justify-end gap-2 mt-4 pt-3" style={{ borderTop: '1px solid #F1F3F8' }}>
                  {anagraficaModificata && <span className="text-[11.5px] mr-auto font-semibold" style={{ color: '#B45309' }}>Modifiche non salvate</span>}
                  <button
                    onClick={() => { setForm({ ...originale }); setModificaAnagrafica(false) }}
                    disabled={salvando}
                    className="text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-4 py-2.5 rounded-xl transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={async () => { await salvaAnagrafica(); setModificaAnagrafica(false) }}
                    disabled={salvando || !anagraficaModificata || !form.ragione_sociale.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {salvando ? 'Salvataggio…' : 'Salva modifiche'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* COLONNA DESTRA */}
          <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-4">

            {/* CONTRIBUZIONE (lettura di default, modifica col tasto) */}
            <div className="p-5" style={STILE_CARD}>
              <div className="flex items-center justify-between mb-3">
                <TitoloCard>Contribuzione</TitoloCard>
                {!modificaTariffe && (
                  <button onClick={() => setModificaTariffe(true)} className="flex items-center gap-1.5 text-xs font-bold rounded-xl px-4 py-2 transition-colors" style={{ background: '#2563eb', color: '#fff' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                    Modifica
                  </button>
                )}
              </div>

              {!modificaTariffe ? (
                /* ===== LETTURA ===== */
                <>
                  {/* Tariffa base protagonista */}
                  <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#5B87BE', textTransform: 'uppercase', letterSpacing: 0.6 }}>Tariffa base</div>
                    <div className="flex items-baseline gap-1.5" style={{ marginTop: 3 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: '#0C447C', letterSpacing: '-0.5px' }}>{demolitore.fee_per_pratica || 0} €</span>
                      <span style={{ fontSize: 13, color: '#1E4E8C' }}>/ pratica</span>
                    </div>
                  </div>

                  {/* Tariffe speciali */}
                  {tariffe.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10.5px] font-bold uppercase mb-2" style={{ color: '#5B6779', letterSpacing: 0.5 }}>Tariffe speciali · {tariffe.length}</p>
                      <div className="flex flex-col gap-1.5">
                        {tariffe.map(t => (
                          <div key={t.id} className="flex items-center justify-between gap-2 rounded-[10px] px-3 py-2.5" style={{ background: '#F6F8FB', border: '1px solid #E5E9F0' }}>
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span className="text-[13px] font-bold truncate" style={{ color: '#3E4C63' }}>{t.nome}</span>
                              <BadgeZona tipo={t.tipo} />
                              {!zonaCoperta(t.tipo, t.nome) && (
                                <span className="text-[9px] font-bold uppercase rounded-full px-2 py-0.5" style={{ background: '#EEF1F7', color: '#64748b', letterSpacing: 0.3 }}>Fuori copertura</span>
                              )}
                            </div>
                            <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0C447C', flexShrink: 0 }}>{t.fee} €</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regola di fatturazione a pillole */}
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    <span className="text-[10px] font-semibold" style={{ color: '#5B6779' }}>Vince la più specifica:</span>
                    <PillRegola attiva>Comune</PillRegola><Freccina /><PillRegola>Provincia</PillRegola><Freccina /><PillRegola>Regione</PillRegola><Freccina /><PillRegola>Base</PillRegola>
                  </div>
                </>
              ) : (
                /* ===== MODIFICA ===== */
                <>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-[11px] font-semibold" style={{ color: '#334155' }}>Tariffa base</span>
                    <input type="number" defaultValue={demolitore.fee_per_pratica || ''} onBlur={e => aggiornaFeeBase(parseFloat(e.target.value) || 0)} placeholder="0" className="w-20 rounded-[10px] px-2.5 py-1.5 text-[15px] font-extrabold bg-white outline-none focus:ring-2 focus:ring-blue-100" style={{ border: '1.5px solid #93C5FD', color: '#0C447C' }} />
                    <span className="text-xs" style={{ color: '#64748b' }}>€ / pratica</span>
                  </div>

                  {tariffe.length > 0 && (
                    <div className="flex flex-col gap-1.5 mb-3">
                      {tariffe.map(t => (
                        <div key={t.id} className="flex items-center gap-2 rounded-[10px] px-3 py-2" style={{ background: '#F6F8FB', border: '1px solid #E5E9F0' }}>
                          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                            <span className="text-[13px] font-bold truncate" style={{ color: '#3E4C63' }}>{t.nome}</span>
                            <BadgeZona tipo={t.tipo} />
                          </div>
                          <input type="number" defaultValue={t.fee} onBlur={e => aggiornaFeeTariffa(t.id, e.target.value)} className="w-16 rounded-lg px-2 py-1 text-[13px] font-bold bg-white outline-none focus:border-blue-500 text-right" style={{ border: '1.5px solid #E5E7EB', color: '#3E4C63' }} />
                          <button onClick={() => eliminaTariffa(t.id)} aria-label="Elimina tariffa" className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-600 flex-shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Nuova tariffa */}
                  <div style={{ background: '#F9FBFF', border: '1.5px dashed #93C5FD', borderRadius: 12, padding: 12 }}>
                    <p className="text-[10.5px] font-bold uppercase mb-2" style={{ color: '#1E4E8C', letterSpacing: 0.5 }}>Nuova tariffa</p>
                    <div className="flex gap-1.5 mb-2">
                      {(['regione', 'provincia', 'comune'] as TipoZona[]).map(tp => (
                        <button key={tp} onClick={() => { setNuovaTipo(tp); setNuovoNome(''); setErroreTariffa(null) }} className="text-[11px] font-bold rounded-full px-3.5 py-1.5 transition-colors" style={nuovaTipo === tp ? { background: '#2563eb', color: '#fff' } : { background: '#fff', color: '#4B5563', border: '1px solid #E5E7EB' }}>
                          {TIPO_ZONA_LABEL[tp]}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input list="zone-suggerimenti" value={nuovoNome} onChange={e => { setNuovoNome(e.target.value); setErroreTariffa(null) }} placeholder={nuovaTipo === 'comune' ? 'Scrivi il comune…' : `Cerca la ${TIPO_ZONA_LABEL[nuovaTipo].toLowerCase()}…`} className="flex-1 min-w-0 rounded-[9px] px-2.5 py-2 text-[12.5px] font-medium text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400" style={{ border: '1.5px solid #E5E7EB' }} />
                      <input type="number" value={nuovaFee} onChange={e => { setNuovaFee(e.target.value); setErroreTariffa(null) }} placeholder="€" className="w-14 rounded-[9px] px-2 py-2 text-[12.5px] font-bold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-100 text-right placeholder:text-gray-400" style={{ border: '1.5px solid #E5E7EB' }} />
                      <button onClick={aggiungiTariffa} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-[9px] px-3.5 transition-colors">Aggiungi</button>
                    </div>
                    <datalist id="zone-suggerimenti">
                      {(nuovaTipo === 'regione' ? REGIONI : nuovaTipo === 'provincia' ? PROVINCE : []).map(z => <option key={z} value={z} />)}
                    </datalist>
                    {erroreTariffa && <p className="text-[11px] text-red-600 mt-1.5">{erroreTariffa}</p>}
                    {infoTariffa && <p className="text-[11px] font-semibold mt-1.5" style={{ color: '#1E4E8C' }}>{infoTariffa}</p>}
                  </div>

                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => { setNuovoNome(''); setNuovaFee(''); setErroreTariffa(null); setInfoTariffa(null); setModificaTariffe(false) }}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-[10px] px-4 py-2 transition-colors"
                    >
                      Annulla
                    </button>
                    <button onClick={() => { setModificaTariffe(false); setErroreTariffa(null); setInfoTariffa(null) }} className="text-xs font-bold rounded-[10px] px-5 py-2 transition-colors" style={{ background: '#2563eb', color: '#fff' }}>Fatto</button>
                  </div>
                </>
              )}
            </div>

            {/* NOTE E CRONOLOGIA */}
            <div className="p-5" style={STILE_CARD}>
              <div className="mb-3"><TitoloCard>Note e cronologia</TitoloCard></div>

              <div className="flex gap-2 mb-3">
                <input
                  value={nuovaNota}
                  onChange={e => setNuovaNota(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') aggiungiNota() }}
                  placeholder="Scrivi una nota… (es. chiamato per contratto)"
                  className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white"
                />
                <button onClick={aggiungiNota} disabled={salvandoNota || !nuovaNota.trim()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 rounded-xl disabled:opacity-40 transition-colors">
                  {salvandoNota ? '…' : 'Aggiungi'}
                </button>
              </div>

              {note.length === 0 ? (
                <p className="text-xs py-2 text-center" style={{ color: '#64748b' }}>Nessuna nota. La cronologia del demolitore apparirà qui.</p>
              ) : (
                <div className="flex flex-col">
                  {note.map((n, i) => (
                    <div key={n.id} className="group flex gap-3" style={{ paddingBottom: i === note.length - 1 ? 0 : 12 }}>
                      {/* Timeline: pallino + linea */}
                      <div className="flex flex-col items-center" style={{ width: 12, flexShrink: 0 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#2563eb', marginTop: 5, flexShrink: 0 }} />
                        {i !== note.length - 1 && <span style={{ width: 2, flex: 1, background: '#E5E7EB', marginTop: 3 }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10.5px] font-bold uppercase" style={{ color: '#5B6779', letterSpacing: 0.4 }}>{fmtDataOra(n.creato_il)}</div>
                        <div className="text-[13px] mt-0.5" style={{ color: '#3E4C63', lineHeight: 1.45 }}>{n.testo}</div>
                      </div>
                      <button onClick={() => eliminaNota(n.id)} aria-label="Elimina nota" className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== AREA DI COPERTURA (a tendina: zone visibili subito, mappa solo in modifica) ===== */}
        <div className="p-5" style={STILE_CARD}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TitoloCard>Area di copertura</TitoloCard>
            <div className="flex items-center gap-3">
              {messaggio && <span className="text-xs font-bold" style={{ color: messaggio.ok ? '#1F7A43' : '#C0392B' }}>{messaggio.testo}</span>}
              <button
                onClick={() => setCoperturaAperta(v => !v)}
                className="flex items-center gap-1.5 text-xs font-bold rounded-xl px-4 py-2 transition-colors"
                style={coperturaAperta ? { background: '#EEF1F7', color: '#4B5563' } : { background: '#2563eb', color: '#fff' }}
              >
                {coperturaAperta ? (
                  <>Chiudi
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg></>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                    Modifica
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Zone coperte sempre visibili a colpo d'occhio */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {zoneCoperte.length === 0 ? (
              <span className="text-[12.5px]" style={{ color: '#94A3B8' }}>Nessuna zona coperta. Premi “Modifica” per impostarla sulla mappa.</span>
            ) : (
              <>
                {zoneCoperte.slice(0, 10).map(z => (
                  <span key={`${z.tipo}:${z.nome}`} className="text-[11.5px] font-bold rounded-full flex items-center gap-1.5" style={{ background: '#E0EDFB', color: '#1E4E8C', padding: '5px 12px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
                    {z.nome} <span style={{ fontWeight: 500, color: '#5B87BE' }}>· {z.tipo}</span>
                    {z.parziale && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#854F0B' }}>parziale</span>}
                  </span>
                ))}
                {zoneCoperte.length > 10 && <span className="text-[11.5px] font-bold rounded-full" style={{ background: '#EEF1F7', color: '#64748b', padding: '5px 12px' }}>+{zoneCoperte.length - 10}</span>}
              </>
            )}
          </div>

          {/* Mappa: montata solo quando si apre la modifica */}
          {coperturaAperta && (
            <div className="mt-4">
              <MappaComuni coperturaIniziale={copertura} onSalva={salvaCopertura} />
            </div>
          )}
        </div>

        {/* ===== ZONA PERICOLOSA ===== */}
        <div className="p-5 flex items-center justify-between gap-4 flex-wrap" style={{ ...STILE_CARD, border: '1.5px solid #FECACA' }}>
          <div>
            <p className="text-[13.5px] font-bold m-0" style={{ color: '#9B1C1C' }}>Elimina demolitore</p>
            <p className="text-xs mt-0.5 m-0" style={{ color: '#64748b' }}>Cancella per sempre anagrafica, copertura, tariffe, note e accesso. Le pratiche storiche restano ma perdono il riferimento.</p>
          </div>
          <button
            onClick={() => { setEliminaOpen(true); setConfermaNome(''); setErroreElimina('') }}
            className="flex items-center gap-1.5 text-xs font-bold rounded-xl px-4 py-2.5 transition-colors bg-white text-red-600 hover:bg-red-50 flex-shrink-0"
            style={{ border: '1.5px solid #FCA5A5' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
            Elimina definitivamente
          </button>
        </div>
      </div>

      {/* MODALE CONFERMA ELIMINAZIONE DEFINITIVA */}
      {eliminaOpen && demolitore && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !eliminando && setEliminaOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-gray-900 mb-1">Eliminare {demolitore.ragione_sociale}?</p>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: '#64748b' }}>
              Questa azione è <b>irreversibile</b>: spariscono per sempre anagrafica, copertura, tariffe, note e l&apos;accesso all&apos;area demolitore.
              Non è possibile se ha pratiche aperte assegnate.
            </p>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Per conferma scrivi: <span style={{ color: '#9B1C1C' }}>{demolitore.ragione_sociale}</span></label>
            <input
              value={confermaNome}
              onChange={e => { setConfermaNome(e.target.value); setErroreElimina('') }}
              placeholder={demolitore.ragione_sociale}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-red-400"
            />
            {erroreElimina && (
              <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl text-xs leading-relaxed" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>
                {erroreElimina}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEliminaOpen(false)} disabled={eliminando} className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
                Annulla
              </button>
              <button
                onClick={eliminaDemolitore}
                disabled={eliminando || confermaNome.trim() !== demolitore.ragione_sociale}
                className="text-xs font-bold text-white px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 bg-[#E15E5E] hover:bg-[#D25151]"
              >
                {eliminando ? 'Eliminazione…' : 'Elimina per sempre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE REVOCA ACCESSO */}
      {revocaOpen && demolitore && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !revocando && setRevocaOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-gray-900 m-0 mb-1">Revocare l&apos;accesso a {demolitore.ragione_sociale}?</p>
            <p className="text-xs m-0 mb-4 leading-relaxed" style={{ color: '#64748b' }}>
              Non potrà più entrare nella sua area (LED rosso). La scheda, le note e le pratiche storiche restano intatte:
              continuerai a vedere che le sue pratiche erano sue. Potrai ridargli l&apos;accesso in qualsiasi momento con &quot;Invita all&apos;area&quot;.
            </p>
            {erroreRevoca && (
              <div className="rounded-xl px-3 py-2.5 mb-3 text-xs" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>{erroreRevoca}</div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setRevocaOpen(false)} disabled={revocando} className="flex-1 text-xs font-semibold text-gray-500 hover:text-gray-700 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">Annulla</button>
              <button onClick={revocaAccesso} disabled={revocando} className="flex-1 text-xs font-bold text-white py-2.5 rounded-xl transition-colors disabled:opacity-50" style={{ background: '#D97706' }}>
                {revocando ? 'Revoca in corso…' : 'Revoca accesso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE LINK INVITO (fallback quando l'email non è configurata) */}
      {linkInvito && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setLinkInvito(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-gray-900 mb-1">Link di invito</p>
            <p className="text-xs mb-3" style={{ color: '#64748b' }}>
              L&apos;email automatica non è ancora configurata: copia questo link e invialo tu al demolitore (es. su WhatsApp).
              Il link vale una volta sola e fa impostare la password della sua area.
            </p>
            <div className="flex gap-2">
              <input readOnly value={linkInvito} onFocus={e => e.target.select()} className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 bg-gray-50 outline-none" />
              <button onClick={() => navigator.clipboard.writeText(linkInvito)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 rounded-xl transition-colors">Copia</button>
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={() => setLinkInvito(null)} className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-4 py-2">Chiudi</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE PRATICHE ANNULLATE DEL DEMOLITORE */}
      {annullateOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAnnullateOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <p className="text-[15px] font-bold text-gray-900">Pratiche annullate</p>
                <p className="text-xs" style={{ color: '#64748b' }}>{demolitore.ragione_sociale} · {praticheAnnullate.length} {praticheAnnullate.length === 1 ? 'pratica' : 'pratiche'}</p>
              </div>
              <button onClick={() => setAnnullateOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="p-4 flex flex-col gap-2.5">
              {praticheAnnullate.map(p => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/admin/pratiche/${p.id}`)}
                  className="text-left rounded-xl p-3.5 transition-all hover:shadow-md"
                  style={{ border: '1.5px solid #E5E7EB', borderLeft: '4px solid #C0C7D1', background: '#fff' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13.5px] font-bold text-gray-900 truncate">{p.targa || 'Targa mancante'}{p.marca && ` · ${p.marca} ${p.modello || ''}`}</div>
                    {p.aggiornato_il && <span className="text-[10.5px] font-semibold uppercase flex-shrink-0" style={{ color: '#94A3B8' }}>{fmtDataOra(p.aggiornato_il)}</span>}
                  </div>
                  {p.nome_richiedente && <div className="text-[12px] mt-0.5" style={{ color: '#4B5563' }}>{p.nome_richiedente}</div>}
                  <div className="text-[12.5px] rounded-[9px] px-2.5 py-2 mt-2" style={{ background: '#F3F4F7', color: '#3E4C63', lineHeight: 1.45 }}>
                    {p.motivo_annullamento || 'Motivo non registrato.'}
                  </div>
                </button>
              ))}
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

// Badge colorato per il tipo di zona di una tariffa
function BadgeZona({ tipo }: { tipo: TipoZona }) {
  const stile = tipo === 'regione'
    ? { background: '#EDE4FB', color: '#6B21A8' }
    : tipo === 'provincia'
      ? { background: '#E0EDFB', color: '#1E4E8C' }
      : { background: '#DCF3E4', color: '#1F7A43' }
  return <span className="text-[9.5px] font-extrabold uppercase rounded-full px-2 py-0.5" style={{ ...stile, letterSpacing: 0.4, flexShrink: 0 }}>{TIPO_ZONA_LABEL[tipo]}</span>
}

function PillRegola({ children, attiva = false }: { children: React.ReactNode; attiva?: boolean }) {
  return (
    <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={attiva ? { background: '#E0EDFB', color: '#1E4E8C' } : { background: '#EEF1F7', color: '#4B5563' }}>
      {children}
    </span>
  )
}

function Freccina() {
  return <span style={{ color: '#94A3B8', fontSize: 10 }}>›</span>
}

function StatVetro({ valore, label, allerta = false, onClick }: { valore: string; label: string; allerta?: boolean; onClick?: () => void }) {
  const stile: React.CSSProperties = {
    background: allerta ? 'rgba(255,214,214,0.22)' : 'rgba(255,255,255,0.14)',
    border: `1px solid ${allerta ? 'rgba(255,190,190,0.45)' : 'rgba(255,255,255,0.18)'}`,
    borderRadius: 12,
    padding: '10px 14px',
    textAlign: 'left',
    cursor: onClick ? 'pointer' : 'default',
  }
  const contenuto = (
    <>
      <div style={{ fontSize: 21, fontWeight: 800, color: allerta ? '#FFD9D9' : '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
        {valore}
        {onClick && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={allerta ? '#FFC9C9' : '#BFDBFE'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: allerta ? '#FFC9C9' : '#BFDBFE', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </>
  )
  if (onClick) return <button onClick={onClick} className="transition-all hover:opacity-90 active:scale-[0.98]" style={stile}>{contenuto}</button>
  return <div style={stile}>{contenuto}</div>
}

function SezioneAna({ icona, titolo, children }: { icona: React.ReactNode; titolo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ width: 28, height: 28, borderRadius: 8, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{icona}</svg>
        </span>
        <span className="text-[12px] font-bold uppercase" style={{ color: '#1E293B', letterSpacing: 0.5 }}>{titolo}</span>
      </div>
      {children}
    </div>
  )
}

// Riquadro dato in SOLA LETTURA: etichetta leggibile, valore protagonista
function DatoRO({ label, value, cols = 1 }: { label: string; value: string; cols?: 1 | 2 }) {
  return (
    <div className={`rounded-[10px] px-3 py-2.5 ${cols === 2 ? 'col-span-2' : ''}`} style={{ background: '#F6F8FB', border: '1px solid #E5E9F0' }}>
      <div className="text-[10.5px] font-bold uppercase" style={{ color: '#5B6779', letterSpacing: 0.4 }}>{label}</div>
      <div className="text-[13.5px] font-semibold truncate" style={{ color: value ? '#3E4C63' : '#B6BFCC', marginTop: 3 }}>{value || '—'}</div>
    </div>
  )
}

function Campo({ label, value, onChange, cols = 1, maxLength }: { label: string; value: string; onChange: (v: string) => void; cols?: 1 | 2; maxLength?: number }) {
  return (
    <div className={cols === 2 ? 'col-span-2' : ''}>
      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: '#334155' }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={maxLength}
        className="w-full border-[1.5px] border-gray-200 rounded-[10px] px-3 py-2 text-[13.5px] font-medium text-gray-900 bg-white outline-none hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
      />
    </div>
  )
}
