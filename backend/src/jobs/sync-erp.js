const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { formatPhone, formatName } = require('../helpers');
const { recomputeClientMetrics } = require('../engine/recompute');

const ERP_AGGREGATE_SQL = `
SELECT
  c.id AS erp_cliente_id,
  c.codigo,
  c.nombre_comercial,
  c.razon_social,
  c.email,
  c.telefono,
  c.rfc,
  c.ciudad,
  c.estado,
  c.codigo_postal,
  c.contacto_nombre,
  COUNT(DISTINCT f.id) AS total_facturas_historico,
  COUNT(DISTINCT f.id) FILTER (WHERE f.fecha >= CURRENT_DATE - INTERVAL '12 months') AS facturas_12m,
  COALESCE(SUM(f.total), 0)::numeric(14,2) AS total_comprado_historico,
  COALESCE(SUM(f.total) FILTER (WHERE f.fecha >= CURRENT_DATE - INTERVAL '12 months'), 0)::numeric(14,2) AS total_comprado_12m,
  MIN(f.fecha) AS primera_compra,
  MAX(f.fecha) AS ultima_compra,
  (
    SELECT string_agg(DISTINCT lower(cat.nombre), ', ' ORDER BY lower(cat.nombre))
    FROM erp.facturas f2
    JOIN erp.factura_items fi ON fi.factura_id = f2.id
    JOIN erp.productos p ON p.id = fi.producto_id
    LEFT JOIN erp.categorias cat ON cat.id = p.categoria_id
    WHERE f2.cliente_id = c.id
      AND f2.fecha >= CURRENT_DATE - INTERVAL '12 months'
      AND f2.status IN ('pagada', 'pendiente')
      AND cat.nombre IS NOT NULL
  ) AS productos_frecuentes_12m
FROM erp.clientes c
LEFT JOIN erp.facturas f ON c.id = f.cliente_id
  AND f.status IN ('pagada', 'pendiente')
WHERE c.organizacion_id = '89fd901a-bb39-46f3-9a3e-08d18212fdd5'
  AND c.is_active = true
GROUP BY c.id, c.codigo, c.nombre_comercial, c.razon_social, c.email, c.telefono, c.rfc, c.ciudad, c.estado, c.codigo_postal, c.contacto_nombre
HAVING COUNT(DISTINCT f.id) > 0
ORDER BY total_comprado_12m DESC NULLS LAST;
`;

const UMBRAL_ALTO_FIJO = 100000;
const UMBRAL_MEDIO_FIJO = 20000;
const MIN_FACTURAS_12M_PARA_CREAR = 3;

function getPrisma() {
  if (!globalThis.__prisma) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, client_encoding: 'UTF8' });
    globalThis.__prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  return globalThis.__prisma;
}

function toNumber(v) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function toInt(v) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function calcularClasificacionErp(rows) {
  const result = new Map();
  if (!rows || rows.length === 0) return result;

  const ordenAsc = [...rows].sort((a, b) => toNumber(a.total_comprado_12m) - toNumber(b.total_comprado_12m));
  const n = ordenAsc.length;

  let umbralAlto, umbralBajo;
  let metodo;

  if (n >= 10) {
    const p25Idx = Math.max(0, Math.floor(n * 0.25) - 1);
    const p75Idx = Math.min(n - 1, Math.floor(n * 0.75));
    umbralBajo = toNumber(ordenAsc[p25Idx].total_comprado_12m);
    umbralAlto = toNumber(ordenAsc[p75Idx].total_comprado_12m);
    if (umbralBajo === umbralAlto) {
      umbralBajo = UMBRAL_MEDIO_FIJO;
      umbralAlto = UMBRAL_ALTO_FIJO;
      metodo = 'fallback_fijo (percentiles colapsados)';
    } else {
      metodo = `percentil (n=${n}, p25=$${umbralBajo}, p75=$${umbralAlto})`;
    }
  } else {
    umbralBajo = UMBRAL_MEDIO_FIJO;
    umbralAlto = UMBRAL_ALTO_FIJO;
    metodo = `fallback_fijo (n=${n} < 10)`;
  }

  for (const row of rows) {
    const monto = toNumber(row.total_comprado_12m);
    let clas;
    if (monto >= umbralAlto) clas = 'ALTO';
    else if (monto >= umbralBajo) clas = 'MEDIO';
    else clas = 'BAJO';
    result.set(row.erp_cliente_id, clas);
  }

  result._meta = { metodo, umbralBajo, umbralAlto, n };
  return result;
}

