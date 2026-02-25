# Database Setup (Neon PostgreSQL)

**Security:** Never commit `.env` or `.env.local`. If credentials were ever exposed, rotate them immediately.

1. Run the schema in Neon SQL Editor or via psql:
   - Open [Neon Console](https://console.neon.tech) -> your project -> SQL Editor
   - Paste and run `schema.sql`

2. Run migrations in order by filename (001 through 008):
   - `001_add_candidate_token_timestamps.sql`
   - `002_add_candidate_parsed_fields.sql`
   - `003_add_interview_recording_columns.sql`
   - `004_sequence_backed_ids.sql`
   - `005_pre_screens_with_recording_view.sql`
   - `006_add_resume_columns.sql`
   - `007_interview_packs_and_sessions.sql`
   - `008_evaluation_override_and_audit.sql`

3. Copy `.env.local.example` to `.env.local` and add your Neon connection string.

4. Seed initial data (development only; never run against production):
   ```bash
   npm run db:seed
   ```
   Requires `SEED_ADMIN_PASSWORD` in `.env` or `.env.local` (no default).
