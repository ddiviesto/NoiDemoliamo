'use client'

// ============================================================
// "COMPLETA LA PRATICA" (flusso D, pezzo 3 — 03/10)
// Dopo che il cliente ha accettato la proposta, le domande che la
// valutazione non aveva fatto: spazio per il carro attrezzi · chi
// consegna (solo dove la delega è ammessa) · libretto · certificato di
// proprietà (non per targhe straniere). Alla fine la richiesta diventa
// una pratica di demolizione (/api/valutazione-completa) e si atterra
// sulla pagina della pratica, pronta per i documenti.
// Stessa veste e stessi testi dei passi del flusso /inizia.
// ============================================================

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GuscioFlusso } from '../../../inizia/steps/GuscioFlusso'
import { CampoModulo, ErrorBadge, InfoBadge, RuoloButton, SceltaPillola, classeCampo } from '../../../inizia/steps/PezziFlusso'
import { Casistica, CdcStato, ConsegnaMezzo, LibrettoStato, SpazioCarroAttrezzi, TipoMezzo, delegaAmmessa } from '../../../../types/pratica'
import { articolo, articoloDel, nomeVeicolo } from '@/lib/nomiVeicolo'
import AiutoWhatsApp from '../../../components/AiutoWhatsApp'

type Passo = 'spazio' | 'consegna' | 'libretto' | 'cdc'

interface Richiesta {
  id: string
  stato: string
  risposta_cliente: string | null
  pratica_id: string | null
  tipo_mezzo: string | null
  tipo_mezzo_altro: string | null
  targa: string | null
  indirizzo: string | null
  casistica: string | null
  offerta_tipo: string | null
  offerta_importo: number | null
}

const ETICHETTE: Record<Passo, string> = { spazio: 'Spazio carro attrezzi', consegna: 'Chi consegna', libretto: 'Libretto', cdc: 'Certificato di proprietà' }

