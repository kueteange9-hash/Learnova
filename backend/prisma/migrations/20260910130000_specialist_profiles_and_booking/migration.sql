ALTER TABLE "Specialist"
ADD COLUMN "headline" TEXT,
ADD COLUMN "howIHelp" TEXT,
ADD COLUMN "expertise" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "expertiseDescriptions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "sessionFormats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "sessionRate" DOUBLE PRECISION,
ADD COLUMN "sessionDuration" INTEGER NOT NULL DEFAULT 45,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "AvailabilitySlot" (
  "id" TEXT NOT NULL,
  "specialistId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "booked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Appointment"
ADD COLUMN "availabilitySlotId" TEXT,
ADD COLUMN "endDate" TIMESTAMP(3),
ADD COLUMN "format" TEXT NOT NULL DEFAULT 'Video',
ADD COLUMN "specialistNotes" TEXT,
ADD COLUMN "meetingUrl" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "AvailabilitySlot_specialistId_startsAt_key" ON "AvailabilitySlot"("specialistId", "startsAt");
CREATE INDEX "AvailabilitySlot_specialistId_startsAt_idx" ON "AvailabilitySlot"("specialistId", "startsAt");
CREATE UNIQUE INDEX "Appointment_availabilitySlotId_key" ON "Appointment"("availabilitySlotId");
CREATE INDEX "Appointment_learnerId_date_idx" ON "Appointment"("learnerId", "date");
CREATE INDEX "Appointment_specialistId_date_idx" ON "Appointment"("specialistId", "date");

ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_availabilitySlotId_fkey" FOREIGN KEY ("availabilitySlotId") REFERENCES "AvailabilitySlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
