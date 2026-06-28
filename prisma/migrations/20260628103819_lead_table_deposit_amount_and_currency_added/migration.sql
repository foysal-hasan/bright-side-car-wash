-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "deposit_amount" DECIMAL(10,2),
ADD COLUMN     "deposit_currency" TEXT DEFAULT 'USD';
