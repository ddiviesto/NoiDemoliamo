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
  const featuresRef = useRef<Map<string, google.maps.Data.Feature>>(new Map())
  const dataLayerRef = useRef<google.maps.Data | null>(null)

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
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f0fdf4' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ visibility: 'simplified' }, { color: '#e2e8f0' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#1a56db' }, { weight: 2 }] },
        { featureType: 'administrative.locality', elementType: 'labels.text', stylers: [{ visibility: 'simplified' }] },
      ],
    })

    mapInstanceRef.current = map

    const dataLayer = new window.google.maps.Data({ map })
    dataLayerRef.current = dataLayer

    dataLayer.setStyle({
      fillColor: '#dbeafe',
      fillOpacity: 0,
      strokeColor: '#1a56db',
      strokeWeight: 1,
      clickable: true,
    })

    // Carica GeoJSON province italiane
    fetch('https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/geojson/limits_IT_provinces.geojson')
      .then(r => r.json())
      .then(data => {
        dataLayer.addGeoJson(data)
        
        dataLayer.forEach(feature => {
          const nome = feature.getProperty('prov_name') as string
          featuresRef.current.set(nome, feature)
        })

        dataLayer.addListener('click', (e: google.maps.Data.MouseEvent) => {
          const feature = e.feature
          const nome = feature.getProperty('prov_name') as string
          
          setProvinceSelezionate(prev => {
            const next = new Set(prev)
            if (next.has(nome)) {
              next.delete(nome)
              dataLayer.overrideStyle(feature, {
                fillColor: '#dbeafe',
                fillOpacity: 0,
              })
            } else {
              next.add(nome)
              dataLayer.overrideStyle(feature, {
                fillColor: '#1a56db',
                fillOpacity: 0.5,
              })
            }
            return next
          })
        })

        setLoading(false)
      })
      .catch(err => {
        console.error('Errore GeoJSON:', err)
        setLoading(false)
      })
  }

  function handleSalva() {
    const comuni = Array.from(provinceSelezionate).map(p => ({
      comune: p,
      provincia: p.substring(0, 2).toUpperCase(),
    }))
    onSalva(comuni)
    setProvinceSelezionate(new Set())
  }

  return (
    <div className="flex flex-col gap-3">
      {loading && (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
            <div className="text-sm text-gray-400">Caricamento mappa...</div>
          </div>
        </div>
      )}

      <div
        ref={mapRef}
        style={{
          height: '500px',
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          display: loading ? 'none' : 'block',
          border: '1px solid #e2e8f0'
        }}
      />

      {!loading && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-blue-600 font-medium">
            💡 Clicca su una provincia per selezionarla. Clicca di nuovo per deselezionarla.
          </p>
        </div>
      )}

      {provinceSelezionate.size > 0 && (
        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-600 mb-2">
            Province selezionate ({provinceSelezionate.size}):
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {Array.from(provinceSelezionate).sort().map(p => (
              <span key={p} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-medium">
                {p}
              </span>
            ))}
          </div>
          <button
            onClick={handleSalva}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all"
          >
            Salva area di copertura ({provinceSelezionate.size} province)
          </button>
        </div>
      )}
    </div>
  )
}