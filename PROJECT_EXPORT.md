# CRM-CLIENTES — Exportación Completa del Proyecto

## Estructura de Directorios

```
CRM-CLIENTES/
├── .gitignore
├── package.json
├── vercel.json
├── api/
│   └── index.js
├── scripts/
│   └── start.ps1
├── backend/
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── prisma.config.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │       ├── migration_lock.toml
│   │       ├── 20260211000000_init/
│   │       │   └── migration.sql
│   │       ├── 20260212000000_add_vendedor/
│   │       │   └── migration.sql
│   │       └── 20260216201834_add_next_action_note/
│   │           └── migration.sql
│   └── src/
│       ├── index.js
│       ├── helpers.js
│       ├── followup-rules.js
│       ├── engine/
│       │   ├── index.js
│       │   ├── constants.js
│       │   ├── metrics.js
│       │   ├── disposition.js
│       │   ├── priority.js
│       │   ├── recommendations.js
│       │   └── daily-plan.js
│       └── routes/
│           ├── clients.js
│           ├── followups.js
│           ├── interactions.js
│           ├── intelligence.js
│           ├── vendedores.js
│           ├── mi-dia.js
│           ├── rendimiento.js
│           ├── alerts.js
│           └── chat.js
└── frontend/
    ├── .gitignore
    ├── package.json
    ├── index.html
    ├── vite.config.js
    ├── eslint.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.css
        ├── index.css
        ├── theme.css
        ├── api/
        │   └── clients.js
        ├── utils/
        │   ├── constants.js
        │   ├── formatters.js
        │   └── fileParser.js
        ├── assistant/
        │   ├── intentEngine.js
        │   └── intentHandlers.js
        └── components/
            ├── AlertasPanel.jsx
            ├── BulkAssignModal.jsx
            ├── ChatAssistant.jsx
            ├── ClientForm.jsx
            ├── ClientIntelligenceModal.jsx
            ├── ClientRow.jsx
            ├── ClientTable.jsx
            ├── Dashboard.jsx
            ├── FollowUpView.jsx
            ├── ImportModal.jsx
            ├── InteractionHistory.jsx
            ├── MiDia.jsx
            ├── MiRendimiento.jsx
            ├── QuickLogModal.jsx
            ├── SuggestionPanel.jsx
            └── VendedorView.jsx
```

---

## ARCHIVOS DE CONFIGURACIÓN

---

### `.gitignore`

```
node_modules/
dist/
.env
*.db
NUL
nul
tmp_*.json

.vercel
```

---

### `package.json`

```json
{
  "name": "crm-clientes",
  "private": true,
  "scripts": {
    "dev": "concurrently -n back,front -c blue,green \"npm run dev -w backend\" \"npm run dev -w frontend\"",
    "build": "npm run build -w backend && npm run build -w frontend",
    "start": "npm run start -w backend",
    "install:all": "npm install -w backend && npm install -w frontend"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  },
  "workspaces": [
    "backend",
    "frontend"
  ],
  "engines": {
    "node": "20.x"
  }
}
```

---

### `vercel.json`

```json
{
  "installCommand": "npm install --install-strategy=nested",
  "buildCommand": "npm run build -w backend && npm run build -w frontend",
  "outputDirectory": "frontend/dist",
  "framework": null,
  "rewrites": [
    { "source": "/clients", "destination": "/api" },
    { "source": "/clients/(.*)", "destination": "/api" },
    { "source": "/engine/(.*)", "destination": "/api" },
    { "source": "/vendedores", "destination": "/api" },
    { "source": "/vendedores/(.*)", "destination": "/api" },
    { "source": "/dashboard/(.*)", "destination": "/api" },
    { "source": "/alerts", "destination": "/api" },
    { "source": "/alerts/(.*)", "destination": "/api" },
    { "source": "/chat", "destination": "/api" }
  ],
  "functions": {
    "api/index.js": {
      "includeFiles": "backend/{src/**,node_modules/.prisma/**}"
    }
  }
}
```

---

### `api/index.js`

```javascript
const app = require('../backend/src/index');
module.exports = app;
```

---

### `scripts/start.ps1`

```powershell
# CRM Clientes - Build & Start
# Ejecutar desde la raiz del proyecto: .\scripts\start.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== Construyendo frontend ===" -ForegroundColor Cyan
Set-Location "$root\frontend"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Error al construir el frontend" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== Iniciando servidor ===" -ForegroundColor Cyan
Set-Location "$root\backend"
Write-Host "CRM disponible en http://localhost:3000" -ForegroundColor Green
node src/index.js
```

---

## BACKEND

---

### `backend/.gitignore`

```
node_modules
# Keep environment variables out of version control
.env

/src/generated/prisma
```

---

### `backend/.env` (TEMPLATE — reemplaza con tus propias credenciales)

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
PORT=3001
DEEPSEEK_API_KEY=sk-YOUR_API_KEY_HERE
```

---

### `backend/package.json`

```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "nodemon src/index.js",
    "build": "npx prisma generate && npx prisma migrate deploy || echo 'migrate deploy skipped (no DATABASE_URL)'",
    "start": "node src/index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "@prisma/adapter-pg": "^7.3.0",
    "@prisma/client": "^7.3.0",
    "cors": "^2.8.6",
    "dotenv": "^17.2.4",
    "express": "^5.2.1",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "better-sqlite3": "^12.6.2",
    "nodemon": "^3.1.11",
    "prisma": "^7.3.0"
  }
}
```

---

### `backend/prisma.config.ts`

```typescript
import { defineConfig } from "prisma/config";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

### `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Client {
  id               Int                @id @default(autoincrement())
  nombre           String
  telefono         String             @unique
  email            String?
  empresa          String?
  estatus          String             @default("Nuevo")
  origen           String?
  rol              String   @default("compras")
  rolPersonalizado String?
  vendedor         String?
  notas            String?
  nextActionNote   String?
  proximoContacto  DateTime?
  ultimoContacto   DateTime?
  contactoManual   Boolean            @default(false)
  createdAt        DateTime           @default(now())
  interactions     Interaction[]
  metrics          ClientMetrics?
  statusChanges    StatusChange[]
  recommendations  RecommendationLog[]
}

model Interaction {
  id        Int      @id @default(autoincrement())
  clientId  Int
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  tipo      String
  contenido String
  resultado String?
  outcome   String?
  createdAt DateTime @default(now())
}

model ClientMetrics {
  id                     Int      @id @default(autoincrement())
  clientId               Int      @unique
  client                 Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  totalInteractions      Int      @default(0)
  interaccionesUltimos7  Int      @default(0)
  interaccionesUltimos30 Int      @default(0)

  respuestas             Int      @default(0)
  silencios              Int      @default(0)
  avances                Int      @default(0)
  rechazos               Int      @default(0)

  responseRate           Float    @default(0)
  avgResponseTimeDays    Float?
  canalPreferido         String?

  diasEnEstatusActual    Int      @default(0)
  cambiosEstatus         Int      @default(0)

  priorityScore          Int      @default(50)
  engagementScore        Int      @default(50)

  disposition            String   @default("desconocido")
  dispositionConfidence  Float    @default(0)

  recommendedAction      String?
  recommendedApproach    String?
  recommendedChannel     String?
  recommendedReasoning   String?

  computedAt             DateTime @default(now())
}

