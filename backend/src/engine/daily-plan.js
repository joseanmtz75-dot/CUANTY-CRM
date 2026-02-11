// Daily plan engine: scoring, slot allocation, and reason generation

const { analyzeClientFull } = require('./index');
const { DAILY_PLAN_CONFIG, STAGE_VALUES, DISPOSITIONS, ACTIONS } = require('./constants');
const { diasDesde } = require('./metrics');

const { weights, slotAllocation, actionabilityPoints } = DAILY_PLAN_CONFIG;

function computeActionabilityScore(client, analysis) {
  let score = 0;
  const disp = analysis.disposition.disposition;
  const rec = analysis.recommendations[0];

  // Overdue follow-up points
  if (client.proximoContacto && new Date(client.proximoContacto) < new Date()) {
    const diasVencido = diasDesde(client.proximoContacto);
    if (diasVencido >= actionabilityPoints.veryOverdueThreshold) {
      score += actionabilityPoints.veryOverdue;
    } else {
      score += actionabilityPoints.overdue;
    }
  }

  // Actionable recommendation
  if (rec && (rec.action === ACTIONS.CONTACTAR_HOY || rec.action === ACTIONS.CERRAR)) {
    score += actionabilityPoints.actionableRec;
  }

  // Good disposition
  if (disp === DISPOSITIONS.RECEPTIVO || disp === DISPOSITIONS.LISTO_PARA_DECISION) {
    score += actionabilityPoints.goodDisposition;
  }

  // Complete data
  if (client.email && client.empresa) {
    score += actionabilityPoints.completeData;
  }

  return Math.min(100, score);
}

function computeCompositeScore(priorityScore, actionabilityScore) {
  return Math.round(
    (priorityScore * weights.priority + actionabilityScore * weights.actionability) * 10
  ) / 10;
}

function classifyClient(client, analysis) {
  const disp = analysis.disposition.disposition;

  // mustContact: Negociando OR listo_para_decision
  if (client.estatus === 'Negociando' || disp === DISPOSITIONS.LISTO_PARA_DECISION) {
    return 'mustContact';
  }

  // highValue: receptivo OR Interesado
  if (disp === DISPOSITIONS.RECEPTIVO || client.estatus === 'Interesado') {
    return 'highValue';
  }

  // maintenance: everything else
  return 'maintenance';
}

function generateRazonSeleccion(client, analysis) {
  const disp = analysis.disposition.disposition;
  const rec = analysis.recommendations[0];
  const action = rec ? rec.action : null;
  const parts = [];

  // Lead with the most relevant context
  if (client.estatus === 'Negociando' && disp === DISPOSITIONS.LISTO_PARA_DECISION) {
    parts.push('Cotizacion activa con avances confirmados — momento ideal para cerrar');
  } else if (client.estatus === 'Negociando') {
    parts.push('En negociacion activa — requiere seguimiento cercano');
  } else if (disp === DISPOSITIONS.LISTO_PARA_DECISION) {
    parts.push('Listo para tomar decision — oportunidad de cierre');
  } else if (disp === DISPOSITIONS.RECEPTIVO) {
    parts.push('Cliente receptivo con buena tasa de respuesta');
  } else if (client.estatus === 'Interesado') {
    parts.push('Muestra interes activo — buen momento para avanzar');
  } else if (disp === DISPOSITIONS.DUDOSO) {
    parts.push('Respuesta inconsistente — contacto estrategico puede desbloquear');
  } else if (client.estatus === 'Reactivar') {
    parts.push('Cliente previo con potencial de reactivacion');
  } else if (disp === DISPOSITIONS.FRIO) {
    parts.push('Lleva tiempo sin responder — intento de reactivacion');
  } else {
    parts.push('Pendiente de primer contacto o seguimiento');
  }

  // Add overdue context
  if (client.proximoContacto && new Date(client.proximoContacto) < new Date()) {
    const dias = diasDesde(client.proximoContacto);
    if (dias >= 3) {
      parts.push(`seguimiento vencido hace ${dias} dias`);
    } else if (dias > 0) {
      parts.push(`seguimiento vencido hace ${dias} dia${dias > 1 ? 's' : ''}`);
    }
  }

  // Add recommended action if meaningful
  if (action === ACTIONS.CERRAR) {
    parts.push('accion: cerrar');
  } else if (action === ACTIONS.REACTIVAR) {
    parts.push('accion: reactivar contacto');
  }

  return parts.join(' — ');
}

