// Liste anagrafiche per l'autocomplete delle tariffe per zona.
// I nomi seguono la convenzione usata nel resto del sistema (province come nomi,
// coerenti con pratiche.provincia_ritiro e con la mappa di copertura).

export const REGIONI: string[] = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
  'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
  'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
]

// Provincia → Regione (per capire se una provincia è coperta tramite la sua regione)
export const PROVINCIA_A_REGIONE: Record<string, string> = {
  Torino: 'Piemonte', Vercelli: 'Piemonte', Novara: 'Piemonte', Cuneo: 'Piemonte', Asti: 'Piemonte', Alessandria: 'Piemonte', Biella: 'Piemonte', 'Verbano-Cusio-Ossola': 'Piemonte',
  Aosta: "Valle d'Aosta",
  Genova: 'Liguria', Savona: 'Liguria', 'La Spezia': 'Liguria', Imperia: 'Liguria',
  Milano: 'Lombardia', Bergamo: 'Lombardia', Brescia: 'Lombardia', Como: 'Lombardia', Cremona: 'Lombardia', Lecco: 'Lombardia', Lodi: 'Lombardia', Mantova: 'Lombardia', 'Monza e della Brianza': 'Lombardia', Pavia: 'Lombardia', Sondrio: 'Lombardia', Varese: 'Lombardia',
  'Bolzano/Bozen': 'Trentino-Alto Adige', Trento: 'Trentino-Alto Adige',
  Venezia: 'Veneto', Padova: 'Veneto', Treviso: 'Veneto', Verona: 'Veneto', Vicenza: 'Veneto', Belluno: 'Veneto', Rovigo: 'Veneto',
  Trieste: 'Friuli-Venezia Giulia', Udine: 'Friuli-Venezia Giulia', Gorizia: 'Friuli-Venezia Giulia', Pordenone: 'Friuli-Venezia Giulia',
  Bologna: 'Emilia-Romagna', Ferrara: 'Emilia-Romagna', 'Forlì-Cesena': 'Emilia-Romagna', Modena: 'Emilia-Romagna', Parma: 'Emilia-Romagna', Piacenza: 'Emilia-Romagna', Ravenna: 'Emilia-Romagna', "Reggio nell'Emilia": 'Emilia-Romagna', Rimini: 'Emilia-Romagna',
  Firenze: 'Toscana', Arezzo: 'Toscana', Grosseto: 'Toscana', Livorno: 'Toscana', Lucca: 'Toscana', 'Massa-Carrara': 'Toscana', Pisa: 'Toscana', Pistoia: 'Toscana', Prato: 'Toscana', Siena: 'Toscana',
  Perugia: 'Umbria', Terni: 'Umbria',
  Ancona: 'Marche', 'Ascoli Piceno': 'Marche', Fermo: 'Marche', Macerata: 'Marche', 'Pesaro e Urbino': 'Marche',
  Roma: 'Lazio', Frosinone: 'Lazio', Latina: 'Lazio', Rieti: 'Lazio', Viterbo: 'Lazio',
  "L'Aquila": 'Abruzzo', Chieti: 'Abruzzo', Pescara: 'Abruzzo', Teramo: 'Abruzzo',
  Campobasso: 'Molise', Isernia: 'Molise',
  Napoli: 'Campania', Avellino: 'Campania', Benevento: 'Campania', Caserta: 'Campania', Salerno: 'Campania',
  Bari: 'Puglia', Brindisi: 'Puglia', Foggia: 'Puglia', Lecce: 'Puglia', Taranto: 'Puglia', 'Barletta-Andria-Trani': 'Puglia',
  Potenza: 'Basilicata', Matera: 'Basilicata',
  Catanzaro: 'Calabria', Cosenza: 'Calabria', Crotone: 'Calabria', 'Reggio di Calabria': 'Calabria', 'Vibo Valentia': 'Calabria',
  Palermo: 'Sicilia', Agrigento: 'Sicilia', Caltanissetta: 'Sicilia', Catania: 'Sicilia', Enna: 'Sicilia', Messina: 'Sicilia', Ragusa: 'Sicilia', Siracusa: 'Sicilia', Trapani: 'Sicilia',
  Cagliari: 'Sardegna', Nuoro: 'Sardegna', Oristano: 'Sardegna', Sassari: 'Sardegna', 'Sud Sardegna': 'Sardegna',
}

export const PROVINCE: string[] = [
  'Agrigento', 'Alessandria', 'Ancona', 'Aosta', 'Arezzo', 'Ascoli Piceno', 'Asti', 'Avellino',
  'Bari', 'Barletta-Andria-Trani', 'Belluno', 'Benevento', 'Bergamo', 'Biella', 'Bologna', 'Bolzano/Bozen',
  'Brescia', 'Brindisi', 'Cagliari', 'Caltanissetta', 'Campobasso', 'Caserta', 'Catania', 'Catanzaro',
  'Chieti', 'Como', 'Cosenza', 'Cremona', 'Crotone', 'Cuneo', 'Enna', 'Fermo', 'Ferrara', 'Firenze',
  'Foggia', 'Forlì-Cesena', 'Frosinone', 'Genova', 'Gorizia', 'Grosseto', 'Imperia', "L'Aquila",
  'La Spezia', 'Latina', 'Lecce', 'Lecco', 'Livorno', 'Lodi', 'Lucca', 'Macerata', 'Mantova',
  'Massa-Carrara', 'Matera', 'Messina', 'Milano', 'Modena', 'Monza e della Brianza', 'Napoli', 'Novara',
  'Nuoro', 'Oristano', 'Padova', 'Palermo', 'Parma', 'Pavia', 'Perugia', 'Pesaro e Urbino', 'Pescara',
  'Piacenza', 'Pisa', 'Pistoia', 'Pordenone', 'Potenza', 'Prato', 'Ragusa', 'Ravenna', 'Reggio di Calabria',
  "Reggio nell'Emilia", 'Rieti', 'Rimini', 'Roma', 'Rovigo', 'Salerno', 'Sassari', 'Savona', 'Siena',
  'Siracusa', 'Sondrio', 'Sud Sardegna', 'Taranto', 'Teramo', 'Terni', 'Torino', 'Trapani', 'Trento',
  'Treviso', 'Trieste', 'Udine', 'Varese', 'Venezia', 'Verbano-Cusio-Ossola', 'Vercelli', 'Verona',
  'Vibo Valentia', 'Vicenza', 'Viterbo',
]
