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
| **Cliente privato** | Richiede demolizione/vendita auto, carica documenti, conferma data ritiro, chatta con NoiDemoliamo e con demolitore, lascia recensioni a fine pratica | Auto-registrazione fine flusso `/inizia` o `/vendi-auto` |
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

# Vedere struttura completa del progetto (salva in struttura.txt)
tree /F /A | findstr /V "node_modules" > struttura.txt
```

📁 **STRUTTURA COMPLETA DEL PROGETTO**: Davide ha il comando per generare l'albero completo con `tree /F /A`. Se la nuova chat ha bisogno della struttura esatta (con tutti i file), chiederla a Davide che genererà `struttura.txt` e potrà condividerla (es. allegando il file o riassumendone le parti rilevanti).

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

⚠️ **Da verificare nel DB**: l'algoritmo di assegnazione cerca colonne `lat`, `lng`, `data_assegnazione`, `data_ritiro_effettuato` in `pratiche` — verificare che esistano o aggiungerle.

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

⚠️ **Importante**: dal 22/05/2026 questa tabella supporta **più righe dello stesso `tipo`** per la stessa pratica (es. 2 foto per "libretto" = fronte + retro).

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
tipo_documento    text          per documenti = tipo. Per foto veicolo = 'foto:<id_foto>'
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

## 3.8 Tabella `demolitori`

Anagrafica demolitori. Colonne usate dall'algoritmo: `id, ragione_sociale, indirizzo, citta, provincia, lat, lng, stato`.

## 3.9 Tabella `demolitori_comuni`

Copertura geografica demolitori.

```
demolitore_id   uuid          FK → demolitori.id
comune          text          nome (o codice) di regione/provincia/comune
provincia       text          provincia di riferimento
tipo            text          'regione' | 'provincia' | 'provincia_esclusa' | 'comune_incluso' | 'comune_escluso'
```

## 3.10 Altre tabelle rilevanti

- `utenti`: profilo utente (collegato a Supabase Auth via id)
- `veicoli_vendita`: pratiche del flusso D (vendita) — separate da `pratiche`
- `veicoli_vendita_foto`: foto delle pratiche di vendita

## 3.11 Tabelle ANCORA DA CREARE

- 🆕 `recensioni` (id, pratica_id, cliente_id, demolitore_id, tipo, stelle, commento, creata_il)
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
Cliente compila /inizia (10 step) → crea account → carica documenti
   ↓
Admin riceve pratica in "in_attesa_approvazione"
   ↓
APPROVAZIONE DOCUMENTI (granulare, uno per uno)
   ↓
Quando TUTTI documenti ok → stato "da_assegnare", Step 2 sbloccato
   ↓
Admin sceglie: DEMOLIZIONE STANDARD
   ↓
2 MODALITÀ DI ASSEGNAZIONE:
  → AUTOMATICA: algoritmo sceglie il demolitore migliore (vedi 4.7)
  → MANUALE: admin sceglie a mano da mappa demolitori (vedi 4.8)
   ↓
Demolitore ha 8 ORE per proporre data/ora ritiro
   ↓
Cliente conferma/rifiuta (via chat in-app)
   ↓
Giorno del ritiro → demolitore clicca "✅ Veicolo ritirato"
   ↓
🆕 SISTEMA RECENSIONI (vedi 4.9):
   Cliente OBBLIGATO a lasciare 2 recensioni (demolitore + NoiDemoliamo)
   PRIMA di poter ricevere il certificato di rottamazione
   ↓
Demolitore ha 24 ORE per certificato rottamazione
   ↓
Demolitore ha 15 GIORNI per certificato radiazione PRA
   ↓
PRATICA COMPLETATA
```

## 4.2 Flusso B — Asta tra demolitori (DA COSTRUIRE)

Per auto interessanti dove vogliamo monetizzare di più.

