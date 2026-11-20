import { useEffect } from 'react'

// ============================================================
// LA PAGINA SOTTO NON SCORRE finché un foglio è aperto, SUL TELEFONO.
// ⭐ 07/11 (Davide, iPhone): strisciando col dito su un foglio che sale dal
// basso, l'iPhone scorreva la pagina dietro e faceva l'effetto molla
// ("sobbalza"). Il body si inchioda dove sta e torna al suo posto alla
// chiusura. Su PC non fa niente: lì ci sono le nuvolette e la pagina deve
// restare libera.
// Si usa dentro il componente del foglio, che esiste solo quando è aperto
// (foglio di "Installa l'app", foglio di "Aggiungi un altro veicolo").
// ============================================================
export function useBloccaPaginaSuTelefono() {
  useEffect(() => {
    if (!window.matchMedia('(max-width: 639px)').matches) return
    const y = window.scrollY
    const b = document.body.style
    const prima = { position: b.position, top: b.top, left: b.left, right: b.right, width: b.width, overflow: b.overflow }
    b.position = 'fixed'; b.top = `-${y}px`; b.left = '0'; b.right = '0'; b.width = '100%'; b.overflow = 'hidden'
    return () => {
      b.position = prima.position; b.top = prima.top; b.left = prima.left; b.right = prima.right; b.width = prima.width; b.overflow = prima.overflow
      window.scrollTo(0, y)
    }
  }, [])
}
