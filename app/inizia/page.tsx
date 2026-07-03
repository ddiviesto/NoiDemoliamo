'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { DatiPratica, datiPraticaIniziali, TipoMezzo, SpazioCarroAttrezzi, Intestazione, derivaCasistica, delegaAmmessa, fermoApplicabile } from '../../types/pratica'
import { StepTipoVeicolo } from './steps/StepTipoVeicolo'
import { StepIdentificaVeicolo } from './steps/StepIdentificaVeicolo'
import { StepCambioVeicolo } from './steps/StepCambioVeicolo'
import { StepCondizioniVeicolo } from './steps/StepCondizioniVeicolo'
import AutocompleteIndirizzo, { DatiIndirizzo } from './steps/AutocompleteIndirizzo'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AiutoWhatsApp from '../components/AiutoWhatsApp'

// ============================================================
// ICONE SVG GENERALI
// ============================================================

function IconaPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function IconaCF() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <circle cx="9" cy="11" r="2"/>
      <path d="M6 16c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5"/>
      <line x1="14" y1="10" x2="18" y2="10"/>
      <line x1="14" y1="13" x2="18" y2="13"/>
      <line x1="14" y1="16" x2="17" y2="16"/>
    </svg>
  )
}

function IconaFoto() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function IconaIntestazione() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function IconaCuoreMini() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>
    </svg>
  )
}

function IconaFermo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function IconaConsegna() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <path d="M17 11l2 2 4-4"/>
    </svg>
  )
}

function IconaLibretto() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}

function IconaCDC() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <circle cx="12" cy="15" r="2"/>
      <path d="M12 12v-1"/>
    </svg>
  )
}

function IconaAccount() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function IconaCambio() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="6" r="2"/>
      <path d="M12 8v8"/>
      <circle cx="8" cy="16" r="1"/>
      <circle cx="16" cy="16" r="1"/>
      <path d="M8 16h8"/>
    </svg>
  )
}

function IconaCondizioni() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )
}

// ============================================================
// ICONE VEICOLI (per banner dinamico)
// ============================================================

function IconaVAutovettura() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/>
        <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9m-6-6h15m-6 0V6"/>
      </g>
    </svg>
  )
}

function IconaVMotociclo() {
  return (
    <svg width="22" height="20" viewBox="0 0 640 512">
      <path fill="currentColor" d="M280 32c-13.3 0-24 10.7-24 24s10.7 24 24 24h57.7l16.4 30.3L256 192l-45.3-45.3c-12-12-28.3-18.7-45.3-18.7H64c-17.7 0-32 14.3-32 32v32h96c88.4 0 160 71.6 160 160c0 11-1.1 21.7-3.2 32h70.4c-2.1-10.3-3.2-21-3.2-32c0-52.2 25-98.6 63.7-127.8l15.4 28.6C402.4 276.3 384 312 384 352c0 70.7 57.3 128 128 128s128-57.3 128-128s-57.3-128-128-128c-13.5 0-26.5 2.1-38.7 6l-55.1-102H480c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32h-20.4c-7.5 0-14.7 2.6-20.5 7.4l-47.4 39.5l-14-26c-7-12.9-20.5-21-35.2-21zm182.7 279.2l28.2 52.2c6.3 11.7 20.9 16 32.5 9.7s16-20.9 9.7-32.5l-28.2-52.2c2.3-.3 4.7-.4 7.1-.4c35.3 0 64 28.7 64 64s-28.7 64-64 64s-64-28.7-64-64c0-15.5 5.5-29.7 14.7-40.8M187.3 376c-9.5 23.5-32.5 40-59.3 40c-35.3 0-64-28.7-64-64s28.7-64 64-64c26.9 0 49.9 16.5 59.3 40h66.4c-11.2-59.2-63.2-104-125.7-104C57.3 224 0 281.3 0 352s57.3 128 128 128c62.5 0 114.5-44.8 125.8-104h-66.4zm-59.3 8a32 32 0 1 0 0-64a32 32 0 1 0 0 64"/>
    </svg>
  )
}

function IconaVCiclomotore() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5a3 3 0 1 0-6 0m6 0h3m-3 0c0 .903-.399 1.713-1.03 2.263M9 5H6m3 0c0 .903.399 1.713 1.03 2.263M14 20h2a2 2 0 0 0 2-2v-5c0-1.692-.859-4.816-4.03-5.737M14 20a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2v0m4 0v-5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5m0 0H8a2 2 0 0 1-2-2v-5c0-1.692.859-4.816 4.03-5.737m3.94 0A3 3 0 0 1 12 8a3 3 0 0 1-1.97-.737"/>
    </svg>
  )
}

function IconaVMinicar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="currentColor" d="M18.5 11H17v-1c0-3.31-2.69-6-6-6s-6 2.69-6 6v1.05c-.75.11-1.44.43-1.98.97A3.52 3.52 0 0 0 2 14.5c0 1.42.83 2.63 2.04 3.18c-.01.11-.04.21-.04.32c0 1.65 1.35 3 3 3s3-1.35 3-3h4c0 1.65 1.35 3 3 3s3-1.35 3-3c0-.11-.03-.21-.04-.32c.38-.17.72-.41 1.02-.71A3.52 3.52 0 0 0 22 14.49c0-1.93-1.57-3.5-3.5-3.5ZM12 6.14c1.72.45 3 2 3 3.86v1h-3zM7 10c0-1.86 1.28-3.41 3-3.86V11H7zm0 9c-.55 0-1-.45-1-1c0-.15.04-.31.11-.45c.01-.02.02-.03.03-.05c.28-.47.91-.59 1.35-.35c.15.08.28.2.37.36c.09.15.13.32.13.49c0 .55-.45 1-1 1Zm10 0a1.003 1.003 0 0 1-.87-1.5c.36-.63 1.35-.64 1.73 0c.01.02.02.04.03.05c.07.14.11.29.11.45c0 .55-.45 1-1 1m2.56-3.44c-.13.13-.29.24-.45.31l-.03-.03c-.04-.04-.08-.06-.12-.1c-.14-.12-.28-.23-.43-.32c-.06-.04-.13-.07-.19-.1q-.225-.105-.45-.18l-.2-.06c-.22-.05-.45-.09-.69-.09s-.49.04-.72.09c-.07.02-.14.05-.21.07c-.16.05-.31.11-.45.19c-.07.04-.15.08-.22.13c-.14.09-.26.18-.38.29c-.06.05-.12.1-.18.16c-.02.03-.05.04-.08.07H9.23s-.05-.05-.08-.07c-.05-.06-.11-.1-.17-.16q-.18-.165-.39-.3c-.07-.04-.14-.09-.21-.12c-.15-.08-.3-.14-.46-.19c-.07-.02-.14-.05-.21-.07q-.345-.09-.72-.09c-.375 0-.47.04-.69.09l-.2.06q-.24.075-.45.18c-.07.03-.13.07-.19.1c-.15.09-.3.2-.43.32c-.04.03-.08.06-.11.09l-.03.03c-.53-.23-.89-.76-.89-1.37c0-.4.16-.79.44-1.06c.28-.28.67-.44 1.06-.44h13c.83 0 1.5.67 1.5 1.5c0 .4-.16.79-.44 1.06Z"/>
    </svg>
  )
}

function IconaVFurgone() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M13 6v5a1 1 0 0 0 1 1h6.102a1 1 0 0 1 .712.298l.898.91a1 1 0 0 1 .288.702V17a1 1 0 0 1-1 1h-3"/>
        <path d="M5 18H3a1 1 0 0 1-1-1V8a2 2 0 0 1 2-2h12c1.1 0 2.1.8 2.4 1.8l1.176 4.2M9 18h5"/>
        <circle cx="16" cy="18" r="2"/>
        <circle cx="7" cy="18" r="2"/>
      </g>
    </svg>
  )
}

function IconaVImbarcazione() {
  return (
    <svg width="22" height="22" viewBox="0 0 36 36">
      <path fill="currentColor" d="M29.1 27.1c-1.1-.1-2.2.3-3.1 1.1c-1.1 1.1-2.9 1.1-4.1 0c-1-.7-2.1-1.1-3.3-1.1c-1.2-.1-2.4.3-3.3 1.1c-.6.5-1.3.8-2.1.8s-1.5-.3-2.1-.8c-1-.8-2.2-1.2-3.4-1.2s-2.4.4-3.4 1.2c-.6.5-1.5.8-2.3.8v2c1.3.1 2.6-.3 3.6-1.2c.6-.5 1.5-.8 2.3-.8c.7 0 1.5.3 2.1.8c1.8 1.6 4.6 1.6 6.5 0c.6-.5 1.3-.8 2.1-.8c.7 0 1.4.3 2 .8c1.9 1.6 4.6 1.6 6.5 0c.5-.5 1.3-.8 2-.8s1.4.3 1.9.8q1.35 1.05 3 1.2v-2c-1 0-1.2-.4-1.7-.8c-.9-.7-2-1.1-3.2-1.1"/>
      <path fill="currentColor" d="M6 23c0-.6.5-1 1.1-1H32l-3.5 3.1h.2c.8 0 1.6.2 2.2.5l2.5-2.2l.2-.2c.7-.8.6-2.1-.2-2.8c-.4-.2-.8-.4-1.3-.4h-25c-1.7 0-3 1.3-3 3v3.2c.5-.5 1.2-.8 1.9-1.1z"/>
      <path fill="currentColor" d="M8.9 19H15v-7.8c0-.6-.3-1.2-.8-1.6c-.9-.7-2.2-.5-2.8.4l-4.1 5.9c-.4.6-.4 1.4-.1 2.1c.3.6 1 1 1.7 1m4.2-7.8L13 17H8.9z"/>
      <path fill="currentColor" d="M26 18c.4-.6.4-1.4 0-2L19.7 5.6c-.4-.6-1-1-1.7-1c-1.1 0-2 .9-2 2V19h8.3c.7 0 1.4-.4 1.7-1M17.9 6.6l6.4 10.5h-6.4z"/>
    </svg>
  )
}

