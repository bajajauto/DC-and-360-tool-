# DC Tool Backend

Express + Prisma backend for the DC and 360 tool.

## Requirements

- Node.js 20+
- Postgres 16+

## Setup

1. Copy `.env.example` to `.env`.
2. Start Postgres and create the `dc_tool` database.
3. Install backend dependencies:

```bash
npm install
```

4. Generate the Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

5. Seed initial demo data:

```bash
npm run db:seed
```

6. Start the API:

```bash
npm run server:dev
```

The API listens on `http://localhost:4000`.

## First Endpoints

- `GET /api/health`
- `GET /api/cohorts`
- `GET /api/cohorts/:cohortId/participants`
- `GET /api/participants/:participantId`
- `PUT /api/participants/:participantId/nominees`
- `POST /api/participants/:participantId/nominees/submit`
- `GET /api/feedback-tasks/:taskId`
- `PUT /api/feedback-tasks/:taskId/draft`
- `POST /api/feedback-tasks/:taskId/submit`
