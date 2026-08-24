'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { loadGoogleMaps } from '@/lib/googleMaps'

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
  // Versione compatta per i form admin (stessa altezza/font degli altri campi)
  compatto?: boolean
}

// ============================================================
// COMPONENTE
// ============================================================

export default function AutocompleteIndirizzo({
  valoreIniziale = '',
  placeholder = 'Es. Via Garibaldi 8, Roma',
  onSelezione,
  compatto = false,
}: Props) {
  const [query, setQuery] = useState(valoreIniziale)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const [open, setOpen] = useState(false)
  const [erroreCaricamento, setErroreCaricamento] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  // ⭐ 24/08: RIPIEGO A MANO. Se Google non risponde (script che non parte,
  // chiave bloccata, fatturazione scaduta) il cliente restava piantato:
  // scriveva e non poteva confermare niente. Ora appare il bottone
  // "Conferma indirizzo" e va avanti scrivendolo per intero.
  const [aMano, setAMano] = useState(false)

  const placesLibRef = useRef<PlacesLibrary | null>(null)
  const sessionTokenRef = useRef<unknown>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Init: carica lo script e importa la libreria places
  useEffect(() => {
    let attivo = true

    async function init() {
      try {
        await loadGoogleMaps()
        if (!attivo || !window.google?.maps?.importLibrary) return

        const lib = (await window.google.maps.importLibrary('places')) as unknown as PlacesLibrary
        if (!attivo) return

        placesLibRef.current = lib
        sessionTokenRef.current = new lib.AutocompleteSessionToken()
        setReady(true)
      } catch (err) {
        console.error('Errore Google Maps:', err)
        if (attivo) { setErroreCaricamento(true); setAMano(true) }
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
      setAMano(true)          // Google ha detto picche: si va avanti a mano
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

  // Classi input: versione normale (mobile /inizia, 16px anti-zoom) o compatta (form admin)
  // ⭐ 24/08: nel flusso l'indirizzo è una pillola come tutti gli altri campi
  // (.campo-pillola in globals.css). Nell'admin resta il campo compatto.
  const classiInput = compatto
    ? 'w-full border-[1.5px] border-gray-200 rounded-[10px] pl-9 pr-3 py-2 text-[13.5px] font-medium text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60 placeholder:text-gray-400'
    : 'campo-pillola'

  // Il ripiego a mano: si conferma quello che è scritto nel campo
  function confermaAMano() {
    const scritto = query.trim()
    if (scritto.length < 5) return
    onSelezione({ indirizzo: scritto })
  }

  if (erroreCaricamento) {
    return (
      <div className="w-full">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confermaAMano() } }}
          placeholder={placeholder}
          className={compatto ? classiInput.replace('pl-9', 'px-3') : 'campo-pillola'}
        />
        <RipiegoAMano query={query} onConferma={confermaAMano} compatto={compatto} />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full relative">
      <div className="relative">
        {/* ⚠️ 24/08 (Davide): nel flusso NIENTE lente dentro il campo, era
            brutta e pestava il testo grigio. Resta solo nei form dell'admin. */}
        {compatto && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
        )}
        <input
          type="text"
          value={query}
          onChange={onInputChange}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          onKeyDown={onKeyDown}
          placeholder={ready ? placeholder : 'Caricamento autocomplete...'}
          disabled={!ready}
          className={classiInput}
        />
        {loading && (
          <span className={`absolute ${compatto ? 'right-3' : 'right-5'} top-1/2 -translate-y-1/2 text-gray-400`}>
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </span>
        )}
      </div>

      {/* ⭐ 06/08 (trovato da Davide nella scheda Ritiro del CRM): in versione
          COMPATTA il menu GALLEGGIA sopra il contenuto (absolute + z-50) con
          le righe piccole da gestionale — prima entrava nel flusso della
          scheda e spingeva giù tutto, con le righe grandi da telefono */}
      {open && suggestions.length > 0 && (
        <div className={compatto
          ? 'absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150'
          : 'mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150'}>
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
                className={`w-full text-left flex items-center transition-colors border-b border-gray-100 last:border-b-0 ${compatto ? 'gap-2.5 px-3 py-2' : 'gap-3 px-4 py-3'} ${i === activeIdx ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
              >
                <div className={`${compatto ? 'w-6 h-6 rounded-md' : 'w-8 h-8 rounded-lg'} flex items-center justify-center flex-shrink-0 transition-colors ${i === activeIdx ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>
                  <svg width={compatto ? 12 : 16} height={compatto ? 12 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`${compatto ? 'text-[12.5px]' : 'text-sm'} font-medium text-gray-900 truncate`}>
                    {highlight(main, query)}
                  </div>
                  {secondary && (
                    <div className={`${compatto ? 'text-[11px]' : 'text-xs'} text-gray-500 truncate`}>{secondary}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {open && !loading && !aMano && suggestions.length === 0 && query.trim().length >= 2 && (
        <div className={compatto
          ? 'absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-center text-[12.5px] text-gray-400'
          : 'mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 text-center text-sm text-gray-400'}>
          Nessun risultato
        </div>
      )}

      {aMano
        ? <RipiegoAMano query={query} onConferma={confermaAMano} compatto={compatto} />
        : !compatto && (
          <p className="text-[11.5px] text-gray-500 mt-2 px-4">
            Inizia a digitare e seleziona un suggerimento per confermare.
          </p>
        )}
    </div>
  )
}

// ============================================================
// RIPIEGO A MANO (⭐ 24/08)
// Compare quando i suggerimenti non arrivano: si scrive l'indirizzo per
// intero e si conferma col bottone. Senza questo il cliente resta piantato
// sul passo, perché il flusso aspetta un indirizzo confermato.
// ============================================================
function RipiegoAMano({ query, onConferma, compatto }: { query: string; onConferma: () => void; compatto?: boolean }) {
  const pronto = query.trim().length >= 5
  return (
    <div className={compatto ? 'mt-2' : 'mt-3'}>
      <p className={`${compatto ? 'text-[11.5px]' : 'text-[12.5px]'} text-amber-800 leading-relaxed ${compatto ? '' : 'px-4'}`}>
        I suggerimenti non sono disponibili in questo momento. Scrivi l&apos;indirizzo completo (via, numero civico, città e provincia) e conferma.
      </p>
      <button
        type="button"
        onClick={onConferma}
        disabled={!pronto}
        className={`mt-2 ${compatto ? '' : 'ml-1'} scelta-pillola ${pronto ? 'scelta-pillola--presa' : ''}`}
        style={{ opacity: pronto ? 1 : 0.55, cursor: pronto ? 'pointer' : 'default' }}
      >
        Conferma indirizzo
      </button>
    </div>
  )
}