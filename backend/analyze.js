const Database = require('better-sqlite3');
const db = new Database('dev.db');

const rows = db.prepare('SELECT id, nombre, telefono, email, empresa, estatus, rol FROM Client ORDER BY nombre').all();

const patterns = {
  'Ingeniero/Ing': /ing\.|ing\s|ingeniero/i,
  'Licenciado/Lic': /lic\.|lic\s|licenciado/i,
  'Técnico': /tecnico|técnico/i,
  'Gerente': /gerente|gerencia/i,
  'Director': /director|dirección/i,
  'Soporte': /soporte/i,
  'Asesor': /asesor|asesoría/i,
  'Supervisor': /supervisor/i,
  'Vendedor': /vendedor|vendedora/i,
  'Administrativo': /administrador|asistente|secretaria|coordinador/i,
  'Jefe/Encargado': /jefe|encargado|encargada/i,
  'Company/Department': /gerencia|gerente|direccion|director|responsable|almacen|planta|oficina|departamento|area|seccion|cliente|interesado/i
};

const results = {};

rows.forEach(r => {
  Object.entries(patterns).forEach(([k, p]) => {
    if (p.test(r.nombre)) {
      if (!results[k]) results[k] = [];
      results[k].push(r);
    }
  });
});

Object.entries(results).sort().forEach(([k, v]) => {
  console.log(`\n${k}: ${v.length} matches`);
  v.slice(0, 12).forEach(r => {
    console.log(`  [${r.id}] ${r.nombre} | Empresa: ${r.empresa || 'N/A'} | Estatus: ${r.estatus}`);
  });
  if (v.length > 12) console.log(`  ... and ${v.length - 12} more`);
});

db.close();
