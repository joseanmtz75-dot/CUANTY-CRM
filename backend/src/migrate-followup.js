// Migration script: populate proximoContacto and ultimoContacto for existing clients
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { calcularProximoContacto, ESTATUS_SIN_SEGUIMIENTO } = require('./followup-rules');

const adapter = new PrismaBetterSqlite3({ url: 'file:' + path.join(__dirname, '..', 'dev.db') });
const prisma = new PrismaClient({ adapter });

async function migrate() {
  const clients = await prisma.client.findMany();
  console.log(`Migrando ${clients.length} clientes...`);

  let updated = 0;
  for (const client of clients) {
    const ultimoContacto = client.createdAt;
    let proximoContacto = null;

    if (!ESTATUS_SIN_SEGUIMIENTO.includes(client.estatus)) {
      proximoContacto = calcularProximoContacto(client.estatus, client.createdAt);
      // If the calculated date is in the past, use NOW + rule days
      if (proximoContacto && proximoContacto < new Date()) {
        proximoContacto = calcularProximoContacto(client.estatus, new Date());
      }
    }

    await prisma.client.update({
      where: { id: client.id },
      data: {
        ultimoContacto,
        proximoContacto,
        contactoManual: false,
      },
    });
    updated++;
  }

  console.log(`${updated} clientes migrados exitosamente.`);
  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
