const { analyzeClientFull } = require('./index');

async function recomputeClientMetrics(prisma, clientIds) {
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return { computed: 0, errors: 0 };
  }

  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    include: {
      interactions: { orderBy: { createdAt: 'desc' } },
      statusChanges: true,
    },
  });

  let computed = 0;
  let errors = 0;

  for (const client of clients) {
    try {
      const analysis = analyzeClientFull(client);
      const data = {
        totalInteractions: analysis.metrics.totalInteractions,
        interaccionesUltimos7: analysis.metrics.ultimos7,
        interaccionesUltimos30: analysis.metrics.ultimos30,
        respuestas: analysis.metrics.respuestas,
        silencios: analysis.metrics.silencios,
        avances: analysis.metrics.avances,
        rechazos: analysis.metrics.rechazos,
        responseRate: analysis.metrics.responseRate,
        canalPreferido: analysis.metrics.canalPreferido,
        diasEnEstatusActual: analysis.metrics.diasEnEstatusActual,
        cambiosEstatus: analysis.metrics.cambiosEstatus,
        priorityScore: analysis.priority.score,
        engagementScore: Math.round(analysis.metrics.responseRate * 100),
        disposition: analysis.disposition.disposition,
        dispositionConfidence: analysis.disposition.confidence,
        recommendedAction: analysis.recommendations[0]?.action || null,
        recommendedApproach: analysis.recommendations[0]?.approach || null,
        recommendedChannel: analysis.recommendations[0]?.channel || null,
        recommendedReasoning: analysis.recommendations[0]?.reasoning || null,
        computedAt: new Date(),
      };

      await prisma.clientMetrics.upsert({
        where: { clientId: client.id },
        create: { clientId: client.id, ...data },
        update: data,
      });

      computed++;
    } catch (err) {
      console.error(`[recompute] error en client ${client.id}:`, err.message);
      errors++;
    }
  }

  return { computed, errors };
}

module.exports = { recomputeClientMetrics };
