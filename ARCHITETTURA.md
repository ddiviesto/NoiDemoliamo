# NoiDemoliamo — Architettura completa

> Documento di riferimento del progetto. Aggiornato al **22 maggio 2026**.
> Questo è l'unico file da leggere per capire dove siamo, dove andiamo, e come si lavora.

---

# 📍 PARTE 1 — IDENTITÀ DEL PROGETTO

## 1.1 Cosa è NoiDemoliamo

Piattaforma italiana di **demolizione auto gratuita** per il privato.
Il cliente:
1. Va su `noi-demoliamo.vercel.app`
2. Compila un flusso di 10 step (`/inizia`)
3. Carica foto e documenti
4. Riceve assegnato un demolitore
5. Aspetta il ritiro a casa
6. Riceve i certificati di rottamazione e radiazione PRA

**Tutto gratis per il cliente.** NoiDemoliamo guadagna dai demolitori e dai commercianti.

## 1.2 Modello di business (4 modi per guadagnare)

1. **Fee dai demolitori** per ogni pratica assegnata (modello standard, base del fatturato)
2. **Aste tra demolitori** per auto interessanti (chi paga di più la rottamazione vince)
3. **Vendita ai commercianti** per auto ancora buone (passaggio di proprietà invece di demolizione)
4. **Acquisto diretto da NoiDemoliamo**: admin compra l'auto direttamente per rivenderla privatamente

## 1.3 Principio cardine: VELOCITÀ

Tutto il sistema deve puntare alla **rapidità di risposta** verso il cliente.
Se ci mettiamo troppo a rispondere, perdiamo la pratica.

Tempi obiettivo:
- **Approvazione documenti**: entro 3 ore dall'invio del cliente
- **Decisione del destino**: poche ore
- **Conferma demolitore (dopo assegnazione)**: 8 ore lavorative per proporre data ritiro
- **Certificato rottamazione**: 24 ore dal ritiro
- **Radiazione PRA**: 15 giorni lavorativi dal ritiro
- **Trattativa commercianti**: rapida, non lasciare il cliente in attesa

## 1.4 Utenti della piattaforma

| Utente | Cosa fa | Come accede |
|---|---|---|
| **Cliente privato** | Richiede demolizione/vendita auto, carica documenti, conferma data ritiro, chatta con NoiDemoliamo e con demolitore | Auto-registrazione fine flusso `/inizia` o `/vendi-auto` |
| **Demolitore** | Riceve assegnazioni, fissa ritiro, carica certificati rottamazione e PRA, chatta con cliente | Invito email da admin → imposta password |
| **Commerciante auto** | Vede aste auto disponibili, fa offerte, chatta con cliente per ritiro, scarica documenti operativi | Invito email da admin → imposta password |
| **Admin (Davide)** | Approva pratiche, gestisce destino, gestisce aste, recluta operatori, chatta con cliente | Login con email autorizzata `ddiviesto@gmail.com` |
| **Collaboratori** (officine, concessionarie, assicurazioni) | Inseriscono pratiche per conto dei loro clienti | Invito email da admin (futuro) |
| **Enti pubblici** (polizia locale, comuni) | Inseriscono veicoli abbandonati | Invito email da admin (futuro) |

⚠️ **Nota**: Davide non esclude che in futuro ce ne saranno altri (es. periti, gestori flotte aziendali). Architettura flessibile.

---

# 🛠️ PARTE 2 — STACK E AMBIENTE TECNICO

## 2.1 Stack

- **Frontend**: Next.js 16.2.6 (Turbopack) + React + TypeScript
- **Styling**: Tailwind CSS (no font custom, default sans)
- **Backend**: Supabase (database PostgreSQL + Auth + Storage)
- **Hosting**: Vercel (produzione)
- **Repository**: GitHub `ddiviesto/NoidemoliaMo`
- **Live**: https://noi-demoliamo.vercel.app

## 2.2 Cartella locale e ambiente sviluppo

**Cartella progetto**: `C:\Users\Davide Di Viesto\Desktop\OneDrive\Noi_Demoliamo\Codex_Noi_Demoliamo\NoiDemoliamo`

**Strumenti che Davide usa**:
- **VS Code** per editing (Ctrl+A → Ctrl+V → Ctrl+S)
- **PowerShell** come terminale Windows
- **GitHub Desktop** per commit/push (NON terminale git)
- **Supabase SQL Editor** per query e modifiche DB (apre tab nuova "+")
- **Browser Chrome** per testing

**Comandi essenziali**:
```powershell
# Avviare il server di sviluppo
npm run dev

# Creare nuovo file
New-Item -Path "app\percorso\file.tsx" -ItemType File

# Creare nuova cartella
mkdir "app\nuova-cartella"

# Verificare contenuto cartella
dir app\dashboard
```

## 2.3 Variabili d'ambiente

### File `.env.local` (locale, già configurato)
```
NEXT_PUBLIC_SUPABASE_URL=https://egsufeczoroxqnagzqfq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_KEY=...   (referrer-limited, per browser)
GOOGLE_MAPS_SERVER_KEY=...        (server-side, per Distance Matrix + Geocoding)
SUPABASE_SERVICE_ROLE_KEY=...
```

### Su Vercel (produzione)
⚠️ **PENDING**: `GOOGLE_MAPS_SERVER_KEY` ancora da aggiungere su Vercel produzione

## 2.4 Supabase

**URL**: https://egsufeczoroxqnagzqfq.supabase.co
**Admin email hardcoded**: `ddiviesto@gmail.com`

### Buckets Storage attivi

| Bucket | Visibilità | Contenuto |
|---|---|---|
| `geojson-comuni` | Pubblico | 20 file GeoJSON regioni italiane (per mappa copertura demolitori) |
| `foto-pratiche` | Pubblico | Foto veicoli caricate dai clienti |
| `documenti-pratiche` | Privato | Libretto, certificato proprietà, carta identità, ecc. |

