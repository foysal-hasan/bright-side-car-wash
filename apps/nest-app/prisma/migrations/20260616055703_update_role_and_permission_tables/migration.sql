/*
  Warnings:

  - You are about to drop the column `action` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `conditions` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `fields` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `permissions` table. All the data in the column will be lost.
  - The primary key for the `role_users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `role_users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `role_users` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `firebaseUid` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `_PermissionToRole` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_daily_metrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_visitors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notification_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permission_roles` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `roles` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_A_fkey";

-- DropForeignKey
ALTER TABLE "_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_B_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_notification_event_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_receiver_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "permission_roles" DROP CONSTRAINT "permission_roles_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "permission_roles" DROP CONSTRAINT "permission_roles_role_id_fkey";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "roles_user_id_fkey";

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "action",
DROP COLUMN "conditions",
DROP COLUMN "deleted_at",
DROP COLUMN "fields",
DROP COLUMN "status",
DROP COLUMN "subject",
DROP COLUMN "title",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "role_users" DROP CONSTRAINT "role_users_pkey",
DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD CONSTRAINT "role_users_pkey" PRIMARY KEY ("user_id", "role_id");

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "deleted_at",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "user_id",
ADD COLUMN     "description" TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "name" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "firebaseUid";

-- DropTable
DROP TABLE "_PermissionToRole";

-- DropTable
DROP TABLE "analytics_daily_metrics";

-- DropTable
DROP TABLE "analytics_visitors";

-- DropTable
DROP TABLE "notification_events";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "permission_roles";

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
