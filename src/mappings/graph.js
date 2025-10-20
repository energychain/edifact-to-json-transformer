function extractGraphRelations(json) {
  const relations = [];

  Object.entries(json.parties).forEach(([role, party]) => {
    relations.push({
      from: { type: 'Message', id: json.metadata.reference_number },
      to: { type: 'Party', id: party.id },
      relationship:
        role === 'sender'
          ? 'SENT_BY'
          : role === 'receiver'
          ? 'RECEIVED_BY'
          : `HAS_${role.toUpperCase()}`,
      properties: {
        name: party.name,
        role: party.role,
        mp_id_valid: party.valid_mp_id
      }
    });
  });

  if (json.body.stammdaten?.marktlokationen) {
    json.body.stammdaten.marktlokationen.forEach((malo) => {
      relations.push({
        from: { type: 'Message', id: json.metadata.reference_number },
        to: { type: 'Marktlokation', id: malo.id },
        relationship: 'REFERENCES_MALO',
        properties: {
          valid: malo.valid
        }
      });
    });
  }

  if (json.body.stammdaten?.messlokationen) {
    json.body.stammdaten.messlokationen.forEach((melo) => {
      relations.push({
        from: { type: 'Message', id: json.metadata.reference_number },
        to: { type: 'Messlokation', id: melo.id },
        relationship: 'REFERENCES_MELO',
        properties: {
          valid: melo.valid
        }
      });

      if (json.body.stammdaten.marktlokationen?.length > 0) {
        json.body.stammdaten.marktlokationen.forEach((malo) => {
          relations.push({
            from: { type: 'Marktlokation', id: malo.id },
            to: { type: 'Messlokation', id: melo.id },
            relationship: 'HAS_MELO'
          });
        });
      }
    });
  }

  if (json.body.stammdaten?.bilanzkreise) {
    json.body.stammdaten.bilanzkreise.forEach((bk) => {
      Object.values(json.parties).forEach((party) => {
        relations.push({
          from: { type: 'Party', id: party.id },
          to: { type: 'Bilanzkreis', id: bk.id },
          relationship: 'BELONGS_TO_BK'
        });
      });
    });
  }

  return relations;
}

module.exports = {
  extractGraphRelations
};
