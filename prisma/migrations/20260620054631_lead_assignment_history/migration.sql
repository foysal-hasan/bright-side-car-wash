-- CreateTable
CREATE TABLE "lead_assignment_history" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "lead_id" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "assigned_by_id" TEXT,

    CONSTRAINT "lead_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_assignment_history_lead_id_idx" ON "lead_assignment_history"("lead_id");

-- AddForeignKey
ALTER TABLE "lead_assignment_history" ADD CONSTRAINT "lead_assignment_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignment_history" ADD CONSTRAINT "lead_assignment_history_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignment_history" ADD CONSTRAINT "lead_assignment_history_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
