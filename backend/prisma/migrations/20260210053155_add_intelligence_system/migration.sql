-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN "outcome" TEXT;

-- CreateTable
CREATE TABLE "ClientMetrics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "interaccionesUltimos7" INTEGER NOT NULL DEFAULT 0,
    "interaccionesUltimos30" INTEGER NOT NULL DEFAULT 0,
    "respuestas" INTEGER NOT NULL DEFAULT 0,
    "silencios" INTEGER NOT NULL DEFAULT 0,
    "avances" INTEGER NOT NULL DEFAULT 0,
    "rechazos" INTEGER NOT NULL DEFAULT 0,
    "responseRate" REAL NOT NULL DEFAULT 0,
    "avgResponseTimeDays" REAL,
    "canalPreferido" TEXT,
    "diasEnEstatusActual" INTEGER NOT NULL DEFAULT 0,
    "cambiosEstatus" INTEGER NOT NULL DEFAULT 0,
    "priorityScore" INTEGER NOT NULL DEFAULT 50,
    "engagementScore" INTEGER NOT NULL DEFAULT 50,
    "disposition" TEXT NOT NULL DEFAULT 'desconocido',
    "dispositionConfidence" REAL NOT NULL DEFAULT 0,
    "recommendedAction" TEXT,
    "recommendedApproach" TEXT,
    "recommendedChannel" TEXT,
    "recommendedReasoning" TEXT,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientMetrics_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatusChange" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusChange_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecommendationLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "recommendedApproach" TEXT,
    "priorityScore" INTEGER NOT NULL,
    "disposition" TEXT NOT NULL,
    "wasActedUpon" BOOLEAN,
    "interactionId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "RecommendationLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientMetrics_clientId_key" ON "ClientMetrics"("clientId");
