'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================
// TIPI
// ============================================================

interface Documento {
  id: string
  tipo: string
  url: string
  nome_file?: string | null
  verificato: boolean | null
  caricato_il: string
  stato_approvazione?: 'approvato' | 'rifiutato' | 'in_attesa'
  nota_admin?: string | null
}

interface FotoPratica {
  id: string
  url: string
  caricato_il: string
  stato_approvazione?: 'approvato' | 'rifiutato' | 'in_attesa'
  nota_admin?: string | null
}

interface Props {
  praticaId: string
  onStatoCambiato?: (tuttiApprovati: boolean, totale: number, approvati: number) => void
}

const ETICHETTE_DOCUMENTI: Record<string, { label: string; icona: string }> = {
  libretto: { label: 'Libretto', icona: '📄' },
  certificato_proprieta: { label: 'Cert. proprietà', icona: '📜' },
  carta_identita: { label: 'Carta identità', icona: '🪪' },
  delega: { label: 'Delega', icona: '✍️' },
  eredita: { label: 'Eredità', icona: '⚖️' },
}

function etichettaDoc(tipo: string): { label: string; icona: string } {
  return ETICHETTE_DOCUMENTI[tipo] || { label: tipo, icona: '📎' }
}

// ============================================================
// COMPONENTE
// ============================================================

