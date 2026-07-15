/**
 * MODULI ACI ORIGINALI — mappa template → file PDF in docs/moduli/originali/.
 *
 * ⭐ DECISIONE 10/07/2026 (Davide): i moduli ACI si scaricano IN BIANCO,
 * così come sono (col logo ACI): li compila il cliente a penna.
 * NIENTE scrittura dei dati sopra i PDF ufficiali (provata e scartata:
 * il risultato non era abbastanza professionale).
 * Restano auto-compilati SOLO i moduli nostri: deleghe e fermo.
 */

export type ModuloAci = 'eredita' | 'eredita_rinuncia' | 'legale_rappresentante' | 'non_intestatario'

// Nome file del PDF originale per ogni modulo (in docs/moduli/originali/)
export const FILE_MODULO_ACI: Record<ModuloAci, string> = {
  eredita: 'DICHIARAZIONE_SOSTITUTIVA_EREDITÀ.pdf',
  eredita_rinuncia: 'DICHIARAZIONE_SOSTITUTIVA_EREDITÀ_RINUNCIA.pdf',
  legale_rappresentante: 'DICHIARAZIONE_SOSTITUTIVA_LEGALE_RAPPRESENTANTE.pdf',
  non_intestatario: 'DICHIARAZIONE_SOSTITUTIVA_RADIAZIONE_PROPRIETARIO_NON_INTESTATARIO.pdf',
}
