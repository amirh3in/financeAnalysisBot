-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "profitOrLoss" BIGINT,
ADD COLUMN     "timeFrame" TEXT,
ADD COLUMN     "volume" DOUBLE PRECISION;
