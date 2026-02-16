const { Router } = require('express');
const { enrichClient } = require('../helpers');
const { ESTATUS_SIN_SEGUIMIENTO } = require('../followup-rules');

function createMiDiaRouter(prisma) {
  const router = Router();

  // GET /dashboard/mi-dia
  router.get('/mi-dia', async (req, res) => {
    try {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const hace14dias = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      // 1. Tareas de Hoy: clientes con proximoContacto <= fin de hoy, activos
      const tareasRaw = await prisma.client.findMany({
        where: {
          proximoContacto: { lte: endOfDay },
          estatus: { notIn: ESTATUS_SIN_SEGUIMIENTO },
        },
        include: { metrics: true },
        orderBy: { proximoContacto: 'asc' },
      });

      const tareasDeHoy = tareasRaw
        .map((c) => {
          const { metrics, ...rest } = c;
          const enriched = enrichClient(rest);
          return {
            ...enriched,
            priorityScore: metrics?.priorityScore ?? 50,
            disposition: metrics?.disposition ?? 'desconocido',
            recommendedAction: metrics?.recommendedAction || null,
          };
        })
        .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
        .slice(0, 20);

      // 2. En Riesgo: sin contacto 14+ dias OR estancados 7+ dias en estatus
      const enRiesgoRaw = await prisma.client.findMany({
        where: {
          estatus: { notIn: ESTATUS_SIN_SEGUIMIENTO },
          OR: [
            { ultimoContacto: { lt: hace14dias } },
            { ultimoContacto: null },
            { metrics: { diasEnEstatusActual: { gt: 7 } } },
          ],
        },
        include: { metrics: true },
      });

      const enRiesgo = enRiesgoRaw
        .map((c) => {
          const { metrics, ...rest } = c;
          const enriched = enrichClient(rest);
          // Determine risk reason
          let razonRiesgo = '';
          const sinContacto = !c.ultimoContacto || new Date(c.ultimoContacto) < hace14dias;
          const estancado = metrics && metrics.diasEnEstatusActual > 7;
          if (sinContacto && estancado) {
            razonRiesgo = 'Sin contacto 14+ dias y estancado 7+ dias';
          } else if (sinContacto) {
            razonRiesgo = c.ultimoContacto ? 'Sin contacto 14+ dias' : 'Nunca contactado';
          } else if (estancado) {
            razonRiesgo = `Estancado ${metrics.diasEnEstatusActual} dias en ${c.estatus}`;
          }
          return {
            ...enriched,
            priorityScore: metrics?.priorityScore ?? 50,
            disposition: metrics?.disposition ?? 'desconocido',
            razonRiesgo,
          };
        })
        .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
        .slice(0, 15);

      // 3. Acciones Recomendadas: top 5 recommendations not acted upon
      const recsRaw = await prisma.recommendationLog.findMany({
        where: { wasActedUpon: null },
        include: { client: { include: { metrics: true } } },
        orderBy: { priorityScore: 'desc' },
        take: 20,
      });

      const accionRecomendada = recsRaw
        .filter((r) => r.client && !ESTATUS_SIN_SEGUIMIENTO.includes(r.client.estatus))
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          clientId: r.client.id,
          nombre: r.client.nombre,
          empresa: r.client.empresa,
          estatus: r.client.estatus,
          recommendedAction: r.recommendedAction,
          recommendedApproach: r.recommendedApproach,
          disposition: r.disposition,
          priorityScore: r.priorityScore,
        }));

      // 4. Resumen Semana
      const [interaccionesCount, avanzaron, interesados] = await Promise.all([
        prisma.interaction.count({ where: { createdAt: { gte: hace7dias } } }),
        prisma.statusChange.count({ where: { createdAt: { gte: hace7dias } } }),
        prisma.clientMetrics.count({ where: { disposition: 'receptivo' } }),
      ]);

      const resumenSemana = { interaccionesCount, avanzaron, interesados };

      res.json({ tareasDeHoy, enRiesgo, accionRecomendada, resumenSemana });
    } catch (error) {
      console.error('Error en /dashboard/mi-dia:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createMiDiaRouter };
