'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ============================================================
// Tipi minimi per le nuove API Google Places
// ============================================================

declare global {
  interface Window {
    google?: {
      maps: {
        importLibrary?: (lib: string) => Promise<unknown>
      }
    }
    initGoogleMapsAutocomplete?: () => void
  }
}

interface AddressComponent {
  longText: string
  shortText: string
  types: string[]
}

interface PlaceResult {
  formattedAddress?: string
  location?: { lat: () => number; lng: () => number }
  addressComponents?: AddressComponent[]
  fetchFields: (req: { fields: string[] }) => Promise<void>
}

interface PlacePrediction {
  placeId: string
  text: { text: string }
  structuredFormat?: {
    mainText: { text: string }
    secondaryText?: { text: string }
  }
  toPlace: () => PlaceResult
}

interface Suggestion {
  placePrediction?: PlacePrediction
}

interface AutocompleteSuggestionStatic {
  fetchAutocompleteSuggestions: (req: {
    input: string
    includedRegionCodes?: string[]
    language?: string
    region?: string
    sessionToken?: unknown
  }) => Promise<{ suggestions: Suggestion[] }>
}

interface AutocompleteSessionTokenStatic {
  new (): unknown
}

interface PlacesLibrary {
  AutocompleteSuggestion: AutocompleteSuggestionStatic
  AutocompleteSessionToken: AutocompleteSessionTokenStatic
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

// ============================================================
// Caricamento singleton dello script Google Maps
// ============================================================

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

// ============================================================
// COMPONENTE
// ============================================================

export default function AutocompleteIndirizzo({
  valoreIniziale = '',
  placeholder = 'Es. Via Garibaldi 8, Roma',
  onSelezione,
}: Props) {
  const [query, setQuery] = useState(valoreIniziale)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const [open, setOpen] = useState(false)
  const [erroreCaricamento, setErroreCaricamento] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  const placesLibRef = useRef<PlacesLibrary | null>(null)
  const sessionTokenRef = useRef<unknown>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Init: carica lo script e importa la libreria places
  useEffect(() => {
    let attivo = true

    async function init() {
      try {
        await caricaScriptGoogleMaps()
        if (!attivo || !window.google?.maps?.importLibrary) return

        const lib = (await window.google.maps.importLibrary('places')) as unknown as PlacesLibrary
        if (!attivo) return

        placesLibRef.current = lib
        sessionTokenRef.current = new lib.AutocompleteSessionToken()
        setReady(true)
      } catch (err) {
        console.error('Errore Google Maps:', err)
        if (attivo) setErroreCaricamento(true)
      }
    }

    init()
    return () => { attivo = false }
  }, [])

  // Chiusura quando si clicca fuori
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const cercaSuggerimenti = useCallback(async (input: string) => {
    if (!ready || !placesLibRef.current || input.trim().length < 2) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const { suggestions: results } = await placesLibRef.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ['it'],
        language: 'it',
        region: 'IT',
        sessionToken: sessionTokenRef.current,
      })
      setSuggestions(results || [])
      setActiveIdx(-1)
    } catch (err) {
      console.error('Errore fetch suggerimenti:', err)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [ready])

  // Debounce input
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => cercaSuggerimenti(value), 200)
  }

  async function selezionaSuggerimento(suggestion: Suggestion) {
    if (!suggestion.placePrediction) return
    setOpen(false)
    setLoading(true)
    try {
      const place = suggestion.placePrediction.toPlace()
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

      const indirizzo = place.formattedAddress || ''
      setQuery(indirizzo)
      onSelezione({
        indirizzo,
        comune: comune || undefined,
        provincia: provincia || undefined,
        cap: cap || undefined,
        lat: place.location?.lat(),
        lng: place.location?.lng(),
      })

      // Nuovo sessionToken dopo selezione (best practice)
      if (placesLibRef.current) {
        sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken()
      }
    } catch (err) {
      console.error('Errore selezione place:', err)
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(idx => Math.min(idx + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(idx => Math.max(idx - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        selezionaSuggerimento(suggestions[activeIdx])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function highlight(text: string, q: string): React.ReactNode {
    if (!q.trim()) return text
    const lowerText = text.toLowerCase()
    const lowerQ = q.toLowerCase()
    const idx = lowerText.indexOf(lowerQ)
    if (idx === -1) return text
    return (
      <>
        {text.substring(0, idx)}
        <mark className="bg-blue-100 text-blue-700 font-semibold rounded-sm p-0">
          {text.substring(idx, idx + q.length)}
        </mark>
        {text.substring(idx + q.length)}
      </>
    )
  }

  if (erroreCaricamento) {
    return (
      <div className="w-full">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all"
        />
        <p className="text-xs text-amber-700 mt-1.5">
          Suggerimenti non disponibili. Digita l&apos;indirizzo manualmente.
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full relative">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={onInputChange}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          onKeyDown={onKeyDown}
          placeholder={ready ? placeholder : 'Caricamento autocomplete...'}
          disabled={!ready}
          className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-base bg-gray-50 outline-none focus:border-blue-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all disabled:opacity-60"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {suggestions.map((s, i) => {
            const pred = s.placePrediction
            if (!pred) return null
            const main = pred.structuredFormat?.mainText.text || pred.text.text
            const secondary = pred.structuredFormat?.secondaryText?.text || ''
            return (
              <button
                key={pred.placeId}
                type="button"
                onClick={() => selezionaSuggerimento(s)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors border-b border-gray-100 last:border-b-0 ${i === activeIdx ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${i === activeIdx ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {highlight(main, query)}
                  </div>
                  {secondary && (
                    <div className="text-xs text-gray-500 truncate">{secondary}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {open && !loading && suggestions.length === 0 && query.trim().length >= 2 && (
        <div className="mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 text-center text-sm text-gray-400">
          Nessun risultato
        </div>
      )}
    </div>
  )
}