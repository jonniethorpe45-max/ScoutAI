-- Stage 4: Athlete Platform Foundation

-- AlterTable Athlete — public + restricted profile fields
ALTER TABLE "Athlete" ADD COLUMN "sport" TEXT NOT NULL DEFAULT 'football';
ALTER TABLE "Athlete" ADD COLUMN "position" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "graduationYear" INTEGER;
ALTER TABLE "Athlete" ADD COLUMN "highSchoolName" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "heightInches" INTEGER;
ALTER TABLE "Athlete" ADD COLUMN "weightLbs" INTEGER;
ALTER TABLE "Athlete" ADD COLUMN "bio" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "city" TEXT;
ALTER TABLE "Athlete" ADD COLUMN "state" TEXT;

CREATE INDEX "Athlete_sport_idx" ON "Athlete"("sport");
CREATE INDEX "Athlete_graduationYear_idx" ON "Athlete"("graduationYear");

-- AlterTable GuardianRelationship — inviter tracking
ALTER TABLE "GuardianRelationship" ADD COLUMN "invitedByUserId" UUID;

ALTER TABLE "GuardianRelationship" ADD CONSTRAINT "GuardianRelationship_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "GuardianRelationship_athleteId_idx" ON "GuardianRelationship"("athleteId");
CREATE INDEX "GuardianRelationship_status_idx" ON "GuardianRelationship"("status");

-- OrganizationMember lookup by user
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
