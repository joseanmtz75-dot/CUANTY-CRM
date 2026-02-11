// Stage 1: Behavioral metrics computation

const { OUTCOMES } = require('./constants');

function diasDesde(fecha) {
  if (!fecha) return Infinity;
  const diff = Date.now() - new Date(fecha).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function analyzeClient(client, interactions) {
  const now = new Date();
  const hace7 = new Date(now); hace7.setDate(hace7.getDate() - 7);
  const hace30 = new Date(now); hace30.setDate(hace30.getDate() - 30);

  // Basic counts
  const totalInteractions = interactions.length;
  const ultimos7 = interactions.filter(i => new Date(i.createdAt) >= hace7).length;
  const ultimos30 = interactions.filter(i => new Date(i.createdAt) >= hace30).length;

  // Outcome counts
  let respuestas = 0, silencios = 0, avances = 0, rechazos = 0;
  for (const i of interactions) {
    if (i.outcome === OUTCOMES.RESPUESTA) respuestas++;
    else if (i.outcome === OUTCOMES.SILENCIO) silencios++;
    else if (i.outcome === OUTCOMES.AVANCE) avances++;
    else if (i.outcome === OUTCOMES.RECHAZO) rechazos++;
  }

  // Response rate
  const responseBase = respuestas + silencios;
  const responseRate = responseBase > 0 ? respuestas / responseBase : 0;

  // Channel analysis
  const channelCount = {};
  const channelSuccess = {};
  for (const i of interactions) {
    const ch = i.tipo || 'otro';
    channelCount[ch] = (channelCount[ch] || 0) + 1;
    if (i.outcome === OUTCOMES.RESPUESTA || i.outcome === OUTCOMES.AVANCE) {
      channelSuccess[ch] = (channelSuccess[ch] || 0) + 1;
    }
  }

  // Preferred channel: highest success rate with at least 1 success, fallback to most used
  let canalPreferido = null;
  if (Object.keys(channelCount).length > 0) {
    let bestRate = -1;
    for (const [ch, count] of Object.entries(channelCount)) {
      const successes = channelSuccess[ch] || 0;
      if (successes > 0) {
        const rate = successes / count;
        if (rate > bestRate) {
          bestRate = rate;
          canalPreferido = ch;
        }
      }
    }
    if (!canalPreferido) {
      // Fallback: most used channel
      canalPreferido = Object.entries(channelCount).sort((a, b) => b[1] - a[1])[0][0];
    }
  }

  // Time-based metrics
  const diasSinContacto = diasDesde(client.ultimoContacto || client.createdAt);
  const diasDesdeCreacion = diasDesde(client.createdAt);
  const diasEnEstatusActual = diasDesde(client.ultimoContacto || client.createdAt);

  // Status changes count (from statusChanges relation if available)
  const cambiosEstatus = client.statusChanges ? client.statusChanges.length : 0;

  // Contact frequency in last 30 days
  const frecuenciaUltimos30 = ultimos30;

  // Last N outcomes for recent pattern analysis
  const ultimosOutcomes = interactions.slice(0, 5).map(i => i.outcome).filter(Boolean);

  return {
    totalInteractions,
    ultimos7,
    ultimos30,
    respuestas,
    silencios,
    avances,
    rechazos,
    responseRate,
    canalPreferido,
    diasSinContacto,
    diasDesdeCreacion,
    diasEnEstatusActual,
    cambiosEstatus,
    frecuenciaUltimos30,
    ultimosOutcomes,
  };
}

module.exports = { analyzeClient, diasDesde };
