/*
  Warnings:

  - You are about to drop the column `sendFrom` on the `email_logs` table. All the data in the column will be lost.
  - The `status` column on the `email_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `sender_mail` to the `email_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('DELIVERED', 'PENDING', 'FAILED', 'BOUNCED');

-- AlterTable
ALTER TABLE "email_logs" DROP COLUMN "sendFrom",
ADD COLUMN     "is_clicked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_opened" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sender_mail" TEXT NOT NULL,
ADD COLUMN     "sender_name" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "EmailStatus" NOT NULL DEFAULT 'PENDING';
