const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const { createClientsRouter } = require('./routes/clients');
const { createFollowupsRouter } = require('./routes/followups');
const { createInteractionsRouter } = require('./routes/interactions');
const { createIntelligenceRouter } = require('./routes/intelligence');

const app = express();
const adapter = new PrismaBetterSqlite3({ url: 'file:' + path.join(__dirname, '..', 'dev.db') });
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// Mount routers
// Followups first (specific routes: /clients/today, /clients/suggestions, /clients/cleanup)
app.use('/clients', createFollowupsRouter(prisma));
// Interactions (nested: /clients/:id/interactions)
app.use('/clients', createInteractionsRouter(prisma));
// Clients CRUD (generic: /clients, /clients/:id, /clients/bulk)
app.use('/clients', createClientsRouter(prisma));
// Intelligence (separate paths: /clients/:id/intelligence, /engine/recompute)
app.use('/', createIntelligenceRouter(prisma));

// SPA fallback: serve index.html for any non-API route
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
