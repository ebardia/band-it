-- Add checklist micro-actions support
-- This migration adds claiming, verification, context, and escalation fields to ChecklistItem

-- AlterEnum: Add CHECKLIST_* notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHECKLIST_CLAIMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHECKLIST_UNCLAIMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHECKLIST_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHECKLIST_VERIFICATION_NEEDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHECKLIST_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHECKLIST_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHECKLIST_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHECKLIST_ESCALATED';

-- AlterTable: Add new columns to ChecklistItem
ALTER TABLE "ChecklistItem" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "assignmentMethod" "AssignmentMethod",
ADD COLUMN IF NOT EXISTS "completionNote" TEXT,
ADD COLUMN IF NOT EXISTS "contextComputer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "contextPhone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "contextTimeMinutes" INTEGER,
ADD COLUMN IF NOT EXISTS "contextTravel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "escalatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "minClaimRole" "MemberRole",
ADD COLUMN IF NOT EXISTS "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "requiresVerification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "verificationNotes" TEXT,
ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus",
ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "verifiedById" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChecklistItem_verifiedById_idx" ON "ChecklistItem"("verifiedById");

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ChecklistItem_verifiedById_fkey'
    ) THEN
        ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_verifiedById_fkey"
        FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