async function matchClienteEnCrm(prisma, filaErp) {
  const tel = formatPhone(filaErp.telefono);
  if (tel) {
    const byPhone = await prisma.client.findUnique({ where: { telefono: tel } });
    if (byPhone) return { client: byPhone, matchedBy: 'telefono', matchedValue: tel };
  }

  const rfc = (filaErp.rfc || '').trim();
  if (rfc) {
    const byRfc = await prisma.client.findFirst({
      where: { rfc: { equals: rfc, mode: 'insensitive' } },
    });
    if (byRfc) return { client: byRfc, matchedBy: 'rfc', matchedValue: rfc };
  }

  const email = (filaErp.email || '').trim().toLowerCase();
  if (email) {
    const byEmail = await prisma.client.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (byEmail) return { client: byEmail, matchedBy: 'email', matchedValue: email };
  }

  const nombre = (filaErp.nombre_comercial || '').trim();
  if (nombre) {
    const byName = await prisma.client.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } },
    });
    if (byName) return { client: byName, matchedBy: 'nombre_comercial', matchedValue: nombre };
  }

  return null;
}

function buildUpdatePayload(filaErp, currentClient, clasificacionErp) {
  const data = {
    totalComprasErp: toNumber(filaErp.total_comprado_historico),
    ultimaCompraErp: filaErp.ultima_compra || null,
    productosFrecuentesErp: filaErp.productos_frecuentes_12m || null,
    clasificacionErp: clasificacionErp || null,
  };
  if (!currentClient.primeraCompraErp && filaErp.primera_compra) {
    data.primeraCompraErp = filaErp.primera_compra;
  }
  if (!currentClient.rfc && filaErp.rfc && filaErp.rfc.trim()) {
    data.rfc = filaErp.rfc.trim().toUpperCase();
  }
  return data;
}

function buildCreatePayload(filaErp, clasificacionErp) {
  const nombre = formatName(filaErp.nombre_comercial || filaErp.razon_social || '');
  const telefono = formatPhone(filaErp.telefono);
  return {
    nombre,
    telefono,
    email: (filaErp.email || '').trim().toLowerCase() || null,
    empresa: (filaErp.razon_social || filaErp.nombre_comercial || '').trim() || null,
    rfc: filaErp.rfc ? filaErp.rfc.trim().toUpperCase() : null,
    estatus: 'Reactivar',
    rol: 'compras',
    origen: 'ERP-Sync',
    vendedor: null,
    contactoManual: true,
    notas: `[Auto-creado por ERP-Sync]\nERP cliente_id: ${filaErp.erp_cliente_id}\nCódigo: ${filaErp.codigo || 'N/A'}\nCiudad: ${filaErp.ciudad || 'N/A'}, ${filaErp.estado || 'N/A'}`,
    totalComprasErp: toNumber(filaErp.total_comprado_historico),
    ultimaCompraErp: filaErp.ultima_compra || null,
    primeraCompraErp: filaErp.primera_compra || null,
    productosFrecuentesErp: filaErp.productos_frecuentes_12m || null,
    clasificacionErp: clasificacionErp || null,
  };
}

