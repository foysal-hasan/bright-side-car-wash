/*
  Warnings:

  - A unique constraint covering the columns `[provider_email_id]` on the table `email_logs` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "email_logs" ADD COLUMN     "provider_email_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_provider_email_id_key" ON "email_logs"("provider_email_id");
