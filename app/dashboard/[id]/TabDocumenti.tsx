'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Pratica } from './page'

// ============================================================
// TIPI
// ============================================================

interface DocChecklist {
  id: string
  pratica_id: string
  documento_id: string
  indice_erede: number | null
  stato: 'da_fare' | 'caricato' | 'approvato' | 'rifiutato'
  file_url: string | null
  scaricato_il: string | null
  caricato_il: string | null
  nota_admin: string | null
  codice: string
  nome: string
  descrizione: string | null
  richiede_upload: boolean
  richiede_consegna: boolean
  template_pdf: string | null
  per_erede: boolean
  ordine: number
}

interface FileCaricato {
  url: string
  nome: string
}

interface FotoPratica {
  id: string
  pratica_id: string
  url: string
  caricato_il: string
  stato_approvazione?: 'approvato' | 'rifiutato' | 'in_attesa'
  nota_admin?: string | null
}

interface Props {
  pratica: Pratica
  onDocRifiutatiCambiati?: (numero: number) => void
}

// ============================================================
// STATI in cui il cliente PUO' ancora modificare
// ============================================================

const STATI_MODIFICABILI_DA_CLIENTE = [
  'in_attesa_documenti',
  'in_attesa_approvazione_admin',
  'documenti_parzialmente_approvati',
  'da_assegnare',
  'in_attesa_assegnazione',
  'in_assegnazione_manuale',
]

function clientePuoEliminare(stato: string | null | undefined): boolean {
  if (!stato) return true
  return STATI_MODIFICABILI_DA_CLIENTE.includes(stato)
}

// ============================================================
// HELPER FILE
// ============================================================

function isPdfUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /\.pdf($|\?)/i.test(url)
}

function leggiFile(fileUrl: string | null): FileCaricato[] {
  if (!fileUrl) return []
  try {
    const parsed = JSON.parse(fileUrl)
    if (Array.isArray(parsed)) return parsed as FileCaricato[]
    return []
  } catch {
    return [{ url: fileUrl, nome: 'File' }]
  }
}

function scriviFile(files: FileCaricato[]): string | null {
  if (files.length === 0) return null
  return JSON.stringify(files.map(f => ({ url: f.url, nome: f.nome })))
}

function estraiPathBucket(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.substring(idx + marker.length).split('?')[0]
}

// ============================================================
// ICONE (vettoriali sottili)
// ============================================================

