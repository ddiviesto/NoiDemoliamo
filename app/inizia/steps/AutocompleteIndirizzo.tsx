'use client'

import { useEffect, useRef, useState } from 'react'

// Tipi minimi per la NUOVA API Google Places (PlaceAutocompleteElement)
declare global {
  interface Window {
    google?: {
      maps: {
        importLibrary?: (lib: string) => Promise<unknown>
      }
    }
    initGoogleMapsAutocomplete?: () => void
  }
  interface HTMLElementTagNameMap {
    'gmp-place-autocomplete': HTMLElement
  }
}

interface GooglePlace {
  formattedAddress?: string
  location?: { lat: () => number; lng: () => number }
  addressComponents?: Array<{
    longText: string
    shortText: string
    types: string[]
  }>
  fetchFields: (req: { fields: string[] }) => Promise<void>
}

interface PlaceAutocompleteEvent extends Event {
  placePrediction?: { toPlace: () => GooglePlace }
}

export interface DatiIndirizzo {
  indirizzo: string
  comune?: string
  provincia?: string
  cap?: string
  lat?: number
  lng?: number
}

interface Props {
  valoreIniziale?: string
  placeholder?: string
  onSelezione: (dati: DatiIndirizzo) => void
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

let scriptCaricato = false
let scriptInCaricamento = false
const callbacksInAttesa: (() => void)[] = []

function caricaScriptGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (scriptCaricato) {
      resolve()
      return
    }
    if (scriptInCaricamento) {
      callbacksInAttesa.push(resolve)
      return
    }
    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error('Chiave Google Maps mancante'))
      return
    }
    scriptInCaricamento = true
    window.initGoogleMapsAutocomplete = () => {
      scriptCaricato = true
      scriptInCaricamento = false
      resolve()
      callbacksInAttesa.forEach(cb => cb())
      callbacksInAttesa.length = 0
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&loading=async&libraries=places&callback=initGoogleMapsAutocomplete&language=it&region=IT&v=weekly`
    script.async = true
    script.defer = true
    script.onerror = () => {
      scriptInCaricamento = false
      reject(new Error('Errore caricamento Google Maps'))
    }
    document.head.appendChild(script)
  })
}

export default function AutocompleteIndirizzo({
  valoreIniziale = '',
  placeholder = 'Es. Via Garibaldi 8, Roma',
  onSelezione,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [erroreCaricamento, setErroreCaricamento] = useState(false)
  const [caricamento, setCaricamento] = useState(true)

  useEffect(() => {
    let attivo = true

    async function init() {
      try {
        await caricaScriptGoogleMaps()
        if (!attivo || !window.google?.maps?.importLibrary || !containerRef.current) return

        // Importa la libreria places (nuova API)
        await window.google.maps.importLibrary('places')
        if (!attivo || !containerRef.current) return

        // Crea l'elemento web component <gmp-place-autocomplete>
        const autoEl = document.createElement('gmp-place-autocomplete')

        // Limita a indirizzi italiani
        autoEl.setAttribute('included-region-codes', 'it')
        if (valoreIniziale) {
          autoEl.setAttribute('value', valoreIniziale)
        }

        // Stile: tutto a larghezza piena per uniformarsi al resto del form
        autoEl.style.width = '100%'
        autoEl.style.display = 'block'

        // Pulisci il container e aggiungi
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(autoEl)

        // Listener evento "gmp-select" emesso quando l'utente sceglie un suggerimento
        autoEl.addEventListener('gmp-select', async (event: Event) => {
          const ev = event as PlaceAutocompleteEvent
          if (!ev.placePrediction) return

          const place = ev.placePrediction.toPlace()
          await place.fetchFields({
            fields: ['formattedAddress', 'location', 'addressComponents'],
          })

          let comune = ''
          let provincia = ''
          let cap = ''

          for (const comp of place.addressComponents || []) {
            if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_3')) {
              if (!comune) comune = comp.longText
            }
            if (comp.types.includes('administrative_area_level_2')) {
              provincia = comp.shortText
            }
            if (comp.types.includes('postal_code')) {
              cap = comp.longText
            }
          }

          onSelezione({
            indirizzo: place.formattedAddress || '',
            comune: comune || undefined,
            provincia: provincia || undefined,
            cap: cap || undefined,
            lat: place.location?.lat(),
            lng: place.location?.lng(),
          })
        })

        if (attivo) setCaricamento(false)
      } catch (err) {
        console.error('Errore Google Maps:', err)
        if (attivo) {
          setErroreCaricamento(true)
          setCaricamento(false)
        }
      }
    }

    init()

    return () => {
      attivo = false
    }
  }, [onSelezione, valoreIniziale])

  return (
    <div className="w-full">
      {/* Stile per uniformare il web component al design del form */}
      <style jsx global>{`
        gmp-place-autocomplete {
          width: 100%;
          --gmpx-color-primary: #2563eb;
          --gmpx-color-surface: #f9fafb;
          --gmpx-color-on-surface: #111827;
          --gmpx-color-on-surface-variant: #6b7280;
          --gmpx-color-outline: #e5e7eb;
          --gmpx-font-family-base: inherit;
          --gmpx-font-family-headings: inherit;
        }
        gmp-place-autocomplete::part(input) {
          width: 100%;
          padding: 12px 16px;
          font-size: 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          outline: none;
          transition: all 0.2s;
        }
        gmp-place-autocomplete::part(input):focus {
          border-color: #3b82f6;
          background: white;
        }
      `}</style>

      {caricamento && (
        <div className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-gray-50 text-gray-400">
          Caricamento autocomplete...
        </div>
      )}
      <div ref={containerRef} style={{ display: caricamento ? 'none' : 'block' }} />
      {erroreCaricamento && (
        <p className="text-xs text-amber-700 mt-1.5">
          Suggerimenti non disponibili: ricarica la pagina o digita l&apos;indirizzo manualmente.
        </p>
      )}
    </div>
  )
}