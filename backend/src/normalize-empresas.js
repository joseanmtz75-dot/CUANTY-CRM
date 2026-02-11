// normalize-empresas.js — Normalización de nombres de empresas en BD
// Usage:
//   node src/normalize-empresas.js --dry-run   (muestra cambios propuestos)
//   node src/normalize-empresas.js --apply     (ejecuta cambios en la BD)

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

const applyMode = process.argv.includes('--apply');
if (!applyMode && !process.argv.includes('--dry-run')) {
  console.log('Uso: node src/normalize-empresas.js --dry-run | --apply');
  process.exit(1);
}

// --- Helpers ---

function appendNota(existing, addition) {
  if (!existing) return addition;
  return existing + ' | ' + addition;
}

// Track all changes for summary
const changes = [];

function logChange(id, empresaOld, empresaNew, extra) {
  changes.push({ id, empresaOld, empresaNew, extra });
  const extraStr = extra ? ` (${extra})` : '';
  console.log(`  [ID ${id}] "${empresaOld}" → "${empresaNew}"${extraStr}`);
}

// --- Mapa explícito de normalización ---
// Cada entrada: valor actual (case-sensitive) → { empresa, notas? }

const EMPRESA_MAP = new Map();

function addRule(from, to, notasExtra) {
  EMPRESA_MAP.set(from, { empresa: to, notas: notasExtra || null });
}

// === 1. Distribuidora de Gas Noel ===
const NOEL = 'Distribuidora de Gas Noel';
addRule('Gas Noel', NOEL);
addRule('Noel', NOEL);
addRule('Gas Rosa Noel', NOEL);
addRule('Tesorería Noel', NOEL, 'Depto: Tesorería');

addRule('Gas Noel Irapuato', `${NOEL} (Irapuato)`);
addRule('Noel Irapuato', `${NOEL} (Irapuato)`);

addRule('Gas Noel Leon', `${NOEL} (León)`);
addRule('Noel Leon', `${NOEL} (León)`);

addRule('Gas Noel Querétaro', `${NOEL} (Querétaro)`);
addRule('Noel Querétaro', `${NOEL} (Querétaro)`);
addRule('Noel Qrto', `${NOEL} (Querétaro)`);
addRule('Noel Qto', `${NOEL} (Querétaro)`);

addRule('Noel Abasolo', `${NOEL} (Abasolo)`);
addRule('Noel Aguascalientes', `${NOEL} (Aguascalientes)`);
addRule('Noel Celaya', `${NOEL} (Celaya)`);
addRule('Noel SILAO', `${NOEL} (Silao)`);
addRule('Noel Silao', `${NOEL} (Silao)`);
addRule('Noel San Juan', `${NOEL} (San Juan)`);

// === 2. Distribuidora de Gas San Juan ===
const SAN_JUAN = 'Distribuidora de Gas San Juan';
addRule('Gas San Juan', SAN_JUAN);
addRule('Gas de San Juan', SAN_JUAN);
addRule('Gas san juan', SAN_JUAN);
addRule('Distibuidora Gas De San Juan', SAN_JUAN);

// === 3. Gas Tomza (con sucursales) ===
const TOMZA = 'Gas Tomza';
addRule('Tomza', TOMZA);

addRule('Gas Tomza De Puebla', `${TOMZA} (Puebla)`);
addRule('Gas Tomza de Puebla', `${TOMZA} (Puebla)`);

addRule('Gas Tomza de Mexico', `${TOMZA} (México)`);
addRule('Tomza Mx', `${TOMZA} (México)`);
addRule('Tomza CD México', `${TOMZA} (México)`);

addRule('TOMZA Salvador', `${TOMZA} (Salvador)`);
addRule('Tomza Agua Prieta', `${TOMZA} (Agua Prieta)`);
addRule('Tomza Aguascalientes', `${TOMZA} (Aguascalientes)`);
addRule('Tomza Agu', `${TOMZA} (Aguascalientes)`);
addRule('Tomza Autlán', `${TOMZA} (Autlán)`);
addRule('Tomza Belice', `${TOMZA} (Belice)`);
addRule('Tomza Campecheb', `${TOMZA} (Campeche)`);
addRule('Tomza Chetumal', `${TOMZA} (Chetumal)`);
addRule('Tomza Chihuahua', `${TOMZA} (Chihuahua)`);
addRule('Tomza Culiacán', `${TOMZA} (Culiacán)`);
addRule('Tomza Guatemala', `${TOMZA} (Guatemala)`);
addRule('Tomza La Laja', `${TOMZA} (La Laja)`);
addRule('Tomza Leon', `${TOMZA} (León)`);
addRule('Tomza Merida', `${TOMZA} (Mérida)`);
addRule('Tomza Mexicali', `${TOMZA} (Mexicali)`);
addRule('Tomza Peñasco', `${TOMZA} (Peñasco)`);
addRule('Tomza San Luis', `${TOMZA} (San Luis)`);
addRule('Tomza Yucatan', `${TOMZA} (Yucatán)`);
addRule('Tomza Yucatán', `${TOMZA} (Yucatán)`);
addRule('Tomza Zapopan', `${TOMZA} (Zapopan)`);

// === 4. Super de GDL (antes Gas Rosa) ===
const GDL = 'Super de GDL';
addRule('Gas Rosa', GDL);
addRule('Gas Rosa Gdl', `${GDL} (Guadalajara)`);
addRule('Gas Rosa Leon', `${GDL} (León)`);
addRule('Gas Rosa Querétaro', `${GDL} (Querétaro)`);

