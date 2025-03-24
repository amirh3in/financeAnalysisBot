/*
  Warnings:

  - Added the required column `candleInfo` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderType` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "candleInfo" TEXT NOT NULL,
ADD COLUMN     "orderType" INTEGER NOT NULL,
ALTER COLUMN "tp" SET DEFAULT 0,
ALTER COLUMN "tp" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "sl" SET DEFAULT 0,
ALTER COLUMN "sl" SET DATA TYPE DOUBLE PRECISION;
