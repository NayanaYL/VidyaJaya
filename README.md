# ✨ VidyaJaya Contest Engine

🚀 **VidyaJaya** is a high-performance backend for an interactive contest platform. It features a robust quiz engine, a secure financial wallet system, and real-time competitive leaderboards.

---

### 🌟 Key Features

- 🏆 **Advanced Contest Management**: Create, list, and join contests with atomic entry fee deductions.
- 🧠 **Randomized Quiz Engine**: 
  - Every user gets a unique, randomized question order (Fisher-Yates shuffle).
  - **Precision Timers**: Powered by Redis for strict 15-second per-question limits.
- 📈 **Multi-Factor Scoring**:
  - **Base Points**: +10 for correct answers.
  - **Speed Bonus**: +5 for answers under 5 seconds.
  - **Streak Bonus**: +15 for 5 consecutive correct answers.
  - **Timeout Penalty**: -2 for exceeding the time limit.
- 📊 **Real-time Leaderboards**: Powered by **Redis Sorted Sets** (ZSET) for sub-millisecond ranking updates.
- 💰 **Secure Wallet & Transactions**: Atomic deposits, withdrawals, and fee payments using **Prisma Transactions**.
- 🛡️ **Professional Anti-Cheat**: 
  - Automated detection of answers under **500ms**.
  - **Self-Enforcing Blocks**: Script-like behavior results in automatic user blocking.
- 📖 **Beginner-Friendly Documentation**: Every key file includes **line-by-line comments** explaining the "How" and "Why" of the logic.

---

### 🛠️ Tech Stack

- **Runtime**: Node.js (Express.js)
- **Database**: PostgreSQL (via Prisma ORM)
- **Real-time Store**: Redis
- **Security**: JWT Authentication, Helmet, and Anti-Cheat Middleware
- **Logging**: Morgan & Winston

---

### 🚦 Getting Started

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd VidyaJaya
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Environment Variables**
Copy the example environment file and fill in your details:
```bash
cp .env.example .env
```

4. **Setup Database**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. **Seed demo data**
```bash
npm run seed
```

6. **Run the Server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

---

### 🚀 Production Deployment
- Create a production `.env` from `.env.example` and set:
  - `NODE_ENV=production`
  - `DATABASE_URL` to your production PostgreSQL connection string
  - `REDIS_URL` to your production Redis connection string
  - `JWT_SECRET` to a strong secret value
- Run migrations and generate the Prisma client in production:
```bash
npm run prisma:migrate
npm run prisma:generate
```
- Seed any demo or test contests only in non-sensitive environments with:
```bash
npm run seed
```
- Start the server:
```bash
npm start
```

---

---

### 🚥 API Overview

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create a new account | No |
| `POST` | `/api/contest/create` | Create a new contest | Admin |
| `POST` | `/api/contest/join` | Join a contest (pay fee) | Yes |
| `GET` | `/api/contest/:id/questions`| Fetch randomized questions | Yes |
| `POST` | `/api/contest/:id/submit`| Submit answer & get points | Yes |
| `GET` | `/api/contest/:id/leaderboard`| Get Top 10 rankings | No |
| `GET` | `/api/wallet/balance` | Check user wallet balance | Yes |

---

### 👨‍🍳 Architecture

The project follows a **Modified Clean Architecture**:
- `/src/controllers`: Request/Response handlers.
- `/src/services`: Business logic & Database interactions.
- `/src/middlewares`: Security and error handling.
- `/src/routes`: API endpoint definitions.
- `/src/config`: Connection managers (DB, Redis, Env).

---

### 🛡️ Security Disclaimer
This project includes an automated anti-cheat mechanism. Users answering consistently under **0.5s** will have their accounts automatically marked as `isBlocked: true` and will be rejected from all authenticated APIs.
