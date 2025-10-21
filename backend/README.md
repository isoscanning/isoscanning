# ISOScanner Backend (Supabase + NestJS)

This service provides the API and domain logic for ISOScanner, implementing a DDD-oriented architecture on top of Supabase.

## Tech Stack

- NestJS 10
- Supabase (PostgreSQL + Auth + Storage)
- Class Validator / Transformer
- TypeScript

## Project Structure

```
backend/
├── src/
│   ├── app.module.ts            # Root module
│   ├── core/                    # Cross-cutting concerns (Supabase, guards)
│   ├── modules/                 # Domain-driven feature modules
│   │   ├── auth/
│   │   ├── availability/
│   │   ├── bookings/
│   │   ├── equipments/
│   │   ├── portfolio/
│   │   ├── profiles/
│   │   ├── proposals/
│   │   ├── quotes/
│   │   └── reviews/
│   └── shared/                  # Shared abstractions (entities, use cases)
├── package.json
└── README.md (this file)
```

Each feature module contains:

- `domain/`: Aggregate roots, entities, repository contracts
- `application/`: Use cases and DTOs
- `infrastructure/`: Controllers, Supabase repositories, mappers

## Environment Variables

Create a `.env` file inside `backend/` with the following variables:

```
PORT=4000
SUPABASE_URL=<your-supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_ANON_KEY=<anon-public-key>
GA_MEASUREMENT_ID=<optional-ga-measurement-id>
GA_API_SECRET=<optional-ga-api-secret>
```

- `SUPABASE_SERVICE_ROLE_KEY` is required for admin/auth actions (keep it secret).
- `SUPABASE_ANON_KEY` can be shared with clients if needed for analytics integrations.

## Scripts

From the `backend/` directory:

- `npm install` – install dependencies
- `npm run start:dev` – run NestJS in watch mode (ts-node + nodemon)
- `npm run build` – compile TypeScript to `dist/`
- `npm start` – run the compiled application (`node dist/main.js`)

## Running Locally

1. Copy the environment block above into a `.env` file and fill in Supabase credentials.
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run start:dev
   ```
4. The API is exposed at `http://localhost:${PORT:-4000}/api`.

## Supabase Setup Checklist

- Tables: `profiles`, `equipments`, `availability`, `bookings`, `quote_requests`, `reviews`, `portfolio_items`, `equipment_proposals`
- Storage buckets: `equipments`, `portfolio`, `avatars`
- Apply the Row Level Security policies and enums outlined in the migration plan.

## Authentication Endpoints

- `POST /api/auth/signup` – email/password sign-up + profile creation
- `POST /api/auth/login` – email/password login
- `GET /api/auth/me` – returns the authenticated profile (requires `Authorization: Bearer <token>`)

All mutating routes use `SupabaseAuthGuard`, which validates bearer tokens against Supabase and injects the authenticated user into controllers.

## Development Notes

- Use cases encapsulate application logic and depend on domain interfaces.
- Controllers remain thin and orchestrate validation/guards.
- Supabase repositories are the only layer that touches the database/storage.
- When adding new modules, follow the `domain/application/infrastructure` folder pattern and export repository tokens for cross-module usage.

## Deployment

Build with `npm run build` and deploy the contents of `dist/`. Ensure the environment variables above are configured wherever the service runs.

---

Refer to the SQL migration plan for detailed schema definitions and RLS policies when provisioning Supabase.


