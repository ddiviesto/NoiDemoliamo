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
  indirizzo: string
  indirizzoSkipped: boolean
  spazioCarroAttrezzi: SpazioCarroAttrezzi | null
  spazioCarroAttrezziNote: string
  targa: string
  targaSkipped: boolean
  veicolo: DatiVeicolo
  cf: string
  cfSkipped: boolean
  ruolo: RuoloRichiedente | null
  eredita: EreditaScelta | null
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