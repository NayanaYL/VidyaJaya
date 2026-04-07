import { prisma } from '../src/config/database.js';
import * as contestService from '../src/services/contest.service.js';

const randomEmail = `edgecase+${Date.now()}@example.com`;

async function run() {
  console.log('Starting contest edge case test...');

  const user = await prisma.user.create({
    data: {
      email: randomEmail,
      password: 'testpassword',
      name: 'Edge Case Tester',
    },
  });

  const now = new Date();
  const contest = await contestService.createContest({
    title: 'Edge Case Contest',
    entry_fee: 0,
    prize_pool: 0,
    start_time: new Date(now.getTime() + 2000),
    total_questions: 2,
    duration_minutes: 2,
  });

  await prisma.subscription.create({
    data: {
      userId: user.id,
      planType: 'weekly',
      startDate: new Date(now.getTime() - 60000),
      endDate: new Date(now.getTime() + 3600000),
      status: 'active',
    },
  });

  await contestService.joinContest(user.id, contest.id);

  console.log('Waiting for contest to begin...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const q1 = await prisma.question.create({
    data: {
      contest_id: contest.id,
      question: 'What is 2 + 2?',
      option_a: '2',
      option_b: '3',
      option_c: '4',
      option_d: '5',
      hint: 'Basic math',
      explanation: '2 + 2 equals 4',
      correct_ans: 'C',
    },
  });

  const q2 = await prisma.question.create({
    data: {
      contest_id: contest.id,
      question: 'What is the capital of France?',
      option_a: 'Paris',
      option_b: 'Berlin',
      option_c: 'Rome',
      option_d: 'Madrid',
      hint: 'European capital',
      explanation: 'Paris is the capital of France',
      correct_ans: 'A',
    },
  });

  console.log('Submitting with missing answers...');
  try {
    const result = await contestService.submitContest(user.id, contest.id, [
      { question_id: q1.id, selected_ans: 'C' },
    ], 45);
    console.log('Missing answers result:', result);
  } catch (error) {
    console.error('Missing answers error:', error.message);
  }

  console.log('Submitting duplicate contest submission...');
  try {
    await contestService.submitContest(user.id, contest.id, [
      { question_id: q1.id, selected_ans: 'C' },
      { question_id: q2.id, selected_ans: 'A' },
    ], 30);
  } catch (error) {
    console.error('Duplicate submission error:', error.message);
  }

  console.log('Creating ended contest and testing submission...');
  const endedContest = await contestService.createContest({
    title: 'Ended Contest',
    entry_fee: 0,
    prize_pool: 0,
    start_time: new Date(now.getTime() - 3600000),
    total_questions: 1,
    duration_minutes: 1,
  });

  await prisma.question.create({
    data: {
      contest_id: endedContest.id,
      question: 'What is 1 + 1?',
      option_a: '2',
      option_b: '3',
      option_c: '4',
      option_d: '5',
      hint: 'It is even',
      explanation: '1 + 1 equals 2',
      correct_ans: 'A',
    },
  });

  const endedQuestion = await prisma.question.create({
    data: {
      contest_id: endedContest.id,
      question: 'What is 1 + 1?',
      option_a: '2',
      option_b: '3',
      option_c: '4',
      option_d: '5',
      hint: 'It is even',
      explanation: '1 + 1 equals 2',
      correct_ans: 'A',
    },
  });

  await prisma.contestParticipant.create({
    data: {
      userId: user.id,
      contestId: endedContest.id,
    },
  });

  try {
    await contestService.submitContest(user.id, endedContest.id, [
      { question_id: endedQuestion.id, selected_ans: 'A' },
    ], 10);
  } catch (error) {
    console.error('Ended contest error:', error.message);
  }
}

run()
  .catch((err) => {
    console.error('Edge case test failed:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
