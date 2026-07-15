-- Stage 4 — Athlete Platform Foundation (additive only)
-- Does not modify Stage 3 migration history.

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'CONNECTIONS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "SportStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OnboardingStage" AS ENUM ('ACCOUNT_READY', 'IDENTITY', 'SPORT', 'ACADEMIC', 'RECRUITING', 'VISIBILITY', 'COMPLETE');

-- CreateEnum
CREATE TYPE "RecruitingStatus" AS ENUM ('UNDECIDED', 'OPEN', 'CLOSED', 'COMMITTED');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('NONE', 'VERBAL', 'WRITTEN', 'SIGNED');

-- CreateEnum
CREATE TYPE "GuardianInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Sport" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SportStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "sportId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- AlterTable Athlete — additive columns (slug nullable first for backfill)
ALTER TABLE "Athlete" ADD COLUMN "slug" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Athlete" ADD COLUMN "middleName" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Athlete" ADD COLUMN "preferredName" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "city" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "stateRegion" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'US';
ALTER TABLE "Athlete" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "biography" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "profileStatus" "ProfileStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Athlete" ADD COLUMN "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "Athlete" ADD COLUMN "onboardingStage" "OnboardingStage" NOT NULL DEFAULT 'ACCOUNT_READY';
ALTER TABLE "Athlete" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Athlete" ADD COLUMN "visibilitySetAt" TIMESTAMP(3);
ALTER TABLE "Athlete" ADD COLUMN "schoolNameReported" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "teamNameReported" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "organizationId" UUID;

-- Backfill slug for any existing Stage 3 athlete rows
UPDATE "Athlete"
SET "slug" = 'athlete-' || substr(replace("id"::text, '-', ''), 1, 8)
WHERE "slug" IS NULL;

ALTER TABLE "Athlete" ALTER COLUMN "slug" SET NOT NULL;

-- CreateTable
CREATE TABLE "AthleteSport" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "sportId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startYear" INTEGER,

    CONSTRAINT "AthleteSport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthletePosition" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "sportId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AthletePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthletePhysicalProfile" (
    "athleteId" UUID NOT NULL,
    "heightCm" DECIMAL(5,2),
    "weightKg" DECIMAL(6,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthletePhysicalProfile_pkey" PRIMARY KEY ("athleteId")
);

-- CreateTable
CREATE TABLE "AthleteAcademicProfile" (
    "athleteId" UUID NOT NULL,
    "schoolName" TEXT,
    "graduationYear" INTEGER,
    "gpa" DECIMAL(4,2),
    "gpaScale" DECIMAL(4,2),
    "intendedMajor" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteAcademicProfile_pkey" PRIMARY KEY ("athleteId")
);

-- CreateTable
CREATE TABLE "AthleteRecruitingProfile" (
    "athleteId" UUID NOT NULL,
    "recruitingStatus" "RecruitingStatus" NOT NULL DEFAULT 'UNDECIDED',
    "commitmentStatus" "CommitmentStatus" NOT NULL DEFAULT 'NONE',
    "committedOrganizationText" TEXT,
    "recruitingBiography" TEXT,
    "preferredRegions" JSONB,
    "preferredCompetitionLevels" JSONB,
    "contactPolicy" TEXT NOT NULL DEFAULT 'CLOSED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteRecruitingProfile_pkey" PRIMARY KEY ("athleteId")
);

-- AlterTable GuardianRelationship
ALTER TABLE "GuardianRelationship" ADD COLUMN "inviteStatus" "GuardianInviteStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "GuardianRelationship" ADD COLUMN "invitedByUserId" UUID;
ALTER TABLE "GuardianRelationship" ADD COLUMN "invitedAt" TIMESTAMP(3);
ALTER TABLE "GuardianRelationship" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "GuardianRelationship" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Sport_code_key" ON "Sport"("code");

-- CreateIndex
CREATE INDEX "Position_sportId_idx" ON "Position"("sportId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_sportId_code_key" ON "Position"("sportId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_slug_key" ON "Athlete"("slug");

-- CreateIndex
CREATE INDEX "Athlete_organizationId_idx" ON "Athlete"("organizationId");

-- CreateIndex
CREATE INDEX "Athlete_profileStatus_idx" ON "Athlete"("profileStatus");

-- CreateIndex
CREATE INDEX "Athlete_profileVisibility_idx" ON "Athlete"("profileVisibility");

-- CreateIndex
CREATE INDEX "AthleteSport_sportId_idx" ON "AthleteSport"("sportId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteSport_athleteId_sportId_key" ON "AthleteSport"("athleteId", "sportId");

-- CreateIndex
CREATE INDEX "AthletePosition_sportId_idx" ON "AthletePosition"("sportId");

-- CreateIndex
CREATE UNIQUE INDEX "AthletePosition_athleteId_positionId_key" ON "AthletePosition"("athleteId", "positionId");

-- CreateIndex
CREATE INDEX "GuardianRelationship_athleteId_idx" ON "GuardianRelationship"("athleteId");

-- CreateIndex
CREATE INDEX "GuardianRelationship_invitedByUserId_idx" ON "GuardianRelationship"("invitedByUserId");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSport" ADD CONSTRAINT "AthleteSport_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSport" ADD CONSTRAINT "AthleteSport_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePosition" ADD CONSTRAINT "AthletePosition_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePosition" ADD CONSTRAINT "AthletePosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePhysicalProfile" ADD CONSTRAINT "AthletePhysicalProfile_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteAcademicProfile" ADD CONSTRAINT "AthleteAcademicProfile_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteRecruitingProfile" ADD CONSTRAINT "AthleteRecruitingProfile_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianRelationship" ADD CONSTRAINT "GuardianRelationship_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
