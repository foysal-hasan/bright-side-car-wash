-- CreateTable
CREATE TABLE "galleries" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "image" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "galleries_pkey" PRIMARY KEY ("id")
);