function allocateSlots(scoredClients, limit) {
  const mustSlots = Math.floor(limit * slotAllocation.mustContact);
  const highSlots = Math.floor(limit * slotAllocation.highValue);
  const maintSlots = limit - mustSlots - highSlots;

  const buckets = { mustContact: [], highValue: [], maintenance: [] };
  for (const c of scoredClients) {
    buckets[c._category].push(c);
  }

  // Phase 1: Fill each category up to its quota
  const selected = new Set();
  const result = [];

  function fillFromBucket(bucket, max) {
    let count = 0;
    for (const c of bucket) {
      if (count >= max) break;
      if (selected.has(c.clientId)) continue;
      selected.add(c.clientId);
      result.push(c);
      count++;
    }
  }

  fillFromBucket(buckets.mustContact, mustSlots);
  fillFromBucket(buckets.highValue, highSlots);
  fillFromBucket(buckets.maintenance, maintSlots);

  // Phase 2: Fill remaining slots from any category by composite score
  if (result.length < limit) {
    for (const c of scoredClients) {
      if (result.length >= limit) break;
      if (selected.has(c.clientId)) continue;
      selected.add(c.clientId);
      result.push(c);
    }
  }

  // Sort final list by composite score DESC
  result.sort((a, b) => {
    if (b.scoreCompuesto !== a.scoreCompuesto) return b.scoreCompuesto - a.scoreCompuesto;
    // Tiebreaker 1: stage value
    const stageA = STAGE_VALUES[a.estatus] || 30;
    const stageB = STAGE_VALUES[b.estatus] || 30;
    if (stageB !== stageA) return stageB - stageA;
    // Tiebreaker 2: more days overdue
    if ((b.diasVencido || 0) !== (a.diasVencido || 0)) return (b.diasVencido || 0) - (a.diasVencido || 0);
    // Tiebreaker 3: more recently created
    return new Date(b._createdAt) - new Date(a._createdAt);
  });

  return result.slice(0, limit);
}

function buildDailyPlan(clients, limit) {
  const efectiveLimit = Math.max(
    DAILY_PLAN_CONFIG.minLimit,
    Math.min(limit || DAILY_PLAN_CONFIG.defaultLimit, DAILY_PLAN_CONFIG.maxLimit)
  );

  // Score and classify each client
  const scored = clients.map(client => {
    const analysis = analyzeClientFull(client);
    const priorityScore = analysis.priority.score;
    const actionabilityScore = computeActionabilityScore(client, analysis);
    const scoreCompuesto = computeCompositeScore(priorityScore, actionabilityScore);
    const category = classifyClient(client, analysis);
    const razon = generateRazonSeleccion(client, analysis);
    const rec = analysis.recommendations[0] || {};

    const diasVencido = (client.proximoContacto && new Date(client.proximoContacto) < new Date())
      ? diasDesde(client.proximoContacto)
      : 0;

    return {
      clientId: client.id,
      nombre: client.nombre,
      empresa: client.empresa || null,
      estatus: client.estatus,
      telefono: client.telefono,
      scoreCompuesto,
      priorityScore,
      actionabilityScore,
      disposicion: analysis.disposition.disposition,
      accionRecomendada: rec.action || null,
      approach: rec.approach || null,
      canal: rec.channel || null,
      razonSeleccion: razon,
      diasSinContacto: analysis.metrics.diasSinContacto,
      diasVencido,
      _category: category,
      _createdAt: client.createdAt,
    };
  });

  // Sort by composite score DESC for allocation
  scored.sort((a, b) => {
    if (b.scoreCompuesto !== a.scoreCompuesto) return b.scoreCompuesto - a.scoreCompuesto;
    const stageA = STAGE_VALUES[a.estatus] || 30;
    const stageB = STAGE_VALUES[b.estatus] || 30;
    if (stageB !== stageA) return stageB - stageA;
    if ((b.diasVencido || 0) !== (a.diasVencido || 0)) return (b.diasVencido || 0) - (a.diasVencido || 0);
    return new Date(b._createdAt) - new Date(a._createdAt);
  });

  const allocated = allocateSlots(scored, efectiveLimit);

  // Build final list with positions, stripping internal fields
  const listaDelDia = allocated.map((c, i) => {
    const { _category, _createdAt, ...rest } = c;
    return { posicion: i + 1, ...rest };
  });

  // Build summary
  const resumen = { porEstatus: {}, porDisposicion: {}, porAccion: {} };
  for (const c of listaDelDia) {
    resumen.porEstatus[c.estatus] = (resumen.porEstatus[c.estatus] || 0) + 1;
    if (c.disposicion) {
      resumen.porDisposicion[c.disposicion] = (resumen.porDisposicion[c.disposicion] || 0) + 1;
    }
    if (c.accionRecomendada) {
      resumen.porAccion[c.accionRecomendada] = (resumen.porAccion[c.accionRecomendada] || 0) + 1;
    }
  }

  return {
    fecha: new Date().toISOString().slice(0, 10),
    capacidad: efectiveLimit,
    totalPendientes: clients.length,
    listaDelDia,
    resumen,
  };
}

module.exports = {
  computeActionabilityScore,
  computeCompositeScore,
  classifyClient,
  generateRazonSeleccion,
  allocateSlots,
  buildDailyPlan,
};
