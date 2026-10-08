---
name: NoiDemoliamo
description: Area cliente e flussi della demolizione auto gratuita, app mobile-first con veste lilla e blu
colors:
  primary: "#2563EB"
  primary-deep: "#1D4ED8"
  primary-soft: "#EFF6FF"
  primary-line: "#DBEAFE"
  primary-mist: "#BFD3F5"
  leaf: "#16A34A"
  ground: "#F5F3FE"
  halo-blue: "#E4ECFF"
  halo-lilac: "#E9E3FF"
  halo-lavender: "#DED6FB"
  surface: "#FFFFFF"
  surface-muted: "#F5F7FB"
  field-bg: "#F9FAFB"
  line: "#E5E7EB"
  line-soft: "#E2E8F0"
  ink: "#0F172A"
  ink-title: "#111827"
  ink-value: "#3E4C63"
  ink-muted: "#55637A"
  ink-faint: "#6B7280"
  ink-placeholder: "#9AA7BC"
  success-bg: "#DCF3E4"
  success-ink: "#1F7A43"
  danger-bg: "#F3D9D9"
  danger-ink: "#A94444"
  danger-button: "#E15E5E"
  pause-bg: "#E8ECF3"
  pause-ink: "#5B6779"
  navy: "#0D2144"
typography:
  brand:
    fontFamily: "Outfit, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "normal"
  page-title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  card-title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  input:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  pill: "999px"
  card: "16px"
  field: "14px"
  tile: "14px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "28px"
components:
  button-page:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "15px 40px"
  button-page-off:
    backgroundColor: "{colors.line}"
    textColor: "#9CA3AF"
    rounded: "{rounded.pill}"
    padding: "15px 40px"
  pill-island:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  field-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "13px 20px"
  choice-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "11px 16px"
  choice-pill-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.pill}"
    padding: "11px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-title}"
    rounded: "{rounded.card}"
    padding: "16px"
  doc-tile-pc:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink-value}"
    rounded: "{rounded.tile}"
    padding: "16px"
  tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "9px 18px"
---

# Design System: NoiDemoliamo

> Questo file descrive la veste **già approvata da Davide** e serve alla skill Impeccable per restare dentro il tema. Non è un invito a cambiarla. La fonte completa e aggiornata è `ARCHITETTURA.md`, parte 6: se qualcosa qui è diverso, vale ARCHITETTURA. Ogni proposta che esce da queste regole va presentata a Davide come mockup, non applicata.

## Overview

**Creative North Star: "L'ufficio gentile"**

NoiDemoliamo toglie al cliente una pratica noiosa e burocratica e la fa sembrare semplice. La veste è quella di un servizio pubblico ben fatto, non di una startup: pulita, calma, un solo blu che dice "qui si agisce", un lilla morbido che fa da sfondo sul PC, e tutto il resto bianco. Niente effetti, niente colori decorativi, niente font di carattere oltre al marchio. Il cliente deve capire al primo sguardo **a che punto è** e **cosa deve fare adesso**.

L'esperienza di riferimento è quella **del telefono** (app a tutto schermo, testata blu). Il PC prende la stessa pagina e la posa su una scena lilla con un'isola di vetro in cima: non è un'altra interfaccia, è la stessa con più aria.

## Colors

### Primary
Il blu (`primary`, `primary-deep`) è l'unico colore d'azione: bottoni di pagina a gradiente da `primary-deep` a `primary`, link, pillola attiva delle linguette, spunte del percorso. La sua versione chiarissima (`primary-soft`) con il bordo `primary-line` è il celeste dei riquadri informativi, delle pillole di stato "in corso", della pillola dell'isola. **Mai blu pieno sulle superfici grandi**: quello è solo del banner del telefono e dei bottoni.

### Secondary
La fogliolina del marchio è l'unico verde fisso (`leaf`). Il verde dei traguardi (`success-bg` / `success-ink`) appare solo quando qualcosa è davvero completato o approvato. **Il verde nei bottoni è bocciato.**

### Tertiary
Il lilla. Su PC lo sfondo di flussi, accesso e area personale è `ground` con tre aloni radiali (`halo-blue` in alto a sinistra, `halo-lilac` a destra, `halo-lavender` in basso). È un fondale, non un colore di interfaccia: nessun componente usa il lilla al suo interno. Sul telefono non c'è: lì è bianco fino ai bordi.

### Neutral
Bianco per le superfici, `surface-muted` per le tessere piene dei documenti su PC, `field-bg` per i campi compatti. Bordi `line` (card) e `line-soft` (pillole). Testi: titoli `ink-title`, valori `ink-value` (mai nero pieno: "il nero spara"), testi secondari `ink-muted` e `ink-faint`.

