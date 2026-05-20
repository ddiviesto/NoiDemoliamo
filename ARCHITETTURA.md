# NoiDemoliamo — Architettura completa

> Documento di riferimento del progetto. Aggiornato al 20 maggio 2026.

## 1. Modello di business

Piattaforma italiana di demolizione auto **gratuita** per il privato.
Anthropic guadagna in 3 modi:

1. **Fee dai demolitori** per ogni pratica assegnata (modello standard)
2. **Aste tra demolitori** per auto "interessanti" (chi paga di più la rottamazione vince)
3. **Aste tra commercianti** per auto ancora buone da rivendere (passaggio di proprietà invece di demolizione)

## 2. Utenti della piattaforma

| Utente | Cosa fa | Come accede |
|---|---|---|
| **Cliente privato** | Richiede demolizione/vendita auto, carica documenti, conferma data ritiro | Auto-registrazione fine flusso `/inizia` |
| **Demolitore** | Riceve assegnazioni, fissa ritiro, carica certificati rottamazione e PRA | Invito email da admin → imposta password |
| **Commerciante auto** | Partecipa alle aste rivendita, vede solo dati auto (no cliente), carica documenti passaggio | Invito email da admin → imposta password |
| **Admin (Davide)** | Approva pratiche, decide flusso (demolizione/asta/rivendita), gestisce aste, recluta operatori | Login con email autorizzata |
| **Collaboratori** (officine, concessionarie, assicurazioni) | Possono inserire pratiche per conto dei loro clienti | Invito email da admin (futuro) |
| **Enti pubblici** (polizia locale, comuni) | Inseriscono veicoli abbandonati | Invito email da admin (futuro) |

## 3. I 3 flussi della pratica

### Flusso A — Demolizione standard

```
Cliente compila /inizia (10 step) → carica documenti dal suo account
   ↓
Admin verifica documenti → approva
   ↓
ALGORITMO ASSEGNAZIONE AUTOMATICA sceglie il demolitore migliore:
  1. Filtra demolitori che coprono il comune del cliente (mappa copertura)
  2. Esclude chi è sopra la soglia "max pratiche aperte" (configurabile)
  3. Calcola distanza stradale via Google Maps Distance Matrix API
  4. Ordina per: velocità storica → distanza → carico settimanale
  5. Assegna al primo della lista
   ↓
Demolitore ha 8 ORE LAVORATIVE per proporre data/ora ritiro
   ↓
Cliente conferma/rifiuta (può comunicare via chat in-app)
   ↓
Giorno del ritiro → demolitore clicca "✅ Veicolo ritirato"
   ↓
Demolitore ha 24 ORE per caricare certificato rottamazione
   ↓
Demolitore ha 15 GIORNI LAVORATIVI per caricare certificato radiazione PRA
   ↓
PRATICA COMPLETATA
```

**Caso edge:** nessun demolitore valido (zona scoperta o tutti saturi) → pratica va in **"Assegnazione manuale"** in admin; tu contatti un demolitore "di favore" oppure accordi col cliente di aspettare.

### Flusso B — Asta tra demolitori

Usato quando l'auto è interessante e tu admin vuoi monetizzarla.

```
Admin (invece di assegnare in automatico) → "Metti in asta demolitori"
   ↓
Admin imposta:
  - Prezzo base (es. 300€)
  - Durata asta (es. 24h)
  - Demolitori invitati: tutti in zona + extra fuori zona (manuali)
   ↓
Demolitori vedono in dashboard "Aste aperte": foto, km, anno, marca, condizioni
(NO dati cliente)
Possono fare offerta (≥ prezzo corrente) — sistema d'asta vera (chi paga di più)
   ↓
Scadenza asta → admin sceglie il vincitore manualmente (non automatico)
(può preferire chi offre meno per altri motivi, es. velocità storica)
   ↓
Vincitore → pratica assegnata a lui, vede dati cliente, parte flusso normale
Perdenti → notifica "asta chiusa"
Se nessuno offre → admin decide: rilancia con prezzo più basso o assegna in automatico
```

