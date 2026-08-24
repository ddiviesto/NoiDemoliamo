// ============================================================
// IL MARCHIO SCRITTO — "NoiDemoliamo"
// ⭐ 25/08 (scelto da Davide sul mockup): carattere Outfit, "Noi" leggero e
// "Demoliamo" pieno. Sta in un componente solo perché il nome deve essere
// IDENTICO ovunque: barra del sito, piede, isola del flusso, testate blu,
// sidebar di admin e demolitore.
// ⚠️ Non si usa quando "NoiDemoliamo" compare dentro una frase o come firma
// di un messaggio in chat: lì è testo, non è il marchio.
// ============================================================

export default function Marchio({ misura = 17, chiaro, occhiello, className }: {
  misura?: number          // altezza delle lettere in pixel
  chiaro?: boolean         // sul blu (testate, piede)
  occhiello?: boolean      // versione piccola in maiuscolo sopra i titoli
  className?: string
}) {
  const classi = ['marchio']
  if (chiaro) classi.push('marchio--chiaro')
  if (occhiello) classi.push('marchio--occhiello')
  if (className) classi.push(className)

  return (
    <span className={classi.join(' ')} style={{ fontSize: misura }}>
      {occhiello ? 'NoiDemoliamo' : <><span className="noi">Noi</span><span className="dem">Demoliamo</span></>}
    </span>
  )
}