function IconaVPullman() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M12 2C8.229 2 6.343 2 5.172 3.172C4.108 4.235 4.01 5.886 4 9H3a1 1 0 0 0-1 1v1a1 1 0 0 0 .4.8L4 13c.01 3.114.108 4.765 1.172 5.828c.242.243.514.435.828.587V21a1 1 0 0 0 1 1h1.5a1 1 0 0 0 1-1v-1.018C10.227 20 11.054 20 12 20s1.773 0 2.5-.018V21a1 1 0 0 0 1 1H17a1 1 0 0 0 1-1v-1.585a3 3 0 0 0 .828-.587C19.892 17.765 19.991 16.114 20 13l1.6-1.2a1 1 0 0 0 .4-.8v-1a1 1 0 0 0-1-1h-1c-.01-3.114-.108-4.765-1.172-5.828C17.657 2 15.771 2 12 2M5.5 9.5c0 1.414 0 2.121.44 2.56c.439.44 1.146.44 2.56.44h7c1.414 0 2.121 0 2.56-.44c.44-.439.44-1.146.44-2.56V7c0-1.414 0-2.121-.44-2.56C17.622 4 16.915 4 15.5 4h-7c-1.414 0-2.121 0-2.56.44C5.5 4.878 5.5 5.585 5.5 7zm.75 6.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H7a.75.75 0 0 1-.75-.75m11.5 0a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 .75-.75" clipRule="evenodd"/>
    </svg>
  )
}

function IconaVCamion() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="currentColor" d="M1 12.5v5a1 1 0 0 0 1 1h1a3 3 0 0 0 6 0h6a3 3 0 0 0 6 0h1a1 1 0 0 0 1-1v-12a3 3 0 0 0-3-3h-9a3 3 0 0 0-3 3v2H6a3 3 0 0 0-2.4 1.2l-2.4 3.2a.6.6 0 0 0-.07.14l-.06.11a1 1 0 0 0-.07.35m16 6a1 1 0 1 1 1 1a1 1 0 0 1-1-1m-7-13a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v11h-.78a3 3 0 0 0-4.44 0H10Zm-2 6H4l1.2-1.6a1 1 0 0 1 .8-.4h2Zm-3 7a1 1 0 1 1 1 1a1 1 0 0 1-1-1m-2-5h5v2.78a3 3 0 0 0-4.22.22H3Z"/>
    </svg>
  )
}

function IconaVVelivolo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <g fill="none">
        <path fill="currentColor" fillOpacity=".16" d="M10.292 7.043c0-3.478.424-5.043 1.698-5.043c1.273 0 1.708 1.565 1.708 5.043V8.74l6.238 3.957c.425.304.57.804.552 1.304v2l-6.532-2.62a.4.4 0 0 0-.548.345l-.304 4.753l2.376 1.348c.212.13.34.391.34.652L15.507 22l-3.517-1.174L8.483 22l-.313-1.522c0-.26.127-.522.34-.652l2.376-1.348l-.304-4.753a.4.4 0 0 0-.548-.345L3.502 16v-2c-.019-.5.127-1 .551-1.304l6.239-3.957z"/>
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" d="M10.292 7.043c0-3.478.424-5.043 1.698-5.043c1.273 0 1.708 1.565 1.708 5.043V8.74l6.238 3.957c.425.304.57.804.552 1.304v2l-6.532-2.62a.4.4 0 0 0-.548.345l-.304 4.753l2.376 1.348c.212.13.34.391.34.652L15.507 22l-3.517-1.174L8.483 22l-.313-1.522c0-.26.127-.522.34-.652l2.376-1.348l-.304-4.753a.4.4 0 0 0-.548-.345L3.502 16v-2c-.019-.5.127-1 .551-1.304l6.239-3.957z"/>
      </g>
    </svg>
  )
}

function IconaVAltro() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="6" y1="12" x2="18" y2="12"/>
      <line x1="12" y1="6" x2="12" y2="18"/>
    </svg>
  )
}

const ICONE_VEICOLO: Record<TipoMezzo, () => React.ReactNode> = {
  autovettura: IconaVAutovettura,
  motoveicolo: IconaVMotociclo,
  ciclomotore: IconaVCiclomotore,
  minicar: IconaVMinicar,
  furgone: IconaVFurgone,
  imbarcazione: IconaVImbarcazione,
  pullman: IconaVPullman,
  camion: IconaVCamion,
  velivolo: IconaVVelivolo,
  altro: IconaVAltro,
}

// ============================================================
// FRASI DINAMICHE
// ============================================================

function articolo(tipo: TipoMezzo | null, tipoAltro?: string): string {
  if (!tipo) return 'il veicolo'
  if (tipo === 'altro' && tipoAltro?.trim()) return `il ${tipoAltro.trim().toLowerCase()}`
  const map: Record<TipoMezzo, string> = {
    autovettura: "l'autovettura", motoveicolo: 'il motoveicolo', ciclomotore: 'il ciclomotore',
    minicar: 'la minicar', furgone: 'il furgone', imbarcazione: "l'imbarcazione", pullman: 'il pullman',
    camion: 'il camion', velivolo: 'il velivolo', altro: 'il mezzo',
  }
  return map[tipo]
}

function articoloDel(tipo: TipoMezzo | null, tipoAltro?: string): string {
  if (!tipo) return 'del veicolo'
  if (tipo === 'altro' && tipoAltro?.trim()) return `del ${tipoAltro.trim().toLowerCase()}`
  const map: Record<TipoMezzo, string> = {
    autovettura: "dell'autovettura", motoveicolo: 'del motoveicolo', ciclomotore: 'del ciclomotore',
    minicar: 'della minicar', furgone: 'del furgone', imbarcazione: "dell'imbarcazione", pullman: 'del pullman',
    camion: 'del camion', velivolo: 'del velivolo', altro: 'del mezzo',
  }
  return map[tipo]
}

function pronomeTuo(tipo: TipoMezzo | null, tipoAltro?: string): string {
  if (!tipo) return 'tuo veicolo'
  if (tipo === 'altro' && tipoAltro?.trim()) return `tuo ${tipoAltro.trim().toLowerCase()}`
  const map: Record<TipoMezzo, string> = {
    autovettura: 'tua autovettura', motoveicolo: 'tuo motoveicolo', ciclomotore: 'tuo ciclomotore',
    minicar: 'tua minicar', furgone: 'tuo furgone', imbarcazione: 'tua imbarcazione', pullman: 'tuo pullman',
    camion: 'tuo camion', velivolo: 'tuo velivolo', altro: 'tuo mezzo',
  }
  return map[tipo]
}

function nomeVeicolo(tipo: TipoMezzo | null, tipoAltro?: string): string {
  if (!tipo) return 'Veicolo'
  if (tipo === 'altro' && tipoAltro?.trim()) {
    const t = tipoAltro.trim()
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  }
  const map: Record<TipoMezzo, string> = {
    autovettura: 'Autovettura', motoveicolo: 'Motoveicolo', ciclomotore: 'Ciclomotore',
    minicar: 'Minicar', furgone: 'Furgone', imbarcazione: 'Imbarcazione', pullman: 'Pullman',
    camion: 'Camion', velivolo: 'Velivolo', altro: 'Altro mezzo',
  }
  return map[tipo]
}

function veicoloHaCambio(tipo: TipoMezzo | null): boolean {
  if (!tipo) return true
  return tipo === 'autovettura' || tipo === 'minicar' || tipo === 'furgone' || tipo === 'pullman' || tipo === 'camion' || tipo === 'altro'
}

function isFemminile(tipo: TipoMezzo | null): boolean {
  if (!tipo) return false
  return tipo === 'autovettura' || tipo === 'minicar' || tipo === 'imbarcazione'
}

// ============================================================
// TRADUZIONE ERRORI IN ITALIANO
// ============================================================

function traduciErrore(e: unknown): string {
  const msg = e instanceof Error ? e.message : ''
  const m = msg.toLowerCase()
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed') || m.includes('fetch')) {
    return 'Errore di connessione. Controlla la tua rete e riprova.'
  }
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already exists')) {
    return "Questa email è già registrata. Prova ad accedere dalla pagina di login, oppure usa un'altra email."
  }
  if (m.includes('password') && (m.includes('6') || m.includes('at least') || m.includes('short'))) {
    return 'La password è troppo corta: deve avere almeno 6 caratteri.'
  }
  if (m.includes('invalid email') || m.includes('validate email') || m.includes('invalid format')) {
    return "L'email inserita non sembra valida. Controllala e riprova."
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Troppi tentativi ravvicinati. Attendi qualche minuto e riprova.'
  }
  return 'Si è verificato un errore. Riprova tra qualche istante.'
}

// ============================================================
// META STEP
// ============================================================

interface StepMeta {
  icona: () => React.ReactNode
  titoloBanner: string
  titoloPagina: string
  sottoPagina?: string
}

