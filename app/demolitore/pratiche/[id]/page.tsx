'use client'

/**
 * AREA DEMOLITORE — scheda pratica (fase 2).
 * Colonna sinistra: tutte le informazioni (ritiro, cliente, veicolo, foto,
 * documenti). Colonna destra (prima su mobile): L'AZIONE DEL MOMENTO —
 * fissa il ritiro → veicolo ritirato → carica certificati — più la timeline.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import {
  chiamataDemolitore, caricaCertificato, nomeVeicolo, fmtDataOra, fmtData, countdownScadenza,
} from '../../_lib/api'

interface FileDoc { url: string; nome?: string; lato?: string }
interface DocApprovato { nome: string; files: FileDoc[] }

interface PraticaDettaglio {
  id: string
  stato: string
  targa: string | null
  tipo_mezzo: string | null
  tipo_mezzo_altro: string | null
  marca: string | null
  modello: string | null
  anno: number | null
  km: number | null
  tipo_cambio: string | null
  incidentato: boolean | null
  marciante: boolean | null
  va_in_moto: boolean | null
  parti_mancanti: boolean | null
  note_veicolo: string | null
  indirizzo_ritiro: string | null
  comune_ritiro: string | null
  provincia_ritiro: string | null
  cap_ritiro: string | null
  lat: number | null
  lng: number | null
  spazio_carro_attrezzi: string | null
  spazio_carro_attrezzi_note: string | null
  nome_richiedente: string | null
  telefono: string | null
  codice_fiscale: string | null
  casistica: string | null
  fermo_amministrativo: unknown
  targhe_presenti: boolean | null
  delegato_nome: string | null
  delegato_telefono: string | null
  data_assegnazione: string | null
  scadenza_proposta_ritiro: string | null
  data_ritiro_prevista: string | null
  data_ritiro_effettuato: string | null
  data_certificato_rottamazione: string | null
  data_certificato_pra: string | null
  cert_rottamazione_a_mano: boolean | null
  motivo_annullamento: string | null
}

const STATI_DA_FISSARE = ['assegnata', 'in_attesa_conferma_cliente']
const STATI_CERTIFICARE = ['ritirata', 'in_attesa_recensione_cliente', 'in_attesa_cert_rottamazione', 'in_attesa_cert_radiazione_pra']

export default function SchedaPraticaDemolitore() {
  const router = useRouter()
  const params = useParams()
  const praticaId = params.id as string

  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [pratica, setPratica] = useState<PraticaDettaglio | null>(null)
  const [foto, setFoto] = useState<string[]>([])
  const [documenti, setDocumenti] = useState<DocApprovato[]>([])
  const [daConsegnare, setDaConsegnare] = useState<string[]>([])
  const [consegnaAMano, setConsegnaAMano] = useState<string[]>([])

  // Azioni
  const [dataRitiro, setDataRitiro] = useState('')
  const [oraRitiro, setOraRitiro] = useState('')
  const [mostraFissaForm, setMostraFissaForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroreAzione, setErroreAzione] = useState('')
  const [confermaRitirata, setConfermaRitirata] = useState(false)
  const [confermaAMano, setConfermaAMano] = useState(false)
  const inputRottamazione = useRef<HTMLInputElement>(null)
  const inputPra = useRef<HTMLInputElement>(null)

  const carica = useCallback(async () => {
    try {
      const json = await chiamataDemolitore<{
        pratica: PraticaDettaglio
        foto: string[]
        documenti_approvati: DocApprovato[]
        da_consegnare: string[]
        consegna_a_mano: string[]
      }>('/api/demolitore-pratiche', { pratica_id: praticaId })
      setPratica(json.pratica)
      setFoto(json.foto || [])
      setDocumenti(json.documenti_approvati || [])
      setDaConsegnare(json.da_consegnare || [])
      setConsegnaAMano(json.consegna_a_mano || [])
      if (json.pratica.data_ritiro_prevista) {
        const d = new Date(json.pratica.data_ritiro_prevista)
        setDataRitiro(d.toISOString().slice(0, 10))
        setOraRitiro(d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
      }
      setErrore('')
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore nel caricamento')
    }
    setLoading(false)
  }, [praticaId])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      carica()
    }
    init()
  }, [carica, router])

  async function eseguiAzione(azione: string, extra?: object) {
    setSalvando(true)
    setErroreAzione('')
    try {
      await chiamataDemolitore('/api/demolitore-azioni', { pratica_id: praticaId, azione, ...extra })
      setMostraFissaForm(false)
      setConfermaRitirata(false)
      setConfermaAMano(false)
      await carica()
    } catch (e) {
      setErroreAzione(e instanceof Error ? e.message : "Errore durante l'azione")
    }
    setSalvando(false)
  }

  function handleFissaRitiro() {
    if (!dataRitiro || !oraRitiro) { setErroreAzione('Scegli data e ora del ritiro'); return }
    const quando = new Date(`${dataRitiro}T${oraRitiro}`)
    if (isNaN(quando.getTime())) { setErroreAzione('Data o ora non valide'); return }
    eseguiAzione('fissa_ritiro', { quando: quando.toISOString() })
  }

  async function handleUpload(tipo: 'rottamazione' | 'pra', file: File | undefined | null) {
    if (!file) return
    setSalvando(true)
    setErroreAzione('')
    try {
      await caricaCertificato(praticaId, tipo, file)
      await carica()
    } catch (e) {
      setErroreAzione(e instanceof Error ? e.message : 'Errore nel caricamento del file')
    }
    setSalvando(false)
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  if (!pratica) return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <p className="text-sm text-gray-700">{errore || 'Pratica non trovata'}</p>
      <button onClick={() => router.push('/demolitore')} className="text-sm font-semibold text-blue-700">← Torna alle pratiche</button>
    </main>
  )

  const p = pratica
  const annullata = p.stato === 'annullata'
  const completata = p.stato === 'completata'
  const daFissare = STATI_DA_FISSARE.includes(p.stato)
  const ritiroFissato = p.stato === 'ritiro_confermato'
  const daCertificare = STATI_CERTIFICARE.includes(p.stato)
  const cd = daFissare ? countdownScadenza(p.scadenza_proposta_ritiro) : null

  const indirizzoCompleto = [p.indirizzo_ritiro, [p.cap_ritiro, p.comune_ritiro].filter(Boolean).join(' '), p.provincia_ritiro ? `(${p.provincia_ritiro})` : ''].filter(Boolean).join(', ')
  const mapsUrl = p.lat && p.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(indirizzoCompleto)}`
  const haFermo = p.fermo_amministrativo === true || p.fermo_amministrativo === 'si'
  const rottamazioneFatta = !!p.data_certificato_rottamazione
  const praFatto = !!p.data_certificato_pra

  return (
    <main className="min-h-screen pb-8" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>

      {/* HEADER */}
      <div className="px-4 py-3 text-white" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/demolitore')} className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-xs font-semibold flex-shrink-0 transition-colors">
            ← Pratiche
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-tight truncate">{nomeVeicolo(p)}{p.targa ? ` · ${p.targa}` : ''}</div>
          </div>
          {cd && (
            <span className="text-[11px] font-bold rounded-full px-2.5 py-1 flex-shrink-0" style={{ background: cd.inRitardo ? '#DC2626' : 'rgba(255,255,255,0.9)', color: cd.inRitardo ? '#fff' : '#B91C1C' }}>
              {cd.testo}
            </span>
          )}
          {ritiroFissato && p.data_ritiro_prevista && (
            <span className="text-[11px] font-bold rounded-full px-2.5 py-1 flex-shrink-0 bg-white/90" style={{ color: '#1D4ED8' }}>
              Ritiro {fmtDataOra(p.data_ritiro_prevista)}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">

        {/* BANNER ANNULLATA / COMPLETATA */}
        {annullata && (
          <div className="rounded-2xl p-4 mb-4" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8' }}>
            <p className="text-sm font-bold m-0" style={{ color: '#9B1C1C' }}>Pratica annullata</p>
            <p className="text-[13px] mt-1 m-0" style={{ color: '#7F1D1D', lineHeight: 1.5 }}>{p.motivo_annullamento || 'Motivo non registrato.'}</p>
          </div>
        )}
        {completata && (
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: '#DCF3E4', border: '1.5px solid #A7D9B9' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            <p className="text-sm font-bold m-0" style={{ color: '#14532D' }}>Pratica completata{p.data_certificato_pra ? ` il ${fmtData(p.data_certificato_pra)}` : ''}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ===== COLONNA AZIONE + STATO (prima su mobile) ===== */}
          <div className="w-full lg:w-[330px] lg:order-last flex flex-col gap-4 flex-shrink-0">

            {erroreAzione && (
              <div className="rounded-xl p-3 text-[13px]" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>{erroreAzione}</div>
            )}

            {/* AZIONE: FISSA / SPOSTA RITIRO */}
            {!annullata && !completata && (daFissare || (ritiroFissato && mostraFissaForm)) && (
              <div className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #BFDBFE', boxShadow: '0 4px 14px rgba(37,99,235,0.10)' }}>
                <p className="text-[11px] font-bold uppercase m-0 mb-3" style={{ color: '#1E4E8C', letterSpacing: 0.5 }}>
                  {ritiroFissato ? 'Sposta il ritiro' : 'Fissa il ritiro'}
                </p>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Data</label>
                <input type="date" value={dataRitiro} min={new Date().toISOString().slice(0, 10)} onChange={e => { setDataRitiro(e.target.value); setErroreAzione('') }}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white border-gray-200 mb-3" />
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ora</label>
                <input type="time" value={oraRitiro} onChange={e => { setOraRitiro(e.target.value); setErroreAzione('') }}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white border-gray-200 mb-3" />
                <button onClick={handleFissaRitiro} disabled={salvando}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 active:scale-[0.99]">
                  {salvando ? 'Salvataggio…' : 'Conferma data e ora'}
                </button>
                {ritiroFissato && (
                  <button onClick={() => setMostraFissaForm(false)} className="w-full text-xs font-semibold text-gray-500 hover:text-gray-700 mt-2 py-1">Annulla</button>
                )}
                <p className="text-[11px] mt-2 m-0" style={{ color: '#9CA3AF', lineHeight: 1.5 }}>
                  La data vale subito e il cliente la vede nella sua area. Consiglio: chiamalo prima per accordarti.
                </p>
              </div>
            )}

            {/* AZIONE: VEICOLO RITIRATO */}
            {!annullata && ritiroFissato && !mostraFissaForm && (
              <div className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #A7D9B9', boxShadow: '0 4px 14px rgba(22,163,74,0.10)' }}>
                <p className="text-[11px] font-bold uppercase m-0 mb-1" style={{ color: '#14532D', letterSpacing: 0.5 }}>Il giorno del ritiro</p>
                {p.data_ritiro_prevista && (
                  <p className="text-sm font-bold text-gray-900 m-0 mb-3">{fmtDataOra(p.data_ritiro_prevista)}</p>
                )}
                <button onClick={() => setConfermaRitirata(true)} disabled={salvando}
                  className="w-full text-white py-3.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 active:scale-[0.99]" style={{ background: '#16A34A' }}>
                  ✓ Veicolo ritirato
                </button>
                <button onClick={() => { setMostraFissaForm(true); setErroreAzione('') }} className="w-full text-xs font-semibold text-blue-700 hover:text-blue-900 mt-2 py-1">
                  Sposta data e ora
                </button>
              </div>
            )}

            {/* AZIONE: CERTIFICATI */}
            {!annullata && daCertificare && (
              <div className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #FAC775', boxShadow: '0 4px 14px rgba(186,117,23,0.10)' }}>
                <p className="text-[11px] font-bold uppercase m-0 mb-3" style={{ color: '#854F0B', letterSpacing: 0.5 }}>Certificati</p>

                {/* Rottamazione */}
                <div className="mb-3 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <p className="text-[13px] font-bold text-gray-900 m-0 mb-1.5">1. Certificato di rottamazione</p>
                  {rottamazioneFatta ? (
                    <p className="text-[12.5px] m-0" style={{ color: '#1F7A43', fontWeight: 600 }}>
                      ✓ {p.cert_rottamazione_a_mano ? 'Consegnato a mano al ritiro' : 'Caricato'}{p.data_certificato_rottamazione ? ` · ${fmtData(p.data_certificato_rottamazione)}` : ''}
                    </p>
                  ) : (
                    <>
                      <input ref={inputRottamazione} type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleUpload('rottamazione', e.target.files?.[0])} />
                      <button onClick={() => inputRottamazione.current?.click()} disabled={salvando}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-50 mb-1.5">
                        Carica il certificato
                      </button>
                      <button onClick={() => setConfermaAMano(true)} disabled={salvando}
                        className="w-full py-2.5 rounded-xl text-[12.5px] font-semibold transition-colors bg-white text-gray-600 hover:bg-gray-50" style={{ border: '1.5px solid #E5E7EB' }}>
                        L&apos;ho consegnato a mano al ritiro
                      </button>
                    </>
                  )}
                </div>

                {/* PRA */}
                <div>
                  <p className="text-[13px] font-bold text-gray-900 m-0 mb-1.5">2. Certificato di radiazione PRA</p>
                  {praFatto ? (
                    <p className="text-[12.5px] m-0" style={{ color: '#1F7A43', fontWeight: 600 }}>✓ Caricato{p.data_certificato_pra ? ` · ${fmtData(p.data_certificato_pra)}` : ''}</p>
                  ) : (
                    <>
                      <input ref={inputPra} type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleUpload('pra', e.target.files?.[0])} />
                      <button onClick={() => inputPra.current?.click()} disabled={salvando}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-50">
                        Carica il certificato PRA
                      </button>
                      <p className="text-[11px] mt-1.5 m-0" style={{ color: '#9CA3AF', lineHeight: 1.5 }}>È il certificato PRA che completa la pratica.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TIMELINE STATO */}
            <div className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #E5E7EB' }}>
              <p className="text-[11px] font-bold uppercase m-0 mb-3" style={{ color: '#1E4E8C', letterSpacing: 0.5 }}>Stato</p>
              <div className="flex flex-col gap-2 text-[12.5px]">
                <RigaStato fatto={true} testo={`Assegnata a te${p.data_assegnazione ? ` · ${fmtDataOra(p.data_assegnazione)}` : ''}`} />
                <RigaStato fatto={!!p.data_ritiro_prevista} attivo={daFissare}
                  testo={p.data_ritiro_prevista ? `Ritiro fissato · ${fmtDataOra(p.data_ritiro_prevista)}` : p.scadenza_proposta_ritiro ? `Da fissare entro ${fmtDataOra(p.scadenza_proposta_ritiro)}` : 'Ritiro da fissare'} />
                <RigaStato fatto={!!p.data_ritiro_effettuato} attivo={ritiroFissato}
                  testo={p.data_ritiro_effettuato ? `Veicolo ritirato · ${fmtDataOra(p.data_ritiro_effettuato)}` : 'Ritiro del veicolo'} />
                <RigaStato fatto={rottamazioneFatta} attivo={daCertificare && !rottamazioneFatta}
                  testo={rottamazioneFatta ? `Cert. rottamazione ${p.cert_rottamazione_a_mano ? 'a mano' : 'caricato'}` : 'Certificato di rottamazione'} />
                <RigaStato fatto={praFatto} attivo={daCertificare && rottamazioneFatta}
                  testo={praFatto ? `Cert. PRA · pratica completata` : 'Certificato PRA (completa la pratica)'} />
              </div>
            </div>
          </div>

          {/* ===== COLONNA INFORMAZIONI ===== */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-4">

            {/* RITIRO */}
            <Sezione titolo="Ritiro" icona={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>}>
              <p className="text-[14px] font-bold text-gray-900 m-0">{indirizzoCompleto || 'Indirizzo non indicato'}</p>
              {p.spazio_carro_attrezzi && (
                <p className="text-[12.5px] mt-1 m-0" style={{ color: '#4B5563' }}>
                  Spazio carro attrezzi: <b>{p.spazio_carro_attrezzi}</b>{p.spazio_carro_attrezzi_note ? ` — ${p.spazio_carro_attrezzi_note}` : ''}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-xl transition-colors" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                  Apri in Maps
                </a>
                {p.telefono && (
                  <a href={`tel:${p.telefono}`} className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-xl transition-colors" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                    Chiama il cliente
                  </a>
                )}
              </div>
            </Sezione>

            {/* CLIENTE */}
            <Sezione titolo="Cliente" icona={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>}>
              <div className="grid grid-cols-2 gap-2.5">
                <Dato label="Nome" value={p.nome_richiedente} />
                <Dato label="Telefono" value={p.telefono} />
                <Dato label="Codice fiscale / P.IVA" value={p.codice_fiscale} />
                <Dato label="Casistica" value={p.casistica ? p.casistica.replace(/_/g, ' ') : null} />
              </div>
              {p.delegato_nome && (
                <p className="text-[12.5px] mt-2.5 m-0 rounded-[9px] px-2.5 py-2" style={{ background: '#F9FAFB', color: '#4B5563' }}>
                  Alla consegna ci sarà il delegato: <b>{p.delegato_nome}</b>{p.delegato_telefono ? ` · ${p.delegato_telefono}` : ''}
                </p>
              )}
            </Sezione>

            {/* VEICOLO */}
            <Sezione titolo="Veicolo" icona={<><path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" /><path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9m-6-6h15m-6 0V6" /></>}>
              <div className="flex flex-wrap gap-1.5">
                {(p.anno || p.km != null) && <BadgeInfo>{[p.anno, p.km != null ? `${Number(p.km).toLocaleString('it-IT')} km` : ''].filter(Boolean).join(' · ')}</BadgeInfo>}
                {p.marciante != null && (p.marciante ? <BadgeInfo>Marciante</BadgeInfo> : <BadgeInfo rosso>Non marciante</BadgeInfo>)}
                {p.va_in_moto != null && (p.va_in_moto ? <BadgeInfo>Va in moto</BadgeInfo> : <BadgeInfo rosso>Non va in moto</BadgeInfo>)}
                {p.incidentato && <BadgeInfo rosso>Incidentato</BadgeInfo>}
                {p.parti_mancanti && <BadgeInfo rosso>Parti mancanti</BadgeInfo>}
                {p.tipo_cambio && <BadgeInfo>Cambio {p.tipo_cambio.replace(/_/g, ' ')}</BadgeInfo>}
                {p.targhe_presenti != null && (p.targhe_presenti ? <BadgeInfo>Targhe presenti</BadgeInfo> : <BadgeInfo rosso>Targhe mancanti</BadgeInfo>)}
                {haFermo && <BadgeInfo rosso>Fermo amministrativo</BadgeInfo>}
              </div>
              {p.note_veicolo && (
                <p className="text-[12.5px] mt-2.5 m-0 rounded-[9px] px-2.5 py-2" style={{ background: '#F9FAFB', color: '#4B5563', lineHeight: 1.5 }}>{p.note_veicolo}</p>
              )}
              {foto.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {foto.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Foto veicolo ${i + 1}`} className="w-20 h-16 object-cover rounded-lg" style={{ border: '1px solid #E5E7EB' }} />
                    </a>
                  ))}
                </div>
              )}
            </Sezione>

            {/* DA FARTI CONSEGNARE (originali + fotocopie scelte dal cliente) */}
            {(daConsegnare.length > 0 || consegnaAMano.length > 0) && !annullata && (
              <div className="rounded-2xl p-4" style={{ background: '#064E3B', color: '#fff' }}>
                <p className="text-[11px] font-bold uppercase m-0 mb-2" style={{ color: '#6EE7B7', letterSpacing: 0.5 }}>Da farti consegnare al ritiro</p>
                <ol className="m-0 pl-5 flex flex-col gap-1">
                  {daConsegnare.map((d, i) => (
                    <li key={i} className="text-[13px]" style={{ lineHeight: 1.5 }}>{d}</li>
                  ))}
                  {consegnaAMano.map((d, i) => (
                    <li key={`mano-${i}`} className="text-[13px]" style={{ lineHeight: 1.5 }}>
                      Fotocopia fronte e retro — {d}
                      <span className="text-[10px] font-bold rounded-full px-2 py-0.5 ml-1.5" style={{ background: 'rgba(255,255,255,0.18)', color: '#FDE68A' }}>non caricata</span>
                    </li>
                  ))}
                </ol>
                {consegnaAMano.length > 0 && (
                  <p className="text-[11.5px] m-0 mt-2 rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.1)', color: '#D1FAE5', lineHeight: 1.5 }}>
                    Il cliente ha scelto di NON caricare {consegnaAMano.length === 1 ? 'questo documento' : 'questi documenti'}: fatti consegnare le fotocopie al ritiro.
                  </p>
                )}
              </div>
            )}

            {/* DOCUMENTI APPROVATI */}
            <Sezione titolo="Documenti del cliente (approvati)" icona={<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>}>
              {consegnaAMano.length > 0 && (
                <div className="flex flex-col gap-1 mb-2">
                  {consegnaAMano.map((d, i) => (
                    <p key={i} className="text-[13px] m-0" style={{ color: '#854F0B' }}>
                      <span style={{ fontWeight: 700 }}>✋</span> {d} · <b>copia consegnata a mano al ritiro</b>
                    </p>
                  ))}
                </div>
              )}
              {documenti.length === 0 ? (
                <p className="text-[12.5px] m-0" style={{ color: '#94A3B8' }}>Nessun documento approvato al momento.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {documenti.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] flex-1 min-w-0" style={{ color: '#374151' }}>
                        <span style={{ color: '#16A34A', fontWeight: 700 }}>✓</span> {doc.nome}
                      </span>
                      {doc.files.map((f, j) => (
                        <a key={j} href={f.url} target="_blank" rel="noreferrer" className="text-[12px] font-bold rounded-lg px-2.5 py-1" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                          Apri{f.lato ? ` ${f.lato}` : doc.files.length > 1 ? ` ${j + 1}` : ''}
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] mt-2 m-0" style={{ color: '#9CA3AF' }}>I link scadono dopo 1 ora: se non si aprono, ricarica la pagina.</p>
            </Sezione>
          </div>
        </div>
      </div>

      {/* MODALE CONFERMA RITIRATA */}
      {confermaRitirata && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !salvando && setConfermaRitirata(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-gray-900 m-0 mb-1">Confermi il ritiro?</p>
            <p className="text-xs m-0 mb-4" style={{ color: '#64748b', lineHeight: 1.5 }}>
              Stai segnando che il veicolo <b>{nomeVeicolo(p)}{p.targa ? ` (${p.targa})` : ''}</b> è stato ritirato. La pratica passa in fase certificati.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfermaRitirata(false)} disabled={salvando} className="flex-1 text-xs font-semibold text-gray-500 hover:text-gray-700 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">Annulla</button>
              <button onClick={() => eseguiAzione('segna_ritirata')} disabled={salvando} className="flex-1 text-xs font-bold text-white py-2.5 rounded-xl transition-colors disabled:opacity-50" style={{ background: '#16A34A' }}>
                {salvando ? 'Salvataggio…' : 'Sì, ritirato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CONFERMA ROTTAMAZIONE A MANO */}
      {confermaAMano && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !salvando && setConfermaAMano(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-gray-900 m-0 mb-1">Consegnato a mano?</p>
            <p className="text-xs m-0 mb-4" style={{ color: '#64748b', lineHeight: 1.5 }}>
              Confermi di aver consegnato il certificato di rottamazione <b>direttamente al cliente</b> al momento del ritiro. Resta da caricare il certificato PRA.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfermaAMano(false)} disabled={salvando} className="flex-1 text-xs font-semibold text-gray-500 hover:text-gray-700 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">Annulla</button>
              <button onClick={() => eseguiAzione('rottamazione_a_mano')} disabled={salvando} className="flex-1 text-xs font-bold text-white py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
                {salvando ? 'Salvataggio…' : 'Sì, confermo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ============================================================
// COMPONENTI DI SEZIONE
// ============================================================

function Sezione({ titolo, icona, children }: { titolo: string; icona: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #E5E7EB' }}>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase m-0 mb-3" style={{ color: '#1E4E8C', letterSpacing: 0.5 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icona}</svg>
        {titolo}
      </p>
      {children}
    </div>
  )
}

function Dato({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-[9px] px-2.5 py-2" style={{ background: '#F9FAFB' }}>
      <div className="text-[10px] font-semibold uppercase" style={{ color: '#94A3B8', letterSpacing: 0.3 }}>{label}</div>
      <div className="text-[13px] font-semibold mt-0.5 break-words" style={{ color: '#111827' }}>{value || '—'}</div>
    </div>
  )
}

function BadgeInfo({ children, rosso }: { children: React.ReactNode; rosso?: boolean }) {
  return (
    <span className="text-[11.5px] font-semibold rounded-full px-2.5 py-1" style={rosso ? { background: '#FEE2E2', color: '#B91C1C' } : { background: '#F3F4F6', color: '#374151' }}>
      {children}
    </span>
  )
}

function RigaStato({ fatto, attivo, testo }: { fatto: boolean; attivo?: boolean; testo: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex-shrink-0 mt-0.5" style={{ width: 16, height: 16, borderRadius: '50%', background: fatto ? '#DCF3E4' : attivo ? '#FEF3C7' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {fatto ? (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        ) : (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: attivo ? '#B45309' : '#C0C7D1' }} />
        )}
      </span>
      <span style={{ color: fatto ? '#374151' : attivo ? '#854F0B' : '#9CA3AF', fontWeight: attivo ? 600 : 400, lineHeight: 1.4 }}>{testo}</span>
    </div>
  )
}
