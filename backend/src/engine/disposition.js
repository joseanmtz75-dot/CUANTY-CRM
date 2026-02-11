// Stage 2: Disposition inference

const { DISPOSITIONS, THRESHOLDS, OUTCOMES } = require('./constants');

const ESTATUS_ACTIVOS_SET = new Set(['Nuevo', 'Contactado', 'Sin respuesta', 'Interesado', 'Negociando', 'Reactivar']);

function computeDisposition(client, metrics) {
  const signals = [];

  // Confidence based on data quantity
  let confidence = Math.min(1.0, metrics.totalInteractions / 10);
  if (metrics.totalInteractions < 3) confidence = Math.min(confidence, 0.3);

  // Rule: desconocido - not enough data
  if (metrics.totalInteractions < THRESHOLDS.desconocido.maxInteractions) {
    signals.push('Pocas interacciones registradas, datos insuficientes para clasificar');
    return { disposition: DISPOSITIONS.DESCONOCIDO, confidence: Math.min(confidence, 0.2), signals };
  }

  // Rule: saturado - too many contacts, recent silence
  if (metrics.ultimos7 >= THRESHOLDS.saturado.minInteracciones7d) {
    const recentSilences = metrics.ultimosOutcomes.slice(0, 2)
      .filter(o => o === OUTCOMES.SILENCIO).length;
    if (recentSilences >= THRESHOLDS.saturado.silenciosRecientes) {
      signals.push(`${metrics.ultimos7} interacciones en 7 días con silencios recientes`);
      return { disposition: DISPOSITIONS.SATURADO, confidence, signals };
    }
  }

  // Rule: listo_para_decision
  if (client.estatus === 'Negociando' &&
      metrics.avances > 0 &&
      metrics.responseRate > THRESHOLDS.listoParaDecision.minResponseRate) {
    signals.push('En negociación con avances y buena tasa de respuesta');
    return { disposition: DISPOSITIONS.LISTO_PARA_DECISION, confidence, signals };
  }

  // Rule: receptivo
  if (metrics.responseRate > THRESHOLDS.receptivo.minResponseRate &&
      metrics.diasSinContacto < THRESHOLDS.receptivo.maxDiasSinContacto &&
      ESTATUS_ACTIVOS_SET.has(client.estatus)) {
    signals.push('Alta tasa de respuesta y contacto reciente');
    return { disposition: DISPOSITIONS.RECEPTIVO, confidence, signals };
  }

  // Rule: frio
  if (metrics.diasSinContacto > THRESHOLDS.frio.minDiasSinContacto ||
      metrics.responseRate < THRESHOLDS.frio.maxResponseRate) {
    if (metrics.diasSinContacto > THRESHOLDS.frio.minDiasSinContacto) {
      signals.push(`Sin contacto hace ${metrics.diasSinContacto} días`);
    }
    if (metrics.responseRate < THRESHOLDS.frio.maxResponseRate) {
      signals.push(`Tasa de respuesta muy baja (${(metrics.responseRate * 100).toFixed(0)}%)`);
    }
    return { disposition: DISPOSITIONS.FRIO, confidence, signals };
  }

  // Rule: dudoso (default middle ground)
  if (metrics.responseRate >= THRESHOLDS.dudoso.minResponseRate &&
      metrics.responseRate <= THRESHOLDS.dudoso.maxResponseRate) {
    signals.push('Tasa de respuesta moderada, señales mixtas');
    return { disposition: DISPOSITIONS.DUDOSO, confidence, signals };
  }

  // Check for mixed outcomes in recent interactions
  const uniqueRecent = new Set(metrics.ultimosOutcomes);
  if (uniqueRecent.size >= 2) {
    signals.push('Outcomes variados en interacciones recientes');
    return { disposition: DISPOSITIONS.DUDOSO, confidence, signals };
  }

  // Fallback: dudoso
  signals.push('No encaja claramente en ninguna categoría');
  return { disposition: DISPOSITIONS.DUDOSO, confidence: Math.min(confidence, 0.4), signals };
}

module.exports = { computeDisposition };