function getStepMeta(stepKey: string, tipo: TipoMezzo | null, tipoAltro?: string, intestazione?: Intestazione | null): StepMeta {
  if (stepKey === 'tipo-veicolo') {
    const Icona = tipo ? ICONE_VEICOLO[tipo] : IconaVAutovettura
    return {
      icona: Icona,
      titoloBanner: tipo ? `Veicolo: ${nomeVeicolo(tipo, tipoAltro)}` : 'Tipo di veicolo',
      titoloPagina: 'Che tipo di veicolo è?',
      sottoPagina: 'Seleziona il tipo di mezzo per iniziare.',
    }
  }
  if (stepKey === 'identifica-veicolo') {
    const Icona = tipo ? ICONE_VEICOLO[tipo] : IconaVAutovettura
    return {
      icona: Icona,
      titoloBanner: `Identifica: ${nomeVeicolo(tipo, tipoAltro)}`,
      titoloPagina: `Identifica ${articolo(tipo, tipoAltro)}`,
      sottoPagina: 'Anno, km, marca e modello.',
    }
  }
  if (stepKey === 'cambio-veicolo') {
    return {
      icona: IconaCambio,
      titoloBanner: `Cambio: ${nomeVeicolo(tipo, tipoAltro)}`,
      titoloPagina: `Che tipo di cambio ha ${articolo(tipo, tipoAltro)}?`,
      sottoPagina: 'Questa info aiuta il demolitore a scegliere il carro attrezzi giusto.',
    }
  }
  if (stepKey === 'condizioni-veicolo') {
    return {
      icona: IconaCondizioni,
      titoloBanner: `Condizioni: ${nomeVeicolo(tipo, tipoAltro)}`,
      titoloPagina: `In che condizioni è ${articolo(tipo, tipoAltro)}?`,
      sottoPagina: 'Rispondi alle 4 domande, ti bastano pochi secondi.',
    }
  }

  const Icona = tipo ? ICONE_VEICOLO[tipo] : IconaPin

  switch (stepKey) {
    case 'indirizzo':
      return {
        icona: Icona,
        titoloBanner: `Indirizzo: ${nomeVeicolo(tipo, tipoAltro)}`,
        titoloPagina: `Dove si trova ${articolo(tipo, tipoAltro)}?`,
        sottoPagina: `Inserisci l'indirizzo esatto dove si trova fisicamente ${articolo(tipo, tipoAltro)}: il demolitore verrà lì a ritirarlo.`,
      }
    case 'targa':
      return {
        icona: Icona,
        titoloBanner: `Targa: ${nomeVeicolo(tipo, tipoAltro)}`,
        titoloPagina: `Qual è la targa ${articoloDel(tipo, tipoAltro)}?`,
        sottoPagina: intestazione === 'targhe_straniere'
          ? 'Inserisci la targa estera così come appare sul mezzo.'
          : 'Ci serve per verificare eventuali fermi amministrativi.',
      }
    case 'cf': {
      if (intestazione === 'societa') {
        return {
          icona: IconaCF,
          titoloBanner: 'Partita IVA',
          titoloPagina: 'Partita IVA della società intestataria',
          sottoPagina: 'La trovi sul libretto di circolazione o in visura camerale. Va bene anche il codice fiscale numerico della società.',
        }
      }
      if (intestazione === 'associazione') {
        return {
          icona: IconaCF,
          titoloBanner: 'Codice fiscale',
          titoloPagina: "Codice fiscale dell'associazione",
          sottoPagina: "Quello dell'ente intestatario del mezzo: lo trovi sul certificato di attribuzione del codice fiscale.",
        }
      }
      if (intestazione === 'deceduto') {
        return {
          icona: IconaCF,
          titoloBanner: 'Codice fiscale',
          titoloPagina: "Codice fiscale dell'intestatario deceduto",
          sottoPagina: 'Lo trovi sul libretto di circolazione o sui documenti del defunto.',
        }
      }
      if (intestazione === 'altra_persona') {
        return {
          icona: IconaCF,
          titoloBanner: 'Codice fiscale',
          titoloPagina: 'Codice fiscale di chi risulta intestatario al PRA',
          sottoPagina: 'Lo trovi sul libretto di circolazione o sul certificato di proprietà.',
        }
      }
      return {
        icona: IconaCF,
        titoloBanner: 'Codice fiscale',
        titoloPagina: 'Il tuo codice fiscale',
        sottoPagina: 'Ci serve per verificare eventuali fermi amministrativi al PRA.',
      }
    }
    case 'foto':
      return {
        icona: IconaFoto,
        titoloBanner: `Foto: ${nomeVeicolo(tipo, tipoAltro)}`,
        titoloPagina: `Foto ${articoloDel(tipo, tipoAltro)}`,
        sottoPagina: `Le foto ci aiutano a capire le condizioni ${articoloDel(tipo, tipoAltro)} e a scegliere il mezzo di trasporto più adatto per il ritiro.`,
      }
    case 'intestazione':
      return {
        icona: IconaIntestazione,
        titoloBanner: 'Intestazione',
        titoloPagina: `A chi è intestat${isFemminile(tipo) ? 'a' : 'o'} ${articolo(tipo, tipoAltro)}?`,
        sottoPagina: 'Scegli in base a chi risulta proprietario sui documenti.',
      }
    case 'eredi':
      return {
        icona: IconaCuoreMini,
        titoloBanner: 'Eredità',
        titoloPagina: "Qualcuno degli eredi ha rinunciato all'eredità?",
        sottoPagina: 'Parliamo di rinuncia formale, fatta da un Notaio o in Tribunale.',
      }
    case 'societa-fallita':
      return {
        icona: IconaIntestazione,
        titoloBanner: 'Società',
        titoloPagina: 'La società è fallita o in liquidazione giudiziale?',
        sottoPagina: 'Ci serve per preparare i documenti corretti.',
      }
    case 'fermo':
      return {
        icona: IconaFermo,
        titoloBanner: 'Fermo amministrativo',
        titoloPagina: 'Ci sono fermi amministrativi sul mezzo?',
        sottoPagina: 'Il fermo non blocca la demolizione: serve solo una dichiarazione in più che prepariamo noi.',
      }
    case 'consegna':
      return {
        icona: IconaConsegna,
        titoloBanner: 'Consegna del mezzo',
        titoloPagina: `Chi consegnerà ${articolo(tipo, tipoAltro)} al demolitore?`,
        sottoPagina: 'La persona presente al ritiro che firma la consegna.',
      }
    case 'libretto':
      return {
        icona: IconaLibretto,
        titoloBanner: `Libretto: ${nomeVeicolo(tipo, tipoAltro)}`,
        titoloPagina: `Hai il libretto di circolazione ${articoloDel(tipo, tipoAltro)}?`,
        sottoPagina: 'Il libretto originale va consegnato al demolitore al momento del ritiro. Così riceverai il primo documento per bloccare o spostare l\'assicurazione.',
      }
    case 'cdc':
      return {
        icona: IconaCDC,
        titoloBanner: 'Certificato di proprietà',
        titoloPagina: 'Certificato di proprietà',
        sottoPagina: 'Il certificato è necessario per la radiazione al PRA.',
      }
    case 'account':
      return {
        icona: IconaAccount,
        titoloBanner: 'Crea il tuo account',
        titoloPagina: 'Crea il tuo account',
        sottoPagina: `Potrai seguire la pratica, caricare i documenti e scaricare il certificato di rottamazione direttamente dall'app.`,
      }
    default:
      return { icona: IconaPin, titoloBanner: '', titoloPagina: '' }
  }
}

// ============================================================

function RuoloButton({ iconSvg, label, sub, selected, onClick, errorBorder }: { iconSvg: React.ReactNode; label: string; sub: string; selected: boolean; onClick: () => void; errorBorder?: boolean }) {
  const baseBorder = selected
    ? 'border-blue-600 bg-blue-50'
    : errorBorder
      ? 'border-red-300 bg-red-50/30 hover:border-red-400'
      : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50'
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-xl border-[1.5px] text-left transition-all ${baseBorder}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-blue-200 text-blue-700' : 'bg-blue-100 text-blue-600'}`}>
        {iconSvg}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-sm ${selected ? 'text-blue-900' : 'text-gray-900'}`}>{label}</div>
        <div className={`text-xs mt-0.5 ${selected ? 'text-blue-700' : 'text-gray-500'}`}>{sub}</div>
      </div>
      <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
        {selected && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
    </button>
  )
}

function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
      <span className="flex-shrink-0 mt-0.5">ℹ️</span>
      <span>{children}</span>
    </div>
  )
}

function ErrorBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
      <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
      <span>{children}</span>
    </div>
  )
}

function getSteps(dati: DatiPratica) {
  const base = ['tipo-veicolo', 'intestazione']
  if (dati.intestazione === 'deceduto') base.push('eredi')
  if (dati.intestazione === 'societa') base.push('societa-fallita')
  base.push('identifica-veicolo')
  if (veicoloHaCambio(dati.veicolo.tipo)) {
    base.push('cambio-veicolo')
  }
  base.push('condizioni-veicolo', 'indirizzo', 'targa')
  if (dati.intestazione !== 'targhe_straniere') base.push('cf')
  base.push('foto')
  const cas = derivaCasistica(dati.intestazione, dati.erediRinuncia, dati.societaFallita)
  if (fermoApplicabile(cas)) base.push('fermo')
  if (delegaAmmessa(cas)) base.push('consegna')
  base.push('libretto')
  if (dati.intestazione !== 'targhe_straniere') base.push('cdc')
  base.push('account')
  return base
}

// ============================================================
function BannerStep({ stepKey, curIdx, total, tipo, tipoAltro, intestazione, onBack }: { stepKey: string; curIdx: number; total: number; tipo: TipoMezzo | null; tipoAltro?: string; intestazione?: Intestazione | null; onBack: () => void }) {
  const meta = getStepMeta(stepKey, tipo, tipoAltro, intestazione)
  const Icona = meta.icona

  return (
    <div className="-mx-7 -mt-7 mb-5 px-4 py-3 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] rounded-t-3xl flex items-center gap-3 text-white">
      <button
        onClick={onBack}
        className="bg-white/85 hover:bg-white text-blue-700 rounded-lg px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 flex-shrink-0 shadow-sm transition-all"
      >
        ← Indietro
      </button>
      <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icona />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">
            Passo {curIdx + 1} di {total}
          </div>
          <div className="text-sm font-semibold leading-tight truncate">{meta.titoloBanner}</div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
function SpazioPill({ label, color, selected, onClick, icon }: { label: string; color: 'green' | 'amber' | 'red'; selected: boolean; onClick: () => void; icon: React.ReactNode }) {
  const colors = {
    green: selected ? 'border-green-500 bg-green-50 text-green-700 shadow-[0_0_0_3px_rgba(34,197,94,0.15)]' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-green-300',
    amber: selected ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-amber-300',
    red: selected ? 'border-red-500 bg-red-50 text-red-700 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-red-300',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-[1.5px] text-center transition-all ${colors[color]}`}
    >
      <div>{icon}</div>
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </button>
  )
}

// ============================================================

