/**
 * Script para filtrar contacts.csv y generar contacts_filtered.csv
 * Se ejecuta una sola vez: node scripts/filter-contacts.js
 */

const fs = require('fs');
const path = require('path');

// ── Configuración ──────────────────────────────────────────────
const INPUT = path.join('C:', 'Users', 'PC', 'Downloads', 'contacts.csv');
const OUTPUT = path.join('C:', 'Users', 'PC', 'Downloads', 'contacts_filtered.csv');

// ── Parsear CSV (maneja comillas y saltos de línea dentro de campos) ──
// Retorna array de { cols: string[], textLine: number }
function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  let lineStart = 1;
  let currentLine = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\n') currentLine++;
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field);
        field = '';
      } else if (ch === '\n') {
        currentLine++;
        current.push(field);
        field = '';
        rows.push({ cols: current, textLine: lineStart });
        current = [];
        lineStart = currentLine;
      } else if (ch === '\r') {
        // skip
      } else {
        field += ch;
      }
    }
  }
  if (field || current.length) {
    current.push(field);
    rows.push({ cols: current, textLine: lineStart });
  }
  return rows;
}

// ── Líneas a DESCARTAR (números de LÍNEA DE TEXTO del CSV, 1-indexed) ──
// Estos números corresponden a las líneas vistas con el editor/Read tool.
const DISCARD_TEXT_LINES = new Set([
  // ── Emergencias/Servicios ──
  3,    // 013335607883 (número suelto)
  4,    // 9-1-1 Emergencias
  114,  // Atencion a Clientes (111)
  115,  // atencion impresora
  248,  // Denun Ciudadana (089)
  289,  // Emergencias (112)
  436,  // IMSS (115)
  622,  // Locatel (119)
  864,  // Rescatel (100)
  951,  // Serv comunidad (118)
  972,  // TELCEL1 (5050)
  989,  // Transito (113)

  // ── Solo nombre/apodo sin apellido ──
  12,   // Abuelo
  22,   // Adriana
  24,   // Adrogas
  44,   // Alejando
  66,   // Alonso
  71,   // Amador (Damigas - solo nombre)
  98,   // Araceli (tiene empresa pero solo nombre)
  107,  // Arquitecto
  124,  // Bany
  126,  // Berlin
  128,  // Beto Portero
  135,  // Burras
  140,  // Cabayo
  141,  // Carajo
  142,  // Carin
  165,  // Carrizos
  181,  // Charlie
  182,  // Chicharito
  186,  // Cindy
  189,  // Claudia
  203,  // Coyul
  204,  // Coyul (dup)
  213,  // Dagoberto (tiene empresa Tomza pero solo nombre)
  214,  // Dan
  245,  // Delfino
  253,  // Dieguin
  255,  // Domus
  281,  // Egsa
  328,  // Faviola
  344,  // Fernando
  363,  // Furlon
  382,  // Gerardo
  396,  // Gogui
  399,  // Grecia
  424,  // House
  431,  // Huraches
  449,  // Inte
  467,  // Ivan
  470,  // Jade
  473,  // Jairo
  475,  // Javi
  476,  // Javier (sin apellido ni empresa)
  513,  // Jibran
  514,  // Jimmy
  519,  // Jonathan
  571,  // Juanito
  572,  // Judith
  618,  // Lizzy
  619,  // Lluvia
  624,  // Lopez
  710,  // Marisol (sin apellido ni empresa)
  731,  // Memito
  732,  // Memo
  733,  // Menudo
  759,  // Mrd
  760,  // Msj
  770,  // NOEL (solo nombre)
  784,  // Ojon
  806,  // Oswaldo
  809,  // Paco (sin apellido)
  810,  // Paco (sin apellido dup)
  823,  // Pedroza
  829,  // Pitin
  834,  // Presidente
  865,  // Reyna
  881,  // Richard (solo nombre)
  894,  // Robertooooo
  903,  // Rogelio
  905,  // Roger (sin apellido)
  908,  // Roman
  910,  // Rosita
  916,  // Sabe
  940,  // Sebassexto
  953,  // Sharon
  964,  // Tantra
  973,  // Tercero
  975,  // Tetin
  990,  // Tranta
  999,  // Valentina
  1001, // Vanessa
  1002, // Vegas
  1003, // Vero
  1035, // Zoe

  // ── Comida/Restaurantes ──
  129,  // Birria Moral
  137,  // Cabaña Mazamitla Antonio
  138,  // Cabaña Sierra Del Tucan
  139,  // Cabañas Maz
  398,  // Gran Café El Portal
  546,  // Jose Mariscos
  587,  // La Laja Restaurante
  708,  // Mariscos Cuñado
  709,  // Mariscos Nayarit
  830,  // Pizza Victoria
  831,  // Pizzas Plaza
  961,  // Tacos Charly
  962,  // Tacos Charly Cel
  963,  // Tacos Humbold Do
  986,  // Tortas Don Carnitas

  // ── Deportes/Gimnasio ──
  29,   // ALAN FLOWRES LIGA
  58,   // Alex Fut
  84,   // Angel Fut
  131,  // Bob Marley Fut
  239,  // David Juagador
  269,  // Edson Fut
  590,  // Lalo Box
  777,  // Número Acceso Gym
  782,  // Octavio Fut
  833,  // Poncho (Liga Del Parque)
  1026, // Yair Fútbol
  1028, // Yair Jugador
  1034, // Yostin Jugador

  // ── Servicios profesionales personales ──
  6,    // Abogada MAKO
  28,   // Ajustador GNP
  106,  // Arq Luz María
  108,  // Arquitecto Barba
  109,  // Arquitecto Colinas
  112,  // Asesor Bancario Santander
  123,  // Banda Desconocida
  163,  // Carpintero Colin
  164,  // Carpintero Gamas
  166,  // Carro Stratus
  196,  // Compa De Yair
  197,  // Compadre Fidensi
  238,  // David Compa Yair
  244,  // Decora Mantenimiento
  256,  // Dr Jose Luis
  279,  // Edwin Pintura
  333,  // Felipe De Jesús Urologo
  417,  // Herencia Norteña
  419,  // Herreriarosa
  420,  // Herrero Paola
  548,  // Jose Mecánico
  654,  // Luna Cuántica
  668,  // Mantenimiento
  670,  // Manuel Albañil
  718,  // Martin Nutriolog
  773,  // Norteño Aust
  774,  // Norteño Banda
  775,  // Norteño Banda 2
  776,  // Norteño Banda Selectivo
  778,  // Nutrióloga Anavic
  779,  // Nutriólogo
  801,  // Oscar Nutrición
  885,  // Robert Llantas
  937,  // Seat Atención
  938,  // Seat Técnico
  939,  // Seat Técnico
  958,  // Sra Herreria
  978,  // Tinaco Instalaci

  // ── Comercio/Tiendas ──
  121,  // Autolavado Colinas
  132,  // Box 40
  133,  // Box Atenas
  167,  // Casa Renta Mar
  194,  // Closet
  195,  // Colinas Pagos
  254,  // Diversiones Bago
  326,  // Factura One Park
  381,  // Gera Sistemas
  395,  // Globac
  448,  // Instalagas
  505,  // Jesús Lava Ca
  589,  // Labado De Interiores
  667,  // Manos De Seda
  761,  // Mubles Alamo
  762,  // Muebles Dico
  813,  // Pagos Silao
  814,  // Panchillo (Piso)
  824,  // Peluquería Colinas
  827,  // Persianas Colinas
  828,  // Pescadería Colinas
  836,  // Priceltravel
  840,  // Programas
  842,  // Pymy 18
  863,  // Reaclima
  900,  // Rodolfo Sistemas
  965,  // Tapizado
  974,  // Terrenos Tomatlan
  1023, // WhatsApp Invex

  // ── Transporte/Logística ──
  45,   // Alejandra Paquetexpress
  119,  // Auto Tanques Rodbre
  120,  // Autobus Convenci

  // ── SICOM - todos ──
  85,   // Angel Peña SICOM
  224,  // Daniel Gomez SoporteSicom
  228,  // Daniel Valenzuela Sicom
  229,  // Daniel Valenzuela SICOM
  233,  // Dante Sicom
  234,  // Dante Sicom Trabajo
  242,  // David Sicom
  331,  // Felipe Sicom
  332,  // Felipe SICOM
  370,  // Gaby Sicom
  435,  // Ilsem Gomez SICOM
  536,  // Jorge Ramos Sicom
  599,  // Leslie Lopez Sicom
  621,  // Lluvia Sicom
  638,  // Luis Encargado soporte Sicom
  662,  // Maite Olivares Sicom
  663,  // Maite Olivares SICOM
  715,  // Martha Vásquez Sicom
  736,  // Miguel Sicom
  739,  // Miguel Ex Sicom
  763,  // Nacho Sicom
  789,  // Omar Sicom
  851,  // Ramon SICOM
  853,  // Raul Sicom
  866,  // Ricardo Barron Sicom
  878,  // Ricardo Sansores Sicom
  904,  // Rogelio Delgado Sicom
  954,  // sicom
  956,  // Soporte
  1006, // Victor Aguirre SICOM

  // ── Mako Internacional (excepto Ricardo García línea 872) ──
  11,   // Abril Mako
  14,   // Administración Mako
  162,  // Carolina Mako
  183,  // Chofer Mako
  191,  // Claudia Mako
  210,  // Cynthia Gómez (mako.com.mx)
  212,  // Cynthia Trabajo (Mako Internacional)
  366,  // Gabriel Ron IT MAKO
  397,  // González Aragón Leticia (Mako Internacional)
  405,  // GuillermoMako
  427,  // Hugo Reyes (Mako Internacional)
  484,  // Javier Lopez (Mako Internacional SA De CV)
  527,  // Jorge Gutiérrez (Mako Internacional)
  547,  // Jose Martínez Mako
  551,  // Jostin Mako
  562,  // Juan Jose Internacional (Mako)
  563,  // Juan Jose Mako
  564,  // Juan Jose Mako
  657,  // Luz Mako
  664,  // Mako Aragón Leticia
  665,  // Mako Internacional SA DE CV
  767,  // Nayeli Mako
  874,  // Ricardo Mako
  925,  // Salvador Romo Mako
  957,  // Soporte Mako 2
  1005, // Victor Mako
  1011, // Victor Mako
  580,  // Karina Medina (Mako)

  // ── Endress+Hauser ──
  297,  // Enrique Lopez Endress+Hauser Mexico
  557,  // Juan Carlos Moreno Endress+Hauser
  917,  // Sajid Galindo E+ Endress+Hauser

  // ── Telecom/Otros ──
  27,   // Air Park
  116,  // Atención Masico
  201,  // Contacto WhatsApp
  293,  // Encuentro Tecnic
  364,  // Futuro Solar Paneles Solares
  453,  // Investigador Jose
  730,  // Megacable Selec
  966,  // Tec Pagasa
  971,  // Técnico Total Play
  987,  // Total Play

  // ── Proveedores varios (excepto Viviana-Cilindros Meba y José Luis-Green Energy) ──
  200,  // Compras Tortimaq
  202,  // Contado San Luis
  230,  // Daniel Vazquez Emerson
  287,  // Elvia Compras
  290,  // Emilio Cano EMERSON
  305,  // Enrique Tovar Elevatek
  310,  // Erika Torres Cyllid
  311,  // Erika Torres Cyllid
  421,  // Hilda Linares Volumetrics
  585,  // Karla Marines Mansertec
  792,  // Orlando Compras
  812,  // Paco Torres Emer EMERSON
  838,  // Priscila Ahumada Corona (Emerson)
  839,  // Priscila Potenciano (Emerson Asco)

  // ── Emojis a DESCARTAR ──
  515,  // Jimmy Diaz😎 Chicote
  959,  // StarWash Autolavado 🚀

  // ── Otros personales/irrelevantes ──
  91,   // Antonio Gabrielli (sin empresa, sin contexto gas)
  117,  // Aureliano Bautista (+501 = Belice)
  118,  // Autlan Tomza
  198,  // Compras INZA
  199,  // Compras INZA (dup)
  211,  // Cynthia Presidenta Coto
  282,  // El Señor Chocho
  285,  // Elisa Martínez Soporte
  362,  // Fuera Del Radar
  371,  // Gas Acuña
  372,  // Gas Chapultepec
  373,  // Gas Continental
  374,  // Gas De Tenabo
  375,  // Gas Galgo
  376,  // Gas Nueva Era
  377,  // Gas Rosa
  378,  // Gas Tomza Aguascalientes
  379,  // Gas Tomza De México
  380,  // Gas Uribe
  452,  // Interesado masico
  493,  // Jeannete Bernal
  569,  // Juan Tesorero Coto
  588,  // La Parka
  607,  // Lic Natalia (Turísticos Keops Grupos)
  620,  // Lluvia Nextel
  660,  // Macogas
  771,  // Noel Celaya (empresa sin persona)
  820,  // Paulina Agencia
  832,  // Planta Nuev
  835,  // Presidente Colonos (Colinas De Tonala)
  841,  // Prospecto Vapor
  843,  // Quién Sabe
  884,  // Rivera Gas (solo empresa, sin persona)
  911,  // Ruben Burras
  934,  // Sandy Y Ernesto
  943,  // Ser Dam
  952,  // Servigas
  955,  // Sistemas 2000 Gas
  976,  // Tía Paty
  979,  // Tio Chuy
  980,  // Tío Gogy
  983,  // Tomza bajio
  984,  // Tomza Queretaro
  997,  // Unigas
  1017, // villa de reyes
  1018, // villa de reyes
  1020, // Vopori
  1021, // Vynsa
]);

