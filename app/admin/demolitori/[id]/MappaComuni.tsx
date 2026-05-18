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
  const [zoom, setZoom] = useState(5)
  const [provinceSelezionate, setProvinceSelezionate] = useState<Set<string>>(new Set())
  const [comuniEsclusi, setComuniEsclusi] = useState<Set<string>>(new Set())
  const dataProvinceRef = useRef<google.maps.Data | null>(null)
  const dataComuniRef = useRef<google.maps.Data | null>(null)
  const provinceLoadedRef = useRef(false)
  const comuniLoadedRef = useRef(false)

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
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bfdbfe' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ visibility: 'simplified' }, { color: '#e2e8f0' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      ],
    })

    mapInstanceRef.current = map

    // Layer province
    const dataProvince = new window.google.maps.Data({ map })
    dataProvinceRef.current = dataProvince

    dataProvince.setStyle({
      fillColor: '#dbeafe',
      fillOpacity: 0,
      strokeColor: '#1a56db',
      strokeWeight: 1.5,
      clickable: true,
    })

    // Layer comuni (nascosto inizialmente)
    const dataComuni = new window.google.maps.Data({ map })
    dataComuniRef.current = dataComuni
    dataComuni.setStyle({
      fillColor: '#bbf7d0',
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
        provinceLoadedRef.current = true

        dataProvince.addListener('click', (e: google.maps.Data.MouseEvent) => {
          const feature = e.feature
          const nome = feature.getProperty('prov_name') as string

          setProvinceSelezionate(prev => {
            const next = new Set(prev)
            if (next.has(nome)) {
              next.delete(nome)
              dataProvince.overrideStyle(feature, { fillColor: '#dbeafe', fillOpacity: 0 })
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

    // Gestione zoom — mostra comuni quando zoom >= 9
    map.addListener('zoom_changed', () => {
      const currentZoom = map.getZoom() || 5
      setZoom(currentZoom)

      if (currentZoom >= 9) {
        // Nascondi province, mostra comuni
        dataProvince.setStyle(feature => {
          const nome = feature.getProperty('prov_name') as string
          return {
            fillColor: provinceSelezionate.has(nome) ? '#1a56db' : '#dbeafe',
            fillOpacity: provinceSelezionate.has(nome) ? 0.2 : 0,
            strokeColor: '#1a56db',
            strokeWeight: 2,
            clickable: false,
          }
        })

        // Carica comuni se non ancora caricati
        if (!comuniLoadedRef.current) {
          comuniLoadedRef.current = true
          fetch('https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/geojson/limits_IT_municipalities.geojson')
            .then(r => r.json())
            .then(data => {
              dataComuni.addGeoJson(data)

              dataComuni.addListener('click', (e: google.maps.Data.MouseEvent) => {
                const feature = e.feature
                const nome = feature.getProperty('name') as string
                const prov = feature.getProperty('prov_name') as string

                // Puoi escludere un comune solo se la sua provincia è selezionata
                if (!provinceSelezionate.has(prov)) return

                setComuniEsclusi(prev => {
                  const next = new Set(prev)
                  if (next.has(nome)) {
                    next.delete(nome)
                    dataComuni.overrideStyle(feature, { fillColor: '#bbf7d0', fillOpacity: 0.4 })
                  } else {
                    next.add(nome)
                    dataComuni.overrideStyle(feature, { fillColor: '#f87171', fillOpacity: 0.6 })
                  }
                  return next
                })
              })
            })
            .catch(err => console.error('Errore comuni:', err))
        }

        dataComuni.setMap(map)
      } else {
        // Zoom basso — nascondi comuni
        dataComuni.setMap(null)
        dataProvince.setStyle(feature => {
          const nome = feature.getProperty('prov_name') as string
          return {
            fillColor: '#1a56db',
            fillOpacity: provinceSelezionate.has(nome) ? 0.5 : 0,
            strokeColor: '#1a56db',
            strokeWeight: 1.5,
            clickable: true,
          }
        })
      }
    })
  }

  function handleSalva() {
    const comuni = Array.from(provinceSelezionate).map(p => ({
      comune: p,
      provincia: p.substring(0, 2).toUpperCase(),
    }))
    onSalva(comuni)
  }

  return (
    <div className="flex flex-col gap-3">
      {loading && (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-gray-400">Caricamento mappa...</div>
          </div>
        </div>
      )}

      <div
        ref={mapRef}
        style={{
          height: '550px',
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          display: loading ? 'none' : 'block',
          border: '1px solid #e2e8f0',
        }}
      />

      {!loading && (
        <div className="flex gap-2">
          <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs text-blue-700 font-medium mb-1">📍 Zoom normale</p>
            <p className="text-xs text-blue-500">Clicca sulle province per selezionarle</p>
          </div>
          <div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-3">
            <p className="text-xs text-green-700 font-medium mb-1">🔍 Zoom alto</p>
            <p className="text-xs text-green-500">Clicca sui comuni per escluderli (rosso)</p>
          </div>
        </div>
      )}

      {provinceSelezionate.size > 0 && (
        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Province selezionate ({provinceSelezionate.size}):</p>
            {comuniEsclusi.size > 0 && (
              <p className="text-xs text-red-500">{comuniEsclusi.size} comuni esclusi</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {Array.from(provinceSelezionate).sort().map(p => (
              <span key={p} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-medium">{p}</span>
            ))}
          </div>
          {comuniEsclusi.size > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-red-600 mb-1">Comuni esclusi:</p>
              <div className="flex flex-wrap gap-1">
                {Array.from(comuniEsclusi).sort().map(c => (
                  <span key={c} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-lg">{c}</span>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleSalva}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all"
          >
            Salva area di copertura
          </button>
        </div>
      )}
    </div>
  )
}