```
Admin sceglie destino: ASTA DEMOLITORI
   ↓
Admin imposta: prezzo base, durata asta, demolitori invitati
   ↓
Demolitori vedono in dashboard "Aste aperte": foto, città, marca, anno, km, condizioni
(NO dati cliente, NO indirizzo completo)
   ↓
Demolitori fanno offerte ≥ prezzo corrente
   ↓
Scadenza → admin sceglie vincitore
   ↓
Vincitore → pratica assegnata, parte flusso A
Perdenti → notifica "asta chiusa"
Nessuno offre → admin rilancia o passa a standard
```

## 4.3 Flusso C — Vendita ai commercianti (DA COSTRUIRE)

**Strategia**: admin **prima** testa il mercato con i commercianti, **poi** se vede interesse contatta il cliente.

```
STEP 1 — Admin clicca "Proponi ai Commercianti"
Form admin: prezzo richiesto, somma cliente (opzionale), durata trattativa
   ↓
STEP 2 — Pratica visibile a TUTTI i commercianti (zona + fuori zona)
Vedono: foto + città + marca/modello/anno/km/condizioni
NO libretto, NO cert. proprietà, NO dati cliente
   ↓
STEP 3 — Commercianti fanno offerte
   ↓
STEP 4 — Se admin vede interesse → CONTATTA IL CLIENTE
"Abbiamo visto la sua auto, pensiamo possa valere la pena ripararla...
 Lei non spende nulla. [Eventuale +100€]"
   ↓
STEP 5A — Cliente ACCETTA:
  Admin sceglie commerciante vincitore
  Solo a lui: dati completi cliente + indirizzo
  Commerciante e cliente si organizzano via chat in-app
  Commerciante paga DIRETTAMENTE il cliente al ritiro
  Commerciante paga NoiDemoliamo il prezzo concordato
  PRATICA COMPLETATA

STEP 5B — Cliente RIFIUTA: pratica torna a flusso A
STEP 5C — Nessun commerciante: admin decide (NoiDemoliamo / demolizione / asta)
```

**Anti-furbi**: commerciante che bypassa NoiDemoliamo → disattivato → perde accesso futuro.

## 4.4 Flusso D — Vendita auto su richiesta cliente (DA COSTRUIRE)

```
Cliente clicca "Vendi auto" su home → /vendi-auto
   ↓
Cliente inserisce dati + foto + prezzo desiderato OPPURE "valutate voi"
   ↓
Algoritmo NoiDemoliamo calcola valutazione automatica
   ↓
Admin decide 3 casi:

┌─ AUTO IMPRESENTABILE: admin propone demolizione gratuita
├─ AUTO BUONA: asta tra COMMERCIANTI (flusso C)
└─ AUTO MOLTO BUONA: admin compra direttamente per NoiDemoliamo
```

DB: pratiche di vendita in `veicoli_vendita`, non in `pratiche`.

## 4.5 Migrazione tra flussi

- **Vendita → demolizione**: pratica copiata in `pratiche` con stato `da_assegnare`
- **Demolizione → vendita commercianti**: passa a flusso C
- **Demolizione → acquisto NoiDemoliamo**: admin compra (con OK cliente)

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
in_attesa_recensione_cliente   🆕 (dopo ritiro, prima certificato)
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

## 4.7 Algoritmo di assegnazione AUTOMATICA

Implementato in `lib/assegnazione.ts` + endpoint `/api/assegna-pratica/route.ts`.

⚠️ **STATO**: codice scritto ma **DA REVISIONARE E TESTARE INSIEME**.

### Funzionamento

```
1. CONTROLLA prerequisiti (comune + provincia + lat/lng)
2. TROVA demolitori che coprono il comune (regole da demolitori_comuni)
3. FILTRA solo stato='attivo'
4. ESCLUDE saturi (oltre max_pratiche_aperte_demolitore, default 15)
5. CALCOLA distanza stradale (Google Distance Matrix in batch)
6. CALCOLA velocità storica (media giorni tra data_assegnazione e data_ritiro_effettuato
   sulle ultime 20 pratiche completate. Default 999 se 0 pratiche)
7. ORDINA per: velocità → distanza → pratiche aperte
8. RESTITUISCE vincitore + lista completa per debug
```

### ⚠️ Cose da fixare insieme

