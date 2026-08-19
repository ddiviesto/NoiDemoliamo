/**
 * LAYOUT AREA DEMOLITORE: all'istante zero del caricamento mette un
 * foglietto di stile che spegne lo spazio riservato alla barra della
 * finestra e fa grigio lo sfondo — così al refresh non si vede il lampo
 * della striscia a destra.
 * ⭐ 17/08: era uno <script> che si creava il <style> da solo, ma React
 * lo segnalava come errore ("Encountered a script tag while rendering
 * React component") e soprattutto NON veniva eseguito arrivando qui da
 * un'altra pagina, solo al refresh. Ora è un <style> vero: vale sia al
 * primo caricamento sia navigando, e sparisce da solo uscendo dall'area.
 */
const STILE_AREA_LAVORO =
  'html{scrollbar-gutter:auto!important;background:#ECEEF2!important}body{background:#ECEEF2!important}'

export default function LayoutDemolitore({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style id="stile-area-lavoro" dangerouslySetInnerHTML={{ __html: STILE_AREA_LAVORO }} />
      {children}
    </>
  )
}
