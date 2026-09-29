-- DropEnum
DROP TYPE "MessageStatus";

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "vehicle" TEXT,
    "status" TEXT DEFAULT 'new',
    "description" TEXT,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);
