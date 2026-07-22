'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'

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

// I tre esiti della verifica del certificato di proprietà (telefonata al cliente)
function BottoniCdc({ azione, onScegli }: { azione: boolean; onScegli: (cdc: 'cartaceo' | 'digitale' | 'smarrito') => void }) {
  const stile: React.CSSProperties = { background: '#fff', border: '1.5px solid #E5E7EB', color: '#1E293B' }
  return (
    <>
      <button onClick={() => onScegli('cartaceo')} disabled={azione} className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={stile}>Cartaceo</button>
      <button onClick={() => onScegli('digitale')} disabled={azione} className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={stile}>Digitale</button>
      <button onClick={() => onScegli('smarrito')} disabled={azione} className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={stile}>Smarrito</button>
    </>
  )
}

// ============================================================
// COMPONENTE
// ============================================================

export default function DocumentiApprovazione({ praticaId, onStatoCambiato, onRicaricaPratica }: Props) {
  const [docs, setDocs] = useState<DocRiga[]>([])
  const [foto, setFoto] = useState<FotoPratica[]>([])
  const [dati, setDati] = useState<DatiPratica | null>(null)
  const [signedMap, setSignedMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [azione, setAzione] = useState(false)
  // VISORE: indice della voce aperta (documenti + foto in un'unica fila)
  const [visoreIdx, setVisoreIdx] = useState<number | null>(null)
  const [modalRifiuto, setModalRifiuto] = useState<{ id: string; titolo: string } | null>(null)
  const [notaRifiuto, setNotaRifiuto] = useState('')

  const onStatoRef = useRef(onStatoCambiato)
  useEffect(() => { onStatoRef.current = onStatoCambiato }, [onStatoCambiato])
  const signedRef = useRef<Record<string, string>>({})

  useEffect(() => {
    carica(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [praticaId])

  // Aggiornamento automatico (22/07): upload/invii del cliente appaiono da
  // soli, senza ricaricare la pagina (ricarica silenziosa, niente spinner)
  useAggiornaLive({
    canale: `admin-doc-${praticaId}`,
    tabelle: [
      { tabella: 'pratica_documenti_checklist', filtro: `pratica_id=eq.${praticaId}` },
      { tabella: 'foto_pratiche', filtro: `pratica_id=eq.${praticaId}` },
    ],
    onCambio: () => carica(),
  })

  // Notifica il padre (per sbloccare lo Step 2) — solo sui documenti che richiedono upload
  useEffect(() => {
    const daApprovare = docs.filter(d => d.richiede_upload)
    const totale = daApprovare.length
    const approvati = daApprovare.filter(d => d.stato === 'approvato').length
    const tutti = totale > 0 && approvati === totale
    onStatoRef.current?.(tutti, totale, approvati)
  }, [docs])

  // VISORE: navigazione da tastiera (← → per scorrere, Esc per chiudere)
  const totVoci = docs.filter(d => d.richiede_upload && leggiFile(d.file_url).length > 0).length + foto.length
  useEffect(() => {
    if (visoreIdx === null) return
    const handler = (e: KeyboardEvent) => {
      // Non navigare mentre si scrive (es. nota di rifiuto)
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'textarea' || tag === 'input') return
      if (e.key === 'Escape') setVisoreIdx(null)
      if (e.key === 'ArrowRight') setVisoreIdx(i => (i === null ? null : Math.min(i + 1, totVoci - 1)))
      if (e.key === 'ArrowLeft') setVisoreIdx(i => (i === null ? null : Math.max(i - 1, 0)))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visoreIdx, totVoci])

  // La rotellina appare SOLO al primo caricamento: gli aggiornamenti
  // automatici e post-azione avvengono in silenzio (niente sobbalzi)
  async function carica(spinnerIniziale = false) {
    if (spinnerIniziale) setLoading(true)

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

    // Signed URL per il bucket privato (riusati tra una ricarica e l'altra:
    // niente lampeggi delle immagini durante gli aggiornamenti silenziosi)
    const sm: Record<string, string> = { ...signedRef.current }
    for (const d of lista) {
      for (const f of leggiFile(d.file_url)) {
        if (sm[f.url]) continue
        const path = estraiPathBucket(f.url, 'documenti-pratiche')
        if (!path) continue
        const { data } = await supabase.storage.from('documenti-pratiche').createSignedUrl(path, 3600)
        if (data?.signedUrl) sm[f.url] = data.signedUrl
      }
    }
    signedRef.current = sm
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

    // Auto-sincronizza lo stato della pratica coi documenti (self-heal all'apertura):
    // se i documenti sono già tutti approvati ma la pratica è rimasta indietro, la sblocca.
    aggiornaStatoPratica()
  }

  // Ricalcola lo stato della pratica in base ai documenti (lato server, col service role).
  // Ricarica la pratica solo se lo stato è effettivamente cambiato.
  async function aggiornaStatoPratica() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pratica-stato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: praticaId }),
      })
      const data = await res.json().catch(() => null)
      if (data && data.cambiato === false) return
    } catch (e) {
      console.error('Errore aggiornamento stato pratica:', e)
    }
    onRicaricaPratica?.()
  }

  async function approva(doc: DocRiga) {
    setAzione(true)
    await supabase.from('pratica_documenti_checklist').update({ stato: 'approvato', nota_admin: null, aggiornato_il: new Date().toISOString() }).eq('id', doc.id)
    const aggiornate = docs.map(d => d.id === doc.id ? { ...d, stato: 'approvato' as const, nota_admin: null } : d)
    setDocs(aggiornate)
    await aggiornaStatoPratica()
    setAzione(false)
  }

  async function tornaInVerifica(doc: DocRiga) {
    setAzione(true)
    await supabase.from('pratica_documenti_checklist').update({ stato: 'caricato', nota_admin: null, aggiornato_il: new Date().toISOString() }).eq('id', doc.id)
    const aggiornate = docs.map(d => d.id === doc.id ? { ...d, stato: 'caricato' as const, nota_admin: null } : d)
    setDocs(aggiornate)
    await aggiornaStatoPratica()
    setAzione(false)
  }

  async function confermaRifiuto() {
    if (!modalRifiuto) return
    if (!notaRifiuto.trim()) { alert('Scrivi una nota per spiegare al cliente cosa rifare.'); return }
    setAzione(true)
    await supabase.from('pratica_documenti_checklist').update({ stato: 'rifiutato', nota_admin: notaRifiuto.trim(), aggiornato_il: new Date().toISOString() }).eq('id', modalRifiuto.id)
    const aggiornate = docs.map(d => d.id === modalRifiuto.id ? { ...d, stato: 'rifiutato' as const, nota_admin: notaRifiuto.trim() } : d)
    setDocs(aggiornate)
    await aggiornaStatoPratica()
    setModalRifiuto(null)
    setNotaRifiuto('')
    setAzione(false)
  }

  // Esito della telefonata "non sa che certificato ha": l'endpoint aggiorna
  // la pratica e sincronizza la checklist (cartaceo → documento da caricare
  // e da consegnare al ritiro; digitale → non serve nulla).
  async function impostaCdc(cdc: 'cartaceo' | 'digitale' | 'smarrito') {
    setAzione(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pratica-cdc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: praticaId, cdc }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Errore')
      await carica()
      onRicaricaPratica?.()
    } catch (e) {
      console.error('Errore impostazione certificato:', e)
      alert('Errore nel salvataggio. Riprova.')
    }
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
    await aggiornaStatoPratica()
    setAzione(false)
  }

  // -----------------------------
  // RENDER
  // -----------------------------

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center" style={STILE_CARD}>
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

  // ---- VISORE: fila unica documenti (con file) + foto del veicolo ----
  // Ordine STABILE (da catalogo, non per stato): così una voce non cambia
  // posto mentre la si approva dal visore.
  type Voce = { tipo: 'doc'; doc: DocRiga } | { tipo: 'foto'; foto: FotoPratica; n: number }
  const vociDocs = [...daApprovare]
    .sort((a, b) => a.ordine - b.ordine || (a.indice_erede ?? 0) - (b.indice_erede ?? 0))
    .filter(d => leggiFile(d.file_url).length > 0)
  const voci: Voce[] = [
    ...vociDocs.map(d => ({ tipo: 'doc' as const, doc: d })),
    ...foto.map((f, i) => ({ tipo: 'foto' as const, foto: f, n: i + 1 })),
  ]
  const titoloVoce = (v: Voce) => v.tipo === 'foto'
    ? `Foto del veicolo ${v.n}`
    : (v.doc.per_erede && v.doc.indice_erede ? `${v.doc.nome} (${ordinaleErede(v.doc.indice_erede)} erede)` : v.doc.nome)
  const apriVisoreDoc = (id: string) => { const i = voci.findIndex(v => v.tipo === 'doc' && v.doc.id === id); if (i >= 0) setVisoreIdx(i) }
  const apriVisoreFoto = (id: string) => { const i = voci.findIndex(v => v.tipo === 'foto' && v.foto.id === id); if (i >= 0) setVisoreIdx(i) }

  // Approva e passa da solo al prossimo documento ancora da verificare
  async function approvaEAvanti(doc: DocRiga) {
    await approva(doc)
    const idx = visoreIdx ?? 0
    for (let k = 1; k <= voci.length; k++) {
      const j = (idx + k) % voci.length
      const v = voci[j]
      if (v.tipo === 'doc' && v.doc.id !== doc.id && v.doc.stato === 'caricato') { setVisoreIdx(j); return }
    }
  }

  return (
    <>
      <div className="p-5" style={STILE_CARD}>
        <div className="flex items-center justify-between">
          <div>
            <TitoloCard>Documenti da approvare</TitoloCard>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>{approvatiCount} di {daApprovare.length} approvati{daVerificareCount > 0 ? ` · ${daVerificareCount} da verificare` : ''}</p>
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
            <div className="flex-1 min-w-0">
              <span className="text-xs" style={{ color: '#854F0B' }}>
                <span className="font-semibold">Da contattare: </span>
                {dati?.libretto === 'no' && 'il cliente non ha il libretto (né denuncia). '}
                {dati?.certificato_proprieta === 'nessuno' && 'il cliente non sa che certificato di proprietà ha. '}
                Chiamalo per capire la situazione prima di procedere.
              </span>
              {/* Esito verifica CDC: aggiorna pratica + checklist del cliente */}
              {dati?.certificato_proprieta === 'nessuno' && (
                <div className="flex items-center flex-wrap gap-2 mt-2">
                  <span className="text-[11px] font-semibold" style={{ color: '#854F0B' }}>Dopo la verifica, che certificato ha?</span>
                  <BottoniCdc azione={azione} onScegli={impostaCdc} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nota 17/07: le pillole casistica e la correzione del CDC sono state
            SPOSTATE nella card "Dichiarazioni e casistica" della pagina (i dati
            stavano in due posti). Qui resta solo il banner "Da contattare". */}

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
                onApri={() => apriVisoreDoc(doc.id)}
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
        <div className="p-5" style={STILE_CARD}>
          <div className="mb-3"><TitoloCard>Foto del veicolo <span style={{ color: '#64748b', fontWeight: 400 }}>· {foto.length}</span></TitoloCard></div>
          <div className="flex flex-wrap gap-2">
            {foto.map((f, idx) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={f.id} src={f.url} alt={`Foto ${idx + 1}`} onClick={() => apriVisoreFoto(f.id)} className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90" />
            ))}
          </div>
        </div>
      )}

      {/* VISORE DOCUMENTI + FOTO: elenco a sinistra, frecce (anche da
          tastiera), Approva/Rifiuta senza mai chiudere la finestra */}
      {visoreIdx !== null && voci[visoreIdx] && (() => {
        const voce = voci[visoreIdx]
        const files = voce.tipo === 'doc' ? leggiFile(voce.doc.file_url) : []
        const primaFotoIdx = voci.findIndex(v => v.tipo === 'foto')
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setVisoreIdx(null)}>
            <div className="bg-white rounded-2xl w-full flex overflow-hidden" style={{ maxWidth: 1000, height: '85vh' }} onClick={e => e.stopPropagation()}>

              {/* ELENCO A SINISTRA */}
              <div style={{ width: 250, borderRight: '1px solid #EEF1F5', background: '#FAFBFD', overflowY: 'auto', padding: '12px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.6, padding: '0 16px 8px' }}>DOCUMENTI · {vociDocs.length}</div>
                {voci.map((v, i) => {
                  const attiva = i === visoreIdx
                  return (
                    <div key={v.tipo === 'doc' ? v.doc.id : v.foto.id}>
                      {i === primaFotoIdx && (
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.6, padding: '10px 16px 8px', borderTop: '1px solid #EEF1F5', marginTop: 8 }}>FOTO DEL VEICOLO · {foto.length}</div>
                      )}
                      <button
                        onClick={() => setVisoreIdx(i)}
                        style={{
                          width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                          padding: attiva ? '9px 16px 9px 13px' : '9px 16px', fontSize: 12.5, border: 'none', cursor: 'pointer',
                          background: attiva ? '#EFF6FF' : 'transparent', borderLeft: attiva ? '3px solid #2563eb' : 'none',
                          color: attiva ? '#0C447C' : '#374151', fontWeight: attiva ? 700 : 400,
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titoloVoce(v)}</span>
                        {v.tipo === 'doc' && (
                          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px', ...(v.doc.stato === 'approvato' ? { background: '#DCF3E4', color: '#1F7A43' } : v.doc.stato === 'rifiutato' ? { background: '#FBDADA', color: '#C0392B' } : { background: '#E0EDFB', color: '#1E4E8C' }) }}>
                            {v.doc.stato === 'approvato' ? 'Approvato' : v.doc.stato === 'rifiutato' ? 'Rifiutato' : 'In verifica'}
                          </span>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* AREA PRINCIPALE */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 18px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titoloVoce(voce)}</div>
                    <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 1 }}>{visoreIdx + 1} di {voci.length} · usa ← → per scorrere</div>
                  </div>
                  <button onClick={() => setVisoreIdx(null)} className="text-gray-400 hover:text-gray-700" style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>×</button>
                </div>

                {/* FILE (fronte/retro affiancati) o FOTO */}
                <div style={{ flex: 1, display: 'flex', gap: 10, minHeight: 0 }}>
                  {voce.tipo === 'foto' ? (
                    <div style={{ flex: 1, minWidth: 0, overflow: 'auto', background: '#F6F8FB', borderRadius: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={voce.foto.url} alt={titoloVoce(voce)} style={{ maxWidth: '100%', height: 'auto' }} />
                    </div>
                  ) : files.map((f, i) => {
                    const url = signedMap[f.url] || f.url
                    return (
                      <div key={i} style={{ flex: 1, minWidth: 0, overflow: 'auto', background: '#F6F8FB', borderRadius: 12, position: 'relative' }}>
                        {f.lato && (
                          <span style={{ position: 'sticky', top: 8, left: 8, display: 'inline-block', margin: 8, background: 'rgba(15,23,42,0.65)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, borderRadius: 20, padding: '2px 9px', zIndex: 1 }}>{f.lato.toUpperCase()}</span>
                        )}
                        {isPdfUrl(f.nome) || isPdfUrl(f.url) ? (
                          <iframe src={url} title={f.nome} style={{ width: '100%', height: '100%', minHeight: 300, border: 'none' }} />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={url} alt={f.nome} style={{ display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto' }} />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* FRECCE + AZIONI */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <button onClick={() => setVisoreIdx(i => Math.max((i ?? 0) - 1, 0))} disabled={visoreIdx === 0} style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '1.5px solid #E5E7EB', fontSize: 17, color: '#374151', cursor: 'pointer', opacity: visoreIdx === 0 ? 0.4 : 1 }}>‹</button>
                  <button onClick={() => setVisoreIdx(i => Math.min((i ?? 0) + 1, voci.length - 1))} disabled={visoreIdx === voci.length - 1} style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '1.5px solid #E5E7EB', fontSize: 17, color: '#374151', cursor: 'pointer', opacity: visoreIdx === voci.length - 1 ? 0.4 : 1 }}>›</button>
                  <div style={{ flex: 1 }} />
                  {voce.tipo === 'doc' && voce.doc.stato === 'caricato' && (
                    <>
                      <button onClick={() => { setNotaRifiuto(voce.doc.nota_admin || ''); setModalRifiuto({ id: voce.doc.id, titolo: voce.doc.nome }) }} disabled={azione} style={{ background: '#fff', color: '#C0392B', border: '1.5px solid #F3C8C8', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 600, opacity: azione ? 0.5 : 1, cursor: 'pointer' }}>Rifiuta</button>
                      <button onClick={() => approvaEAvanti(voce.doc)} disabled={azione} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16A34A', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 600, opacity: azione ? 0.5 : 1, cursor: 'pointer' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Approva e avanti
                      </button>
                    </>
                  )}
                  {voce.tipo === 'doc' && voce.doc.stato === 'approvato' && (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: '#1F7A43' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Approvato
                      </span>
                      <button onClick={() => { setNotaRifiuto(voce.doc.nota_admin || ''); setModalRifiuto({ id: voce.doc.id, titolo: voce.doc.nome }) }} disabled={azione} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Rifiuta</button>
                    </>
                  )}
                  {voce.tipo === 'doc' && voce.doc.stato === 'rifiutato' && (
                    <>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#C0392B' }}>Rifiutato{voce.doc.nota_admin ? ` · "${voce.doc.nota_admin}"` : ''}</span>
                      <button onClick={() => tornaInVerifica(voce.doc)} disabled={azione} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Rimetti in verifica</button>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        )
      })()}

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

function RigaDoc(props: {
  doc: DocRiga
  signedMap: Record<string, string>
  azione: boolean
  onApri: () => void
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
              <button key={i} onClick={() => props.onApri()} style={{ width: 42, height: 42, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#fff', flexShrink: 0, position: 'relative' }} title={f.lato || undefined}>
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
          <button onClick={doc.stato === 'approvato' ? props.onRifiuta : props.onTornaInVerifica} disabled={props.azione} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
            {doc.stato === 'approvato' ? 'Rifiuta' : 'Rimetti in verifica'}
          </button>
        )}
      </div>
    </div>
  )
}
