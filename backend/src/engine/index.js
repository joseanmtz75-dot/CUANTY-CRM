// Engine orchestrator - single entry point

const { analyzeClient } = require('./metrics');
const { computeDisposition } = require('./disposition');
const { computePriority } = require('./priority');
const { generateRecommendations } = require('./recommendations');
const { DISPOSITIONS } = require('./constants');

// Backward-compat: map disposition to temperatura
function mapToTemperatura(disposition, client) {
  const { ESTATUS_SIN_SEGUIMIENTO } = require('../followup-rules');
  if (ESTATUS_SIN_SEGUIMIENTO.includes(client.estatus)) return 'inactivo';

  switch (disposition) {
    case DISPOSITIONS.RECEPTIVO:
    case DISPOSITIONS.LISTO_PARA_DECISION:
      return 'caliente';
    case DISPOSITIONS.DUDOSO:
    case DISPOSITIONS.DESCONOCIDO:
      return 'tibio';
    case DISPOSITIONS.FRIO:
    case DISPOSITIONS.SATURADO:
      return 'frio';
    default:
      return 'tibio';
  }
}

// Backward-compat: convert recommendations to {tipo, prioridad, mensaje}
function mapToSugerencias(recommendations) {
  const prioMap = (p) => {
    if (p >= 70) return 'alta';
    if (p >= 40) return 'media';
    return 'baja';
  };

  const tipoMap = {
    contactar_hoy: 'seguimiento',
    esperar: 'esperar',
    reactivar: 'reactivacion',
    cerrar: 'cerrar',
    descartar: 'considerar_descartar',
    completar_datos: 'datos_incompletos',
  };

  return recommendations.map(r => ({
    tipo: tipoMap[r.action] || r.action,
    prioridad: prioMap(r.priority),
    mensaje: r.reasoning,
  }));
}

function analyzeClientFull(client) {
  const interactions = client.interactions || [];
  const metrics = analyzeClient(client, interactions);
  const disposition = computeDisposition(client, metrics);
  const priority = computePriority(client, metrics, disposition);
  const recommendations = generateRecommendations(client, metrics, disposition, priority);

  return {
    metrics,
    disposition,
    priority,
    recommendations,
    // Backward compat
    temperatura: mapToTemperatura(disposition.disposition, client),
    sugerencias: mapToSugerencias(recommendations),
  };
}

module.exports = {
  analyzeClientFull,
  analyzeClient,
  computeDisposition,
  computePriority,
  generateRecommendations,
  mapToTemperatura,
  mapToSugerencias,
};
