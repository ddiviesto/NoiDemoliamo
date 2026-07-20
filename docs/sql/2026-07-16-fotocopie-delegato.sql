-- ============================================================
-- 16/07/2026 — ALLEGGERIMENTO WIZARD CLIENTE (decisione Davide)
-- Il cliente NON fotografa più i documenti del DELEGATO:
-- le FOTOCOPIE (fronte e retro) di carta d'identità e codice
-- fiscale del delegato si consegnano al ritiro INSIEME ALLA
-- DELEGA (variante A approvata su mockup).
-- Vale subito anche per le pratiche già aperte: il wizard e
-- l'approvazione admin leggono richiede_upload dal catalogo.
-- ============================================================

-- 1) Spegne il caricamento di carta d'identità e tessera sanitaria
--    del delegato (6 casistiche × 2 documenti = 12 righe)
UPDATE casistiche_documenti
SET richiede_upload = false
WHERE codice IN ('CARTA_IDENTITA_DELEGATO', 'TESSERA_SANITARIA_DELEGATO');

-- 2) La riga della delega (box verde del ritiro) spiega le fotocopie
UPDATE casistiche_documenti
SET descrizione = 'Insieme alla delega consegna anche le fotocopie fronte e retro di carta d''identità e codice fiscale del delegato'
WHERE codice LIKE 'DELEGA_CONSEGNA_VEICOLO%';

-- Controllo: le 12 righe del delegato devono avere upload=false,
-- le 6 deleghe la nuova descrizione
SELECT casistica, codice, richiede_upload, richiede_consegna, descrizione
FROM casistiche_documenti
WHERE condizione = 'delegato'
ORDER BY casistica, codice;
