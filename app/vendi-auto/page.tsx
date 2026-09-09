'use client'

// ============================================================
// FLUSSO "VOGLIO SAPERE QUANTO VALE" (flusso D)
// ⭐ 03/09 (rifatto sui mockup "valutazione in undici passi" e "confronto
// demolizione/valutazione", decisioni di Davide): la valutazione è la
// PORTA D'INGRESSO delle auto da demolire. Quasi tutte finiscono in
// demolizione gratuita o pagate poco dal demolitore, quindi si chiede
// SOLO l'essenziale e nello STESSO ORDINE del flusso demolizione, così
// quando il cliente accetta la demolizione la richiesta diventa una
// pratica normale e lui completa solo le domande che mancano (spazio
// per il carro attrezzi, chi consegna, libretto, certificato di proprietà).
//
// I passi (quelli tra parentesi compaiono solo quando servono):
//   tipo · intestazione · (eredi) · (società) · informazioni sul veicolo ·
//   condizioni · dove si trova · targa · (codice fiscale) · foto ·
//   (fermo amministrativo) · account
//
// Stessa grafica e STESSI COMPONENTI di /inizia: se cambiano lì,
// cambiano anche qui.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DatiVeicolo, Intestazione, TipoMezzo, FermoAmministrativo, derivaCasistica, fermoApplicabile } from '../../types/pratica'
import { StepTipoVeicolo } from '../inizia/steps/StepTipoVeicolo'
import { StepIdentificaVeicolo } from '../inizia/steps/StepIdentificaVeicolo'
import { StepCondizioniVeicolo } from '../inizia/steps/StepCondizioniVeicolo'
import AutocompleteIndirizzo, { DatiIndirizzo } from '../inizia/steps/AutocompleteIndirizzo'
import { supabase } from '@/lib/supabase'
import AiutoWhatsApp from '../components/AiutoWhatsApp'
import { CampoModulo, ErrorBadge, InfoBadge, RuoloButton, SceltaPillola, classeCampo } from '../inizia/steps/PezziFlusso'
import { GuscioFlusso } from '../inizia/steps/GuscioFlusso'
import { articolo, articoloDel, articoloSul, nomeVeicolo, veicoloHaCambio, isFemminile } from '@/lib/nomiVeicolo'
import { StepIntestazione } from '../inizia/steps/StepIntestazione'

// ============================================================
// I PASSI
// ============================================================
type Passo =
  | 'tipo-veicolo' | 'intestazione' | 'eredi' | 'societa-fallita' | 'identifica'
  | 'condizioni' | 'indirizzo' | 'targa' | 'cf' | 'foto' | 'fermo' | 'account'

// Stesso ordine e stesse condizioni di getSteps() in /inizia
function calcolaPassi(intestazione: Intestazione | null, erediRinuncia: 'si' | 'no' | null, societaFallita: 'si' | 'no' | null): Passo[] {
  const p: Passo[] = ['tipo-veicolo', 'intestazione']
  if (intestazione === 'deceduto') p.push('eredi')
  if (intestazione === 'societa') p.push('societa-fallita')
  p.push('identifica', 'condizioni', 'indirizzo', 'targa')
  if (intestazione !== 'targhe_straniere') p.push('cf')
  p.push('foto')
  const cas = derivaCasistica(intestazione, erediRinuncia, societaFallita)
  if (fermoApplicabile(cas)) p.push('fermo')
  p.push('account')
  return p
}

const ETICHETTE: Record<Passo, string> = {
  'tipo-veicolo': 'Tipo di veicolo', intestazione: 'Intestazione', eredi: 'Eredità', 'societa-fallita': 'Società',
  identifica: 'Informazioni sul veicolo', condizioni: 'Condizioni', indirizzo: 'Dove si trova',
  targa: 'Targa', cf: 'Codice fiscale', foto: 'Foto', fermo: 'Fermo amministrativo', account: 'Crea il tuo account',
}

