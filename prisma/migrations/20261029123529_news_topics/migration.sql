-- CreateEnum
CREATE TYPE "NewsTopicStatus" AS ENUM ('NEW', 'QUEUED', 'WRITTEN', 'DISMISSED');

-- AlterEnum
ALTER TYPE "AiContentType" ADD VALUE 'NEWS_ARTICLE';

-- CreateTable
CREATE TABLE "NewsTopic" (
    "id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "leagueSlug" TEXT,
    "status" "NewsTopicStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsTopic_status_createdAt_idx" ON "NewsTopic"("status", "createdAt");
