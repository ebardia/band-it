-- Full-Text Search Migration for Message table
-- Run this after the Prisma migration that adds MessageMention and MessageReaction models

-- Add searchVector column as a generated column
-- This automatically updates whenever the content changes
ALTER TABLE "Message"
ADD COLUMN IF NOT EXISTS "searchVector" tsvector
GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "Message_searchVector_idx"
ON "Message" USING GIN ("searchVector");

-- Note: The GENERATED ALWAYS AS clause makes this a stored generated column
-- that automatically updates whenever the 'content' column changes.
-- This is more efficient than a trigger-based approach.
