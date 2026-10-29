/*
  Warnings:

  - You are about to drop the column `authUserId` on the `Admin` table. All the data in the column will be lost.
  - Added the required column `passwordHash` to the `Admin` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Admin_authUserId_key";

-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "authUserId",
ADD COLUMN     "passwordHash" TEXT NOT NULL;