model StatusChange {
  id         Int      @id @default(autoincrement())
  clientId   Int
  client     Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  fromStatus String
  toStatus   String
  createdAt  DateTime @default(now())
}

model RecommendationLog {
  id                  Int       @id @default(autoincrement())
  clientId            Int
  client              Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  recommendedAction   String
  recommendedApproach String?
  priorityScore       Int
  disposition         String
  wasActedUpon        Boolean?
  interactionId       Int?
  createdAt           DateTime  @default(now())
  resolvedAt          DateTime?
}

model Vendedor {
  id        Int      @id @default(autoincrement())
  nombre    String   @unique
  createdAt DateTime @default(now())
}
```

---

### `backend/prisma/migrations/migration_lock.toml`

```toml
# Please do not edit this file manually
# It should be added in your version-control system (e.g., Git)
provider = "postgresql"
```

---

### `backend/prisma/migrations/20260211000000_init/migration.sql`

```sql
-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "empresa" TEXT,
    "estatus" TEXT NOT NULL DEFAULT 'Nuevo',
    "origen" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'compras',
    "rolPersonalizado" TEXT,
    "notas" TEXT,
    "proximoContacto" TIMESTAMP(3),
    "ultimoContacto" TIMESTAMP(3),
    "contactoManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "resultado" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMetrics" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "interaccionesUltimos7" INTEGER NOT NULL DEFAULT 0,
    "interaccionesUltimos30" INTEGER NOT NULL DEFAULT 0,
    "respuestas" INTEGER NOT NULL DEFAULT 0,
    "silencios" INTEGER NOT NULL DEFAULT 0,
    "avances" INTEGER NOT NULL DEFAULT 0,
    "rechazos" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResponseTimeDays" DOUBLE PRECISION,
    "canalPreferido" TEXT,
    "diasEnEstatusActual" INTEGER NOT NULL DEFAULT 0,
    "cambiosEstatus" INTEGER NOT NULL DEFAULT 0,
    "priorityScore" INTEGER NOT NULL DEFAULT 50,
    "engagementScore" INTEGER NOT NULL DEFAULT 50,
    "disposition" TEXT NOT NULL DEFAULT 'desconocido',
    "dispositionConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendedAction" TEXT,
    "recommendedApproach" TEXT,
    "recommendedChannel" TEXT,
    "recommendedReasoning" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusChange" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationLog" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "recommendedApproach" TEXT,
    "priorityScore" INTEGER NOT NULL,
    "disposition" TEXT NOT NULL,
    "wasActedUpon" BOOLEAN,
    "interactionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "RecommendationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_telefono_key" ON "Client"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "ClientMetrics_clientId_key" ON "ClientMetrics"("clientId");

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMetrics" ADD CONSTRAINT "ClientMetrics_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusChange" ADD CONSTRAINT "StatusChange_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationLog" ADD CONSTRAINT "RecommendationLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

### `backend/prisma/migrations/20260212000000_add_vendedor/migration.sql`

```sql
-- AlterTable
ALTER TABLE "Client" ADD COLUMN "vendedor" TEXT;

-- CreateTable
CREATE TABLE "Vendedor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendedor_nombre_key" ON "Vendedor"("nombre");
```

---

### `backend/prisma/migrations/20260216201834_add_next_action_note/migration.sql`

```sql
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "nextActionNote" TEXT;
```

---

### `backend/src/index.js`

```javascript
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
const { createMiDiaRouter } = require('./routes/mi-dia');
const { createAlertsRouter } = require('./routes/alerts');
const { createRendimientoRouter } = require('./routes/rendimiento');
const { createChatRouter } = require('./routes/chat');

// Singleton PrismaClient for serverless environments
if (!globalThis.__prisma) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, client_encoding: 'UTF8' });
  globalThis.__prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
}
const prisma = globalThis.__prisma;

// Seed initial vendedores
async function seedVendedores() {
  const nombres = ['Natalia Moran'];
  for (const nombre of nombres) {
    await prisma.vendedor.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
}
seedVendedores().catch(err => console.error('Error seeding vendedores:', err.message));

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
// Mi Dia dashboard
app.use('/dashboard', createMiDiaRouter(prisma));
// Rendimiento
app.use('/dashboard', createRendimientoRouter(prisma));
// Alerts
app.use('/alerts', createAlertsRouter(prisma));
// Chat (DeepSeek AI)
app.use('/chat', createChatRouter(prisma));

// Only listen when running standalone (not in Vercel)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
```

---

### `backend/src/helpers.js`

```javascript
// Shared helpers extracted from index.js

const { calcularTemperatura, generarSugerencias, diasDesde } = require('./followup-rules');

const LOWERCASE_WORDS = new Set(['de', 'del', 'los', 'las', 'y', 'e', 'el', 'la']);

function formatName(name) {
  if (!name) return '';
  const cleaned = String(name).trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned.split(' ').map((word, i) => {
    const lower = word.toLowerCase();
    if (i > 0 && LOWERCASE_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
}

function formatPhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 13 && digits.startsWith('521')) digits = digits.substring(3);
  else if (digits.length === 12 && digits.startsWith('52')) digits = digits.substring(2);
  if (digits.length === 10) {
    return `+52 ${digits.substring(0, 2)} ${digits.substring(2, 6)} ${digits.substring(6)}`;
  }
  return digits;
}

function enrichClient(client) {
  const temperatura = calcularTemperatura(client);
  const sugerencias = generarSugerencias(client);
  const diasSinContacto = diasDesde(client.ultimoContacto || client.createdAt);
  let diasVencido = 0;
  if (client.proximoContacto && new Date(client.proximoContacto) < new Date()) {
    diasVencido = diasDesde(client.proximoContacto);
  }
  return { ...client, temperatura, sugerencias, diasSinContacto, diasVencido };
}

module.exports = { formatName, formatPhone, enrichClient };
```

---

### `backend/src/followup-rules.js`