1. **Velocità storica**: codice usa `data_certificato_rottamazione` ma deve usare `data_ritiro_effettuato`. Fix in `lib/assegnazione.ts`.
2. **Colonne da verificare/aggiungere in `pratiche`**: `data_assegnazione`, `data_ritiro_effettuato`, `lat`, `lng`
3. **Colonna `stato` in `demolitori`** — verificare esista
4. **Pesi dello scoring**: aggiungere **media recensioni** come fattore (dopo creato sistema recensioni)
5. **Fallback nessun demolitore**: endpoint deve mettere pratica in `in_assegnazione_manuale`

## 4.8 Assegnazione MANUALE (DA COSTRUIRE) 🆕

Admin vuole SEMPRE poter assegnare lui stesso, anche quando l'algoritmo automatico è disponibile.

### Funzionamento

```
Admin clicca "Demolizione standard"
   ↓
Modale con 2 opzioni:
  → 🤖 Assegnazione automatica
  → 🗺️ Scelgo io il demolitore
   ↓
Se "Scelgo io": apre MAPPA INTERATTIVA con:
  - Pin del cliente (indirizzo di ritiro)
  - Pin di TUTTI i demolitori attivi
  - Etichetta: ragione_sociale + città
  - Colorazione:
      verde = copre il comune del cliente
      giallo = NON copre (zona scoperta)
      grigio = saturo
  - Linea distanza diretta dal cliente
   ↓
Admin clicca demolitore → card laterale con:
  - Dati anagrafici (ragione sociale, indirizzo, telefono)
  - Distanza dal cliente
  - Pratiche aperte attuali
  - Velocità storica
  - 🆕 Media recensioni clienti
  - Bottone "Assegna a questo demolitore"
   ↓
Conferma → pratica assegnata, stato → 'assegnata'
```

### Componenti da costruire
- Modale di scelta automatica/manuale (in `/admin/pratiche/[id]/page.tsx`)
- Componente `MappaSceltaDemolitore.tsx`
- Endpoint API per assegnazione manuale (update semplice su `pratiche`)

## 4.9 Sistema RECENSIONI (DA COSTRUIRE) 🆕

Cliente lascia **2 recensioni a fine pratica**: una per il demolitore, una per NoiDemoliamo. **OBBLIGATORIE** prima del certificato di rottamazione → altissima percentuale di review.

### Workflow

```
Demolitore clicca "✅ Veicolo ritirato"
   ↓
Pratica entra in stato 'in_attesa_recensione_cliente'
   ↓
Cliente riceve notifica (in-app + SMS) "Hai 2 recensioni da lasciare"
   ↓
Cliente apre dashboard pratica → banner BLOCCANTE:
  "Per ricevere il certificato di rottamazione, lascia le tue recensioni"
   ↓
Pagina recensioni mostra 2 card:
  1. RECENSIONE DEMOLITORE
     - Stelle 1-5 (obbligatorio)
     - Commento libero (opzionale)
  2. RECENSIONE NOIDEMOLIAMO
     - Stelle 1-5 (obbligatorio)
     - Commento libero (opzionale)
   ↓
Cliente compila e invia → entrambe salvate in tabella `recensioni`
   ↓
Pratica passa a 'in_attesa_cert_rottamazione' (sblocca il certificato)
   ↓
🆕 STRATEGIA MARKETING (gestita da admin):
   - Se recensione NoiDemoliamo ≥ 4 stelle: email/SMS automatico con
     "Ci aiuti? Recensiscici su Google Maps [link]"
   - Se ≤ 3 stelle: solo interna, NO push verso Google Maps
   - Davide deciderà piattaforme target (Google Maps / Trustpilot / altri)
```

### Database

Nuova tabella `recensioni`:
```
id              uuid          PK
pratica_id      uuid          FK → pratiche.id
cliente_id      uuid          FK → utenti.id
demolitore_id   uuid          FK → demolitori.id (null se è recensione NoiDemoliamo)
tipo            text          'demolitore' | 'noidemoliamo'
stelle          int           1-5
commento        text          libero, nullable
creata_il       timestamp
```

