/*
  Warnings:

  - You are about to drop the column `storageKey` on the `FileRecord` table. All the data in the column will be lost.
  - Added the required column `mediaFileId` to the `FileRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FileRecord" DROP COLUMN "storageKey",
ADD COLUMN     "mediaFileId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "FileRecord_mediaFileId_idx" ON "FileRecord"("mediaFileId");

-- AddForeignKey
ALTER TABLE "FileRecord" ADD CONSTRAINT "FileRecord_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
