// ============================================================
// STATI PRATICA — LA LINGUA DEL CRM (etichetta + colori pillola
// + barra colorata della riga).
//
// ⭐ 28/07 sera: spostati qui da app/admin/page.tsx perché ora li
// usa anche la CRONOLOGIA (l'evento di cambio stato mostra la
// pillola ESATTA del CRM, es. "In attesa documenti · da rifare").
// Il cliente ha la sua tabella gemella in lib/statiCliente.ts
// (nomenclatura unica admin↔cliente: se nasce uno stato nuovo va
// nominato in coppia).
// ============================================================

// ⭐ PALETTE A (26/07, mockup approvato): il FLUSSO è tutto AZZURRO (parla
// il testo della pillola), le eccezioni vere sono le uniche colorate:
// verde = completata, ROSSO TENUE = annullata e anomalie, rosso medio
// pieno = "Da contattare". Via il giallo senape e l'arcobaleno.
export const PILL_FLUSSO = { bg: '#EFF6FF', text: '#1D4ED8' }
export const PILL_ROSSO_TENUE = { bg: '#F3D9D9', text: '#A94444' }

export const STATO_META: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  // Fase 1 — In attesa documenti
  in_attesa_documenti: { label: 'In attesa documenti', ...PILL_FLUSSO, bar: '#EF9F27' },
  documenti_parzialmente_approvati: { label: 'In attesa documenti · da rifare', ...PILL_ROSSO_TENUE, bar: '#E24B4A' },
  // Fase 2 — Documenti da verificare
  in_attesa_approvazione_admin: { label: 'Documenti da verificare', ...PILL_FLUSSO, bar: '#378ADD' },
  // Fase 3 — Da assegnare
  da_assegnare: { label: 'Da assegnare', ...PILL_FLUSSO, bar: '#D85A30' },
  in_attesa_assegnazione: { label: 'Da assegnare · in corso', ...PILL_FLUSSO, bar: '#D85A30' },
  in_assegnazione_manuale: { label: 'Da assegnare · a mano', ...PILL_ROSSO_TENUE, bar: '#E24B4A' },
  // Fase 4 — Assegnata
  assegnata: { label: 'Assegnata', ...PILL_FLUSSO, bar: '#7F77DD' },
  in_attesa_conferma_cliente: { label: 'Assegnata · attesa cliente', ...PILL_FLUSSO, bar: '#7F77DD' },
  // ⭐ 27/07 (rinomine di Davide): "Ritiro Programmato" secco; la famiglia
  // del ritiro resta "Ritirata" (il "Mezzo Ritirato" è stato ripensato)
  ritiro_confermato: { label: 'Ritiro Programmato', ...PILL_FLUSSO, bar: '#7F77DD' },
  // Fase 5 — Ritirata
  ritirata: { label: 'Ritirata · Attesa Certificati', ...PILL_FLUSSO, bar: '#1D9E75' },
  in_attesa_recensione_cliente: { label: 'Ritirata · attesa recensione', ...PILL_FLUSSO, bar: '#1D9E75' },
  in_attesa_cert_rottamazione: { label: 'Ritirata · Attesa Certificati', ...PILL_FLUSSO, bar: '#1D9E75' },
  in_attesa_cert_radiazione_pra: { label: 'Ritirata · Attesa PRA', ...PILL_FLUSSO, bar: '#1D9E75' },
  // Fase 6 — Completata (verde, l'unico traguardo)
  completata: { label: 'Completata', bg: '#DCF3E4', text: '#1F7A43', bar: '#639922' },
  annullata: { label: 'Annullata', ...PILL_ROSSO_TENUE, bar: '#C0C7D1' },
}

export function metaStato(stato: string) {
  return STATO_META[stato] || { label: stato, bg: '#EDF0F5', text: '#64748B', bar: '#C0C7D1' }
}
