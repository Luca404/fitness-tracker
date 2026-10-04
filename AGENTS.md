# Project access notes

- The Supabase CLI is authenticated outside the command sandbox. If `supabase db push --dry-run` reports that `SUPABASE_ACCESS_TOKEN` is missing inside the sandbox, rerun it with `sandbox_permissions: "require_escalated"` before asking the user to log in. Use the same access mode for the actual migration push.
- The hosted database is shared with other Trackrs applications. Review `supabase db push --dry-run` and apply only this repository's pending migrations. Never run `supabase db reset --linked`.

- Current shared database workflow and already-applied finance ledger markers are documented in `supabase/README.md`. New public RPCs must explicitly grant execution to the intended roles; do not assume default authenticated execution.