### Integrazioni

- **Algoritmo assegnazione (4.7)**: media recensioni demolitore = fattore di scoring
- **Dashboard demolitore**: visualizza propria media + recensioni ricevute
- **Pagina pubblica**: recensioni 5 stelle come social proof in homepage
- **Strategia spinta canali esterni**: Davide deciderà workflow (email automatica, SMS, popup)

---

# 📂 PARTE 5 — STRUTTURA PROGETTO E PAGINE

## 5.1 Albero principale (approssimativo)

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
│   │       ├── TabDocumenti.tsx              # Tab 1
│   │       ├── TabStato.tsx                  # Tab 2
│   │       ├── TabChat.tsx                   # Tab 3
│   │       └── UploadDocumentoModal.tsx      # (legacy, non usato)
│   ├── admin/
│   │   ├── page.tsx                          # Dashboard admin
│   │   ├── copertura/page.tsx                # Mappa Italia
│   │   ├── demolitori/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── MappaComuni.tsx
│   │   └── pratiche/
│   │       └── [id]/
│   │           ├── page.tsx
│   │           └── DocumentiApprovazione.tsx
│   └── api/
│       └── assegna-pratica/route.ts
├── lib/
│   ├── supabase.ts
│   └── assegnazione.ts
├── public/
│   ├── NoiDemoliamoLogo.png
│   ├── province.geojson
│   └── regioni.geojson
├── .env.local
├── ARCHITETTURA.md
└── package.json
```

⚠️ **Per la struttura PRECISA e completa** (con TUTTI i file di TUTTE le sottocartelle), Davide può fornirla generandola con `tree /F /A | findstr /V "node_modules" > struttura.txt`. Se la nuova chat ne ha bisogno, chiederla a Davide.

## 5.2 Flusso `/inizia` dettagliato (10 step + auto-registrazione)

Ramificazioni dinamiche: alcune risposte determinano i documenti richiesti dopo.

```
Step 1 — Tipo veicolo: autovettura / moto / altro
Step 2 — Ruolo: proprietario / delegato / deceduto (erede)
Step 3 — Targa
Step 4 — Marca / modello / anno / km
Step 5 — Condizioni: marciante, incidentato, parti mancanti
Step 6 — Documenti:
  → libretto: si / denuncia / digitale
                ↳ si       → richiesto LIBRETTO (fronte/retro)
                ↳ denuncia → richiesta DENUNCIA SMARRIMENTO LIBRETTO
                ↳ digitale → niente da caricare
  → certificato_proprieta: cartaceo / digitale / smarrito
                ↳ cartaceo → richiesto CERTIFICATO PROPRIETÀ
                ↳ digitale → niente
                ↳ smarrito → richiesta DENUNCIA SMARRIMENTO CERTIFICATO
  → eredita (solo se deceduto):
                ↳ accetta  → ATTO ACCETTAZIONE EREDITÀ
                ↳ rinuncia → ATTO RINUNCIA EREDITÀ
