## VidyaJaya Backend

Production-ready Node.js backend using Express, PostgreSQL (via Prisma), JWT authentication, and MVC-style structure.

### Tech stack

- Node.js / Express
- PostgreSQL with Prisma ORM
- JWT authentication
- Environment-based configuration

### Getting started

1. **Install dependencies**

```bash
cd VidyaJaya
npm install
```

2. **Configure environment**

```bash
cp .env.example .env
# then edit .env with your PostgreSQL credentials and JWT secret
```

3. **Run Prisma migrations and generate client**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

4. **Run the server**

```bash
npm run dev
```

Server defaults to `http://localhost:4000`.

### API overview

- **Health check**: `GET /api/health`
- **Auth**
  - `POST /api/auth/register` – body: `{ "email": string, "password": string, "name"?: string }`
  - `POST /api/auth/login` – body: `{ "email": string, "password": string }`

Both auth endpoints respond with a JWT token and sanitized user object.

