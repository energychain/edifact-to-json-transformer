const messageTypes = {
  UTILMD: {
    name: 'Stammdaten',
    category: 'master_data',
    processes: ['GPKE', 'GeLi Gas', 'WiM', 'MaBiS']
  },
  MSCONS: {
    name: 'Messwerte',
    category: 'metering',
    processes: ['GPKE', 'GeLi Gas', 'MaBiS']
  },
  ORDERS: {
    name: 'Bestellung/Anfrage',
    category: 'order',
    processes: ['GeLi Gas', 'WiM']
  },
  ORDRSP: {
    name: 'Bestellantwort',
    category: 'order_response',
    processes: ['GeLi Gas', 'WiM']
  },
  INVOIC: {
    name: 'Rechnung',
    category: 'invoice',
    processes: ['GPKE', 'GeLi Gas', 'WiM']
  },
  REMADV: {
    name: 'Zahlungsavise',
    category: 'payment',
    processes: ['GPKE', 'GeLi Gas', 'WiM']
  },
  APERAK: {
    name: 'Anwendungsquittung',
    category: 'acknowledgement',
    processes: ['GPKE', 'GeLi Gas', 'WiM', 'MaBiS']
  },
  CONTRL: {
    name: 'Syntaxquittung',
    category: 'acknowledgement',
    processes: ['GPKE', 'GeLi Gas', 'WiM', 'MaBiS']
  },
  IFTSTA: {
    name: 'Statusmeldung',
    category: 'status',
    processes: ['WiM']
  },
  INSRPT: {
    name: 'Störungsmeldung',
    category: 'incident',
    processes: ['WiM']
  },
  REQOTE: {
    name: 'Angebotsanfrage',
    category: 'quotation',
    processes: ['WiM']
  },
  QUOTES: {
    name: 'Angebot',
    category: 'quotation',
    processes: ['WiM']
  },
  PRICAT: {
    name: 'Preiskatalog',
    category: 'pricing',
    processes: ['MaBiS']
  },
  PARTIN: {
    name: 'Partnerinformation',
    category: 'partner',
    processes: ['MaBiS']
  },
  COMDIS: {
    name: 'Datenübermittlung',
    category: 'data_transmission',
    processes: ['MaBiS']
  }
};

module.exports = messageTypes;
