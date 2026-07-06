// Conversione SIGLA provincia → NOME ufficiale.
// Serve perché le pratiche salvano la provincia come sigla (es. "ME", presa da Google),
// mentre la copertura dei demolitori e la mappa usano il nome intero (es. "Messina").
// I nomi coincidono con quelli della copertura (demolitori_comuni) e di PROVINCE_REGIONI.

export const SIGLA_A_NOME: Record<string, string> = {
  AG: 'Agrigento', AL: 'Alessandria', AN: 'Ancona', AO: 'Aosta', AR: 'Arezzo', AP: 'Ascoli Piceno', AT: 'Asti', AV: 'Avellino',
  BA: 'Bari', BT: 'Barletta-Andria-Trani', BL: 'Belluno', BN: 'Benevento', BG: 'Bergamo', BI: 'Biella', BO: 'Bologna', BZ: 'Bolzano/Bozen',
  BS: 'Brescia', BR: 'Brindisi', CA: 'Cagliari', CL: 'Caltanissetta', CB: 'Campobasso', CE: 'Caserta', CT: 'Catania', CZ: 'Catanzaro',
  CH: 'Chieti', CO: 'Como', CS: 'Cosenza', CR: 'Cremona', KR: 'Crotone', CN: 'Cuneo', EN: 'Enna', FM: 'Fermo', FE: 'Ferrara', FI: 'Firenze',
  FG: 'Foggia', FC: 'Forlì-Cesena', FR: 'Frosinone', GE: 'Genova', GO: 'Gorizia', GR: 'Grosseto', IM: 'Imperia', IS: 'Isernia', AQ: "L'Aquila",
  SP: 'La Spezia', LT: 'Latina', LE: 'Lecce', LC: 'Lecco', LI: 'Livorno', LO: 'Lodi', LU: 'Lucca', MC: 'Macerata', MN: 'Mantova',
  MS: 'Massa-Carrara', MT: 'Matera', ME: 'Messina', MI: 'Milano', MO: 'Modena', MB: 'Monza e della Brianza', NA: 'Napoli', NO: 'Novara',
  NU: 'Nuoro', OR: 'Oristano', PD: 'Padova', PA: 'Palermo', PR: 'Parma', PV: 'Pavia', PG: 'Perugia', PU: 'Pesaro e Urbino', PE: 'Pescara',
  PC: 'Piacenza', PI: 'Pisa', PT: 'Pistoia', PN: 'Pordenone', PZ: 'Potenza', PO: 'Prato', RG: 'Ragusa', RA: 'Ravenna', RC: 'Reggio di Calabria',
  RE: "Reggio nell'Emilia", RI: 'Rieti', RN: 'Rimini', RM: 'Roma', RO: 'Rovigo', SA: 'Salerno', SS: 'Sassari', SV: 'Savona', SI: 'Siena',
  SR: 'Siracusa', SO: 'Sondrio', SU: 'Sud Sardegna', TA: 'Taranto', TE: 'Teramo', TR: 'Terni', TO: 'Torino', TP: 'Trapani', TN: 'Trento',
  TV: 'Treviso', TS: 'Trieste', UD: 'Udine', VA: 'Varese', VE: 'Venezia', VB: 'Verbano-Cusio-Ossola', VC: 'Vercelli', VR: 'Verona',
  VV: 'Vibo Valentia', VI: 'Vicenza', VT: 'Viterbo',
}

// Ritorna il nome intero della provincia: se riceve una sigla la converte,
// altrimenti restituisce il valore così com'è (già un nome).
export function nomeProvincia(valore: string | null | undefined): string | null {
  if (!valore) return null
  const v = valore.trim()
  return SIGLA_A_NOME[v.toUpperCase()] ?? v
}
