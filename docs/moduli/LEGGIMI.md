# Moduli PDF — inventario e lavorazione

> Cartella di lavoro per i 13 moduli PDF delle casistiche.
> I file ORIGINALI di Davide (PDF ACI, Word vuoti) vanno nella sottocartella `originali/`.
> Da lì si lavora UN MODULO ALLA VOLTA: testo approvato da Davide → PDF auto-compilato dal sistema → anteprima di prova → attivazione.

## Come si lavora (deciso il 10/07/2026)

1. Davide copia i suoi file in `docs/moduli/originali/` (qualsiasi formato: PDF, Word)
2. Per ogni modulo si decide: **si usa il PDF così com'è** (il sistema ci scrive sopra i dati) oppure **si rifà da zero** (testo proposto da Claude, corretto e approvato da Davide)
3. Prima di attivare: **anteprima compilata con dati di prova**, controllata da Davide
4. Il cliente NON carica il modulo firmato: lo **scarica già compilato** dal box verde "Documenti originali da portare al ritiro", lo firma e lo consegna in originale al ritiro. Il demolitore lo vede nel suo box "Da farti consegnare"
5. Ogni modifica ai testi passa da qui: file versionati su GitHub, storia completa

## Inventario dei 13 moduli

Compila la colonna "Ce l'ho?": `PDF` (pronto), `WORD` (vuoto, da rifare insieme), `NO` (da creare da zero).

> ⭐ INVENTARIO VERIFICATO IL 10/07/2026 (rassegna Claude + Davide sui file in `originali/`)

### Deleghe consegna veicolo (solo se c'è un delegato)

| # | Modulo | Casistica | Ce l'ho? | Stato |
|---|--------|-----------|----------|-------|
| 1 | DELEGA_CONSEGNA_VEICOLO_PRIVATO | Persona fisica | NO (docx 0 byte, vuoto) | da creare da zero |
| 2 | DELEGA_CONSEGNA_VEICOLO_EREDI | Eredi (accettata) | NO (docx 0 byte, vuoto) | da creare da zero |
| 3 | DELEGA_CONSEGNA_VEICOLO_EREDI_RINUNCIA | Eredi con rinuncia | NO (docx 0 byte, vuoto) | da creare da zero |
| 4 | DELEGA_CONSEGNA_VEICOLO_SOCIETA_AZIENDA | Società | NO (docx 0 byte, vuoto) | da creare da zero |
| 5 | DELEGA_CONSEGNA_VEICOLO_FALLIMENTO | Società fallita (firma il curatore) | NO (docx 0 byte, vuoto) | da creare da zero |
| 6 | DELEGA_CONSEGNA_VEICOLO_ASSOCIAZIONE | Associazione (firma il presidente) | NO (docx 0 byte, vuoto) | da creare da zero |

Nota: `MODELLO_DELEGA_PRESENTAZIONE_FORMALITÀ.pdf` (ACI, GDPR aggiornata) è un'ALTRA cosa: delega a
presentare la pratica all'Unità Territoriale ACI/PRA — utile come riferimento di stile e forse al
demolitore per il PRA, ma NON è la delega alla consegna del mezzo. Le 6 deleghe sono documenti
NoiDemoliamo da scrivere (useremo il modello ACI come guida di impostazione).

### Dichiarazioni sostitutive di casistica (sempre presenti per quel caso)

| # | Modulo | Casistica | Ce l'ho? | Stato |
|---|--------|-----------|----------|-------|
| 7 | DICHIARAZIONE_SOSTITUTIVA_EREDITA | Eredi (accettata) | PDF ACI ufficiale (GDPR ok, tabella eredi) | pronto, da rendere compilabile |
| 8 | DICHIARAZIONE_SOSTITUTIVA_EREDITA_RINUNCIA | Eredi con rinuncia | PDF ACI ufficiale (GDPR ok, 2 tabelle: eredi + rinunciatari con estremi Tribunale) | pronto, da rendere compilabile |
| 9 | DICHIARAZIONE_SOSTITUTIVA_LEGALE_RAPPRESENTANTE | Società | PDF ACI ufficiale ⚠️ informativa vecchia (D.lgs 196/2003, pre-GDPR) | da decidere: cercare versione ACI aggiornata o usare questa |
| 10 | DICHIARAZIONE_SOSTITUTIVA_CURATORE_FALLIMENTARE | Società fallita | PDF+Word FATTI DA DAVIDE sul modello ACI (informativa GDPR ok) | da rivedere insieme (wording "curatore/liquidatore giudiziale") |
| 11 | DICHIARAZIONE_SOSTITUTIVA_PRESIDENTE_ASSOCIAZIONE | Associazione | NO — MA il modulo ACI del legale rappresentante (#9) dice già "società/associazione" | proposta: riusare il #9 anche per le associazioni |
| 12 | DICHIARAZIONE_SOSTITUTIVA_RADIAZIONE_PROPRIETARIO_NON_INTESTATARIO | Non intestatario | PDF ACI ufficiale ⚠️ informativa vecchia (196/2003) | da decidere come il #9 |

### Integrazione fermo amministrativo (trasversale ai casi 1–7)

| # | Modulo | Casistica | Ce l'ho? | Stato |
|---|--------|-----------|----------|-------|
| 13 | DICHIARAZIONE_SOSTITUTIVA_STATO_VEICOLO_CON_FERMO_AMMINISTRATIVO | Tutte tranne targhe straniere — intestata automaticamente al firmatario della casistica | NO (il Word è vuoto: solo stili, nessun testo) | da creare da zero, insieme (contenuto delicato: stato veicolo + consapevolezza che il debito resta) |

## Dati che il sistema compila da solo

Targa, marca/modello, dati veicolo, nome e CF del richiedente, nome e telefono del delegato, date.
⚠️ NON abbiamo nel sistema: nomi degli eredi, numero carta d'identità del delegato → nei PDF resteranno righe da completare a penna.

## Nota tecnica (per la lavorazione)

- I documenti template nel catalogo (`casistiche_documenti` con `template_pdf`) oggi hanno `richiede_upload = true`: prima dell'attivazione va portato a `false` (SQL da passare a Davide) — il modulo si scarica e si consegna, NON si carica.
- Download tracciato in `pratica_documenti_checklist.scaricato_il`.
