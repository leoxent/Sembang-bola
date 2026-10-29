-- AlterEnum
BEGIN;
CREATE TYPE "AiContentType_new" AS ENUM ('MATCH_SUMMARY', 'PLAYER_OF_THE_WEEK', 'NEWS_ARTICLE');
ALTER TABLE "AiContent" ALTER COLUMN "type" TYPE "AiContentType_new" USING ("type"::text::"AiContentType_new");
ALTER TABLE "AiJob" ALTER COLUMN "type" TYPE "AiContentType_new" USING ("type"::text::"AiContentType_new");
ALTER TYPE "AiContentType" RENAME TO "AiContentType_old";
ALTER TYPE "AiContentType_new" RENAME TO "AiContentType";
DROP TYPE "public"."AiContentType_old";
COMMIT;
