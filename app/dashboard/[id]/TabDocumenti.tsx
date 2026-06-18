'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Pratica } from './page'

// ============================================================
// TIPI
// ============================================================

/** Una riga della checklist, già unita ai dati del catalogo */
interface DocChecklist {
  // dalla checklist
  id: string
  pratica_id: string
  documento_id: string
  indice_erede: number | null
  stato: 'da_fare' | 'caricato' | 'approvato' | 'rifiutato'
  file_url: string | null
  scaricato_il: string | null
  caricato_il: string | null
  nota_admin: string | null
  // dal catalogo
  codice: string
  nome: string
  descrizione: string | null
  richiede_upload: boolean
  richiede_consegna: boolean
  template_pdf: string | null
  per_erede: boolean
  ordine: number
}

/** Un singolo file caricato per un documento (più file = fronte+retro, pagine...) */
interface FileCaricato {
  url: string
  nome: string
  signed?: string | null
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

function isImageUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /\.(jpg|jpeg|png|webp|gif|heic)($|\?)/i.test(url)
}

/** Legge il campo file_url (che contiene un JSON array) in modo sicuro */
function leggiFile(fileUrl: string | null): FileCaricato[] {
  if (!fileUrl) return []
  try {
    const parsed = JSON.parse(fileUrl)
    if (Array.isArray(parsed)) return parsed as FileCaricato[]
    return []
  } catch {
    // Retrocompatibilità: se fosse un singolo URL semplice
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

function troncaNomeFile(nome: string | null, max = 14): string {
  if (!nome) return 'File'
  if (nome.length <= max) return nome
  const punto = nome.lastIndexOf('.')
  if (punto > 0 && punto > nome.length - 6) {
    const ext = nome.substring(punto)
    const base = nome.substring(0, max - ext.length - 1)
    return `${base}…${ext}`
  }
  return nome.substring(0, max - 1) + '…'
}

// ============================================================
// ICONE
// ============================================================

function IconaCamera() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function IconaFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function IconaDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function IconaSpunta({ size = 12, color = '#15803d' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconaOrologio({ size = 12, color = '#854d0e' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 15 14"/>
    </svg>
  )
}

function IconaWarning({ size = 12, color = '#b91c1c' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="8" x2="12" y2="13"/>
      <line x1="12" y1="16.5" x2="12" y2="16.5"/>
    </svg>
  )
}

function IconaChevron({ aperto }: { aperto: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: aperto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
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

    // 1a. Leggi la checklist della pratica
    const { data: righe } = await supabase
      .from('pratica_documenti_checklist')
      .select('*')
      .eq('pratica_id', pratica.id)

    // 1b. Leggi dal catalogo solo i documenti che servono
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

    // 1c. Unisci checklist + catalogo
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

    // 2. Genera signed URL per tutti i file
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

    // 3. Foto veicolo
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

    const fotoArricchite: FotoPratica[] = (fotos || []).map(f => {
      const appr = mappaApprov.get(`foto:${f.id}`)
      return { ...f, stato_approvazione: appr?.stato ?? 'in_attesa', nota_admin: appr?.nota ?? null }
    })

    setDocs(lista)
    setFoto(fotoArricchite)
    setLoading(false)
  }

  // Notifica al parent quanti documenti rifiutati
  useEffect(() => {
    if (!onDocRifiutatiCambiati) return
    const n = docs.filter(d => d.stato === 'rifiutato').length
    onDocRifiutatiCambiati(n)
  }, [docs, onDocRifiutatiCambiati])

  // ---------- UPLOAD ----------
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

  // ---------- ELIMINA SINGOLO FILE ----------
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

  // ---------- FOTO VEICOLO ----------
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

  // ---------- RAGGRUPPAMENTI ----------
  const sistemati = docs.filter(d => d.stato === 'caricato' || d.stato === 'approvato')
  const daFare = docs.filter(d => d.stato === 'da_fare' || d.stato === 'rifiutato')

  // Dei "da fare", separo generali / moduli / per erede
  const daFareGenerali = daFare.filter(d => !d.per_erede && !d.template_pdf)
  const daFareModuli = daFare.filter(d => !d.per_erede && d.template_pdf)
  const daFareEredi = daFare.filter(d => d.per_erede)

  // Indici eredi presenti tra i "da fare"
  const indiciEredi = Array.from(new Set(daFareEredi.map(d => d.indice_erede ?? 0))).sort((a, b) => a - b)

  // Documenti da consegnare al ritiro (di tutta la pratica)
  const daConsegnare = docs.filter(d => d.richiede_consegna)

  const totale = docs.length
  const pronti = sistemati.length
  const percentuale = totale > 0 ? Math.round((pronti / totale) * 100) : 0
  const tuttoApprovato = totale > 0 && docs.every(d => d.stato === 'approvato')

  return (
    <div className="flex flex-col gap-3">

      {/* ====== CARD DI STATO ====== */}
      {tuttoApprovato ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
          <div className="mx-auto mb-3 bg-green-600 rounded-full flex items-center justify-center" style={{ width: 52, height: 52 }}>
            <IconaSpunta size={30} color="#ffffff" />
          </div>
          <p className="font-semibold text-green-800 text-base">Sei pronto per il ritiro!</p>
          <p className="text-xs text-green-700 mt-1 leading-relaxed">Tutti i documenti sono stati approvati. Ottimo lavoro.</p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#0d2144] text-[15px]">
                {pronti === 0 ? 'Iniziamo!' : 'Stai andando bene!'}
              </p>
              <p className="text-xs text-blue-900/70 mt-0.5">
                {daFare.length === 0 ? 'Documenti inviati, in attesa di verifica' : `Ti restano ${daFare.length} ${daFare.length === 1 ? 'documento' : 'documenti'} da preparare`}
              </p>
            </div>
          </div>
          <div className="bg-blue-100 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${percentuale}%` }} />
          </div>
        </div>
      )}

      {/* ====== DA PREPARARE: GENERALI ====== */}
      {(daFareGenerali.length > 0 || daFareModuli.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-800 mb-1">Da preparare</p>
          <p className="text-xs text-gray-500 mb-3">Puoi scattare una foto o caricare un file.</p>
          <div className="flex flex-col gap-2.5">
            {daFareGenerali.map(d => (
              <DocCard
                key={d.id}
                doc={d}
                signedMap={signedMap}
                caricamento={caricandoId === d.id}
                eliminabile={puoEliminare}
                onCarica={(files) => caricaFile(d, files)}
                onApri={(url, titolo) => setAnteprima({ url, titolo })}
                onElimina={(idx) => setConfermaElimina({ doc: d, fileIdx: idx })}
              />
            ))}
            {daFareModuli.map(d => (
              <ModuloCard key={d.id} doc={d} />
            ))}
          </div>
        </div>
      )}

      {/* ====== DA PREPARARE: PER EREDE ====== */}
      {indiciEredi.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">Documenti per ogni erede</p>
          <div className="flex flex-col gap-2.5">
            {indiciEredi.map(idx => {
              const docsErede = daFareEredi.filter(d => (d.indice_erede ?? 0) === idx)
              const aperto = erediAperti[idx] ?? (indiciEredi.length === 1)
              return (
                <div key={idx} className="border border-blue-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setErediAperti(s => ({ ...s, [idx]: !aperto }))}
                    className="w-full flex items-center gap-3 p-3 bg-blue-50/60"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm flex items-center justify-center flex-shrink-0">{idx}</div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-sm text-[#0d2144]">{ordinaleErede(idx)} erede</div>
                      <div className="text-[11px] text-blue-900/60 mt-0.5">{docsErede.length} {docsErede.length === 1 ? 'documento' : 'documenti'}</div>
                    </div>
                    <IconaChevron aperto={aperto} />
                  </button>
                  {aperto && (
                    <div className="p-3 flex flex-col gap-2.5">
                      {docsErede.map(d => (
                        <DocCard
                          key={d.id}
                          doc={d}
                          signedMap={signedMap}
                          caricamento={caricandoId === d.id}
                          eliminabile={puoEliminare}
                          onCarica={(files) => caricaFile(d, files)}
                          onApri={(url, titolo) => setAnteprima({ url, titolo })}
                          onElimina={(i) => setConfermaElimina({ doc: d, fileIdx: i })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ====== GIA' SISTEMATI (comprimibile) ====== */}
      {sistemati.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setSistematiAperti(a => !a)}
            className="w-full flex items-center gap-3 p-4"
          >
            <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <IconaSpunta size={18} color="#16a34a" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-medium text-sm text-gray-800">
                {sistemati.length} {sistemati.length === 1 ? 'documento sistemato' : 'documenti sistemati'}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {contaPerStato(sistemati)}
              </div>
            </div>
            <IconaChevron aperto={sistematiAperti} />
          </button>
          {sistematiAperti && (
            <div className="px-4 pb-4 flex flex-col gap-2.5">
              {sistemati.map(d => (
                <DocCard
                  key={d.id}
                  doc={d}
                  signedMap={signedMap}
                  caricamento={caricandoId === d.id}
                  eliminabile={puoEliminare}
                  onCarica={(files) => caricaFile(d, files)}
                  onApri={(url, titolo) => setAnteprima({ url, titolo })}
                  onElimina={(idx) => setConfermaElimina({ doc: d, fileIdx: idx })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====== DA PORTARE AL RITIRO ====== */}
      {daConsegnare.length > 0 && (
        <div className="bg-[#0d2144] rounded-2xl p-4">
          <button onClick={() => setRitiroAperto(a => !a)} className="w-full flex items-center gap-2.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <span className="text-white font-semibold text-sm flex-1 text-left">Da portare al ritiro</span>
            <span style={{ transform: ritiroAperto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9db4d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
          </button>
          {!ritiroAperto && (
            <p className="text-[#acc3e0] text-xs mt-2 leading-relaxed">
              {daConsegnare.length} originali da consegnare al demolitore. Tocca per la lista.
            </p>
          )}
          {ritiroAperto && (
            <div className="mt-3">
              <p className="text-[#acc3e0] text-xs mb-2 leading-relaxed">Il giorno del ritiro consegna questi originali al demolitore:</p>
              <div className="text-[13px] text-white">
                {daConsegnare.map((d, i) => (
                  <div key={d.id} className={`flex items-center gap-2.5 py-1.5 ${i < daConsegnare.length - 1 ? 'border-b border-[#25395a]' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5dca9e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="12" cy="12" r="9"/><polyline points="9 12 11.5 14.5 16 9.5"/></svg>
                    <span>{nomeRitiro(d)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== FOTO DEL VEICOLO ====== */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Foto del veicolo</p>
          <span className="text-xs text-gray-500">{foto.length} file</span>
        </div>
        {foto.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {foto.map((f, idx) => (
              <button
                key={f.id}
                onClick={() => setAnteprima({ url: f.url, titolo: `Foto ${idx + 1}` })}
                className="w-full aspect-square rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100"
              >
                {isPdfUrl(f.url) ? (
                  <div className="w-full h-full bg-red-50 flex items-center justify-center text-[10px] font-bold text-red-600">PDF</div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={f.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
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
// FUNZIONI DI SUPPORTO TESTUALE
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

/** Nome del documento nella lista "da portare al ritiro", con eventuale numero erede */
function nomeRitiro(d: DocChecklist): string {
  if (d.per_erede && d.indice_erede) return `${d.nome} (${ordinaleErede(d.indice_erede).toLowerCase()} erede)`
  return d.nome
}

// ============================================================
// CARD DOCUMENTO (upload foto/file)
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

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    props.onCarica(Array.from(e.target.files))
    e.target.value = ''
  }

  const approvato = doc.stato === 'approvato'
  const rifiutato = doc.stato === 'rifiutato'
  const inVerifica = doc.stato === 'caricato'

  let bordo = 'border-gray-200'
  if (approvato) bordo = 'border-green-200'
  else if (rifiutato) bordo = 'border-red-200'

  const sfondo = rifiutato ? 'bg-red-50/40' : 'bg-white'
  const mostraPulsanti = !approvato && props.eliminabile

  return (
    <div className={`${sfondo} border ${bordo} rounded-xl p-3`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-sm font-medium text-gray-800 leading-tight flex-1">{doc.nome}</div>
        {approvato && <BadgeStato stato="approvato" />}
        {inVerifica && <BadgeStato stato="in_attesa" />}
        {rifiutato && <BadgeStato stato="rifiutato" />}
      </div>
      {doc.descrizione && <div className="text-[11px] text-gray-500 leading-snug mb-2">{doc.descrizione}</div>}

      {/* Miniature dei file caricati */}
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2.5">
          {files.map((f, idx) => {
            const url = props.signedMap[f.url] || f.url
            return (
              <div key={idx} className="relative w-16 h-16">
                <button onClick={() => props.onApri(url, doc.nome)} className="w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200 bg-white block">
                  {isPdfUrl(f.nome) || isPdfUrl(f.url) ? (
                    <div className="w-full h-full bg-red-50 flex items-center justify-center text-[9px] font-bold text-red-600">PDF</div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
                {mostraPulsanti && (
                  <button onClick={() => props.onElimina(idx)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow font-bold leading-none">×</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Nota del rifiuto */}
      {rifiutato && doc.nota_admin && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 mb-2.5 text-[11px] text-red-800 leading-relaxed">
          <IconaWarning size={12} color="#b91c1c" /> {doc.nota_admin}
        </div>
      )}

      {/* Pulsanti caricamento */}
      {props.caricamento ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg py-2.5 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-blue-800 font-medium">Caricamento...</span>
        </div>
      ) : mostraPulsanti ? (
        <>
          <input ref={inputCamera} type="file" accept="image/*" capture="environment" multiple onChange={handle} className="hidden" />
          <input ref={inputFile} type="file" accept="image/*,application/pdf" multiple onChange={handle} className="hidden" />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => inputCamera.current?.click()} className={`${rifiutato ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5`}>
              <IconaCamera />{files.length === 0 ? 'Scatta foto' : 'Aggiungi'}
            </button>
            <button onClick={() => inputFile.current?.click()} className={`bg-white border-2 ${rifiutato ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-blue-200 text-blue-700 hover:bg-blue-50'} py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5`}>
              <IconaFile />Carica file
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

// ============================================================
// CARD MODULO PDF (in preparazione per ora)
// ============================================================

function ModuloCard({ doc }: { doc: DocChecklist }) {
  return (
    <div className="bg-white border border-blue-100 rounded-xl p-3">
      <div className="flex items-start gap-2 mb-1">
        <div className="text-sm font-medium text-gray-800 leading-tight flex-1">{doc.nome}</div>
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none flex-shrink-0">
          Modulo
        </span>
      </div>
      {doc.descrizione && <div className="text-[11px] text-gray-500 leading-snug mb-2.5">{doc.descrizione}</div>}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2">
        <IconaOrologio size={14} color="#854d0e" />
        <span className="text-[11px] text-amber-800 font-medium">Questo modulo sarà disponibile a breve. Ti avviseremo.</span>
      </div>
    </div>
  )
}

// ============================================================
// BADGE STATO
// ============================================================

function BadgeStato({ stato }: { stato: 'approvato' | 'rifiutato' | 'in_attesa' }) {
  if (stato === 'approvato') {
    return (
      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none flex-shrink-0">
        <IconaSpunta size={11} color="#15803d" />Approvato
      </span>
    )
  }
  if (stato === 'rifiutato') {
    return (
      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none flex-shrink-0">
        <IconaWarning size={11} color="#b91c1c" />Da rifare
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none flex-shrink-0">
      <IconaOrologio size={11} color="#854d0e" />In verifica
    </span>
  )
}

// ============================================================
// UPLOAD FOTO VEICOLO
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl py-2.5 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-blue-800 font-medium">Caricamento...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => inputCamera.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5">
            <IconaCamera />Scatta foto
          </button>
          <button onClick={() => inputFile.current?.click()} className="bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5">
            <IconaFile />Carica file
          </button>
        </div>
      )}
    </>
  )
}