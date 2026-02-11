const { Router } = require('express');
const { calcularProximoContacto } = require('../followup-rules');
const { analyzeClientFull } = require('../engine');

function createInteractionsRouter(prisma) {
  const router = Router();

  // GET /clients/:id/interactions
  router.get('/:id/interactions', async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [interactions, total] = await Promise.all([
        prisma.interaction.findMany({
          where: { clientId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.interaction.count({ where: { clientId } }),
      ]);

      res.json({ interactions, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /clients/:id/interactions
  router.post('/:id/interactions', async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const { tipo, contenido, resultado, outcome, nuevoEstatus, proximoContacto } = req.body;

      if (!tipo || !contenido) {
        return res.status(400).json({ error: 'tipo y contenido son requeridos' });
      }

      // Create interaction with optional outcome
      const interaction = await prisma.interaction.create({
        data: {
          clientId, tipo, contenido,
          resultado: resultado || null,
          outcome: outcome || null,
        },
      });

      // Build client update
      const updateData = { ultimoContacto: new Date() };

      // If status changes, create StatusChange record
      if (nuevoEstatus) {
        const current = await prisma.client.findUnique({ where: { id: clientId } });
        if (current && nuevoEstatus !== current.estatus) {
          await prisma.statusChange.create({
            data: {
              clientId,
              fromStatus: current.estatus,
              toStatus: nuevoEstatus,
            },
          });
        }
        updateData.estatus = nuevoEstatus;
      }

      if (proximoContacto) {
        updateData.proximoContacto = new Date(proximoContacto);
        updateData.contactoManual = true;
      } else {
        const estatus = nuevoEstatus || (await prisma.client.findUnique({ where: { id: clientId } })).estatus;
        updateData.proximoContacto = calcularProximoContacto(estatus);
        updateData.contactoManual = false;
      }

      const client = await prisma.client.update({
        where: { id: clientId },
        data: updateData,
      });

      // Recompute metrics with engine
      try {
        const fullClient = await prisma.client.findUnique({
          where: { id: clientId },
          include: {
            interactions: { orderBy: { createdAt: 'desc' } },
            statusChanges: true,
          },
        });

        const analysis = analyzeClientFull(fullClient);

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

        // Log recommendation
        if (analysis.recommendations.length > 0) {
          const topRec = analysis.recommendations[0];
          await prisma.recommendationLog.create({
            data: {
              clientId,
              recommendedAction: topRec.action,
              recommendedApproach: topRec.approach,
              priorityScore: analysis.priority.score,
              disposition: analysis.disposition.disposition,
            },
          });
        }
      } catch (engineErr) {
        console.error('Engine recompute error (non-blocking):', engineErr.message);
      }

      res.json({ interaction, client });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createInteractionsRouter };
