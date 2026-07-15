/**
 * Genera le ANTEPRIME dei moduli PDF con dati di prova, per il controllo
 * di Davide prima dell'attivazione (vedi LEGGIMI.md).
 *
 * Uso:  npx tsx docs/moduli/genera-anteprime.ts
 * Output: docs/moduli/anteprime/*.pdf
 */

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { generaDelegaConsegna, VarianteDelega } from '../../lib/moduli/delegaConsegna'
import { generaDichiarazioneFermo, VarianteFermo } from '../../lib/moduli/dichiarazioneFermo'

const CARTELLA = join(__dirname, 'anteprime')

const DATI_PROVA = {
  nomeDelegante: 'Mario Rossi',
  codiceFiscale: 'RSSMRA80A01H501U',
  marcaModello: 'Fiat Panda',
  targa: 'AB123CD',
  nomeDelegato: 'Luigi Bianchi',
}

const DELEGHE: { variante: VarianteDelega; file: string }[] = [
  { variante: 'privato', file: 'DELEGA_CONSEGNA_VEICOLO_PRIVATO_ANTEPRIMA.pdf' },
  { variante: 'eredi', file: 'DELEGA_CONSEGNA_VEICOLO_EREDI_ANTEPRIMA.pdf' },
  { variante: 'eredi_rinuncia', file: 'DELEGA_CONSEGNA_VEICOLO_EREDI_RINUNCIA_ANTEPRIMA.pdf' },
  { variante: 'societa', file: 'DELEGA_CONSEGNA_VEICOLO_SOCIETA_AZIENDA_ANTEPRIMA.pdf' },
  { variante: 'fallimento', file: 'DELEGA_CONSEGNA_VEICOLO_FALLIMENTO_ANTEPRIMA.pdf' },
  { variante: 'associazione', file: 'DELEGA_CONSEGNA_VEICOLO_ASSOCIAZIONE_ANTEPRIMA.pdf' },
]

const VARIANTI_FERMO: VarianteFermo[] = ['privato', 'eredi', 'eredi_rinuncia', 'societa', 'fallimento', 'associazione', 'non_intestatario']

async function main() {
  mkdirSync(CARTELLA, { recursive: true })
  for (const d of DELEGHE) {
    const pdf = await generaDelegaConsegna(d.variante, DATI_PROVA)
    writeFileSync(join(CARTELLA, d.file), pdf)
    console.log(`OK: ${d.file}`)
  }
  for (const v of VARIANTI_FERMO) {
    // IN BIANCO (deciso 10/07 sera): compila tutto il cliente a penna
    const pdf = await generaDichiarazioneFermo(v, {})
    const file = `DICHIARAZIONE_FERMO_${v.toUpperCase()}_ANTEPRIMA.pdf`
    writeFileSync(join(CARTELLA, file), pdf)
    console.log(`OK: ${file}`)
  }

  // Niente anteprime per curatore e moduli ACI: si scaricano i PDF
  // originali così come sono, in bianco (decisione 10/07)
}

main().catch(err => { console.error(err); process.exit(1) })