### Named Rules
**The Three-Meanings Rule.** Solo tre colori semantici: blu = in corso, verde = traguardo, rosso = serve un'azione. Grigio (`pause-bg`/`pause-ink`) per pausa e annullo. Mai un colore per ogni stato.
**The Three-Reds Rule.** Rosso morbido `danger-button` per i bottoni distruttivi, rosso spento `danger-ink` per scritte e link, rosso vivo solo per le spie (pallini contatore). Il giallo non esiste: gli avvisi informativi sono schede blu.

## Typography

**Display Font:** Outfit, **solo per la scritta NoiDemoliamo** ("Noi" 500, "Demoliamo" 800), componente `Marchio`.
**Body Font:** quello di sistema (Tailwind sans), su tutte le pagine. Inter è stato provato e bocciato.

**Character:** neutro e quotidiano. Il marchio è l'unica voce con carattere; tutto il resto si legge e basta.

### Hierarchy
- Titolo pagina (`page-title`): 20px semibold sul telefono; su PC il titolo dell'area personale è grande e in `ink-title`, con la parola chiave in sfumatura blu-viola solo nei flussi.
- Titolo card (`card-title`): 14px/700, sottotitolo 11-12px grigio.
- Corpo (`body`) 14px; didascalie (`caption`) 12px, sul PC dei flussi nessun testo scende sotto i 13px.
- Campi (`input`): **sempre 16px** su telefono (sotto, Safari zooma). Su PC si può scendere a 13,5px.

### Named Rules
**The 700 Ceiling Rule.** I grassetti non superano 700: l'800 "urla" ed è bocciato (eccezione: "Demoliamo" nel marchio).
**The Document-Name Rule.** Nelle card il nome del documento è il protagonista visivo, non l'icona né lo stato.

## Layout

- **Telefono**: app a tutto schermo, testata blu a gradiente (`primary-deep` → `primary`) col marchio chiaro a sinistra e il titolo a destra, tondo traslucido per il tasto indietro, contenuti in colonna con 16px di margine, linguette fisse in basso.
- **PC (≥640px)**: scena lilla, **isola di vetro** in cima (bianco al 72% sfocato, bordo bianco, ombra morbida, raggio pillola) col marchio a sinistra e le pillole azzurre a destra ("Le tue pratiche", "Esci", ingranaggio). Sotto, **una sola colonna centrata**, larga circa 1000px nell'area personale, con **tutti i blocchi allo stesso bordo** (titolo, linguette, riquadro "Cosa fare adesso", card, liste). Niente pannelli laterali: provati e tolti perché "creano confusione".
- Le linguette su PC diventano un segmento di vetro a pillole, la voce aperta è la pillola blu, e stanno **sopra** il riquadro "Cosa fare adesso".
- Le pratiche su PC sono **righe larghe** (icona veicolo, targa e modello, stato a pillola, prossima azione), sul telefono card impilate.
- Scelte multiple nei flussi: griglia a tre colonne di pillole tutte uguali (`.scelte-griglia`), due colonne per Sì/No.
- `scrollbar-gutter: stable` ovunque: le aperture non fanno slittare la pagina.

**The Same-Edge Rule.** In una pagina su PC ogni blocco comincia e finisce sulla stessa verticale. Un blocco più stretto del titolo è un errore.

## Elevation & Depth

Superfici piatte a riposo. Le card hanno un bordo di 1,5px e un'ombra appena percettibile (0 1px 3px, 7%). Il bottone di pagina ha un'ombra blu morbida (0 6px 18px, 35%) che è la sua firma. L'isola e il segmento delle linguette usano vetro (bianco traslucido + blur 16px) **solo su PC e solo per quei due elementi**: il vetro non si spalma su altre superfici.

### Shadow Vocabulary
- `card`: 0 1px 3px rgba(16,24,40,0.07)
- `button`: 0 6px 18px rgba(37,99,235,0.35)
- `island`: 0 10px 30px rgba(15,27,51,0.10)
- `focus`: anello 3px rgba(37,99,235,0.15)

**The Flat-By-Default Rule.** Nessun glow, nessuna ombra colorata fuori dal bottone di pagina, nessun gradiente di testo fuori dalla parola evidenziata del titolo su PC.

## Shapes

Tutto ciò che si clicca o si compila è **una pillola** (raggio 999px): bottoni di pagina, campi di testo, scelte, pillole di stato, linguette su PC, pillole dell'isola. Le card e le tessere sono rettangoli ad angoli tondi (14-16px). I campi lunghi (note) sono rettangoli a 18px perché una pillola alta tre righe "viene storta". Le icone sono SVG a tratto sottile (stroke 1,7-1,9), stile feather, mai emoji.