---

# 🗄️ PARTE 3 — DATABASE COMPLETO

## 3.1 Tabelle esistenti nel DB Supabase

Tutte queste tabelle sono già presenti e funzionanti:

`collaboratori`, `commercianti`, `demolitori`, `demolitori_comuni`, `documenti`, `documenti_approvazione`, `fatture`, `foto_pratiche`, `impostazioni`, `interessi_commercianti`, `messaggi`, `messaggi_chat`, `notifiche`, `pratiche`, `solleciti`, `utenti`, `veicoli_vendita`, `veicoli_vendita_foto`

## 3.2 Tabella `pratiche` — 43 colonne

Tabella centrale del progetto. Contiene tutte le pratiche di demolizione.

**Colonne principali**:
- **Identificativi**: `id` (uuid), `user_id` (uuid), `creato_il` (timestamp)
- **Veicolo**: `targa`, `tipo_mezzo` (autovettura/moto/altro), `marca`, `modello`, `anno`, `km`, `incidentato` (bool), `marciante` (bool), `va_in_moto` (bool), `parti_mancanti` (bool), `note_veicolo`
- **Indirizzo**: `indirizzo_ritiro`, `comune_ritiro`, `provincia_ritiro`
- **Cliente**: `codice_fiscale`, `nome_richiedente`, `telefono`, `ruolo_richiedente` (proprietario/delegato/deceduto)
- **Documenti dichiarati**: `libretto` (si/denuncia/digitale), `certificato_proprieta` (cartaceo/digitale/smarrito), `eredita` (accetta/rinuncia/null)
- **Workflow**: `demolitore_id`, `data_ritiro_prevista`, `data_certificato_rottamazione`, `data_certificato_pra`, `stato`
- **Scadenze**: `urgente`, `scadenza_proposta_ritiro`, `scadenza_cert_rottamazione`, `scadenza_cert_pra`, `assegnazione_manuale`

## 3.3 Tabella `documenti`

Contiene i documenti **ufficiali** caricati per ogni pratica (NON le foto del veicolo).

```
id            uuid          PK
pratica_id    uuid          FK → pratiche.id
tipo          text          es. 'carta_identita', 'tessera_sanitaria', 'libretto', 'certificato_proprieta', 'delega', ecc.
url           text          link pubblico al file su Storage
nome_file     text          nome originale del file
verificato    boolean       default false (legacy, ora sostituito da documenti_approvazione)
caricato_il   timestamp
```

⚠️ **Importante**: dal 22/05/2026 questa tabella supporta **più righe dello stesso `tipo`** per la stessa pratica (es. 2 foto per "libretto" = fronte + retro). Il codice del client gestisce questo nascondendo i bottoni di upload se sono già stati caricati N file.

## 3.4 Tabella `foto_pratiche`

Foto **del veicolo** (esterno, interno, motore, ecc.). Diversa da `documenti`.

```
id             uuid          PK
pratica_id     uuid          FK → pratiche.id
url            text          link pubblico al file su Storage (bucket foto-pratiche)
caricato_il    timestamp
```

## 3.5 Tabella `documenti_approvazione`

Tracking granulare dell'approvazione di ogni documento/foto da parte dell'admin.

```
id                uuid          PK
pratica_id        uuid          FK → pratiche.id
tipo_documento    text          per documenti = tipo (es. 'libretto'). Per foto veicolo = 'foto:<id_foto>'
stato             text          'approvato' | 'rifiutato' | 'in_attesa'
nota_admin        text          motivo del rifiuto (libero), nullable
creato_il         timestamp
aggiornato_il     timestamp
```

RLS: admin full access + cliente solo lettura.

## 3.6 Tabella `messaggi_chat`

Chat persistente tra cliente, admin, demolitore, commerciante.

```
id              uuid          PK
pratica_id      uuid          FK → pratiche.id
mittente_id     uuid          chi ha scritto (user_id)
mittente_tipo   text          'cliente' | 'admin' | 'demolitore' | 'commerciante'
testo           text
letto           boolean       default false
creato_il       timestamp
```

RLS: admin + cliente possono leggere/scrivere. Demolitore e commerciante in futuro.

⚠️ **Real-time non ancora implementato** — i messaggi appaiono solo ricaricando. Miglioria futura.

## 3.7 Tabella `impostazioni`

Chiave-valore per configurazioni globali.

Esempio attuale: `max_pratiche_aperte_demolitore=15`

## 3.8 Altre tabelle rilevanti

- `demolitori_comuni`: copertura geografica demolitori (relazione N:N tra demolitore e comune ISTAT)
- `utenti`: profilo utente (collegato a Supabase Auth via id)
- `veicoli_vendita`: pratiche del flusso D (vendita) — separate da `pratiche`
- `veicoli_vendita_foto`: foto delle pratiche di vendita

## 3.9 Tabelle ANCORA DA CREARE

- `aste` (id, riferimento_id, riferimento_tipo, tipo, prezzo_base, somma_per_cliente, date, stato, vincitore_id)
- `offerte_asta` (id, asta_id, offerente_id, importo, timestamp)
- `messaggi_preimpostati` (id, categoria, titolo, testo)
- `documenti_operativi_commercianti` (id, titolo, descrizione, url_file, attivo)
- `notifiche_app` (id, utente_id, tipo, titolo, messaggio, letta, link, timestamp)
- `notifiche_sms_inviate` (id, utente_id, numero, testo, stato, timestamp)

---

# 🔄 PARTE 4 — I 4 FLUSSI DELLA PRATICA

## 4.1 Flusso A — Demolizione standard ✅ FUNZIONANTE

