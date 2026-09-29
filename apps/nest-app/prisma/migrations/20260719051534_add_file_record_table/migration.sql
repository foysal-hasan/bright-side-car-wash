/*
  Warnings:

  - You are about to drop the `social_media` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `website_info` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "social_media";

-- DropTable
DROP TABLE "website_info";

-- CreateTable
CREATE TABLE "FileRecord" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "templateId" TEXT,
    "newsAndEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileRecord_templateId_idx" ON "FileRecord"("templateId");

-- CreateIndex
CREATE INDEX "FileRecord_newsAndEventId_idx" ON "FileRecord"("newsAndEventId");

-- AddForeignKey
ALTER TABLE "FileRecord" ADD CONSTRAINT "FileRecord_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileRecord" ADD CONSTRAINT "FileRecord_newsAndEventId_fkey" FOREIGN KEY ("newsAndEventId") REFERENCES "news_and_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
