const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

const executeMode = process.argv.includes('--execute');

// --- formatName / formatPhone (same as migrate-data.js) ---
const LOWERCASE_WORDS = new Set(['de', 'del', 'los', 'las', 'y', 'e', 'el', 'la']);

function formatName(name) {
  if (!name) return '';
  const cleaned = String(name).trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned.split(' ').map((word, i) => {
    const lower = word.toLowerCase();
    if (i > 0 && LOWERCASE_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
}

function formatPhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 13 && digits.startsWith('521')) digits = digits.substring(3);
  else if (digits.length === 12 && digits.startsWith('52')) digits = digits.substring(2);
  if (digits.length === 10) {
    return `+52 ${digits.substring(0, 2)} ${digits.substring(2, 6)} ${digits.substring(6)}`;
  }
  return digits;
}

// --- Score a client record (higher = more complete) ---
function scoreClient(client) {
  let score = 0;
  if (client.nombre) score++;
  if (client.telefono) score++;
  if (client.email) score++;
  if (client.empresa) score++;
  if (client.origen) score++;
  if (client.estatus && client.estatus !== 'Nuevo') score++;
  return score;
}

// --- Load all clients ---
console.log('=== Detección de duplicados ===\n');

const clients = db.prepare('SELECT * FROM Client').all();
console.log(`Total clientes: ${clients.length}\n`);

// --- Group by normalized phone ---
const phoneGroups = new Map();
for (const c of clients) {
  const normalizedPhone = formatPhone(c.telefono);
  if (!normalizedPhone) continue;
  if (!phoneGroups.has(normalizedPhone)) {
    phoneGroups.set(normalizedPhone, []);
  }
  phoneGroups.get(normalizedPhone).push(c);
}

const phoneDuplicates = [...phoneGroups.entries()].filter(([, group]) => group.length > 1);

// --- Group by normalized name ---
const nameGroups = new Map();
for (const c of clients) {
  const normalizedName = formatName(c.nombre).toLowerCase();
  if (!normalizedName) continue;
  if (!nameGroups.has(normalizedName)) {
    nameGroups.set(normalizedName, []);
  }
  nameGroups.get(normalizedName).push(c);
}

const nameDuplicates = [...nameGroups.entries()].filter(([, group]) => group.length > 1);

// --- Report phone duplicates ---
const idsToDelete = new Set();

if (phoneDuplicates.length > 0) {
  console.log(`--- Duplicados por teléfono: ${phoneDuplicates.length} grupo(s) ---\n`);
  for (const [phone, group] of phoneDuplicates) {
    console.log(`  Teléfono normalizado: ${phone}`);

    // Score and sort: best first, then most recent as tiebreaker
    const scored = group.map(c => ({
      ...c,
      score: scoreClient(c),
    })).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const keep = scored[0];
    const dupes = scored.slice(1);

    console.log(`    CONSERVAR: id=${keep.id} "${keep.nombre}" tel="${keep.telefono}" score=${keep.score}`);
    for (const d of dupes) {
      console.log(`    ELIMINAR:  id=${d.id} "${d.nombre}" tel="${d.telefono}" score=${d.score}`);
      idsToDelete.add(d.id);
    }
    console.log();
  }
} else {
  console.log('--- No se encontraron duplicados por teléfono ---\n');
}

// --- Report name duplicates (info only, no auto-delete) ---
// Exclude pairs already handled by phone dedup
const nameOnlyDuplicates = nameDuplicates.filter(([, group]) => {
  const phones = new Set(group.map(c => formatPhone(c.telefono)));
  return phones.size > 1; // different phones = true name collision, not phone dup
});

if (nameOnlyDuplicates.length > 0) {
  console.log(`--- Posibles duplicados por nombre (diferente teléfono): ${nameOnlyDuplicates.length} grupo(s) ---`);
  console.log('   (Solo informativo, no se eliminan automáticamente)\n');
  for (const [name, group] of nameOnlyDuplicates) {
    console.log(`  Nombre: "${formatName(group[0].nombre)}"`);
    for (const c of group) {
      const mark = idsToDelete.has(c.id) ? ' [ya marcado para eliminar]' : '';
      console.log(`    id=${c.id} tel="${c.telefono}" email="${c.email || ''}"${mark}`);
    }
    console.log();
  }
} else {
  console.log('--- No se encontraron posibles duplicados por nombre ---\n');
}

// --- Summary ---
console.log('=== Resumen ===');
console.log(`  Duplicados por teléfono: ${phoneDuplicates.length} grupo(s)`);
console.log(`  Registros a eliminar:    ${idsToDelete.size}`);
console.log(`  Posibles duplicados por nombre (diferente tel): ${nameOnlyDuplicates.length} grupo(s)`);

// --- Execute deletion ---
if (idsToDelete.size === 0) {
  console.log('\nNo hay duplicados para eliminar.');
} else if (executeMode) {
  console.log('\n--- Ejecutando eliminación ---\n');

  const deleteStmt = db.prepare('DELETE FROM Client WHERE id = ?');
  const transaction = db.transaction(() => {
    for (const id of idsToDelete) {
      deleteStmt.run(id);
      console.log(`  Eliminado id=${id}`);
    }
  });

  transaction();
  console.log(`\nEliminados ${idsToDelete.size} registros duplicados.`);
} else {
  console.log('\nModo dry-run: no se eliminó nada.');
  console.log('Ejecuta con --execute para eliminar los duplicados:');
  console.log('  node src/dedup-clients.js --execute');
}

db.close();
