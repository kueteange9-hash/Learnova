-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Specialist" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Workshop" ADD COLUMN     "meetingUrl" TEXT;

-- CreateTable
CREATE TABLE "WorkshopRegistration" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkshopRegistration_learnerId_createdAt_idx" ON "WorkshopRegistration"("learnerId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkshopRegistration_workshopId_status_idx" ON "WorkshopRegistration"("workshopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopRegistration_workshopId_learnerId_key" ON "WorkshopRegistration"("workshopId", "learnerId");

-- AddForeignKey
ALTER TABLE "WorkshopRegistration" ADD CONSTRAINT "WorkshopRegistration_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRegistration" ADD CONSTRAINT "WorkshopRegistration_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
