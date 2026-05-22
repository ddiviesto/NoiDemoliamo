'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Pratica } from './page'

interface Documento {
  id: string
  pratica_id: string
  tipo: string
  url: string
  nome_file: string | null
  verificato: boolean | null
  caricato_il: string
  stato_approvazione?: 'approvato' | 'rifiutato' | 'in_attesa'
  nota_admin?: string | null
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
  /** Notifica al parent quanti documenti/foto sono stati rifiutati e richiedono attenzione */
  onDocRifiutatiCambiati?: (numero: number) => void
}

function documentiRichiesti(p: Pratica): {
  tipo: string
  label: string
  icona: React.ReactNode
  multiplo?: boolean
}[] {
  const lista: { tipo: string; label: string; icona: React.ReactNode; multiplo?: boolean }[] = [
    { tipo: 'carta_identita', label: 'Carta d\'identità (fronte e retro)', icona: <IconaCartaIdentita />, multiplo: true },
    { tipo: 'tessera_sanitaria', label: 'Tessera sanitaria (fronte e retro)', icona: <IconaTesseraSanitaria />, multiplo: true },
  ]
  if (p.libretto === 'si') {
    lista.push({ tipo: 'libretto', label: 'Libretto di circolazione (fronte e retro)', icona: <IconaLibretto />, multiplo: true })
  } else if (p.libretto === 'denuncia') {
    lista.push({ tipo: 'denuncia_libretto', label: 'Denuncia smarrimento libretto', icona: <IconaDocumento /> })
  }
  if (p.certificato_proprieta === 'cartaceo') {
    lista.push({ tipo: 'certificato_proprieta', label: 'Certificato di proprietà', icona: <IconaDocumento /> })
  } else if (p.certificato_proprieta === 'smarrito') {
    lista.push({ tipo: 'denuncia_certificato', label: 'Denuncia smarrimento certificato', icona: <IconaDocumento /> })
  }
  if (p.ruolo_richiedente === 'delegato') {
    lista.push({ tipo: 'delega', label: 'Delega firmata', icona: <IconaDocumento /> })
  }
  if (p.ruolo_richiedente === 'deceduto') {
    if (p.eredita === 'accetta') {
      lista.push({ tipo: 'accettazione_eredita', label: 'Atto accettazione eredità', icona: <IconaDocumento /> })
    } else if (p.eredita === 'rinuncia') {
      lista.push({ tipo: 'rinuncia_eredita', label: 'Atto rinuncia eredità', icona: <IconaDocumento /> })
    }
  }
  return lista
}

// ============================================================
// ICONE SVG
// ============================================================

function IconaCartaIdentita() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#2563eb" strokeWidth="1.8"/>
      <circle cx="9" cy="11" r="2" fill="#2563eb" opacity="0.3"/>
      <path d="M6 16c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="14" y1="10" x2="18" y2="10" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="14" y1="13" x2="18" y2="13" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="14" y1="16" x2="17" y2="16" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconaTesseraSanitaria() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#0891b2" strokeWidth="1.8"/>
      <rect x="6" y="9" width="4" height="4" rx="0.5" fill="#0891b2" opacity="0.25"/>
      <line x1="7.2" y1="11" x2="8.8" y2="11" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="10.2" x2="8" y2="11.8" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="10" x2="18" y2="10" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="13" x2="16" y2="13" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconaLibretto() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="#16a34a" strokeWidth="1.8"/>
      <line x1="8" y1="9" x2="15" y2="9" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="15" y2="12" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="15" x2="13" y2="15" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4 8v12" stroke="#16a34a" strokeWidth="1.8"/>
    </svg>
  )
}

function IconaDocumento() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#6b7280" strokeWidth="1.8"/>
      <polyline points="14 2 14 8 20 8" stroke="#6b7280" strokeWidth="1.8" fill="none"/>
      <line x1="8" y1="13" x2="16" y2="13" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="17" x2="13" y2="17" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

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

// ============================================================

