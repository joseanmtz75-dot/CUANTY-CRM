const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

// --- fixMojibake: repair UTF-8 bytes stored as Latin-1 ---
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

// --- formatName / formatPhone (same as index.js) ---
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

// --- Migration ---
console.log('=== Migración de datos ===\n');

const clients = db.prepare('SELECT id, nombre, telefono, empresa FROM Client').all();
console.log(`Total clientes: ${clients.length}\n`);

const update = db.prepare('UPDATE Client SET nombre = ?, telefono = ?, empresa = ? WHERE id = ?');

let fixed = 0;
let unchanged = 0;
let conflicts = 0;

// Pre-compute all new phones to detect collisions
const phoneMap = new Map(); // newPhone -> first client id that claims it
for (const c of clients) {
  const newPhone = formatPhone(c.telefono);
  if (!phoneMap.has(newPhone)) {
    phoneMap.set(newPhone, c.id);
  }
}

const transaction = db.transaction(() => {
  for (const c of clients) {
    const newNombre = formatName(fixMojibake(c.nombre));
    const newEmpresa = fixMojibake(c.empresa) || c.empresa;
    const newTelefono = formatPhone(c.telefono);

    // Check for phone collision with a different client
    const owner = phoneMap.get(newTelefono);
    if (owner !== c.id) {
      console.log(`  CONFLICTO tel: id=${c.id} "${c.nombre}" tel ${c.telefono} → ${newTelefono} (ya asignado a id=${owner})`);
      conflicts++;
      continue;
    }

    if (newNombre === c.nombre && newTelefono === c.telefono && newEmpresa === c.empresa) {
      unchanged++;
      continue;
    }

    const changes = [];
    if (newNombre !== c.nombre) changes.push(`nombre: "${c.nombre}" → "${newNombre}"`);
    if (newTelefono !== c.telefono) changes.push(`tel: "${c.telefono}" → "${newTelefono}"`);
    if (newEmpresa !== c.empresa) changes.push(`empresa: "${c.empresa}" → "${newEmpresa}"`);
    console.log(`  Corrigiendo id=${c.id}: ${changes.join(' | ')}`);

    update.run(newNombre, newTelefono, newEmpresa, c.id);
    fixed++;
  }
});

transaction();

console.log(`\n=== Resumen ===`);
console.log(`  Corregidos:  ${fixed}`);
console.log(`  Sin cambios: ${unchanged}`);
console.log(`  Conflictos:  ${conflicts}`);
console.log(`\nMigración completada.`);

db.close();
