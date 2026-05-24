export type TipoMezzo =
  | 'autovettura'
  | 'motoveicolo'
  | 'ciclomotore'
  | 'minicar'
  | 'imbarcazione'
  | 'pullman'
  | 'camion'
  | 'velivolo'
  | 'altro'

export type RuoloRichiedente = 'proprietario' | 'delegato' | 'deceduto'
export type EreditaScelta = 'accetta' | 'rinuncia'
export type LibrettoStato = 'si' | 'denuncia' | 'no'
export type CdcStato = 'digitale' | 'cartaceo' | 'smarrito'
export type TipoCambio = 'manuale' | 'automatico' | 'non_so'
export type SpazioCarroAttrezzi = 'libero' | 'stretto' | 'no'

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
  // Step 1
  indirizzo: string
  indirizzoSkipped: boolean
  // Spazio carro attrezzi (legato all'indirizzo)
  spazioCarroAttrezzi: SpazioCarroAttrezzi | null
  spazioCarroAttrezziNote: string
  // Step 2
  targa: string
  targaSkipped: boolean
  // Step 3 — dati veicolo
  veicolo: DatiVeicolo
  // Step 4
  cf: string
  cfSkipped: boolean
  // Step 5
  ruolo: RuoloRichiedente | null
  // Step 6 (solo se deceduto)
  eredita: EreditaScelta | null
  // Step 7
  libretto: LibrettoStato | null
  // Step 8
  cdc: CdcStato | null
  // Step 9
  nome: string
  telefono: string
  // Step 10
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
  ruolo: null,
  eredita: null,
  libretto: null,
  cdc: null,
  nome: '',
  telefono: '',
  email: '',
  password: '',
}