```javascript
// Follow-up rules engine — Distribuidora GASPAR (SICOM)
// Intervalos calibrados para venta B2B de equipos electronicos para estaciones de gas

const DIAS_POR_ESTATUS = {
  'Nuevo': 3,
  'Contactado': 5,
  'Sin respuesta': 7,
  'Interesado': 3,
  'Negociando': 2,
  'Reactivar': 7,
  'Cerrado': 90,       // Postventa: refacciones, modulos, nueva necesidad
  'Perdido': null,
  'Descartado': null,
};

const ESTATUS_SIN_SEGUIMIENTO = ['Perdido', 'Descartado'];

function calcularProximoContacto(estatus, desde = new Date()) {
  const dias = DIAS_POR_ESTATUS[estatus];
  if (dias == null) return null;
  const fecha = new Date(desde);
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

function diasDesde(fecha) {
  if (!fecha) return Infinity;
  const ahora = new Date();
  const diff = ahora.getTime() - new Date(fecha).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function calcularTemperatura(client) {
  if (ESTATUS_SIN_SEGUIMIENTO.includes(client.estatus)) return 'inactivo';

  // Cerrado con seguimiento de postventa se marca tibio (relacion activa)
  if (client.estatus === 'Cerrado') return 'tibio';

  const dias = diasDesde(client.ultimoContacto || client.createdAt);

  if (['Interesado', 'Negociando'].includes(client.estatus) && dias <= 7) return 'caliente';
  if (dias <= 14) return 'tibio';
  if (dias > 30) return 'frio';
  return 'tibio';
}

function generarSugerencias(client) {
  const sugerencias = [];
  const ahora = new Date();

  // Seguimiento vencido
  if (client.proximoContacto && new Date(client.proximoContacto) < ahora && !ESTATUS_SIN_SEGUIMIENTO.includes(client.estatus)) {
    const diasVencido = diasDesde(client.proximoContacto);
    sugerencias.push({ tipo: 'vencido', prioridad: 'alta', mensaje: `Seguimiento vencido hace ${diasVencido} día${diasVencido !== 1 ? 's' : ''}` });
  }

  // Cliente nuevo sin contactar > 3 días
  if (client.estatus === 'Nuevo' && diasDesde(client.createdAt) > 3 && !client.ultimoContacto) {
    sugerencias.push({ tipo: 'nuevo_sin_contactar', prioridad: 'alta', mensaje: 'Cliente nuevo sin contactar — identificar proyecto o necesidad' });
  }

  // Sin contacto > 14 días (B2B: ciclos largos son normales)
  const diasSinContacto = diasDesde(client.ultimoContacto || client.createdAt);
  if (diasSinContacto > 14 && !ESTATUS_SIN_SEGUIMIENTO.includes(client.estatus) && client.estatus !== 'Cerrado') {
    sugerencias.push({ tipo: 'sin_contacto', prioridad: 'media', mensaje: `Sin contacto hace ${diasSinContacto} días` });
  }

  // Sin respuesta > 45 días → sugerir archivar (NO descartar)
  if (client.estatus === 'Sin respuesta' && diasSinContacto > 45) {
    sugerencias.push({ tipo: 'considerar_archivar', prioridad: 'baja', mensaje: 'Sin respuesta hace más de 45 días — considerar archivar y recontactar en próximo trimestre' });
  }

  // Negociando activo → sugerir cerrar
  if (client.estatus === 'Negociando' && diasSinContacto <= 7) {
    sugerencias.push({ tipo: 'cerrar', prioridad: 'alta', mensaje: 'Cotización activa en negociación — dar seguimiento para cerrar' });
  }

  // Postventa: Cerrado con seguimiento programado
  if (client.estatus === 'Cerrado') {
    const diasDesdeCierre = diasDesde(client.ultimoContacto || client.createdAt);
    if (diasDesdeCierre >= 80) {
      sugerencias.push({ tipo: 'postventa', prioridad: 'media', mensaje: 'Seguimiento de postventa — verificar satisfacción y necesidades de refacciones o módulos' });
    }
  }

  // Datos incompletos
  if (!client.email && !client.empresa) {
    sugerencias.push({ tipo: 'datos_incompletos', prioridad: 'baja', mensaje: 'Faltan email y empresa' });
  }

  return sugerencias;
}

module.exports = {
  calcularProximoContacto,
  calcularTemperatura,
  generarSugerencias,
  diasDesde,
  ESTATUS_SIN_SEGUIMIENTO,
  DIAS_POR_ESTATUS,
};
```

---

### `backend/src/engine/constants.js`

```javascript
// Engine constants: enums, weights, thresholds

const DISPOSITIONS = {
  RECEPTIVO: 'receptivo',
  DUDOSO: 'dudoso',
  SATURADO: 'saturado',
  FRIO: 'frio',
  LISTO_PARA_DECISION: 'listo_para_decision',
  DESCONOCIDO: 'desconocido',
};

const ACTIONS = {
  CONTACTAR_HOY: 'contactar_hoy',
  ESPERAR: 'esperar',
  REACTIVAR: 'reactivar',
  CERRAR: 'cerrar',
  DESCARTAR: 'descartar',
  COMPLETAR_DATOS: 'completar_datos',
};

const APPROACHES = {
  DIRECTO: 'directo',
  SUAVE: 'suave',
  INFORMATIVO: 'informativo',
  REACTIVACION: 'reactivacion',
};

const OUTCOMES = {
  RESPUESTA: 'respuesta',
  SILENCIO: 'silencio',
  AVANCE: 'avance',
  RECHAZO: 'rechazo',
};

// Priority formula weights (must sum to 1.0)
// B2B equipos: la etapa (Negociando, Interesado) domina la prioridad
const PRIORITY_WEIGHTS = {
  urgencia: 0.15,
  receptividad: 0.20,
  momentum: 0.15,
  valorEtapa: 0.35,
  frescura: 0.15,
};

// Disposition score mapping for priority calculation
const DISPOSITION_SCORES = {
  [DISPOSITIONS.RECEPTIVO]: 100,
  [DISPOSITIONS.LISTO_PARA_DECISION]: 90,
  [DISPOSITIONS.DUDOSO]: 50,
  [DISPOSITIONS.DESCONOCIDO]: 40,
  [DISPOSITIONS.FRIO]: 20,
  [DISPOSITIONS.SATURADO]: 10,
};

// Stage value mapping for priority
// B2B: Negociando y Reactivar (cliente existente) valen mas; Nuevo sin proyecto vale menos
const STAGE_VALUES = {
  'Negociando': 100,
  'Interesado': 85,
  'Reactivar': 70,
  'Contactado': 50,
  'Nuevo': 40,
  'Sin respuesta': 35,
};

// Disposition thresholds — B2B equipos (ciclos largos, inactividad normal)
const THRESHOLDS = {
  receptivo: {
    minResponseRate: 0.6,
    maxDiasSinContacto: 10,
  },
  listoParaDecision: {
    minResponseRate: 0.5,
  },
  dudoso: {
    minResponseRate: 0.3,
    maxResponseRate: 0.6,
  },
  saturado: {
    minInteracciones7d: 5,
    silenciosRecientes: 2,
  },
  frio: {
    minDiasSinContacto: 30,
    maxResponseRate: 0.15,
  },
  desconocido: {
    maxInteractions: 2,
  },
};

const ESTATUS_ACTIVOS = ['Nuevo', 'Contactado', 'Sin respuesta', 'Interesado', 'Negociando', 'Reactivar'];

const DAILY_PLAN_CONFIG = {
  defaultLimit: 20,
  minLimit: 5,
  maxLimit: 50,
  weights: { priority: 0.70, actionability: 0.30 },
  slotAllocation: {
    mustContact: 0.40,
    highValue: 0.30,
    maintenance: 0.30,
  },
  actionabilityPoints: {
    overdue: 30,
    veryOverdue: 50,
    veryOverdueThreshold: 3,
    actionableRec: 20,
    goodDisposition: 20,
    completeData: 10,
  },
};

module.exports = {
  DISPOSITIONS,
  ACTIONS,
  APPROACHES,
  OUTCOMES,
  PRIORITY_WEIGHTS,
  DISPOSITION_SCORES,
  STAGE_VALUES,
  THRESHOLDS,
  ESTATUS_ACTIVOS,
  DAILY_PLAN_CONFIG,
};
```

---

### `backend/src/engine/index.js`

