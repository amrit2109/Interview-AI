# Database Setup (Neon PostgreSQL)

1. Run the schema in Neon SQL Editor or via psql:
   - Open [Neon Console](https://console.neon.tech) -> your project -> SQL Editor
   - Paste and run `schema.sql`

2. Copy `.env.local.example` to `.env.local` and add your Neon connection string.

3. Seed initial data:
   ```bash
   npm run db:seed
   ```
