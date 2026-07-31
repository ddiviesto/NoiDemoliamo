// ============================================================
// PDF → PAGINE-IMMAGINE (29/07/2026, punto 3 del giro iPhone)
//
// Sul telefono i PDF aperti in Safari avevano lo zoom impazzito:
// qui il PDF viene trasformato in immagini (una per pagina) e le
// pagine si guardano nel PALCO SCURO come le foto, pizzico incluso.
//
// Usa pdfjs (il motore PDF di Firefox); il "worker" sta in
// /public/pdf.worker.min.mjs (copiato da node_modules/pdfjs-dist:
// se si aggiorna la libreria va ricopiato).
// ============================================================

// Larghezza massima della pagina renderizzata: nitida anche con lo
// zoom 4x del palco, senza esagerare con la memoria del telefono
const LARGHEZZA_MAX = 1600

export async function renderPdfPagine(url: string): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const doc = await pdfjs.getDocument({ url }).promise
  const pagine: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const pagina = await doc.getPage(n)
    const base = pagina.getViewport({ scale: 1 })
    const scala = Math.min(3, LARGHEZZA_MAX / base.width)
    const viewport = pagina.getViewport({ scale: scala })

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas non disponibile')
    // Sfondo bianco: i PDF trasparenti non devono diventare neri
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await pagina.render({ canvas, canvasContext: ctx, viewport }).promise
    pagine.push(canvas.toDataURL('image/jpeg', 0.85))
    pagina.cleanup()
  }
  await doc.cleanup()
  return pagine
}