```
Cliente compila /inizia (10 step) → crea account → carica documenti dalla dashboard
   ↓
Admin riceve pratica in lista "in_attesa_approvazione"
   ↓
Admin entra nella pagina dettaglio pratica e vede tutto
   ↓
APPROVAZIONE DOCUMENTI (granulare, uno per uno):
  - Per ogni documento: tasto verde ✓ o tasto rosso ✗ (con nota libera)
  - Stato "documenti_parzialmente_approvati" se qualcosa è rifiutato
   ↓
Quando TUTTI documenti ok → stato "da_assegnare", Step 2 sbloccato
   ↓
Admin sceglie: DEMOLIZIONE STANDARD
   ↓
ALGORITMO ASSEGNAZIONE AUTOMATICA (lib/assegnazione.ts):
  1. Filtra demolitori che coprono il comune del cliente
  2. Esclude chi è sopra "max_pratiche_aperte_demolitore" (15)
  3. Calcola distanza via Google Distance Matrix API
  4. Ordina per: velocità → distanza → carico
  5. Assegna al primo della lista
   ↓
Demolitore ha 8 ORE per proporre data/ora ritiro
   ↓
Cliente conferma/rifiuta (via chat in-app)
   ↓
Giorno del ritiro → demolitore clicca "✅ Veicolo ritirato"
   ↓
Demolitore ha 24 ORE per certificato rottamazione
   ↓
Demolitore ha 15 GIORNI per certificato radiazione PRA
   ↓
PRATICA COMPLETATA
```

**Caso edge**: nessun demolitore valido → stato `in_assegnazione_manuale`, admin lavora a mano.

## 4.2 Flusso B — Asta tra demolitori (DA COSTRUIRE)

Per auto interessanti dove vogliamo monetizzare di più.

```
Admin sceglie destino: ASTA DEMOLITORI
   ↓
Admin imposta: prezzo base, durata asta (rapida), demolitori invitati
   ↓
Demolitori vedono in dashboard "Aste aperte": foto, città, marca, anno, km, condizioni
(NO dati cliente, NO indirizzo completo)
   ↓
Demolitori fanno offerte ≥ prezzo corrente
   ↓
Scadenza → admin sceglie vincitore (può preferire chi offre meno per altri motivi)
   ↓
Vincitore → pratica assegnata a lui, parte flusso A
Perdenti → notifica "asta chiusa"
Nessuno offre → admin rilancia o passa a flusso standard
```

## 4.3 Flusso C — Vendita ai commercianti (DA COSTRUIRE)

Per auto ancora buone, da rivendere invece di demolire.

**Strategia operativa importante**: admin **prima** testa il mercato con i commercianti, **poi** se vede interesse contatta il cliente. Così non si chiama il cliente per nulla.

```
ORIGINE 1: pratica nata da /inizia ma admin vede che vale
ORIGINE 2: pratica nata da /vendi-auto (flusso D)
   ↓
STEP 1 — Admin clicca "Proponi ai Commercianti"
   ↓
Form admin: prezzo richiesto, somma per cliente (opzionale), durata trattativa
   ↓
STEP 2 — Pratica visibile a TUTTI i commercianti registrati (zona + fuori zona)
Vedono: foto + città + marca/modello/anno/km/condizioni
NO libretto, NO cert. proprietà, NO dati cliente
   ↓
STEP 3 — Commercianti fanno offerte (accettano prezzo o controproposta)
   ↓
STEP 4 — Se admin vede interesse → CONTATTA IL CLIENTE
"Abbiamo visto la sua auto, pensiamo possa valere la pena ripararla invece di demolirla.
 Possiamo prendercene carico noi: passaggio gratis. Lei non spende nulla.
 [Eventuale +100€ se cliente 'mangia la foglia'] È d'accordo?"
   ↓
STEP 5A — Cliente ACCETTA:
  Admin sceglie commerciante vincitore
  Solo a lui vengono dati: dati completi cliente + indirizzo
  Commerciante e cliente si organizzano via chat in-app
  Commerciante paga DIRETTAMENTE il cliente al ritiro (no NoiDemoliamo intermediario)
  Commerciante paga NoiDemoliamo il prezzo concordato
  PRATICA COMPLETATA

STEP 5B — Cliente RIFIUTA:
  Pratica torna a flusso A
  Admin può anche fare asta demolitori (flusso B)

STEP 5C — Nessun commerciante interessato:
  Admin decide: comprare per NoiDemoliamo / demolizione / asta demolitori
```

**Garanzia anti-furbi**: se commerciante bypassa NoiDemoliamo → disattivato dalla piattaforma → perde accesso a tutte le auto future.

## 4.4 Flusso D — Vendita auto su richiesta cliente (DA COSTRUIRE)

Cliente non vuole rottamare, vuole vendere e ricevere soldi.

```
Cliente clicca "Vendi auto" su home → /vendi-auto (separato da /inizia)
   ↓
Cliente inserisce dati + foto + prezzo desiderato OPPURE "valutate voi"
   ↓
Algoritmo NoiDemoliamo calcola valutazione automatica
   ↓
Admin vede richiesta + valutazione algoritmo + prezzo cliente
   ↓
Admin decide 3 casi:

┌─ AUTO IMPRESENTABILE: admin propone demolizione gratuita
│    Cliente accetta → MIGRA a flusso A
│    Cliente rifiuta → pratica annullata
│
├─ AUTO BUONA: asta tra COMMERCIANTI (flusso C)
│    Se nessuno offre abbastanza → admin propone demolizione
│
└─ AUTO MOLTO BUONA: admin compra direttamente per NoiDemoliamo
```

**DB**: pratiche di vendita nella tabella `veicoli_vendita`, non in `pratiche`.

## 4.5 Migrazione tra flussi

Una pratica può migrare se cliente e admin sono d'accordo:
- **Vendita → demolizione**: pratica copiata in `pratiche` con stato `da_assegnare`
- **Demolizione → vendita commercianti**: passa a flusso C
- **Demolizione → acquisto NoiDemoliamo**: admin compra (sempre con OK cliente)

## 4.6 Stati pratica (in `pratiche.stato`)

