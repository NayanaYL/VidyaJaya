-- CreateTable
CREATE TABLE "WeeklyReward" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "rank" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "contestsPlayed" INTEGER NOT NULL,
    "averageScore" INTEGER NOT NULL,
    "rewardAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReward_userId_weekStart_key" ON "WeeklyReward"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyReward" ADD CONSTRAINT "WeeklyReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