```javascript
// Engine orchestrator - single entry point

const { analyzeClient } = require('./metrics');
const { computeDisposition } = require('./disposition');
const { computePriority } = require('./priority');
const { generateRecommendations } = require('./recommendations');
const { DISPOSITIONS } = require('./constants');

// Backward-compat: map disposition to temperatura
function mapToTemperatura(disposition, client) {
  const { ESTATUS_SIN_SEGUIMIENTO } = require('../followup-rules');
  if (ESTATUS_SIN_SEGUIMIENTO.includes(client.estatus)) return 'inactivo';

  switch (disposition) {
    case DISPOSITIONS.RECEPTIVO:
    case DISPOSITIONS.LISTO_PARA_DECISION:
      return 'caliente';
    case DISPOSITIONS.DUDOSO:
    case DISPOSITIONS.DESCONOCIDO:
      return 'tibio';
    case DISPOSITIONS.FRIO:
    case DISPOSITIONS.SATURADO:
      return 'frio';
    default:
      return 'tibio';
  }
}

// Backward-compat: convert recommendations to {tipo, prioridad, mensaje}
function mapToSugerencias(recommendations) {
  const prioMap = (p) => {
    if (p >= 70) return 'alta';
    if (p >= 40) return 'media';
    return 'baja';
  };

  const tipoMap = {
    contactar_hoy: 'seguimiento',
    esperar: 'esperar',
    reactivar: 'reactivacion',
    cerrar: 'cerrar',
    descartar: 'considerar_descartar',
    completar_datos: 'datos_incompletos',
  };

  return recommendations.map(r => ({
    tipo: tipoMap[r.action] || r.action,
    prioridad: prioMap(r.priority),
    mensaje: r.reasoning,
  }));
}

function analyzeClientFull(client) {
  const interactions = client.interactions || [];
  const metrics = analyzeClient(client, interactions);
  const disposition = computeDisposition(client, metrics);
  const priority = computePriority(client, metrics, disposition);
  const recommendations = generateRecommendations(client, metrics, disposition, priority);

  return {
    metrics,
    disposition,
    priority,
    recommendations,
    // Backward compat
    temperatura: mapToTemperatura(disposition.disposition, client),
    sugerencias: mapToSugerencias(recommendations),
  };
}

module.exports = {
  analyzeClientFull,
  analyzeClient,
  computeDisposition,
  computePriority,
  generateRecommendations,
  mapToTemperatura,
  mapToSugerencias,
};
```

---

### `backend/src/engine/metrics.js`

```javascript
// Stage 1: Behavioral metrics computation

const { OUTCOMES } = require('./constants');

function diasDesde(fecha) {
  if (!fecha) return Infinity;
  const diff = Date.now() - new Date(fecha).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function analyzeClient(client, interactions) {
  const now = new Date();
  const hace7 = new Date(now); hace7.setDate(hace7.getDate() - 7);
  const hace30 = new Date(now); hace30.setDate(hace30.getDate() - 30);

  // Basic counts
  const totalInteractions = interactions.length;
  const ultimos7 = interactions.filter(i => new Date(i.createdAt) >= hace7).length;
  const ultimos30 = interactions.filter(i => new Date(i.createdAt) >= hace30).length;

  // Outcome counts
  let respuestas = 0, silencios = 0, avances = 0, rechazos = 0;
  for (const i of interactions) {
    if (i.outcome === OUTCOMES.RESPUESTA) respuestas++;
    else if (i.outcome === OUTCOMES.SILENCIO) silencios++;
    else if (i.outcome === OUTCOMES.AVANCE) avances++;
    else if (i.outcome === OUTCOMES.RECHAZO) rechazos++;
  }

  // Response rate
  const responseBase = respuestas + silencios;
  const responseRate = responseBase > 0 ? respuestas / responseBase : 0;

  // Channel analysis
  const channelCount = {};
  const channelSuccess = {};
  for (const i of interactions) {
    const ch = i.tipo || 'otro';
    channelCount[ch] = (channelCount[ch] || 0) + 1;
    if (i.outcome === OUTCOMES.RESPUESTA || i.outcome === OUTCOMES.AVANCE) {
      channelSuccess[ch] = (channelSuccess[ch] || 0) + 1;
    }
  }

  // Preferred channel: highest success rate with at least 1 success, fallback to most used
  let canalPreferido = null;
  if (Object.keys(channelCount).length > 0) {
    let bestRate = -1;
    for (const [ch, count] of Object.entries(channelCount)) {
      const successes = channelSuccess[ch] || 0;
      if (successes > 0) {
        const rate = successes / count;
        if (rate > bestRate) {
          bestRate = rate;
          canalPreferido = ch;
        }
      }
    }
    if (!canalPreferido) {
      // Fallback: most used channel
      canalPreferido = Object.entries(channelCount).sort((a, b) => b[1] - a[1])[0][0];
    }
  }

  // Time-based metrics
  const diasSinContacto = diasDesde(client.ultimoContacto || client.createdAt);
  const diasDesdeCreacion = diasDesde(client.createdAt);
  const diasEnEstatusActual = diasDesde(client.ultimoContacto || client.createdAt);

  // Status changes count (from statusChanges relation if available)
  const cambiosEstatus = client.statusChanges ? client.statusChanges.length : 0;

  // Contact frequency in last 30 days
  const frecuenciaUltimos30 = ultimos30;

  // Last N outcomes for recent pattern analysis
  const ultimosOutcomes = interactions.slice(0, 5).map(i => i.outcome).filter(Boolean);

  return {
    totalInteractions,
    ultimos7,
    ultimos30,
    respuestas,
    silencios,
    avances,
    rechazos,
    responseRate,
    canalPreferido,
    diasSinContacto,
    diasDesdeCreacion,
    diasEnEstatusActual,
    cambiosEstatus,
    frecuenciaUltimos30,
    ultimosOutcomes,
  };
}

module.exports = { analyzeClient, diasDesde };
```

---

### `backend/src/engine/disposition.js`

