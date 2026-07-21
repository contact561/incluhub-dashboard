# Supabase database assets

SQL migrations, RLS policies, and operational scripts for the IncluHub dashboard.

## Structure

```text
supabase/
├─ migrations/     # Ordered schema migrations (apply in filename order)
├─ policies/       # RLS policy SQL (reference alongside migrations)
└─ scripts/
   ├─ audit/       # Read-only governance audits
   ├─ reset/       # Test data audit + destructive reset SQL
   ├─ seed/        # Admin and stage test user Node scripts
   └─ verify/      # Package A–E1 and Stage 3 verification SQL
```

## Migration ranges

| Track | Branch | Migrations |
|-------|--------|------------|
| Package F baseline | `master` | `001` → `013` |
| Founder workflows | `feat/local-dev` | `014` → `022` |

Apply migrations in the Supabase SQL editor (or your CI migration pipeline) in
numeric order. Policies in `policies/` should match the migration set on your
project.

### Founder workflow migrations (`feat/local-dev`)

| File | Feature |
|------|---------|
| `014_in_app_notifications.sql` | Notifications tables and fan-out |
| `015_stage3_availability_qr_checkin.sql` | Availability + QR check-in (superseded in part by 018–021) |
| `016_brand_opportunities_stage5_review.sql` | Brand opportunity uploads |
| `017_stage5_ecosystem_approval.sql` | Ecosystem approval RPC |
| `018_stage3_authoritative_qr_checkin.sql` | Authoritative book/verify/submit QR flow |
| `019_stage3_availability_and_booking_notify.sql` | Availability gate + booking notify |
| `020_admin_broadcast_updates.sql` | Admin broadcast updates |
| `021_stage3_qr_prerequisites.sql` | Backfill for 015 tables/RPCs if missing |
| `022_enable_pgcrypto_for_qr.sql` | `pgcrypto` extension for QR hashing |

## Verification (SQL editor)

Run read-only checks after applying migrations:

```text
supabase/scripts/verify/verify_package_e1.sql
supabase/scripts/verify/verify_package_e1_rpc.sql   # ends with ROLLBACK
```

Stage 3 (`feat/local-dev`):

```text
supabase/scripts/verify/verify_stage3_tables.sql
supabase/scripts/verify/verify_stage3_qr_workflow.sql
```

## Reset and seed (non-production only)

1. Preview: `supabase/scripts/reset/audit_test_data_before_reset.sql`
2. Reset: `supabase/scripts/reset/reset_test_data.sql` (transactional)
3. Confirm: `supabase/scripts/verify/verify_clean_database.sql`

Node alternatives: see [../scripts/README.md](../scripts/README.md).

Day-to-day development: [../docs/runbooks/LOCAL_DEVELOPMENT.md](../docs/runbooks/LOCAL_DEVELOPMENT.md).

## MVP database rules

- No payment gateway tables
- No public signup — role comes from `profiles`
- RLS must protect student, educator, team, portfolio, and notification data
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code
