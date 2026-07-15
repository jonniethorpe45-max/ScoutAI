-- Stage 5 — Games, Seasons, Statistics, Performance (additive only)
-- Does not modify Stage 3 or Stage 4 migration history.

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AthleteSeasonStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'PRE_GAME', 'LIVE', 'DELAYED', 'POSTPONED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('ROSTERED', 'EXPECTED', 'CONFIRMED_ACTIVE', 'PARTICIPATED', 'DID_NOT_PARTICIPATE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StatisticDataType" AS ENUM ('INTEGER', 'DECIMAL', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "StatisticAggregationType" AS ENUM ('SUM', 'AVERAGE', 'MAX', 'MIN', 'LATEST', 'DERIVED');

-- CreateEnum
CREATE TYPE "StatisticCategory" AS ENUM ('PASSING', 'RUSHING', 'RECEIVING', 'DEFENSE', 'KICKING', 'PUNTING', 'RETURNS', 'OTHER');

-- CreateEnum
CREATE TYPE "MeasurementType" AS ENUM ('TIME', 'DISTANCE', 'HEIGHT', 'WEIGHT', 'COUNT');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('SELF_REPORTED', 'COACH_REPORTED', 'ORGANIZATION_REPORTED', 'IMPORTED', 'SOURCE_VERIFIED', 'SCOUTAI_VERIFIED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "Team" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" UUID,
    "sportId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" UUID NOT NULL,
    "sportId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "SeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteSeason" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "sportId" UUID NOT NULL,
    "teamId" UUID,
    "organizationId" UUID,
    "selfReportedTeamName" TEXT,
    "jerseyNumber" TEXT,
    "primaryPositionId" UUID,
    "status" "AthleteSeasonStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "sportId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "status" "GameStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeTeamId" UUID,
    "awayTeamId" UUID,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "locationName" TEXT,
    "city" TEXT,
    "stateRegion" TEXT,
    "countryCode" TEXT DEFAULT 'US',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteGameParticipation" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "athleteSeasonId" UUID,
    "participationStatus" "ParticipationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "jerseyNumber" TEXT,
    "starter" BOOLEAN,
    "sourceType" "DataSourceType" NOT NULL DEFAULT 'SELF_REPORTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteGameParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatisticDefinition" (
    "id" UUID NOT NULL,
    "sportId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "description" TEXT,
    "dataType" "StatisticDataType" NOT NULL,
    "unit" TEXT,
    "aggregationType" "StatisticAggregationType" NOT NULL,
    "category" "StatisticCategory" NOT NULL DEFAULT 'OTHER',
    "higherIsBetter" BOOLEAN,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatisticDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteGameStatistic" (
    "id" UUID NOT NULL,
    "athleteGameParticipationId" UUID NOT NULL,
    "statisticDefinitionId" UUID NOT NULL,
    "numericValue" DECIMAL(12,4) NOT NULL,
    "sourceType" "DataSourceType" NOT NULL DEFAULT 'SELF_REPORTED',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "enteredByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteGameStatistic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceTestDefinition" (
    "id" UUID NOT NULL,
    "sportId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "measurementType" "MeasurementType" NOT NULL,
    "unit" TEXT NOT NULL,
    "lowerIsBetter" BOOLEAN NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceTestDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceTestResult" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "performanceTestDefinitionId" UUID NOT NULL,
    "numericValue" DECIMAL(12,4) NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "eventName" TEXT,
    "locationName" TEXT,
    "sourceType" "DataSourceType" NOT NULL DEFAULT 'SELF_REPORTED',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "enteredByUserId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

-- CreateIndex
CREATE INDEX "Team_sportId_idx" ON "Team"("sportId");

-- CreateIndex
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Season_sportId_idx" ON "Season"("sportId");

-- CreateIndex
CREATE INDEX "Season_year_idx" ON "Season"("year");

-- CreateIndex
CREATE INDEX "Season_status_idx" ON "Season"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Season_sportId_name_year_key" ON "Season"("sportId", "name", "year");

-- CreateIndex
CREATE INDEX "AthleteSeason_seasonId_idx" ON "AthleteSeason"("seasonId");

-- CreateIndex
CREATE INDEX "AthleteSeason_sportId_idx" ON "AthleteSeason"("sportId");

-- CreateIndex
CREATE INDEX "AthleteSeason_teamId_idx" ON "AthleteSeason"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteSeason_athleteId_seasonId_key" ON "AthleteSeason"("athleteId", "seasonId");

-- CreateIndex
CREATE INDEX "Game_sportId_idx" ON "Game"("sportId");

-- CreateIndex
CREATE INDEX "Game_seasonId_idx" ON "Game"("seasonId");

-- CreateIndex
CREATE INDEX "Game_scheduledStart_idx" ON "Game"("scheduledStart");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "Game_createdByUserId_idx" ON "Game"("createdByUserId");

-- CreateIndex
CREATE INDEX "AthleteGameParticipation_gameId_idx" ON "AthleteGameParticipation"("gameId");

-- CreateIndex
CREATE INDEX "AthleteGameParticipation_athleteSeasonId_idx" ON "AthleteGameParticipation"("athleteSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteGameParticipation_athleteId_gameId_key" ON "AthleteGameParticipation"("athleteId", "gameId");

-- CreateIndex
CREATE INDEX "StatisticDefinition_sportId_idx" ON "StatisticDefinition"("sportId");

-- CreateIndex
CREATE INDEX "StatisticDefinition_category_idx" ON "StatisticDefinition"("category");

-- CreateIndex
CREATE UNIQUE INDEX "StatisticDefinition_sportId_code_key" ON "StatisticDefinition"("sportId", "code");

-- CreateIndex
CREATE INDEX "AthleteGameStatistic_statisticDefinitionId_idx" ON "AthleteGameStatistic"("statisticDefinitionId");

-- CreateIndex
CREATE INDEX "AthleteGameStatistic_verificationStatus_idx" ON "AthleteGameStatistic"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteGameStatistic_athleteGameParticipationId_statisticDe_key" ON "AthleteGameStatistic"("athleteGameParticipationId", "statisticDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceTestDefinition_code_key" ON "PerformanceTestDefinition"("code");

-- CreateIndex
CREATE INDEX "PerformanceTestDefinition_sportId_idx" ON "PerformanceTestDefinition"("sportId");

-- CreateIndex
CREATE INDEX "PerformanceTestResult_athleteId_performanceTestDefinitionId_idx" ON "PerformanceTestResult"("athleteId", "performanceTestDefinitionId", "performedAt");

-- CreateIndex
CREATE INDEX "PerformanceTestResult_verificationStatus_idx" ON "PerformanceTestResult"("verificationStatus");

-- CreateIndex
CREATE INDEX "PerformanceTestResult_enteredByUserId_idx" ON "PerformanceTestResult"("enteredByUserId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSeason" ADD CONSTRAINT "AthleteSeason_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSeason" ADD CONSTRAINT "AthleteSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSeason" ADD CONSTRAINT "AthleteSeason_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSeason" ADD CONSTRAINT "AthleteSeason_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSeason" ADD CONSTRAINT "AthleteSeason_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSeason" ADD CONSTRAINT "AthleteSeason_primaryPositionId_fkey" FOREIGN KEY ("primaryPositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGameParticipation" ADD CONSTRAINT "AthleteGameParticipation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGameParticipation" ADD CONSTRAINT "AthleteGameParticipation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGameParticipation" ADD CONSTRAINT "AthleteGameParticipation_athleteSeasonId_fkey" FOREIGN KEY ("athleteSeasonId") REFERENCES "AthleteSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatisticDefinition" ADD CONSTRAINT "StatisticDefinition_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGameStatistic" ADD CONSTRAINT "AthleteGameStatistic_athleteGameParticipationId_fkey" FOREIGN KEY ("athleteGameParticipationId") REFERENCES "AthleteGameParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGameStatistic" ADD CONSTRAINT "AthleteGameStatistic_statisticDefinitionId_fkey" FOREIGN KEY ("statisticDefinitionId") REFERENCES "StatisticDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGameStatistic" ADD CONSTRAINT "AthleteGameStatistic_enteredByUserId_fkey" FOREIGN KEY ("enteredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTestDefinition" ADD CONSTRAINT "PerformanceTestDefinition_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTestResult" ADD CONSTRAINT "PerformanceTestResult_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTestResult" ADD CONSTRAINT "PerformanceTestResult_performanceTestDefinitionId_fkey" FOREIGN KEY ("performanceTestDefinitionId") REFERENCES "PerformanceTestDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTestResult" ADD CONSTRAINT "PerformanceTestResult_enteredByUserId_fkey" FOREIGN KEY ("enteredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