function IcoCamera({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function IcoFile({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function IcoCheck({ size = 21, color = '#1D9E75' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5"/>
      <polyline points="8.5 12 11 14.5 15.5 9.5"/>
    </svg>
  )
}

function IcoClock({ size = 21, color = '#d99412' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5"/>
      <polyline points="12 7 12 12 15.5 13.5"/>
    </svg>
  )
}

function IcoAlert({ size = 14, color = '#c0392b' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5"/>
      <line x1="12" y1="7.5" x2="12" y2="13"/>
      <line x1="12" y1="16.3" x2="12" y2="16.3"/>
    </svg>
  )
}

function IcoPackage({ size = 21, color = '#5dca9e' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}

function IcoChevronDown({ size = 19, color = '#5e7290' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

// ============================================================
// ANELLO DI PROGRESSO
// ============================================================

function AnelloProgresso({ pronti, totale }: { pronti: number; totale: number }) {
  const r = 27
  const circ = 2 * Math.PI * r
  const perc = totale > 0 ? pronti / totale : 0
  const offset = circ * (1 - perc)
  return (
    <div style={{ position: 'relative', width: 66, height: 66, flexShrink: 0 }}>
      <svg width="66" height="66" viewBox="0 0 66 66">
        <circle cx="33" cy="33" r={r} fill="none" stroke="#eaf0f7" strokeWidth="7" />
        <circle cx="33" cy="33" r={r} fill="none" stroke="#2563eb" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 33 33)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 17, fontWeight: 500, color: '#0d2144', lineHeight: 1 }}>{pronti}</span>
        <span style={{ fontSize: 10, color: '#9aa7b5', lineHeight: 1.3 }}>su {totale}</span>
      </div>
    </div>
  )
}

// ============================================================
// COMPONENTE PRINCIPALE
// ============================================================

export default function TabDocumenti({ pratica, onDocRifiutatiCambiati }: Props) {
  const [docs, setDocs] = useState<DocChecklist[]>([])
  const [foto, setFoto] = useState<FotoPratica[]>([])
  const [signedMap, setSignedMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [caricandoId, setCaricandoId] = useState<string | null>(null)
  const [anteprima, setAnteprima] = useState<{ url: string; titolo: string } | null>(null)
  const [confermaElimina, setConfermaElimina] = useState<{ doc: DocChecklist; fileIdx: number } | null>(null)
  const [eliminazioneInCorso, setEliminazioneInCorso] = useState(false)
  const [sistematiAperti, setSistematiAperti] = useState(false)
  const [erediAperti, setErediAperti] = useState<Record<number, boolean>>({})
  const [ritiroAperto, setRitiroAperto] = useState(false)

  const puoEliminare = clientePuoEliminare(pratica.stato)

  useEffect(() => {
    carica()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pratica.id])

  async function carica() {
    setLoading(true)

    const { data: righe } = await supabase
      .from('pratica_documenti_checklist')
      .select('*')
      .eq('pratica_id', pratica.id)

    const documentoIds = Array.from(new Set((righe || []).map((r: Record<string, unknown>) => r.documento_id as string)))
    const catalogo = new Map<string, Record<string, unknown>>()
    if (documentoIds.length > 0) {
      const { data: cats } = await supabase
        .from('casistiche_documenti')
        .select('*')
        .in('id', documentoIds)
      for (const c of cats || []) {
        catalogo.set(c.id as string, c as Record<string, unknown>)
      }
    }

    const lista: DocChecklist[] = (righe || []).map((r: Record<string, unknown>) => {
      const cat = catalogo.get(r.documento_id as string) || {}
      return {
        id: r.id as string,
        pratica_id: r.pratica_id as string,
        documento_id: r.documento_id as string,
        indice_erede: (r.indice_erede as number | null) ?? null,
        stato: (r.stato as DocChecklist['stato']) || 'da_fare',
        file_url: (r.file_url as string | null) ?? null,
        scaricato_il: (r.scaricato_il as string | null) ?? null,
        caricato_il: (r.caricato_il as string | null) ?? null,
        nota_admin: (r.nota_admin as string | null) ?? null,
        codice: (cat.codice as string) ?? '',
        nome: (cat.nome as string) ?? 'Documento',
        descrizione: (cat.descrizione as string | null) ?? null,
        richiede_upload: !!cat.richiede_upload,
        richiede_consegna: !!cat.richiede_consegna,
        template_pdf: (cat.template_pdf as string | null) ?? null,
        per_erede: !!cat.per_erede,
        ordine: (cat.ordine as number) ?? 0,
      }
    })
    lista.sort((a, b) => a.ordine - b.ordine || (a.indice_erede ?? 0) - (b.indice_erede ?? 0))

    const sm: Record<string, string> = {}
    for (const d of lista) {
      for (const f of leggiFile(d.file_url)) {
        const path = estraiPathBucket(f.url, 'documenti-pratiche')
        if (!path) continue
        const { data } = await supabase.storage.from('documenti-pratiche').createSignedUrl(path, 3600)
        if (data?.signedUrl) sm[f.url] = data.signedUrl
      }
    }
    setSignedMap(sm)

    const { data: fotos } = await supabase
      .from('foto_pratiche')
      .select('*')
      .eq('pratica_id', pratica.id)
      .order('caricato_il')

    const { data: approvazioni } = await supabase
      .from('documenti_approvazione')
      .select('*')
      .eq('pratica_id', pratica.id)

    const mappaApprov = new Map<string, { stato: 'approvato' | 'rifiutato' | 'in_attesa'; nota: string | null }>()
    for (const a of approvazioni || []) {
      mappaApprov.set(a.tipo_documento, { stato: a.stato, nota: a.nota_admin })
    }

    const fotoArricchite: FotoPratica[] = (fotos || []).map((f: Record<string, unknown>) => {
      const appr = mappaApprov.get(`foto:${f.id as string}`)
      return {
        id: f.id as string,
        pratica_id: f.pratica_id as string,
        url: f.url as string,
        caricato_il: f.caricato_il as string,
        stato_approvazione: appr?.stato ?? 'in_attesa',
        nota_admin: appr?.nota ?? null,
      }
    })

    setDocs(lista)
    setFoto(fotoArricchite)
    setLoading(false)
  }

  useEffect(() => {
    if (!onDocRifiutatiCambiati) return
    const n = docs.filter(d => d.stato === 'rifiutato').length
    onDocRifiutatiCambiati(n)
  }, [docs, onDocRifiutatiCambiati])

  async function caricaFile(doc: DocChecklist, files: File[]) {
    setCaricandoId(doc.id)
    try {
      const esistenti = leggiFile(doc.file_url)
      const nuovi: FileCaricato[] = []
      for (const file of files) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${pratica.id}/${doc.codice}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage
          .from('documenti-pratiche')
          .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true })
        if (error) throw error
        const { data: pub } = supabase.storage.from('documenti-pratiche').getPublicUrl(path)
        if (pub?.publicUrl) nuovi.push({ url: pub.publicUrl, nome: file.name })
      }
      const tutti = [...esistenti, ...nuovi]
      await supabase
        .from('pratica_documenti_checklist')
        .update({
          file_url: scriviFile(tutti),
          stato: 'caricato',
          caricato_il: new Date().toISOString(),
          nota_admin: null,
        })
        .eq('id', doc.id)
      await carica()
    } catch (err) {
      console.error('Errore upload:', err)
      alert('Errore nel caricamento. Riprova.')
    }
    setCaricandoId(null)
  }

  async function eliminaFileConfermato() {
    if (!confermaElimina) return
    setEliminazioneInCorso(true)
    try {
      const { doc, fileIdx } = confermaElimina
      const files = leggiFile(doc.file_url)
      const daRimuovere = files[fileIdx]
      const rimanenti = files.filter((_, i) => i !== fileIdx)
      if (daRimuovere) {
        const path = estraiPathBucket(daRimuovere.url, 'documenti-pratiche')
        if (path) await supabase.storage.from('documenti-pratiche').remove([path])
      }
      const nuovoStato = rimanenti.length === 0 ? 'da_fare' : 'caricato'
      await supabase
        .from('pratica_documenti_checklist')
        .update({
          file_url: scriviFile(rimanenti),
          stato: nuovoStato,
          caricato_il: rimanenti.length === 0 ? null : doc.caricato_il,
        })
        .eq('id', doc.id)
      await carica()
    } catch (err) {
      console.error('Errore eliminazione:', err)
      alert('Errore nell\'eliminazione. Riprova.')
    }
    setEliminazioneInCorso(false)
    setConfermaElimina(null)
  }

  async function uploadFotoExtra(files: File[]) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${pratica.id}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage
          .from('foto-pratiche')
          .upload(path, file, { contentType: file.type || 'image/jpeg' })
        if (error) throw error
        const { data: pub } = supabase.storage.from('foto-pratiche').getPublicUrl(path)
        if (pub?.publicUrl) {
          await supabase.from('foto_pratiche').insert({ pratica_id: pratica.id, url: pub.publicUrl })
        }
      } catch (err) {
        console.error('Errore foto:', err)
      }
    }
    await carica()
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const sistemati = docs.filter(d => d.stato === 'caricato' || d.stato === 'approvato')
  const daFare = docs.filter(d => d.stato === 'da_fare' || d.stato === 'rifiutato')
  const daFareGenerali = daFare.filter(d => !d.per_erede && !d.template_pdf)
  const daFareModuli = daFare.filter(d => !d.per_erede && d.template_pdf)
  const daFareEredi = daFare.filter(d => d.per_erede)
  const indiciEredi = Array.from(new Set(daFareEredi.map(d => d.indice_erede ?? 0))).sort((a, b) => a - b)
  const daConsegnare = docs.filter(d => d.richiede_consegna)

  const totale = docs.length
  const pronti = sistemati.length
  const tuttoApprovato = totale > 0 && docs.every(d => d.stato === 'approvato')

  return (
    <div className="flex flex-col gap-3">

      {/* ====== STATO ====== */}
      {tuttoApprovato ? (
        <div style={{ background: '#eef7f1', border: '0.5px solid #c8e6d5', borderRadius: 18, padding: 20, textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, margin: '0 auto 12px', background: '#1D9E75', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p style={{ fontWeight: 500, fontSize: 16, color: '#0F6E56', margin: 0 }}>Sei pronto per il ritiro!</p>
          <p style={{ fontSize: 12.5, color: '#3c7a60', marginTop: 4, lineHeight: 1.45 }}>Tutti i documenti sono stati approvati. Ottimo lavoro.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '6px 6px 2px' }}>
          <AnelloProgresso pronti={pronti} totale={totale} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 16, color: '#0d2144' }}>
              {pronti === 0 ? 'Iniziamo!' : 'Stai andando bene!'}
            </div>
            <div style={{ fontSize: 12.5, color: '#7a8a9a', marginTop: 2, lineHeight: 1.4 }}>
              {daFare.length === 0 ? 'Documenti inviati, in attesa di verifica.' : `Ti restano ${daFare.length} ${daFare.length === 1 ? 'documento' : 'documenti'} da preparare.`}
            </div>
          </div>
        </div>
      )}

      {/* ====== DA PREPARARE: GENERALI + MODULI ====== */}
      {(daFareGenerali.length > 0 || daFareModuli.length > 0) && (
        <div>
          <SezioneTitolo testo="Da preparare" />
          <div className="flex flex-col gap-2.5">
            {daFareGenerali.map(d => (
              <DocCard key={d.id} doc={d} signedMap={signedMap} caricamento={caricandoId === d.id} eliminabile={puoEliminare}
                onCarica={(files) => caricaFile(d, files)} onApri={(url, titolo) => setAnteprima({ url, titolo })} onElimina={(idx) => setConfermaElimina({ doc: d, fileIdx: idx })} />
            ))}
            {daFareModuli.map(d => <ModuloCard key={d.id} doc={d} />)}
          </div>
        </div>
      )}

      {/* ====== DA PREPARARE: PER EREDE ====== */}
      {indiciEredi.length > 0 && (
        <div>
          <SezioneTitolo testo="Documenti per ogni erede" />
          <div className="flex flex-col gap-2.5">
            {indiciEredi.map(idx => {
              const docsErede = daFareEredi.filter(d => (d.indice_erede ?? 0) === idx)
              const aperto = erediAperti[idx] ?? (indiciEredi.length === 1)
              return (
                <div key={idx} style={{ border: '0.5px solid #e8edf3', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
                  <button onClick={() => setErediAperti(s => ({ ...s, [idx]: !aperto }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 13, background: '#f7f9fc' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e6f1fb', color: '#185FA5', fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx}</div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: '#0d2144' }}>{ordinaleErede(idx)} erede</div>
                      <div style={{ fontSize: 11, color: '#8a98a8', marginTop: 1 }}>{docsErede.length} {docsErede.length === 1 ? 'documento' : 'documenti'}</div>
                    </div>
                    <span style={{ transform: aperto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><IcoChevronDown color="#8a98a8" /></span>
                  </button>
                  {aperto && (
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {docsErede.map(d => (
                        <DocCard key={d.id} doc={d} signedMap={signedMap} caricamento={caricandoId === d.id} eliminabile={puoEliminare}
                          onCarica={(files) => caricaFile(d, files)} onApri={(url, titolo) => setAnteprima({ url, titolo })} onElimina={(i) => setConfermaElimina({ doc: d, fileIdx: i })} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ====== GIA' SISTEMATI ====== */}
      {sistemati.length > 0 && (
        <div>
          <SezioneTitolo testo="Già sistemati" />
          {!sistematiAperti ? (
            <button onClick={() => setSistematiAperti(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', border: '0.5px solid #e8edf3', borderRadius: 14, background: '#fff', boxShadow: '0 1px 2px rgba(13,33,68,0.04)' }}>
              <IcoCheck size={21} color="#1D9E75" />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: '#0d2144' }}>{sistemati.length} {sistemati.length === 1 ? 'documento sistemato' : 'documenti sistemati'}</div>
                <div style={{ fontSize: 11, color: '#8a98a8', marginTop: 1 }}>{contaPerStato(sistemati)}</div>
              </div>
              <IcoChevronDown color="#8a98a8" />
            </button>
          ) : (
            <div className="flex flex-col gap-2.5">
              {sistemati.map(d => (
                <CardSistemato key={d.id} doc={d} signedMap={signedMap} eliminabile={puoEliminare}
                  onApri={(url, titolo) => setAnteprima({ url, titolo })} onElimina={(idx) => setConfermaElimina({ doc: d, fileIdx: idx })} />
              ))}
              <button onClick={() => setSistematiAperti(false)} style={{ alignSelf: 'center', fontSize: 12, color: '#8a98a8', fontWeight: 500, background: 'none', border: 'none', padding: '4px 8px' }}>Nascondi</button>
            </div>
          )}
        </div>
      )}

      {/* ====== DA PORTARE AL RITIRO ====== */}
      {daConsegnare.length > 0 && (
        <div style={{ background: '#0d2144', borderRadius: 16, padding: 16 }}>
          <button onClick={() => setRitiroAperto(a => !a)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none' }}>
            <IcoPackage size={21} color="#5dca9e" />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>Da portare al ritiro</div>
              <div style={{ color: '#9db4d4', fontSize: 11.5, marginTop: 1 }}>{daConsegnare.length} originali da consegnare</div>
            </div>
            <span style={{ transform: ritiroAperto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><IcoChevronDown color="#5e7290" /></span>
          </button>
          {ritiroAperto && (
            <div style={{ marginTop: 13 }}>
              <p style={{ color: '#acc3e0', fontSize: 12, marginBottom: 6, lineHeight: 1.45 }}>Il giorno del ritiro consegna questi originali al demolitore:</p>
              <div style={{ fontSize: 13, color: '#fff' }}>
                {daConsegnare.map((d, i) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: i < daConsegnare.length - 1 ? '0.5px solid #25395a' : 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5dca9e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9.5"/><polyline points="8.5 12 11 14.5 15.5 9.5"/></svg>
                    <span>{nomeRitiro(d)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== FOTO DEL VEICOLO ====== */}
      <div style={{ border: '0.5px solid #e8edf3', borderRadius: 16, padding: 16, background: '#fff', boxShadow: '0 1px 2px rgba(13,33,68,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: foto.length > 0 ? 12 : 10 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#0d2144' }}>Foto del veicolo</span>
          <span style={{ fontSize: 12, color: '#9aa7b5' }}>{foto.length} {foto.length === 1 ? 'foto' : 'foto'}</span>
        </div>
        {foto.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {foto.map((f, idx) => (
              <button key={f.id} onClick={() => setAnteprima({ url: f.url, titolo: `Foto ${idx + 1}` })} style={{ width: '100%', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '0.5px solid #e8edf3', background: '#f3f5f8' }}>
                {isPdfUrl(f.url) ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#c0392b' }}>PDF</div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={f.url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </button>
            ))}
          </div>
        )}
        <UploadFoto onUpload={uploadFotoExtra} />
      </div>

      {/* ====== MODALE ANTEPRIMA ====== */}
      {anteprima && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setAnteprima(null)}>
          <div className="bg-white rounded-2xl p-3 max-w-4xl w-full h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 px-2 flex-shrink-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{anteprima.titolo}</p>
              <div className="flex items-center gap-3 flex-shrink-0">
                <a href={anteprima.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-medium">Apri in nuova scheda</a>
                <button onClick={() => setAnteprima(null)} className="text-gray-400 text-2xl leading-none">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {isPdfUrl(anteprima.url) ? (
                <iframe src={anteprima.url} title={anteprima.titolo} className="w-full h-full rounded-xl border border-gray-200" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={anteprima.url} alt={anteprima.titolo} className="w-full h-auto object-contain rounded-xl" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== MODALE CONFERMA ELIMINAZIONE ====== */}
      {confermaElimina && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => !eliminazioneInCorso && setConfermaElimina(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">Eliminare questo file?</p>
                <p className="text-xs text-gray-500 mt-0.5">L&apos;azione non può essere annullata.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfermaElimina(null)} disabled={eliminazioneInCorso} className="bg-white border-2 border-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-xs disabled:opacity-50">Annulla</button>
              <button onClick={eliminaFileConfermato} disabled={eliminazioneInCorso} className="bg-red-600 text-white py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50">
                {eliminazioneInCorso ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Elimino...</> : 'Sì, elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// TITOLO SEZIONE
// ============================================================

function SezioneTitolo({ testo }: { testo: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, color: '#9aa7b5', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '4px 2px 12px' }}>{testo}</div>
  )
}

// ============================================================
// FUNZIONI DI SUPPORTO TESTO
// ============================================================

function ordinaleErede(n: number): string {
  const o = ['', 'Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto', 'Settimo', 'Ottavo', 'Nono', 'Decimo']
  return o[n] || `${n}°`
}

function contaPerStato(docs: DocChecklist[]): string {
  const appr = docs.filter(d => d.stato === 'approvato').length
  const inVer = docs.filter(d => d.stato === 'caricato').length
  const parti: string[] = []
  if (appr > 0) parti.push(`${appr} approvat${appr === 1 ? 'o' : 'i'}`)
  if (inVer > 0) parti.push(`${inVer} in verifica`)
  return parti.join(' · ')
}

function nomeRitiro(d: DocChecklist): string {
  if (d.per_erede && d.indice_erede) return `${d.nome} (${ordinaleErede(d.indice_erede).toLowerCase()} erede)`
  return d.nome
}

// ============================================================
// BOLLINO AZIONE (Scatta / File) — apre direttamente
// fotocamera o selettore file, senza popup intermedi
// ============================================================

function BollinoAzione({ etichetta, bg, colore, onClick, children }: {
  etichetta: string
  bg: string
  colore: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button onClick={onClick} aria-label={etichetta} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 46, cursor: 'pointer' }}>
      <span style={{ width: 40, height: 40, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 500, color: colore, lineHeight: 1 }}>{etichetta}</span>
    </button>
  )
}

// ============================================================
// CARD DOCUMENTO DA PREPARARE (riga compatta, opzioni visibili)
// ============================================================

function DocCard(props: {
  doc: DocChecklist
  signedMap: Record<string, string>
  caricamento: boolean
  eliminabile: boolean
  onCarica: (files: File[]) => void
  onApri: (url: string, titolo: string) => void
  onElimina: (fileIdx: number) => void
}) {
  const inputCamera = useRef<HTMLInputElement>(null)
  const inputFile = useRef<HTMLInputElement>(null)
  const { doc } = props
  const files = leggiFile(doc.file_url)
  const rifiutato = doc.stato === 'rifiutato'

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    props.onCarica(Array.from(e.target.files))
    e.target.value = ''
  }

  const bordo = rifiutato ? '#f0d4d4' : '#e8edf3'
  const bgBollino = rifiutato ? '#fbeaea' : '#e6f1fb'
  const colBollino = rifiutato ? '#c0392b' : '#185FA5'

  return (
    <div style={{ background: '#fff', border: `0.5px solid ${bordo}`, borderRadius: 14, padding: '13px 14px', boxShadow: '0 1px 2px rgba(13,33,68,0.04)' }}>
      <input ref={inputCamera} type="file" accept="image/*" capture="environment" multiple onChange={handle} className="hidden" />
      <input ref={inputFile} type="file" accept="image/*,application/pdf" multiple onChange={handle} className="hidden" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500, fontSize: 15, color: '#0d2144', lineHeight: 1.3 }}>{doc.nome}</span>
            {rifiutato && (
              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 500, color: '#c0392b', background: '#fbeaea', padding: '3px 10px', borderRadius: 20 }}>Da rifare</span>
            )}
          </div>
          {doc.descrizione && !rifiutato && (
            <div style={{ fontSize: 12, color: '#7a8a9a', marginTop: 3, lineHeight: 1.45 }}>{doc.descrizione}</div>
          )}
        </div>

        {props.caricamento ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563eb', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : props.eliminabile ? (
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'flex-start' }}>
            <BollinoAzione etichetta="Scatta" bg={bgBollino} colore={colBollino} onClick={() => inputCamera.current?.click()}>
              <IcoCamera size={18} color={colBollino} />
            </BollinoAzione>
            <BollinoAzione etichetta="File" bg={bgBollino} colore={colBollino} onClick={() => inputFile.current?.click()}>
              <IcoFile size={18} color={colBollino} />
            </BollinoAzione>
          </div>
        ) : null}
      </div>

      {rifiutato && doc.nota_admin && (
        <div style={{ fontSize: 12, color: '#c0392b', marginTop: 9, lineHeight: 1.45, display: 'flex', gap: 6 }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}><IcoAlert size={14} color="#c0392b" /></span><span>{doc.nota_admin}</span>
        </div>
      )}

      {files.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 11 }}>
          {files.map((f, idx) => {
            const url = props.signedMap[f.url] || f.url
            return (
              <div key={idx} style={{ position: 'relative', width: 60, height: 60 }}>
                <button onClick={() => props.onApri(url, doc.nome)} style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', border: '0.5px solid #e2e8f0', background: '#fff', display: 'block' }}>
                  {isPdfUrl(f.nome) || isPdfUrl(f.url) ? (
                    <div style={{ width: '100%', height: '100%', background: '#fbeaea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: '#c0392b' }}>PDF</div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </button>
                {props.eliminabile && (
                  <button onClick={() => props.onElimina(idx)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, background: '#c0392b', color: '#fff', borderRadius: '50%', fontSize: 12, fontWeight: 700, lineHeight: 1, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// RIGA DOCUMENTO GIA' SISTEMATO (compatta)
// ============================================================

function CardSistemato(props: {
  doc: DocChecklist
  signedMap: Record<string, string>
  eliminabile: boolean
  onApri: (url: string, titolo: string) => void
  onElimina: (fileIdx: number) => void
}) {
  const { doc } = props
  const files = leggiFile(doc.file_url)
  const approvato = doc.stato === 'approvato'
  const primo = files[0]
  const url = primo ? (props.signedMap[primo.url] || primo.url) : null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '0.5px solid #e8edf3', borderRadius: 14, background: '#fff', boxShadow: '0 1px 2px rgba(13,33,68,0.04)' }}>
      <span style={{ flexShrink: 0 }}>{approvato ? <IcoCheck size={21} color="#1D9E75" /> : <IcoClock size={21} color="#d99412" />}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: '#0d2144' }}>{doc.nome}</div>
        {!approvato && <div style={{ fontSize: 11, color: '#d99412', marginTop: 1 }}>La stiamo verificando</div>}
      </div>
      {approvato ? (
        <span style={{ fontSize: 11.5, color: '#1D9E75', fontWeight: 500, flexShrink: 0 }}>Approvato</span>
      ) : url ? (
        <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
          <button onClick={() => props.onApri(url, doc.nome)} style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: '0.5px solid #e2e8f0', background: '#f3f5f8', display: 'block' }}>
            {isPdfUrl(primo?.nome) || isPdfUrl(primo?.url) ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, color: '#c0392b' }}>PDF</div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </button>
          {props.eliminabile && (
            <button onClick={() => props.onElimina(0)} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, background: '#c0392b', color: '#fff', borderRadius: '50%', fontSize: 11, fontWeight: 700, lineHeight: 1, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ============================================================
// CARD MODULO PDF (in preparazione)
// ============================================================

function ModuloCard({ doc }: { doc: DocChecklist }) {
  return (
    <div style={{ border: '0.5px solid #e8edf3', borderRadius: 14, padding: 15, background: '#fff', boxShadow: '0 1px 2px rgba(13,33,68,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontWeight: 500, fontSize: 15, color: '#0d2144', lineHeight: 1.3 }}>{doc.nome}</div>
        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 500, color: '#185FA5', background: '#e6f1fb', padding: '3px 10px', borderRadius: 20 }}>Modulo</span>
      </div>
      {doc.descrizione && <div style={{ fontSize: 12, color: '#7a8a9a', marginTop: 4, lineHeight: 1.45 }}>{doc.descrizione}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, background: '#fbf3e3', border: '0.5px solid #f2e2c0', borderRadius: 10, padding: '9px 11px' }}>
        <span style={{ flexShrink: 0 }}><IcoClock size={15} color="#b5820f" /></span>
        <span style={{ fontSize: 11.5, color: '#9a6c0c', fontWeight: 500 }}>Questo modulo sarà disponibile a breve. Ti avviseremo.</span>
      </div>
    </div>
  )
}

// ============================================================
// UPLOAD FOTO VEICOLO (due opzioni visibili, senza popup)
// ============================================================

function UploadFoto({ onUpload }: { onUpload: (files: File[]) => void }) {
  const inputCamera = useRef<HTMLInputElement>(null)
  const inputFile = useRef<HTMLInputElement>(null)
  const [caricando, setCaricando] = useState(false)

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    setCaricando(true)
    await onUpload(Array.from(e.target.files))
    setCaricando(false)
    e.target.value = ''
  }

  return (
    <>
      <input ref={inputCamera} type="file" accept="image/*" capture="environment" multiple onChange={handle} className="hidden" />
      <input ref={inputFile} type="file" accept="image/*,application/pdf" multiple onChange={handle} className="hidden" />
      {caricando ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', border: '0.5px dashed #c9d3df', borderRadius: 12, color: '#2563eb', fontSize: 12.5, fontWeight: 500 }}>
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Caricamento...
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => inputCamera.current?.click()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 0', border: '0.5px dashed #c9d3df', borderRadius: 12, background: '#fbfcfe', color: '#2563eb', fontSize: 12.5, fontWeight: 500 }}>
            <IcoCamera size={15} color="#2563eb" />Scatta foto
          </button>
          <button onClick={() => inputFile.current?.click()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 0', border: '0.5px dashed #c9d3df', borderRadius: 12, background: '#fbfcfe', color: '#2563eb', fontSize: 12.5, fontWeight: 500 }}>
            <IcoFile size={15} color="#2563eb" />Scegli file
          </button>
        </div>
      )}
    </>
  )
}