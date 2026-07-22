-- ============================================================
-- SEMPLIFICAZIONE CASISTICHE EREDI (22/07/2026, decisione Davide)
-- Nell'area personale fotografa SOLO chi gestisce la pratica
-- (la sua carta d'identità e il suo codice fiscale, fronte e retro).
-- I documenti degli ALTRI eredi arrivano come FOTOCOPIE al ritiro,
-- allegate alla Dichiarazione sostitutiva (che firma solo il dichiarante).
-- Via anche la domanda "Quanti eredi hanno accettato?" da /inizia.
-- ============================================================

-- 1) Carta d'identità: non più moltiplicata per erede, è di chi opera
UPDATE casistiche_documenti
SET per_erede = false,
    nome = 'La tua carta d''identità',
    descrizione = 'Di chi gestisce la pratica: foto fronte e retro. Carta d''identità non disponibile? Va bene anche la patente.'
WHERE casistica IN ('eredi_accettato','eredi_rinuncia')
  AND codice = 'CARTA_IDENTITA_EREDE';

-- 2) Tessera sanitaria: idem
UPDATE casistiche_documenti
SET per_erede = false,
    nome = 'La tua tessera sanitaria',
    descrizione = 'Di chi gestisce la pratica: foto fronte e retro.'
WHERE casistica IN ('eredi_accettato','eredi_rinuncia')
  AND codice = 'TESSERA_SANITARIA_EREDE';

-- 3) Descrizione della Dichiarazione sostitutiva eredità
--    (mostrata nel box verde "da portare al ritiro", testo approvato su mockup)
UPDATE casistiche_documenti
SET descrizione = 'La compila e la firma solo tu che gestisci la pratica. Nella tabella scrivi tutti gli eredi con data e luogo di nascita, grado di parentela e codice fiscale. Insieme alla dichiarazione consegna le fotocopie fronte e retro della carta d''identità (o patente) e del codice fiscale di ogni erede.'
WHERE casistica = 'eredi_accettato'
  AND codice = 'DICHIARAZIONE_EREDITA';

-- 4) Descrizione della Dichiarazione sostitutiva eredità con rinuncia
UPDATE casistiche_documenti
SET descrizione = 'La compila e la firma solo tu che hai accettato l''eredità e gestisci la pratica. Nella prima tabella scrivi gli eredi che hanno accettato; nella seconda chi ha rinunciato, con i dati dell''atto di rinuncia (Notaio o Tribunale). Consegna anche le fotocopie fronte e retro della carta d''identità (o patente) e del codice fiscale di ogni erede che ha accettato. Chi ha rinunciato NON firma nulla e NON allega i suoi documenti.'
WHERE casistica = 'eredi_rinuncia'
  AND codice = 'DICHIARAZIONE_EREDITA_RINUNCIA';

-- 5) Pulizia delle pratiche eredi già aperte: via gli slot degli eredi
--    oltre il primo, ma SOLO se vuoti (le righe con file non si toccano mai)
DELETE FROM pratica_documenti_checklist c
USING casistiche_documenti d
WHERE c.documento_id = d.id
  AND d.codice IN ('CARTA_IDENTITA_EREDE','TESSERA_SANITARIA_EREDE')
  AND c.indice_erede IS NOT NULL AND c.indice_erede > 1
  AND (c.file_url IS NULL OR c.file_url = '' OR c.file_url = '[]');

-- 6) Lo slot del primo erede diventa lo slot unico
--    (sparisce l'etichetta "(primo erede)" nella pagina del cliente)
UPDATE pratica_documenti_checklist c
SET indice_erede = NULL
FROM casistiche_documenti d
WHERE c.documento_id = d.id
  AND d.codice IN ('CARTA_IDENTITA_EREDE','TESSERA_SANITARIA_EREDE')
  AND c.indice_erede = 1;

-- Controllo finale: le 4 righe del catalogo aggiornate
SELECT casistica, codice, nome, per_erede, LEFT(descrizione, 60) AS descrizione
FROM casistiche_documenti
WHERE casistica IN ('eredi_accettato','eredi_rinuncia')
  AND codice IN ('CARTA_IDENTITA_EREDE','TESSERA_SANITARIA_EREDE','DICHIARAZIONE_EREDITA','DICHIARAZIONE_EREDITA_RINUNCIA')
ORDER BY casistica, codice;
