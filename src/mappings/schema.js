function mapToTargetSchema(json, targetSchema) {
  switch (targetSchema) {
    case 'neo4j':
      return mapToNeo4j(json);
    case 'mongodb':
      return mapToMongoDB(json);
    case 'postgres':
      return mapToPostgreSQL(json);
    default:
      return null;
  }
}

function mapToNeo4j(json) {
  const statements = [];

  statements.push({
    cypher: `CREATE (m:Message {\n        id: $id,\n        type: $type,\n        reference_number: $ref,\n        timestamp: $ts\n      })`,
    parameters: {
      id: json.metadata.reference_number,
      type: json.metadata.message_type,
      ref: json.metadata.reference_number,
      ts: json.metadata.parsed_at
    }
  });

  Object.entries(json.parties).forEach(([role, party]) => {
    statements.push({
      cypher: `MERGE (p:Party {mp_id: $mp_id})\n                 ON CREATE SET p.name = $name, p.role = $role\n                 WITH p\n                 MATCH (m:Message {id: $msg_id})\n                 CREATE (m)-[:${role.toUpperCase()}]->(p)`,
      parameters: {
        mp_id: party.id,
        name: party.name,
        role: party.role,
        msg_id: json.metadata.reference_number
      }
    });
  });

  return { statements };
}

function mapToMongoDB(json) {
  return {
    collection: 'edifact_messages',
    document: {
      _id: json.metadata.reference_number,
      message_type: json.metadata.message_type,
      metadata: json.metadata,
      header: json.header,
      body: json.body,
      parties: Object.entries(json.parties).map(([role, party]) => ({
        role,
        ...party
      })),
      dates: json.dates,
      references: json.references,
      segment_groups: json.segment_groups,
      created_at: new Date(json.metadata.parsed_at),
      indexes: {
        malo_ids: json.body.stammdaten?.marktlokationen?.map((m) => m.id) || [],
        melo_ids: json.body.stammdaten?.messlokationen?.map((m) => m.id) || [],
        mp_ids: Object.values(json.parties).map((party) => party.id)
      }
    },
    indexes: [
      { key: { 'metadata.message_type': 1 } },
      { key: { 'indexes.malo_ids': 1 } },
      { key: { 'indexes.mp_ids': 1 } },
      { key: { created_at: -1 } }
    ]
  };
}

function mapToPostgreSQL(json) {
  return {
    tables: {
      messages: {
        insert: `INSERT INTO messages (reference_number, message_type, parsed_at, metadata)\n                   VALUES ($1, $2, $3, $4)`,
        params: [
          json.metadata.reference_number,
          json.metadata.message_type,
          json.metadata.parsed_at,
          JSON.stringify(json.metadata)
        ]
      },
      parties: Object.values(json.parties).map((party) => ({
        insert: `INSERT INTO parties (message_ref, mp_id, name, role, valid_mp_id)\n                   VALUES ($1, $2, $3, $4, $5)`,
        params: [
          json.metadata.reference_number,
          party.id,
          party.name,
          party.role,
          party.valid_mp_id
        ]
      })),
      marktlokationen: (json.body.stammdaten?.marktlokationen || []).map((malo) => ({
        insert: `INSERT INTO marktlokationen (message_ref, malo_id, valid)\n                   VALUES ($1, $2, $3)`,
        params: [
          json.metadata.reference_number,
          malo.id,
          malo.valid
        ]
      }))
    }
  };
}

module.exports = {
  mapToTargetSchema,
  mapToNeo4j,
  mapToMongoDB,
  mapToPostgreSQL
};
