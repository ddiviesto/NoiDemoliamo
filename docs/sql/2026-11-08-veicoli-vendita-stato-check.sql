-- ============================================================
-- 08/11/2026 · veicoli_vendita: il vincolo sullo STATO rimesso in riga
--
-- Davide, inviando una richiesta di valutazione:
--   new row for relation "veicoli_vendita" violates check constraint
--   "veicoli_vendita_stato_check"
--
-- Quel vincolo non sta in nessun file di docs/sql: è nato a mano in
-- Supabase, con una lista di stati vecchia. Gli stati che il sito scrive
-- oggi (lib/statiValutazione.ts) sono cinque:
--   da_valutare · risposta_inviata · passata_demolizione · rifiutata · chiusa
--
-- Effetto collaterale che spiegava "email già registrata": l'account
-- veniva creato PRIMA dell'inserimento, l'inserimento falliva, l'account
-- restava. Da admin si toglie con "Pulisci account senza pratiche".
--
-- Da eseguire nell'editor SQL di Supabase (tutto insieme).
-- ============================================================

-- 1. Com'era (resta a verbale nel risultato della query)
SELECT conname, pg_get_constraintdef(oid) AS definizione_vecchia
FROM pg_constraint
WHERE conname = 'veicoli_vendita_stato_check';

-- 2. Via il vecchio, dentro il nuovo
ALTER TABLE veicoli_vendita DROP CONSTRAINT IF EXISTS veicoli_vendita_stato_check;

ALTER TABLE veicoli_vendita
  ADD CONSTRAINT veicoli_vendita_stato_check
  CHECK (stato IN ('da_valutare', 'risposta_inviata', 'passata_demolizione', 'rifiutata', 'chiusa'));

-- 3. Verifica
SELECT conname, pg_get_constraintdef(oid) AS definizione_nuova
FROM pg_constraint
WHERE conname = 'veicoli_vendita_stato_check';
