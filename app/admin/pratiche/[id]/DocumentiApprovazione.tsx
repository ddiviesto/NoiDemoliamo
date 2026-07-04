'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================
// APPROVAZIONE DOCUMENTI — nuovo sistema (pratica_documenti_checklist)
// L'admin vede i documenti caricati dal cliente, li approva o rifiuta
// (con motivo). Quando sono tutti approvati la pratica passa a
// "da_assegnare"; se ne rifiuta qualcuno passa a
// "documenti_parzialmente_approvati" e il cliente può ricaricare.
// ============================================================

interface FileCaricato {
  url: string
  nome: string
  lato?: 'fronte' | 'retro'
}

interface DocRiga {
  id: string
  documento_id: string
  indice_erede: number | null
  stato: 'da_fare' | 'caricato' | 'approvato' | 'rifiutato'
  file_url: string | null
  nota_admin: string | null
  codice: string
  nome: string
  per_erede: boolean
  richiede_upload: boolean
  template_pdf: string | null
  ordine: number
}

interface FotoPratica {
  id: string
  url: string
  caricato_il: string
}

interface DatiPratica {
  libretto: string | null
  certificato_proprieta: string | null
  casistica: string | null
  fermo_amministrativo: string | null
  delegato_nome: string | null
  delegato_telefono: string | null
  numero_eredi: number | null
  targhe_presenti: boolean | null
}

interface Props {
  praticaId: string
  statoPratica: string
  onStatoCambiato?: (tuttiApprovati: boolean, totale: number, approvati: number) => void
  onRicaricaPratica?: () => void
}

// ---- helper file ----
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

function estraiPathBucket(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.substring(idx + marker.length).split('?')[0]
}

function isPdfUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /\.pdf($|\?)/i.test(url)
}

function ordinaleErede(n: number): string {
  const o = ['', '1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°']
  return o[n] || `${n}°`
}

const NOMI_CASISTICHE: Record<string, string> = {
  persona_fisica: 'Persona fisica',
  eredi_accettato: 'Eredi (accettata)',
  eredi_rinuncia: 'Eredi (con rinuncia)',
  societa: 'Società',
  societa_fallita: 'Società fallita',
  associazione: 'Associazione',
  non_intestatario: 'Non intestatario',
  targhe_straniere: 'Targhe straniere',
}

// Stati pratica ancora nella fase documenti (in cui possiamo aggiornare lo stato)
const STATI_FASE_DOCUMENTI = [
  'in_attesa_documenti',
  'in_attesa_approvazione_admin',
  'documenti_parzialmente_approvati',
  'da_assegnare',
]

// ============================================================
// COMPONENTE
// ============================================================

