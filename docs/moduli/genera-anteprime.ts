/**
 * Genera le ANTEPRIME dei moduli PDF con dati di prova, per il controllo
 * di Davide prima dell'attivazione (vedi LEGGIMI.md).
 *
 * Uso:  npx tsx docs/moduli/genera-anteprime.ts
 * Output: docs/moduli/anteprime/*.pdf
 */

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { generaDelegaConsegnaPrivato } from '../../lib/moduli/delegaConsegna'

const CARTELLA = join(__dirname, 'anteprime')

async function main() {
  mkdirSync(CARTELLA, { recursive: true })

  const delegaPrivato = await generaDelegaConsegnaPrivato({
    nomeDelegante: 'Mario Rossi',
    codiceFiscale: 'RSSMRA80A01H501U',
    marcaModello: 'Fiat Panda',
    targa: 'AB123CD',
    nomeDelegato: 'Luigi Bianchi',
  })
  writeFileSync(join(CARTELLA, 'DELEGA_CONSEGNA_VEICOLO_PRIVATO_ANTEPRIMA.pdf'), delegaPrivato)
  console.log('OK: DELEGA_CONSEGNA_VEICOLO_PRIVATO_ANTEPRIMA.pdf')
}

main().catch(err => { console.error(err); process.exit(1) })
