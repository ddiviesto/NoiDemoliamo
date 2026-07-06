'use client'

import { useEffect, useState } from 'react'
import MappaComuni, { CoperturaRecord } from './MappaComuni'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { REGIONI, PROVINCE } from '../../_data/zone'
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
  const [stats, setStats] = useState<{ aperte: number; completate: number }>({ aperte: 0, completate: 0 })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null)
  const [coperturaAperta, setCoperturaAperta] = useState(false)
  const [modificaAnagrafica, setModificaAnagrafica] = useState(false)

  // Form anagrafica (con snapshot originale per capire se ci sono modifiche)
  const [form, setForm] = useState({ ...FORM_VUOTO })
  const [originale, setOriginale] = useState({ ...FORM_VUOTO })
  const [salvataAnagrafica, setSalvataAnagrafica] = useState(false)
  const anagraficaModificata = JSON.stringify(form) !== JSON.stringify(originale)

  // Tariffe per zona
  const [tariffe, setTariffe] = useState<Tariffa[]>([])
  const [nuovaTipo, setNuovaTipo] = useState<TipoZona>('regione')
  const [nuovoNome, setNuovoNome] = useState('')
  const [nuovaFee, setNuovaFee] = useState('')
  const [erroreTariffa, setErroreTariffa] = useState<string | null>(null)

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

      const { data: prat } = await supabase.from('pratiche').select('stato').eq('demolitore_id', id)
      const aperte = (prat || []).filter(p => p.stato !== 'completata' && p.stato !== 'annullata').length
      const completate = (prat || []).filter(p => p.stato === 'completata').length
      setStats({ aperte, completate })

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

  async function aggiungiTariffa() {
    const nome = nuovoNome.trim()
    const fee = parseFloat(nuovaFee)
    setErroreTariffa(null)
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
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </main>
  )
  if (!demolitore) return null

  // Riassunto copertura per le pilloline nella card mappa
  const zoneCoperte = [
    ...copertura.filter(r => r.tipo === 'regione').map(r => ({ nome: r.comune, tipo: 'Regione' })),
    ...copertura.filter(r => r.tipo === 'provincia').map(r => ({ nome: r.comune, tipo: 'Provincia' })),
    ...copertura.filter(r => r.tipo === 'comune_incluso').map(r => ({ nome: r.comune, tipo: 'Comune' })),
  ]

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>

      {/* TOP BAR minimale */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5">
        <button
          onClick={() => router.push('/admin/demolitori')}
          className="flex items-center gap-1.5 text-[12.5px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 rounded-xl px-3.5 py-2 transition-colors"
          style={{ border: '1.5px solid #E5E7EB' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Indietro
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4">
            <StatVetro valore={String(stats.aperte)} label="Pratiche aperte" />
            <StatVetro valore={String(stats.completate)} label="Completate" />
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

            {/* CONTRIBUZIONE */}
            <div className="p-5" style={STILE_CARD}>
              <div className="mb-3"><TitoloCard>Contribuzione</TitoloCard></div>
              <div className="flex items-center gap-2">
                <input type="number" defaultValue={demolitore.fee_per_pratica || ''} onBlur={e => aggiornaFeeBase(parseFloat(e.target.value) || 0)} placeholder="0" className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xl font-bold bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" style={{ color: '#3E4C63' }} />
                <span className="text-sm" style={{ color: '#64748b' }}>€ / pratica <span style={{ color: '#94A3B8' }}>(base)</span></span>
              </div>

              <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F1F3F8' }}>
                <p className="text-[10.5px] font-bold uppercase mb-2" style={{ color: '#5B6779', letterSpacing: 0.5 }}>Tariffe speciali per zona</p>

                {tariffe.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-2.5">
                    {tariffe.map(t => (
                      <div key={t.id} className="group flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#F6F8FB', border: '1px solid #E5E9F0' }}>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-semibold truncate" style={{ color: '#3E4C63' }}>{t.nome}</div>
                          <div className="text-[10px] font-bold uppercase" style={{ color: '#5B6779', letterSpacing: 0.4 }}>{TIPO_ZONA_LABEL[t.tipo]}</div>
                        </div>
                        <input type="number" defaultValue={t.fee} onBlur={e => aggiornaFeeTariffa(t.id, e.target.value)} className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-[13.5px] font-bold bg-white outline-none focus:border-blue-500 text-right" style={{ color: '#3E4C63' }} />
                        <span className="text-xs" style={{ color: '#94A3B8' }}>€</span>
                        <button onClick={() => eliminaTariffa(t.id)} aria-label="Elimina tariffa" className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <select value={nuovaTipo} onChange={e => { setNuovaTipo(e.target.value as TipoZona); setNuovoNome('') }} className="border border-gray-200 rounded-lg px-1.5 py-1.5 text-[11px] text-gray-700 bg-gray-50 outline-none focus:border-blue-500">
                    <option value="regione">Regione</option>
                    <option value="provincia">Provincia</option>
                    <option value="comune">Comune</option>
                  </select>
                  <input list="zone-suggerimenti" value={nuovoNome} onChange={e => { setNuovoNome(e.target.value); setErroreTariffa(null) }} placeholder={nuovaTipo === 'comune' ? 'Scrivi il comune' : 'Cerca…'} className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" />
                  <input type="number" value={nuovaFee} onChange={e => { setNuovaFee(e.target.value); setErroreTariffa(null) }} placeholder="€" className="w-12 border border-gray-200 rounded-lg px-1.5 py-1.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white text-right" />
                </div>
                <datalist id="zone-suggerimenti">
                  {(nuovaTipo === 'regione' ? REGIONI : nuovaTipo === 'provincia' ? PROVINCE : []).map(z => <option key={z} value={z} />)}
                </datalist>
                <button onClick={aggiungiTariffa} className="mt-2 w-full py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors" style={{ border: '1.5px dashed #BFDBFE' }}>+ Aggiungi tariffa</button>
                {erroreTariffa && <p className="text-[11px] text-red-600 mt-1.5">{erroreTariffa}</p>}
                <p className="text-[10.5px] mt-2 leading-relaxed" style={{ color: '#64748b' }}>Fatturazione con la tariffa più specifica: comune › provincia › regione › base.</p>
              </div>
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
      </div>
    </main>
  )
}

// ============================================================
// SOTTOCOMPONENTI
// ============================================================

function StatVetro({ valore, label }: { valore: string; label: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '10px 14px' }}>
      <div style={{ fontSize: 21, fontWeight: 800 }}>{valore}</div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#BFDBFE', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  )
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