Step 7 — Foto veicolo (minimo 3) → bucket foto-pratiche
Step 8 — Indirizzo ritiro ⚠️ Manca Google Maps autocomplete
Step 9 — Dati personali (nome, CF, telefono, email)
Step 10 — Password (auto-registrazione)
```

**Documenti SEMPRE richiesti**:
- Carta d'identità (fronte e retro)
- Tessera sanitaria (fronte e retro)

**Documenti CONDIZIONALI** (in base alle risposte) — logica in `documentiRichiesti(p)` di `TabDocumenti.tsx`.

## 5.3 Pagine FATTE ✅

### Home `/` (app/page.tsx)
Logo, bottoni "Richiedi demolizione" + "Accedi", pills benefit, sfondo sfumato.

### Login `/login`
Email + password, redirect per ruolo. Demolitore/commerciante DA AGGIUNGERE.

### Area cliente — DASHBOARD (rifatta 22/05/2026) ⭐

**`/dashboard`** — Lista pratiche cliente con topbar blu, card pratiche, empty state.

**`/dashboard/[id]`** — Dettaglio pratica:
- Topbar sticky + freccia + targa + badge stato sobrio
- Banner stato dinamico (gradient)
- 3 Tab grandi (60px) con icone SVG: Documenti, Stato, Chat
- Pallino rosso SOLO per attenzione richiesta

**Tab Documenti**: barra progresso, documenti dinamici, 4 stati per documento, galleria foto veicolo.

**Tab Stato**: timeline verticale 5 step + dati veicolo collassabile.

**Tab Chat**: 2 sub-tab (NoiDemoliamo + Demolitore), bolle WhatsApp, chat persistente.

### Area admin

**`/admin`** — Dashboard con stats e filtri.

**`/admin/copertura`** — Mappa strategica Italia.

**`/admin/demolitori`** + `/admin/demolitori/[id]` — Gestione demolitori con MappaComuni.

**`/admin/pratiche/[id]`** — Dettaglio pratica con:
- Step 1: approvazione granulare documenti/foto
- Step 2: 4 card destino
- ⚠️ DA AGGIUNGERE: chat funzionante con messaggi_chat

## 5.4 Backend / API

**`/api/assegna-pratica/route.ts`** — Endpoint algoritmo assegnazione (DA REVISIONARE).

---

# 🎨 PARTE 6 — DESIGN SYSTEM

> Approvato il 22/05/2026 sulla dashboard cliente. Applicare a TUTTE le pagine future.

## 6.1 Colori principali

- **Blu navy primario** (topbar, sub-header, tab attivi): `#0d2144`
- **Blu primario** (bottoni CTA, link): `bg-blue-600` con hover `bg-blue-700`
- **Sfondo pagina**: `bg-[#f0f4f8]`
- **Bianco card**: `bg-white` con `border border-gray-200`

## 6.2 Colori secondari per stati

- **Verde**: `bg-green-50`, `border-green-300`, `text-green-700`
- **Giallo**: `bg-yellow-50`, `border-yellow-200`, `text-yellow-700`
- **Rosso**: `bg-red-50`, `border-red-300`, `text-red-700`
- **Grigio**: `bg-gray-50`, `border-gray-200`, `text-gray-500`

## 6.3 Tipografia

- **Font**: default sistema (Tailwind sans), no font custom
- **Titoli pagina**: `text-xl font-bold text-gray-900`
- **Titoli card**: `text-sm font-semibold text-gray-800`
- **Body**: `text-sm text-gray-700`
- **Caption/hint**: `text-xs text-gray-500`
- **Micro testo**: `text-[10px]` o `text-[11px]`

## 6.4 Componenti standard

### Topbar (sticky)
- `bg-[#0d2144] px-4 py-3`
- Logo + nome a sx, contesto centro, badge stato sobrio a dx
- Badge: `bg-yellow-500/15 border border-yellow-400/40 text-yellow-200`

### Card
- `bg-white border border-gray-200 rounded-2xl p-4`
- Spaziatura interna `gap-3` o `gap-2`
- Solo `shadow-sm`, mai `shadow-lg`

### Banner stato dinamico
- `bg-gradient-to-br from-COLORE-600 to-COLORE-800`
- Emoji 3xl + titolo bold + sottotitolo opacità 90%
- `rounded-2xl p-4`

### Bottoni
- **CTA primario**: `bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-xs`
- **CTA secondario**: `bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 py-2.5 rounded-lg`
- **CTA pericolo**: `bg-red-600 hover:bg-red-700 text-white`
- **CTA disabled**: `disabled:opacity-50 disabled:cursor-not-allowed`
- 2 bottoni affiancati: `grid grid-cols-2 gap-2`

### Tab bar
- Container: `bg-white border border-gray-200 rounded-2xl p-1 flex gap-1`
- Tab attivo: `bg-[#0d2144] text-white`
- Tab inattivo: `bg-transparent text-gray-500 hover:bg-gray-50`
- Item: `flex-1 rounded-xl py-3 px-2 flex flex-col items-center gap-1 min-h-[60px]`
- Icona SVG 22x22 + label `text-xs font-medium`
- Pallino: rosso con numero SOLO per attenzione

