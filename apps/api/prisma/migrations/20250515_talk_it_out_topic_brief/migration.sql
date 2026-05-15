-- Talk It Out topic brief (background research for sessions)
CREATE TYPE "TalkItOutTopicBriefStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

ALTER TABLE "TalkItOutSession" ADD COLUMN "topicBriefStatus" "TalkItOutTopicBriefStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "TalkItOutSession" ADD COLUMN "topicBriefSummary" TEXT;
ALTER TABLE "TalkItOutSession" ADD COLUMN "topicBriefJson" TEXT;
ALTER TABLE "TalkItOutSession" ADD COLUMN "topicBriefGeneratedAt" TIMESTAMP(3);