async function runErpSync({ apply = false } = {}) {
  if (!process.env.ERP_DATABASE_URL) throw new Error('ERP_DATABASE_URL no está configurada');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada');

  const erpPool = new Pool({ connectionString: process.env.ERP_DATABASE_URL, max: 2 });
  const prisma = getPrisma();

  let rows;
  try {
    const r = await erpPool.query(ERP_AGGREGATE_SQL);
    rows = r.rows;
  } finally {
    await erpPool.end();
  }

  const clasMap = calcularClasificacionErp(rows);

  const wouldUpdate = [];
  const wouldCreate = [];
  const wouldReviewManually = [];
  const matchedByKey = { telefono: 0, rfc: 0, email: 0, nombre_comercial: 0 };
  const matchByClientId = new Map();

  for (const fila of rows) {
    const clas = clasMap.get(fila.erp_cliente_id) || null;
    const match = await matchClienteEnCrm(prisma, fila);

    if (match) {
      matchedByKey[match.matchedBy]++;
      if (!matchByClientId.has(match.client.id)) matchByClientId.set(match.client.id, []);
      matchByClientId.get(match.client.id).push({ fila, match, clas });
    } else {
      const facturas12m = toInt(fila.facturas_12m);
      const telNormalizado = formatPhone(fila.telefono);

      if (facturas12m >= MIN_FACTURAS_12M_PARA_CREAR && telNormalizado) {
        wouldCreate.push({
          erp_cliente_id: fila.erp_cliente_id,
          payload: buildCreatePayload(fila, clas),
          facturas_12m: facturas12m,
        });
      } else {
        wouldReviewManually.push({
          erp_cliente_id: fila.erp_cliente_id,
          nombre_comercial: fila.nombre_comercial,
          razon_social: fila.razon_social,
          telefono_raw: fila.telefono,
          telefono_normalizado: telNormalizado,
          rfc: fila.rfc,
          email: fila.email,
          facturas_12m: facturas12m,
          total_comprado_12m: toNumber(fila.total_comprado_12m),
          razon: facturas12m < MIN_FACTURAS_12M_PARA_CREAR
            ? `actividad baja: ${facturas12m} facturas en 12m (mínimo ${MIN_FACTURAS_12M_PARA_CREAR})`
            : 'sin teléfono normalizable a +52 XX XXXX XXXX',
        });
      }
    }
  }

  const conflictos_telefono_duplicado = [];
  for (const [clientId, entries] of matchByClientId) {
    if (entries.length > 1) {
      conflictos_telefono_duplicado.push({
        crm_client_id: clientId,
        crm_client_nombre: entries[0].match.client.nombre,
        crm_client_telefono: entries[0].match.client.telefono,
        erp_filas: entries.map(e => ({
          erp_cliente_id: e.fila.erp_cliente_id,
          nombre_comercial: e.fila.nombre_comercial,
          rfc: e.fila.rfc,
          matchedBy: e.match.matchedBy,
          matchedValue: e.match.matchedValue,
        })),
      });
    } else {
      const { fila, match, clas } = entries[0];
      wouldUpdate.push({
        crm_client_id: match.client.id,
        crm_client_nombre: match.client.nombre,
        matchedBy: match.matchedBy,
        erp_cliente_id: fila.erp_cliente_id,
        clasificacionErp: clas,
        facturas_12m: toInt(fila.facturas_12m),
        total_comprado_12m: toNumber(fila.total_comprado_12m),
        data: buildUpdatePayload(fila, match.client, clas),
      });
    }
  }

  const summary = {
    totalErp: rows.length,
    matched: wouldUpdate.length + conflictos_telefono_duplicado.reduce((s, c) => s + c.erp_filas.length, 0),
    matched_by_key: matchedByKey,
    would_update: wouldUpdate.length,
    would_create: wouldCreate.length,
    would_review_manually: wouldReviewManually.length,
    conflictos_telefono_duplicado,
    clasificacion_meta: clasMap._meta,
  };

  if (!apply) {
    return { applied: false, summary, would_update: wouldUpdate, would_create: wouldCreate, would_review_manually: wouldReviewManually };
  }

  const affectedIds = [];
  let updated = 0;
  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (const u of wouldUpdate) {
      await tx.client.update({ where: { id: u.crm_client_id }, data: u.data });
      affectedIds.push(u.crm_client_id);
      updated++;
    }
    for (const c of wouldCreate) {
      try {
        const newClient = await tx.client.create({ data: c.payload });
        affectedIds.push(newClient.id);
        created++;
      } catch (err) {
        if (err.code === 'P2002') {
          console.warn(`[sync-erp] skip create (telefono ya existe): ${c.payload.telefono}`);
        } else {
          throw err;
        }
      }
    }
  });

  const recompute = await recomputeClientMetrics(prisma, affectedIds);

  return {
    applied: true,
    summary,
    updated,
    created,
    recomputed: recompute.computed,
    recompute_errors: recompute.errors,
  };
}

async function cronSyncErpHandler(req, res) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return res.status(500).json({ error: 'CRON_SECRET no está configurado en el servidor' });

  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${expected}`) return res.status(401).json({ error: 'Unauthorized' });

  const apply = String(req.query.apply || 'false').toLowerCase() === 'true';

  try {
    const result = await runErpSync({ apply });
    return res.status(200).json(result);
  } catch (err) {
    console.error('[cron/sync-erp] error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  runErpSync,
  cronSyncErpHandler,
  matchClienteEnCrm,
  calcularClasificacionErp,
  ERP_AGGREGATE_SQL,
};