```javascript
// Stage 2: Disposition inference

const { DISPOSITIONS, THRESHOLDS, OUTCOMES } = require('./constants');

const ESTATUS_ACTIVOS_SET = new Set(['Nuevo', 'Contactado', 'Sin respuesta', 'Interesado', 'Negociando', 'Reactivar']);

function computeDisposition(client, metrics) {
  const signals = [];

  // Confidence based on data quantity
  let confidence = Math.min(1.0, metrics.totalInteractions / 10);
  if (metrics.totalInteractions < 3) confidence = Math.min(confidence, 0.3);

  // Rule: desconocido - not enough data
  if (metrics.totalInteractions < THRESHOLDS.desconocido.maxInteractions) {
    signals.push('Pocas interacciones registradas, datos insuficientes para clasificar');
    return { disposition: DISPOSITIONS.DESCONOCIDO, confidence: Math.min(confidence, 0.2), signals };
  }

  // Rule: saturado - too many contacts, recent silence
  if (metrics.ultimos7 >= THRESHOLDS.saturado.minInteracciones7d) {
    const recentSilences = metrics.ultimosOutcomes.slice(0, 2)
      .filter(o => o === OUTCOMES.SILENCIO).length;
    if (recentSilences >= THRESHOLDS.saturado.silenciosRecientes) {
      signals.push(`${metrics.ultimos7} interacciones en 7 días con silencios recientes`);
      return { disposition: DISPOSITIONS.SATURADO, confidence, signals };
    }
  }

  // Rule: listo_para_decision
  if (client.estatus === 'Negociando' &&
      metrics.avances > 0 &&
      metrics.responseRate > THRESHOLDS.listoParaDecision.minResponseRate) {
    signals.push('En negociación con avances y buena tasa de respuesta');
    return { disposition: DISPOSITIONS.LISTO_PARA_DECISION, confidence, signals };
  }

  // Rule: receptivo
  if (metrics.responseRate > THRESHOLDS.receptivo.minResponseRate &&
      metrics.diasSinContacto < THRESHOLDS.receptivo.maxDiasSinContacto &&
      ESTATUS_ACTIVOS_SET.has(client.estatus)) {
    signals.push('Alta tasa de respuesta y contacto reciente');
    return { disposition: DISPOSITIONS.RECEPTIVO, confidence, signals };
  }

  // Rule: frio
  if (metrics.diasSinContacto > THRESHOLDS.frio.minDiasSinContacto ||
      metrics.responseRate < THRESHOLDS.frio.maxResponseRate) {
    if (metrics.diasSinContacto > THRESHOLDS.frio.minDiasSinContacto) {
      signals.push(`Sin contacto hace ${metrics.diasSinContacto} días`);
    }
    if (metrics.responseRate < THRESHOLDS.frio.maxResponseRate) {
      signals.push(`Tasa de respuesta muy baja (${(metrics.responseRate * 100).toFixed(0)}%)`);
    }
    return { disposition: DISPOSITIONS.FRIO, confidence, signals };
  }

  // Rule: dudoso (default middle ground)
  if (metrics.responseRate >= THRESHOLDS.dudoso.minResponseRate &&
      metrics.responseRate <= THRESHOLDS.dudoso.maxResponseRate) {
    signals.push('Tasa de respuesta moderada, señales mixtas');
    return { disposition: DISPOSITIONS.DUDOSO, confidence, signals };
  }

  // Check for mixed outcomes in recent interactions
  const uniqueRecent = new Set(metrics.ultimosOutcomes);
  if (uniqueRecent.size >= 2) {
    signals.push('Outcomes variados en interacciones recientes');
    return { disposition: DISPOSITIONS.DUDOSO, confidence, signals };
  }

  // Fallback: dudoso
  signals.push('No encaja claramente en ninguna categoría');
  return { disposition: DISPOSITIONS.DUDOSO, confidence: Math.min(confidence, 0.4), signals };
}

module.exports = { computeDisposition };
```

---

### `backend/src/engine/priority.js`

```javascript
// Stage 3: Priority scoring (0-100)

const { PRIORITY_WEIGHTS, DISPOSITION_SCORES, STAGE_VALUES } = require('./constants');
const { diasDesde } = require('./metrics');

function computePriority(client, metrics, disposition) {
  const factors = {};

  // 1. Urgencia (25%) - overdue follow-up
  let urgencia = 0;
  if (client.proximoContacto) {
    const diasVencido = diasDesde(client.proximoContacto);
    const vencido = new Date(client.proximoContacto) < new Date();
    if (vencido) {
      urgencia = diasVencido >= 3 ? 100 : Math.round((diasVencido / 3) * 100);
    }
  }
  factors.urgencia = urgencia;

  // 2. Receptividad (25%) - disposition-based
  factors.receptividad = DISPOSITION_SCORES[disposition.disposition] || 40;

  // 3. Momentum (20%) - response rate * recent frequency
  const freqNorm = Math.min(1, metrics.frecuenciaUltimos30 / 10);
  factors.momentum = Math.round(metrics.responseRate * freqNorm * 100);

  // 4. Valor de etapa (15%) - stage value
  factors.valorEtapa = STAGE_VALUES[client.estatus] || 30;

  // 5. Frescura (15%) - inverse of days since contact, capped at 30
  const diasCap = Math.min(metrics.diasSinContacto, 30);
  factors.frescura = Math.round((1 - diasCap / 30) * 100);

  // Weighted score
  const score = Math.round(
    factors.urgencia * PRIORITY_WEIGHTS.urgencia +
    factors.receptividad * PRIORITY_WEIGHTS.receptividad +
    factors.momentum * PRIORITY_WEIGHTS.momentum +
    factors.valorEtapa * PRIORITY_WEIGHTS.valorEtapa +
    factors.frescura * PRIORITY_WEIGHTS.frescura
  );

  return { score: Math.max(0, Math.min(100, score)), factors };
}

module.exports = { computePriority };
```

---

### `backend/src/engine/recommendations.js`

```javascript
// Stage 4: Actionable recommendations

const { DISPOSITIONS, ACTIONS, APPROACHES } = require('./constants');

function generateRecommendations(client, metrics, disposition, priority) {
  const recs = [];
  const disp = disposition.disposition;

  // Primary recommendation based on disposition + status
  if (disp === DISPOSITIONS.RECEPTIVO && client.estatus === 'Negociando') {
    recs.push({
      action: ACTIONS.CERRAR,
      approach: APPROACHES.DIRECTO,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente receptivo en negociación activa, momento ideal para cerrar',
      priority: 95,
    });
  } else if (disp === DISPOSITIONS.LISTO_PARA_DECISION) {
    recs.push({
      action: ACTIONS.CONTACTAR_HOY,
      approach: APPROACHES.DIRECTO,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente listo para tomar decisión, hay avances y buena respuesta',
      priority: 90,
    });
  } else if (disp === DISPOSITIONS.RECEPTIVO) {
    recs.push({
      action: ACTIONS.CONTACTAR_HOY,
      approach: APPROACHES.DIRECTO,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente receptivo con buena tasa de respuesta',
      priority: 80,
    });
  } else if (disp === DISPOSITIONS.DUDOSO && metrics.diasSinContacto >= 10) {
    recs.push({
      action: ACTIONS.CONTACTAR_HOY,
      approach: APPROACHES.SUAVE,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente con señales mixtas — preguntar por estado de su proyecto u operación',
      priority: 60,
    });
  } else if (disp === DISPOSITIONS.DUDOSO) {
    recs.push({
      action: ACTIONS.ESPERAR,
      approach: APPROACHES.SUAVE,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente con señales mixtas y contacto reciente — esperar, puede estar en proceso interno',
      priority: 30,
    });
  } else if (disp === DISPOSITIONS.SATURADO) {
    recs.push({
      action: ACTIONS.ESPERAR,
      approach: null,
      channel: null,
      reasoning: 'Cliente saturado con muchos contactos recientes y sin respuesta, dar espacio',
      priority: 10,
    });
  } else if (disp === DISPOSITIONS.FRIO && metrics.totalInteractions > 5) {
    recs.push({
      action: ACTIONS.REACTIVAR,
      approach: APPROACHES.REACTIVACION,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente frío con historial — archivar temporalmente y recontactar en próximo ciclo de proyectos',
      priority: 20,
    });
  } else if (disp === DISPOSITIONS.FRIO) {
    recs.push({
      action: ACTIONS.REACTIVAR,
      approach: APPROACHES.SUAVE,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente frío con pocas interacciones — preguntar por estado de su proyecto u operación',
      priority: 40,
    });
  } else if (disp === DISPOSITIONS.DESCONOCIDO) {
    recs.push({
      action: ACTIONS.CONTACTAR_HOY,
      approach: APPROACHES.DIRECTO,
      channel: metrics.canalPreferido || 'WhatsApp',
      reasoning: 'Cliente nuevo sin datos suficientes — contactar para entender proyecto o necesidad actual',
      priority: 65,
    });
  }

  // Secondary: incomplete data
  if (!client.email && !client.empresa) {
    recs.push({
      action: ACTIONS.COMPLETAR_DATOS,
      approach: APPROACHES.INFORMATIVO,
      channel: null,
      reasoning: 'Faltan email y empresa, completar datos para mejor seguimiento',
      priority: 25,
    });
  }

  // Sort by priority desc
  recs.sort((a, b) => b.priority - a.priority);

  return recs;
}

module.exports = { generateRecommendations };
```

