/**
 * DELEGA ALLA CONSEGNA DEL VEICOLO PER DEMOLIZIONE — generatore PDF.
 *
 * Testo approvato da Davide il 10/07/2026 (vedi docs/moduli/LEGGIMI.md):
 * - il nome dell'autodemolitore resta IN BIANCO (si scrive a penna;
 *   in futuro valuteremo la precompilazione post-assegnazione)
 * - campi compilati dal sistema: nome delegante, CF, marca/modello, targa,
 *   nome del delegato; il resto si completa a penna
 *
 * Stile impostato sui moduli ACI (Helvetica, righe con campo sottolineato).
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'

export interface DatiDelegaConsegna {
  nomeDelegante?: string | null
  codiceFiscale?: string | null
  marcaModello?: string | null
  targa?: string | null
  nomeDelegato?: string | null
}

const NERO = rgb(0.07, 0.09, 0.13)
const GRIGIO = rgb(0.45, 0.5, 0.56)

const A4 = { larghezza: 595.28, altezza: 841.89 }
const MARGINE = 54
const CONTENUTO = A4.larghezza - MARGINE * 2

// Un pezzo di riga: testo fisso, oppure una linea da compilare
// (di larghezza data o "resto della riga") con eventuale valore già scritto.
interface Segmento {
  testo?: string
  linea?: number | 'resto'
  valore?: string | null
}

export async function generaDelegaConsegnaPrivato(dati: DatiDelegaConsegna): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('Delega alla consegna del veicolo per demolizione')
  const page = doc.addPage([A4.larghezza, A4.altezza])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  let y = A4.altezza - 70

  function testoCentrato(testo: string, f: PDFFont, size: number, colore = NERO) {
    const w = f.widthOfTextAtSize(testo, size)
    page.drawText(testo, { x: (A4.larghezza - w) / 2, y, size, font: f, color: colore })
  }

  // Riga composta da segmenti: testo fisso + linee da compilare (con valore in grassetto sopra la linea)
  function riga(segmenti: Segmento[], size = 10) {
    let x = MARGINE
    // Le linee 'resto' si spartiscono lo spazio rimanente
    const spazioFisso = segmenti.reduce((tot, s) => {
      if (s.testo) return tot + font.widthOfTextAtSize(s.testo, size)
      if (typeof s.linea === 'number') return tot + s.linea
      return tot
    }, 0)
    const nResto = segmenti.filter(s => s.linea === 'resto').length
    const larghezzaResto = nResto > 0 ? Math.max(40, (CONTENUTO - spazioFisso) / nResto) : 0

    for (const s of segmenti) {
      if (s.testo != null) {
        page.drawText(s.testo, { x, y, size, font, color: NERO })
        x += font.widthOfTextAtSize(s.testo, size)
      } else if (s.linea != null) {
        const w = s.linea === 'resto' ? larghezzaResto : s.linea
        page.drawLine({ start: { x, y: y - 2.5 }, end: { x: x + w, y: y - 2.5 }, thickness: 0.7, color: NERO })
        if (s.valore) {
          // Valore compilato dal sistema: in grassetto, centrato sulla linea
          let v = s.valore
          let vw = bold.widthOfTextAtSize(v, size)
          while (vw > w - 4 && v.length > 1) { v = v.slice(0, -1); vw = bold.widthOfTextAtSize(v, size) }
          page.drawText(v, { x: x + (w - vw) / 2, y, size, font: bold, color: NERO })
        }
        x += w
      }
    }
  }

  // Paragrafo a capo automatico
  function paragrafo(testo: string, size = 10, f: PDFFont = font, interlinea = 15) {
    const parole = testo.split(' ')
    let rigaCorrente = ''
    for (const parola of parole) {
      const tentativo = rigaCorrente ? `${rigaCorrente} ${parola}` : parola
      if (f.widthOfTextAtSize(tentativo, size) > CONTENUTO && rigaCorrente) {
        page.drawText(rigaCorrente, { x: MARGINE, y, size, font: f, color: NERO })
        y -= interlinea
        rigaCorrente = parola
      } else {
        rigaCorrente = tentativo
      }
    }
    if (rigaCorrente) {
      page.drawText(rigaCorrente, { x: MARGINE, y, size, font: f, color: NERO })
      y -= interlinea
    }
  }

  // ---------- TITOLO ----------
  testoCentrato('DELEGA ALLA CONSEGNA DEL VEICOLO PER DEMOLIZIONE', bold, 12.5)
  y -= 30

  // ---------- DELEGANTE ----------
  const salto = 24
  riga([{ testo: 'Il/la sottoscritto/a ' }, { linea: 'resto', valore: dati.nomeDelegante }]); y -= salto
  riga([{ testo: 'nato/a a ' }, { linea: 210 }, { testo: '  ( ' }, { linea: 28 }, { testo: ' )  il ' }, { linea: 'resto' }]); y -= salto
  riga([{ testo: 'residente a ' }, { linea: 180 }, { testo: '  ( ' }, { linea: 28 }, { testo: ' )  in via ' }, { linea: 'resto' }]); y -= salto
  riga([{ testo: 'codice fiscale ' }, { linea: 250, valore: dati.codiceFiscale }]); y -= salto
  riga([
    { testo: 'in qualità di proprietario/a del veicolo ' },
    { linea: 'resto', valore: dati.marcaModello },
    { testo: '  targato ' },
    { linea: 110, valore: dati.targa },
  ]); y -= salto + 4

  paragrafo("consapevole delle sanzioni penali previste in caso di dichiarazioni non veritiere dall'art. 76 del D.P.R. 28/12/2000 n. 445,", 9.5, bold)
  y -= 12

  testoCentrato('DELEGA', bold, 11.5)
  y -= 28

  // ---------- DELEGATO ----------
  riga([{ testo: 'il/la Sig./Sig.ra ' }, { linea: 'resto', valore: dati.nomeDelegato }]); y -= salto
  riga([{ testo: 'nato/a a ' }, { linea: 210 }, { testo: '  ( ' }, { linea: 28 }, { testo: ' )  il ' }, { linea: 'resto' }]); y -= salto
  riga([{ testo: 'residente a ' }, { linea: 180 }, { testo: '  ( ' }, { linea: 28 }, { testo: ' )  in via ' }, { linea: 'resto' }]); y -= salto
  riga([{ testo: 'codice fiscale ' }, { linea: 250 }]); y -= salto
  riga([{ testo: 'documento di identità n° ' }, { linea: 140 }, { testo: '  rilasciato il ' }, { linea: 90 }, { testo: '  da ' }, { linea: 'resto' }]); y -= salto + 4

  // ---------- OGGETTO DELLA DELEGA ----------
  riga([{ testo: "a consegnare il veicolo sopra indicato all'autodemolitore " }, { linea: 'resto' }]); y -= 20
  paragrafo('unitamente ai documenti originali previsti, e a sottoscrivere quanto necessario alla presa in carico del veicolo ai fini della demolizione e della radiazione dal P.R.A.')
  y -= 10

  paragrafo('Il delegato dovrà presentarsi al ritiro con un documento di identità in corso di validità.', 9.5)
  paragrafo('Si allega fotocopia del documento di identità del delegante.', 9.5)
  y -= 24

  // ---------- LUOGO, DATA E FIRME ----------
  riga([{ testo: '(luogo, data)  ' }, { linea: 190 }])
  y -= 52

  const metaSx = MARGINE
  const metaDx = A4.larghezza / 2 + 30
  const larghezzaFirma = 200
  page.drawLine({ start: { x: metaSx, y }, end: { x: metaSx + larghezzaFirma, y }, thickness: 0.7, color: NERO })
  page.drawLine({ start: { x: metaDx, y }, end: { x: metaDx + larghezzaFirma, y }, thickness: 0.7, color: NERO })
  y -= 13
  page.drawText('Firma del Delegante', { x: metaSx + 48, y, size: 9, font, color: GRIGIO })
  page.drawText('Firma del Delegato', { x: metaDx + 50, y, size: 9, font, color: GRIGIO })

  return doc.save()
}
