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

export const NOMI_INTESTAZIONE: Record<string, string> = {
  me: 'Privato (lui stesso)',
  deceduto: 'Erede',
  altra_persona: 'Passaggio mai fatto',
  societa: 'Società',
  associazione: 'Associazione',
  targhe_straniere: 'Targhe straniere',
}

export const NOMI_CASISTICHE: Record<string, string> = {
  persona_fisica: 'Standard',
  eredi_accettato: 'Eredi (accettata)',
  eredi_rinuncia: 'Eredi (con rinuncia)',
  societa: 'Società',
  societa_fallita: 'Società fallita',
  associazione: 'Associazione',
  non_intestatario: 'Non intestatario',
  targhe_straniere: 'Targhe straniere',
}
