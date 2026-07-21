-- ============================================================
-- 20/07/2026 — RIATTIVAZIONE PRATICA ANNULLATA
-- Quando l'admin annulla, salviamo lo stato in cui era la pratica:
-- così "Riattiva" la riporta ESATTAMENTE dov'era rimasta
-- (stessa filosofia dell'attesa: pausa/annullo sopra lo stato).
-- ============================================================

ALTER TABLE pratiche
  ADD COLUMN IF NOT EXISTS stato_precedente text;

-- Controllo
SELECT count(*) AS annullate, count(stato_precedente) AS con_stato_precedente
FROM pratiche WHERE stato = 'annullata';
