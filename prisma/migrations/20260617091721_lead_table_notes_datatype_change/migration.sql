/*
  Warnings:

  - You are about to drop the column `note` on the `leads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "leads" DROP COLUMN "note",
ADD COLUMN     "notes" TEXT[] DEFAULT ARRAY[]::TEXT[];