export default function TabDocumenti({ pratica, onDocRifiutatiCambiati }: Props) {
  const [documenti, setDocumenti] = useState<Documento[]>([])
  const [foto, setFoto] = useState<FotoPratica[]>([])
  const [loading, setLoading] = useState(true)
  const [anteprima, setAnteprima] = useState<{ url: string; titolo: string } | null>(null)
  const [caricandoTipo, setCaricandoTipo] = useState<string | null>(null)
  const [caricamentoFoto, setCaricamentoFoto] = useState<{ fatte: number; totale: number } | null>(null)

  useEffect(() => {
    carica()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pratica.id])

  async function carica() {
    setLoading(true)
    const { data: docs } = await supabase
      .from('documenti')
      .select('*')
      .eq('pratica_id', pratica.id)
      .order('caricato_il')

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

    const docsArricchiti: Documento[] = (docs || []).map(d => {
      const appr = mappaApprov.get(d.tipo)
      return {
        ...d,
        stato_approvazione: appr?.stato ?? (d.verificato ? 'approvato' : 'in_attesa'),
        nota_admin: appr?.nota ?? null,
      }
    })

    const fotoArricchite: FotoPratica[] = (fotos || []).map(f => {
      const appr = mappaApprov.get(`foto:${f.id}`)
      return {
        ...f,
        stato_approvazione: appr?.stato ?? 'in_attesa',
        nota_admin: appr?.nota ?? null,
      }
    })

    setDocumenti(docsArricchiti)
    setFoto(fotoArricchite)
    setLoading(false)
  }

  // Notifica il parent: SOLO i documenti/foto rifiutati che richiedono attenzione
  useEffect(() => {
    if (!onDocRifiutatiCambiati) return
    // Conta i TIPI di documento con almeno una riga rifiutata
    const richiesti = documentiRichiesti(pratica)
    const tipiRifiutati = richiesti.filter(r => {
      const righe = documenti.filter(d => d.tipo === r.tipo)
      return righe.some(d => d.stato_approvazione === 'rifiutato')
    }).length
    const fotoRifiutate = foto.filter(f => f.stato_approvazione === 'rifiutato').length
    onDocRifiutatiCambiati(tipiRifiutati + fotoRifiutate)
  }, [documenti, foto, pratica, onDocRifiutatiCambiati])

  async function uploadDocumento(files: File[], tipoDocumento: string) {
    setCaricandoTipo(tipoDocumento)
    try {
      for (const file of files) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${pratica.id}/${tipoDocumento}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: errUpload } = await supabase.storage
          .from('documenti-pratiche')
          .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true })
        if (errUpload) throw errUpload

        const { data: pub } = supabase.storage.from('documenti-pratiche').getPublicUrl(path)
        const url = pub?.publicUrl
        if (!url) throw new Error('URL non disponibile')

        await supabase.from('documenti').insert({
          pratica_id: pratica.id,
          tipo: tipoDocumento,
          url,
          nome_file: file.name,
          verificato: false,
        })
      }
      await supabase
        .from('documenti_approvazione')
        .delete()
        .eq('pratica_id', pratica.id)
        .eq('tipo_documento', tipoDocumento)

      await carica()
    } catch (err) {
      console.error('Errore upload documento:', err)
      alert('Errore nel caricamento. Riprova.')
    }
    setCaricandoTipo(null)
  }

  async function eliminaDocumento(id: string) {
    if (!confirm('Vuoi eliminare questo file?')) return
    await supabase.from('documenti').delete().eq('id', id)
    await carica()
  }

  async function uploadFotoExtra(files: File[]) {
    setCaricamentoFoto({ fatte: 0, totale: files.length })
    let count = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${pratica.id}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: errUpload } = await supabase.storage
          .from('foto-pratiche')
          .upload(path, file, { contentType: file.type || 'image/jpeg' })
        if (errUpload) throw errUpload
        const { data: pub } = supabase.storage.from('foto-pratiche').getPublicUrl(path)
        if (pub?.publicUrl) {
          await supabase.from('foto_pratiche').insert({ pratica_id: pratica.id, url: pub.publicUrl })
          count++
        }
      } catch (err) {
        console.error('Errore upload foto:', err)
      }
      setCaricamentoFoto({ fatte: count, totale: files.length })
    }
    setCaricamentoFoto(null)
    await carica()
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const richiesti = documentiRichiesti(pratica)
  const docCaricati = richiesti.filter(r => documenti.some(d => d.tipo === r.tipo)).length
  const totaleRichiesti = richiesti.length

  return (
    <div className="flex flex-col gap-3">

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-800">Documenti caricati</span>
          <span className="text-xs text-gray-500 font-medium">{docCaricati} / {totaleRichiesti}</span>
        </div>
        <div className="bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all"
            style={{ width: totaleRichiesti > 0 ? `${(docCaricati / totaleRichiesti) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <p className="text-sm font-semibold text-gray-800 mb-1">Documenti richiesti</p>
        <p className="text-xs text-gray-500 mb-3">Carica i documenti per procedere</p>

        <div className="flex flex-col gap-2">
          {richiesti.map(r => {
            const righe = documenti.filter(d => d.tipo === r.tipo)
            return (
              <DocumentoCard
                key={r.tipo}
                righe={righe}
                tipo={r.tipo}
                label={r.label}
                icona={r.icona}
                multiplo={r.multiplo}
                caricamentoInCorso={caricandoTipo === r.tipo}
                onCaricaFile={(files) => uploadDocumento(files, r.tipo)}
                onApri={(url, titolo) => setAnteprima({ url, titolo })}
                onElimina={(id) => eliminaDocumento(id)}
              />
            )
          })}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Foto del veicolo</p>
          <span className="text-xs text-gray-500">{foto.length} foto</span>
        </div>

        {foto.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {foto.map((f, idx) => (
              <FotoCard
                key={f.id}
                foto={f}
                index={idx}
                onApri={() => setAnteprima({ url: f.url, titolo: `Foto ${idx + 1}` })}
              />
            ))}
          </div>
        )}

        {caricamentoFoto && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 flex items-center gap-2.5">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div className="text-xs text-blue-800 font-medium">
              Caricamento foto {caricamentoFoto.fatte}/{caricamentoFoto.totale}...
            </div>
          </div>
        )}

        <UploadFotoExtra onUpload={uploadFotoExtra} disabilitato={!!caricamentoFoto} />

        {foto.some(f => f.stato_approvazione === 'rifiutato') && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-3 flex items-start gap-2">
            <span className="text-base flex-shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-red-800">Alcune foto vanno rifatte</div>
              <div className="text-xs text-red-700 mt-0.5">Tocca le foto con ✗ per ricaricarle</div>
            </div>
          </div>
        )}
      </div>

      {anteprima && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setAnteprima(null)}
        >
          <div className="bg-white rounded-2xl p-3 max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 px-2">
              <p className="font-semibold text-gray-800 text-sm">{anteprima.titolo}</p>
              <button onClick={() => setAnteprima(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={anteprima.url} alt={anteprima.titolo} className="w-full h-auto object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentoCard(props: {
  righe: Documento[]
  tipo: string
  label: string
  icona: React.ReactNode
  multiplo?: boolean
  caricamentoInCorso: boolean
  onCaricaFile: (files: File[]) => void
  onApri: (url: string, titolo: string) => void
  onElimina: (id: string) => void
}) {
  const inputCameraRef = useRef<HTMLInputElement>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    props.onCaricaFile(Array.from(e.target.files))
    e.target.value = ''
  }

  const nessunFile = props.righe.length === 0
  const tuttiApprovati = !nessunFile && props.righe.every(r => r.stato_approvazione === 'approvato')
  const qualcheRifiutato = props.righe.some(r => r.stato_approvazione === 'rifiutato')
  const inAttesa = !nessunFile && !tuttiApprovati && !qualcheRifiutato
  const notaRifiuto = props.righe.find(r => r.stato_approvazione === 'rifiutato')?.nota_admin

  let bg = 'bg-gray-50'
  let border = 'border-gray-200'
  let statusLabel: { text: string; color: string } | null = null
  if (tuttiApprovati) {
    bg = 'bg-green-50'
    border = 'border-green-300'
    statusLabel = { text: '✓ Approvato', color: 'text-green-700' }
  } else if (qualcheRifiutato) {
    bg = 'bg-red-50'
    border = 'border-red-300'
    statusLabel = { text: '✗ Da rifare', color: 'text-red-700' }
  } else if (inAttesa) {
    bg = 'bg-yellow-50'
    border = 'border-yellow-200'
    statusLabel = { text: '⏳ In verifica', color: 'text-yellow-700' }
  }

  return (
    <div className={`${bg} border ${border} rounded-xl p-3`}>
      <div className="flex items-center gap-3 mb-2.5">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
          {props.icona}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 leading-tight">{props.label}</div>
          {statusLabel ? (
            <div className={`text-[11px] mt-0.5 font-semibold ${statusLabel.color}`}>{statusLabel.text}</div>
          ) : (
            <div className="text-[11px] text-gray-500 mt-0.5">Non ancora caricato</div>
          )}
        </div>
      </div>

      {props.righe.length > 0 && (
        <div className="flex gap-2 mb-2.5 flex-wrap">
          {props.righe.map((r, idx) => (
            <FilePill
              key={r.id}
              riga={r}
              numero={props.multiplo ? idx + 1 : null}
              onApri={() => props.onApri(r.url, `${props.label} ${props.multiplo ? `(${idx + 1})` : ''}`)}
              onElimina={() => props.onElimina(r.id)}
              eliminabile={!tuttiApprovati && !inAttesa}
            />
          ))}
        </div>
      )}

      {notaRifiuto && (
        <div className="bg-white rounded-lg p-2.5 mb-2.5 text-[11px] text-red-800 italic leading-relaxed">
          "{notaRifiuto}"
        </div>
      )}

      {props.caricamentoInCorso ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg py-2.5 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-blue-800 font-medium">Caricamento...</span>
        </div>
      ) : (!inAttesa && !tuttiApprovati) || (props.multiplo && !tuttiApprovati) ? (
        <>
          <input ref={inputCameraRef} type="file" accept="image/*" capture="environment" multiple={props.multiplo} onChange={handleFiles} className="hidden" />
          <input ref={inputFileRef} type="file" accept="image/*,application/pdf" multiple={props.multiplo} onChange={handleFiles} className="hidden" />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => inputCameraRef.current?.click()}
              className={`${qualcheRifiutato ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors`}
            >
              <IconaCamera />
              {nessunFile ? 'Scatta foto' : 'Aggiungi'}
            </button>
            <button
              onClick={() => inputFileRef.current?.click()}
              className={`bg-white border-2 ${qualcheRifiutato ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-blue-200 text-blue-700 hover:bg-blue-50'} py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors`}
            >
              <IconaFile />
              Carica file
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

function FilePill(props: {
  riga: Documento
  numero: number | null
  onApri: () => void
  onElimina: () => void
  eliminabile: boolean
}) {
  const isImg = props.riga.url.match(/\.(jpg|jpeg|png|webp|gif)$/i)
  return (
    <div className="relative group">
      <button
        onClick={props.onApri}
        className="bg-white border border-gray-300 rounded-lg overflow-hidden flex items-center gap-2 px-2 py-1.5 hover:border-blue-400 transition-colors"
      >
        {isImg ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={props.riga.url} alt="" className="w-8 h-8 object-cover rounded" />
        ) : (
          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-500 font-bold">
            PDF
          </div>
        )}
        <span className="text-xs text-gray-700 font-medium">
          {props.numero ? `File ${props.numero}` : 'File'}
        </span>
      </button>
      {props.eliminabile && (
        <button
          onClick={props.onElimina}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center shadow-md"
          title="Elimina"
        >
          ×
        </button>
      )}
    </div>
  )
}

function UploadFotoExtra({ onUpload, disabilitato }: { onUpload: (files: File[]) => void; disabilitato: boolean }) {
  const inputCameraRef = useRef<HTMLInputElement>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    onUpload(Array.from(e.target.files))
    e.target.value = ''
  }

  return (
    <>
      <input ref={inputCameraRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFiles} className="hidden" />
      <input ref={inputFileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => inputCameraRef.current?.click()}
          disabled={disabilitato}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
        >
          <IconaCamera />
          Scatta foto
        </button>
        <button
          onClick={() => inputFileRef.current?.click()}
          disabled={disabilitato}
          className="bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
        >
          <IconaFile />
          Carica file
        </button>
      </div>
    </>
  )
}

function FotoCard(props: { foto: FotoPratica; index: number; onApri: () => void }) {
  const isApprovato = props.foto.stato_approvazione === 'approvato'
  const isRifiutato = props.foto.stato_approvazione === 'rifiutato'

  const bordo = isApprovato ? 'border-green-400' : isRifiutato ? 'border-red-400' : 'border-gray-200'
  const badgeBg = isApprovato ? 'bg-green-500' : isRifiutato ? 'bg-red-500' : 'bg-gray-400'
  const badgeIcon = isApprovato ? '✓' : isRifiutato ? '✗' : '•'

  return (
    <button
      onClick={props.onApri}
      className={`aspect-square rounded-xl overflow-hidden border-2 ${bordo} relative bg-gray-100`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={props.foto.url} alt={`Foto ${props.index + 1}`} className="w-full h-full object-cover" />
      <span className={`absolute bottom-1.5 left-1.5 w-5 h-5 ${badgeBg} text-white text-[11px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm`}>
        {badgeIcon}
      </span>
    </button>
  )
}