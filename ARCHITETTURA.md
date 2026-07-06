# NoiDemoliamo — Architettura completa

> Documento di riferimento del progetto. Aggiornato al **6 luglio 2026**.
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
- **Styling**: Tailwind CSS + style inline nei componenti più recenti (no font custom)
- **Backend**: Supabase (database PostgreSQL + Auth + Storage)
- **Hosting**: Vercel (produzione)
- **Repository**: GitHub `ddiviesto/NoiDemoliamo`
- **Live**: https://noi-demoliamo.vercel.app

## 2.2 Cartella locale e ambiente sviluppo

**Cartella progetto**: `C:\Progetto_NoiDemoliamo`

⚠️⚠️ **STORIA IMPORTANTE (fine giugno/luglio 2026)**: il progetto stava in OneDrive e OneDrive **bloccava i file di git** (loop infiniti su `.git/objects`, permission denied). Dopo un incidente in cui la cartella `.git` è stata eliminata per errore (recuperato tutto ri-clonando da GitHub: il push era al sicuro), il progetto è stato **spostato definitivamente in `C:\Progetto_NoiDemoliamo`, FUORI da OneDrive**.
- **MAI rimettere il progetto dentro cartelle sincronizzate** (OneDrive, Dropbox, Google Drive)
- Il vecchio percorso `C:\Users\...\OneDrive\...` è OBSOLETO
- Git ora funziona normalmente, `gc` automatico incluso (il cerotto `gc.auto 0` non serve più: il `.git` attuale è un clone fresco)
- ⚠️ Se dopo uno spostamento/clone `npm run dev` va in panico Turbopack ("FATAL: An unexpected Turbopack error"): fermare il server, `Remove-Item -Recurse -Force .next`, riavviare — la cache `.next` conteneva percorsi vecchi

**Strumenti che Davide usa**:
- **Claude Code (estensione VS Code)** 🆕 — dal 3/07/2026 il metodo di lavoro principale: Claude legge e modifica i file direttamente, esegue git, sempre chiedendo conferma (vedi PARTE 7)
- **VS Code** per editing
- **PowerShell** come terminale Windows
- **Supabase SQL Editor** per query e modifiche DB
- **Browser Chrome** per testing (F12 → Ctrl+Shift+M per modalità mobile)
- **iPhone** per testing reale (Davide è su iPhone, PC è HP)

**Comandi essenziali**:
```powershell
# Avviare il server di sviluppo
npm run dev

# Push veloce all in one
git add . ; git commit -m "messaggio" ; git push origin main

# Verificare contenuto cartella
dir app\dashboard

# Vedere struttura completa del progetto (salva in struttura.txt)
tree /F /A | findstr /V "node_modules" > struttura.txt
```

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
⚠️ `.env.local` non è tracciato da git (è sopravvissuto intatto al re-clone). Claude Code non deve mai stamparne il contenuto.

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
(Caso reale di luglio: "Failed to fetch" alla creazione pratica quasi certamente causato dalla pausa del progetto — ora gli errori sono tradotti in italiano, vedi 5.2.)

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

`casistiche_documenti`, `collaboratori`, `commercianti`, `demolitori`, `demolitori_comuni`, `documenti`, `documenti_approvazione`, `fatture`, `foto_pratiche`, `impostazioni`, `interessi_commercianti`, `messaggi`, `messaggi_chat`, `notifiche`, `pratica_documenti_checklist`, `pratiche`, `solleciti`, `utenti`, `veicoli_vendita`, `veicoli_vendita_foto`

Inoltre tabelle anagrafiche: `comuni`, `province`, `regioni` (intoccabili, usate per autocomplete e mappa).

## 3.2 Tabella `pratiche` — 50+ colonne

Tabella centrale del progetto. Contiene tutte le pratiche di demolizione.

