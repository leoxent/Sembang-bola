-- CreateEnum
CREATE TYPE "CategorySection" AS ENUM ('BERITA', 'RENCANA');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "section" "CategorySection" NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Article_categoryId_idx" ON "Article"("categoryId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Default categories
INSERT INTO "Category" ("id", "name", "slug", "section", "description", "sortOrder") VALUES
  (gen_random_uuid()::text, 'Berita', 'berita', 'BERITA', 'Berita panas, perpindahan pemain dan khabar angin terkini.', 1),
  (gen_random_uuid()::text, 'Laporan Perlawanan', 'laporan-perlawanan', 'BERITA', 'Apa yang berlaku di padang, perlawanan demi perlawanan.', 2),
  (gen_random_uuid()::text, 'Legenda', 'legenda', 'RENCANA', 'Kisah pemain dan jurulatih yang dah jadi legenda.', 10),
  (gen_random_uuid()::text, 'Peraturan', 'peraturan', 'RENCANA', 'Peraturan bola sepak, yang lama, yang baru dan yang mengelirukan.', 11),
  (gen_random_uuid()::text, 'Sejarah', 'sejarah', 'RENCANA', 'Sejarah kelab, pemain dan pertandingan.', 12),
  (gen_random_uuid()::text, 'Player of the Week', 'player-of-the-week', 'RENCANA', 'Pemain paling padu setiap minggu.', 13);

-- Existing articles: match reports, Player of the Week, everything else is news
UPDATE "Article" SET "categoryId" = (SELECT "id" FROM "Category" WHERE "slug" = 'laporan-perlawanan') WHERE "matchId" IS NOT NULL;
UPDATE "Article" a SET "categoryId" = (SELECT "id" FROM "Category" WHERE "slug" = 'player-of-the-week')
  FROM "AiContent" c WHERE a."aiContentId" = c."id" AND c."type" = 'PLAYER_OF_THE_WEEK' AND a."categoryId" IS NULL;
UPDATE "Article" SET "categoryId" = (SELECT "id" FROM "Category" WHERE "slug" = 'berita') WHERE "categoryId" IS NULL;
