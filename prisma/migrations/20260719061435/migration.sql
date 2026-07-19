/*
  Warnings:

  - You are about to drop the column `mediaFileId` on the `FileRecord` table. All the data in the column will be lost.
  - Added the required column `storageKey` to the `FileRecord` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FileRecord" DROP CONSTRAINT "FileRecord_mediaFileId_fkey";

-- DropIndex
DROP INDEX "FileRecord_mediaFileId_idx";

-- AlterTable
ALTER TABLE "FileRecord" DROP COLUMN "mediaFileId",
ADD COLUMN     "storageKey" TEXT NOT NULL;
