// ============================================================
// STATI DELLA RICHIESTA DI VALUTAZIONE (flusso D) — la lingua della
// lista "Valutazioni" in admin e, a specchio, della card nel cliente.
// ⭐ 18/09 (mockup A approvato da Davide): tre fasi in fila e due
// caselle staccate. Stessa palette delle pratiche (lib/statiCrm.ts):
// il flusso è azzurro, il traguardo verde, il rifiuto rosso tenue.
// ============================================================

import { PILL_FLUSSO, PILL_ROSSO_TENUE } from './statiCrm'

export type StatoValutazione = 'da_valutare' | 'risposta_inviata' | 'passata_demolizione' | 'rifiutata' | 'chiusa'

export const STATI_VALUTAZIONE: { chiave: StatoValutazione; label: string; bg: string; text: string; inFila: boolean }[] = [
  { chiave: 'da_valutare', label: 'Da valutare', ...PILL_FLUSSO, inFila: true },
  { chiave: 'risposta_inviata', label: 'Risposta inviata', ...PILL_FLUSSO, inFila: true },
  { chiave: 'passata_demolizione', label: 'Passata a demolizione', bg: '#DCF3E4', text: '#1F7A43', inFila: true },
  { chiave: 'rifiutata', label: 'Rifiutata', ...PILL_ROSSO_TENUE, inFila: false },
  { chiave: 'chiusa', label: 'Chiusa', bg: '#E8ECF3', text: '#5B6779', inFila: false },
]

export function metaValutazione(stato: string) {
  return STATI_VALUTAZIONE.find(s => s.chiave === stato) || { chiave: 'chiusa' as StatoValutazione, label: stato, bg: '#EDF0F5', text: '#64748B', inFila: false }
}

// Le due risposte dell'admin
export type OffertaTipo = 'demolizione' | 'acquisto'

// ⭐ 19/11 (Davide): gli EVENTI della valutazione, con le loro pillole. Li usano
// la scheda "Cronologia e Note" della richiesta e, quando la richiesta diventa
// una pratica, la cronologia della pratica: lì la storia arriva come righe di
// `pratiche_note` con questi codici in `evento` (vedi /api/valutazione-completa).
// ⭐ 19/11 (Davide: "non capisco la cronologia"): la storia della valutazione.
// Il cliente chiede la valutazione → noi proponiamo la demolizione gratuita
// oppure una cifra → il cliente accetta o rifiuta → se accetta e completa,
// nasce la pratica.
// REGOLA (Davide): sotto la pillola c'è una frase SOLO quando aggiunge
// qualcosa che la pillola non dice. "Accettata dal cliente", "Passata a
// demolizione", "Chiusa", "Richiesta valutazione" parlano da sole.
// ⭐ 20/11 (Davide): anche la proposta di demolizione parla da sola, con la
// pillola "Proposta demolizione gratuita" e NIENTE sotto; solo la proposta
// di una cifra tiene "Proposta inviata" con la cifra sotto (vedi voceProposta).
export const EVENTI_VALUTAZIONE: Record<'val_arrivata' | 'val_risposta' | 'val_accettata' | 'val_rifiutata' | 'val_chiusa' | 'val_passata', { label: string; bg: string; col: string }> = {
  val_arrivata: { label: 'Richiesta valutazione', bg: '#EEF1F5', col: '#5B6779' },
  val_risposta: { label: 'Proposta inviata', bg: '#DBEAFE', col: '#1D4ED8' },
  val_accettata: { label: 'Accettata dal cliente', bg: '#DCF3E4', col: '#1F7A43' },
  val_rifiutata: { label: 'Rifiutata dal cliente', bg: '#FBE2E2', col: '#A94444' },
  val_chiusa: { label: 'Chiusa', bg: '#E8ECF3', col: '#5B6779' },
  val_passata: { label: 'Passata a demolizione', bg: '#DCF3E4', col: '#1F7A43' },
}

const cifra = (importo: number | null | undefined) => importo == null ? '—' : `${Number(importo).toLocaleString('it-IT')} €`

/** Quale proposta abbiamo fatto al cliente */
export function fraseProposta(tipo: string | null | undefined, importo: number | null | undefined): string {
  if (tipo === 'acquisto') return `Proposta la cifra di ${cifra(importo)}`
  if (tipo === 'demolizione') return FRASE_DEMOLIZIONE
  return '—'
}

const FRASE_DEMOLIZIONE = 'Proposta la demolizione gratuita'
const PILLOLA_PROPOSTA_DEMOLIZIONE = { label: 'Proposta demolizione gratuita', bg: '#DBEAFE', col: '#1D4ED8' }

/** La voce "proposta" nella cronologia, uguale nella richiesta e nella pratica
 *  che ne nasce: la pillola e, solo per la cifra, la frase sotto */
export function voceProposta(tipo: string | null | undefined, importo: number | null | undefined): { pillola: { label: string; bg: string; col: string }; frase: string; demolizione: boolean } {
  if (tipo === 'demolizione') return { pillola: PILLOLA_PROPOSTA_DEMOLIZIONE, frase: '', demolizione: true }
  return { pillola: EVENTI_VALUTAZIONE.val_risposta, frase: fraseProposta(tipo, importo), demolizione: false }
}

/** La stessa voce, letta dalla riga di storia salvata nella pratica */
export function vocePropostaDaTesto(testo: string) {
  const frase = fraseDaTestoCorto(testo)
  if (frase === FRASE_DEMOLIZIONE) return voceProposta('demolizione', null)
  return { pillola: EVENTI_VALUTAZIONE.val_risposta, frase, demolizione: false }
}

/** Le righe di storia già salvate con le parole di prima ("Demolizione gratuita",
 *  "Riconosciamo 300 €", "Proposto l'acquisto a 300 €") si leggono con le
 *  stesse parole delle nuove */
export function fraseDaTestoCorto(testo: string): string {
  if (testo === 'Demolizione gratuita') return fraseProposta('demolizione', null)
  for (const vecchio of ['Riconosciamo ', "Proposto l'acquisto a "]) {
    if (testo.startsWith(vecchio)) return `Proposta la cifra di ${testo.slice(vecchio.length)}`
  }
  return testo
}

/** ⭐ 20/11 (Davide): cosa comprende la demolizione gratuita, la riga fissa
 *  che il cliente legge sotto "Demolizione gratuita" nella proposta */
export const INCLUSO_DEMOLIZIONE = 'Ritiro a domicilio incluso, costi di rottamazione inclusi, spese PRA incluse. Consegna del Certificato di Rottamazione.'

/** Com'è scritta la risposta data dall'admin, ovunque compaia */
export function testoOfferta(tipo: string | null | undefined, importo: number | null | undefined): string {
  if (tipo === 'acquisto') return `Riconosciamo ${importo == null ? '—' : `${Number(importo).toLocaleString('it-IT')} €`}`
  if (tipo === 'demolizione') return 'Demolizione gratuita'
  return '—'
}

export const NOMI_CASISTICHE: Record<string, string> = {
  persona_fisica: 'Persona fisica',
  eredi_accettato: 'Eredi (accettata)',
  eredi_rinuncia: 'Eredi (con rinuncia)',
  societa: 'Società',
  societa_fallita: 'Società fallita',
  associazione: 'Associazione',
  non_intestatario: 'Non intestatario',
  targhe_straniere: 'Targhe straniere',
}