### Flusso C — Asta rivendita commercianti

Usato quando l'auto è ancora buona, vale la pena rivenderla invece di demolirla.

```
Admin contatta il cliente per proporre passaggio di proprietà
   ↓
Cliente accetta → pratica in stato "in rivendita"
   ↓
Asta tra commercianti (stessa meccanica delle aste demolitori):
  - Tutti commercianti in zona + extra fuori zona
  - Prezzo base, durata, offerte
   ↓
Scadenza → admin sceglie vincitore manualmente
   ↓
Commerciante vincitore vede dati cliente → si organizza per il passaggio
   ↓
Commerciante ha 30 GIORNI per completare il passaggio di proprietà
   ↓
Commerciante carica documentazione passaggio (atto vendita, libretto aggiornato, ricevuta motorizzazione)
   ↓
PRATICA COMPLETATA + admin riceve % concordata
```

**Alternativa:** admin se la compra direttamente e la rivende privatamente.

## 4. Stati pratica (aggiornati con tutti i flussi)

```
in_attesa_documenti               (cliente non ha ancora caricato foto/doc)
in_attesa_approvazione_admin      (cliente ha caricato, admin deve verificare)
in_valutazione_admin              (admin decide: demolizione/asta/rivendita)

# Ramo demolizione standard
in_attesa_assegnazione            (admin ha scelto demolizione, sistema sta scegliendo)
in_assegnazione_manuale           (nessun demolitore valido, admin lavora a mano)
assegnata                         (demolitore deve proporre data ritiro - max 8h)
in_attesa_conferma_cliente        (demolitore ha proposto, cliente deve accettare)
ritiro_confermato                 (data fissata)
ritirata                          (demolitore ha cliccato "veicolo ritirato")
in_attesa_cert_rottamazione       (max 24h dal ritiro)
in_attesa_cert_radiazione_pra     (max 15 giorni lavorativi)
completata

# Ramo asta demolitori
in_asta_demolitori                (asta aperta)
asta_demolitori_chiusa            (admin deve scegliere vincitore)
# poi confluisce in "assegnata" del ramo demolizione

# Ramo rivendita commercianti
in_attesa_consenso_cliente        (admin contatta cliente, aspetta sì/no)
in_asta_commercianti              (asta aperta tra commercianti)
asta_commercianti_chiusa          (admin deve scegliere vincitore)
in_passaggio_proprieta            (commerciante ha 30 giorni per completare)
passaggio_completato              (con doc caricata)

# Stati comuni
annullata                         (cliente o admin annulla)
```

## 5. Sistema di notifiche

**Canali:**
- **In-app obbligatorie** (campanella, badge, popup) — i demolitori devono attivare le notifiche per ricevere pratiche
- **SMS** per le cose urgenti (assegnazione nuova, scadenze ravvicinate)

**Trigger notifiche per il demolitore:**
- Nuova pratica assegnata
- Scadenza imminente per: data ritiro (8h), certificato rottamazione (24h), certificato PRA (15gg lav.)
- Cliente ha accettato/rifiutato data ritiro
- Nuova asta aperta a lui
- Asta vinta / persa

**Trigger notifiche per il cliente:**
- Pratica approvata
- Demolitore assegnato + data proposta
- Promemoria giorno prima del ritiro
- Caricamento certificati (rottamazione, PRA)
- Pratica completata

**Trigger notifiche per l'admin:**
- Pratica in "assegnazione manuale" (zona scoperta o saturazione)
- Demolitore sfora i tempi
- Asta scaduta (deve scegliere vincitore)

## 6. Database — modifiche e nuove tabelle necessarie

### Modifiche a tabelle esistenti

