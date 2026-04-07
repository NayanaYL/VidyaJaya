import { prisma } from '../src/config/database.js';
import * as subscriptionService from '../src/services/subscription.service.js';
import * as contestService from '../src/services/contest.service.js';

const randomId = Date.now();

const userPayloads = [
  { email: `testuser1+${randomId}@example.com`, name: 'User One' },
  { email: `testuser2+${randomId}@example.com`, name: 'User Two' },
  { email: `testuser3+${randomId}@example.com`, name: 'User Three' },
];

const run = async () => {
  try {
    console.log('Starting contest flow test...');

    // Create users
    const users = [];
    for (const userData of userPayloads) {
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: 'test1234',
        },
      });
      users.push(user);
    }
    console.log('Created users:', users.map(u => ({ id: u.id, email: u.email })));

    // Create subscriptions for all users
    for (const user of users) {
      const sub = await subscriptionService.createSubscription(user.id, 'monthly');
      console.log(`Created subscription for user ${user.id}:`, sub.id);
    }

    // Create a contest
    const contest = await contestService.createContest({
      title: `Test Contest ${randomId}`,
      entry_fee: 0,
      prize_pool: 1000,
      start_time: new Date(Date.now() + 1000 * 60),
      total_questions: 4,
    });
    console.log('Created contest:', contest.id);

    // Create questions and capture IDs
    const questions = [];
    const questionData = [
      {
        contest_id: contest.id,
        question: 'What is 2+2?',
        option_a: '1',
        option_b: '2',
        option_c: '3',
        option_d: '4',
        correct_ans: '4',
      },
      {
        contest_id: contest.id,
        question: 'What is the capital of India?',
        option_a: 'Delhi',
        option_b: 'Mumbai',
        option_c: 'Kolkata',
        option_d: 'Chennai',
        correct_ans: 'Delhi',
      },
      {
        contest_id: contest.id,
        question: 'What color is the sky?',
        option_a: 'Blue',
        option_b: 'Green',
        option_c: 'Red',
        option_d: 'Yellow',
        correct_ans: 'Blue',
      },
      {
        contest_id: contest.id,
        question: 'What is 10 / 2?',
        option_a: '2',
        option_b: '4',
        option_c: '5',
        option_d: '10',
        correct_ans: '5',
      },
    ];

    for (const q of questionData) {
      const created = await prisma.question.create({ data: q });
      questions.push(created);
    }
    console.log('Created questions:', questions.map(q => q.id));

    // Join users to contest
    for (const user of users) {
      const participant = await contestService.joinContest(user.id, contest.id);
      console.log(`User ${user.id} joined contest with participant id ${participant.id}`);
    }

    // Submit for users with different timings and accuracy
    const submissions = [
      {
        user: users[0],
        rawAnswers: [
          { question_id: questions[0].id, selected_ans: '4' },
          { question_id: questions[1].id, selected_ans: 'Delhi' },
          { question_id: questions[2].id, selected_ans: 'Blue' },
          { question_id: questions[3].id, selected_ans: '5' },
        ],
        time_taken: 120,
      },
      {
        user: users[1],
        rawAnswers: [
          { question_id: questions[0].id, selected_ans: '4' },
          { question_id: questions[1].id, selected_ans: 'Delhi' },
          { question_id: questions[2].id, selected_ans: 'Blue' },
          { question_id: questions[3].id, selected_ans: '5' },
        ],
        time_taken: 90,
      },
      {
        user: users[2],
        rawAnswers: [
          { question_id: questions[0].id, selected_ans: '4' },
          { question_id: questions[1].id, selected_ans: 'Mumbai' },
          { question_id: questions[2].id, selected_ans: 'Blue' },
          { question_id: questions[3].id, selected_ans: '5' },
        ],
        time_taken: 80,
      },
    ];

    for (const submission of submissions) {
      const result = await contestService.submitContest(
        submission.user.id,
        contest.id,
        submission.rawAnswers,
        submission.time_taken,
      );
      console.log(`Submitted contest for user ${submission.user.id}:`, result);
    }

    const leaderboard = await contestService.getLeaderboard(contest.id);
    console.log('Leaderboard:', leaderboard.map((row, idx) => ({
      rank: idx + 1,
      userId: row.user.id,
      email: row.user.email,
      score: row.score,
      time_taken: row.time_taken,
      submitted_at: row.submitted_at,
    })));

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
};

run();