```
# Pratiche di demolizione
in_attesa_documenti
in_attesa_approvazione_admin
documenti_parzialmente_approvati
da_assegnare

# Ramo demolizione standard
in_attesa_assegnazione
in_assegnazione_manuale
assegnata
in_attesa_conferma_cliente
ritiro_confermato
ritirata
in_attesa_cert_rottamazione
in_attesa_cert_radiazione_pra
completata

# Ramo asta demolitori
in_asta_demolitori
asta_demolitori_chiusa

# Ramo asta commercianti
in_proposta_commercianti
in_attesa_consenso_cliente
trattativa_commercianti_accettata
in_passaggio_proprieta
passaggio_completato

# Ramo acquisto diretto
acquistata_da_noidemoliamo

# Comuni
annullata
```

---

# 📂 PARTE 5 — STRUTTURA PROGETTO E PAGINE

## 5.1 Albero principale

```
NoiDemoliamo/
├── app/
│   ├── page.tsx                              # Home pubblica
│   ├── layout.tsx                            # Layout root
│   ├── globals.css                           # Tailwind globale
│   ├── login/page.tsx                        # Login multi-ruolo
│   ├── inizia/                               # Flusso cliente 10 step
│   │   ├── page.tsx
│   │   └── steps/                            # I 10 step
│   ├── dashboard/                            # AREA CLIENTE
│   │   ├── page.tsx                          # Lista pratiche cliente
│   │   └── [id]/
│   │       ├── page.tsx                      # Dettaglio pratica (3 tab)
│   │       ├── TabDocumenti.tsx              # Tab 1: doc + foto
│   │       ├── TabStato.tsx                  # Tab 2: timeline
│   │       ├── TabChat.tsx                   # Tab 3: chat NoiDemoliamo + demolitore
│   │       └── UploadDocumentoModal.tsx      # (NON USATO PIÙ — sostituito da bottoni inline)
│   ├── admin/                                # AREA ADMIN
│   │   ├── page.tsx                          # Dashboard admin con stats
│   │   ├── copertura/page.tsx                # Mappa strategica Italia
│   │   ├── demolitori/
│   │   │   ├── page.tsx                      # Lista demolitori
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx                  # Dettaglio + form
│   │   │   │   └── MappaComuni.tsx           # Mappa copertura (regioni/province/comuni)
│   │   └── pratiche/
│   │       └── [id]/
│   │           ├── page.tsx                  # Dettaglio pratica admin
│   │           └── DocumentiApprovazione.tsx # Componente approvazione granulare
│   └── api/
│       └── assegna-pratica/route.ts          # Endpoint algoritmo assegnazione
├── lib/
│   ├── supabase.ts                           # Client Supabase (NEXT_PUBLIC_)
│   └── assegnazione.ts                       # Logica algoritmo assegnazione
├── public/
│   ├── NoiDemoliamoLogo.png
│   ├── province.geojson
│   └── regioni.geojson
├── .env.local
├── ARCHITETTURA.md                           # QUESTO FILE
└── package.json
```

## 5.2 Flusso `/inizia` dettagliato (10 step + auto-registrazione)

Il flusso ha **ramificazioni dinamiche**: alcune risposte determinano quali documenti saranno richiesti dopo nella dashboard cliente.

```
Step 1 — Tipo veicolo
  → autovettura / moto / altro

Step 2 — Ruolo del richiedente
  → proprietario        (nessuna documentazione extra)
  → delegato            (servirà DELEGA firmata)
  → deceduto (erede)    (Step successivo: accettazione o rinuncia eredità)

Step 3 — Targa

Step 4 — Marca / modello / anno / km

Step 5 — Condizioni veicolo
  → marciante (sì/no)
  → incidentato (sì/no)
  → parti mancanti (sì/no)

Step 6 — Documenti che possiede
  → libretto:               si / denuncia (smarrito) / digitale
                            ↳ se 'si'       → richiesto LIBRETTO (fronte/retro)
                            ↳ se 'denuncia' → richiesta DENUNCIA SMARRIMENTO LIBRETTO
                            ↳ se 'digitale' → niente da caricare (è sul portale Motorizzazione)
  → certificato_proprieta:  cartaceo / digitale / smarrito
                            ↳ se 'cartaceo' → richiesto CERTIFICATO PROPRIETÀ
                            ↳ se 'digitale' → niente da caricare
                            ↳ se 'smarrito' → richiesta DENUNCIA SMARRIMENTO CERTIFICATO
  → eredita (solo se ruolo='deceduto'):
                            ↳ se 'accetta'  → richiesto ATTO ACCETTAZIONE EREDITÀ
                            ↳ se 'rinuncia' → richiesto ATTO RINUNCIA EREDITÀ

Step 7 — Foto veicolo (minimo 3)
  Upload su bucket 'foto-pratiche' → riga in 'foto_pratiche'

Step 8 — Indirizzo ritiro
  ⚠️ Manca Google Maps autocomplete (DA AGGIUNGERE per algoritmo assegnazione)

Step 9 — Dati personali
  Nome, codice fiscale, telefono, email

Step 10 — Password (auto-registrazione)
  Crea utente in Supabase Auth + riga in tabella 'utenti'
  ⚠️ Errore RLS minore qui (NON blocca la pratica)
```

**Documenti SEMPRE richiesti** (a prescindere dalle risposte):
- Carta d'identità (fronte e retro)
- Tessera sanitaria (fronte e retro)

**Documenti CONDIZIONALI** (in base alle risposte degli step):
- Libretto (fronte e retro) → se `libretto=si`
- Denuncia smarrimento libretto → se `libretto=denuncia`
- Certificato proprietà → se `certificato_proprieta=cartaceo`
- Denuncia smarrimento certificato → se `certificato_proprieta=smarrito`
- Delega firmata → se `ruolo_richiedente=delegato`
- Atto accettazione eredità → se `ruolo_richiedente=deceduto` AND `eredita=accetta`
- Atto rinuncia eredità → se `ruolo_richiedente=deceduto` AND `eredita=rinuncia`

