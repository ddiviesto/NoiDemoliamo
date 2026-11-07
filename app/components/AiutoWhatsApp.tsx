'use client'

// ============================================================
// AIUTO WHATSAPP (+39 351 828 0493)
// ⭐ 07/11 (Davide): il tondo verde che galleggiava in basso a destra
// (con la nuvoletta "Serve aiuto?" a intermittenza) NON C'È PIÙ, né sul
// telefono né su PC: stava tra i piedi e copriva i bottoni. L'aiuto sta
// nelle barre:
//   - <WhatsAppTestata />  nella testata blu del telefono (flussi, area
//     del cliente): tondino traslucido, stessa quadra della freccia;
//   - <WhatsAppBarra />    nelle isole di vetro (sito, flussi, area del
//     cliente, accesso) su telefono e PC: tondino verde chiaro con
//     l'icona verde, le tinte delle spunte e della voce WhatsApp delle
//     impostazioni.
// ============================================================

export const WHATSAPP_URL = 'https://wa.me/393518280493'

const ICONA = (misura: number, colore = '#fff') => (
  <svg width={misura} height={misura} viewBox="0 0 24 24" fill={colore}>
    <path d="M12 2a10 10 0 0 0-8.58 15.13L2 22l4.97-1.38A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.19-1.19l-.3-.18-2.95.82.8-2.87-.2-.31A8 8 0 1 1 12 20zm4.42-5.9c-.24-.12-1.43-.7-1.65-.78s-.38-.12-.54.12-.62.78-.76.94-.28.18-.52.06a6.55 6.55 0 0 1-1.93-1.19 7.24 7.24 0 0 1-1.33-1.66c-.14-.24 0-.37.1-.49s.24-.28.36-.42a1.64 1.64 0 0 0 .24-.4.44.44 0 0 0-.02-.42c-.06-.12-.54-1.3-.74-1.78s-.39-.4-.54-.41h-.46a.88.88 0 0 0-.64.3 2.68 2.68 0 0 0-.84 2 4.65 4.65 0 0 0 .98 2.47 10.66 10.66 0 0 0 4.08 3.6 13.68 13.68 0 0 0 1.36.5 3.27 3.27 0 0 0 1.5.1 2.46 2.46 0 0 0 1.61-1.14 2 2 0 0 0 .14-1.14c-.06-.1-.22-.16-.46-.28z"/>
  </svg>
)

/** Il tondino traslucido nella testata blu del telefono (stessa quadra della
 *  freccia indietro). Solo telefono: su PC c'è l'isola con <WhatsAppBarra />. */
export function WhatsAppTestata() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chiedi aiuto su WhatsApp"
      className="sm:hidden flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/30 active:scale-95"
      style={{ width: 38, height: 38, borderRadius: 999, background: 'rgba(255,255,255,0.18)' }}
    >
      {ICONA(21)}
    </a>
  )
}

/** Il tondino verde chiaro nelle isole di vetro, telefono e PC. */
export function WhatsAppBarra({ className = '' }: { className?: string }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chiedi aiuto su WhatsApp"
      title="Chiedi aiuto su WhatsApp"
      className={`flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#C5EBD2] active:scale-95 ${className}`}
      style={{ width: 34, height: 34, borderRadius: 999, background: '#DCF3E4' }}
    >
      {ICONA(19, '#1F7A43')}
    </a>
  )
}