// ── Filas con emojis a LIMPIAR por textLine ──
const EMOJI_CLEAN_TEXT_LINES = new Set([
  2,    // 💫💦Lorena GV En Orizaba
  149,  // Carlos Flores🇲🇽⚖️ Quirós
  158,  // Carlos Saucedo 🏅 Villa De Reyes
  463,  // ISIS SIGALA 💋
  389,  // Gerente Planta RG🚛⛽ Angel Landa
]);

// ── Corrección puntual por textLine ──
const EMPRESA_CORRECTIONS = {
  872: 'Maco Gas'  // Ricardo García → empresa = "Maco Gas" (NO Mako)
};

// ── Leer y parsear ──
console.log('Leyendo ' + INPUT + '...');
const raw = fs.readFileSync(INPUT, 'utf-8');
const rows = parseCSV(raw);

console.log('Total de filas parseadas: ' + rows.length + ' (1 header + ' + (rows.length - 1) + ' contactos)');

// Índices de columnas relevantes (0-indexed)
const header = rows[0].cols;
const COL = {
  firstName:  header.indexOf('First Name'),
  middleName: header.indexOf('Middle Name'),
  lastName:   header.indexOf('Last Name'),
  org:        header.indexOf('Organization Name'),
  email:      header.indexOf('E-mail 1 - Value'),
  phone:      header.indexOf('Phone 1 - Value'),
};

