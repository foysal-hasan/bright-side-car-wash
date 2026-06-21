/*
  Warnings:

  - A unique constraint covering the columns `[brevoListId]` on the table `lead_groups` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "lead_groups" ADD COLUMN     "brevoListId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "lead_groups_brevoListId_key" ON "lead_groups"("brevoListId");
