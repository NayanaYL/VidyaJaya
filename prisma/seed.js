import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/utils/password.js';

const now = new Date();

const users = [
  {
    email: 'alice@example.com',
    password: 'Password123!',
    name: 'Alice Learner',
  },
  {
    email: 'bob@example.com',
    password: 'Password123!',
    name: 'Bob Brainiac',
  },
  {
    email: 'carmen@example.com',
    password: 'Password123!',
    name: 'Carmen Challenger',
  },
];

const contests = [
  {
    title: 'Beginner Math Blast',
    entry_fee: 0,
    prize_pool: 50,
    start_time: new Date(now.getTime() - 10 * 60 * 1000),
    total_questions: 5,
    duration_minutes: 15,
  },
  {
    title: 'Science Sprint',
    entry_fee: 5,
    prize_pool: 100,
    start_time: new Date(now.getTime() + 5 * 60 * 1000),
    total_questions: 5,
    duration_minutes: 20,
  },
  {
    title: 'General Knowledge Gauntlet',
    entry_fee: 10,
    prize_pool: 200,
    start_time: new Date(now.getTime() + 20 * 60 * 1000),
    total_questions: 5,
    duration_minutes: 25,
  },
];

const questionsByContest = {
  'Beginner Math Blast': [
    {
      question: 'What is 5 + 7?',
      option_a: '10',
      option_b: '11',
      option_c: '12',
      option_d: '13',
      hint: 'Add the numbers.',
      explanation: '5 + 7 equals 12.',
      correct_ans: 'C',
    },
    {
      question: 'What is 9 - 3?',
      option_a: '6',
      option_b: '5',
      option_c: '7',
      option_d: '4',
      hint: 'Subtraction of single digits.',
      explanation: '9 - 3 equals 6.',
      correct_ans: 'A',
    },
    {
      question: 'What is 3 x 4?',
      option_a: '7',
      option_b: '10',
      option_c: '12',
      option_d: '14',
      hint: 'Multiplication tables.',
      explanation: '3 times 4 equals 12.',
      correct_ans: 'C',
    },
    {
      question: 'What is 20 ÷ 5?',
      option_a: '2',
      option_b: '3',
      option_c: '4',
      option_d: '5',
      hint: 'Division of 20 by 5.',
      explanation: '20 divided by 5 equals 4.',
      correct_ans: 'C',
    },
    {
      question: 'What is 15 + 6?',
      option_a: '19',
      option_b: '21',
      option_c: '20',
      option_d: '22',
      hint: 'Simple addition.',
      explanation: '15 + 6 equals 21.',
      correct_ans: 'B',
    },
  ],
  'Science Sprint': [
    {
      question: 'What planet is known as the Red Planet?',
      option_a: 'Venus',
      option_b: 'Mars',
      option_c: 'Jupiter',
      option_d: 'Saturn',
      hint: 'It is named after the god of war.',
      explanation: 'Mars is called the Red Planet.',
      correct_ans: 'B',
    },
    {
      question: 'What gas do plants breathe in?',
      option_a: 'Oxygen',
      option_b: 'Nitrogen',
      option_c: 'Carbon Dioxide',
      option_d: 'Helium',
      hint: 'It is produced by animals when they breathe out.',
      explanation: 'Plants use carbon dioxide for photosynthesis.',
      correct_ans: 'C',
    },
    {
      question: 'What is H2O commonly called?',
      option_a: 'Salt',
      option_b: 'Water',
      option_c: 'Hydrogen',
      option_d: 'Oxygen',
      hint: 'It covers most of the Earth.',
      explanation: 'H2O is the chemical formula for water.',
      correct_ans: 'B',
    },
    {
      question: 'Which organ pumps blood through the body?',
      option_a: 'Liver',
      option_b: 'Lung',
      option_c: 'Heart',
      option_d: 'Kidney',
      hint: 'It is in your chest.',
      explanation: 'The heart pumps blood.',
      correct_ans: 'C',
    },
    {
      question: 'What does DNA stand for?',
      option_a: 'Deoxyribonucleic Acid',
      option_b: 'Daily Nutrition Analysis',
      option_c: 'Dynamic Neural Action',
      option_d: 'Digital Network Array',
      hint: 'It is the genetic material in cells.',
      explanation: 'DNA stands for Deoxyribonucleic Acid.',
      correct_ans: 'A',
    },
  ],
  'General Knowledge Gauntlet': [
    {
      question: 'Which country is home to the Great Barrier Reef?',
      option_a: 'South Africa',
      option_b: 'Australia',
      option_c: 'Brazil',
      option_d: 'India',
      hint: 'It is also called the land down under.',
      explanation: 'The Great Barrier Reef is off the coast of Australia.',
      correct_ans: 'B',
    },
    {
      question: 'What is the capital city of Japan?',
      option_a: 'Tokyo',
      option_b: 'Seoul',
      option_c: 'Beijing',
      option_d: 'Bangkok',
      hint: 'It is one of the largest cities in the world.',
      explanation: 'Tokyo is the capital of Japan.',
      correct_ans: 'A',
    },
    {
      question: 'What is the largest ocean on Earth?',
      option_a: 'Atlantic Ocean',
      option_b: 'Indian Ocean',
      option_c: 'Arctic Ocean',
      option_d: 'Pacific Ocean',
      hint: 'It is named after peace.',
      explanation: 'The Pacific Ocean is the largest ocean.',
      correct_ans: 'D',
    },
    {
      question: 'Which language is primarily spoken in Brazil?',
      option_a: 'Spanish',
      option_b: 'Portuguese',
      option_c: 'French',
      option_d: 'English',
      hint: 'Brazil was colonized by Portugal.',
      explanation: 'Portuguese is the primary language in Brazil.',
      correct_ans: 'B',
    },
    {
      question: 'Which planet has the most moons?',
      option_a: 'Earth',
      option_b: 'Venus',
      option_c: 'Saturn',
      option_d: 'Mercury',
      hint: 'It is famous for its rings.',
      explanation: 'Saturn has the most known moons.',
      correct_ans: 'C',
    },
  ],
};

