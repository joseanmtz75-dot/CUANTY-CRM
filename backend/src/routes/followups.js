const { Router } = require('express');
const { enrichClient } = require('../helpers');
const { ESTATUS_SIN_SEGUIMIENTO } = require('../followup-rules');
const { analyzeClientFull } = require('../engine');
const { buildDailyPlan } = require('../engine/daily-plan');
const { DAILY_PLAN_CONFIG } = require('../engine/constants');

function createFollowupsRouter(prisma) {
  const router = Router();

  // Helper: check if cached metrics are fresh (< 1 hour)
  function isMetricsFresh(metrics) {
    if (!metrics) return false;
    const age = Date.now() - new Date(metrics.computedAt).getTime();
    return age < 60 * 60 * 1000; // 1 hour
  }

  // GET /clients/today
  router.get('/today', async (req, res) => {
    try {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const clients = await prisma.client.findMany({
        where: {
          proximoContacto: { lte: endOfDay },
          estatus: { notIn: ESTATUS_SIN_SEGUIMIENTO },
          rol: 'compras',
        },
        include: {
          interactions: { orderBy: { createdAt: 'desc' } },
          metrics: true,
          statusChanges: true,
        },
        orderBy: { proximoContacto: 'asc' },
      });

      const enriched = await Promise.all(clients.map(async (c) => {
        const { interactions, metrics: cachedMetrics, statusChanges, ...rest } = c;

        // Use cached metrics if fresh, otherwise recompute
        let analysis;
        if (isMetricsFresh(cachedMetrics)) {
          analysis = {
            disposition: { disposition: cachedMetrics.disposition, confidence: cachedMetrics.dispositionConfidence },
            priority: { score: cachedMetrics.priorityScore },
            recommendations: cachedMetrics.recommendedAction ? [{
              action: cachedMetrics.recommendedAction,
              approach: cachedMetrics.recommendedApproach,
              channel: cachedMetrics.recommendedChannel,
              reasoning: cachedMetrics.recommendedReasoning,
            }] : [],
          };
        } else {
          analysis = analyzeClientFull(c);
        }

        const enriched = enrichClient(rest);

        return {
          ...enriched,
          ultimaInteraccion: interactions[0] || null,
          // New fields alongside existing ones
          disposition: analysis.disposition,
          priority: analysis.priority,
          recommendations: analysis.recommendations,
        };
      }));

      // Sort by priority score DESC (new), then overdue, then temperatura
      const tempOrder = { caliente: 0, tibio: 1, frio: 2, inactivo: 3 };
      enriched.sort((a, b) => {
        // Primary: priority score DESC
        const pa = a.priority?.score ?? 0;
        const pb = b.priority?.score ?? 0;
        if (pa !== pb) return pb - pa;
        // Tiebreaker: overdue first
        if (a.diasVencido > 0 && b.diasVencido <= 0) return -1;
        if (b.diasVencido > 0 && a.diasVencido <= 0) return 1;
        // Then by temperature
        if (tempOrder[a.temperatura] !== tempOrder[b.temperatura]) {
          return tempOrder[a.temperatura] - tempOrder[b.temperatura];
        }
        return new Date(a.proximoContacto) - new Date(b.proximoContacto);
      });

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /clients/daily-plan
  router.get('/daily-plan', async (req, res) => {
    try {
      const rawLimit = req.query.limit;
      let limit = DAILY_PLAN_CONFIG.defaultLimit;

      if (rawLimit !== undefined) {
        limit = parseInt(rawLimit, 10);
        if (isNaN(limit)) {
          return res.status(400).json({ error: 'limit debe ser un numero entero' });
        }
        if (limit < DAILY_PLAN_CONFIG.minLimit || limit > DAILY_PLAN_CONFIG.maxLimit) {
          return res.status(400).json({
            error: `limit debe estar entre ${DAILY_PLAN_CONFIG.minLimit} y ${DAILY_PLAN_CONFIG.maxLimit}`,
          });
        }
      }

      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const clients = await prisma.client.findMany({
        where: {
          proximoContacto: { lte: endOfDay },
          estatus: { notIn: ESTATUS_SIN_SEGUIMIENTO },
          rol: 'compras',
        },
        include: {
          interactions: { orderBy: { createdAt: 'desc' } },
          metrics: true,
          statusChanges: true,
        },
      });

      const plan = buildDailyPlan(clients, limit);
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /clients/suggestions
  router.get('/suggestions', async (req, res) => {
    try {
      const clients = await prisma.client.findMany({
        where: { estatus: { notIn: ESTATUS_SIN_SEGUIMIENTO }, rol: 'compras' },
        include: {
          interactions: { orderBy: { createdAt: 'desc' } },
          metrics: true,
          statusChanges: true,
        },
      });

      const result = {
        // Existing categories
        vencidos: [],
        nuevosSinContactar: [],
        sinContacto7dias: [],
        considerarDescartar: [],
        datosIncompletos: [],
        // New intelligence categories
        listosParaCierre: [],
        enRiesgo: [],
        altaPrioridad: [],
      };

      for (const client of clients) {
        const { interactions, metrics: cachedMetrics, statusChanges, ...rest } = client;
        const enrichedClient = enrichClient(rest);

        // Existing suggestion logic
        for (const s of enrichedClient.sugerencias) {
          if (s.tipo === 'vencido') result.vencidos.push(enrichedClient);
          if (s.tipo === 'nuevo_sin_contactar') result.nuevosSinContactar.push(enrichedClient);
          if (s.tipo === 'sin_contacto') result.sinContacto7dias.push(enrichedClient);
          if (s.tipo === 'considerar_descartar') result.considerarDescartar.push(enrichedClient);
          if (s.tipo === 'datos_incompletos') result.datosIncompletos.push(enrichedClient);
        }

        // New intelligence categories
        let analysis;
        if (isMetricsFresh(cachedMetrics)) {
          analysis = {
            disposition: { disposition: cachedMetrics.disposition },
            priority: { score: cachedMetrics.priorityScore },
          };
        } else {
          analysis = analyzeClientFull(client);
        }

        const disp = analysis.disposition.disposition;
        const pScore = analysis.priority.score;

        if (disp === 'listo_para_decision') {
          result.listosParaCierre.push({ ...enrichedClient, priorityScore: pScore, disposition: disp });
        }
        if (disp === 'frio' && pScore > 30) {
          result.enRiesgo.push({ ...enrichedClient, priorityScore: pScore, disposition: disp });
        }
        if (pScore >= 75) {
          result.altaPrioridad.push({ ...enrichedClient, priorityScore: pScore, disposition: disp });
        }
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /clients/cleanup
  router.get('/cleanup', async (req, res) => {
    try {
      const allClients = await prisma.client.findMany();

      const phoneMap = {};
      for (const c of allClients) {
        const key = c.telefono.replace(/\D/g, '');
        if (!phoneMap[key]) phoneMap[key] = [];
        phoneMap[key].push(c);
      }
      const duplicados = Object.values(phoneMap).filter(arr => arr.length > 1);

      const incompletos = allClients.filter(c => !c.email && !c.empresa && !ESTATUS_SIN_SEGUIMIENTO.includes(c.estatus));
      const inactivos = allClients.filter(c => ESTATUS_SIN_SEGUIMIENTO.includes(c.estatus));

      res.json({ duplicados, incompletos, inactivos });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createFollowupsRouter };
