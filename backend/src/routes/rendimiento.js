const { Router } = require('express');

function createRendimientoRouter(prisma) {
  const router = Router();

  router.get('/rendimiento', async (req, res) => {
    try {
      const now = new Date();
      const hace7dias = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const hace30dias = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        interacciones7d,
        clientesContactados7d,
        avances7d,
        interacciones30d,
        metricsAll,
        clientesCerrados30d,
        clientesPerdidos30d,
        pipeline,
        disposiciones,
      ] = await Promise.all([
        // SEMANA: total interacciones 7d
        prisma.interaction.count({ where: { createdAt: { gte: hace7dias } } }),
        // SEMANA: clientes unicos contactados 7d
        prisma.interaction.groupBy({
          by: ['clientId'],
          where: { createdAt: { gte: hace7dias } },
        }),
        // SEMANA: clientes que avanzaron de estatus 7d
        prisma.statusChange.count({ where: { createdAt: { gte: hace7dias } } }),
        // MES: total interacciones 30d
        prisma.interaction.count({ where: { createdAt: { gte: hace30dias } } }),
        // MES: responseRate promedio
        prisma.clientMetrics.aggregate({
          _avg: { responseRate: true },
          where: { totalInteractions: { gt: 0 } },
        }),
        // MES: clientes ganados
        prisma.statusChange.findMany({
          where: {
            createdAt: { gte: hace30dias },
            toStatus: { in: ['Cerrado'] },
          },
          distinct: ['clientId'],
          select: { clientId: true },
        }),
        // MES: clientes perdidos
        prisma.statusChange.findMany({
          where: {
            createdAt: { gte: hace30dias },
            toStatus: { in: ['Perdido'] },
          },
          distinct: ['clientId'],
          select: { clientId: true },
        }),
        // PIPELINE: conteo por estatus
        prisma.client.groupBy({
          by: ['estatus'],
          _count: { id: true },
        }),
        // PIPELINE: disposiciones interesadas
        prisma.clientMetrics.count({
          where: { disposition: { in: ['interesado', 'muy_interesado', 'receptivo'] } },
        }),
      ]);

      res.json({
        semana: {
          interacciones: interacciones7d,
          clientesContactados: clientesContactados7d.length,
          avancesEstatus: avances7d,
        },
        mes: {
          interacciones: interacciones30d,
          tasaRespuesta: Math.round((metricsAll._avg.responseRate || 0) * 100),
          ganados: clientesCerrados30d.length,
          perdidos: clientesPerdidos30d.length,
        },
        pipeline: {
          porEstatus: pipeline.map((g) => ({
            estatus: g.estatus,
            count: g._count.id,
          })),
          interesados: disposiciones,
        },
      });
    } catch (error) {
      console.error('Error en /dashboard/rendimiento:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createRendimientoRouter };
