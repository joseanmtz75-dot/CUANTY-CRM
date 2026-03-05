-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "clasificacion" TEXT,
ADD COLUMN     "productosFrecuentes" TEXT,
ADD COLUMN     "totalComprasPdf" DOUBLE PRECISION,
ADD COLUMN     "totalDocumentosPdf" INTEGER;
