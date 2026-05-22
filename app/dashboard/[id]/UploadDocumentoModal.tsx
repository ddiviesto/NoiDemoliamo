'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  praticaId: string
  /**
   * Tipo del documento da caricare.
   * Per i documenti "ufficiali" (libretto, certificato_proprieta, ecc.) usiamo il valore in `tipo`
   * della tabella `documenti`. Per le foto extra del veicolo passare 'foto_extra'.
   */
  tipoDocumento: string
  label: string
  onClose: () => void
  onCaricato: () => void
}

export default function UploadDocumentoModal({ praticaId, tipoDocumento, label, onClose, onCaricato }: Props) {
  const [caricamento, setCaricamento] = useState<{ fatte: number; totale: number } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const inputCameraRef = useRef<HTMLInputElement>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)

  const isFotoExtra = tipoDocumento === 'foto_extra'

  // Quando il cliente seleziona uno o più file
  async function gestisciFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files)
    await caricaFile(files)
  }

  async function caricaFile(files: File[]) {
    setErrore(null)
    setCaricamento({ fatte: 0, totale: files.length })

    let nuovaCaricata = 0
    for (const file of files) {
      const ok = isFotoExtra
        ? await caricaUnaFoto(file, nuovaCaricata)
        : await caricaUnDocumento(file)
      if (ok) nuovaCaricata++
      setCaricamento({ fatte: nuovaCaricata, totale: files.length })
    }
    setCaricamento(null)
    if (nuovaCaricata > 0) {
      onCaricato()
    } else {
      setErrore('Non è stato possibile caricare il file. Riprova.')
    }
  }

  // FOTO EXTRA: vanno in bucket `foto-pratiche` + tabella `foto_pratiche`
  async function caricaUnaFoto(file: File, indice: number): Promise<boolean> {
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${praticaId}/${Date.now()}-${indice}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: errUpload } = await supabase.storage
        .from('foto-pratiche')
        .upload(path, file, { contentType: file.type || 'image/jpeg' })
      if (errUpload) throw errUpload

      const { data: pub } = supabase.storage.from('foto-pratiche').getPublicUrl(path)
      const url = pub?.publicUrl
      if (!url) throw new Error('URL non disponibile')

      const { error: errInsert } = await supabase.from('foto_pratiche').insert({
        pratica_id: praticaId,
        url,
      })
      if (errInsert) throw errInsert
      return true
    } catch (err) {
      console.error('Errore upload foto:', err)
      return false
    }
  }

  // DOCUMENTI UFFICIALI: bucket `documenti-pratiche` (privato) + tabella `documenti`
  async function caricaUnDocumento(file: File): Promise<boolean> {
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${praticaId}/${tipoDocumento}-${Date.now()}.${ext}`
      const { error: errUpload } = await supabase.storage
        .from('documenti-pratiche')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true })
      if (errUpload) throw errUpload

      // Per bucket privati usiamo il path interno come "url" (sarà servito tramite signed URL all'admin
      // quando dovrà aprire il documento). Qui salviamo getPublicUrl per ora per semplicità di visualizzazione.
      const { data: pub } = supabase.storage.from('documenti-pratiche').getPublicUrl(path)
      const url = pub?.publicUrl
      if (!url) throw new Error('URL non disponibile')

      // Se esiste già un documento dello stesso tipo per questa pratica, lo aggiorniamo (ricarica)
      const { data: esistente } = await supabase
        .from('documenti')
        .select('id')
        .eq('pratica_id', praticaId)
        .eq('tipo', tipoDocumento)
        .maybeSingle()

      if (esistente) {
        // Aggiorna riga esistente
        await supabase
          .from('documenti')
          .update({
            url,
            nome_file: file.name,
            verificato: false,
            caricato_il: new Date().toISOString(),
          })
          .eq('id', esistente.id)
        // Resetta l'eventuale stato di approvazione
        await supabase
          .from('documenti_approvazione')
          .delete()
          .eq('pratica_id', praticaId)
          .eq('tipo_documento', tipoDocumento)
      } else {
        await supabase.from('documenti').insert({
          pratica_id: praticaId,
          tipo: tipoDocumento,
          url,
          nome_file: file.name,
          verificato: false,
        })
      }
      return true
    } catch (err) {
      console.error('Errore upload documento:', err)
      return false
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      {/* Overlay scuro */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Bottom sheet */}
      <div
        className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl p-5 sm:p-6 z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="text-center mb-5">
          <p className="text-base font-bold text-gray-900 mb-1">Carica {label}</p>
          <p className="text-xs text-gray-500">Scegli come caricare</p>
        </div>

        {/* Stato caricamento */}
        {caricamento && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 flex items-center gap-2.5">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div className="text-xs text-blue-800 font-medium">
              Caricamento... {caricamento.fatte}/{caricamento.totale}
            </div>
          </div>
        )}

        {/* Errore */}
        {errore && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-xs text-red-700">
            ⚠️ {errore}
          </div>
        )}

        {/* Input nascosti */}
        <input
          ref={inputCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple={isFotoExtra}
          onChange={gestisciFile}
          className="hidden"
        />
        <input
          ref={inputFileRef}
          type="file"
          accept={isFotoExtra ? 'image/*' : 'image/*,application/pdf'}
          multiple={isFotoExtra}
          onChange={gestisciFile}
          className="hidden"
        />

        {/* Opzioni */}
        <div className="flex flex-col gap-2.5 mb-3">
          {/* Scatta foto */}
          <button
            onClick={() => inputCameraRef.current?.click()}
            disabled={!!caricamento}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl flex items-center gap-3.5 text-left disabled:opacity-50 transition-colors"
          >
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              📷
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Scatta una foto</div>
              <div className="text-xs opacity-85 mt-0.5">Usa la fotocamera</div>
            </div>
            <span className="text-lg opacity-70">›</span>
          </button>

          {/* Carica file */}
          <button
            onClick={() => inputFileRef.current?.click()}
            disabled={!!caricamento}
            className="bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-900 p-4 rounded-2xl flex items-center gap-3.5 text-left disabled:opacity-50 transition-colors"
          >
            <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              📁
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Carica un file</div>
              <div className="text-xs text-gray-500 mt-0.5">Dalla galleria o dai file</div>
            </div>
            <span className="text-lg text-gray-400">›</span>
          </button>
        </div>

        {/* Annulla */}
        <button
          onClick={onClose}
          disabled={!!caricamento}
          className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium py-3 disabled:opacity-50"
        >
          Annulla
        </button>
      </div>
    </div>
  )
}