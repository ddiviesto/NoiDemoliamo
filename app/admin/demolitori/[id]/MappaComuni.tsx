'use client'

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from 'react'

interface Props {
  onSalva: (comuni: { comune: string; provincia: string; fee_comune?: number; distanza_km?: number }[]) => void
  comuniSalvati: string[]
}

export default function MappaComuni({ onSalva, comuniSalvati }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [provinceSelezionate, setProvinceSelezionate] = useState<Set<string>>(new Set())
  const [comuniEsclusi, setComuniEsclusi] = useState<Set<string>>(new Set())
  const dataProvinceRef = useRef<google.maps.Data | null>(null)
  const dataComuniRef = useRef<google.maps.Data | null>(null)
  const comuniLoadedRef = useRef(false)
  const provinceSelRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    provinceSelRef.current = provinceSelezionate
  }, [provinceSelezionate])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) return

    if (window.google?.maps) {
      initMappa()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=it&region=IT`
    script.async = true
    script.onload = initMappa
    document.head.appendChild(script)
  }, [])

  function initMappa() {
    if (!mapRef.current) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 42.5, lng: 12.5 },
      zoom: 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: 'greedy', // scroll senza Ctrl!
      styles: [
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bfdbfe' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ visibility: 'simplified' }, { color: '#e2e8f0' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#1a56db' }, { weight: 2 }] },
      ],
    })

    mapInstanceRef.current = map

    // Layer province
    const dataProvince = new window.google.maps.Data({ map })
    dataProvinceRef.current = dataProvince
    dataProvince.setStyle({
      fillOpacity: 0,
      strokeColor: '#1a56db',
      strokeWeight: 1.5,
      clickable: true,
    })

    // Layer comuni
    const dataComuni = new window.google.maps.Data()
    dataComuniRef.current = dataComuni
    dataComuni.setStyle({
      fillOpacity: 0,
      strokeColor: '#16a34a',
      strokeWeight: 0.8,
      clickable: true,
    })

    // Carica province
    fetch('https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/geojson/limits_IT_provinces.geojson')
      .then(r => r.json())
      .then(data => {
        dataProvince.addGeoJson(data)

        dataProvince.addListener('click', (e: google.maps.Data.MouseEvent) => {
          const feature = e.feature
          const nome = feature.getProperty('prov_name') as string

          setProvinceSelezionate(prev => {
            const next = new Set(prev)
            if (next.has(nome)) {
              next.delete(nome)
              dataProvince.overrideStyle(feature, { fillOpacity: 0 })
            } else {
              next.add(nome)
              dataProvince.overrideStyle(feature, { fillColor: '#1a56db', fillOpacity: 0.5 })
            }
            return next
          })
        })

        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Gestione zoom
    map.addListener('zoom_changed', () => {
      const z = map.getZoom() || 6

      if (z >= 9) {
        dataProvince.setMap(null)
        dataComuni.setMap(map)

        if (!comuniLoadedRef.current) {
          comuniLoadedRef.current = true
          fetch('https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/geojson/limits_IT_municipalities.geojson')
            .then(r => r.json())
            .then(data => {
              dataComuni.addGeoJson(data)

              // Colora i comuni delle province selezionate
              dataComuni.forEach(f => {
                const prov = f.getProperty('prov_name') as string
                if (provinceSelRef.current.has(prov)) {
                  dataComuni.overrideStyle(f, { fillColor: '#1a56db', fillOpacity: 0.3 })
                }
              })

              dataComuni.addListener('click', (e: google.maps.Data.MouseEvent) => {
                const feature = e.feature
                const nome = feature.getProperty('name') as string
                const prov = feature.getProperty('prov_name') as string

                if (!provinceSelRef.current.has(prov)) return

                setComuniEsclusi(prev => {
                  const next = new Set(prev)
                  if (next.has(nome)) {
                    next.delete(nome)
                    dataComuni.overrideStyle(feature, { fillColor: '#1a56db', fillOpacity: 0.3 })
                  } else {
                    next.add(nome)
                    dataComuni.overrideStyle(feature, { fillColor: '#ef4444', fillOpacity: 0.6 })
                  }
                  return next
                })
              })
            })
            .catch(err => console.error('Errore comuni:', err))
        }
      } else {
        dataComuni.setMap(null)
        dataProvince.setMap(map)
      }
    })
  }

  function handleSalva() {
    const result = Array.from(provinceSelezionate).map(p => ({
      comune: p,
      provincia: p.substring(0, 2).toUpperCase(),
    }))
    onSalva(result)
  }

  return (
    <div className="flex gap-4" style={{ height: '580px' }}>

      {/* Sidebar sinistra */}
      <div style={{ width: '220px', flexShrink: 0 }} className="flex flex-col gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Area selezionata</p>

          {provinceSelezionate.size === 0 ? (
            <p className="text-xs text-gray-300 text-center mt-4">Clicca sulla mappa per selezionare province</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {Array.from(provinceSelezionate).sort().map(p => (
                <div key={p} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-blue-800 flex-1">{p}</span>
                </div>
              ))}
              {comuniEsclusi.size > 0 && (
                <>
                  <p className="text-xs font-semibold text-red-500 mt-2 mb-1">Esclusi:</p>
                  {Array.from(comuniEsclusi).sort().map(c => (
                    <div key={c} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-red-700 flex-1">{c}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-blue-600 font-medium mb-1">Come usare:</p>
          <p className="text-xs text-blue-500 leading-relaxed">🔵 Clicca province per selezionare</p>
          <p className="text-xs text-blue-500 leading-relaxed">🔴 Ingrandisci e clicca comuni per escludere</p>
        </div>

        {provinceSelezionate.size > 0 && (
          <button
            onClick={handleSalva}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all"
          >
            Salva copertura
          </button>
        )}
      </div>

      {/* Mappa */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-gray-400">Caricamento mappa...</div>
            </div>
          </div>
        )}
        <div
          ref={mapRef}
          style={{
            height: '100%',
            width: '100%',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}
        />
      </div>

    </div>
  )
}