const createUser = async ({ email, password, name }) => {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email },
    update: { name, password: passwordHash },
    create: { email, password: passwordHash, name },
  });
};

const createContestIfMissing = async (contestData) => {
  const existing = await prisma.contest.findFirst({ where: { title: contestData.title } });
  if (existing) return existing;
  return prisma.contest.create({ data: contestData });
};

const createQuestionIfMissing = async (contestId, questionData) => {
  const existing = await prisma.question.findFirst({
    where: {
      contest_id: contestId,
      question: questionData.question,
    },
  });

  if (existing) return existing;

  return prisma.question.create({
    data: {
      ...questionData,
      contest_id: contestId,
    },
  });
};

const createSubscriptionForUser = async (userId) => {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.subscription.create({
    data: {
      userId,
      planType: 'weekly',
      startDate: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
  });
};

const createParticipantIfMissing = async (userId, contestId) => {
  return prisma.contestParticipant.upsert({
    where: { userId_contestId: { userId, contestId } },
    update: {},
    create: { userId, contestId },
  });
};

async function main() {
  console.log('Seeding VidyaJaya demo data...');

  const createdUsers = [];
  for (const userInput of users) {
    const user = await createUser(userInput);
    createdUsers.push(user);
  }

  const createdContests = [];
  for (const contestInput of contests) {
    const contest = await createContestIfMissing(contestInput);
    createdContests.push(contest);

    const contestQuestions = questionsByContest[contest.title] || [];
    for (const questionInput of contestQuestions) {
      await createQuestionIfMissing(contest.id, questionInput);
    }
  }

  for (const user of createdUsers) {
    await createSubscriptionForUser(user.id);
  }

  // Add sample participation for testing leaderboards
  await createParticipantIfMissing(createdUsers[0].id, createdContests[0].id);
  await createParticipantIfMissing(createdUsers[1].id, createdContests[0].id);
  await createParticipantIfMissing(createdUsers[2].id, createdContests[1].id);

  console.log('Seed complete.');
  console.log('Created users:', createdUsers.map((user) => user.email).join(', '));
  console.log('Created contests:', createdContests.map((contest) => contest.title).join(', '));
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
