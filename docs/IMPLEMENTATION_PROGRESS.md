# Implementation progress

Plan: docs/superpowers/plans/2026-10-01-github-supabase.md

- Baseline: remote main contains README only. New folder associated with target repository on codex/github-supabase. Original Sites source preserved.
- Ruling: use native execution with one fresh final review; implementation and publication already explicitly authorized.
- Ruling: use one Postgres transaction per request with deterministic room advisory lock instead of Edge-computed commit RPC. Existing persistence CAS/receipts remain; authorization, reads, scoring and writes share the same transaction. This reduces migration changes and requires real Postgres integration verification.
- Preflight: SPA API transport consumes existing route contracts; Postgres adapter consumes PersistenceDatabase; Realtime consumes committed room/progress state. No incompatible interface names found.
- External project confirmed in Safari: IonicFormulaCompetition, Free, ref slktkbpvvsfpflnmpuvr. User specified initial master email separately; do not publish email in source.

## 2026-10-01 implementation and verification

- Implemented static hash SPA, Google/anonymous Supabase Auth transport and teacher allowlist binding.
- Converted the mature v2 persistence to Postgres; transactional mutations retain immutable receipts and sequence/writer protection. PGlite tests cover flow, duplicate requests, 42-person capacity, table permission denial and private topic membership.
- Implemented private control/host events, epoch rotation, durable latest-event outbox, retry lease and weighted project budget. Review found duplicate-tab fanout undercount; fixed estimate to reserve two connections per person and adjusted send budget to 90/second. This is an estimate; arbitrary tabs/devices are not a hard connection ceiling.
- HTTP recovery now has exponential backoff, jitter and Retry-After. Teacher progress confirms every 2 seconds; connected participants 30 seconds; disconnected participants 5 seconds.
- Supabase CLI authenticated after user approval. Remote DB had zero public tables. Applied migrations 001-003 successfully with db push; enabled anonymous signup, 300/hour/IP and Pages callback URLs. Registered master email only as backend secret. Edge API deployed.
- Cloud anonymous Auth and public-config endpoint return 200. Found and fixed server-only window detection incompatible with Edge runtime; explicit regression test added. Built-in SUPABASE_DB_URL works, no DB password requested.
- Local Playwright: teacher create -> student join at 390px -> preparation/ready -> race -> interruption -> teacher/student results and individual review. No horizontal overflow. Auth simulated only in localhost fixture; user explicitly approved fixture after automatic review rejected re-seeding a session. Real Google login is not thereby verified.
- Local fixture has no Realtime socket server; its WebSocket errors are expected infrastructure limitations. Cloud Realtime and published page still require checks.
- Fresh read-only code reviewer found no critical authorization/RLS gap; duplicate-tab estimate fixed as above.
- Added regression test for results transport after browser found an old relative API endpoint.
- Google OAuth credentials/provider are still unconfigured. Classroom shared network, physical iPhone/iPad and five simultaneous classes are not verified.

- Actual private Realtime cloud smoke: authorized host/control SUBSCRIBED, outsider host CHANNEL_ERROR, committed room.changed and host.progress received; verification mate room cancelled afterward.
- Actual 42 simultaneous GETs revealed stale SERIALIZABLE snapshots (3 successes / 39 failures), then region-dependent room lock queuing (Tokyo Edge versus Seoul DB). Adopted READ COMMITTED for room/broadcast scopes only with advisory transaction locks and existing CAS/receipts; creation/config retain SERIALIZABLE plus bounded jittered retry. Fresh review confirmed this scoped approach and cautioned against relaxing credential-based creation invariants.
- Browser calls now target the database region with x-region. Region pinning avoids per-statement Tokyo/Seoul round trips; an outage requires changing the deployment region config rather than expecting automatic rerouting.

- Final cloud burst check after scoped isolation/region/lock-wait tuning: 42 simultaneous state requests all HTTP 200; elapsed 7.53 seconds, slowest 7.50 seconds. This is API burst evidence using a verification mate room; it does not prove 42 distinct student devices or full simultaneous classroom operations.
- Final local suite: 77 test files, 382 tests passed, RUN_LOAD=1 and REQUIRE_BUNDLE=1. Production TypeScript and Vite build passed. Static client has no server secrets or answer datasets. Client bundle ~565KB (~161KB gzip) remains a size warning.
