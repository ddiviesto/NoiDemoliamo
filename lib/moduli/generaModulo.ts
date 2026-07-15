/**
 * SMISTATORE CENTRALE dei moduli PDF: dato il nome del template nel catalogo
 * (`casistiche_documenti.template_pdf`) e i dati della pratica, produce il
 * PDF compilato. Usato dall'endpoint /api/modulo-pdf e dallo script delle
 * anteprime (docs/moduli/genera-anteprime.ts).
 *
 * ⭐ DECISIONE 10/07 sera (Davide): auto-compilate SOLO le DELEGHE.
 * - Deleghe (nostre): generate con pdf-lib, dati della pratica compilati
 * - Fermo/fuori uso (nostro): generato con pdf-lib ma IN BIANCO — il
 *   mezzo-compilato non piaceva; compila tutto il cliente a penna
 * - Curatore: si serve il PDF ORIGINALE di Davide così com'è (in bianco)
 * - Moduli ACI (eredità, rinuncia, legale rappresentante/presidente,
 *   non intestatario): serviti COSÌ COME SONO, in bianco, col logo ACI —
 *   il chiamante fornisce i byte dei PDF con `leggiTemplateAci`
 */

import { generaDelegaConsegna, VarianteDelega } from './delegaConsegna'
import { generaDichiarazioneFermo, VarianteFermo } from './dichiarazioneFermo'
import { FILE_MODULO_ACI, ModuloAci } from './moduliAci'

export interface DatiPraticaModulo {
  casistica?: string | null
  nomeRichiedente?: string | null
  codiceFiscale?: string | null
  marcaModello?: string | null
  targa?: string | null
  delegatoNome?: string | null
}

// Le deleghe hanno un template per casistica (dal catalogo)
const DELEGA_PER_TEMPLATE: Record<string, VarianteDelega> = {
  DELEGA_CONSEGNA_VEICOLO_PRIVATO: 'privato',
  DELEGA_CONSEGNA_VEICOLO_EREDI: 'eredi',
  DELEGA_CONSEGNA_VEICOLO_EREDI_RINUNCIA: 'eredi_rinuncia',
  DELEGA_CONSEGNA_VEICOLO_SOCIETA_AZIENDA: 'societa',
  DELEGA_CONSEGNA_VEICOLO_FALLIMENTO: 'fallimento',
  DELEGA_CONSEGNA_VEICOLO_ASSOCIAZIONE: 'associazione',
}

// Il fermo è unico nel catalogo: la variante segue la casistica della pratica
const FERMO_PER_CASISTICA: Record<string, VarianteFermo> = {
  persona_fisica: 'privato',
  eredi_accettato: 'eredi',
  eredi_rinuncia: 'eredi_rinuncia',
  societa: 'societa',
  societa_fallita: 'fallimento',
  associazione: 'associazione',
  non_intestatario: 'non_intestatario',
}

// Moduli ACI: template del catalogo → modulo (il presidente associazione
// riusa il modulo del legale rappresentante, deciso il 10/07)
const ACI_PER_TEMPLATE: Record<string, ModuloAci> = {
  DICHIARAZIONE_SOSTITUTIVA_EREDITA: 'eredita',
  DICHIARAZIONE_SOSTITUTIVA_EREDITA_RINUNCIA: 'eredita_rinuncia',
  DICHIARAZIONE_SOSTITUTIVA_LEGALE_RAPPRESENTANTE: 'legale_rappresentante',
  DICHIARAZIONE_SOSTITUTIVA_PRESIDENTE_ASSOCIAZIONE: 'legale_rappresentante',
  DICHIARAZIONE_SOSTITUTIVA_RADIAZIONE_PROPRIETARIO_NON_INTESTATARIO: 'non_intestatario',
}

export async function generaModuloCompilato(
  templatePdf: string,
  dati: DatiPraticaModulo,
  leggiTemplateAci: (nomeFile: string) => Promise<Uint8Array>,
): Promise<Uint8Array> {

  const variante = DELEGA_PER_TEMPLATE[templatePdf]
  if (variante) {
    return generaDelegaConsegna(variante, {
      nomeDelegante: dati.nomeRichiedente,
      codiceFiscale: dati.codiceFiscale,
      marcaModello: dati.marcaModello,
      targa: dati.targa,
      nomeDelegato: dati.delegatoNome,
    })
  }

  if (templatePdf === 'DICHIARAZIONE_SOSTITUTIVA_STATO_VEICOLO_CON_FERMO_AMMINISTRATIVO') {
    // IN BIANCO (deciso 10/07 sera: il mezzo-compilato non piaceva) —
    // la variante serve solo per la qualifica giusta della casistica
    const varianteFermo = FERMO_PER_CASISTICA[dati.casistica || ''] || 'privato'
    return generaDichiarazioneFermo(varianteFermo, {})
  }

  if (templatePdf === 'DICHIARAZIONE_SOSTITUTIVA_CURATORE_FALLIMENTARE') {
    // PDF originale di Davide, in bianco: lo compila il curatore a penna (decisione 10/07)
    return leggiTemplateAci('DICHIARAZIONE_SOSTITUTIVA_CURATORE_FALLIMENTARE.pdf')
  }

  const moduloAci = ACI_PER_TEMPLATE[templatePdf]
  if (moduloAci) {
    // PDF ACI originale, in bianco: lo compila il cliente a penna (decisione 10/07)
    return leggiTemplateAci(FILE_MODULO_ACI[moduloAci])
  }

  throw new Error(`Template modulo sconosciuto: ${templatePdf}`)
}
