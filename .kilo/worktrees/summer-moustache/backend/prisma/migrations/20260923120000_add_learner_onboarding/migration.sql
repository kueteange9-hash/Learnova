-- Learnova AI guidance chat: learner onboarding information
-- Non-sensitive personalisation context collected during onboarding and
-- used by the AI assistant to personalise guidance and recommendations.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "onboardingInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "onboardingGoal" TEXT,
ADD COLUMN     "onboardingGuidance" TEXT,
ADD COLUMN     "onboardingCareer" TEXT,
ADD COLUMN     "onboardingEducation" TEXT,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3);
