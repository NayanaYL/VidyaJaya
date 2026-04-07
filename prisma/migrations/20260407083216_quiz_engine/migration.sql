/*
  Warnings:

  - You are about to drop the column `contestId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `correctAnswer` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `Question` table. All the data in the column will be lost.
  - Added the required column `contest_id` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `correct_ans` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option_a` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option_b` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option_c` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option_d` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_contestId_fkey";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "contestId",
DROP COLUMN "correctAnswer",
DROP COLUMN "options",
DROP COLUMN "text",
ADD COLUMN     "contest_id" INTEGER NOT NULL,
ADD COLUMN     "correct_ans" TEXT NOT NULL,
ADD COLUMN     "option_a" TEXT NOT NULL,
ADD COLUMN     "option_b" TEXT NOT NULL,
ADD COLUMN     "option_c" TEXT NOT NULL,
ADD COLUMN     "option_d" TEXT NOT NULL,
ADD COLUMN     "question" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Submission" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "contest_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "time_taken" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "selected_ans" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