export default function CompletaPratica() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [r, setR] = useState<Richiesta | null>(null)
  const [caricamento, setCaricamento] = useState(true)
  const [idx, setIdx] = useState(0)
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)

  const [spazio, setSpazio] = useState<SpazioCarroAttrezzi | null>(null)
  const [spazioNote, setSpazioNote] = useState('')
  const [consegna, setConsegna] = useState<ConsegnaMezzo | null>(null)
  const [delegatoNome, setDelegatoNome] = useState('')
  const [delegatoTelefono, setDelegatoTelefono] = useState('')
  const [libretto, setLibretto] = useState<LibrettoStato | null>(null)
  const [cdc, setCdc] = useState<CdcStato | null>(null)

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('veicoli_vendita')
        .select('id, stato, risposta_cliente, pratica_id, tipo_mezzo, tipo_mezzo_altro, targa, indirizzo, casistica, offerta_tipo, offerta_importo')
        .eq('id', id).single()
      if (!data) { router.push('/dashboard'); return }
      // Già diventata pratica: dritto alla pratica
      if (data.pratica_id) { router.push(`/dashboard/${data.pratica_id}`); return }
      // Non ha ancora accettato: torna alla card
      if (data.stato !== 'risposta_inviata' || data.risposta_cliente !== 'accettata') { router.push('/dashboard'); return }
      setR(data)
      setCaricamento(false)
    }
    carica()
  }, [id, router])

  const casistica = (r?.casistica || null) as Casistica | null
  const tipo = (r?.tipo_mezzo || null) as TipoMezzo | null
  const tipoAltro = r?.tipo_mezzo_altro || ''
  const passi: Passo[] = ['spazio']
  if (delegaAmmessa(casistica)) passi.push('consegna')
  passi.push('libretto')
  if (casistica !== 'targhe_straniere') passi.push('cdc')
  const passo = passi[Math.min(idx, passi.length - 1)]
  const ultimo = idx === passi.length - 1

  function meta(p: Passo): { banner: string; titolo: string; sotto: string } {
    switch (p) {
      case 'spazio': return { banner: 'Spazio carro attrezzi', titolo: 'Il demolitore può *arrivare col carro attrezzi*?', sotto: `Pensa al punto esatto dove si trova ${articolo(tipo, tipoAltro)}${r?.indirizzo ? `: ${r.indirizzo}` : ''}.` }
      case 'consegna': return { banner: 'Consegna del mezzo', titolo: `Chi *consegnerà* ${articolo(tipo, tipoAltro)} al demolitore?`, sotto: 'La persona presente al ritiro che firma la consegna.' }
      case 'libretto': return { banner: 'Libretto di circolazione', titolo: `Hai il *libretto di circolazione* ${articoloDel(tipo, tipoAltro)}?`, sotto: "Il libretto originale va consegnato al demolitore al momento del ritiro. Così riceverai il primo documento per bloccare o spostare l'assicurazione." }
      case 'cdc': return { banner: 'Certificato di proprietà', titolo: 'Hai il *Certificato di Proprietà*?', sotto: 'È il documento che dimostra chi è il proprietario del mezzo.' }
    }
  }
  const m = meta(passo)

  function indietro() {
    setErrore('')
    if (idx === 0) router.push('/dashboard')
    else { setIdx(idx - 1); window.scrollTo({ top: 0 }) }
  }

  function valido(): string | null {
    if (passo === 'spazio' && !spazio) return "Seleziona un'opzione per lo spazio carro attrezzi."
    if (passo === 'consegna') {
      if (!consegna) return 'Seleziona chi consegnerà il mezzo per continuare.'
      if (consegna === 'delegato' && (!delegatoNome.trim() || !delegatoTelefono.trim())) return 'Scrivi nome e telefono del delegato.'
    }
    if (passo === 'libretto' && !libretto) return "Seleziona un'opzione per continuare."
    if (passo === 'cdc' && !cdc) return "Seleziona un'opzione per continuare."
    return null
  }

  async function avanti() {
    const e = valido()
    if (e) { setErrore(e); return }
    setErrore('')
    if (!ultimo) { setIdx(idx + 1); window.scrollTo({ top: 0 }); return }

    setInvio(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/valutazione-completa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          id, spazio_carro_attrezzi: spazio, spazio_carro_attrezzi_note: spazioNote,
          consegna, delegato_nome: delegatoNome, delegato_telefono: delegatoTelefono,
          libretto, cdc,
        }),
      })
      const json = await res.json()
      if (res.status === 409 && json.pratica_id) { router.push(`/dashboard/${json.pratica_id}`); return }
      if (!res.ok) throw new Error(json.error || 'Errore')
      router.push(`/dashboard/${json.pratica_id}`)
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non siamo riusciti a creare la pratica. Riprova tra un attimo.')
      setInvio(false)
    }
  }

  if (caricamento || !r) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white sm:bg-[linear-gradient(135deg,#e0e7ff_0%,#ddd6fe_100%)]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  const cifra = r.offerta_tipo === 'acquisto' && r.offerta_importo != null ? `${r.offerta_importo.toLocaleString('it-IT')} €` : 'demolizione gratuita'

  return (
    <GuscioFlusso
      servizio="Completa la pratica"
      mezzo={`${nomeVeicolo(tipo, tipoAltro)}${r.targa ? ` · ${r.targa}` : ''}`}
      passo={idx + 1}
      totale={passi.length}
      titoloBanner={m.banner}
      titolo={m.titolo}
      sotto={m.sotto}
      onIndietro={indietro}
      passiEtichette={passi.map(k => ETICHETTE[k])}
      icona={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
    >
      {idx === 0 && (
        <div className="mb-4"><InfoBadge>Hai accettato: <strong>{cifra}</strong>. Rispondi a queste {passi.length} domande e la tua richiesta diventa una pratica, pronta per i documenti.</InfoBadge></div>
      )}

      {errore && <div className="mb-3"><ErrorBadge>{errore}</ErrorBadge></div>}

      {passo === 'spazio' && (
        <div className="flex flex-col gap-3">
          <div className="scelte-fila">
            <SceltaPillola label="Accesso libero" larga presa={spazio === 'libero'} onClick={() => { setSpazio('libero'); setErrore('') }} />
            <SceltaPillola label="Spazio stretto" larga presa={spazio === 'stretto'} onClick={() => { setSpazio('stretto'); setErrore('') }} />
            <SceltaPillola label="Non passa" larga presa={spazio === 'no'} onClick={() => { setSpazio('no'); setErrore('') }} />
          </div>
          <CampoModulo label="Note aggiuntive (opzionale)">
            <textarea value={spazioNote} onChange={e => setSpazioNote(e.target.value)} placeholder="Es. Cancello largo 2,5 metri; cortile interno; salita ripida..." rows={2} className={classeCampo(false, 'campo-lungo')} />
          </CampoModulo>
        </div>
      )}

      {passo === 'consegna' && (
        <>
          <div className="flex flex-col gap-2">
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
              label="Io stesso" sub="Sarò presente al ritiro"
              selected={consegna === 'io'} onClick={() => { setConsegna('io'); setErrore('') }}
            />
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M17 11l2 2 4-4" /></svg>}
              label="Una persona delegata" sub="Ti prepariamo noi la delega da firmare"
              selected={consegna === 'delegato'} onClick={() => { setConsegna('delegato'); setErrore('') }}
            />
          </div>
          {consegna === 'delegato' && (
            <div className="mt-3 flex flex-col gap-3">
              <InfoBadge>Nella tua area personale troverai la delega da compilare e firmare: la consegnerai al ritiro insieme ai documenti del delegato.</InfoBadge>
              <CampoModulo label="Nome e cognome del delegato">
                <input type="text" value={delegatoNome} onChange={e => { setDelegatoNome(e.target.value); setErrore('') }} placeholder="Mario Rossi" className={classeCampo()} />
              </CampoModulo>
              <CampoModulo label="Telefono del delegato" aiuto="Lo useremo solo per avvisare il delegato e accordarci sul giorno del ritiro. Nessun altro utilizzo.">
                <input type="tel" inputMode="tel" value={delegatoTelefono} onChange={e => { setDelegatoTelefono(e.target.value); setErrore('') }} placeholder="+39 333 1234567" className={classeCampo()} />
              </CampoModulo>
            </div>
          )}
        </>
      )}

      {passo === 'libretto' && (
        <>
          <div className="flex flex-col gap-2">
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><path d="m22 27.18l-2.59-2.59L18 26l4 4l8-8l-1.41-1.41zM9 17h7v2H9zm0-5h12v2H9zm0-5h12v2H9z" /><path d="M16 30H6c-1.103 0-2-.897-2-2V4c0-1.103.897-2 2-2h18c1.103 0 2 .897 2 2v15h-2V4H6v24h10z" /></svg>}
              label="Sì, ho il libretto originale" sub="Documento disponibile ed integro"
              selected={libretto === 'si'} onClick={() => { setLibretto('si'); setErrore('') }}
            />
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 14v-4c0-3.771 0-5.657 1.172-6.828S7.229 2 11 2h2c3.771 0 5.657 0 6.828 1.172S21 6.229 21 10v4c0 3.771 0 5.657-1.172 6.828S16.771 22 13 22h-2c-3.771 0-5.657 0-6.828-1.172S3 17.771 3 14Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M11.333 10.667c1.055 1.055 2.445 2.127 2.445 2.127l1.904-1.905s-1.072-1.39-2.126-2.445C12.5 7.39 11.11 6.317 11.11 6.317L9.206 8.222s1.072 1.39 2.127 2.445m0 0L8 14m8-3.429l-2.54 2.54M11.43 6L8.89 8.54" /><path strokeLinecap="round" d="M8 18h8" /></svg>}
              label="Ho la denuncia di smarrimento in originale" sub="Emessa da Carabinieri o Polizia"
              selected={libretto === 'denuncia'} onClick={() => { setLibretto('denuncia'); setErrore('') }}
            />
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><circle cx="9" cy="28.5" r="1.5" /><path d="M10 25H8v-4h2a2 2 0 0 0 0-4H8a2 2 0 0 0-2 2v.5H4V19a4.005 4.005 0 0 1 4-4h2a4 4 0 0 1 0 8Z" /><path d="m27.7 9.3l-7-7A.9.9 0 0 0 20 2H10a2.006 2.006 0 0 0-2 2v8h2V4h8v6a2.006 2.006 0 0 0 2 2h6v16H14v2h12a2.006 2.006 0 0 0 2-2V10a.91.91 0 0 0-.3-.7M20 10V4.4l5.6 5.6Z" /></svg>}
              label="Non ho nessuno dei due al momento" sub="Ti spieghiamo come procedere"
              selected={libretto === 'no'} onClick={() => { setLibretto('no'); setErrore('') }}
            />
          </div>
          {libretto === 'no' && <div className="mt-3"><InfoBadge>Nessun problema: <strong>ti chiamiamo noi</strong> per capire la situazione e dirti esattamente come fare. Intanto puoi completare la pratica e caricare gli altri documenti.</InfoBadge></div>}
        </>
      )}

      {passo === 'cdc' && (
        <>
          <div className="flex items-start gap-2.5 rounded-xl py-2.5 px-3 mb-3" style={{ background: '#FDF4E0', border: '1.5px solid #EFD9A7' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span className="text-[13px] leading-relaxed" style={{ color: '#6B4A0A' }}><strong>Attenzione: NON è il libretto.</strong> È un documento separato.</span>
          </div>
          <div className="rounded-xl py-3 px-3.5 mb-4" style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE' }}>
            <div className="text-[13px] font-bold mb-2" style={{ color: '#1E3A8A' }}>Come capire quale hai</div>
            <div className="text-[13px] leading-relaxed" style={{ color: '#1E3A8A' }}>• Passaggio di proprietà <strong>prima di ottobre 2015</strong>: foglio <strong>cartaceo</strong> con stemma ACI in alto.</div>
            <div className="text-[13px] leading-relaxed" style={{ color: '#1E3A8A' }}>• Passaggio <strong>dopo ottobre 2015</strong>: è <strong>digitale</strong>, non esiste un foglio da conservare.</div>
          </div>
          <div className="flex flex-col gap-2">
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="-4 -2 24 24" fill="currentColor"><path d="M3 0h10a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3m0 2a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm2 1h6a1 1 0 0 1 0 2H5a1 1 0 1 1 0-2m0 12h2a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2m0-4h6a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2m0-4h6a1 1 0 0 1 0 2H5a1 1 0 1 1 0-2" /></svg>}
              label="Sì, ho quello cartaceo" sub="Il foglio con lo stemma ACI in alto: va consegnato al momento del ritiro"
              selected={cdc === 'cartaceo'} onClick={() => { setCdc('cartaceo'); setErrore('') }}
            />
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><path d="M14 21h2m-2 0a1.5 1.5 0 0 1-1.5-1.5V17H12m2 4h-4m0 0H8m2 0a1.5 1.5 0 0 0 1.5-1.5V17h.5m0 0v4m4-18H8c-2.828 0-4.243 0-5.121.879C2 4.757 2 6.172 2 9v2c0 2.828 0 4.243.879 5.121C3.757 17 5.172 17 8 17h8c2.828 0 4.243 0 5.121-.879C22 15.243 22 13.828 22 11V9c0-2.828 0-4.243-.879-5.121C20.243 3 18.828 3 16 3" /><path d="M12 10.5a2 2 0 1 0 0-4a2 2 0 0 0 0 4m0 0a3 3 0 0 0-3 3m3-3a3 3 0 0 1 3 3" /></svg>}
              label="Il mio è digitale" sub="Passaggio dopo ottobre 2015: il certificato è negli archivi digitali del PRA e non va consegnato al ritiro"
              selected={cdc === 'digitale'} onClick={() => { setCdc('digitale'); setErrore('') }}
            />
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><circle cx="9" cy="28.5" r="1.5" /><path d="M10 25H8v-4h2a2 2 0 0 0 0-4H8a2 2 0 0 0-2 2v.5H4V19a4.005 4.005 0 0 1 4-4h2a4 4 0 0 1 0 8Z" /><path d="m27.7 9.3l-7-7A.9.9 0 0 0 20 2H10a2.006 2.006 0 0 0-2 2v8h2V4h8v6a2.006 2.006 0 0 0 2 2h6v16H14v2h12a2.006 2.006 0 0 0 2-2V10a.91.91 0 0 0-.3-.7M20 10V4.4l5.6 5.6Z" /></svg>}
              label="L'ho smarrito, ho la denuncia" sub="La denuncia in originale va consegnata al momento del ritiro"
              selected={cdc === 'smarrito'} onClick={() => { setCdc('smarrito'); setErrore('') }}
            />
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
              label="Non lo trovo o non so cosa sia" sub="Nessun problema: lo verifichiamo noi gratuitamente e ti spieghiamo come procedere"
              selected={cdc === 'nessuno'} onClick={() => { setCdc('nessuno'); setErrore('') }}
            />
          </div>
          {cdc === 'nessuno' && <div className="mt-3"><InfoBadge>Lo verifichiamo noi gratuitamente e <strong>ti chiamiamo</strong> per dirti come procedere. Intanto puoi completare la pratica e caricare gli altri documenti.</InfoBadge></div>}
        </>
      )}

      <button onClick={avanti} disabled={invio} className="btn-pagina mt-4 disabled:opacity-70">
        {invio ? 'Creo la tua pratica…' : ultimo ? 'Crea la pratica' : 'Continua'}
      </button>
      <AiutoWhatsApp />
    </GuscioFlusso>
  )
}