**Colonne principali**:
- **Identificativi**: `id` (uuid), `user_id` (uuid), `creato_il` (timestamp)
- **Veicolo**: `targa`, `tipo_mezzo`, `tipo_mezzo_altro` (text), `marca`, `modello`, `anno`, `km`, `incidentato` (bool), `marciante` (bool), `va_in_moto` (bool), `parti_mancanti` (bool), `note_veicolo`, `tipo_cambio` (text: manuale/automatico/non_so)
- **Indirizzo**: `indirizzo_ritiro`, `comune_ritiro`, `provincia_ritiro`, `cap_ritiro`, `lat`, `lng`, `spazio_carro_attrezzi` (text: libero/stretto/no), `spazio_carro_attrezzi_note` (text libero)
- **Cliente**: `codice_fiscale` (⚠️ NULLABLE — null per targhe straniere; per le società contiene la P.IVA a 11 cifre), `nome_richiedente`, `telefono`
- **SISTEMA CASISTICHE (giugno 2026)**: `casistica` (text con CHECK sugli 8 codici, vedi 3.3), `fermo_amministrativo` (si/no/non_so, null se non applicabile), `targhe_presenti` (bool, null per targhe straniere), `delegato_nome`, `delegato_telefono` (null se consegna in prima persona), `numero_eredi` (int, solo casi eredi), `nomi_rinunciatari` (text — colonna pronta ma NON compilata dal flusso: si raccoglierà nell'area personale)
- **Documenti dichiarati**: `libretto` (si/denuncia/no — NULLABLE), `certificato_proprieta` (NULLABLE; CHECK ammette digitale/cartaceo/documento_unico/smarrito/nessuno ma la UI attuale ne propone 4: digitale, cartaceo, smarrito, nessuno)
- **Legacy da rimuovere in pulizia finale**: `ruolo_richiedente`, `eredita` (sostituiti dal sistema casistiche)
- **Workflow**: `demolitore_id`, `data_ritiro_prevista`, `data_certificato_rottamazione`, `data_certificato_pra`, `stato`
- **Scadenze**: `urgente`, `scadenza_proposta_ritiro`, `scadenza_cert_rottamazione`, `scadenza_cert_pra`, `assegnazione_manuale`

### Valori ammessi per `tipo_mezzo` (NO check constraint, text libero):
```
autovettura, motoveicolo, ciclomotore, minicar, furgone,
imbarcazione, pullman, camion, velivolo, altro
```

## 3.3 LE 8 CASISTICHE DI DEMOLIZIONE (cuore del sistema)

⭐ **FONTE UFFICIALE**: `docs/casistiche/Casistiche_Demolizione.md` (nel repo, collegato da `CLAUDE.md` → da leggere sempre). È la copia di lavoro autorevole del documento di Davide: elenca per ogni casistica i documenti da caricare, da consegnare al ritiro, i moduli PDF e le 2 integrazioni (fermo, targhe smarrite). Ogni pratica viene classificata automaticamente dal flusso `/inizia` (funzione `derivaCasistica` in `types/pratica.ts`) e salvata in `pratiche.casistica`:

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

## 3.4 SISTEMA DOCUMENTI DINAMICI — ✅ COMPLETO E COLLAUDATO (fine giugno 2026)

Architettura "ricettario + lista della spesa": un **catalogo** statico di regole + una **checklist** generata per ogni pratica.

### `casistiche_documenti` (IL CATALOGO)
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
✅ **POPOLATO: 89 documenti su tutte le 8 casistiche** (verificati con Davide).

⭐ **Documenti FRONTE/RETRO (rifatto luglio 2026)**: i documenti a due lati hanno **due caselle separate "Fronte" e "Retro"** nella pagina cliente (+ link "Ho un unico file con fronte e retro" per chi ha uno scan/PDF unico). L'invio in verifica è bloccato finché mancano entrambi i lati. Il riconoscimento NON dipende più dalla parola "retro" nella descrizione (metodo fragile, abbandonato): ora c'è una **lista ufficiale di codici** in `TabDocumenti.tsx` (`CODICI_FRONTE_RETRO` + prefissi `CARTA_IDENTITA_*` / `TESSERA_SANITARIA_*`), presa dal file casistiche. Documenti fronte/retro: libretto, libretto estero, certificato di proprietà cartaceo, carta d'identità/patente, codice fiscale/tessera sanitaria. **L'atto di morte NON è fronte/retro.** Tutti gli altri documenti (denunce, visure, autorizzazioni…) restano a **caricamento libero** (1 o più pagine). Il `lato` ('fronte'/'retro') è salvato nel JSON di `file_url`.

### `pratica_documenti_checklist` (LO STATO — una riga per documento per cliente)
```
id              uuid    PK
pratica_id      uuid    FK pratiche (ON DELETE CASCADE)
documento_id    uuid    FK casistiche_documenti
indice_erede    int     Erede 1, Erede 2... (null per il resto)
stato           text    'da_fare' | 'caricato' | 'approvato' | 'rifiutato'
file_url        text    ⭐ ARRAY JSON di file: [{"url": "...", "nome": "..."}]
scaricato_il    tstz    per i moduli PDF: quando il cliente l'ha scaricato
caricato_il     tstz
nota_admin      text    es. 'Foto sfocata, ricaricala'
aggiornato_il   tstz
```
UNIQUE INDEX su (pratica_id, documento_id, COALESCE(indice_erede,0)).
RLS: SELECT/INSERT/UPDATE configurate. GRANT espliciti già applicati.

⭐ **Convenzione `file_url`**: contiene un **array JSON** `[{url, nome}]` per supportare più file per documento (fronte/retro, più pagine) senza cambiare schema. Helper `leggiFile()`/`scriviFile()` in `TabDocumenti.tsx` (gestiscono anche il fallback stringa semplice legacy).

### ✅ TRIGGER DI GENERAZIONE AUTOMATICA ("commesso automatico")
Trigger PostgreSQL su `pratiche`: alla creazione della pratica legge `casistica` + risposte (CDC, targhe, fermo, delegato, n° eredi) e **genera automaticamente le righe checklist** dal catalogo. I documenti `per_erede` sono duplicati per `indice_erede`.
✅ Verificato end-to-end con test SQL (incluso caso complesso `eredi_accettato` multi-erede) e con pratica reale dal flusso ("EEEEE", vedi 8.1).

### ⭐ FLUSSO FRONTE/RETRO (deciso e implementato il 3/07/2026)
1. Il cliente carica un file (foto o PDF): viene salvato SUBITO in `file_url`, ma **lo stato NON cambia** (resta `da_fare` o `rifiutato`) — il documento rimane "in preparazione" con miniature visibili e bollini attivi
2. Se il catalogo dice fronte/retro (parola "retro" nella descrizione) la UI suggerisce "manca il retro?"
3. Solo il bottone verde **"Ho finito, invia in verifica"** imposta `stato='caricato'` + `caricato_il` + azzera `nota_admin`
4. Eliminazione file: se il documento era `caricato` e si elimina l'ultimo file → torna `da_fare`; se era in preparazione lo stato non cambia. Elimina sia dal bucket che dal record.
5. Il cliente può eliminare file/foto SOLO negli stati in `STATI_MODIFICABILI_DA_CLIENTE` (costante in TabDocumenti: in_attesa_documenti, in_attesa_approvazione_admin, documenti_parzialmente_approvati, da_assegnare, in_attesa_assegnazione, in_assegnazione_manuale)

### Come funziona il ciclo completo
1. Creazione pratica → trigger genera checklist ✅
2. Cliente carica ogni documento (foto col telefono, flusso fronte/retro) ✅
3. Moduli PDF autocompilati: scarica (tracciato `scaricato_il`) → stampa/firma → carica FOTO del firmato → originale al ritiro (⏳ in attesa dei template da Davide)
4. **Approvazione admin per SINGOLO documento** (rifiuto con motivo in `nota_admin`) + bottone **"Approva tutti"** — ⏳ PAGINA ADMIN DA COSTRUIRE (prossimo task)
5. I documenti con `richiede_consegna=true` compongono la lista "Da portare al ritiro" ✅ (box scuro collassabile in TabDocumenti)

## 3.5 Tabella `documenti` (legacy)

Documenti ufficiali del vecchio sistema. Sostituita da `pratica_documenti_checklist` per le pratiche nuove; mantenuta per compatibilità con le pratiche storiche. Da valutare migrazione/dismissione in pulizia finale.

## 3.6 Tabella `foto_pratiche`

Foto **del veicolo**. `id`, `pratica_id`, `url` (bucket foto-pratiche), `caricato_il`.
Le foto sono eliminabili dal cliente (con conferma) negli stati modificabili: si elimina sia il file dal bucket che la riga.

## 3.7 Tabella `documenti_approvazione` (legacy)

Tracking granulare del vecchio sistema. TabDocumenti la legge ancora per lo stato approvazione delle FOTO veicolo (chiave `foto:{id}`). Il nuovo sistema documenti ha l'approvazione integrata nello `stato` della checklist.

## 3.8 Tabella `messaggi_chat`

Chat persistente tra cliente, admin, demolitore, commerciante.
`id`, `pratica_id`, `mittente_id`, `mittente_tipo` ('cliente'|'admin'|'demolitore'|'commerciante'), `testo`, `letto`, `creato_il`.
⚠️ Real-time non implementato — messaggi appaiono ricaricando.

## 3.9 Tabella `impostazioni`

Chiave-valore. Es: `max_pratiche_aperte_demolitore=15`

## 3.10 Tabella `demolitori`, `demolitori_comuni`, `demolitori_tariffe`

- `demolitori`: anagrafica. Campi professionali (agg. 6/07/2026): `ragione_sociale`, `piva`, `codice_sdi`, `indirizzo`/`citta`/`provincia`/`cap`/`lat`/`lng` (da Google autocomplete), `telefono_fisso`, `titolare_nome`/`titolare_cellulare`, `referente_nome`/`referente_cellulare`, `email_assegnazione`, `email_aziendale`, `pec`, `stato` (attivo/in_attesa/sospeso), `fee_per_pratica` (fee BASE), `contratto_firmato`, `velocita_media_giorni`.
- `demolitori_comuni`: copertura geografica (demolitore_id, comune, provincia [NOME intero], tipo: 'regione'|'provincia'|'provincia_esclusa'|'comune_incluso'|'comune_escluso'). Impostata dalla mappa `MappaComuni`.
- ⭐ `demolitori_tariffe` (nuova, 6/07/2026): tariffe speciali per zona (id, demolitore_id, tipo 'regione'|'provincia'|'comune', nome, fee). **Regola fatturazione (più specifico vince)**: fee del veicolo = **`pratiche.fee_concordata` se valorizzata (importo UNA TANTUM concordato per la singola pratica, es. veicolo fuori zona pagato 300€)**, altrimenti tariffa del COMUNE di ritiro, altrimenti PROVINCIA, altrimenti REGIONE, altrimenti `fee_per_pratica` base. Le tariffe di zona sono INDIPENDENTI dalla copertura (una tariffa fuori copertura vale per i ritiri fuori zona assegnati manualmente; la UI mostra l'etichetta informativa "fuori copertura"). Il ritiro effettivo (`data_ritiro_effettuato`) fa entrare la pratica in fatturazione; a fine mese fattura automatica per demolitore. RLS: solo admin. Endpoint `/api/pratica-fee` per impostare/rimuovere l'importo concordato.
- ⭐ `demolitori_note` (nuova, 7/07/2026): note/cronologia del demolitore (id, demolitore_id, testo, creato_il). Timeline nella scheda demolitore. RLS: solo admin.
- **Stato demolitore semplificato nell'interfaccia**: o è **Attivo** (riceve pratiche) o **Non attivo** (valori DB `in_attesa`/`sospeso` mostrati entrambi come "Non attivo"). Il campo `contratto_firmato` esiste nel DB ma NON è più gestito dall'interfaccia (ai contratti pensa Davide).

## 3.11 Altre tabelle rilevanti

- `utenti`: profilo utente (collegato a Supabase Auth via id)
- `veicoli_vendita` + `veicoli_vendita_foto`: flusso D (vendita), separate da `pratiche`

## 3.12 Tabelle ANCORA DA CREARE

- `recensioni` (id, pratica_id, cliente_id, demolitore_id, tipo, stelle, commento, creata_il)
- `aste` (id, riferimento_id, riferimento_tipo, tipo, prezzo_base, somma_per_cliente, date, stato, vincitore_id)
- `offerte_asta` (id, asta_id, offerente_id, importo, timestamp)
- `messaggi_preimpostati` (id, categoria, titolo, testo)
- `documenti_operativi_commercianti` (id, titolo, descrizione, url_file, attivo)
- `notifiche_app` (id, utente_id, tipo, titolo, messaggio, letta, link, timestamp)
- `notifiche_sms_inviate` (id, utente_id, numero, testo, stato, timestamp)

⚠️ Da creare DOPO il 30/10/2026 → ricordare i GRANT espliciti (vedi 8.4).

---

# 🔄 PARTE 4 — I 4 FLUSSI DELLA PRATICA

### ⭐ Regola "TI CHIAMIAMO NOI" (documenti da chiarire — luglio 2026)
Se il cliente nel flusso `/inizia` dichiara di **non avere né libretto né denuncia** ("Non ho nessuno dei due", `libretto='no'`) oppure **non sa che certificato di proprietà ha** ("Non lo trovo o non so cosa sia", `certificato_proprieta='nessuno'`), NON si procede in automatico: **prima NoiDemoliamo lo contatta** (telefono/WhatsApp) per capire la situazione. In `/inizia` compare un box rassicurante + bottone WhatsApp; nella pagina documenti il libretto viene tolto dalla lista da caricare e sostituito dal box "**Da chiarire insieme — Ti chiamiamo noi al più presto**" (giallo/ambra) con WhatsApp. Il cliente intanto può caricare gli altri documenti. ⏳ Da integrare nella pagina admin: evidenziare queste pratiche come "Da contattare".

## 4.1 Flusso A — Demolizione standard ✅ FUNZIONANTE

```
Cliente compila /inizia (14-15 mini-step, casistica derivata automaticamente) → crea account
   ↓
✅ TRIGGER genera la CHECKLIST DOCUMENTI dalla casistica (automatico, collaudato)
   ↓
✅ Cliente carica documenti in area personale (foto col telefono, flusso fronte/retro,
   invio manuale "Ho finito, invia in verifica")
   ↓
⏳ Admin approva (singolo documento o "Approva tutti") — PAGINA DA COSTRUIRE (prossimo task)
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
Giorno del ritiro → cliente consegna gli ORIGINALI (lista "Da portare al ritiro") → demolitore clicca "✅ Veicolo ritirato"
   ↓
SISTEMA RECENSIONI (vedi 4.9):
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

⚠️ **VINCOLO DB `pratiche_stato_check`** (bug scoperto e risolto 6/07/2026): la colonna `pratiche.stato` ha un CHECK constraint con l'elenco degli stati ammessi. All'inizio mancavano i nuovi stati (es. `da_assegnare`): il DB **rifiutava in silenzio** l'update → la pratica restava bloccata su "in_attesa_documenti". Il constraint ora contiene TUTTI gli stati qui sopra. **Se aggiungi un nuovo stato al workflow, aggiornalo anche nel constraint**, altrimenti le transizioni falliscono senza errore visibile.

⭐ **Le transizioni di stato pratica passano dal SERVER** (service role), non dal browser admin: endpoint `/api/pratica-stato` ricalcola lo stato dai documenti (tutti approvati → `da_assegnare`, ecc.). La pagina admin si **auto-sincronizza all'apertura** (self-heal: se i documenti sono a posto ma la pratica è indietro, la sblocca da sola).

## 4.7 Algoritmo di assegnazione AUTOMATICA — ✅ COLLAUDATO (6 luglio 2026)

Implementato in `lib/assegnazione.ts` + endpoint `/api/assegna-pratica/route.ts`.
✅ **Testato end-to-end**: pratica a Messina → demolitore che copre la provincia trovato, distanza calcolata, assegnato con nome visibile.

```
1. Prerequisiti (comune + provincia + lat/lng)
2. Demolitori che coprono il comune → 3. solo attivi → 4. esclude saturi (max 15)
5. Distanza stradale (Google Distance Matrix) → 6. velocità storica (ultime 20 pratiche)
7. Ordina: velocità → distanza → pratiche aperte → 8. vincitore + lista debug
```

### Flusso admin (deciso e collaudato)
Un solo flusso: **"Assegna in automatico"** lancia l'algoritmo in modalità **dry-run** (calcola SENZA scrivere) e mostra la **classifica** dei candidati (1° = "Consigliato", con distanza · velocità · pratiche aperte). L'admin **conferma** il suggerito o ne sceglie un altro dalla lista → solo allora l'endpoint assegna davvero. **"Scegli io"** mostra la stessa lista senza suggerimento. Endpoint `/api/assegna-pratica` modalità: `dry_run` (calcola), `demolitore_id` (assegna quello scelto, `manuale` true/false), legacy (auto).

### ⭐ RIASSEGNAZIONE / DISASSEGNAZIONE (6-7/07/2026)
Se ci sono difficoltà con un demolitore, l'admin può sempre cambiare:
- **"Riassegna a un altro demolitore"** → sceglie il nuovo dalla lista (in un colpo)
- **"Rimuovi assegnazione"** → la pratica torna `da_assegnare` (endpoint `assegna-pratica` con `disassegna: true`; azzera demolitore, date e scadenze)
- Ogni cambio setta **`pratiche.riassegnata = true`** → il CLIENTE vede messaggi SERENI (mai allarmanti) nel banner della sua area: "Stiamo scegliendo un nuovo demolitore" (se da_assegnare) / "Nuovo demolitore in arrivo… ti contatterà entro 8 ore lavorative" (quando riassegnata). Quando ci saranno le notifiche vere, questi eventi andranno anche lì.

### ⭐ IMPORTO UNA TANTUM SULLA PRATICA (vedi anche 3.10)
`pratiche.fee_concordata` + card "Importo pratica" nel dettaglio admin: prezzo concordato per la SINGOLA pratica (trattativa extra su auto interessante, o ritiro fuori copertura es. 300-400€). In fattura vince su tutte le tariffe. L'assegnazione fuori copertura si fa manualmente ("Mostra tutti i demolitori attivi").

### ⚠️ Fix applicati (erano i bug che bloccavano tutto)
1. ✅ **Velocità storica**: ora su `data_ritiro_effettuato` (non più certificato rottamazione)
2. ✅ **Colonne aggiunte a `pratiche`**: `data_assegnazione`, `data_ritiro_effettuato`, `scadenza_proposta_ritiro`, `assegnazione_manuale` (mancavano → l'assegnazione falliva)
3. ✅ **`demolitori.stato`** esiste
4. ⭐ **CONVERSIONE PROVINCIA sigla→nome** (`lib/province.ts`): le pratiche salvano la provincia come **sigla** ("ME", presa da Google), la copertura usa il **nome** ("Messina"). L'algoritmo converte prima di confrontare, altrimenti "nessun demolitore copre".
5. ✅ Fallback nessun demolitore → `in_assegnazione_manuale`
6. ⏳ Media recensioni nello scoring (dopo sistema recensioni)
7. ⏳ **`GOOGLE_MAPS_SERVER_KEY` su Vercel** ancora da aggiungere (in locale c'è; senza, l'automatica online non calcola le distanze)

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
C:\Progetto_NoiDemoliamo\
├── app/
│   ├── page.tsx                              # Home pubblica
│   ├── layout.tsx                            # Layout root (no font Geist, viewport anti-zoom)
│   ├── globals.css                           # Tailwind globale
│   ├── login/page.tsx                        # Login multi-ruolo
│   ├── inizia/                               # Flusso cliente mini-step
│   │   ├── page.tsx                          # ⭐ Orchestratore: banner blu + getSteps dinamico + step inline
│   │   │                                     #   + traduciErrore() per errori in italiano (07/2026)
│   │   └── steps/                            # Step "storici" in file separati
│   │       ├── StepTipoVeicolo.tsx
│   │       ├── StepIdentificaVeicolo.tsx
│   │       ├── StepCambioVeicolo.tsx
│   │       ├── StepCondizioniVeicolo.tsx
│   │       └── AutocompleteIndirizzo.tsx
│   ├── dashboard/                            # AREA CLIENTE — ✅ RISTILIZZATA (07/2026, stile /inizia)
│   │   ├── page.tsx                          # Lista "Le tue pratiche"
│   │   └── [id]/
│   │       ├── page.tsx                      # Dettaglio pratica: header blu, banner stato SVG, tab pillole
│   │       ├── TabDocumenti.tsx              # ⭐ Sistema checklist COMPLETO (card stile /inizia,
│   │       │                                 #   fronte/retro, foto eliminabili) — vedi 5.6
│   │       ├── TabStato.tsx                  # Timeline + condizioni dichiarate a pillole + dati veicolo
│   │       ├── TabChat.tsx                   # Chat
│   │       └── UploadDocumentoModal.tsx      # ⚠️ LEGACY: non più usato da TabDocumenti, da rimuovere in pulizia
│   ├── admin/
│   │   ├── page.tsx                          # Dashboard admin
│   │   ├── copertura/page.tsx                # Mappa Italia
│   │   ├── demolitori/  (page + [id] + MappaComuni)
│   │   └── pratiche/[id]/  (page + DocumentiApprovazione)   # ⏳ DA RIFARE sul nuovo sistema checklist
│   └── api/assegna-pratica/route.ts
├── lib/  (supabase.ts, assegnazione.ts)
├── types/
│   └── pratica.ts                            # ⭐ Intestazione, Casistica (8), derivaCasistica,
│                                             #   delegaAmmessa, fermoApplicabile, CdcStato
├── public/  (logo, geojson)
├── .env.local
├── ARCHITETTURA.md                           # QUESTO FILE — la memoria del progetto
├── CLAUDE.md                                 # Letto automaticamente da Claude Code → rimanda qui
├── AGENTS.md
└── package.json
```

## 5.2 Flusso `/inizia` dettagliato — SISTEMA CASISTICHE ⭐⭐⭐

(Struttura step invariata da giugno — vedi storico. Novità luglio:)

- ⭐ **`traduciErrore()`**: gli errori Supabase in fase di submit sono tradotti in italiano semplice ("Failed to fetch" → "Errore di connessione. Controlla la tua rete e riprova."; email già registrata, password corta, email non valida, rate limit). L'errore originale finisce in console per il debug.
- ⭐ **Step foto**: il bottone "Continua comunque con X foto →" (1-3 foto) è ora ben visibile (bordo e testo blu, semibold) ma resta gerarchicamente sotto il "Continua" pieno che appare a 4+ foto — l'incentivo a caricare più foto rimane.
- ⭐⭐ **SECONDA PRATICA PER CLIENTE REGISTRATO** (6-7/07/2026): `/inizia` rileva la sessione attiva (solo tipo 'cliente'). Se loggato: lo step finale diventa "Conferma e invia" (NIENTE email/password — prima si bloccava su "email già registrata"), nome/telefono precompilati da `utenti`, e la pratica si aggancia a `user_id` esistente → le pratiche si accodano nella sua area. Ingresso dal bottone tratteggiato "**+ Richiedi un'altra demolizione**" in fondo alla lista pratiche della dashboard cliente. Il trigger checklist lavora per pratica, quindi ogni pratica ha i suoi documenti.

### Ordine step (14-15 visibili; getSteps è dinamico in base alle risposte)

```
1  TIPO VEICOLO (griglia 4+4 + "Altro")
2  INTESTAZIONE (6 opzioni → deriva la casistica)
2b RAMO EREDI (rinuncia sì/no + stepper 1-10)         [solo deceduto]
2c RAMO SOCIETÀ FALLITA                                [solo società]
3  IDENTIFICA VEICOLO (anno, km, marca, modello)
4  CAMBIO                                              [solo auto/minicar/furgone/pullman/camion/altro]
5  CONDIZIONI (4 card-riga: incidentata/cammina/va in moto/parti mancanti + note)
6  INDIRIZZO + SPAZIO CARRO ATTREZZI
7  TARGA (+ box targhe presenti; adattato per targhe straniere)
8  CF DINAMICO                                         [saltato per targhe straniere]
9  FOTO (gamification 4 foto)
10 FERMO AMMINISTRATIVO                                [saltato per targhe straniere]
11 CONSEGNA (io/delegato)                              [saltato per non_intestatario e targhe straniere]
12 LIBRETTO
13 CDC (regola ottobre 2015)                           [saltato per targhe straniere]
14 ACCOUNT FINALE UNIFICATO ("Ultimo passo!")
```

### ✅ Collaudi end-to-end superati
- 12/06: 3 pratiche test (persona_fisica con delegato, societa con P.IVA, targhe_straniere)
- 07/2026: pratica "EEEEE" (autovettura fiat panda, Messina) creata dal flusso completo → **trigger checklist verificato con pratica reale** ✅

### Personalizzazione dinamica per tipo veicolo
Invariata: banner, titoli, articoli, generi (isFemminile: autovettura/minicar/imbarcazione), tipoAltro ovunque, helper functions (articolo, articoloDel, pronomeTuo, nomeVeicolo, veicoloHaCambio, ICONE_VEICOLO, getStepMeta con parametro `intestazione`).

### Ottimizzazioni mobile (sempre valide)
Anti-zoom iOS (text-base 16px), inputMode corretti, NO scrollIntoView automatico, viewport meta, theme color blu, bottoni Continua mai disabilitati (validazione al click), normalizzazione targa/CF, formattazione km, gamification foto.

## 5.3 Pagine FATTE ✅

- **Home `/`**: ✅ stile app (lavanda, logo, spunte SVG, bottoni app, riga rassicurazione, WhatsApp)
- **Login `/login`**: ✅ stile app (header blu, campi con icona, mostra/nascondi password); NO "Registrati" (ruoli diversi); redirect admin/cliente (demolitore/commerciante DA AGGIUNGERE)
- **Flusso `/inizia`**: COMPLETO E COLLAUDATO ⭐⭐⭐ (+ errori in italiano)
- **`/dashboard`**: ✅ RISTILIZZATA (07/2026) — sfondo lavanda, card bianca, header blu con saluto + Esci, card pratiche stile /inizia con icona veicolo per tipo, badge stato a pillola chiara, empty state con SVG
- **`/dashboard/[id]`**: ✅ RISTILIZZATA (07/2026) — header blu con "← Pratiche" + "Marca Modello · Targa" + badge stato, banner dinamico per stato con icone SVG, tab a pillole (attiva blu piena). Tab Documenti = sistema checklist completo (vedi 5.6), Tab Stato = timeline + condizioni a pillole, Tab Chat invariata
- **AREA ADMIN = CRM da PC** ✅ (rifatta 6/07/2026, stile app in versione dashboard densa; NON mobile). **Sidebar condivisa** `app/admin/_components/AdminSidebar.tsx` (Pratiche · Demolitori · Copertura) su tutte le pagine.
- **`/admin`**: ✅ CRM pratiche per **priorità d'azione** ("Da fare ora": da contattare, da approvare, da assegnare, in corso) + ricerca + colonna Attesa (rossa oltre 30 min) + colonna demolitore. Cestino per riga (elimina definitiva). Bottone "Pulisci account senza pratiche".
- **`/admin/pratiche/[id]`**: ✅ RIFATTA — approvazione documenti sul nuovo sistema checklist (approva/rifiuta con motivo, "approva tutti", banner "da contattare", tutti i dati dichiarati dal cliente), assegnazione (auto+manuale con nome demolitore), eliminazione doppia scelta (solo pratica / pratica + account cliente).
- **`/admin/demolitori` + [id]**: ✅ RIFATTA — lista a card; scheda "profilo CRM" (7/07/2026): testata blu con statistiche e toggle Attivo/Non attivo, anagrafica in LETTURA con modifica a tasto, tariffe per zona, **Note e cronologia** (timeline), **copertura a tendina** (zone a pillole sempre visibili, mappa solo premendo Modifica, "Salva copertura" solo se modificata — logica `MappaComuni` intatta).
- ~~`/admin/copertura`~~: ELIMINATA (7/07/2026) — la copertura si gestisce solo dentro la scheda demolitore.

## 5.4 Backend / API

- **`/api/assegna-pratica`** — algoritmo assegnazione ✅ (modalità dry-run / assegna demolitore scelto / auto). Converte sigla→nome provincia (`lib/province.ts`).
- **`/api/pratica-stato`** — ricalcola lo stato pratica dai documenti (service role).
- **`/api/elimina-pratica`** — eliminazione definitiva (storage + righe collegate + pratica; opzione account cliente).
- **`/api/pulisci-utenti`** — cancella account clienti senza pratiche (mai admin/operatori).
- ⭐ **Google Maps**: caricatore condiviso `lib/googleMaps.ts` — carica lo script UNA volta per pagina (autocomplete indirizzo + mappa copertura convivono senza conflitto).

## 5.5 Verifica PRA ACI — ABBANDONATA per ora

Bloccante: reCAPTCHA su `iservizi.aci.it`. Opzioni future: bookmarklet/estensione Chrome con captcha manuale, oppure Openapi.it Visura Targa PRA (~6€/chiamata). Riprendere quando il flusso cliente sarà stabile.

## 5.6 ⭐ TabDocumenti — com'è fatto (riferimento per la pagina admin)

Il componente più importante dell'area cliente. Design finale approvato dopo varie iterazioni ("Opzione A"):

- **Anello di progresso SVG** "X su Y" + messaggio motivazionale ("Iniziamo!" / "Stai andando bene!")
- **Card documento "Da preparare"** (stile /inizia): bordo 1,5px `#E5E7EB`, sfondo `#F9FAFB`, **quadratino blu 40px con icona per tipo di documento** (libretto→libro, carta identità/patente→tesserino, tessera sanitaria→croce, CDC→documento con timbro, denuncia→triangolo, delega→penna, visura→edificio, default→documento), nome semibold scuro protagonista, descrizione sotto
- **Bollini "Scatta" e "File"**: due bottoni circolari sempre visibili che aprono DIRETTAMENTE fotocamera o selettore file (NIENTE popup intermedi — bocciati da Davide)
- **Flusso fronte/retro** (vedi 3.4): miniature dei file in bozza con ✕ rosso, hint "manca il retro?" (solo se il catalogo lo prevede), bottone verde "Ho finito, invia in verifica"
- **Documento rifiutato**: card in rosso (`#FEF6F6`/`#F3C8C8`), badge "Da rifare", `nota_admin` al posto della descrizione, bollini rossi
- **"Già sistemati"**: collassato di default in una riga riassuntiva; espanso mostra righe compatte (spunta verde "Approvato" / orologio ambra "La stiamo verificando" + miniatura)
- **Documenti per erede**: accordion per indice erede
- **Moduli PDF** (template_pdf): card con badge "Modulo" e avviso "disponibile a breve" (finché non ci sono i template)
- **"Da portare al ritiro"**: box navy scuro collassabile con la lista dei `richiede_consegna=true`
- **Foto del veicolo**: griglia 3 colonne con ✕ rosso di eliminazione (conferma modale; elimina bucket + riga), due bottoni tratteggiati "Scatta foto"/"Scegli file"
- **Dati**: due query separate (checklist + catalogo) unite in JS — NIENTE join `!inner` PostgREST (manca la FK dichiarata). Signed URL 1h per il bucket privato.

---

# 🎨 PARTE 6 — DESIGN SYSTEM

> Approvato il 22/05/2026, esteso a giugno con `/inizia`, **UNIFICATO a luglio 2026: tutta l'area cliente usa il linguaggio "/inizia"**.

## 6.1 Colori principali

- **Sfondo AREA CLIENTE (tutte le pagine)**: `linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)` (lavanda) ⭐ esteso da /inizia a dashboard e dettaglio pratica
- **Contenuto**: card bianca `rounded-3xl shadow-lg`, centrata `max-w-md`
- **Header/banner blu**: `linear-gradient(90deg, #1d4ed8, #2563eb)` con bottone bianco/85 di navigazione a sinistra, eyebrow uppercase `text-blue-100`, badge stato a destra
- **Blu primario** (bottoni CTA, link): `bg-blue-600` hover `bg-blue-700` / `#2563eb`
- **Blu navy** (`#0d2144`): ora solo per accenti scuri (box "Da portare al ritiro", area admin legacy)
- **Theme color mobile**: `#2563eb`
- **Sfondo dashboard ADMIN (legacy)**: `bg-[#f0f4f8]` — l'admin verrà uniformato in seguito

## 6.2 Card/campi standard (stile "campi /inizia") ⭐ IL PATTERN DI RIFERIMENTO

- Bordo `1.5px solid #E5E7EB`, sfondo `#F9FAFB`, radius 14, padding 14
- **Quadratino icona 40px** `#DBEAFE` radius 12 con icona SVG blu `#2563eb` a sinistra
- Titolo `fontWeight 600` `#111827` (protagonista), sottotitolo `12px #6B7280`
- Variante errore/rifiutato: sfondo `#FEF6F6`, bordo `#F3C8C8`, tile `#FBDADA`, testo/icone `#C0392B`
- Badge a pillola chiara: es. "Da rifare" `#FBDADA`/`#C0392B`, "Modulo" `#DBEAFE`/`#2563eb`

## 6.3 Badge di stato pratica (pillole chiare)

in_attesa_documenti `#FAEEDA`/`#854F0B` · in verifica `#E0EDFB`/`#1E4E8C` · da rifare `#FBE2E2`/`#9B1C1C` · approvata/completata `#DCF3E4`/`#1F7A43` · assegnazione `#FDEBD9`/`#92500E` · ritiro confermato `#E4E4FB`/`#4338CA` · ritirata `#EDE4FB`/`#6B21A8` · certificati `#DDF2F0`/`#0F766E` · annullata `#E7EAEE`/`#4B5563`

## 6.4 Colori semantici

- **Verde** (positivo): `bg-green-50/300/700`; pillole condizioni `#EAF3DE`/`#27500A`; bottone invia `#16A34A`
- **Giallo/Ambra** (attesa): `bg-amber-50/200/800`; "in verifica" `#d99412`
- **Rosso** (problema): `bg-red-50/300/700`; eliminazione/rifiuto `#C0392B`
- **Azzurro sky** (info/💡): `bg-sky-50/200/800`

## 6.5 Tipografia

- **Font**: default sistema (Tailwind sans), NO font custom
- **Titoli pagina**: `text-xl font-semibold text-gray-900` / `text-lg font-bold` (dashboard)
- **Body**: `text-sm text-gray-700` · **Caption**: `text-xs text-gray-500` · **Micro**: `text-[10px]`/`text-[11px]`

### ⚠️ REGOLA MOBILE CRITICA
- **Tutti gli input/textarea**: `text-base` (16px, anti-zoom iOS) + `text-gray-900` + `placeholder:text-gray-400`

## 6.6 Componenti standard

- **Header blu area cliente**: [bottone bianco/85 nav] [eyebrow uppercase + titolo] [badge pillola]
- **Tab bar a pillole**: container `#EFF3F9` rounded-2xl p-1; tab attiva `#2563eb` bianca, inattive trasparenti `#5F6C7E`; badge rosso contatore
- **Banner stato dinamico**: gradiente per stato (blu/rosso/verde/indaco/viola/teal/grigio) + icona SVG in box `bg-white/20` — NIENTE emoji
- **Bollini azione** (Scatta/File): cerchio 38-40px `#DBEAFE`, icona blu, etichetta 10.5px semibold sotto; aprono direttamente camera/file picker
- **✕ eliminazione**: cerchietto rosso `#C0392B` 19-22px in alto a destra di miniature/foto, con bordo bianco; SEMPRE con modale di conferma ("L'azione non può essere annullata")
- **Modale conferma eliminazione**: icona cestino in cerchio rosso chiaro + 2 bottoni (Annulla / Sì, elimina con spinner)
- **Bottone invio verde**: `#16A34A` radius 11, icona aeroplanino, "Ho finito, invia in verifica"
- **RuoloButton** (/inizia): invariato
- **ErrorBadge / box 💡 / rassicurazioni telefono / timeline "cosa succede dopo"**: invariati (vedi storico giugno)
- **Form input**: `border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 focus:border-blue-500 focus:bg-white`

## 6.7 Regole d'oro

1. **Mobile-first**: touch-friendly (min 44px)
2. **NO emoji nell'interfaccia funzionale**: solo SVG (feather-style, stroke ~1.7-1.9). A luglio rimosse anche da dashboard, banner stato e badge.
3. **Coerenza colori semantici**
4. **Personalizzazione tipo veicolo OVUNQUE** + generi corretti
5. **Stato sempre visibile** · empty state amichevoli (con SVG, non emoji)
6. **Input `text-base` + `text-gray-900` + `placeholder:text-gray-400`** sempre
7. **Bottoni `/inizia` mai disabilitati**: validazione al click
8. **Una sola cosa per pagina** nei mini-step
9. **Gamification dove possibile** (foto)
10. **NO scrollIntoView automatico** su input
11. **Niente trattini "—" nei titoli bottoni**
12. **Niente gergo tecnico/burocratico nei testi utente**
13. **Rassicurare sui dati sensibili** (ogni campo telefono spiega l'uso)
14. **Possessivi nei label quando serve distinguere le persone**
15. **La pagina finale è una guida, non un modulo**
16. ⭐ **Niente grandi bottoni rettangolari dove basta un'azione compatta** (07/2026): bollini circolari, righe compatte
17. ⭐ **I nomi dei documenti sono i protagonisti visivi** delle card (07/2026)
18. ⭐ **Niente popup intermedi per scattare/caricare** (07/2026): i bottoni aprono direttamente fotocamera o file picker
19. ⭐ **Azioni distruttive sempre con conferma** e solo negli stati in cui il cliente può modificare

## 6.8 ⭐ DESIGN SYSTEM AREA ADMIN (CRM) — STABILE, approvato da Davide (7/07/2026)

> Il layout e i colori che piacciono a Davide. OGNI nuova pagina admin DEVE seguire questi input.

**Fondamenta**
- **Sfondo pagina**: lavanda di sistema `linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)` (lo stesso dell'area cliente)
- **Card**: bianche, bordo `1.5px solid #E5E7EB`, radius 14, ombra morbida `0 1px 3px rgba(16,24,40,0.07)` (costante `STILE_CARD`)
- **Titoli card**: barretta blu verticale a sinistra + testo bold `#0F1B33` (componente `TitoloCard`)
- **NO emoji, NO freccette testuali** (←/→): solo icone SVG. Bottone "Indietro" = pillola grigia con chevron SVG

**Le liste sono CARD, non tabelle** (pratiche e demolitori):
- Quadratino icona 46px `#DBEAFE` (icona veicolo / iniziali), titolo bold 15px `#111827` protagonista, sottotitolo `#4B5563`
- Colonne interne separate da divisori verticali `#EEF1F5`, pillole di stato colorate, riquadro metrica a destra (attesa/aperte; rosso `#FCEBEB`/`#A32D2D` se urgente)
- Bordo sinistro 4px colorato per stato/urgenza; azioni (cestino) visibili solo al passaggio del mouse

**Pagine "profilo"** (scheda demolitore, riferimento per future schede):
- Testata **blu gradiente** `linear-gradient(120deg,#1d4ed8,#2563eb,#3b82f6)` con iniziali, SOLO ragione sociale/nome, toggle di stato, e **statistiche "in vetro"** (`rgba(255,255,255,0.14)`)

**Tipografia dei dati (bilanciamento approvato)**
- Titoli sezione: `#1E293B` bold uppercase 12px (con iconcina 28px `#DBEAFE`)
- Etichette dato: `#5B6779` bold uppercase 10.5px
- **Valori: `#3E4C63` semibold — MAI nero pieno** (il nero "spara")
- Dato in lettura: riquadro `#F6F8FB` bordo `#E5E9F0` radius 10

**Regola MODIFICA A TASTO (vale per ogni form admin)**
- Di default tutto in **sola lettura** (click sui campi non modifica nulla)
- Bottone blu **"Modifica"** (con matita) → campi editabili, tutti **identici** (bordo 1.5px, radius 10, focus ring blu; autocomplete in versione `compatto`)
- **"Salva" appare/si attiva SOLO se qualcosa è davvero cambiato** + avviso ambra "Modifiche non salvate" + bottone Annulla che ripristina
- Stesso principio per l'area di copertura (tendina: pillole zone sempre visibili, mappa solo in modifica)

---

# 🗣️ PARTE 7 — COMUNICAZIONE CON DAVIDE

> Davide è imprenditore, NON sviluppatore. Lavora con AI per costruire la piattaforma.

## 7.1 🆕 METODO DI LAVORO: CLAUDE CODE (dal 3/07/2026)

Dal 3 luglio si lavora con **Claude Code (estensione VS Code)** sulla cartella `C:\Progetto_NoiDemoliamo`. Fine dell'era copia-incolla.

**Regole per Claude Code**:
1. ⭐ **REGOLA FONDAMENTALE**: prima di modificare file o eseguire comandi, SEMPRE proporre la modifica in linguaggio semplice e attendere conferma esplicita di Davide. Lui vuole pensarci prima.
2. Spiegare cosa si sta per fare SENZA gergo tecnico
3. Per i cambi di design: descrivere/mostrare prima l'idea, implementare dopo l'approvazione (Davide adora le anteprime con varianti A/B/C)
4. Un commit per blocco di lavoro sensato, messaggio in italiano chiaro; push su `main` = deploy Vercel
5. Chiedere a Davide di testare (localhost sul PC, URL Vercel su iPhone) prima di chiudere un task
6. **MAI toccare o stampare `.env.local`** e le chiavi
7. SQL su Supabase: Claude lo scrive, Davide lo incolla nel SQL Editor e conferma l'esito
8. **A fine sessione: proporre di aggiornare QUESTO file (ARCHITETTURA.md)** con quanto fatto — è la memoria del progetto tra le sessioni
9. `CLAUDE.md` (letto in automatico da Claude Code) deve solo rimandare qui: la fonte di verità è ARCHITETTURA.md

## 7.2 Stile di comunicazione

- **Istruzioni passo-passo brevissime**: uno step alla volta, "scrivimi fatto"
- **Niente spiegazioni tecniche se non chiede** — linguaggio SEMPLICISSIMO, zero gergo
- **Risposte compatte, no preamboli**
- **Anteprime visive** PRIMA di ogni cambio di design — Davide le adora
- **Test su iPhone vero** via URL Vercel live (localhost non accessibile da telefono)
- Davide non ricorda i percorsi → indicare percorso completo + come aprirlo

## 7.3 Sequenza di lavoro tipica (con Claude Code)

```
1. Davide dice cosa serve
2. Claude esplora il codice, propone (anteprima visiva per design, opzioni se servono)
3. Davide CONFERMA esplicitamente
4. Claude modifica i file (Davide approva le modifiche proposte da Claude Code)
5. Problems = 0 → commit + push (con ok di Davide) → test su iPhone/browser
6. Feedback → correzioni → prossimo task
7. Fine sessione → aggiornare ARCHITETTURA.md
```

## 7.4 Convenzioni e note operative

- Errori React loop → riavviare `npm run dev` · Errori TS "fantasma" → Restart TS Server
- Panico Turbopack dopo spostamenti → cancellare `.next` (vedi 2.2)
- Dopo ALTER TABLE: se errori colonna → `NOTIFY pgrst, 'reload schema';`
- ⚠️ Build Vercel può fallire SILENZIOSAMENTE per mappe/switch non esaustivi (caso storico: `furgone` mancante in `nomeCapitalizzato`). Quando si aggiunge un valore a un tipo, verificare TUTTE le mappe che lo usano.
- Segnali VS Code: "M" arancione = da committare, numero rosso PROBLEMS = errori TS

---

# 📋 PARTE 8 — STATO ATTUALE (6 luglio 2026)

## 8.1 ✅ FATTO

### ⭐⭐⭐ SESSIONE 6-7 luglio 2026 (seconda parte) — RIFINITURE E FLUSSI OPERATIVI

- ✅ **Restyle completo area admin** secondo il design system 6.8 (card, profilo demolitore, lavanda)
- ✅ **Contribuzione demolitore** rifatta: lettura + modifica a tasto, tariffe con badge zona, etichetta "fuori copertura" (informativa: tariffe valide anche fuori zona per ritiri manuali)
- ✅ **Importo una tantum per pratica** (`fee_concordata` + `/api/pratica-fee`) — collaudato (400€)
- ✅ **Riassegnazione/disassegnazione** con messaggi sereni al cliente (`riassegnata`) — collaudata
- ✅ **Seconda pratica per cliente registrato** (bottone dashboard + /inizia consapevole della sessione) — collaudata
- ✅ **Pagina cliente rifinita**: banner demolitore (8 ore lavorative), box smeraldo "Documenti originali da portare al ritiro" con lista numerata, messaggi senza esclamativi, icone nuove
- ✅ **Note e cronologia demolitore** (`demolitori_note`), copertura a tendina con salva-se-modificato
- 🔔 Deciso: **sistema notifiche email+SMS** come task prioritario futuro (lista eventi in 8.2)

### ⭐⭐⭐ SESSIONE 6 luglio 2026 — AREA ADMIN (CRM) + ASSEGNAZIONE AUTOMATICA

- ✅ **CRM admin** completo (vedi 5.3): pratiche per priorità d'azione, ricerca, attesa, demolitore; dettaglio pratica con tutti i dati + approvazione documenti nuovo sistema; **eliminazione definitiva** (DB + storage, doppia scelta pratica/account) + pulizia account senza pratiche; **sidebar condivisa**.
- ✅ **Gestione demolitori professionale** (vedi 3.10 e 5.3): campi anagrafici completi (P.IVA, SDI, titolare, referente, email assegnazione/aziendale, PEC, indirizzo Google autocomplete), **tariffe per zona** (`demolitori_tariffe`, regola più-specifico-vince), mappa copertura intatta.
- ✅ **Assegnazione automatica COLLAUDATA** (vedi 4.7): dry-run → classifica → conferma; nome demolitore visibile.
- ✅ **Bug DB fondamentali risolti**: constraint `pratiche_stato_check` completato con tutti gli stati; colonne mancanti aggiunte a `pratiche`; conversione provincia sigla→nome; transizioni stato via server (`/api/pratica-stato`).
- ✅ **Google Maps loader condiviso** (`lib/googleMaps.ts`) — autocomplete + mappa convivono.

### ⭐⭐⭐ SESSIONE 3 luglio 2026 (pomeriggio) — Fronte/retro, assistenza WhatsApp, home/login, casistiche in repo

- ✅ **File casistiche nel repo**: `docs/casistiche/Casistiche_Demolizione.md` (fonte ufficiale 8 casistiche) + collegato a `CLAUDE.md`. Verificata la coerenza catalogo DB ↔ codice ↔ file. Correzioni: fermo applicabile ai casi 1-7 (non solo 1-6); atto di morte NON fronte/retro.
- ✅ **Verifica completa modulo→trigger→pagina cliente** su tutte le combinazioni: la catena genera i documenti giusti. Bug trovati e loro stato in 8.2.
- ✅ **Documenti FRONTE/RETRO a due caselle** + opzione "file unico" (vedi 3.4). Riconoscimento per lista di codici, non più per parola "retro".
- ✅ **Regola "Ti chiamiamo noi"** per libretto mancante / CDC sconosciuto (vedi 4.0 sopra 4.1): box in `/inizia` + box "Da chiarire insieme" nella pagina documenti.
- ✅ **Assistenza WhatsApp ovunque**: componente `app/components/AiutoWhatsApp.tsx` (cerchio verde fisso in basso a destra, etichetta "Serve aiuto?" che sparisce dopo 6s) su home, login, `/inizia`, dashboard, pagina pratica. Numero **+39 351 828 0493**.
- ✅ **Home ristilizzata** in stile app (lavanda, logo, spunte SVG, bottoni app) — niente più emoji.
- ✅ **Login ristilizzato** (header blu, campi con icona, mostra/nascondi password, tolto "Registrati" perché i ruoli si registrano in modi diversi).
- ✅ Ritocchi minori: bottoni foto veicolo più moderni ("Scatta foto" / "Dalla galleria"), tolto "+ Nuova" dalla dashboard cliente (il cliente ha sempre una pratica).

### ⭐⭐⭐ SISTEMA DOCUMENTI DINAMICI COMPLETO LATO CLIENTE (fine giugno - 3 luglio 2026)

- ✅ **Catalogo popolato**: 89 documenti su tutte le 8 casistiche, verificati con Davide
- ✅ **Trigger di generazione automatica** della checklist alla creazione pratica ("commesso automatico") — collaudato con SQL (incluso multi-erede) e con pratica reale
- ✅ **RLS** su `pratica_documenti_checklist` (SELECT/INSERT/UPDATE)
- ✅ **`file_url` come array JSON** `[{url, nome}]` per file multipli senza cambi di schema
- ✅ **TabDocumenti nuovo** (design "Opzione A" + card stile /inizia, vedi 5.6): anello progresso, card con icona per tipo documento, bollini Scatta/File diretti (no popup), documenti rifiutati in rosso con nota admin, "Già sistemati" collassato, accordion eredi, box "Da portare al ritiro", moduli PDF con avviso "a breve"
- ✅ **Flusso FRONTE/RETRO** con invio manuale: upload = bozza, bottone verde "Ho finito, invia in verifica" = stato caricato; hint "manca il retro?" pilotato dal catalogo (parola "retro" nella descrizione)
- ✅ **Foto veicolo eliminabili** (✕ rosso + conferma; elimina bucket + riga; solo negli stati modificabili) — file documenti idem

### ⭐⭐ RESTYLING AREA CLIENTE COMPLETO (3 luglio 2026)

Tutto il percorso cliente ora parla il linguaggio "/inizia" (lavanda + card bianca + header blu):
- ✅ **`/dashboard` "Le tue pratiche"**: header blu con saluto + Esci, card pratiche con icona veicolo per tipo, badge pillola, empty state SVG
- ✅ **`/dashboard/[id]`**: header blu "← Pratiche" + veicolo·targa + badge; banner stato dinamico con SVG (niente emoji); tab a pillole
- ✅ **TabStato**: timeline (5 step) + sezione "Condizioni dichiarate" a pillole colorate (incidentata/cammina/va in moto/parti mancanti, verde/rosso, solo valori non null) + note cliente + dati veicolo collassabili

### ⭐ ALTRO (luglio 2026)

- ✅ **Trasloco progetto** in `C:\Progetto_NoiDemoliamo` (fuori OneDrive) dopo incidente git — repo ri-clonato da GitHub, storia intatta, git ora sano (vedi 2.2)
- ✅ **Errori /inizia in italiano** (`traduciErrore`) + bottone "Continua comunque con X foto" visibile
- ✅ **Pratica test "EEEEE"** (fiat panda, Messina) creata dal flusso completo — conferma trigger + checklist
- ✅ **Passaggio a Claude Code** come metodo di lavoro (3/07)

### Storico giugno 2026
- ✅ Sistema casistiche completo e collaudato (8 casi, derivazione automatica, flusso /inizia rifatto, DB aggiornato) — vedi PARTI 3.3 e 5.2
- ✅ Tabelle `casistiche_documenti` + `pratica_documenti_checklist` con RLS + GRANT

### Storico maggio 2026
- ✅ Refactoring completo `/inizia` mobile-first, dashboard cliente v1, area admin, tabelle e RLS storage, algoritmo assegnazione (da revisionare), Google Maps keys

## 8.2 ⏳ PENDING — In ordine di priorità

### 🔥🔥🔥 STEP 0 — DA FARE SUBITO (emersi 6/07/2026)
- **`GOOGLE_MAPS_SERVER_KEY` su Vercel**: senza, l'assegnazione automatica ONLINE non calcola le distanze (in locale funziona).
- **Assegnazione MANUALE ("Scegli io")**: da testare fino in fondo (il flusso c'è).
- **Dashboard/pagina DEMOLITORE**: il demolitore deve vedere le pratiche assegnate, proporre data ritiro, segnare **ritiro effettivo** (`data_ritiro_effettuato` → fa partire la fatturazione), caricare certificati. ANCORA DA COSTRUIRE.
- ✅ ~~STEP 1 — Pagina admin approvazione documenti~~ FATTA (vedi 8.1 sessione 6/07).

### 🔥🔥 STEP 1-bis — FIX EMERSI DALLA VERIFICA CASISTICHE (3/07/2026)
- **Caso 7 (non intestatario)**: nel flusso `/inizia`, libretto e CDC sono OBBLIGATORI ("se non ha non può procedere" da file casistiche). Oggi il modulo lascia comunque scegliere "smarrito/non ce l'ho" e crea la pratica. → aggiungere avviso di stop.
- **Denunce di smarrimento Carta d'Identità / Codice Fiscale**: previste dal file casistiche per ogni persona, ma NON presenti nel catalogo DB e senza domanda nel flusso. → decidere se aggiungerle.
- **Pagina admin**: gestire i casi "Da chiarire insieme" (evidenziare pratiche da contattare) e i casi "non so" su fermo/CDC.

### 🔥🔥 STEP 2 — TEMPLATE PDF MODULI
- Davide fornisce i template (DELEGA_*, DICHIARAZIONI_*) → attivare download precompilato (tracciando `scaricato_il`) al posto dell'avviso "a breve"

### 🔥 STEP 3 — PULIZIA
- Eliminare pratiche test: "ciccio", "Mario Verdi", "Sirio Valenti" (+ "EEEEE" quando non servirà più)
- Rimuovere `UploadDocumentoModal.tsx` (legacy)
- Rimuovere `ruolo_richiedente`/`eredita` da types e DB
- Valutare dismissione tabelle `documenti`/`documenti_approvazione`

### 🔥 STEP 4 — PAGINA ADMIN DETTAGLIO PRATICA (resto)
- Chat funzionante (messaggi_chat), campi casistica in vista

### ✅ STEP 5 — ALGORITMO ASSEGNAZIONE — FATTO (6/07/2026)
- ✅ Velocità storica, colonne, conversione province, dry-run+conferma. Resta: assegnazione manuale su MAPPA (ora è a lista), media recensioni nello scoring, `GOOGLE_MAPS_SERVER_KEY` su Vercel.

### 🔥 STEP 6 — SISTEMA RECENSIONI
- Tabella + stato + pagina cliente bloccante + integrazione algoritmo + push Google Maps

### 🆕 STEP 7 — TEST CROSS-PLATFORM ANDROID
- Chrome DevTools / amici / BrowserStack: tastiere, scroll, foto, autocomplete

### 🔔 STEP — SISTEMA NOTIFICHE VERE (email + SMS) — voluto da Davide (7/07/2026)
Oggi le comunicazioni al cliente vivono SOLO nel banner della sua area personale (le vede quando apre il sito). Servono notifiche ATTIVE. Eventi da coprire:

**Al cliente (email + SMS dove ha senso):**
1. Registrazione / pratica creata → benvenuto + riepilogo e prossimi passi
2. Documento rifiutato → "c'è un documento da rifare"
3. Tutti i documenti approvati → "sei pronto, stiamo assegnando il demolitore"
4. **Demolitore assegnato** → "ti contatterà entro 8 ore lavorative"
5. **Riassegnazione** → "nuovo demolitore in arrivo" (tono sereno, come il banner)
6. Ritiro confermato → data/ora + **promemoria documenti ORIGINALI da portare**
7. Promemoria il giorno prima del ritiro (SMS)
8. Veicolo ritirato → conferma + richiesta recensioni
9. Certificato rottamazione disponibile / radiazione PRA completata

**Al demolitore:**
10. Nuova pratica assegnata → email a `email_assegnazione` (campo già pronto) con dati ritiro
11. Promemoria scadenza 8 ore se non ha ancora proposto il ritiro

Tecnica da decidere: email (es. Resend) + SMS (Twilio). Tabelle `notifiche_app`/`notifiche_sms_inviate` già progettate (3.12, ricordare i GRANT post 30/10).

### 🔜 STEP SUCCESSIVI
- Verifica PRA ACI (bookmarklet o Openapi ~6€), pagina Polizia Locale veicoli abbandonati, invito email demolitore + /imposta-password, login multi-ruolo completo, dashboard demolitore, messaggi preimpostati admin, PWA

### 🔮 PROSSIMI FLUSSI
- Flusso B (asta demolitori), Flusso C (commercianti), acquisto NoiDemoliamo, Flusso D (/vendi-auto), area commercianti, fatturazione, statistiche

## 8.3 ⚠️ Problemi noti / cosmetici

- Errore RLS minore in `/inizia` (NON blocca)
- Console "1 Issue" generica → da indagare
- Avviso LCP sul logo in `/login` (solo suggerimento performance, non errore)
- Test Android: mai fatto su device reale
- 4 pratiche test nel DB (ciccio / Mario Verdi / Sirio Valenti / EEEEE) → eliminare prima del lancio (EEEEE è la cavia attuale per i test documenti)

## 8.4 ⏰ PROMEMORIA SCADENZE FUTURE

- 🗓️ **Supabase free tier**: aprire la dashboard ogni 5-6 giorni o il progetto va in pausa (già successo: causava "Failed to fetch"). Al lancio: Supabase Pro (~25$/mese).
- 🗓️ **30 OTTOBRE 2026 — Supabase Data API change**: le NUOVE tabelle create dopo questa data NON saranno esposte automaticamente alla Data API. Servirà GRANT esplicito dopo ogni CREATE TABLE: `GRANT SELECT, INSERT, UPDATE, DELETE ON nome_tabella TO authenticated, anon;` (adattare i permessi al caso) + RLS come sempre.
  - ✅ Già applicato preventivamente a `casistiche_documenti` e `pratica_documenti_checklist`
  - ⚠️ Da ricordare per: `recensioni`, `aste`, `offerte_asta`, ecc.

---

# 💡 PARTE 9 — DECISIONI BUSINESS CHIAVE

(1-54: vedi storico — tutte ancora valide: velocità come principio cardine, approvazione granulare, chat in-app, mobile-first, mini-step, gamification foto, sistema casistiche con derivazione automatica, catalogo documenti come DATI, moduli PDF scarica-firma-fotografa, niente gergo, rassicurazioni telefono, ecc.)

**Nuove decisioni luglio 2026:**

55. ⭐ **Upload ≠ invio**: caricare un file NON manda il documento in verifica. Il cliente aggiunge tutte le foto che servono (fronte, retro, più pagine) e POI preme "Ho finito, invia in verifica". Niente più documenti a metà.
56. ⭐ **Il suggerimento "manca il retro?" è pilotato dal catalogo**: appare solo se la descrizione del documento contiene "retro". Regola dati-non-codice: nuovi documenti fronte/retro = una riga su Supabase.
57. **Niente popup intermedi per foto/file**: i bollini "Scatta" e "File" aprono direttamente fotocamera o selettore. Il popup di scelta è stato bocciato.
58. **Il cliente può correggersi da solo**: foto veicolo e file documenti eliminabili (con conferma) finché la pratica è negli stati modificabili — meno chat di supporto per "ho caricato la foto sbagliata".
59. **Un solo linguaggio visivo per tutta l'area cliente**: lo stile /inizia (lavanda, card bianca, header blu, campi con quadratino icona) è LO standard. Ogni nuova pagina cliente deve rispettarlo; l'admin verrà uniformato più avanti.
60. **Il progetto vive fuori dal cloud sync**: mai dentro OneDrive/Dropbox (incompatibili con git).
61. **Claude Code come ambiente di lavoro**: accesso diretto ai file con conferma obbligatoria di Davide su ogni modifica; ARCHITETTURA.md è la memoria tra le sessioni e va aggiornata a fine sessione (solo cose stabili/fondamentali: flussi, regole, come vuole il sito — non trivia estetica).
62. ⭐ **Documenti fronte/retro = due caselle separate** (non una sola con foto ammucchiate): il cliente carica Fronte e Retro in slot distinti; l'invio è bloccato finché mancano. Chi ha uno scan/PDF unico usa il link "Ho un unico file". Quali documenti sono fronte/retro è deciso dal **file casistiche** (lista di codici nel codice, non dalla descrizione).
63. ⭐ **"Prima ti chiamiamo noi"**: quando il cliente non ha libretto/denuncia o non sa che CDC ha, NON si automatizza nulla — NoiDemoliamo lo contatta (telefono/WhatsApp) per capire il caso. Meglio una chiamata che un cliente bloccato o una pratica sbagliata.
64. ⭐ **Assistenza WhatsApp sempre a un tocco**: pulsante fisso (+39 351 828 0493) su tutte le pagine cliente. Ridurre l'abbandono di chi si blocca.
65. **La home fa parte dell'area cliente**: stesso linguaggio visivo /inizia (lavanda, logo, spunte SVG, bottoni app). Niente emoji nell'interfaccia.

**Nuove decisioni 6 luglio 2026:**

66. ⭐ **L'admin è un CRM da PC**, non mobile: stesso linguaggio visivo dell'app ma layout denso da dashboard, organizzato per **priorità d'azione** (non perdere nessuna pratica con decine al giorno). Sidebar condivisa.
67. ⭐ **L'algoritmo suggerisce, l'admin decide**: l'assegnazione automatica calcola la classifica ma assegna solo dopo conferma dell'admin (che può scegliere un altro demolitore). L'admin deve poter assegnare sempre anche a mano.
68. ⭐ **Fee del demolitore per ZONA, fatturazione automatica**: tariffa base + tariffe per regione/provincia/comune; il veicolo viene fatturato con la **tariffa più specifica** in base al luogo di ritiro. Il **ritiro effettivo** fa entrare la pratica in fatturazione; a fine mese fattura automatica per demolitore.
69. **Eliminazione pratica ≠ eliminazione account**: due azioni distinte e consapevoli (scelta doppia nel dettaglio) + pulizia account senza pratiche separata. Mai orfani, mai admin/operatori.
70. ⚙️ **Gotcha da ricordare**: (a) i nuovi stati pratica vanno aggiunti al constraint `pratiche_stato_check` o falliscono in silenzio; (b) la provincia è **sigla** nelle pratiche e **nome** nella copertura → convertire (`lib/province.ts`); (c) Google Maps si carica una volta sola per pagina (`lib/googleMaps.ts`).

**Nuove decisioni 7 luglio 2026:**

71. ⭐ **Il design admin è FISSATO** (vedi 6.8): lavanda + card con ombra, liste a card (non tabelle), profili con testata blu e statistiche in vetro, valori mai nero pieno. Ogni nuova pagina admin segue quegli input senza reinventare.
72. ⭐ **Modifica solo col tasto**: nei form admin niente campi sempre editabili — lettura di default, "Modifica" esplicito, salvataggio solo se qualcosa è cambiato. Evita modifiche/salvataggi accidentali.
73. **Niente gestione contratti nell'interfaccia** (per ora): ai contratti pensa Davide. Lo stato demolitore è un semplice Attivo/Non attivo.
74. **Cronologia demolitore come note datate** (`demolitori_note`): la storia del rapporto col demolitore si scrive lì, non in un campo note statico.

---

# 🚀 PARTE 10 — COME LAVORARE NELLA NUOVA SESSIONE (Claude Code o chat)

> Istruzioni per Claude dopo aver letto questo file.

1. **Leggi TUTTO questo file**, poi conferma a Davide di aver capito (breve riassunto: dove siamo + prossimo task)
2. **Riprendi dal punto 8.2 STEP 1**: la **pagina admin di approvazione documenti** sul nuovo sistema checklist. Prima esplora `/admin/pratiche/[id]` esistente, poi PROPONI l'approccio (con anteprima visiva) e attendi conferma.
3. ⭐ **REGOLA FONDAMENTALE**: prima di modificare o rigenerare codice, SEMPRE proporre la modifica e attendere conferma esplicita di Davide
4. **Rispetta il design system** (parte 6) — in particolare il pattern card /inizia (6.2) e le regole d'oro (6.7)
5. **Stile comunicazione** (parte 7): passo-passo, linguaggio semplicissimo, zero gergo, anteprime visive prima dei cambi design
6. **Push**: commit chiari in italiano; push su main = deploy Vercel; verificare con `git status`
7. **Mobile testing**: iPhone reale su URL Vercel live
8. **Non assumere mai cose nuove**: se non sei sicuro, chiedi
9. **A fine sessione**: aggiornare QUESTO file con quanto fatto

---

# 📞 PARTE 11 — INFO PROGETTO

- **Founder**: Davide Di Viesto
- **Email admin**: ddiviesto@gmail.com
- **WhatsApp assistenza clienti**: +39 351 828 0493 (pulsante fisso su tutte le pagine cliente)
- **GitHub**: ddiviesto/NoiDemoliamo
- **URL live**: https://noi-demoliamo.vercel.app
- **Supabase URL**: https://egsufeczoroxqnagzqfq.supabase.co
- **Cartella locale**: `C:\Progetto_NoiDemoliamo` ⚠️ (spostata FUORI da OneDrive a luglio 2026 — il vecchio percorso è obsoleto)
- **Davide device principale**: iPhone (test mobile) + HP PC (sviluppo)

---

**Fine documento. Ultimo aggiornamento: 6 luglio 2026.**