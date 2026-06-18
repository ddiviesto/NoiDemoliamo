# NoiDemoliamo — Architettura completa

> Documento di riferimento del progetto. Aggiornato al **12 giugno 2026**.
> Questo è l'unico file da leggere per capire dove siamo, dove andiamo, e come si lavora.

---

# 📍 PARTE 1 — IDENTITÀ DEL PROGETTO

## 1.1 Cosa è NoiDemoliamo

Piattaforma italiana di **demolizione auto gratuita** per il privato.
Il cliente:
1. Va su `noi-demoliamo.vercel.app`
2. Compila un flusso di mini-step (`/inizia`) — ora 14-15 step (dipende da tipo veicolo e casistica)
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
- **Approvazione documenti**: entro 1 ora dall'invio del cliente (comunicato nel flusso `/inizia`)
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
- **Styling**: Tailwind CSS (no font custom — rimossi Geist Sans/Mono il 25/05/2026)
- **Backend**: Supabase (database PostgreSQL + Auth + Storage)
- **Hosting**: Vercel (produzione)
- **Repository**: GitHub `ddiviesto/NoidemoliaMo`
- **Live**: https://noi-demoliamo.vercel.app

## 2.2 Cartella locale e ambiente sviluppo

**Cartella progetto**: `C:\Users\Davide Di Viesto\Desktop\OneDrive\Noi_Demoliamo\Codex_Noi_Demoliamo\NoiDemoliamo`

**Strumenti che Davide usa**:
- **VS Code** per editing (Ctrl+A → Ctrl+V → Ctrl+S, Ctrl+H per trova/sostituisci)
- **PowerShell** come terminale Windows
- **GitHub Desktop** OPPURE comandi PowerShell git che Claude gli prepara
- **Supabase SQL Editor** per query e modifiche DB
- **Browser Chrome** per testing (F12 → Ctrl+Shift+M per modalità mobile)
- **iPhone** per testing reale (Davide è su iPhone, PC è HP)

**Comandi essenziali**:
```powershell
# Avviare il server di sviluppo
npm run dev

# Creare nuovo file
New-Item -Path "app\percorso\file.tsx" -ItemType File

# Push veloce all in one
git add . ; git commit -m "messaggio" ; git push origin main

# Verificare contenuto cartella
dir app\dashboard

# Vedere struttura completa del progetto (salva in struttura.txt)
tree /F /A | findstr /V "node_modules" > struttura.txt
```

📁 **STRUTTURA COMPLETA DEL PROGETTO**: Davide ha il comando per generare l'albero completo con `tree /F /A`. Se la nuova chat ha bisogno della struttura esatta (con tutti i file), chiederla a Davide che genererà `struttura.txt` e potrà condividerla.

## 2.3 Variabili d'ambiente

### File `.env.local` (locale)
```
NEXT_PUBLIC_SUPABASE_URL=https://egsufeczoroxqnagzqfq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...   ⚠️ NOMINATA CORRETTAMENTE (con _API_ in mezzo)
GOOGLE_MAPS_SERVER_KEY=...            (server-side, per Distance Matrix + Geocoding)
SUPABASE_SERVICE_ROLE_KEY=...
```

⚠️ **Nota nomenclatura**: la variabile **DEVE** chiamarsi `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (non `NEXT_PUBLIC_GOOGLE_MAPS_KEY`) perché il pattern Next.js standard la richiede così.

### Su Vercel (produzione)
- ✅ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` configurata correttamente
- ⚠️ **PENDING**: `GOOGLE_MAPS_SERVER_KEY` ancora da aggiungere su Vercel produzione

### Google Cloud Console
- ✅ Abilitata sia **Places API** che **Places API (New)** — entrambe necessarie
- ✅ Chiave browser limitata a referrer `noi-demoliamo.vercel.app/*` + `localhost:3000/*`

## 2.4 Supabase

**URL**: https://egsufeczoroxqnagzqfq.supabase.co
**Admin email hardcoded**: `ddiviesto@gmail.com`

⚠️ **Free tier**: il progetto va in pausa dopo ~7 giorni di inattività → aprire la dashboard Supabase ogni 5-6 giorni. Al lancio: passare a Supabase Pro (~25$/mese).

### Buckets Storage attivi

| Bucket | Visibilità | Contenuto |
|---|---|---|
| `geojson-comuni` | Pubblico | 20 file GeoJSON regioni italiane (per mappa copertura demolitori) |
| `foto-pratiche` | Pubblico | Foto veicoli caricate dai clienti |
| `documenti-pratiche` | Privato | Libretto, certificato proprietà, carta identità, ecc. (signed URL 1h) |

### Policy RLS attive su Storage

- ✅ DELETE su `foto_pratiche` e `documenti` (solo proprietario pre-assegnazione)
- ✅ DELETE su `storage.objects` (usa `split_part(name, '/', 1)` per matchare pratica_id)
- ✅ Admin full access su tutte le tabelle

### Trucchi utili
- Dopo `ALTER TABLE`, se il sito dà errori "column not found" → SQL Editor: `NOTIFY pgrst, 'reload schema';` oppure Settings → Restart project (ricarica la cache dello schema)

---

# 🗄️ PARTE 3 — DATABASE COMPLETO

## 3.1 Tabelle esistenti nel DB Supabase

Tutte queste tabelle sono già presenti e funzionanti:

`casistiche_documenti` 🆕, `collaboratori`, `commercianti`, `demolitori`, `demolitori_comuni`, `documenti`, `documenti_approvazione`, `fatture`, `foto_pratiche`, `impostazioni`, `interessi_commercianti`, `messaggi`, `messaggi_chat`, `notifiche`, `pratica_documenti_checklist` 🆕, `pratiche`, `solleciti`, `utenti`, `veicoli_vendita`, `veicoli_vendita_foto`

Inoltre tabelle anagrafiche: `comuni`, `province`, `regioni` (intoccabili, usate per autocomplete e mappa).

## 3.2 Tabella `pratiche` — 50+ colonne

Tabella centrale del progetto. Contiene tutte le pratiche di demolizione.

