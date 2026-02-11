const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const { createClientsRouter } = require('./routes/clients');
const { createFollowupsRouter } = require('./routes/followups');
const { createInteractionsRouter } = require('./routes/interactions');
const { createIntelligenceRouter } = require('./routes/intelligence');

// Singleton PrismaClient for serverless environments
const prisma = globalThis.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma;

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

// Only listen when running standalone (not in Vercel)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