- `pratiche`: aggiungere campi per i nuovi stati, scadenze (`data_assegnazione`, `scadenza_proposta_ritiro`, `scadenza_cert_rottamazione`, `scadenza_cert_pra`), flag urgenza cliente, prezzo offerto dal demolitore (se vinto in asta)
- `utenti`: campo `tipo` esteso ai valori `cliente`, `demolitore`, `commerciante`, `collaboratore`, `ente_pubblico`, `admin`
- `impostazioni`: aggiungere chiave "max_pratiche_aperte_demolitore" (configurabile)

### Nuove tabelle

- `aste` (id, pratica_id, tipo='demolitori'|'commercianti', prezzo_base, data_apertura, data_chiusura, stato, vincitore_id)
- `offerte_asta` (id, asta_id, offerente_id, importo, timestamp)
- `notifiche_app` (id, utente_id, tipo, titolo, messaggio, letta, link, timestamp)
- `notifiche_sms_inviate` (id, utente_id, numero, testo, stato, timestamp) — log SMS

## 7. Pagine da costruire (in ordine di priorità)

### Subito (cuore del sistema)
1. **Algoritmo di assegnazione automatica** (funzione TypeScript + integrazione Google Distance Matrix)
2. **Tabella `impostazioni`** + UI configurazione admin
3. **Sezione admin "Pratiche da assegnare"** con bottoni: Assegna automatico / Metti in asta demolitori / Metti in rivendita

### Dopo (flusso quotidiano demolitore)
4. **Sistema invito email** demolitore + pagina `/imposta-password`
5. **Login multi-ruolo** (riconosce admin / cliente / demolitore / commerciante e fa redirect alla dashboard giusta)
6. **Dashboard demolitore** `/dashboard-demolitore`:
   - Ritiri da effettuare (priorità)
   - Calendario smart
   - Scadenze attive
   - Storico
   - Area di copertura
   - Notifiche

### Dopo ancora (monetizzazione)
7. **Sistema notifiche in-app** (campanella, badge, popup, web push API per notifiche browser)
8. **Sistema SMS** (es. Twilio o equivalente)
9. **Sezione admin "Asta demolitori"** + UI per invitare demolitori, vedere offerte, scegliere vincitore
10. **Sezione demolitore "Aste aperte"** in dashboard

### Più avanti (commercianti)
11. Tutto il flusso commercianti analogo: invito, login, dashboard, aste rivendita, caricamento documenti passaggio
12. **Mappa commercianti** `/admin/copertura-commercianti` (analoga a `/admin/copertura`)

### Migliorie continue
- Google Maps autocomplete indirizzi nel flusso cliente
- Chat in-app cliente ↔ demolitore
- Sistema fatturazione automatica
- Statistiche e report admin
- Dashboard collaboratori ed enti pubblici

## 8. Stato attuale del progetto (cosa è già fatto)

- ✅ Home + flusso `/inizia` (10 step cliente) + auto-registrazione account cliente
- ✅ Database 16 tabelle + RLS policies
- ✅ Dashboard cliente `/dashboard` + dettaglio pratica
- ✅ Dashboard admin `/admin` con stats e filtri pratiche
- ✅ Login intelligente (admin → /admin, cliente → /dashboard)
- ✅ Gestione demolitori `/admin/demolitori` (lista + form aggiunta)
- ✅ Dettaglio demolitore `/admin/demolitori/[id]` con stato, contratto, area copertura
- ✅ **Mappa demolitore singolo** (MappaComuni.tsx): 3 layer regioni/province/comuni, selezione a cascata, esclusioni puntuali, salvataggio nel DB con tipo, ripristino stato al ricaricamento
- ✅ **Mappa strategica admin** `/admin/copertura`: vista aggregata Italia con copertura totale/parziale/scoperta colorata coerentemente
- ✅ 20 file GeoJSON comuni regionali caricati su Supabase Storage (bucket `geojson-comuni`)
- ✅ Script `scripts/upload-geojson.js` per riupload se serve
