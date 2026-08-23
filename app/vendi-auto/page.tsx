'use client'

// ============================================================
// FLUSSO "VOGLIO SAPERE QUANTO VALE" (flusso D) — 13 passi
// ⭐ 19/08 (mockup approvato da Davide): stessa meccanica e STESSA GRAFICA
// del flusso demolizione (cornice lavanda, card bianca, testata blu con la
// freccia tonda e "Passo N di 13", titolo con le parole in blu, bottone a
// pillola in fondo). Gli step del veicolo sono gli STESSI COMPONENTI di
// /inizia: se cambiano lì, cambiano anche qui.
//
// Cosa NON si chiede qui: codice fiscale, libretto, certificato di
// proprietà, fermo, chi consegna. Servono a radiare al PRA, non a
// valutare: si chiedono al cliente solo DOPO che ha accettato la
// demolizione. Qui c'è solo l'INTESTAZIONE, che serve già a valutare e
// che poi deciderà la casistica della pratica.
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DatiVeicolo, Intestazione, TipoMezzo } from '../../types/pratica'
import { StepTipoVeicolo } from '../inizia/steps/StepTipoVeicolo'
import { StepIdentificaVeicolo } from '../inizia/steps/StepIdentificaVeicolo'
import { StepCondizioniVeicolo } from '../inizia/steps/StepCondizioniVeicolo'
import AutocompleteIndirizzo, { DatiIndirizzo } from '../inizia/steps/AutocompleteIndirizzo'
import { supabase } from '@/lib/supabase'
import AiutoWhatsApp from '../components/AiutoWhatsApp'
import { InfoBadge } from '../inizia/steps/PezziFlusso'
import { GuscioFlusso } from '../inizia/steps/GuscioFlusso'
import { articolo, articoloDel, nomeVeicolo, isFemminile } from '@/lib/nomiVeicolo'
import { StepIntestazione } from '../inizia/steps/StepIntestazione'

// ============================================================
// I 13 PASSI
// ============================================================
const PASSI = [
  'tipo-veicolo', 'intestazione', 'identifica', 'motore', 'dotazioni',
  'condizioni', 'revisione', 'manutenzione', 'difetti', 'foto',
  'indirizzo', 'targa', 'account',
] as const
type Passo = typeof PASSI[number]

// ⭐ 19/08: i titoli sono GEMELLI di quelli del flusso demolizione — dicono il
// nome del mezzo che il cliente ha scelto ("A chi è intestata l'autovettura?").
// Le formule dei nomi stanno in lib/nomiVeicolo.ts e le usano tutti e due.
function metaDi(passo: Passo, tipo: TipoMezzo | null, tipoAltro: string): { banner: string; titolo: string; sotto: string } {
  const art = articolo(tipo, tipoAltro)
  const artDel = articoloDel(tipo, tipoAltro)
  const a = isFemminile(tipo) ? 'a' : 'o'

  switch (passo) {
    case 'tipo-veicolo':
      return { banner: 'Tipo di veicolo', titolo: 'Che tipo di *veicolo* è?', sotto: 'Seleziona il tipo di mezzo per iniziare.' }
    case 'intestazione':
      return { banner: 'Intestazione', titolo: `A chi è *intestat${a}* ${art}?`, sotto: 'Serve per capire le tempistiche della vendita.' }
    case 'identifica':
      return { banner: 'Identifica il mezzo', titolo: `Identifica *${art}*`, sotto: 'Anno, km, marca, modello e cambio.' }
    case 'motore':
      return { banner: 'Motore', titolo: `Com'è *motorizzat${a}*?`, sotto: 'Due mezzi uguali possono valere il doppio a seconda del motore.' }
    case 'dotazioni':
      return { banner: 'Dotazioni', titolo: 'Cosa *ha a bordo*?', sotto: "Segna quello che c'è: sono le cose che alzano il prezzo." }
    case 'condizioni':
      return { banner: 'Condizioni', titolo: `In che *condizioni* è ${art}?`, sotto: 'Rispondi alle 4 domande, ti bastano pochi secondi.' }
    case 'revisione':
      return { banner: 'Revisione e bollo', titolo: 'Revisione e *bollo* sono in regola?', sotto: 'Un mezzo in regola vale di più, ma la valutazione si fa in ogni caso.' }
    case 'manutenzione':
      return { banner: 'Manutenzione', titolo: `Come hai *tenut${a}* ${art}?`, sotto: 'Un tagliando recente e le ricevute fanno alzare la cifra.' }
    case 'difetti':
      return { banner: 'Difetti', titolo: "C'è qualcosa *che non va*?", sotto: 'Dircelo adesso conviene: così la cifra non cambia al ritiro.' }
    case 'foto':
      return { banner: 'Foto', titolo: `*Foto* ${artDel}`, sotto: 'Più sono chiare, più la cifra sarà precisa.' }
    case 'indirizzo':
      return { banner: 'Indirizzo', titolo: `*Dove si trova* ${art}?`, sotto: 'Ci serve per capire chi può venire a vederlo e a ritirarlo.' }
    case 'targa':
      return { banner: 'Targa', titolo: `Qual è la *targa* ${artDel}?`, sotto: 'Ci serve per identificare il mezzo con precisione.' }
    case 'account':
      return { banner: 'Crea il tuo account', titolo: 'Crea il tuo *account*', sotto: 'Ti serve per vedere la nostra proposta e rispondere.' }
  }
}