**Colonne principali**:
- **Identificativi**: `id` (uuid), `user_id` (uuid), `creato_il` (timestamp)
- **Veicolo**: `targa`, `tipo_mezzo`, `tipo_mezzo_altro` (text), `marca`, `modello`, `anno`, `km`, `incidentato` (bool), `marciante` (bool), `va_in_moto` (bool), `parti_mancanti` (bool), `note_veicolo`, `tipo_cambio` (text: manuale/automatico/non_so)
- **Indirizzo**: `indirizzo_ritiro`, `comune_ritiro`, `provincia_ritiro`, `cap_ritiro`, `lat`, `lng`, `spazio_carro_attrezzi` (text: libero/stretto/no), `spazio_carro_attrezzi_note` (text libero)
- **Cliente**: `codice_fiscale` (⚠️ ora NULLABLE — null per targhe straniere; per le società contiene la P.IVA a 11 cifre), `nome_richiedente`, `telefono`
- **🆕 SISTEMA CASISTICHE (giugno 2026)**: `casistica` (text con CHECK sugli 8 codici, vedi 3.3), `fermo_amministrativo` (si/no/non_so, null se non applicabile), `targhe_presenti` (bool, null per targhe straniere), `delegato_nome`, `delegato_telefono` (null se consegna in prima persona), `numero_eredi` (int, solo casi eredi), `nomi_rinunciatari` (text — colonna pronta ma NON compilata dal flusso: si raccoglierà nell'area personale)
- **Documenti dichiarati**: `libretto` (si/denuncia/no — ora NULLABLE), `certificato_proprieta` (NULLABLE; CHECK ammette digitale/cartaceo/documento_unico/smarrito/nessuno ma la UI attuale ne propone 4: digitale, cartaceo, smarrito, nessuno)
- **Legacy da rimuovere in pulizia finale**: `ruolo_richiedente`, `eredita` (sostituiti dal sistema casistiche)
- **Workflow**: `demolitore_id`, `data_ritiro_prevista`, `data_certificato_rottamazione`, `data_certificato_pra`, `stato`
- **Scadenze**: `urgente`, `scadenza_proposta_ritiro`, `scadenza_cert_rottamazione`, `scadenza_cert_pra`, `assegnazione_manuale`

### Valori ammessi per `tipo_mezzo` (NO check constraint, text libero):
```
autovettura, motoveicolo, ciclomotore, minicar, furgone,
imbarcazione, pullman, camion, velivolo, altro
```

### SQL rilevanti eseguiti a giugno 2026
```sql
-- Colonne sistema casistiche (con CHECK sugli 8 codici per casistica)
ALTER TABLE pratiche ADD COLUMN casistica TEXT, ADD COLUMN fermo_amministrativo TEXT,
  ADD COLUMN targhe_presenti BOOLEAN, ADD COLUMN delegato_nome TEXT,
  ADD COLUMN delegato_telefono TEXT, ADD COLUMN numero_eredi INT,
  ADD COLUMN nomi_rinunciatari TEXT;

-- Targhe straniere: questi campi possono essere vuoti (12/06/2026)
ALTER TABLE pratiche ALTER COLUMN codice_fiscale DROP NOT NULL;
ALTER TABLE pratiche ALTER COLUMN certificato_proprieta DROP NOT NULL;
ALTER TABLE pratiche ALTER COLUMN libretto DROP NOT NULL;
```

## 3.3 🆕 LE 8 CASISTICHE DI DEMOLIZIONE (cuore del sistema)

Documento sorgente di Davide: `Casistiche_Demolizione.md`. Ogni pratica viene classificata automaticamente dal flusso `/inizia` (funzione `derivaCasistica` in `types/pratica.ts`) e salvata in `pratiche.casistica`:

| # | Codice | Descrizione | Particolarità |
|---|---|---|---|
| 1 | `persona_fisica` | Privato, mezzo intestato a persona fisica vivente | Caso base |
| 2 | `eredi_accettato` | Intestatario deceduto, eredi accettano tutti | numero_eredi 1-10, documenti × erede |
| 3 | `eredi_rinuncia` | Intestatario deceduto, qualcuno ha rinunciato | Rinuncia formale Notaio/Tribunale; chi rinuncia NON firma nulla |
| 4 | `societa` | Mezzo intestato a società attiva | P.IVA 11 cifre al posto del CF, visura camerale |
| 5 | `societa_fallita` | Società fallita/liquidata | Autorizzazione Giudice Delegato |
| 6 | `associazione` | Intestato ad associazione/ente | CF associazione |
| 7 | `non_intestatario` | Richiedente NON è l'intestatario (no eredità) | ⚠️ Delega NON ammessa |
| 8 | `targhe_straniere` | Mezzo con targhe estere (non al PRA italiano) | ⚠️ Salta CF, CDC, fermo, consegna/delega, box targhe |

**Integrazioni trasversali** (si applicano ai casi 1-7 come condizioni aggiuntive):
- **Fermo amministrativo** (`fermo_si`) → dichiarazione sostitutiva aggiuntiva
- **Targhe smarrite** (`targhe_assenti`) → denuncia di smarrimento targhe

Helper in `types/pratica.ts`: `derivaCasistica(intestazione, erediRinuncia, societaFallita)`, `delegaAmmessa(cas)` (false per non_intestatario e targhe_straniere), `fermoApplicabile(cas)` (false per targhe_straniere).

## 3.4 🆕 SISTEMA DOCUMENTI DINAMICI — Tabelle create il 12/06/2026

Architettura "ricettario + lista della spesa": un **catalogo** statico di regole + una **checklist** generata per ogni pratica.

### `casistiche_documenti` (IL CATALOGO — si scrive una volta sola)
```
id                 uuid     PK
casistica          text     CHECK sugli 8 codici
codice             text     es. 'libretto', 'ci_intestatario', 'delega'
nome               text     etichetta mostrata al cliente
descrizione        text     istruzioni semplici
richiede_upload    bool     va caricato in area personale (foto/PDF)
richiede_consegna  bool     va consegnato fisicamente al ritiro
template_pdf       text     se è un modulo autocompilato: nome template
per_erede          bool     se true → moltiplicato × numero_eredi
condizione         text     quando appare: 'sempre', 'cdc_cartaceo', 'cdc_smarrito',
                            'targhe_assenti', 'fermo_si', 'delegato', 'libretto_smarrito', ...
obbligatorio       bool
ordine             int
```
RLS: lettura pubblica (è il "menu", niente dati personali), gestione solo admin.

### `pratica_documenti_checklist` (LO STATO — una riga per documento per cliente)
```
id              uuid    PK
pratica_id      uuid    FK pratiche (ON DELETE CASCADE)
documento_id    uuid    FK casistiche_documenti
indice_erede    int     Erede 1, Erede 2... (null per il resto)
stato           text    'da_fare' | 'caricato' | 'approvato' | 'rifiutato'
file_url        text    file caricato (bucket privato documenti-pratiche)
scaricato_il    tstz    per i moduli PDF: quando il cliente l'ha scaricato
caricato_il     tstz
nota_admin      text    es. 'Foto sfocata, ricaricala'
aggiornato_il   tstz
```
UNIQUE INDEX su (pratica_id, documento_id, COALESCE(indice_erede,0)).
RLS: SELECT/INSERT/UPDATE solo proprietario della pratica o admin (stesso pattern di `pratiche`).
✅ GRANT espliciti già applicati (vedi promemoria 8.4).

### Come funziona (deciso il 12/06/2026)
1. Alla creazione pratica (o primo accesso area personale) il sistema legge `casistica` + le risposte (CDC, targhe, fermo, delegato, n° eredi) e **genera le righe checklist** dal catalogo
2. Il cliente carica ogni documento: **basta una foto col telefono**
3. **Moduli PDF autocompilati** (deleghe, dichiarazioni): il cliente li scarica (sistema registra `scaricato_il`) → stampa e firma → **carica una FOTO del modulo firmato** (così l'admin vede che l'ha fatto) → consegna l'**originale al ritiro**
4. **Approvazione admin per SINGOLO documento** (rifiuto con motivo in `nota_admin`) + bottone **"Approva tutti"** per velocità
5. I documenti con `richiede_consegna=true` compongono la lista "porta con te al ritiro"

## 3.5 Tabella `documenti`

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

⚠️ Dal 22/05/2026 supporta **più righe dello stesso `tipo`** per la stessa pratica (es. fronte + retro).
⚠️ Rapporto con il nuovo sistema checklist da definire durante la costruzione della dashboard documenti (probabile migrazione/affiancamento).

## 3.6 Tabella `foto_pratiche`

Foto **del veicolo**. `id`, `pratica_id`, `url` (bucket foto-pratiche), `caricato_il`.

## 3.7 Tabella `documenti_approvazione`

Tracking granulare approvazione documenti/foto da admin (legacy — il nuovo sistema checklist ha l'approvazione integrata nello `stato`).
`id`, `pratica_id`, `tipo_documento`, `stato` ('approvato'|'rifiutato'|'in_attesa'), `nota_admin`, `creato_il`, `aggiornato_il`.

## 3.8 Tabella `messaggi_chat`

Chat persistente tra cliente, admin, demolitore, commerciante.
`id`, `pratica_id`, `mittente_id`, `mittente_tipo` ('cliente'|'admin'|'demolitore'|'commerciante'), `testo`, `letto`, `creato_il`.
⚠️ Real-time non implementato — messaggi appaiono ricaricando.

## 3.9 Tabella `impostazioni`

Chiave-valore. Es: `max_pratiche_aperte_demolitore=15`

## 3.10 Tabella `demolitori` e `demolitori_comuni`

- `demolitori`: anagrafica (id, ragione_sociale, indirizzo, citta, provincia, lat, lng, stato)
- `demolitori_comuni`: copertura geografica (demolitore_id, comune, provincia, tipo: 'regione'|'provincia'|'provincia_esclusa'|'comune_incluso'|'comune_escluso')

## 3.11 Altre tabelle rilevanti

- `utenti`: profilo utente (collegato a Supabase Auth via id)
- `veicoli_vendita` + `veicoli_vendita_foto`: flusso D (vendita), separate da `pratiche`

## 3.12 Tabelle ANCORA DA CREARE

- 🆕 `recensioni` (id, pratica_id, cliente_id, demolitore_id, tipo, stelle, commento, creata_il)
- `aste` (id, riferimento_id, riferimento_tipo, tipo, prezzo_base, somma_per_cliente, date, stato, vincitore_id)
- `offerte_asta` (id, asta_id, offerente_id, importo, timestamp)
- `messaggi_preimpostati` (id, categoria, titolo, testo)
- `documenti_operativi_commercianti` (id, titolo, descrizione, url_file, attivo)
- `notifiche_app` (id, utente_id, tipo, titolo, messaggio, letta, link, timestamp)
- `notifiche_sms_inviate` (id, utente_id, numero, testo, stato, timestamp)

⚠️ Da creare DOPO il 30/10/2026 → ricordare i GRANT espliciti (vedi 8.4).

---

# 🔄 PARTE 4 — I 4 FLUSSI DELLA PRATICA

## 4.1 Flusso A — Demolizione standard ✅ FUNZIONANTE

```
Cliente compila /inizia (14-15 mini-step, casistica derivata automaticamente) → crea account
   ↓
🆕 Sistema genera la CHECKLIST DOCUMENTI dalla casistica (da costruire: generazione + dashboard)
   ↓
Cliente carica documenti in area personale (foto col telefono)
   ↓
Admin approva (singolo documento o "Approva tutti")
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
Giorno del ritiro → cliente consegna gli ORIGINALI (lista "porta con te") → demolitore clicca "✅ Veicolo ritirato"
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
Admin sceglie destino: ASTA DEMOLITORI → imposta prezzo base, durata, demolitori invitati
→ Demolitori vedono "Aste aperte" (foto, città, marca, anno, km, condizioni; NO dati cliente)
→ Offerte ≥ prezzo corrente → scadenza → admin sceglie vincitore
→ Vincitore: pratica assegnata, parte flusso A. Nessuno offre: rilancio o standard.
```

## 4.3 Flusso C — Vendita ai commercianti (DA COSTRUIRE)

**Strategia**: admin **prima** testa il mercato con i commercianti, **poi** se vede interesse contatta il cliente.

```
Admin "Proponi ai Commercianti" (prezzo richiesto, somma cliente opzionale, durata)
→ visibile a TUTTI i commercianti (foto + città + dati veicolo; NO dati cliente)
→ offerte → se interesse, admin contatta cliente ("Lei non spende nulla. [Eventuale +100€]")
→ Cliente ACCETTA: commerciante vincitore riceve dati completi, paga cliente al ritiro, paga NoiDemoliamo
→ Cliente RIFIUTA: torna a flusso A. Nessuna offerta: admin decide.
```

**Anti-furbi**: commerciante che bypassa NoiDemoliamo → disattivato.

## 4.4 Flusso D — Vendita auto su richiesta cliente (DA COSTRUIRE)

```
Cliente "Vendi auto" → /vendi-auto → dati + foto + prezzo (o "valutate voi")
→ valutazione automatica → admin decide:
┌─ IMPRESENTABILE: propone demolizione gratuita
├─ BUONA: asta tra COMMERCIANTI (flusso C)
└─ MOLTO BUONA: admin compra per NoiDemoliamo
```

DB: `veicoli_vendita`, non `pratiche`.

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
in_attesa_recensione_cliente   (dopo ritiro, prima certificato)
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

```
1. Prerequisiti (comune + provincia + lat/lng)
2. Demolitori che coprono il comune → 3. solo attivi → 4. esclude saturi (max 15)
5. Distanza stradale (Google Distance Matrix) → 6. velocità storica (ultime 20 pratiche)
7. Ordina: velocità → distanza → pratiche aperte → 8. vincitore + lista debug
```

### ⚠️ Cose da fixare insieme
1. Velocità storica: usare `data_ritiro_effettuato` (non `data_certificato_rottamazione`)
2. Colonne da verificare/aggiungere in `pratiche`: `data_assegnazione`, `data_ritiro_effettuato`
3. Colonna `stato` in `demolitori` — verificare esista
4. Aggiungere media recensioni allo scoring (dopo sistema recensioni)
5. Fallback nessun demolitore → `in_assegnazione_manuale`

## 4.8 Assegnazione MANUALE (DA COSTRUIRE)

Admin vuole SEMPRE poter assegnare lui stesso. Modale scelta (🤖 automatica / 🗺️ scelgo io) → mappa interattiva con pin cliente + demolitori (verde=copre, giallo=non copre, grigio=saturo) → card demolitore (dati, distanza, pratiche aperte, velocità, media recensioni) → "Assegna".
Componenti: modale in `/admin/pratiche/[id]`, `MappaSceltaDemolitore.tsx`, endpoint assegnazione manuale.

## 4.9 Sistema RECENSIONI (DA COSTRUIRE)

Cliente lascia **2 recensioni a fine pratica** (demolitore + NoiDemoliamo). **OBBLIGATORIE** prima del certificato di rottamazione.

```
"✅ Veicolo ritirato" → stato 'in_attesa_recensione_cliente' → notifica cliente
→ banner BLOCCANTE in dashboard → 2 card recensione (stelle 1-5 + commento opzionale)
→ invio → salvate in `recensioni` → stato 'in_attesa_cert_rottamazione'
→ MARKETING: se NoiDemoliamo ≥ 4 stelle → push "Recensiscici su Google Maps". Se ≤ 3: solo interna.
```

Tabella `recensioni`: vedi 3.12. Integrazioni: scoring algoritmo, dashboard demolitore, social proof homepage.

---

# 📂 PARTE 5 — STRUTTURA PROGETTO E PAGINE

## 5.1 Albero principale (approssimativo)

```
NoiDemoliamo/
├── app/
│   ├── page.tsx                              # Home pubblica
│   ├── layout.tsx                            # Layout root (no font Geist, viewport anti-zoom)
│   ├── globals.css                           # Tailwind globale
│   ├── login/page.tsx                        # Login multi-ruolo
│   ├── inizia/                               # Flusso cliente mini-step
│   │   ├── page.tsx                          # ⭐ Orchestratore: banner blu + getSteps dinamico + step inline
│   │   │                                     #   (intestazione, eredi, societa-fallita, indirizzo, targa, cf,
│   │   │                                     #    foto, fermo, consegna, libretto, cdc, account)
│   │   └── steps/                            # Step "storici" in file separati
│   │       ├── StepTipoVeicolo.tsx           # Griglia 4+4 tipo veicolo (con Furgone)
│   │       ├── StepIdentificaVeicolo.tsx     # Anno, km, marca, modello
│   │       ├── StepCambioVeicolo.tsx         # Tipo cambio (stile RuoloButton uniformato 12/06)
│   │       ├── StepCondizioniVeicolo.tsx     # ⭐ 4 card-riga con icone + "Cammina?" (12/06)
│   │       └── AutocompleteIndirizzo.tsx     # Google Maps autocomplete custom
│   ├── dashboard/                            # AREA CLIENTE
│   │   ├── page.tsx                          # Lista pratiche cliente (DashboardCliente)
│   │   └── [id]/
│   │       ├── page.tsx                      # Dettaglio pratica (3 tab)
│   │       ├── TabDocumenti.tsx              # Tab 1 (da ristrutturare con sistema checklist)
│   │       ├── TabStato.tsx                  # Tab 2
│   │       └── TabChat.tsx                   # Tab 3
│   ├── admin/
│   │   ├── page.tsx                          # Dashboard admin
│   │   ├── copertura/page.tsx                # Mappa Italia
│   │   ├── demolitori/  (page + [id] + MappaComuni)
│   │   └── pratiche/[id]/  (page + DocumentiApprovazione)
│   └── api/assegna-pratica/route.ts
├── lib/  (supabase.ts, assegnazione.ts)
├── types/
│   └── pratica.ts                            # ⭐ Intestazione, Casistica (8), derivaCasistica,
│                                             #   delegaAmmessa, fermoApplicabile, CdcStato
├── public/  (logo, geojson)
├── .env.local
├── ARCHITETTURA.md
└── package.json
```

## 5.2 Flusso `/inizia` dettagliato — SISTEMA CASISTICHE ⭐⭐⭐ (giugno 2026)

### Ordine step (14-15 visibili; getSteps è dinamico in base alle risposte)

```
Step 1 — TIPO VEICOLO (con box "Pensiamo a tutto noi")
  • Griglia 4+4 + espansione "Altro" (Imbarcazione, Velivolo, Altro mezzo + campo testo)

Step 2 — INTESTAZIONE ⭐ (sostituisce il vecchio step "Ruolo")
  • "A chi è intestato il mezzo?" — 6 RuoloButton:
    A me / A una persona deceduta / A un'altra persona / A una società o azienda /
    A un'associazione o ente / Il mezzo ha targhe straniere
  • Da qui parte la derivazione automatica della casistica

Step 2b — RAMO EREDI (solo se "persona deceduta")
  • "Qualcuno degli eredi ha rinunciato all'eredità?" Sì/No
  • Box giallo guida (testo lungo di Davide: quando usare l'opzione, rinuncia formale
    Notaio/Tribunale, chi ha rinunciato NON firma nulla, autocertificazione generata dall'app)
  • Stepper "Quanti sono gli eredi?" 1-10
  • ⚠️ Campo nomi rinunciatari RIMOSSO dal flusso (si raccoglierà in area personale)

Step 2c — RAMO SOCIETÀ (solo se "società")
  • "La società è fallita o in liquidazione?" Sì/No

Step 3 — IDENTIFICA VEICOLO (anno, km, marca, modello)
Step 4 — CAMBIO (solo per auto/minicar/furgone/pullman/camion/altro) — stile card uniformato
Step 5 — CONDIZIONI ⭐ 4 card-riga con icone azzurre e sub esplicative:
  • "È incidentata?" → Ha subito un incidente
  • "Cammina?" → Riesce a muoversi con le sue ruote e il suo motore (campo DB resta `marciante`)
  • "Va in moto?" → Il motore si avvia
  • "Mancano delle parti?" → Es. motore, ruote, portiere, catalizzatore, batteria
  • + Annotazioni opzionali

Step 6 — INDIRIZZO + SPAZIO CARRO ATTREZZI
Step 7 — TARGA
  • Box "Le targhe sono fisicamente sul mezzo?" Sì/No (se No → avviso denuncia smarrimento)
  • ⚠️ Per targhe straniere: box NASCOSTO, sottotitolo "Inserisci la targa estera così come appare sul mezzo"

Step 8 — CF DINAMICO ⚠️ SALTATO per targhe straniere
  • me → "Il tuo codice fiscale" (16 caratteri)
  • deceduto → "CF dell'intestatario deceduto"
  • altra_persona → "CF di chi risulta intestatario al PRA"
  • societa → "Partita IVA della società intestataria" (accetta 11 O 16)
  • associazione → "CF dell'associazione"

Step 9 — FOTO (gamification 4 foto, sheet iOS)

Step 10 — FERMO AMMINISTRATIVO ⚠️ SALTATO per targhe straniere
  • "Il mezzo ha un fermo amministrativo?" Sì / No / Non lo so

Step 11 — CONSEGNA ⚠️ SALTATO per non_intestatario e targhe straniere (delega non ammessa)
  • "Chi consegnerà il mezzo al demolitore?" Io stesso / Una persona delegata
  • Se delegato: nome + telefono + box info delega precompilata
  • ⭐ Rassicurazione sotto il telefono: "Lo useremo solo per avvisare il delegato
    e accordarci sul giorno del ritiro. Nessun altro utilizzo." (spesso compila il delegato stesso)

Step 12 — LIBRETTO (sì / denuncia / no)
Step 13 — CDC ⭐ SEMPLIFICATO (12/06) ⚠️ SALTATO per targhe straniere
  • Sottotitolo: "È il documento che dimostra chi è il proprietario. Attenzione: non è il libretto"
  • Box 💡 "Come capire quale hai": regola ottobre 2015 (prima=cartaceo con stemma ACI, dopo=digitale)
  • 4 opzioni: "Sì, ho quello cartaceo" / "Il mio è digitale" (sub: "Passaggio dopo ottobre 2015:
    il certificato è negli archivi digitali del PRA e non va consegnato al ritiro") /
    "L'ho smarrito, ho la denuncia" / "Non lo trovo o non so cosa sia" (sub: "Nessun problema:
    lo verifichiamo noi gratuitamente e ti spieghiamo come procedere")

Step 14 — ACCOUNT FINALE UNIFICATO ⭐⭐ (lo step Anagrafica è stato FUSO qui, 12/06)
  • Titolo "Ultimo passo!" (senza emoji)
  • Timeline "Cosa succede dopo" IN ALTO con 4 icone SVG (busta/fotocamera/penna/carro):
    1. Email di conferma → area personale
    2. Carichi i documenti: BASTA UNA FOTO FATTA COL TELEFONO
    3. Moduli da firmare? Te li prepariamo già compilati: li stampi, li firmi e basta
    4. Documenti ok → ritiro gratuito a domicilio
  • 4 campi con possessivi: "Il tuo nome e cognome" / "Il tuo numero di telefono"
    (+ rassicurazione icona telefono: "Lo usiamo solo per coordinare il ritiro...
    Nessuna chiamata commerciale") / "La tua email" / password
  • Bottone "Conferma e invia richiesta"
  • Striscia benefit: "Col tuo account gratuito hai:" Area personale · Chat col demolitore ·
    Certificato di Rottamazione (icone SVG)
  • Disclaimer terms + privacy
```

### Flusso targhe straniere (il più corto)
tipo veicolo → intestazione → identifica → cambio → condizioni → indirizzo → targa → foto → libretto → account

### ✅ COLLAUDO END-TO-END superato il 12/06/2026
3 pratiche test (iPhone, sito live) verificate su DB: persona_fisica con delegato+fermo non_so ✅, societa con P.IVA 11 cifre ✅, targhe_straniere con tutti i campi non applicabili a null ✅. Le 3 pratiche restano nel DB come cavie per la checklist documenti (pulire prima del lancio).

### Personalizzazione dinamica per tipo veicolo
Invariata: banner, titoli, articoli, generi (isFemminile: autovettura/minicar/imbarcazione), tipoAltro ovunque, helper functions (articolo, articoloDel, pronomeTuo, nomeVeicolo, veicoloHaCambio, ICONE_VEICOLO, getStepMeta — ora con parametro `intestazione` per i meta dinamici di cf e targa).

### Ottimizzazioni mobile (25/05, sempre valide)
Anti-zoom iOS (text-base 16px), inputMode corretti, NO scrollIntoView automatico, viewport meta, theme color blu, bottoni Continua mai disabilitati (validazione al click con banner errore + bordo rosso), normalizzazione targa/CF, formattazione km, step foto con gamification e sheet iOS.

## 5.3 Pagine FATTE ✅

- **Home `/`**: logo, CTA, pills benefit
- **Login `/login`**: email + password, redirect per ruolo (demolitore/commerciante DA AGGIUNGERE)
- **Flusso `/inizia`**: vedi 5.2 — COMPLETO E COLLAUDATO ⭐⭐⭐
- **`/dashboard`**: lista pratiche cliente (verificata integra il 12/06)
- **`/dashboard/[id]`**: dettaglio 3 tab (Documenti / Stato / Chat) — Tab Documenti DA RISTRUTTURARE col sistema checklist
- **`/admin`**: dashboard con stats e filtri
- **`/admin/copertura`**: mappa strategica Italia
- **`/admin/demolitori` + [id]**: gestione demolitori con MappaComuni
- **`/admin/pratiche/[id]`**: approvazione granulare + 4 card destino (chat DA AGGIUNGERE; nuovi campi casistica DA MOSTRARE)

## 5.4 Backend / API

**`/api/assegna-pratica/route.ts`** — Endpoint algoritmo assegnazione (DA REVISIONARE).

## 5.5 Verifica PRA ACI — ABBANDONATA per ora

Bloccante: reCAPTCHA su `iservizi.aci.it`. Opzioni future: bookmarklet/estensione Chrome con captcha manuale, oppure Openapi.it Visura Targa PRA (~6€/chiamata). Riprendere quando il flusso cliente sarà stabile.

---

# 🎨 PARTE 6 — DESIGN SYSTEM

> Approvato il 22/05/2026, esteso a maggio-giugno 2026 con il flusso `/inizia` mobile-first.

## 6.1 Colori principali

- **Blu navy primario** (topbar dashboard, sub-header, tab attivi): `#0d2144`
- **Blu primario** (bottoni CTA, link, banner): `bg-blue-600` con hover `bg-blue-700`
- **Banner blu gradient** (`/inizia`): `bg-gradient-to-r from-[#1d4ed8] to-[#2563eb]`
- **Theme color mobile** (barra browser): `#2563eb`
- **Sfondo dashboard**: `bg-[#f0f4f8]`
- **Sfondo flusso `/inizia`**: `linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)` (sfumato blu/viola)
- **Bianco card**: `bg-white` con `border border-gray-200`

## 6.2 Colori secondari per stati

- **Verde** (positivo, successo): `bg-green-50`, `border-green-300`, `text-green-700`
- **Giallo/Ambra** (attesa, attenzione): `bg-amber-50`, `border-amber-200`, `text-amber-800`
- **Rosso** (problema, errore): `bg-red-50`, `border-red-300`, `text-red-700`
- **Grigio** (neutro): `bg-gray-50`, `border-gray-200`, `text-gray-500`
- **Azzurro sky** (info / "cosa succede dopo" / box 💡): `bg-sky-50`, `border-sky-200`, `text-sky-800`

Toggle Sì/No con colore semantico: verde = risposta positiva per il veicolo, rosso = problema.
Spazio carro attrezzi: verde "Accesso libero" / ambra "Spazio stretto" / rosso "Non passa".

## 6.3 Tipografia

- **Font**: default sistema (Tailwind sans), NO font custom
- **Titoli pagina**: `text-xl font-semibold text-gray-900` (`/inizia`) o `text-xl font-bold` (dashboard)
- **Titoli card**: `text-sm font-semibold text-gray-800`
- **Body**: `text-sm text-gray-700` · **Caption**: `text-xs text-gray-500` · **Micro**: `text-[10px]`/`text-[11px]`

### ⚠️ REGOLA MOBILE CRITICA
- **Tutti gli input/textarea**: `text-base` (16px, anti-zoom iOS) + `text-gray-900` + `placeholder:text-gray-400`

## 6.4 Componenti standard

- **Topbar dashboard** (sticky): `bg-[#0d2144] px-4 py-3`
- **Banner blu `/inizia`**: [← Indietro bianco/85] [icona in box w-10 + PASSO X DI N + titolo dinamico]
- **Box "Pensiamo a tutto noi"** (step 1): gradient blu, icona check, "In base alle tue risposte ti diremo quali documenti preparare"
- **Card**: `rounded-2xl p-4` (dashboard) / `rounded-3xl shadow-lg p-7` (`/inizia`)
- **CTA primario `/inizia`**: `bg-blue-600 py-4 rounded-xl font-semibold text-base active:scale-[0.99]` — MAI disabilitato
- **ErrorBadge**: `bg-red-50 border-red-200 rounded-xl p-3 text-sm text-red-800` con ⚠️
- **RuoloButton** (intestazione/libretto/cdc/consegna/fermo): bollino blu con icona SVG (w-10) | label + sub | check rotondo; selezionato = bordo blu + sfondo blu chiaro + ✓ pieno
- **Card-riga condizioni** 🆕 (12/06): `border-[1.5px] bg-gray-50 rounded-xl p-3` con icona azzurra w-9 + label semibold + sub + pill Sì/No a destra (px-3, min-w-[52px]); in errore: `border-red-300 bg-red-50/30`
- **Box 💡 spiegazione** 🆕 (step CDC): `bg-sky-50` con barra blu a sinistra, testo con grassetti che spiega come riconoscere il documento
- **Rassicurazione campo telefono** 🆕: `<p>` con icona SVG telefono blu 12px + testo `text-[11px] text-gray-500` sull'uso del numero
- **Timeline "Cosa succede dopo"** 🆕 (step account, in alto): `bg-sky-50 rounded-xl`, 4 righe con icona SVG in box bianco w-6 (busta/fotocamera/penna/carro)
- **Striscia benefit account** 🆕: titoletto "Col tuo account gratuito hai:" + 3 chip icona+testo (Area personale · Chat col demolitore · Certificato di Rottamazione)
- **Stepper numerico** (numero eredi): − / numero grande / + (1-10)
- **Sheet popup iOS** (step foto): overlay black/40 + sheet slide-up
- **Tab bar dashboard**: container bianco rounded-2xl, attivo `bg-[#0d2144] text-white`
- **Form input**: `border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 focus:border-blue-500 focus:bg-white placeholder:text-gray-400`
- **Validazione live CF/P.IVA**: contatore a destra (0/16 o 0/11), messaggio dinamico colorato, bordo verde quando valido

## 6.5 Spaziatura

- Container: `max-w-2xl px-3 py-3` (dashboard) / card `/inizia`: `max-w-md p-7`
- Gap: `gap-3` tra card, `gap-2` interno

## 6.6 Regole d'oro

1. **Mobile-first**: touch-friendly (min 44px)
2. **No emoji nell'interfaccia funzionale**: SVG colorati (12/06: rimossi anche da "Ultimo passo!" e dal box cosa-succede-dopo)
3. **Coerenza colori semantici**
4. **Personalizzazione tipo veicolo OVUNQUE** + generi corretti
5. **Stato sempre visibile** · empty state amichevoli
6. **Input `text-base` + `text-gray-900` + `placeholder:text-gray-400`** sempre
7. **Bottoni `/inizia` mai disabilitati**: validazione al click
8. **Una sola cosa per pagina** nei mini-step
9. **Gamification dove possibile** (foto)
10. **NO scrollIntoView automatico** su input
11. **Niente trattini "—" nei titoli bottoni**
12. ⭐ **Niente gergo tecnico/burocratico nei testi utente** (12/06): "Cammina?" non "marciante", spiegare il CDC con la regola ottobre 2015, sub esplicative sotto le domande. Il cliente medio non sa cosa sia un CDC.
13. ⭐ **Rassicurare sui dati sensibili** (12/06): ogni campo telefono ha la spiegazione dell'uso. La gente è scettica a dare il numero.
14. ⭐ **Possessivi nei label quando serve distinguere le persone** (12/06): "Il tuo nome" vs "Nome del delegato" — spesso compila il delegato stesso.
15. ⭐ **La pagina finale è una guida, non un modulo** (12/06): timeline cosa-succede-dopo in alto, campi al centro, benefit sotto il bottone. Anti-ansia: "basta una foto", "te li prepariamo già compilati".

---

# 🗣️ PARTE 7 — COMUNICAZIONE CON DAVIDE

> Davide è imprenditore, NON sviluppatore. Lavora con AI per costruire la piattaforma.

## 7.1 Stile di lavoro preferito

- **Istruzioni passo-passo brevissime**: uno step alla volta, "scrivimi fatto"
- **Niente spiegazioni tecniche se non chiede** — linguaggio SEMPLICISSIMO, zero gergo (anche parole come "cornetta" o riferimenti datati confondono: spiegare sempre)
- **Risposte compatte, no preamboli**
- **File completi sostituibili** preferiti ("ridammi tutto il codice") MA per modifiche piccole su riga singola va bene **Ctrl+H** — ⚠️ i Ctrl+H multiriga gli falliscono spesso: in caso di dubbio dare il file completo
- ⭐ **REGOLA FONDAMENTALE (memorizzata)**: prima di modificare o rigenerare codice, SEMPRE proporre la modifica e attendere conferma esplicita. Davide vuole pensarci prima.
- **Anteprime visive** (visualize widget) PRIMA di ogni cambio di design, con varianti A/B/C tra cui scegliere — Davide le adora
- **Comandi PowerShell** come stringhe pronte da copiare
- **Test su iPhone vero** via URL Vercel live (localhost non accessibile da telefono)

## 7.2 Stack interazione

- **Editor**: VS Code (Ctrl+P per aprire file, Ctrl+A → Ctrl+V → Ctrl+S)
- **Terminale**: PowerShell di VS Code
- **Git**: `git add . ; git commit -m "..." ; git push origin main`
- **DB**: Supabase SQL Editor (dare SQL pronto da incollare, spiegato in italiano semplice)
- **Verifica push**: `git status` (up to date = ok; changes not staged = manca add/commit; ahead = manca push)

## 7.3 Sequenza di lavoro tipica

```
1. Davide dice cosa serve
2. Claude propone (eventuale ask_user_input per scelte, anteprima visiva per design)
3. Davide CONFERMA esplicitamente
4. Claude prepara file completo (create_file + present_files) o Ctrl+H singola riga
5. Davide applica → Problems = 0 → push → test su iPhone
6. Screenshot o feedback → correzioni → prossimo task
```

## 7.4 Convenzioni e note operative

- Errori React loop → `npm run dev` · Errori TS "fantasma" → Restart TS Server
- File "vuoto" → controllare contenuto prima di diagnosi complicate
- Dopo ALTER TABLE: se errori colonna → `NOTIFY pgrst, 'reload schema';`
- Davide non ricorda i percorsi → indicare percorso completo + come aprirlo (Ctrl+P)
- ⚠️ Build Vercel può fallire SILENZIOSAMENTE per mappe/switch non esaustivi (caso storico: `furgone` mancante in `nomeCapitalizzato`). Quando si aggiunge un valore a un tipo, verificare TUTTE le mappe che lo usano.
- Segnali VS Code: "M" arancione = da committare, numero rosso PROBLEMS = errori TS

---

# 📋 PARTE 8 — STATO ATTUALE (12 giugno 2026)

## 8.1 ✅ FATTO

### ⭐⭐⭐ SISTEMA CASISTICHE COMPLETO (5-12 giugno 2026) — COLLAUDATO

- ✅ **Documento casistiche di Davide** analizzato: 8 casi + 2 integrazioni (fermo, targhe smarrite)
- ✅ **types/pratica.ts**: tipi `Intestazione`, `Casistica`, helper `derivaCasistica`, `delegaAmmessa`, `fermoApplicabile`
- ✅ **DB**: colonne `casistica` (con CHECK), `fermo_amministrativo`, `targhe_presenti`, `delegato_nome`, `delegato_telefono`, `numero_eredi`, `nomi_rinunciatari`; CF/certificato/libretto resi NULLABLE
- ✅ **Step Intestazione** (passo 2): 6 opzioni RuoloButton, sostituisce il vecchio "Ruolo"
- ✅ **Ramo eredi**: rinuncia sì/no + box guida giallo (testo Davide) + stepper eredi 1-10 (campo nomi rinunciatari rimosso dal flusso → area personale)
- ✅ **Ramo società fallita**
- ✅ **Step Fermo amministrativo** (sì/no/non lo so)
- ✅ **Step Consegna** (io stesso/delegato) con nome+telefono delegato e rassicurazione uso telefono
- ✅ **Step CF dinamico** per intestazione (P.IVA 11 cifre per società, label diverse per caso)
- ✅ **Targhe straniere**: saltati CF, CDC, fermo, consegna, box targhe; sottotitolo targa adattato
- ✅ **Step CDC semplificato**: "non è il libretto", box 💡 regola ottobre 2015, 4 opzioni chiare, "lo verifichiamo noi gratuitamente"
- ✅ **Step Condizioni a card-riga**: icone azzurre, "Cammina?" al posto di "marciante", sub esplicative, batteria negli esempi
- ✅ **Step Cambio** uniformato allo stile RuoloButton
- ✅ **Pagina finale unificata** (Anagrafica FUSA in Account): "Ultimo passo!" senza emoji, timeline guida in alto con SVG, 4 campi con possessivi, rassicurazione telefono, striscia "Col tuo account gratuito hai:", disclaimer
- ✅ **🧪 COLLAUDO END-TO-END superato** (12/06): 3 pratiche test da iPhone verificate su DB (persona_fisica con delegato, societa con P.IVA, targhe_straniere con null corretti)

### ⭐⭐ SISTEMA DOCUMENTI DINAMICI — Fondamenta (12 giugno 2026)

- ✅ **Tabelle create**: `casistiche_documenti` (catalogo) + `pratica_documenti_checklist` (stato) con RLS + UNIQUE index + GRANT espliciti — vedi PARTE 3.4
- ✅ **Decisioni prese**: approvazione per singolo documento + bottone "Approva tutti"; moduli PDF = scarica (tracciato) → stampa/firma → carica FOTO del firmato → originale al ritiro

### Storico (maggio 2026)
- ✅ Refactoring completo `/inizia` mobile-first (mini-step, personalizzazione tipo veicolo, gamification foto, autocomplete Maps custom, normalizzazioni, validazioni live, anti-zoom iOS)
- ✅ Dashboard cliente (lista + dettaglio 3 tab, upload, anteprime, chat persistente)
- ✅ Area admin (dashboard, approvazione granulare, destino, demolitori, mappe, GeoJSON)
- ✅ Tabelle e RLS storage, algoritmo assegnazione (da revisionare), Google Maps keys

## 8.2 ⏳ PENDING — In ordine di priorità

### 🔥🔥🔥 STEP 1 — SISTEMA DOCUMENTI DINAMICI (in corso)

**▶️ PROSSIMO PASSO IMMEDIATO: popolare il catalogo `casistiche_documenti` col CASO 1 (persona_fisica)**
- Claude presenta a Davide un'anteprima visiva della checklist come la vedrebbe il cliente, documento per documento, con tutte le condizioni (cdc cartaceo/smarrito, targhe assenti, fermo, delegato)
- Davide corregge/approva → INSERT nel catalogo
- Documenti caso 1 (dal documento casistiche): libretto, CDC, carta d'identità (o patente), CF/tessera sanitaria + denunce smarrimento alternative; se delegato → PDF DELEGA_CONSEGNA_VEICOLO_PRIVATO + CI/CF delegato; se fermo sì → DICHIARAZIONE_SOSTITUTIVA_STATO_VEICOLO_CON_FERMO_AMMINISTRATIVO; se targhe assenti → denuncia smarrimento targhe

Poi, in ordine:
1. **Popolare gli altri 7 casi** (stesso metodo: anteprima → correzioni → INSERT)
2. **Generazione automatica checklist** alla creazione pratica
3. **Dashboard cliente — pagina documenti**: checklist con stato per documento, upload foto/PDF, barra progresso "X/Y pronti", PDF autocompilati da scaricare (Davide fornirà i template DELEGA_* e DICHIARAZIONI_*), sezione "da consegnare al ritiro", notifica "Sei pronto per il ritiro!"
4. **Admin**: stato preparazione cliente, approva/rifiuta singolo documento + "Approva tutti", notifica nuovi upload
5. **Pulizia finale**: rimuovere `ruolo_richiedente`/`eredita` da types e DB, eliminare le 3 pratiche test, eventuale refactoring step in file separati

### 🔥 STEP 2 — FINIRE LA DASHBOARD CLIENTE
- Testare tab Stato e Chat con pratica vera, mostrare i nuovi campi casistica (fermo, delegato, eredi...) nel dettaglio

### 🔥 STEP 3 — PAGINA ADMIN DETTAGLIO PRATICA
- Chat funzionante (messaggi_chat), mostrare i nuovi campi casistica/fermo/delegato/eredi

### 🔥 STEP 4 — REVISIONE ALGORITMO + ASSEGNAZIONE MANUALE
- Fix velocità storica, colonne mancanti, mappa scelta manuale, GOOGLE_MAPS_SERVER_KEY su Vercel

### 🔥 STEP 5 — SISTEMA RECENSIONI
- Tabella + stato + pagina cliente bloccante + integrazione algoritmo + push Google Maps

### 🆕 STEP 6 — TEST CROSS-PLATFORM ANDROID
- Chrome DevTools / amici / BrowserStack: tastiere, scroll, sheet foto, autocomplete

### 🔜 STEP SUCCESSIVI
- Verifica PRA ACI (bookmarklet o Openapi ~6€), pagina Polizia Locale veicoli abbandonati, invito email demolitore + /imposta-password, login multi-ruolo completo, dashboard demolitore, notifiche in-app + SMS (Twilio) + push, messaggi preimpostati admin, PWA

### 🔮 PROSSIMI FLUSSI
- Flusso B (asta demolitori), Flusso C (commercianti), acquisto NoiDemoliamo, Flusso D (/vendi-auto), area commercianti, fatturazione, statistiche

## 8.3 ⚠️ Problemi noti / cosmetici

- Errore RLS minore in `/inizia` (NON blocca)
- Console "1 Issue" generica → da indagare
- Test Android: mai fatto su device reale
- 3 pratiche test nel DB (ciccio / Mario Verdi / Sirio Valenti) → utili come cavie per la checklist, eliminare prima del lancio

## 8.4 ⏰ PROMEMORIA SCADENZE FUTURE

- 🗓️ **Supabase free tier**: aprire la dashboard ogni 5-6 giorni o il progetto va in pausa. Al lancio: Supabase Pro (~25$/mese).
- 🗓️ **30 OTTOBRE 2026 — Supabase Data API change**: le NUOVE tabelle create dopo questa data NON saranno esposte automaticamente alla Data API. Servirà GRANT esplicito dopo ogni CREATE TABLE: `GRANT SELECT, INSERT, UPDATE, DELETE ON nome_tabella TO authenticated, anon;` (adattare i permessi al caso) + RLS come sempre.
  - ✅ Già applicato preventivamente a `casistiche_documenti` e `pratica_documenti_checklist` (12/06/2026).
  - ⚠️ Da ricordare per: `recensioni`, `aste`, `offerte_asta`, ecc.

---

# 💡 PARTE 9 — DECISIONI BUSINESS CHIAVE

(1-41: vedi storico — velocità come principio cardine, approvazione granulare, chat in-app, mobile-first, mini-step, gamification foto, normalizzazione input, CDC esteso, personalizzazione tipo veicolo, bottoni mai disabilitati, ecc. Tutte ancora valide.)

**Nuove decisioni giugno 2026:**

42. ⭐ **Sistema casistiche con derivazione automatica**: il cliente NON sceglie la casistica — risponde a domande semplici ("A chi è intestato?") e il sistema la deriva. 8 casistiche + 2 integrazioni trasversali (fermo, targhe smarrite).
43. **Intestazione come passo 2**: subito dopo il tipo veicolo, così i rami (eredi, società) si aprono presto e il flusso si adatta.
44. **Delega NON ammessa** per non_intestatario e targhe_straniere (vincolo normativo dal documento casistiche).
45. **Targhe straniere = flusso minimo**: il mezzo non è al PRA italiano → niente CF, niente CDC, niente fermo, niente delega, niente box targhe. Le targhe vengono rimosse e riconsegnate per la cancellazione all'estero.
46. **P.IVA per le società**: il campo CF accetta 11 cifre (P.IVA) o 16 (CF) quando l'intestatario è una società.
47. **Nomi rinunciatari NON chiesti nel flusso**: il cliente all'inizio è diffidente — si raccolgono dopo, nell'area personale (colonna DB già pronta).
48. **Catalogo documenti come DATI, non codice**: per cambiare i documenti richiesti si modifica una riga su Supabase, niente deploy.
49. **Approvazione documenti**: per singolo documento (rifiuto con motivo) + bottone "Approva tutti" per la velocità.
50. **Moduli PDF autocompilati**: scarica (tracciato `scaricato_il`) → stampa e firma → carica una FOTO del firmato (l'admin VEDE che l'ha fatto) → consegna l'ORIGINALE al ritiro. Semplice e intuitivo.
51. **Niente gergo nei testi utente**: "Cammina?" non "marciante"; il CDC spiegato con la regola ottobre 2015; sub esplicative ovunque. Il campo DB può chiamarsi `marciante`, l'utente legge parole sue.
52. **Rassicurazione sull'uso del telefono** ad ogni campo telefono (la gente è scettica; spesso compila il delegato).
53. **Step finale unificato**: contatti + account in una sola pagina con possessivi ("Il tuo...") — meno schermate, zero ambiguità su di chi sono i dati.
54. **La promessa della pagina finale è la roadmap**: "basta una foto", "moduli già compilati", "documenti ok → ritiro" — è esattamente ciò che il sistema documenti deve mantenere.

---

# 🚀 PARTE 10 — COME LAVORARE NELLA NUOVA CHAT

> Istruzioni per Claude nella nuova chat dopo aver letto questo file.

1. **Leggi TUTTO questo file**, poi conferma a Davide di aver capito
2. **Riprendi dal punto 8.2 STEP 1**: il prossimo passo immediato è **popolare il catalogo `casistiche_documenti` col Caso 1** (anteprima visiva → correzioni di Davide → INSERT)
3. ⭐ **REGOLA FONDAMENTALE**: prima di modificare o rigenerare codice, SEMPRE proporre la modifica e attendere conferma esplicita di Davide
4. **Rispetta il design system** (parte 6) e le **regole mobile critiche** (input text-base + text-gray-900, mai bottoni disabilitati, mai scrollIntoView)
5. **Stile comunicazione** (parte 7): passo-passo, linguaggio semplicissimo, zero gergo, anteprime visive prima dei cambi design, file completi per modifiche grandi
6. **Push**: `git add . ; git commit -m "..." ; git push origin main` — verificare con `git status`
7. **Mobile testing**: iPhone reale su URL Vercel live
8. **Non assumere mai cose nuove**: se non sei sicuro, chiedi
9. **A fine sessione**: proporre a Davide di aggiornare questo file

---

# 📞 PARTE 11 — INFO PROGETTO

- **Founder**: Davide Di Viesto
- **Email admin**: ddiviesto@gmail.com
- **GitHub**: ddiviesto/NoidemoliaMo
- **URL live**: https://noi-demoliamo.vercel.app
- **Supabase URL**: https://egsufeczoroxqnagzqfq.supabase.co
- **Cartella locale**: `C:\Users\Davide Di Viesto\Desktop\OneDrive\Noi_Demoliamo\Codex_Noi_Demoliamo\NoiDemoliamo`
- **Davide device principale**: iPhone (test mobile) + HP PC (sviluppo)

---

**Fine documento. Ultimo aggiornamento: 12 giugno 2026.**