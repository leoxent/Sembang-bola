-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AiContentType" ADD VALUE 'WEEKLY_ROUNDUP';
ALTER TYPE "AiContentType" ADD VALUE 'FEATURE';

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "isBot" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "NewsTopic" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'berita';

-- Categories for Rex's new article types and viral news
INSERT INTO "Category" ("id", "name", "slug", "section", "description", "sortOrder") VALUES
  (gen_random_uuid()::text, 'Ringkasan Mingguan', 'ringkasan-mingguan', 'BERITA', 'Apa jadi minggu ni di setiap liga: keputusan, kedudukan dan bintang minggu ini.', 4),
  (gen_random_uuid()::text, 'Dunia Bola', 'dunia-bola', 'BERITA', 'Cerita viral dan menarik dari seluruh dunia bola sepak.', 5)
ON CONFLICT ("slug") DO NOTHING;