const ETICHETTE: Record<Passo, string> = {
  'tipo-veicolo': 'Tipo di veicolo', intestazione: 'Intestazione', identifica: 'Identifica il mezzo',
  motore: 'Motore', dotazioni: 'Dotazioni', condizioni: 'Condizioni', revisione: 'Revisione e bollo',
  manutenzione: 'Manutenzione', difetti: 'Difetti', foto: 'Foto', indirizzo: 'Indirizzo',
  targa: 'Targa', account: 'Crea il tuo account',
}

const ALIMENTAZIONI = ['Benzina', 'Diesel', 'GPL', 'Metano', 'Ibrida', 'Elettrica']
const DOTAZIONI = ['Aria condizionata', 'Servosterzo', 'Navigatore', 'Cerchi in lega', 'Sensori di parcheggio', 'Telecamera', 'Gancio traino', 'Tetto apribile']
const DIFETTI = ['Carrozzeria', 'Motore', 'Cambio', 'Gomme', 'Freni', 'Aria condizionata', 'Interni', 'Impianto elettrico']
const POSIZIONI_FOTO = [
  { chiave: 'davanti', label: 'Davanti' },
  { chiave: 'dietro', label: 'Dietro' },
  { chiave: 'destro', label: 'Lato destro' },
  { chiave: 'sinistro', label: 'Lato sinistro' },
  { chiave: 'interni', label: 'Interni' },
  { chiave: 'cruscotto', label: 'Cruscotto coi km' },
]

// ============================================================
// PEZZI DI INTERFACCIA (gemelli di quelli di /inizia)
// ============================================================

function Pillole({ voci, scelte, onTocca, unica }: { voci: string[]; scelte: string[]; onTocca: (v: string) => void; unica?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {voci.map(v => {
        const attiva = scelte.includes(v)
        return (
          <button
            key={v}
            onClick={() => onTocca(v)}
            className="transition-all active:scale-[0.98]"
            style={{
              fontSize: 13, fontWeight: 600, padding: '9px 14px', borderRadius: 999,
              border: attiva ? '1.5px solid #1D4ED8' : '1.5px solid #E5E7EB',
              background: attiva ? '#EFF6FF' : '#fff',
              color: attiva ? '#1D4ED8' : '#4B5563',
            }}
            aria-pressed={attiva}
            title={unica ? 'Scegline una' : 'Puoi sceglierne più di una'}
          >
            {v}
          </button>
        )
      })}
    </div>
  )
}

function SiNo({ valore, onScegli }: { valore: boolean | null; onScegli: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onScegli(true)}
        className="flex-1 text-center transition-all"
        style={{ fontSize: 13.5, fontWeight: 600, padding: '10px 0', borderRadius: 10, border: valore === true ? '1.5px solid #1D4ED8' : '1.5px solid #E5E7EB', background: valore === true ? '#EFF6FF' : '#fff', color: valore === true ? '#1D4ED8' : '#6B7280' }}
      >
        Sì
      </button>
      <button
        onClick={() => onScegli(false)}
        className="flex-1 text-center transition-all"
        style={{ fontSize: 13.5, fontWeight: 600, padding: '10px 0', borderRadius: 10, border: valore === false ? '1.5px solid #16A34A' : '1.5px solid #E5E7EB', background: valore === false ? '#F0FDF4' : '#fff', color: valore === false ? '#15803D' : '#6B7280' }}
      >
        No
      </button>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-[12px] font-bold mb-1.5" style={{ color: '#4B5563' }}>{label}</label>
      {children}
    </div>
  )
}

