-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "empresa" TEXT,
    "estatus" TEXT NOT NULL DEFAULT 'Nuevo',
    "origen" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'compras',
    "rolPersonalizado" TEXT,
    "notas" TEXT,
    "proximoContacto" DATETIME,
    "ultimoContacto" DATETIME,
    "contactoManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Client" ("contactoManual", "createdAt", "email", "empresa", "estatus", "id", "nombre", "notas", "origen", "proximoContacto", "telefono", "ultimoContacto") SELECT "contactoManual", "createdAt", "email", "empresa", "estatus", "id", "nombre", "notas", "origen", "proximoContacto", "telefono", "ultimoContacto" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_telefono_key" ON "Client"("telefono");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
