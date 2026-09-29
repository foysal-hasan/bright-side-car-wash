-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "priority" "LeadPriority" DEFAULT 'LOW';
