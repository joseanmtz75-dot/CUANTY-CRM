// One-time script: seed ClientMetrics and initial StatusChange for all active clients

const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { analyzeClientFull } = require('./engine');
const { ESTATUS_ACTIVOS } = require('./engine/constants');

const adapter = new PrismaBetterSqlite3({ url: 'file:' + path.join(__dirname, '..', 'dev.db') });
const prisma = new PrismaClient({ adapter });

async function seed() {
  const clients = await prisma.client.findMany({
    include: {
      interactions: { orderBy: { createdAt: 'desc' } },
      statusChanges: true,
    },
  });

  let seeded = 0;
  let errors = 0;

  for (const client of clients) {
    try {
      const analysis = analyzeClientFull(client);

      // Upsert metrics
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

      // Create initial StatusChange if none exists
      if (client.statusChanges.length === 0) {
        await prisma.statusChange.create({
          data: {
            clientId: client.id,
            fromStatus: '',
            toStatus: client.estatus,
          },
        });
      }

      seeded++;
    } catch (err) {
      console.error(`Error seeding client ${client.id} (${client.nombre}):`, err.message);
      errors++;
    }
  }

  console.log(`Seed complete: ${seeded} clients seeded, ${errors} errors, ${clients.length} total`);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
