# Linked Supabase project (source of truth for CLI)

**ChatRely US** — project ref `vhunvugjcavoawkajyfu`, region `aws-1-us-east-1`.

| Surface | Must use US ref |
|--------|------------------|
| `app/.env.local` | `NEXT_PUBLIC_SUPABASE_URL=https://vhunvugjcavoawkajyfu.supabase.co` |
| `backend/.env` (active lines) | `DATABASE_URL` user `postgres.vhunvugjcavoawkajyfu`, JWKS/issuer same host |
| Supabase CLI | `supabase/.temp/project-ref` → `vhunvugjcavoawkajyfu` |

**Do not** run `supabase db push` while linked to ChatRely-Pak (`uxqqnstmpuzcsdylcgzw`).

Verify link:

```bash
cat supabase/.temp/project-ref
# vhunvugjcavoawkajyfu

npx supabase migration list
# Local and Remote columns should match
```

Apply SQL to linked US only:

```bash
npx supabase db query --linked --file supabase/migrations/YOUR_MIGRATION.sql
```
