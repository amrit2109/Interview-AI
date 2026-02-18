# Database Setup (Neon PostgreSQL)

**Security:** Never commit `.env` or `.env.local`. If credentials were ever exposed, rotate them immediately.

1. Run the schema in Neon SQL Editor or via psql:
   - Open [Neon Console](https://console.neon.tech) -> your project -> SQL Editor
   - Paste and run `schema.sql`

2. Run migrations in order: `001_*`, `002_*`, `003_*`, `004_*`, `005_*` (e.g. `005_add_resume_columns.sql` adds resume_link and resume_uploaded_at).

3. Copy `.env.local.example` to `.env.local` and add your Neon connection string.

4. Seed initial data:
   ```bash
   npm run db:seed
   ```
