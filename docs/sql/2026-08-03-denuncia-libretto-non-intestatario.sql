-- ============================================================
-- DENUNCIA LIBRETTO ANCHE PER IL NON INTESTATARIO (03/08/2026)
--
-- Decisione: la denuncia di smarrimento del libretto si accetta
-- anche nella casistica non_intestatario (il controllo su chi
-- l'ha fatta spetta all'admin dai documenti caricati).
-- Nel catalogo mancava la riga: senza, chi sceglie "ho la
-- denuncia" non se la trova tra i documenti da fotografare.
--
-- La riga viene COPIATA da quella di persona_fisica (stessi
-- testi, condizione 'libretto_smarrito', stesso ordine).
-- ============================================================

insert into casistiche_documenti
  (casistica, codice, nome, descrizione, richiede_upload, richiede_consegna, template_pdf, per_erede, condizione, obbligatorio, ordine)
select
  'non_intestatario', codice, nome, descrizione, richiede_upload, richiede_consegna, template_pdf, per_erede, condizione, obbligatorio, ordine
from casistiche_documenti
where casistica = 'persona_fisica'
  and codice = 'DENUNCIA_SMARRIMENTO_LIBRETTO'
  and not exists (
    select 1 from casistiche_documenti
    where casistica = 'non_intestatario' and codice = 'DENUNCIA_SMARRIMENTO_LIBRETTO'
  );

-- Controllo: ora le casistiche con la denuncia libretto devono essere 8
select casistica, codice, nome
from casistiche_documenti
where condizione = 'libretto_smarrito'
order by casistica;
