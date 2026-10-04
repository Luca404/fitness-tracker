# Shared security migration ledger

The seven versions 20261004165900 through 20261004170500 were applied to hosted project nitbisweytddtigoebeh from ../trackr/ on 2026-10-04 after a reviewed dry-run and isolated tests. The meal-item correction is the actual FitTrackr migration; the other files are markers for finance-owned changes already applied by Trackr. Do not apply markers to production before the finance changes exist there.

Future public RPCs must explicitly GRANT EXECUTE to authenticated/service_role as needed. Default execution for new postgres-owned functions is revoked for PUBLIC/anon/authenticated. New anonymous table reads require explicit grants. Authenticated fitness CRUD and existing RPC grants are preserved; TRUNCATE/REFERENCES/TRIGGER are removed. New tables still need RLS and ownership policies.

Trackr's isolated tests also verified the existing FitTrackr meal RPC, mismatched entry/meal rejection and the new composite foreign key. See ../trackr/docs/security-fixes-2026-10-04.md for results. The local Trackr database received the seven security changes without replaying unrelated historical fitness upgrades; this does not claim that every local fitness migration is current.
