/**
 * DICHIARAZIONE DI STATO DEL VEICOLO CON FERMO AMMINISTRATIVO
 * E RICHIESTA DI DEMOLIZIONE — generatore PDF.
 *
 * Testo approvato da Davide il 10/07/2026, adeguato alla LEGGE 26/01/2026 n. 14
 * (in vigore dal 20/02/2026): il fermo non blocca più la radiazione per
 * demolizione, ma serve l'ATTESTAZIONE DI INUTILIZZABILITÀ del Comune/Polizia
 * locale (slot dedicato nella checklist del cliente). Questa dichiarazione
 * resta come presa d'atto e richiesta del cliente: mezzo fuori uso da demolire,
 * impegno a fornire l'attestazione, consapevolezza che IL DEBITO RESTA.
 *
 * La QUALIFICA del dichiarante si adatta alla casistica ("regola universale"
 * del file casistiche). Una sola firma, come per le deleghe.
 */

import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib'

export type VarianteFermo = 'privato' | 'eredi' | 'eredi_rinuncia' | 'societa' | 'fallimento' | 'associazione' | 'non_intestatario'

export interface DatiDichiarazioneFermo {
  nomeDichiarante?: string | null
  codiceFiscale?: string | null
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

export async function generaDichiarazioneFermo(variante: VarianteFermo, dati: DatiDichiarazioneFermo): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('Autodichiarazione veicolo fuori uso e richiesta di demolizione')
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
          // Valore compilato dal sistema: grassetto e un punto più grande
          const sizeValore = size + 1
          let v = s.valore
          let vw = bold.widthOfTextAtSize(v, sizeValore)
          while (vw > w - 4 && v.length > 1) { v = v.slice(0, -1); vw = bold.widthOfTextAtSize(v, sizeValore) }
          page.drawText(v, { x: x + (w - vw) / 2, y, size: sizeValore, font: bold, color: NERO })
        }
        x += w
      }
    }
  }

  function paragrafo(testo: string, size = 10, f: PDFFont = font, interlinea = 15, rientro = 0) {
    const parole = testo.split(' ')
    let rigaCorrente = ''
    let prima = true
    for (const parola of parole) {
      const tentativo = rigaCorrente ? `${rigaCorrente} ${parola}` : parola
      const larghezzaMax = CONTENUTO - (prima ? 0 : rientro)
      if (f.widthOfTextAtSize(tentativo, size) > larghezzaMax && rigaCorrente) {
        page.drawText(rigaCorrente, { x: MARGINE + (prima ? 0 : rientro), y, size, font: f, color: NERO })
        y -= interlinea
        prima = false
        rigaCorrente = parola
      } else {
        rigaCorrente = tentativo
      }
    }
    if (rigaCorrente) {
      page.drawText(rigaCorrente, { x: MARGINE + (prima ? 0 : rientro), y, size, font: f, color: NERO })
      y -= interlinea
    }
  }

  // Voce dell'elenco DICHIARA: trattino iniziale, righe successive rientrate
  function voce(testo: string) {
    paragrafo(`–  ${testo}`, 10, font, 15, 12)
    y -= 4
  }

  // ---------- TITOLO (nome deciso il 10/07 sera) ----------
  testoCentrato('AUTODICHIARAZIONE VEICOLO FUORI USO', bold, 11.5)
  y -= 16
  testoCentrato('E RICHIESTA DI DEMOLIZIONE', bold, 11.5)
  y -= 15
  testoCentrato('(Artt. 46 e 47 D.P.R. 28 dicembre 2000, n. 445  –  Legge 26 gennaio 2026, n. 14)', font, 9)
  y -= 30

  // ---------- DICHIARANTE ----------
  const salto = 24
  riga([{ testo: 'Il/la sottoscritto/a ' }, { linea: 'resto', valore: dati.nomeDichiarante }]); y -= salto
  riga([{ testo: 'nato/a a ' }, { linea: 210 }, { testo: '  ( ' }, { linea: 28 }, { testo: ' )  il ' }, { linea: 'resto' }]); y -= salto
  riga([{ testo: 'residente a ' }, { linea: 180 }, { testo: '  ( ' }, { linea: 28 }, { testo: ' )  in via ' }, { linea: 'resto' }]); y -= salto
  riga([{ testo: 'codice fiscale ' }, { linea: 250, valore: dati.codiceFiscale }]); y -= salto

  // QUALIFICA per casistica ("regola universale" del file casistiche)
  const veicolo: Segmento[] = [
    { linea: 'resto', valore: dati.marcaModello },
    { testo: '  targato ' },
    { linea: 110, valore: dati.targa },
  ]
  switch (variante) {
    case 'privato':
      riga([{ testo: 'in qualità di proprietario/a del veicolo ' }, ...veicolo]); y -= salto
      break
    case 'eredi':
    case 'eredi_rinuncia':
      riga([{ testo: "in qualità di erede dell'intestatario del veicolo " }, ...veicolo]); y -= salto
      break
    case 'societa':
      riga([{ testo: 'in qualità di legale rappresentante della società/azienda ' }, { linea: 'resto' }]); y -= salto
      riga([{ testo: 'intestataria del veicolo ' }, ...veicolo]); y -= salto
      break
    case 'fallimento':
      riga([{ testo: 'in qualità di curatore della liquidazione giudiziale (curatore fallimentare) della società ' }, { linea: 'resto' }]); y -= salto
      riga([{ testo: 'intestataria del veicolo ' }, ...veicolo]); y -= salto
      break
    case 'associazione':
      riga([{ testo: "in qualità di presidente dell'associazione/ente " }, { linea: 'resto' }]); y -= salto
      riga([{ testo: 'intestataria/o del veicolo ' }, ...veicolo]); y -= salto
      break
    case 'non_intestatario':
      riga([{ testo: 'in qualità di proprietario/a non intestatario/a al P.R.A.' }]); y -= salto
      riga([{ testo: 'del veicolo ' }, ...veicolo]); y -= salto
      break
  }
  y -= 4

  paragrafo("consapevole delle sanzioni penali previste in caso di dichiarazioni non veritiere dall'art. 76 del D.P.R. 28/12/2000 n. 445,", 9.5, bold)
  y -= 12

  testoCentrato('DICHIARA', bold, 11.5)
  y -= 26

  // ---------- LE DICHIARAZIONI (testo approvato) ----------
  voce('che il veicolo sopra indicato è sottoposto a fermo amministrativo;')
  voce('che il veicolo è fuori uso, non più idoneo alla circolazione e inutilizzabile, e che pertanto deve essere avviato alla demolizione;')
  voce('di voler procedere alla demolizione e alla conseguente radiazione dal P.R.A., ai sensi della Legge 26 gennaio 2026, n. 14;')
  voce("di impegnarsi a fornire l'Attestazione di inutilizzabilità rilasciata dal Comune o dalla Polizia locale, necessaria per la radiazione;")
  voce('di essere consapevole che demolizione e radiazione non estinguono il debito che ha originato il fermo amministrativo, che resterà legato al codice fiscale del soggetto debitore.')
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
