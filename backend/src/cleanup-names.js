// cleanup-names.js — Clasificación y limpieza de nombres en BD
// Usage:
//   node src/cleanup-names.js --dry-run   (muestra cambios propuestos)
//   node src/cleanup-names.js --apply     (ejecuta cambios en la BD)

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

const applyMode = process.argv.includes('--apply');
if (!applyMode && !process.argv.includes('--dry-run')) {
  console.log('Uso: node src/cleanup-names.js --dry-run | --apply');
  process.exit(1);
}

// --- Helpers ---

function normalize(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function appendNota(existing, addition) {
  if (!existing) return addition;
  return existing + ' | ' + addition;
}

// Track all changes for summary
const changes = [];
const deletions = [];

function logChange(bloque, id, nombre, description, updates) {
  changes.push({ bloque, id, nombre, description, updates });
  console.log(`  [ID ${id}] "${nombre}" → ${description}`);
}

function logDeletion(bloque, id, nombre, reason) {
  deletions.push({ bloque, id, nombre, reason });
  console.log(`  [ID ${id}] "${nombre}" → ELIMINAR (${reason})`);
}

// --- Load all clients ---
const allClients = db.prepare('SELECT * FROM Client').all();
console.log(`Total clientes en BD: ${allClients.length}\n`);

// Build lookup map
const clientById = new Map();
for (const c of allClients) clientById.set(c.id, c);

// Track processed IDs to avoid double-processing
const processed = new Set();

// Collect updates: { id, field: value, ... }
const pendingUpdates = new Map(); // id -> { field: value }
const pendingDeletes = new Set();

function addUpdate(id, field, value) {
  if (!pendingUpdates.has(id)) pendingUpdates.set(id, {});
  pendingUpdates.get(id)[field] = value;
}

// ===================================================================
// BLOQUE 1: Solo cargo sin nombre real
// ===================================================================
console.log('=== BLOQUE 1: Solo cargo sin nombre real ===');

const bloque1Ids = [650, 651, 652, 653, 531, 257, 258, 259, 260, 91];

for (const id of bloque1Ids) {
  const c = clientById.get(id);
  if (!c) { console.log(`  [ID ${id}] No encontrado, saltando`); continue; }

  const name = c.nombre;
  const norm = normalize(name);
  const parts = [];

  if (/t[eé]cnico/i.test(name)) {
    addUpdate(id, 'rol', 'tecnico');
    parts.push('rol: tecnico');

    // Extract empresa if present after "Tecnico/Técnico [Especial]?"
    const match = name.match(/t[eé]cnico(?:\s+especial)?\s+(.+)/i);
    if (match) {
      const empresaCandidate = match[1].trim();
      // Don't treat single letter suffixes as empresa (e.g. "Técnico U")
      if (empresaCandidate.length > 2) {
        if (!c.empresa) {
          addUpdate(id, 'empresa', empresaCandidate);
          parts.push(`empresa: ${empresaCandidate}`);
        } else {
          const nota = `Empresa detectada: ${empresaCandidate}`;
          addUpdate(id, 'notas', appendNota(c.notas, nota));
          parts.push(`notas += "${nota}"`);
        }
      }
    }
  } else if (/gerencia|gerente/i.test(name)) {
    addUpdate(id, 'rol', 'gerencia');
    parts.push('rol: gerencia');

    // Extract empresa from "Gerencia/Gerente [Planta]? <empresa>"
    const match = name.match(/geren(?:te|cia)\s+(?:planta\s+)?(?:de\s+)?(.+)/i);
    if (match) {
      const empresaCandidate = match[1].trim();
      if (empresaCandidate.length > 2) {
        if (!c.empresa) {
          addUpdate(id, 'empresa', empresaCandidate);
          parts.push(`empresa: ${empresaCandidate}`);
        } else {
          const nota = `Empresa detectada: ${empresaCandidate}`;
          addUpdate(id, 'notas', appendNota(c.notas, nota));
          parts.push(`notas += "${nota}"`);
        }
      }
    }
  } else if (/asistente\s+direccion/i.test(norm)) {
    addUpdate(id, 'estatus', 'Perdido');
    parts.push('estatus: Perdido');
  }

  if (parts.length > 0) {
    logChange(1, id, name, parts.join(', '), pendingUpdates.get(id));
    processed.add(id);
  }
}

console.log();

// ===================================================================
// BLOQUE 6: Nombre + cargo pegado (antes de Bloque 2/3 para evitar conflictos)
// ===================================================================
console.log('=== BLOQUE 6: Nombre + cargo pegado ===');

const bloque6Ids = [56, 106, 531];

for (const id of bloque6Ids) {
  if (processed.has(id)) {
    console.log(`  [ID ${id}] Ya procesado en bloque anterior, saltando`);
    continue;
  }
  const c = clientById.get(id);
  if (!c) { console.log(`  [ID ${id}] No encontrado, saltando`); continue; }

  const name = c.nombre;
  const match = name.match(/^(.+?)\s+(Gerente|T[eé]cnico)\s+(.*)$/i);
  if (!match) {
    console.log(`  [ID ${id}] "${name}" — no coincide con patron cargo, saltando`);
    continue;
  }

  const beforeCargo = match[1].trim();
  const cargo = match[2];
  const afterCargo = match[3].trim();
  const cleanName = (beforeCargo + (afterCargo ? ' ' + afterCargo : '')).trim();
  const cargoNorm = normalize(cargo);

  const parts = [];

  addUpdate(id, 'nombre', cleanName);
  parts.push(`nombre: "${cleanName}"`);

  const notaCargo = `Cargo: ${cargo}`;
  addUpdate(id, 'notas', appendNota(c.notas, notaCargo));
  parts.push(`notas += "${notaCargo}"`);

  if (cargoNorm.includes('gerente')) {
    addUpdate(id, 'rol', 'gerencia');
    parts.push('rol: gerencia');
  } else if (cargoNorm.includes('tecnico')) {
    addUpdate(id, 'rol', 'tecnico');
    parts.push('rol: tecnico');
  }

  logChange(6, id, name, parts.join(', '), pendingUpdates.get(id));
  processed.add(id);
}

console.log();

// ===================================================================
// BLOQUE 2: Titulos profesionales Ing/Lic
// ===================================================================
console.log('=== BLOQUE 2: Títulos profesionales Ing/Lic ===');

let bloque2Count = 0;
for (const c of allClients) {
  if (processed.has(c.id)) continue;

  const match = c.nombre.match(/^(Ing\.?|Lic\.?)\s+(.+)$/i);
  if (!match) continue;

  const titulo = match[1].replace(/\.?$/, '.'); // Normalize to "Ing." or "Lic."
  const cleanName = match[2].trim();

  const parts = [];

  addUpdate(c.id, 'nombre', cleanName);
  parts.push(`nombre: "${cleanName}"`);

  const notaTitulo = `Titulo: ${titulo}`;
  addUpdate(c.id, 'notas', appendNota(c.notas, notaTitulo));
  parts.push(`notas += "${notaTitulo}"`);

  logChange(2, c.id, c.nombre, parts.join(', '), pendingUpdates.get(c.id));
  // Don't add to processed — allow bloque 3 to chain empresa extraction
  bloque2Count++;
}

console.log(`  (${bloque2Count} contactos)\n`);

// ===================================================================
// BLOQUE 3: Empresa pegada al nombre
// ===================================================================
console.log('=== BLOQUE 3: Empresa pegada al nombre ===');

// Compound patterns (search as substring, order from longest to shortest)
const EMPRESA_PATTERNS_COMPOUND = [
  'Mexicana de Gas', 'Distribuidora Potosina', 'Gas y Servicio',
  'Gas Milenium', 'Gas Mundial', 'Gas Vulcano', 'Gas Butano',
  'Gas Butep', 'Gas Tomza', 'Gas Rosa', 'Gas Noel', 'Gas Nova',
  'Gas Lagos', 'Gas Tlacotepec', 'Gas San', 'Gas de Tenabo',
  'Gas de', 'Super Gas', 'Hidro Gas', 'Soni Gas', 'Rivera Gas',
  '2000 Gas', 'Holbox Gas',
].sort((a, b) => b.length - a.length); // longest first

// Single-word empresa names (case-insensitive match on word boundary)
const EMPRESA_WORDS = [
  'Hidrogas', 'Tomza', 'Combugas', 'Ingusa', 'Tecogas',
  'Damiano', 'Damigas', 'Holbox', 'Gasomatico', 'Propigas',
  'Multigas', 'Unigas', 'Adrogas', 'Noel',
];

// False positives: names/surnames that look like empresa patterns
const FALSE_POSITIVES = ['gaspar', 'rosales'];

// IDs reserved for later bloques (5: etiquetas genéricas) — skip in bloque 3
const BLOQUE5_IDS = new Set([135, 136, 304, 305]);

function detectEmpresaInName(nombre) {
  const norm = normalize(nombre);

  // Check false positives
  for (const fp of FALSE_POSITIVES) {
    if (norm.includes(fp)) return null;
  }

  // Try compound patterns first (case-insensitive)
  for (const pattern of EMPRESA_PATTERNS_COMPOUND) {
    const patternNorm = normalize(pattern);
    const idx = norm.indexOf(patternNorm);
    if (idx < 0) continue;
    if (idx === 0) continue; // empresa at start = probably IS the name

    // Ensure match starts at a word boundary (space or start)
    if (idx > 0 && norm[idx - 1] !== ' ') continue;

    const beforeStr = nombre.substring(0, idx).trim();
    const empresaStr = nombre.substring(idx).trim();

    // Must have at least one word before the empresa
    if (beforeStr.split(/\s+/).filter(Boolean).length < 1) continue;

    return { cleanName: beforeStr, empresa: empresaStr };
  }

  // Try single-word empresa names
  for (const word of EMPRESA_WORDS) {
    const wordNorm = normalize(word);
    // Match as whole word (not part of another word)
    const regex = new RegExp(`\\b${wordNorm}\\b`);
    const normMatch = regex.exec(norm);
    if (!normMatch) continue;
    const idx = normMatch.index;
    if (idx === 0) continue; // at start = is the name

    // Find the actual position in the original string
    const beforeStr = nombre.substring(0, idx).trim();
    const empresaStr = nombre.substring(idx).trim();

    if (beforeStr.split(/\s+/).filter(Boolean).length < 1) continue;

    return { cleanName: beforeStr, empresa: empresaStr };
  }

  return null;
}

let bloque3Count = 0;
for (const c of allClients) {
  if (processed.has(c.id)) continue;
  if (BLOQUE5_IDS.has(c.id)) continue; // reserved for bloque 5

  // Also check clients that went through bloque 2 (name may now have empresa)
  const currentName = pendingUpdates.has(c.id) && pendingUpdates.get(c.id).nombre
    ? pendingUpdates.get(c.id).nombre
    : c.nombre;

  const result = detectEmpresaInName(currentName);
  if (!result) continue;

  const parts = [];

  addUpdate(c.id, 'nombre', result.cleanName);
  parts.push(`nombre: "${result.cleanName}"`);

  const currentEmpresa = pendingUpdates.has(c.id) && pendingUpdates.get(c.id).empresa
    ? pendingUpdates.get(c.id).empresa
    : c.empresa;

  if (!currentEmpresa) {
    addUpdate(c.id, 'empresa', result.empresa);
    parts.push(`empresa: "${result.empresa}"`);
  } else {
    const nota = `Empresa detectada: ${result.empresa}`;
    const currentNotas = pendingUpdates.has(c.id) && pendingUpdates.get(c.id).notas
      ? pendingUpdates.get(c.id).notas
      : c.notas;
    addUpdate(c.id, 'notas', appendNota(currentNotas, nota));
    parts.push(`notas += "${nota}"`);
  }

  logChange(3, c.id, c.nombre, parts.join(', '), pendingUpdates.get(c.id));
  processed.add(c.id);
  bloque3Count++;
}

console.log(`  (${bloque3Count} contactos)\n`);

// ===================================================================
// BLOQUE 4: Duplicados con número
// ===================================================================
console.log('=== BLOQUE 4: Duplicados con número ===');

const bloque4Ids = [77, 224, 247, 309, 493, 579, 667];

function scoreClient(client) {
  let score = 0;
  if (client.email) score++;
  if (client.empresa) score++;
  if (client.notas) score++;
  if (client.ultimoContacto) score += 2;
  if (client.origen) score++;
  if (client.estatus && client.estatus !== 'Nuevo') score++;
  // Count interactions
  const interactions = db.prepare('SELECT COUNT(*) as cnt FROM Interaction WHERE clientId = ?').get(client.id);
  if (interactions && interactions.cnt > 0) score += 2;
  return score;
}

for (const id of bloque4Ids) {
  const c = clientById.get(id);
  if (!c) { console.log(`  [ID ${id}] No encontrado, saltando`); continue; }

  // Remove trailing number from name
  const nameMatch = c.nombre.match(/^(.+?)\s+\d+$/);
  if (!nameMatch) {
    console.log(`  [ID ${id}] "${c.nombre}" — no tiene número al final, saltando`);
    continue;
  }

  const baseName = nameMatch[1].trim();
  const baseNameNorm = normalize(baseName);

  // Find potential duplicate
  const duplicate = allClients.find(other => {
    if (other.id === id) return false;
    if (pendingDeletes.has(other.id)) return false;
    return normalize(other.nombre) === baseNameNorm;
  });

  if (duplicate) {
    const scoreThis = scoreClient(c);
    const scoreDup = scoreClient(duplicate);

    console.log(`  [ID ${id}] "${c.nombre}" (score=${scoreThis}) vs [ID ${duplicate.id}] "${duplicate.nombre}" (score=${scoreDup})`);

    if (scoreThis > scoreDup) {
      // Keep this one (with cleaned name), delete the other
      addUpdate(id, 'nombre', baseName);
      logDeletion(4, duplicate.id, duplicate.nombre, `duplicado de "${baseName}", score menor`);
      pendingDeletes.add(duplicate.id);
    } else {
      // Delete this one, keep the other
      logDeletion(4, id, c.nombre, `duplicado de "${duplicate.nombre}", score menor o igual`);
      pendingDeletes.add(id);
    }
  } else {
    // No duplicate found, just clean the name
    addUpdate(id, 'nombre', baseName);
    logChange(4, id, c.nombre, `nombre: "${baseName}" (sin duplicado)`, { nombre: baseName });
  }

  processed.add(id);
}

console.log();

// ===================================================================
// BLOQUE 5: Etiquetas genéricas
// ===================================================================
console.log('=== BLOQUE 5: Etiquetas genéricas ===');

const bloque5Ids = [135, 136, 304, 305];

const LABEL_PATTERNS = [
  /^Cliente\s+Nuevo\s+/i,
  /^Cliente\s+/i,
  /^Interesado\s+/i,
];

for (const id of bloque5Ids) {
  if (pendingDeletes.has(id)) continue;
  const c = clientById.get(id);
  if (!c) { console.log(`  [ID ${id}] No encontrado, saltando`); continue; }

  let cleanName = c.nombre;
  let labelRemoved = '';

  for (const pattern of LABEL_PATTERNS) {
    const match = cleanName.match(pattern);
    if (match) {
      labelRemoved = match[0].trim();
      cleanName = cleanName.replace(pattern, '').trim();
      break;
    }
  }

  if (!labelRemoved) {
    console.log(`  [ID ${id}] "${c.nombre}" — no coincide con etiqueta, saltando`);
    continue;
  }

  const parts = [];

  // If remaining name is too short or ambiguous, prefix with "Contacto"
  if (cleanName.split(/\s+/).length < 1 || cleanName.length < 3) {
    cleanName = 'Contacto ' + cleanName;
  }

  addUpdate(id, 'nombre', cleanName);
  parts.push(`nombre: "${cleanName}"`);

  const nota = `Nombre original: ${c.nombre} — Pendiente verificar nombre real`;
  addUpdate(id, 'notas', appendNota(c.notas, nota));
  parts.push(`notas += referencia original`);

  logChange(5, id, c.nombre, parts.join(', '), pendingUpdates.get(id));
  processed.add(id);
}

console.log();

// ===================================================================
// RESUMEN
// ===================================================================
console.log('=== RESUMEN ===');
console.log(`  Total cambios (updates): ${pendingUpdates.size}`);
console.log(`  Eliminaciones:           ${pendingDeletes.size}`);
console.log(`  Contactos procesados:    ${processed.size}`);

// ===================================================================
// APPLY
// ===================================================================
if (applyMode) {
  console.log('\n=== APLICANDO CAMBIOS ===\n');

  const updateStmt = {
    nombre: db.prepare('UPDATE Client SET nombre = ? WHERE id = ?'),
    empresa: db.prepare('UPDATE Client SET empresa = ? WHERE id = ?'),
    notas: db.prepare('UPDATE Client SET notas = ? WHERE id = ?'),
    estatus: db.prepare('UPDATE Client SET estatus = ? WHERE id = ?'),
    rol: db.prepare('UPDATE Client SET rol = ? WHERE id = ?'),
  };

  const deleteStmt = db.prepare('DELETE FROM Client WHERE id = ?');
  // Also delete related records
  const deleteInteractions = db.prepare('DELETE FROM Interaction WHERE clientId = ?');
  const deleteMetrics = db.prepare('DELETE FROM ClientMetrics WHERE clientId = ?');
  const deleteStatusChanges = db.prepare('DELETE FROM StatusChange WHERE clientId = ?');
  const deleteRecommendations = db.prepare('DELETE FROM RecommendationLog WHERE clientId = ?');

  const transaction = db.transaction(() => {
    let updated = 0;
    let deleted = 0;

    // Apply updates
    for (const [id, fields] of pendingUpdates.entries()) {
      if (pendingDeletes.has(id)) continue; // skip if marked for deletion

      for (const [field, value] of Object.entries(fields)) {
        if (updateStmt[field]) {
          updateStmt[field].run(value, id);
        }
      }
      console.log(`  Actualizado id=${id}: ${Object.keys(fields).join(', ')}`);
      updated++;
    }

    // Apply deletions
    for (const id of pendingDeletes) {
      deleteInteractions.run(id);
      deleteMetrics.run(id);
      deleteStatusChanges.run(id);
      deleteRecommendations.run(id);
      deleteStmt.run(id);
      console.log(`  Eliminado id=${id}`);
      deleted++;
    }

    console.log(`\n  Updates aplicados:      ${updated}`);
    console.log(`  Registros eliminados:   ${deleted}`);
  });

  transaction();
  console.log('\nCambios aplicados exitosamente.');
} else {
  console.log('\nModo --dry-run: no se modificó nada.');
  console.log('Ejecuta con --apply para aplicar los cambios:');
  console.log('  node src/cleanup-names.js --apply');
}

db.close();
