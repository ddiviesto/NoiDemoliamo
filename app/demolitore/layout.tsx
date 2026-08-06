/**
 * LAYOUT AREA DEMOLITORE: all'istante zero del caricamento inietta un
 * foglietto di stile che spegne lo spazio riservato alla barra della
 * finestra e fa grigio lo sfondo — così al refresh non si vede il lampo
 * della striscia a destra. Si aggiunge un NODO (non si toccano gli
 * attributi della pagina): React non ha niente da ridire.
 * All'uscita dall'area lo rimuove la sidebar (useEffect).
 */
export default function LayoutDemolitore({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: "if(!document.getElementById('stile-area-lavoro')){var s=document.createElement('style');s.id='stile-area-lavoro';s.textContent='html{scrollbar-gutter:auto!important;background:#ECEEF2!important}body{background:#ECEEF2!important}';document.head.appendChild(s)}",
        }}
      />
      {children}
    </>
  )
}
