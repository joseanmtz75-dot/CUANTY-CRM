-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "totalComprasErp" DOUBLE PRECISION,
ADD COLUMN     "ultimaCompraErp" TIMESTAMP(3),
ADD COLUMN     "primeraCompraErp" TIMESTAMP(3),
ADD COLUMN     "productosFrecuentesErp" TEXT,
ADD COLUMN     "clasificacionErp" TEXT;

-- CreateIndex
CREATE INDEX "Client_clasificacionErp_idx" ON "Client"("clasificacionErp");