console.log('Columnas:', JSON.stringify(COL));

// ── Función para limpiar emojis (cubre banderas, símbolos, etc.) ──
function cleanEmojis(str) {
  // Remove all emoji characters including flags (regional indicators), variation selectors, ZWJ
  return str
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')  // Regional indicator symbols (flags)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')   // Misc symbols, emoticons, etc.
    .replace(/[\u{2600}-\u{27BF}]/gu, '')      // Misc symbols
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')      // Variation selectors
    .replace(/[\u{200D}]/gu, '')               // Zero-width joiner
    .replace(/[\u{20E3}]/gu, '')               // Combining enclosing keycap
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')    // Tags
    .replace(/\s+/g, ' ')                       // Normalize whitespace
    .trim();
}

// ── Función para construir nombre completo ──
function buildNombre(cols) {
  const first = (cols[COL.firstName] || '').trim();
  const middle = (cols[COL.middleName] || '').trim();
  const last = (cols[COL.lastName] || '').trim();
  return [first, middle, last].filter(Boolean).join(' ').trim();
}

// ── Función para limpiar teléfono ──
function cleanPhone(phone) {
  if (!phone) return '';
  // Si hay múltiples números separados por " ::: ", tomar el primero
  phone = phone.split(':::')[0].trim();
  // Eliminar espacios, guiones, paréntesis
  return phone.replace(/[\s\-\(\)\.]/g, '');
}