Questa logica è implementata in `documentiRichiesti(p)` in `TabDocumenti.tsx`.

## 5.3 Pagine FATTE ✅

### Home `/` (app/page.tsx)
- Logo NoiDemoliamo
- Titolo `font-semibold tracking-tight`
- Bottone primario: "Richiedi la demolizione gratuita ora"
- Bottone secondario: "Accedi al mio account"
- Pills benefit: ✓ 100% gratuito, ✓ Ritiro a domicilio, ✓ Certificato PRA
- Sfondo sfumato leggero

### Login `/login` (multi-ruolo)
- Email + password
- Reindirizza in base al ruolo: admin → `/admin`, cliente → `/dashboard`
- Demolitore/commerciante: ANCORA DA AGGIUNGERE

### Area cliente — DASHBOARD (rifatta 22/05/2026) ⭐

**`/dashboard`** — Lista pratiche cliente:
- Topbar blu navy con logo, "Ciao [Nome]", "Esci"
- Header: "Le tue pratiche" + bottone "+ Nuova"
- Card pratiche con: targa grande, tipo+marca+modello, badge stato colorato con emoji, indirizzo con 📍, data
- Empty state amichevole "Nessuna pratica" + CTA

**`/dashboard/[id]`** — Dettaglio pratica cliente:
- Topbar sticky con ← indietro + targa + marca/modello + badge stato sobrio
- **Banner stato dinamico** (gradient blu/verde/rosso) che cambia in base a `pratica.stato`:
  - `in_attesa_documenti` → 📋 "Carica i tuoi documenti / Procedi al caricamento dei documenti per l'assegnazione al demolitore"
  - `in_attesa_approvazione_admin` → ⏳ "Stiamo verificando i tuoi documenti / Ti avviseremo entro 3 ore"
  - `documenti_parzialmente_approvati` → ⚠️ rosso
  - `da_assegnare` → ✅ verde
  - `assegnata` → 🔧 "Demolitore assegnato"
  - `ritiro_confermato` → 📅 "Ritiro confermato"
  - `ritirata` → 🚚 "Veicolo ritirato"
  - `in_attesa_cert_radiazione_pra` → 📄
  - `completata` → 🎉
- **3 Tab** grandi touch-friendly (60px) con icone SVG professionali:
  - **Documenti** (icona file) — TabDocumenti.tsx
  - **Stato** (icona timeline a S) — TabStato.tsx
  - **Chat** (icona busta) — TabChat.tsx
- **Pallino rosso sui tab** SOLO quando c'è attenzione richiesta (documenti rifiutati, messaggi non letti)

**Tab Documenti** (TabDocumenti.tsx):
- Barra di progresso "Documenti caricati X/Y"
- Documenti richiesti DINAMICI in base a risposte cliente in /inizia (vedi 5.2)
- Per ogni documento, 4 stati visivi:
  - Non caricato → grigio + 2 bottoni "Scatta foto" / "Carica file"
  - In verifica → giallo + "⏳ In verifica" + anteprima file
  - Approvato → verde + "✓ Approvato" + bottone Vedi
  - Rifiutato → rosso + "✗ Da rifare" + nota admin + 2 bottoni ricarica rossi
- **File-pill** per anteprima file caricati (miniatura + nome + × elimina)
- Sezione **Foto del veicolo** con galleria 3 colonne + 2 bottoni "Scatta foto" / "Carica file" stile pieno blu

**Tab Stato** (TabStato.tsx):
- Timeline verticale 5 step (richiesta → documenti → demolitore → ritiro → completata)
- Step corrente evidenziato con sfondo blu chiaro
- Step completati verdi con ✓, futuri grigi con numero
- Linee colorate tra step
- Box "Dati veicolo" collassabile

**Tab Chat** (TabChat.tsx):
- **Sub-tab SEMPRE visibili**: NoiDemoliamo + Demolitore
- Chat NoiDemoliamo sempre attiva
- Chat Demolitore con 3 stati:
  - **Prima dell'assegnazione**: placeholder "In attesa del demolitore"
  - **Attiva** (stati `assegnata` → `in_attesa_cert_rottamazione`): chat funzionante
  - **Archiviata** (dopo certificato rottamazione): placeholder "Chat archiviata"
- Bolle stile WhatsApp: cliente destra blu, altri sinistra bianco
- Header con avatar colorato + nome + "Risposta media: 2 ore"
- Input rotondo + bottone invia circolare blu
- Marca messaggi come letti automaticamente
- **Chat persistente** su tabella `messaggi_chat`
- Niente bottone telefono (richiesta utente: SOLO chat in-app)

### Area admin

**`/admin`** — Dashboard admin con stats e filtri pratiche, bottone "Mappa copertura"

**`/admin/copertura`** — Mappa strategica Italia: copertura totale (blu) / parziale (rosso con macchie blu) / scoperta (rosso pieno)

**`/admin/demolitori`** — Lista demolitori + form aggiunta

**`/admin/demolitori/[id]`** — Dettaglio demolitore:
- Form dati
- **MappaComuni.tsx**: 3 layer (regioni/province/comuni), selezione a cascata, esclusioni puntuali, GeoJSON da bucket