export default function DocumentiApprovazione({ praticaId, statoPratica, onStatoCambiato, onRicaricaPratica }: Props) {
  const [docs, setDocs] = useState<DocRiga[]>([])
  const [foto, setFoto] = useState<FotoPratica[]>([])
  const [dati, setDati] = useState<DatiPratica | null>(null)
  const [signedMap, setSignedMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [azione, setAzione] = useState(false)
  const [anteprima, setAnteprima] = useState<{ url: string; titolo: string } | null>(null)
  const [modalRifiuto, setModalRifiuto] = useState<{ id: string; titolo: string } | null>(null)
  const [notaRifiuto, setNotaRifiuto] = useState('')

  const onStatoRef = useRef(onStatoCambiato)
  useEffect(() => { onStatoRef.current = onStatoCambiato }, [onStatoCambiato])

  useEffect(() => {
    carica()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [praticaId])

  // Notifica il padre (per sbloccare lo Step 2) — solo sui documenti che richiedono upload
  useEffect(() => {
    const daApprovare = docs.filter(d => d.richiede_upload)
    const totale = daApprovare.length
    const approvati = daApprovare.filter(d => d.stato === 'approvato').length
    const tutti = totale > 0 && approvati === totale
    onStatoRef.current?.(tutti, totale, approvati)
  }, [docs])

  async function carica() {
    setLoading(true)

    const { data: righe } = await supabase
      .from('pratica_documenti_checklist')
      .select('*')
      .eq('pratica_id', praticaId)

    const documentoIds = Array.from(new Set((righe || []).map((r: Record<string, unknown>) => r.documento_id as string)))
    const catalogo = new Map<string, Record<string, unknown>>()
    if (documentoIds.length > 0) {
      const { data: cats } = await supabase.from('casistiche_documenti').select('*').in('id', documentoIds)
      for (const c of cats || []) catalogo.set(c.id as string, c as Record<string, unknown>)
    }

    const lista: DocRiga[] = (righe || []).map((r: Record<string, unknown>) => {
      const cat = catalogo.get(r.documento_id as string) || {}
      return {
        id: r.id as string,
        documento_id: r.documento_id as string,
        indice_erede: (r.indice_erede as number | null) ?? null,
        stato: (r.stato as DocRiga['stato']) || 'da_fare',
        file_url: (r.file_url as string | null) ?? null,
        nota_admin: (r.nota_admin as string | null) ?? null,
        codice: (cat.codice as string) ?? '',
        nome: (cat.nome as string) ?? 'Documento',
        per_erede: !!cat.per_erede,
        richiede_upload: !!cat.richiede_upload,
        template_pdf: (cat.template_pdf as string | null) ?? null,
        ordine: (cat.ordine as number) ?? 0,
      }
    })
    lista.sort((a, b) => a.ordine - b.ordine || (a.indice_erede ?? 0) - (b.indice_erede ?? 0))

    // Signed URL per il bucket privato
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
      .eq('pratica_id', praticaId)
      .order('caricato_il')

    const { data: prat } = await supabase
      .from('pratiche')
      .select('libretto, certificato_proprieta, casistica, fermo_amministrativo, delegato_nome, delegato_telefono, numero_eredi, targhe_presenti')
      .eq('id', praticaId)
      .single()

    setDocs(lista)
    setFoto((fotos as FotoPratica[]) || [])
    setDati((prat as DatiPratica) || null)
    setLoading(false)
  }

  // Ricalcola e salva lo stato della pratica in base ai documenti
  async function aggiornaStatoPratica(righeAggiornate: DocRiga[]) {
    if (!STATI_FASE_DOCUMENTI.includes(statoPratica)) return
    const daApprovare = righeAggiornate.filter(d => d.richiede_upload)
    if (daApprovare.length === 0) return
    const approvati = daApprovare.filter(d => d.stato === 'approvato').length
    const rifiutati = daApprovare.filter(d => d.stato === 'rifiutato').length

    let nuovo: string
    if (approvati === daApprovare.length) nuovo = 'da_assegnare'
    else if (rifiutati > 0) nuovo = 'documenti_parzialmente_approvati'
    else nuovo = 'in_attesa_approvazione_admin'

    if (nuovo !== statoPratica) {
      await supabase.from('pratiche').update({ stato: nuovo, aggiornato_il: new Date().toISOString() }).eq('id', praticaId)
      onRicaricaPratica?.()
    }
  }

  async function approva(doc: DocRiga) {
    setAzione(true)
    await supabase.from('pratica_documenti_checklist').update({ stato: 'approvato', nota_admin: null, aggiornato_il: new Date().toISOString() }).eq('id', doc.id)
    const aggiornate = docs.map(d => d.id === doc.id ? { ...d, stato: 'approvato' as const, nota_admin: null } : d)
    setDocs(aggiornate)
    await aggiornaStatoPratica(aggiornate)
    setAzione(false)
  }

  async function tornaInVerifica(doc: DocRiga) {
    setAzione(true)
    await supabase.from('pratica_documenti_checklist').update({ stato: 'caricato', nota_admin: null, aggiornato_il: new Date().toISOString() }).eq('id', doc.id)
    const aggiornate = docs.map(d => d.id === doc.id ? { ...d, stato: 'caricato' as const, nota_admin: null } : d)
    setDocs(aggiornate)
    await aggiornaStatoPratica(aggiornate)
    setAzione(false)
  }

  async function confermaRifiuto() {
    if (!modalRifiuto) return
    if (!notaRifiuto.trim()) { alert('Scrivi una nota per spiegare al cliente cosa rifare.'); return }
    setAzione(true)
    await supabase.from('pratica_documenti_checklist').update({ stato: 'rifiutato', nota_admin: notaRifiuto.trim(), aggiornato_il: new Date().toISOString() }).eq('id', modalRifiuto.id)
    const aggiornate = docs.map(d => d.id === modalRifiuto.id ? { ...d, stato: 'rifiutato' as const, nota_admin: notaRifiuto.trim() } : d)
    setDocs(aggiornate)
    await aggiornaStatoPratica(aggiornate)
    setModalRifiuto(null)
    setNotaRifiuto('')
    setAzione(false)
  }

  async function approvaTutti() {
    const daVerificare = docs.filter(d => d.richiede_upload && d.stato === 'caricato')
    if (daVerificare.length === 0) return
    setAzione(true)
    for (const d of daVerificare) {
      await supabase.from('pratica_documenti_checklist').update({ stato: 'approvato', nota_admin: null, aggiornato_il: new Date().toISOString() }).eq('id', d.id)
    }
    const aggiornate = docs.map(d => (d.richiede_upload && d.stato === 'caricato') ? { ...d, stato: 'approvato' as const, nota_admin: null } : d)
    setDocs(aggiornate)
    await aggiornaStatoPratica(aggiornate)
    setAzione(false)
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

  const daApprovare = docs.filter(d => d.richiede_upload)
  const approvatiCount = daApprovare.filter(d => d.stato === 'approvato').length
  const daVerificareCount = daApprovare.filter(d => d.stato === 'caricato').length
  const daContattare = dati?.libretto === 'no' || dati?.certificato_proprieta === 'nessuno'

  // Documenti da mostrare: quelli che richiedono upload, ordinati per fase (da verificare → rifiutati → approvati → in attesa)
  const peso = (s: DocRiga['stato']) => ({ caricato: 0, rifiutato: 1, approvato: 2, da_fare: 3 }[s])
  const righeVisibili = [...daApprovare].sort((a, b) => peso(a.stato) - peso(b.stato) || a.ordine - b.ordine || (a.indice_erede ?? 0) - (b.indice_erede ?? 0))

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Documenti da approvare</p>
            <p className="text-xs text-gray-400 mt-0.5">{approvatiCount} di {daApprovare.length} approvati{daVerificareCount > 0 ? ` · ${daVerificareCount} da verificare` : ''}</p>
          </div>
          {daVerificareCount > 0 && (
            <button onClick={approvaTutti} disabled={azione} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50">
              Approva tutti
            </button>
          )}
        </div>

        {/* BANNER "DA CONTATTARE" */}
        {daContattare && (
          <div className="flex items-start gap-2.5 mt-3 rounded-xl px-3 py-2.5" style={{ background: '#FDF7EA', border: '1.5px solid #F0DFB8' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span className="text-xs" style={{ color: '#854F0B' }}>
              <span className="font-semibold">Da contattare: </span>
              {dati?.libretto === 'no' && 'il cliente non ha il libretto (né denuncia). '}
              {dati?.certificato_proprieta === 'nessuno' && 'il cliente non sa che certificato di proprietà ha. '}
              Chiamalo per capire la situazione prima di procedere.
            </span>
          </div>
        )}

        {/* DATI CASISTICA */}
        {dati && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {dati.casistica && <PillDato label="Casistica" valore={NOMI_CASISTICHE[dati.casistica] || dati.casistica} />}
            {dati.fermo_amministrativo && dati.fermo_amministrativo !== 'no' && <PillDato label="Fermo" valore={dati.fermo_amministrativo === 'si' ? 'Sì' : 'Non so'} allerta />}
            {dati.delegato_nome && <PillDato label="Delegato" valore={dati.delegato_nome + (dati.delegato_telefono ? ` · ${dati.delegato_telefono}` : '')} />}
            {dati.numero_eredi != null && dati.numero_eredi > 0 && (dati.casistica === 'eredi_accettato' || dati.casistica === 'eredi_rinuncia') && <PillDato label="Eredi" valore={String(dati.numero_eredi)} />}
            {dati.targhe_presenti === false && <PillDato label="Targhe" valore="Smarrite" allerta />}
          </div>
        )}

        {/* LISTA DOCUMENTI */}
        {righeVisibili.length === 0 ? (
          <p className="text-sm text-gray-400 mt-4">Nessun documento da approvare per questa pratica.</p>
        ) : (
          <div className="flex flex-col gap-2 mt-3">
            {righeVisibili.map(doc => (
              <RigaDoc
                key={doc.id}
                doc={doc}
                signedMap={signedMap}
                azione={azione}
                onApri={(url, titolo) => setAnteprima({ url, titolo })}
                onApprova={() => approva(doc)}
                onRifiuta={() => { setNotaRifiuto(doc.nota_admin || ''); setModalRifiuto({ id: doc.id, titolo: doc.nome }) }}
                onTornaInVerifica={() => tornaInVerifica(doc)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FOTO DEL VEICOLO (sola visione) */}
      {foto.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">Foto del veicolo <span className="text-gray-400 font-normal">· {foto.length}</span></p>
          <div className="flex flex-wrap gap-2">
            {foto.map((f, idx) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={f.id} src={f.url} alt={`Foto ${idx + 1}`} onClick={() => setAnteprima({ url: f.url, titolo: `Foto ${idx + 1}` })} className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90" />
            ))}
          </div>
        </div>
      )}

      {/* ANTEPRIMA INGRANDITA */}
      {anteprima && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setAnteprima(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <p className="font-semibold text-gray-800">{anteprima.titolo}</p>
              <button onClick={() => setAnteprima(null)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-auto">
              {isPdfUrl(anteprima.url) ? (
                <iframe src={anteprima.url} className="w-full h-[70vh] rounded-xl" title={anteprima.titolo} />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={anteprima.url} alt={anteprima.titolo} className="w-full h-auto object-contain rounded-xl" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTA RIFIUTO */}
      {modalRifiuto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <p className="font-semibold text-gray-800 mb-2">Rifiuta: {modalRifiuto.titolo}</p>
            <p className="text-xs text-gray-500 mb-3">Scrivi al cliente cosa rifare (es. &quot;foto sfocata, rifalla con buona luce&quot;)</p>
            <textarea
              value={notaRifiuto}
              onChange={e => setNotaRifiuto(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="Scrivi la nota qui..."
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => { setModalRifiuto(null); setNotaRifiuto('') }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Annulla</button>
              <button onClick={confermaRifiuto} disabled={azione} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50">Conferma rifiuto</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================
// SOTTOCOMPONENTI
// ============================================================

function PillDato({ label, valore, allerta = false }: { label: string; valore: string; allerta?: boolean }) {
  return (
    <span className="text-[11px] px-2.5 py-1 rounded-full" style={allerta ? { background: '#FBE2E2', color: '#9B1C1C' } : { background: '#EEF2F7', color: '#475569' }}>
      <span className="opacity-70">{label}:</span> <span className="font-semibold">{valore}</span>
    </span>
  )
}

function RigaDoc(props: {
  doc: DocRiga
  signedMap: Record<string, string>
  azione: boolean
  onApri: (url: string, titolo: string) => void
  onApprova: () => void
  onRifiuta: () => void
  onTornaInVerifica: () => void
}) {
  const { doc } = props
  const files = leggiFile(doc.file_url)
  const titolo = doc.per_erede && doc.indice_erede ? `${doc.nome} (${ordinaleErede(doc.indice_erede)} erede)` : doc.nome

  const bordo = doc.stato === 'approvato' ? '#C8E6D5' : doc.stato === 'rifiutato' ? '#F3C8C8' : '#E5E7EB'
  const bg = doc.stato === 'approvato' ? '#F1FAF4' : doc.stato === 'rifiutato' ? '#FEF6F6' : '#fff'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1.5px solid ${bordo}`, borderRadius: 12, padding: '10px 12px', background: bg }}>
      {/* Miniature */}
      {files.length > 0 ? (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {files.slice(0, 3).map((f, i) => {
            const url = props.signedMap[f.url] || f.url
            return (
              <button key={i} onClick={() => props.onApri(url, titolo)} style={{ width: 42, height: 42, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#fff', flexShrink: 0, position: 'relative' }} title={f.lato || undefined}>
                {isPdfUrl(f.nome) || isPdfUrl(f.url) ? (
                  <div style={{ width: '100%', height: '100%', background: '#fbeaea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: '#c0392b' }}>PDF</div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <div style={{ width: 42, height: 42, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA7B5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
      )}

      {/* Nome + stato */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{titolo}</div>
        {doc.stato === 'caricato' && <span style={{ display: 'inline-block', fontSize: 11, color: '#1E4E8C', background: '#E0EDFB', padding: '2px 8px', borderRadius: 20, marginTop: 3 }}>In verifica</span>}
        {doc.stato === 'approvato' && <div style={{ fontSize: 11, color: '#1F7A43', fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Approvato</div>}
        {doc.stato === 'rifiutato' && (
          <div style={{ marginTop: 3 }}>
            <div style={{ fontSize: 11, color: '#C0392B', fontWeight: 600 }}>Rifiutato</div>
            {doc.nota_admin && <div style={{ fontSize: 11, color: '#B03A2E', fontStyle: 'italic', marginTop: 1 }}>&quot;{doc.nota_admin}&quot;</div>}
          </div>
        )}
        {doc.stato === 'da_fare' && <span style={{ display: 'inline-block', fontSize: 11, color: '#8a98a8', marginTop: 3 }}>In attesa dal cliente</span>}
      </div>

      {/* Azioni */}
      <div style={{ flexShrink: 0 }}>
        {doc.stato === 'caricato' && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={props.onApprova} disabled={props.azione} style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, opacity: props.azione ? 0.5 : 1 }}>Approva</button>
            <button onClick={props.onRifiuta} disabled={props.azione} style={{ background: '#fff', color: '#C0392B', border: '1.5px solid #F3C8C8', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, opacity: props.azione ? 0.5 : 1 }}>Rifiuta</button>
          </div>
        )}
        {(doc.stato === 'approvato' || doc.stato === 'rifiutato') && (
          <button onClick={doc.stato === 'approvato' ? props.onRifiuta : props.onTornaInVerifica} disabled={props.azione} style={{ background: 'none', border: 'none', color: '#8a98a8', fontSize: 11.5, textDecoration: 'underline' }}>
            {doc.stato === 'approvato' ? 'Rifiuta' : 'Rimetti in verifica'}
          </button>
        )}
      </div>
    </div>
  )
}