// I titoli sono GEMELLI di quelli del flusso demolizione (stesse parole,
// stesso nome del mezzo scelto). Dove il testo è diverso c'è un motivo
// scritto accanto.
function metaDi(passo: Passo, tipo: TipoMezzo | null, tipoAltro: string, intestazione: Intestazione | null, loggato: boolean): { banner: string; titolo: string; sotto: string } {
  const art = articolo(tipo, tipoAltro)
  const artDel = articoloDel(tipo, tipoAltro)
  const a = isFemminile(tipo) ? 'a' : 'o'

  switch (passo) {
    case 'tipo-veicolo':
      return { banner: 'Tipo di veicolo', titolo: 'Che tipo di *veicolo* è?', sotto: 'Seleziona il tipo di mezzo per iniziare.' }
    case 'intestazione':
      return { banner: 'Intestazione', titolo: `A chi è *intestat${a}* ${art}?`, sotto: 'Scegli in base a chi risulta proprietario sui documenti.' }
    case 'eredi':
      return { banner: 'Eredità', titolo: "Qualcuno degli eredi ha *rinunciato all'eredità*?", sotto: 'Parliamo di rinuncia formale, fatta da un Notaio o in Tribunale.' }
    case 'societa-fallita':
      return { banner: 'Società', titolo: 'La società è *fallita o in liquidazione giudiziale*?', sotto: 'Ci serve per preparare i documenti corretti.' }
    case 'identifica':
      return { banner: 'Informazioni sul veicolo', titolo: `Informazioni *${articoloSul(tipo, tipoAltro)}*`, sotto: veicoloHaCambio(tipo) ? 'Anno, km, marca, modello, cambio e alimentazione.' : 'Anno, km, marca, modello e alimentazione.' }
    case 'condizioni':
      return { banner: 'Condizioni', titolo: `In che *condizioni* è ${art}?`, sotto: 'Rispondi alle 4 domande, ti bastano pochi secondi.' }
    case 'indirizzo':
      // qui non c'è il carro attrezzi: serve solo a capire chi può venire a vederlo
      return { banner: 'Dove si trova', titolo: `*Dove si trova* ${art}?`, sotto: 'Ci serve per capire chi può venire a vedere il mezzo e a ritirarlo.' }
    case 'targa':
      return { banner: 'Targa', titolo: `Qual è la *targa* ${artDel}?`, sotto: intestazione === 'targhe_straniere' ? 'Inserisci la targa estera così come appare sul mezzo.' : 'La trovi sul libretto di circolazione.' }
    case 'cf':
      if (intestazione === 'societa') return { banner: 'Partita IVA', titolo: '*Partita IVA* della società intestataria', sotto: 'La trovi sul libretto di circolazione o in visura camerale. Va bene anche il codice fiscale numerico della società.' }
      if (intestazione === 'associazione') return { banner: 'Codice fiscale', titolo: "*Codice fiscale* dell'associazione", sotto: "Quello dell'ente intestatario del mezzo: lo trovi sul certificato di attribuzione del codice fiscale." }
      if (intestazione === 'deceduto') return { banner: 'Codice fiscale', titolo: "*Codice fiscale* dell'intestatario deceduto", sotto: 'Lo trovi sul libretto di circolazione o sui documenti del defunto.' }
      if (intestazione === 'altra_persona') return { banner: 'Codice fiscale', titolo: '*Codice fiscale* di chi risulta intestatario al PRA', sotto: 'Lo trovi sul libretto di circolazione o sul certificato di proprietà.' }
      return { banner: 'Codice fiscale', titolo: 'Il tuo *codice fiscale*', sotto: 'Ci serve per verificare eventuali fermi amministrativi al PRA.' }
    case 'foto':
      // in valutazione le foto sono OBBLIGATORIE (almeno quattro): senza non si valuta
      return { banner: 'Foto', titolo: `*Foto* ${artDel}`, sotto: 'Ne servono almeno quattro: più sono chiare, più la risposta sarà precisa.' }
    case 'fermo':
      return { banner: 'Fermo amministrativo', titolo: 'Ci sono *fermi amministrativi* sul mezzo?', sotto: 'Il fermo amministrativo non blocca la demolizione: possiamo aiutarti a svincolare il mezzo dal fermo solo per demolizione. Troverai i moduli da compilare nella tua area personale.' }
    case 'account':
      return loggato
        ? { banner: 'Conferma e invia', titolo: 'Conferma e invia', sotto: 'Sei già registrato: la risposta la troverai nella tua area personale.' }
        : { banner: 'Crea il tuo account', titolo: '*Ultimo passo!*', sotto: 'Crea il tuo account gratuito: lì troverai la nostra risposta e potrai accettarla.' }
  }
}

