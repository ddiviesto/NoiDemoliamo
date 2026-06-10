export type TipoMezzo =
  | 'autovettura'
  | 'motoveicolo'
  | 'ciclomotore'
  | 'minicar'
  | 'furgone'
  | 'imbarcazione'
  | 'pullman'
  | 'camion'
  | 'velivolo'
  | 'altro'

export type RuoloRichiedente = 'proprietario' | 'delegato' | 'deceduto'
export type EreditaScelta = 'accetta' | 'rinuncia'
export type LibrettoStato = 'si' | 'denuncia' | 'no'
export type CdcStato = 'digitale' | 'cartaceo' | 'smarrito' | 'nessuno'
export type TipoCambio = 'manuale' | 'automatico' | 'non_so'
export type SpazioCarroAttrezzi = 'libero' | 'stretto' | 'no'

// ============================================================
// SISTEMA CASISTICHE
// ============================================================

// Risposta alla domanda "A chi è intestato il mezzo?"
export type Intestazione =
  | 'me'                 // → casistica 1
  | 'deceduto'           // → casistica 2 o 3 (dipende da erediRinuncia)
  | 'altra_persona'      // → casistica 7 (passaggio mai fatto)
  | 'societa'            // → casistica 4 o 5 (dipende da societaFallita)
  | 'associazione'       // → casistica 6
  | 'targhe_straniere'   // → casistica 8

// Le 8 casistiche (codici salvati nel DB, colonna pratiche.casistica)
export type Casistica =
  | 'persona_fisica'
  | 'eredi_accettato'
  | 'eredi_rinuncia'
  | 'societa'
  | 'societa_fallita'
  | 'associazione'
  | 'non_intestatario'
  | 'targhe_straniere'

export type FermoAmministrativo = 'si' | 'no' | 'non_so'
export type ConsegnaMezzo = 'io' | 'delegato'

// Deriva la casistica dalle risposte del flusso
export function derivaCasistica(
  intestazione: Intestazione | null,
  erediRinuncia: 'si' | 'no' | null,
  societaFallita: 'si' | 'no' | null
): Casistica | null {
  if (!intestazione) return null
  switch (intestazione) {
    case 'me': return 'persona_fisica'
    case 'deceduto':
      if (erediRinuncia === 'si') return 'eredi_rinuncia'
      if (erediRinuncia === 'no') return 'eredi_accettato'
      return null
    case 'altra_persona': return 'non_intestatario'
    case 'societa':
      if (societaFallita === 'si') return 'societa_fallita'
      if (societaFallita === 'no') return 'societa'
      return null
    case 'associazione': return 'associazione'
    case 'targhe_straniere': return 'targhe_straniere'
  }
}

// Casistiche in cui NON è ammessa la delega alla consegna
export function delegaAmmessa(casistica: Casistica | null): boolean {
  return casistica !== 'non_intestatario' && casistica !== 'targhe_straniere'
}

// Casistiche in cui NON si chiede il fermo amministrativo
export function fermoApplicabile(casistica: Casistica | null): boolean {
  return casistica !== 'targhe_straniere'
}

export interface DatiVeicolo {
  tipo: TipoMezzo | null
  tipoAltro: string
  anno: string
  km: string
  marca: string
  modello: string
  tipoCambio: TipoCambio | null
  incidentato: 'si' | 'no' | null
  marciante: 'si' | 'no' | null
  vaInMoto: 'si' | 'no' | null
  partiMancanti: 'si' | 'no' | null
  note: string
}

export interface DatiPratica {
  indirizzo: string
  indirizzoSkipped: boolean
  spazioCarroAttrezzi: SpazioCarroAttrezzi | null
  spazioCarroAttrezziNote: string
  targa: string
  targaSkipped: boolean
  targhePresenti: 'si' | 'no' | null
  veicolo: DatiVeicolo
  cf: string
  cfSkipped: boolean
  // --- Sistema casistiche ---
  intestazione: Intestazione | null
  erediRinuncia: 'si' | 'no' | null
  numeroEredi: number
  nomiRinunciatari: string
  societaFallita: 'si' | 'no' | null
  fermo: FermoAmministrativo | null
  consegna: ConsegnaMezzo | null
  delegatoNome: string
  delegatoTelefono: string
  // --- Vecchi campi (in rimozione a fine ristrutturazione) ---
  ruolo: RuoloRichiedente | null
  eredita: EreditaScelta | null
  // ---
  libretto: LibrettoStato | null
  cdc: CdcStato | null
  nome: string
  telefono: string
  email: string
  password: string
}

export const datiPraticaIniziali: DatiPratica = {
  indirizzo: '',
  indirizzoSkipped: false,
  spazioCarroAttrezzi: null,
  spazioCarroAttrezziNote: '',
  targa: '',
  targaSkipped: false,
  targhePresenti: null,
  veicolo: {
    tipo: null,
    tipoAltro: '',
    anno: '',
    km: '',
    marca: '',
    modello: '',
    tipoCambio: null,
    incidentato: null,
    marciante: null,
    vaInMoto: null,
    partiMancanti: null,
    note: '',
  },
  cf: '',
  cfSkipped: false,
  intestazione: null,
  erediRinuncia: null,
  numeroEredi: 1,
  nomiRinunciatari: '',
  societaFallita: null,
  fermo: null,
  consegna: null,
  delegatoNome: '',
  delegatoTelefono: '',
  ruolo: null,
  eredita: null,
  libretto: null,
  cdc: null,
  nome: '',
  telefono: '',
  email: '',
  password: '',
}