const { Router } = require('express');
const { enrichClient } = require('../helpers');
const { ESTATUS_SIN_SEGUIMIENTO } = require('../followup-rules');
const {
  DIAS_SIN_COMPRA_REACTIVAR,
  DIAS_SIN_COMPRA_POSTVENTA,
  DIAS_PRIMERA_COMPRA_ONBOARDING,
} = require('../engine/constants');

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
      const haceReactivar = new Date(Date.now() - DIAS_SIN_COMPRA_REACTIVAR * 24 * 60 * 60 * 1000);

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

      // 2. En Riesgo: sin contacto 14+ dias OR estancados 7+ dias OR ALTO ERP sin compra 12+ meses
      const enRiesgoRaw = await prisma.client.findMany({
        where: {
          estatus: { notIn: ESTATUS_SIN_SEGUIMIENTO },
          OR: [
            { ultimoContacto: { lt: hace14dias } },
            { ultimoContacto: null },
            { metrics: { diasEnEstatusActual: { gt: 7 } } },
            { AND: [{ clasificacionErp: 'ALTO' }, { ultimaCompraErp: { lt: haceReactivar } }] },
          ],
        },
        include: { metrics: true },
      });

      const enRiesgo = enRiesgoRaw
        .map((c) => {
          const { metrics, ...rest } = c;
          const enriched = enrichClient(rest);
          // Determine risk reason — ERP-driven gana porque es el caso más valioso
          let razonRiesgo = '';
          const altoEnRiesgoErp = c.clasificacionErp === 'ALTO' && c.ultimaCompraErp && new Date(c.ultimaCompraErp) < haceReactivar;
          const sinContacto = !c.ultimoContacto || new Date(c.ultimoContacto) < hace14dias;
          const estancado = metrics && metrics.diasEnEstatusActual > 7;
          if (altoEnRiesgoErp) {
            const dias = Math.floor((Date.now() - new Date(c.ultimaCompraErp).getTime()) / 86400000);
            const meses = Math.round(dias / 30);
            razonRiesgo = `VIP ALTO sin compra hace ${meses} meses`;
          } else if (sinContacto && estancado) {
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
            altoEnRiesgoErp,
          };
        })
        .sort((a, b) => {
          // VIPs en riesgo ERP primero, después por priorityScore
          if (a.altoEnRiesgoErp !== b.altoEnRiesgoErp) return a.altoEnRiesgoErp ? -1 : 1;
          return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
        })
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

  // GET /dashboard/overview — counts agregados para Dashboard (cheap, sin pull de 1k+ rows)
  router.get('/overview', async (req, res) => {
    try {
      const haceReactivar = new Date(Date.now() - DIAS_SIN_COMPRA_REACTIVAR * 86400000);
      const hacePostventa = new Date(Date.now() - DIAS_SIN_COMPRA_POSTVENTA * 86400000);
      const haceOnboarding = new Date(Date.now() - DIAS_PRIMERA_COMPRA_ONBOARDING * 86400000);

      const [
        totalClientes,
        porEstatusRaw,
        porClasErpRaw,
        porDispositionRaw,
        altosEnRiesgo,
        postventaPendiente,
        onboardingActivo,
        totalComprasAgg,
        topPriorityRaw,
      ] = await Promise.all([
        prisma.client.count(),
        prisma.client.groupBy({ by: ['estatus'], _count: { _all: true } }),
        prisma.client.groupBy({
          by: ['clasificacionErp'],
          _count: { _all: true },
          where: { clasificacionErp: { not: null } },
        }),
        prisma.$queryRaw`
          SELECT m.disposition, COUNT(*)::int AS count
          FROM "ClientMetrics" m
          INNER JOIN "Client" c ON m."clientId" = c.id
          WHERE c.estatus NOT IN ('Cerrado', 'Perdido', 'Descartado')
          GROUP BY m.disposition
        `,
        prisma.client.count({
          where: { clasificacionErp: 'ALTO', ultimaCompraErp: { lt: haceReactivar } },
        }),
        prisma.client.count({
          where: {
            clasificacionErp: 'ALTO',
            estatus: 'Cerrado',
            ultimaCompraErp: { lt: hacePostventa },
          },
        }),
        prisma.client.count({
          where: { estatus: 'Nuevo', primeraCompraErp: { gte: haceOnboarding } },
        }),
        prisma.client.aggregate({ _sum: { totalComprasErp: true } }),
        prisma.client.findMany({
          where: { estatus: { notIn: ESTATUS_SIN_SEGUIMIENTO } },
          include: {
            metrics: { select: { priorityScore: true, disposition: true, recommendedAction: true } },
          },
          orderBy: { metrics: { priorityScore: 'desc' } },
          take: 5,
        }),
      ]);

      const porEstatus = Object.fromEntries(porEstatusRaw.map((r) => [r.estatus, r._count._all]));
      const porClasificacionErp = Object.fromEntries(
        porClasErpRaw.map((r) => [r.clasificacionErp, r._count._all])
      );
      const porDisposition = Object.fromEntries(
        porDispositionRaw.map((r) => [r.disposition, Number(r.count)])
      );

      const topPriority = topPriorityRaw.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        empresa: c.empresa,
        estatus: c.estatus,
        clasificacionErp: c.clasificacionErp,
        priorityScore: c.metrics?.priorityScore ?? 50,
        disposition: c.metrics?.disposition || 'desconocido',
        recommendedAction: c.metrics?.recommendedAction || null,
      }));

      res.json({
        totalClientes,
        porEstatus,
        porDisposition,
        porClasificacionErp,
        altosEnRiesgo,
        postventaPendiente,
        onboardingActivo,
        totalComprasErpAcum: Number(totalComprasAgg._sum.totalComprasErp || 0),
        topPriority,
      });
    } catch (error) {
      console.error('Error en /dashboard/overview:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createMiDiaRouter };
