const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

function fixMojibake(str) {
  if (!str) return str;
  if (!/Ã/.test(str)) return str;
  try {
    const bytes = Buffer.from(str, 'latin1');
    const fixed = bytes.toString('utf-8');
    if (!fixed.includes('\uFFFD')) return fixed;
  } catch (e) {}
  return str;
}

const IDS = [336, 350, 351, 354];

console.log('=== Fix mojibake en 4 registros ===\n');

const select = db.prepare('SELECT id, nombre, empresa FROM Client WHERE id = ?');
const update = db.prepare('UPDATE Client SET nombre = ?, empresa = ? WHERE id = ?');

let fixed = 0;

const transaction = db.transaction(() => {
  for (const id of IDS) {
    const row = select.get(id);
    if (!row) {
      console.log(`  ID ${id}: no encontrado, saltando`);
      continue;
    }

    const newNombre = fixMojibake(row.nombre) || row.nombre;
    const newEmpresa = fixMojibake(row.empresa) || row.empresa;

    if (newNombre === row.nombre && newEmpresa === row.empresa) {
      console.log(`  ID ${id}: sin cambios ("${row.nombre}")`);
      continue;
    }

    const changes = [];
    if (newNombre !== row.nombre) changes.push(`nombre: "${row.nombre}" → "${newNombre}"`);
    if (newEmpresa !== row.empresa) changes.push(`empresa: "${row.empresa}" → "${newEmpresa}"`);
    console.log(`  ID ${id}: ${changes.join(' | ')}`);

    update.run(newNombre, newEmpresa, id);
    fixed++;
  }
});

transaction();

console.log(`\n=== Resumen: ${fixed} corregidos ===`);
db.close();
