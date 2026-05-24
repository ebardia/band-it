-- End-user resume profile (additive only)
CREATE TYPE "ProfileTaxonomyKind" AS ENUM ('SKILL', 'CAUSE', 'PLAY');

CREATE TABLE IF NOT EXISTS "UsLocation" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "UsLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UsLocation_city_state_zip_key" ON "UsLocation"("city", "state", "zip");
CREATE INDEX IF NOT EXISTS "UsLocation_label_idx" ON "UsLocation"("label");
CREATE INDEX IF NOT EXISTS "UsLocation_zip_idx" ON "UsLocation"("zip");
CREATE INDEX IF NOT EXISTS "UsLocation_city_idx" ON "UsLocation"("city");

CREATE TABLE IF NOT EXISTS "ProfileTaxonomyCategory" (
    "id" TEXT NOT NULL,
    "kind" "ProfileTaxonomyKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProfileTaxonomyCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileTaxonomyCategory_kind_slug_key" ON "ProfileTaxonomyCategory"("kind", "slug");
CREATE INDEX IF NOT EXISTS "ProfileTaxonomyCategory_kind_sortOrder_idx" ON "ProfileTaxonomyCategory"("kind", "sortOrder");

CREATE TABLE IF NOT EXISTS "ProfileTaxonomyItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProfileTaxonomyItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileTaxonomyItem_categoryId_slug_key" ON "ProfileTaxonomyItem"("categoryId", "slug");
CREATE INDEX IF NOT EXISTS "ProfileTaxonomyItem_categoryId_sortOrder_idx" ON "ProfileTaxonomyItem"("categoryId", "sortOrder");

CREATE TABLE IF NOT EXISTS "UserProfileTaxonomySelection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "itemId" TEXT,
    CONSTRAINT "UserProfileTaxonomySelection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserProfileTaxonomySelection_userId_categoryId_key" ON "UserProfileTaxonomySelection"("userId", "categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfileTaxonomySelection_userId_itemId_key" ON "UserProfileTaxonomySelection"("userId", "itemId");
CREATE INDEX IF NOT EXISTS "UserProfileTaxonomySelection_userId_idx" ON "UserProfileTaxonomySelection"("userId");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locationId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resumeText" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resumeFileId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workExperience" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "education" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "certifications" JSONB NOT NULL DEFAULT '[]';

CREATE UNIQUE INDEX IF NOT EXISTS "User_resumeFileId_key" ON "User"("resumeFileId");

DO $$ BEGIN
    ALTER TABLE "User" ADD CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "UsLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "User" ADD CONSTRAINT "User_resumeFileId_fkey" FOREIGN KEY ("resumeFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProfileTaxonomyItem" ADD CONSTRAINT "ProfileTaxonomyItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProfileTaxonomyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "UserProfileTaxonomySelection" ADD CONSTRAINT "UserProfileTaxonomySelection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "UserProfileTaxonomySelection" ADD CONSTRAINT "UserProfileTaxonomySelection_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProfileTaxonomyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "UserProfileTaxonomySelection" ADD CONSTRAINT "UserProfileTaxonomySelection_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ProfileTaxonomyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