**The Pill-First Rule.** Dove basta un'azione compatta non si mette un bottone rettangolare grande: pillola, bollino, riga compatta.

## Components

### Buttons
- **Bottone di pagina** (`button-page`, classe `.btn-pagina`): pillola a gradiente blu, testo bianco 15px/600, tutta larghezza sul telefono, larghezza naturale con 40px di padding su PC. Variante `--spento` (`button-page-off`): grigio ma **cliccabile** nei flussi (la validazione è al clic). `:disabled` solo quando spento davvero (es. foto minime in valutazione).
- **Pillola dell'isola** (`pill-island`): azzurra, testo blu 12,5px/700, hover più scura.
- **Bottoni distruttivi**: pillola rossa morbida; la ✕ sulle foto è un tondino scuro traslucido sull'angolo.

### Chips
Pillole di stato con la palette unica: in corso (azzurro/blu), completata (verde), anomalia o annullata (rosso tenue), in attesa (grigio). Iniziano col nome della fase e dopo il "·" il dettaglio ("Assegnata · ritiro fissato").

### Cards / Containers
- **Card** (`card`): bianca, bordo 1,5px `line`, raggio 14-16, ombra `card`, testata con quadratino azzurro 38-46px e icona blu + titolo 14/700 + sottotitolo 11 grigio. Righe dati: etichetta scura a sinistra, valore `ink-value` a destra.
- **Riquadro informativo**: celeste `primary-soft` con bordo `primary-line`, quadratino azzurro, titoletto e testo. Mai giallo.
- **"Cosa fare adesso"** (area personale): sul telefono è il banner blu, su PC un riquadro bianco con la stessa frase. Un solo box di stato per schermata.
- **Tessera documento** (`doc-tile-pc`): tratteggiata sul telefono, piena `surface-muted` con bordo `#E5E9F0` su PC, con pillola "Scegli dal dispositivo" e la riga "oppure trascina qui". Fronte e retro sono due tessere distinte con la loro testata.

### Inputs / Fields
- **Campo a pillola** (`field-pill`, `.campo-pillola`): bianco, bordo `line-soft`, etichetta piccola **fuori e sopra**, aiuto sotto, 16px. A fuoco: bordo blu + anello `focus`. Errore: bordo `#FCA5A5`, fondo `#FEF6F6`.
- Targa e codice fiscale: versione grande (19px/700, spaziata, centrata), la targa è anche corta e allineata a sinistra.
- **Scelta a pillola** (`choice-pill` / `choice-pill-selected`): bianca, si accende di azzurro con bordo blu e spunta. Niente semaforo verde/ambra/rosso.
- Modifica sul posto: campo con solo filo blu sotto, Annulla/Salva a pillola, "Salva" attivo solo se qualcosa è cambiato.

### Navigation
- Telefono: barra di linguette fissa in basso (bianca sfocata, voce attiva azzurra), testata blu col tondo indietro.
- PC: isola di vetro con marchio + pillole; linguette a segmento di vetro con pillola blu attiva; pannelli (chat, impostazioni, documenti) **entrano da destra** in 220-240ms e riescono prima di smontarsi.

### Il Marchio
La scritta "NoiDemoliamo" in Outfit con la fogliolina verde (Material Symbols "Eco") al posto del puntino della i. Misure in em dentro il componente. Sul blu la foglia ha l'interno `primary-mist`. Dentro una frase o come firma in chat il nome torna testo normale. Nessun altro simbolo.

## Do's and Don'ts

### Do:
- Una cosa per schermata, un solo invito, un solo box di stato.
- Pillole per tutto ciò che si clicca o compila; card bianche per i contenuti.
- Stesso bordo per tutti i blocchi su PC; una sola colonna centrata.
- Testi in italiano semplice, al presente, senza gergo ("documenti", non "upload"; "linguette" solo nel codice, mai nei testi).
- Aperture e chiusure morbide (grid 0fr↔1fr), pannelli da destra, niente sobbalzi.
- Conferme in linea o sulla foto stessa, nuvolette ancorate al bottone.

### Don't:
- Niente colori fuori palette, niente lilla dentro i componenti, niente verde nei bottoni, niente giallo.
- Niente font oltre a sistema + Outfit nel marchio; niente grassetti 800.
- Niente emoji, niente frecce testuali, niente chevron "‹", niente trattini lunghi "—" nei testi.
- Niente modali a schermo intero, niente popup intermedi per scattare o caricare.
- Niente pannelli laterali nell'area personale su PC, niente riquadri grigi con l'etichetta dentro, niente lente nel campo indirizzo.
- Niente promesse di tempi al cliente ("entro 3 ore" bocciato).
- Niente tabelle per le liste: card o righe larghe.
- Non riproporre le cose bocciate in ARCHITETTURA 6.11.
