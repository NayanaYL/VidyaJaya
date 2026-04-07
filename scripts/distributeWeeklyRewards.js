// Weekly Reward Distribution Script
// Run this every Monday morning (e.g., via cron job) to distribute rewards
// Example: node scripts/distributeWeeklyRewards.js

import { weeklyRewardService } from '../services/weeklyReward.service.js';

async function distributeWeeklyRewards() {
  try {
    console.log('Starting weekly reward distribution...');

    // Calculate last week (previous Monday to Sunday)
    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - now.getDay() - 6); // Monday of last week
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6); // Sunday of last week
    lastSunday.setHours(23, 59, 59, 999);

    console.log(`Distributing rewards for week: ${lastMonday.toDateString()} - ${lastSunday.toDateString()}`);

    const result = await weeklyRewardService.distributeWeeklyRewards(lastMonday, lastSunday);

    console.log('✅ Weekly rewards distributed successfully!');
    console.log(`Rewarded ${result.rewardedUsers} users`);
    console.log(`Total contests this week: ${result.totalContests}`);

    // Log individual rewards
    result.distributions.forEach(dist => {
      console.log(`₹${dist.rewardAmount} to ${dist.userName} (Rank ${dist.rank})`);
    });

  } catch (error) {
    console.error('❌ Error distributing weekly rewards:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  distributeWeeklyRewards();
}

export { distributeWeeklyRewards };