-- ============================================================
-- 19/11/2026 · LE NOTE DELLE RICHIESTE DI VALUTAZIONE
--
-- Davide: la scheda "Cronologia e Note" della valutazione deve vedersi
-- uguale a quella della demolizione. Lì le note sono TANTE, ognuna con la
-- sua data, scritte dal campo in fondo; in valutazione c'era una nota sola
-- (veicoli_vendita.note_admin) con la matita.
--
-- Le note delle valutazioni vanno nella STESSA tabella delle pratiche
-- (pratiche_note), agganciate alla richiesta con `veicolo_vendita_id`.
-- Così, quando la richiesta diventa una pratica, la sua storia si può
-- portare nella cronologia della pratica senza copiare niente.
--
-- La regola di sicurezza non cambia: pratiche_note la legge e la scrive
-- solo l'admin (la regola "Admin gestisce note pratiche" vale per tutte
-- le righe, anche quelle senza pratica).
--
-- Da eseguire nell'editor SQL di Supabase (tutto insieme).
-- Si può rilanciare senza danni.
-- ============================================================

-- 1. una nota può essere di una pratica OPPURE di una richiesta di valutazione
ALTER TABLE pratiche_note ALTER COLUMN pratica_id DROP NOT NULL;

ALTER TABLE pratiche_note
  ADD COLUMN IF NOT EXISTS veicolo_vendita_id uuid REFERENCES veicoli_vendita(id) ON DELETE CASCADE;

ALTER TABLE pratiche_note DROP CONSTRAINT IF EXISTS pratiche_note_di_chi;
ALTER TABLE pratiche_note
  ADD CONSTRAINT pratiche_note_di_chi CHECK (pratica_id IS NOT NULL OR veicolo_vendita_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_pratiche_note_valutazione
  ON pratiche_note (veicolo_vendita_id, creato_il DESC);

-- 2. le note uniche di prima diventano la prima nota della richiesta
--    (già lette: non devono accendere nessuna spia)
INSERT INTO pratiche_note (veicolo_vendita_id, testo, creato_il, letta)
SELECT v.id, btrim(v.note_admin), COALESCE(v.aggiornato_il, v.creato_il), true
FROM veicoli_vendita v
WHERE v.note_admin IS NOT NULL AND btrim(v.note_admin) <> ''
  AND NOT EXISTS (SELECT 1 FROM pratiche_note n WHERE n.veicolo_vendita_id = v.id AND n.testo = btrim(v.note_admin));

UPDATE veicoli_vendita SET note_admin = NULL WHERE note_admin IS NOT NULL;

-- 3. LA STORIA NELLE PRATICHE GIÀ NATE da una richiesta di valutazione
--    (per le nuove lo fa il sito da solo, /api/valutazione-completa):
--    richiesta arrivata, risposta inviata, accettata, con le date vere,
--    e le note della richiesta passano alla pratica.
INSERT INTO pratiche_note (pratica_id, evento, testo, creato_il, letta)
SELECT v.pratica_id, 'val_arrivata', '', v.creato_il, true
FROM veicoli_vendita v
WHERE v.pratica_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pratiche_note n WHERE n.pratica_id = v.pratica_id AND n.evento = 'val_arrivata');

INSERT INTO pratiche_note (pratica_id, evento, testo, creato_il, letta)
SELECT v.pratica_id, 'val_risposta',
       CASE WHEN v.offerta_tipo = 'acquisto'
            THEN 'Riconosciamo ' || replace(to_char(v.offerta_importo, 'FM999,999,990'), ',', '.') || ' €'
            ELSE 'Demolizione gratuita' END,
       v.offerta_inviata_il, true
FROM veicoli_vendita v
WHERE v.pratica_id IS NOT NULL AND v.offerta_inviata_il IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pratiche_note n WHERE n.pratica_id = v.pratica_id AND n.evento = 'val_risposta');

INSERT INTO pratiche_note (pratica_id, evento, testo, creato_il, letta)
SELECT v.pratica_id, 'val_accettata', '', v.risposta_il, true
FROM veicoli_vendita v
WHERE v.pratica_id IS NOT NULL AND v.risposta_il IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pratiche_note n WHERE n.pratica_id = v.pratica_id AND n.evento = 'val_accettata');

UPDATE pratiche_note n
SET pratica_id = v.pratica_id, veicolo_vendita_id = NULL
FROM veicoli_vendita v
WHERE n.veicolo_vendita_id = v.id AND v.pratica_id IS NOT NULL;

-- 4. verifica
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'pratiche_note' AND column_name IN ('pratica_id', 'veicolo_vendita_id');

SELECT count(*) AS note_delle_valutazioni FROM pratiche_note WHERE veicolo_vendita_id IS NOT NULL;

SELECT evento, count(*) AS righe_di_storia FROM pratiche_note WHERE evento LIKE 'val_%' GROUP BY evento ORDER BY evento;
