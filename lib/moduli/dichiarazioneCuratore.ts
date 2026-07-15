/**
 * DICHIARAZIONE SOSTITUTIVA DI CERTIFICAZIONE — CURATORE DELLA
 * LIQUIDAZIONE GIUDIZIALE (CURATORE FALLIMENTARE) — generatore PDF.
 *
 * Rifacimento del documento di Davide (che era già ben impostato sul
 * modello ACI, senza logo), approvato il 10/07/2026:
 * - termine aggiornato al Codice della crisi: "curatore della liquidazione
 *   giudiziale" col vecchio nome tra parentesi
 * - identificazione con firma + fotocopia del documento allegata
 *   (art. 38 D.P.R. 445/2000): il curatore firma in studio e il documento
 *   viaggia col demolitore fino all'agenzia pratiche auto
 * - campi compilati dal sistema: nome curatore, P.IVA società, veicolo, targa
 */

import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib'

export interface DatiDichiarazioneCuratore {
  nomeDichiarante?: string | null
  partitaIva?: string | null
  marcaModello?: string | null
  targa?: string | null
}

const NERO = rgb(0.07, 0.09, 0.13)

const A4 = { larghezza: 595.28, altezza: 841.89 }
const MARGINE = 54
const CONTENUTO = A4.larghezza - MARGINE * 2

interface Segmento {
  testo?: string
  linea?: number | 'resto'
  valore?: string | null
}

export async function generaDichiarazioneCuratore(dati: DatiDichiarazioneCuratore): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('Dichiarazione sostitutiva di certificazione — curatore della liquidazione giudiziale')
  const page = doc.addPage([A4.larghezza, A4.altezza])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  let y = A4.altezza - 70

  function testoCentrato(testo: string, f: PDFFont, size: number) {
    const w = f.widthOfTextAtSize(testo, size)
    page.drawText(testo, { x: (A4.larghezza - w) / 2, y, size, font: f, color: NERO })
  }

  function riga(segmenti: Segmento[], size = 10) {
    let x = MARGINE
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
          let v = s.valore
          let vw = bold.widthOfTextAtSize(v, size)
          while (vw > w - 4 && v.length > 1) { v = v.slice(0, -1); vw = bold.widthOfTextAtSize(v, size) }
          page.drawText(v, { x: x + (w - vw) / 2, y, size, font: bold, color: NERO })
        }
        x += w
      }
    }
  }

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
  testoCentrato('DICHIARAZIONE SOSTITUTIVA DI CERTIFICAZIONE', bold, 12)
  y -= 15
  testoCentrato('(Art. 46 D.P.R. 28 dicembre 2000, n. 445)', font, 9)
  y -= 16
  testoCentrato('CURATORE DELLA LIQUIDAZIONE GIUDIZIALE (CURATORE FALLIMENTARE)', bold, 10.5)
  y -= 30

  // ---------- DICHIARANTE ----------
  const salto = 24
  riga([{ testo: 'Il/la sottoscritto/a ' }, { linea: 'resto', valore: dati.nomeDichiarante }]); y -= salto
  riga([{ testo: 'nato/a a ' }, { linea: 210 }, { testo: '  ( ' }, { linea: 28 }, { testo: ' )  il ' }, { linea: 'resto' }]); y -= salto
  riga([{ testo: 'residente a ' }, { linea: 180 }, { testo: '  ( ' }, { linea: 28 }, { testo: ' )  in via ' }, { linea: 'resto' }]); y -= salto + 4

  paragrafo("consapevole delle sanzioni penali previste nel caso di dichiarazioni non veritiere dall'art. 76 del D.P.R. 445/2000,", 9.5, bold)
  y -= 12

  testoCentrato('DICHIARA', bold, 11.5)
  y -= 28

  // ---------- LA DICHIARAZIONE ----------
  riga([{ testo: 'di essere curatore della liquidazione giudiziale (curatore fallimentare) della società/azienda' }]); y -= salto
  riga([{ linea: 'resto' }]); y -= salto
  riga([{ testo: 'con sede a ' }, { linea: 180 }, { testo: '  in via ' }, { linea: 'resto' }]); y -= salto
  riga([{ testo: 'partita IVA / codice fiscale ' }, { linea: 250, valore: dati.partitaIva }]); y -= salto
  riga([{ testo: 'nominato dal Tribunale di ' }, { linea: 'resto' }]); y -= salto
  riga([{ testo: 'con sentenza/provvedimento di apertura della liquidazione giudiziale del ' }, { linea: 100 }, { testo: ',' }]); y -= salto
  riga([{ testo: 'procedura n. ' }, { linea: 90 }, { testo: '  / ' }, { linea: 70 }]); y -= salto + 4

  riga([{ testo: 'ai fini della richiesta della pratica di Demolizione e conseguente Radiazione dal P.R.A.' }]); y -= salto
  riga([
    { testo: 'relativa al veicolo ' },
    { linea: 'resto', valore: dati.marcaModello },
    { testo: '  targato ' },
    { linea: 110, valore: dati.targa },
  ]); y -= salto + 4

  paragrafo('Si allega fotocopia, fronte e retro, del documento di identità del dichiarante.', 9.5)
  y -= 24

  // ---------- LUOGO, DATA E FIRMA ----------
  riga([{ testo: '(luogo, data)  ' }, { linea: 190 }])
  y -= 52

  const xFirma = A4.larghezza / 2 + 30
  const larghezzaFirma = 200
  page.drawLine({ start: { x: xFirma, y }, end: { x: xFirma + larghezzaFirma, y }, thickness: 0.7, color: NERO })
  y -= 13
  const caption = 'Il/La Dichiarante'
  const wCaption = font.widthOfTextAtSize(caption, 9)
  page.drawText(caption, { x: xFirma + (larghezzaFirma - wCaption) / 2, y, size: 9, font, color: rgb(0.45, 0.5, 0.56) })

  return doc.save()
}
