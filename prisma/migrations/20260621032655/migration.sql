/*
  Warnings:

  - You are about to drop the `DeliveryLog` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `leadGroupId` to the `EmailConfig` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DeliveryLog" DROP CONSTRAINT "DeliveryLog_campaignId_fkey";

-- AlterTable
ALTER TABLE "EmailConfig" ADD COLUMN     "leadGroupId" TEXT NOT NULL;

-- DropTable
DROP TABLE "DeliveryLog";

-- CreateTable
CREATE TABLE "delivery_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerEventId" TEXT,
    "metaData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LeadToGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LeadToGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "delivery_logs_campaignId_idx" ON "delivery_logs"("campaignId");

-- CreateIndex
CREATE INDEX "delivery_logs_recipient_idx" ON "delivery_logs"("recipient");

-- CreateIndex
CREATE INDEX "delivery_logs_status_idx" ON "delivery_logs"("status");

-- CreateIndex
CREATE INDEX "delivery_logs_campaignId_recipient_idx" ON "delivery_logs"("campaignId", "recipient");

-- CreateIndex
CREATE INDEX "_LeadToGroup_B_index" ON "_LeadToGroup"("B");

-- AddForeignKey
ALTER TABLE "EmailConfig" ADD CONSTRAINT "EmailConfig_leadGroupId_fkey" FOREIGN KEY ("leadGroupId") REFERENCES "lead_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeadToGroup" ADD CONSTRAINT "_LeadToGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeadToGroup" ADD CONSTRAINT "_LeadToGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "lead_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
