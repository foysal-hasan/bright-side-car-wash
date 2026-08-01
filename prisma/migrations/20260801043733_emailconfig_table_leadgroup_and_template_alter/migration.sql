/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `quotes` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmailConfig" DROP CONSTRAINT "EmailConfig_leadGroupId_fkey";

-- AlterTable
ALTER TABLE "EmailConfig" ALTER COLUMN "leadGroupId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "quotes" DROP COLUMN "deleted_at";

-- AddForeignKey
ALTER TABLE "EmailConfig" ADD CONSTRAINT "EmailConfig_leadGroupId_fkey" FOREIGN KEY ("leadGroupId") REFERENCES "lead_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
