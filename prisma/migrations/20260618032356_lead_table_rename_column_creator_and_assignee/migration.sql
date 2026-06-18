/*
  Warnings:

  - You are about to drop the column `assigned_to_user_id` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `created_by_user_id` on the `leads` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_assigned_to_user_id_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_created_by_user_id_fkey";

-- AlterTable
ALTER TABLE "leads" DROP COLUMN "assigned_to_user_id",
DROP COLUMN "created_by_user_id",
ADD COLUMN     "assigned_to_id" TEXT,
ADD COLUMN     "created_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
