/*
  Warnings:

  - You are about to drop the column `name` on the `quotes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "quotes" DROP COLUMN "name",
ADD COLUMN     "full_name" TEXT;
