-- CreateTable
CREATE TABLE "lead_activity_timelines" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "lead_id" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "user_id" TEXT,

    CONSTRAINT "lead_activity_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_activity_timelines_lead_id_idx" ON "lead_activity_timelines"("lead_id");

-- AddForeignKey
ALTER TABLE "lead_activity_timelines" ADD CONSTRAINT "lead_activity_timelines_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activity_timelines" ADD CONSTRAINT "lead_activity_timelines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