const classeInput = 'w-full border rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400 border-gray-200'

function Avviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl p-3 text-[13px] leading-relaxed" style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#1E3A8A' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
      <span>{children}</span>
    </div>
  )
}

// ============================================================
export default function VendiAuto() {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const passo = PASSI[idx]

  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)
  const [messaggioInvio, setMessaggioInvio] = useState('')

  // ---- dati del veicolo (stessi campi del flusso demolizione) ----
  const [veicolo, setVeicolo] = useState<DatiVeicolo>({
    tipo: null, tipoAltro: '', anno: '', km: '', marca: '', modello: '',
    tipoCambio: null, incidentato: null, marciante: null, vaInMoto: null, partiMancanti: null, note: '',
  })
  const aggiornaVeicolo = (d: Partial<DatiVeicolo>) => setVeicolo(prev => ({ ...prev, ...d }))

  // titolo e sottotitolo del passo, col nome del mezzo scelto
  const meta = metaDi(passo, veicolo.tipo, veicolo.tipoAltro)

  // ---- dati solo della valutazione ----
  const [intestazione, setIntestazione] = useState<Intestazione | null>(null)
  const [alimentazione, setAlimentazione] = useState<string | null>(null)
  const [cilindrata, setCilindrata] = useState('')
  const [cavalli, setCavalli] = useState('')
  const [allestimento, setAllestimento] = useState('')
  const [dotazioni, setDotazioni] = useState<string[]>([])
  const [revisioneMese, setRevisioneMese] = useState('')
  const [revisioneAnno, setRevisioneAnno] = useState('')
  const [bolloPagato, setBolloPagato] = useState<boolean | null>(null)
  const [tagliando, setTagliando] = useState<string | null>(null)
  const [manutenzioneChi, setManutenzioneChi] = useState<string | null>(null)
  const [ricevute, setRicevute] = useState<boolean | null>(null)
  const [difetti, setDifetti] = useState<string[]>([])
  const [noteDifetti, setNoteDifetti] = useState('')
  const [foto, setFoto] = useState<Record<string, File>>({})
  const [indirizzo, setIndirizzo] = useState('')
  const [datiIndirizzo, setDatiIndirizzo] = useState<DatiIndirizzo | null>(null)
  const [targa, setTarga] = useState('')

  // ---- account ----
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')

  function tocca(lista: string[], set: (v: string[]) => void, v: string) {
    set(lista.includes(v) ? lista.filter(x => x !== v) : [...lista, v])
  }

  // ---- navigazione ----
  function avanti() {
    setErrore('')
    if (idx < PASSI.length - 1) {
      setIdx(idx + 1)
      window.scrollTo({ top: 0 })
    }
  }
  function indietro() {
    setErrore('')
    if (idx === 0) router.push('/')
    else { setIdx(idx - 1); window.scrollTo({ top: 0 }) }
  }

  // Controlli: solo dove una risposta serve davvero
  function avantiControllato() {
    if (passo === 'intestazione' && !intestazione) return setErrore('Scegli a chi è intestato il mezzo')
    if (passo === 'motore' && !alimentazione) return setErrore("Scegli l'alimentazione")
    if (passo === 'revisione' && bolloPagato === null) return setErrore('Dicci se il bollo è pagato')
    if (passo === 'foto' && Object.keys(foto).length === 0) return setErrore('Aggiungi almeno una foto: senza non riusciamo a valutare')
    if (passo === 'indirizzo' && !datiIndirizzo) return setErrore("Scegli l'indirizzo dal menu che compare mentre scrivi")
    if (passo === 'targa' && targa.trim().length < 5) return setErrore('Scrivi la targa del mezzo')
    avanti()
  }

  // ============================================================
  // INVIO
  // ============================================================
  async function invia() {
    setErrore('')
    if (!nome.trim()) return setErrore('Scrivi il tuo nome')
    if (!email.trim()) return setErrore('Scrivi la tua email')
    if (!telefono.trim()) return setErrore('Scrivi il tuo telefono: ti chiamiamo Noi con la cifra')
    if (password.length < 8) return setErrore('La password deve avere almeno 8 caratteri')

    setInvio(true)
    try {
      // 1. account (o sessione già aperta)
      setMessaggioInvio('Creo il tuo account...')
      const { data: sessione } = await supabase.auth.getUser()
      let userId = sessione?.user?.id
      if (!userId) {
        const { data: reg, error: errReg } = await supabase.auth.signUp({ email: email.trim(), password })
        if (errReg) throw errReg
        userId = reg.user?.id
        if (!userId) throw new Error('Utente non creato')
        await supabase.from('utenti').insert({
          id: userId, nome: nome.trim(), email: email.trim(), telefono: telefono.trim(), tipo: 'cliente', stato: 'attivo',
        })
      }

      // 2. la richiesta di valutazione
      setMessaggioInvio('Salvo la tua richiesta...')
      const { data: creata, error: errDb } = await supabase
        .from('veicoli_vendita')
        .insert({
          user_id: userId,
          stato: 'da_valutare',
          tipo_mezzo: veicolo.tipo,
          tipo_mezzo_altro: veicolo.tipoAltro || null,
          marca: veicolo.marca || null,
          modello: veicolo.modello || null,
          anno: veicolo.anno ? parseInt(veicolo.anno) : null,
          km: veicolo.km ? parseInt(veicolo.km) : null,
          tipo_cambio: veicolo.tipoCambio,
          alimentazione: alimentazione ? alimentazione.toLowerCase() : null,
          cilindrata: cilindrata ? parseInt(cilindrata.replace(/\D/g, '')) : null,
          cavalli: cavalli ? parseInt(cavalli.replace(/\D/g, '')) : null,
          allestimento: allestimento.trim() || null,
          dotazioni: dotazioni.length ? dotazioni : null,
          incidentato: veicolo.incidentato === null ? null : veicolo.incidentato === 'si',
          va_in_moto: veicolo.vaInMoto === null ? null : veicolo.vaInMoto === 'si',
          marciante: veicolo.marciante === null ? null : veicolo.marciante === 'si',
          parti_mancanti: veicolo.partiMancanti === null ? null : veicolo.partiMancanti === 'si',
          revisione_fino: revisioneAnno && revisioneMese ? `${revisioneAnno}-${revisioneMese.padStart(2, '0')}-01` : null,
          bollo_pagato: bolloPagato,
          tagliando,
          manutenzione_chi: manutenzioneChi,
          ricevute,
          difetti: difetti.length ? difetti : null,
          note_difetti: noteDifetti.trim() || null,
          indirizzo: datiIndirizzo?.indirizzo || indirizzo || null,
          comune: datiIndirizzo?.comune || null,
          provincia: datiIndirizzo?.provincia || null,
          cap: datiIndirizzo?.cap || null,
          lat: datiIndirizzo?.lat ?? null,
          lng: datiIndirizzo?.lng ?? null,
          targa: targa.trim().toUpperCase() || null,
          intestazione,
          nome_richiedente: nome.trim(),
          telefono: telefono.trim(),
        })
        .select('id')
        .single()
      if (errDb) throw errDb
      const richiestaId = creata!.id

      // 3. le foto, ognuna con la sua posizione
      const chiavi = Object.keys(foto)
      for (let i = 0; i < chiavi.length; i++) {
        setMessaggioInvio(`Carico le tue foto (${i + 1}/${chiavi.length})...`)
        const chiave = chiavi[i]
        const file = foto[chiave]
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `vendita/${richiestaId}/${chiave}-${Date.now()}.${ext}`
        const { error: errUp } = await supabase.storage.from('foto-pratiche').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
        if (errUp) { console.error('Errore upload foto valutazione:', errUp); continue }
        const { data: pub } = supabase.storage.from('foto-pratiche').getPublicUrl(path)
        if (pub?.publicUrl) {
          await supabase.from('foto_veicoli_vendita').insert({ veicolo_vendita_id: richiestaId, url: pub.publicUrl, posizione: chiave })
        }
      }

      router.push('/dashboard')
    } catch (e: unknown) {
      console.error('Errore invio richiesta valutazione:', e)
      const msg = e instanceof Error ? e.message : ''
      setErrore(
        /already registered|already exists/i.test(msg)
          ? 'Questa email ha già un account: accedi e la richiesta la colleghiamo lì.'
          : 'Non siamo riusciti a inviare la richiesta. Riprova tra un attimo.'
      )
      setInvio(false)
    }
  }

  // ============================================================
  return (
    <GuscioFlusso
      servizio="Richiesta valutazione gratuita"
      mezzo={nomeVeicolo(veicolo.tipo, veicolo.tipoAltro)}
      passo={idx + 1}
      totale={PASSI.length}
      titoloBanner={meta.banner}
      titolo={meta.titolo}
      sotto={meta.sotto}
      onIndietro={indietro}
      passiEtichette={PASSI.map(k => ETICHETTE[k])}
      icona={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" /></svg>}
    >

        {/* ---------- contenuto ---------- */}
        {passo === 'tipo-veicolo' && (
          <StepTipoVeicolo dati={veicolo} onUpdate={aggiornaVeicolo} onNext={avanti} />
        )}

        {passo === 'intestazione' && (
          <StepIntestazione
            valore={intestazione}
            onScegli={v => { setIntestazione(v); setErrore('') }}
            onContinua={avantiControllato}
            errore={false}
          />
        )}

        {passo === 'identifica' && (
          <StepIdentificaVeicolo dati={veicolo} onUpdate={aggiornaVeicolo} onNext={avanti} />
        )}

        {passo === 'motore' && (
          <>
            <Campo label="Alimentazione">
              <Pillole voci={ALIMENTAZIONI} scelte={alimentazione ? [alimentazione] : []} unica onTocca={v => { setAlimentazione(v); setErrore('') }} />
            </Campo>
            <div className="flex gap-2.5">
              <div className="flex-1"><Campo label="Cilindrata"><input value={cilindrata} onChange={e => setCilindrata(e.target.value)} placeholder="Es. 1242 cc" className={classeInput} inputMode="numeric" /></Campo></div>
              <div className="flex-1"><Campo label="Cavalli"><input value={cavalli} onChange={e => setCavalli(e.target.value)} placeholder="facoltativo" className={classeInput} inputMode="numeric" /></Campo></div>
            </div>
            <Campo label="Allestimento o versione">
              <input value={allestimento} onChange={e => setAllestimento(e.target.value)} placeholder="Es. Active, Lounge (facoltativo)" className={classeInput} />
            </Campo>
          </>
        )}

        {passo === 'dotazioni' && (
          <>
            <Pillole voci={DOTAZIONI} scelte={dotazioni} onTocca={v => tocca(dotazioni, setDotazioni, v)} />
            <div className="mt-4"><Avviso>Non sai cosa scegliere? Vai avanti: dalle foto capiamo Noi.</Avviso></div>
          </>
        )}

        {passo === 'condizioni' && (
          <StepCondizioniVeicolo dati={veicolo} onUpdate={aggiornaVeicolo} onNext={avanti} />
        )}

        {passo === 'revisione' && (
          <>
            <Campo label="Revisione valida fino a">
              <div className="flex gap-2.5">
                <input value={revisioneMese} onChange={e => setRevisioneMese(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="Mese" className={classeInput} inputMode="numeric" />
                <input value={revisioneAnno} onChange={e => setRevisioneAnno(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Anno" className={classeInput} inputMode="numeric" />
              </div>
            </Campo>
            <Campo label="Il bollo è pagato?">
              <SiNo valore={bolloPagato} onScegli={v => { setBolloPagato(v); setErrore('') }} />
            </Campo>
            <Avviso>Non lo sai con certezza? Vai avanti lo stesso: lo verifichiamo Noi.</Avviso>
          </>
        )}

        {passo === 'manutenzione' && (
          <>
            <Campo label="Ultimo tagliando">
              <Pillole voci={['Meno di un anno', 'Più di un anno', 'Non lo so']} scelte={tagliando ? [tagliando] : []} unica onTocca={setTagliando} />
            </Campo>
            <Campo label="Chi l'ha seguito">
              <Pillole voci={['Officina della casa', 'Officina di fiducia', 'Un po\' io']} scelte={manutenzioneChi ? [manutenzioneChi] : []} unica onTocca={setManutenzioneChi} />
            </Campo>
            <Campo label="Hai le ricevute?">
              <SiNo valore={ricevute} onScegli={setRicevute} />
            </Campo>
          </>
        )}

        {passo === 'difetti' && (
          <>
            <Pillole voci={[...DIFETTI, 'Niente di tutto questo']} scelte={difetti} onTocca={v => {
              if (v === 'Niente di tutto questo') setDifetti(difetti.includes(v) ? [] : [v])
              else tocca(difetti.filter(x => x !== 'Niente di tutto questo'), setDifetti, v)
            }} />
            <div className="mt-4">
              <Campo label="Vuoi aggiungere qualcosa?">
                <textarea value={noteDifetti} onChange={e => setNoteDifetti(e.target.value)} rows={3} placeholder="Anche in due parole (facoltativo)" className={classeInput + ' resize-none'} />
              </Campo>
            </div>
          </>
        )}

        {passo === 'foto' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {POSIZIONI_FOTO.map(p => {
                const file = foto[p.chiave]
                return (
                  <label key={p.chiave} className="cursor-pointer">
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) { setFoto(prev => ({ ...prev, [p.chiave]: f })); setErrore('') }
                      }}
                    />
                    <span
                      className="flex flex-col items-center justify-center text-center overflow-hidden"
                      style={{
                        aspectRatio: '1', borderRadius: 12, fontSize: 10.5, padding: 4, lineHeight: 1.3,
                        border: file ? '1.5px solid #1D4ED8' : '1.5px dashed #C7D0DE',
                        background: file ? '#EFF6FF' : '#F8FAFC',
                        color: file ? '#1D4ED8' : '#8A94A3',
                      }}
                    >
                      {file
                        ? <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                            <span className="mt-1 font-semibold">{p.label}</span>
                          </>
                        : <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A94A3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></svg>
                            <span className="mt-1">{p.label}</span>
                          </>}
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="mt-4"><Avviso>Hai un danno da mostrare? Rifai una delle foto inquadrandolo: aiuta a non sbagliare la cifra.</Avviso></div>
          </>
        )}

        {passo === 'indirizzo' && (
          <>
            <AutocompleteIndirizzo
              valoreIniziale={indirizzo}
              onSelezione={(d: DatiIndirizzo) => { setIndirizzo(d.indirizzo); setDatiIndirizzo(d); setErrore('') }}
            />
            <div className="mt-4"><Avviso>Scegli l&apos;indirizzo dal menu che compare mentre scrivi: così siamo sicuri del comune.</Avviso></div>
          </>
        )}

        {passo === 'targa' && (
          <>
            <Campo label="Targa">
              <input
                value={targa}
                onChange={e => { setTarga(e.target.value.toUpperCase()); setErrore('') }}
                placeholder="Es. CK456ZY"
                className={classeInput + ' font-bold tracking-widest'}
                autoCapitalize="characters"
              />
            </Campo>
            <Avviso>La targa resta tra Noi e te: non finisce in nessun annuncio pubblico.</Avviso>
          </>
        )}

        {passo === 'account' && (
          <>
            <Campo label="Nome e cognome"><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario Rossi" className={classeInput} /></Campo>
            <Campo label="Email"><input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="mario.rossi@email.it" className={classeInput} /></Campo>
            <Campo label="Telefono"><input value={telefono} onChange={e => setTelefono(e.target.value)} type="tel" placeholder="333 1234567" className={classeInput} /></Campo>
            <Campo label="Password"><input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Almeno 8 caratteri" className={classeInput} /></Campo>
            <Avviso>Ti chiamiamo Noi con la cifra. Nell&apos;area personale vedrai la nostra proposta e potrai rispondere.</Avviso>
          </>
        )}

        {/* ---------- errore ---------- */}
        {errore && (
          <div className="flex items-start gap-2.5 rounded-xl p-3 text-[13.5px] leading-relaxed mt-4" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span>{errore}</span>
          </div>
        )}

        {/* ---------- bottone di pagina (i tre step riusati hanno il loro) ---------- */}
        {passo !== 'tipo-veicolo' && passo !== 'intestazione' && passo !== 'identifica' && passo !== 'condizioni' && (
          <button
            onClick={passo === 'account' ? invia : avantiControllato}
            disabled={invio}
            className="w-full text-white text-center transition-all hover:brightness-105 active:scale-[0.99] mt-5 disabled:opacity-70"
            style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', fontSize: 15.5, fontWeight: 600, padding: '15px 10px', borderRadius: 999, boxShadow: '0 6px 18px rgba(37,99,235,0.35)' }}
          >
            {invio ? (messaggioInvio || 'Invio in corso...') : passo === 'account' ? 'Invia la richiesta' : 'Avanti'}
          </button>
        )}
      <AiutoWhatsApp />
    </GuscioFlusso>
  )
}
