const { Router } = require('express');
const { analyzeClientFull } = require('../engine');
const { ESTATUS_ACTIVOS } = require('../engine/constants');

function createIntelligenceRouter(prisma) {
  const router = Router();

  // GET /clients/:id/intelligence - Full analysis of a single client
  router.get('/clients/:id/intelligence', async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          interactions: { orderBy: { createdAt: 'desc' } },
          metrics: true,
          statusChanges: { orderBy: { createdAt: 'desc' } },
          recommendations: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      const analysis = analyzeClientFull(client);

      // Upsert metrics cache
      await prisma.clientMetrics.upsert({
        where: { clientId },
        create: {
          clientId,
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
        },
        update: {
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
        },
      });

      res.json({
        client: {
          id: client.id,
          nombre: client.nombre,
          estatus: client.estatus,
          createdAt: client.createdAt,
        },
        analysis,
        statusHistory: client.statusChanges,
        recentRecommendations: client.recommendations,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /engine/recompute - Recompute metrics for all active clients
  router.post('/engine/recompute', async (req, res) => {
    try {
      const clients = await prisma.client.findMany({
        where: { estatus: { in: ESTATUS_ACTIVOS } },
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

          await prisma.clientMetrics.upsert({
            where: { clientId: client.id },
            create: {
              clientId: client.id,
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
            },
            update: {
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
            },
          });

          computed++;
        } catch (err) {
          console.error(`Error computing client ${client.id}:`, err.message);
          errors++;
        }
      }

      res.json({ computed, errors, total: clients.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createIntelligenceRouter };
