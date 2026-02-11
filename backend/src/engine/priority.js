// Stage 3: Priority scoring (0-100)

const { PRIORITY_WEIGHTS, DISPOSITION_SCORES, STAGE_VALUES } = require('./constants');
const { diasDesde } = require('./metrics');

function computePriority(client, metrics, disposition) {
  const factors = {};

  // 1. Urgencia (25%) - overdue follow-up
  let urgencia = 0;
  if (client.proximoContacto) {
    const diasVencido = diasDesde(client.proximoContacto);
    const vencido = new Date(client.proximoContacto) < new Date();
    if (vencido) {
      urgencia = diasVencido >= 3 ? 100 : Math.round((diasVencido / 3) * 100);
    }
  }
  factors.urgencia = urgencia;

  // 2. Receptividad (25%) - disposition-based
  factors.receptividad = DISPOSITION_SCORES[disposition.disposition] || 40;

  // 3. Momentum (20%) - response rate * recent frequency
  const freqNorm = Math.min(1, metrics.frecuenciaUltimos30 / 10);
  factors.momentum = Math.round(metrics.responseRate * freqNorm * 100);

  // 4. Valor de etapa (15%) - stage value
  factors.valorEtapa = STAGE_VALUES[client.estatus] || 30;

  // 5. Frescura (15%) - inverse of days since contact, capped at 30
  const diasCap = Math.min(metrics.diasSinContacto, 30);
  factors.frescura = Math.round((1 - diasCap / 30) * 100);

  // Weighted score
  const score = Math.round(
    factors.urgencia * PRIORITY_WEIGHTS.urgencia +
    factors.receptividad * PRIORITY_WEIGHTS.receptividad +
    factors.momentum * PRIORITY_WEIGHTS.momentum +
    factors.valorEtapa * PRIORITY_WEIGHTS.valorEtapa +
    factors.frescura * PRIORITY_WEIGHTS.frescura
  );

  return { score: Math.max(0, Math.min(100, score)), factors };
}

module.exports = { computePriority };