// Le sei foto guidate: le prime quattro (davanti, dietro, i due lati) bastano
const POSIZIONI_FOTO = [
  { chiave: 'davanti', label: 'Davanti' },
  { chiave: 'dietro', label: 'Dietro' },
  { chiave: 'destro', label: 'Lato destro' },
  { chiave: 'sinistro', label: 'Lato sinistro' },
  { chiave: 'interni', label: 'Interni' },
  { chiave: 'cruscotto', label: 'Cruscotto coi km' },
]
const FOTO_MINIME = 4

// ============================================================
export default function VendiAuto() {
  const router = useRouter()

  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)
  const [messaggioInvio, setMessaggioInvio] = useState('')

  // ---- dati del veicolo (stessi campi e stessi passi del flusso demolizione) ----
  const [veicolo, setVeicolo] = useState<DatiVeicolo>({
    tipo: null, tipoAltro: '', anno: '', km: '', marca: '', modello: '',
    tipoCambio: null, alimentazione: null, incidentato: null, marciante: null, vaInMoto: null, partiMancanti: null, note: '',
  })
  const aggiornaVeicolo = (d: Partial<DatiVeicolo>) => setVeicolo(prev => ({ ...prev, ...d }))

  // ---- intestazione e rami (decidono la casistica quando diventa demolizione) ----
  const [intestazione, setIntestazione] = useState<Intestazione | null>(null)
  const [erediRinuncia, setErediRinuncia] = useState<'si' | 'no' | null>(null)
  const [societaFallita, setSocietaFallita] = useState<'si' | 'no' | null>(null)

  // ---- dove si trova, targa, codice fiscale, foto, fermo ----
  const [indirizzo, setIndirizzo] = useState('')
  const [datiIndirizzo, setDatiIndirizzo] = useState<DatiIndirizzo | null>(null)
  // cosa c'è scritto nel campo indirizzo e se Google è spento (ripiego a mano)
  const [testoIndirizzo, setTestoIndirizzo] = useState({ testo: '', aMano: false })
  const onTestoIndirizzo = useCallback((testo: string, aMano: boolean) => setTestoIndirizzo({ testo, aMano }), [])
  const [targa, setTarga] = useState('')
  const [targhePresenti, setTarghePresenti] = useState<'si' | 'no' | null>(null)
  const [cf, setCf] = useState('')
  const [foto, setFoto] = useState<Record<string, File>>({})
  const [fermo, setFermo] = useState<FermoAmministrativo | null>(null)

  // ---- account ----
  const [utenteLoggato, setUtenteLoggato] = useState<{ id: string } | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUtenteLoggato({ id: session.user.id })
    })
  }, [])

  // ---- i passi (cambiano con l'intestazione) e dove siamo ----
  const passi = calcolaPassi(intestazione, erediRinuncia, societaFallita)
  const [idx, setIdx] = useState(0)
  const passo: Passo = passi[Math.min(idx, passi.length - 1)]
  const meta = metaDi(passo, veicolo.tipo, veicolo.tipoAltro, intestazione, !!utenteLoggato)

  const cfAccetta11 = intestazione === 'societa' || intestazione === 'associazione'
  const cfValido = cfAccetta11 ? (cf.length === 11 || cf.length === 16) : cf.length === 16
  const numeroFoto = Object.keys(foto).length

  // ---- navigazione ----
  function avanti() {
    setErrore('')
    if (idx < passi.length - 1) {
      setIdx(idx + 1)
      window.scrollTo({ top: 0 })
    }
  }
  function indietro() {
    setErrore('')
    if (idx === 0) router.push('/')
    else { setIdx(idx - 1); window.scrollTo({ top: 0 }) }
  }

  // Controlli del passo prima di andare avanti
  function avantiControllato() {
    if (passo === 'intestazione' && !intestazione) return setErrore('Scegli a chi è intestato il mezzo')
    if (passo === 'eredi' && !erediRinuncia) return setErrore("Seleziona un'opzione per continuare")
    if (passo === 'societa-fallita' && !societaFallita) return setErrore("Seleziona un'opzione per continuare")
    if (passo === 'indirizzo' && !datiIndirizzo) {
      // Google spento: l'indirizzo scritto per intero va bene così (⭐ 09/09,
      // niente secondo bottone "Conferma indirizzo")
      const scritto = testoIndirizzo.testo.trim()
      if (testoIndirizzo.aMano && scritto.length >= 5) {
        setIndirizzo(scritto)
        setDatiIndirizzo({ indirizzo: scritto })
        return avanti()
      }
      return setErrore(scritto.length > 0 && !testoIndirizzo.aMano ? "Scegli l'indirizzo tra i suggerimenti" : 'Scrivi dove si trova il mezzo')
    }
    if (passo === 'targa') {
      if (targa.trim().length < 5) return setErrore('Scrivi la targa del mezzo')
      if (intestazione !== 'targhe_straniere' && !targhePresenti) return setErrore('Indica se le targhe sono presenti sul mezzo')
    }
    if (passo === 'cf' && !cfValido) return setErrore(cfAccetta11 ? 'Inserisci una partita IVA (11 cifre) o un codice fiscale valido (16 caratteri)' : 'Inserisci un codice fiscale valido di 16 caratteri')
    if (passo === 'foto' && numeroFoto < FOTO_MINIME) return setErrore(`Aggiungi almeno ${FOTO_MINIME} foto: davanti, dietro e i due lati. Senza non riusciamo a valutare`)
    if (passo === 'fermo' && !fermo) return setErrore("Seleziona un'opzione per continuare")
    avanti()
  }

  // ============================================================
  // INVIO
  // ============================================================
  async function invia() {
    setErrore('')
    if (!nome.trim()) return setErrore('Scrivi il tuo nome')
    if (!telefono.trim()) return setErrore('Scrivi il tuo telefono: ti chiamiamo Noi con la risposta')
    if (!utenteLoggato) {
      if (!email.trim()) return setErrore('Scrivi la tua email')
      if (password.length < 6) return setErrore('La password deve avere almeno 6 caratteri')
    }

    setInvio(true)
    try {
      // 1. account (o sessione già aperta)
      let userId = utenteLoggato?.id
      if (!userId) {
        setMessaggioInvio('Creo il tuo account...')
        const { data: reg, error: errReg } = await supabase.auth.signUp({ email: email.trim(), password })
        if (errReg) throw errReg
        userId = reg.user?.id
        if (!userId) throw new Error('Utente non creato')
        await supabase.from('utenti').insert({
          id: userId, nome: nome.trim(), email: email.trim(), telefono: telefono.trim(), tipo: 'cliente', stato: 'attivo',
        })
      }

      // 2. la richiesta di valutazione (stessi nomi di colonna delle pratiche,
      //    così il passaggio a demolizione è una copia campo per campo)
      setMessaggioInvio('Salvo la tua richiesta...')
      const cas = derivaCasistica(intestazione, erediRinuncia, societaFallita)
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
          alimentazione: veicolo.alimentazione,
          incidentato: veicolo.incidentato === null ? null : veicolo.incidentato === 'si',
          va_in_moto: veicolo.vaInMoto === null ? null : veicolo.vaInMoto === 'si',
          marciante: veicolo.marciante === null ? null : veicolo.marciante === 'si',
          parti_mancanti: veicolo.partiMancanti === null ? null : veicolo.partiMancanti === 'si',
          note_veicolo: veicolo.note.trim() || null,
          indirizzo: datiIndirizzo?.indirizzo || indirizzo || null,
          comune: datiIndirizzo?.comune || null,
          provincia: datiIndirizzo?.provincia || null,
          cap: datiIndirizzo?.cap || null,
          lat: datiIndirizzo?.lat ?? null,
          lng: datiIndirizzo?.lng ?? null,
          targa: targa.trim().toUpperCase() || null,
          targhe_presenti: targhePresenti === null ? null : targhePresenti === 'si',
          codice_fiscale: cf || null,
          intestazione,
          eredi_rinuncia: erediRinuncia === null ? null : erediRinuncia === 'si',
          societa_fallita: societaFallita === null ? null : societaFallita === 'si',
          casistica: cas,
          fermo_amministrativo: fermo,
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

  // I passi che hanno il bottone "Continua" dentro il componente riusato
  const bottoneDentro = passo === 'tipo-veicolo' || passo === 'intestazione' || passo === 'identifica' || passo === 'condizioni'

  // ============================================================
  return (
    <GuscioFlusso
      servizio="Richiesta valutazione gratuita"
      mezzo={nomeVeicolo(veicolo.tipo, veicolo.tipoAltro)}
      passo={idx + 1}
      totale={passi.length}
      titoloBanner={meta.banner}
      titolo={meta.titolo}
      sotto={meta.sotto}
      onIndietro={indietro}
      passiEtichette={passi.map(k => ETICHETTE[k])}
      icona={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" /></svg>}
    >

        {/* ---------- errore del passo ---------- */}
        {errore && <div className="mb-3"><ErrorBadge>{errore}</ErrorBadge></div>}

        {/* ---------- contenuto ---------- */}
        {passo === 'tipo-veicolo' && (
          <StepTipoVeicolo dati={veicolo} onUpdate={aggiornaVeicolo} onNext={avanti} />
        )}

        {passo === 'intestazione' && (
          <StepIntestazione
            valore={intestazione}
            onScegli={v => { setIntestazione(v); setErediRinuncia(null); setSocietaFallita(null); setErrore('') }}
            onContinua={avantiControllato}
            errore={false}
          />
        )}

        {passo === 'eredi' && (
          <div className="flex flex-col gap-2">
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              label="No, tutti hanno accettato"
              sub="Nessuna rinuncia formale"
              selected={erediRinuncia === 'no'}
              onClick={() => { setErediRinuncia('no'); setErrore('') }}
            />
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/></svg>}
              label="Sì, qualcuno ha rinunciato"
              sub="Almeno un erede deve aver accettato"
              selected={erediRinuncia === 'si'}
              onClick={() => { setErediRinuncia('si'); setErrore('') }}
            />
            {erediRinuncia === 'si' && (
              <div className="mt-1"><InfoBadge>Chi ha rinunciato all&apos;eredità <strong>non deve firmare nulla</strong> né consegnare i propri documenti: la pratica la gestisce solo chi ha accettato.</InfoBadge></div>
            )}
          </div>
        )}

        {passo === 'societa-fallita' && (
          <div className="flex flex-col gap-2">
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              label="No, è attiva"
              sub="La società è regolarmente operativa"
              selected={societaFallita === 'no'}
              onClick={() => { setSocietaFallita('no'); setErrore('') }}
            />
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
              label="Sì, c'è un curatore fallimentare"
              sub="Servirà l'autorizzazione del Giudice Delegato"
              selected={societaFallita === 'si'}
              onClick={() => { setSocietaFallita('si'); setErrore('') }}
            />
          </div>
        )}

        {passo === 'identifica' && (
          <StepIdentificaVeicolo dati={veicolo} onUpdate={aggiornaVeicolo} onNext={avanti} />
        )}

        {passo === 'condizioni' && (
          <StepCondizioniVeicolo dati={veicolo} onUpdate={aggiornaVeicolo} onNext={avanti} />
        )}

        {passo === 'indirizzo' && (
          <AutocompleteIndirizzo
            valoreIniziale={indirizzo}
            onSelezione={(d: DatiIndirizzo) => { setIndirizzo(d.indirizzo); setDatiIndirizzo(d); setErrore('') }}
            onTesto={onTestoIndirizzo}
          />
        )}

        {passo === 'targa' && (
          <div className="flex flex-col gap-4">
            {/* ⭐ 09/09 (mockup A): stessa veste della demolizione, niente
                riquadro, targa corta. Qui il testo delle targhe smarrite NON
                nomina la demolizione: il cliente aspetta una risposta, non
                deve pensare che vogliamo già demolirla. */}
            <CampoModulo label="Targa">
              <input
                type="text"
                value={targa}
                onChange={e => { setTarga(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setErrore('') }}
                placeholder="AB 123 CD"
                className={classeCampo(false, 'campo-pillola--grande campo-pillola--targa uppercase')}
                autoCapitalize="characters"
              />
            </CampoModulo>

            {intestazione !== 'targhe_straniere' && (
              <CampoModulo label="Le targhe sono sul mezzo?">
                <div className="scelte-griglia scelte-griglia--due">
                  <SceltaPillola label="Sì, presenti" presa={targhePresenti === 'si'} onClick={() => { setTarghePresenti('si'); setErrore('') }} />
                  <SceltaPillola label="No, smarrite o rubate" presa={targhePresenti === 'no'} onClick={() => { setTarghePresenti('no'); setErrore('') }} />
                </div>
                {targhePresenti === 'no' && (
                  <div className="mt-3"><InfoBadge>Nessun problema: servirà solo una <strong>denuncia di smarrimento</strong>. Con la burocrazia ti aiutiamo noi.</InfoBadge></div>
                )}
              </CampoModulo>
            )}
          </div>
        )}

        {passo === 'cf' && (
          <CampoModulo
            aiuto={cfValido
              ? (cf.length === 11 ? 'Partita IVA valida' : 'Codice fiscale valido')
              : cf.length > 0
                ? (cfAccetta11 ? 'P.IVA: 11 cifre · CF: 16 caratteri' : `Mancano ${16 - cf.length} caratteri`)
                : (cfAccetta11 ? 'Partita IVA (11 cifre) o codice fiscale (16 caratteri)' : 'Il codice fiscale è di 16 caratteri')}
            aiutoTipo={cfValido ? 'ok' : undefined}
          >
            <input
              type="text"
              value={cf}
              onChange={e => { setCf(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setErrore('') }}
              placeholder={cfAccetta11 ? '12345678901' : 'RSSMRA80A01H501Z'}
              className={classeCampo(false, 'campo-pillola--grande uppercase')}
              maxLength={16}
            />
          </CampoModulo>
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
                      className="relative flex flex-col items-center justify-center text-center overflow-hidden"
                      style={{
                        aspectRatio: '1', borderRadius: 12, fontSize: 11, padding: 4, lineHeight: 1.3,
                        border: file ? '1.5px solid #1D4ED8' : '1.5px dashed #C7D0DE',
                        background: file ? '#EFF6FF' : '#F8FAFC',
                        color: file ? '#1D4ED8' : '#8A94A3',
                      }}
                    >
                      {file
                        ? <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={URL.createObjectURL(file)} alt={p.label} className="absolute inset-0 w-full h-full object-cover" />
                            <span className="absolute inset-x-0 bottom-0 py-1 font-semibold text-white" style={{ background: 'rgba(29,78,216,0.85)' }}>{p.label}</span>
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
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-xs font-semibold" style={{ color: numeroFoto >= FOTO_MINIME ? '#16A34A' : '#4B5563' }}>
                {numeroFoto} di {POSIZIONI_FOTO.length} foto
              </span>
              <span className="text-xs" style={{ color: '#6B7280' }}>
                {numeroFoto >= FOTO_MINIME ? 'Puoi continuare' : `Ne servono almeno ${FOTO_MINIME}`}
              </span>
            </div>
            <div className="mt-3"><InfoBadge>Hai un danno da mostrare? Rifai una delle foto inquadrandolo: aiuta a non sbagliare la risposta.</InfoBadge></div>
          </>
        )}

        {passo === 'fermo' && (
          <div className="flex flex-col gap-2">
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              label="Sì"
              sub="Ti aiutiamo noi a svincolarlo per la demolizione"
              selected={fermo === 'si'}
              onClick={() => { setFermo('si'); setErrore('') }}
            />
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
              label="No"
              sub="Nessun fermo presente sul mezzo"
              selected={fermo === 'no'}
              onClick={() => { setFermo('no'); setErrore('') }}
            />
            <RuoloButton
              iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
              label="Non lo so"
              sub="Verifichiamo noi gratuitamente al PRA"
              selected={fermo === 'non_so'}
              onClick={() => { setFermo('non_so'); setErrore('') }}
            />
            {fermo === 'si' && (
              <div className="mt-1"><InfoBadge>La demolizione toglie il veicolo dalla circolazione, ma <strong>il debito che ha causato il fermo resta</strong>, legato al codice fiscale del proprietario.</InfoBadge></div>
            )}
          </div>
        )}

        {passo === 'account' && (
          <div className="flex flex-col gap-3">
            <CampoModulo label="Il tuo nome e cognome">
              <input value={nome} onChange={e => { setNome(e.target.value); setErrore('') }} placeholder="Mario Rossi" className={classeCampo()} />
            </CampoModulo>
            <CampoModulo label="Il tuo numero di telefono" aiuto="Lo usiamo solo per la tua richiesta. Nessuna chiamata commerciale.">
              <input value={telefono} onChange={e => { setTelefono(e.target.value); setErrore('') }} type="tel" inputMode="tel" placeholder="+39 333 1234567" className={classeCampo()} />
            </CampoModulo>
            {!utenteLoggato && (
              <>
                <CampoModulo label="La tua email">
                  <input value={email} onChange={e => { setEmail(e.target.value); setErrore('') }} type="email" inputMode="email" placeholder="mario@email.it" className={classeCampo()} />
                </CampoModulo>
                <CampoModulo label="Scegli una password" aiuto="Almeno 6 caratteri.">
                  <div className="relative">
                    <input
                      value={password}
                      onChange={e => { setPassword(e.target.value); setErrore('') }}
                      type={mostraPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className={classeCampo(false, 'pr-12')}
                    />
                    <button
                      type="button"
                      onClick={() => setMostraPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold"
                      style={{ color: '#1D4ED8' }}
                      aria-label={mostraPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {mostraPassword ? 'Nascondi' : 'Mostra'}
                    </button>
                  </div>
                </CampoModulo>
              </>
            )}
            <InfoBadge>Nella tua area personale troverai la nostra risposta: demolizione gratuita oppure una cifra per il mezzo. Potrai accettarla o rifiutarla da lì.</InfoBadge>
          </div>
        )}

        {/* ---------- bottone di pagina (i passi riusati hanno il loro) ---------- */}
        {!bottoneDentro && (
          <button
            onClick={passo === 'account' ? invia : avantiControllato}
            disabled={invio}
            className="btn-pagina mt-5 disabled:opacity-70"
          >
            {invio ? (messaggioInvio || 'Invio in corso...') : passo === 'account' ? 'Invia la richiesta' : 'Continua'}
          </button>
        )}
      <AiutoWhatsApp />
    </GuscioFlusso>
  )
}
