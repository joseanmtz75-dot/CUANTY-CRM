require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const { createClientsRouter } = require('./routes/clients');
const { createFollowupsRouter } = require('./routes/followups');
const { createInteractionsRouter } = require('./routes/interactions');
const { createIntelligenceRouter } = require('./routes/intelligence');
const { createVendedoresRouter } = require('./routes/vendedores');

// Singleton PrismaClient for serverless environments
if (!globalThis.__prisma) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, client_encoding: 'UTF8' });
  globalThis.__prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
}
const prisma = globalThis.__prisma;

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mount routers
// Followups first (specific routes: /clients/today, /clients/suggestions, /clients/cleanup)
app.use('/clients', createFollowupsRouter(prisma));
// Interactions (nested: /clients/:id/interactions)
app.use('/clients', createInteractionsRouter(prisma));
// Clients CRUD (generic: /clients, /clients/:id, /clients/bulk)
app.use('/clients', createClientsRouter(prisma));
// Intelligence (separate paths: /clients/:id/intelligence, /engine/recompute)
app.use('/', createIntelligenceRouter(prisma));
// Vendedores CRUD
app.use('/vendedores', createVendedoresRouter(prisma));

// Only listen when running standalone (not in Vercel)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
