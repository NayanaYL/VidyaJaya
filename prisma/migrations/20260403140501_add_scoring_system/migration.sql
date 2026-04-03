-- AlterTable
ALTER TABLE "ContestParticipant" ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streak" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "isTimeout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pointsEarned" INTEGER NOT NULL DEFAULT 0;
