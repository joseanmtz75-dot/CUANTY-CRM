const { Router } = require('express');

const ESTATUS_SIN_SEGUIMIENTO = ['Perdido', 'Descartado'];

function createAlertsRouter(prisma) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const now = new Date();
      const hace14dias = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const hace3dias = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [sinContacto, estancados, recsIgnoradas, vencidos] = await Promise.all([
        // 1. Sin contacto en +14 dias
        prisma.client.findMany({
          where: {
            estatus: { notIn: ESTATUS_SIN_SEGUIMIENTO },
            OR: [
              { ultimoContacto: { lt: hace14dias } },
              { ultimoContacto: null, createdAt: { lt: hace14dias } },
            ],
          },
          select: { id: true, nombre: true, ultimoContacto: true, createdAt: true },
        }),
        // 2. Estancados en estatus > 7 dias
        prisma.client.findMany({
          where: {
            estatus: { notIn: ESTATUS_SIN_SEGUIMIENTO },
            metrics: { diasEnEstatusActual: { gt: 7 } },
          },
          select: { id: true, nombre: true, estatus: true, metrics: { select: { diasEnEstatusActual: true } } },
        }),
        // 3. Recomendaciones sin atender > 3 dias
        prisma.recommendationLog.findMany({
          where: { wasActedUpon: null, createdAt: { lt: hace3dias } },
          select: { id: true, recommendedAction: true, createdAt: true, client: { select: { id: true, nombre: true } } },
          orderBy: { createdAt: 'asc' },
        }),
        // 4. Proximo contacto vencido
        prisma.client.findMany({
          where: {
            estatus: { notIn: ESTATUS_SIN_SEGUIMIENTO },
            proximoContacto: { lt: startOfDay },
          },
          select: { id: true, nombre: true, proximoContacto: true },
          orderBy: { proximoContacto: 'asc' },
        }),
      ]);

      const alerts = {
        sinContacto: sinContacto.map(c => ({
          tipo: 'sinContacto', clienteId: c.id, clienteNombre: c.nombre,
          mensaje: `Sin contacto hace ${Math.floor((now - new Date(c.ultimoContacto || c.createdAt)) / 86400000)} dias`,
        })),
        estancados: estancados.map(c => ({
          tipo: 'estancado', clienteId: c.id, clienteNombre: c.nombre,
          mensaje: `${c.metrics.diasEnEstatusActual} dias en "${c.estatus}"`,
        })),
        recsIgnoradas: recsIgnoradas.map(r => ({
          tipo: 'recIgnorada', clienteId: r.client.id, clienteNombre: r.client.nombre,
          mensaje: `"${r.recommendedAction}" sin atender`,
        })),
        vencidos: vencidos.map(c => ({
          tipo: 'vencido', clienteId: c.id, clienteNombre: c.nombre,
          mensaje: `Contacto vencido: ${new Date(c.proximoContacto).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`,
        })),
      };

      const total = alerts.sinContacto.length + alerts.estancados.length
        + alerts.recsIgnoradas.length + alerts.vencidos.length;

      res.json({ alerts, total });
    } catch (error) {
      console.error('Error en /alerts:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createAlertsRouter };
