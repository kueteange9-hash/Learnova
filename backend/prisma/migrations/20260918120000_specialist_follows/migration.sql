CREATE TABLE "SpecialistFollow" (
  "learnerId" TEXT NOT NULL,
  "specialistId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpecialistFollow_pkey" PRIMARY KEY ("learnerId", "specialistId"),
  CONSTRAINT "SpecialistFollow_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SpecialistFollow_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SpecialistFollow_specialistId_idx" ON "SpecialistFollow"("specialistId");
