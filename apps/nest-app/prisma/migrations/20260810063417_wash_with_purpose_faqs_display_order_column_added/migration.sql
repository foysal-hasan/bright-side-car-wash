-- AlterTable
ALTER TABLE "wash_with_purpose_faqs" ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "wash_with_purpose_faqs_is_publish_display_order_idx" ON "wash_with_purpose_faqs"("is_publish", "display_order");