// ── Función para escapar campo CSV ──
function csvEscape(val) {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

// ── Procesar ──
const kept = [];
const discarded = [];
let emojisCleanedCount = 0;

for (let i = 1; i < rows.length; i++) {
  const { cols, textLine } = rows[i];

  // Verificar si se descarta por número de línea de texto
  if (DISCARD_TEXT_LINES.has(textLine)) {
    discarded.push({ textLine, nombre: buildNombre(cols), reason: 'discard list' });
    continue;
  }

  let nombre = buildNombre(cols);
  const phone = cleanPhone(cols[COL.phone] || '');
  const email = (cols[COL.email] || '').trim();
  let empresa = (cols[COL.org] || '').trim();

  // Saltar si no tiene teléfono
  if (!phone) {
    discarded.push({ textLine, nombre, reason: 'no phone' });
    continue;
  }

  // Saltar si no tiene nombre
  if (!nombre) {
    discarded.push({ textLine, nombre: '(vacío)', reason: 'no name' });
    continue;
  }

  // Limpiar emojis si está en la lista
  if (EMOJI_CLEAN_TEXT_LINES.has(textLine)) {
    const before = nombre;
    nombre = cleanEmojis(nombre);
    console.log('  Emoji limpiado: "' + before + '" -> "' + nombre + '"');
    emojisCleanedCount++;
  }

  // Corrección de empresa
  if (EMPRESA_CORRECTIONS[textLine]) {
    const oldEmpresa = empresa;
    empresa = EMPRESA_CORRECTIONS[textLine];
    console.log('  Empresa corregida linea ' + textLine + ': "' + oldEmpresa + '" -> "' + empresa + '"');
  }

  kept.push({ nombre, telefono: phone, email, empresa });
}

// ── Generar CSV de salida ──
const csvHeader = 'nombre,telefono,email,empresa';
const csvLines = kept.map(c =>
  csvEscape(c.nombre) + ',' + csvEscape(c.telefono) + ',' + csvEscape(c.email) + ',' + csvEscape(c.empresa)
);

const output = [csvHeader, ...csvLines].join('\n');
fs.writeFileSync(OUTPUT, output, 'utf-8');

// ── Reporte ──
console.log('\n=======================================');
console.log('Total contactos originales: ' + (rows.length - 1));
console.log('Descartados: ' + discarded.length);
console.log('Conservados: ' + kept.length);
console.log('Emojis limpiados: ' + emojisCleanedCount);
console.log('=======================================');
console.log('\nArchivo generado: ' + OUTPUT);

// Mostrar descartados por razón
const reasons = {};
for (const d of discarded) {
  reasons[d.reason] = (reasons[d.reason] || 0) + 1;
}
console.log('\nDescartados por razon:');
for (const [reason, count] of Object.entries(reasons)) {
  console.log('  ' + reason + ': ' + count);
}

// Verificaciones puntuales
console.log('\n=== Verificaciones ===');
const ricardoGarcia = kept.find(c => c.nombre.includes('Ricardo') && c.nombre.includes('Garc') && c.empresa === 'Maco Gas');
console.log('Ricardo Garcia (Maco Gas): ' + (ricardoGarcia ? 'OK - ' + ricardoGarcia.nombre + ' | ' + ricardoGarcia.empresa : 'NO ENCONTRADO'));

const viviana = kept.find(c => c.nombre.includes('Viviana'));
console.log('Viviana (Cilindros Meba): ' + (viviana ? 'OK - ' + viviana.nombre + ' | ' + viviana.telefono : 'NO ENCONTRADO'));

const joseLuisGreen = kept.find(c => c.nombre.includes('Jos') && c.nombre.includes('Luis') && c.nombre.includes('Green'));
console.log('Jose Luis (Green Energy): ' + (joseLuisGreen ? 'OK - ' + joseLuisGreen.nombre + ' | ' + joseLuisGreen.telefono : 'NO ENCONTRADO'));

const ingusa = kept.filter(c => c.nombre.toLowerCase().includes('ingusa') || c.empresa.toLowerCase().includes('ingusa'));
console.log('Contactos Ingusa: ' + ingusa.length + ' -> ' + ingusa.map(c => c.nombre).join(', '));

const sicom = kept.filter(c => c.nombre.toLowerCase().includes('sicom') || c.empresa.toLowerCase().includes('sicom'));
console.log('Contactos SICOM (deberia ser 0): ' + sicom.length);

const mako = kept.filter(c =>
  (c.nombre.toLowerCase().includes('mako') || c.empresa.toLowerCase().includes('mako'))
  && !c.empresa.includes('Maco')
);
console.log('Contactos Mako restantes (deberia ser 0): ' + mako.length + (mako.length > 0 ? ' -> ' + mako.map(c => c.nombre + ' [' + c.empresa + ']').join(', ') : ''));

// Primeros y últimos
console.log('\nPrimeros 5 conservados:');
kept.slice(0, 5).forEach((c, i) =>
  console.log('  ' + (i + 1) + '. ' + c.nombre + ' | ' + c.telefono + ' | ' + (c.empresa || '-'))
);
console.log('\nUltimos 5 conservados:');
kept.slice(-5).forEach((c, i) =>
  console.log('  ' + (kept.length - 4 + i) + '. ' + c.nombre + ' | ' + c.telefono + ' | ' + (c.empresa || '-'))
);
