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