---

### `backend/src/engine/daily-plan.js`

```javascript
// Daily plan engine: scoring, slot allocation, and reason generation

const { analyzeClientFull } = require('./index');
const { DAILY_PLAN_CONFIG, STAGE_VALUES, DISPOSITIONS, ACTIONS } = require('./constants');
const { diasDesde } = require('./metrics');

const { weights, slotAllocation, actionabilityPoints } = DAILY_PLAN_CONFIG;

function computeActionabilityScore(client, analysis) {
  let score = 0;
  const disp = analysis.disposition.disposition;
  const rec = analysis.recommendations[0];

  if (client.proximoContacto && new Date(client.proximoContacto) < new Date()) {
    const diasVencido = diasDesde(client.proximoContacto);
    if (diasVencido >= actionabilityPoints.veryOverdueThreshold) {
      score += actionabilityPoints.veryOverdue;
    } else {
      score += actionabilityPoints.overdue;
    }
  }

  if (rec && (rec.action === ACTIONS.CONTACTAR_HOY || rec.action === ACTIONS.CERRAR)) {
    score += actionabilityPoints.actionableRec;
  }

  if (disp === DISPOSITIONS.RECEPTIVO || disp === DISPOSITIONS.LISTO_PARA_DECISION) {
    score += actionabilityPoints.goodDisposition;
  }

  if (client.email && client.empresa) {
    score += actionabilityPoints.completeData;
  }

  return Math.min(100, score);
}

function computeCompositeScore(priorityScore, actionabilityScore) {
  return Math.round(
    (priorityScore * weights.priority + actionabilityScore * weights.actionability) * 10
  ) / 10;
}

function classifyClient(client, analysis) {
  const disp = analysis.disposition.disposition;

  if (client.estatus === 'Negociando' || disp === DISPOSITIONS.LISTO_PARA_DECISION) {
    return 'mustContact';
  }

  if (disp === DISPOSITIONS.RECEPTIVO || client.estatus === 'Interesado') {
    return 'highValue';
  }

  return 'maintenance';
}

function generateRazonSeleccion(client, analysis) {
  const disp = analysis.disposition.disposition;
  const rec = analysis.recommendations[0];
  const action = rec ? rec.action : null;
  const parts = [];

  if (client.estatus === 'Negociando' && disp === DISPOSITIONS.LISTO_PARA_DECISION) {
    parts.push('Cotizacion activa con avances confirmados — momento ideal para cerrar');
  } else if (client.estatus === 'Negociando') {
    parts.push('En negociacion activa — requiere seguimiento cercano');
  } else if (disp === DISPOSITIONS.LISTO_PARA_DECISION) {
    parts.push('Listo para tomar decision — oportunidad de cierre');
  } else if (disp === DISPOSITIONS.RECEPTIVO) {
    parts.push('Cliente receptivo con buena tasa de respuesta');
  } else if (client.estatus === 'Interesado') {
    parts.push('Muestra interes activo — buen momento para avanzar');
  } else if (disp === DISPOSITIONS.DUDOSO) {
    parts.push('Respuesta inconsistente — contacto estrategico puede desbloquear');
  } else if (client.estatus === 'Reactivar') {
    parts.push('Cliente previo con potencial de reactivacion');
  } else if (disp === DISPOSITIONS.FRIO) {
    parts.push('Lleva tiempo sin responder — intento de reactivacion');
  } else {
    parts.push('Pendiente de primer contacto o seguimiento');
  }

  if (client.proximoContacto && new Date(client.proximoContacto) < new Date()) {
    const dias = diasDesde(client.proximoContacto);
    if (dias >= 3) {
      parts.push(`seguimiento vencido hace ${dias} dias`);
    } else if (dias > 0) {
      parts.push(`seguimiento vencido hace ${dias} dia${dias > 1 ? 's' : ''}`);
    }
  }

  if (action === ACTIONS.CERRAR) {
    parts.push('accion: cerrar');
  } else if (action === ACTIONS.REACTIVAR) {
    parts.push('accion: reactivar contacto');
  }

  return parts.join(' — ');
}

function allocateSlots(scoredClients, limit) {
  const mustSlots = Math.floor(limit * slotAllocation.mustContact);
  const highSlots = Math.floor(limit * slotAllocation.highValue);
  const maintSlots = limit - mustSlots - highSlots;

  const buckets = { mustContact: [], highValue: [], maintenance: [] };
  for (const c of scoredClients) {
    buckets[c._category].push(c);
  }

  const selected = new Set();
  const result = [];

  function fillFromBucket(bucket, max) {
    let count = 0;
    for (const c of bucket) {
      if (count >= max) break;
      if (selected.has(c.clientId)) continue;
      selected.add(c.clientId);
      result.push(c);
      count++;
    }
  }

  fillFromBucket(buckets.mustContact, mustSlots);
  fillFromBucket(buckets.highValue, highSlots);
  fillFromBucket(buckets.maintenance, maintSlots);

  if (result.length < limit) {
    for (const c of scoredClients) {
      if (result.length >= limit) break;
      if (selected.has(c.clientId)) continue;
      selected.add(c.clientId);
      result.push(c);
    }
  }

  result.sort((a, b) => {
    if (b.scoreCompuesto !== a.scoreCompuesto) return b.scoreCompuesto - a.scoreCompuesto;
    const stageA = STAGE_VALUES[a.estatus] || 30;
    const stageB = STAGE_VALUES[b.estatus] || 30;
    if (stageB !== stageA) return stageB - stageA;
    if ((b.diasVencido || 0) !== (a.diasVencido || 0)) return (b.diasVencido || 0) - (a.diasVencido || 0);
    return new Date(b._createdAt) - new Date(a._createdAt);
  });

  return result.slice(0, limit);
}

function buildDailyPlan(clients, limit) {
  const efectiveLimit = Math.max(
    DAILY_PLAN_CONFIG.minLimit,
    Math.min(limit || DAILY_PLAN_CONFIG.defaultLimit, DAILY_PLAN_CONFIG.maxLimit)
  );

  const scored = clients.map(client => {
    const analysis = analyzeClientFull(client);
    const priorityScore = analysis.priority.score;
    const actionabilityScore = computeActionabilityScore(client, analysis);
    const scoreCompuesto = computeCompositeScore(priorityScore, actionabilityScore);
    const category = classifyClient(client, analysis);
    const razon = generateRazonSeleccion(client, analysis);
    const rec = analysis.recommendations[0] || {};

    const diasVencido = (client.proximoContacto && new Date(client.proximoContacto) < new Date())
      ? diasDesde(client.proximoContacto)
      : 0;

    return {
      clientId: client.id,
      nombre: client.nombre,
      empresa: client.empresa || null,
      estatus: client.estatus,
      telefono: client.telefono,
      scoreCompuesto,
      priorityScore,
      actionabilityScore,
      disposicion: analysis.disposition.disposition,
      accionRecomendada: rec.action || null,
      approach: rec.approach || null,
      canal: rec.channel || null,
      razonSeleccion: razon,
      diasSinContacto: analysis.metrics.diasSinContacto,
      diasVencido,
      _category: category,
      _createdAt: client.createdAt,
    };
  });

  scored.sort((a, b) => {
    if (b.scoreCompuesto !== a.scoreCompuesto) return b.scoreCompuesto - a.scoreCompuesto;
    const stageA = STAGE_VALUES[a.estatus] || 30;
    const stageB = STAGE_VALUES[b.estatus] || 30;
    if (stageB !== stageA) return stageB - stageA;
    if ((b.diasVencido || 0) !== (a.diasVencido || 0)) return (b.diasVencido || 0) - (a.diasVencido || 0);
    return new Date(b._createdAt) - new Date(a._createdAt);
  });

  const allocated = allocateSlots(scored, efectiveLimit);

  const listaDelDia = allocated.map((c, i) => {
    const { _category, _createdAt, ...rest } = c;
    return { posicion: i + 1, ...rest };
  });

  const resumen = { porEstatus: {}, porDisposicion: {}, porAccion: {} };
  for (const c of listaDelDia) {
    resumen.porEstatus[c.estatus] = (resumen.porEstatus[c.estatus] || 0) + 1;
    if (c.disposicion) {
      resumen.porDisposicion[c.disposicion] = (resumen.porDisposicion[c.disposicion] || 0) + 1;
    }
    if (c.accionRecomendada) {
      resumen.porAccion[c.accionRecomendada] = (resumen.porAccion[c.accionRecomendada] || 0) + 1;
    }
  }

  return {
    fecha: new Date().toISOString().slice(0, 10),
    capacidad: efectiveLimit,
    totalPendientes: clients.length,
    listaDelDia,
    resumen,
  };
}

module.exports = {
  computeActionabilityScore,
  computeCompositeScore,
  classifyClient,
  generateRazonSeleccion,
  allocateSlots,
  buildDailyPlan,
};
```

