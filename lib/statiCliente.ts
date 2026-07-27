// ============================================================
// ⭐ STATI PRATICA LATO CLIENTE (28/07/2026, mockup approvato)
// UNA tabella sola per le pillole di stato: la home ("Le tue
// pratiche") e l'header blu della pagina pratica leggono da qui.
// Mai più due nomi per lo stesso momento della pratica.
// Palette allineata al CRM: flusso tutto azzurro (parla il testo),
// verde solo Completata, rosso tenue per "da rifare" e Annullata,
// azzurro spento per la pausa "In attesa".
// ============================================================

export const PILL_FLUSSO = { bg: '#EFF6FF', text: '#1D4ED8' }
export const PILL_ROSSO_TENUE = { bg: '#F3D9D9', text: '#A94444' }
export const PILL_PAUSA = { bg: '#E8ECF3', text: '#5B6779' }

export interface PillolaStato {
  label: string
  bg: string
  text: string
}

const STATO_INFO: Record<string, PillolaStato> = {
  in_attesa_documenti: { label: 'In attesa documenti', ...PILL_FLUSSO },
  in_attesa_approvazione_admin: { label: 'In verifica', ...PILL_FLUSSO },
  documenti_parzialmente_approvati: { label: 'Documenti da rifare', ...PILL_ROSSO_TENUE },
  da_assegnare: { label: 'In attesa assegnazione', ...PILL_FLUSSO },
  in_attesa_assegnazione: { label: 'In attesa assegnazione', ...PILL_FLUSSO },
  in_assegnazione_manuale: { label: 'In attesa assegnazione', ...PILL_FLUSSO },
  assegnata: { label: 'Demolitore assegnato', ...PILL_FLUSSO },
  in_attesa_conferma_cliente: { label: 'Demolitore assegnato', ...PILL_FLUSSO },
  ritiro_confermato: { label: 'Ritiro confermato', ...PILL_FLUSSO },
  ritirata: { label: 'Veicolo ritirato', ...PILL_FLUSSO },
  in_attesa_recensione_cliente: { label: 'Veicolo ritirato', ...PILL_FLUSSO },
  in_attesa_cert_rottamazione: { label: 'In attesa certificato', ...PILL_FLUSSO },
  in_attesa_cert_radiazione_pra: { label: 'In attesa PRA', ...PILL_FLUSSO },
  completata: { label: 'Completata', bg: '#DCF3E4', text: '#1F7A43' },
  annullata: { label: 'Annullata', ...PILL_ROSSO_TENUE },
}

// La pillola giusta per la pratica: gestisce anche la pausa decisa
// dall'admin (il cliente vede solo "In attesa", mai i motivi)
export function pillolaStato(stato: string, inAttesa?: boolean | null): PillolaStato {
  if (inAttesa && stato !== 'completata' && stato !== 'annullata') {
    return { label: 'In attesa', ...PILL_PAUSA }
  }
  return STATO_INFO[stato] || { label: stato, bg: '#E7EAEE', text: '#4B5563' }
}