export default function IniziaPage() {
  const router = useRouter()
  const [dati, setDati] = useState<DatiPratica>(datiPraticaIniziali)
  const [curIdx, setCurIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [indirizzoConfermato, setIndirizzoConfermato] = useState(false)
  const [datiIndirizzoExtra, setDatiIndirizzoExtra] = useState<DatiIndirizzo | null>(null)
  const [foto, setFoto] = useState<File[]>([])
  const [mostraSheetFoto, setMostraSheetFoto] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  const fotoCameraRef = useRef<HTMLInputElement>(null)
  const fotoGalleriaRef = useRef<HTMLInputElement>(null)

  // Stati di errore per ogni step (mostrati al click su Continua)
  const [erroreIndirizzo, setErroreIndirizzo] = useState(false)
  const [erroreSpazio, setErroreSpazio] = useState(false)
  const [erroreTarga, setErroreTarga] = useState(false)
  const [erroreTarghePresenti, setErroreTarghePresenti] = useState(false)
  const [erroreCf, setErroreCf] = useState(false)
  const [erroreIntestazione, setErroreIntestazione] = useState(false)
  const [erroreEredi, setErroreEredi] = useState(false)
  const [erroreSocietaFallita, setErroreSocietaFallita] = useState(false)
  const [erroreFermo, setErroreFermo] = useState(false)
  const [erroreConsegna, setErroreConsegna] = useState(false)
  const [erroreDelegato, setErroreDelegato] = useState<{nome?: boolean; telefono?: boolean}>({})
  const [erroreLibretto, setErroreLibretto] = useState(false)
  const [erroreCdc, setErroreCdc] = useState(false)
  const [erroreAccount, setErroreAccount] = useState<{nome?: boolean; telefono?: boolean; email?: boolean; password?: boolean}>({})

  const steps = getSteps(dati)
  const curStep = steps[curIdx]
  const total = steps.length
  const pct = Math.round((curIdx / (total - 1)) * 100)
  const tipo = dati.veicolo.tipo
  const tipoAltro = dati.veicolo.tipoAltro
  const cfAccetta11 = dati.intestazione === 'societa' || dati.intestazione === 'associazione'
  const meta = getStepMeta(curStep, tipo, tipoAltro, dati.intestazione)

  function update(partial: Partial<DatiPratica>) {
    setDati(prev => ({ ...prev, ...partial }))
  }

  function next() {
    if (curIdx < steps.length - 1) setCurIdx(i => i + 1)
    else handleSubmit()
  }

  function back() {
    if (curIdx > 0) setCurIdx(i => i - 1)
  }

  function onSelezioneIndirizzo(d: DatiIndirizzo) {
    setDatiIndirizzoExtra(d)
    update({ indirizzo: d.indirizzo, indirizzoSkipped: false })
    setIndirizzoConfermato(true)
    setErroreIndirizzo(false)
  }

  function setSpazio(v: SpazioCarroAttrezzi) {
    update({ spazioCarroAttrezzi: v })
    setErroreSpazio(false)
  }

  function setIntestazione(v: Intestazione) {
    // Reset dei rami quando si cambia tipo di intestazione
    update({ intestazione: v, erediRinuncia: null, societaFallita: null, numeroEredi: 1, nomiRinunciatari: '' })
    setErroreIntestazione(false)
  }

  // Handler "Continua" con validazione
  function handleContinuaIndirizzo() {
    if (!indirizzoConfermato) {
      setErroreIndirizzo(true)
      return
    }
    if (!dati.spazioCarroAttrezzi) {
      setErroreSpazio(true)
      document.getElementById('box-spazio')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    next()
  }

  function handleContinuaTarga() {
    if (!dati.targa) {
      setErroreTarga(true)
      return
    }
    if (dati.intestazione !== 'targhe_straniere' && !dati.targhePresenti) {
      setErroreTarghePresenti(true)
      document.getElementById('box-targhe')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    next()
  }

  function handleContinuaCf() {
    const isOrg = dati.intestazione === 'societa' || dati.intestazione === 'associazione'
    const valido = isOrg ? (dati.cf.length === 11 || dati.cf.length === 16) : dati.cf.length === 16
    if (!dati.cf || !valido) {
      setErroreCf(true)
      return
    }
    next()
  }

  function handleContinuaIntestazione() {
    if (!dati.intestazione) {
      setErroreIntestazione(true)
      return
    }
    next()
  }

  function handleContinuaEredi() {
    if (!dati.erediRinuncia) {
      setErroreEredi(true)
      return
    }
    next()
  }

  function handleContinuaSocietaFallita() {
    if (!dati.societaFallita) {
      setErroreSocietaFallita(true)
      return
    }
    next()
  }

  function handleContinuaFermo() {
    if (!dati.fermo) {
      setErroreFermo(true)
      return
    }
    next()
  }

  function handleContinuaConsegna() {
    if (!dati.consegna) {
      setErroreConsegna(true)
      return
    }
    if (dati.consegna === 'delegato') {
      const e: {nome?: boolean; telefono?: boolean} = {}
      if (!dati.delegatoNome.trim()) e.nome = true
      if (!dati.delegatoTelefono.trim()) e.telefono = true
      if (e.nome || e.telefono) {
        setErroreDelegato(e)
        return
      }
    }
    next()
  }

  function handleContinuaLibretto() {
    if (!dati.libretto) {
      setErroreLibretto(true)
      return
    }
    next()
  }

  function handleContinuaCdc() {
    if (!dati.cdc) {
      setErroreCdc(true)
      return
    }
    next()
  }

  function handleContinuaAccount() {
    const e: {nome?: boolean; telefono?: boolean; email?: boolean; password?: boolean} = {}
    if (!dati.nome) e.nome = true
    if (!dati.telefono) e.telefono = true
    if (!dati.email) e.email = true
    if (!dati.password) e.password = true
    if (e.nome || e.telefono || e.email || e.password) {
      setErroreAccount(e)
      return
    }
    handleSubmit()
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const nuove = Array.from(e.target.files)
      setFoto(prev => [...prev, ...nuove])
    }
    setMostraSheetFoto(false)
  }

  function apriCamera() {
    setMostraSheetFoto(false)
    setTimeout(() => fotoCameraRef.current?.click(), 100)
  }

  function apriGalleria() {
    setMostraSheetFoto(false)
    setTimeout(() => fotoGalleriaRef.current?.click(), 100)
  }

  function rimuoviFoto(idx: number) {
    setFoto(prev => prev.filter((_, i) => i !== idx))
  }

  async function uploadFotoSuStorage(praticaId: string, file: File, index: number): Promise<string | null> {
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const safeName = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const path = `${praticaId}/${safeName}`
      const { error: errUpload } = await supabase.storage
        .from('foto-pratiche')
        .upload(path, file, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        })
      if (errUpload) {
        console.error('Errore upload foto:', errUpload)
        return null
      }
      const { data: publicData } = supabase.storage
        .from('foto-pratiche')
        .getPublicUrl(path)
      return publicData?.publicUrl ?? null
    } catch (err) {
      console.error('Errore generico upload foto:', err)
      return null
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setLoadingMessage('Creo il tuo account...')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: dati.email,
        password: dati.password,
      })
      if (authError) throw authError
      const userId = authData.user?.id
      if (!userId) throw new Error('Utente non creato')

      const cas = derivaCasistica(dati.intestazione, dati.erediRinuncia, dati.societaFallita)
      const isEredi = cas === 'eredi_accettato' || cas === 'eredi_rinuncia'

      setLoadingMessage('Salvo la richiesta di demolizione...')
      const { data: praticaCreata, error: dbError } = await supabase
        .from('pratiche')
        .insert({
          user_id: userId,
          indirizzo_ritiro: dati.indirizzoSkipped ? null : dati.indirizzo,
          comune_ritiro: datiIndirizzoExtra?.comune || null,
          provincia_ritiro: datiIndirizzoExtra?.provincia || null,
          cap_ritiro: datiIndirizzoExtra?.cap || null,
          lat: datiIndirizzoExtra?.lat || null,
          lng: datiIndirizzoExtra?.lng || null,
          spazio_carro_attrezzi: dati.spazioCarroAttrezzi,
          spazio_carro_attrezzi_note: dati.spazioCarroAttrezziNote || null,
          targa: dati.targaSkipped ? null : dati.targa,
          targhe_presenti: dati.targhePresenti === null ? null : dati.targhePresenti === 'si',
          codice_fiscale: dati.cfSkipped || !dati.cf ? null : dati.cf,
          tipo_mezzo: dati.veicolo.tipo,
          tipo_mezzo_altro: dati.veicolo.tipoAltro || null,
          anno: dati.veicolo.anno ? parseInt(dati.veicolo.anno) : null,
          km: dati.veicolo.km ? parseInt(dati.veicolo.km) : null,
          marca: dati.veicolo.marca,
          modello: dati.veicolo.modello,
          tipo_cambio: dati.veicolo.tipoCambio,
          incidentato: dati.veicolo.incidentato === 'si',
          marciante: dati.veicolo.marciante === 'si',
          va_in_moto: dati.veicolo.vaInMoto === 'si',
          parti_mancanti: dati.veicolo.partiMancanti === 'si',
          note_veicolo: dati.veicolo.note || null,
          casistica: cas,
          numero_eredi: isEredi ? dati.numeroEredi : null,
          nomi_rinunciatari: cas === 'eredi_rinuncia' && dati.nomiRinunciatari.trim() ? dati.nomiRinunciatari.trim() : null,
          fermo_amministrativo: dati.fermo,
          delegato_nome: dati.consegna === 'delegato' ? dati.delegatoNome.trim() : null,
          delegato_telefono: dati.consegna === 'delegato' ? dati.delegatoTelefono.trim() : null,
          libretto: dati.libretto,
          certificato_proprieta: dati.cdc,
          nome_richiedente: dati.nome,
          telefono: dati.telefono,
          stato: 'in_attesa_documenti',
        })
        .select('id')
        .single()
      if (dbError) throw dbError
      if (!praticaCreata) throw new Error('Pratica non creata')
      const praticaId = praticaCreata.id

      if (foto.length > 0) {
        setLoadingMessage(`Carico le tue foto (0/${foto.length})...`)
        const urlSalvate: string[] = []
        for (let i = 0; i < foto.length; i++) {
          setLoadingMessage(`Carico le tue foto (${i + 1}/${foto.length})...`)
          const url = await uploadFotoSuStorage(praticaId, foto[i], i)
          if (url) urlSalvate.push(url)
        }
        if (urlSalvate.length > 0) {
          const righe = urlSalvate.map(url => ({
            pratica_id: praticaId,
            url,
          }))
          const { error: errFoto } = await supabase.from('foto_pratiche').insert(righe)
          if (errFoto) console.error('Errore salvataggio righe foto_pratiche:', errFoto)
        }
      }

      setLoadingMessage('Finalizzo la registrazione...')
      await supabase.from('utenti').insert({
        id: userId,
        nome: dati.nome,
        email: dati.email,
        telefono: dati.telefono,
        tipo: 'cliente',
        stato: 'attivo',
      })

      router.push('/dashboard')
    } catch (e: unknown) {
      console.error('Errore invio pratica:', e)
      setError(traduciErrore(e))
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  const inputClass = (err?: boolean) => `w-full border rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`

  return (
    <main className="min-h-screen flex items-start justify-center p-4 pt-8" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-lg p-7 relative">

        <BannerStep
          stepKey={curStep}
          curIdx={curIdx}
          total={total}
          tipo={tipo}
          tipoAltro={tipoAltro}
          intestazione={dati.intestazione}
          onBack={curIdx > 0 ? back : () => router.push('/')}
        />

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 bg-[#0d2144] rounded-xl flex items-center justify-center overflow-hidden">
            <Image src="/NoiDemoliamoLogo.png" alt="NoiDemoliamo" width={36} height={36} className="rounded-xl" />
          </div>
          <span className="text-sm font-medium text-gray-800">NoiDemoliamo</span>
        </div>

        <div className="h-1 bg-gray-100 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>

        {curStep === 'tipo-veicolo' && (
          <>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-3 mb-5 flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-200">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.39 0 4.68.94 6.36 2.64"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-blue-900 leading-tight mb-0.5">Pensiamo a tutto noi</div>
                <div className="text-xs text-blue-800 leading-snug">
                  In base alle tue risposte ti diremo quali documenti preparare.
                </div>
              </div>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            {meta.sottoPagina && <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>}
            <StepTipoVeicolo
              dati={dati.veicolo}
              onUpdate={v => setDati(prev => ({ ...prev, veicolo: { ...prev.veicolo, ...v } }))}
              onNext={next}
            />
          </>
        )}

        {curStep === 'identifica-veicolo' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            {meta.sottoPagina && <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>}
            <StepIdentificaVeicolo
              dati={dati.veicolo}
              onUpdate={v => setDati(prev => ({ ...prev, veicolo: { ...prev.veicolo, ...v } }))}
              onNext={next}
            />
          </>
        )}

        {curStep === 'cambio-veicolo' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            {meta.sottoPagina && <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>}
            <StepCambioVeicolo
              dati={dati.veicolo}
              onUpdate={v => setDati(prev => ({ ...prev, veicolo: { ...prev.veicolo, ...v } }))}
              onNext={next}
            />
          </>
        )}

        {curStep === 'condizioni-veicolo' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            {meta.sottoPagina && <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>}
            <StepCondizioniVeicolo
              dati={dati.veicolo}
              onUpdate={v => setDati(prev => ({ ...prev, veicolo: { ...prev.veicolo, ...v } }))}
              onNext={next}
            />
          </>
        )}

        {curStep === 'indirizzo' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>
            <div className="flex flex-col gap-4">
              {indirizzoConfermato ? (
                <>
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div className="flex-1 text-sm font-medium text-green-800">{dati.indirizzo}</div>
                    <button
                      onClick={() => { update({ indirizzo: '', spazioCarroAttrezzi: null, spazioCarroAttrezziNote: '' }); setIndirizzoConfermato(false); setDatiIndirizzoExtra(null); setErroreSpazio(false) }}
                      className="bg-white border border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                    >
                      Cambia
                    </button>
                  </div>

                  <div id="box-spazio" className={`border rounded-xl p-4 transition-all ${erroreSpazio ? 'border-red-300 bg-red-50/40 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : 'bg-blue-50/50 border-blue-100'}`}>
                    {erroreSpazio && (
                      <div className="flex items-start gap-2 bg-red-100 border border-red-200 rounded-lg p-2 mb-3 text-xs text-red-800">
                        <span className="flex-shrink-0">⚠️</span>
                        <span>Seleziona un&apos;opzione per lo spazio carro attrezzi.</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 mb-3">
                      <svg width="26" height="26" viewBox="0 0 18 15" className="text-blue-600 flex-shrink-0 mt-0.5">
                        <path stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" d="M0.5 1 L0.5 14 M17.5 1 L17.5 14" opacity="0.6"/>
                        <path fill="currentColor" d="M5 10.1c.77 0 1.4.63 1.4 1.4s-.63 1.4-1.4 1.4s-1.4-.63-1.4-1.4s.63-1.4 1.4-1.4m8 0c.77 0 1.4.63 1.4 1.4s-.63 1.4-1.4 1.4s-1.4-.63-1.4-1.4s.63-1.4 1.4-1.4M15.14 4c.21 0 .41.14.47.34L16.5 7v4c0 .28-.22.5-.5.5h-.8c0-1.22-.98-2.2-2.2-2.2s-2.2.98-2.2 2.2H7.2c0-1.22-.98-2.2-2.2-2.2s-2.2.98-2.2 2.2H1.5v-3c0-.28.22-.5.5-.5H12.5V5c0-.55.45-1 1-1zm-.39 1H14v2h2z"/>
                      </svg>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Spazio per carro attrezzi</div>
                        <div className="text-xs text-gray-600 mt-0.5">Il demolitore può accedere col carro attrezzi?</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <SpazioPill
                        label="Accesso libero" color="green"
                        selected={dati.spazioCarroAttrezzi === 'libero'}
                        onClick={() => setSpazio('libero')}
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      />
                      <SpazioPill
                        label="Spazio stretto" color="amber"
                        selected={dati.spazioCarroAttrezzi === 'stretto'}
                        onClick={() => setSpazio('stretto')}
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>}
                      />
                      <SpazioPill
                        label="Non passa" color="red"
                        selected={dati.spazioCarroAttrezzi === 'no'}
                        onClick={() => setSpazio('no')}
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
                      />
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Note aggiuntive (opzionale)</label>
                      <textarea
                        value={dati.spazioCarroAttrezziNote}
                        onChange={e => update({ spazioCarroAttrezziNote: e.target.value })}
                        placeholder="Es. Cancello largo 2,5 metri; cortile interno; salita ripida..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base text-gray-900 bg-white outline-none transition-all focus:border-blue-500 resize-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleContinuaIndirizzo}
                    className="w-full py-4 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all"
                  >
                    Continua →
                  </button>
                </>
              ) : (
                <>
                  {erroreIndirizzo && (
                    <ErrorBadge>Inserisci un indirizzo per continuare.</ErrorBadge>
                  )}
                  <AutocompleteIndirizzo
                    valoreIniziale={dati.indirizzo}
                    onSelezione={onSelezioneIndirizzo}
                  />
                  <p className="text-[11px] text-gray-400 -mt-2 px-1">
                    Inizia a digitare e seleziona un suggerimento per confermare.
                  </p>
                </>
              )}
            </div>
          </>
        )}

        {curStep === 'targa' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>
            <div className="flex flex-col gap-3">
              {erroreTarga && <ErrorBadge>Inserisci la targa per continuare.</ErrorBadge>}
              <input
                type="text"
                defaultValue={dati.targa}
                onChange={e => { update({ targa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''), targaSkipped: false }); setErroreTarga(false) }}
                placeholder="Es. AB 123 CD"
                className={`${inputClass(erroreTarga)} uppercase`}
              />

              {dati.intestazione !== 'targhe_straniere' && (
              <div id="box-targhe" className={`border rounded-xl p-4 transition-all ${erroreTarghePresenti ? 'border-red-300 bg-red-50/40 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : 'bg-blue-50/50 border-blue-100'}`}>
                {erroreTarghePresenti && (
                  <div className="flex items-start gap-2 bg-red-100 border border-red-200 rounded-lg p-2 mb-3 text-xs text-red-800">
                    <span className="flex-shrink-0">⚠️</span>
                    <span>Indica se le targhe sono presenti sul mezzo.</span>
                  </div>
                )}
                <div className="text-sm font-semibold text-gray-900 mb-0.5">Le targhe sono fisicamente sul mezzo?</div>
                <div className="text-xs text-gray-600 mb-3">Controlla che siano montate sul veicolo.</div>
                <div className="grid grid-cols-2 gap-2">
                  <SpazioPill
                    label="Sì, presenti" color="green"
                    selected={dati.targhePresenti === 'si'}
                    onClick={() => { update({ targhePresenti: 'si' }); setErroreTarghePresenti(false) }}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  />
                  <SpazioPill
                    label="No, smarrite o rubate" color="red"
                    selected={dati.targhePresenti === 'no'}
                    onClick={() => { update({ targhePresenti: 'no' }); setErroreTarghePresenti(false) }}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
                  />
                </div>
                {dati.targhePresenti === 'no' && (
                  <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <path d="M12 9v4"/>
                      <path d="M12 17h.01"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    <span>Servirà la <strong>denuncia di smarrimento in originale</strong> da consegnare al ritiro. Te lo ricorderemo nella tua area personale.</span>
                  </div>
                )}
              </div>
              )}

              <button
                onClick={handleContinuaTarga}
                className="w-full py-4 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all"
              >
                Continua →
              </button>
            </div>
          </>
        )}

        {curStep === 'cf' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>
            <div className="flex flex-col gap-3">
              {erroreCf && <ErrorBadge>{cfAccetta11 ? 'Inserisci una partita IVA (11 cifre) o un codice fiscale valido (16 caratteri).' : 'Inserisci un codice fiscale valido di 16 caratteri.'}</ErrorBadge>}
              <div>
                <input
                  type="text"
                  value={dati.cf}
                  onChange={e => { update({ cf: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''), cfSkipped: false }); setErroreCf(false) }}
                  placeholder={cfAccetta11 ? 'Es. 12345678901' : 'Es. RSSMRA80A01H501Z'}
                  className={`${inputClass(erroreCf || (dati.cf.length > 0 && dati.cf.length !== 16 && !(cfAccetta11 && dati.cf.length === 11)))} uppercase tracking-wider`}
                  maxLength={16}
                />
                <div className="flex items-center justify-between mt-1.5 px-1">
                  <span className={`text-xs ${
                    dati.cf.length === 16 || (cfAccetta11 && dati.cf.length === 11)
                      ? 'text-green-600 font-medium'
                      : dati.cf.length > 0
                        ? 'text-amber-600'
                        : 'text-gray-400'
                  }`}>
                    {dati.cf.length === 16 ? (
                      <span className="inline-flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Codice fiscale valido
                      </span>
                    ) : cfAccetta11 && dati.cf.length === 11 ? (
                      <span className="inline-flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Partita IVA valida
                      </span>
                    ) : dati.cf.length > 0 ? (
                      cfAccetta11 ? 'P.IVA: 11 cifre · CF: 16 caratteri' : `Mancano ${16 - dati.cf.length} caratteri`
                    ) : (
                      cfAccetta11 ? 'Partita IVA (11 cifre) o codice fiscale (16 caratteri)' : 'Il codice fiscale deve essere di 16 caratteri'
                    )}
                  </span>
                  <span className={`text-xs font-mono ${
                    dati.cf.length === 16 || (cfAccetta11 && dati.cf.length === 11) ? 'text-green-600 font-semibold' : 'text-gray-400'
                  }`}>
                    {cfAccetta11 ? dati.cf.length : `${dati.cf.length}/16`}
                  </span>
                </div>
              </div>
              <button
                onClick={handleContinuaCf}
                className="w-full py-4 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all"
              >
                Continua →
              </button>
            </div>
          </>
        )}

        {curStep === 'foto' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            <p className="text-sm text-gray-500 mb-3">Aiutano il demolitore a capire le condizioni {articoloDel(tipo, tipoAltro)} e a scegliere il mezzo di trasporto corretto.</p>
            <div className="flex items-start gap-2 bg-blue-50/60 border-l-[3px] border-blue-500 rounded-r-md py-2.5 px-3 text-sm text-blue-800 mb-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span className="text-xs leading-relaxed">Frontale, posteriore, laterali e abitacolo. Non serve che siano perfette.</span>
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fotoCameraRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFoto} className="hidden" />
              <input ref={fotoGalleriaRef} type="file" accept="image/*" multiple onChange={handleFoto} className="hidden" />

              <button
                onClick={() => fotoCameraRef.current?.click()}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-[1.5px] border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">Scatta una foto</div>
                  <div className="text-xs text-gray-500 mt-0.5">Apre la fotocamera</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>

              <button
                onClick={() => fotoGalleriaRef.current?.click()}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-[1.5px] border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">Carica dalla galleria</div>
                  <div className="text-xs text-gray-500 mt-0.5">Da telefono o PC</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>

              {foto.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {foto.length} {foto.length === 1 ? 'foto caricata' : 'foto caricate'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Pronte
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {foto.map((f, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(f)} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => rimuoviFoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                          aria-label="Rimuovi foto"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setMostraSheetFoto(true)}
                      className="aspect-square rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 hover:scale-[1.02] flex flex-col items-center justify-center gap-1 text-blue-600 transition-all"
                      aria-label="Aggiungi altra foto"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold leading-none">
                        +
                      </div>
                      <span className="text-[10px] font-semibold leading-tight text-center">Aggiungi<br/>altra foto</span>
                    </button>
                  </div>
                </div>
              )}

              {foto.length > 0 && foto.length < 4 && (
                <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <path d="M12 9v4"/>
                    <path d="M12 17h.01"/>
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  <span>
                    Ottimo inizio! Aggiungi <strong>almeno {4 - foto.length} {4 - foto.length === 1 ? 'altra foto' : 'altre foto'}</strong> (frontale, posteriore, laterali, abitacolo) per aiutare il demolitore a preventivare meglio.
                  </span>
                </div>
              )}

              {foto.length >= 4 && (
                <div className="mt-3 flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>Perfetto! Hai caricato un buon numero di foto. Puoi continuare o aggiungerne ancora.</span>
                </div>
              )}

              {foto.length === 0 && (
                <button onClick={next} className="w-full py-3 mt-3 rounded-xl font-medium text-sm bg-white text-gray-600 border-[1.5px] border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  Continua senza foto · le aggiungo dopo
                </button>
              )}

              {foto.length > 0 && foto.length < 4 && (
                <button onClick={next} className="w-full py-3.5 mt-2 rounded-xl font-semibold text-sm bg-white text-blue-700 border-[1.5px] border-blue-300 hover:border-blue-400 hover:bg-blue-50 active:scale-[0.99] transition-all">
                  Continua comunque con {foto.length} {foto.length === 1 ? 'foto' : 'foto'} →
                </button>
              )}

              {foto.length >= 4 && (
                <button onClick={next} className="w-full py-4 mt-2 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all">
                  Continua con {foto.length} foto →
                </button>
              )}
            </div>

            {/* Sheet popup scelta foto */}
            {mostraSheetFoto && (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setMostraSheetFoto(false)}
              >
                <div
                  className="bg-white w-full max-w-md rounded-t-3xl p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
                  <h3 className="text-base font-bold text-gray-900 text-center mb-1">Aggiungi una foto</h3>
                  <p className="text-xs text-gray-500 text-center mb-5">Come vuoi procedere?</p>

                  <button
                    onClick={apriCamera}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-[1.5px] border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all mb-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">Scatta una foto</div>
                      <div className="text-xs text-gray-500 mt-0.5">Apre la fotocamera</div>
                    </div>
                  </button>

                  <button
                    onClick={apriGalleria}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-[1.5px] border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all mb-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">Carica dalla galleria</div>
                      <div className="text-xs text-gray-500 mt-0.5">Da telefono o PC</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMostraSheetFoto(false)}
                    className="w-full py-3 rounded-xl font-medium text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {curStep === 'intestazione' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>
            {erroreIntestazione && <div className="mb-3"><ErrorBadge>Seleziona a chi è intestato il mezzo per continuare.</ErrorBadge></div>}
            <div className="flex flex-col gap-2">
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                label="A un privato cittadino"
                sub="Il proprietario è una persona, non un'azienda"
                selected={dati.intestazione === 'me'}
                onClick={() => setIntestazione('me')}
                errorBorder={erroreIntestazione}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="7" x2="10" y2="7"/><line x1="14" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="10" y2="11"/><line x1="14" y1="11" x2="15" y2="11"/><path d="M9 22v-4h6v4"/></svg>}
                label="A una società o azienda"
                sub="Mezzo intestato a una ditta con partita IVA"
                selected={dati.intestazione === 'societa'}
                onClick={() => setIntestazione('societa')}
                errorBorder={erroreIntestazione}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 2048 2048" fill="currentColor"><path d="M1504 128q113 0 212 43t173 116t116 173t43 212q0 109-41 209t-118 176l-865 864l-865-864Q83 981 42 881T0 672q0-112 42-211t117-173t173-117t212-43q83 0 148 19t120 52t106 81t106 103q55-56 105-103t106-80t121-53t148-19m294 838q59-59 90-135t31-159q0-87-32-162t-88-131t-132-87t-163-32q-84 0-149 26t-120 70t-105 97t-106 111q-54-54-105-109t-106-99t-121-72t-148-28q-86 0-162 32t-132 89t-89 133t-33 162q0 83 31 159t91 135l774 774z"/></svg>}
                label="A una persona deceduta"
                sub="Il proprietario è venuto a mancare"
                selected={dati.intestazione === 'deceduto'}
                onClick={() => setIntestazione('deceduto')}
                errorBorder={erroreIntestazione}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M19 15a4 4 0 0 1 3 4v2"/></svg>}
                label="A un'associazione"
                sub="Mezzo intestato a un ente o associazione"
                selected={dati.intestazione === 'associazione'}
                onClick={() => setIntestazione('associazione')}
                errorBorder={erroreIntestazione}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/></svg>}
                label="Il passaggio di proprietà non è stato completato"
                sub="Non risulto proprietario sui documenti"
                selected={dati.intestazione === 'altra_persona'}
                onClick={() => setIntestazione('altra_persona')}
                errorBorder={erroreIntestazione}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20"/></svg>}
                label="Il mezzo ha targhe straniere"
                sub="Veicolo immatricolato all'estero"
                selected={dati.intestazione === 'targhe_straniere'}
                onClick={() => setIntestazione('targhe_straniere')}
                errorBorder={erroreIntestazione}
              />
            </div>
            <button onClick={handleContinuaIntestazione} className="w-full py-4 rounded-xl font-semibold text-base mt-4 bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all">Continua →</button>
          </>
        )}

        {curStep === 'eredi' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>
            {erroreEredi && <div className="mb-3"><ErrorBadge>Seleziona un&apos;opzione per continuare.</ErrorBadge></div>}
            <div className="flex flex-col gap-2">
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                label="No, tutti hanno accettato"
                sub="Nessuna rinuncia formale"
                selected={dati.erediRinuncia === 'no'}
                onClick={() => { update({ erediRinuncia: 'no' }); setErroreEredi(false) }}
                errorBorder={erroreEredi}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/></svg>}
                label="Sì, qualcuno ha rinunciato"
                sub="Almeno un erede deve aver accettato"
                selected={dati.erediRinuncia === 'si'}
                onClick={() => { update({ erediRinuncia: 'si' }); setErroreEredi(false) }}
                errorBorder={erroreEredi}
              />
            </div>

            {dati.erediRinuncia === 'si' && (
              <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <path d="M12 9v4"/>
                  <path d="M12 17h.01"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                <span><strong>Quando usare questa opzione:</strong> seleziona questa casistica solo se il proprietario del veicolo è deceduto e tra i parenti aventi diritto (es. coniuge, figli, fratelli, nipoti, cugini o altri parenti legittimi) qualcuno ha rinunciato formalmente all&apos;eredità tramite Notaio o Tribunale, mentre almeno uno di questi stessi parenti ha accettato l&apos;eredità e si prende l&apos;incarico di demolire il mezzo.<br/><br/><strong>Attenzione:</strong> chi ha rinunciato all&apos;eredità <strong>NON deve firmare nulla</strong> e <strong>NON deve consegnare i propri documenti</strong>, altrimenti rischia di annullare la rinuncia. La pratica verrà firmata e gestita solo da chi ha accettato, che dichiarerà la rinuncia degli altri nell&apos;autocertificazione generata dall&apos;app.</span>
              </div>
            )}

            <h2 className="text-base font-semibold text-gray-900 mt-5 mb-2">Quanti eredi hanno accettato?</h2>
            <div className="flex items-center gap-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl px-4 py-3">
              <button
                type="button"
                onClick={() => update({ numeroEredi: Math.max(1, dati.numeroEredi - 1) })}
                className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 text-xl font-bold flex items-center justify-center hover:bg-blue-200 active:scale-95 transition-all"
                aria-label="Diminuisci"
              >
                −
              </button>
              <div className="flex-1 text-center text-2xl font-bold text-gray-900">{dati.numeroEredi}</div>
              <button
                type="button"
                onClick={() => update({ numeroEredi: Math.min(10, dati.numeroEredi + 1) })}
                className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 text-xl font-bold flex items-center justify-center hover:bg-blue-200 active:scale-95 transition-all"
                aria-label="Aumenta"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 px-1">Per ogni erede ti chiederemo carta d&apos;identità e codice fiscale nella tua area personale. Massimo 10.</p>

            <button onClick={handleContinuaEredi} className="w-full py-4 rounded-xl font-semibold text-base mt-4 bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all">Continua →</button>
          </>
        )}

        {curStep === 'societa-fallita' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>
            {erroreSocietaFallita && <div className="mb-3"><ErrorBadge>Seleziona un&apos;opzione per continuare.</ErrorBadge></div>}
            <div className="flex flex-col gap-2">
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                label="No, è attiva"
                sub="La società è regolarmente operativa"
                selected={dati.societaFallita === 'no'}
                onClick={() => { update({ societaFallita: 'no' }); setErroreSocietaFallita(false) }}
                errorBorder={erroreSocietaFallita}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                label="Sì, c'è un curatore fallimentare"
                sub="Servirà l'autorizzazione del Giudice Delegato"
                selected={dati.societaFallita === 'si'}
                onClick={() => { update({ societaFallita: 'si' }); setErroreSocietaFallita(false) }}
                errorBorder={erroreSocietaFallita}
              />
            </div>
            <button onClick={handleContinuaSocietaFallita} className="w-full py-4 rounded-xl font-semibold text-base mt-4 bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all">Continua →</button>
          </>
        )}

        {curStep === 'fermo' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>
            {erroreFermo && <div className="mb-3"><ErrorBadge>Seleziona un&apos;opzione per continuare.</ErrorBadge></div>}
            <div className="flex flex-col gap-2">
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                label="Sì"
                sub="Prepareremo noi la dichiarazione da firmare"
                selected={dati.fermo === 'si'}
                onClick={() => { update({ fermo: 'si' }); setErroreFermo(false) }}
                errorBorder={erroreFermo}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
                label="No"
                sub="Nessun fermo presente sul mezzo"
                selected={dati.fermo === 'no'}
                onClick={() => { update({ fermo: 'no' }); setErroreFermo(false) }}
                errorBorder={erroreFermo}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                label="Non lo so"
                sub="Verifichiamo noi gratuitamente al PRA"
                selected={dati.fermo === 'non_so'}
                onClick={() => { update({ fermo: 'non_so' }); setErroreFermo(false) }}
                errorBorder={erroreFermo}
              />
            </div>
            {dati.fermo === 'si' && (
              <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <path d="M12 9v4"/>
                  <path d="M12 17h.01"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                <span>La demolizione toglie il veicolo dalla circolazione, ma <strong>il debito che ha causato il fermo non si cancella</strong> e resta legato al codice fiscale del proprietario.</span>
              </div>
            )}
            <button onClick={handleContinuaFermo} className="w-full py-4 rounded-xl font-semibold text-base mt-4 bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all">Continua →</button>
          </>
        )}

        {curStep === 'consegna' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>
            {erroreConsegna && <div className="mb-3"><ErrorBadge>Seleziona chi consegnerà il mezzo per continuare.</ErrorBadge></div>}
            <div className="flex flex-col gap-2">
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                label="Io stesso"
                sub="Sarò presente al ritiro"
                selected={dati.consegna === 'io'}
                onClick={() => { update({ consegna: 'io' }); setErroreConsegna(false); setErroreDelegato({}) }}
                errorBorder={erroreConsegna}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M17 11l2 2 4-4"/></svg>}
                label="Una persona delegata"
                sub="Ti prepariamo noi la delega da firmare"
                selected={dati.consegna === 'delegato'}
                onClick={() => { update({ consegna: 'delegato' }); setErroreConsegna(false) }}
                errorBorder={erroreConsegna}
              />
            </div>

            {dati.consegna === 'delegato' && (
              <div className="mt-3 flex flex-col gap-3">
                <InfoBadge>Nella tua area personale troverai la delega già compilata: basterà scaricarla, firmarla e consegnarla al ritiro insieme ai documenti del delegato.</InfoBadge>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome e cognome del delegato</label>
                  <input
                    type="text"
                    defaultValue={dati.delegatoNome}
                    onChange={e => { update({ delegatoNome: e.target.value }); setErroreDelegato(prev => ({ ...prev, nome: false })) }}
                    placeholder="Mario Rossi"
                    className={inputClass(erroreDelegato.nome)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefono del delegato</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    defaultValue={dati.delegatoTelefono}
                    onChange={e => { update({ delegatoTelefono: e.target.value }); setErroreDelegato(prev => ({ ...prev, telefono: false })) }}
                    placeholder="+39 333 1234567"
                    className={inputClass(erroreDelegato.telefono)}
                  />
                  <p className="flex items-start gap-1.5 text-[11px] text-gray-500 mt-1.5 px-1 leading-relaxed">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5 text-blue-500">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span>Lo useremo solo per avvisare il delegato e accordarci sul giorno del ritiro. Nessun altro utilizzo.</span>
                  </p>
                </div>
              </div>
            )}

            <button onClick={handleContinuaConsegna} className="w-full py-4 rounded-xl font-semibold text-base mt-4 bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all">Continua →</button>
          </>
        )}

        {curStep === 'libretto' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{meta.titoloPagina}</h1>
            <p className="text-sm text-gray-500 mb-4">{meta.sottoPagina}</p>
            {erroreLibretto && <div className="mb-3"><ErrorBadge>Seleziona un&apos;opzione per continuare.</ErrorBadge></div>}
            <div className="flex flex-col gap-2">
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><path d="m22 27.18l-2.59-2.59L18 26l4 4l8-8l-1.41-1.41zM9 17h7v2H9zm0-5h12v2H9zm0-5h12v2H9z"/><path d="M16 30H6c-1.103 0-2-.897-2-2V4c0-1.103.897-2 2-2h18c1.103 0 2 .897 2 2v15h-2V4H6v24h10z"/></svg>}
                label="Sì, ho il libretto originale"
                sub="Documento disponibile ed integro"
                selected={dati.libretto === 'si'}
                onClick={() => { update({ libretto: 'si' }); setErroreLibretto(false) }}
                errorBorder={erroreLibretto}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 14v-4c0-3.771 0-5.657 1.172-6.828S7.229 2 11 2h2c3.771 0 5.657 0 6.828 1.172S21 6.229 21 10v4c0 3.771 0 5.657-1.172 6.828S16.771 22 13 22h-2c-3.771 0-5.657 0-6.828-1.172S3 17.771 3 14Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M11.333 10.667c1.055 1.055 2.445 2.127 2.445 2.127l1.904-1.905s-1.072-1.39-2.126-2.445C12.5 7.39 11.11 6.317 11.11 6.317L9.206 8.222s1.072 1.39 2.127 2.445m0 0L8 14m8-3.429l-2.54 2.54M11.43 6L8.89 8.54"/><path strokeLinecap="round" d="M8 18h8"/></svg>}
                label="Ho la denuncia di smarrimento in originale"
                sub="Emessa da autorità pubblica"
                selected={dati.libretto === 'denuncia'}
                onClick={() => { update({ libretto: 'denuncia' }); setErroreLibretto(false) }}
                errorBorder={erroreLibretto}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><circle cx="9" cy="28.5" r="1.5"/><path d="M10 25H8v-4h2a2 2 0 0 0 0-4H8a2 2 0 0 0-2 2v.5H4V19a4.005 4.005 0 0 1 4-4h2a4 4 0 0 1 0 8Z"/><path d="m27.7 9.3l-7-7A.9.9 0 0 0 20 2H10a2.006 2.006 0 0 0-2 2v8h2V4h8v6a2.006 2.006 0 0 0 2 2h6v16H14v2h12a2.006 2.006 0 0 0 2-2V10a.91.91 0 0 0-.3-.7M20 10V4.4l5.6 5.6Z"/></svg>}
                label="Non ho nessuno dei due al momento"
                sub="Ti spieghiamo come procedere"
                selected={dati.libretto === 'no'}
                onClick={() => { update({ libretto: 'no' }); setErroreLibretto(false) }}
                errorBorder={erroreLibretto}
              />
            </div>
            {dati.libretto === 'no' && (
              <div className="mt-3 flex flex-col gap-2">
                <InfoBadge>Nessun problema: <strong>ti chiamiamo noi</strong> per capire la situazione e dirti esattamente come fare. Intanto puoi completare la richiesta e caricare gli altri documenti.</InfoBadge>
                <a href="https://wa.me/393518280493" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.99]" style={{ background: '#16A34A' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.58 15.13L2 22l4.97-1.38A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.19-1.19l-.3-.18-2.95.82.8-2.87-.2-.31A8 8 0 1 1 12 20zm4.42-5.9c-.24-.12-1.43-.7-1.65-.78s-.38-.12-.54.12-.62.78-.76.94-.28.18-.52.06a6.55 6.55 0 0 1-1.93-1.19 7.24 7.24 0 0 1-1.33-1.66c-.14-.24 0-.37.1-.49s.24-.28.36-.42a1.64 1.64 0 0 0 .24-.4.44.44 0 0 0-.02-.42c-.06-.12-.54-1.3-.74-1.78s-.39-.4-.54-.41h-.46a.88.88 0 0 0-.64.3 2.68 2.68 0 0 0-.84 2 4.65 4.65 0 0 0 .98 2.47 10.66 10.66 0 0 0 4.08 3.6 13.68 13.68 0 0 0 1.36.5 3.27 3.27 0 0 0 1.5.1 2.46 2.46 0 0 0 1.61-1.14 2 2 0 0 0 .14-1.14c-.06-.1-.22-.16-.46-.28z"/></svg>
                  Preferisci scriverci? Chatta su WhatsApp
                </a>
              </div>
            )}
            <button onClick={handleContinuaLibretto} className="w-full py-4 rounded-xl font-semibold text-base mt-4 bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all">Continua →</button>
          </>
        )}

        {curStep === 'cdc' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Hai il Certificato di Proprietà?</h1>
            <p className="text-sm text-gray-500 mb-3">È il documento che dimostra chi è il proprietario del mezzo. Attenzione: non è il libretto, è un documento separato.</p>
            <div className="flex items-start gap-2 bg-blue-50/60 border-l-[3px] border-blue-500 rounded-r-md py-2.5 px-3 text-blue-800 mb-4">
              <span className="flex-shrink-0 mt-0.5">💡</span>
              <span className="text-xs leading-relaxed"><strong>Come capire quale hai:</strong> se l&apos;ultimo passaggio di proprietà è stato fatto <strong>prima di ottobre 2015</strong> hai quello <strong>cartaceo</strong>, un foglio con lo stemma ACI in alto. Se è stato fatto <strong>dopo</strong>, il tuo è <strong>digitale</strong>: non esiste un foglio da conservare.</span>
            </div>
            {erroreCdc && <div className="mb-3"><ErrorBadge>Seleziona un&apos;opzione per continuare.</ErrorBadge></div>}
            <div className="flex flex-col gap-2">
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="-4 -2 24 24" fill="currentColor"><path d="M3 0h10a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3m0 2a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm2 1h6a1 1 0 0 1 0 2H5a1 1 0 1 1 0-2m0 12h2a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2m0-4h6a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2m0-4h6a1 1 0 0 1 0 2H5a1 1 0 1 1 0-2"/></svg>}
                label="Sì, ho quello cartaceo"
                sub="Il foglio con lo stemma ACI in alto: va consegnato al momento del ritiro"
                selected={dati.cdc === 'cartaceo'}
                onClick={() => { update({ cdc: 'cartaceo' }); setErroreCdc(false) }}
                errorBorder={erroreCdc}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><path d="M14 21h2m-2 0a1.5 1.5 0 0 1-1.5-1.5V17H12m2 4h-4m0 0H8m2 0a1.5 1.5 0 0 0 1.5-1.5V17h.5m0 0v4m4-18H8c-2.828 0-4.243 0-5.121.879C2 4.757 2 6.172 2 9v2c0 2.828 0 4.243.879 5.121C3.757 17 5.172 17 8 17h8c2.828 0 4.243 0 5.121-.879C22 15.243 22 13.828 22 11V9c0-2.828 0-4.243-.879-5.121C20.243 3 18.828 3 16 3"/><path d="M12 10.5a2 2 0 1 0 0-4a2 2 0 0 0 0 4m0 0a3 3 0 0 0-3 3m3-3a3 3 0 0 1 3 3"/></svg>}
                label="Il mio è digitale"
                sub="Passaggio dopo ottobre 2015: il certificato è negli archivi digitali del PRA e non va consegnato al ritiro"
                selected={dati.cdc === 'digitale'}
                onClick={() => { update({ cdc: 'digitale' }); setErroreCdc(false) }}
                errorBorder={erroreCdc}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><circle cx="9" cy="28.5" r="1.5"/><path d="M10 25H8v-4h2a2 2 0 0 0 0-4H8a2 2 0 0 0-2 2v.5H4V19a4.005 4.005 0 0 1 4-4h2a4 4 0 0 1 0 8Z"/><path d="m27.7 9.3l-7-7A.9.9 0 0 0 20 2H10a2.006 2.006 0 0 0-2 2v8h2V4h8v6a2.006 2.006 0 0 0 2 2h6v16H14v2h12a2.006 2.006 0 0 0 2-2V10a.91.91 0 0 0-.3-.7M20 10V4.4l5.6 5.6Z"/></svg>}
                label="L'ho smarrito, ho la denuncia"
                sub="La denuncia in originale va consegnata al momento del ritiro"
                selected={dati.cdc === 'smarrito'}
                onClick={() => { update({ cdc: 'smarrito' }); setErroreCdc(false) }}
                errorBorder={erroreCdc}
              />
              <RuoloButton
                iconSvg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                label="Non lo trovo o non so cosa sia"
                sub="Nessun problema: lo verifichiamo noi gratuitamente e ti spieghiamo come procedere"
                selected={dati.cdc === 'nessuno'}
                onClick={() => { update({ cdc: 'nessuno' }); setErroreCdc(false) }}
                errorBorder={erroreCdc}
              />
            </div>
            {dati.cdc === 'nessuno' && (
              <div className="mt-3 flex flex-col gap-2">
                <InfoBadge>Lo verifichiamo noi gratuitamente e <strong>ti chiamiamo</strong> per dirti come procedere. Intanto puoi completare la richiesta e caricare gli altri documenti.</InfoBadge>
                <a href="https://wa.me/393518280493" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.99]" style={{ background: '#16A34A' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.58 15.13L2 22l4.97-1.38A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.19-1.19l-.3-.18-2.95.82.8-2.87-.2-.31A8 8 0 1 1 12 20zm4.42-5.9c-.24-.12-1.43-.7-1.65-.78s-.38-.12-.54.12-.62.78-.76.94-.28.18-.52.06a6.55 6.55 0 0 1-1.93-1.19 7.24 7.24 0 0 1-1.33-1.66c-.14-.24 0-.37.1-.49s.24-.28.36-.42a1.64 1.64 0 0 0 .24-.4.44.44 0 0 0-.02-.42c-.06-.12-.54-1.3-.74-1.78s-.39-.4-.54-.41h-.46a.88.88 0 0 0-.64.3 2.68 2.68 0 0 0-.84 2 4.65 4.65 0 0 0 .98 2.47 10.66 10.66 0 0 0 4.08 3.6 13.68 13.68 0 0 0 1.36.5 3.27 3.27 0 0 0 1.5.1 2.46 2.46 0 0 0 1.61-1.14 2 2 0 0 0 .14-1.14c-.06-.1-.22-.16-.46-.28z"/></svg>
                  Preferisci scriverci? Chatta su WhatsApp
                </a>
              </div>
            )}
            <button onClick={handleContinuaCdc} className="w-full py-4 rounded-xl font-semibold text-base mt-4 bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all">Continua →</button>
          </>
        )}

        {curStep === 'account' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Ultimo passo!</h1>
            <p className="text-sm text-gray-500 mb-4">Crea il tuo account per seguire la pratica fino al ritiro.</p>

            {/* Cosa succede dopo - timeline guida */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-4">
              <div className="text-xs font-bold text-sky-900 mb-2">Cosa succede dopo:</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2.5 text-xs text-sky-800">
                  <div className="w-6 h-6 rounded-lg bg-white text-sky-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m2 7 10 6 10-6"/>
                    </svg>
                  </div>
                  <span className="mt-0.5">Ricevi l&apos;<strong>email di conferma</strong> ed entri nella tua <strong>area personale</strong></span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-sky-800">
                  <div className="w-6 h-6 rounded-lg bg-white text-sky-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <span className="mt-0.5">Carichi i documenti richiesti: <strong>basta una foto fatta col telefono</strong></span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-sky-800">
                  <div className="w-6 h-6 rounded-lg bg-white text-sky-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    </svg>
                  </div>
                  <span className="mt-0.5">I moduli da firmare? <strong>Te li prepariamo noi già compilati</strong>: li stampi, li firmi e basta</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-sky-800">
                  <div className="w-6 h-6 rounded-lg bg-white text-sky-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 17h4V5H2v12h3"/>
                      <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/>
                      <circle cx="7.5" cy="17.5" r="2.5"/>
                      <circle cx="17.5" cy="17.5" r="2.5"/>
                    </svg>
                  </div>
                  <span className="mt-0.5">Documenti ok → fissiamo insieme il <strong>ritiro gratuito a domicilio</strong></span>
                </div>
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-3">⚠️ {error}</div>}
            {(erroreAccount.nome || erroreAccount.telefono || erroreAccount.email || erroreAccount.password) && (
              <div className="mb-3">
                <ErrorBadge>Compila tutti i campi richiesti per continuare.</ErrorBadge>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Il tuo nome e cognome</label>
                <input type="text" defaultValue={dati.nome} onChange={e => { update({ nome: e.target.value }); setErroreAccount(prev => ({ ...prev, nome: false })) }} placeholder="Mario Rossi" className={inputClass(erroreAccount.nome)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Il tuo numero di telefono</label>
                <input type="tel" inputMode="tel" defaultValue={dati.telefono} onChange={e => { update({ telefono: e.target.value }); setErroreAccount(prev => ({ ...prev, telefono: false })) }} placeholder="+39 333 1234567" className={inputClass(erroreAccount.telefono)} />
                <p className="flex items-start gap-1.5 text-[11px] text-gray-500 mt-1.5 px-1 leading-relaxed">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5 text-blue-500">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span>Lo usiamo solo per coordinare il ritiro e aggiornarti sulla tua pratica. Nessuna chiamata commerciale.</span>
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">La tua email</label>
                <input type="email" inputMode="email" defaultValue={dati.email} onChange={e => { update({ email: e.target.value }); setErroreAccount(prev => ({ ...prev, email: false })) }} placeholder="mario@email.it" className={inputClass(erroreAccount.email)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Scegli una password</label>
                <input type="password" defaultValue={dati.password} onChange={e => { update({ password: e.target.value }); setErroreAccount(prev => ({ ...prev, password: false })) }} placeholder="••••••••" className={inputClass(erroreAccount.password)} />
              </div>
              <button onClick={handleContinuaAccount} disabled={loading} className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99]'}`}>
                {loading ? (loadingMessage || 'Invio in corso...') : 'Conferma e invia richiesta'}
              </button>

              {/* Benefit account */}
              <div className="mt-1">
                <div className="text-[11px] font-bold text-blue-900 text-center mb-2">Col tuo account gratuito hai:</div>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-900">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 flex-shrink-0">
                      <rect x="3" y="4" width="18" height="16" rx="2"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Area personale
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-900">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 flex-shrink-0">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Chat col demolitore
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-900">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 flex-shrink-0">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="9 15 11 17 15 13"/>
                    </svg>
                    Certificato di Rottamazione
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 text-center mt-1 leading-relaxed">
                Continuando accetti termini di servizio e informativa privacy.
              </p>
            </div>
          </>
        )}

      </div>

      <AiutoWhatsApp />
    </main>
  )
}