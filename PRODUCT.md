# Product

<!-- impeccable:product-schema 1 -->

> File di contesto per la skill Impeccable. La fonte di verità del progetto resta `ARCHITETTURA.md`: qui c'è solo il riassunto che serve alla skill per non uscire dal tema NoiDemoliamo. Se i due file dicono cose diverse, vale ARCHITETTURA.

## Platform

web

## Users

- **Cliente privato italiano** che deve far demolire (o far valutare) un'auto, una moto o un furgone. Non è esperto: usa soprattutto **il telefono**, spesso in piedi davanti al mezzo. Il PC lo usa una minoranza, da casa, per ricontrollare o caricare i documenti scansionati.
- **Admin (Davide)** e **demolitori** usano un'area separata da PC (CRM). Non è l'oggetto di questo file.

## Product Purpose

Demolizione auto **gratuita** per il privato: il cliente compila un flusso a mini-passi, carica foto e documenti, NoiDemoliamo approva, assegna un demolitore che ritira a casa, e il cliente riceve i certificati di rottamazione e radiazione PRA nella sua area personale. Il successo è una pratica chiusa in fretta, senza che il cliente debba chiamare o capire la burocrazia.

## Positioning

Il cliente non parla con un demolitore qualunque: parla con **NoiDemoliamo**, che fa da tramite, controlla i documenti entro poche ore e gestisce la burocrazia. "Ti chiamiamo noi": il cliente non deve inseguire nessuno. Il mezzo che vale ancora qualcosa può andare in vendita invece che in demolizione (valutazione).

## Operating Context

- Il flusso `/inizia` (demolizione, 14-15 passi) e `/vendi-auto` (valutazione, 10 passi) si fanno quasi sempre **da telefono**, in pochi minuti.
- L'**area personale** (`/dashboard`, `/dashboard/[id]`) è dove il cliente torna nei giorni successivi: carica i documenti mancanti (fronte/retro), vede lo stato della pratica, legge la chat con NoiDemoliamo e col demolitore, scarica i certificati.
- I documenti dipendono da **8 casistiche** (chi è l'intestatario: persona fisica, erede, azienda…) definite in `docs/casistiche/Casistiche_Demolizione.md`: la lista dei documenti è generata automaticamente, il cliente non sceglie nulla.
- Il sito funziona anche come **app installabile** (PWA) e si apre su "Accedi".

## Capabilities and Constraints

- Tutto in **italiano**, tono semplice, niente gergo tecnico o burocratico (mai "tab", mai "upload"). Niente tempi promessi al cliente.
- **Mobile-first**: ogni schermata nasce per il telefono e poi si adatta al PC. Il PC non deve mai costringere a rifare la grafica del telefono.
- **I due flussi sono identici** per i passi che condividono (stesso componente, stessi testi). Le differenze sono solo quelle decise da Davide.
- Supabase (Postgres + Storage con RLS), Next.js 16 app router, React 19, Tailwind 4, deploy su Vercel.
- Immagini e illustrazioni **le genera Davide** (Nano Banana): la skill non deve proporre asset da produrre.

## Brand Commitments

- Il marchio è **la scritta "NoiDemoliamo"** in Outfit (Noi 500 + Demoliamo 800) con la **fogliolina verde** al posto del puntino della i. Nessun altro simbolo o logo. Componente unico `app/components/Marchio.tsx`.
- Palette e componenti sono **fissi** (vedi DESIGN.md e ARCHITETTURA parte 6). Non si introducono colori, font o famiglie di card nuove.
- Niente emoji nell'interfaccia; niente trattini lunghi "—" nei testi.

## Evidence on Hand

- Il prodotto è vero e funzionante su `noi-demoliamo.vercel.app`; il dominio `noidemoliamo.it` è comprato.
- Non esistono testimonianze, numeri o recensioni da mostrare: non inventarle.
- I mockup approvati stanno in `docs/mockup/` (con LEGGIMI); quelli in lavorazione in `public/mockup-*.html`.

## Product Principles

1. **Velocità percepita**: il cliente deve sempre sapere a che punto è e cosa deve fare adesso, senza chiedere.
2. **Una cosa per schermata**: un solo invito, un solo box di stato, un'azione principale.
3. **Il telefono comanda**: l'esperienza di riferimento è quella mobile; il PC la rispetta e la allarga, non la reinventa.
4. **Rassicurare, non impressionare**: tono calmo, nessuna promessa di tempi, spiegazione di ogni dato chiesto.
5. **Decide Davide**: ogni cambio visivo passa da un mockup A/B/C scelto da lui. Le proposte della skill sono materiale per i mockup, mai modifiche dirette.