// === 5. Super Gas de los Altos ===
const ALTOS = 'Super Gas de los Altos';
addRule('Super Gas', ALTOS);
addRule('Supergas', ALTOS);
addRule('Supergas De Los Altos', ALTOS);
addRule('Super Gas Tonala', `${ALTOS} (Tonalá)`);

// === 6. Gas Butep ===
addRule('Butep', 'Gas Butep');
addRule('Gas butep Oaxaca', 'Gas Butep (Oaxaca)');

// === 7. Rivera Gas ===
addRule('Rivera Gas Mexicali', 'Rivera Gas (Mexicali)');

// === 8. Industrias Zaragoza (INZA) ===
addRule('INZA', 'Industrias Zaragoza (INZA)');

// === 9. Industrias Gutiérrez (Ingusa) ===
addRule('Ingusa', 'Industrias Gutiérrez (Ingusa)');

// === 10. Holbox Gas ===
addRule('Holbox', 'Holbox Gas');
addRule('Holbox Veracruz', 'Holbox Gas (Veracruz)');

// --- Mapa de notas "Empresa detectada:" → empresa oficial ---
const NOTAS_EMPRESA_MAP = new Map([
  ['Gas Noel', NOEL],
  ['Super Gas de los Altos', ALTOS],
  ['Holbox Gas', 'Holbox Gas'],
]);

// --- Load all clients ---
const allClients = db.prepare('SELECT * FROM Client').all();
console.log(`Total clientes en BD: ${allClients.length}\n`);

// Collect updates: id -> { empresa?, notas? }
const pendingUpdates = new Map();

function addUpdate(id, field, value) {
  if (!pendingUpdates.has(id)) pendingUpdates.set(id, {});
  pendingUpdates.get(id)[field] = value;
}

// ===================================================================
// PASO 1: Normalizar campo empresa por mapa explícito
// ===================================================================
console.log('=== PASO 1: Normalizar campo empresa (mapa explícito) ===');

let paso1Count = 0;
for (const c of allClients) {
  if (!c.empresa) continue;

  const trimmed = c.empresa.trim();
  const rule = EMPRESA_MAP.get(trimmed);
  if (!rule) continue;

  // Skip if already normalized
  if (trimmed === rule.empresa && !rule.notas) continue;

  addUpdate(c.id, 'empresa', rule.empresa);

  if (rule.notas) {
    addUpdate(c.id, 'notas', appendNota(c.notas, rule.notas));
    logChange(c.id, trimmed, rule.empresa, `notas += "${rule.notas}"`);
  } else {
    logChange(c.id, trimmed, rule.empresa);
  }

  paso1Count++;
}

console.log(`  (${paso1Count} cambios)\n`);

// ===================================================================
// PASO 2: Clientes con notas "Empresa detectada: X" sin empresa
// ===================================================================
console.log('=== PASO 2: Empresa desde notas "Empresa detectada:" ===');

let paso2Count = 0;
for (const c of allClients) {
  // Skip if already has empresa (either original or from paso 1)
  const currentEmpresa = pendingUpdates.has(c.id) && pendingUpdates.get(c.id).empresa
    ? pendingUpdates.get(c.id).empresa
    : c.empresa;

  if (currentEmpresa) continue;
  if (!c.notas) continue;

  // Look for "Empresa detectada: X" in notas
  const match = c.notas.match(/Empresa detectada:\s*(.+?)(?:\s*\||$)/);
  if (!match) continue;

  const detected = match[1].trim();

  // Check if detected empresa maps to an official name
  let officialName = NOTAS_EMPRESA_MAP.get(detected);

  // Also try the general map
  if (!officialName) {
    const rule = EMPRESA_MAP.get(detected);
    if (rule) officialName = rule.empresa;
  }

  if (!officialName) {
    // Use detected name as-is if no mapping found
    officialName = detected;
  }

  addUpdate(c.id, 'empresa', officialName);
  logChange(c.id, '(vacío)', officialName, `desde notas: "${detected}"`);
  paso2Count++;
}

console.log(`  (${paso2Count} cambios)\n`);

// ===================================================================
// RESUMEN
// ===================================================================
console.log('=== RESUMEN ===');
console.log(`  Total cambios: ${pendingUpdates.size}`);
console.log(`    Paso 1 (mapa empresa):  ${paso1Count}`);
console.log(`    Paso 2 (desde notas):   ${paso2Count}`);

// ===================================================================
// APPLY
// ===================================================================
if (applyMode) {
  console.log('\n=== APLICANDO CAMBIOS ===\n');

  const updateEmpresa = db.prepare('UPDATE Client SET empresa = ? WHERE id = ?');
  const updateNotas = db.prepare('UPDATE Client SET notas = ? WHERE id = ?');

  const transaction = db.transaction(() => {
    let updated = 0;

    for (const [id, fields] of pendingUpdates.entries()) {
      if (fields.empresa !== undefined) {
        updateEmpresa.run(fields.empresa, id);
      }
      if (fields.notas !== undefined) {
        updateNotas.run(fields.notas, id);
      }
      const fieldsStr = Object.keys(fields).join(', ');
      console.log(`  Actualizado id=${id}: ${fieldsStr}`);
      updated++;
    }

    console.log(`\n  Updates aplicados: ${updated}`);
  });

  transaction();
  console.log('\nCambios aplicados exitosamente.');
} else {
  console.log('\nModo --dry-run: no se modificó nada.');
  console.log('Ejecuta con --apply para aplicar los cambios:');
  console.log('  node src/normalize-empresas.js --apply');
}

db.close();
