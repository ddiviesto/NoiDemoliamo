// ============================================================
// CARICATORE GOOGLE MAPS CONDIVISO
// Google Maps JS API va incluso UNA SOLA volta per pagina.
// Se più componenti (autocomplete indirizzo + mappa copertura) stanno
// sulla stessa pagina, DEVONO usare questo stesso caricatore, altrimenti
// lo script viene incluso due volte e va tutto in conflitto.
// Carica con la libreria "places" (serve all'autocomplete); il resto
// (Map, Polygon, ecc.) è nel core ed è disponibile per la mappa.
// ============================================================

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

let promise: Promise<void> | null = null

function mapsPronto(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as { google?: { maps?: unknown } }).google?.maps
}

export function loadGoogleMaps(): Promise<void> {
  if (promise) return promise
  promise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('SSR')); return }
    if (mapsPronto()) { resolve(); return }

    // Uno script Google Maps già presente (da un altro componente)? Riusalo.
    const esistente = document.querySelector<HTMLScriptElement>('script[data-google-maps="1"]')
    if (esistente) {
      esistente.addEventListener('load', () => resolve())
      esistente.addEventListener('error', () => reject(new Error('Errore caricamento Google Maps')))
      return
    }

    if (!KEY) { reject(new Error('Chiave Google Maps mancante')); return }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places&language=it&region=IT&v=weekly`
    script.async = true
    script.defer = true
    script.setAttribute('data-google-maps', '1')
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Errore caricamento Google Maps'))
    document.head.appendChild(script)
  })
  return promise
}
