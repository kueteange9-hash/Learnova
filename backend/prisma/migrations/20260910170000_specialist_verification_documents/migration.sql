ALTER TABLE "Specialist"
ADD COLUMN "verificationDocument" TEXT,
ADD COLUMN "verificationDocumentName" TEXT,
ADD COLUMN "verificationDocumentType" TEXT,
ADD COLUMN "verificationSubmittedAt" TIMESTAMP(3),
ADD COLUMN "verificationNotes" TEXT;
