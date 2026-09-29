ALTER TABLE "WorkshopRegistration" ADD COLUMN "paymentReference" TEXT,
ADD COLUMN "paymentAmount" DOUBLE PRECISION;
CREATE UNIQUE INDEX "WorkshopRegistration_paymentReference_key" ON "WorkshopRegistration"("paymentReference");
UPDATE "WorkshopRegistration" SET "status" = 'PENDING' WHERE "paymentStatus" = 'PENDING';