### Icone
- **SVG inline** preferito alle emoji
- Emoji ok solo: banner stato, empty state, messaggi
- SVG std: `width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"`
- Icone doc colorate: blu `#2563eb`, ciano `#0891b2`, verde `#16a34a`, grigio `#6b7280`

### File-pill
- `bg-white border border-gray-300 rounded-lg`
- Miniatura 8x8 OR badge "PDF"
- Bottone × rosso `absolute -top-1.5 -right-1.5`

### Form input
- `border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500`
- Input chat: `rounded-full`

## 6.5 Spaziatura

- Container max: `max-w-2xl mx-auto px-3 py-3` (mobile-first)
- Gap tra card: `gap-3` (12px)
- Gap interno card: `gap-2` (8px)

## 6.6 Regole d'oro

1. **Mobile-first**: touch-friendly (min 44px altezza)
2. **No emoji nell'interfaccia**: SVG colorati per icone funzionali
3. **Niente bordi tratteggiati**: bordi pieni o bg colorati
4. **Shadow leggere**: solo `shadow-sm` o `shadow-md` puntuali
5. **Bottoni grandi e chiari**: testo bold, padding generoso
6. **Coerenza colori**: blu = azione, verde = ok, rosso = errore, giallo = attesa
7. **Stato sempre visibile**
8. **Empty state amichevole**: icona grande + frase rassicurante + CTA

---

# 🗣️ PARTE 7 — COMUNICAZIONE CON DAVIDE

> Davide è imprenditore, NON sviluppatore. Lavora con AI per costruire la piattaforma.

## 7.1 Stile di lavoro preferito

- **Istruzioni passo-passo brevissime**: uno step alla volta, "scrivimi fatto"
- **Niente spiegazioni tecniche se non chiede**
- **Risposte compatte, no preamboli**
- **File completi sostituibili** preferiti ("ridammi tutto il codice")
- **"UI"** non significa nulla → spiegare "come appare la pagina"
- **Si confonde tra concetti tecnici** → spiegare con analogie
- **Comandi PowerShell** dati come stringhe pronte da copiare

## 7.2 Stack interazione

- **Editor**: VS Code → Ctrl+A → Ctrl+V → Ctrl+S
- **Terminale**: PowerShell di VS Code
- **Git**: GitHub Desktop, NON terminale
- **DB**: Supabase SQL Editor

## 7.3 Sequenza di lavoro tipica

```
1. Davide dice cosa serve
2. Claude può fare 1-3 domande con ask_user_input_v0 se ci sono scelte
3. Claude scrive il file completo con create_file
4. Claude usa present_files per dare il file
5. Davide apre file in VS Code
6. Ctrl+A → cancella → Ctrl+V → Ctrl+S
7. Ricarica pagina nel browser
8. Manda screenshot o descrive a parole
9. Claude verifica/corregge
10. Quando funziona, prossimo task
```

## 7.4 Convenzioni di file

- File completi sostituibili preferiti ai patch
- Spiegazioni in italiano, codice misto
- Loop infinito / errori React → consigliare `npm run dev`

## 7.5 Segnali Explorer VS Code

- **"M" verde**: modificato non salvato. Davide deve fare Ctrl+S.
- **"U" verde**: nuovo non in git
- **"M" arancione**: modificato salvato, da committare
- **Numero rosso "PROBLEMS"** in basso: errori TypeScript

## 7.6 Note operative

- Davide non ricorda sempre dove sono i file → indicare percorso completo
- Quando si crea file nuovo, dare ESATTAMENTE comando PowerShell
- Limiti immagini chat → suggerire nuova chat dopo molti screenshot
- Errori RLS minori: gli interessano poco se non bloccano

---

# 📋 PARTE 8 — STATO ATTUALE (22/05/2026)

## 8.1 ✅ FATTO

### Frontend pubblico
- ✅ Home pubblica con design pulito
- ✅ Flusso `/inizia` 10 step + auto-registrazione
- ✅ Upload foto VERO su Supabase Storage
- ✅ Login multi-ruolo base

