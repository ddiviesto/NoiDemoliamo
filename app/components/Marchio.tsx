// ============================================================
// IL MARCHIO SCRITTO — "NoiDemoliamo"
// ⭐ 25/08 (scelto da Davide sul mockup): carattere Outfit, "Noi" leggero e
// "Demoliamo" pieno. Sta in un componente solo perché il nome deve essere
// IDENTICO ovunque: barra del sito, piede, isola del flusso, testate blu,
// sidebar di admin e demolitore.
// ⭐ 27/08: al posto del PUNTINO della "i" di "Noi" c'è la FOGLIOLINA verde
// (la stessa dell'icona dell'app: "Eco" delle Material Symbols di Google,
// contorno verde e dentro bianco). È l'unico segno del marchio: non c'è
// nessun disegnino accanto al nome, il vecchio tondino è stato tolto.
// ⚠️ Non si usa quando "NoiDemoliamo" compare dentro una frase o come firma
// di un messaggio in chat: lì è testo, non è il marchio.
// ============================================================

// La foglia di Google vive su una griglia di 960 con l'asse Y spostato:
// il viewBox è quello, così il disegno resta l'originale senza ritocchi.
const FOGLIA_CONTORNO = 'M216-176q-45-45-70.5-104T120-402q0-63 24-124.5T222-642q60-60 169.5-91T675-759q26 1 48 11t39 27q17 17 27 39.5t11 48.5q2 82-4.5 151.5t-21 125.5q-14.5 56-37 99.5T684-182q-53 53-112.5 77.5T450-80q-65 0-127-25.5T216-176Zm112-16q29 17 59.5 24.5T450-160q46 0 91-18.5t86-59.5q18-18 36.5-50.5t32-85Q709-426 716-500.5t2-177.5q-49-2-110.5-1.5T485-670q-61 9-116 29t-90 55q-45 45-62 89t-17 85q0 59 22.5 103.5T262-246q42-80 111-153.5T534-520q-72 63-125.5 142.5T328-192Z'
const FOGLIA_PIENO = 'M216-176q-45-45-70.5-104T120-402q0-63 24-124.5T222-642q60-60 169.5-91T675-759q26 1 48 11t39 27q17 17 27 39.5t11 48.5q2 82-4.5 151.5t-21 125.5q-14.5 56-37 99.5T684-182q-53 53-112.5 77.5T450-80q-65 0-127-25.5T216-176Z'

// ⭐ LE PROPORZIONI DELLA FOGLIOLINA, in frazioni della grandezza del testo
// (em): valgono uguali a 15px come a 34px. Numeri scelti da Davide sul
// mockup: localhost:3000/mockup-scritta.html
const FOGLIA = {
  larga: 0.60,   // quanto è grande
  alto: -0.09,   // quanto sta in alto rispetto alla lettera
  lato: 0.07,    // spostamento a destra, per farla cadere sull'asta della "i"
}
// ⚠️ La foglia sporge a destra della "i": senza un filo d'aria taglierebbe la
// "D" di Demoliamo. Anche questo è in em, quindi vale a ogni misura.
const SPAZIO_TRA_LE_PAROLE = 0.15

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

  // ⚠️ La foglia sostituisce il puntino, quindi va MESSA SOPRA la lettera e il
  // puntino va coperto: le misure sono in "em", cioè frazioni della grandezza
  // del testo, così l'incastro resta identico a 13px come a 34px.
  // ⚠️ Le misure stanno QUI, in linea, non solo nel foglio di stile: se il
  // foglio non fosse ancora arrivato, una foglia senza misure prenderebbe la
  // sua grandezza naturale (centinaia di pixel) e spaccherebbe la scritta.
  const foglia = (
    <span
      className="marchio-foglia"
      aria-hidden="true"
      style={{ position: 'absolute', left: '50%', top: `${FOGLIA.alto}em`, width: `${FOGLIA.larga}em`, height: `${FOGLIA.larga}em`, transform: `translateX(calc(-50% + ${FOGLIA.lato}em))`, pointerEvents: 'none' }}
    >
      {/* ⚠️ Niente macchia di fondo per cancellare il puntino: la foglia è
          PIENA (bianca dentro, verde il contorno) e lo copre da sola. La
          macchia si spostava insieme alla foglia e finiva sulle lettere vicine. */}
      <svg viewBox="0 -960 960 960" style={{ width: '100%', height: '100%', display: 'block' }}>
        {/* ⭐ 27/08 (Davide): sul blu il DENTRO della foglia prende lo stesso
            azzurro della parola "Noi", altrimenti stona col fondo */}
        <path d={FOGLIA_PIENO} fill={chiaro ? '#BFD3F5' : '#fff'} />
        <path d={FOGLIA_CONTORNO} fill="#16A34A" />
      </svg>
    </span>
  )

  return (
    <span className={classi.join(' ')} style={{ fontSize: misura }}>
      {occhiello ? 'NoiDemoliamo' : (
        <>
          <span className="noi">No<span className="marchio-i">i{foglia}</span></span>
          <span className="dem" style={{ marginLeft: `${SPAZIO_TRA_LE_PAROLE}em` }}>Demoliamo</span>
        </>
      )}
    </span>
  )
}
