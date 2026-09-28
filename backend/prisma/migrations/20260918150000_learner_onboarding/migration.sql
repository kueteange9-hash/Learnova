CREATE TABLE "LearnerProfile" (
    "userId" TEXT NOT NULL,
    "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "formats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "stage" TEXT NOT NULL DEFAULT '',
    "aspiration" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearnerProfile_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "LearnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