### Area cliente
- ✅ Dashboard lista pratiche
- ✅ Dettaglio pratica con 3 tab
- ✅ Banner stato dinamico
- ✅ Tab Documenti con upload fronte/retro + bottoni inline
- ✅ Tab Stato con timeline 5 step
- ✅ Tab Chat con sub-tab NoiDemoliamo + Demolitore
- ✅ Chat persistente su `messaggi_chat`
- ✅ Pallino rosso solo per attenzione

### Area admin
- ✅ Dashboard admin con stats e filtri
- ✅ Pagina dettaglio pratica con approvazione granulare
- ✅ Step 2 destino (4 card, demolizione standard collegata)
- ✅ Gestione demolitori completa
- ✅ MappaComuni 3 layer
- ✅ Mappa strategica `/admin/copertura`
- ✅ 20 file GeoJSON regioni su Storage

### Backend / DB
- ✅ Tabelle `documenti_approvazione` e `messaggi_chat` con RLS
- ✅ Bucket `foto-pratiche` + `documenti-pratiche` + policy
- ✅ Algoritmo assegnazione — DA REVISIONARE
- ✅ Google Maps Server Key creata e limitata
- ✅ Schema `pratiche` esteso

## 8.2 ⏳ PENDING — In ordine di priorità

### 🔥 STEP 1 — FINIRE LA DASHBOARD CLIENTE (PRIMA DI TUTTO IL RESTO)

Davide vuole finire prima di tutto la dashboard cliente. Lavori specifici:

1. **Testare visivamente la tab Stato** (timeline) con una pratica vera
2. **Testare la tab Chat con il Demolitore** (3 stati: prima/durante/dopo)
3. **Testare caricamento file vero** → verificare che arrivi in admin
4. **"0 pratiche" → "Nessuna pratica"** nella lista (cosmetico)
5. **Documenti richiesti dinamici** più raffinati in base a `/inizia`

⚠️ **Davide dirà altri aspetti specifici** della dashboard cliente da finire. Chiedergli sempre cosa manca prima di procedere.

### 🔥 STEP 2 — PAGINA ADMIN DETTAGLIO PRATICA

6. **Sistemare `/admin/pratiche/[id]`**:
   - Aggiungere box chat funzionante (usare `messaggi_chat`)
   - Admin vede SEMPRE tutte le chat
   - Sub-tab admin: cliente↔NoiDemoliamo, cliente↔demolitore

### 🔥 STEP 3 — REVISIONE ALGORITMO + ASSEGNAZIONE MANUALE

7. **Rivedere insieme algoritmo** (vedi PARTE 4.7):
   - Fix velocità storica (`data_assegnazione` → `data_ritiro_effettuato`)
   - Aggiungere colonne mancanti in `pratiche`
   - Verificare colonna `stato` in `demolitori`
   - Aggiungere media recensioni come fattore scoring (dopo sistema recensioni)
   - Discutere altri criteri

8. **Costruire assegnazione MANUALE** (vedi PARTE 4.8)
9. **Google Maps autocomplete** in `/inizia` step 8
10. **Testare bottone "Demolizione standard"** con demolitore di test
11. **Migrare GOOGLE_MAPS_SERVER_KEY su Vercel**

### 🔥 STEP 4 — SISTEMA RECENSIONI 🆕 (vedi PARTE 4.9)

12. **Creare tabella `recensioni`** + RLS
13. **Aggiungere stato `in_attesa_recensione_cliente`**
14. **Pagina recensioni cliente** (banner bloccante prima certificato)
15. **Integrare con notifiche** (in-app + SMS)
16. **Media recensioni nella card demolitore** in mappa assegnazione manuale
17. **Media recensioni come fattore algoritmo** automatico
18. **Strategia push verso Google Maps** (Davide deciderà workflow)

### 🔜 STEP SUCCESSIVI

