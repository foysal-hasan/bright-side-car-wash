-- CreateTable
CREATE TABLE "wash_with_purpose_faqs" (
    "id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "icon" TEXT,
    "question" TEXT NOT NULL,
    "ans" TEXT NOT NULL,
    "is_publish" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "wash_with_purpose_faqs_pkey" PRIMARY KEY ("id")
);
