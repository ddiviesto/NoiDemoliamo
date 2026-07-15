-- ============================================================
-- MODULI PDF: solo da scaricare/firmare/consegnare, NON da caricare
-- (deciso il 10/07/2026: niente foto del modulo firmato).
--
-- Toglie richiede_upload dai 19 documenti template del catalogo:
-- spariscono dal wizard di caricamento del cliente e non contano
-- più per lo stato pratica ("in verifica" / "da assegnare").
-- Restano richiede_consegna=true: compaiono nel box verde del
-- cliente (col bottone Scarica) e nel box del demolitore.
--
-- Da incollare nel SQL Editor di Supabase.
-- ============================================================

UPDATE casistiche_documenti
SET richiede_upload = false
WHERE template_pdf IS NOT NULL;

-- Controllo: 19 righe, tutte con upload=false e consegna=true
SELECT casistica, codice, richiede_upload, richiede_consegna
FROM casistiche_documenti
WHERE template_pdf IS NOT NULL
ORDER BY codice, casistica;