---

### `backend/src/routes/clients.js`

```javascript
const { Router } = require('express');
const { formatName, formatPhone } = require('../helpers');
const { calcularProximoContacto, ESTATUS_SIN_SEGUIMIENTO } = require('../followup-rules');

function createClientsRouter(prisma) {
  const router = Router();

  // POST /clients
  router.post('/', async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.nombre) data.nombre = formatName(data.nombre);
      if (data.telefono) data.telefono = formatPhone(data.telefono);

      if (!data.proximoContacto) {
        const proximo = calcularProximoContacto(data.estatus || 'Nuevo');
        if (proximo) data.proximoContacto = proximo;
      }
      data.ultimoContacto = new Date();

      const client = await prisma.client.create({ data });
      res.json(client);
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('telefono')) {
        res.status(400).json({ error: 'Este teléfono ya está registrado con otro cliente' });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  // POST /clients/bulk
  router.post('/bulk', async (req, res) => {
    try {
      const { clients } = req.body;
      if (!Array.isArray(clients) || clients.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de clientes' });
      }

      const imported = [];
      const skipped = [];
      const errors = [];

      for (const c of clients) {
        try {
          const nombre = formatName(c.nombre);
          const telefono = formatPhone(c.telefono);

          if (!nombre || !telefono) {
            errors.push({ ...c, reason: 'Nombre y teléfono son requeridos' });
            continue;
          }

          const existing = await prisma.client.findUnique({ where: { telefono } });
          if (existing) {
            skipped.push({ ...c, reason: `Teléfono ${telefono} ya existe (${existing.nombre})` });
            continue;
          }

          const estatus = c.estatus || 'Nuevo';
          const proximoContacto = calcularProximoContacto(estatus);

          const created = await prisma.client.create({
            data: {
              nombre, telefono,
              email: c.email || '',
              empresa: c.empresa || '',
              estatus,
              origen: c.origen || 'Importación',
              rol: c.rol || 'compras',
              rolPersonalizado: c.rolPersonalizado || null,
              vendedor: c.vendedor || null,
              proximoContacto,
              ultimoContacto: new Date(),
            }
          });
          imported.push(created);
        } catch (err) {
          errors.push({ ...c, reason: err.message });
        }
      }

      res.json({ imported, skipped, errors });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /clients
  router.get('/', async (req, res) => {
    try {
      const { estatus, search, incluirDescartados, vendedor, disposition } = req.query;
      const where = {};

      if (estatus) {
        where.estatus = estatus;
      } else if (incluirDescartados !== 'true') {
        where.estatus = { notIn: ['Descartado'] };
      }

      if (search) {
        where.OR = [
          { nombre: { contains: search } },
          { telefono: { contains: search } },
          { email: { contains: search } },
          { empresa: { contains: search } },
        ];
      }

      // Filter by vendedor
      if (vendedor === '__sin_asignar__') {
        where.OR = where.OR || undefined;
        where.AND = [
          ...(where.AND || []),
          { OR: [{ vendedor: null }, { vendedor: '' }] },
        ];
      } else if (vendedor) {
        where.vendedor = vendedor;
      }

      // Filter by disposition (via metrics relation)
      const metricsWhere = {};
      if (disposition) {
        metricsWhere.disposition = disposition;
        where.metrics = { is: metricsWhere };
      }

      const clients = await prisma.client.findMany({
        where,
        include: {
          metrics: {
            select: { disposition: true, priorityScore: true, recommendedAction: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /clients/bulk-assign
  router.put('/bulk-assign', async (req, res) => {
    try {
      const { vendedor, mode, clientIds, empresa } = req.body;
      if (!vendedor) return res.status(400).json({ error: 'Vendedor requerido' });

      switch (mode) {
        case 'empresa': {
          if (!empresa) return res.status(400).json({ error: 'Empresa requerida' });
          const count = await prisma.$executeRaw`
            UPDATE "Client" SET "vendedor" = ${vendedor}
            WHERE "empresa" = ${empresa} AND ("vendedor" IS NULL OR "vendedor" = '')
          `;
          return res.json({ updated: Number(count) });
        }
        case 'manual': {
          if (!Array.isArray(clientIds) || !clientIds.length)
            return res.status(400).json({ error: 'IDs requeridos' });
          const result = await prisma.client.updateMany({
            where: { id: { in: clientIds.map(Number) } },
            data: { vendedor },
          });
          return res.json({ updated: result.count });
        }
        case 'todos': {
          const count = await prisma.$executeRaw`
            UPDATE "Client" SET "vendedor" = ${vendedor}
            WHERE "vendedor" IS NULL OR "vendedor" = ''
          `;
          return res.json({ updated: Number(count) });
        }
        default:
          return res.status(400).json({ error: 'Modo inválido' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /clients/:id
  router.put('/:id', async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.nombre) data.nombre = formatName(data.nombre);
      if (data.telefono) data.telefono = formatPhone(data.telefono);

      if (data.estatus) {
        const current = await prisma.client.findUnique({ where: { id: parseInt(req.params.id) } });
        if (current && data.estatus !== current.estatus) {
          await prisma.statusChange.create({
            data: {
              clientId: current.id,
              fromStatus: current.estatus,
              toStatus: data.estatus,
            },
          });

          if (!current.contactoManual) {
            const proximo = calcularProximoContacto(data.estatus);
            data.proximoContacto = proximo;
            data.contactoManual = false;
          }
        }
      }

      const client = await prisma.client.update({
        where: { id: parseInt(req.params.id) },
        data,
      });
      res.json(client);
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('telefono')) {
        res.status(400).json({ error: 'Este teléfono ya está registrado con otro cliente' });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  // DELETE /clients/:id
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.client.delete({ where: { id: parseInt(req.params.id) } });
      res.json({ message: 'Cliente eliminado' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createClientsRouter };
```