**`/admin/pratiche/[id]`** — Dettaglio pratica admin (COMPLETO):
- Topbar blu scuro: ← Indietro + targa + marca/modello + badge stato
- **Step 1 — Documenti e foto** con approvazione granulare (✓ verde / ✗ rosso + nota libera)
- Step 2 — Destino pratica (sbloccato dopo approvazione completa):
  - 🔧 Demolizione standard (✅ collegato all'algoritmo)
  - 🔥 Asta demolitori (disabled "in arrivo")
  - 💼 Proponi ai commercianti (disabled)
  - 🛒 Compra per NoiDemoliamo (disabled)
- Box dati cliente, dati veicolo, indirizzo ritiro, note
- ⚠️ ANCORA DA AGGIUNGERE: chat funzionante in fondo (sostituire chat fake con `messaggi_chat`)

## 5.4 Backend / API

**`/api/assegna-pratica/route.ts`** (endpoint POST):
- Auth admin verificata
- Chiama `lib/assegnazione.ts`
- Filtra demolitori per copertura comune
- Esclude saturi
- Calcola distanza via Google Distance Matrix
- Ordina e assegna

⚠️ **Da testare**: serve creare almeno un demolitore di test con zona di copertura prima.

---

# 🎨 PARTE 6 — DESIGN SYSTEM

> Approvato il 22/05/2026 sulla dashboard cliente. Applicare a TUTTE le pagine future.

## 6.1 Colori principali

- **Blu navy primario** (topbar, sub-header, tab attivi): `#0d2144`
- **Blu primario** (bottoni CTA, link): `bg-blue-600` con hover `bg-blue-700`
- **Sfondo pagina**: `bg-[#f0f4f8]` (azzurro neutrissimo)
- **Bianco card**: `bg-white` con `border border-gray-200`

## 6.2 Colori secondari per stati

- **Verde** (approvato/successo): `bg-green-50`, `border-green-300`, `text-green-700`
- **Giallo** (in attesa/verifica): `bg-yellow-50`, `border-yellow-200`, `text-yellow-700`
- **Rosso** (errore/da rifare): `bg-red-50`, `border-red-300`, `text-red-700`
- **Grigio** (non caricato/neutro): `bg-gray-50`, `border-gray-200`, `text-gray-500`

## 6.3 Tipografia

- **Font**: default di sistema (Tailwind sans), niente font custom
- **Titoli pagina**: `text-xl font-bold text-gray-900`
- **Titoli card**: `text-sm font-semibold text-gray-800`
- **Body**: `text-sm text-gray-700`
- **Caption/hint**: `text-xs text-gray-500`
- **Micro testo (badge, time)**: `text-[10px]` o `text-[11px]`

## 6.4 Componenti standard

### Topbar (sticky)
- Sfondo blu navy `bg-[#0d2144]`
- Padding `px-4 py-3`
- Logo + nome a sinistra, contesto al centro, badge stato sobrio a destra
- Badge stato: stile "pill" sobrio con bg trasparente + bordo:
  `bg-yellow-500/15 border border-yellow-400/40 text-yellow-200`

### Card
- `bg-white border border-gray-200 rounded-2xl p-4`
- Spaziatura interna `gap-3` o `gap-2`
- Solo `shadow-sm` puntuale, mai `shadow-lg`

### Banner stato dinamico
- Gradient diagonale `bg-gradient-to-br from-COLORE-600 to-COLORE-800`
- Emoji 3xl a sinistra + titolo bold + sottotitolo opacità 90%
- `rounded-2xl`, padding `p-4`

### Bottoni
- **CTA primario**: `bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-xs`
- **CTA secondario**: `bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 py-2.5 rounded-lg`
- **CTA pericolo**: `bg-red-600 hover:bg-red-700 text-white`
- **CTA disabled**: `disabled:opacity-50 disabled:cursor-not-allowed`
- Layout 2 bottoni affiancati: `grid grid-cols-2 gap-2`

### Tab bar
- Container: `bg-white border border-gray-200 rounded-2xl p-1 flex gap-1`
- Tab attivo: `bg-[#0d2144] text-white`
- Tab inattivo: `bg-transparent text-gray-500 hover:bg-gray-50`
- Tab item: `flex-1 rounded-xl py-3 px-2 flex flex-col items-center gap-1 min-h-[60px]`
- Icona SVG 22x22 + label `text-xs font-medium`
- Pallino badge: rosso con numero SOLO per cose che richiedono attenzione

### Icone
- **SVG inline** preferito alle emoji (più professionale)
- Emoji ok solo in: banner stato dinamico, empty state, messaggi conversazionali
- SVG std: `width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"`
- Icone documenti colorate: blu `#2563eb`, ciano `#0891b2`, verde `#16a34a`, grigio `#6b7280`

### File-pill (anteprima file caricato)
- `bg-white border border-gray-300 rounded-lg`
- Miniatura 8x8 dell'immagine OR badge "PDF"
- Bottone × rosso piccolo `absolute -top-1.5 -right-1.5`

### Form input
- `border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500`
- Input chat: `rounded-full` invece di `rounded-xl`

## 6.5 Spaziatura

- Container pagina max: `max-w-2xl mx-auto px-3 py-3` (mobile-first)
- Gap verticale tra card: `gap-3` (12px)
- Gap interno card: `gap-2` (8px)

## 6.6 Regole d'oro

1. **Mobile-first**: ogni elemento touch-friendly (min 44px altezza)
2. **No emoji nell'interfaccia**: solo SVG colorati per icone funzionali
3. **Niente bordi tratteggiati**: bordi pieni o bg colorati
4. **Shadow leggere**: solo `shadow-sm` o `shadow-md` puntuali
5. **Bottoni grandi e chiari**: testo bold, padding generoso
6. **Coerenza colori**: blu = azione, verde = ok, rosso = errore, giallo = attesa
7. **Stato sempre visibile**: ogni elemento dice in che stato è
8. **Empty state amichevole**: icona grande + frase rassicurante + CTA

---

# 🗣️ PARTE 7 — COMUNICAZIONE CON DAVIDE

> Davide è imprenditore, NON sviluppatore. Lavora con AI per costruire la piattaforma.

## 7.1 Stile di lavoro preferito

- **Istruzioni passo-passo brevissime**: uno step alla volta, "scrivimi fatto"
- **Niente spiegazioni tecniche se non chiede**
- **Risposte molto compatte, no preamboli**
- **Quando deve sostituire file completi**: vuole "ridammi tutto il codice faccio prima"
- **"UI"** non significa nulla per lui → spiegare come "come appare la pagina"
- **Si confonde tra concetti tecnici** → spiegare con calma con analogie
- **Comandi PowerShell** dati come stringhe pronte da copiare (mai `cd` o complicazioni)

## 7.2 Stack interazione

- **Editor**: VS Code → Ctrl+A → Ctrl+V → Ctrl+S
- **Terminale**: PowerShell di VS Code (in basso)
- **Git**: GitHub Desktop, NON da terminale
- **DB**: Supabase SQL Editor (tab nuova con "+")

## 7.3 Sequenza di lavoro tipica della sessione

Questo è il **ritmo standard** quando lavoriamo insieme:

```
1. Davide dice cosa serve (es. "aggiungi un campo X")
2. Claude può fare 1-3 domande con ask_user_input_v0 se ci sono scelte
3. Claude scrive il file completo con create_file
4. Claude usa present_files per dare il file a Davide
5. Davide apre il file in VS Code
6. Davide fa: Ctrl+A → cancella tutto → Ctrl+V → Ctrl+S
7. Davide ricarica la pagina nel browser
8. Davide manda screenshot (quando può) o descrive a parole cosa vede
9. Claude verifica, eventualmente corregge
10. Quando funziona, si passa al prossimo task
```

## 7.4 Convenzioni di file

- **File completi sostituibili** → preferito ai patch (Davide fa Ctrl+A → Ctrl+V → Ctrl+S)
- **Patch riga-per-riga** → solo quando il file è troppo lungo per essere rigenerato
- **Spiegazioni in italiano**, codice in inglese tecnico/italiano misto
- Quando si bloccano cose strane (loop infinito, errori React): consigliare di riavviare con `npm run dev`

## 7.5 Segnali importanti nell'Explorer di VS Code

- **"M" verde** accanto al nome file = file modificato ma non ancora salvato. Davide deve fare Ctrl+S.
- **"U" verde** = file nuovo (Untracked) non ancora in git
- **"M" arancione** = modificato e salvato, ma da committare
- **Numero rosso accanto a "PROBLEMS"** in basso = errori TypeScript (di solito si sistemano riempiendo i file vuoti)

## 7.6 Note operative

- **Davide non ricorda sempre dove sono i file** → indicare il percorso completo (es. `app/dashboard/[id]/page.tsx`)
- **Quando si crea un file nuovo**, indicare ESATTAMENTE il comando PowerShell
- **Quando ci sono troppi screenshot in una chat** → suggerire nuova chat
- **Limiti immagini chat**: Anthropic mette un limite di immagini per conversazione, quindi screenshot pesa
- **Errori RLS minori**: gli interessano poco se non bloccano

---

# 📋 PARTE 8 — STATO ATTUALE (22/05/2026)

## 8.1 ✅ FATTO

### Frontend pubblico
- ✅ Home pubblica con design pulito
- ✅ Flusso `/inizia` 10 step + auto-registrazione cliente
- ✅ Upload foto VERO su Supabase Storage (bucket `foto-pratiche`)
- ✅ Login multi-ruolo base (admin → `/admin`, cliente → `/dashboard`)

### Area cliente
- ✅ Dashboard `/dashboard` con lista pratiche
- ✅ Dettaglio `/dashboard/[id]` con 3 tab (Documenti, Stato, Chat)
- ✅ Banner stato dinamico
- ✅ Tab Documenti con upload fronte/retro + bottoni inline (Scatta foto / Carica file)
- ✅ Tab Stato con timeline 5 step
- ✅ Tab Chat con sub-tab NoiDemoliamo + Demolitore (sempre visibili)
- ✅ Chat persistente su `messaggi_chat`
- ✅ Pallino rosso solo per attenzione (documenti rifiutati / messaggi non letti)
- ✅ Mobile-first, design coerente con admin

### Area admin
- ✅ Dashboard `/admin` con stats e filtri pratiche
- ✅ Pagina dettaglio pratica `/admin/pratiche/[id]` con approvazione granulare
- ✅ Step 2 destino pratica (4 card, demolizione standard funzionante, altri "in arrivo")
- ✅ Gestione demolitori `/admin/demolitori` (lista + form + dettaglio)
- ✅ Mappa demolitore singolo (MappaComuni.tsx): 3 layer regioni/province/comuni
- ✅ Mappa strategica `/admin/copertura`: copertura totale/parziale/scoperta
- ✅ 20 file GeoJSON regioni italiane su Storage

### Backend / DB
- ✅ Tabelle `documenti_approvazione` e `messaggi_chat` create con RLS
- ✅ Bucket `foto-pratiche` (pubblico) + `documenti-pratiche` (privato) + policy
- ✅ Algoritmo assegnazione automatica (`lib/assegnazione.ts` + endpoint API)
- ✅ Google Maps Server Key creata e limitata (Distance Matrix + Geocoding)
- ✅ Schema `pratiche` esteso con scadenze e flag urgente

## 8.2 ⏳ PENDING — In ordine di priorità

### 🔥 PROSSIMI STEP CRITICI

1. **Sistemare pagina admin dettaglio pratica `/admin/pratiche/[id]`**:
   - Aggiungere box chat funzionante (usare `messaggi_chat`, NON la chat fake)
   - Admin deve vedere **SEMPRE** tutte le chat (anche dopo completamento)
   - Sub-tab admin per vedere: cliente↔NoiDemoliamo, cliente↔demolitore

2. **Testare bottone "Demolizione standard"** che lancia algoritmo assegnazione
   - Creare almeno un demolitore di test con zona di copertura
   - Verificare endpoint `/api/assegna-pratica`

3. **Google Maps autocomplete indirizzi** in `/inizia` step 8
   - IMPORTANTE: senza coordinate precise, l'algoritmo non funziona bene

4. **Migrare GOOGLE_MAPS_SERVER_KEY su Vercel produzione**

### 🔜 PROSSIMI STEP IMPORTANTI

5. **Sistema invito email demolitore + pagina `/imposta-password`**
6. **Login multi-ruolo completo** che riconosce demolitore + commerciante e fa redirect alla dashboard giusta
7. **Dashboard demolitore** `/dashboard-demolitore`:
   - Ritiri da effettuare (priorità)
   - Calendario smart
   - Scadenze attive (8h proposta ritiro, 24h cert. rottamazione, 15gg PRA)
   - Storico
   - Area di copertura
   - Notifiche
8. **Sistema notifiche in-app** (campanella, badge, popup, web push)
9. **Sistema SMS** (Twilio o equivalente)
10. **Sistema messaggi preimpostati** per admin (categoria, titolo, testo)

### 🔮 PROSSIMI FLUSSI DA COSTRUIRE

11. **Flusso B — Asta demolitori** completo:
    - Form admin (prezzo base, durata, invitati)
    - Sezione "Aste aperte" in dashboard demolitore
    - Sistema offerte
    - Scelta vincitore
12. **Flusso C — Proponi ai commercianti** completo:
    - Form admin (prezzo, somma cliente, durata)
    - Visibilità limitata per commercianti (foto + città, no dati cliente)
    - Sistema offerte
    - Conferma cliente DOPO le offerte
    - Sblocco dati cliente al vincitore
13. **Flusso "Compra per NoiDemoliamo"** (admin acquista direttamente)
14. **Flusso D — Vendita auto** `/vendi-auto`:
    - Pagina pubblica
    - Algoritmo valutazione automatica
    - 3 esiti (forzata demolizione / asta commercianti / acquisto NoiDemoliamo)

### 🏪 AREA COMMERCIANTI

15. **Dashboard commerciante** 6 sezioni:
    - Aste aperte
    - Le mie offerte
    - Trattative in corso
    - Storico
    - Documenti operativi (contratto + delega + PDF scaricabili)
    - Profilo
16. **Mappa commercianti** `/admin/copertura-commercianti`

### 🛠️ ALTRI

17. **Sistema fatturazione automatica**
18. **Statistiche e report admin**
19. **Dashboard collaboratori ed enti pubblici** (futuro lontano)

## 8.3 ⚠️ Problemi noti

- **Errore RLS minore** in `/inizia` quando crea utente in `utenti` (NON blocca, pratica creata e foto caricate)
- **Box di `/inizia` un po' troppo in alto** rispetto a home e login (cosmetico)
- **Console "1 Issue"** generica → da indagare quando avremo tempo

---

# 💡 PARTE 9 — DECISIONI BUSINESS CHIAVE

Tutte queste sono decisioni operative prese e CONFERMATE:

1. **Velocità** è il principio cardine sopra tutto
2. **Approvazione documenti**: granulare (uno per uno), non in blocco
3. **Documenti tutti uguali nell'UI**: libretto, certificato, foto auto → tutti hanno ✓ e ✗
4. **Pagamento commerciante → cliente**: diretto al ritiro, no NoiDemoliamo intermediario
5. **Commercianti vedono**: foto + città (no indirizzo completo), niente dati cliente, niente libretto/cert. proprietà
6. **Strategia "Proponi ai commercianti"**: prima testo il mercato con i commercianti, POI contatto il cliente se vedo interesse
7. **Eventuale +100€ al cliente**: quando il cliente "mangia la foglia" e capisce che l'auto vale qualcosa
8. **Slot documenti operativi commercianti**: contratto + delega + altri PDF, scaricabili dalla loro dashboard
9. **Chat in-app, niente telefono**: tutta la comunicazione cliente↔demolitore passa per la chat
10. **Admin vede SEMPRE tutte le chat** (anche dopo completamento). Cliente non vede più demolitore dopo certificato rottamazione.
11. **Chat persistente su DB** (`messaggi_chat`). Real-time da aggiungere come miglioria futura.
12. **Mobile-first**: la maggior parte dei clienti usa cellulare
13. **Upload**: 2 opzioni "Scatta foto" + "Carica file" (camera + galleria/file uniti). NO 3a opzione.
14. **Documenti richiesti DINAMICI**: cambiano in base alle risposte cliente in /inizia
15. **Doc identità/libretto**: fronte + retro come 2 file separati nello stesso "slot" (oppure 1 PDF scansionato unico)

---

# 🚀 PARTE 10 — COME LAVORARE NELLA NUOVA CHAT

> Istruzioni per Claude nella nuova chat dopo aver letto questo file.

1. **Leggi prima TUTTO questo file**, poi conferma a Davide di aver capito
2. **Riprendi esattamente dal punto 8.2 PENDING** (priorità dall'alto)
3. **Rispetta il design system** della parte 6 in TUTTE le pagine nuove
4. **Stile comunicazione** della parte 7 (passo-passo, no preamboli, file completi)
5. **Quando crei nuovi file**, aggiorna mentalmente questo doc (a fine sessione, chiedi a Davide di aggiornare l'architettura)
6. **Non assumere mai cose nuove**: se non sei sicuro su qualcosa, chiedi a Davide
7. **Test sempre prima del commit**: dopo ogni modifica, Davide testa e fa screenshot
8. **GitHub push** Davide lo fa da GitHub Desktop quando vuole salvare uno snapshot

---

# 📞 PARTE 11 — INFO PROGETTO

- **Founder**: Davide Di Viesto
- **Email admin**: ddiviesto@gmail.com
- **GitHub**: ddiviesto/NoidemoliaMo
- **URL live**: https://noi-demoliamo.vercel.app
- **Supabase URL**: https://egsufeczoroxqnagzqfq.supabase.co
- **Cartella locale**: `C:\Users\Davide Di Viesto\Desktop\OneDrive\Noi_Demoliamo\Codex_Noi_Demoliamo\NoiDemoliamo`

---

**Fine documento. Ultimo aggiornamento: 22 maggio 2026.**