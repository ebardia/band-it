-- Talk It Out enums and tables
CREATE TYPE "TalkItOutGoal" AS ENUM ('DECISION', 'EXPLORE', 'RESOLVE', 'IDEATE', 'ALIGN', 'UNDERSTAND');
CREATE TYPE "TalkItOutSessionStatus" AS ENUM ('SETUP', 'ACTIVE', 'CLOSED');
CREATE TYPE "TalkItOutParticipantRole" AS ENUM ('CREATOR', 'PARTICIPANT');
CREATE TYPE "TalkItOutParticipantStatus" AS ENUM ('INVITED', 'JOINED', 'LEFT');
CREATE TYPE "TalkItOutAuthorType" AS ENUM ('USER', 'FACILITATOR');
CREATE TYPE "TalkItOutMessageType" AS ENUM ('USER_MESSAGE', 'FACILITATOR_OPENING', 'FACILITATOR_PROMPT', 'FACILITATOR_SUMMARY', 'FACILITATOR_INTERVENTION', 'CLOSING_SUMMARY');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TALK_IT_OUT_INVITED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TALK_IT_OUT_STARTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TALK_IT_OUT_FACILITATOR_PROMPT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TALK_IT_OUT_CLOSED';

CREATE TABLE "TalkItOutSession" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "bandId" TEXT,
    "topic" TEXT NOT NULL,
    "goal" "TalkItOutGoal" NOT NULL,
    "status" "TalkItOutSessionStatus" NOT NULL DEFAULT 'SETUP',
    "maxParticipants" INTEGER NOT NULL DEFAULT 8,
    "facilitatorPrompt" TEXT,
    "summary" TEXT,
    "summaryDraft" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "TalkItOutSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TalkItOutParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TalkItOutParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "status" "TalkItOutParticipantStatus" NOT NULL DEFAULT 'INVITED',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TalkItOutParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TalkItOutMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "authorType" "TalkItOutAuthorType" NOT NULL,
    "authorUserId" TEXT,
    "content" TEXT NOT NULL,
    "messageType" "TalkItOutMessageType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TalkItOutMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TalkItOutParticipant_sessionId_userId_key" ON "TalkItOutParticipant"("sessionId", "userId");
CREATE INDEX "TalkItOutSession_createdByUserId_idx" ON "TalkItOutSession"("createdByUserId");
CREATE INDEX "TalkItOutSession_status_idx" ON "TalkItOutSession"("status");
CREATE INDEX "TalkItOutSession_bandId_idx" ON "TalkItOutSession"("bandId");
CREATE INDEX "TalkItOutSession_createdAt_idx" ON "TalkItOutSession"("createdAt");
CREATE INDEX "TalkItOutParticipant_userId_idx" ON "TalkItOutParticipant"("userId");
CREATE INDEX "TalkItOutParticipant_sessionId_idx" ON "TalkItOutParticipant"("sessionId");
CREATE INDEX "TalkItOutMessage_sessionId_createdAt_idx" ON "TalkItOutMessage"("sessionId", "createdAt");

ALTER TABLE "TalkItOutSession" ADD CONSTRAINT "TalkItOutSession_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TalkItOutSession" ADD CONSTRAINT "TalkItOutSession_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TalkItOutParticipant" ADD CONSTRAINT "TalkItOutParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TalkItOutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TalkItOutParticipant" ADD CONSTRAINT "TalkItOutParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TalkItOutMessage" ADD CONSTRAINT "TalkItOutMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TalkItOutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TalkItOutMessage" ADD CONSTRAINT "TalkItOutMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