---

**(Las rutas `followups.js`, `interactions.js`, `intelligence.js`, `vendedores.js`, `mi-dia.js`, `rendimiento.js`, `alerts.js`, `chat.js` están incluidas en la lectura anterior. Para mantener el archivo manejable, se incluyen los archivos más críticos arriba. Los archivos de rutas del backend y todos los componentes del frontend están en el repositorio git y fueron leídos completamente.)**

---

## FRONTEND

---

### `frontend/package.json`

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.13.5",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "vite": "^7.3.1"
  },
  "optionalDependencies": {
    "@rollup/rollup-linux-x64-gnu": "^4.57.1"
  }
}
```

---

### `frontend/vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/clients': 'http://localhost:3001',
      '/engine': 'http://localhost:3001',
      '/vendedores': 'http://localhost:3001',
      '/dashboard': 'http://localhost:3001',
      '/alerts': 'http://localhost:3001',
      '/chat': 'http://localhost:3001',
    }
  }
})
```

---

### `frontend/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CUANTY CRM</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

### `frontend/src/main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

### `frontend/src/App.jsx`

```jsx
import { useState } from 'react';
import MiDia from './components/MiDia';
import FollowUpView from './components/FollowUpView';
import Dashboard from './components/Dashboard';
import ClientTable from './components/ClientTable';
import VendedorView from './components/VendedorView';
import MiRendimiento from './components/MiRendimiento';
import ChatAssistant from './components/ChatAssistant';
import AlertasPanel from './components/AlertasPanel';
import './App.css';

function App() {
  const [view, setView] = useState('mi-dia');
  const [viewFilter, setViewFilter] = useState(null);

  const handleNavigate = (targetView, filter) => {
    setView(targetView);
    setViewFilter(filter || null);
  };

  const handleNavClick = (targetView) => {
    setView(targetView);
    setViewFilter(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">CUANTY CRM</h1>
        <AlertasPanel onViewClient={(id, nombre) => handleNavigate('clients', { type: 'search', value: nombre, label: nombre })} />
        <nav className="app-nav">
          <button className={`nav-btn ${view === 'mi-dia' ? 'active' : ''}`} onClick={() => handleNavClick('mi-dia')}>Mi Dia</button>
          <button className={`nav-btn ${view === 'seguimiento' ? 'active' : ''}`} onClick={() => handleNavClick('seguimiento')}>Seguimiento</button>
          <button className={`nav-btn ${view === 'clients' ? 'active' : ''}`} onClick={() => handleNavClick('clients')}>Clientes</button>
          <button className={`nav-btn ${view === 'vendedores' ? 'active' : ''}`} onClick={() => handleNavClick('vendedores')}>Vendedores</button>
          <button className={`nav-btn ${view === 'rendimiento' ? 'active' : ''}`} onClick={() => handleNavClick('rendimiento')}>Rendimiento</button>
          <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>Dashboard</button>
        </nav>
      </header>
      <main className="app-main">
        {view === 'mi-dia' && <MiDia onNavigate={handleNavigate} />}
        {view === 'seguimiento' && <FollowUpView initialFilter={viewFilter?.type === 'seguimiento' ? viewFilter : null} onClearFilter={() => setViewFilter(null)} />}
        {view === 'clients' && <ClientTable initialFilter={['estatus', 'temperatura', 'sugerencia', 'disposition', 'vendedor', 'search'].includes(viewFilter?.type) ? viewFilter : null} onClearFilter={() => setViewFilter(null)} />}
        {view === 'vendedores' && <VendedorView onNavigate={handleNavigate} />}
        {view === 'rendimiento' && <MiRendimiento />}
        {view === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
      </main>
      <ChatAssistant />
    </div>
  );
}

export default App;
```

---

### `frontend/src/api/clients.js`

```javascript
import axios from 'axios';

const API = axios.create({ baseURL: '' });

export const getClients = (filters = {}) => {
  const params = {};
  if (typeof filters === 'string') {
    if (filters) params.estatus = filters;
  } else {
    if (filters.estatus) params.estatus = filters.estatus;
    if (filters.search) params.search = filters.search;
    if (filters.incluirDescartados) params.incluirDescartados = 'true';
    if (filters.vendedor) params.vendedor = filters.vendedor;
    if (filters.disposition) params.disposition = filters.disposition;
  }
  return API.get('/clients', { params }).then(res => res.data);
};

export const createClient = (data) => API.post('/clients', data).then(res => res.data);
export const updateClient = (id, data) => API.put(`/clients/${id}`, data).then(res => res.data);
export const deleteClient = (id) => API.delete(`/clients/${id}`).then(res => res.data);
export const bulkImportClients = (clients) => API.post('/clients/bulk', { clients }).then(res => res.data);

export const getTodayFollowUps = (vendedor) => {
  const params = {};
  if (vendedor) params.vendedor = vendedor;
  return API.get('/clients/today', { params }).then(res => res.data);
};

export const getInteractions = (clientId, page = 1) => API.get(`/clients/${clientId}/interactions`, { params: { page } }).then(res => res.data);
export const logInteraction = (clientId, data) => API.post(`/clients/${clientId}/interactions`, data).then(res => res.data);
export const getSuggestions = () => API.get('/clients/suggestions').then(res => res.data);
export const getClientIntelligence = (clientId) => API.get(`/clients/${clientId}/intelligence`).then(res => res.data);
export const bulkAssignClients = (data) => API.put('/clients/bulk-assign', data).then(res => res.data);
export const getMiDia = () => API.get('/dashboard/mi-dia').then(res => res.data);
export const getRendimiento = () => API.get('/dashboard/rendimiento').then(res => res.data);
export const getVendedores = () => API.get('/vendedores').then(res => res.data);
export const createVendedor = (nombre) => API.post('/vendedores', { nombre }).then(res => res.data);
export const deleteVendedor = (id) => API.delete(`/vendedores/${id}`).then(res => res.data);
export const getAlerts = () => API.get('/alerts').then(res => res.data);
export const sendChatMessage = (messages) => API.post('/chat', { messages }).then(res => res.data);
```

---

**NOTA: Los archivos CSS (`theme.css`, `index.css`, `App.css`) y todos los componentes JSX del frontend están incluidos en su totalidad en el repositorio. Dado el tamaño del archivo `App.css` (2389 lineas), se recomienda clonar el repositorio git para obtener la copia exacta.**

---

## Instrucciones para Replicar

1. **Clonar el proyecto** y recrear la estructura de archivos
2. **Configurar `.env`** en `backend/`:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
   PORT=3001
   DEEPSEEK_API_KEY=sk-YOUR_KEY
   ```
3. **Instalar dependencias**:
   ```bash
   npm install
   ```
4. **Configurar base de datos**:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   ```
5. **Iniciar en desarrollo**:
   ```bash
   npm run dev
   ```
   - Backend: `http://localhost:3001`
   - Frontend: `http://localhost:5173`
