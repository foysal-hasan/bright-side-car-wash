-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