19. **Sistema invito email demolitore + `/imposta-password`**
20. **Login multi-ruolo completo** (demolitore + commerciante)
21. **Dashboard demolitore** `/dashboard-demolitore`
22. **Sistema notifiche in-app** (campanella, badge, popup, web push)
23. **Sistema SMS** (Twilio)
24. **Sistema messaggi preimpostati** admin

### 🔮 PROSSIMI FLUSSI

25. **Flusso B — Asta demolitori**
26. **Flusso C — Proponi ai commercianti**
27. **Flusso "Compra per NoiDemoliamo"**
28. **Flusso D — Vendita auto** `/vendi-auto`

### 🏪 AREA COMMERCIANTI

29. **Dashboard commerciante** 6 sezioni
30. **Mappa commercianti** `/admin/copertura-commercianti`

### 🛠️ ALTRI

31. **Sistema fatturazione automatica**
32. **Statistiche e report admin**
33. **Dashboard collaboratori ed enti pubblici** (futuro lontano)

## 8.3 ⚠️ Problemi noti

- **Errore RLS minore** in `/inizia` (NON blocca)
- **Box `/inizia` troppo in alto** (cosmetico)
- **Console "1 Issue"** generica → da indagare

---

# 💡 PARTE 9 — DECISIONI BUSINESS CHIAVE

1. **Velocità** è il principio cardine sopra tutto
2. **Approvazione documenti**: granulare, non in blocco
3. **Documenti tutti uguali nell'UI**: tutti hanno ✓ e ✗
4. **Pagamento commerciante → cliente**: diretto al ritiro
5. **Commercianti vedono**: foto + città (no indirizzo, no dati cliente, no libretto/cert)
6. **Strategia "Proponi ai commercianti"**: prima testo mercato, POI contatto cliente
7. **Eventuale +100€ al cliente**: quando "mangia la foglia"
8. **Slot documenti operativi commercianti**: contratto + delega + PDF
9. **Chat in-app, niente telefono**
10. **Admin vede SEMPRE tutte le chat**. Cliente non vede più demolitore dopo cert rottamazione
11. **Chat persistente DB** (`messaggi_chat`). Real-time = miglioria futura
12. **Mobile-first**
13. **Upload**: 2 opzioni "Scatta foto" + "Carica file". NO 3a
14. **Documenti dinamici** in base a /inizia
15. **Doc identità/libretto**: fronte + retro in 1 slot (anche PDF unico)
16. **Assegnazione SEMPRE su scelta**: automatica o manuale da mappa
17. **Velocità storica demolitore**: da `data_assegnazione` a `data_ritiro_effettuato`
18. 🆕 **Recensioni OBBLIGATORIE**: cliente lascia 2 recensioni (demolitore + NoiDemoliamo) dopo ritiro effettuato e PRIMA di ricevere certificato. Strategia: push positive verso Google Maps / altri canali
19. 🆕 **Recensioni come fattore algoritmo**: media recensioni demolitore influenza posizione

---

# 🚀 PARTE 10 — COME LAVORARE NELLA NUOVA CHAT

> Istruzioni per Claude nella nuova chat dopo aver letto questo file.

1. **Leggi TUTTO questo file**, poi conferma a Davide di aver capito
2. **Riprendi dal punto 8.2 PENDING** nell'ordine: STEP 1 (dashboard cliente) → STEP 2 (admin chat) → STEP 3 (algoritmo/manuale) → STEP 4 (recensioni)
3. **Chiedi sempre a Davide quali aspetti specifici** vuole finire prima
4. **Rispetta il design system** della parte 6 in TUTTE le pagine nuove
5. **Stile comunicazione** della parte 7 (passo-passo, no preamboli, file completi)
6. **Quando crei nuovi file**, aggiorna mentalmente questo doc (a fine sessione, chiedi a Davide di aggiornare)
7. **Non assumere mai cose nuove**: se non sei sicuro, chiedi
8. **Se hai bisogno della struttura PRECISA del progetto** (con tutti i file): chiedi a Davide di generarla con `tree /F /A | findstr /V "node_modules" > struttura.txt` e di condividerla
9. **GitHub push** Davide lo fa da GitHub Desktop quando vuole snapshot

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