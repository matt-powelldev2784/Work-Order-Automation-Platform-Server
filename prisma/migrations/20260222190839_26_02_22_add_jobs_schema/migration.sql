-- CreateEnum
CREATE TYPE "JobSheetStatus" AS ENUM ('pending', 'processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('new', 'assigned', 'in_progress', 'completed');

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "customerName" TEXT NOT NULL,
    "jobAddress" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "job_sheet_status" "JobSheetStatus" NOT NULL DEFAULT 'pending',
    "job_status" "JobStatus" NOT NULL DEFAULT 'new',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "field_user_id" UUID,
    "notesFromField" TEXT,
    "created_by_user_id" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);
