-- ============================================================
-- Rinomine decise il 10/07/2026 (sera):
--  - "Dichiarazione stato veicolo con fermo" → "Autodichiarazione veicolo fuori uso"
--  - "Attestazione di inutilizzabilità del veicolo" → "Dichiarazione Inutilizzabilità Ente Pubblico"
--    (+ descrizione che spiega l'ordine: prima l'autodichiarazione, poi il Comune)
-- Da incollare nel SQL Editor di Supabase.
-- ============================================================

UPDATE casistiche_documenti
SET nome = 'Autodichiarazione veicolo fuori uso'
WHERE codice = 'DICHIARAZIONE_STATO_VEICOLO_FERMO';

UPDATE casistiche_documenti
SET nome = 'Dichiarazione Inutilizzabilità Ente Pubblico',
    descrizione = 'La rilascia il tuo Comune o la Polizia locale presentando l''Autodichiarazione veicolo fuori uso firmata (Legge 14/2026). Fotografala o carica il PDF: l''originale va consegnato al ritiro.'
WHERE codice = 'ATTESTAZIONE_INUTILIZZABILITA';

-- Controllo: 2 nomi nuovi (7 righe ciascuno)
SELECT codice, nome, count(*) AS casistiche
FROM casistiche_documenti
WHERE codice IN ('DICHIARAZIONE_STATO_VEICOLO_FERMO', 'ATTESTAZIONE_INUTILIZZABILITA')
GROUP BY codice, nome;