export default function DocumentiApprovazione({ praticaId, onStatoCambiato }: Props) {
  const [documenti, setDocumenti] = useState<Documento[]>([])
  const [foto, setFoto] = useState<FotoPratica[]>([])
  const [loading, setLoading] = useState(true)
  const [anteprima, setAnteprima] = useState<{ url: string; titolo: string } | null>(null)
  const [modalRifiuto, setModalRifiuto] = useState<{
    tipoEntita: 'documento' | 'foto'
    id: string
    titolo: string
    notaIniziale?: string
  } | null>(null)
  const [notaRifiuto, setNotaRifiuto] = useState('')

  // Ref al callback aggiornato (per evitare di averlo nelle dipendenze dell'useEffect)
  const onStatoCambiatoRef = useRef(onStatoCambiato)
  useEffect(() => { onStatoCambiatoRef.current = onStatoCambiato }, [onStatoCambiato])

  // Effetto: ogni volta che cambia lo stato dei documenti/foto, notifica il padre
  // (chiamato in useEffect e non durante il rendering, così React è felice)
  useEffect(() => {
    const totale = documenti.length + foto.length
    const approvati = documenti.filter(d => d.stato_approvazione === 'approvato').length
                    + foto.filter(f => f.stato_approvazione === 'approvato').length
    const tuttiApprovati = totale > 0 && approvati === totale
    onStatoCambiatoRef.current?.(tuttiApprovati, totale, approvati)
  }, [documenti, foto])

  // -----------------------------
  // CARICAMENTO
  // -----------------------------
  useEffect(() => {
    carica()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [praticaId])

  async function carica() {
    setLoading(true)
    const { data: docs } = await supabase
      .from('documenti')
      .select('*')
      .eq('pratica_id', praticaId)
      .order('tipo')

    const { data: fotos } = await supabase
      .from('foto_pratiche')
      .select('*')
      .eq('pratica_id', praticaId)
      .order('caricato_il')

    const { data: approvazioni } = await supabase
      .from('documenti_approvazione')
      .select('*')
      .eq('pratica_id', praticaId)

    const mappaApprovazioni = new Map<string, { stato: 'approvato' | 'rifiutato' | 'in_attesa'; nota: string | null }>()
    for (const a of approvazioni || []) {
      mappaApprovazioni.set(a.tipo_documento, { stato: a.stato, nota: a.nota_admin })
    }

    const documentiArricchiti: Documento[] = (docs || []).map(d => {
      const appr = mappaApprovazioni.get(d.tipo)
      return {
        ...d,
        stato_approvazione: appr?.stato ?? (d.verificato ? 'approvato' : 'in_attesa'),
        nota_admin: appr?.nota ?? null,
      }
    })

    const fotoArricchite: FotoPratica[] = (fotos || []).map(f => {
      const appr = mappaApprovazioni.get(`foto:${f.id}`)
      return {
        ...f,
        stato_approvazione: appr?.stato ?? 'in_attesa',
        nota_admin: appr?.nota ?? null,
      }
    })

    setDocumenti(documentiArricchiti)
    setFoto(fotoArricchite)
    setLoading(false)
  }

  // -----------------------------
  // AZIONI
  // -----------------------------

  async function salvaStato(
    tipoEntita: 'documento' | 'foto',
    id: string,
    chiaveApprovazione: string,
    stato: 'approvato' | 'rifiutato',
    nota: string | null = null
  ) {
    const { error: errAppr } = await supabase
      .from('documenti_approvazione')
      .upsert({
        pratica_id: praticaId,
        tipo_documento: chiaveApprovazione,
        stato,
        nota_admin: nota,
        aggiornato_il: new Date().toISOString(),
      }, { onConflict: 'pratica_id,tipo_documento' })
    if (errAppr) {
      console.error('Errore upsert documenti_approvazione:', errAppr)
      alert('Errore durante il salvataggio. Riprova.')
      return
    }

    if (tipoEntita === 'documento') {
      await supabase
        .from('documenti')
        .update({ verificato: stato === 'approvato' })
        .eq('id', id)
    }

    if (tipoEntita === 'documento') {
      setDocumenti(prev => prev.map(d => d.id === id ? { ...d, stato_approvazione: stato, nota_admin: nota } : d))
    } else {
      setFoto(prev => prev.map(f => f.id === id ? { ...f, stato_approvazione: stato, nota_admin: nota } : f))
    }
  }

  function clickApprova(tipoEntita: 'documento' | 'foto', id: string, chiave: string) {
    salvaStato(tipoEntita, id, chiave, 'approvato', null)
  }

  function clickRifiuta(tipoEntita: 'documento' | 'foto', id: string, titolo: string, notaIniziale?: string) {
    setNotaRifiuto(notaIniziale || '')
    setModalRifiuto({ tipoEntita, id, titolo, notaIniziale })
  }

  async function confermaRifiuto() {
    if (!modalRifiuto) return
    if (!notaRifiuto.trim()) {
      alert('Scrivi una nota per spiegare al cliente cosa rifare.')
      return
    }
    const chiave = modalRifiuto.tipoEntita === 'documento'
      ? documenti.find(d => d.id === modalRifiuto.id)?.tipo ?? modalRifiuto.id
      : `foto:${modalRifiuto.id}`
    await salvaStato(modalRifiuto.tipoEntita, modalRifiuto.id, chiave, 'rifiutato', notaRifiuto.trim())
    setModalRifiuto(null)
    setNotaRifiuto('')
  }

  // -----------------------------
  // RENDER
  // -----------------------------

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totaleElementi = documenti.length + foto.length
  const approvatiCount = documenti.filter(d => d.stato_approvazione === 'approvato').length
                       + foto.filter(f => f.stato_approvazione === 'approvato').length

  if (totaleElementi === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <p className="text-sm text-gray-400">Il cliente non ha ancora caricato documenti o foto.</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-gray-800">📁 Step 1 · Documenti e foto caricate</p>
            <p className="text-xs text-gray-400 mt-0.5">Approva o rifiuta ognuno · {approvatiCount}/{totaleElementi} approvati</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {documenti.map(doc => {
            const { label, icona } = etichettaDoc(doc.tipo)
            return (
              <Card
                key={`doc-${doc.id}`}
                titolo={label}
                icona={icona}
                url={doc.url}
                stato={doc.stato_approvazione ?? 'in_attesa'}
                nota={doc.nota_admin}
                onApri={() => setAnteprima({ url: doc.url, titolo: label })}
                onApprova={() => clickApprova('documento', doc.id, doc.tipo)}
                onRifiuta={() => clickRifiuta('documento', doc.id, label, doc.nota_admin ?? '')}
              />
            )
          })}

          {foto.map((f, idx) => (
            <Card
              key={`foto-${f.id}`}
              titolo={`Foto ${idx + 1}`}
              icona="📷"
              url={f.url}
              stato={f.stato_approvazione ?? 'in_attesa'}
              nota={f.nota_admin}
              onApri={() => setAnteprima({ url: f.url, titolo: `Foto ${idx + 1}` })}
              onApprova={() => clickApprova('foto', f.id, `foto:${f.id}`)}
              onRifiuta={() => clickRifiuta('foto', f.id, `Foto ${idx + 1}`, f.nota_admin ?? '')}
            />
          ))}
        </div>
      </div>

      {/* ANTEPRIMA INGRANDITA */}
      {anteprima && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setAnteprima(null)}
        >
          <div className="bg-white rounded-2xl p-4 max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <p className="font-semibold text-gray-800">{anteprima.titolo}</p>
              <button onClick={() => setAnteprima(null)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={anteprima.url} alt={anteprima.titolo} className="w-full h-auto object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTA RIFIUTO */}
      {modalRifiuto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <p className="font-semibold text-gray-800 mb-2">Rifiuta: {modalRifiuto.titolo}</p>
            <p className="text-xs text-gray-500 mb-3">Scrivi al cliente cosa rifare (es. "foto sfocata, rifala con buona luce")</p>
            <textarea
              value={notaRifiuto}
              onChange={e => setNotaRifiuto(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Scrivi la nota qui..."
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => { setModalRifiuto(null); setNotaRifiuto('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Annulla
              </button>
              <button
                onClick={confermaRifiuto}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl"
              >
                Conferma rifiuto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================
// SOTTOCOMPONENTE CARD (un documento o una foto)
// ============================================================

function Card(props: {
  titolo: string
  icona: string
  url: string
  stato: 'approvato' | 'rifiutato' | 'in_attesa'
  nota?: string | null
  onApri: () => void
  onApprova: () => void
  onRifiuta: () => void
}) {
  const isApprovato = props.stato === 'approvato'
  const isRifiutato = props.stato === 'rifiutato'
  const bgClass = isApprovato
    ? 'bg-green-50 border-green-300'
    : isRifiutato
    ? 'bg-red-50 border-red-300'
    : 'bg-gray-50 border-gray-200'

  return (
    <div className={`border rounded-xl p-2.5 flex flex-col gap-2 ${bgClass}`}>
      <button
        onClick={props.onApri}
        className="aspect-square bg-white rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={props.url}
          alt={props.titolo}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
            ;((e.target as HTMLImageElement).parentNode as HTMLElement).innerHTML += `<div class="text-3xl">${props.icona}</div><div class="text-[11px] text-gray-500 mt-1">${props.titolo}</div>`
          }}
        />
      </button>
      <p className="text-xs text-center text-gray-600 font-medium">{props.titolo}</p>

      {isApprovato && (
        <div className="flex items-center justify-center gap-1 text-xs font-semibold text-green-700">
          ✓ Approvato
        </div>
      )}
      {isRifiutato && (
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-xs font-semibold text-red-700">✗ Da rifare</div>
          {props.nota && (
            <p className="text-[10px] text-red-700 text-center italic line-clamp-2">"{props.nota}"</p>
          )}
        </div>
      )}
      {props.stato === 'in_attesa' && (
        <div className="flex gap-1">
          <button
            onClick={props.onApprova}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 rounded-md text-xs font-bold"
            title="Approva"
          >
            ✓
          </button>
          <button
            onClick={props.onRifiuta}
            className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-300 py-1 rounded-md text-xs font-bold"
            title="Rifiuta"
          >
            ✗
          </button>
        </div>
      )}

      {(isApprovato || isRifiutato) && (
        <button
          onClick={() => {
            if (isApprovato) props.onRifiuta()
            else props.onApprova()
          }}
          className="text-[10px] text-gray-500 hover:text-gray-700 underline"
        >
          {isApprovato ? 'Cambia in rifiutato' : 'Cambia in approvato'}
        </button>
      )}
    </div>
  )
}