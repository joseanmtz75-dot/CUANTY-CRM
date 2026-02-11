const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'dev.db'));

const IDS_TO_DELETE = [336, 350, 351, 354];

console.log(`Eliminando ${IDS_TO_DELETE.length} registros duplicados: ${IDS_TO_DELETE.join(', ')}\n`);

// Verify they exist first
const existing = db.prepare(`SELECT id, nombre, telefono FROM Client WHERE id IN (${IDS_TO_DELETE.join(',')})`).all();
console.log('Registros encontrados:');
existing.forEach(r => console.log(`  ID ${r.id}: ${r.nombre} (${r.telefono})`));

if (existing.length === 0) {
  console.log('\nNo se encontraron registros. Ya fueron eliminados.');
  process.exit(0);
}

// Manual cascade delete (in case SQLite foreign keys aren't enforced)
const tables = ['RecommendationLog', 'ClientMetrics', 'StatusChange', 'Interaction'];
const placeholders = IDS_TO_DELETE.map(() => '?').join(',');

db.transaction(() => {
  for (const table of tables) {
    const result = db.prepare(`DELETE FROM ${table} WHERE clientId IN (${placeholders})`).run(...IDS_TO_DELETE);
    if (result.changes > 0) {
      console.log(`  ${table}: ${result.changes} registros eliminados`);
    }
  }

  const result = db.prepare(`DELETE FROM Client WHERE id IN (${placeholders})`).run(...IDS_TO_DELETE);
  console.log(`  Client: ${result.changes} registros eliminados`);
})();

// Verify deletion
const remaining = db.prepare(`SELECT id FROM Client WHERE id IN (${IDS_TO_DELETE.join(',')})`).all();
if (remaining.length === 0) {
  console.log('\nVerificación: todos los duplicados fueron eliminados correctamente.');
} else {
  console.log(`\nADVERTENCIA: ${remaining.length} registros no se pudieron eliminar.`);
}

db.close();
